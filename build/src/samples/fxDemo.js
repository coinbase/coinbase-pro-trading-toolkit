"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const YahooFXProvider_1 = require("../FXService/providers/YahooFXProvider");
const Logger_1 = require("../utils/Logger");
const FXService_1 = require("../FXService/FXService");
const SimpleRateCalculator_1 = require("../FXService/calculators/SimpleRateCalculator");
const CoinMarketCapProvider_1 = require("../FXService/providers/CoinMarketCapProvider");
const logger = Logger_1.ConsoleLoggerFactory();
const yahooFXProvider = new YahooFXProvider_1.default({ logger: logger });
const simpleCalculator = new SimpleRateCalculator_1.default(yahooFXProvider, logger);
const fxServiceConfig = {
    logger: logger,
    calculator: simpleCalculator,
    refreshInterval: 60 * 1000,
};
const fxService = new FXService_1.FXService(fxServiceConfig);
fxService.addCurrencyPair({ from: 'USD', to: 'ZAR' })
    .addCurrencyPair({ from: 'GBP', to: 'EUR' })
    .addCurrencyPair({ from: 'BTC', to: 'USD' });
const cmcProvider = new CoinMarketCapProvider_1.default({ logger: logger });
const cryptoCalculator = new SimpleRateCalculator_1.default(cmcProvider, logger);
const cryptoService = new FXService_1.FXService({
    logger: logger,
    calculator: cryptoCalculator,
    refreshInterval: 45 * 1000
});
cryptoService
    .addCurrencyPair({ from: 'BTC', to: 'USD' })
    .addCurrencyPair({ from: 'BTC', to: 'EUR' })
    .addCurrencyPair({ from: 'ETH', to: 'USD' })
    .addCurrencyPair({ from: 'XMR', to: 'USD' })
    .addCurrencyPair({ from: 'XMR', to: 'JPY' })
    .addCurrencyPair({ from: 'BCH', to: 'BTC' });
/**
 * The BTC-USD rates should be null because they're not supported
 */
fxService.on('FXRateUpdate', (rates) => {
    printRates(rates);
});
cryptoService.on('FXRateUpdate', (rates) => {
    printRates(rates);
});
function printRates(rates) {
    for (const index in rates) {
        const fx = rates[index];
        const rate = fx.rate ? fx.rate.toFixed(2) : '--';
        const change = fx.change ? fx.change.toFixed(2) : '-';
        logger.log('info', `${fx.from}-${fx.to} = ${rate} (${change})%`);
    }
}
//# sourceMappingURL=fxDemo.js.map