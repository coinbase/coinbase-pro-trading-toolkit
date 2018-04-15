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
import Response = request.Response;
import Timer = NodeJS.Timer;
import { CurrencyPair, EFXRateUnavailable, FXObject, FXProvider, FXProviderConfig } from '../FXProvider';
import { Big } from '../../lib/types';

const API_URL = 'https://openexchangerates.org/api';

let supportedCurrencies: string[] = null;

export interface OpenExchangeConfig extends FXProviderConfig {
    apiKey: string;
    cacheDuration?: number;
}

export default class OpenExchangeProvider extends FXProvider {
    private readonly apiKey: string;
    private pending: Promise<Response> = null;
    private readonly cacheDuration: number;
    private cacheTimer: Timer = null;
    private base: string = null;

    constructor(config: OpenExchangeConfig) {
        super(config);
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

    supportsPair(pair: CurrencyPair): Promise<boolean> {
        if (supportedCurrencies) {
            return Promise.resolve(isSupported(pair));
        }
        return request.get(API_URL + '/currencies.json')
            .accept('application/json')
            .then((res: Response) => {
                const curs: { [cur: string]: string } = res.body;
                supportedCurrencies = Object.keys(curs);
                return isSupported(pair);
            });
    }

    protected downloadCurrentRate(pair: CurrencyPair): Promise<FXObject> {
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
        return this.pending.then((res: Response) => {
            const result = res.body;
            const rate = result && result.rates && result.rates[pair.to];
            if (!rate || !isFinite(rate)) {
                const error = new EFXRateUnavailable('We got a response, but the FX rates weren\'t present', this.name);
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
                rate: Big(rate),
                time: new Date()
            });
        });
    }

    private needsRequest(from: string): boolean {
        return (this.pending === null) ||
            (this.base === null) ||
            (this.base !== from);
    }
}

function isSupported(pair: CurrencyPair): boolean {
    return supportedCurrencies &&
        supportedCurrencies.indexOf(pair.from) >= 0 &&
        supportedCurrencies.indexOf(pair.to) >= 0;
}
