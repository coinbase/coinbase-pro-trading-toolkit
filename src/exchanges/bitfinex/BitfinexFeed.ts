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

import crypto = require('crypto');
import {
    BitfinexOrderbookSnapshot,
    BitfinexTickerMessage,
    BitfinexOrderMessage,
    BitfinexTradeSnapshot,
    BitfinexTradeMessage
} from './BitfinexMessages';
import { WEBSOCKET_API_VERSION, ORDERBOOK_PRECISION, REVERSE_PRODUCT_MAP } from './BitfinexCommon';
import { LevelMessage, SnapshotMessage, TickerMessage, TradeMessage } from '../../core/Messages';
import { Level3Order, PriceLevelWithOrders } from '../../lib/Orderbook';
import { Side } from '../../lib/sides';
import { Big } from '../../lib/types';
import { OrderPool } from '../../lib/BookBuilder';
import { ExchangeFeed, ExchangeFeedConfig } from '../ExchangeFeed';

interface BitfinexChannel {
    id: string;
    pair: string;
    type: string;
    lastHB: Date;
}

interface BitfinexChannels {
    [chanId: string]: BitfinexChannel;
}

export interface BitfinexFeedConfig extends ExchangeFeedConfig {
    standardMessages: boolean;
    snapshotDepth?: number;
}

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
export class BitfinexFeed extends ExchangeFeed {

    private sequence: number;
    private subscriptions: BitfinexChannels;
    private paused: boolean;
    private pinger: NodeJS.Timer;
    private readonly standardMessages: boolean;
    private readonly snapshotDepth: number;

    constructor(config: BitfinexFeedConfig) {
        super(config);
        this.standardMessages = config.standardMessages || true;
        this.clearChannels();
        this.sequence = 0;
        this.snapshotDepth = config.snapshotDepth || 250;
        this.connect();
    }

