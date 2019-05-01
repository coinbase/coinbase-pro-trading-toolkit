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

import { CoinbaseProExchangeAPI } from './CoinbaseProExchangeAPI';
import { Big } from '../../lib/types';
import {
    ChangedOrderMessage,
    ErrorMessage,
    LevelMessage,
    MyOrderPlacedMessage,
    NewOrderMessage,
    OrderDoneMessage,
    SnapshotMessage,
    StreamMessage,
    TickerMessage,
    TradeExecutedMessage,
    TradeFinalizedMessage,
    TradeMessage,
    UnknownMessage
} from '../../core/Messages';
import { OrderPool } from '../../lib/BookBuilder';
import {
    CoinbaseProChangeMessage,
    CoinbaseProChannel,
    CoinbaseProDoneMessage,
    CoinbaseProErrorMessage,
    CoinbaseProL2UpdateMessage,
    CoinbaseProMatchMessage,
    CoinbaseProOpenMessage,
    CoinbaseProReceivedMessage,
    CoinbaseProSnapshotMessage,
    CoinbaseProSubscriptionsMessage,
    CoinbaseProTickerMessage,
    isCoinbaseProMessage
} from './CoinbaseProMessages';
import { AuthenticatedExchangeAPI } from '../AuthenticatedExchangeAPI';
import { staticAssertNever } from '../../lib/asserts';
import { Side, SIDES } from '../../lib/sides';
import { Level3Order, PriceLevelWithOrders } from '../../lib/Orderbook';
import { ExchangeFeed, ExchangeFeedConfig } from '../ExchangeFeed';
import { ExchangeAuthConfig } from '../AuthConfig';
import { AuthHeaders, CoinbaseProAuthConfig } from './CoinbaseProInterfaces';

export const COINBASE_PRO_WS_FEED = 'wss://ws-feed.pro.coinbase.com';

type CoinbaseProTradingMessage =
    CoinbaseProReceivedMessage |
    CoinbaseProOpenMessage |
    CoinbaseProDoneMessage |
    CoinbaseProMatchMessage |
    CoinbaseProChangeMessage;

/**
 * Configuration interface for a Coinbase Pro websocket feed stream. `wsUrl` is used to override the default websocket URL.
 * Usually, you don't need this, but you may want to obtain a feed from the sandbox for testing, or an historical
 * message source, for example.
 *
 * The channels array determines which types of messages are sent back down the feed. Leave this as null to receive
 * all messages, or specify any of
 *   - `level2` - The orderbook messages
 *   - `matches` - all trades
 *   - `ticker` - Ticker updates (these come after every trade, so specifying both `matches` and `ticker` may be redundant)
 *   - `user` - If you provided auth credentials, private messages will also be sent
 */
export interface CoinbaseProFeedConfig extends ExchangeFeedConfig {
    auth?: CoinbaseProAuthConfig;
    wsUrl: string;
    channels?: string[]; // If supplied, the channels to subscribe to. This feature may be deprecated in a future release
    apiUrl: string;
}

/**
 * The Coinbase Pro message feed. Messages are created via a combination of WS and REST calls, which are then sent down the pipe.
 * It handles automatically reconnects on errors and tracks the connection by monitoring a heartbeat.
 * You can create the feeds from here, but it's preferable to use the `getFeed` or `FeedFactory` functions to get a
 * connection from the pool.
 * Error messages from the Websocket feed are passed down the stream and also emitted as 'feed-error' events.
 */
export class CoinbaseProFeed extends ExchangeFeed {
    private readonly products: Set<string>;
    private readonly coinbaseProAPI: CoinbaseProExchangeAPI;
    private readonly internalSequence: { [index: string]: number } = {};
    private readonly channels: string[];

    constructor(config: CoinbaseProFeedConfig) {
        super(config);
        this.products = new Set<string>();
        this.channels = config.channels || ['level2', 'matches', 'ticker', 'user', 'heartbeat'];
        if (!(this.channels as any).includes('heartbeat')) {
            this.channels.push('heartbeat');
        }
        this.coinbaseProAPI = new CoinbaseProExchangeAPI(config);
        this.sensitiveKeys.push('passphrase');
        this.connect();
    }

    get owner(): string {
        return 'Coinbase Pro';
    }

    /**
     * Returns the Authenticated API instance if auth credentials were supplied in the constructor; null otherwise
     */
    get authenticatedAPI(): AuthenticatedExchangeAPI {
        if (this.auth) {
            return this.coinbaseProAPI;
        }
        return null;
    }

