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
import { CCXTMarket } from 'ccxt';
import { Product, PublicExchangeAPI, Ticker } from '../PublicExchangeAPI';
import { AuthenticatedExchangeAPI, Balances } from '../AuthenticatedExchangeAPI';
import { CryptoAddress, ExchangeTransferAPI, TransferRequest, TransferResult, WithdrawalRequest } from '../ExchangeTransferAPI';
import { ExchangeAuthConfig } from '../AuthConfig';
import { Big, BigJS } from '../../lib/types';
import { BookBuilder } from '../../lib/BookBuilder';
import { PlaceOrderMessage } from '../../core/Messages';
import { LiveOrder } from '../../lib/Orderbook';
import { Logger } from '../../utils/Logger';

type ExchangeDefinition = [string, (opts: any) => ccxt.Exchange];
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
    // poloniex: ['poloniex', ccxt.poloniex],
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
        const ccxtInstance = exchange(options);
        return new CCXTExchangeWrapper(owner, auth, ccxtInstance, logger);
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

    loadProducts(): Promise<Product[]> {
        return this.instance.loadMarkets(true).then((markets: ccxt.CCXTMarket[]) => {
            if (!markets) {
                return Promise.resolve([]);
            }
            const result: Product[] = [];
            for (const id in markets) {
                const m = markets[id];
                const product: Product = {
                    id: `${m.base}-${m.quote}`,
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
        }).catch((err) => {
            this.log('error', `Could not load products for ${this.owner}`, err);
            return Promise.resolve([]);
        });
    }

    loadMidMarketPrice(gdaxProduct: string): Promise<BigJS> {
        return undefined;
    }

    loadOrderbook(gdaxProduct: string): Promise<BookBuilder> {
        return undefined;
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
        });
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
        }).catch((err) => {
            this.log('error', `Could not load ticker for ${gdaxProduct} on ${this.owner}`, err);
            return Promise.resolve(null);
        });
    }

    placeOrder(order: PlaceOrderMessage): Promise<LiveOrder> {
        return undefined;
    }

    cancelOrder(id: string): Promise<string> {
        return undefined;
    }

    cancelAllOrders(product: string): Promise<string[]> {
        return undefined;
    }

    loadOrder(id: string): Promise<LiveOrder> {
        return undefined;
    }

    loadAllOrders(gdaxProduct: string): Promise<LiveOrder[]> {
        return undefined;
    }

    loadBalances(): Promise<Balances> {
        return undefined;
    }

    requestCryptoAddress(cur: string): Promise<CryptoAddress> {
        return undefined;
    }

    requestTransfer(request: TransferRequest): Promise<TransferResult> {
        return undefined;
    }

    requestWithdrawal(request: WithdrawalRequest): Promise<TransferResult> {
        return undefined;
    }

    transfer(cur: string, amount: BigJS, from: string, to: string, options: any): Promise<TransferResult> {
        return undefined;
    }
}
