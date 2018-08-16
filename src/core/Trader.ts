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

import { Writable } from 'stream';
import { Logger } from '../utils/Logger';
import { AuthenticatedExchangeAPI } from '../exchanges/AuthenticatedExchangeAPI';
import { BookBuilder } from '../lib/BookBuilder';
import { Level3Order, LiveOrder, OrderbookState } from '../lib/Orderbook';
import { CancelOrderRequestMessage,
         isStreamMessage,
         MyOrderPlacedMessage,
         PlaceOrderMessage,
         StreamMessage,
         StreamMessageLike,
         TradeExecutedMessage,
         TradeFinalizedMessage } from './Messages';
import { OrderbookDiff } from '../lib/OrderbookDiff';
import { Big, BigJS } from '../lib/types';
import { StreamError } from '../lib/errors';

export interface TraderConfig {
    logger: Logger;
    exchangeAPI: AuthenticatedExchangeAPI;
    productId: string;
    fitOrders: boolean;
    sizePrecision?: number;
    pricePrecision?: number;
}

export interface CancelMyOrdersRequestMessage extends StreamMessageLike {
    type: 'cancelMyOrders';
}

export function isCancelMyOrdersRequestMessage(msg: any): msg is CancelMyOrdersRequestMessage {
    return msg.type === 'cancelMyOrders';
}

export interface CancelAllOrdersRequestMessage extends StreamMessageLike {
    type: 'cancelAllOrders';
}

export function isCancelAllOrdersRequestMessage(msg: any): msg is CancelAllOrdersRequestMessage {
    return msg.type === 'cancelAllOrders';
}

export type TraderStreamMessage =
    StreamMessage |
    CancelMyOrdersRequestMessage |
    CancelAllOrdersRequestMessage;

