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
const BitmexCommon_1 = require("./BitmexCommon");
const types_1 = require("../../lib/types");
const Orderbook_1 = require("../../lib/Orderbook");
class BitmexMarketFeed extends ExchangeFeed_1.ExchangeFeed {
    constructor(config) {
        if (!config.wsUrl) {
            config.wsUrl = BitmexCommon_1.BITMEX_WS_FEED;
        }
        super(config);
        this.owner = 'BitMEX';
        this.feedUrl = config.wsUrl;
        this.seq = 0;
        this.connect();
    }
    subscribe(productIds) {
        this.logger.log('debug', `Subscribing to the following symbols: ${JSON.stringify(productIds)}`);
        productIds.forEach((productId) => {
            const subscribeMessage = {
                op: 'subscribe',
                args: [`orderBookL2:${productId}`, `trade:${productId}`],
            };
            this.send(JSON.stringify(subscribeMessage));
        });
    }
    onOpen() {
        // Nothing for now
    }
    handleMessage(rawMsg) {
        const msg = JSON.parse(rawMsg);
        if (msg.error) {
            const errMsg = {
                type: 'error',
                time: new Date(),
                message: `Error while subscribing to symbols`,
                cause: msg.error
            };
            this.push(errMsg);
        }
        else if (msg.table === 'trade') {
            // trade message
            const tradeMsg = msg;
            this.handleTrade(tradeMsg);
        }
        else if (msg.action) {
            if (msg.action === 'partial') {
                // orderbook snapshot
                const snapshotMsg = msg;
                this.handleSnapshot(snapshotMsg);
            }
            else {
                // orderbook update
                const updateMsg = msg;
                this.handleOrderbookUpdate(updateMsg);
            }
        }
        else if (msg.success !== undefined) {
            // subscription response
            const subscriptionResMSg = msg;
            this.handleSubscriptionSuccess(subscriptionResMSg);
        }
        else if (msg.info) {
            // welcome message
            this.logger.log('debug', 'Received welcome message from BitMEX WS feed.');
        }
        else {
            // unhandled/unexpected message
            const unkMsg = {
                type: 'unknown',
                time: new Date(),
                origin: msg,
            };
            this.push(unkMsg);
        }
    }
    /**
     * Gets the next sequence number, incrementing it for the next time it's called.
     */
    getSeq() {
        this.seq += 1;
        return this.seq;
    }
    handleSnapshot(snapshot) {
        // (re)initialize our order id map
        const newIdMap = snapshot.data.reduce((acc, { id, price }) => (Object.assign({}, acc, { [id]: price })), {});
        this.orderIdMap = newIdMap;
        const mapLevelUpdates = ({ id, price, size, side }) => Orderbook_1.PriceLevelFactory(price, size, side.toLowerCase());
        const asks = snapshot.data
            .filter(({ side }) => side === 'Sell')
            .map(mapLevelUpdates);
        const bids = snapshot.data
            .filter(({ side }) => side === 'Buy')
            .map(mapLevelUpdates);
        const priceDataToLvl3 = ({ price, size, side, id }) => ({
            price: types_1.Big(price),
            size: types_1.Big(size),
            side: side.toLowerCase(),
            id: id.toString(),
        });
        const orderPool = snapshot.data.reduce((acc, pd) => (Object.assign({}, acc, { [pd.id.toString()]: priceDataToLvl3(pd) })), {});
        const snapshotMsg = {
            time: new Date(),
            sequence: 0,
            type: 'snapshot',
            productId: snapshot.data[0].symbol,
            asks,
            bids,
            orderPool,
        };
        this.push(snapshotMsg);
    }
    handleOrderbookUpdate(updates) {
        updates.data.forEach((update) => {
            const price = this.orderIdMap[update.id];
            if (update.price) {
                // insert
                this.orderIdMap[update.id] = update.price;
            }
            else if (!update.size) {
                // delete
                delete this.orderIdMap[update.id];
            }
            const message = {
                time: new Date(),
                sequence: this.getSeq(),
                type: 'level',
                productId: update.symbol,
                price: (price ? price : update.price).toString(),
                size: update.size ? update.size.toString() : '0',
                side: update.side.toLowerCase(),
                count: 1,
            };
            this.push(message);
        });
    }
    handleTrade(trades) {
        trades.data.forEach((trade) => {
            const message = {
                type: 'trade',
                productId: trade.symbol,
                time: new Date(trade.timestamp),
                tradeId: trade.trdMatchID,
                price: trade.price.toString(),
                size: trade.size.toString(),
                side: trade.side.toLowerCase(),
            };
            this.push(message);
        });
    }
    handleSubscriptionSuccess(successMsg) {
        // TODO
    }
}
exports.BitmexMarketFeed = BitmexMarketFeed;
//# sourceMappingURL=BitmexMarketFeed.js.map