    /**
     * Subscribe to the products given in the `products` array.
     *
     * `subscribe` returns a Promise that resolves to true if the subscription was successful.
     */
    subscribe(products: string[]): Promise<boolean> {
        if (!this.isConnected()) {
            return Promise.reject(
                new Error('Socket is not connected. Have you called connect()? Otherwise the connection may have dropped and is in the process of reconnecting.')
            );
        }
        // To reset, we need to make a call with `product_ids` set
        return new Promise((resolve, reject) => {
            let subscribeMessage: any = {
                type: 'subscribe',
                product_ids: products      // Use product_id to prevent clearing the other subscriptions
            };
            subscribeMessage.channels = this.channels;
            // Add Signature
            if (this.auth) {
                subscribeMessage = this.signMessage(subscribeMessage);
            }
            this.send(subscribeMessage, (err: Error) => {
                if (err) {
                    this.log('error', `The subscription request to ${products.join(',')} on ${this.url} ${this.auth ? '(authenticated)' : ''} failed`, { error: err });
                    this.emit('error', err);
                    return reject(err);
                }
                return resolve(true);
            });
        });
    }

    protected onClose(code: number, reason: string) {
        // The feed has been closed by the other party. Wait a few seconds and then reconnect
        this.log('info', `The websocket feed to ${this.url} ${this.auth ? '(authenticated)' : ''} has been closed by an external party. We will reconnect in 5 seconds`, {
            code: code,
            reason: reason
        });
        this.reconnect(5000);
    }

    protected validateAuth(auth: ExchangeAuthConfig): ExchangeAuthConfig {
        auth = super.validateAuth(auth);
        return auth && (auth as CoinbaseProAuthConfig).passphrase ? auth : undefined;
    }

    /**
     * Converts a Coinbase Pro feed message into a CBPTT [[StreamMessage]] instance
     */
    protected handleMessage(msg: string): void {
        try {
            const feedMessage = JSON.parse(msg);
            if (!isCoinbaseProMessage(feedMessage)) {
                const m = this.mapUnknown(feedMessage);
                this.attachSequence(m, feedMessage);
                this.push(m);
                return;
            }

            let message: StreamMessage;
            switch (feedMessage.type) {
                case 'subscriptions':
                    this.setProducts(feedMessage);
                    return;
                case 'heartbeat':
                    this.confirmAlive();
                    return;
                case 'ticker':
                    message = this.mapTicker(feedMessage);
                    break;
                case 'l2update':
                    this.processUpdate(feedMessage);
                    return;
                case 'snapshot':
                    this.processSnapshot(this.createSnapshotMessage(feedMessage));
                    return;
                case 'error':
                    message = this.mapError(feedMessage);
                    break;
                default:
                    message = this.mapFullFeed(feedMessage);
            }
            if (message) {
                this.attachSequence(message, feedMessage);
                message.origin = feedMessage;
                this.push(message);
            }
        } catch (err) {
            err.ws_msg = msg;
            this.onError(err);
        }
    }

    protected onOpen() {
        // If we have any products (this might be a reconnect), then re-subscribe to them
        if (this.products.size > 0) {
            const products = Array.from(this.products);
            this.log('debug', `Resubscribing to ${products.join(' ')}...`);
            this.subscribe(products).then((result) => {
                if (result) {
                    this.log('debug', `Reconnection to ${products.join(', ')} successful`);
                } else {
                    this.log('debug', `We were already connected to the feed it seems.`);
                }
            }, (err) => {
                this.log('error', 'An error occurred while reconnecting. Trying again in 30s', { error: err });
                this.reconnect(30000);
            });
        }
    }

    private signMessage(msg: any): any {
        const headers: AuthHeaders = this.coinbaseProAPI.getSignature('GET', '/users/self/verify', '');
        msg.signature = headers['CB-ACCESS-SIGN'];
        msg.key = headers['CB-ACCESS-KEY'];
        msg.timestamp = headers['CB-ACCESS-TIMESTAMP'];
        msg.passphrase = headers['CB-ACCESS-PASSPHRASE'];
        return msg;
    }

    /**
     * Returns the current message counter value for the given product. This does not correspond to the
     * official sequence numbers of the message feeds (if they exist), but is purely an internal counter value
     */
    private getSequence(product: string) {
        if (!this.internalSequence[product]) {
            this.internalSequence[product] = 1;
        }
        return this.internalSequence[product];
    }

