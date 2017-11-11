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
import { CCXTHistTrade, CCXTMarket, CCXTOHLCV, CCXTOrderbook } from 'ccxt';
import { Product, PublicExchangeAPI, Ticker } from '../PublicExchangeAPI';
import { AuthenticatedExchangeAPI, Balances } from '../AuthenticatedExchangeAPI';
import { CryptoAddress, ExchangeTransferAPI, TransferRequest, TransferResult, WithdrawalRequest } from '../ExchangeTransferAPI';
import { ExchangeAuthConfig } from '../AuthConfig';
import { Big, BigJS } from '../../lib/types';
import { BookBuilder } from '../../lib/BookBuilder';
import { PlaceOrderMessage, TradeMessage } from '../../core/Messages';
import { Level3Order, LiveOrder } from '../../lib/Orderbook';
import { Logger } from '../../utils/Logger';
import { GTTError, HTTPError } from '../../lib/errors';

type ExchangeDefinition = [string, new (opts: any) => ccxt.Exchange];
// Supported exchanges, minus those with native support
const exchanges: { [index: string]: ExchangeDefinition } = {
    _1broker: ['1 Broker', ccxt._1broker],
    _1btcxe: ['BTC XE', ccxt._1btcxe],
    anxpro: ['ANX Pro', ccxt.anxpro],
    binance: ['Binance', ccxt.binance],
    bit2c: ['Bit2c', ccxt.bit2c],
    bitbay: ['Bitbay', ccxt.bitbay],
    bitbays: ['Bitbays', ccxt.bitbays],
    bitcoincoid: ['Bitcoincoid', ccxt.bitcoincoid],
    // bitfinex: ['bitfinex', ccxt.bitfinex],
    // bitfinex2: ['bitfinex2', ccxt.bitfinex2],
    bitflyer: ['Bitflyer', ccxt.bitflyer],
    bitlish: ['Bitlish', ccxt.bitlish],
    bitmarket: ['Bitmarket', ccxt.bitmarket],
    bitmex: ['Bitmex', ccxt.bitmex],
    bitso: ['Bitso', ccxt.bitso],
    bitstamp: ['Bitstamp', ccxt.bitstamp],
    // bittRex: ['bittrex', ccxt.bittrex],
    bl3p: ['BL3P', ccxt.bl3p],
    btcchina: ['BTCchina', ccxt.btcchina],
    btce: ['BTC-e', ccxt.btce],
    btcexchange: ['BTC exchange', ccxt.btcexchange],
    btcmarkets: ['BTC markets', ccxt.btcmarkets],
    btctradeua: ['BTC tradeua', ccxt.btctradeua],
    btcturk: ['BTC Turk', ccxt.btcturk],
    btcx: ['BTC-x', ccxt.btcx],
    bter: ['Bter', ccxt.bter],
    bxinth: ['Bxinth', ccxt.bxinth],
    ccex: ['C-cex', ccxt.ccex],
    cex: ['Cex', ccxt.cex],
    chbtc: ['Ch Btc', ccxt.chbtc],
    chilebit: ['Chilebit', ccxt.chilebit],
    coincheck: ['Coincheck', ccxt.coincheck],
    coinfloor: ['Coinfloor', ccxt.coinfloor],
    coingi: ['Coingi', ccxt.coingi],
    coinmarketcap: ['Coinmarketcap', ccxt.coinmarketcap],
    coinmate: ['Coinmate', ccxt.coinmate],
    coinsecure: ['Coinsecure', ccxt.coinsecure],
    coinspot: ['Coinspot', ccxt.coinspot],
    cryptopia: ['Cryptopia', ccxt.cryptopia],
    dsx: ['Dsx', ccxt.dsx],
    exmo: ['Exmo', ccxt.exmo],
    flowbtc: ['Flowbtc', ccxt.flowbtc],
    foxbit: ['Foxbit', ccxt.foxbit],
    fybse: ['Fybse', ccxt.fybse],
    fybsg: ['Fybsg', ccxt.fybsg],
    gatecoin: ['Gatecoin', ccxt.gatecoin],
    // gdax: ['gdax', ccxt.gdax],
    gemini: ['Gemini', ccxt.gemini],
    hitbtc: ['Hitbtc', ccxt.hitbtc],
    hitbtc2: ['Hitbtc2', ccxt.hitbtc2],
    huobi: ['Huobi', ccxt.huobi],
    itbit: ['Itbit', ccxt.itbit],
    jubi: ['Jubi', ccxt.jubi],
    kraken: ['Kraken', ccxt.kraken],
    lakebtc: ['LakeBTC', ccxt.lakebtc],
    livecoin: ['Livecoin', ccxt.livecoin],
    liqui: ['Liqui', ccxt.liqui],
    luno: ['Luno', ccxt.luno],
    mercado: ['Mercado', ccxt.mercado],
    okcoincny: ['Okcoincny', ccxt.okcoincny],
    okcoinusd: ['Okcoinusd', ccxt.okcoinusd],
    okex: ['Okex', ccxt.okex],
    paymium: ['Paymium', ccxt.paymium],
    poloniex: ['poloniex', ccxt.poloniex],
    quadrigacx: ['Quadrigacx', ccxt.quadrigacx],
    quoine: ['Quoine', ccxt.quoine],
    southxchange: ['Southxchange', ccxt.southxchange],
    surbitcoin: ['Surbitcoin', ccxt.surbitcoin],
    therock: ['Therock', ccxt.therock],
    urdubit: ['Urdubit', ccxt.urdubit],
    vaultoro: ['Vaultoro', ccxt.vaultoro],
    vbtc: ['VBTC', ccxt.vbtc],
    virwox: ['Virwox', ccxt.virwox],
    xbtce: ['Xbtce', ccxt.xbtce],
    yobit: ['Yobit', ccxt.yobit],
    yunbi: ['Yunbi', ccxt.yunbi],
    zaif: ['Zaif', ccxt.zaif]
};

