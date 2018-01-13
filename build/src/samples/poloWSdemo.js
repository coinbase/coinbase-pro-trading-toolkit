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
const Logger_1 = require("../utils/Logger");
const poloniexFactories_1 = require("../factories/poloniexFactories");
const logger = Logger_1.ConsoleLoggerFactory();
const products = ['ETH-BTC', 'ZRX-ETH'];
const tallies = {};
products.forEach((product) => {
    tallies[product] = {};
});
let count = 0;
poloniexFactories_1.FeedFactory(logger, products).then((feed) => {
    feed.on('data', (msg) => {
        count++;
        if (!msg.productId) {
            tallies.other += 1;
        }
        else {
            // Polo ticker channel pushes all product tickers through, so check for valid product
            if (!products.includes(msg.productId)) {
                return;
            }
            const tally = tallies[msg.productId];
            if (!tally[msg.type]) {
                tally[msg.type] = 0;
            }
            tally[msg.type] += 1;
        }
        if (count % 100 === 0) {
            printTallies();
        }
    });
}).catch((err) => {
    logger.log('error', err.message);
    process.exit(1);
});
function printTallies() {
    console.log(`${count} messages received`);
    for (const p in tallies) {
        const types = Object.keys(tallies[p]).sort();
        const tally = types.map((t) => `${t}: ${tallies[p][t]}`).join('\t');
        console.log(`${p}: ${tally}`);
    }
}
//# sourceMappingURL=poloWSdemo.js.map