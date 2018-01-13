#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const program = require("commander");
const ccxt_1 = require("../exchanges/ccxt");
const printers_1 = require("../utils/printers");
const Logger_1 = require("../utils/Logger");
const types_1 = require("../lib/types");
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
const logger = Logger_1.ConsoleLoggerFactory();
if (program.list) {
    const exchanges = ccxt_1.default.supportedExchanges();
    console.log(printers_1.printSeparator());
    console.log(exchanges.join(', '));
    console.log(printers_1.printSeparator());
    process.exit(0);
}
const exchangeName = program.exchange;
if (exchangeName === undefined) {
    console.log('--exchange must be provided');
    process.exit(1);
}
const supportedExchanges = ccxt_1.default.supportedExchanges();
if (!supportedExchanges.includes(exchangeName)) {
    console.log(`${exchangeName} is not a supported exchange`);
    process.exit(1);
}
const exchangeNameUpper = exchangeName.toUpperCase();
const auth = {
    key: process.env[`${exchangeNameUpper}_KEY`],
    secret: process.env[`${exchangeNameUpper}_SECRET`]
};
const api = ccxt_1.default.createExchange(exchangeName, auth, logger);
function hasAuth() {
    if (auth.key && auth.secret) {
        return true;
    }
    console.log('No authentication credentials were supplied, so cannot fulfil request');
    return false;
}
function logError(err) {
    console.error(printers_1.printSeparator());
    console.error('Error: ' + err.message);
    if (err && (err.response && err.response.error)) {
        console.error(err.response.error.message);
    }
    console.error(printers_1.printSeparator());
}
function requiredOptions(options) {
    let valid = true;
    options.forEach((opt) => {
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
    api.loadTicker(program.pair).then((ticker) => {
        console.log(printers_1.printSeparator());
        console.log(printers_1.printTicker(ticker, 5));
        console.log(printers_1.printSeparator());
    }).catch(logError);
}
if (program.newLimitOrder && hasAuth()) {
    if (!requiredOptions(['pair'])) {
        process.exit(1);
    }
    const [side, size, price] = program.newLimitOrder.split(',');
    const params = {
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
    api.placeOrder(params).then((result) => {
        console.log(printers_1.printSeparator());
        console.log(msg);
        console.log(result);
    }).catch(logError);
}
if (program.balances && hasAuth()) {
    console.log('Retrieving account balances..');
    api.loadBalances().then((balances) => {
        console.log(printers_1.printSeparator());
        for (const profile in balances) {
            const account = balances[profile];
            for (const cur in account) {
                const bal = account[cur];
                if (bal.balance && bal.balance.gt(types_1.ZERO)) {
                    console.log(`Balances for ${cur} in ${profile}:`);
                    console.log(`Available: ${printers_1.padfloat(bal.available, 8, 4)} ${cur}`);
                    console.log(`Total:     ${printers_1.padfloat(bal.balance, 8, 4)} ${cur}\n`);
                }
            }
        }
        console.log(printers_1.printSeparator());
    }).catch(logError);
}
if (program.orders && hasAuth()) {
    console.log('Retrieving open orders..');
    console.log(printers_1.printSeparator());
    api.loadAllOrders(program.pair).then((orders) => {
        console.log('Product-ID\tStatus   \tSide\tPrice     \tSize      \tTime of order     \tOrder-ID');
        orders.forEach((order) => {
            console.log(`${order.productId}\t${order.status}\t${order.side}\t${printers_1.padfloat(order.price, 8, 4)}\t${printers_1.padfloat(order.size, 8, 4)}\t${order.time.toString()}\t${order.id}`);
        });
        console.log(printers_1.printSeparator());
    }).catch(logError);
}
if (program.cancelAllOrders && hasAuth()) {
    console.log('Cancelling open orders..');
    console.log(printers_1.printSeparator());
    api.cancelAllOrders(program.pair).then((orders) => {
        orders.forEach((order) => {
            console.log(order);
        });
        console.log(printers_1.printSeparator());
    }).catch(logError);
}
//# sourceMappingURL=console.js.map