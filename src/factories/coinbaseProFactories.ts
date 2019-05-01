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

import { COINBASE_PRO_WS_FEED,
         CoinbaseProFeed,
         CoinbaseProFeedConfig } from '../exchanges/coinbasePro/CoinbaseProFeed';
import { COINBASE_PRO_API_URL,
         CoinbaseProExchangeAPI } from '../exchanges/coinbasePro/CoinbaseProExchangeAPI';
import { Product } from '../exchanges/PublicExchangeAPI';
import { Logger } from '../utils/Logger';
import { getFeed } from '../exchanges/ExchangeFeed';
import { CoinbaseProAuthConfig } from '../exchanges/coinbasePro/CoinbaseProInterfaces';

let publicAPIInstance: CoinbaseProExchangeAPI;

function getAuthFromEnv(): null | CoinbaseProAuthConfig {
    const env = process.env;
    if (env.COINBASE_PRO_KEY && env.COINBASE_PRO_SECRET && env.COINBASE_PRO_PASSPHRASE) {
        return {
            key: env.COINBASE_PRO_KEY,
            secret: env.COINBASE_PRO_SECRET,
            passphrase: env.COINBASE_PRO_PASSPHRASE
        };
    } else {
        return null;
    }
}

/**
 * A convenience function that returns a CoinbaseProExchangeAPI instance for accessing REST methods conveniently. If API
 * key details are found in the COINBASE_PRO_KEY etc. envars, they will be used
 */
export function DefaultAPI(logger: Logger): CoinbaseProExchangeAPI {
    if (!publicAPIInstance) {
        publicAPIInstance = new CoinbaseProExchangeAPI({
            logger: logger,
            apiUrl: COINBASE_PRO_API_URL,
            auth: getAuthFromEnv()
        });
    }
    return publicAPIInstance;
}

/**
 * Convenience function to connect to and subscribe to the given channels
 * @param options {object} Any options from CoinbaseProConfig will be accepted
 * @param products {string[]} An array of products to subscribe to
 */
export function getSubscribedFeeds(options: any, products: string[]): Promise<CoinbaseProFeed> {
    const config: CoinbaseProFeedConfig = {
        wsUrl: options.wsUrl || COINBASE_PRO_WS_FEED,
        auth: options.auth,
        logger: options.logger,
        apiUrl: options.apiUrl || COINBASE_PRO_API_URL,
        channels: options.channels || null
    };
    const feed = getFeed<CoinbaseProFeed, CoinbaseProFeedConfig>(CoinbaseProFeed, config);
    if (feed.isConnected()) {
        return feed.subscribe(products).then(() => {
            return feed;
        });
    }
    return new Promise((resolve) => {
        if (!feed.isConnecting) {
            feed.reconnect(50);
        }
        feed.once('websocket-open', () => {
            feed.subscribe(products).then(() => {
                return resolve(feed);
            });
        });
    });
}

/**
 * This is a straightforward wrapper around getSubscribedFeeds using the Factory pattern with the most commonly used
 * defaults. For customised feeds, use getSubscribedFeeds instead.
 *
 * It is assumed that your API keys are stored in the COINBASE_PRO_KEY, COINBASE_PRO_SECRET and COINBASE_PRO_PASSPHRASE envars
 */
export function FeedFactory(logger: Logger, productIDs?: string[], auth?: CoinbaseProAuthConfig): Promise<CoinbaseProFeed> {
    auth = auth || getAuthFromEnv();
    // Use the Coinbase Pro API to get, and subscribe to all the endpoints
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
        return getSubscribedFeeds({ auth: auth, logger: logger }, productIds);
    }).catch((err) => {
        if (logger) {
            logger.error(err);
        } else {
            console.error(err);
        }
        return null;
    });
}
