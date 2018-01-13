/// <reference types="bignumber.js" />
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
import { BigJS, Biglike } from './types';
import { OrderbookState } from './Orderbook';
export interface MarketOrderStats {
    first_price: BigJS;
    last_price: BigJS;
    ave_price: BigJS;
    total_size: BigJS;
    total_cost: BigJS;
    slippage: BigJS;
    fees: BigJS;
    unfilled: BigJS;
    first_price_index?: number;
    last_price_index?: number;
}
/**
 * Calculate stats for trades given an order book. The orderbook is immutable.
 */
export default class OrderbookUtils {
    static calcFees(fees: BigJS, totalCost: BigJS): {
        fees_total: BigNumber.BigNumber;
        total_cost: BigNumber.BigNumber;
    };
    private static extractOrders(orders);
    /**
     * Find the index of the order that will fill size items starting at start_index
     * @param cumSum {BigJS[]}
     * @param startIndex {number} Optional optimisation argument, if it is known that the answer is above a certain index
     * @param size {BigJS}
     * @returns {number} the first index in order_data s.t. sum_to_i >= size
     */
    private static getIndexOf(cumSum, size, startIndex);
    private book;
    private precalc;
    constructor(book: OrderbookState);
    readonly isCached: boolean;
    private readonly cache;
    precache(): void;
    bustCache(): void;
    state(): OrderbookState;
    /**
     * Calculate stats for a market order. If a cached version is available, it will use that, which is much more
     * efficient if multiple calculations on the same book are required. Otherwise for small, once-off calculations
     * it's better to use the naive approach
     * @param side {string} Must be 'buy' or 'sell'
     * @param amount {string|number} The size of the trade
     * @param fees {string|number} [] Optional. The fee rate charged (as a fraction, NOT a percentage)
     * @returns {{ave_price: BigJS, total_size: BigJS, total_cost: BigJS, slippage: BigJS, fees: BigJS, unfilled: BigJS}}
     */
    calculateMarketOrderStats(side: string, amount: Biglike, fees?: BigJS): MarketOrderStats;
    /**
     * Return the index of the first order where the cumulative size is greater or equal to size
     * @param size {BigJS}
     * @param isBuy {boolean}
     * @returns {number}
     */
    getIndexOfTotalSize(size: BigJS, isBuy: boolean): number;
    /**
     * Return the index of the first order where the cumulative value is greater or equal to value
     * @param value {BigJS}
     * @param isBuy {boolean}
     * @returns {number}
     */
    getIndexOfTotalValue(value: BigJS, isBuy: boolean): number;
    /**
     * Calculate the marginal cost in buying from start_size to end_size, ie sum(price_i * size_i) i == start_size to end_size
     * @param startSize {BigJS} the lower bound of the order
     * @param endSize {BigJS} the upper bound of the order
     * @param isBuy
     * @param fees {BigJS}
     * @param useValue {boolean} integrate using the value (quote currency) rather than base
     */
    integrateBetween(startSize: BigJS, endSize: Biglike, isBuy: boolean, fees: BigJS, useValue?: boolean): MarketOrderStats;
    /**
     * Return the cumulative order size after filling until `index` orders
     * @param index {number}
     * @param isBuy {boolean}
     */
    getCumulativeSize(index: number, isBuy: boolean): BigNumber.BigNumber;
    /**
     * Return the cumulative order cost after filling until `index` orders
     * @param index {number}
     * @param isBuy {boolean}
     */
    getCumulativeCost(index: number, isBuy: boolean): BigNumber.BigNumber;
    /**
     * Calculate the base size that can be bought with total_cost, including fees
     * @param startValue {BigJS} The total value that has already been traded
     * @param totalFunds {BigJS} The quote amount to spend, including fees
     * @param isBuy {boolean}
     * @param fees {BigJS} fractional fee rate
     */
    getSizeFromCost(startValue: BigJS, totalFunds: BigJS, isBuy: boolean, fees?: BigJS): MarketOrderStats;
    private calculateStatsFromCache(side, amount, fees);
    private calculateStatsNoCache(side, amount, fees?);
}
