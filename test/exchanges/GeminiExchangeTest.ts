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

import { GeminiExchangeAPI } from '../../src/exchanges/gemini/GeminiExchangeAPI';
const assert = require('assert');
const nock = require('nock');

describe('Gemini Exchange API', () => {
    let gemini: GeminiExchangeAPI;
    const GEMINI_API_URL = 'https://api.gemini.com/v1';
    before(() => {
        gemini = new GeminiExchangeAPI({ logger: null });
    });

    it('returns a list of products', () => {
        return gemini.loadProducts().then((products) => {
            assert(products.length > 2);
        });
    });

    it('returns a ticker object', () => {
        nock(GEMINI_API_URL, { encodedQueryParams: true })
            .get('/pubticker/btcusd')
            .reply(200, {
                ask: '250.0',
                bid: '249.0',
                price: '250.1'
            });
        return gemini.loadTicker('btcusd').then((ticker) => {
            assert(ticker.bid.eq(249));
            assert(ticker.ask.eq(250));
        });
    });

    it('returns a midmarket price', () => {
        nock(GEMINI_API_URL, { encodedQueryParams: true })
            .get('/pubticker/btcusd')
            .reply(200, {
                ask: '250.0',
                bid: '249.0',
                price: '250.1',
                volume: '1000',
                trade_id: 101
            });
        return gemini.loadMidMarketPrice('btcusd').then((price) => {
            assert(price.eq(249.5));
        });
    });

    it('loads the orderbook', (done) => {
        nock(GEMINI_API_URL, { encodedQueryParams: true })
            .get('/book/btcusd')
            .reply(200, {
                bids: [
                    {price: '240.0', amount: '5.0'},
                    {price: '245.0', amount: '3.0'},
                    {price: '248.0', amount: '1.0'}],
                asks: [
                    {price: '250.0', amount: '3.0'},
                    {price: '251.0', amount: '1.15'}]
            });
        gemini.loadOrderbook('btcusd').then((book) => {
            assert.equal(book.numBids, 3);
            assert.equal(book.numAsks, 2);
            assert(book.asksTotal.eq(4.15));
            assert(book.bidsTotal.eq(9));
            done();
        });
    });
});
