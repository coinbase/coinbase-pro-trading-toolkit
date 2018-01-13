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
import { CurrencyPair, FXObject, FXProvider } from '../FXProvider';
import { Logger } from '../../utils/Logger';
export interface RobustCalculatorConfig {
    sources: FXProvider[];
    priceThreshold: number;
    deltaThreshold: number;
    minNumberOfReliableSources: number;
    logger?: Logger;
}
export declare const NO_CURRENT_PRICE_ERROR = 1;
export declare const PRICE_DEVIATION_ERROR = 2;
export declare const PRICE_CHANGE_DEVIATION_ERROR = 3;
export interface RobustCalculatorReport {
    data: {
        [pair: string]: QueryStatus;
    };
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
export declare class RobustCalculator extends FXRateCalculator {
    deltaThreshold: number;
    priceThreshold: number;
    logger: Logger;
    sources: FXProvider[];
    minNumberOfReliableSources: number;
    private report;
    constructor(config: RobustCalculatorConfig);
    getLastRequestInfo(): RobustCalculatorReport;
    log(level: string, message: string, meta?: any): void;
    calculateRatesFor(pairs: CurrencyPair[]): Promise<FXObject[]>;
    private determineRateForPair(pair);
    private calculateRobustRate(pair, rates);
    private clearReport();
}
