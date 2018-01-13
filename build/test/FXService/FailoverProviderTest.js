"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const CryptoProvider_1 = require("../../src/FXService/providers/CryptoProvider");
const Logger_1 = require("../../src/utils/Logger");
const FailoverProvider_1 = require("../../src/FXService/providers/FailoverProvider");
const gdaxFactories_1 = require("../../src/factories/gdaxFactories");
const bitfinexFactories_1 = require("../../src/factories/bitfinexFactories");
const FXProvider_1 = require("../../src/FXService/FXProvider");
const assert = require('assert');
const nock = require('nock');
describe('FailoverProvider', () => {
    let provider;
    before(() => {
        provider = new FailoverProvider_1.FailoverProvider({
            logger: Logger_1.NullLogger,
            providers: [
                new CryptoProvider_1.CryptoProvider({ logger: Logger_1.NullLogger, exchange: gdaxFactories_1.DefaultAPI(Logger_1.NullLogger) }),
                new CryptoProvider_1.CryptoProvider({ logger: Logger_1.NullLogger, exchange: bitfinexFactories_1.DefaultAPI(Logger_1.NullLogger) })
            ]
        });
    });
    it('supports currencies from first provider first', () => {
        nock('https://api.gdax.com')
            .get('/products')
            .reply(200, [{
                id: 'BTC-USD',
                base_currency: 'BTC',
                quote_currency: 'USD',
                base_min_size: '0.01',
                base_max_size: '1000000',
                quote_increment: '0.01',
                display_name: 'BTC/USD'
            }]);
        return provider.supportsPair({ from: 'BTC', to: 'USD' }).then((result) => {
            assert.equal(result, true);
        });
    });
    it('supports currencies from 2nd provider if first does not', () => {
        nock('https://api.bitfinex.com:443')
            .get('/v1/symbols_details')
            .reply(200, [{ pair: 'ethusd' }, { pair: 'btcusd' }]);
        return provider.supportsPair({ from: 'ETH', to: 'USD' }).then((result) => {
            assert.equal(result, true);
        });
    });
    it('returns false for unsupported currencies', () => {
        return provider.supportsPair({ from: 'USD', to: 'XYZ' }).then((result) => {
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
    it('returns spot rate from first provider if it is supported', () => {
        nock('https://api.gdax.com:443')
            .get('/products/BTC-USD/ticker')
            .reply(200, {
            trade_id: 10000,
            price: '10500.00',
            bid: '10400.00',
            ask: '10600.00',
            time: '2017-10-26T06:17:41.579000Z'
        });
        return provider.fetchCurrentRate({ from: 'BTC', to: 'USD' }).then((result) => {
            assert.equal(result.rate.toNumber(), 10500);
            assert.equal(result.from, 'BTC');
            assert.equal(result.to, 'USD');
        });
    });
    it('returns inverse spot rate from first provider if supported', () => {
        nock('https://api.gdax.com:443')
            .get('/products/BTC-USD/ticker')
            .reply(200, {
            trade_id: 10000,
            price: '10500.00',
            bid: '10400.00',
            ask: '10600.00',
            time: '2017-10-26T06:17:41.579000Z'
        });
        return provider.fetchCurrentRate({ from: 'USD', to: 'BTC' }).then((result) => {
            assert.equal(result.rate.toNumber(), 1 / 10500);
            assert.equal(result.from, 'USD');
            assert.equal(result.to, 'BTC');
        });
    });
    it('returns spot rate from 2nd provider is first is not supported', () => {
        nock('https://api.bitfinex.com:443')
            .get('/v1/pubticker/ethusd')
            .reply(200, {
            mid: '500.00',
            bid: '499.00',
            ask: '501.00',
            last_price: '495.49'
        });
        return provider.fetchCurrentRate({ from: 'ETH', to: 'USD' }).then((result) => {
            assert.equal(result.rate.toNumber(), 500);
            assert.equal(result.from, 'ETH');
            assert.equal(result.to, 'USD');
        });
    });
    it('returns inverse spot rate from 2nd provider is first is not supported', () => {
        nock('https://api.bitfinex.com:443')
            .get('/v1/pubticker/ethusd')
            .reply(200, {
            mid: '500.00',
            bid: '499.00',
            ask: '501.00',
            last_price: '495.49'
        });
        return provider.fetchCurrentRate({ from: 'USD', to: 'ETH' }).then((result) => {
            assert.equal(result.rate.toNumber(), 1 / 500);
            assert.equal(result.from, 'USD');
            assert.equal(result.to, 'ETH');
        });
    });
    it('rejects for unsupported currencies', () => {
        nock('https://api.gdax.com:443')
            .get('/products/BTC-XYZ/ticker')
            .reply(404, { message: 'NotFound' });
        return provider.fetchCurrentRate({ from: 'BTC', to: 'XYZ' }).then((result) => {
            throw new Error('should reject this promise');
        }).catch((err) => {
            assert.ok(err instanceof FXProvider_1.EFXRateUnavailable);
        });
    });
    it('returns spot rate from 2nd provider is first is returning errors', () => {
        nock('https://api.gdax.com:443')
            .get('/products/BTC-USD/ticker')
            .reply(500);
        nock('https://api.bitfinex.com:443')
            .get('/v1/pubticker/btcusd')
            .reply(200, {
            bid: '10400.00',
            ask: '10500.00',
            last_price: '10480.0'
        });
        return provider.fetchCurrentRate({ from: 'BTC', to: 'USD' }).then((result) => {
            assert.equal(result.rate.toNumber(), 10450);
            assert.equal(result.from, 'BTC');
            assert.equal(result.to, 'USD');
        });
    });
    it('rejects promise if all providers are erroring', () => {
        nock('https://api.gdax.com:443')
            .get('/products/BTC-USD/ticker')
            .reply(500);
        nock('https://api.bitfinex.com:443')
            .get('/v1/pubticker/btcusd')
            .reply(500);
        return provider.fetchCurrentRate({ from: 'BTC', to: 'USD' }).then((result) => {
            assert.fail(result, null, 'should reject promise');
        }, (err) => {
            assert.ok(err instanceof FXProvider_1.EFXRateUnavailable);
        });
    });
});
//# sourceMappingURL=FailoverProviderTest.js.map