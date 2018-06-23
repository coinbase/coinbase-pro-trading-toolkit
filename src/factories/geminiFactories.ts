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
import { GeminiMarketFeed } from '../exchanges/gemini/GeminiMarketFeed';
import { GEMINI_WS_FEED, PRODUCT_MAP } from '../exchanges/gemini/GeminiCommon';
import { ExchangeAuthConfig } from '../exchanges/AuthConfig';
import * as GI from '../exchanges/gemini/GeminiInterfaces';
import { Logger } from '../utils/Logger';
import { getFeed } from '../exchanges/ExchangeFeed';

export function getSubscribedFeeds(options: any, symbol: string): Promise<GeminiMarketFeed> {
    return new Promise((resolve) => {
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
                return resolve(feed);
            });
        } else {
            return resolve(feed);
        }
    });
}

export function FeedFactory(logger: Logger, symbol: string, auth?: ExchangeAuthConfig): Promise<GeminiMarketFeed> {
    auth = auth || {
        key: process.env.GEMINI_KEY,
        secret: process.env.GEMINI_SECRET
    };
    let productPromise: Promise<string>;
    const gemSymbol = PRODUCT_MAP[symbol];
    if (gemSymbol) {
        productPromise = Promise.resolve(gemSymbol);
    } else {
        return Promise.reject(
            new Error('gemSymbol must be btcusd, ethusd, or ethbtc')
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
