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

import { Big, BigJS, Biglike, ONE, ZERO } from './types';
import { OrderbookState, PriceLevel } from './Orderbook';
import BigArray from './BigArray';

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

interface OrdersCache {
    prices: BigArray;
    sizes: BigArray;
    value: BigArray;
}

interface OrderbookCache {
    bids: OrdersCache;
    asks: OrdersCache;
}

/**
 * Calculate stats for trades given an order book. The orderbook is immutable.
 */
export default class OrderbookUtils {
    static calcFees(fees: BigJS, totalCost: BigJS): { fees_total: BigJS; total_cost: BigJS } {
        const feesTotal = totalCost.times(fees);
        totalCost = totalCost.plus(feesTotal);
        return { fees_total: feesTotal, total_cost: totalCost };
    }

    private static extractOrders(orders: PriceLevel[]): OrdersCache {
        const len = orders.length;
        const prices = new Array(len);
        const sizes = new Array(len);
        for (let i = 0; i < len; i++) {
            prices[i] = orders[i].price;
            sizes[i] = orders[i].totalSize;
        }
        const priceArray = new BigArray(prices);
        const sizeArray = new BigArray(sizes);
        const value = sizeArray.mult(priceArray);
        return {
            prices: priceArray,
            sizes: sizeArray,
            value: value
        };
    }

    /**
     * Find the index of the order that will fill size items starting at start_index
     * @param cumSum {BigJS[]}
     * @param startIndex {number} Optional optimisation argument, if it is known that the answer is above a certain index
     * @param size {BigJS}
     * @returns {number} the first index in order_data s.t. sum_to_i >= size
     */
    private static getIndexOf(cumSum: BigJS[], size: BigJS, startIndex: number): number {
        let result = startIndex || 0;
        while (result < cumSum.length - 1 && cumSum[result].lt(size)) {
            result++;
        }
        return result;
    }

    private readonly book: OrderbookState;

    private precalc: OrderbookCache;

    constructor(book: OrderbookState) {
        if (!book || typeof book !== 'object') {
            throw new Error('OrderbookUtils requires an order book object in the constructor');
        }
        const validBook = !!book.asks && !!book.bids;
        if (!validBook) {
            throw new Error('The order object must have both a bids and asks array');
        }
        this.book = book;
        this.precalc = null;
    }

    get isCached() {
        return this.precalc !== null;
    }

    private get cache() {
        if (!this.precalc) {
            this.precache();
        }
        return this.precalc;
    }

    precache() {
        const book = this.book;
        this.precalc = {
            asks: OrderbookUtils.extractOrders(book.asks),
            bids: OrderbookUtils.extractOrders(book.bids)
        };
    }

    bustCache() {
        this.precalc = null;
    }

    state() {
        return this.book;
    }

    /**
     * Calculate stats for a market order. If a cached version is available, it will use that, which is much more
     * efficient if multiple calculations on the same book are required. Otherwise for small, once-off calculations
     * it's better to use the naive approach
     * @param side {string} Must be 'buy' or 'sell'
     * @param amount {string|number} The size of the trade
     * @param fees {string|number} [] Optional. The fee rate charged (as a fraction, NOT a percentage)
     * @returns {{ave_price: BigJS, total_size: BigJS, total_cost: BigJS, slippage: BigJS, fees: BigJS, unfilled: BigJS}}
     */
    calculateMarketOrderStats(side: string, amount: Biglike, fees: BigJS = ZERO): MarketOrderStats {
        if (+amount === 0) {
            const orders: PriceLevel[] = side === 'buy' ? this.book.asks : this.book.bids;
            const firstOrder: PriceLevel = orders[0];
            return {
                first_price: firstOrder.price,
                last_price: firstOrder.price,
                ave_price: firstOrder.price,
                total_size: ZERO,
                total_cost: ZERO,
                slippage: ZERO,
                fees: ZERO,
                unfilled: ZERO
            };
        }
        return this.isCached ? this.calculateStatsFromCache(side, amount, fees) : this.calculateStatsNoCache(side, amount, fees);
    }

    /**
     * Return the index of the first order where the cumulative size is greater or equal to size
     * @param size {BigJS}
     * @param isBuy {boolean}
     * @returns {number}
     */
    getIndexOfTotalSize(size: BigJS, isBuy: boolean): number {
        const orderData = isBuy ? this.cache.asks : this.cache.bids;
        const sizes = orderData.sizes;
        if (size.gt(sizes.sum())) {
            return -1;
        }
        return OrderbookUtils.getIndexOf(sizes.cumsum().values, size, 0);
    }

    /**
     * Return the index of the first order where the cumulative value is greater or equal to value
     * @param value {BigJS}
     * @param isBuy {boolean}
     * @returns {number}
     */
    getIndexOfTotalValue(value: BigJS, isBuy: boolean): number {
        const orderData = isBuy ? this.cache.asks : this.cache.bids;
        const cumsum = orderData.value.cumsum().values;
        return OrderbookUtils.getIndexOf(cumsum, value, 0);
    }

