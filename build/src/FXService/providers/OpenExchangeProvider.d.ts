import { CurrencyPair, FXObject, FXProvider, FXProviderConfig } from '../FXProvider';
export interface OpenExchangeConfig extends FXProviderConfig {
    apiKey: string;
    cacheDuration?: number;
}
export default class OpenExchangeProvider extends FXProvider {
    private apiKey;
    private pending;
    private cacheDuration;
    private cacheTimer;
    private base;
    constructor(config: OpenExchangeConfig);
    readonly name: string;
    /**
     * Clears the request cache, forcing the next download request to hit the server
     */
    clearCache(): void;
    supportsPair(pair: CurrencyPair): Promise<boolean>;
    protected downloadCurrentRate(pair: CurrencyPair): Promise<FXObject>;
    private needsRequest(from);
}
