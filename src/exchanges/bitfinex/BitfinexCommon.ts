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

export const ORDERBOOK_PRECISION: { [index: string]: string } = {
    BTCUSD: 'P0',  // 2dp
    ETHBTC: 'P1',  // 5dp
    ETHUSD: 'P2'   // 2dp
};

export const WEBSOCKET_API_VERSION = 1.1;
export const BITFINEX_WS_FEED = 'wss://api2.bitfinex.com:3000/ws';

/**
 * A map of supported GDAX books to the equivalent Bitfinex book
 */
export const PRODUCT_MAP: { [index: string]: string } = {
    'BTC-USD': 'btcusd',
    'LTC-USD': 'ltcusd',
    'LTC-BTC': 'ltcbtc',
    'ETH-USD': 'ethusd',
    'ETH-BTC': 'ethbtc'
};
export const REVERSE_PRODUCT_MAP: { [index: string]: string } = {
    btcusd: 'BTC-USD',
    ltcusd: 'LTC-USD',
    ltcbtc: 'LTC-BTC',
    ethusd: 'ETH-USD',
    ethbtc: 'ETH-BTC'
};
export const REVERSE_CURRENCY_MAP: { [index: string]: string } = {
    btc: 'BTC',
    ltc: 'LTC',
    eth: 'ETH',
    usd: 'USD'
};
