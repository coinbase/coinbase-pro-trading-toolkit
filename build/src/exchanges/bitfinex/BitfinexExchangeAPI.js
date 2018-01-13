"use strict";
/***************************************************************************************************************************
 * @license                                                                                                                *
 * Copyright 2017 Coinbase, Inc.                                                                                           *
 *                                                                                                                         *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance          *
 * with the License. You may obtain a copy of the License at                                                               *
 *                                                                                                                         *
 * http://www.apache.org/licenses/LICENSE-2.0                                                                              *
 *                                                                                                                         *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on     *
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the                      *
 * License for the specific language governing permissions and limitations under the License.                              *
 ***************************************************************************************************************************/
Object.defineProperty(exports, "__esModule", { value: true });
const BookBuilder_1 = require("../../lib/BookBuilder");
const BitfinexAuth = require("./BitfinexAuth");
const BitfinexAuth_1 = require("./BitfinexAuth");
const BitfinexCommon_1 = require("./BitfinexCommon");
const types_1 = require("../../lib/types");
const request = require("superagent");
const errors_1 = require("../../lib/errors");
const API_V1 = 'https://api.bitfinex.com/v1';
const ORDER_TYPE_MAP = {
    limit: 'exchange limit',
    market: 'exchange market',
    stop: 'exchange stop'
};
/**
 * An adapter class that maps the standardized API calls to Bitfinex's API interface
 */
