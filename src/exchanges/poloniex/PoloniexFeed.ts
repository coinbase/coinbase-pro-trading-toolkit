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

import { ExchangeFeed, ExchangeFeedConfig } from '../ExchangeFeed';
import { ChannelSubscription, PoloniexSnapshotLevel, PoloniexSnapshotMessage, PoloniexTrollboxMessage } from './PoloniexMessages';
import { getProductInfo } from './PoloniexCommon';
import { LevelMessage, SnapshotMessage, TickerMessage, TradeMessage, UnknownMessage } from '../../core/Messages';
import { Side } from '../../lib/sides';
import { Big, BigJS } from '../../lib/types';
import Timer = NodeJS.Timer;
import { OrderPool } from '../../lib/BookBuilder';
import { Level3Order, PriceLevelWithOrders } from '../../lib/Orderbook';
import { Product } from '../PublicExchangeAPI';

const AUTH_CHANNEL = 1000;
const TROLL_BOX = 1001;
const TICKER_CHANNEL = 1002;
const TOTAL_VOLUME_CHANNEL = 1003;
const HEARTBEAT_CHANNEL = 1010;

export interface PoloniexFeedConfig extends ExchangeFeedConfig {
    tickerChannel: boolean;
}

export class PoloniexFeed extends ExchangeFeed {
    private tickerChannel: boolean;
    private pinger: Timer = null;
    private subscriptions: { [id: number]: ChannelSubscription } = {};

    constructor(config: PoloniexFeedConfig) {
        super(config);
        this.tickerChannel = config.tickerChannel;
        this.connect();
    }

    subscribe(channel: number) {
        if (this.subscriptions[channel]) {
            return this.resubscribe(channel);
        }
        this.subscriptions[channel] = {
            id: channel,
            connected: false,
            sequence: -1
        };
        const message: any = {
            command: 'subscribe',
            channel: channel
        };
        if (channel === AUTH_CHANNEL) {
            this.log('info', 'Authenticated feeds from Poloniex are not available from their API yet');
            return;
        }
        this.send(message);
    }

    unsubscribe(channel: number) {
        this.send({ command: 'unsubscribe', channel: channel });
    }

    resubscribe(channel: number) {
        this.once(`unsubscribed-${channel}`, () => {
            this.subscribe(channel);
        });
        this.unsubscribe(channel);
    }

    getSubscriptions(): ChannelSubscription[] {
        return Object.values(this.subscriptions);
    }

    protected get owner(): string {
        return 'Poloniex';
    }

    protected handleMessage(message: string): void {
        this.confirmAlive();
        let msg: any;
        try {
            msg = JSON.parse(message);
        } catch (e) {
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
            case TOTAL_VOLUME_CHANNEL:
                this.handle_total_volume_message(msg);
                return;
            case HEARTBEAT_CHANNEL:
                return; // Ignore ping
            default:
                if (channelId > 0 && channelId < AUTH_CHANNEL) {
                    return this.handle_orderbook_message(msg);
                }
                return this.handle_unknown_system_message(msg);
        }
    }

    protected clear_pinger() {
        if (this.pinger) {
            clearInterval(this.pinger);
            this.pinger = null;
        }
    }

