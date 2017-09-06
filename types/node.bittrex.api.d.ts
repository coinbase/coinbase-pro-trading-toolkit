// Type definitions for node.bittrex.api 1.0.0
// Project: https://github.com/n0mad01/node.bittrex.api
// Definitions by: Cayle Sharrock <https://github.com/CjS77>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

declare module 'node.bittrex.api' {

    export type BittrexCallback = (err: Error, data: any) => void;

    export interface BittrexOptions {
        apikey: string;
        apisecret: string;
        stream: boolean;
        verbose: boolean;
        cleartext: boolean;
        inverse_callback_arguments: boolean;
        websockets_baseurl?: string;
        baseUrl?: string;
        baseUrlv2?: string;
        websockets_hubs?: string[];
    }

    export interface BittrexCredentials {
        apikey: string;
        apisecret: string;
    }

    export interface MarketOptions {
        market: string;
    }

    export interface CandleOptions {
        marketName: string;
        tickInterval: string;
    }

    export interface OrderbookOptions {
        market: string;
        depth: number;
        type: string; // 'both'
    }

    export interface CurrencyOptions {
        currency: string;
    }

    export interface AuthCurrencyOptions extends CurrencyOptions, BittrexCredentials {
    }

    export interface WithdrawOptions extends BittrexCredentials {
        currency: string;
        amount: string;
        address: string;
    }

    export interface MarketOrderOptions extends BittrexCredentials {
        market: string;
        quantity: string;
    }

    export interface LimitOrderOptions extends MarketOrderOptions {
        rate: string;
    }

    export interface OrderOptions extends BittrexCredentials {
        uuid: string;
    }

    export interface AuthMarketOptions extends MarketOrderOptions, BittrexCredentials {
    }

    export function options(opts: BittrexOptions): void;

    export function getmarkets(callback: BittrexCallback): void;

    export function getcurrencies(callback: BittrexCallback): void;

    export function getticker(opt: MarketOptions, callback: BittrexCallback): void;

    export function getmarketsummaries(callback: BittrexCallback): void;

    export function getmarketsummary(opt: MarketOptions, callback: BittrexCallback): void;

    export function getorderbook(opt: OrderbookOptions, callback: BittrexCallback): void;

    export function getmarkethistory(opt: MarketOptions, callback: BittrexCallback): void;

    export function getcandles(opt: CandleOptions, callback: BittrexCallback): void;

    export function buylimit(opt: LimitOrderOptions, callback: BittrexCallback): void;

    export function buymarket(opt: MarketOrderOptions, callback: BittrexCallback): void;

    export function selllimit(opt: LimitOrderOptions, callback: BittrexCallback): void;

    export function sellmarket(opt: MarketOrderOptions, callback: BittrexCallback): void;

    export function cancel(opt: OrderOptions, callback: BittrexCallback): void;

    export function getopenorders(opt: AuthMarketOptions, callback: BittrexCallback): void;

    export function getbalances(callback: BittrexCallback): void;

    export function getbalance(opt: AuthCurrencyOptions, callback: BittrexCallback): void;

    export function getwithdrawalhistory(opt: AuthCurrencyOptions, callback: BittrexCallback): void;

    export function getdepositaddress(opt: AuthCurrencyOptions, callback: BittrexCallback): void;

    export function getdeposithistory(opt: AuthCurrencyOptions, callback: BittrexCallback): void;

    export function getorderhistory(opt: AuthMarketOptions, callback: BittrexCallback): void;

    export function getorder(opt: OrderOptions, callback: BittrexCallback): void;

    export function withdraw(opt: WithdrawOptions, callback: BittrexCallback): void;

    export namespace websockets {
        export type BittrexCallback2 = (data: any) => void;

        export function listen(callback: BittrexCallback2): any; // SignalRClient;

        export function subscribe(markets: string[], callback: BittrexCallback2): any; // SignalRClient;

        export function client(): any; // SignalRClient
    }
}
