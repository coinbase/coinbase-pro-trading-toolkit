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
import { LevelMessage, TradeMessage, StreamMessage } from '../../core/Messages';
import { GEMINI_WS_FEED } from './GeminiCommon';
import * as GI from './GeminiInterfaces';

export class GeminiMarketFeed extends ExchangeFeed {
    readonly owner: string;
    readonly feedUrl: string;
    private productId: string;

    constructor(config: GI.GeminiMarketFeedConfig) {
        super(config);
        this.owner = 'Gemini';
        this.feedUrl = config.wsUrl || GEMINI_WS_FEED;
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

    private processTrade(event: GI.GeminiTradeEvent, update: GI.GeminiUpdateMessage): StreamMessage {
        const message: TradeMessage = {
            type: 'trade',
            productId: this.productId,
            time: new Date(+update.timestampms),
            tradeId: event.tid.toString(),
            price: event.price,
            size: event.amount,
            side: event.makerSide
        };
        return message;
    }

    private processChange(event: GI.GeminiChangeEvent, update: GI.GeminiUpdateMessage): StreamMessage {
        const message: LevelMessage = {
            type: 'change',
            productId: this.productId,
            time: new Date(+update.timestampms),
            price: event.price,
            size: event.remaining,
            sequence: update.socket_sequence,
            side: event.side,
            count: 1
        };
        return message;
    }

    private processAuction(event: GI.GeminiAuctionEvent, update: GI.GeminiUpdateMessage): StreamMessage {
        return undefined;
    }
}
