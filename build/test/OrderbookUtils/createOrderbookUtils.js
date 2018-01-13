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
const OrderbookUtils_1 = require("../../src/lib/OrderbookUtils");
const BookBuilder_1 = require("../../src/lib/BookBuilder");
function createOrderbookUtils(bids, asks) {
    const book = {
        sequence: 100,
        bids: [],
        asks: [],
        orderPool: {}
    };
    bids.forEach((bid) => {
        book.bids.push(BookBuilder_1.AggregatedLevelFactory(bid[1], bid[0], 'buy'));
    });
    asks.forEach((ask) => {
        book.asks.push(BookBuilder_1.AggregatedLevelFactory(ask[1], ask[0], 'sell'));
    });
    const obu = new OrderbookUtils_1.default(book);
    obu.calculateStatsNoCache = () => {
        throw new Error('Expecting cached version to be called');
    };
    obu.precache();
    return obu;
}
exports.default = createOrderbookUtils;
//# sourceMappingURL=createOrderbookUtils.js.map