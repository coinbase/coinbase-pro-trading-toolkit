import * as RobustCalculator from './calculators/RobustCalculator';
import SimpleRateCalculator from './calculators/SimpleRateCalculator';
export * from './FXService';
export * from './FXRateCalculator';
export * from './FXProvider';
import * as CoinMarketCapProvider from './providers/CoinMarketCapProvider';
import * as OpenExchangeProvider from './providers/OpenExchangeProvider';
import * as YahooFXProvider from './providers/YahooFXProvider';
import * as CryptoProvider from './providers/CryptoProvider';
import { FailoverProvider } from './providers/FailoverProvider';
import FailoverCalculator from './calculators/FailoverCalculator';
export declare const Providers: {
    CoinMarketCapProvider: typeof CoinMarketCapProvider;
    OpenExchangeProvider: typeof OpenExchangeProvider;
    YahooFXProvider: typeof YahooFXProvider;
    CryptoProvider: typeof CryptoProvider;
    FailoverProvider: typeof FailoverProvider;
};
export declare const Calculators: {
    SimpleRateCalculator: typeof SimpleRateCalculator;
    RobustCalculator: typeof RobustCalculator;
    FailoverCalculator: typeof FailoverCalculator;
};
