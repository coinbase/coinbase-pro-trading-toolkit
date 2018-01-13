"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
exports.GEMINI_API_URL = 'https://api.gemini.com/v1';
exports.GEMINI_WS_FEED = 'wss://api.gemini.com/v1/marketdata/';
const ccxt_1 = require("../ccxt");
let publicAPIInstance;
function GeminiAPI(logger) {
    if (!publicAPIInstance) {
        publicAPIInstance = ccxt_1.default.createExchange('gemini', { key: process.env.GEMINI_KEY, secret: process.env.GEMINI_SECRET }, logger);
    }
    return publicAPIInstance;
}
exports.GeminiAPI = GeminiAPI;
/**
 * A map of supported GDAX products to the equivalent Gemini product
 */
exports.PRODUCT_MAP = {
    'BTC-USD': 'btcusd',
    'ETH-USD': 'ethusd',
    'ETH-BTC': 'ethbtc'
};
exports.REVERSE_PRODUCT_MAP = {
    btcusd: 'BTC-USD',
    ethusd: 'ETH-USD',
    ethbtc: 'ETH-BTC'
};
//# sourceMappingURL=GeminiCommon.js.map