/***************************************************************************************************************************
 * @license                                                                                                                *
 * Copyright 2017 Coinbase, Inc.                                                                                           *
 *                                                                                                                         *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance          *
 * with the License. You may obtain a copy of the License at                                                               *
 *                                                                                                                         *
 * http://www.apache.org/licenses/LICENSE-2.0                                                                              *
 *                                                                                                                         *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on     *
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the                      *
 * License for the specific language governing permissions and limitations under the License.                              *
 ***************************************************************************************************************************/

import { Readable, Writable } from 'stream';
import { Logger } from '../utils/Logger';
import { AuthenticatedExchangeAPI } from '../exchanges/AuthenticatedExchangeAPI';
import { AggregatedLevelWithOrders, BookBuilder } from '../lib/BookBuilder';
import { Level3Order, LiveOrder, OrderbookState } from '../lib/Orderbook';
import {
    CancelOrderRequestMessage,
    CancelOrdersAtPriceRequestMessage,
    isStreamMessage,
    MyOrderPlacedMessage,
    PlaceOrderMessage,
    StreamMessage,
    TradeExecutedMessage,
    TradeFinalizedMessage
} from './Messages';
import { OrderbookDiff } from '../lib/OrderbookDiff';
import { Big, BigJS } from '../lib/types';
import { BulkCancelResult, bulkCancelWithRateLimit } from '../lib/bulkOrderUtils';
import { RateLimiter as Limiter } from 'limiter';

/**
 * Configuration interface for the Trader class.
 *
 * If `fitOrders` is set the incoming `placeTrade` messages will be modified to satisfy the `sizePrecision` and `pricePrecision` constraints by ROUNDING TOWARDS ZERO for
 * both size. Price is rounded towards zero for buys and away from zero for sells.
 */
export interface TraderConfig {
    logger: Logger;
    exchangeAPI: AuthenticatedExchangeAPI;
    productId: string;
    fitOrders: boolean;
    rateLimit: number;
    messageFeed?: Readable; // HIGHLY recommended. The (authenticated) message feed to listen for results of trades and order commands
    sizePrecision?: number;
    pricePrecision?: number;
}

/**
 * The Trader class places orders on your behalf. The commands for placing the trades can either come from an attached
 * stream, or directly via the API.
 *
 * One should have an *authenticated* feed piped into Trader so that it can keep track of the state of its own orderbook.
 * Failing this, it is trading 'blind' and will have to rely on REST requests to update the state of the book.
 *
 * Emitted messages:
 *   Trader.outOfSyncWarning - The internal order pool and what's actually on the exchange may be out of sync
 *   Trader.trade-finalized - An order is complete (done); either cancelled or filled
 *   Trader.my-orders-cancelled - A call to cancel all orders in this orderbook has completed
 *   Trader.all-orders-cancelled - A call to cancel ALL of the user's orders (including those placed elsewhere) has been completed
 *   Trader.order-placed - Emitted after an order has been successfully placed
 *   Trader.external-order-placement - An order was placed on my behalf, but not by this Trader instance
 *   Trader.order-cancelled - Emitted after an order has been cancelled (but not yet finalized)
 *   Trader.trade-executed - emitted after a trade has been executed against my limit order
 *   Trader.place-order-failed - A REST order request returned with an error
 *   Trader.cancel-order-failed - A Cancel request returned with an error status
 */
export class Trader extends Writable {
    private lastSequence: number;
    private messageFeed: Readable;
    private _productId: string;
    private logger: Logger;
    private myBook: BookBuilder;
    private api: AuthenticatedExchangeAPI;
    private _fitOrders: boolean = true;
    private sizePrecision: number;
    private pricePrecision: number;
    private rateLimiter: Limiter;
    private _rateLimit: number;

    constructor(config: TraderConfig) {
        super({ objectMode: true, highWaterMark: 1024 });
        this.api = config.exchangeAPI;
        this.logger = config.logger;
        this.myBook = new BookBuilder(this.logger);
        this._productId = config.productId;
        this.sizePrecision = config.sizePrecision || 2;
        this.pricePrecision = config.pricePrecision || 2;
        this.rateLimit = config.rateLimit;
        this.messageFeed = config.messageFeed;
        if (this.messageFeed) {
            this.lastSequence = 0;
            this.listenToFeed();
        } else {
            this.log('warn', 'You have not provided a message feed to this Trader instance. This means that it will not get any feedback about results of orders placed.');
        }
        if (!this.api) {
            throw new Error('Trader cannot work without an exchange interface using valid credentials. Have you set the necessary ENVARS?');
        }
    }

    get productId(): string {
        return this._productId;
    }

    get fitOrders(): boolean {
        return this._fitOrders;
    }

    set fitOrders(value: boolean) {
        this._fitOrders = value;
    }

    get orderBook(): BookBuilder {
        return this.myBook;
    }

    get rateLimit(): number {
        return this._rateLimit;
    }

    set rateLimit(value: number) {
        this._rateLimit = value;
        this.rateLimiter = new Limiter(value, 1000);
    }

    log(level: string, message: string, meta?: any) {
        if (!this.logger) {
            return;
        }
        this.logger.log(level, message, meta);
    }

