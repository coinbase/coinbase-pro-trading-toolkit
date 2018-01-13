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
const URL = 'https://api.coinmarketcap.com/v1/ticker/';
let CODE_MAP = null;
let REVERSE_MAP = null;
const SUPPORTED_QUOTE_CURRENCIES = ['BTC', 'USD', 'AUD', 'BRL', 'CAD', 'CHF', 'CNY', 'EUR', 'GBP', 'HKD', 'IDR', 'INR', 'JPY', 'KRW', 'MXN', 'RUB'];
const SUPPORTED_BASE_CURRENCIES = [];
const FIVE_MIN = 5 * 60 * 1000;
class CoinMarketCapProvider extends FXProvider_1.FXProvider {
    constructor(config) {
        super(config);
        this.lastUpdate = {};
        this.initializing = null;
    }
    get name() {
        return 'Coinmarketcap.com';
    }
    /**
     * Valid quote currencies are USD, BTC, or one of the valid fiat currencies given in [[SUPPORTED_QUOTE_CURRENCIES]]
     * The list of currently supported base currencies will be constructed when this is first called.
     */
    supportsPair(pair) {
        if (!SUPPORTED_QUOTE_CURRENCIES.includes(pair.to)) {
            return Promise.resolve(false);
        }
        let initCodeMap = this.initializing;
        if (!this.initializing) {
            CODE_MAP = {};
            REVERSE_MAP = {};
            initCodeMap = request.get(URL)
                .accept('application/json')
                .then((res) => {
                const result = res.body;
                result.forEach((currency) => {
                    CODE_MAP[currency.symbol] = currency.id;
                    REVERSE_MAP[currency.id] = currency.symbol;
                    SUPPORTED_BASE_CURRENCIES.push(currency.symbol);
                });
                return Promise.resolve();
            });
            this.initializing = initCodeMap;
        }
        return initCodeMap.then(() => {
            return Promise.resolve(SUPPORTED_BASE_CURRENCIES.includes(pair.from));
        });
    }
    downloadCurrentRate(pair) {
        const id = CODE_MAP[pair.from];
        if (!id) {
            const error = new FXProvider_1.EFXRateUnavailable(`Invalid CoinMarketCap currency symbol: ${pair.from}`, this.name);
            return Promise.reject(error);
        }
        const rate = {
            time: null,
            from: pair.from,
            to: pair.to,
            rate: null
        };
        // The endpoints are only updated every 5 minutes, so return cached value if we're inside that window
        const lastUpdate = this.lastUpdate[FXProvider_1.pairAsString(pair)];
        if (lastUpdate && Date.now() - lastUpdate.timestamp < FIVE_MIN) {
            rate.time = new Date(lastUpdate.timestamp);
            rate.rate = lastUpdate.value;
            return Promise.resolve(rate);
        }
        const query = ['BTC', 'USD'].includes(pair.to) ? null : { convert: pair.to };
        const req = request.get(`${URL}/${id}`).accept('application/json');
        if (query) {
            req.query(query);
        }
        return req.then((res) => {
            const result = res.body[0];
            rate.time = new Date((+result.last_updated) * 1000);
            if (pair.to === 'BTC') {
                rate.rate = new Big(result.price_btc);
            }
            else {
                const key = `price_${pair.to.toLowerCase()}`;
                rate.rate = new Big(result[key]);
            }
            if (!rate.rate.isFinite()) {
                const error = new FXProvider_1.EFXRateUnavailable('We got a response, but the FX rates weren\'t present', this.name);
                return Promise.reject(error);
            }
            // Update cache
            this.lastUpdate[FXProvider_1.pairAsString(pair)] = {
                timestamp: +(result.last_updated) * 1000,
                value: rate.rate
            };
            return Promise.resolve(rate);
        });
    }
}
exports.default = CoinMarketCapProvider;
//# sourceMappingURL=CoinMarketCapProvider.js.map