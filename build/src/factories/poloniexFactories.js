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
const PoloniexFeed_1 = require("../exchanges/poloniex/PoloniexFeed");
const PoloniexCommon_1 = require("../exchanges/poloniex/PoloniexCommon");
const ExchangeFeed_1 = require("../exchanges/ExchangeFeed");
const ccxt_1 = require("../exchanges/ccxt");
let publicAPIInstance;
/**
 * A convenience function that returns a GDAXExchangeAPI instance for accessing REST methods conveniently. If API
 * key details are found in the GDAX_KEY etc. envars, they will be used
 */
function DefaultAPI(logger) {
    if (!publicAPIInstance) {
        publicAPIInstance = ccxt_1.default.createExchange('poloniex', { key: process.env.POLONIEX_KEY, secret: process.env.POLONIEX_SECRET }, logger);
    }
    return publicAPIInstance;
}
exports.DefaultAPI = DefaultAPI;
/**
 * Convenience function to connect to and subscribe to the given channels
 * @param options {object} Any options from GDAXConfig will be accepted
 * @param products {string[]} An array of products to subscribe to
 */
function getSubscribedFeeds(options, products) {
    return PoloniexCommon_1.getAllProductInfo(false, options.logger).then((info) => {
        const config = {
            wsUrl: options.wsUrl || PoloniexCommon_1.POLONIEX_WS_FEED,
            auth: options.auth,
            logger: options.logger,
            tickerChannel: !!options.tickerChannel
        };
        const feed = ExchangeFeed_1.getFeed(PoloniexFeed_1.PoloniexFeed, config);
        if (!feed.isConnected()) {
            if (!feed.isConnecting()) {
                feed.reconnect(0);
            }
            feed.once('websocket-open', () => {
                subscribeToAll(products, feed, info);
            });
        }
        else {
            subscribeToAll(products, feed, info);
        }
        return Promise.resolve(feed);
    });
}
exports.getSubscribedFeeds = getSubscribedFeeds;
function subscribeToAll(products, feed, info) {
    products.forEach((product) => {
        const id = getChannelId(product, info);
        if (id > 0) {
            feed.subscribe(id);
        }
    });
}
function getChannelId(product, info) {
    let result;
    for (const id in info) {
        const symbol = info[id].id;
        const found = (symbol === product) || (symbol === PoloniexCommon_1.gdaxToPolo(product));
        result = found ? info[id].sourceData.id : -1;
        if (found) {
            break;
        }
    }
    return result;
}
/**
 * This is a straightforward wrapper around getSubscribedFeeds using the Factory pattern with the most commonly used
 * defaults. For customised feeds, use getSubscribedFeeds instead.
 *
 * It is assumed that your API keys are stored in the GDAX_KEY, GDAX_SECRET and GDAX_PASSPHRASE envars
 */
function FeedFactory(logger, products, auth) {
    // auth = auth || {
    //         key: process.env.POLONIEX_KEY,
    //         secret: process.env.POLONIEX_SECRET,
    //     };
    auth = null; // Polo doesn't provide auth feeds yet
    return getSubscribedFeeds({ auth: auth, logger: logger, tickerChannel: true }, products);
}
exports.FeedFactory = FeedFactory;
//# sourceMappingURL=poloniexFactories.js.map