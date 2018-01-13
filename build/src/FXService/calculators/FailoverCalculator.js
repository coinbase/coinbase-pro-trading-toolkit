"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const FXRateCalculator_1 = require("../FXRateCalculator");
const Logger_1 = require("../../utils/Logger");
const promises_1 = require("../../utils/promises");
/**
 * A simple FX rate calculator that uses a single FXProvider and return the current exchange rate from it directly.
 * If the pair is unavailable, or some other error occurs, the calculator returns null for that pair
 */
class FailoverCalculator extends FXRateCalculator_1.FXRateCalculator {
    constructor(config) {
        super();
        this.lastCalculatorUsed = null;
        this.calculators = config.calculators;
        this.logger = config.logger || Logger_1.ConsoleLoggerFactory();
    }
    getLastRequestInfo() {
        return { calculator: this.lastCalculatorUsed };
    }
    calculateRatesFor(pairs) {
        const promises = pairs.map((pair) => {
            return this.requestRateFor(pair);
        });
        // Wait for all promises to resolve before sending results back
        return Promise.all(promises);
    }
    requestRateFor(pair) {
        return promises_1.tryUntil(this.calculators, (calculator) => {
            this.lastCalculatorUsed = calculator;
            return calculator.calculateRatesFor([pair])
                .then((result) => {
                if (result[0] === null || result[0].rate === null) {
                    return false;
                }
                return result[0];
            })
                .catch(() => {
                return false;
            });
        }).then((result) => {
            if (result === false) {
                return null;
            }
            return result;
        });
    }
}
exports.default = FailoverCalculator;
//# sourceMappingURL=FailoverCalculator.js.map