    /**
     * Calculate the marginal cost in buying from start_size to end_size, ie sum(price_i * size_i) i == start_size to end_size
     * @param startSize {BigJS} the lower bound of the order
     * @param endSize {BigJS} the upper bound of the order
     * @param isBuy
     * @param fees {BigJS}
     * @param useValue {boolean} integrate using the value (quote currency) rather than base
     */
    integrateBetween(startSize: BigJS, endSize: Biglike, isBuy: boolean, fees: BigJS, useValue: boolean = false): MarketOrderStats {
        endSize = Big(endSize);
        const cache = this.cache;
        const orderData = isBuy ? cache.asks : cache.bids;
        // Cumulative sums for these arrays are cached, so multiple calls to this method is very efficient after the first one
        // if calculating with values (quote currency) the 'size' vars actually refer to value. They'll be remapped later
        const cumSize = useValue ? orderData.value.cumsum().values : orderData.sizes.cumsum().values;
        const startIndex = OrderbookUtils.getIndexOf(cumSize, startSize, 0);
        const partialStartSize = cumSize[startIndex].minus(startSize);
        const firstPriceIndex = partialStartSize.eq(ZERO) ? startIndex + 1 : startIndex;
        const firstPrice = Big(orderData.prices.values[firstPriceIndex]);
        let endIndex = OrderbookUtils.getIndexOf(cumSize, endSize, startIndex);
        let sizeNotIncluded = cumSize[endIndex].minus(endSize);
        if (sizeNotIncluded.lt(ZERO)) {
            sizeNotIncluded = ZERO;
        }
        let lastPrice = Big(orderData.prices.values[endIndex]);
        let totalSize = cumSize[endIndex].minus(startSize).minus(sizeNotIncluded);
        const remaining = endSize.minus(startSize).minus(totalSize);
        let totalCost;
        if (!useValue) {
            const cumValues = orderData.value.cumsum().values;
            totalCost = cumValues[endIndex].minus(cumValues[startIndex])
                .plus(partialStartSize.times(firstPrice))
                .minus(sizeNotIncluded.times(lastPrice));
        } else {
            // We were summing over values, so 'cost' was actually size. Re-map that here
            totalCost = totalSize;
            const cumSizes = orderData.sizes.cumsum().values;
            totalSize = cumSizes[endIndex].minus(cumSizes[startIndex])
                .plus(partialStartSize.div(firstPrice))
                .minus(sizeNotIncluded.div(lastPrice));
        }
        const feeCalc = OrderbookUtils.calcFees(fees, totalCost);
        let avePrice;
        if (totalSize.eq(ZERO)) {
            avePrice = firstPrice;
            lastPrice = firstPrice;
            endIndex = firstPriceIndex;
        } else {
            avePrice = feeCalc.total_cost.div(totalSize);
        }
        const slippage = avePrice.minus(firstPrice).div(firstPrice).abs();
        return {
            first_price: firstPrice,
            last_price: lastPrice,
            ave_price: avePrice,
            total_size: totalSize,
            total_cost: feeCalc.total_cost,
            slippage: slippage,
            fees: feeCalc.fees_total,
            unfilled: remaining,
            first_price_index: firstPriceIndex,
            last_price_index: endIndex
        };
    }

    /**
     * Return the cumulative order size after filling until `index` orders
     * @param index {number}
     * @param isBuy {boolean}
     */
    getCumulativeSize(index: number, isBuy: boolean): BigJS {
        const orderData = isBuy ? this.cache.asks : this.cache.bids;
        return orderData.sizes.sumTo(index);
    }

    /**
     * Return the cumulative order cost after filling until `index` orders
     * @param index {number}
     * @param isBuy {boolean}
     */
    getCumulativeCost(index: number, isBuy: boolean): BigJS {
        const orderData = isBuy ? this.cache.asks : this.cache.bids;
        return orderData.value.sumTo(index);
    }

    /**
     * Calculate the base size that can be bought with total_cost, including fees
     * @param startValue {BigJS} The total value that has already been traded
     * @param totalFunds {BigJS} The quote amount to spend, including fees
     * @param isBuy {boolean}
     * @param fees {BigJS} fractional fee rate
     */
    getSizeFromCost(startValue: BigJS, totalFunds: BigJS, isBuy: boolean, fees: BigJS = ZERO) {
        const onePlusFees = ONE.plus(fees);
        const nonFeeValue = totalFunds.div(onePlusFees);
        const endValue = startValue.plus(nonFeeValue);
        const result = this.integrateBetween(startValue, endValue, isBuy, fees, true);
        // When using quote currencies, we expect the unfilled amount to be inclusive of expected fees
        result.unfilled = result.unfilled.times(onePlusFees);
        return result;
    }

    private calculateStatsFromCache(side: string, amount: Biglike, fees: BigJS): MarketOrderStats {
        return this.integrateBetween(ZERO, amount, side === 'buy', fees);
    }

    private calculateStatsNoCache(side: string, amount: Biglike, fees: BigJS = ZERO): MarketOrderStats {
        amount = Big(amount);
        let remaining = Big(amount);
        let totalCost = ZERO;
        const orders = side === 'buy' ? this.book.asks : this.book.bids;
        if (!Array.isArray(orders[0])) {
            throw new Error('Use pre-caching to calculate stats on object-format orderbooks');
        }
        let i = 0;
        let size = null;
        const firstPrice = Big(orders[0].price);
        let lastPrice = Big(orders[0].price);
        do {
            lastPrice = orders[i].price;
            size = orders[i].totalSize;
            // We've filled the order
            if (remaining.lte(size)) {
                size = Big(remaining);
                remaining = ZERO;
            } else { /* There's (potentially) more to be filled*/
                remaining = remaining.minus(size);
            }
            totalCost = totalCost.plus(lastPrice.times(size));
            i++;
        } while (remaining.gt(0) && i < orders.length);
        const feeCalc = OrderbookUtils.calcFees(fees, totalCost);
        const fees_total = feeCalc.fees_total;
        totalCost = feeCalc.total_cost;
        const totalSize = amount.minus(remaining);
        const avePrice = totalCost.div(totalSize);
        const bestPrice = orders[0].price;
        const slippage = avePrice.minus(bestPrice).div(bestPrice).abs();
        return {
            first_price: firstPrice,
            last_price: lastPrice,
            ave_price: avePrice,
            total_size: totalSize,
            total_cost: totalCost,
            slippage: slippage,
            fees: fees_total,
            unfilled: remaining
        };
    }
}
