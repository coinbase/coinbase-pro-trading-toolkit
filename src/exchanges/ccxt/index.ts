/**********************************************************************************************************************
 * @license                                                                                                           *
 * Copyright 2017 Coinbase, Inc.                                                                                      *
 *                                                                                                                    *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance     *
 * with the License. You may obtain a copy of the License at                                                          *
 *                                                                                                                    *
 * http://www.apache.org/licenses/LICENSE-2.0                                                                         *
 *                                                                                                                    *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on*
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the                 *
 * License for the specific language governing permissions and limitations under the License.                         *
 **********************************************************************************************************************/

import * as ccxt from 'ccxt';
import { Candle, CandleRequestOptions, Product, PublicExchangeAPI, Ticker } from '../PublicExchangeAPI';
import { AuthenticatedExchangeAPI, Balances } from '../AuthenticatedExchangeAPI';
import { CryptoAddress, ExchangeTransferAPI, TransferRequest, TransferResult, WithdrawalRequest } from '../ExchangeTransferAPI';
import { ExchangeAuthConfig } from '../AuthConfig';
import { Side } from '../../lib/sides';
import { Big, BigJS, ZERO } from '../../lib/types';
import { BookBuilder } from '../../lib/BookBuilder';
import { PlaceOrderMessage, TradeMessage } from '../../core/Messages';
import { Level3Order, LiveOrder } from '../../lib/Orderbook';
import { Logger } from '../../utils/Logger';
import { GTTError, HTTPError } from '../../lib/errors';

