/// <reference types="bignumber.js" />
import { Logger } from '../utils/Logger';
import { BigNumber as BigJS } from 'bignumber.js';
export interface CurrencyPair {
    from: string;
    to: string;
}
export declare function pairAsString(pair: CurrencyPair): string;
export interface FXObject extends CurrencyPair {
    time: Date;
    rate: BigJS;
    change?: BigJS;
}
export declare class EFXRateUnavailable extends Error {
    readonly provider: string;
    constructor(msg: string, provider: string);
}
export interface FXProviderConfig {
    logger?: Logger;
}
export declare abstract class FXProvider {
    private logger;
    private _pending;
    constructor(config: FXProviderConfig);
    readonly abstract name: string;
    log(level: string, message: string, meta?: any): void;
    fetchCurrentRate(pair: CurrencyPair): Promise<FXObject>;
    abstract supportsPair(pair: CurrencyPair): Promise<boolean>;
    /**
     * Returns a promise for the current rate. IsSupported must be true, and is not checked here. The method returns a
     * promise for the current network request, or generates a new one.
     * @param pair
     * @returns {Promise<FXObject>}
     */
    protected getPromiseForRate(pair: CurrencyPair): Promise<FXObject>;
    /**
     * Fetch the latest FX exchange rate from the service provider and return a promise for an FXObject.
     * If the service is down, or the latest value is unavailable, reject the promise with an EFXRateUnavailable error
     * @param pair
     */
    protected abstract downloadCurrentRate(pair: CurrencyPair): Promise<FXObject>;
}
