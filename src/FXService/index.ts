import * as RobustCalculator from './calculators/RobustCalculator';
import SimpleRateCalculator from './calculators/SimpleRateCalculator';

export * from './FXService';
export * from './FXRateCalculator';
export * from './FXProvider';

import * as CoinMarketCapProvider from './providers/CoinMarketCapProvider';
import * as OpenExchangeProvider from './providers/OpenExchangeProvider';
import * as YahooFXProvider from './providers/YahooFXProvider';
import * as CryptoProvider from './providers/CryptoProvider';

export const Providers = {
    CoinMarketCapProvider,
    OpenExchangeProvider,
    YahooFXProvider,
    CryptoProvider
};

export const Calculators = {
    SimpleRateCalculator,
    RobustCalculator
};
