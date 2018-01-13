/// <reference types="node" />
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
import { FXRateCalculator } from './FXRateCalculator';
import { CurrencyPair, FXObject } from './FXProvider';
import { Logger } from '../utils/Logger';
import { EventEmitter } from 'events';
/**
 * The FX Rate Service provides near-realtime delivery of foreign exchange rates, including crypto-fiat and crypto-crypto.
 * This class is the client-facing part of the service. The real work gets done by two helper classes:
 *
 * [FXProvider] subclasses, that actually go and fetch the data from the online sources. A few of the more common
 * (and free) providers are already supplied in the providers directory.
 * [FXRateCalculator] subclasses, that carry out the FX calculation based on your preferences or specific needs. For
 * example, you may want to get rates from multiple providers and calculate a weighted average; or you may have a preference
 * for a given provider for crypto pairs and another provider for fiat pairs.
 *
 * FXService is not opinionated on how the rates are calculated, it just serves them up when asked for them.
 *
 * Since we are sensitive to the fact that the FX rate data provider might go offline, or suddenly give crazy results,
 * is a rate update fails, the errorState flag is set, which clients can inspect and respond to accordingly.
 */
export interface FXServiceConfig {
    logger?: Logger;
    calculator: FXRateCalculator;
    refreshInterval?: number;
    activePairs?: CurrencyPair[];
}
export interface FXRates {
    [index: string]: FXObject;
}
export declare class FXService extends EventEmitter {
    private _calculator;
    private _refreshInterval;
    private _currencyPairs;
    private timer;
    private _rates;
    private _logger;
    private errorState;
    constructor(config: FXServiceConfig);
    /**
     * Returns the [[FXRateCalculator]] instance that is currently used by this service.
     */
    readonly calculator: FXRateCalculator;
    /**
     * Replaces the [[FXRateCalculator]] instance and returns `this` so that you can chain setter calls.
     */
    setCalculator(value: FXRateCalculator): this;
    /**
     * Returns the currently attached logger
     */
    readonly logger: Logger;
    /**
     * Sets a logger for the service  and returns `this` so that you can chain setter calls.
     */
    setLogger(value: Logger): this;
    /**
     * Returns the polling interval (in ms) for which [[FXService.calculateRates]] is called.
     */
    readonly refreshInterval: number;
    /**
     * Assigns a new polling interval for calculating exchange rates (in ms). Returns `this` so that you can chain setter calls.
     */
    setRefreshInterval(value: number): this;
    /**
     * Returns the current set of currency pairs that exchange rates are being provided for.
     */
    readonly currencyPairs: CurrencyPair[];
    /**
     * Replace all current pairs with the array of pairs provided. Returns `this` so that you can chain setter calls.
     */
    setActivePairs(pairs: CurrencyPair[]): this;
    /**
     * Adds a single currency pair to the service without removing any that are already being queried. If the pair is already
     * in the list, this function has no effect. Returns `this` so that you can chain setter calls.
     */
    addCurrencyPair(pair: CurrencyPair): this;
    /**
     * Removes a currency pair from the active list.  Returns `this` so that you can chain setter calls.
     */
    removePair(pair: CurrencyPair): boolean;
    /**
     * Returns the index of a given currency pair in the active pair list, or else -1 if it is not in the list
     */
    indexOf(pair: CurrencyPair): number;
    /**
     * If an error occurs while calculating a rate, isInErrorState will return true. Clients can use this to make
     * decisions (e.g. whether to suspend trading)  based on their needs.
     */
    isInErrorState(): boolean;
    /**
     * Sets the internal error state to false. No other action is taken.
     */
    clearErrorState(): void;
    /**
     * Returns the last set of exchange rate data that was returned by the RateCalculator
     */
    readonly rates: FXRates;
    private log(level, message, meta?);
    private calculateRates();
}
