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
const BitfinexExchangeAPI_1 = require("../exchanges/bitfinex/BitfinexExchangeAPI");
const BitfinexFeed_1 = require("../exchanges/bitfinex/BitfinexFeed");
const BitfinexCommon_1 = require("../exchanges/bitfinex/BitfinexCommon");
const ExchangeFeed_1 = require("../exchanges/ExchangeFeed");
let publicAPIInstance;
/**
 * A convenience function that returns a BitfinexExchangeAPI instance for accessing REST methods conveniently. If API
 * key details are found in the BITFINEX_KEY etc. envars, they will be used
 * @returns {PublicExchangeAPI}
 */
function DefaultAPI(logger) {
    if (!publicAPIInstance) {
        publicAPIInstance = new BitfinexExchangeAPI_1.BitfinexExchangeAPI({
            logger: logger,
            auth: {
                key: process.env.BITFINEX_KEY,
                secret: process.env.BITFINEX_SECRET,
            }
        });
    }
    return publicAPIInstance;
}
exports.DefaultAPI = DefaultAPI;
/**
 * Convenience function to connect to and subscribe to the given channels
 * @param wsUrl {string} the WS feed to connect to
 * @param products {string[]} An array of products to subscribe to
 * @param auth
 * @param logger
 */
function getSubscribedFeeds(wsUrl, products, auth, logger, bookDepth) {
    return new Promise((resolve) => {
        const config = {
            wsUrl: wsUrl,
            auth: auth,
            logger: logger,
            standardMessages: true,
            snapshotDepth: bookDepth || 250
        };
        const feed = ExchangeFeed_1.getFeed(BitfinexFeed_1.BitfinexFeed, config);
        feed.once('websocket-open', () => {
            products.forEach((gdaxProduct) => {
                const product = BitfinexCommon_1.PRODUCT_MAP[gdaxProduct] || gdaxProduct;
                feed.subscribe('ticker', product);
                feed.subscribe('trades', product);
                feed.subscribe('book', product);
            });
            return resolve(feed);
        });
    });
}
exports.getSubscribedFeeds = getSubscribedFeeds;
/**
 * This is a straightforward wrapper around getSubscribedFeeds using the Factory pattern with the most commonly used
 * defaults. For customised feeds, use getSubscribedFeeds instead.
 *
 * It is assumed that your API keys are stored in the BITFINEX_KEY and BITFINEX_SECRET envars
 */
function FeedFactory(logger, productIDs) {
    const auth = {
        key: process.env.BITFINEX_KEY,
        secret: process.env.BITFINEX_SECRET
    };
    // Use the Bitfinex API to get, and subscribe to all the endpoints
    let productPromise;
    if (productIDs) {
        productPromise = Promise.resolve(productIDs);
    }
    else {
        productPromise = DefaultAPI(logger)
            .loadProducts()
            .then((products) => {
            const ids = products.map((p) => p.id);
            return Promise.resolve(ids);
        });
    }
    return productPromise.then((productIds) => {
        return getSubscribedFeeds(BitfinexCommon_1.BITFINEX_WS_FEED, productIds, auth, logger);
    });
}
exports.FeedFactory = FeedFactory;
//# sourceMappingURL=bitfinexFactories.js.map