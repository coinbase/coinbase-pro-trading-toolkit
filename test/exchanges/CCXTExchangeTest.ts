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

import { ExchangeAuthConfig } from '../../src/exchanges/AuthConfig';
import CCXTExchangeWrapper from '../../src/exchanges/ccxt';
import { NullLogger } from '../../src/utils/Logger';

describe('CCXT Exchange Wrapper', () => {
    const exchangeId = 'bitmex';
    const productId = 'BTC-USD';
    let wrapper: CCXTExchangeWrapper;

    before(async () => {
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
