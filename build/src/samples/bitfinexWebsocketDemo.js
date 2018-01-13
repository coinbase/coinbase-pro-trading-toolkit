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
const bitfinexFactories_1 = require("../factories/bitfinexFactories");
const logger = Logger_1.ConsoleLoggerFactory();
let seq = null;
bitfinexFactories_1.FeedFactory(logger, ['BTC-USD']).then((bitfinexFeed) => {
    bitfinexFeed.on('data', (message) => {
        switch (message.type) {
            case 'ticker':
            case 'snapshot':
                logger.log('info', message.type, JSON.stringify(message));
                break;
            case 'level':
                process.stdout.write(message.side === 'buy' ? '^' : 'v');
                // Sequence counter check
                if (!seq) {
                    seq = message.sequence;
                }
                else {
                    if (seq + 1 !== message.sequence) {
                        logger.log('warn', `Message skipped: ${seq + 1}`, message);
                    }
                    seq = message.sequence;
                    if (seq % 500 === 0) {
                        logger.log('info', `${seq} messages processed`);
                    }
                }
                break;
        }
    });
    bitfinexFeed.on('error', (err) => {
        logger.log('error', 'Error', err);
    });
});
//# sourceMappingURL=bitfinexWebsocketDemo.js.map