    private createSnapshotMessage(snapshot: CoinbaseProSnapshotMessage): SnapshotMessage {
        const product: string = snapshot.product_id;
        const orders: OrderPool = {};
        const snapshotMessage: SnapshotMessage = {
            type: 'snapshot',
            time: new Date(),
            productId: product,
            sequence: this.getSequence(product),
            asks: [],
            bids: [],
            orderPool: orders
        };
        SIDES.forEach((side) => {
            const levelArray = side === 'buy' ? 'bids' : 'asks';
            snapshot[levelArray].forEach(([price, size]) => {
                if (+size === 0) {
                    return;
                }
                const newOrder: Level3Order = {
                    id: price,
                    price: Big(price),
                    size: Big(size),
                    side: side
                };
                const level: PriceLevelWithOrders = {
                    price: Big(price),
                    totalSize: Big(size),
                    orders: [newOrder]
                };
                snapshotMessage[levelArray].push(level);
                orders[newOrder.id] = newOrder;
            });
        });
        return snapshotMessage;
    }

    private processUpdate(update: CoinbaseProL2UpdateMessage) {
        const product: string = update.product_id;
        const time = new Date();
        update.changes.forEach(([side, price, newSize]) => {
            this.internalSequence[product] = this.getSequence(product) + 1;
            const message: LevelMessage = {
                type: 'level',
                time: time,
                price: price,
                size: newSize,
                count: 1,
                sequence: this.getSequence(product),
                productId: product,
                side: side,
                origin: update
            };
            this.push(message);
        });
    }

    private attachSequence(streamMessage: StreamMessage,
                           feedMessage: any): void {
        if ((feedMessage as any).sequence) {
            (streamMessage as any).sourceSequence = (feedMessage as any).sequence;
        }
    }

    private mapError(errorMessage: CoinbaseProErrorMessage): ErrorMessage {
        const msg: ErrorMessage = {
            type: 'error',
            time: new Date(),
            message: errorMessage.message,
            meta: errorMessage
        };
        this.emit('feed-error', msg);
        return msg;
    }

    private mapUnknown(unknown: any): UnknownMessage {
        const time = unknown.time ? new Date(unknown.time) : new Date();
        const product = unknown.product_id;
        const sequence = unknown.sequence || (product && this.getSequence(product));
        const msg: UnknownMessage = {
            type: 'unknown',
            time: time,
            sequence: sequence,
            productId: product,
            origin: unknown
        };
        return msg;
    }

    private mapTicker(ticker: CoinbaseProTickerMessage): TickerMessage {
        const msg: TickerMessage = {
            type: 'ticker',
            time: ticker.time ? new Date(ticker.time) : new Date(),
            productId: ticker.product_id,
            sequence: ticker.sequence,
            price: Big(ticker.price),
            bid: Big(ticker.best_bid),
            ask: Big(ticker.best_ask),
            trade_id: String(ticker.trade_id),
            size: Big(ticker.last_size),
            volume: Big(ticker.volume_24h)
        };
        return msg;
    }

    private mapFullFeed(feedMessage: CoinbaseProTradingMessage): StreamMessage {
        if (feedMessage.user_id) {
            return this.mapAuthMessage(feedMessage);
        } else {
            return this.mapMessage(feedMessage);
        }
    }

    private processSnapshot(snapshot: SnapshotMessage) {
        this.push(snapshot);
        process.nextTick(() => {
            this.emit('snapshot', snapshot.productId);
        });
    }

