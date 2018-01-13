"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**********************************************************************************************************************
 * @license                                                                                                           *
 * Copyright 2017 Coinbase, Inc.                                                                                      *
 *                                                                                                                    *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance     *
 * with the License. You may obtain a copy of the License at                                                          *
 *                                                                                                                    *
 * http://www.apache.org/licenses/LICENSE-2.0                                                                         *
 *                                                                                                                    *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on*
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the                 *
 * License for the specific language governing permissions and limitations under the License.                         *
 **********************************************************************************************************************/
const FXRateCalculator_1 = require("../FXRateCalculator");
const FXProvider_1 = require("../FXProvider");
const promises_1 = require("../../utils/promises");
const ss = require("simple-statistics");
const types_1 = require("../../lib/types");
exports.NO_CURRENT_PRICE_ERROR = 1;
exports.PRICE_DEVIATION_ERROR = 2;
exports.PRICE_CHANGE_DEVIATION_ERROR = 3;
/**
 * Calculates exchange rates in a robust manner. The calculator queries exchange rates from multiple sources
 * and then returns the average price for all the reliable sources.
 *
 * A source is deemed reliable if it is less than a given distance from the _median_ exchange rate
 * AND
 * the change is price is less than a given distance from the _median_ change in price.
 *
 * This should protect from erroneous rates being delivered in these cases:
 *  - one or more source is down, or providing faulty data for an indefinite period of time
 *  - A flash crash occurs on a source, providing poor data for a short amount of time.
 *
 *  To be reliable, one should supply at least 5 rate sources for this method.
 */
class RobustCalculator extends FXRateCalculator_1.FXRateCalculator {
    constructor(config) {
        super();
        this.sources = config.sources;
        this.deltaThreshold = config.deltaThreshold || 0.01;
        this.priceThreshold = config.priceThreshold || 0.05;
        this.minNumberOfReliableSources = config.minNumberOfReliableSources || 1;
        this.logger = config.logger;
        this.clearReport();
        this.report.sources = this.sources.map((source) => source.name);
    }
    getLastRequestInfo() {
        return this.report;
    }
    log(level, message, meta) {
        if (!this.logger) {
            return;
        }
        this.logger.log(level, message, meta);
    }
    calculateRatesFor(pairs) {
        return promises_1.eachParallelAndFinish(pairs, (pair) => {
            return this.determineRateForPair(pair);
        });
    }
    determineRateForPair(pair) {
        return promises_1.eachParallelAndFinish(this.sources, (source) => {
            return source.fetchCurrentRate(pair);
        }).then((rates) => {
            const rate = this.calculateRobustRate(pair, rates);
            const result = {
                time: new Date(),
                from: pair.from,
                to: pair.to,
                rate: rate && types_1.Big(rate),
                change: null
            };
            return Promise.resolve(result);
        });
    }
    calculateRobustRate(pair, rates) {
        const delta = [];
        const prices = [];
        const _pair = FXProvider_1.pairAsString(pair);
        const update = { deltas: [], prices: [], rejectReason: [], errors: [], time: new Date(), valid: [], lastPrice: null };
        update.lastPrice = this.report.data[_pair] ? this.report.data[_pair].prices : [];
        rates.forEach((rate, i) => {
            if (rate instanceof Error || !rate || !rate.rate || !rate.rate.isFinite()) {
                update.errors[i] = rate instanceof Error ? rate : null;
                update.rejectReason[i] = exports.NO_CURRENT_PRICE_ERROR;
                this.report.data[_pair] = update;
                return;
            }
            update.valid[i] = true;
            update.errors[i] = null;
            update.rejectReason[i] = 0;
            update.prices[i] = rate.rate.toNumber();
            prices.push(update.prices[i]);
            const lastPrice = update.lastPrice[i];
            update.deltas[i] = lastPrice ? update.prices[i] - lastPrice : 0;
            delta.push(update.deltas[i]);
        });
        this.report.data[_pair] = update;
        const numValid = prices.length;
        if (numValid < this.minNumberOfReliableSources) {
            return null;
        }
        const medianPrice = ss.median(prices);
        const medianDelta = ss.median(delta);
        let numReliablePrices = 0;
        let sum = 0;
        const threshold = this.priceThreshold * medianPrice;
        const deltaThreshold = this.deltaThreshold * medianPrice;
        for (let i = 0; i < numValid; i++) {
            const priceDeviation = Math.abs(prices[i] - medianPrice);
            const gradDeviation = Math.abs(delta[i] - medianDelta);
            if (priceDeviation >= threshold) {
                update.rejectReason[i] = exports.PRICE_DEVIATION_ERROR;
            }
            if (gradDeviation >= deltaThreshold) {
                update.rejectReason[i] = exports.PRICE_CHANGE_DEVIATION_ERROR;
            }
            if (priceDeviation < threshold && gradDeviation < deltaThreshold) {
                numReliablePrices++;
                sum += prices[i];
            }
        }
        if (numReliablePrices < this.minNumberOfReliableSources) {
            return null;
        }
        return sum / numReliablePrices;
    }
    clearReport() {
        const sources = (this.report && this.report.sources) || [];
        this.report = { sources: sources, data: {} };
    }
}
exports.RobustCalculator = RobustCalculator;
//# sourceMappingURL=RobustCalculator.js.map