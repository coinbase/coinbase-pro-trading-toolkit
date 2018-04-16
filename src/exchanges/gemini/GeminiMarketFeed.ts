'use strict';
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
import { ExchangeFeed } from '../ExchangeFeed';
import { SnapshotMessage, LevelMessage, TradeMessage, StreamMessage } from '../../core/Messages';
import { GEMINI_WS_FEED, REVERSE_PRODUCT_MAP } from './GeminiCommon';
import { OrderPool } from '../../lib/BookBuilder';
import { Level3Order, PriceLevelWithOrders } from '../../lib/Orderbook';
import { Big } from '../../lib/types';
import * as GI from './GeminiInterfaces';

export class GeminiMarketFeed extends ExchangeFeed {
    readonly owner: string;
    readonly feedUrl: string;
    private readonly productId: string;
    private readonly ccxtProductId: string;

    constructor(config: GI.GeminiMarketFeedConfig) {
        super(config);
        this.owner = 'Gemini';
        this.feedUrl = config.wsUrl || GEMINI_WS_FEED;
        this.productId = config.productId;

        // Use this property to create StreamMessages
        this.ccxtProductId = REVERSE_PRODUCT_MAP[this.productId];
        this.connect();
    }

    protected handleMessage(msg: string): void {
        try {
            const feedMessage: GI.GeminiMessage = JSON.parse(msg);
            switch (feedMessage.type) {
                case 'heartbeat':
                    this.confirmAlive();
                    break;
                case 'update':
                    this.processUpdate(feedMessage as GI.GeminiUpdateMessage);
                    break;
            }
        } catch (err) {
            err.ws_msg = msg;
            this.onError(err);
        }
    }
    protected onOpen(): void {
        // Do nothing for now
    }

    private processUpdate(update: GI.GeminiUpdateMessage) {
        if (update.socket_sequence === 0) {
            // Process the first message with the orderbook state
            const snapshot = this.createSnapshotMessage(update);
            this.push(snapshot);
            process.nextTick(() => {
                this.emit('snapshot', snapshot.productId);
            });
        } else {
            update.events.forEach((event) => {
                let message: StreamMessage;
                switch (event.type) {
                    case 'trade':
                        message = this.processTrade(event as GI.GeminiTradeEvent, update);
                        break;
                    case 'change':
                        message = this.processChange(event as GI.GeminiChangeEvent, update);
                        break;
                    case 'auction':
                        message = this.processAuction(event as GI.GeminiAuctionEvent, update);
                        break;
                }
                this.push(message);
            });
        }
    }

    private createSnapshotMessage(update: GI.GeminiUpdateMessage): SnapshotMessage {
        const orders: OrderPool = {};
        const snapshotMessage: SnapshotMessage = {
            type: 'snapshot',
            time: new Date(+update.timestampms),
            productId: this.ccxtProductId,
            sequence: 0,
            asks: [],
            bids: [],
            orderPool: orders
        };
        // First message only contains 'change' events with reason as 'initial'
        update.events.forEach((event) => {
            if (event.type === 'change') {
                const changeEvent = event as GI.GeminiChangeEvent;
                if (changeEvent.reason === 'initial') {
                    const newOrder: Level3Order = {
                        id: changeEvent.price,
                        price: Big(changeEvent.price),
                        size: Big(changeEvent.delta),
                        side: changeEvent.side === 'ask' ? 'sell' : 'buy'
                    };
                    const level: PriceLevelWithOrders = {
                        price: Big(changeEvent.price),
                        totalSize: Big(changeEvent.delta),
                        orders: [newOrder]
                    };
                    if (changeEvent.side === 'ask') {
                        snapshotMessage.asks.push(level);
                    } else if (changeEvent.side === 'bid') {
                        snapshotMessage.bids.push(level);
                    }
                    orders[newOrder.id] = newOrder;
                }
            }
        });
        return snapshotMessage;
    }

    private processTrade(event: GI.GeminiTradeEvent, update: GI.GeminiUpdateMessage): StreamMessage {
        const message: TradeMessage = {
            type: 'trade',
            productId: this.ccxtProductId,
            time: new Date(+update.timestampms),
            tradeId: event.tid.toString(),
            price: event.price,
            size: event.amount,
            side: event.makerSide === 'ask' ? 'sell' : 'buy'
        };
        return message;
    }

    private processChange(event: GI.GeminiChangeEvent, update: GI.GeminiUpdateMessage): StreamMessage {
        const message: LevelMessage = {
            type: 'level',
            productId: this.ccxtProductId,
            time: new Date(+update.timestampms),
            price: event.price,
            size: event.remaining,
            sequence: update.socket_sequence,
            side: event.side === 'ask' ? 'sell' : 'buy',
            count: 1
        };
        return message;
    }

    private processAuction(_event: GI.GeminiAuctionEvent, _update: GI.GeminiUpdateMessage): StreamMessage {
        // TODO: Are auctions unique to Gemini?
        return undefined;
    }
}
