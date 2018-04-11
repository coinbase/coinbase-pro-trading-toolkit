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

import { Logger } from '../utils/Logger';
import { PoloniexFeed,
         PoloniexFeedConfig } from '../exchanges/poloniex/PoloniexFeed';
import { gdaxToPolo,
         getAllProductInfo,
         POLONIEX_WS_FEED,
         PoloniexProducts } from '../exchanges/poloniex/PoloniexCommon';
import { getFeed } from '../exchanges/ExchangeFeed';
import { ExchangeAuthConfig } from '../exchanges/AuthConfig';
import CCXTExchangeWrapper from '../exchanges/ccxt';

let publicAPIInstance: CCXTExchangeWrapper;

/**
 * A convenience function that returns a GDAXExchangeAPI instance for accessing REST methods conveniently. If API
 * key details are found in the GDAX_KEY etc. envars, they will be used
 */
export function DefaultAPI(logger: Logger): CCXTExchangeWrapper {
    if (!publicAPIInstance) {
        publicAPIInstance = CCXTExchangeWrapper.createExchange('poloniex', { key: process.env.POLONIEX_KEY, secret: process.env.POLONIEX_SECRET }, logger);
    }
    return publicAPIInstance;
}

/**
 * Convenience function to connect to and subscribe to the given channels
 * @param options {object} Any options from GDAXConfig will be accepted
 * @param products {string[]} An array of products to subscribe to
 */
export function getSubscribedFeeds(options: any, products: string[]): Promise<PoloniexFeed> {
    return getAllProductInfo(false, options.logger).then((info: PoloniexProducts) => {
        const config: PoloniexFeedConfig = {
            wsUrl: options.wsUrl || POLONIEX_WS_FEED,
            auth: options.auth,
            logger: options.logger,
            tickerChannel: !!options.tickerChannel
        };
        const feed = getFeed<PoloniexFeed, PoloniexFeedConfig>(PoloniexFeed, config);
        if (!feed.isConnected()) {
            if (!feed.isConnecting()) {
                feed.reconnect(0);
            }

            feed.once('websocket-open', () => {
                subscribeToAll(products, feed, info);
            });
        } else {
            subscribeToAll(products, feed, info);
        }
        return Promise.resolve(feed);
    });
}

function subscribeToAll(products: string[], feed: PoloniexFeed, info: PoloniexProducts) {
    products.forEach((product: string) => {
        const id: number = getChannelId(product, info);
        if (id > 0) {
            feed.subscribe(id);
        }
    });
}

function getChannelId(product: string, info: PoloniexProducts): number {
    let result: number;
    for (const id in info) {
        const symbol = info[id].id;
        const found = (symbol === product) || (symbol === gdaxToPolo(product));
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
export function FeedFactory(logger: Logger, products: string[], auth?: ExchangeAuthConfig): Promise<PoloniexFeed> {
    // auth = auth || {
    //         key: process.env.POLONIEX_KEY,
    //         secret: process.env.POLONIEX_SECRET,
    //     };
    auth = null; // Polo doesn't provide auth feeds yet
    return getSubscribedFeeds({ auth: auth, logger: logger, tickerChannel: true }, products);
}
