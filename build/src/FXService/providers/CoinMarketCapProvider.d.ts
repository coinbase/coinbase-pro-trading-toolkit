import { CurrencyPair, FXObject, FXProvider, FXProviderConfig } from '../FXProvider';
export default class CoinMarketCapProvider extends FXProvider {
    private lastUpdate;
    private initializing;
    constructor(config: FXProviderConfig);
    readonly name: string;
    /**
     * Valid quote currencies are USD, BTC, or one of the valid fiat currencies given in [[SUPPORTED_QUOTE_CURRENCIES]]
     * The list of currently supported base currencies will be constructed when this is first called.
     */
    supportsPair(pair: CurrencyPair): Promise<boolean>;
    protected downloadCurrentRate(pair: CurrencyPair): Promise<FXObject>;
}
