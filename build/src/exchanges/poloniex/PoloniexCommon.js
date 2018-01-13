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
const types_1 = require("../../lib/types");
const poloniexFactories_1 = require("../../factories/poloniexFactories");
exports.POLONIEX_WS_FEED = 'wss://api2.poloniex.com';
exports.POLONIEX_API_URL = 'https://poloniex.com';
/**
 * A map of supported GDAX books to the equivalent Poloniex book
 */
exports.PRODUCT_MAP = {
    'ETH-BTC': 'BTC_ETH',
    'LTC-BTC': 'BTC_LTC'
};
exports.REVERSE_PRODUCT_MAP = {
    BTC_ETH: 'ETH-BTC',
    BTC_LTC: 'LTC-BTC'
};
// GDAX Code => Poloniex Code
exports.CURRENCY_MAP = {
    BTC: 'BTC',
    ETH: 'ETH',
    LTC: 'LTC'
};
// Poloniex Code => GDAX Code
exports.REVERSE_CURRENCY_MAP = {
    BTC: 'BTC',
    ETH: 'ETH',
    LTC: 'LTC'
};
/**
 * Takes a Poloniex product name an 'GDAXifies' it, but replacing '_' with '-' and swapping the quote and base symbols
 * @param poloProduct
 */
function gdaxifyProduct(poloProduct) {
    let [quote, base] = poloProduct.split('_');
    quote = exports.REVERSE_CURRENCY_MAP[quote] || quote;
    base = exports.REVERSE_CURRENCY_MAP[base] || base;
    return {
        id: exports.REVERSE_PRODUCT_MAP[poloProduct] || `${base}-${quote}`,
        sourceId: poloProduct,
        quoteCurrency: quote,
        baseCurrency: base,
        baseMaxSize: types_1.Big(1e6),
        baseMinSize: types_1.Big(1e-6),
        quoteIncrement: types_1.Big(1e-6),
        sourceData: null
    };
}
exports.gdaxifyProduct = gdaxifyProduct;
let productInfo = {};
function getProductInfo(id, refresh, logger) {
    if (!refresh && productInfo[id]) {
        return Promise.resolve(productInfo[id]);
    }
    productInfo = {};
    return poloniexFactories_1.DefaultAPI(logger).loadProducts().then((products) => {
        productInfo = {};
        products.forEach((p) => {
            productInfo[p.sourceData.id] = p;
        });
        return Promise.resolve(productInfo[id]);
    });
}
exports.getProductInfo = getProductInfo;
function getAllProductInfo(refresh, logger) {
    return getProductInfo(0, refresh, logger).then(() => {
        return Promise.resolve(productInfo);
    });
}
exports.getAllProductInfo = getAllProductInfo;
function gdaxToPolo(product) {
    const [base, quote] = product.split('-');
    return `${quote}_${base}`;
}
exports.gdaxToPolo = gdaxToPolo;
//# sourceMappingURL=PoloniexCommon.js.map