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
var GTT = require("gdax-trading-toolkit");
var BitfinexExchangeAPI_1 = require("gdax-trading-toolkit/build/src/exchanges/bitfinex/BitfinexExchangeAPI");
var GDAXExchangeAPI_1 = require("gdax-trading-toolkit/build/src/exchanges/gdax/GDAXExchangeAPI");
var padfloat = GTT.utils.padfloat;
var logger = GTT.utils.ConsoleLoggerFactory({ level: 'info' });
var bitfinexConfig = {
    logger: logger,
    auth: {
        key: process.env.BITFINEX_KEY,
        secret: process.env.BITFINEX_SECRET
    }
};
var gdaxConfig = {
    logger: logger,
    apiUrl: process.env.GDAX_API_URL || 'https://api.gdax.com',
    auth: {
        key: process.env.GDAX_KEY,
        secret: process.env.GDAX_SECRET,
        passphrase: process.env.GDAX_PASSPHRASE
    }
};
var bitfinex = new BitfinexExchangeAPI_1.BitfinexExchangeAPI(bitfinexConfig);
var gdax = new GDAXExchangeAPI_1.GDAXExchangeAPI(gdaxConfig);
var publicExchanges = [gdax, bitfinex];
setInterval(function () {
    getAndPrintTickers(publicExchanges, 'BTC-USD').then(function () {
        return getAndPrintTickers(publicExchanges, 'ETH-USD');
    }).catch(function (err) {
        logger.log('error', err.message, err);
    });
}, 5000);
function getTickers(exchanges, product) {
    var promises = exchanges.map(function (ex) { return ex.loadTicker(product); });
    return Promise.all(promises);
}
function getAndPrintTickers(exchanges, product) {
    return getTickers(publicExchanges, product).then(function (tickers) {
        var quoteCurrency = tickers[0].productId.split('-')[1];
        console.log(new Date().toTimeString() + "\t| Price " + quoteCurrency + "  |   Best Bid |   Best Ask");
        for (var i = 0; i < exchanges.length; i++) {
            printTicker(exchanges[i], tickers[i]);
        }
        console.log();
        return Promise.resolve();
    });
}
function printTicker(exchange, ticker) {
    // pad exchange name
    var s = ticker.productId + " (" + exchange.owner + ")";
    for (var i = s.length; i < 24; i++) {
        s += ' ';
    }
    console.log(s + "\t| " + padfloat(ticker.price, 10, 2) + " | " + padfloat(ticker.bid, 10, 2) + " | " + padfloat(ticker.ask, 10, 2));
}
process.on('SIGINT', function () {
    process.exit(0);
});
