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

import program  = require('commander');
import { getSubscribedFeeds } from '../factories/coinbaseProFactories';
import { ConsoleLoggerFactory } from '../utils/Logger';
import { CoinbaseProFeed, CoinbaseProFeedConfig } from '../exchanges/coinbasePro/CoinbaseProFeed';
import { CoinbaseProAuthConfig } from '../exchanges/coinbasePro/CoinbaseProInterfaces';

program
    .option('--api [value]', 'API url', 'https://api.pro.coinbase.com')
    .option('--ws [value]', 'WSI url', 'https://ws-feed.pro.coinbase.com')
    .option('-p --product [value]', 'The Coinbase Pro product to query', 'BTC-USD')
    .parse(process.argv);

const wsURL = program.ws;
const apiURL = program.api;
const product = program.product;
const logger = ConsoleLoggerFactory();
const key = program.key || process.env.COINBASE_PRO_KEY;
const auth: CoinbaseProAuthConfig = key ? {
    key: key,
    secret: program.secret || process.env.COINBASE_PRO_SECRET,
    passphrase: program.passphrase || process.env.COINBASE_PRO_PASSPHRASE
} : null;
const options: CoinbaseProFeedConfig = {
    wsUrl: wsURL,
    apiUrl: apiURL,
    channels: ['level2', 'matches', 'user', 'ticker'],
    auth: auth,
    logger: logger
};
getSubscribedFeeds(options, [product]).then((feed: CoinbaseProFeed) => {
    feed.on('data', (msg: any) => {
        logger.log('info', JSON.stringify(msg));
    });
}).catch((err) => {
    logger.log('error', err.message);
    process.exit(1);
});
