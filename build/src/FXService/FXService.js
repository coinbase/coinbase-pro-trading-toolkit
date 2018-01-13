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
const FXProvider_1 = require("./FXProvider");
const Logger_1 = require("../utils/Logger");
const events_1 = require("events");
const assert = require("assert");
class FXService extends events_1.EventEmitter {
    constructor(config) {
        super();
        this._currencyPairs = [];
        this._rates = {};
        this.setLogger(config.logger || Logger_1.ConsoleLoggerFactory())
            .setCalculator(config.calculator)
            .setRefreshInterval(config.refreshInterval || 1000 * 60 * 5) // 5 minutes
            .setActivePairs(config.activePairs || []);
        this.errorState = false;
    }
    /**
     * Returns the [[FXRateCalculator]] instance that is currently used by this service.
     */
    get calculator() {
        return this._calculator;
    }
    /**
     * Replaces the [[FXRateCalculator]] instance and returns `this` so that you can chain setter calls.
     */
    setCalculator(value) {
        this._calculator = value;
        return this;
    }
    /**
     * Returns the currently attached logger
     */
    get logger() {
        return this._logger;
    }
    /**
     * Sets a logger for the service  and returns `this` so that you can chain setter calls.
     */
    setLogger(value) {
        this._logger = value;
        return this;
    }
    /**
     * Returns the polling interval (in ms) for which [[FXService.calculateRates]] is called.
     */
    get refreshInterval() {
        return this._refreshInterval;
    }
    /**
     * Assigns a new polling interval for calculating exchange rates (in ms). Returns `this` so that you can chain setter calls.
     */
    setRefreshInterval(value) {
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
    get currencyPairs() {
        return this._currencyPairs;
    }
    /**
     * Replace all current pairs with the array of pairs provided. Returns `this` so that you can chain setter calls.
     */
    setActivePairs(pairs) {
        this._currencyPairs = [];
        pairs.forEach((pair) => this.addCurrencyPair(pair));
        return this;
    }
    /**
     * Adds a single currency pair to the service without removing any that are already being queried. If the pair is already
     * in the list, this function has no effect. Returns `this` so that you can chain setter calls.
     */
    addCurrencyPair(pair) {
        if (this.indexOf(pair) >= 0) {
            return this;
        }
        this._currencyPairs.push(pair);
        const index = FXProvider_1.pairAsString(pair);
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
    removePair(pair) {
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
    indexOf(pair) {
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
    isInErrorState() {
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
    get rates() {
        return this._rates;
    }
    log(level, message, meta) {
        if (!this._logger) {
            return;
        }
        this.logger.log(level, message, meta);
    }
    calculateRates() {
        if (!this.calculator) {
            return Promise.resolve(null);
        }
        return this.calculator.calculateRatesFor(this.currencyPairs).then((rates) => {
            assert(Array.isArray(rates));
            rates.forEach((rate) => {
                if (!rate) {
                    this.log('warn', 'The FX calculator returned null for latest FX query');
                    this.errorState = true;
                    return;
                }
                const index = FXProvider_1.pairAsString(rate);
                const oldRate = this.rates[index];
                assert.equal(oldRate.from, rate.from, `The provided exchange rate has a base currency of ${rate.from} instead of ${oldRate.from}`);
                assert.equal(oldRate.to, rate.to, `The provided exchange rate has a quote currency of ${rate.to} instead of ${oldRate.to}`);
                let change = null;
                if (oldRate.rate && rate.rate) {
                    change = rate.rate.minus(oldRate.rate).div(oldRate.rate).times(100);
                }
                this._rates[index] = Object.assign({ change: change }, rate);
            });
            this.errorState = false;
            return Promise.resolve();
        }, (err) => {
            this.log('warn', 'An error occurred fetching latest exchange rates', err.message);
            this.errorState = true;
        }).then(() => {
            this.emit('FXRateUpdate', this.rates);
            return this.rates;
        }).catch((err) => {
            // because we emit a message above, client errors will be caught and returned here.
            this.log('error', 'A client error has caused an FXUpdate failure', err);
            this.errorState = true;
            return Promise.resolve(null);
        });
    }
}
exports.FXService = FXService;
//# sourceMappingURL=FXService.js.map