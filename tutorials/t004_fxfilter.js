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
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var GTT = require("gdax-trading-toolkit");
/**
 * This Demonstration program illustrates how one can pipe the GDAX message streams through filters to transform the
 * data feed in a straightforward way.
 *
 * In this example, we make use of a FXService class (which provides Exchange rate data) and the ExchangeRateFilter
 * to convert EUR and GBP prices to USD on the EUR and GBP books on the fly.
 */
var products = ['BTC-USD', 'BTC-EUR', 'BTC-GBP'];
// Create a single logger instance to pass around
var logger = GTT.utils.ConsoleLoggerFactory();
var padfloat = GTT.utils.padfloat;
GTT.Factories.GDAX.FeedFactory(logger, products).then(function (feed) {
    // Configure all message streams to use the same websocket feed
    // Create the source message streams by creating a MessageStream for each product, using the same WS feed for each
    var streams = products.map(function (product) { return new GTT.Core.ProductFilter({ logger: logger, productId: product }); });
    // Let's grab a simple FXService object that uses Yahoo Finance as its source
    var fxService = GTT.Factories.SimpleFXServiceFactory('yahoo', logger);
    // We add the EUR and GBP exchange rates and reset the refresh interval to 1 minute
    fxService
        .addCurrencyPair({ from: 'GBP', to: 'USD' })
        .addCurrencyPair({ from: 'EUR', to: 'USD' })
        .setRefreshInterval(1000 * 60);
    // Now lets pipe the websocket feeds for the EUR and GBP books through an FX filter so that prices all come out in USD
    var commonFilterConfig = {
        fxService: fxService,
        logger: logger,
        pair: { from: null, to: 'USD' },
        precision: 2
    };
    // Use the spread operator to overwrite the config properties that differ. Neat!
    var fxGBP = new GTT.Core.ExchangeRateFilter(__assign({}, commonFilterConfig, { pair: { from: 'GBP', to: 'USD' } }));
    var fxEUR = new GTT.Core.ExchangeRateFilter(__assign({}, commonFilterConfig, { pair: { from: 'EUR', to: 'USD' } }));
    var outStream = new Array(3);
    outStream[0] = feed.pipe(streams[0]);
    // The EUR and GBP stream get passed through an exchange rate filter to convert prices to USD equivalent
    outStream[1] = feed.pipe(streams[1]).pipe(fxEUR);
    outStream[2] = feed.pipe(streams[2]).pipe(fxGBP);
    var latest = [-100000, -100000, -100000];
    var _loop_1 = function (i) {
        outStream[i].on('data', function (msg) {
            if (msg.type === 'trade') {
                latest[i] = +msg.price;
                if (latest[0] + latest[1] + latest[2] < 0) {
                    return;
                }
                printLatestPrices(latest);
            }
        });
    };
    for (var i = 0; i < 3; i++) {
        _loop_1(i);
    }
});
function printLatestPrices(prices) {
    var cur = ['USD', 'EUR', 'GBP'];
    var pstr = cur.map(function (c, i) { return c + " $" + padfloat(prices[i], 6, 2); });
    var msg = pstr.join('  |  ');
    console.log(msg);
}