export function isTraderStreamMessage(msg: any): msg is TraderStreamMessage {
    return isStreamMessage(msg) || msg.type === 'cancelMyOrders' || msg.type === 'cancelAllOrders';
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
 *   Trader.trade-finalized - An order is complete (done)
 *   Trader.my-orders-cancelled - A call to cancel all orders in this orderbook has completed
 *   Trader.all-orders-cancelled - A call to cancel ALL of the user's orders (including those placed elsewhere) has been completed
 *   Trader.order-placed - Emitted after an order has been successfully placed
 *   Trader.order-cancelled - Emitted after an order has been cancelled
 *   Trader.trade-executed - emitted after a trade has been executed against my limit order
 *   Trader.place-order-failed - A REST order request returned with an error
 *   Trader.cancel-order-failed - A Cancel request returned with an error status
 */
export class Trader extends Writable {
    private readonly _productId: string;
    private readonly logger: Logger;
     // Used to keep track of all non-market orders this trader has placed.
    private readonly myBook: BookBuilder;
    private readonly api: AuthenticatedExchangeAPI;
    private _fitOrders: boolean = true;
    private readonly sizePrecision: number;
    private readonly pricePrecision: number;
    private readonly unfilledMarketOrders: Set<string>;

    constructor(config: TraderConfig) {
        super({ objectMode: true });
        this.api = config.exchangeAPI;
        this.logger = config.logger;
        this.myBook = new BookBuilder(this.logger);
        this._productId = config.productId;
        this.sizePrecision = config.sizePrecision || 2;
        this.pricePrecision = config.pricePrecision || 2;
        this.unfilledMarketOrders = new Set();
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

    placeOrder(req: PlaceOrderMessage): Promise<LiveOrder> {
        if (this.fitOrders) {
            req.size = req.size ? Big(req.size).round(this.sizePrecision, 1).toString() : undefined;
            req.funds = req.funds ? Big(req.funds).round(this.pricePrecision, 1).toString() : undefined;
            req.price = Big(req.price).round(this.pricePrecision, 2).toString();
        }
        return this.api.placeOrder(req).then((order: LiveOrder) => {
            if (req.orderType !== 'market') {
                this.myBook.add(order);
            } else {
                this.unfilledMarketOrders.add(order.id);
            }
            return order;
        }).catch((err: StreamError) => {
            // Errors can fail if they're too precise, too small, or the API is down
            // We pass the message along, but let the user decide what to do
            // We also have to wrap this call in a setImmediate; else any errors in the event handler will get thrown from here and lead to an unhandledRejection
            this.emitMessageAsync('Trader.place-order-failed', err.asMessage());
            return null;
        });
    }

    cancelOrder(orderId: string): Promise<string> {
        // To avoid race conditions, we only actually remove the order
        // when the tradeFinalized message arrives.
        return this.api.cancelOrder(orderId);
    }

    cancelMyOrders(): Promise<string[]> {
        if (!this.myBook.orderPool) {
            return Promise.resolve([]);
        }
        const orderIds = Object.keys(this.myBook.orderPool);
        const promises: Promise<string>[] = orderIds.map((id: string) => {
            return this.cancelOrder(id);
        });
        return Promise.all(promises).then((ids: string[]) => {
            this.emitMessageAsync('Trader.my-orders-cancelled', ids);
            return ids;
        });
    }

    /**
     * Cancel all, and we mean ALL orders (even those not placed by this Trader). To cancel only the messages
     * listed in the in-memory orderbook, use `cancelMyOrders`
     */
    cancelAllOrders(productId?: string): Promise<string[]> {
        return (productId ? this.api.cancelAllOrders(productId) : this.api.cancelAllOrders()).then((ids: string[]) => {
            this.myBook.clear();
            this.emitMessageAsync('Trader.all-orders-cancelled', ids);
            return ids;
        }, (err: Error) => {
            this.emitMessageAsync('error', err);
            return [];
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
            return OrderbookDiff.compareByOrder(this.myBook, book);
        });
    }

    executeMessage(msg: any) {
        if (!isTraderStreamMessage(msg)) {
            return;
        }
        switch (msg.type) {
            case 'placeOrder':
                this.handleOrderRequest(msg);
                break;
            case 'cancelOrder':
                this.handleCancelOrder(msg);
                break;
            case 'cancelAllOrders':
                this.cancelAllOrders();
                break;
            case 'cancelMyOrders':
                this.cancelMyOrders();
                break;
            case 'tradeExecuted':
                this.handleTradeExecutedMessage(msg);
                break;
            case 'tradeFinalized':
                this.handleTradeFinalized(msg);
                break;
            case 'myOrderPlaced':
                this.handleOrderPlacedConfirmation(msg);
                break;
        }
    }

    _write(msg: any, _encoding: string, callback: (err?: Error) => any): void {
        this.executeMessage(msg);
        callback();
    }

    private handleOrderRequest(request: PlaceOrderMessage) {
        if (request.productId !== this._productId) {
            return;
        }
        this.placeOrder(request).then((result: LiveOrder) => {
            if (result) {
                this.emitMessageAsync('Trader.order-placed', result);
            }
        });
    }

    private handleCancelOrder(request: CancelOrderRequestMessage) {
        this.cancelOrder(request.orderId).then((result: string) => {
            this.emitMessageAsync('Trader.order-cancelled', result);
        }, (err: Error) => {
            this.emitMessageAsync('Trader.cancel-order-failed', err);
        });
    }

    private handleTradeExecutedMessage(msg: TradeExecutedMessage) {
        if (msg.orderType === 'market') {
            if (this.unfilledMarketOrders.has(msg.orderId)) {
                this.emit('Trader.trade-executed', msg);
            }
            return;
        }
        this.emit('Trader.trade-executed', msg);
        const order: Level3Order = this.myBook.getOrder(msg.orderId);
        if (!order) {
            this.logger.log('warn', 'Traded order not in my book', msg);
            this.emit('Trader.outOfSyncWarning',
                      `Traded order ${msg.orderId} not in my book`);
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
            this.unfilledMarketOrders.delete(id);
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
            this.logger.log('debug', 'Order confirmed', msg);
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
     * Wraps a message emission in a setImmediate. This should be called from inside Promise handlers, otherwise errors in the user code (event handler) will
     * get thrown from here, which leads to confusing stack traces.
     * @param {string} event
     * @param payload
     */
    private emitMessageAsync(event: string, payload: any) {
        setImmediate(() => {
            this.emit(event, payload);
        });
    }
}
