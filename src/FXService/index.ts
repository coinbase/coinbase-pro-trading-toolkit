export * from './FXService';
export * from './FXRateCalculator';
export * from './FXProvider';

import * as CoinMarketCapProvider from './providers/CoinMarketCapProvider';
import * as OpenExchangeProvider from './providers/OpenExchangeProvider';
import * as YahooFXProvider from './providers/YahooFXProvider';

export const Providers = {
    CoinMarketCapProvider,
    OpenExchangeProvider,
    YahooFXProvider
};

import SimpleRateCalculator from './calculators/SimpleRateCalculator';

export const Calculators = {
    SimpleRateCalculator
};
