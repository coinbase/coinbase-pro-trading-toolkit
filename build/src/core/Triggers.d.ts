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
import { StreamMessage, TickerMessage } from './Messages';
import { ExchangeFeed } from '../exchanges/ExchangeFeed';
import { Biglike } from '../lib/types';
export declare type Action<T extends StreamMessage> = (event: T) => void;
export declare type TriggerFilter = (message: StreamMessage) => void;
/**
 * A trigger is a small utility class that associates an action with an event. You should seldom use this class
 * directly, but will rather use a factory function, such as [[createPriceTrigger]] to generate an appropriate trigger
 * for you.
 */
export declare class Trigger<T extends StreamMessage> {
    private action;
    private filter;
    private feed;
    constructor(feed: ExchangeFeed);
    setAction(action: Action<T>): Trigger<T>;
    setFilter(filter: TriggerFilter): Trigger<T>;
    execute(event: T): Trigger<T>;
    cancel(): void;
}
/**
 * Creates a new price trigger. The feed and product specify which Ticker messages to watch for. priceThreshold is
 * the price which triggers the action when it is crossed. The first price tick after this trigger is created determines
 * whether it is a low- or high- price trigger.
 */
export declare function createPriceTrigger(feed: ExchangeFeed, product: string, priceThreshold: Biglike): Trigger<TickerMessage>;
export declare function createTickerTrigger(feed: ExchangeFeed, product: string, onlyOnce?: boolean): Trigger<TickerMessage>;
