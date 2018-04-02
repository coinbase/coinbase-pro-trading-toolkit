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
import { PublicExchangeAPI } from '../../src/exchanges/PublicExchangeAPI';
import { CryptoProvider } from '../../src/FXService/providers/CryptoProvider';
import { DefaultAPI } from '../../src/factories/gdaxFactories';
import { NullLogger } from '../../src/utils/Logger';
import { EFXRateUnavailable, FXObject } from '../../src/FXService/FXProvider';

const assert = require('assert');
const nock = require('nock');

describe('CryptoProvider', () => {
    let exchange: PublicExchangeAPI;
    let provider: CryptoProvider;

    before(() => {
        exchange = DefaultAPI(NullLogger);
        provider = new CryptoProvider({
            exchange: exchange,
            logger: NullLogger
        });
    });

    it('returns true for supported currencies', () => {
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
        return provider.supportsPair({ from: 'BTC', to: 'USD' }).then((result: boolean) => {
            assert.equal(result, true);
        });
    });

    it('returns false for unsupported currencies', () => {
        return provider.supportsPair({ from: 'USD', to: 'XYZ' }).then((result: boolean) => {
            assert.equal(result, false);
        });
    });

    it('returns 1.0 for identities', () => {
        return provider.fetchCurrentRate({ from: 'XYZ', to: 'XYZ' }).then((result: FXObject) => {
            assert.equal(result.rate.toNumber(), 1.0);
            assert.equal(result.from, 'XYZ');
            assert.equal(result.to, 'XYZ');
        });
    });

    it('returns spot rate for supported currencies', () => {
        nock('https://api.gdax.com:443')
            .get('/products/BTC-USD/ticker')
            .reply(200, {
                trade_id: 10000,
                price: '10500.00',
                bid: '10400.00',
                ask: '10600.00',
                time: '2017-10-26T06:17:41.579000Z'
            });
        return provider.fetchCurrentRate({ from: 'BTC', to: 'USD' }).then((result: FXObject) => {
            assert.equal(result.rate.toNumber(), 10500);
            assert.equal(result.from, 'BTC');
            assert.equal(result.to, 'USD');
        });
    });

    it('returns inverse spot rate for supported currencies', () => {
        nock('https://api.gdax.com:443')
            .get('/products/BTC-USD/ticker')
            .reply(200, {
                trade_id: 10000,
                price: '10500.00',
                bid: '10400.00',
                ask: '10600.00',
                time: '2017-10-26T06:17:41.579000Z'
            });
        return provider.fetchCurrentRate({ from: 'USD', to: 'BTC' }).then((result: FXObject) => {
            assert.equal(result.rate.toNumber(), 1 / 10500);
            assert.equal(result.from, 'USD');
            assert.equal(result.to, 'BTC');
        });
    });

    it('rejects for unsupported currencies', () => {
        nock('https://api.gdax.com:443')
            .get('/products/BTC-XYZ/ticker')
            .reply(404, { message: 'NotFound' });
        return provider.fetchCurrentRate({ from: 'BTC', to: 'XYZ' }).then((_result: FXObject) => {
            throw new Error('should reject this promise');
        }).catch((err: Error) => {
            assert.ok(err instanceof EFXRateUnavailable);
        });
    });
});
