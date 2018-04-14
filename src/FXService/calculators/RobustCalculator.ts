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
import { FXRateCalculator } from '../FXRateCalculator';
import { CurrencyPair, FXObject, FXProvider, pairAsString } from '../FXProvider';
import { Logger } from '../../utils/Logger';
import { eachParallelAndFinish } from '../../utils/promises';
import * as ss from 'simple-statistics';
import { Big } from '../../lib/types';

export interface RobustCalculatorConfig {
    // An array of exchange rate services to use for source data
    sources: FXProvider[];
    // A value as a fraction (0 to 1), ∆ for which abs(P_i/P_M - 1) < ∆, where P_i is the current rate and P_M is the median rate,
    // i.e. fraction of price deviation from the mean allowed
    priceThreshold: number;
    // A value as a fraction (0 to 1), ∆ for which abs(r_i - r_M)/P_M < ∆, where r_i is the r_i is the price change since the last
    // tick and P_M is the median change in rate
    deltaThreshold: number;
    // The minimum number of reliable sources in a given request to consider the overall request valid
    minNumberOfReliableSources: number;
    logger?: Logger;
}

export const NO_CURRENT_PRICE_ERROR = 1;
export const PRICE_DEVIATION_ERROR = 2;
export const PRICE_CHANGE_DEVIATION_ERROR = 3;

export interface RobustCalculatorReport {
    data: { [pair: string]: QueryStatus };
    sources: string[];
}

export interface QueryStatus {
    time: Date;
    prices: number[];
    deltas: number[];
    valid: boolean[];
    errors: Error[];
    rejectReason: number[];
    lastPrice: number[];
}

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
export class RobustCalculator extends FXRateCalculator {
    readonly deltaThreshold: number;
    readonly priceThreshold: number;
    readonly logger: Logger;
    readonly sources: FXProvider[];
    readonly minNumberOfReliableSources: number;
    private report: RobustCalculatorReport;

    constructor(config: RobustCalculatorConfig) {
        super();
        this.sources = config.sources;
        this.deltaThreshold = config.deltaThreshold || 0.01;
        this.priceThreshold = config.priceThreshold || 0.05;
        this.minNumberOfReliableSources = config.minNumberOfReliableSources || 1;
        this.logger = config.logger;
        this.clearReport();
        this.report.sources = this.sources.map((source: FXProvider) => source.name);
    }

    getLastRequestInfo(): RobustCalculatorReport {
        return this.report;
    }

    log(level: string, message: string, meta?: any) {
        if (!this.logger) {
            return;
        }
        this.logger.log(level, message, meta);
    }

    calculateRatesFor(pairs: CurrencyPair[]): Promise<FXObject[]> {
        return eachParallelAndFinish<CurrencyPair, FXObject>(pairs, (pair: CurrencyPair) => {
            return this.determineRateForPair(pair);
        }) as Promise<FXObject[]>;
    }

    private determineRateForPair(pair: CurrencyPair): Promise<FXObject> {
        return eachParallelAndFinish(this.sources, (source: FXProvider) => {
            return source.fetchCurrentRate(pair);
        }).then((rates: (FXObject | Error)[]) => {
            const rate: number = this.calculateRobustRate(pair, rates);
            const result: FXObject = {
                time: new Date(),
                from: pair.from,
                to: pair.to,
                rate: rate && Big(rate),
                change: null
            };
            return result;
        });
    }

    private calculateRobustRate(pair: CurrencyPair, rates: (FXObject | Error)[]): number {
        const delta: number[] = [];
        const prices: number[] = [];
        const _pair: string = pairAsString(pair);
        const update: QueryStatus = { deltas: [], prices: [], rejectReason: [], errors: [], time: new Date(), valid: [], lastPrice: null };
        update.lastPrice = this.report.data[_pair] ? this.report.data[_pair].prices : [];
        rates.forEach((rate: FXObject | Error, i: number) => {
            if (rate instanceof Error || !rate || !rate.rate || !rate.rate.isFinite()) {
                update.errors[i] = rate instanceof Error ? rate : null;
                update.rejectReason[i] = NO_CURRENT_PRICE_ERROR;
                this.report.data[_pair] = update;
                return;
            }
            update.valid[i] = true;
            update.errors[i] = null;
            update.rejectReason[i] = 0;
            update.prices[i] = rate.rate.toNumber();
            prices.push(update.prices[i]);
            const lastPrice: number = update.lastPrice[i];
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
                update.rejectReason[i] = PRICE_DEVIATION_ERROR;
            }
            if (gradDeviation >= deltaThreshold) {
                update.rejectReason[i] = PRICE_CHANGE_DEVIATION_ERROR;
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

    private clearReport() {
        const sources = (this.report && this.report.sources) || [];
        this.report = { sources: sources, data: {} };
    }
}