    /**
     * Converts Coinbase Pro messages into standardised CBPTT messages. Unknown messages are passed on as_is
     * @param feedMessage
     */
    private mapMessage(feedMessage: CoinbaseProTradingMessage): StreamMessage {
        switch (feedMessage.type) {
            case 'open': {
                const msg: NewOrderMessage = {
                    type: 'newOrder',
                    time: new Date(feedMessage.time),
                    sequence: feedMessage.sequence,
                    productId: feedMessage.product_id,
                    orderId: feedMessage.order_id,
                    side: feedMessage.side,
                    price: feedMessage.price,
                    size: feedMessage.remaining_size
                };
                return msg;
            }
            case 'done': {
                // remaining size is usually 0 -- and the corresponding match messages will have adjusted the orderbook
                // There are cases when market orders are filled but remaining size is non-zero. This is as a result of STP
                // or rounding, but the accounting is nevertheless correct. So if reason is 'filled' we can set the size
                // to zero before removing the order. Otherwise if cancelled, remaining_size refers to the size
                // that was on the order book
                const size = feedMessage.reason === 'filled' ? '0' : feedMessage.remaining_size;
                const msg: OrderDoneMessage = {
                    type: 'orderDone',
                    time: new Date(feedMessage.time),
                    sequence: feedMessage.sequence,
                    productId: feedMessage.product_id,
                    orderId: feedMessage.order_id,
                    remainingSize: size,
                    price: feedMessage.price,
                    side: feedMessage.side,
                    reason: feedMessage.reason
                };
                return msg;
            }
            case 'match': {
                return this.mapMatchMessage(feedMessage);
            }
            case 'change': {
                if (feedMessage.new_funds && !feedMessage.new_size) {
                    feedMessage.new_size = (Big(feedMessage.new_funds).div(feedMessage.price).toString());
                }
                const msg: ChangedOrderMessage = {
                    type: 'changedOrder',
                    time: new Date(feedMessage.time),
                    sequence: feedMessage.sequence,
                    productId: feedMessage.product_id,
                    orderId: feedMessage.order_id,
                    side: feedMessage.side,
                    price: feedMessage.price,
                    newSize: feedMessage.new_size
                };
                return msg;
            }
            case 'received': {
                return this.mapUnknown(feedMessage);
            }
            default: {
                staticAssertNever(feedMessage);
                return this.mapUnknown(feedMessage);
            }
        }
    }

    private mapMatchMessage(msg: CoinbaseProMatchMessage): TradeMessage {
        const takerSide: Side = msg.side === 'buy' ? 'sell' : 'buy';
        const trade: TradeMessage = {
            type: 'trade',
            time: new Date(msg.time),
            productId: msg.product_id,
            tradeId: msg.trade_id,
            side: takerSide,
            price: msg.price,
            size: msg.size
        };
        return trade;
    }

    /**
     * When the user_id field is set, these are authenticated messages only we receive and so deserve special
     * consideration
     */
    private mapAuthMessage(feedMessage: CoinbaseProTradingMessage): StreamMessage {
        switch (feedMessage.type) {
            case 'match': {
                const isTaker: boolean = !!feedMessage.taker_user_id;
                let side: Side;
                if (!isTaker) {
                    side = feedMessage.side;
                } else {
                    side = feedMessage.side === 'buy' ? 'sell' : 'buy';
                }
                const msg: TradeExecutedMessage = {
                    type: 'tradeExecuted',
                    time: new Date(feedMessage.time),
                    productId: feedMessage.product_id,
                    orderId: isTaker ? feedMessage.taker_order_id : feedMessage.maker_order_id,
                    orderType: isTaker ? 'market' : 'limit',
                    side: side,
                    price: feedMessage.price,
                    tradeSize: feedMessage.size,
                    remainingSize: null
                };
                return msg;
            }
            case 'done': {
                const msg: TradeFinalizedMessage = {
                    type: 'tradeFinalized',
                    time: new Date(feedMessage.time),
                    productId: feedMessage.product_id,
                    orderId: feedMessage.order_id,
                    reason: feedMessage.reason,
                    side: feedMessage.side,
                    price: feedMessage.price,
                    remainingSize: feedMessage.remaining_size
                };
                return msg;
            }
            case 'open': {
                const msg: MyOrderPlacedMessage = {
                    type: 'myOrderPlaced',
                    time: new Date(feedMessage.time),
                    productId: feedMessage.product_id,
                    orderId: feedMessage.order_id,
                    side: feedMessage.side,
                    price: feedMessage.price,
                    size: feedMessage.remaining_size,
                    sequence: feedMessage.sequence
                };
                return msg;
            }
            case 'change':
            case 'received': {
                return this.mapUnknown(feedMessage);
            }
            default: {
                staticAssertNever(feedMessage);
                return this.mapUnknown(feedMessage);
            }
        }
    }

    private setProducts(msg: CoinbaseProSubscriptionsMessage) {
        msg.channels.forEach((ch: CoinbaseProChannel) => {
            ch.product_ids.forEach((p: string) => this.products.add(p));
        });
        this.log('debug', 'Coinbase Pro Feed subscriptions confirmed', msg);
    }
}
