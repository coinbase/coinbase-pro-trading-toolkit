"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
const RobustCalculator = require("./calculators/RobustCalculator");
const SimpleRateCalculator_1 = require("./calculators/SimpleRateCalculator");
__export(require("./FXService"));
__export(require("./FXRateCalculator"));
__export(require("./FXProvider"));
const CoinMarketCapProvider = require("./providers/CoinMarketCapProvider");
const OpenExchangeProvider = require("./providers/OpenExchangeProvider");
const YahooFXProvider = require("./providers/YahooFXProvider");
const CryptoProvider = require("./providers/CryptoProvider");
const FailoverProvider_1 = require("./providers/FailoverProvider");
const FailoverCalculator_1 = require("./calculators/FailoverCalculator");
exports.Providers = {
    CoinMarketCapProvider,
    OpenExchangeProvider,
    YahooFXProvider,
    CryptoProvider,
    FailoverProvider: FailoverProvider_1.FailoverProvider
};
exports.Calculators = {
    SimpleRateCalculator: SimpleRateCalculator_1.default,
    RobustCalculator,
    FailoverCalculator: FailoverCalculator_1.default
};
//# sourceMappingURL=index.js.map