    protected onOpen(): void {
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
            } catch (err) {
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

    protected onClose(code: number, reason: string) {
        super.onClose(code, reason);
        this.clear_pinger();
    }

    private handle_user_message(msg: any[]) {
        if (msg.length === 2 && msg[1] === 1) {
            this.subscriptions[AUTH_CHANNEL].connected = true;
            return;
        }
        // I don't know what these messages are yet, so just log them for now
        const message: UnknownMessage = {
            type: 'unknown',
            time: new Date(),
            productId: null,
            sequence: null,
            origin: msg
        };
        this.push(message);
    }

    private handle_trollbox_message(msg: any[]): void {
        if (msg.length === 2 && msg[1] === 1) {
            this.subscriptions[TROLL_BOX].connected = true;
            return;
        }
        const chat: PoloniexTrollboxMessage = {
            sequence: +msg[1],
            user: msg[2],
            text: msg[3],
            reputation: +msg[4]
        };
        const message: UnknownMessage = {
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

    private handle_total_volume_message(msg: any[]): void {
        const message: UnknownMessage = {
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

    private handle_ticker_message(msg: any[]) {
        if (msg.length === 2 && msg[1] === 1) {
            this.subscriptions[TICKER_CHANNEL].connected = true;
            return;
        }
        const data: any[] = msg[2];
        if (!Array.isArray(data) || data.length !== 10) {
            this.log('warn', 'Unexpected ticker array in Poloniex WS message', { data: msg });
            return;
        }
        getProductInfo(data[0], false, this.logger).then((info: Product) => {
            const ticker: TickerMessage = {
                type: 'ticker',
                time: new Date(),
                productId: info.id,
                price: Big(data[1]),
                bid: Big(data[3]),
                ask: Big(data[2]),
                volume: Big(data[4]),
                origin: msg
            };
            this.push(ticker);
        }).catch((err: Error) => {
            this.log('warn', 'A client process may have a bug. Check the error and stacktrace for details', {error: err});
        });
    }

    private handle_unknown_system_message(msg: any[]) {
        const message: UnknownMessage = {
            type: 'unknown',
            tag: 'poloniex-system',
            time: new Date(),
            productId: null,
            sequence: null,
            origin: msg
        };
        this.push(message);
    }

    private handle_orderbook_message(msg: any[]): void {
        const id: number = msg[0];
        const self: PoloniexFeed = this;
        getProductInfo(id, false, this.logger).then((info: Product) => {
            if (msg[1] === 0) {
                this.log('debug', `Unsubscribed from ${info.id}`);
                delete this.subscriptions[id];
                setImmediate(() => {
                    this.emit(`unsubscribed-${id}`, id);
                });
                return;
            }
            const channelInfo: ChannelSubscription = this.subscriptions[id];
            if (!channelInfo) {
                return;
            }
            if (msg[1] === 1) {
                channelInfo.connected = true;
                return;
            }
            const product: string = info.id;
            const sequence: number = +msg[1];
            const data: any[] = msg[2];
            if (!Array.isArray(data)) {
                this.log('warn', 'Unexpected order-book array in Poloniex WS message', { data: msg });
                return;
            }
            channelInfo.sequence = sequence;
            // Handle snapshot message
            data.forEach((update, i) => {
                send_orderbook_update(i, update);
            });

            function send_orderbook_update(index: number, update: any[]): void {
                if (!Array.isArray(update)) {
                    self.log('warn', `Unexpected order-book update message in ${product} #${sequence}.${index}`, { data : update });
                    return;
                }
                const type = update[0];
                if (type === 'i') {
                    channelInfo.connected = true;
                    channelInfo.sequence = sequence;
                    const snapshot: SnapshotMessage = self.createSnapshotMessage(product, sequence, update[1]);
                    self.push(snapshot);
                    process.nextTick(() => {
                        self.emit('snapshot', snapshot.productId);
                    });
                    return;
                }
                if (type === 'o') {
                    const message: LevelMessage = {
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
                    const message: TradeMessage = {
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

    private createSnapshotMessage(product: string, sequence: number, snapshot: PoloniexSnapshotMessage): SnapshotMessage {
        const orders: OrderPool = {};
        const snapshotMessage: SnapshotMessage = {
            type: 'snapshot',
            time: new Date(),
            productId: product,
            sequence: sequence,
            asks: [],
            bids: [],
            orderPool: orders
        };
        for (let i = 0; i <= 1; i++) {
            const levelArray: PoloniexSnapshotLevel = snapshot.orderBook[i];
            const sideArray: PriceLevelWithOrders[] = i === 0 ? snapshotMessage.asks : snapshotMessage.bids;
            for (const price in snapshot.orderBook[i]) {
                const side: Side = i === 0 ? 'sell' : 'buy';
                const size: BigJS = Big(levelArray[price]);
                const newOrder: Level3Order = {
                    id: String(price),
                    price: Big(price),
                    size: size,
                    side: side
                };
                const level: PriceLevelWithOrders = {
                    price: Big(price),
                    totalSize: Big(size),
                    orders: [newOrder]
                };
                sideArray.push(level);
                orders[newOrder.id] = newOrder;
            }
        }
        return snapshotMessage;
    }
}
