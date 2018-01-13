"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const Logger_1 = require("../utils/Logger");
const BitmexMarketFeed_1 = require("../exchanges/bitmex/BitmexMarketFeed");
const LiveOrderbook_1 = require("../core/LiveOrderbook");
const printers_1 = require("../utils/printers");
const logger = Logger_1.ConsoleLoggerFactory();
const productId = 'XBTUSD';
const config = {
    logger: logger,
    auth: null,
    wsUrl: null,
};
const feed = new BitmexMarketFeed_1.BitmexMarketFeed(config);
feed.on('websocket-open', () => {
    feed.subscribe([productId]);
});
const book = new LiveOrderbook_1.LiveOrderbook({ logger: logger, product: productId, strictMode: false });
book.on('LiveOrderbook.snapshot', () => {
    logger.log('info', 'Snapshot received by LiveOrderbook Demo');
    setInterval(() => {
        console.log(printers_1.printOrderbook(book, 10, 4, 4));
    }, 5000);
});
book.on('LiveOrderbook.ticker', (ticker) => {
    console.log(printers_1.printTicker(ticker));
});
book.on('LiveOrderbook.trade', (trade) => {
    logger.log('info', `${trade.side} ${trade.size} on ${trade.productId} at ${trade.price}`);
});
book.on('LiveOrderbook.skippedMessage', (details) => {
    console.log('SKIPPED MESSAGE', details);
    console.log('Reconnecting to feed');
    feed.reconnect(1000);
});
book.on('end', () => {
    console.log('Orderbook closed');
});
book.on('error', (err) => {
    console.log('Livebook errored: ', err);
    feed.pipe(book);
});
feed.pipe(book);
//# sourceMappingURL=bitmexWSDemo.js.map