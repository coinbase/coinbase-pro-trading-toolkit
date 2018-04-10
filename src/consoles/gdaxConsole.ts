#!/usr/bin/env node
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

import program  = require('commander');
import request = require('superagent');
import Response = request.Response;
import { GDAXExchangeAPI } from '../exchanges/gdax/GDAXExchangeAPI';
import { padfloat, printSeparator, printTicker } from '../utils/printers';
import { Ticker } from '../exchanges/PublicExchangeAPI';
import { Balances } from '../exchanges/AuthenticatedExchangeAPI';
import { PlaceOrderMessage } from '../core/Messages';
import { LiveOrder } from '../lib/Orderbook';
import { AuthCallOptions,
         GDAXAuthConfig,
         GDAXConfig } from '../exchanges/gdax/GDAXInterfaces';
import { TransferRequest, TransferResult } from '../exchanges/ExchangeTransferAPI';
import { Big } from '../lib/types';

program
    .option('--api [value]', 'API url')
    .option('-p --product [value]', 'The GDAX product to query')
    .option('-t --ticker', 'Fetch ticker')
    .option('-N --newMarketOrder [side,size]', 'Place a new market order')
    .option('-L --newLimitOrder [side,size,price]', 'Place a new limit order')
    .option('-B --balances', 'Retrieve all account balances')
    .option('-O --orders', 'Retrieve all my open orders (if product is provided, limited to that book)')
    .option('-x --cancelAllOrders', 'Cancel all open orders (if product is provided, limited to that book)')
    .option('-W --crypto_withdraw [amount,cur,address]', 'Withdraw to a crypto address')
    .option('--transfer [type,amount,cur]', 'deposit or withdraw from/to coinbase')
    .option('-X --method [method]', 'method for general request')
    .option('-U --url [url]', 'request url')
    .option('-P --body [body]', 'request body')
    .parse(process.argv);

const auth: GDAXAuthConfig = {
    key: process.env.GDAX_KEY,
    secret: process.env.GDAX_SECRET,
    passphrase: process.env.GDAX_PASSPHRASE
};
const gdaxConfig: GDAXConfig = {
    logger: null,
    apiUrl: program.api || process.env.API_URL || 'https://api.gdax.com'
};

if (auth.key && auth.secret && auth.passphrase) {
    gdaxConfig.auth = auth;
}

const gdaxApi = new GDAXExchangeAPI(gdaxConfig);

if (program.url) {
    const method: string = program.method || 'GET';
    const body: string = program.body || '';
    makeGenericRequest(method, program.url, body).then((json: any) => {
        console.log(json);
        process.exit(0);
    });
}

function hasAuth(): boolean {
    if (gdaxConfig.auth) {
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

function makeGenericRequest(method: string, url: string, body: string): Promise<any> {
    const opts: AuthCallOptions = {
        body: body,
        qs: null,
        headers: null
    };
    return gdaxApi.authCall(method, url, opts).then((res: Response) => {
        return res.body;
    }).catch((res: any) => {
        const err = res.response.error || res.response.body;
        return { error: err.text || err.json || err };
    });
}

if (program.ticker) {
    if (!requiredOptions(['product'])) {
        process.exit(1);
    }
    gdaxApi.loadTicker(program.product).then((ticker: Ticker) => {
        console.log(printSeparator());
        console.log(`Ticker for ${program.product} on GDAX`);
        console.log(printTicker(ticker));
        console.log(printSeparator());
    }).catch(logError);
}

if (program.transfer) {
    const [type, amount, currency] = program.transfer.split(',');
    const isDeposit: boolean = type.toLowerCase().startsWith('dep');
    const params: TransferRequest = {
        amount: Big(amount),
        currency: currency,
        walletIdFrom: isDeposit ? 'coinbase' : 'gdax',
        walletIdTo: isDeposit ? 'gdax' : 'coinbase'
    };
    gdaxApi.requestTransfer(params).then((result: TransferResult) => {
        console.log('Transfer successful: ', result.success);
        console.log('Details: ', result.details);
    }).catch(logError);
}

if (program.newMarketOrder && hasAuth()) {
    if (!requiredOptions(['product'])) {
        process.exit(1);
    }
    const vals = program.newMarketOrder.split(',');
    const params: PlaceOrderMessage = {
        type: 'placeOrder',
        time: new Date(),
        clientId: null,
        side: vals[0],
        size: vals[1],
        productId: program.product,
        price: null,
        orderType: 'market'
    };
    const msg = `Market ${params.side} order for ${params.size}`;
    gdaxApi.placeOrder(params).then((result: LiveOrder) => {
        console.log(printSeparator());
        console.log(msg);
        console.log(result);
    }).catch(logError);
}

if (program.newLimitOrder && hasAuth()) {
    if (!requiredOptions(['product'])) {
        process.exit(1);
    }
    const [side, size, price] = program.newLimitOrder.split(',');
    const params: PlaceOrderMessage = {
        type: 'placeOrder',
        time: new Date(),
        clientId: null,
        side: side,
        size: size,
        productId: program.product,
        price: price,
        orderType: 'limit'
    };
    const msg = `Limit ${params.side} order for ${params.size} at ${params.price}`;
    gdaxApi.placeOrder(params).then((result: LiveOrder) => {
        console.log(printSeparator());
        console.log(msg);
        console.log(result);
    }).catch(logError);
}

if (program.balances && hasAuth()) {
    console.log('Retrieving account balances..');
    gdaxApi.loadBalances().then((balances: Balances) => {
        console.log(printSeparator());
        for (const profile in balances) {
            const account = balances[profile];
            for (const cur in account) {
                const bal = account[cur];
                console.log(`Balances for ${cur} in ${profile}:`);
                console.log(`Available: ${padfloat(bal.available, 8, 4)} ${cur}`);
                console.log(`Total:     ${padfloat(bal.balance, 8, 4)} ${cur}\n`);
            }
        }
        console.log(printSeparator());
    }).catch(logError);
}

if (program.orders && hasAuth()) {
    console.log('Retrieving open orders..');
    console.log(printSeparator());
    gdaxApi.loadAllOrders(program.product).then((orders: LiveOrder[]) => {
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
    gdaxApi.cancelAllOrders(program.product).then((orders: string[]) => {
        orders.forEach((order: string) => {
            console.log(order);
        });
        console.log(printSeparator());
    }).catch(logError);
}
