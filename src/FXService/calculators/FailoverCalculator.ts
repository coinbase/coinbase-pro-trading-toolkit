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
import { CurrencyPair, FXObject } from '../FXProvider';
import { ConsoleLoggerFactory, Logger } from '../../utils/Logger';
import { tryUntil } from '../../utils/promises';

export interface FailoverCalculatorConfig {
    calculators: FXRateCalculator[];
    logger?: Logger;
}

export interface LastRequestInfo {
    calculator: FXRateCalculator;
}

/**
 * A simple FX rate calculator that uses a single FXProvider and return the current exchange rate from it directly.
 * If the pair is unavailable, or some other error occurs, the calculator returns null for that pair
 */
export default class FailoverCalculator extends FXRateCalculator {
    readonly logger: Logger;
    readonly calculators: FXRateCalculator[];
    private lastCalculatorUsed: FXRateCalculator = null;

    constructor(config: FailoverCalculatorConfig) {
        super();
        this.calculators = config.calculators;
        this.logger = config.logger || ConsoleLoggerFactory();
    }

    getLastRequestInfo(): LastRequestInfo {
        return { calculator: this.lastCalculatorUsed };
    }

    calculateRatesFor(pairs: CurrencyPair[]): Promise<FXObject[]> {
        const promises: Promise<FXObject>[] = pairs.map((pair: CurrencyPair) => {
            return this.requestRateFor(pair);
        });
        // Wait for all promises to resolve before sending results back
        return Promise.all(promises);
    }

    private requestRateFor(pair: CurrencyPair): Promise<FXObject> {
        return tryUntil<FXRateCalculator, FXObject>(this.calculators, (calculator: FXRateCalculator) => {
            this.lastCalculatorUsed = calculator;
            return calculator.calculateRatesFor([pair])
                .then((result: FXObject[]) => {
                    if (result[0] === null || result[0].rate === null) {
                        return false;
                    }
                    return result[0];
                })
                .catch(() => {
                    return false;
                });
        }).then((result: FXObject | false) => {
            if (result === false) {
                return null;
            }
            return result;
        });
    }
}
