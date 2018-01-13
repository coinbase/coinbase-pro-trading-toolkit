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
const ExchangeFeed_1 = require("../ExchangeFeed");
const PoloniexCommon_1 = require("./PoloniexCommon");
const types_1 = require("../../lib/types");
const AUTH_CHANNEL = 1000;
const TROLL_BOX = 1001;
const TICKER_CHANNEL = 1002;
class PoloniexFeed extends ExchangeFeed_1.ExchangeFeed {
    constructor(config) {
        super(config);
        this.pinger = null;
        this.subscriptions = {};
        this.tickerChannel = config.tickerChannel;
        this.connect();
    }
    subscribe(channel) {
        if (this.subscriptions[channel]) {
            return this.resubscribe(channel);
        }
        this.subscriptions[channel] = {
            id: channel,
            connected: false,
            sequence: -1
        };
        const message = {
            command: 'subscribe',
            channel: channel
        };
        if (channel === 1000) {
            this.log('info', 'Authenticated feeds from Poloniex are not available from their API yet');
            return;
        }
        this.send(message);
    }
    unsubscribe(channel) {
        this.send({ command: 'unsubscribe', channel: channel });
    }
    resubscribe(channel) {
        this.once(`unsubscribed-${channel}`, () => {
            this.subscribe(channel);
        });
        this.unsubscribe(channel);
    }
    getSubscriptions() {
        return Object.values(this.subscriptions);
    }
    get owner() {
        return 'Poloniex';
    }
    handleMessage(message) {
        this.confirmAlive();
        let msg;
        try {
            msg = JSON.parse(message);
        }
        catch (e) {
            this.log('error', 'Non-JSON WS message from Poloniex', { data: message });
            return;
        }
        if ('error' in msg) {
            this.log('error', 'An error message was received from Poloniex', { data: msg });
            return;
        }
        if (!Array.isArray(msg)) {
            this.log('warn', 'Poloniex WS message was not an array', { data: msg });
            return;
        }
        if (msg.length === 0) {
            return;
        }
        const channelId = msg[0];
        switch (channelId) {
            case AUTH_CHANNEL:
                this.handle_user_message(msg);
                return;
            case TROLL_BOX:
                this.handle_trollbox_message(msg);
                return;
            case TICKER_CHANNEL:
                this.handle_ticker_message(msg);
                return;
            case 1003:
                this.handle_total_volume_message(msg);
                return;
            case 1010:
                return; // Ignore ping
            default:
                if (channelId > 0 && channelId < 1000) {
                    return this.handle_orderbook_message(msg);
                }
                return this.handle_unknown_system_message(msg);
        }
    }
    clear_pinger() {
        if (this.pinger) {
            clearInterval(this.pinger);
            this.pinger = null;
        }
    }
    onOpen() {
        // If this is due to a re-connect, resubscribe to channels
        const oldSubscriptions = this.subscriptions;
        this.subscriptions = {};
        for (const key in oldSubscriptions) {
            const channel = oldSubscriptions[key];
            this.resubscribe(channel.id);
        }
        this.pinger = setInterval(() => {
            if (!this.isConnected()) {
                this.clear_pinger();
                return;
            }
            try {
                this.send('.');
            }
            catch (err) {
                this.log('warn', 'Failed to send PING to Poloniex. We should resubscribe');
                this.reconnect(250);
            }
        }, 29000);
        if (this.tickerChannel) {
            this.subscribe(TICKER_CHANNEL);
        }
        if (this.auth) {
            this.subscribe(AUTH_CHANNEL);
        }
    }
    onClose(code, reason) {
        super.onClose(code, reason);
        this.clear_pinger();
    }
    handle_user_message(msg) {
        if (msg.length === 2 && msg[1] === 1) {
            this.subscriptions[1000].connected = true;
            return;
        }
        // I don't know what these messages are yet, so just log them for now
        const message = {
            type: 'poloniex-user',
            time: new Date(),
            productId: null,
            sequence: null,
            origin: msg
        };
        this.push(message);
    }
    handle_trollbox_message(msg) {
        if (msg.length === 2 && msg[1] === 1) {
            this.subscriptions[1001].connected = true;
            return;
        }
        const chat = {
            sequence: +msg[1],
            user: msg[2],
            text: msg[3],
            reputation: +msg[4]
        };
        const message = {
            type: 'unknown',
            tag: 'poloniex-trollbox',
            time: new Date(),
            productId: null,
            sequence: null,
            extra: chat,
            origin: msg
        };
        this.push(message);
    }
    handle_total_volume_message(msg) {
        const message = {
            type: 'unknown',
            tag: 'poloniex-volume',
            time: new Date(msg[2][0]),
            productId: null,
            sequence: msg[1],
            extra: {
                serverTime: msg[2][0],
                usersOnline: msg[2][1],
                volume: msg[2][2]
            },
            origin: msg
        };
        this.push(message);
    }
    handle_ticker_message(msg) {
        if (msg.length === 2 && msg[1] === 1) {
            this.subscriptions[1002].connected = true;
            return;
        }
        const data = msg[2];
        if (!Array.isArray(data) || data.length !== 10) {
            this.log('warn', 'Unexpected ticker array in Poloniex WS message', { data: msg });
            return;
        }
        PoloniexCommon_1.getProductInfo(data[0], false, this.logger).then((info) => {
            const ticker = {
                type: 'ticker',
                time: new Date(),
                productId: info.id,
                price: types_1.Big(data[1]),
                bid: types_1.Big(data[3]),
                ask: types_1.Big(data[2]),
                volume: types_1.Big(data[4]),
                origin: msg
            };
            this.push(ticker);
        }).catch((err) => {
            this.log('warn', 'A client process may have a bug. Check the error and stacktrace for details', { error: err });
        });
    }
    handle_unknown_system_message(msg) {
        const message = {
            type: 'unknown',
            tag: 'poloniex-system',
            time: new Date(),
            productId: null,
            sequence: null,
            origin: msg
        };
        this.push(message);
    }
    handle_orderbook_message(msg) {
        const id = msg[0];
        const self = this;
        PoloniexCommon_1.getProductInfo(id, false, this.logger).then((info) => {
            if (msg[1] === 0) {
                this.log('debug', `Unsubscribed from ${info.id}`);
                delete this.subscriptions[id];
                setImmediate(() => {
                    this.emit(`unsubscribed-${id}`, id);
                });
                return;
            }
            const channelInfo = this.subscriptions[id];
            if (!channelInfo) {
                return;
            }
            if (msg[1] === 1) {
                channelInfo.connected = true;
                return;
            }
            const product = info.id;
            const sequence = +msg[1];
            const data = msg[2];
            if (!Array.isArray(data)) {
                this.log('warn', 'Unexpected order-book array in Poloniex WS message', { data: msg });
                return;
            }
            channelInfo.sequence = sequence;
            // Handle snapshot message
            data.forEach((update, i) => {
                send_orderbook_update(i, update);
            });
            function send_orderbook_update(index, update) {
                if (!Array.isArray(update)) {
                    self.log('warn', `Unexpected order-book update message in ${product} #${sequence}.${index}`, { data: update });
                    return;
                }
                const type = update[0];
                if (type === 'i') {
                    channelInfo.connected = true;
                    channelInfo.sequence = sequence;
                    const snapshot = self.createSnapshotMessage(product, sequence, update[1]);
                    self.push(snapshot);
                    return;
                }
                if (type === 'o') {
                    const message = {
                        type: 'level',
                        time: new Date(),
                        sequence: sequence,
                        sourceSequence: sequence,
                        productId: product,
                        side: update[1] === 0 ? 'sell' : 'buy',
                        price: update[2],
                        size: update[3],
                        count: 1
                    };
                    self.push(message);
                    return;
                }
                if (type === 't') {
                    const message = {
                        type: 'trade',
                        productId: product,
                        time: new Date(update[5] * 1000),
                        tradeId: update[1],
                        price: update[3],
                        size: update[4],
                        side: update[2] === 1 ? 'buy' : 'sell'
                    };
                    self.push(message);
                    return;
                }
            }
        });
    }
    createSnapshotMessage(product, sequence, snapshot) {
        const orders = {};
        const snapshotMessage = {
            type: 'snapshot',
            time: new Date(),
            productId: product,
            sequence: sequence,
            asks: [],
            bids: [],
            orderPool: orders
        };
        for (let i = 0; i <= 1; i++) {
            const levelArray = snapshot.orderBook[i];
            const sideArray = i === 0 ? snapshotMessage.asks : snapshotMessage.bids;
            for (const price in snapshot.orderBook[i]) {
                const side = i === 0 ? 'sell' : 'buy';
                const size = types_1.Big(levelArray[price]);
                const newOrder = {
                    id: String(price),
                    price: types_1.Big(price),
                    size: size,
                    side: side
                };
                const level = {
                    price: types_1.Big(price),
                    totalSize: types_1.Big(size),
                    orders: [newOrder]
                };
                sideArray.push(level);
                orders[newOrder.id] = newOrder;
            }
        }
        return snapshotMessage;
    }
}
exports.PoloniexFeed = PoloniexFeed;
//# sourceMappingURL=PoloniexFeed.js.map