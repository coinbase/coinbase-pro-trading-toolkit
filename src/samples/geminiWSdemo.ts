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
import { StreamMessage } from '../core/Messages';
import { FeedFactory } from '../factories/geminiFactories';
import { GeminiMarketFeed } from '../exchanges/gemini/GeminiMarketFeed';

const logger = ConsoleLoggerFactory();

let count = 0;
const keys: string[] = ['snapshot', 'level', 'trade', 'other'];
const tallies: any = {};
keys.forEach((key: string) => {
    tallies[key] = 0;
});

const product = 'BTC-USD';

FeedFactory(logger, product).then((feed: GeminiMarketFeed) => {
    feed.on('data', (msg: StreamMessage) => {
        count++;
        if (!msg.type) {
            tallies.other += 1;
        } else {
            tallies[msg.type] += 1;
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
    console.log(keys.map((key) => `${key}: ${tallies[key]}`).join('  '));
}
