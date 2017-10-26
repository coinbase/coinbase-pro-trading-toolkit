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
import { FXProvider, FXObject, EFXRateUnavailable, FXProviderConfig, CurrencyPair } from '../FXProvider';
import Response = request.Response;
import * as Big from 'bignumber.js';

const API_URL = 'https://openexchangerates.org/api';

let supportedCurrencies: string[] = null;

export interface OpenExchangeConfig extends FXProviderConfig {
    apiKey: string;
}

export default class OpenExchangeProvider extends FXProvider {
    private apiKey: string;

    constructor(config: OpenExchangeConfig) {
        super(config);
        this.apiKey = config.apiKey || process.env.OPENEXCHANGE_API_KEY;
    }

    get name() {
        return 'Open Exchange Rates';
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
                return Promise.resolve(isSupported(pair));
            });
    }

    protected downloadCurrentRate(pair: CurrencyPair): Promise<FXObject> {
        const query = {
            base: pair.from,
            symbols: pair.to,
            app_id: this.apiKey
        };
        return request.get(API_URL + '/latest.json')
            .accept('application/json')
            .query(query)
            .then((res: Response) => {
                const result = JSON.parse(res.body);
                const rate = result && result.rates && result.rates[pair.to];
                if (!rate || !isFinite(rate)) {
                    const error = new EFXRateUnavailable('We got a response, but the FX rates weren\'t present', this.name);
                    return Promise.reject(error);
                }
                return Promise.resolve({
                    from: pair.from,
                    to: pair.to,
                    rate: new Big(rate),
                    time: new Date()
                });
            });
    }
}

function isSupported(pair: CurrencyPair): boolean {
    return supportedCurrencies &&
        supportedCurrencies.indexOf(pair.from) >= 0 &&
        supportedCurrencies.indexOf(pair.to) >= 0;
}
