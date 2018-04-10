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

import { GDAXExchangeAPI } from './GDAXExchangeAPI';
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
    GDAXChangeMessage,
    GDAXChannel,
    GDAXDoneMessage,
    GDAXErrorMessage,
    GDAXL2UpdateMessage,
    GDAXMatchMessage,
    GDAXMessage,
    GDAXOpenMessage,
    GDAXSnapshotMessage,
    GDAXSubscriptionsMessage,
    GDAXTickerMessage
} from './GDAXMessages';
import { AuthenticatedExchangeAPI } from '../AuthenticatedExchangeAPI';
import { Level3Order, PriceLevelWithOrders } from '../../lib/Orderbook';
import { ExchangeFeed, ExchangeFeedConfig } from '../ExchangeFeed';
import { ExchangeAuthConfig } from '../AuthConfig';
import { AuthHeaders, GDAXAuthConfig } from './GDAXInterfaces';

export const GDAX_WS_FEED = 'wss://ws-feed.gdax.com';

/**
 * Configuration interface for a GDAX websocket feed stream. `wsUrl` is used to override the default websocket URL.
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
export interface GDAXFeedConfig extends ExchangeFeedConfig {
    auth?: GDAXAuthConfig;
    wsUrl: string;
    channels?: string[]; // If supplied, the channels to subscribe to. This feature may be deprecated in a future release
    apiUrl: string;
}

/**
 * The GDAX message feed. Messages are created via a combination of WS and REST calls, which are then sent down the pipe.
 * It handles automatically reconnects on errors and tracks the connection by monitoring a heartbeat.
 * You can create the feeds from here, but it's preferable to use the `getFeed` or `FeedFactory` functions to get a
 * connection from the pool.
 * Error messages from the Websocket feed are passed down the stream and also emitted as 'feederror' events.
 */
export class GDAXFeed extends ExchangeFeed {
    private products: Set<string>;
    private gdaxAPI: GDAXExchangeAPI;
    private internalSequence: { [index: string]: number } = {};
    private channels: string[];

    constructor(config: GDAXFeedConfig) {
        super(config);
        this.products = new Set<string>();
        this.channels = config.channels || ['level2', 'matches', 'ticker', 'user', 'heartbeat'];
        if (!(this.channels as any).includes('heartbeat')) {
            this.channels.push('heartbeat');
        }
        this.gdaxAPI = new GDAXExchangeAPI(config);
        this.sensitiveKeys.push('passphrase');
        this.connect();
    }

    get owner(): string {
        return 'GDAX';
    }

