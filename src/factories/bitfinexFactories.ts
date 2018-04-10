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

import { BitfinexExchangeAPI } from '../exchanges/bitfinex/BitfinexExchangeAPI';
import { Logger } from '../utils/Logger';
import { BitfinexFeed,
         BitfinexFeedConfig } from '../exchanges/bitfinex/BitfinexFeed';
import { ExchangeAuthConfig } from '../exchanges/AuthConfig';
import { BITFINEX_WS_FEED,
         PRODUCT_MAP } from '../exchanges/bitfinex/BitfinexCommon';
import { Product } from '../exchanges/PublicExchangeAPI';
import { getFeed } from '../exchanges/ExchangeFeed';

let publicAPIInstance: BitfinexExchangeAPI;
/**
 * A convenience function that returns a BitfinexExchangeAPI instance for accessing REST methods conveniently. If API
 * key details are found in the BITFINEX_KEY etc. envars, they will be used
 * @returns {PublicExchangeAPI}
 */
export function DefaultAPI(logger: Logger): BitfinexExchangeAPI {
    if (!publicAPIInstance) {
        publicAPIInstance = new BitfinexExchangeAPI({
            logger: logger,
            auth: {
                key: process.env.BITFINEX_KEY,
                secret: process.env.BITFINEX_SECRET,
            }
        });
    }
    return publicAPIInstance;
}

/**
 * Convenience function to connect to and subscribe to the given channels
 * @param wsUrl {string} the WS feed to connect to
 * @param products {string[]} An array of products to subscribe to
 * @param auth
 * @param logger
 */
export function getSubscribedFeeds(wsUrl: string, products: string[], auth?: ExchangeAuthConfig, logger?: Logger, bookDepth?: number): Promise<BitfinexFeed> {
    return new Promise((resolve) => {
        const config: BitfinexFeedConfig = {
            wsUrl: wsUrl,
            auth: auth,
            logger: logger,
            standardMessages: true,
            snapshotDepth: bookDepth || 250
        };
        const feed = getFeed<BitfinexFeed, BitfinexFeedConfig>(BitfinexFeed, config);
        feed.once('websocket-open', () => {
            products.forEach((gdaxProduct: string) => {
                const product = PRODUCT_MAP[gdaxProduct] || gdaxProduct;
                feed.subscribe('ticker', product);
                feed.subscribe('trades', product);
                feed.subscribe('book', product);
            });
            return resolve(feed);
        });
    });
}

/**
 * This is a straightforward wrapper around getSubscribedFeeds using the Factory pattern with the most commonly used
 * defaults. For customised feeds, use getSubscribedFeeds instead.
 *
 * It is assumed that your API keys are stored in the BITFINEX_KEY and BITFINEX_SECRET envars
 */
export function FeedFactory(logger: Logger, productIDs?: string[]): Promise<BitfinexFeed> {
    const auth: ExchangeAuthConfig = {
        key: process.env.BITFINEX_KEY,
        secret: process.env.BITFINEX_SECRET
    };
    // Use the Bitfinex API to get, and subscribe to all the endpoints
    let productPromise: Promise<string[]>;
    if (productIDs) {
        productPromise = Promise.resolve(productIDs);
    } else {
        productPromise = DefaultAPI(logger)
            .loadProducts()
            .then((products: Product[]) => {
                const ids = products.map((p) => p.id);
                return ids;
            });
    }
    return productPromise.then((productIds: string[]) => {
        return getSubscribedFeeds(BITFINEX_WS_FEED, productIds, auth, logger);
    });
}
