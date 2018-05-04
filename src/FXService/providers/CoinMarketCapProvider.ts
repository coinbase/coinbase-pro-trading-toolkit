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
import { CurrencyPair, EFXRateUnavailable, FXObject, FXProvider, FXProviderConfig, pairAsString } from '../FXProvider';
import Response = request.Response;
import { Big, BigJS } from '../../lib/types';

const URL = 'https://api.coinmarketcap.com/v1/ticker/';
let CODE_MAP: { [index: string]: string } = null;
let REVERSE_MAP: { [index: string]: string } = null;
const SUPPORTED_QUOTE_CURRENCIES = ['BTC', 'USD', 'AUD', 'BRL', 'CAD', 'CHF', 'CNY', 'EUR', 'GBP', 'HKD', 'IDR', 'INR', 'JPY', 'KRW', 'MXN', 'RUB'];
const SUPPORTED_BASE_CURRENCIES: string[] = [];
const FIVE_MIN = 5 * 60 * 1000;

interface CMCCurrencyData {
    id: string;
    name: string;
    symbol: string;
    rank: string;
    price_usd: string;
    price_btc: string;
    '24h_volume_usd': string;
    market_cap_usd: string;
    available_supply: string;
    total_supply: string;
    percent_change_1h: string;
    percent_change_24h: string;
    percent_change_7d: string;
    last_updated: string;
    [index: string]: string;
}

interface ResultCache {
    timestamp: number;
    value: BigJS;
}

export default class CoinMarketCapProvider extends FXProvider {
    private readonly lastUpdate: { [id: string]: ResultCache };
    private initializing: Promise<void>;

    constructor(config: FXProviderConfig) {
        super(config);
        this.lastUpdate = {};
        this.initializing = null;
    }

    get name(): string {
        return 'Coinmarketcap.com';
    }

    /**
     * Valid quote currencies are USD, BTC, or one of the valid fiat currencies given in [[SUPPORTED_QUOTE_CURRENCIES]]
     * The list of currently supported base currencies will be constructed when this is first called.
     */
    supportsPair(pair: CurrencyPair): Promise<boolean> {
        if (!SUPPORTED_QUOTE_CURRENCIES.includes(pair.to)) {
            return Promise.resolve(false);
        }
        let initCodeMap = this.initializing;
        if (!this.initializing) {
            CODE_MAP = {};
            REVERSE_MAP = {};
            initCodeMap = request.get(URL)
                .accept('application/json')
                .then((res: Response) => {
                    const result: CMCCurrencyData[] = res.body as CMCCurrencyData[];
                    result.forEach((currency: CMCCurrencyData) => {
                        CODE_MAP[currency.symbol] = currency.id;
                        REVERSE_MAP[currency.id] = currency.symbol;
                        SUPPORTED_BASE_CURRENCIES.push(currency.symbol);
                    });
                });
            this.initializing = initCodeMap;
        }
        return initCodeMap.then(() => {
            return SUPPORTED_BASE_CURRENCIES.includes(pair.from);
        });
    }

    protected downloadCurrentRate(pair: CurrencyPair): Promise<FXObject> {
        const id = CODE_MAP[pair.from];
        if (!id) {
            const error = new EFXRateUnavailable(`Invalid CoinMarketCap currency symbol: ${pair.from}`, this.name);
            return Promise.reject(error);
        }
        const rate: FXObject = {
            time: null,
            from: pair.from,
            to: pair.to,
            rate: null
        };
        // The endpoints are only updated every 5 minutes, so return cached value if we're inside that window
        const lastUpdate: ResultCache = this.lastUpdate[pairAsString(pair)];
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
        return req.then((res: Response) => {
            const result: CMCCurrencyData = res.body[0] as CMCCurrencyData;
            rate.time = new Date((+result.last_updated) * 1000);
            if (pair.to === 'BTC') {
                rate.rate = Big(result.price_btc);
            } else {
                const key = `price_${pair.to.toLowerCase()}`;
                rate.rate = Big(result[key]);
            }
            if (!rate.rate.isFinite()) {
                const error = new EFXRateUnavailable('We got a response, but the FX rates weren\'t present', this.name);
                return Promise.reject(error);
            }
            // Update cache
            this.lastUpdate[pairAsString(pair)] = {
                timestamp: +(result.last_updated) * 1000,
                value: rate.rate
            };
            return Promise.resolve(rate);
        });
    }
}
