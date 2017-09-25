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

import { ConsoleLoggerFactory } from '../utils/Logger';
import { OrderbookMessage } from '../core/Messages';
import { FeedFactory } from '../factories/poloniexFactories';
import { PoloniexFeed } from '../exchanges/poloniex/PoloniexFeed';

const logger = ConsoleLoggerFactory();
const products: string[] = ['ETH-BTC', 'ZRX-ETH'];
const tallies: any = {};
products.forEach((product: string) => {
    tallies[product] = {};
});

let count = 0;

FeedFactory(logger, products).then((feed: PoloniexFeed) => {
    feed.on('data', (msg: OrderbookMessage) => {
        count++;
        if (!(msg as any).productId) {
            tallies.other += 1;
        } else {
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
}).catch((err: Error) => {
    logger.log('error', err.message);
    process.exit(1);
});

function printTallies() {
    console.log(`${count} messages received`);
    for (const p in tallies) {
        const types = Object.keys(tallies[p]).sort();
        const tally: string = types.map((t) => `${t}: ${tallies[p][t]}`).join('\t');
        console.log(`${p}: ${tally}`);
    }
}