export default class CCXTExchangeWrapper implements PublicExchangeAPI, AuthenticatedExchangeAPI, ExchangeTransferAPI {
    static createExchange(name: string, auth: ExchangeAuthConfig, logger: Logger, opts: any = {}): CCXTExchangeWrapper {
        const [owner, exchange] = exchanges[name];
        const upName = name.toUpperCase();
        const key = auth.key || process.env[`${upName}_KEY`];
        const secret = auth.secret || process.env[`${upName}_SECRET`];
        const password = opts.passphrase || process.env[`${upName}_PASSPHRASE`];
        const uid = opts.uid || process.env[`${upName}_UID`];
        const options = Object.assign(opts, { apiKey: key, secret: secret, uid: uid, password: password });
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

    static getGDAXSymbol(m: CCXTMarket): string {
        return `${m.base}-${m.quote}`;
    }

    readonly owner: string;
    private instance: ccxt.Exchange;
    private options: any;
    private logger: Logger;

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
        return this.instance.loadMarkets(false).then((markets: CCXTMarket[]) => {
            for (const id in markets) {
                const m: CCXTMarket = markets[id];
                if (m.base === base && m.quote === quote) {
                    return Promise.resolve(m.symbol);
                }
            }
            return Promise.resolve(null);
        }).catch((err: Error) => rejectWithError(`Error loading symbols for ${gdaxProduct} on ${this.instance.name} (CCXT)`, err));
    }

