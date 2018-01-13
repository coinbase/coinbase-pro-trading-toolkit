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
const Messages_1 = require("../core/Messages");
const HFTFilter_1 = require("../core/HFTFilter");
const gdaxFactories_1 = require("../factories/gdaxFactories");
const MessageQueue_1 = require("../core/MessageQueue");
const products = ['BTC-USD', 'BTC-EUR', 'ETH-USD'];
const icons = ['.', 'x', '+'];
// Create a single logger instance to pass around
const logger = Logger_1.ConsoleLoggerFactory();
const tally = { filtered: 0 };
// Let's subscribe to more than one product to illustrate the product filter
const options = {
    wsUrl: 'https://ws-feed.gdax.com',
    apiUrl: 'https://api.gdax.com',
    logger: logger,
    channels: null,
    auth: null,
};
gdaxFactories_1.getSubscribedFeeds(options, products).then((feed) => {
    // FeedFactory(logger, products).then(feed => {
    // Configure all message streams to use the same websocket feed
    function config(product) {
        return {
            product: product,
            logger: logger,
            targetQueueLength: 3,
            waitForSnapshot: true
        };
    }
    // create the source message streams by creating a MessageStream for each product, using the same WS feed for each
    const streams = products.map((product) => new MessageQueue_1.MessageQueue(config(product)));
    const hftFilter = new HFTFilter_1.HFTFilter({ logger: logger, targetQueueLength: 100 });
    // Lets do some stuff with each stream
    streams.forEach((stream, i) => {
        // Print a symbol for each message
        stream.on('data', (msg) => {
            if (!Messages_1.isOrderbookMessage(msg)) {
                return;
            }
            process.stdout.write(icons[i]);
            if (!tally[msg.productId]) {
                tally[msg.productId] = 0;
            }
            tally[msg.productId] += 1;
        });
        // Log an error if messages are out of order
        stream.on('messageOutOfSequence', (msg, expected) => {
            logger.log('error', `Message out of order on ${msg.productId}. Expected ${expected} but received ${msg.sequence}`);
        });
    });
    feed.on('error', (err) => {
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
//# sourceMappingURL=filteredStreamDemo.js.map