"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
const GeminiMarketFeed_1 = require("../exchanges/gemini/GeminiMarketFeed");
const GeminiCommon_1 = require("../exchanges/gemini/GeminiCommon");
const ExchangeFeed_1 = require("../exchanges/ExchangeFeed");
function getSubscribedFeeds(options, symbol) {
    return new Promise((resolve, reject) => {
        const config = {
            wsUrl: (options.wsUrl || GeminiCommon_1.GEMINI_WS_FEED) + symbol,
            auth: null,
            logger: options.logger,
            productId: symbol
        };
        const feed = ExchangeFeed_1.getFeed(GeminiMarketFeed_1.GeminiMarketFeed, config);
        if (!feed.isConnected()) {
            feed.reconnect(0);
            feed.on('websocket-open', () => {
                return resolve(feed);
            });
        }
        else {
            return resolve(feed);
        }
    });
}
exports.getSubscribedFeeds = getSubscribedFeeds;
function FeedFactory(logger, symbol, auth) {
    auth = auth || {
        key: process.env.GEMINI_KEY,
        secret: process.env.GEMINI_SECRET
    };
    let productPromise;
    const gemSymbol = GeminiCommon_1.PRODUCT_MAP[symbol];
    if (gemSymbol) {
        productPromise = Promise.resolve(gemSymbol);
    }
    else {
        return Promise.reject(new Error('gemSymbol must be btcusd, ethusd, or ethbtc'));
    }
    return productPromise.then((productId) => {
        return getSubscribedFeeds({ auth: auth, logger: logger }, productId);
    }).catch((err) => {
        if (logger) {
            logger.error(err);
        }
        else {
            console.error(err);
        }
        return null;
    });
}
exports.FeedFactory = FeedFactory;
//# sourceMappingURL=geminiFactories.js.map