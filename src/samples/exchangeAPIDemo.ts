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

/**
 * This script demonstrates how to access Bitfinex's and Coinbase Pro trading APIs using the same set of standardized calls,
 * returning data in a consistent format
 */
import { BitfinexConfig,
         BitfinexExchangeAPI } from '../exchanges/bitfinex/BitfinexExchangeAPI';
import { ConsoleLoggerFactory, Logger } from '../utils/Logger';
import { CoinbaseProExchangeAPI } from '../exchanges/coinbasePro/CoinbaseProExchangeAPI';
import { PublicExchangeAPI, Ticker } from '../exchanges/PublicExchangeAPI';
import { BookBuilder } from '../lib/BookBuilder';
import { printOrderbook, printTicker } from '../utils/printers';
import { AuthenticatedExchangeAPI,
         Balances } from '../exchanges/AuthenticatedExchangeAPI';
import { LiveOrder } from '../lib/Orderbook';
import { DefaultAPI } from '../factories/bittrexFactories';
import { CoinbaseProConfig } from '../exchanges/coinbasePro/CoinbaseProInterfaces';

const logger: Logger = ConsoleLoggerFactory({ level: 'info' });

const bitfinexConfig: BitfinexConfig = {
    logger: logger,
    auth: {
        key: process.env.BITFINEX_KEY,
        secret: process.env.BITFINEX_SECRET
    }
};

const coinbaseProConfig: CoinbaseProConfig = {
    logger: logger,
    apiUrl: process.env.COINBASE_PRO_API_URL || 'https://api.pro.coinbase.com',
    auth: {
        key: process.env.COINBASE_PRO_KEY,
        secret: process.env.COINBASE_PRO_SECRET,
        passphrase: process.env.COINBASE_PRO_PASSPHRASE
    }
};

const bitfinex = new BitfinexExchangeAPI(bitfinexConfig);
const coinbasePro = new CoinbaseProExchangeAPI(coinbaseProConfig);
const bittrex = DefaultAPI(logger);

const publicExchanges: PublicExchangeAPI[] = [bitfinex, coinbasePro, bittrex];
const product = 'ETH-BTC';
const [baseCurrency, quoteCurrency] = product.split('-');

// Query some public endpoints
publicExchanges.forEach((exchange: PublicExchangeAPI) => {
    exchange.loadProducts().then((products) => {
        logger.log('info', 'Products for ' + exchange.owner, products.map((p) => p.id).join(' '));
        return exchange.loadTicker(product);
    }).then((ticker: Ticker) => {
        console.log(`${exchange.owner} ${product} Ticker:`);
        console.log(printTicker(ticker, 4));
        return exchange.loadMidMarketPrice(product);
    }).then((price) => {
        logger.log('info', `${exchange.owner} ${product} Midmarket price: ${price.toFixed(4)}`);
        return exchange.loadOrderbook(product);
    }).then((book: BookBuilder) => {
        console.log(`${exchange.owner} ${product} Orderbook:`);
        console.log(printOrderbook(book, 5, 5, 3));
    }).catch((err) => {
        logger.log('error', err.message, err);
    });
});

// If you have the requisite API keys set, then the following will illustrate some authenticated endpoints
const runAuth: boolean = !!bitfinexConfig.auth.key && !!coinbaseProConfig.auth.key;

if (runAuth) {
    const authExchanges: AuthenticatedExchangeAPI[] = [coinbasePro, bitfinex];
    authExchanges.forEach((exchange: AuthenticatedExchangeAPI) => {
        exchange.loadBalances().then((balances: Balances) => {
            logger.log('info', `\n${exchange.owner} wallet balances:`);
            for (const wallet in balances) {
                for (const cur in balances[wallet]) {
                    logger.log('info', `[${cur}] Total: ${balances[wallet][cur].balance.toFixed(4)}   Available: ${balances[wallet][cur].available.toFixed(4)}`);
                }
            }
            return exchange.loadAllOrders(product);
        }).then((orders: LiveOrder[]) => {
            logger.log('info', `\n${exchange.owner} orders:`);
            orders.forEach((order: LiveOrder) => {
                logger.log('info', `${order.id} [${order.status}]: ${order.side} ${order.size} ${baseCurrency} at ${quoteCurrency} ${order.price}`);
            });
        }).catch((err) => {
            logger.log('error', err.message, err);
        });
    });
}
