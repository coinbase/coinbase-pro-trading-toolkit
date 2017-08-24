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
import { isOrderbookMessage, OrderbookMessage } from '../core/Messages';
import { HFTFilter } from '../core/HFTFilter';
import { getSubscribedFeeds } from '../factories/gdaxFactories';
import { MessageQueue, MessageQueueConfig } from '../core/MessageQueue';
import { GDAXFeedConfig } from '../exchanges/gdax/GDAXFeed';

const products = ['BTC-USD', 'BTC-EUR', 'ETH-USD'];
const icons = ['.', 'x', '+'];

// Create a single logger instance to pass around
const logger = ConsoleLoggerFactory();
const tally: { [index: string]: number } = { filtered: 0 };
// Let's subscribe to more than one product to illustrate the product filter
const options: GDAXFeedConfig = {
    wsUrl: 'https://ws-feed.gdax.com',
    apiUrl: 'https://api.gdax.com',
    logger: logger,
    channels: null,
    auth: null,
};
getSubscribedFeeds(options, products).then((feed) => {
// FeedFactory(logger, products).then(feed => {
    // Configure all message streams to use the same websocket feed
    function config(product: string): MessageQueueConfig {
        return {
            product: product,
            logger: logger,
            targetQueueLength: 3,
            waitForSnapshot: true
        };
    }

    // create the source message streams by creating a MessageStream for each product, using the same WS feed for each
    const streams = products.map((product) => new MessageQueue(config(product)));
    const hftFilter = new HFTFilter({ logger: logger, targetQueueLength: 100 });
    // Lets do some stuff with each stream
    streams.forEach((stream: MessageQueue, i: number) => {
        // Print a symbol for each message
        stream.on('data', (msg: OrderbookMessage) => {
            if (!isOrderbookMessage(msg)) {
                return;
            }
            process.stdout.write(icons[i]);
            if (!tally[msg.productId]) {
                tally[msg.productId] = 0;
            }
            tally[msg.productId] += 1;
        });
        // Log an error if messages are out of order
        stream.on('messageOutOfSequence', (msg: OrderbookMessage, expected: number) => {
            logger.log('error', `Message out of order on ${msg.productId}. Expected ${expected} but received ${msg.sequence}`);
        });
    });

    feed.on('error', (err: Error) => {
        logger.log('error', 'Feed error', err);
    });
    // Pipe the BTC-USD stream through a HFT filter
    feed.pipe(streams[0]).pipe(hftFilter);
    feed.pipe(streams[1]);
    feed.pipe(streams[2]);
    hftFilter.on('data', () => {
        process.stdout.write('o');
        tally.filtered += 1;
    });
    setInterval(() => {
        process.stdout.write('\n');
        logger.log('info', 'Filtered stats', hftFilter.getStats());
        logger.log('info', 'Tallies', tally);
        // reset tallies
        for (const key in tally) {
            tally[key] = 0;
        }
    }, 10000);
});
