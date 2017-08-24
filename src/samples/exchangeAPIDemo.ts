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
 * This script demonstrates how to access Bitfinex's and GDAX trading APIs using the same set of standardized calls,
 * returning data in a consistent format
 */
import { BitfinexConfig, BitfinexExchangeAPI } from '../exchanges/bitfinex/BitfinexExchangeAPI';
import { ConsoleLoggerFactory, Logger } from '../utils/Logger';
import { GDAXConfig, GDAXExchangeAPI } from '../exchanges/gdax/GDAXExchangeAPI';
import { PublicExchangeAPI, Ticker } from '../exchanges/PublicExchangeAPI';
import { BookBuilder } from '../lib/BookBuilder';
import { printOrderbook } from '../utils/printers';
import { AuthenticatedExchangeAPI, Balances } from '../exchanges/AuthenticatedExchangeAPI';
import { LiveOrder } from '../lib/Orderbook';

const logger: Logger = ConsoleLoggerFactory({ level: 'info' });

const bitfinexConfig: BitfinexConfig = {
    logger: logger,
    auth: {
        key: process.env.BITFINEX_KEY,
        secret: process.env.BITFINEX_SECRET
    }
};

const gdaxConfig: GDAXConfig = {
    logger: logger,
    apiUrl: process.env.GDAX_API_URL || 'https://api.gdax.com',
    auth: {
        key: process.env.GDAX_KEY,
        secret: process.env.GDAX_SECRET,
        passphrase: process.env.GDAX_PASSPHRASE
    }
};

const bitfinex = new BitfinexExchangeAPI(bitfinexConfig);
const gdax = new GDAXExchangeAPI(gdaxConfig);

const publicExchanges: PublicExchangeAPI[] = [gdax, bitfinex];
const product = 'BTC-USD';
const [baseCurrency, quoteCurrency] = product.split('-');

// Query some public endpoints
publicExchanges.forEach((exchange: PublicExchangeAPI) => {
    exchange.loadProducts().then((products) => {
        logger.log('info', 'Products for ' + exchange.owner, products.map((p) => p.id).join(' '));
        return exchange.loadTicker(product);
    }).then((ticker: Ticker) => {
        printTicker(exchange, ticker);
        return exchange.loadMidMarketPrice(product);
    }).then((price) => {
        logger.log('info', `Midmarket price: ${price.toFixed(2)}`);
        return exchange.loadOrderbook(product);
    }).then((book: BookBuilder) => {
        console.log(printOrderbook(book, 5));
    }).catch((err) => {
        logger.log('error', err.message, err);
    });
});

function printTicker(exchange: PublicExchangeAPI, ticker: Ticker) {
    logger.log('info', `${exchange.owner} ${product} Ticker`);
    logger.log(
        'info',
        `Current Price ${baseCurrency} ${ticker.price.toFixed(2)} | Best Bid: ${ticker.bid.toFixed(2)} ` +
        `| Best ask: ${ticker.ask.toFixed(2)} | 24 hr Volume: ${ticker.volume.toFixed(0)}\n`
    );
}

// If you have the requisite API keys set, then the following will illustrate some authenticated endpoints
const runAuth: boolean = !!bitfinexConfig.auth.key && !!gdaxConfig.auth.key;

if (runAuth) {
    const authExchanges: AuthenticatedExchangeAPI[] = [gdax, bitfinex];
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
