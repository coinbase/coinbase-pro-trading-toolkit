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

const assert = require('assert');
const nock = require('nock');

import { ExchangeAuthConfig } from '../../src/exchanges/AuthConfig';
import CCXTExchangeWrapper from '../../src/exchanges/ccxt';
import { NullLogger } from '../../src/utils/Logger';

const setupMocks = () => {
    nock('https://www.bitmex.com', { encodedQueryParams: true })
        .get(/\/api\/v1\/instrument\/active.*/)
        .reply(200, [{
            symbol: 'XBTUSD',
            rootSymbol: 'XBT',
            state: 'Open',
            typ: 'FFWCSX',
            listing: '2016-05-13T12:00:00.000Z',
            front: '2016-05-13T12:00:00.000Z',
            expiry: null,
            settle: null,
            relistInterval: null,
            inverseLeg: '',
            sellLeg: '',
            buyLeg: '',
            positionCurrency: 'USD',
            underlying: 'XBT',
            quoteCurrency: 'USD',
            underlyingSymbol: 'XBT=',
            reference: 'BMEX',
            referenceSymbol: '.BXBT',
            calcInterval: null,
            publishInterval: null,
            publishTime: null,
            maxOrderQty: 10000000,
            maxPrice: 1000000,
            lotSize: 1,
            tickSize: 0.1,
            multiplier: -100000000,
            settlCurrency: 'XBt',
            underlyingToPositionMultiplier: null,
            underlyingToSettleMultiplier: -100000000,
            quoteToSettleMultiplier: null,
            isQuanto: false,
            isInverse: true,
            initMargin: 0.01,
            maintMargin: 0.005,
            riskLimit: 20000000000,
            riskStep: 10000000000,
            limit: null,
            capped: false,
            taxed: true,
            deleverage: true,
            makerFee: -0.00025,
            takerFee: 0.00075,
            settlementFee: 0,
            insuranceFee: 0,
            fundingBaseSymbol: '.XBTBON8H',
            fundingQuoteSymbol: '.USDBON8H',
            fundingPremiumSymbol: '.XBTUSDPI8H',
            fundingTimestamp: '2017-10-20T04:00:00.000Z',
            fundingInterval: '2000-01-01T08:00:00.000Z',
            fundingRate: 0.000285,
            indicativeFundingRate: 0.000542,
            rebalanceTimestamp: null,
            rebalanceInterval: null,
            openingTimestamp: '2017-10-19T22:00:00.000Z',
            closingTimestamp: '2017-10-20T00:00:00.000Z',
            sessionInterval: '2000-01-01T02:00:00.000Z',
            prevClosePrice: 5690.51,
            limitDownPrice: null,
            limitUpPrice: null,
            bankruptLimitDownPrice: null,
            bankruptLimitUpPrice: null,
            prevTotalVolume: 37004379664,
            totalVolume: 37019760890,
            volume: 15381226,
            volume24h: 700562690,
            prevTotalTurnover: 1358332465712213,
            totalTurnover: 1358600793326838,
            turnover: 268327614625,
            turnover24h: 12395944154833,
            prevPrice24h: 5535.8,
            vwap: 5651.6333,
            highPrice: 5757.9,
            lowPrice: 5521.2,
            lastPrice: 5732.7,
            lastPriceProtected: 5732.7,
            lastTickDirection: 'ZeroPlusTick',
            lastChangePcnt: 0.0356,
            bidPrice: 5732.6,
            midPrice: 5732.65,
            askPrice: 5732.7,
            impactBidPrice: 5732.6301,
            impactMidPrice: 5733.3,
            impactAskPrice: 5733.945,
            hasLiquidity: true,
            openInterest: 98452155,
            openValue: 1719663791385,
            fairMethod: 'FundingRate',
            fairBasisRate: 0.312075,
            fairBasis: 1.12,
            fairPrice: 5725.22,
            markMethod: 'FairPrice',
            markPrice: 5725.22,
            indicativeTaxRate: 0,
            indicativeSettlePrice: 5724.1,
            settledPrice: null,
            timestamp: '2017-10-19T22:31:00.000Z'
        }]);

    nock('https://www.bitmex.com', { encodedQueryParams: true })
        .get('/api/v1/trade?symbol=XBTUSD')
        .reply(200, [{
            timestamp: '2017-01-01T00:00:36.806Z',
            symbol: 'XBTUSD',
            side: 'Buy',
            size: 500,
            price: 968.49,
            tickDirection: 'PlusTick',
            trdMatchID: 'e4db2886-ae1d-4191-c516-566fb703365c',
            grossValue: 51627000,
            homeNotional: 0.51627,
            foreignNotional: 500
        }, {
            timestamp: '2017-01-01T00:00:36.806Z',
            symbol: 'XBTUSD',
            side: 'Buy',
            size: 97,
            price: 968.5,
            tickDirection: 'PlusTick',
            trdMatchID: 'b496b1fd-6e6e-7cf8-c4bf-f73994a37b42',
            grossValue: 10015444,
            homeNotional: 0.10015444,
            foreignNotional: 97
        }]);

    nock('https://www.bitmex.com', { encodedQueryParams: true })
        .get('/api/v1/trade/bucketed?symbol=XBTUSD&binSize=1m&partial=true')
        .reply(200, [{
            timestamp: '2017-01-01T00:00:00.000Z',
            symbol: 'XBTUSD',
            open: 968.29,
            high: 968.29,
            low: 968.29,
            close: 968.29,
            trades: 0,
            volume: 0,
            vwap: null,
            lastSize: null,
            turnover: 0,
            homeNotional: 0,
            foreignNotional: 0
        }, {
            timestamp: '2017-01-01T00:01:00.000Z',
            symbol: 'XBTUSD',
            open: 968.29,
            high: 968.76,
            low: 968.49,
            close: 968.7,
            trades: 17,
            volume: 12993,
            vwap: 968.72,
            lastSize: 2000,
            turnover: 1341256747,
            homeNotional: 13.412567469999997,
            foreignNotional: 12993
        }]);

    nock('https://www.bitmex.com', { encodedQueryParams: true })
        .get('/api/v1/quote/bucketed?symbol=XBTUSD&binSize=1d&partial=true&count=1&reverse=true')
        .reply(200, [{
            timestamp: '2017-10-20T00:00:00.000Z',
            symbol: 'XBTUSD',
            bidSize: 48878,
            bidPrice: 5719.3,
            askPrice: 5719.4,
            askSize: 22930
        }]);

    nock('https://www.bitmex.com', { encodedQueryParams: true })
        .get('/api/v1/trade/bucketed?symbol=XBTUSD&binSize=1d&partial=true&count=1&reverse=true')
        .reply(200, [{
            timestamp: '2017-10-20T00:00:00.000Z',
            symbol: 'XBTUSD',
            open: 5590.8,
            high: 5757.9,
            low: 5527,
            close: 5725.4,
            trades: 184288,
            volume: 642102046,
            vwap: 5658.3489,
            lastSize: 600,
            turnover: 11348245027659,
            homeNotional: 113482.45027659024,
            foreignNotional: 642102046,
        }]);

    nock('https://www.bitmex.com', { encodedQueryParams: true })
        .get('/api/v1/orderBook/L2?symbol=XBTUSD')
        .reply(200, [{
            symbol: 'XBTUSD',
            id: 8799427940,
            side: 'Sell',
            size: 33825,
            price: 5720.6,
        }, {
            symbol: 'XBTUSD',
            id: 8799428260,
            side: 'Buy',
            size: 72187,
            price: 5717.4,
        }]);
};

describe('CCXT Exchange Wrapper', () => {
    const exchangeId = 'bitmex';
    const productId = 'BTC-USD';
    let wrapper: CCXTExchangeWrapper;

    before(async () => {
        setupMocks();
        const auth: ExchangeAuthConfig = { key: null, secret: null };
        wrapper = CCXTExchangeWrapper.createExchange(exchangeId, auth, NullLogger);
    });

    it('is able to fetch historical trade data from an exchange', async () => {
        const data = await wrapper.fetchHistTrades(productId);
        assert(data.length && data.length > 0);
    });

    it('is able to fetch historical OHLCV candlestick data from an exchange', async () => {
        const data = await wrapper.fetchOHLCV(productId);
        assert.notEqual(data, null);
        assert(data.length && data.length > 0);
    });

    it('is able to fetch a ticker', async () => {
        const data = await wrapper.loadTicker(productId);
        assert(data.bid > data.ask);
    });

    it('is able to load an orderbook image', async () => {
        const data = await wrapper.loadOrderbook(productId);
        assert(data.numAsks > 0 && data.numBids > 0);
    });
});
