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
const request = require("superagent");
const FXProvider_1 = require("../FXProvider");
const Big = require("bignumber.js");
const API_URL = 'https://openexchangerates.org/api';
let supportedCurrencies = null;
class OpenExchangeProvider extends FXProvider_1.FXProvider {
    constructor(config) {
        super(config);
        this.pending = null;
        this.cacheTimer = null;
        this.base = null;
        this.apiKey = config.apiKey || process.env.OPENEXCHANGE_API_KEY;
        this.cacheDuration = config.cacheDuration || 5 * 50 * 1000;
    }
    get name() {
        return 'Open Exchange Rates';
    }
    /**
     * Clears the request cache, forcing the next download request to hit the server
     */
    clearCache() {
        if (this.cacheTimer) {
            clearTimeout(this.cacheTimer);
        }
        this.pending = null;
    }
    supportsPair(pair) {
        if (supportedCurrencies) {
            return Promise.resolve(isSupported(pair));
        }
        return request.get(API_URL + '/currencies.json')
            .accept('application/json')
            .then((res) => {
            const curs = res.body;
            supportedCurrencies = Object.keys(curs);
            return Promise.resolve(isSupported(pair));
        });
    }
    downloadCurrentRate(pair) {
        const query = {
            base: pair.from,
            app_id: this.apiKey
        };
        if (this.needsRequest(pair.from)) {
            this.pending = request.get(API_URL + '/latest.json')
                .accept('application/json')
                .query(query);
            this.base = pair.from;
        }
        return this.pending.then((res) => {
            const result = res.body;
            const rate = result && result.rates && result.rates[pair.to];
            if (!rate || !isFinite(rate)) {
                const error = new FXProvider_1.EFXRateUnavailable('We got a response, but the FX rates weren\'t present', this.name);
                return Promise.reject(error);
            }
            // Clear the pending request after a timeout -- reducing request load on OER
            if (this.cacheTimer === null) {
                this.cacheTimer = setTimeout(() => {
                    this.pending = null;
                    this.cacheTimer = null;
                }, this.cacheDuration);
            }
            return Promise.resolve({
                from: pair.from,
                to: pair.to,
                rate: new Big(rate),
                time: new Date()
            });
        });
    }
    needsRequest(from) {
        return (this.pending === null) ||
            (this.base === null) ||
            (this.base !== from);
    }
}
exports.default = OpenExchangeProvider;
function isSupported(pair) {
    return supportedCurrencies &&
        supportedCurrencies.indexOf(pair.from) >= 0 &&
        supportedCurrencies.indexOf(pair.to) >= 0;
}
//# sourceMappingURL=OpenExchangeProvider.js.map