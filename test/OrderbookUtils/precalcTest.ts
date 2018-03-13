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

import OrderbookUtils from '../../src/lib/OrderbookUtils';
import { ZERO, Big } from '../../src/lib/types';
import createOrderbookUtils from './createOrderbookUtils';
import assert = require('assert');

describe('OrderbookUtils', () => {
    describe('objects', () => {
        let obu: OrderbookUtils = null;
        beforeEach(() => {
            const bids = [[100, 10, 1], [99, 5, 1], [98, 1, 1]];
            const asks = [[110, 2, 1], [115, 1, 1], [120, 4, 10]];
            obu = createOrderbookUtils(bids, asks);
        });

        it('can calculate buy side stats when pre-cached', () => {
            const stats = obu.calculateMarketOrderStats('buy', 4, ZERO);
            assert(stats);
            assert.equal(stats.total_cost.toFixed(1), '455.0');
            assert.equal(stats.ave_price.toFixed(2), '113.75');
            assert.equal(stats.slippage.toFixed(4), '0.0341');
            assert.equal(stats.unfilled.toFixed(4), '0.0000');
            assert.equal(stats.first_price.toFixed(2), '110.00');
            assert.equal(stats.last_price.toFixed(2), '120.00');
        });

        it('can calculate sell side stats when pre-cached', () => {
            const stats = obu.calculateMarketOrderStats('sell', 15.5);
            assert(stats);
            assert.equal(stats.total_cost.toFixed(1), '1544.0');
            assert.equal(stats.ave_price.toFixed(2), '99.61');
            assert.equal(stats.slippage.toFixed(5), '0.00387');
            assert.equal(stats.unfilled.toFixed(4), '0.0000');
            assert.equal(stats.first_price.toFixed(2), '100.00');
            assert.equal(stats.last_price.toFixed(2), '98.00');
        });

        it('perfect fill case when pre-cached', () => {
            const stats = obu.calculateMarketOrderStats('sell', 15.0);
            assert(stats);
            assert.equal(stats.total_cost.toFixed(1), '1495.0');
            assert.equal(stats.ave_price.toFixed(2), '99.67');
            assert.equal(stats.slippage.toFixed(5), '0.00333');
            assert.equal(stats.unfilled.toFixed(4), '0.0000');
            assert.equal(stats.first_price.toFixed(2), '100.00');
            assert.equal(stats.last_price.toFixed(2), '99.00');
        });

        it('can handle too-large orders when pre-cached', () => {
            const stats = obu.calculateMarketOrderStats('buy', 8);
            assert(stats);
            assert.equal(stats.total_cost.toFixed(1), '815.0');
            assert.equal(stats.total_size.toFixed(1), '7.0');
            assert.equal(stats.ave_price.toFixed(2), '116.43');
            assert.equal(stats.slippage.toFixed(4), '0.0584');
            assert.equal(stats.unfilled.toFixed(4), '1.0000');
            assert.equal(stats.fees.toFixed(2), '0.00');
        });

        it('can handle zero-size orders when pre-cached', () => {
            const stats = obu.calculateMarketOrderStats('buy', 0);
            assert(stats);
            assert.equal(stats.total_cost.toFixed(1), '0.0');
            assert.equal(stats.total_size.toFixed(1), '0.0');
            assert.equal(stats.ave_price.toFixed(2), '110.00');
            assert.equal(stats.slippage.toFixed(4), '0.0000');
            assert.equal(stats.unfilled.toFixed(4), '0.0000');
            assert.equal(stats.fees.toFixed(2), '0.00');
        });

        it('can determine fees when pre-cached', () => {
            const stats = obu.calculateMarketOrderStats('buy', 4, Big(0.001));
            assert(stats);
            assert.equal(stats.total_cost.toFixed(3), '455.455');
            assert.equal(stats.fees.toFixed(3), '0.455');
            assert.equal(stats.ave_price.toFixed(3), '113.864');
            assert.equal(stats.slippage.toFixed(6), '0.035125');
        });

        it('can calculate sum of order sizes up to index n', () => {
            assert.equal(+obu.getCumulativeSize(1, true), 3);
            assert.equal(+obu.getCumulativeSize(1, false), 15);
            assert.equal(+obu.getCumulativeSize(0, true), 2);
            assert.equal(+obu.getCumulativeSize(0, false), 10);
            assert.equal(+obu.getCumulativeSize(2, true), 7);
            assert.equal(+obu.getCumulativeSize(3, false), 16);
        });

        it('can calculate sum of costs up to index n', () => {
            assert.equal(+obu.getCumulativeCost(1, true), 335);
            assert.equal(+obu.getCumulativeCost(1, false), 1495);
            assert.equal(+obu.getCumulativeCost(0, true), 220);
            assert.equal(+obu.getCumulativeCost(0, false), 1000);
            assert.equal(+obu.getCumulativeCost(2, true), 815);
            assert.equal(+obu.getCumulativeCost(3, false), 1593);
        });
    });

    describe('Partial sums of orderbooks', () => {
        let obu: OrderbookUtils = null;
        beforeEach(() => {
            const bids = [[100, 10, 1], [99, 5, 1], [98, 1, 1], [97, 3, 1]];
            const asks = [[110, 2, 1], [115, 1, 1], [120, 4, 10], [125, 2, 3]];
            obu = createOrderbookUtils(bids, asks);
        });

        it('calculates sell stats between 10 and 15 BTC', () => {
            const stats = obu.integrateBetween(Big(10), Big(15), false, Big(0));
            assert.equal(+stats.total_size, 5);
            assert.equal(+stats.first_price, 99);
            assert.equal(+stats.last_price, 99);
            assert.equal(+stats.total_cost, 495);
            assert.equal(+stats.unfilled, 0);
        });

        it('calculates sell stats between 3 and 15.5 BTC', () => {
            const stats = obu.integrateBetween(Big(3), Big(15.5), false, Big(0));
            assert.equal(+stats.total_size, 12.5);
            assert.equal(+stats.first_price, 100);
            assert.equal(+stats.last_price, 98);
            assert.equal(+stats.total_cost, 700 + 495 + 49);
            assert.equal(+stats.unfilled, 0);
        });

        it('calculates sell stats between 10 and 10.1 BTC', () => {
            const stats = obu.integrateBetween(Big(10), Big(10.1), false, Big(0));
            assert.equal(+stats.total_size, 0.1);
            assert.equal(+stats.first_price, 99);
            assert.equal(+stats.last_price, 99);
            assert.equal(+stats.total_cost, 9.9);
            assert.equal(+stats.unfilled, 0);
        });

        it('calculates sell stats between 11 and 17 BTC', () => {
            const stats = obu.integrateBetween(Big(11), Big(17), false, Big(0));
            assert.equal(+stats.total_size, 6);
            assert.equal(+stats.first_price, 99);
            assert.equal(+stats.last_price, 97);
            assert.equal(+stats.total_cost, 4 * 99 + 98 + 97);
            assert.equal(+stats.unfilled, 0);
        });

        it('calculates sell stats between 11 and 17 BTC with fees', () => {
            const stats = obu.integrateBetween(Big(11), Big(17), false, Big(0.01));
            assert.equal(+stats.total_size, 6);
            assert.equal(+stats.first_price, 99);
            assert.equal(+stats.last_price, 97);
            assert.equal(+stats.total_cost, (4 * 99 + 98 + 97) * 1.01);
            assert.equal(+stats.fees, (4 * 99 + 98 + 97) * 0.01);
            assert.equal(+stats.unfilled, 0);
        });

        it('calculates sell stats between 16 and 20 BTC', () => {
            const stats = obu.integrateBetween(Big(16), Big(20), false, Big(0));
            assert.equal(+stats.total_size, 3);
            assert.equal(+stats.first_price, 97);
            assert.equal(+stats.last_price, 97);
            assert.equal(+stats.total_cost, 3 * 97);
            assert.equal(+stats.unfilled, 1);
        });

        it('calculates buy stats between 1 and 3 BTC', () => {
            const stats = obu.integrateBetween(Big(1), Big(3), true, Big(0));
            assert.equal(+stats.total_size, 2);
            assert.equal(+stats.first_price, 110);
            assert.equal(+stats.last_price, 115);
            assert.equal(+stats.total_cost, 110 + 115);
            assert.equal(+stats.unfilled, 0);
        });

        it('calculates buy stats between 2 and 7 BTC', () => {
            const stats = obu.integrateBetween(Big(2), Big(7), true, Big(0));
            assert.equal(+stats.total_size, 5);
            assert.equal(+stats.first_price, 115);
            assert.equal(+stats.last_price, 120);
            assert.equal(+stats.total_cost, 115 + 4 * 120);
            assert.equal(+stats.unfilled, 0);
        });

        it('calculates buy stats between 2 and 2 BTC', () => {
            const stats = obu.integrateBetween(Big(2), Big(2), true, Big(0));
            assert.equal(+stats.total_size, 0);
            assert.equal(+stats.first_price, 115);
            assert.equal(+stats.last_price, 115);
            assert.equal(+stats.total_cost, 0);
            assert.equal(+stats.unfilled, 0);
        });

        it('calculates buy stats between 2.5 and 2.5 BTC', () => {
            const stats = obu.integrateBetween(Big(2.5), Big(2.5), true, Big(0));
            assert.equal(+stats.total_size, 0);
            assert.equal(+stats.first_price, 115);
            assert.equal(+stats.last_price, 115);
            assert.equal(+stats.total_cost, 0);
            assert.equal(+stats.unfilled, 0);
        });
    });

    describe('Sums using quote currency', () => {
        let obu: OrderbookUtils = null;
        beforeEach(() => {
            const bids = [[100, 10, 1], [95, 50, 1], [90, 10, 1], [85, 20, 1]];
            const asks = [[110, 2, 1], [115, 1, 1], [120, 4, 10], [125, 100, 1]];
            obu = createOrderbookUtils(bids, asks);
        });

        it('calculates sell stats for $550', () => {
            const stats = obu.getSizeFromCost(Big(0), Big(550), false, Big(0));
            assert.equal(+stats.total_size, 5.5);
            assert.equal(+stats.first_price, 100);
            assert.equal(+stats.last_price, 100);
            assert.equal(+stats.total_cost, 550);
            assert.equal(+stats.unfilled, 0);
        });

        it('calculates buy stats for $165', () => {
            const stats = obu.getSizeFromCost(Big(0), Big(165), true, Big(0));
            assert.equal(+stats.total_size, 1.5);
            assert.equal(+stats.first_price, 110);
            assert.equal(+stats.last_price, 110);
            assert.equal(+stats.total_cost, 165);
            assert.equal(+stats.unfilled, 0);
        });

        it('calculates sell stats for $1095', () => {
            const stats = obu.getSizeFromCost(Big(0), Big(1095), false, Big(0));
            assert.equal(+stats.total_size, 11);
            assert.equal(+stats.first_price, 100);
            assert.equal(+stats.last_price, 95);
            assert.equal(+stats.total_cost, 1095);
            assert.equal(+stats.unfilled, 0);
        });

        it('calculates buy stats for $8,000', () => {
            const stats = obu.getSizeFromCost(Big(0), Big(8000), true, Big(0));
            assert.equal(+stats.total_size, 64.48);
            assert.equal(+stats.first_price, 110);
            assert.equal(+stats.last_price, 125);
            assert.equal(+stats.total_cost, 8000);
            assert.equal(+stats.unfilled, 0);
        });

        it('calculates sell stats for $1000 starting from $500', () => {
            const stats = obu.getSizeFromCost(Big(500), Big(1000), false, Big(0));
            assert.equal(+stats.total_size, 5 + 500 / 95); // 10.26315789
            assert.equal(+stats.first_price, 100);
            assert.equal(+stats.last_price, 95);
            assert.equal(+stats.total_cost, 1000);
            assert.equal(+stats.unfilled, 0);
        });

        it('calculates buy stats for $2000 starting from $1000', () => {
            const stats = obu.getSizeFromCost(Big(1000), Big(2000), true, Big(0));
            assert.equal(+stats.total_size.toFixed(6), 16);
            assert.equal(+stats.first_price, 125);
            assert.equal(+stats.last_price, 125);
            assert.equal(+stats.total_cost, 2000);
            assert.equal(+stats.unfilled, 0);
        });

        it('calculates sell stats for $0 starting from $1200', () => {
            const stats = obu.getSizeFromCost(Big(5000), Big(0), false, Big(0));
            assert.equal(+stats.total_size, 0);
            assert.equal(+stats.first_price, 95);
            assert.equal(+stats.last_price, 95);
            assert.equal(+stats.total_cost, 0);
            assert.equal(+stats.unfilled, 0);
        });

        it('calculates buy stats for $0 starting from $2500', () => {
            const stats = obu.getSizeFromCost(Big(2500), Big(0), true, Big(0));
            assert.equal(+stats.total_size, 0);
            assert.equal(+stats.first_price, 125);
            assert.equal(+stats.last_price, 125);
            assert.equal(+stats.total_cost, 0);
            assert.equal(+stats.unfilled, 0);
        });

        it('calculates sell stats for $1000 starting from $500, including fees', () => {
            const stats = obu.getSizeFromCost(Big(500), Big(1000), false, Big(0.01));
            assert.equal(+stats.total_size.toFixed(6), 10.158937);
            assert.equal(+stats.first_price, 100);
            assert.equal(+stats.last_price, 95);
            assert.equal(+stats.total_cost, 1000);
            assert.equal(+stats.unfilled, 0);
        });

        it('calculates buy stats for $15,000 starting from $750, including fees', () => {
            const stats = obu.getSizeFromCost(Big(750), Big(15000), true, Big(0.01));
            assert.equal(+stats.total_size.toFixed(3), 100.542);
            assert.equal(+stats.first_price, 120);
            assert.equal(+stats.last_price, 125);
            assert.equal(+stats.total_cost, 12690.65);
            assert.equal(+stats.fees, 125.65);
            assert.equal(+stats.unfilled, 2309.35);
        });
    });
});
