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

import { AbstractMessageTransform,
         MessageTransformConfig } from '../lib/AbstractMessageTransform';
import { StreamMessage } from './Messages';
import { CurrencyPair, FXObject, pairAsString } from '../FXService/FXProvider';
import { FXRates, FXService } from '../FXService/FXService';
import { Big } from '../lib/types';

export interface ExchangeRateFilterConfig extends MessageTransformConfig {
    pair: CurrencyPair;
    fxService: FXService;
    precision: number;  // the number of decimal places to round converted prices to
}

const PRICE_FIELDS = ['price', 'bid', 'ask', 'lastPrice'];
const ARRAY_FIELDS = ['bids', 'asks'];

/**
 * Implements a stream filter that applies an exchange rate to a stream of GDAX messages.
 *
 *
 * If the FXService has any problems and enters an ErrorState, the  filter will continue to convert prices, but you
 * can watch for FXRateMayBeInvalid events and respond accordingly
 */
export class ExchangeRateFilter extends AbstractMessageTransform {
    private readonly pairIndex: string;
    private readonly pair: CurrencyPair;
    private readonly fxService: FXService;
    private readonly precision: number;

    constructor(config: ExchangeRateFilterConfig) {
        super(config);
        this.fxService = config.fxService;
        this.pair = config.pair;
        this.pairIndex = pairAsString(config.pair);
        this.precision = config.precision;
    }

    get rate(): FXObject {
        const index = this.fxService.indexOf(this.pair);
        if (!isFinite(index)) {
            throw new Error(`The FXService object does not support ${this.pair.from}-${this.pair.to} FX rates`);
        }
        const rates: FXRates = this.fxService.rates;
        const rate = rates[this.pairIndex];
        if (!rate) {
            throw new Error('FXService should return a valid FXObject');
        }
        if (this.fxService.isInErrorState()) {
            this.emit('FXRateMayBeInvalid', rate);
        }
        return rate;
    }

    transformMessage(msg: StreamMessage): StreamMessage {
        // We must throw away messages until we get a FX rate
        if (!this.rate.rate) {
            return null;
        }
        this.applyRate(msg);
        ARRAY_FIELDS.forEach((field: string) => {
            if ((msg as any)[field] !== undefined) {
                const array: any[] = (msg as any)[field];
                array.forEach((sub) => this.applyRate(sub));
            }
        });
        return msg;
    }

    private applyRate(msg: StreamMessage) {
        const rate = this.rate;
        PRICE_FIELDS.forEach((field: string) => {
            if ((msg as any)[field] !== undefined) {
                const basePrice = Big((msg as any)[field]);
                const newPrice = basePrice.times(rate.rate);
                (msg as any)[field] = newPrice.round(this.precision);
            }
        });
    }
}
