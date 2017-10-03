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
export const GEMINI_API_URL = 'https://api.gemini.com/v1';
export const GEMINI_WS_FEED = 'wss://api.gemini.com/v1/marketdata/';

import { Logger } from '../../utils/Logger';
import CCXTExchangeWrapper from '../ccxt';

let publicAPIInstance: CCXTExchangeWrapper;

export function GeminiAPI(logger: Logger): CCXTExchangeWrapper {
    if (!publicAPIInstance) {
        publicAPIInstance = CCXTExchangeWrapper.createExchange('gemini', { key: process.env.GEMINI_KEY, secret: process.env.GEMINI_SECRET }, logger);
    }
    return publicAPIInstance;
}

/**
 * A map of supported GDAX products to the equivalent Gemini product
 */
export const PRODUCT_MAP: { [index: string]: string } = {
    'BTC-USD': 'btcusd',
    'ETH-USD': 'ethusd',
    'ETH-BTC': 'ethbtc'
};

export const REVERSE_PRODUCT_MAP: { [index: string]: string } = {
    btcusd: 'BTC-USD',
    ethusd: 'ETH-USD',
    ethbtc: 'ETH-BTC'
};
