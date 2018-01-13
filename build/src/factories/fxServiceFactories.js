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
const SimpleRateCalculator_1 = require("../FXService/calculators/SimpleRateCalculator");
const Logger_1 = require("../utils/Logger");
const YahooFXProvider_1 = require("../FXService/providers/YahooFXProvider");
const OpenExchangeProvider_1 = require("../FXService/providers/OpenExchangeProvider");
const FXService_1 = require("../FXService/FXService");
const CoinMarketCapProvider_1 = require("../FXService/providers/CoinMarketCapProvider");
/**
 * Create and return a new FXProvider.
 * @param provider {string} Allowed values are 'yahoo' and 'openexhangerates'. OpenExchangeRates requires the API key to
 * be specifies in the OPENEXCHANGERATE_KEY environment variable.
 * @param logger {Logger} An existing logger object.
 * @constructor
 */
function FXProviderFactory(provider, logger) {
    const baseConfig = {
        logger: logger
    };
    switch (provider.toLowerCase()) {
        case 'yahoo':
            return new YahooFXProvider_1.default(baseConfig);
        case 'openexchangerates':
            const config = Object.assign({}, baseConfig, { apiKey: process.env.OPENEXCHANGERATE_KEY });
            return new OpenExchangeProvider_1.default(config);
        case 'coinmarketcap':
            return new CoinMarketCapProvider_1.default(baseConfig);
        default:
            return new YahooFXProvider_1.default(baseConfig);
    }
}
exports.FXProviderFactory = FXProviderFactory;
/**
 * Generate an return an FXService provider with sane defaults. If no arguments are specified, Yahoo Finance is used
 * as the sole provider using a SimpleRateCalculator instance.
 *
 * The returned FXService has a default refresh interval of 10 minutes. By default, no currency pairs are set, so a
 * recommended pattern is to set them directly after receiving the FXService, i.e.
 *
 * ```
 *   const service = SimpleFXServiceFactory().addCurrencyePair({ from: 'USD', to: 'EUR'});
 * ```
 *
 * @param provider {string} Either 'yahoo', 'openexchangerates' or 'coinmarketcap'. For OER, the OPENEXCHANGE_KEY envar must be set
 * @param logger {Logger} If not specified a new ConsoleLogger will be created
 * @param refreshInterval {number} the period (in ms) to poll the underlying API for new prices
 */
function SimpleFXServiceFactory(provider = 'yahoo', logger, refreshInterval) {
    const log = logger || Logger_1.ConsoleLoggerFactory();
    const fxProvider = FXProviderFactory(provider, logger);
    const calculator = new SimpleRateCalculator_1.default(fxProvider, log);
    const config = {
        logger: logger,
        refreshInterval: refreshInterval || 10 * 60 * 1000,
        calculator: calculator
    };
    return new FXService_1.FXService(config);
}
exports.SimpleFXServiceFactory = SimpleFXServiceFactory;
//# sourceMappingURL=fxServiceFactories.js.map