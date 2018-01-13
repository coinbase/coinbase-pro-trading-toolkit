'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
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
const ExchangeFeed_1 = require("../ExchangeFeed");
const GeminiCommon_1 = require("./GeminiCommon");
const types_1 = require("../../lib/types");
class GeminiMarketFeed extends ExchangeFeed_1.ExchangeFeed {
    constructor(config) {
        super(config);
        this.owner = 'Gemini';
        this.feedUrl = config.wsUrl || GeminiCommon_1.GEMINI_WS_FEED;
        this.productId = config.productId;
        // Use this property to create StreamMessages
        this.ccxtProductId = GeminiCommon_1.REVERSE_PRODUCT_MAP[this.productId];
        this.connect();
    }
    handleMessage(msg) {
        try {
            const feedMessage = JSON.parse(msg);
            switch (feedMessage.type) {
                case 'heartbeat':
                    this.confirmAlive();
                    break;
                case 'update':
                    this.processUpdate(feedMessage);
                    break;
            }
        }
        catch (err) {
            err.ws_msg = msg;
            this.onError(err);
        }
    }
    onOpen() {
        // Do nothing for now
    }
    processUpdate(update) {
        if (update.socket_sequence === 0) {
            // Process the first message with the orderbook state
            this.push(this.createSnapshotMessage(update));
        }
        else {
            update.events.forEach((event) => {
                let message;
                switch (event.type) {
                    case 'trade':
                        message = this.processTrade(event, update);
                        break;
                    case 'change':
                        message = this.processChange(event, update);
                        break;
                    case 'auction':
                        message = this.processAuction(event, update);
                        break;
                }
                this.push(message);
            });
        }
    }
    createSnapshotMessage(update) {
        const orders = {};
        const snapshotMessage = {
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
                const changeEvent = event;
                if (changeEvent.reason === 'initial') {
                    const newOrder = {
                        id: changeEvent.price,
                        price: types_1.Big(changeEvent.price),
                        size: types_1.Big(changeEvent.delta),
                        side: changeEvent.side === 'ask' ? 'sell' : 'buy'
                    };
                    const level = {
                        price: types_1.Big(changeEvent.price),
                        totalSize: types_1.Big(changeEvent.delta),
                        orders: [newOrder]
                    };
                    if (changeEvent.side === 'ask') {
                        snapshotMessage.asks.push(level);
                    }
                    else if (changeEvent.side === 'bid') {
                        snapshotMessage.bids.push(level);
                    }
                    orders[newOrder.id] = newOrder;
                }
            }
        });
        return snapshotMessage;
    }
    processTrade(event, update) {
        const message = {
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
    processChange(event, update) {
        const message = {
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
    processAuction(event, update) {
        // TODO: Are auctions unique to Gemini?
        return undefined;
    }
}
exports.GeminiMarketFeed = GeminiMarketFeed;
//# sourceMappingURL=GeminiMarketFeed.js.map