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

import { ConsoleLoggerFactory } from '../utils/Logger';
import { BittrexFeed } from '../exchanges/bittrex/BittrexFeed';
import { ExchangeFeedConfig } from '../exchanges/ExchangeFeed';
import { LiveOrderbook, SkippedMessageEvent } from '../core/LiveOrderbook';
import { Ticker } from '../exchanges/PublicExchangeAPI';
import { printOrderbook, printTicker } from '../utils/printers';
import { TradeMessage } from '../core/Messages';

const logger = ConsoleLoggerFactory();
const product: string = 'BTC-ETH';

const config: ExchangeFeedConfig = {
    logger: logger,
    auth: null,
    wsUrl: null
};

const feed: BittrexFeed = new BittrexFeed(config);

feed.on('websocket-connection', () => {
    feed.subscribe([product]).then(() => {
        doSomethingWithFeed();
    });
});

function doSomethingWithFeed() {
    const book = new LiveOrderbook({ logger: logger, product: product, strictMode: false });
    book.on('LiveOrderbook.snapshot', () => {
        logger.log('info', 'Snapshot received by LiveOrderbook Demo');
        setInterval(() => {
            console.log(printOrderbook(book, 10, 4, 4));
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
        feed.reconnect(1000);
    });
    book.on('end', () => {
        console.log('Orderbook closed');
    });
    book.on('error', (err: Error) => {
        console.log('Livebook errored: ', err);
        feed.pipe(book);
    });
    feed.pipe(book);
}
