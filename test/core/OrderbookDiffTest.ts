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

import { OrderbookDiff } from '../../src/lib/OrderbookDiff';
import { BookBuilder } from '../../src/lib/BookBuilder';
import assert = require('assert');
import { PriceLevelWithOrders } from '../../src/lib/Orderbook';
import { Biglike, Big } from '../../src/lib/types';
import { NullLogger } from '../../src/utils/Logger';

function assertPriceLevel(actual: PriceLevelWithOrders, price: Biglike, size: Biglike, numOrders?: number) {
    assert.equal(+actual.totalSize, +size, 'size');
    assert.equal(+actual.price, +price, 'price');
    if (typeof numOrders === 'number') {
        assert.equal(actual.orders.length, numOrders);
    }
    return true;
}
describe('OrderbookDiff', () => {
    it('produces a diff of orders missing on source', () => {
        const initial: BookBuilder = new BookBuilder(NullLogger);
        const final: BookBuilder = new BookBuilder(NullLogger);
        initial.add({ id: '1', price: Big(100), size: Big(5), side: 'buy' });
        final.add({ id: '1', price: Big(100), size: Big(4), side: 'buy' });
        final.add({ id: '2', price: Big(101), size: Big(3), side: 'buy' });
        final.add({ id: '3', price: Big(102), size: Big(1), side: 'sell' });
        const diff = OrderbookDiff.compareByLevel(initial, final, false);
        assert.equal(diff.bids.length, 2);
        assertPriceLevel(diff.bids[0], 100, -1);
        assertPriceLevel(diff.bids[1], 101, 3);
        assert.equal(diff.asks.length, 1);
        assertPriceLevel(diff.asks[0], 102, 1);
    });

    it('produces a diff of orders missing on final', () => {
        const initial: BookBuilder = new BookBuilder(NullLogger);
        const final: BookBuilder = new BookBuilder(NullLogger);
        initial.add({ id: '1', price: Big(100), size: Big(5), side: 'buy' });
        initial.add({ id: '2', price: Big(101), size: Big(5), side: 'sell' });
        final.add({ id: '1', price: Big(101), size: Big(5), side: 'sell' });
        const diff = OrderbookDiff.compareByLevel(initial, final, false);
        assert.equal(diff.bids.length, 1);
        assert.equal(diff.asks.length, 0);
        assertPriceLevel(diff.bids[0], 100, -5);
    });

    it('produces a diff of null when books are identical', () => {
        const final: BookBuilder = new BookBuilder(NullLogger);
        final.add({ id: '1', price: Big(100), size: Big(4), side: 'buy' });
        final.add({ id: '2', price: Big(101), size: Big(3), side: 'buy' });
        final.add({ id: '3', price: Big(102), size: Big(1), side: 'sell' });
        const diff = OrderbookDiff.compareByLevel(final, final, false);
        assert.equal(diff.bids.length, 0);
        assert.equal(diff.asks.length, 0);
    });

    it('produces a order-level diff', () => {
        const initial: BookBuilder = new BookBuilder(NullLogger);
        const final: BookBuilder = new BookBuilder(NullLogger);
        initial.add({ id: '1', price: Big(100), size: Big(5), side: 'buy' });
        initial.add({ id: '100', price: Big(98), size: Big(5), side: 'buy' });
        initial.add({ id: '101', price: Big(104), size: Big(3.5), side: 'sell' });
        final.add({ id: '2', price: Big(100), size: Big(4), side: 'buy' });
        final.add({ id: '3', price: Big(101), size: Big(3), side: 'buy' });
        final.add({ id: '4', price: Big(102), size: Big(1), side: 'sell' });
        final.add({ id: '100', price: Big(98), size: Big(5), side: 'buy' });
        final.add({ id: '101', price: Big(104), size: Big(3.5), side: 'sell' });
        const diff = OrderbookDiff.compareByOrder(initial, final);
        assert.equal(Object.keys(diff.orderPool).length, 4);
        assert.equal(diff.bids.length, 2);
        assertPriceLevel(diff.bids[0], 101, 3, 1);
        assertPriceLevel(diff.bids[1], 100, -1, 2);
        assert.equal(diff.asks.length, 1);
        assertPriceLevel(diff.asks[0], 102, 1);
    });

    it('produces a simple set of trade messages', () => {
        const initial: BookBuilder = new BookBuilder(NullLogger);
        const final: BookBuilder = new BookBuilder(NullLogger);
        initial.add({ id: '1', price: Big(100), size: Big(5), side: 'buy' });
        initial.add({ id: '100', price: Big(98), size: Big(5), side: 'buy' });
        initial.add({ id: '101', price: Big(104), size: Big(3.5), side: 'sell' });
        final.add({ id: '2', price: Big(100), size: Big(4), side: 'buy' });
        final.add({ id: '3', price: Big(101), size: Big(3), side: 'buy' });
        final.add({ id: '4', price: Big(102), size: Big(1), side: 'sell' });
        final.add({ id: '100', price: Big(98), size: Big(5), side: 'buy' });
        final.add({ id: '101', price: Big(104), size: Big(3.5), side: 'sell' });
        const diff = new OrderbookDiff('BTC-ABC', initial, final);
        const messages = diff.generateSimpleCommandSet({ postOnly: true });
        const now = messages[0].time;
        assert.deepEqual(messages, [
            { type: 'cancelAllOrders', time: now },
            { type: 'placeOrder', time: now, orderType: 'limit', productId: 'BTC-ABC', price: '101', size: '3', side: 'buy', postOnly: true },
            { type: 'placeOrder', time: now, orderType: 'limit', productId: 'BTC-ABC', price: '100', size: '4', side: 'buy', postOnly: true },
            { type: 'placeOrder', time: now, orderType: 'limit', productId: 'BTC-ABC', price: '98', size: '5', side: 'buy', postOnly: true },
            { type: 'placeOrder', time: now, orderType: 'limit', productId: 'BTC-ABC', price: '102', size: '1', side: 'sell', postOnly: true },
            { type: 'placeOrder', time: now, orderType: 'limit', productId: 'BTC-ABC', price: '104', size: '3.5', side: 'sell', postOnly: true }
        ]);
    });

    it('produces a diff-set of trade messages', () => {
        const initial: BookBuilder = new BookBuilder(NullLogger);
        const final: BookBuilder = new BookBuilder(NullLogger);
        initial.add({ id: '10', price: Big(100), size: Big(5), side: 'buy' });
        initial.add({ id: '11', price: Big(100), size: Big(6), side: 'buy' });
        initial.add({ id: '100', price: Big(98), size: Big(5), side: 'buy' });
        initial.add({ id: '101', price: Big(104), size: Big(3.5), side: 'sell' });
        final.add({ id: '2', price: Big(100), size: Big(4), side: 'buy' });
        final.add({ id: '3', price: Big(101), size: Big(3), side: 'buy' });
        final.add({ id: '4', price: Big(102), size: Big(1), side: 'sell' });
        final.add({ id: '100', price: Big(98), size: Big(5), side: 'buy' });
        final.add({ id: '101', price: Big(104), size: Big(3.5), side: 'sell' });
        const diff = new OrderbookDiff('BTC-ABC', initial, final);
        const messages = diff.generateDiffCommands(null, { postOnly: true });
        const now = messages[0].time;
        assert.deepEqual(messages, [
            { type: 'cancelOrder', time: now, orderId: '10' },
            { type: 'cancelOrder', time: now, orderId: '11' },
            { type: 'placeOrder', time: now, orderType: 'limit', productId: 'BTC-ABC', price: '100', size: '4', side: 'buy', postOnly: true },
            { type: 'placeOrder', time: now, orderType: 'limit', productId: 'BTC-ABC', price: '101', size: '3', side: 'buy', postOnly: true },
            { type: 'placeOrder', time: now, orderType: 'limit', productId: 'BTC-ABC', price: '102', size: '1', side: 'sell', postOnly: true }
        ]);
    });
});
