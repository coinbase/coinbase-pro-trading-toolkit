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
import { CurrencyPair, FXObject, FXProvider, FXProviderConfig } from '../FXProvider';
export interface FailoverProviderConfig extends FXProviderConfig {
    providers: FXProvider[];
}
/**
 * Provider that proxies an array of Providers. It returns the result from the first in the list, unless the request fails, in which case it tries the second, and
 * son on.
 */
export declare class FailoverProvider extends FXProvider {
    private providers;
    constructor(config: FailoverProviderConfig);
    readonly name: string;
    supportsPair(pair: CurrencyPair): Promise<boolean>;
    protected downloadCurrentRate(pair: CurrencyPair): Promise<FXObject>;
}
