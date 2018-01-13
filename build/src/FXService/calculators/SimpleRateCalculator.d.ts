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
import { FXRateCalculator } from '../FXRateCalculator';
import { CurrencyPair, FXObject, FXProvider } from '../FXProvider';
import { Logger } from '../../utils/Logger';
/**
 * A simple FX rate calculator that uses a single FXProvider and return the current exchange rate from it directly.
 * If the pair is unavailable, or some other error occurs, the calculator returns null for that pair
 */
export default class SimpleRateCalculator extends FXRateCalculator {
    logger: Logger;
    provider: FXProvider;
    constructor(provider: FXProvider, logger?: Logger);
    calculateRatesFor(pairs: CurrencyPair[]): Promise<FXObject[]>;
    getLastRequestInfo(): any;
}
