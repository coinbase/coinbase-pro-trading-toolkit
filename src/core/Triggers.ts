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
import { Big, BigJS, Biglike } from '../lib/types';

export type Action<T extends StreamMessage> = (event: T) => void;
export type TriggerFilter = (message: StreamMessage) => void;
/**
 * A trigger is a small utility class that associates an action with an event. You should seldom use this class
 * directly, but will rather use a factory function, such as [[createPriceTrigger]] to generate an appropriate trigger
 * for you.
 */
export class Trigger<T extends StreamMessage> {
    private action: Action<T> = null;
    private filter: TriggerFilter = null;
    private feed: ExchangeFeed = null;

    constructor(feed: ExchangeFeed) {
        this.feed = feed;
    }

    setAction(action: Action<T>): this {
        this.action = action;
        return this;
    }

    setFilter(filter: TriggerFilter): this {
        this.filter = filter;
        this.feed.on('data', filter);
        return this;
    }

    execute(event: T): this {
        this.action(event);
        return this;
    }

    cancel() {
        if (this.feed && this.filter) {
            this.feed.removeListener('data', this.filter);
        }
        this.feed = null;
        this.filter = null;
    }
}

/**
 * Creates a new price trigger. The feed and product specify which Ticker messages to watch for. priceThreshold is
 * the price which triggers the action when it is crossed. The first price tick after this trigger is created determines
 * whether it is a low- or high- price trigger.
 */
export function createPriceTrigger(feed: ExchangeFeed, product: string, priceThreshold: Biglike): Trigger<TickerMessage> {
    let initialPrice: BigJS = null;
    const targetPrice = Big(priceThreshold);
    const trigger = new Trigger<TickerMessage>(feed);
    const triggerCondition: TriggerFilter = (msg: StreamMessage) => {
        if (msg.type !== 'ticker') {
            return;
        }
        const ticker = msg;
        if (ticker.productId !== product) {
            return;
        }
        if (initialPrice === null) {
            initialPrice = ticker.price;
            return;
        }
        if (initialPrice.gt(targetPrice) && ticker.price.lte(targetPrice)) {
            trigger.execute(ticker).cancel();
        }
        if (initialPrice.lt(targetPrice) && ticker.price.gte(targetPrice)) {
            trigger.execute(ticker).cancel();
        }
    };
    return trigger.setFilter(triggerCondition);
}

export function createTickerTrigger(feed: ExchangeFeed, product: string, onlyOnce: boolean = true): Trigger<TickerMessage> {
    const trigger = new Trigger<TickerMessage>(feed);
    const tickerFilter: TriggerFilter = (msg: StreamMessage) => {
        if (msg.type === 'ticker' && msg.productId === product) {
            if (onlyOnce) {
                trigger.cancel();
            }
            trigger.execute(msg);
        }
    };
    return trigger.setFilter(tickerFilter);
}
