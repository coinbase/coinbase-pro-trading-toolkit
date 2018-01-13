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
import { BittrexAPI } from '../exchanges/bittrex/BittrexAPI';
import { BittrexFeed } from '../exchanges/bittrex/BittrexFeed';
import { ExchangeFeedConfig } from '../exchanges/ExchangeFeed';
import { ExchangeAuthConfig } from '../exchanges/AuthConfig';
/**
 * A convenience function that returns a GDAXExchangeAPI instance for accessing REST methods conveniently. If API
 * key details are found in the GDAX_KEY etc. envars, they will be used
 */
export declare function DefaultAPI(logger: Logger): BittrexAPI;
/**
 * Convenience function to connect to and subscribe to the given channels. Bittrex uses SignalR, which handles reconnects for us,
 * so this is a much simpler function than some of the other exchanges' methods.
 */
export declare function getSubscribedFeeds(options: ExchangeFeedConfig, products: string[]): Promise<BittrexFeed>;
/**
 * This is a straightforward wrapper around getSubscribedFeeds using the Factory pattern with the most commonly used
 * defaults. For customised feeds, use getSubscribedFeeds instead. It's really not adding much, but we keep it here
 * to maintain a consistent method naming strategy amongst all the exchanges
 *
 * It is assumed that your API keys are stored in the BITTREX_KEY and BITTREX_SECRET envars
 */
export declare function FeedFactory(logger: Logger, productIds: string[], auth?: ExchangeAuthConfig): Promise<BittrexFeed>;