type ExchangeDefinition = [string, new (opts: any) => ccxt.Exchange];
// Supported exchanges, minus those with native support
const exchanges: { [index: string]: ExchangeDefinition } = {
    _1broker: ['1Broker', ccxt._1broker],
    _1btcxe: ['1BTCXE', ccxt._1btcxe],
    acx: ['ACX', ccxt.acx],
    allcoin: ['Allcoin', ccxt.allcoin],
    anxpro: ['ANXPro', ccxt.anxpro],
    bibox: ['Bibox', ccxt.bibox],
    binance: ['Binance', ccxt.binance],
    bit2c: ['Bit2C', ccxt.bit2c],
    bitbank: ['bitbank', ccxt.bitbank],
    bitbay: ['BitBay', ccxt.bitbay],
    bitfinex: ['Bitfinex', ccxt.bitfinex],
    bitfinex2: ['Bitfinex', ccxt.bitfinex2],
    bitflyer: ['bitFlyer', ccxt.bitflyer],
    bithumb: ['Bithumb', ccxt.bithumb],
    bitlish: ['Bitlish', ccxt.bitlish],
    bitmarket: ['BitMarket', ccxt.bitmarket],
    bitmex: ['BitMEX', ccxt.bitmex],
    bitso: ['Bitso', ccxt.bitso],
    bitstamp: ['Bitstamp', ccxt.bitstamp],
    bitstamp1: ['Bitstamp', ccxt.bitstamp1],
    bittrex: ['Bittrex', ccxt.bittrex],
    bitz: ['Bit-Z', ccxt.bitz],
    bl3p: ['BL3P', ccxt.bl3p],
    bleutrade: ['Bleutrade', ccxt.bleutrade],
    braziliex: ['Braziliex', ccxt.braziliex],
    btcbox: ['BtcBox', ccxt.btcbox],
    btcchina: ['BTCChina', ccxt.btcchina],
    btcexchange: ['BTCExchange', ccxt.btcexchange],
    btcmarkets: ['BTC', ccxt.btcmarkets],
    btctradeim: ['BtcTrade.im', ccxt.btctradeim],
    btctradeua: ['BTC', ccxt.btctradeua],
    btcturk: ['BTCTurk', ccxt.btcturk],
    btcx: ['BTCX', ccxt.btcx],
    bxinth: ['BX.in.th', ccxt.bxinth],
    ccex: ['C-CEX', ccxt.ccex],
    cex: ['CEX.IO', ccxt.cex],
    chbtc: ['CHBTC', ccxt.chbtc],
    chilebit: ['ChileBit', ccxt.chilebit],
    cobinhood: ['COBINHOOD', ccxt.cobinhood],
    coincheck: ['coincheck', ccxt.coincheck],
    coinegg: ['CoinEgg', ccxt.coinegg],
    coinex: ['CoinEx', ccxt.coinex],
    coinexchange: ['CoinExchange', ccxt.coinexchange],
    coinfloor: ['coinfloor', ccxt.coinfloor],
    coingi: ['Coingi', ccxt.coingi],
    coinmarketcap: ['CoinMarketCap', ccxt.coinmarketcap],
    coinmate: ['CoinMate', ccxt.coinmate],
    coinnest: ['coinnest', ccxt.coinnest],
    coinone: ['CoinOne', ccxt.coinone],
    coinsecure: ['Coinsecure', ccxt.coinsecure],
    coinspot: ['CoinSpot', ccxt.coinspot],
    coolcoin: ['CoolCoin', ccxt.coolcoin],
    cryptopia: ['Cryptopia', ccxt.cryptopia],
    dsx: ['DSX', ccxt.dsx],
    ethfinex: ['Ethfinex', ccxt.ethfinex],
    exmo: ['EXMO', ccxt.exmo],
    exx: ['EXX', ccxt.exx],
    flowbtc: ['flowBTC', ccxt.flowbtc],
    foxbit: ['FoxBit', ccxt.foxbit],
    fybse: ['FYB-SE', ccxt.fybse],
    fybsg: ['FYB-SG', ccxt.fybsg],
    gatecoin: ['Gatecoin', ccxt.gatecoin],
    gateio: ['Gate.io', ccxt.gateio],
    // gdax: ['GDAX', ccxt.gdax],
    gemini: ['Gemini', ccxt.gemini],
    getbtc: ['GetBTC', ccxt.getbtc],
    hadax: ['HADAX', ccxt.hadax],
    hitbtc: ['HitBTC', ccxt.hitbtc],
    hitbtc2: ['HitBTC', ccxt.hitbtc2],
    huobi: ['Huobi', ccxt.huobi],
    huobicny: ['Huobi', ccxt.huobicny],
    huobipro: ['Huobi', ccxt.huobipro],
    ice3x: ['ICE3X', ccxt.ice3x],
    independentreserve: ['Independent', ccxt.independentreserve],
    indodax: ['INDODAX', ccxt.indodax],
    itbit: ['itBit', ccxt.itbit],
    jubi: ['jubi.com', ccxt.jubi],
    kraken: ['Kraken', ccxt.kraken],
    kucoin: ['Kucoin', ccxt.kucoin],
    kuna: ['Kuna', ccxt.kuna],
    lakebtc: ['LakeBTC', ccxt.lakebtc],
    lbank: ['LBank', ccxt.lbank],
    liqui: ['Liqui', ccxt.liqui],
    livecoin: ['LiveCoin', ccxt.livecoin],
    luno: ['luno', ccxt.luno],
    lykke: ['Lykke', ccxt.lykke],
    mercado: ['Mercado', ccxt.mercado],
    mixcoins: ['MixCoins', ccxt.mixcoins],
    negociecoins: ['NegocieCoins', ccxt.negociecoins],
    nova: ['Novaexchange', ccxt.nova],
    okcoincny: ['OKCoin', ccxt.okcoincny],
    okcoinusd: ['OKCoin', ccxt.okcoinusd],
    okex: ['OKEX', ccxt.okex],
    paymium: ['Paymium', ccxt.paymium],
    poloniex: ['Poloniex', ccxt.poloniex],
    qryptos: ['QRYPTOS', ccxt.qryptos],
    quadrigacx: ['QuadrigaCX', ccxt.quadrigacx],
    quoinex: ['QUOINEX', ccxt.quoinex],
    southxchange: ['SouthXchange', ccxt.southxchange],
    surbitcoin: ['SurBitcoin', ccxt.surbitcoin],
    therock: ['TheRockTrading', ccxt.therock],
    tidex: ['Tidex', ccxt.tidex],
    urdubit: ['UrduBit', ccxt.urdubit],
    vaultoro: ['Vaultoro', ccxt.vaultoro],
    vbtc: ['VBTC', ccxt.vbtc],
    virwox: ['VirWoX', ccxt.virwox],
    wex: ['WEX', ccxt.wex],
    xbtce: ['xBTCe', ccxt.xbtce],
    yobit: ['YoBit', ccxt.yobit],
    yunbi: ['YUNBI', ccxt.yunbi],
    zaif: ['Zaif', ccxt.zaif],
    zb: ['ZB', ccxt.zb],
};

export default class CCXTExchangeWrapper implements PublicExchangeAPI, AuthenticatedExchangeAPI, ExchangeTransferAPI {
    static createExchange(name: string, auth: ExchangeAuthConfig, logger: Logger, opts: any = {}): CCXTExchangeWrapper {
        const [owner, exchange] = exchanges[name];
        const upName = name.toUpperCase();
        const key = auth.key || process.env[`${upName}_KEY`];
        const secret = auth.secret || process.env[`${upName}_SECRET`];
        const password = opts.passphrase || process.env[`${upName}_PASSPHRASE`];
        const uid = opts.uid || process.env[`${upName}_UID`];
        const options = Object.assign(opts, {apiKey: key, secret: secret, uid: uid, password: password});
        const ccxtInstance = new exchange(options);
        return new CCXTExchangeWrapper(owner, options, ccxtInstance, logger);
    }

    static supportedExchanges(): string[] {
        return Object.keys(exchanges);
    }

