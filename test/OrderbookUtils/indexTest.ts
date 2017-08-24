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

'use strict';
const assert = require('assert');
import OrderbookUtils from '../../src/lib/OrderbookUtils';
import { Big } from '../../src/lib/types';
import createOrderbookUtils from './createOrderbookUtils';

describe('OrderbookUtils index calculations', () => {
    let obu: OrderbookUtils = null;
    beforeEach(() => {
        const bids = [ [100, 2, 1], [99, 1, 1], [98, 4, 1] ];
        const asks = [ [110, 2, 1], [115, 1, 1], [120, 10, 1] ];
        obu = createOrderbookUtils(bids, asks);
    });

    it(`Returns size index on buy side`, () => {
        const index = obu.getIndexOfTotalSize(Big(2.1), true);
        assert.equal(index, 1);
    });

    it(`Returns LHS index on boundary on buy side`, () => {
        const index = obu.getIndexOfTotalSize(Big(2), true);
        assert.equal(index, 0);
    });

    it(`Returns index if size is equal to book on buy side`, () => {
        const index = obu.getIndexOfTotalSize(Big(13), true);
        assert.equal(index, 2);
    });

    it(`Returns -1 index if size is larger than book on buy side`, () => {
        const index = obu.getIndexOfTotalSize(Big(14), true);
        assert.equal(index, -1);
    });

    it(`Returns size index on sell side`, () => {
        const index = obu.getIndexOfTotalSize(Big(2.1), false);
        assert.equal(index, 1);
    });

    it(`Returns LHS index on boundary on sell side`, () => {
        const index = obu.getIndexOfTotalSize(Big(2), false);
        assert.equal(index, 0);
    });

    it(`Returns index if size is equal to book on sell side`, () => {
        const index = obu.getIndexOfTotalSize(Big(7), false);
        assert.equal(index, 2);
    });

    it(`Returns -1 index if size is larger than book on sell side`, () => {
        const index = obu.getIndexOfTotalSize(Big(8), false);
        assert.equal(index, -1);
    });
});
