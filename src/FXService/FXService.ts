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
import Timer = NodeJS.Timer;
import { CurrencyPair, FXObject, pairAsString } from './FXProvider';
import { ConsoleLoggerFactory, Logger } from '../utils/Logger';
import { EventEmitter } from 'events';
import assert = require('assert');

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

export interface FXRates { [index: string]: FXObject; }

export class FXService extends EventEmitter {
    private _calculator: FXRateCalculator;
    private _refreshInterval: number;
    private _currencyPairs: CurrencyPair[] = [];
    private timer: Timer;
    private _rates: FXRates;
    private _logger: Logger;
    private errorState: boolean;

    constructor(config: FXServiceConfig) {
        super();
        this._rates = {};
        this.setLogger(config.logger || ConsoleLoggerFactory())
            .setCalculator(config.calculator)
            .setRefreshInterval(config.refreshInterval || 1000 * 60 * 5) // 5 minutes
            .setActivePairs(config.activePairs || []);
        this.errorState = false;
    }

    /**
     * Returns the [[FXRateCalculator]] instance that is currently used by this service.
     */
    get calculator(): FXRateCalculator {
        return this._calculator;
    }

    /**
     * Replaces the [[FXRateCalculator]] instance and returns `this` so that you can chain setter calls.
     */
    setCalculator(value: FXRateCalculator): this {
        this._calculator = value;
        return this;
    }

    /**
     * Returns the currently attached logger
     */
    get logger(): Logger {
        return this._logger;
    }

    /**
     * Sets a logger for the service  and returns `this` so that you can chain setter calls.
     */
    setLogger(value: Logger): this {
        this._logger = value;
        return this;
    }

    /**
     * Returns the polling interval (in ms) for which [[FXService.calculateRates]] is called.
     */
    get refreshInterval(): number {
        return this._refreshInterval;
    }

    /**
     * Assigns a new polling interval for calculating exchange rates (in ms). Returns `this` so that you can chain setter calls.
     */
    setRefreshInterval(value: number): this {
        this._refreshInterval = value;
        if (this.timer) {
            clearInterval(this.timer);
        }
        this.timer = setInterval(() => {
            this.calculateRates();
        }, value);
        return this;
    }

    /**
     * Returns the current set of currency pairs that exchange rates are being provided for.
     */
    get currencyPairs(): CurrencyPair[] {
        return this._currencyPairs;
    }

    /**
     * Replace all current pairs with the array of pairs provided. Returns `this` so that you can chain setter calls.
     */
    setActivePairs(pairs: CurrencyPair[]): this {
        this._currencyPairs = [];
        pairs.forEach((pair) => this.addCurrencyPair(pair));
        return this;
    }

    /**
     * Adds a single currency pair to the service without removing any that are already being queried. If the pair is already
     * in the list, this function has no effect. Returns `this` so that you can chain setter calls.
     */
    addCurrencyPair(pair: CurrencyPair): this {
        if (this.indexOf(pair) >= 0) {
            return this;
        }
        this._currencyPairs.push(pair);
        const index = pairAsString(pair);
        this._rates[index] = {
            from: pair.from,
            to: pair.to,
            change: null,
            time: null,
            rate: null
        };
        this.calculateRates();
        return this;
    }

    /**
     * Removes a currency pair from the active list.  Returns `this` so that you can chain setter calls.
     */
    removePair(pair: CurrencyPair): boolean {
        const i = this.indexOf(pair);
        if (i < 0) {
            return false;
        }
        this._currencyPairs.splice(i, 1);
        return true;
    }

    /**
     * Returns the index of a given currency pair in the active pair list, or else -1 if it is not in the list
     */
    indexOf(pair: CurrencyPair): number {
        for (let i = 0; i < this._currencyPairs.length; i++) {
            const p = this._currencyPairs[i];
            if (p.from === pair.from && p.to === pair.to) {
                return i;
            }
        }
        return -1;
    }

    /**
     * If an error occurs while calculating a rate, isInErrorState will return true. Clients can use this to make
     * decisions (e.g. whether to suspend trading)  based on their needs.
     */
    isInErrorState(): boolean {
        return this.errorState;
    }

    /**
     * Sets the internal error state to false. No other action is taken.
     */
    clearErrorState() {
        this.errorState = false;
    }

    /**
     * Returns the last set of exchange rate data that was returned by the RateCalculator
     */
    get rates(): FXRates {
        return this._rates;
    }

    private log(level: string, message: string, meta?: any): void {
        if (!this._logger) {
            return;
        }
        this.logger.log(level, message, meta);
    }

    private calculateRates(): Promise<FXRates> {
        if (!this.calculator) {
            return Promise.resolve(null);
        }
        return this.calculator.calculateRatesFor(this.currencyPairs).then((rates: FXObject[]) => {
            assert(Array.isArray(rates));
            rates.forEach((rate: FXObject) => {
                if (!rate) {
                    this.log('warn', 'The FX calculator returned null for latest FX query');
                    this.errorState = true;
                    return;
                }
                const index: string = pairAsString(rate);
                const oldRate: FXObject = this.rates[index];
                assert.equal(oldRate.from, rate.from, `The provided exchange rate has a base currency of ${rate.from} instead of ${oldRate.from}`);
                assert.equal(oldRate.to, rate.to, `The provided exchange rate has a quote currency of ${rate.to} instead of ${oldRate.to}`);
                let change = null;
                if (oldRate.rate && rate.rate)  {
                    change = rate.rate.minus(oldRate.rate).div(oldRate.rate).times(100);
                }
                this._rates[index] = Object.assign({ change: change }, rate);
            });
            this.errorState = false;
        }, (err: Error) => {
            this.log('warn', 'An error occurred fetching latest exchange rates', err.message);
            this.errorState = true;
        }).then(() => {
            this.emit('FXRateUpdate', this.rates);
            return this.rates;
        }).catch((err: Error) => {
            // because we emit a message above, client errors will be caught and returned here.
            this.log('error', 'A client error has caused an FXUpdate failure', err);
            this.errorState = true;
            return null;
        });
    }
}