    static supportedExchangeNames(): string[] {
        const result: string[] = [];
        for (const x in exchanges) {
            result.push(exchanges[x][0]);
        }
        return result;
    }

    static getGDAXSymbol(m: ccxt.Market): string {
        return `${m.base}-${m.quote}`;
    }

    readonly owner: string;
    private readonly instance: ccxt.Exchange;
    private readonly options: any;
    private readonly logger: Logger;

    constructor(owner: string, opts: any, ccxtInstance: ccxt.Exchange, logger: Logger) {
        this.owner = owner;
        this.instance = ccxtInstance;
        this.options = opts;
        this.logger = logger;
    }

    log(level: string, msg: string, meta?: any) {
        if (!this.logger) {
            return;
        }
        this.logger.log(level, msg, meta);
    }

    getSourceSymbol(gdaxProduct: string): Promise<string> {
        const [base, quote] = gdaxProduct.split('-');
        return this.instance.loadMarkets(false).then((markets) => {
            for (const id in markets) {
                const m = markets[id];
                if (m.base === base && m.quote === quote) {
                    return m.symbol;
                }
            }
            return null;
        }).catch((err: Error) => rejectWithError(`Error loading symbols for ${gdaxProduct} on ${this.instance.name} (CCXT)`, err));
    }

    loadProducts(): Promise<Product[]> {
        return this.instance.loadMarkets(true).then((markets) => {
            if (!markets) {
                return [];
            }
            const result: Product[] = [];
            for (const id in markets) {
                const m = markets[id];
                const product: Product = {
                    id: CCXTExchangeWrapper.getGDAXSymbol(m),
                    sourceId: m.id,
                    baseCurrency: m.base,
                    quoteCurrency: m.quote,
                    baseMinSize: m.info && (m.info.min || m.info.minimum_order_size),
                    baseMaxSize: m.info && (m.info.max || m.info.maximum_order_size),
                    quoteIncrement: m.info && (m.info.quote_increment || m.info.step),
                    sourceData: m.info
                };
                result.push(product);
            }
            return result;
        }).catch((err: Error) => rejectWithError(`Error loading products on ${this.instance.name} (CCXT)`, err));
    }

    loadMidMarketPrice(gdaxProduct: string): Promise<BigJS> {
        return this.loadTicker(gdaxProduct).then((t: Ticker) => {
            if (!(t && t.ask && t.bid)) {
                return Promise.reject(new HTTPError(`Error loading ticker for ${gdaxProduct} from ${this.instance.name} (CCXT)`, {status: 200, body: t}));
            }
            return Promise.resolve(t.bid.plus(t.ask).div(2));
        });
    }

    loadOrderbook(gdaxProduct: string): Promise<BookBuilder> {
        return this.getSourceSymbol(gdaxProduct).then((id: string) => {
            return this.instance.fetchOrderBook(id);
        }).then((ccxtBook: ccxt.OrderBook) => {
            const book: BookBuilder = new BookBuilder(this.logger);
            const addSide = (side: Side, orders: number[][]) => {
                orders.forEach((o) => {
                    if (!Array.isArray(o) || o.length !== 2) {
                        return;
                    }
                    const order: Level3Order = {
                        price: Big(o[0]),
                        size: Big(o[1]),
                        side: side,
                        id: String(o[0])
                    };
                    book.add(order);
                });
            };
            addSide('buy', ccxtBook.bids);
            addSide('sell', ccxtBook.asks);
            return book;
        }).catch((err: Error) => rejectWithError(`Error loading order book for ${gdaxProduct} on ${this.instance.name} (CCXT)`, err));
    }

    loadTicker(gdaxProduct: string): Promise<Ticker> {
        return this.getSourceSymbol(gdaxProduct).then((id: string) => {
            return this.instance.fetchTicker(id);
        }).then((ticker: any) => {
            if (!ticker) {
                return null;
            }
            const t: Ticker = {
                productId: gdaxProduct,
                price: ZERO,
                time: new Date(ticker.timestamp),
                ask: Big(ticker.bid),
                bid: Big(ticker.ask),
                volume: Big(ticker.baseVolume)
            };
            return t;
        }).catch((err: Error) => rejectWithError(`Error loading ticker for ${gdaxProduct} on ${this.instance.name} (CCXT)`, err));
    }

    loadCandles(options: CandleRequestOptions): Promise<Candle[]> {
        const product = options.gdaxProduct;
        if (!product) {
            return Promise.reject(new Error('No product ID provided to loadCandles'));
        }
        if (!this.instance.hasFetchOHLCV) {
            return Promise.reject(new Error(`${this.instance.name} does not support candles`));
        }
        return this.getSourceSymbol(product).then((id: string) => {
            return this.instance.fetchOHLCV(id, options.interval);
        }).then((data: ccxt.OHLCV[]) => {
            const candles = data.map((d: ccxt.OHLCV) => {
                return {
                    timestamp: new Date(d[0]),
                    open: Big(d[1]),
                    high: Big(d[2]),
                    low: Big(d[3]),
                    close: Big(d[4]),
                    volume: Big(d[5])
                };
            });
            return candles;
        }).catch((err: Error) => rejectWithError(`Error loading candles for ${product} on ${this.instance.name} (CCXT)`, err));
    }

