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

import YahooFinanceFXProvider from '../FXService/providers/YahooFXProvider';
import { FXObject, FXProvider } from '../FXService/FXProvider';
import { ConsoleLoggerFactory } from '../utils/Logger';
import { FXRates, FXService, FXServiceConfig } from '../FXService/FXService';
import { FXRateCalculator } from '../FXService/FXRateCalculator';
import SimpleRateCalculator from '../FXService/calculators/SimpleRateCalculator';
import CoinMarketCapProvider from '../FXService/providers/CoinMarketCapProvider';

const logger = ConsoleLoggerFactory();
const yahooFXProvider: FXProvider = new YahooFinanceFXProvider({ logger: logger });
const simpleCalculator: FXRateCalculator = new SimpleRateCalculator(yahooFXProvider, logger);

const fxServiceConfig: FXServiceConfig = {
    logger: logger,
    calculator: simpleCalculator,
    refreshInterval: 60 * 1000, // 30 seconds
};

const fxService = new FXService(fxServiceConfig);
fxService.addCurrencyPair({ from: 'USD', to: 'ZAR' })
    .addCurrencyPair({ from: 'GBP', to: 'EUR' })
    .addCurrencyPair({ from: 'BTC', to: 'USD' });

const cmcProvider = new CoinMarketCapProvider({ logger: logger });
const cryptoCalculator = new SimpleRateCalculator(cmcProvider, logger);
const cryptoService = new FXService({
    logger: logger,
    calculator: cryptoCalculator,
    refreshInterval: 45 * 1000
});

cryptoService
    .addCurrencyPair({ from: 'BTC', to: 'USD'})
    .addCurrencyPair({ from: 'BTC', to: 'EUR'})
    .addCurrencyPair({ from: 'ETH', to: 'USD'})
    .addCurrencyPair({ from: 'XMR', to: 'USD'})
    .addCurrencyPair({ from: 'XMR', to: 'JPY'})
    .addCurrencyPair({ from: 'BCH', to: 'BTC'});
/**
 * The BTC-USD rates should be null because they're not supported
 */
fxService.on('FXRateUpdate', (rates: FXRates) => {
    printRates(rates);
});

cryptoService.on('FXRateUpdate', (rates: FXRates) => {
    printRates(rates);
});

function printRates(rates: FXRates) {
    for (const index in rates) {
        const fx: FXObject = rates[index];
        const rate = fx.rate ? fx.rate.toFixed(2) : '--';
        const change = fx.change ? fx.change.toFixed(2) : '-';
        logger.log('info', `${fx.from}-${fx.to} = ${rate} (${change})%`);
    }
}
