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
var core_1 = require("gdax-trading-toolkit/build/src/core");
var product = 'LTC-USD';
var logger = GTT.utils.ConsoleLoggerFactory({ level: 'debug' });
var printOrderbook = GTT.utils.printOrderbook;
var printTicker = GTT.utils.printTicker;
/*
 Simple demo that sets up a live order book and then periodically prints some stats to the console.
 */
var tradeVolume = 0;
GTT.Factories.GDAX.FeedFactory(logger, [product]).then(function (feed) {
    // Configure the live book object
    var config = {
        product: product,
        logger: logger
    };
    var book = new core_1.LiveOrderbook(config);
    book.on('LiveOrderbook.snapshot', function () {
        logger.log('info', 'Snapshot received by LiveOrderbook Demo');
        setInterval(function () {
            console.log(printOrderbook(book, 10));
            printOrderbookStats(book);
            logger.log('info', "Cumulative trade volume: " + tradeVolume.toFixed(4));
        }, 5000);
    });
    book.on('LiveOrderbook.ticker', function (ticker) {
        console.log(printTicker(ticker));
    });
    book.on('LiveOrderbook.trade', function (trade) {
        tradeVolume += +(trade.size);
    });
    book.on('LiveOrderbook.skippedMessage', function (details) {
        // On GDAX, this event should never be emitted, but we put it here for completeness
        console.log('SKIPPED MESSAGE', details);
        console.log('Reconnecting to feed');
        feed.reconnect(0);
    });
    book.on('end', function () {
        console.log('Orderbook closed');
    });
    book.on('error', function (err) {
        console.log('Livebook errored: ', err);
        feed.pipe(book);
    });
    feed.pipe(book);
});
function printOrderbookStats(book) {
    console.log("Number of bids:       \t" + book.numBids + "\tasks: " + book.numAsks);
    console.log("Total " + book.baseCurrency + " liquidity: \t" + book.bidsTotal.toFixed(3) + "\tasks: " + book.asksTotal.toFixed(3));
    var orders = book.ordersForValue('buy', 100, false);
    console.log("Cost of buying 100 " + book.baseCurrency + ": " + orders[orders.length - 1].cumValue.toFixed(2) + " " + book.quoteCurrency);
    orders = book.ordersForValue('sell', 1000, true);
    console.log("Need to sell " + orders[orders.length - 1].cumSize.toFixed(3) + " " + book.baseCurrency + " to get 1000 " + book.quoteCurrency);
}
