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
/**
 * This script demonstrates how to access Bitfinex's and GDAX trading APIs using the same set of standardized calls,
 * returning data in a consistent format
 */
const BitfinexExchangeAPI_1 = require("../exchanges/bitfinex/BitfinexExchangeAPI");
const Logger_1 = require("../utils/Logger");
const GDAXExchangeAPI_1 = require("../exchanges/gdax/GDAXExchangeAPI");
const printers_1 = require("../utils/printers");
const bittrexFactories_1 = require("../factories/bittrexFactories");
const logger = Logger_1.ConsoleLoggerFactory({ level: 'info' });
const bitfinexConfig = {
    logger: logger,
    auth: {
        key: process.env.BITFINEX_KEY,
        secret: process.env.BITFINEX_SECRET
    }
};
const gdaxConfig = {
    logger: logger,
    apiUrl: process.env.GDAX_API_URL || 'https://api.gdax.com',
    auth: {
        key: process.env.GDAX_KEY,
        secret: process.env.GDAX_SECRET,
        passphrase: process.env.GDAX_PASSPHRASE
    }
};
const bitfinex = new BitfinexExchangeAPI_1.BitfinexExchangeAPI(bitfinexConfig);
const gdax = new GDAXExchangeAPI_1.GDAXExchangeAPI(gdaxConfig);
const bittrex = bittrexFactories_1.DefaultAPI(logger);
const publicExchanges = [bitfinex, gdax, bittrex];
const product = 'ETH-BTC';
const [baseCurrency, quoteCurrency] = product.split('-');
// Query some public endpoints
publicExchanges.forEach((exchange) => {
    exchange.loadProducts().then((products) => {
        logger.log('info', 'Products for ' + exchange.owner, products.map((p) => p.id).join(' '));
        return exchange.loadTicker(product);
    }).then((ticker) => {
        console.log(`${exchange.owner} ${product} Ticker:`);
        console.log(printers_1.printTicker(ticker, 4));
        return exchange.loadMidMarketPrice(product);
    }).then((price) => {
        logger.log('info', `${exchange.owner} ${product} Midmarket price: ${price.toFixed(4)}`);
        return exchange.loadOrderbook(product);
    }).then((book) => {
        console.log(`${exchange.owner} ${product} Orderbook:`);
        console.log(printers_1.printOrderbook(book, 5, 5, 3));
    }).catch((err) => {
        logger.log('error', err.message, err);
    });
});
// If you have the requisite API keys set, then the following will illustrate some authenticated endpoints
const runAuth = !!bitfinexConfig.auth.key && !!gdaxConfig.auth.key;
if (runAuth) {
    const authExchanges = [gdax, bitfinex];
    authExchanges.forEach((exchange) => {
        exchange.loadBalances().then((balances) => {
            logger.log('info', `\n${exchange.owner} wallet balances:`);
            for (const wallet in balances) {
                for (const cur in balances[wallet]) {
                    logger.log('info', `[${cur}] Total: ${balances[wallet][cur].balance.toFixed(4)}   Available: ${balances[wallet][cur].available.toFixed(4)}`);
                }
            }
            return exchange.loadAllOrders(product);
        }).then((orders) => {
            logger.log('info', `\n${exchange.owner} orders:`);
            orders.forEach((order) => {
                logger.log('info', `${order.id} [${order.status}]: ${order.side} ${order.size} ${baseCurrency} at ${quoteCurrency} ${order.price}`);
            });
        }).catch((err) => {
            logger.log('error', err.message, err);
        });
    });
}
//# sourceMappingURL=exchangeAPIDemo.js.map