    /**
     * Place a new order request. If successful, the method resolves with the details of the newly placed order.
     * If the order placement fails, the promise resolves with null, and a `Trader.place-order-failed` message is emitted.
     */
    placeOrder(req: PlaceOrderMessage): Promise<LiveOrder> {
        if (this.fitOrders) {
            req.size = req.size ? Big(req.size).round(this.sizePrecision, 1).toString() : undefined;
            req.funds = req.funds ? Big(req.funds).round(this.pricePrecision, 1).toString() : undefined;
            const rm = req.side === 'buy' ? 1 : 0; // round down for buys, round up for sells
            req.price = Big(req.price).round(this.pricePrecision, rm).toString();
        }
        return this.removeToken<LiveOrder>(() => {
            this.log('debug', 'Placing new order request', req);
            return this.api.placeOrder(req);
        }).then((order: LiveOrder) => {
            if (order) {
                this.myBook.add(order);
            } else {
                this.emit('Trader.place-order-failed', order);
            }
            return order;
        }).catch((err: Error) => {
            // Errors can fail if they're too precise, too small, or the API is down
            // We pass the message along, but let the user decide what to do
            this.emit('Trader.place-order-failed', err.message);
            return Promise.resolve(null);
        });
    }

    /**
     * Request an order cancellation. The request resolves with the order Id if the request placement was successful. The cancellation confirmation will only come later
     * in a TradeFinalized message.
     * If an error occurs, a Trader.cancel-order-failed message is emitted.
     * The orderInfo argument is optional and is only for informational purposes.
     */
    cancelOrder(orderId: string, orderInfo?: Level3Order): Promise<string> {
        return this.removeToken<string>(() => {
            return this.api.cancelOrder(orderId);
        }).then((id: string) => {
            // To avoid race conditions, we only actually remove the order when the tradeFinalized message arrives
            return id;
        }).catch((err: Error) => {
            this.emit('Trader.cancel-order-failed', { id: orderId, order: orderInfo, error: err });
            return Promise.reject(err);
        });
    }

    cancelMyOrders(): Promise<BulkCancelResult> {
        if (!this.myBook.orderPool) {
            return Promise.resolve({ cancelled: [], failed: [] });
        }
        const orderIds = Object.keys(this.myBook.orderPool);
        return bulkCancelWithRateLimit(this.api, orderIds, this._rateLimit);
    }

    /**
     * Cancel all, and we mean ALL orders (even those not placed by this Trader). To cancel only the messages
     * listed in the in-memory orderbook, use `cancelMyOrders`
     */
    cancelAllOrders(): Promise<string[]> {
        return this.api.cancelAllOrders(null).then((ids: string[]) => {
            this.myBook.clear();
            this.emit('Trader.all-orders-cancelled', ids);
            return ids;
        }, (err: Error) => {
            this.emit('Trader.cancel-order-failed', err);
            return [];
        });
    }

    /**
     * Request to cancel all orders at the given price level. Resolves to an array of IDs that were cancelled, or else the promise is rejected.
     * Emitted messages:
     *   Trader.order-cancelled (possibly multiple)
     *   Trader.cancel-order-failed (zero or more)
     */
    cancelOrdersAtPrice(side: string, productId: string, price: string): Promise<BulkCancelResult> {
        if (!['buy', 'sell'].includes(side)) {
            return Promise.reject(new Error('Invalid side provided to Trader.cancelOrdersAtPrice: ' + side));
        }
        if (!productId) {
            return Promise.reject(new Error('productId must be provided to Trader.cancelOrdersAtPrice'));
        }
        if (productId !== this.productId) {
            this.log('warn', 'A cancelOrdersAtPrice request was received for a different productId. This might be fine, but there is nothing for this Trader to do here');
            return Promise.resolve({ cancelled: [], failed: [] });
        }
        return this.removeToken<BulkCancelResult>(() => {
            const level: AggregatedLevelWithOrders = this.myBook.getLevel(side, Big(price));
            if (!level) {
                return Promise.resolve({ cancelled: [], failed: [] });
            }
            const orderIds: string[] = level.orders.map((order) => order.id);
            return bulkCancelWithRateLimit(this.api, orderIds, this._rateLimit);
        });
    }

    state(): OrderbookState {
        return this.myBook.state();
    }

    /**
     * Compare the state of the in-memory orderbook with the one returned from a REST query of all my orders. The
     * result is an `OrderbookState` object that represents the diff between the two states. Negative sizes represent
     * orders in-memory that don't exist on the book and positive ones are vice versa
     */
    checkState(): Promise<OrderbookState> {
        return this.api.loadAllOrders(this.productId).then((actualOrders: LiveOrder[]) => {
            const book = new BookBuilder(this.logger);
            actualOrders.forEach((order: LiveOrder) => {
                book.add(order);
            });
            const diff = OrderbookDiff.compareByOrder(this.myBook, book);
            return Promise.resolve(diff);
        });
    }

