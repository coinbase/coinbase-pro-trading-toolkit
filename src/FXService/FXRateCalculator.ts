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

import { CurrencyPair, FXObject } from './FXProvider';

export abstract class FXRateCalculator {
    /**
     * Makes a request for the calculator to calculate and return the most recent exchange rate for the given currency pairs.
     * If the Calculator is unable to complete a request for any of the pairs, it should return `null` for that pair and the other rates
     * will still be accepted. However, it can also reject the entire Promise if it is unable to calculate rates for any of the given pairs
     */
    abstract calculateRatesFor(pairs: CurrencyPair[]): Promise<FXObject[]>;

    getLastRequestInfo(): any {
        return {};
    }
}
