// Type definitions for ccxt 0.1.0
// Project: https://github.com/kroitor/ccxt
// Definitions by: Cayle Sharrock <https://github.com/CjS77>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

declare module 'ccxt' {

    export interface CCXTMarket {
        id: string;
        symbol: string;
        base: string;
        quote: string;
        info: any;
    }

    export interface CCXTOrderbook {
        bids: number[][];
        asks: number[][];
        timestamp: number;
        datetime: string;
    }

    export class Exchange {
        readonly rateLimit: number;
        public verbose: boolean;
        public substituteCommonCurrencyCodes: boolean;
        public hasFetchTickers: boolean;

        fetch(url: string, method: string, headers?: any, body?: any): Promise<any>;

        handleResponse(url: string, method: string, headers?: any, body?: any): any;

        loadMarkets(reload?: boolean): Promise<CCXTMarket[]>;

        fetchOrderStatus(id: string, market: string): Promise<string>;

        account(): any;

        commonCurrencyCode(currency: string): string;

        market(symbol: string): CCXTMarket;

        marketId(symbol: string): string;

        marketIds(symbols: string): string[];

        symbol(symbol: string): string;

        createOrder(market: string, type: string, side: string, amount: string, price?: string, params?: any): Promise<any>;

        fetchBalance(params?: any): Promise<any>;

        fetchOrderBook(market: string, params?: any): Promise<CCXTOrderbook>;

        fetchTicker(market: string): Promise<any>;

        fetchTrades(symbol: string, params?: any): Promise<any>;

        cancelOrder(id: string): Promise<any>;

        withdraw(currency: string, amount: string, address: string, params?: any): Promise<any>;

        request(path: string, api: string, method: string, params?: any, headers?: any, body?: any): Promise<any>;
    }

    export function _1broker(options: any): Exchange;

    export function _1btcxe(options: any): Exchange;

    export function anxpro(options: any): Exchange;

    export function binance(options: any): Exchange;

    export function bit2c(options: any): Exchange;

    export function bitbay(options: any): Exchange;

    export function bitbays(options: any): Exchange;

    export function bitcoincoid(options: any): Exchange;

    export function bitfinex(options: any): Exchange;

    export function bitfinex2(options: any): Exchange;

    export function bitflyer(options: any): Exchange;

    export function bitlish(options: any): Exchange;

    export function bitmarket(options: any): Exchange;

    export function bitmex(options: any): Exchange;

    export function bitso(options: any): Exchange;

    export function bitstamp(options: any): Exchange;

    export function bittrex(options: any): Exchange;

    export function bl3p(options: any): Exchange;

    export function btcchina(options: any): Exchange;

    export function btce(options: any): Exchange;

    export function btcexchange(options: any): Exchange;

    export function btcmarkets(options: any): Exchange;

    export function btctradeua(options: any): Exchange;

    export function btcturk(options: any): Exchange;

    export function btcx(options: any): Exchange;

    export function bter(options: any): Exchange;

    export function bxinth(options: any): Exchange;

    export function ccex(options: any): Exchange;

    export function cex(options: any): Exchange;

    export function chbtc(options: any): Exchange;

    export function chilebit(options: any): Exchange;

    export function coincheck(options: any): Exchange;

    export function coinfloor(options: any): Exchange;

    export function coingi(options: any): Exchange;

    export function coinmarketcap(options: any): Exchange;

    export function coinmate(options: any): Exchange;

    export function coinsecure(options: any): Exchange;

    export function coinspot(options: any): Exchange;

    export function cryptopia(options: any): Exchange;

    export function dsx(options: any): Exchange;

    export function exmo(options: any): Exchange;

    export function flowbtc(options: any): Exchange;

    export function foxbit(options: any): Exchange;

    export function fybse(options: any): Exchange;

    export function fybsg(options: any): Exchange;

    export function gatecoin(options: any): Exchange;

    export function gdax(options: any): Exchange;

    export function gemini(options: any): Exchange;

    export function hitbtc(options: any): Exchange;

    export function hitbtc2(options: any): Exchange;

    export function huobi(options: any): Exchange;

    export function itbit(options: any): Exchange;

    export function jubi(options: any): Exchange;

    export function kraken(options: any): Exchange;

    export function lakebtc(options: any): Exchange;

    export function livecoin(options: any): Exchange;

    export function liqui(options: any): Exchange;

    export function luno(options: any): Exchange;

    export function mercado(options: any): Exchange;

    export function okcoincny(options: any): Exchange;

    export function okcoinusd(options: any): Exchange;

    export function okex(options: any): Exchange;

    export function paymium(options: any): Exchange;

    export function poloniex(options: any): Exchange;

    export function quadrigacx(options: any): Exchange;

    export function quoine(options: any): Exchange;

    export function southxchange(options: any): Exchange;

    export function surbitcoin(options: any): Exchange;

    export function therock(options: any): Exchange;

    export function urdubit(options: any): Exchange;

    export function vaultoro(options: any): Exchange;

    export function vbtc(options: any): Exchange;

    export function virwox(options: any): Exchange;

    export function xbtce(options: any): Exchange;

    export function yobit(options: any): Exchange;

    export function yunbi(options: any): Exchange;

    export function zaif(options: any): Exchange;
}
