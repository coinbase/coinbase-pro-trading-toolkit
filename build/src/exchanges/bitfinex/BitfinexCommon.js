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
exports.ORDERBOOK_PRECISION = {
    BTCUSD: 'P0',
    ETHBTC: 'P1',
    ETHUSD: 'P2' // 2dp
};
exports.WEBSOCKET_API_VERSION = 1.1;
exports.BITFINEX_WS_FEED = 'wss://api2.bitfinex.com:3000/ws';
/**
 * A map of supported GDAX books to the equivalent Bitfinex book
 */
exports.PRODUCT_MAP = {
    'BTC-USD': 'btcusd',
    'LTC-USD': 'ltcusd',
    'LTC-BTC': 'ltcbtc',
    'ETH-USD': 'ethusd',
    'ETH-BTC': 'ethbtc'
};
exports.REVERSE_PRODUCT_MAP = {
    btcusd: 'BTC-USD',
    ltcusd: 'LTC-USD',
    ltcbtc: 'LTC-BTC',
    ethusd: 'ETH-USD',
    ethbtc: 'ETH-BTC'
};
exports.REVERSE_CURRENCY_MAP = {
    btc: 'BTC',
    ltc: 'LTC',
    eth: 'ETH',
    usd: 'USD'
};
//# sourceMappingURL=BitfinexCommon.js.map