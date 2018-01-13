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
const BittrexAPI_1 = require("../exchanges/bittrex/BittrexAPI");
const BittrexFeed_1 = require("../exchanges/bittrex/BittrexFeed");
let publicAPIInstance;
/**
 * A convenience function that returns a GDAXExchangeAPI instance for accessing REST methods conveniently. If API
 * key details are found in the GDAX_KEY etc. envars, they will be used
 */
function DefaultAPI(logger) {
    if (!publicAPIInstance) {
        publicAPIInstance = new BittrexAPI_1.BittrexAPI({
            key: process.env.BITTREX_KEY,
            secret: process.env.BITTREX_SECRET
        }, logger);
    }
    return publicAPIInstance;
}
exports.DefaultAPI = DefaultAPI;
/**
 * Convenience function to connect to and subscribe to the given channels. Bittrex uses SignalR, which handles reconnects for us,
 * so this is a much simpler function than some of the other exchanges' methods.
 */
function getSubscribedFeeds(options, products) {
    return new Promise((resolve, reject) => {
        const feed = new BittrexFeed_1.BittrexFeed(options);
        const timeout = setTimeout(() => {
            return reject(new Error('TIMEOUT. Could not connect to Bittrex Feed server'));
        }, 30000);
        feed.on('websocket-connection', () => {
            feed.subscribe(products).then(() => {
                clearTimeout(timeout);
                return resolve(feed);
            }).catch((err) => {
                return reject(err);
            });
        });
    });
}
exports.getSubscribedFeeds = getSubscribedFeeds;
/**
 * This is a straightforward wrapper around getSubscribedFeeds using the Factory pattern with the most commonly used
 * defaults. For customised feeds, use getSubscribedFeeds instead. It's really not adding much, but we keep it here
 * to maintain a consistent method naming strategy amongst all the exchanges
 *
 * It is assumed that your API keys are stored in the BITTREX_KEY and BITTREX_SECRET envars
 */
function FeedFactory(logger, productIds, auth) {
    auth = auth || {
        key: process.env.BITTREX_KEY,
        secret: process.env.BITTREX_SECRET
    };
    // There are too many books on Bittrex to just subscribe to all of them, so productIds is a required param
    return getSubscribedFeeds({ auth: auth, logger: logger, wsUrl: null }, productIds);
}
exports.FeedFactory = FeedFactory;
//# sourceMappingURL=bittrexFactories.js.map