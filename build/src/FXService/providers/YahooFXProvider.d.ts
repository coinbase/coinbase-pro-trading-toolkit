import { CurrencyPair, FXObject, FXProvider } from '../FXProvider';
export default class YahooFinanceFXProvider extends FXProvider {
    readonly name: string;
    supportsPair(pair: CurrencyPair): Promise<boolean>;
    protected downloadCurrentRate(pair: CurrencyPair): Promise<FXObject>;
    private isSupportedPair(pair);
}
