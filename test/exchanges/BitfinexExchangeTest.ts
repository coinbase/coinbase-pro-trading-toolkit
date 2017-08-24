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

const assert = require('assert');
const nock = require('nock');
import { BitfinexConfig, BitfinexExchangeAPI } from '../../src/exchanges/bitfinex/BitfinexExchangeAPI';
import { Balances } from '../../src/exchanges/AuthenticatedExchangeAPI';

const demoTicker = {
    mid: '875.155',
    bid: '874.16',
    ask: '876.15',
    last_price: '876.15',
    low: '847.23',
    high: '913.85',
    volume: '27111.61488275',
    timestamp: '1484006400.000'
};

const demoBook = {
    bids: [
        {
            price: '868.46',
            amount: '2.0',
            timestamp: '1484768990.0'
        },
        {
            price: '868.14',
            amount: '0.04',
            timestamp: '1484768991.0'
        },
        {
            price: '868.03',
            amount: '0.005',
            timestamp: '1484768992.0'
        },
        {
            price: '868.02',
            amount: '0.0006',
            timestamp: '1484768992.0'
        },
        {
            price: '868.0',
            amount: '10.0',
            timestamp: '1484768648.0'
        },
        {
            price: '867.27',
            amount: '0.3',
            timestamp: '1484768992.0'
        }
    ],
    asks: [
        {
            price: '869.05',
            amount: '26.0',
            timestamp: '1484768992.0'
        },
        {
            price: '869.13',
            amount: '4.0',
            timestamp: '1484768993.0'
        },
        {
            price: '869.14',
            amount: '10.0',
            timestamp: '1484768991.0'
        },
        {
            price: '869.15',
            amount: '0.5',
            timestamp: '1484768990.0'
        }
    ]
};

describe('The Bitfinex exchange API', () => {
    const config: BitfinexConfig = {};
    const bitfinex = new BitfinexExchangeAPI(config);
    it('loads the stock ticker', () => {
        nock('https://api.bitfinex.com')
            .get('/v1/pubticker/btcusd')
            .reply(200, demoTicker);
        return bitfinex.loadTicker('BTC-USD').then((ticker) => {
            assert(ticker.bid.eq(demoTicker.bid));
            assert(ticker.ask.eq(demoTicker.ask));
            assert(ticker.price.eq(demoTicker.last_price));
            assert(ticker.volume.eq(demoTicker.volume));
            assert.deepEqual(ticker.time, new Date('2017-01-10'));
        });
    });

    it('provides a midmarket price', () => {
        nock('https://api.bitfinex.com')
            .get('/v1/pubticker/btcusd')
            .reply(200, demoTicker);
        return bitfinex.loadMidMarketPrice('BTC-USD').then((price) => {
            assert(price.eq(875.155));
        });
    });

    it('loads an orderbook', () => {
        nock('https://api.bitfinex.com:443', { encodedQueryParams: true })
            .get('/v1/book/btcusd')
            .query({ grouped: '1' })
            .reply(200, demoBook);
        return bitfinex.loadOrderbook('BTC-USD').then((book) => {
            assert.equal(book.sequence, 0);
            assert.equal(book.numBids, 6);
            assert.equal(book.numAsks, 4);
            assert(book.asksTotal.eq(40.5));
            assert(book.bidsTotal.eq(12.3456));
        });
    });
});

const demoBalances = [
    {
        type: 'deposit',
        currency: 'btc',
        amount: '100.12',
        available: '98.6'
    }, {
        type: 'deposit',
        currency: 'usd',
        amount: '10.2',
        available: '8.5'
    }, {
        type: 'exchange',
        currency: 'btc',
        amount: '1.123',
        available: '0.555'
    }, {
        type: 'exchange',
        currency: 'usd',
        amount: '1000.00',
        available: '425.45'
    }
];

describe('The Bitfinex exchange auth API', () => {
    const config: BitfinexConfig = {
        auth: { key: 'key', secret: 'secret' }
    };
    const bitfinex = new BitfinexExchangeAPI(config);

    it('gets balances', () => {
        nock('https://api.bitfinex.com')
            .post('/v1/balances')
            .reply(200, demoBalances);
        return bitfinex.loadBalances().then((balances: Balances) => {
            assert.equal(balances.exchange.BTC.available.toFixed(3), '0.555');
            assert.equal(balances.deposit.BTC.balance.toFixed(2), '100.12');
        });
    });
});
