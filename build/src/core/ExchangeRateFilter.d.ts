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
import { AbstractMessageTransform, MessageTransformConfig } from '../lib/AbstractMessageTransform';
import { StreamMessage } from './Messages';
import { CurrencyPair, FXObject } from '../FXService/FXProvider';
import { FXService } from '../FXService/FXService';
export interface ExchangeRateFilterConfig extends MessageTransformConfig {
    pair: CurrencyPair;
    fxService: FXService;
    precision: number;
}
/**
 * Implements a stream filter that applies an exchange rate to a stream of GDAX messages.
 *
 *
 * If the FXService has any problems and enters an ErrorState, the  filter will continue to convert prices, but you
 * can watch for FXRateMayBeInvalid events and respond accordingly
 */
export declare class ExchangeRateFilter extends AbstractMessageTransform {
    private pairIndex;
    private pair;
    private fxService;
    private precision;
    constructor(config: ExchangeRateFilterConfig);
    readonly rate: FXObject;
    transformMessage(msg: StreamMessage): StreamMessage;
    private applyRate(msg);
}
