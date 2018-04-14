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
import { CurrencyPair, EFXRateUnavailable, FXObject, FXProvider, FXProviderConfig, pairAsString } from '../FXProvider';
import { tryUntil } from '../../utils/promises';

export interface FailoverProviderConfig extends FXProviderConfig {
    // An array of providers to use in priority order
    providers: FXProvider[];
}

/**
 * Provider that proxies an array of Providers. It returns the result from the first in the list, unless the request fails, in which case it tries the second, and
 * son on.
 */
export class FailoverProvider extends FXProvider {
    private readonly providers: FXProvider[];

    constructor(config: FailoverProviderConfig) {
        super(config);
        this.providers = config.providers;
    }

    get name() {
        return 'Failover Provider';
    }

    supportsPair(pair: CurrencyPair): Promise<boolean> {
        return tryUntil<FXProvider, boolean>(this.providers, (provider: FXProvider) => {
            return provider.supportsPair(pair);
        });
    }

    protected downloadCurrentRate(pair: CurrencyPair): Promise<FXObject> {
        return tryUntil<FXProvider, FXObject>(this.providers, (provider: FXProvider) => {
            return provider.fetchCurrentRate(pair).then((result: FXObject) => {
                return result && result.rate && result.rate.isFinite() ? result : false;
            }).catch(() => {
                return false;
            });
        }).then((result: boolean | FXObject) => {
            if (result === false) {
                return Promise.reject(new EFXRateUnavailable(`None of the providers could offer a rate for ${pairAsString(pair)}`, this.name));
            }
            return Promise.resolve(result as FXObject);
        });
    }
}
