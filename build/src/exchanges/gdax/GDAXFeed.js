"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const GDAXExchangeAPI_1 = require("./GDAXExchangeAPI");
const types_1 = require("../../lib/types");
const ExchangeFeed_1 = require("../ExchangeFeed");
exports.GDAX_WS_FEED = 'wss://ws-feed.gdax.com';
/**
 * The GDAX message feed. Messages are created via a combination of WS and REST calls, which are then sent down the pipe.
 * It handles automatically reconnects on errors and tracks the connection by monitoring a heartbeat.
 * You can create the feeds from here, but it's preferable to use the `getFeed` or `FeedFactory` functions to get a
 * connection from the pool.
 * Error messages from the Websocket feed are passed down the stream and also emitted as 'feederror' events.
 */
class GDAXFeed extends ExchangeFeed_1.ExchangeFeed {
    constructor(config) {
        super(config);
        this.queue = {};
        this.queueing = {};
        this.internalSequence = {};
        this.products = new Set();
        this.channels = config.channels || ['level2', 'matches', 'ticker', 'user', 'heartbeat'];
        if (!this.channels.includes('heartbeat')) {
            this.channels.push('heartbeat');
        }
        this.gdaxAPI = new GDAXExchangeAPI_1.GDAXExchangeAPI(config);
        this.sensitiveKeys.push('passphrase');
        this.connect();
    }
    get owner() {
        return 'GDAX';
    }
    /**
     * Returns the Authenticated API instance if auth credentials were supplied in the constructor; null otherwise
     */
    get authenticatedAPI() {
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
    subscribe(products) {
        if (!this.isConnected()) {
            return Promise.reject(new Error('Socket is not connected. Have you called connect()? Otherwise the connection may have dropped and is in the process of reconnecting.'));
        }
        // To reset, we need to make a call with `product_ids` set
        return new Promise((resolve, reject) => {
            let subscribeMessage = {
                type: 'subscribe',
                product_ids: products // Use product_id to prevent clearing the other subscriptions
            };
            subscribeMessage.channels = this.channels;
            // Add Signature
            if (this.auth) {
                subscribeMessage = this.signMessage(subscribeMessage);
            }
            this.send(subscribeMessage, (err) => {
                if (err) {
                    this.log('error', `The subscription request to ${products.join(',')} on ${this.url} ${this.auth ? '(authenticated)' : ''} failed`, { error: err });
                    this.emit('error', err);
                    return reject(err);
                }
                return resolve(true);
            });
        });
    }
    onClose(code, reason) {
        // The feed has been closed by the other party. Wait a few seconds and then reconnect
        this.log('info', `The websocket feed to ${this.url} ${this.auth ? '(authenticated)' : ''} has been closed by an external party. We will reconnect in 5 seconds`, {
            code: code,
            reason: reason
        });
        this.reconnect(5000);
    }
    validateAuth(auth) {
        auth = super.validateAuth(auth);
        return auth && auth.passphrase ? auth : undefined;
    }
    /**
     * Converts a GDAX feed message into a GTT [[StreamMessage]] instance
     */
    handleMessage(msg) {
        try {
            const feedMessage = JSON.parse(msg);
            let message;
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
                default:
                    message = this.mapFullFeed(feedMessage);
            }
            if (message) {
                if (feedMessage.sequence) {
                    message.sourceSequence = feedMessage.sequence;
                }
                message.origin = feedMessage;
                this.pushMessage(message);
            }
        }
        catch (err) {
            err.ws_msg = msg;
            this.onError(err);
        }
    }
    onOpen() {
        // If we have any products (this might be a reconnect), then re-subscribe to them
        if (this.products.size > 0) {
            const products = Array.from(this.products);
            this.log('debug', `Resubscribing to ${products.join(' ')}...`);
            this.subscribe(products).then((result) => {
                if (result) {
                    this.log('debug', `Reconnection to ${products.join(', ')} successful`);
                }
                else {
                    this.log('debug', `We were already connected to the feed it seems.`);
                }
            }, (err) => {
                this.log('error', 'An error occurred while reconnecting. Trying again in 30s', { error: err });
                this.reconnect(30000);
            });
        }
    }
    signMessage(msg) {
        const headers = this.gdaxAPI.getSignature('GET', '/users/self/verify', '');
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
    getSequence(product) {
        if (!this.internalSequence[product]) {
            this.internalSequence[product] = 1;
        }
        return this.internalSequence[product];
    }
    /**
     * Marked for deprecation
     */
    pushMessage(message) {
        const product = message.productId;
        const needsQueue = message.sequence && this.queueing[product];
        // If we're waiting for a snapshot, and the message needs one (i.e. has a sequence  number) queue it up, else send it straight on
        if (!product || !needsQueue) {
            this.push(message);
            return;
        }
        this.queue[product].push(message);
    }
    createSnapshotMessage(snapshot) {
        const product = snapshot.product_id;
        const orders = {};
        const snapshotMessage = {
            type: 'snapshot',
            time: new Date(),
            productId: product,
            sequence: this.getSequence(product),
            asks: [],
            bids: [],
            orderPool: orders
        };
        ['buy', 'sell'].forEach((side) => {
            const levelArray = side === 'buy' ? 'bids' : 'asks';
            snapshot[levelArray].forEach(([price, size]) => {
                if (+size === 0) {
                    return;
                }
                const newOrder = {
                    id: price,
                    price: types_1.Big(price),
                    size: types_1.Big(size),
                    side: side
                };
                const level = {
                    price: types_1.Big(price),
                    totalSize: types_1.Big(size),
                    orders: [newOrder]
                };
                snapshotMessage[levelArray].push(level);
                orders[newOrder.id] = newOrder;
            });
        });
        return snapshotMessage;
    }
    processUpdate(update) {
        const product = update.product_id;
        update.changes.forEach(([side, price, newSize]) => {
            this.internalSequence[product] = this.getSequence(product) + 1;
            const message = {
                type: 'level',
                time: new Date(),
                price: price,
                size: newSize,
                count: 1,
                sequence: this.getSequence(product),
                productId: update.product_id,
                side: side,
                origin: update
            };
            this.pushMessage(message);
        });
    }
    mapTicker(ticker) {
        return {
            type: 'ticker',
            time: new Date(ticker.time),
            productId: ticker.product_id,
            sequence: ticker.sequence,
            price: types_1.Big(ticker.price),
            bid: types_1.Big(ticker.best_bid),
            ask: types_1.Big(ticker.best_ask),
            trade_id: String(ticker.trade_id),
            size: types_1.Big(ticker.last_size)
        };
    }
    mapFullFeed(feedMessage) {
        if (feedMessage.user_id) {
            return this.mapAuthMessage(feedMessage);
        }
        const message = this.mapMessage(feedMessage);
        return message;
    }
    processSnapshot(snapshot) {
        this.push(snapshot);
        this.emit('snapshot');
    }
    /**
     * Converts GDAX messages into standardised GTT messages. Unknown messages are passed on as_is
     * @param feedMessage
     */
    mapMessage(feedMessage) {
        switch (feedMessage.type) {
            case 'open':
                return {
                    type: 'newOrder',
                    time: new Date(feedMessage.time),
                    sequence: feedMessage.sequence,
                    productId: feedMessage.product_id,
                    orderId: feedMessage.order_id,
                    side: feedMessage.side,
                    price: feedMessage.price,
                    size: feedMessage.remaining_size
                };
            case 'done':
                // remaining size is usually 0 -- and the corresponding match messages will have adjusted the orderbook
                // There are cases when market orders are filled but remaining size is non-zero. This is as a result of STP
                // or rounding, but the accounting is nevertheless correct. So if reason is 'filled' we can set the size
                // to zero before removing the order. Otherwise if cancelled, remaining_size refers to the size
                // that was on the order book
                const size = feedMessage.reason === 'filled' ? '0' : feedMessage.remaining_size;
                return {
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
            case 'match':
                return this.mapMatchMessage(feedMessage);
            case 'change':
                const change = feedMessage;
                if (change.new_funds && !change.new_size) {
                    change.new_size = (types_1.Big(change.new_funds).div(change.price).toString());
                }
                return {
                    type: 'changedOrder',
                    time: new Date(change.time),
                    sequence: change.sequence,
                    productId: change.product_id,
                    orderId: change.order_id,
                    side: change.side,
                    price: change.price,
                    newSize: change.new_size
                };
            case 'error':
                const error = feedMessage;
                const msg = {
                    type: 'error',
                    time: new Date(),
                    message: error.message,
                    cause: error.reason
                };
                this.emit('feed-error', msg);
                return msg;
            case 'received':
                return {
                    type: 'unknown',
                    time: new Date(),
                    sequence: feedMessage.sequence,
                    productId: feedMessage.product_id,
                    message: feedMessage
                };
            default:
                const product = feedMessage.product_id;
                return {
                    type: 'unknown',
                    time: new Date(),
                    sequence: this.getSequence(product),
                    productId: product,
                    message: feedMessage
                };
        }
    }
    mapMatchMessage(msg) {
        const takerSide = msg.side === 'buy' ? 'sell' : 'buy';
        const trade = {
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
    mapAuthMessage(feedMessage) {
        const time = feedMessage.time ? new Date(feedMessage.time) : new Date();
        switch (feedMessage.type) {
            case 'match':
                const isTaker = !!feedMessage.taker_user_id;
                let side;
                if (!isTaker) {
                    side = feedMessage.side;
                }
                else {
                    side = feedMessage.side === 'buy' ? 'sell' : 'buy';
                }
                return {
                    type: 'tradeExecuted',
                    time: time,
                    productId: feedMessage.product_id,
                    orderId: isTaker ? feedMessage.taker_order_id : feedMessage.maker_order_id,
                    orderType: isTaker ? 'market' : 'limit',
                    side: side,
                    price: feedMessage.price,
                    tradeSize: feedMessage.size,
                    remainingSize: null
                };
            case 'done':
                return {
                    type: 'tradeFinalized',
                    time: time,
                    productId: feedMessage.product_id,
                    orderId: feedMessage.order_id,
                    reason: feedMessage.reason,
                    side: feedMessage.side,
                    price: feedMessage.price,
                    filledSize: feedMessage.size,
                    remainingSize: feedMessage.remaining_size
                };
            case 'open':
                return {
                    type: 'myOrderPlaced',
                    time: time,
                    productId: feedMessage.product_id,
                    orderId: feedMessage.order_id,
                    side: feedMessage.side,
                    price: feedMessage.price,
                    orderType: feedMessage.type,
                    size: feedMessage.remaining_size,
                    sequence: feedMessage.sequence
                };
            default:
                return {
                    type: 'unknown',
                    productId: feedMessage.product_id
                };
        }
    }
    setProducts(msg) {
        msg.channels.forEach((ch) => {
            ch.product_ids.forEach((p) => this.products.add(p));
        });
        this.log('debug', 'GDAX Feed subscriptions confirmed', msg);
    }
}
exports.GDAXFeed = GDAXFeed;
//# sourceMappingURL=GDAXFeed.js.map