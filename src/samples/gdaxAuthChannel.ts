/**********************************************************************************************************************
 * @license                                                                                                           *
 * Copyright 2017 Coinbase, Inc.                                                                                      *
 *                                                                                                                    *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance     *
 * with the License. You may obtain a copy of the License at                                                          *
 *                                                                                                                    *
 * http://www.apache.org/licenses/LICENSE-2.0                                                                         *
 *                                                                                                                    *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on*
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the                 *
 * License for the specific language governing permissions and limitations under the License.                         *
 **********************************************************************************************************************/

import { GDAXFeed, GDAXFeedConfig } from '../exchanges/gdax/GDAXFeed';
import { ConsoleLoggerFactory } from '../utils/Logger';
import { getSubscribedFeeds } from '../factories/gdaxFactories';

const logger = ConsoleLoggerFactory();
const options: GDAXFeedConfig = {
    logger: logger,
    channels: ['matches', 'user'],
    auth: {
        key: process.env.GDAX_KEY,
        secret: process.env.GDAX_SECRET,
        passphrase: process.env.GDAX_PASSPHRASE
    },
    wsUrl: null,
    apiUrl: null
};

if (!options.auth.key || !options.auth.secret) {
    logger.log('error', 'API credentials are required for this demo');
    process.exit(1);
}

getSubscribedFeeds(options, ['BTC-USD', 'LTC-USD']).then((feed: GDAXFeed) => {
    feed.on('data', (msg: any) => {
        const level = msg.type === 'match' ? 'debug' : 'info';
        logger.log(level, `${msg.type} received`, msg);
    });
});