    get owner(): string {
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

    subscribe(channelType: string, product: string) {
        let subscribeMessage: any;
        switch (channelType) {
            case 'book':
                subscribeMessage = {
                    event: 'subscribe',
                    freq: 'F0',
                    channel: 'book',
                    pair: product,
                    prec: ORDERBOOK_PRECISION[product],
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
        this.send(subscribeMessage, (err: Error) => {
            this.log('error', `Error subscribing to Bitfinex channel ${channelType} ${product}`, err);
        });
    }

    unsubscribe(chanId: string) {
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

    protected onClose(code: number, reason: string) {
        clearInterval(this.pinger);
        super.onClose(code, reason);
    }

    protected handleMessage(data: any) {
        const self = this;
        let msg: any;
        try {
            msg = JSON.parse(data);
        } catch (e) {
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
        const channel: BitfinexChannel = this.subscriptions[channelId];
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

        function handle_info_event(message: any) {
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
                if (message.version !== WEBSOCKET_API_VERSION) {
                    const err = 'Error. Bitfinex websocket API version has changed to ' + message.version;
                    self.log('info', err);
                    self.emit('error', new Error(err));
                }
                return;
            }
            self.log('info', 'Info channel on Bitfinex WS feed received an unknown message', message);
        }

        function handle_ticker_message(message: any) {
            if (message.length === 11) {
                const ticker: BitfinexTickerMessage = {
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
                } else {
                    self.push(ticker);
                }
                return;
            }
            self.log('warn', 'Ticker channel on Bitfinex WS feed received an unknown message', message);
        }

        function handle_book_message(message: any) {
            // Handle snapshot
            if (message.length === 2 && Array.isArray(message[1])) {
                self.log('info', 'Bitfinex orderbook snapshot received');
                const snapshot: BitfinexOrderbookSnapshot = {
                    channel_id: message[0],
                    orders: message[1].map((order: string[]): BitfinexOrderMessage => {
                        return { price: order[0], count: parseInt(order[1], 10), size: order[2] };
                    })
                };
                if (self.standardMessages) {
                    const s = self.mapSnapshot(snapshot);
                    process.nextTick(() => {
                        self.emit('snapshot', s.productId);
                    });
                    self.push(s);
                } else {
                    self.push(snapshot);
                }
                return;
            }
            // Handle update
            if (message.length === 4) {
                const order: BitfinexOrderMessage = {
                    channel_id: message[0],
                    price: message[1],
                    count: message[2],
                    size: message[3]
                };
                if (self.standardMessages) {
                    const mappedMessage: LevelMessage = self.mapOrderMessage(order);
                    self.push(mappedMessage);
                } else {
                    self.push(order);
                }
                return;
            }
            self.log('info', 'Orderbook channel on Bitfinex WS feed received an unknown message', { data: message });
        }

        function handle_trade_message(message: any) {
            // Handle snapshot
            if (message.length === 2 && Array.isArray(message[1])) {
                self.log('info', 'Bitfinex trades snapshot received');
                const snapshot: BitfinexTradeSnapshot = {
                    channel_id: message[0],
                    trades: message[1].map((trade: string[]): BitfinexTradeMessage => {
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
                const tu: boolean = message[1] === 'tu';
                const trade: BitfinexTradeMessage = {
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
                } else {
                    self.push(trade);
                }
                return;
            }
            self.log('info', 'Orderbook channel on Bitfinex WS feed received an unknown message', { data: message });
        }

        function handle_auth_message(message: any) {
            self.log('info', 'Auth messages are not supported yet', { data: message });
        }
    }

    private get nextSequence() {
        return this.sequence++;
    }

    private mapProduct(id: string): string {
        return REVERSE_PRODUCT_MAP[id.toLowerCase()] || id;
    }

    private mapTicker(bt: BitfinexTickerMessage): TickerMessage {
        const pair = this.subscriptions[bt.channel_id].pair;
        const productId = this.mapProduct(pair);
        return {
            type: 'ticker',
            productId: productId,
            price: Big(bt.last_price),
            bid: Big(bt.bid),
            ask: Big(bt.ask),
            volume: Big(bt.volume),
            time: new Date(),
            trade_id: null,
            size: null
        };
    }

    private mapSnapshot(bs: BitfinexOrderbookSnapshot): SnapshotMessage {
        const pair = this.subscriptions[bs.channel_id].pair;
        const productId = this.mapProduct(pair);
        const bids: PriceLevelWithOrders[] = [];
        const asks: PriceLevelWithOrders[] = [];
        const orders: OrderPool = {};
        bs.orders.forEach((order: BitfinexOrderMessage) => {
            const size = +order.size;
            if (size === 0) {
                return;
            }
            const newOrder: Level3Order = {
                id: order.price,
                price: Big(order.price),
                size: Big(order.size),
                side: size > 0 ? 'buy' : 'sell'
            };
            const level: PriceLevelWithOrders = {
                price: Big(order.price),
                totalSize: Big(order.size).abs(),
                orders: [ newOrder ]
            };
            if (size > 0) {
                bids.push(level);
            } else {
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

    private mapOrderMessage(order: BitfinexOrderMessage): LevelMessage {
        const pair = this.subscriptions[order.channel_id].pair;
        const productId = this.mapProduct(pair);
        let side: Side;
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

    private mapTradeMessage(trade: BitfinexTradeMessage): TradeMessage {
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

    private addSubscription(msg: any) {
        this.log('info', `Subscribed to Bitfinex Websocket channel ${msg.channel} for ${msg.pair}`);
        this.subscriptions[msg.chanId] = {
            id: msg.chanId,
            type: msg.channel,
            pair: msg.pair,
            lastHB: null
        };
    }

    private removeSubscription(msg: any) {
        this.log('info', 'Unsubscribed from Bitfinex Websocket channel ' + msg.channel);
        const chanId = msg.chanId;
        delete this.subscriptions[chanId];
        return chanId;
    }

    private getAuthMessage(): any {
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
