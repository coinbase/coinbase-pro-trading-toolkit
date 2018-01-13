"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../lib/types");
/**
 * A trigger is a small utility class that associates an action with an event. You should seldom use this class
 * directly, but will rather use a factory function, such as [[createPriceTrigger]] to generate an appropriate trigger
 * for you.
 */
class Trigger {
    constructor(feed) {
        this.action = null;
        this.filter = null;
        this.feed = null;
        this.feed = feed;
    }
    setAction(action) {
        this.action = action;
        return this;
    }
    setFilter(filter) {
        this.filter = filter;
        this.feed.on('data', filter);
        return this;
    }
    execute(event) {
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
exports.Trigger = Trigger;
/**
 * Creates a new price trigger. The feed and product specify which Ticker messages to watch for. priceThreshold is
 * the price which triggers the action when it is crossed. The first price tick after this trigger is created determines
 * whether it is a low- or high- price trigger.
 */
function createPriceTrigger(feed, product, priceThreshold) {
    let initialPrice = null;
    const targetPrice = types_1.Big(priceThreshold);
    const trigger = new Trigger(feed);
    const triggerCondition = (msg) => {
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
exports.createPriceTrigger = createPriceTrigger;
function createTickerTrigger(feed, product, onlyOnce = true) {
    const trigger = new Trigger(feed);
    const tickerFilter = (msg) => {
        if (msg.type === 'ticker' && msg.productId === product) {
            if (onlyOnce) {
                trigger.cancel();
            }
            trigger.execute(msg);
        }
    };
    return trigger.setFilter(tickerFilter);
}
exports.createTickerTrigger = createTickerTrigger;
//# sourceMappingURL=Triggers.js.map