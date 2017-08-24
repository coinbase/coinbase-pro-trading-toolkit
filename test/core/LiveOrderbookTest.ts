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
import { createMockLivebook, MockLivebook } from '../mocks/MockLivebook';
import { level3Messages } from '../mocks/MockOrderbook';
import { LiveOrderbook } from '../../src/core/LiveOrderbook';
import * as assert from 'assert';
import { CumulativePriceLevel } from '../../src/lib/Orderbook';
import { Big } from '../../src/lib/types';

describe('LiveOrderbook', () => {
    let mock: MockLivebook = null;
    let book: LiveOrderbook;
    before(() => {
        mock = createMockLivebook('ABC-XYZ', level3Messages());
        book = mock.liveBook;
    });

    it('has basic state configured after instantiation', () => {
        assert(book instanceof LiveOrderbook);
        assert.equal(book.product, 'ABC-XYZ');
        assert.equal(book.sequence, -1);
        assert.doesNotThrow(book.state.bind(book));
        assert.doesNotThrow(book.ordersForValue.bind(book, 'buy', '10', false));
        assert(book.ticker);
        assert.equal((book as any).snapshotReceived, false);
    });

    it('it has state after receiving a snapshot', (done) => {
        book.on('LiveOrderbook.snapshot', () => {
            assert.equal((book as any).snapshotReceived, true);
            assert.equal(book.sequence, 1);
            // Compare with the shallowState orderbook in MockOrderbook
            let orders: CumulativePriceLevel[] = book.ordersForValue('buy', 17, false);
            assertAggregatedLevelEqual(orders[0], {
                price: Big(110),
                totalSize: Big(10),
                numOrders: 1,
                value: Big(1100),
                cumSize: Big(10),
                cumValue: Big(1100),
                cumCount: 1
            });
            assertAggregatedLevelEqual(orders[1], {
                price: Big(112),
                totalSize: Big(5),
                numOrders: 1,
                value: Big(560),
                cumSize: Big(15),
                cumValue: Big(1660),
                cumCount: 2
            });
            assertAggregatedLevelEqual(orders[2], {
                price: Big(113),
                totalSize: Big(1),
                numOrders: 1,
                value: Big(113),
                cumSize: Big(16),
                cumValue: Big(1773),
                cumCount: 3
            });
            assertAggregatedLevelEqual(orders[3], {
                price: Big(114),
                totalSize: Big(1),
                numOrders: 1,
                value: Big(114),
                cumSize: Big(17),
                cumValue: Big(1887),
                cumCount: 4
            });
            assert.equal(orders.length, 4);
            // And the bids:
            orders = book.ordersForValue('sell', 15, false);
            assertAggregatedLevelEqual(orders[0], {
                price: Big(100),
                totalSize: Big(10),
                numOrders: 1,
                value: Big(1000),
                cumSize: Big(10),
                cumValue: Big(1000),
                cumCount: 1
            });
            assertAggregatedLevelEqual(orders[1], {
                price: Big(99),
                totalSize: Big(5),
                numOrders: 1,
                value: Big(495),
                cumSize: Big(15),
                cumValue: Big(1495),
                cumCount: 2
            });
            assert.equal(orders.length, 2);
            done();
        });
        mock.messages.sendOne();
    });
});

function assertAggregatedLevelEqual(level: CumulativePriceLevel, expected: any) {
    assert.ok(level.price.eq(expected.price), `price expected: ${expected.price}, received: ${level.price}`);
    assert.ok(level.totalSize.eq(expected.totalSize), 'size');
    assert.ok(level.value.eq(expected.value), 'value');
    assert.ok(level.cumSize.eq(expected.cumSize), 'cumSize');
    assert.ok(level.cumValue.eq(expected.cumValue), 'cumValue');
    assert.ok(level.orders[0].price.eq(expected.price));
    assert.ok(level.orders[0].size.eq(expected.totalSize));
}
