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
import { CurrencyPair, FXProvider } from '../FXService/FXProvider';
import { ConsoleLoggerFactory, Logger } from '../utils/Logger';
import CCXTWrapper from '../exchanges/ccxt';
import { GDAXExchangeAPI } from '../exchanges/gdax/GDAXExchangeAPI';
import { RobustCalculator } from '../FXService/calculators/RobustCalculator';
import { CryptoProvider } from '../FXService/providers/CryptoProvider';
import { FXRates, FXService } from '../FXService/FXService';
import { BitfinexExchangeAPI } from '../exchanges/bitfinex/BitfinexExchangeAPI';
import { ExchangeAuthConfig } from '../exchanges/AuthConfig';

const logger: Logger = ConsoleLoggerFactory();
const noAuth: ExchangeAuthConfig = { key: null, secret: null };
const providers: FXProvider[] = [
    new CryptoProvider({ exchange: CCXTWrapper.createExchange('gemini', noAuth, logger), logger: logger }),
    new CryptoProvider({ exchange: CCXTWrapper.createExchange('poloniex', noAuth, logger), logger: logger }),
    new CryptoProvider({ exchange: CCXTWrapper.createExchange('bitmex', noAuth, logger), logger: logger }),
    new CryptoProvider({ exchange: CCXTWrapper.createExchange('kraken', noAuth, logger), logger: logger }),
    new CryptoProvider({ exchange: new BitfinexExchangeAPI({logger: logger, auth: noAuth }), logger: logger }),
    new CryptoProvider({ exchange: new GDAXExchangeAPI({ auth: null, logger: logger }), logger: logger })
];

const robustCalculator = new RobustCalculator({
    sources: providers,
    logger: logger,
    minNumberOfReliableSources: 2,
    deltaThreshold: 0.03,
    priceThreshold: 0.015
});

const pairs: CurrencyPair[] = [
    { from: 'BTC', to: 'USD' },
    { from: 'ETH', to: 'BTC' }
];

const fxService: FXService = new FXService({
    logger: logger,
    refreshInterval: 60 * 1000,
    calculator: robustCalculator,
    activePairs: pairs
});

fxService.on('FXRateUpdate', (rates: FXRates) => {
    if (rates['BTC-USD'].rate) { logger.log('info', `BTC price: ${rates['BTC-USD'].rate.toFixed(5)}`); }
    if (rates['ETH-BTC'].rate) { logger.log('info', `ETH price: ${rates['ETH-BTC'].rate.toFixed(5)}`); }
    logger.log('debug', 'RobustRate report', robustCalculator.getLastRequestInfo());
});
