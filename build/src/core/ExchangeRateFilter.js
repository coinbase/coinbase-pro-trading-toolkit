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
const AbstractMessageTransform_1 = require("../lib/AbstractMessageTransform");
const FXProvider_1 = require("../FXService/FXProvider");
const types_1 = require("../lib/types");
const PRICE_FIELDS = ['price', 'bid', 'ask', 'lastPrice'];
const ARRAY_FIELDS = ['bids', 'asks'];
/**
 * Implements a stream filter that applies an exchange rate to a stream of GDAX messages.
 *
 *
 * If the FXService has any problems and enters an ErrorState, the  filter will continue to convert prices, but you
 * can watch for FXRateMayBeInvalid events and respond accordingly
 */
class ExchangeRateFilter extends AbstractMessageTransform_1.AbstractMessageTransform {
    constructor(config) {
        super(config);
        this.fxService = config.fxService;
        this.pair = config.pair;
        this.pairIndex = FXProvider_1.pairAsString(config.pair);
        this.precision = config.precision;
    }
    get rate() {
        const index = this.fxService.indexOf(this.pair);
        if (!isFinite(index)) {
            throw new Error(`The FXService object does not support ${this.pair.from}-${this.pair.to} FX rates`);
        }
        const rates = this.fxService.rates;
        const rate = rates[this.pairIndex];
        if (!rate) {
            throw new Error('FXService should return a valid FXObject');
        }
        if (this.fxService.isInErrorState()) {
            this.emit('FXRateMayBeInvalid', rate);
        }
        return rate;
    }
    transformMessage(msg) {
        // We must throw away messages until we get a FX rate
        if (!this.rate.rate) {
            return null;
        }
        this.applyRate(msg);
        ARRAY_FIELDS.forEach((field) => {
            if (msg[field] !== undefined) {
                const array = msg[field];
                array.forEach((sub) => this.applyRate(sub));
            }
        });
        return msg;
    }
    applyRate(msg) {
        const rate = this.rate;
        PRICE_FIELDS.forEach((field) => {
            if (msg[field] !== undefined) {
                const basePrice = types_1.Big(msg[field]);
                const newPrice = basePrice.times(rate.rate);
                msg[field] = newPrice.round(this.precision);
            }
        });
    }
}
exports.ExchangeRateFilter = ExchangeRateFilter;
//# sourceMappingURL=ExchangeRateFilter.js.map