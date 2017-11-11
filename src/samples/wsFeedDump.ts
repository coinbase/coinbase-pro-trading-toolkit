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
import { getSubscribedFeeds } from '../factories/gdaxFactories';
import { ConsoleLoggerFactory } from '../utils/Logger';
import { GDAXFeed, GDAXFeedConfig } from '../exchanges/gdax/GDAXFeed';
import { GDAXAuthConfig } from '../exchanges/gdax/GDAXInterfaces';

program
    .option('--api [value]', 'API url', 'https://api.gdax.com')
    .option('--ws [value]', 'WSI url', 'https://ws-feed.gdax.com')
    .option('-p --product [value]', 'The GDAX product to query', 'BTC-USD')
    .parse(process.argv);

const wsURL = program.ws;
const apiURL = program.api;
const product = program.product;
const logger = ConsoleLoggerFactory();
const key = program.key || process.env.GDAX_KEY;
const auth: GDAXAuthConfig = key ? {
    key: key,
    secret: program.secret || process.env.GDAX_SECRET,
    passphrase: program.passphrase || process.env.GDAX_PASSPHRASE
} : null;
const options: GDAXFeedConfig = {
    wsUrl: wsURL,
    apiUrl: apiURL,
    channels: ['level2', 'matches', 'user', 'ticker'],
    auth: auth,
    logger: logger
};
getSubscribedFeeds(options, [product]).then((feed: GDAXFeed) => {
    feed.on('data', (msg: any) => {
        logger.log('info', JSON.stringify(msg));
    });
}).catch((err) => {
    logger.log('error', err.message);
    process.exit(1);
});