    /**
     * Returns the Authenticated API instance if auth credentials were supplied in the constructor; null otherwise
     */
    get authenticatedAPI(): AuthenticatedExchangeAPI {
        if (this.auth) {
            return this.gdaxAPI;
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
        return auth && (auth as GDAXAuthConfig).passphrase ? auth : undefined;
    }

    /**
     * Converts a GDAX feed message into a GTT [[StreamMessage]] instance
     */
    protected handleMessage(msg: string): void {
        try {
            const feedMessage: GDAXMessage = JSON.parse(msg);
            let message: StreamMessage;
            switch (feedMessage.type) {
                case 'subscriptions':
                    this.setProducts(feedMessage as any);
                    return;
                case 'heartbeat':
                    this.confirmAlive();
                    return;
                case 'ticker':
                    message = this.mapTicker(feedMessage as GDAXTickerMessage);
                    break;
                case 'l2update':
                    this.processUpdate(feedMessage as GDAXL2UpdateMessage);
                    return;
                case 'snapshot':
                    this.processSnapshot(this.createSnapshotMessage(feedMessage as GDAXSnapshotMessage));
                    return;
                default:
                    message = this.mapFullFeed(feedMessage);
            }
            if (message) {
                if ((feedMessage as any).sequence) {
                    (message as any).sourceSequence = (feedMessage as any).sequence;
                }
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
        const headers: AuthHeaders = this.gdaxAPI.getSignature('GET', '/users/self/verify', '');
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

    private createSnapshotMessage(snapshot: GDAXSnapshotMessage): SnapshotMessage {
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
        ['buy', 'sell'].forEach((side: string) => {
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

    private processUpdate(update: GDAXL2UpdateMessage) {
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

    private mapTicker(ticker: GDAXTickerMessage): StreamMessage {
        return {
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
        } as TickerMessage;
    }

    private mapFullFeed(feedMessage: GDAXMessage): StreamMessage {
        if (feedMessage.user_id) {
            return this.mapAuthMessage(feedMessage);
        }
        const message: StreamMessage = this.mapMessage(feedMessage);
        return message;
    }

    private processSnapshot(snapshot: SnapshotMessage) {
        this.push(snapshot);
        this.emit('snapshot');
    }

    /**
     * Converts GDAX messages into standardised GTT messages. Unknown messages are passed on as_is
     * @param feedMessage
     */
    private mapMessage(feedMessage: GDAXMessage): StreamMessage {
        switch (feedMessage.type) {
            case 'open': {
                const msg: NewOrderMessage = {
                    type: 'newOrder',
                    time: new Date((feedMessage as GDAXOpenMessage).time),
                    sequence: (feedMessage as GDAXOpenMessage).sequence,
                    productId: (feedMessage as GDAXOpenMessage).product_id,
                    orderId: (feedMessage as GDAXOpenMessage).order_id,
                    side: (feedMessage as GDAXOpenMessage).side,
                    price: (feedMessage as GDAXOpenMessage).price,
                    size: (feedMessage as GDAXOpenMessage).remaining_size
                };
                return msg;
            }
            case 'done': {
                // remaining size is usually 0 -- and the corresponding match messages will have adjusted the orderbook
                // There are cases when market orders are filled but remaining size is non-zero. This is as a result of STP
                // or rounding, but the accounting is nevertheless correct. So if reason is 'filled' we can set the size
                // to zero before removing the order. Otherwise if cancelled, remaining_size refers to the size
                // that was on the order book
                const size = (feedMessage as GDAXDoneMessage).reason === 'filled' ? '0' : (feedMessage as GDAXDoneMessage).remaining_size;
                const msg: OrderDoneMessage = {
                    type: 'orderDone',
                    time: new Date((feedMessage as GDAXDoneMessage).time),
                    sequence: (feedMessage as GDAXDoneMessage).sequence,
                    productId: (feedMessage as GDAXDoneMessage).product_id,
                    orderId: (feedMessage as GDAXDoneMessage).order_id,
                    remainingSize: size,
                    price: (feedMessage as GDAXDoneMessage).price,
                    side: (feedMessage as GDAXDoneMessage).side,
                    reason: (feedMessage as GDAXDoneMessage).reason
                };
                return msg;
            }
            case 'match': {
                return this.mapMatchMessage(feedMessage as GDAXMatchMessage);
            }
            case 'change': {
                const change: GDAXChangeMessage = feedMessage as GDAXChangeMessage;
                if (change.new_funds && !change.new_size) {
                    change.new_size = (Big(change.new_funds).div(change.price).toString());
                }
                const msg: ChangedOrderMessage = {
                    type: 'changedOrder',
                    time: new Date(change.time),
                    sequence: change.sequence,
                    productId: change.product_id,
                    orderId: change.order_id,
                    side: change.side,
                    price: change.price,
                    newSize: change.new_size
                };
                return msg;
            }
            case 'error': {
                const error: GDAXErrorMessage = feedMessage as GDAXErrorMessage;
                const msg: ErrorMessage = {
                    type: 'error',
                    time: new Date(),
                    message: error.message,
                    cause: error.reason
                };
                this.emit('feed-error', msg);
                return msg;
            }
            case 'received': {
                const msg: UnknownMessage = {
                    type: 'unknown',
                    time: new Date(),
                    sequence: (feedMessage as any).sequence,
                    productId: (feedMessage as any).product_id,
                    extra: feedMessage
                };
                return msg;
            }
            default: {
                const product: string = (feedMessage as any).product_id;
                const msg: UnknownMessage = {
                    type: 'unknown',
                    time: new Date(),
                    sequence: this.getSequence(product),
                    productId: product,
                    extra: feedMessage
                };
                return msg;
            }
        }
    }

    private mapMatchMessage(msg: GDAXMatchMessage): TradeMessage {
        const takerSide: string = msg.side === 'buy' ? 'sell' : 'buy';
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
    private mapAuthMessage(feedMessage: GDAXMessage): StreamMessage {
        const time = (feedMessage as any).time ? new Date((feedMessage as any).time) : new Date();
        switch (feedMessage.type) {
            case 'match': {
                const isTaker: boolean = !!(feedMessage as any).taker_user_id;
                let side: string;
                if (!isTaker) {
                    side = (feedMessage as GDAXMatchMessage).side;
                } else {
                    side = (feedMessage as GDAXMatchMessage).side === 'buy' ? 'sell' : 'buy';
                }
                const msg: TradeExecutedMessage = {
                    type: 'tradeExecuted',
                    time: time,
                    productId: (feedMessage as GDAXMatchMessage).product_id,
                    orderId: isTaker ? (feedMessage as GDAXMatchMessage).taker_order_id : (feedMessage as GDAXMatchMessage).maker_order_id,
                    orderType: isTaker ? 'market' : 'limit',
                    side: side,
                    price: (feedMessage as GDAXMatchMessage).price,
                    tradeSize: (feedMessage as GDAXMatchMessage).size,
                    remainingSize: null
                };
                return msg;
            }
            case 'done': {
                const msg: TradeFinalizedMessage = {
                    type: 'tradeFinalized',
                    time: time,
                    productId: (feedMessage as GDAXDoneMessage).product_id,
                    orderId: (feedMessage as GDAXDoneMessage).order_id,
                    reason: (feedMessage as GDAXDoneMessage).reason,
                    side: (feedMessage as GDAXDoneMessage).side,
                    price: (feedMessage as GDAXDoneMessage).price,
                    remainingSize: (feedMessage as GDAXDoneMessage).remaining_size
                };
                return msg;
            }
            case 'open': {
                const msg: MyOrderPlacedMessage = {
                    type: 'myOrderPlaced',
                    time: time,
                    productId: (feedMessage as GDAXOpenMessage).product_id,
                    orderId: (feedMessage as GDAXOpenMessage).order_id,
                    side: (feedMessage as GDAXOpenMessage).side,
                    price: (feedMessage as GDAXOpenMessage).price,
                    orderType: (feedMessage as GDAXOpenMessage).type,
                    size: (feedMessage as GDAXOpenMessage).remaining_size,
                    sequence: (feedMessage as GDAXOpenMessage).sequence
                };
                return msg;
            }
            default: {
                const msg: UnknownMessage = {
                    type: 'unknown',
                    time: time,
                    productId: (feedMessage as any).product_id
                };
                return msg;
            }
        }
    }

    private setProducts(msg: GDAXSubscriptionsMessage) {
        msg.channels.forEach((ch: GDAXChannel) => {
            ch.product_ids.forEach((p: string) => this.products.add(p));
        });
        this.log('debug', 'GDAX Feed subscriptions confirmed', msg);
    }
}
