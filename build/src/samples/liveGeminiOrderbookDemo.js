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
const printers_1 = require("../utils/printers");
const geminiFactories_1 = require("../factories/geminiFactories");
const LiveOrderbook_1 = require("../core/LiveOrderbook");
const product = 'BTC-USD';
const logger = Logger_1.ConsoleLoggerFactory();
geminiFactories_1.FeedFactory(logger, product).then((feed) => {
    const liveBookConfig = {
        product: product,
        logger: logger
    };
    const book = new LiveOrderbook_1.LiveOrderbook(liveBookConfig);
    book.on('LiveOrderbook.snapshot', () => {
        logger.log('info', 'Snapshot received');
        setInterval(() => {
            console.log(printers_1.printOrderbook(book, 20, 4, 6));
        }, 2000);
    });
    book.on('LiveOrderbook.ticker', (ticker) => {
        console.log(printers_1.printTicker(ticker, 6));
    });
    book.on('LiveOrderbook.trade', (trade) => {
        logger.log('info', `${trade.side} ${trade.size} on ${trade.productId} at ${trade.price}`);
    });
    book.on('end', () => {
        console.log('Orderbook closed');
    });
    feed.pipe(book);
});
//# sourceMappingURL=liveGeminiOrderbookDemo.js.map