    executeMessage(msg: StreamMessage) {
        if (!isStreamMessage(msg)) {
            return;
        }
        setImmediate(() => {
            switch (msg.type) {
                case 'placeOrder':
                    this.handleOrderRequest(msg as PlaceOrderMessage);
                    break;
                case 'cancelOrder':
                    this.handleCancelOrder(msg as CancelOrderRequestMessage);
                    break;
                case 'cancelAllOrders':
                    this.cancelAllOrders();
                    break;
                case 'cancelMyOrders':
                    this.cancelMyOrders();
                    break;
                case 'tradeExecuted':
                    this.handleTradeExecutedMessage(msg as TradeExecutedMessage);
                    break;
                case 'tradeFinalized':
                    this.handleTradeFinalized(msg as TradeFinalizedMessage);
                    break;
                case 'myOrderPlaced':
                    this.handleOrderPlacedConfirmation(msg as MyOrderPlacedMessage);
                    break;
                case 'cancelOrdersAtPrice':
                    this.handleCancelOrdersAtPrice(msg as CancelOrdersAtPriceRequestMessage);
                    break;
            }
        });
    }

    _write(msg: any, encoding: string, callback: (err?: Error) => any): void {
        this.executeMessage(msg);
        callback();
    }

    private listenToFeed() {
        this.messageFeed.on('data', (msg: StreamMessage) => {
            if ((msg as any).sourceSequence && (msg as any).sourceSequence <= this.lastSequence) {
                return;
            }
            if (['tradeExecuted', 'tradeFinalized', 'myOrderPlaced'].includes(msg.type)) {
                try {
                    this.executeMessage(msg);
                } catch (err) {
                    this.log('error', 'Error executing message from WS feed', err);
                }
                this.lastSequence = (msg as any).sourceSequence || 0;
            }
        });
    }

    private handleOrderRequest(request: PlaceOrderMessage) {
        if (request.productId !== this._productId) {
            return;
        }
        this.placeOrder(request).then((result: LiveOrder) => {
            if (result) {
                this.emit('Trader.order-placed', result);
            }
        }).catch((err: Error) => {
            this.log('error', 'A likely bug in the client code resulted in an error', { at: 'handleOrderRequest', error: err });
        });
    }

    private handleCancelOrder(request: CancelOrderRequestMessage) {
        this.cancelOrder(request.orderId).then((result: string) => {
            return this.emit('Trader.order-cancelled', request);
        }, (err: Error) => {
            this.emit('Trader.cancel-order-failed', err);
        }).catch((err: Error) => {
            this.log('error', 'A likely bug in the client code resulted in an error', { at: 'handleCancelOrder', error: err });
        });
    }

    private handleTradeExecutedMessage(msg: TradeExecutedMessage) {
        this.emit('Trader.trade-executed', msg);
        if (msg.orderType !== 'limit') {
            return;
        }
        const order: Level3Order = this.myBook.getOrder(msg.orderId);
        if (!order) {
            this.log('warn', 'Traded order not in my book', msg);
            this.emit('Trader.outOfSyncWarning', 'Traded order not in my book');
            return;
        }
        let newSize: BigJS;
        if (msg.tradeSize) {
            newSize = order.size.minus(msg.tradeSize);
        } else {
            newSize = Big(msg.remainingSize);
        }
        this.myBook.modify(order.id, newSize);
    }

    private handleTradeFinalized(msg: TradeFinalizedMessage) {
        const id: string = msg.orderId;
        const order: Level3Order = this.myBook.remove(id);
        if (!order) {
            this.log('warn', 'Trader: Cancelled order not in my book', id);
            this.emit('Trader.outOfSyncWarning', 'Cancelled order not in my book');
            return;
        }
        this.emit('Trader.trade-finalized', msg);
    }

    /**
     *  We should just confirm that we have the order, since we added when we placed it.
     *  Otherwise this Trader didn't place the order (or somehow missed the callback), but we should add
     *  it to our memory book anyway otherwise it will go out of sync
     */
    private handleOrderPlacedConfirmation(msg: MyOrderPlacedMessage) {
        const orderId = msg.orderId;
        if (this.myBook.getOrder(orderId)) {
            this.log('debug', 'Order confirmed', msg);
            return;
        }
        const order: Level3Order = {
            id: orderId,
            price: Big(msg.price),
            side: msg.side,
            size: Big(msg.size)
        };
        this.myBook.add(order);
        this.emit('Trader.external-order-placement', msg);
    }

    /**
     * Cancel all orders at a given price level. Useful for modules that don't know (or care about) individual orderIDs,
     * or aren't interested in the fact that multiple orders may exist at a given level.
     */
    private handleCancelOrdersAtPrice(msg: CancelOrdersAtPriceRequestMessage) {
        this.cancelOrdersAtPrice(msg.side, msg.productId, msg.price).catch((err: Error) => {
            // The failed message events will already have been emitted, so just log and carry on
            this.log('warn', 'Could not fulfil CancelOrdersAtPriceRequestMessage', { message: msg, error: err });
        });
    }

    private removeToken<T>(fn: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.rateLimiter.removeTokens(1, (err: Error) => {
                if (err) {
                    return reject(err);
                }
                return resolve(fn());
            });
        });
    }
}
