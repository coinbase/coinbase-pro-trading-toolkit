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
const BittrexAPI_1 = require("./BittrexAPI");
const types_1 = require("../../lib/types");
const Bittrex = require('node-bittrex-api');
class BittrexFeed extends ExchangeFeed_1.ExchangeFeed {
    constructor(config) {
        super(config);
        const auth = config.auth || { key: 'APIKEY', secret: 'APISECRET' };
        this.url = config.wsUrl || 'wss://socket.bittrex.com/signalr';
        this.counters = {};
        Bittrex.options({
            websockets_baseurl: this.url,
            apikey: auth.key,
            apisecret: auth.secret,
            inverse_callback_arguments: true,
            stream: false,
            cleartext: false,
            verbose: true
        });
        this.connect();
    }
    get owner() {
        return 'Bittrex';
    }
    subscribe(products) {
        if (!this.connection) {
            return Promise.reject(false);
        }
        return Promise.all(products.map((product) => {
            return new Promise((resolve, reject) => {
                this.client.call('CoreHub', 'SubscribeToExchangeDeltas', product).done((err, result) => {
                    if (err) {
                        return reject(err);
                    }
                    if (!result) {
                        const msg = `Failed to subscribeExchangeDeltas to ${product} on ${this.owner}`;
                        this.log('info', msg);
                        return reject(new Error(msg));
                    }
                    this.client.call('CoreHub', 'queryExchangeState', product).done((queryErr, data) => {
                        if (queryErr) {
                            return reject(queryErr);
                        }
                        if (!data) {
                            const msg = `failed to queryExchangeState to ${product} on ${this.owner}`;
                            this.log('error', msg);
                            return reject(new Error(msg));
                        }
                        const snapshot = this.processSnapshot(product, data);
                        this.push(snapshot);
                        return resolve(true);
                    });
                });
            });
        })).then(() => {
            // Every result is guaranteed to be true
            return Promise.resolve(true);
        }).catch((err) => {
            return Promise.reject(err);
        });
    }
    connect() {
        Bittrex.websockets.client((client) => {
            this.client = client;
            client.serviceHandlers.messageReceived = (msg) => this.handleMessage(msg);
            client.serviceHandlers.bound = () => this.onNewConnection();
            client.serviceHandlers.disconnected = (code, reason) => this.onClose(code, reason);
            client.serviceHandlers.onerror = (err) => this.onError(err);
            client.serviceHandlers.connected = (connection) => {
                this.connection = connection;
                this.emit('websocket-connection');
            };
        });
    }
    handleMessage(msg) {
        if (msg.type !== 'utf8' || !msg.utf8Data) {
            return;
        }
        let data;
        try {
            data = JSON.parse(msg.utf8Data);
        }
        catch (err) {
            this.log('debug', 'Error parsing feed message', msg.utf8Data);
            return;
        }
        if (!Array.isArray(data.M)) {
            return;
        }
        this.confirmAlive();
        data.M.forEach((message) => {
            this.processMessage(message);
        });
    }
    onOpen() {
        // no-op
    }
    onClose(code, reason) {
        this.emit('websocket-closed');
        this.connection = null;
    }
    close() {
        this.client.end();
    }
    nextSequence(product) {
        let counter = this.counters[product];
        if (!counter) {
            counter = this.counters[product] = { base: -1, offset: 0 };
        }
        if (counter.base < 1) {
            return -1;
        }
        counter.offset += 1;
        return counter.base + counter.offset;
    }
    setSnapshotSequence(product, sequence) {
        let counter = this.counters[product];
        if (!counter) {
            counter = this.counters[product] = { base: -1, offset: 0 };
        }
        counter.base = sequence;
    }
    getSnapshotSequence(product) {
        const counter = this.counters[product];
        return counter ? counter.base : -1;
    }
    processMessage(message) {
        switch (message.M) {
            case 'updateExchangeState':
                this.updateExchangeState(message.A);
                break;
            case 'updateSummaryState':
                const tickers = message.A[0].Deltas || [];
                this.updateTickers(tickers);
                break;
            default:
                this.log('debug', `Unknown message type: ${message.M}`);
        }
    }
    updateExchangeState(states) {
        const createUpdateMessage = (product, side, nonce, delta) => {
            const seq = this.nextSequence(product);
            const message = {
                type: 'level',
                time: new Date(),
                sequence: seq,
                sourceSequence: nonce,
                productId: product,
                side: side,
                price: delta.Rate,
                size: delta.Quantity,
                count: 1
            };
            return message;
        };
        states.forEach((state) => {
            const product = state.MarketName;
            const snaphotSeq = this.getSnapshotSequence(product);
            if (state.Nounce <= snaphotSeq) {
                return;
            }
            state.Buys.forEach((delta) => {
                const msg = createUpdateMessage(product, 'buy', state.Nounce, delta);
                this.push(msg);
            });
            state.Sells.forEach((delta) => {
                const msg = createUpdateMessage(product, 'sell', state.Nounce, delta);
                this.push(msg);
            });
            state.Fills.forEach((fill) => {
                const message = {
                    type: 'trade',
                    productId: product,
                    time: new Date(fill.TimeStamp),
                    tradeId: '0',
                    price: fill.Rate,
                    size: fill.Quantity,
                    side: fill.OrderType.toLowerCase()
                };
                this.push(message);
            });
        });
    }
    updateTickers(tickers) {
        tickers.forEach((bittrexTicker) => {
            const ticker = {
                type: 'ticker',
                productId: BittrexAPI_1.BittrexAPI.normalizeProduct(bittrexTicker.MarketName),
                bid: types_1.Big(bittrexTicker.Bid),
                ask: types_1.Big(bittrexTicker.Ask),
                time: new Date(bittrexTicker.TimeStamp),
                price: types_1.Big(bittrexTicker.Last),
                volume: types_1.Big(bittrexTicker.Volume)
            };
            this.push(ticker);
        });
    }
    processSnapshot(product, state) {
        const orders = {};
        const snapshotMessage = {
            type: 'snapshot',
            time: new Date(),
            productId: product,
            sequence: state.Nounce,
            asks: [],
            bids: [],
            orderPool: orders
        };
        state.Buys.forEach((order) => {
            addOrder(order, 'buy', snapshotMessage.bids);
        });
        state.Sells.forEach((order) => {
            addOrder(order, 'sell', snapshotMessage.asks);
        });
        this.setSnapshotSequence(product, state.Nounce);
        return snapshotMessage;
        function addOrder(order, side, levelArray) {
            const size = types_1.Big(order.Quantity);
            const newOrder = {
                id: String(order.Rate),
                price: types_1.Big(order.Rate),
                size: size,
                side: side
            };
            const newLevel = {
                price: newOrder.price,
                totalSize: size,
                orders: [newOrder]
            };
            levelArray.push(newLevel);
        }
    }
}
exports.BittrexFeed = BittrexFeed;
//# sourceMappingURL=BittrexFeed.js.map