class BitfinexExchangeAPI {
    /**
     * Returns the Bitfinex product that's equivalent to the given GDAX product. If it doesn't exist,
     * return the given product
     * @param gdaxProduct
     * @returns {string} Bitfinex product code
     */
    static product(gdaxProduct) {
        return BitfinexCommon_1.PRODUCT_MAP[gdaxProduct] || gdaxProduct;
    }
    static convertBSOPToOrder(bfOrder) {
        return {
            time: new Date(+bfOrder.timestamp * 1000),
            id: bfOrder.id.toString(),
            productId: BitfinexCommon_1.REVERSE_PRODUCT_MAP[bfOrder.symbol],
            size: types_1.Big(bfOrder.executed_amount),
            price: types_1.Big(bfOrder.price),
            side: bfOrder.side,
            status: bfOrder.is_live ? 'open' : 'done',
            extra: {
                exchange: bfOrder.exchange,
                aveExecutionPrice: bfOrder.avg_execution_price,
                remainingAmount: bfOrder.remaining_amount,
                type: bfOrder.type
            }
        };
    }
    constructor(config) {
        this.owner = 'Bitfinex';
        this.auth = config.auth && config.auth.key && config.auth.secret ? config.auth : undefined;
        this.logger = config.logger;
    }
    loadProducts() {
        return request.get(`${API_V1}/symbols_details`)
            .accept('application/json')
            .then((res) => {
            if (res.status !== 200) {
                return Promise.reject(new errors_1.HTTPError('Error loading products from Bitfinex', errors_1.extractResponse(res)));
            }
            const bfProducts = res.body;
            const products = bfProducts.map((prod) => {
                const base = prod.pair.slice(0, 3);
                const quote = prod.pair.slice(3, 6);
                return {
                    id: BitfinexCommon_1.REVERSE_PRODUCT_MAP[prod.pair] || prod.pair,
                    sourceId: prod.pair,
                    baseCurrency: BitfinexCommon_1.REVERSE_CURRENCY_MAP[base] || base,
                    quoteCurrency: BitfinexCommon_1.REVERSE_CURRENCY_MAP[quote] || quote,
                    baseMinSize: types_1.Big(prod.minimum_order_size),
                    baseMaxSize: types_1.Big(prod.maximum_order_size),
                    quoteIncrement: types_1.Big(prod.minimum_order_size),
                    sourceData: prod
                };
            });
            return Promise.resolve(products);
        }).catch((err) => {
            return Promise.reject(new errors_1.GTTError('Error loading products from Bitfinex', err));
        });
    }
    loadMidMarketPrice(gdaxProduct) {
        return this.loadTicker(gdaxProduct).then((ticker) => {
            return ticker.bid.plus(ticker.ask).times(0.5);
        });
    }
    loadOrderbook(gdaxProduct) {
        const product = BitfinexExchangeAPI.product(gdaxProduct);
        return request.get(`${API_V1}/book/${product}`)
            .query({ grouped: 1 })
            .accept('application/json')
            .then((res) => {
            if (res.status !== 200) {
                return Promise.reject(new errors_1.HTTPError('Error loading order book from Bitfinex', errors_1.extractResponse(res)));
            }
            return Promise.resolve(this.convertBitfinexBookToGdaxBook(res.body));
        }).catch((err) => {
            return Promise.reject(new errors_1.GTTError(`Error loading ${gdaxProduct} order book from Bitfinex`, err));
        });
    }
    loadTicker(gdaxProduct) {
        const product = BitfinexExchangeAPI.product(gdaxProduct);
        return request.get(`${API_V1}/pubticker/${product}`)
            .accept('application/json')
            .then((res) => {
            if (res.status !== 200) {
                return Promise.reject(new errors_1.HTTPError('Error loading ticker from Bitfinex', errors_1.extractResponse(res)));
            }
            const ticker = res.body;
            return Promise.resolve({
                productId: gdaxProduct,
                ask: ticker.ask ? types_1.Big(ticker.ask) : null,
                bid: ticker.bid ? types_1.Big(ticker.bid) : null,
                price: types_1.Big(ticker.last_price || 0),
                volume: types_1.Big(ticker.volume || 0),
                time: new Date(+ticker.timestamp * 1000)
            });
        }).catch((err) => {
            return Promise.reject(new errors_1.GTTError(`Error loading ${gdaxProduct} ticker from Bitfinex`, err));
        });
    }
    checkAuth() {
        return new Promise((resolve, reject) => {
            if (this.auth === null) {
                return reject(new errors_1.GTTError('You cannot make authenticated requests if a ExchangeAuthConfig object was not provided to the BitfinexExchangeAPI constructor'));
            }
            return resolve(this.auth);
        });
    }
    placeOrder(order) {
        return this.checkAuth().then((auth) => {
            const bfOrder = {
                product_id: BitfinexCommon_1.PRODUCT_MAP[order.productId],
                size: order.size,
                price: order.price,
                side: order.side,
                type: ORDER_TYPE_MAP[order.type],
                post_only: !!order.postOnly
            };
            return BitfinexAuth.placeOrder(auth, bfOrder).then((result) => {
                if (this.logger) {
                    this.logger.log('debug', 'Order placed on Bitfinex', result);
                }
                return BitfinexExchangeAPI.convertBSOPToOrder(result);
            });
        });
    }
    cancelOrder(id) {
        return this.checkAuth().then((auth) => {
            return BitfinexAuth.cancelOrder(auth, parseInt(id, 10)).then((result) => {
                if (this.logger) {
                    this.logger.log('debug', 'Order cancelled on Bitfinex', result);
                }
                return result.id.toString();
            });
        });
    }
    cancelAllOrders() {
        return this.checkAuth().then((auth) => {
            return BitfinexAuth.cancelAllOrders(auth).then((result) => {
                if (this.logger) {
                    this.logger.log('debug', 'All Orders cancelled on Bitfinex', result);
                }
                return [];
            });
        });
    }
    loadOrder(id) {
        return this.checkAuth().then((auth) => {
            return BitfinexAuth.orderStatus(auth, parseInt(id, 10)).then((result) => {
                if (this.logger) {
                    this.logger.log('debug', 'Bitfinex Order status', result);
                }
                return BitfinexExchangeAPI.convertBSOPToOrder(result);
            });
        });
    }
    loadAllOrders() {
        return this.checkAuth().then((auth) => {
            return BitfinexAuth.activeOrders(auth).then((results) => {
                if (this.logger) {
                    this.logger.log('debug', `${results.length} Bitfinex active orders retrieved`);
                }
                return results.map((order) => BitfinexExchangeAPI.convertBSOPToOrder(order));
            });
        });
    }
    loadBalances() {
        return this.checkAuth().then((auth) => {
            return BitfinexAuth.loadBalances(auth).then((results) => {
                if (this.logger) {
                    this.logger.log('debug', 'Bitfinex wallet balances retrieved', results);
                }
                const balances = {};
                results.forEach((wallet) => {
                    if (!balances[wallet.type]) {
                        balances[wallet.type] = {};
                    }
                    const cur = BitfinexCommon_1.REVERSE_CURRENCY_MAP[wallet.currency.toLowerCase()];
                    balances[wallet.type][cur] = {
                        available: types_1.Big(wallet.available),
                        balance: types_1.Big(wallet.amount)
                    };
                });
                return balances;
            });
        });
    }
    // -------------------------- Transfer methods -------------------------------------------------
    requestCryptoAddress(cur) {
        return Promise.reject(new errors_1.GTTError('Not implemented'));
    }
    requestTransfer(req) {
        if (!BitfinexAuth_1.isBFWallet(req.walletIdFrom)) {
            return Promise.reject(new Error(`walletIdFrom "${req.walletIdFrom} is not a valid Bitfinex Wallet name`));
        }
        if (!BitfinexAuth_1.isBFWallet(req.walletIdTo)) {
            return Promise.reject(new Error(`walletIdTo "${req.walletIdTo} is not a valid Bitfinex Wallet name`));
        }
        return this.checkAuth().then((auth) => {
            const bfRequest = {
                amount: req.amount.toString(),
                currency: req.currency,
                walletfrom: req.walletIdFrom,
                walletto: req.walletIdTo
            };
            return BitfinexAuth.transfer(auth, bfRequest).then((response) => {
                if (response.status === 200) {
                    const bfResult = response.body[0];
                    return {
                        success: bfResult.status === 'success',
                        details: bfResult.message
                    };
                }
                const err = new Error('Bitfinex transfer request failed');
                err.details = response.body;
                return Promise.reject(err);
            });
        });
    }
    requestWithdrawal(req) {
        return Promise.reject(new errors_1.GTTError('Not implemented'));
    }
    transfer(cur, amount, from, to, options) {
        return Promise.reject(new errors_1.GTTError('Not implemented'));
    }
    // -------------------------- Helper methods -------------------------------------------------
    convertBitfinexBookToGdaxBook(bfBook) {
        const book = new BookBuilder_1.BookBuilder(this.logger);
        bfBook.asks.forEach((order) => {
            addToLevel('sell', order);
        });
        bfBook.bids.forEach((order) => {
            addToLevel('buy', order);
        });
        // The 'websocket feed' will start counting from 1
        book.sequence = 0;
        return book;
        function addToLevel(side, order) {
            try {
                book.addLevel(side, convertOrder(side, order));
            }
            catch (err) {
                const newSize = types_1.Big(order.amount).abs().plus(book.getOrder(order.price).size);
                order.amount = newSize.toString();
                book.modify(order.price, newSize, side);
            }
        }
        function convertOrder(side, order) {
            const price = types_1.Big(order.price);
            const size = types_1.Big(order.amount).abs();
            const level = new BookBuilder_1.AggregatedLevelWithOrders(price);
            level.addOrder({
                id: order.price,
                price: price,
                size: size,
                side: side
            });
            return level;
        }
    }
}
exports.BitfinexExchangeAPI = BitfinexExchangeAPI;
//# sourceMappingURL=BitfinexExchangeAPI.js.map