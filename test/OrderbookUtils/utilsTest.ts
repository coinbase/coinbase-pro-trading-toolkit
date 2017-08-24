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

import { Big, ZERO } from '../../src/lib/types';
import createOrderbookUtils from './createOrderbookUtils';
import OrderbookUtils from '../../src/lib/OrderbookUtils';
import { PriceLevelWithOrders } from '../../src/lib/Orderbook';
const expect = require('expect.js');

describe('The OrderbookUtils class', () => {
    it('accepts an orderbook object in the constructor', () => {
        const book = {
            sequence: 0,
            bids: [] as PriceLevelWithOrders[],
            asks: [] as PriceLevelWithOrders[],
            orderPool: {}
        };
        const obu = new OrderbookUtils(book);
        expect(obu).to.be.a(OrderbookUtils);
    });

    it('throws an exception when a non-orderbook instance is passed', () => {
        const fn = (book: any) => {
            return new OrderbookUtils(book);
        };
        expect(fn.bind(null, {})).to.throwError();
        expect(fn.bind(null, 'BTC-USD')).to.throwError();
    });

    it('makes the underlying book object available', () => {
        const book = {
            sequence: 0,
            bids: [] as PriceLevelWithOrders[],
            asks: [] as PriceLevelWithOrders[],
            orderPool: {}
        };
        const obu = new OrderbookUtils(book);
        expect((obu as any).book).to.be(book);
    });
});

describe('An OrderbookUtils object', () => {
    let obu: OrderbookUtils = null;
    beforeEach(() => {
        const bids = [[100, 10, 1], [99, 5, 1], [98, 1, 1]];
        const asks = [[110, 2, 1], [115, 1, 1], [120, 4, 10]];
        obu = createOrderbookUtils(bids, asks);
    });

    it('can calculate buy side stats', () => {
        const stats = obu.calculateMarketOrderStats('buy', 4, ZERO);
        expect(stats).to.be.ok();
        expect(stats.total_cost.toFixed(1)).to.be('455.0');
        expect(stats.ave_price.toFixed(2)).to.be('113.75');
        expect(stats.slippage.toFixed(4)).to.be('0.0341');
        expect(stats.unfilled.toFixed(4)).to.be('0.0000');
        expect(stats.first_price.toFixed(2)).to.be('110.00');
        expect(stats.last_price.toFixed(2)).to.be('120.00');
    });

    it('can calculate sell side stats', () => {
        const stats = obu.calculateMarketOrderStats('sell', 15.5);
        expect(stats).to.be.ok();
        expect(stats.total_cost.toFixed(1)).to.be('1544.0');
        expect(stats.ave_price.toFixed(2)).to.be('99.61');
        expect(stats.slippage.toFixed(5)).to.be('0.00387');
        expect(stats.unfilled.toFixed(4)).to.be('0.0000');
        expect(stats.first_price.toFixed(2)).to.be('100.00');
        expect(stats.last_price.toFixed(2)).to.be('98.00');
    });

    it('perfect fill case', () => {
        const stats = obu.calculateMarketOrderStats('sell', 15.0);
        expect(stats).to.be.ok();
        expect(stats.total_cost.toFixed(1)).to.be('1495.0');
        expect(stats.ave_price.toFixed(2)).to.be('99.67');
        expect(stats.slippage.toFixed(5)).to.be('0.00333');
        expect(stats.unfilled.toFixed(4)).to.be('0.0000');
        expect(stats.first_price.toFixed(2)).to.be('100.00');
        expect(stats.last_price.toFixed(2)).to.be('99.00');
    });

    it('can handle too-large orders', () => {
        const stats = obu.calculateMarketOrderStats('buy', 8);
        expect(stats).to.be.ok();
        expect(stats.total_cost.toFixed(1)).to.be('815.0');
        expect(stats.total_size.toFixed(1)).to.be('7.0');
        expect(stats.ave_price.toFixed(2)).to.be('116.43');
        expect(stats.slippage.toFixed(4)).to.be('0.0584');
        expect(stats.unfilled.toFixed(4)).to.be('1.0000');
        expect(stats.fees.toFixed(2)).to.be('0.00');
    });

    it('can handle zero-size orders', () => {
        const stats = obu.calculateMarketOrderStats('buy', 0);
        expect(stats).to.be.ok();
        expect(stats.total_cost.toFixed(1)).to.be('0.0');
        expect(stats.total_size.toFixed(1)).to.be('0.0');
        expect(stats.ave_price.toFixed(2)).to.be('110.00');
        expect(stats.slippage.toFixed(4)).to.be('0.0000');
        expect(stats.unfilled.toFixed(4)).to.be('0.0000');
        expect(stats.fees.toFixed(2)).to.be('0.00');
    });

    it('can determine fees', () => {
        const stats = obu.calculateMarketOrderStats('buy', 4, Big(0.001));
        expect(stats).to.be.ok();
        expect(stats.total_cost.toFixed(3)).to.be('455.455');
        expect(stats.fees.toFixed(3)).to.be('0.455');
        expect(stats.ave_price.toFixed(3)).to.be('113.864');
        expect(stats.slippage.toFixed(6)).to.be('0.035125');
    });
});
