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
var logger = GTT.utils.ConsoleLoggerFactory();
var products = ['BTC-USD', 'ETH-USD', 'LTC-USD'];
var tallies = {};
products.forEach(function (product) {
    tallies[product] = {};
});
var count = 0;
GTT.Factories.GDAX.FeedFactory(logger, products).then(function (feed) {
    feed.on('data', function (msg) {
        count++;
        if (!msg.productId) {
            tallies.other += 1;
        }
        else {
            var tally = tallies[msg.productId];
            if (!tally[msg.type]) {
                tally[msg.type] = 0;
            }
            tally[msg.type] += 1;
        }
        if (count % 1000 === 0) {
            printTallies();
        }
    });
}).catch(function (err) {
    logger.log('error', err.message);
    process.exit(1);
});
function printTallies() {
    console.log(count + " messages received");
    var _loop_1 = function (p) {
        var types = Object.keys(tallies[p]).sort();
        var tally = types.map(function (t) { return t + ": " + tallies[p][t]; }).join('\t');
        console.log(p + ": " + tally);
    };
    for (var p in tallies) {
        _loop_1(p);
    }
}
