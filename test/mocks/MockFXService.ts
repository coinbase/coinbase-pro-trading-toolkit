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
import { FXRateCalculator } from '../../src/FXService/FXRateCalculator';
import { CurrencyPair, FXObject } from '../../src/FXService/FXProvider';
import { FXService, FXServiceConfig } from '../../src/FXService/FXService';
import { ONE, ZERO, Big, Biglike, BigJS } from '../../src/lib/types';

/**
 * Mocks an FX Service by providing a pre-assigned exchange rate for any currency pair
 */
class MockRateCalculator extends FXRateCalculator {
    public rate: BigJS = ONE;
    public change: BigJS = ZERO;
    public time: Date = new Date('2017-06-18');

    calculateRatesFor(pairs: CurrencyPair[]): Promise<FXObject[]> {
        const result: FXObject[] = [];

        pairs.forEach((pair) => {
            result.push(Object.assign({ time: this.time, rate: this.rate, change: this.change }, pair));
        });
        return Promise.resolve(result);
    }
}

const config: FXServiceConfig = {
    logger: null,
    calculator: new MockRateCalculator(),
    refreshInterval: null,
    activePairs: null
};

export class MockFXService extends FXService {
    setRate(rate: Biglike) {
        (this.calculator as MockRateCalculator).rate = Big(rate);
    }
    setTime(time: Date) {
        (this.calculator as MockRateCalculator).time = time;
    }
    setChange(change: Biglike) {
        (this.calculator as MockRateCalculator).change = Big(change);
    }
}

export const mockFXService: MockFXService = new MockFXService(config);
