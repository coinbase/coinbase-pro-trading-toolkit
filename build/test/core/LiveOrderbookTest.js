"use strict";
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
const MockLivebook_1 = require("../mocks/MockLivebook");
const MockOrderbook_1 = require("../mocks/MockOrderbook");
const LiveOrderbook_1 = require("../../src/core/LiveOrderbook");
const assert = require("assert");
const types_1 = require("../../src/lib/types");
describe('LiveOrderbook', () => {
    let mock = null;
    let book;
    before(() => {
        mock = MockLivebook_1.createMockLivebook('ABC-XYZ', MockOrderbook_1.level3Messages());
        book = mock.liveBook;
    });
    it('has basic state configured after instantiation', () => {
        assert(book instanceof LiveOrderbook_1.LiveOrderbook);
        assert.equal(book.product, 'ABC-XYZ');
        assert.equal(book.sequence, -1);
        assert.doesNotThrow(book.state.bind(book));
        assert.doesNotThrow(book.ordersForValue.bind(book, 'buy', '10', false));
        assert(book.ticker);
        assert.equal(book.snapshotReceived, false);
    });
    it('it has state after receiving a snapshot', (done) => {
        book.on('LiveOrderbook.snapshot', () => {
            assert.equal(book.snapshotReceived, true);
            assert.equal(book.sequence, 1);
            // Compare with the shallowState orderbook in MockOrderbook
            let orders = book.ordersForValue('buy', 17, false);
            assertAggregatedLevelEqual(orders[0], {
                price: types_1.Big(110),
                totalSize: types_1.Big(10),
                numOrders: 1,
                value: types_1.Big(1100),
                cumSize: types_1.Big(10),
                cumValue: types_1.Big(1100),
                cumCount: 1
            });
            assertAggregatedLevelEqual(orders[1], {
                price: types_1.Big(112),
                totalSize: types_1.Big(5),
                numOrders: 1,
                value: types_1.Big(560),
                cumSize: types_1.Big(15),
                cumValue: types_1.Big(1660),
                cumCount: 2
            });
            assertAggregatedLevelEqual(orders[2], {
                price: types_1.Big(113),
                totalSize: types_1.Big(1),
                numOrders: 1,
                value: types_1.Big(113),
                cumSize: types_1.Big(16),
                cumValue: types_1.Big(1773),
                cumCount: 3
            });
            assertAggregatedLevelEqual(orders[3], {
                price: types_1.Big(114),
                totalSize: types_1.Big(1),
                numOrders: 1,
                value: types_1.Big(114),
                cumSize: types_1.Big(17),
                cumValue: types_1.Big(1887),
                cumCount: 4
            });
            assert.equal(orders.length, 4);
            // And the bids:
            orders = book.ordersForValue('sell', 15, false);
            assertAggregatedLevelEqual(orders[0], {
                price: types_1.Big(100),
                totalSize: types_1.Big(10),
                numOrders: 1,
                value: types_1.Big(1000),
                cumSize: types_1.Big(10),
                cumValue: types_1.Big(1000),
                cumCount: 1
            });
            assertAggregatedLevelEqual(orders[1], {
                price: types_1.Big(99),
                totalSize: types_1.Big(5),
                numOrders: 1,
                value: types_1.Big(495),
                cumSize: types_1.Big(15),
                cumValue: types_1.Big(1495),
                cumCount: 2
            });
            assert.equal(orders.length, 2);
            done();
        });
        mock.messages.sendOne();
    });
});
function assertAggregatedLevelEqual(level, expected) {
    assert.ok(level.price.eq(expected.price), `price expected: ${expected.price}, received: ${level.price}`);
    assert.ok(level.totalSize.eq(expected.totalSize), 'size');
    assert.ok(level.value.eq(expected.value), 'value');
    assert.ok(level.cumSize.eq(expected.cumSize), 'cumSize');
    assert.ok(level.cumValue.eq(expected.cumValue), 'cumValue');
    assert.ok(level.orders[0].price.eq(expected.price));
    assert.ok(level.orders[0].size.eq(expected.totalSize));
}
//# sourceMappingURL=LiveOrderbookTest.js.map