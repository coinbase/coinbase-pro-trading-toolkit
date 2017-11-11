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

import { GDAXExchangeAPI } from '../../src/exchanges/gdax/GDAXExchangeAPI';
import { CryptoAddress } from '../../src/exchanges/ExchangeTransferAPI';

const assert = require('assert');
const nock = require('nock');

describe('GDAX Exchange API', () => {
    let gdax: GDAXExchangeAPI;
    before(() => {
        gdax = new GDAXExchangeAPI({ logger: null });
    });

    it('returns a ticker object', () => {
        nock('https://api.gdax.com', { encodedQueryParams: true })
            .get('/products/BTC-USD/ticker')
            .reply(200, {
                ask: '250.0',
                bid: '249.0',
                price: '250.1',
                volume: '1000',
                trade_id: 101
            });
        return gdax.loadTicker('BTC-USD').then((ticker) => {
            assert(ticker.bid.eq(249));
            assert(ticker.ask.eq(250));
            assert(ticker.volume.eq(1000));
        });
    });

    it('returns a midmarket price', () => {
        nock('https://api.gdax.com', { encodedQueryParams: true })
            .get('/products/BTC-USD/ticker')
            .reply(200, {
                ask: '250.0',
                bid: '249.0',
                price: '250.1',
                volume: '1000',
                trade_id: 101
            });
        return gdax.loadMidMarketPrice('BTC-USD').then((price) => {
            assert(price.eq(249.5));
        });
    });

    it('loads the orderbook', (done) => {
        nock('https://api.gdax.com', { encodedQueryParams: true })
            .get('/products/BTC-USD/book')
            .query({ level: '3' })
            .reply(200, {
                sequence: 100,
                bids: [['240', '5', 1], ['245', '3', 1], ['248', '1', 1]],
                asks: [['250', '3', 1], ['251', '1.15', 1]]
            });
        gdax.loadOrderbook('BTC-USD').then((book) => {
            assert.equal(book.numBids, 3);
            assert.equal(book.numAsks, 2);
            assert(book.asksTotal.eq(4.15));
            assert(book.bidsTotal.eq(9));
            done();
        });
    });
});

describe('GDAX Authenticated Exchange API', () => {
    let gdax: GDAXExchangeAPI;
    before(() => {
        gdax = new GDAXExchangeAPI({ logger: null, auth: { key: 'key', secret: 'secret', passphrase: 'pass' } });
    });

    it('returns a crypto address', () => {
        nock('https://api.gdax.com', { encodedQueryParams: true })
            .get('/coinbase-accounts')
            .reply(200, [{
                id: '12345-6789',
                currency: 'BTC',
            }])
            .post('/coinbase-accounts/12345-6789/addresses')
            .reply(200, {
                address: '13yAboqhttssm85emFHQ6jSQBdxJ7crnS6',
                exchange_deposit_address: true
            });
        return gdax.requestCryptoAddress('BTC').then((result: CryptoAddress) => {
            assert.equal(result.currency, 'BTC');
            assert.equal(result.address, '13yAboqhttssm85emFHQ6jSQBdxJ7crnS6');
        });
    });
});
