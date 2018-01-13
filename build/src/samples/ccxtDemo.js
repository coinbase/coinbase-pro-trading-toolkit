"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const ccxt_1 = require("../exchanges/ccxt");
const printers_1 = require("../utils/printers");
const Logger_1 = require("../utils/Logger");
const exchanges = ccxt_1.default.supportedExchanges();
const logger = Logger_1.ConsoleLoggerFactory();
console.log(`${exchanges.length} Supported exchanges:`);
console.log(exchanges.join(', '));
console.log('Supported exchange names:');
console.log(ccxt_1.default.supportedExchangeNames().join(', '));
for (let i = 0; i < 5; i++) {
    // const exchange = randomElement(exchanges);
    const exchange = ['bitmex', 'gemini', 'kraken', 'itbit', 'cex'][i];
    const api = ccxt_1.default.createExchange(exchange, { key: null, secret: null }, logger);
    let product;
    api.loadProducts().then((products) => {
        product = randomElement(products);
        if (!product) {
            return Promise.resolve(null);
        }
        console.log(`Loading ticker for ${product.id} on ${api.owner}`);
        return api.loadTicker(product.id);
    }).then((ticker) => {
        console.log(`Ticker for ${product.id} on ${api.owner}`);
        const s = ticker ? printers_1.printTicker(ticker, 4) : '... is not available';
        console.log(s);
        return api.loadOrderbook(product.id);
    }).then((book) => {
        console.log(`Top 10 orders for ${product.id} on ${api.owner}`);
        const s = book ? printers_1.printOrderbook(book, 10, 4, 4) : '... is not available';
        console.log(s);
        return api.loadBalances();
    }).then((balances) => {
        console.log(`Account balances for ${api.owner}`);
        const s = balances ? JSON.stringify(balances) : '... are not available';
        console.log(s);
    }, () => {
        console.log(`No Credentials provided for ${api.owner}.`);
    });
}
function randomElement(array) {
    const index = Math.floor(Math.random() * array.length);
    return array[index];
}
//# sourceMappingURL=ccxtDemo.js.map