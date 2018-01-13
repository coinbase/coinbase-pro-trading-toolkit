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
const types_1 = require("../../lib/types");
const YAHOO_API_URI = 'https://query.yahooapis.com/v1/public/yql';
let SUPPORTED_PAIRS = [];
class YahooFinanceFXProvider extends FXProvider_1.FXProvider {
    get name() {
        return 'Yahoo Finance';
    }
    supportsPair(pair) {
        if (SUPPORTED_PAIRS.length > 0) {
            return Promise.resolve(this.isSupportedPair(pair));
        }
        return request('http://finance.yahoo.com/webservice/v1/symbols/allcurrencies/quote')
            .accept('application/json')
            .query({ format: 'json' })
            .then((response) => {
            if (response.status !== 200 || !response.body || !response.body.list || !response.body.list.resources) {
                return Promise.reject(new Error('Could not get list of supported currencies from Yahoo Finance'));
            }
            const currencyList = response.body.list.resources;
            SUPPORTED_PAIRS = [];
            currencyList.forEach((obj) => {
                const tag = obj.resource && obj.resource.fields && obj.resource.fields.symbol;
                if (tag.endsWith('=X')) {
                    SUPPORTED_PAIRS.push(tag.slice(0, tag.length - 2));
                }
            });
            return Promise.resolve(this.isSupportedPair(pair));
        }, (err) => Promise.reject(err));
    }
    downloadCurrentRate(pair) {
        const query = {
            q: `select Rate from yahoo.finance.xchange where pair in ("${pair.from}${pair.to}")`,
            format: 'json',
            env: 'store://datatables.org/alltableswithkeys'
        };
        return request.get(YAHOO_API_URI)
            .accept('application/json')
            .query(query)
            .then((result) => {
            let created;
            let rate;
            const error = new FXProvider_1.EFXRateUnavailable('We got a response, but the FX rates weren\'t present', this.name);
            try {
                created = result.body.query.created;
                rate = result.body.query.results.rate.Rate;
                if (!created || !rate) {
                    return Promise.reject(error);
                }
            }
            catch (err) {
                return Promise.reject(error);
            }
            return Promise.resolve({
                time: new Date(created),
                from: pair.from,
                to: pair.to,
                rate: types_1.Big(rate)
            });
        }, (result) => {
            let details = {};
            try {
                details = JSON.parse(result.text);
            }
            catch (e) { }
            const err = new Error(`Yahoo Finance returned an error: ${result.status}`);
            err.details = details;
            return Promise.reject(err);
        });
    }
    isSupportedPair(pair) {
        return SUPPORTED_PAIRS.indexOf(pair.from) >= 0 && SUPPORTED_PAIRS.indexOf(pair.to) >= 0;
    }
}
exports.default = YahooFinanceFXProvider;
//# sourceMappingURL=YahooFXProvider.js.map