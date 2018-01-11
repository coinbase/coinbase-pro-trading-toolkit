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

import { CryptoProvider } from '../../src/FXService/providers/CryptoProvider';
import { NullLogger } from '../../src/utils/Logger';
import { DefaultAPI as GDAX } from '../../src/factories/gdaxFactories';
import { DefaultAPI as Bitfinex } from '../../src/factories/bitfinexFactories';
import { FXObject } from '../../src/FXService/FXProvider';
import FailoverCalculator from '../../src/FXService/calculators/FailoverCalculator';
import SimpleRateCalculator from '../../src/FXService/calculators/SimpleRateCalculator';

const assert = require('assert');
const nock = require('nock');

describe('FailoverCalculator', () => {
    let calculator: FailoverCalculator;
    let calc1: SimpleRateCalculator;
    let calc2: SimpleRateCalculator;
    before(() => {
        const provider1 = new CryptoProvider({ logger: NullLogger, exchange: GDAX(NullLogger) });
        const provider2 = new CryptoProvider({ logger: NullLogger, exchange: Bitfinex(NullLogger) });
        calc1 = new SimpleRateCalculator(provider1, NullLogger);
        calc2 = new SimpleRateCalculator(provider2, NullLogger);
        calculator = new FailoverCalculator({
            logger: NullLogger,
            calculators: [calc1, calc2]
        });
    });

    it('returns spot rate from first calculator is supported', () => {
        nock('https://api.gdax.com:443')
            .get('/products')
            .reply(200, [{
                id: 'BTC-USD',
                base_currency: 'BTC',
                quote_currency: 'USD',
                base_min_size: '0.01',
                base_max_size: '1000000',
                quote_increment: '0.01',
                display_name: 'BTC/USD'
            }])
            .get('/products/BTC-USD/ticker')
            .reply(200, {
                trade_id: 10000,
                price: '10500.00',
                bid: '10400.00',
                ask: '10600.00',
                time: '2017-10-26T06:17:41.579000Z'
            });
        return calculator.calculateRatesFor([{ from: 'BTC', to: 'USD' }]).then((results: FXObject[]) => {
            assert.equal(results[0].rate.toNumber(), 10500);
            assert.equal(results[0].from, 'BTC');
            assert.equal(results[0].to, 'USD');
            const info = calculator.getLastRequestInfo();
            assert.equal(info.calculator, calc1);
        });
    });

    it('returns spot rate from 2nd calculator is first is not supported', () => {
        nock('https://api.bitfinex.com:443')
            .get('/v1/symbols_details')
            .reply(200, [{ pair: 'ethusd' }, { pair: 'btcusd' }])
            .get('/v1/pubticker/ethusd')
            .reply(200, {
                mid: '500.00',
                bid: '499.00',
                ask: '501.00',
                last_price: '495.49'
            });
        return calculator.calculateRatesFor([{ from: 'ETH', to: 'USD' }]).then((results: FXObject[]) => {
            assert.equal(results[0].rate.toNumber(), 500);
            assert.equal(results[0].from, 'ETH');
            assert.equal(results[0].to, 'USD');
            const info = calculator.getLastRequestInfo();
            assert.equal(info.calculator, calc2);
        });
    });

    it('returns null for unsupported currencies', () => {
        nock('https://api.gdax.com:443')
            .get('/products/BTC-XYZ/ticker')
            .reply(404, { message: 'NotFound' });
        return calculator.calculateRatesFor([{ from: 'BTC', to: 'XYZ' }]).then((results: FXObject[]) => {
            assert.equal(results[0], null);
        });
    });

    it('returns spot rate from both calculators', () => {
        nock('https://api.gdax.com:443')
            .get('/products/BTC-USD/ticker')
            .reply(200, {
                trade_id: 10000,
                price: '10500.00',
                bid: '10400.00',
                ask: '10500.00',
                time: '2017-10-26T06:17:41.579000Z'
            });
        nock('https://api.bitfinex.com:443')
            .get('/v1/pubticker/ethusd')
            .reply(200, {
                bid: '400.00',
                ask: '410.00',
                last_price: '410.0'
            });
        return calculator.calculateRatesFor([{ from: 'BTC', to: 'USD' }, { from: 'ETH', to: 'USD' }]).then((results: FXObject[]) => {
            assert.equal(results.length, 2);

            assert.equal(results[0].rate.toNumber(), 10450);
            assert.equal(results[0].from, 'BTC');
            assert.equal(results[0].to, 'USD');

            assert.equal(results[1].rate.toNumber(), 405);
            assert.equal(results[1].from, 'ETH');
            assert.equal(results[1].to, 'USD');
            const info = calculator.getLastRequestInfo();
            assert.equal(info.calculator, calc2);
        });
    });

    it('returns results from the second provider if the first errors out', () => {
        nock('https://api.gdax.com:443')
            .get('/products/BTC-USD/ticker')
            .reply(500);
        nock('https://api.bitfinex.com:443')
            .get('/v1/pubticker/btcusd')
            .reply(200, {
                bid: '400.00',
                ask: '410.00',
                last_price: '410.0'
            });
        return calculator.calculateRatesFor([{ from: 'BTC', to: 'USD' }]).then((results: FXObject[]) => {
            const rate: FXObject = results[0];
            assert.equal(rate.rate.toNumber(), 405);
            const info = calculator.getLastRequestInfo();
            assert.equal(info.calculator, calc2);
        });
    });

    it('returns null if all providers fail', () => {
        nock('https://api.gdax.com:443')
            .get('/products/BTC-USD/ticker')
            .reply(500);
        nock('https://api.bitfinex.com:443')
            .get('/v1/pubticker/btcusd')
            .reply(500);
        return calculator.calculateRatesFor([{ from: 'BTC', to: 'USD' }]).then((result) => {
            assert.equal(result[0], null);
            const info = calculator.getLastRequestInfo();
            assert.equal(info.calculator, calc2);
        });
    });
});
