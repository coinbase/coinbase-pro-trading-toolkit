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
import { BitfinexFeed } from '../exchanges/bitfinex/BitfinexFeed';
import { ExchangeAuthConfig } from '../exchanges/AuthConfig';
/**
 * A convenience function that returns a BitfinexExchangeAPI instance for accessing REST methods conveniently. If API
 * key details are found in the BITFINEX_KEY etc. envars, they will be used
 * @returns {PublicExchangeAPI}
 */
export declare function DefaultAPI(logger: Logger): BitfinexExchangeAPI;
/**
 * Convenience function to connect to and subscribe to the given channels
 * @param wsUrl {string} the WS feed to connect to
 * @param products {string[]} An array of products to subscribe to
 * @param auth
 * @param logger
 */
export declare function getSubscribedFeeds(wsUrl: string, products: string[], auth?: ExchangeAuthConfig, logger?: Logger, bookDepth?: number): Promise<BitfinexFeed>;
/**
 * This is a straightforward wrapper around getSubscribedFeeds using the Factory pattern with the most commonly used
 * defaults. For customised feeds, use getSubscribedFeeds instead.
 *
 * It is assumed that your API keys are stored in the BITFINEX_KEY and BITFINEX_SECRET envars
 */
export declare function FeedFactory(logger: Logger, productIDs?: string[]): Promise<BitfinexFeed>;
