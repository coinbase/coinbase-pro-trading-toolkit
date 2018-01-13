"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**********************************************************************************************************************
 * @license                                                                                                           *
 * Copyright 2017 Coinbase, Inc.                                                                                      *
 *                                                                                                                    *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance     *
 * with the License. You may obtain a copy of the License at                                                          *
 *                                                                                                                    *
 * http://www.apache.org/licenses/LICENSE-2.0                                                                         *
 *                                                                                                                    *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on*
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the                 *
 * License for the specific language governing permissions and limitations under the License.                         *
 **********************************************************************************************************************/
const OpenExchangeProvider_1 = require("../../src/FXService/providers/OpenExchangeProvider");
const Logger_1 = require("../../src/utils/Logger");
const FXProvider_1 = require("../../src/FXService/FXProvider");
const assert = require('assert');
const nock = require('nock');
describe('OpenExchangeProvider', () => {
    let provider;
    before(() => {
        provider = new OpenExchangeProvider_1.default({
            logger: Logger_1.NullLogger,
            apiKey: 'key',
            cacheDuration: 5000
        });
    });
    it('returns true for supported currencies', () => {
        nock('https://openexchangerates.org/api')
            .get('/currencies.json')
            .reply(200, {
            USD: 'United States Dollar',
            GBP: 'British Pound',
            EUR: 'Euro'
        });
        return provider.supportsPair({ from: 'GBP', to: 'USD' }).then((result) => {
            assert.equal(result, true);
        });
    });
    it('returns false for unsupported currencies', () => {
        return provider.supportsPair({ from: 'BTC', to: 'USD' }).then((result) => {
            assert.equal(result, false);
        });
    });
    it('returns 1.0 for identities', () => {
        return provider.fetchCurrentRate({ from: 'XYZ', to: 'XYZ' }).then((result) => {
            assert.equal(result.rate.toNumber(), 1.0);
            assert.equal(result.from, 'XYZ');
            assert.equal(result.to, 'XYZ');
        });
    });
    it('returns spot rate for supported currencies', () => {
        nock('https://openexchangerates.org/api')
            .get('/latest.json')
            .query({ app_id: 'key', base: 'USD' })
            .reply(200, {
            base: 'USD',
            rates: {
                GBP: 0.75,
                EUR: 0.85
            }
        });
        return provider.fetchCurrentRate({ from: 'USD', to: 'GBP' }).then((result) => {
            assert.equal(result.rate.toNumber(), 0.75);
            assert.equal(result.from, 'USD');
            assert.equal(result.to, 'GBP');
        });
    });
    it('returns spot rates, and result is cached', () => {
        provider.clearCache();
        // Only one request here
        nock('https://openexchangerates.org/api')
            .get('/latest.json')
            .query({ app_id: 'key', base: 'USD' })
            .reply(200, {
            base: 'USD',
            rates: {
                GBP: 0.69,
                EUR: 0.72
            }
        });
        return provider.fetchCurrentRate({ from: 'USD', to: 'GBP' }).then((result) => {
            assert.equal(result.rate.toNumber(), 0.69);
            assert.equal(result.from, 'USD');
            assert.equal(result.to, 'GBP');
            return provider.fetchCurrentRate({ from: 'USD', to: 'EUR' });
        }).then((result) => {
            assert.equal(result.rate.toNumber(), 0.72);
            assert.equal(result.from, 'USD');
            assert.equal(result.to, 'EUR');
        });
    });
    it('rejects for unsupported currencies', () => {
        // Still cached
        return provider.fetchCurrentRate({ from: 'USD', to: 'XYZ' }).then((result) => {
            throw new Error('should reject this promise');
        }).catch((err) => {
            assert.ok(err instanceof FXProvider_1.EFXRateUnavailable);
        });
    });
    it('busts cache for base changes', () => {
        nock('https://openexchangerates.org/api')
            .get('/latest.json')
            .query({ app_id: 'key', base: 'GBP' })
            .reply(200, {
            base: 'GBP',
            rates: { USD: 1.25 }
        });
        return provider.fetchCurrentRate({ from: 'GBP', to: 'USD' }).then((result) => {
            assert.equal(result.rate.toNumber(), 1.25);
            assert.equal(result.from, 'GBP');
            assert.equal(result.to, 'USD');
        });
    });
});
//# sourceMappingURL=OpenExchangeRateTest.js.map