"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Logger_1 = require("../utils/Logger");
const ccxt_1 = require("../exchanges/ccxt");
const GDAXExchangeAPI_1 = require("../exchanges/gdax/GDAXExchangeAPI");
const RobustCalculator_1 = require("../FXService/calculators/RobustCalculator");
const CryptoProvider_1 = require("../FXService/providers/CryptoProvider");
const FXService_1 = require("../FXService/FXService");
const BitfinexExchangeAPI_1 = require("../exchanges/bitfinex/BitfinexExchangeAPI");
const logger = Logger_1.ConsoleLoggerFactory();
const noAuth = { key: null, secret: null };
const providers = [
    new CryptoProvider_1.CryptoProvider({ exchange: ccxt_1.default.createExchange('gemini', noAuth, logger), logger: logger }),
    new CryptoProvider_1.CryptoProvider({ exchange: ccxt_1.default.createExchange('poloniex', noAuth, logger), logger: logger }),
    new CryptoProvider_1.CryptoProvider({ exchange: ccxt_1.default.createExchange('bitmex', noAuth, logger), logger: logger }),
    new CryptoProvider_1.CryptoProvider({ exchange: ccxt_1.default.createExchange('kraken', noAuth, logger), logger: logger }),
    new CryptoProvider_1.CryptoProvider({ exchange: new BitfinexExchangeAPI_1.BitfinexExchangeAPI({ logger: logger, auth: noAuth }), logger: logger }),
    new CryptoProvider_1.CryptoProvider({ exchange: new GDAXExchangeAPI_1.GDAXExchangeAPI({ auth: null, logger: logger }), logger: logger })
];
const robustCalculator = new RobustCalculator_1.RobustCalculator({
    sources: providers,
    logger: logger,
    minNumberOfReliableSources: 2,
    deltaThreshold: 0.03,
    priceThreshold: 0.015
});
const pairs = [
    { from: 'BTC', to: 'USD' },
    { from: 'ETH', to: 'BTC' }
];
const fxService = new FXService_1.FXService({
    logger: logger,
    refreshInterval: 60 * 1000,
    calculator: robustCalculator,
    activePairs: pairs
});
fxService.on('FXRateUpdate', (rates) => {
    if (rates['BTC-USD'].rate) {
        logger.log('info', `BTC price: ${rates['BTC-USD'].rate.toFixed(5)}`);
    }
    if (rates['ETH-BTC'].rate) {
        logger.log('info', `ETH price: ${rates['ETH-BTC'].rate.toFixed(5)}`);
    }
    logger.log('debug', 'RobustRate report', robustCalculator.getLastRequestInfo());
});
//# sourceMappingURL=RobustRateDemo.js.map