    placeOrder(order: PlaceOrderMessage): Promise<LiveOrder> {
        return this.getSourceSymbol(order.productId).then((id: string) => {
            if (!id) {
                return null;
            }
            const args = Object.assign({postOnly: order.postOnly, funds: order.funds, clientId: order.clientId}, order.extra);
            return this.instance.createOrder(id, order.orderType, order.side, order.size.toString(), order.price.toString(), args).then((res: any) => {
                const result: LiveOrder = {
                    productId: order.productId,
                    price: Big(order.price),
                    size: Big(order.size),
                    side: order.side,
                    id: res.id,
                    time: new Date(),
                    extra: res.info,
                    status: 'active'
                };
                return result;
            }).catch((err: Error) => rejectWithError(`Error placing order for ${order.productId} on ${this.instance.name} (CCXT)`, err));
        });

    }

    cancelOrder(_id: string): Promise<string> {
        return Promise.reject(new Error('Not implemented yet'));
    }

    cancelAllOrders(_gdaxProduct?: string): Promise<string[]> {
        return Promise.reject(new Error('Not implemented yet'));
    }

    loadOrder(_id: string): Promise<LiveOrder> {
        return Promise.reject(new Error('Not implemented yet'));
    }

    loadAllOrders(_gdaxProduct?: string): Promise<LiveOrder[]> {
        return Promise.reject(new Error('Not implemented yet'));
    }

    loadBalances(): Promise<Balances> {
        if (!this.options.apiKey) {
            return Promise.reject(new Error('An API key is required to make this call'));
        }
        return this.instance.fetchBalance().then((balances: any) => {
            if (!balances) {
                return null;
            }
            const result: Balances = {default: {}};
            for (const cur in balances) {
                if (cur === 'info') {
                    continue;
                }
                const total = balances[cur].total;
                const available = balances[cur].free;
                result.default[cur] = {
                    balance: isFinite(total) ? Big(total) : null,
                    available: isFinite(available) ? Big(available) : null
                };
            }
            return result;
        }).catch((err: Error) => rejectWithError(`Error loading balances on ${this.instance.name} (CCXT)`, err));
    }

    requestCryptoAddress(_cur: string): Promise<CryptoAddress> {
        return Promise.reject(new Error('Not implemented yet'));
    }

    requestTransfer(_request: TransferRequest): Promise<TransferResult> {
        return Promise.reject(new Error('Not implemented yet'));
    }

    requestWithdrawal(_request: WithdrawalRequest): Promise<TransferResult> {
        return Promise.reject(new Error('Not implemented yet'));
    }

    transfer(_cur: string, _amount: BigJS, _from: string, _to: string, _options: any): Promise<TransferResult> {
        return Promise.reject(new Error('Not implemented yet'));
    }

    /**
     * Attempts to fetch historical trade data from the exchange and return it in
     */
    async fetchHistTrades(symbol: string, since?: number, limit?: number, params?: {}): Promise<TradeMessage[]> {
        const sourceSymbol = await this.getSourceSymbol(symbol);
        try {
            const rawTrades = await this.instance.fetchTrades(sourceSymbol, since, limit, params);
            return rawTrades.map(({id, timestamp, symbol: productId, side, price, amount}) => ({
                type: 'trade' as 'trade',
                time: new Date(timestamp),
                productId,
                side,
                tradeId: id,
                price: price.toString(),
                size: amount.toString(),
            }));
        } catch (err) {
            return rejectWithError(`Error trade history for ${symbol} on ${this.instance.name} (CCXT)`, err);
        }
    }

    async fetchOHLCV(symbol: string, timeframe?: string, since?: number, limit?: number, params?: any): Promise<ccxt.OHLCV[] | null> {
        if (!this.instance.hasFetchOHLCV) {
            return Promise.reject(new GTTError(`${this.instance.name} does not support candles`));
        }
        const sourceSymbol = await this.getSourceSymbol(symbol);
        try {
            return await this.instance.fetchOHLCV(sourceSymbol, timeframe, since, limit, params);
        } catch (err) {
            return rejectWithError(`Error loading candles for ${symbol} on ${this.instance.name} (CCXT)`, err);
        }
    }
}

function rejectWithError(msg: string, error: any): Promise<never> {
    const err = new GTTError(`${error.constructor.name}: ${msg}`, error);
    return Promise.reject(err);
}
