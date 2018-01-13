"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
const FXRateCalculator_1 = require("../../src/FXService/FXRateCalculator");
const FXService_1 = require("../../src/FXService/FXService");
const types_1 = require("../../src/lib/types");
/**
 * Mocks an FX Service by providing a pre-assigned exchange rate for any currency pair
 */
class MockRateCalculator extends FXRateCalculator_1.FXRateCalculator {
    constructor() {
        super(...arguments);
        this.rate = types_1.ONE;
        this.change = types_1.ZERO;
        this.time = new Date('2017-06-18');
    }
    calculateRatesFor(pairs) {
        const result = [];
        pairs.forEach((pair) => {
            result.push(Object.assign({ time: this.time, rate: this.rate, change: this.change }, pair));
        });
        return Promise.resolve(result);
    }
}
const config = {
    logger: null,
    calculator: new MockRateCalculator(),
    refreshInterval: null,
    activePairs: null
};
class MockFXService extends FXService_1.FXService {
    setRate(rate) {
        this.calculator.rate = types_1.Big(rate);
    }
    setTime(time) {
        this.calculator.time = time;
    }
    setChange(change) {
        this.calculator.change = types_1.Big(change);
    }
}
exports.MockFXService = MockFXService;
exports.mockFXService = new MockFXService(config);
//# sourceMappingURL=MockFXService.js.map