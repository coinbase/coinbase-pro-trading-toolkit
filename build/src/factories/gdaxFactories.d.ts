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
import { GDAXFeed } from '../exchanges/gdax/GDAXFeed';
import { GDAXExchangeAPI } from '../exchanges/gdax/GDAXExchangeAPI';
import { Logger } from '../utils/Logger';
import { GDAXAuthConfig } from '../exchanges/gdax/GDAXInterfaces';
/**
 * A convenience function that returns a GDAXExchangeAPI instance for accessing REST methods conveniently. If API
 * key details are found in the GDAX_KEY etc. envars, they will be used
 */
export declare function DefaultAPI(logger: Logger): GDAXExchangeAPI;
/**
 * Convenience function to connect to and subscribe to the given channels
 * @param options {object} Any options from GDAXConfig will be accepted
 * @param products {string[]} An array of products to subscribe to
 */
export declare function getSubscribedFeeds(options: any, products: string[]): Promise<GDAXFeed>;
/**
 * This is a straightforward wrapper around getSubscribedFeeds using the Factory pattern with the most commonly used
 * defaults. For customised feeds, use getSubscribedFeeds instead.
 *
 * It is assumed that your API keys are stored in the GDAX_KEY, GDAX_SECRET and GDAX_PASSPHRASE envars
 */
export declare function FeedFactory(logger: Logger, productIDs?: string[], auth?: GDAXAuthConfig): Promise<GDAXFeed>;
