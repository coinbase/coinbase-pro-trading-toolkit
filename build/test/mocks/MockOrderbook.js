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
const Orderbook_1 = require("../../src/lib/Orderbook");
const BookBuilder_1 = require("../../src/lib/BookBuilder");
const Logger_1 = require("../../src/utils/Logger");
function shallowState() {
    return {
        sequence: 1,
        bids: [
            Orderbook_1.PriceLevelFactory(100, 10, 'buy'),
            Orderbook_1.PriceLevelFactory(99, 5, 'buy'),
            Orderbook_1.PriceLevelFactory(98, 20, 'buy'),
            Orderbook_1.PriceLevelFactory(97, 10, 'buy'),
            Orderbook_1.PriceLevelFactory(96, 1, 'buy'),
            Orderbook_1.PriceLevelFactory(95, 15, 'buy'),
            Orderbook_1.PriceLevelFactory(94, 10, 'buy'),
            Orderbook_1.PriceLevelFactory(93, 25, 'buy'),
            Orderbook_1.PriceLevelFactory(92, 25, 'buy'),
            Orderbook_1.PriceLevelFactory(91, 2, 'buy')
        ],
        asks: [
            Orderbook_1.PriceLevelFactory(110, 10, 'sell'),
            Orderbook_1.PriceLevelFactory(112, 5, 'sell'),
            Orderbook_1.PriceLevelFactory(113, 1, 'sell'),
            Orderbook_1.PriceLevelFactory(114, 1, 'sell'),
            Orderbook_1.PriceLevelFactory(115, 20, 'sell'),
            Orderbook_1.PriceLevelFactory(116, 30, 'sell'),
            Orderbook_1.PriceLevelFactory(117, 10, 'sell'),
            Orderbook_1.PriceLevelFactory(118, 5, 'sell'),
            Orderbook_1.PriceLevelFactory(119, 50, 'sell'),
            Orderbook_1.PriceLevelFactory(120, 2, 'sell')
        ]
    };
}
exports.shallowState = shallowState;
const shallowBook = new BookBuilder_1.BookBuilder(Logger_1.NullLogger);
exports.shallowBook = shallowBook;
shallowBook.fromState(shallowState());
function level3Messages() {
    return [
        Object.assign({
            type: 'snapshot',
            time: new Date('2017-06-01'),
            productId: 'ABC-XYZ'
        }, shallowState()),
        { type: 'orderDone',
            sequence: 2,
            time: new Date('2017-06-01 00:00:01'),
            productId: 'ABC-XYZ',
            price: '113',
            remainingSize: '1',
            reason: 'cancelled'
        }
    ];
}
exports.level3Messages = level3Messages;
//# sourceMappingURL=MockOrderbook.js.map