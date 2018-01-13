"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../lib/types");
function pairAsString(pair) {
    return pair.from + '-' + pair.to;
}
exports.pairAsString = pairAsString;
function makeFXObject(pair, value) {
    return {
        time: new Date(),
        from: pair.from,
        to: pair.to,
        rate: types_1.Big(value),
        change: types_1.ZERO
    };
}
class EFXRateUnavailable extends Error {
    constructor(msg, provider) {
        super(msg);
        this.provider = provider;
    }
}
exports.EFXRateUnavailable = EFXRateUnavailable;
class FXProvider {
    constructor(config) {
        this._pending = {};
        this.logger = config.logger;
    }
    log(level, message, meta) {
        if (!this.logger) {
            return;
        }
        this.logger.log(level, message, meta);
    }
    fetchCurrentRate(pair) {
        // Special case immediately return 1.0
        if (pair.from === pair.to) {
            return Promise.resolve(makeFXObject(pair, 1));
        }
        return this.supportsPair(pair).then((ok) => {
            if (!ok) {
                // See if the inverse is supported
                const inversePair = {
                    from: pair.to,
                    to: pair.from
                };
                // then<FXObject> is required to workaround bug in TS2.1 https://github.com/Microsoft/TypeScript/issues/10977
                return this.supportsPair(inversePair).then((inverseOk) => {
                    if (inverseOk) {
                        return this.getPromiseForRate(inversePair).then((inverse) => {
                            const rate = {
                                from: pair.from,
                                to: pair.to,
                                rate: types_1.ONE.div(inverse.rate),
                                time: inverse.time
                            };
                            return Promise.resolve(rate);
                        });
                    }
                    else {
                        return Promise.reject(new EFXRateUnavailable(`Currency pair ${pair.from}-${pair.to} or its inverse is not supported`, this.name));
                    }
                });
            }
            return this.getPromiseForRate(pair);
        });
    }
    /**
     * Returns a promise for the current rate. IsSupported must be true, and is not checked here. The method returns a
     * promise for the current network request, or generates a new one.
     * @param pair
     * @returns {Promise<FXObject>}
     */
    getPromiseForRate(pair) {
        // If there's already a current promise to fetch this pair, wait for that request to resolve
        const index = pair.from + '-' + pair.to;
        let pending = this._pending[index];
        if (pending) {
            return pending;
        }
        this.log('debug', `Downloading current ${pair.from}-${pair.to} exchange rate from ${this.name}`);
        pending = this.downloadCurrentRate(pair);
        this._pending[index] = pending;
        return pending.then((result) => {
            this._pending[index] = undefined;
            return result;
        }).catch((err) => {
            this._pending[index] = undefined;
            return Promise.reject(err);
        });
    }
}
exports.FXProvider = FXProvider;
//# sourceMappingURL=FXProvider.js.map