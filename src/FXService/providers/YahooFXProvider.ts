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

import request = require('superagent');
import { CurrencyPair, EFXRateUnavailable, FXObject, FXProvider } from '../FXProvider';
import { Big } from '../../lib/types';
import Response = request.Response;

const YAHOO_API_URI = 'https://query.yahooapis.com/v1/public/yql';

let SUPPORTED_PAIRS: string[] = [];

export default class YahooFinanceFXProvider extends FXProvider {

    get name(): string {
        return 'Yahoo Finance';
    }

    supportsPair(pair: CurrencyPair): Promise<boolean> {
        if (SUPPORTED_PAIRS.length > 0) {
            return Promise.resolve(this.isSupportedPair(pair));
        }
        return request('http://finance.yahoo.com/webservice/v1/symbols/allcurrencies/quote')
            .accept('application/json')
            .query({ format: 'json' })
            .then<boolean>((response: Response) => {
                if (response.status !== 200 || !response.body || !response.body.list || !response.body.list.resources) {
                    return Promise.reject(new Error('Could not get list of supported currencies from Yahoo Finance'));
                }
                const currencyList: any[] = response.body.list.resources;
                SUPPORTED_PAIRS = [];
                currencyList.forEach((obj: any) => {
                    const tag = obj.resource && obj.resource.fields && obj.resource.fields.symbol;
                    if (tag.endsWith('=X')) {
                        SUPPORTED_PAIRS.push(tag.slice(0, tag.length - 2));
                    }
                });
                return this.isSupportedPair(pair);
            });
    }

    protected downloadCurrentRate(pair: CurrencyPair): Promise<FXObject> {
        const query = {
            q: `select Rate from yahoo.finance.xchange where pair in ("${pair.from}${pair.to}")`,
            format: 'json',
            env: 'store://datatables.org/alltableswithkeys'
        };
        return request.get(YAHOO_API_URI)
            .accept('application/json')
            .query(query)
            // then<FXObject> is required to workaround bug in TS2.1 https://github.com/Microsoft/TypeScript/issues/10977
            .then<FXObject>((result: Response) => {
                let created: string;
                let rate: string;
                const error = new EFXRateUnavailable('We got a response, but the FX rates weren\'t present', this.name);
                try {
                    created = result.body.query.created;
                    rate = result.body.query.results.rate.Rate;
                    if (!created || !rate) {
                        return Promise.reject(error);
                    }
                } catch (err) {
                    return Promise.reject(error);
                }
                const r: FXObject = {
                    time: new Date(created),
                    from: pair.from,
                    to: pair.to,
                    rate: Big(rate)};
                return r;
            }, (result: Response) => {
                let details = {};
                try {
                    details = JSON.parse(result.text);
                } catch (e) { /* no-op */ }
                const err: any = new Error(`Yahoo Finance returned an error: ${result.status}`);
                err.details = details;
                return Promise.reject(err);
            });
    }

    private isSupportedPair(pair: CurrencyPair): boolean {
        return SUPPORTED_PAIRS.indexOf(pair.from) >= 0 && SUPPORTED_PAIRS.indexOf(pair.to) >= 0;
    }
}
