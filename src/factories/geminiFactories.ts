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
import { GEMINI_WS_FEED, GeminiMarketFeed } from '../exchanges/gemini/GeminiMarketFeed';
import { GEMINI_API_URL, GeminiExchangeAPI } from '../exchanges/gemini/GeminiExchangeAPI';
import { ExchangeAuthConfig } from '../exchanges/AuthConfig';
import * as GI from '../exchanges/gemini/GeminiInterfaces';
import { Logger } from '../utils/Logger';
import { getFeed } from '../exchanges/ExchangeFeed';

let publicAPIInstance: GeminiExchangeAPI;

export function DefaultAPI(logger: Logger): GeminiExchangeAPI {
    if (!publicAPIInstance) {
        publicAPIInstance = new GeminiExchangeAPI({
            logger: logger,
            apiUrl: GEMINI_API_URL,
            auth: {
                key: process.env.GEMINI_KEY,
                secret: process.env.GEMINI_SECRET
            }
        });
    }
    return publicAPIInstance;
}

export function getSubscribedFeeds(options: any, symbol: string): Promise<GeminiMarketFeed> {
    return new Promise((resolve, reject) => {
        //const logger = options.logger;
        const config: GI.GeminiMarketFeedConfig = {
            wsUrl: (options.wsUrl || GEMINI_WS_FEED) + symbol,
            auth: null,
            logger: options.logger,
            productId: symbol
        };
        const feed = getFeed<GeminiMarketFeed, GI.GeminiMarketFeedConfig>(GeminiMarketFeed, config);
        if (!feed.isConnected()) {
            feed.reconnect(0);
            feed.on('websocket-open', () => {
                //feed.subscribe(symbol).then(() => {
                    return resolve(feed);
                //}).catch((err) => {
                //    if (logger) {
                //        logger.log('error', 'A websocket connection to Gemini was established, but product subscription failed.', { reason: err.message });
                //    }
                //    return reject(err);
                //});
            });
        } else {
            //feed.subscribe(symbol).then(() => {
                return resolve(feed);
            //}).catch((err) => {
            //    if (logger) {
            //        logger.log('error', 'The subscription request to the Gemini WS feed failed', { reason: err.message });
            //    }
            //    return reject(err);
            //});
        }
    });
}

export function FeedFactory(logger: Logger, symbol: string, auth?: ExchangeAuthConfig): Promise<GeminiMarketFeed> {
    auth = auth || {
            key: process.env.GEMINI_KEY,
            secret: process.env.GEMINI_SECRET
        };
    let productPromise: Promise<string>;
    if (symbol) {
        productPromise = Promise.resolve(symbol);
    } else {
        return Promise.reject(
            new Error('productId must be btcusd, ethusd, or ethbtc')
        );
    }
    return productPromise.then((productId: string) => {
        return getSubscribedFeeds({ auth: auth, logger: logger }, productId);
    }).catch((err) => {
        if (logger) {
            logger.error(err);
        } else {
            console.error(err);
        }
        return null;
    });
}