    loadProducts(): Promise<Product[]> {
        return this.instance.loadMarkets(true).then((markets: ccxt.CCXTMarket[]) => {
            if (!markets) {
                return Promise.resolve([]);
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
            return Promise.resolve(result);
        }).catch((err: Error) => rejectWithError(`Error loading products on ${this.instance.name} (CCXT)`, err));
    }

    loadMidMarketPrice(gdaxProduct: string): Promise<BigJS> {
        return this.loadTicker(gdaxProduct).then((t: Ticker) => {
            if (!(t && t.ask && t.bid)) {
                return Promise.reject(new HTTPError(`Error loading ticker for ${gdaxProduct} from ${this.instance.name} (CCXT)`, { status: 200, body: t}));
            }
            return Promise.resolve(t.bid.plus(t.ask).div(2));
        });
    }

    loadOrderbook(gdaxProduct: string): Promise<BookBuilder> {
        return this.getSourceSymbol(gdaxProduct).then((id: string) => {
            return this.instance.fetchOrderBook(id);
        }).then((ccxtBook: CCXTOrderbook) => {
            const book: BookBuilder = new BookBuilder(this.logger);
            const addSide = (side: string, orders: number[][]) => {
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
            return Promise.resolve(book);
        }).catch((err: Error) => rejectWithError(`Error loading order book for ${gdaxProduct} on ${this.instance.name} (CCXT)`, err));
    }

    loadTicker(gdaxProduct: string): Promise<Ticker> {
        return this.getSourceSymbol(gdaxProduct).then((id: string) => {
            return this.instance.fetchTicker(id);
        }).then((ticker: any) => {
            if (!ticker) {
                return Promise.resolve(null);
            }
            const t: Ticker = {
                productId: gdaxProduct,
                price: Big(0),
                time: new Date(ticker.timestamp),
                ask: Big(ticker.bid),
                bid: Big(ticker.ask),
                volume: Big(ticker.baseVolume)
            };
            return Promise.resolve(t);
        }).catch((err: Error) => rejectWithError(`Error loading ticker for ${gdaxProduct} on ${this.instance.name} (CCXT)`, err));
    }

    placeOrder(order: PlaceOrderMessage): Promise<LiveOrder> {
        return this.getSourceSymbol(order.productId).then((id: string) => {
            if (!id) {
                return Promise.resolve(null);
            }
            const args = Object.assign({ postOnly: order.postOnly, funds: order.funds, clientId: order.clientId }, order.extra);
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
                return Promise.resolve(result);
            }).catch((err: Error) => rejectWithError(`Error placing order for ${order.productId} on ${this.instance.name} (CCXT)`, err));
        });

    }

    cancelOrder(id: string): Promise<string> {
        throw new Error('Not implemented yet');
    }

    cancelAllOrders(product: string): Promise<string[]> {
        throw new Error('Not implemented yet');
    }

    loadOrder(id: string): Promise<LiveOrder> {
        throw new Error('Not implemented yet');
    }

    loadAllOrders(gdaxProduct: string): Promise<LiveOrder[]> {
        throw new Error('Not implemented yet');
    }

    loadBalances(): Promise<Balances> {
        if (!this.options.apiKey) {
            return Promise.reject(new Error('An API key is required to make this call'));
        }
        return this.instance.fetchBalance().then((balances: any) => {
            if (!balances) {
                return Promise.resolve(null);
            }
            const result: Balances = { default: {} };
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
            return Promise.resolve(result);
        }).catch((err: Error) => rejectWithError(`Error loading balances on ${this.instance.name} (CCXT)`, err));
    }

    requestCryptoAddress(cur: string): Promise<CryptoAddress> {
        throw new Error('Not implemented yet');
    }

    requestTransfer(request: TransferRequest): Promise<TransferResult> {
        throw new Error('Not implemented yet');
    }

    requestWithdrawal(request: WithdrawalRequest): Promise<TransferResult> {
        throw new Error('Not implemented yet');
    }

    transfer(cur: string, amount: BigJS, from: string, to: string, options: any): Promise<TransferResult> {
        throw new Error('Not implemented yet');
    }

    /**
     * Attempts to fetch historical trade data from the exchange and return it in
     */
    async fetchHistTrades(symbol: string, params?: {}): Promise<TradeMessage[]> {
        const sourceSymbol = await this.getSourceSymbol(symbol);
        try {
            const rawTrades: CCXTHistTrade[] = await this.instance.fetchTrades(sourceSymbol, params);
            return rawTrades.map(({ info, id, timestamp, datetime, symbol: _symbol, order, type, side, price, amount }) => ({
                type: 'trade' as 'trade',
                time: new Date(timestamp),
                productId: _symbol,
                side,
                tradeId: id,
                price: price.toString(),
                size: amount.toString(),
            }));
        } catch (err) {
            return rejectWithError(`Error trade history for ${symbol} on ${this.instance.name} (CCXT)`, err);
        }
    }

    async fetchOHLCV(symbol: string, params?: {}): Promise<CCXTOHLCV[] | null> {
        if (!this.instance.hasFetchOHLCV) {
            return Promise.reject(new GTTError(`${this.instance.name} does not support candles`));
        }
        const sourceSymbol = await this.getSourceSymbol(symbol);
        try {
            return await this.instance.fetchOHLCV(sourceSymbol, params);
        } catch (err) {
            return rejectWithError(`Error loading candles for ${symbol} on ${this.instance.name} (CCXT)`, err);
        }
    }
}

function rejectWithError(msg: string, error: any): Promise<never> {
    const err = new GTTError(`${error.constructor.name}: ${msg}`, error);
    return Promise.reject(err);
}
