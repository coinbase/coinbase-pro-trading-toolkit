"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
const FXProvider_1 = require("../FXProvider");
const promises_1 = require("../../utils/promises");
/**
 * Provider that proxies an array of Providers. It returns the result from the first in the list, unless the request fails, in which case it tries the second, and
 * son on.
 */
class FailoverProvider extends FXProvider_1.FXProvider {
    constructor(config) {
        super(config);
        this.providers = config.providers;
    }
    get name() {
        return 'Failover Provider';
    }
    supportsPair(pair) {
        return promises_1.tryUntil(this.providers, (provider) => {
            return provider.supportsPair(pair);
        });
    }
    downloadCurrentRate(pair) {
        return promises_1.tryUntil(this.providers, (provider) => {
            return provider.fetchCurrentRate(pair).then((result) => {
                return result && result.rate && result.rate.isFinite() ? result : false;
            }).catch(() => {
                return false;
            });
        }).then((result) => {
            if (result === false) {
                return Promise.reject(new FXProvider_1.EFXRateUnavailable(`None of the providers could offer a rate for ${FXProvider_1.pairAsString(pair)}`, this.name));
            }
            return Promise.resolve(result);
        });
    }
}
exports.FailoverProvider = FailoverProvider;
//# sourceMappingURL=FailoverProvider.js.map