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
import { printTicker } from '../utils/printers';
import { GDAXFeed } from '../exchanges/gdax/GDAXFeed';
import { DefaultAPI, getSubscribedFeeds } from '../factories/gdaxFactories';
import { LiveBookConfig,
         LiveOrderbook,
         SkippedMessageEvent } from '../core/LiveOrderbook';
import { Ticker } from '../exchanges/PublicExchangeAPI';
import { TradeMessage } from '../core/Messages';
import { OrderbookDiff } from '../lib/OrderbookDiff';
import { BookBuilder } from '../lib/BookBuilder';
import { PriceLevel } from '../lib/Orderbook';

const product = 'LTC-USD';
const logger = ConsoleLoggerFactory({ level: 'debug' });

/*
 Simple demo that sets up a live order book and then periodically compares it to a snapshot obtained via the REST
 API. There will be slight differences since the snapshots will arrive with slightly different sequence numbers typically,
 but diffs will be smaller the closer the sequence difference is to zero.
 */

const options = {
    wsUrl: process.env.WS_URL || 'wss://ws-feed.gdax.com',
    logger: logger
};

getSubscribedFeeds(options, [product]).then((feed: GDAXFeed) => {
// Configure the live book object
    const config: LiveBookConfig = {
        product: product,
        logger: logger
    };
    const book = new LiveOrderbook(config);
    book.on('LiveOrderbook.snapshot', () => {
        logger.log('info', 'Snapshot received by LiveOrderbook Demo');
        setInterval(() => {
            // Do a diff of the memory orderbook and the REST results.
            DefaultAPI(logger).loadOrderbook(product).then((actual: BookBuilder) => {
                    print_diff(book, actual);
            });
        }, 5000);
    });
    book.on('LiveOrderbook.ticker', (ticker: Ticker) => {
        console.log(printTicker(ticker));
    });
    book.on('LiveOrderbook.trade', (trade: TradeMessage) => {
        logger.log('info', `${trade.side} ${trade.size} on ${trade.productId} at ${trade.price}`);
    });
    book.on('LiveOrderbook.skippedMessage', (details: SkippedMessageEvent) => {
        console.log('SKIPPED MESSAGE', details);
        console.log('Reconnecting to feed');
        feed.reconnect(0);
    });
    book.on('end', () => {
        console.log('Orderbook closed');
    });
    book.on('error', (err: Error) => {
        console.log('Livebook errored: ', err);
        feed.pipe(book);
    });
    feed.pipe(book);
});

function print_diff(book: LiveOrderbook, actual: BookBuilder) {
    const diff = OrderbookDiff.compareByLevel(book.book, actual, false);
    const seqDiff = book.sourceSequence - actual.sequence;
    console.log(`-------------------      Orderbook differences (${book.sourceSequence} - ${actual.sequence} = ${seqDiff}) ------------------------`);
    console.log('Bids:');
    diff.bids.forEach((level: PriceLevel) => console.log(`Price: \$${level.price.toFixed(3)}    Difference: ${level.totalSize.toFixed(4)}`));
    console.log('Asks:');
    diff.asks.forEach((level: PriceLevel) => console.log(`Price: \$${level.price.toFixed(3)}    Difference: ${level.totalSize.toFixed(4)}`));
    console.log('-----------------------------------------------------------------------------');
}
