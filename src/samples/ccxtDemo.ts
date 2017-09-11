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

import CCXTWrapper from '../exchanges/ccxt';
import { printTicker } from '../utils/printers';
import { ConsoleLoggerFactory } from '../utils/Logger';
import { Product } from '../exchanges/PublicExchangeAPI';

const exchanges = CCXTWrapper.supportedExchanges();
const logger = ConsoleLoggerFactory();

console.log(`${exchanges.length} Supported exchanges:`);
console.log(exchanges.join(', '));

console.log('Supported exchange names:');
console.log(CCXTWrapper.supportedExchangeNames().join(', '));

for (let i = 0; i < 5; i++) {
    const exchange = randomElement(exchanges);
    const api = CCXTWrapper.createExchange(exchange, { key: null, secret: null }, logger);
    let product: Product;
    api.loadProducts().then((products) => {
        product = randomElement(products);
        if (!product) {
            return Promise.resolve(null);
        }
        console.log(`Loading ticker for ${product.id} on ${api.owner}`);
        return api.loadTicker(product.id);
    }).then((ticker) => {
        console.log(`Ticker for ${product.id} on ${api.owner}`);
        const s = ticker ? printTicker(ticker, 4) : '... is not available';
        console.log(s);
    });
}

function randomElement(array: any[]): any {
    const index = Math.floor(Math.random() * array.length);
    return array[index];
}
