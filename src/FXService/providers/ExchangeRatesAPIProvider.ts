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

import request = require('superagent');
import { FXProvider, CurrencyPair, FXObject, pairAsString } from '../FXProvider';
import Response = request.Response;
import { Big } from '../../lib/types';

export default class ExchangeRatesAPIProvider extends FXProvider {
  // Global list of currenices, populated on initial calls 
  // to supportsPair; maintained for the purposes of memoization
  private static SUPPORTED_CURRENCIES: string[] = [];

  get name(): string {
    return 'Exchange Rates API (https://exchangeratesapi.io/)';
  }

  supportsPair(pair: CurrencyPair): Promise<boolean> {
    if (ExchangeRatesAPIProvider.SUPPORTED_CURRENCIES.length > 0) {
      return Promise.resolve(this.isSupportedPair(pair));
    }

    return request('https://api.exchangeratesapi.io/latest')
      .accept('application/json')
      .query({ format: 'json' })
      .then<boolean>((response: Response) => {
        if (
          response.status !== 200 ||
          !response.body ||
          !response.body.base ||
          !response.body.rates
        ) {
          const error = new Error(`Could not get list of supported currencies from ${this.name}`);
          return Promise.reject(error);
        }

        const currencies: string[] = [];
        currencies.push(response.body.base);
        currencies.push(...Object.keys(response.body.rates));
        ExchangeRatesAPIProvider.SUPPORTED_CURRENCIES = currencies;

        return this.isSupportedPair(pair);
      });
  }

  protected downloadCurrentRate(pair: CurrencyPair): Promise<FXObject> {
    return request(`https://api.exchangeratesapi.io/latest?base=${pair.from}`)
      .accept('application/json')
      .query({ format: 'json' })
      .then<FXObject>((response: Response) => {
        if (
          response.status !== 200 ||
          !response.body ||
          !response.body.rates
        ) {
          const error = new Error(`Could not download ${pairAsString(pair)} from ${this.name}`);
          return Promise.reject(error);
        }

        const optionalRate = response.body.rates[pair.to];

        if (optionalRate == null) {
          const error = new Error(`No exchange rate found for ${pairAsString(pair)} from ${this.name}`);
          return Promise.reject(error);
        }

        const fx: FXObject = {
          time: new Date(response.body.date),
          from: pair.from,
          to: pair.to,
          rate: Big(optionalRate)
        };

        return fx;
     });
  }

  private isSupportedPair(pair: CurrencyPair): boolean {
    return (
      ExchangeRatesAPIProvider.SUPPORTED_CURRENCIES.indexOf(pair.from) >= 0 &&
      ExchangeRatesAPIProvider.SUPPORTED_CURRENCIES.indexOf(pair.to) >= 0
    );
  }
}
