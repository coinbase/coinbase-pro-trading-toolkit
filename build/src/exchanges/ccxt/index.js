"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ccxt = require("ccxt");
const types_1 = require("../../lib/types");
const BookBuilder_1 = require("../../lib/BookBuilder");
const errors_1 = require("../../lib/errors");
// Supported exchanges, minus those with native support
const exchanges = {
    _1broker: ['1 Broker', ccxt._1broker],
    _1btcxe: ['BTC XE', ccxt._1btcxe],
    anxpro: ['ANX Pro', ccxt.anxpro],
    binance: ['Binance', ccxt.binance],
    bit2c: ['Bit2c', ccxt.bit2c],
    bitbay: ['Bitbay', ccxt.bitbay],
    bitbays: ['Bitbays', ccxt.bitbays],
    bitcoincoid: ['Bitcoincoid', ccxt.bitcoincoid],
    bitfinex: ['bitfinex', ccxt.bitfinex],
    bitfinex2: ['bitfinex2', ccxt.bitfinex2],
    bitflyer: ['Bitflyer', ccxt.bitflyer],
    bitlish: ['Bitlish', ccxt.bitlish],
    bitmarket: ['Bitmarket', ccxt.bitmarket],
    bitmex: ['Bitmex', ccxt.bitmex],
    bitso: ['Bitso', ccxt.bitso],
    bitstamp: ['Bitstamp', ccxt.bitstamp],
    bittrex: ['bittrex', ccxt.bittrex],
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
class CCXTExchangeWrapper {
    static createExchange(name, auth, logger, opts = {}) {
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
    static supportedExchanges() {
        return Object.keys(exchanges);
    }
    static supportedExchangeNames() {
        const result = [];
        for (const x in exchanges) {
            result.push(exchanges[x][0]);
        }
        return result;
    }
    static getGDAXSymbol(m) {
        return `${m.base}-${m.quote}`;
    }
    constructor(owner, opts, ccxtInstance, logger) {
        this.owner = owner;
        this.instance = ccxtInstance;
        this.options = opts;
        this.logger = logger;
    }
    log(level, msg, meta) {
        if (!this.logger) {
            return;
        }
        this.logger.log(level, msg, meta);
    }
    getSourceSymbol(gdaxProduct) {
        const [base, quote] = gdaxProduct.split('-');
        return this.instance.loadMarkets(false).then((markets) => {
            for (const id in markets) {
                const m = markets[id];
                if (m.base === base && m.quote === quote) {
                    return Promise.resolve(m.symbol);
                }
            }
            return Promise.resolve(null);
        }).catch((err) => rejectWithError(`Error loading symbols for ${gdaxProduct} on ${this.instance.name} (CCXT)`, err));
    }
    loadProducts() {
        return this.instance.loadMarkets(true).then((markets) => {
            if (!markets) {
                return Promise.resolve([]);
            }
            const result = [];
            for (const id in markets) {
                const m = markets[id];
                const product = {
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
        }).catch((err) => rejectWithError(`Error loading products on ${this.instance.name} (CCXT)`, err));
    }
    loadMidMarketPrice(gdaxProduct) {
        return this.loadTicker(gdaxProduct).then((t) => {
            if (!(t && t.ask && t.bid)) {
                return Promise.reject(new errors_1.HTTPError(`Error loading ticker for ${gdaxProduct} from ${this.instance.name} (CCXT)`, { status: 200, body: t }));
            }
            return Promise.resolve(t.bid.plus(t.ask).div(2));
        });
    }
    loadOrderbook(gdaxProduct) {
        return this.getSourceSymbol(gdaxProduct).then((id) => {
            return this.instance.fetchOrderBook(id);
        }).then((ccxtBook) => {
            const book = new BookBuilder_1.BookBuilder(this.logger);
            const addSide = (side, orders) => {
                orders.forEach((o) => {
                    if (!Array.isArray(o) || o.length !== 2) {
                        return;
                    }
                    const order = {
                        price: types_1.Big(o[0]),
                        size: types_1.Big(o[1]),
                        side: side,
                        id: String(o[0])
                    };
                    book.add(order);
                });
            };
            addSide('buy', ccxtBook.bids);
            addSide('sell', ccxtBook.asks);
            return Promise.resolve(book);
        }).catch((err) => rejectWithError(`Error loading order book for ${gdaxProduct} on ${this.instance.name} (CCXT)`, err));
    }
    loadTicker(gdaxProduct) {
        return this.getSourceSymbol(gdaxProduct).then((id) => {
            return this.instance.fetchTicker(id);
        }).then((ticker) => {
            if (!ticker) {
                return Promise.resolve(null);
            }
            const t = {
                productId: gdaxProduct,
                price: types_1.Big(0),
                time: new Date(ticker.timestamp),
                ask: types_1.Big(ticker.bid),
                bid: types_1.Big(ticker.ask),
                volume: types_1.Big(ticker.baseVolume)
            };
            return Promise.resolve(t);
        }).catch((err) => rejectWithError(`Error loading ticker for ${gdaxProduct} on ${this.instance.name} (CCXT)`, err));
    }
    placeOrder(order) {
        return this.getSourceSymbol(order.productId).then((id) => {
            if (!id) {
                return Promise.resolve(null);
            }
            const args = Object.assign({ postOnly: order.postOnly, funds: order.funds, clientId: order.clientId }, order.extra);
            return this.instance.createOrder(id, order.orderType, order.side, order.size.toString(), order.price.toString(), args).then((res) => {
                const result = {
                    productId: order.productId,
                    price: types_1.Big(order.price),
                    size: types_1.Big(order.size),
                    side: order.side,
                    id: res.id,
                    time: new Date(),
                    extra: res.info,
                    status: 'active'
                };
                return Promise.resolve(result);
            }).catch((err) => rejectWithError(`Error placing order for ${order.productId} on ${this.instance.name} (CCXT)`, err));
        });
    }
    cancelOrder(id) {
        throw new Error('Not implemented yet');
    }
    cancelAllOrders(product) {
        throw new Error('Not implemented yet');
    }
    loadOrder(id) {
        throw new Error('Not implemented yet');
    }
    loadAllOrders(gdaxProduct) {
        throw new Error('Not implemented yet');
    }
    loadBalances() {
        if (!this.options.apiKey) {
            return Promise.reject(new Error('An API key is required to make this call'));
        }
        return this.instance.fetchBalance().then((balances) => {
            if (!balances) {
                return Promise.resolve(null);
            }
            const result = { default: {} };
            for (const cur in balances) {
                if (cur === 'info') {
                    continue;
                }
                const total = balances[cur].total;
                const available = balances[cur].free;
                result.default[cur] = {
                    balance: isFinite(total) ? types_1.Big(total) : null,
                    available: isFinite(available) ? types_1.Big(available) : null
                };
            }
            return Promise.resolve(result);
        }).catch((err) => rejectWithError(`Error loading balances on ${this.instance.name} (CCXT)`, err));
    }
    requestCryptoAddress(cur) {
        throw new Error('Not implemented yet');
    }
    requestTransfer(request) {
        throw new Error('Not implemented yet');
    }
    requestWithdrawal(request) {
        throw new Error('Not implemented yet');
    }
    transfer(cur, amount, from, to, options) {
        throw new Error('Not implemented yet');
    }
    /**
     * Attempts to fetch historical trade data from the exchange and return it in
     */
    fetchHistTrades(symbol, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const sourceSymbol = yield this.getSourceSymbol(symbol);
            try {
                const rawTrades = yield this.instance.fetchTrades(sourceSymbol, params);
                return rawTrades.map(({ info, id, timestamp, datetime, symbol: _symbol, order, type, side, price, amount }) => ({
                    type: 'trade',
                    time: new Date(timestamp),
                    productId: _symbol,
                    side,
                    tradeId: id,
                    price: price.toString(),
                    size: amount.toString(),
                }));
            }
            catch (err) {
                return rejectWithError(`Error trade history for ${symbol} on ${this.instance.name} (CCXT)`, err);
            }
        });
    }
    fetchOHLCV(symbol, params) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.instance.hasFetchOHLCV) {
                return Promise.reject(new errors_1.GTTError(`${this.instance.name} does not support candles`));
            }
            const sourceSymbol = yield this.getSourceSymbol(symbol);
            try {
                return yield this.instance.fetchOHLCV(sourceSymbol, params);
            }
            catch (err) {
                return rejectWithError(`Error loading candles for ${symbol} on ${this.instance.name} (CCXT)`, err);
            }
        });
    }
}
exports.default = CCXTExchangeWrapper;
function rejectWithError(msg, error) {
    const err = new errors_1.GTTError(`${error.constructor.name}: ${msg}`, error);
    return Promise.reject(err);
}
//# sourceMappingURL=index.js.map