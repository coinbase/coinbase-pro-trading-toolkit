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
const crypto = require("crypto");
const BitfinexCommon_1 = require("./BitfinexCommon");
const types_1 = require("../../lib/types");
const ExchangeFeed_1 = require("../ExchangeFeed");
/**
 * A client class exposing the Bitfinex public websocket feed
 *
 * The possible channels to subscribe to are: ticker, book, trades
 *
 * The raw feed is re-interpreted and emitted as POJOs rather than Bitfinex's array structures.
 * If StandardMessages is true, the following standard messages are emitted
 *   ticker, snapshot, open, done, match
 *
 * The following events are emitted if standardMessages is false:
 *   bitfinex-ticker: BitfinexTickerMessage
 *   bitfinex-orderbook-snapshot: BitfinexOrderbookSnapshot
 *   bitfinex-orderbook-update: BitfinexOrderMessage
 *   bitfinex-trade-snapshot: BitfinexTradeSnapshot
 *   bitfinex-trade-update: BitfinexTradeMessage
 *
 * The following operational messages are also emitted
 *   close, error, open, connection
 *
 */
class BitfinexFeed extends ExchangeFeed_1.ExchangeFeed {
    constructor(config) {
        super(config);
        this.standardMessages = config.standardMessages || true;
        this.clearChannels();
        this.sequence = 0;
        this.snapshotDepth = config.snapshotDepth || 250;
        this.connect();
    }
    get owner() {
        return 'Bitfinex';
    }
    clearChannels() {
        this.subscriptions = {};
    }
    /**
     * Resubscribe to channels using fire-and-forget.
     */
    resubscribeAll() {
        for (const chanId in this.subscriptions) {
            const channel = this.subscriptions[chanId];
            this.unsubscribe(chanId);
            this.subscribe(channel.type, channel.pair);
            this.removeSubscription({ chanId: channel.id });
        }
    }
    subscribe(channelType, product) {
        let subscribeMessage;
        switch (channelType) {
            case 'book':
                subscribeMessage = {
                    event: 'subscribe',
                    freq: 'F0',
                    channel: 'book',
                    pair: product,
                    prec: BitfinexCommon_1.ORDERBOOK_PRECISION[product],
                    len: this.snapshotDepth.toString()
                };
                break;
            case 'ticker':
            case 'trades':
                subscribeMessage = {
                    event: 'subscribe',
                    channel: channelType,
                    pair: product
                };
                break;
            case 'auth':
                subscribeMessage = this.getAuthMessage();
                if (!subscribeMessage) {
                    return;
                }
                break;
        }
        this.send(subscribeMessage, (err) => {
            this.log('error', `Error subscribing to Bitfinex channel ${channelType} ${product}`, err);
        });
    }
    unsubscribe(chanId) {
        const unsubscribeMessage = {
            event: 'unsubscribe',
            chanId: chanId
        };
        this.send(unsubscribeMessage);
    }
    onOpen() {
        // set a pinger to keep the socket alive
        this.pinger = setInterval(() => {
            this.send({ event: 'ping' });
        }, 120000);
        this.resubscribeAll();
    }
    onClose(code, reason) {
        clearInterval(this.pinger);
        super.onClose(code, reason);
    }
    handleMessage(data) {
        const self = this;
        let msg;
        try {
            msg = JSON.parse(data);
        }
        catch (e) {
            this.log('warn', 'Invalid WS message from Bitfinex', { data: data });
            return;
        }
        if (msg.event) {
            return handle_info_event(msg);
        }
        if (this.paused) {
            return;
        }
        if (!(Array.isArray(msg))) {
            this.log('warn', 'Unknown Bitfinex message type', { data: msg });
            return;
        }
        const channelId = msg[0];
        const channel = this.subscriptions[channelId];
        if (!channel) {
            this.log('debug', 'Received message for unknown channel', msg);
            return;
        }
        // Heartbeat message
        if (msg[1] === 'hb') {
            self.subscriptions[msg[0]].lastHB = new Date();
            return;
        }
        const type = channel.type;
        switch (type) {
            case 'ticker':
                return handle_ticker_message(msg);
            case 'book':
                return handle_book_message(msg);
            case 'trades':
                return handle_trade_message(msg);
            case 'auth':
                return handle_auth_message(msg);
            default:
                this.log('warn', 'Unknown Bitfinex WS message type', msg);
        }
        function handle_info_event(message) {
            self.log('info', 'Info event from Bitfinex Websocket', message);
            if (message.code === 20060) {
                self.log('warn', 'Bitfinex is syncing trading engine. Pausing messages until they resume');
                self.paused = true;
                return;
            }
            if (message.code === 20061) {
                // As per the Bitfinex API docs, we should un- and re-subscribe to all channels after an update
                self.log('info', 'Bitfinex syncing complete. Resuming message processing');
                self.paused = false;
                self.resubscribeAll();
                return;
            }
            if (message.event === 'subscribed') {
                self.addSubscription(message);
                return;
            }
            if (message.event === 'unsubscribed') {
                self.removeSubscription(message);
                return;
            }
            if (message.event === 'pong') {
                self.log('debug', 'Bitfinex WS feed: Pong!');
                return;
            }
            if (message.version) {
                if (message.version !== BitfinexCommon_1.WEBSOCKET_API_VERSION) {
                    const err = 'Error. Bitfinex websocket API version has changed to ' + message.version;
                    self.log('info', err);
                    self.emit('error', new Error(err));
                }
                return;
            }
            self.log('info', 'Info channel on Bitfinex WS feed received an unknown message', message);
        }
        function handle_ticker_message(message) {
            if (message.length === 11) {
                const ticker = {
                    channel_id: message[0],
                    bid: message[1],
                    bid_size: message[2],
                    ask: message[3],
                    ask_size: message[4],
                    daily_change: message[5],
                    daily_change_perc: message[6],
                    last_price: message[7],
                    volume: message[8],
                    high: message[9],
                    low: message[10]
                };
                if (self.standardMessages) {
                    self.push(self.mapTicker(ticker));
                }
                else {
                    self.push(ticker);
                }
                return;
            }
            self.log('warn', 'Ticker channel on Bitfinex WS feed received an unknown message', message);
        }
        function handle_book_message(message) {
            // Handle snapshot
            if (message.length === 2 && Array.isArray(message[1])) {
                self.log('info', 'Bitfinex orderbook snapshot received');
                const snapshot = {
                    channel_id: message[0],
                    orders: message[1].map((order) => {
                        return { price: order[0], count: parseInt(order[1], 10), size: order[2] };
                    })
                };
                if (self.standardMessages) {
                    self.push(self.mapSnapshot(snapshot));
                }
                else {
                    self.push(snapshot);
                }
                return;
            }
            // Handle update
            if (message.length === 4) {
                const order = {
                    channel_id: message[0],
                    price: message[1],
                    count: message[2],
                    size: message[3]
                };
                if (self.standardMessages) {
                    const mappedMessage = self.mapOrderMessage(order);
                    self.push(mappedMessage);
                }
                else {
                    self.push(order);
                }
                return;
            }
            self.log('info', 'Orderbook channel on Bitfinex WS feed received an unknown message', { data: message });
        }
        function handle_trade_message(message) {
            // Handle snapshot
            if (message.length === 2 && Array.isArray(message[1])) {
                self.log('info', 'Bitfinex trades snapshot received');
                const snapshot = {
                    channel_id: message[0],
                    trades: message[1].map((trade) => {
                        return {
                            trade_id: trade[0],
                            sequence: trade[0],
                            timestamp: new Date(+trade[1] * 1000),
                            price: trade[2],
                            size: trade[3]
                        };
                    })
                };
                self.push(snapshot);
                return;
            }
            // Handle update
            if (message.length >= 6) {
                const tu = message[1] === 'tu';
                const trade = {
                    channel_id: message[0],
                    sequence: message[2],
                    timestamp: new Date(+message[tu ? 4 : 3] * 1000),
                    price: message[tu ? 5 : 4],
                    size: message[tu ? 6 : 5]
                };
                if (tu) {
                    trade.trade_id = message[3];
                }
                if (self.standardMessages) {
                    self.push(self.mapTradeMessage(trade));
                }
                else {
                    self.push(trade);
                }
                return;
            }
            self.log('info', 'Orderbook channel on Bitfinex WS feed received an unknown message', { data: message });
        }
        function handle_auth_message(message) {
            self.log('info', 'Auth messages are not supported yet', { data: message });
        }
    }
    get nextSequence() {
        return this.sequence++;
    }
    mapProduct(id) {
        return BitfinexCommon_1.REVERSE_PRODUCT_MAP[id.toLowerCase()] || id;
    }
    mapTicker(bt) {
        const pair = this.subscriptions[bt.channel_id].pair;
        const productId = this.mapProduct(pair);
        return {
            type: 'ticker',
            productId: productId,
            price: types_1.Big(bt.last_price),
            bid: types_1.Big(bt.bid),
            ask: types_1.Big(bt.ask),
            volume: types_1.Big(bt.volume),
            time: new Date(),
            trade_id: null,
            size: null
        };
    }
    mapSnapshot(bs) {
        const pair = this.subscriptions[bs.channel_id].pair;
        const productId = this.mapProduct(pair);
        const bids = [];
        const asks = [];
        const orders = {};
        bs.orders.forEach((order) => {
            const size = +order.size;
            if (size === 0) {
                return;
            }
            const newOrder = {
                id: order.price,
                price: types_1.Big(order.price),
                size: types_1.Big(order.size),
                side: size > 0 ? 'buy' : 'sell'
            };
            const level = {
                price: types_1.Big(order.price),
                totalSize: types_1.Big(order.size).abs(),
                orders: [newOrder]
            };
            if (size > 0) {
                bids.push(level);
            }
            else {
                asks.push(level);
            }
            orders[newOrder.id] = newOrder;
        });
        return {
            sequence: this.nextSequence,
            time: new Date(),
            type: 'snapshot',
            productId: productId,
            asks: asks,
            bids: bids,
            orderPool: orders
        };
    }
    mapOrderMessage(order) {
        const pair = this.subscriptions[order.channel_id].pair;
        const productId = this.mapProduct(pair);
        let side = null;
        const size = +order.size;
        if (size < 0) {
            side = 'sell';
        }
        if (size > 0) {
            side = 'buy';
        }
        return {
            type: 'level',
            productId: productId,
            sequence: this.nextSequence,
            time: new Date(),
            price: order.price,
            size: order.count === 0 ? '0' : Math.abs(size).toString(),
            side: side,
            count: order.count
        };
    }
    mapTradeMessage(trade) {
        const pair = this.subscriptions[trade.channel_id].pair;
        const productId = this.mapProduct(pair);
        const size = +trade.size;
        const side = size < 0 ? 'sell' : 'buy';
        return {
            type: 'trade',
            tradeId: trade.trade_id,
            time: trade.timestamp,
            productId: productId,
            price: trade.price,
            side: side,
            size: Math.abs(size).toString(),
        };
    }
    addSubscription(msg) {
        this.log('info', `Subscribed to Bitfinex Websocket channel ${msg.channel} for ${msg.pair}`);
        this.subscriptions[msg.chanId] = {
            id: msg.chanId,
            type: msg.channel,
            pair: msg.pair,
            lastHB: null
        };
    }
    removeSubscription(msg) {
        this.log('info', 'Unsubscribed from Bitfinex Websocket channel ' + msg.channel);
        const chanId = msg.chanId;
        delete this.subscriptions[chanId];
        return chanId;
    }
    getAuthMessage() {
        if (!this.auth) {
            return null;
        }
        const authNonce = Date.now() * 1000;
        const authPayload = 'AUTH' + authNonce;
        const authSig = crypto.createHmac('sha384', this.auth.secret)
            .update(authPayload).digest('hex');
        return {
            apiKey: this.auth.key,
            authSig,
            authNonce,
            authPayload,
            event: 'auth'
        };
    }
}
exports.BitfinexFeed = BitfinexFeed;
//# sourceMappingURL=BitfinexFeed.js.map