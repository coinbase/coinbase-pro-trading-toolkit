#!/usr/bin/env node

/**********************************************************************************************************************
 * @license                                                                                                           *
 * Copyright 2018 Coinbase, Inc.                                                                                      *
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

import program  = require('commander');
import CCXTExchangeWrapper from '../exchanges/ccxt';
import { padfloat, printSeparator, printTicker } from '../utils/printers';
import { Ticker } from '../exchanges/PublicExchangeAPI';
import { Balances } from '../exchanges/AuthenticatedExchangeAPI';
import { PlaceOrderMessage } from '../core/Messages';
import { LiveOrder } from '../lib/Orderbook';
import { ConsoleLoggerFactory } from '../utils/Logger';
import { ExchangeAuthConfig } from '../exchanges/AuthConfig';
import { Logger } from '../utils/Logger';
import { ZERO } from '../lib/types';

program
    .option('-e --exchange [value]', 'The exchange to query')
    .option('-t --ticker', 'Fetch ticker')
    .option('-p --pair [pair]', 'The trading pair to query')
    .option('-L --newLimitOrder [side,size,price]', 'Place a new limit order')
    .option('-B --balances', 'Retrieve all account balances')
    .option('-O --orders', 'Retrieve all my open orders (if pair is provided, limited to that book)')
    .option('-x --cancelAllOrders', 'Cancel all open orders (if pair is provided, limited to that book)')
    .option('-W --crypto_withdraw [amount,cur,address]', 'Withdraw to a crypto address')
    .option('--list', 'Lists supported exchanges and exit')
    .parse(process.argv);

const logger: Logger = ConsoleLoggerFactory();

if (program.list) {
    const exchanges = CCXTExchangeWrapper.supportedExchanges();
    console.log(printSeparator());
    console.log(exchanges.join(', '));
    console.log(printSeparator());
    process.exit(0);
}

const exchangeName = program.exchange;
if (exchangeName === undefined) {
    console.log('--exchange must be provided');
    process.exit(1);
}

const supportedExchanges: string[] = CCXTExchangeWrapper.supportedExchanges();
if (!supportedExchanges.includes(exchangeName)) {
    console.log(`${exchangeName} is not a supported exchange`);
    process.exit(1);
}

const exchangeNameUpper = exchangeName.toUpperCase();

const auth: ExchangeAuthConfig = {
    key: process.env[`${exchangeNameUpper}_KEY`],
    secret: process.env[`${exchangeNameUpper}_SECRET`]
};

const api: CCXTExchangeWrapper = CCXTExchangeWrapper.createExchange(exchangeName, auth, logger);

function hasAuth(): boolean {
    if (auth.key && auth.secret) {
        return true;
    }
    console.log('No authentication credentials were supplied, so cannot fulfil request');
    return false;
}

function logError(err: any) {
    console.error(printSeparator());
    console.error('Error: ' + err.message);
    if (err && (err.response && err.response.error)) {
        console.error(err.response.error.message);
    }
    console.error(printSeparator());
}

function requiredOptions(options: string[]): boolean {
    let valid = true;
    options.forEach((opt: string) => {
        if (!program[opt]) {
            console.log(`${opt} is a required option`);
            valid = false;
        }
    });
    return valid;
}

if (program.ticker) {
    if (!requiredOptions(['pair'])) {
        process.exit(1);
    }
    console.log(`Ticker for ${program.pair} on ${exchangeName}`);
    api.loadTicker(program.pair).then((ticker: Ticker) => {
        console.log(printSeparator());
        console.log(printTicker(ticker, 5));
        console.log(printSeparator());
    }).catch(logError);
}

if (program.newLimitOrder && hasAuth()) {
    if (!requiredOptions(['pair'])) {
        process.exit(1);
    }
    const [side, size, price] = program.newLimitOrder.split(',');
    const params: PlaceOrderMessage = {
        time: new Date(),
        type: 'placeOrder',
        clientId: null,
        side: side,
        size: size,
        productId: program.pair,
        price: price,
        orderType: 'limit'
    };
    const msg = `Limit ${params.side} order for ${params.size} at ${params.price}`;
    api.placeOrder(params).then((result: LiveOrder) => {
        console.log(printSeparator());
        console.log(msg);
        console.log(result);
    }).catch(logError);
}

if (program.balances && hasAuth()) {
    console.log('Retrieving account balances..');
    api.loadBalances().then((balances: Balances) => {
        console.log(printSeparator());
        for (const profile in balances) {
            const account = balances[profile];
            for (const cur in account) {
                const bal = account[cur];
                if (bal.balance && bal.balance.gt(ZERO)) {
                    console.log(`Balances for ${cur} in ${profile}:`);
                    console.log(`Available: ${padfloat(bal.available, 8, 4)} ${cur}`);
                    console.log(`Total:     ${padfloat(bal.balance, 8, 4)} ${cur}\n`);
                }
            }
        }
        console.log(printSeparator());
    }).catch(logError);
}

if (program.orders && hasAuth()) {
    console.log('Retrieving open orders..');
    console.log(printSeparator());
    api.loadAllOrders(program.pair).then((orders: LiveOrder[]) => {
        console.log('Product-ID\tStatus   \tSide\tPrice     \tSize      \tTime of order     \tOrder-ID');
        orders.forEach((order: LiveOrder) => {
            console.log(`${order.productId}\t${order.status}\t${order.side}\t${padfloat(order.price, 8, 4)}\t${padfloat(order.size, 8, 4)}\t${order.time.toString()}\t${order.id}`);
        });
        console.log(printSeparator());
    }).catch(logError);
}

if (program.cancelAllOrders && hasAuth()) {
    console.log('Cancelling open orders..');
    console.log(printSeparator());
    api.cancelAllOrders(program.pair).then((orders: string[]) => {
        orders.forEach((order: string) => {
            console.log(order);
        });
        console.log(printSeparator());
    }).catch(logError);
}
