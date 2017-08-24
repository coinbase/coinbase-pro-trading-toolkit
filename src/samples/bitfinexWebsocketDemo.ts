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
import { FeedFactory } from '../factories/bitfinexFactories';
import { BitfinexFeed } from '../exchanges/bitfinex/BitfinexFeed';
import { StreamMessage, LevelMessage } from '../core/Messages';

const logger = ConsoleLoggerFactory();

let seq: number = null;

FeedFactory(logger, ['BTC-USD']).then((bitfinexFeed: BitfinexFeed) => {
    bitfinexFeed.on('data', (message: StreamMessage) => {
        switch (message.type) {
            case 'ticker':
            case 'snapshot':
                logger.log('info', message.type, JSON.stringify(message));
                break;
            case 'level':
                process.stdout.write((message as LevelMessage).side === 'buy' ? '^' : 'v');
                // Sequence counter check
                if (!seq) {
                    seq = (message as LevelMessage).sequence;
                } else {
                    if (seq + 1 !== (message as LevelMessage).sequence) {
                        logger.log('warn', `Message skipped: ${seq + 1}`, message);
                    }
                    seq = (message as LevelMessage).sequence;
                    if (seq % 500 === 0) {
                        logger.log('info', `${seq} messages processed`);
                    }
                }
                break;
        }
    });

    bitfinexFeed.on('error', (err: any) => {
        logger.log('error', 'Error', err);
    });
});
