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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const BookBuilder_1 = require("../../lib/BookBuilder");
const types_1 = require("../../lib/types");
const gdax_1 = require("gdax");
const assert = require("assert");
const errors_1 = require("../../lib/errors");
const request = require("superagent");
const querystring = require("querystring");
const crypto = require("crypto");
exports.GDAX_API_URL = 'https://api.gdax.com';
class GDAXExchangeAPI {
    constructor(options) {
        this.owner = 'GDAX';
        this._apiURL = options.apiUrl || exports.GDAX_API_URL;
        this.auth = options.auth;
        this.logger = options.logger;
        if (this.auth) {
            this.authClient = new gdax_1.AuthenticatedClient(this.auth.key, this.auth.secret, this.auth.passphrase, this._apiURL);
        }
        this.publicClients = { default: new gdax_1.PublicClient('BTC-USD', this._apiURL) };
        this.publicClients['BTC-USD'] = this.publicClients.default;
    }
    get apiURL() {
        return this._apiURL;
    }
    log(level, message, meta) {
        if (!this.logger) {
            return;
        }
        this.logger.log(level, message, meta);
    }
    loadProducts() {
        return this.getPublicClient().getProducts()
            .then((products) => {
            return products.map((prod) => {
                return {
                    id: prod.id,
                    sourceId: prod.id,
                    baseCurrency: prod.base_currency,
                    quoteCurrency: prod.quote_currency,
                    baseMinSize: types_1.Big(prod.base_min_size),
                    baseMaxSize: types_1.Big(prod.base_max_size),
                    quoteIncrement: types_1.Big(prod.quote_increment),
                    sourceData: prod
                };
            });
        }).catch((err) => {
            return Promise.reject(new errors_1.HTTPError('Error loading products from GDAX', errors_1.extractResponse(err.response)));
        });
    }
    loadMidMarketPrice(product) {
        return this.loadTicker(product).then((ticker) => {
            if (!ticker || !ticker.bid || !ticker.ask) {
                throw new errors_1.HTTPError(`Loading midmarket price for ${product} failed because ticker data was incomplete or unavailable`, { status: 200, body: ticker });
            }
            return ticker.ask.plus(ticker.bid).times(0.5);
        });
    }
    loadOrderbook(product) {
        return this.loadFullOrderbook(product);
    }
    loadFullOrderbook(product) {
        return this.loadGDAXOrderbook({ product: product, level: 3 }).then((body) => {
            return this.buildBook(body);
        });
    }
    loadGDAXOrderbook(options) {
        const { product } = options, params = __rest(options, ["product"]);
        return this.getPublicClient(product).getProductOrderBook(params)
            .then((orders) => {
            if (!(orders.bids && orders.asks)) {
                return Promise.reject(new errors_1.HTTPError(`Error loading ${product} orderbook from GDAX`, { status: 200, body: orders }));
            }
            return orders;
        }).catch((err) => {
            return Promise.reject(new errors_1.HTTPError(`Error loading ${product} orderbook from GDAX`, errors_1.extractResponse(err.response)));
        });
    }
    loadTicker(product) {
        return this.getPublicClient(product).getProductTicker()
            .then((ticker) => {
            return {
                productId: product,
                ask: ticker.ask ? types_1.Big(ticker.ask) : undefined,
                bid: ticker.bid ? types_1.Big(ticker.bid) : undefined,
                price: types_1.Big(ticker.price || 0),
                size: types_1.Big(ticker.size || 0),
                volume: types_1.Big(ticker.volume || 0),
                time: new Date(ticker.time || new Date()),
                trade_id: ticker.trade_id ? ticker.trade_id.toString() : '0'
            };
        }).catch((err) => {
            return Promise.reject(new errors_1.HTTPError(`Error loading ${product} ticker from GDAX`, errors_1.extractResponse(err.response)));
        });
    }
    aggregateBook(body) {
        const book = new BookBuilder_1.BookBuilder(this.logger);
        book.sequence = parseInt(body.sequence, 10);
        ['bids', 'asks'].forEach((side) => {
            let currentPrice;
            let order;
            const bookSide = side === 'bids' ? 'buy' : 'sell';
            body[side].forEach((bid) => {
                if (bid[0] !== currentPrice) {
                    // Set the price on the old level
                    if (order) {
                        book.add(order);
                    }
                    currentPrice = bid[0];
                    order = {
                        id: currentPrice,
                        price: types_1.Big(currentPrice),
                        side: bookSide,
                        size: types_1.ZERO
                    };
                }
                order.size = order.size.plus(bid[1]);
            });
            if (order) {
                book.add(order);
            }
        });
        return book;
    }
    // ----------------------------------- Authenticated API methods --------------------------------------------------//
    placeOrder(order) {
        if (!this.authClient) {
            return Promise.reject(new errors_1.GTTError('No authentication details were given for this API'));
        }
        let gdaxOrder;
        assert(order.side === 'buy' || order.side === 'sell');
        const side = order.side === 'buy' ? 'buy' : 'sell';
        switch (order.orderType) {
            case 'limit':
                gdaxOrder = {
                    product_id: order.productId,
                    size: order.size,
                    price: order.price,
                    side: side,
                    type: 'limit',
                    client_oid: order.clientId,
                    post_only: order.postOnly,
                    time_in_force: order.extra && order.extra.time_in_force,
                    cancel_after: order.extra && order.extra.cancel_after,
                    stp: order.extra && order.extra.stp
                };
                break;
            case 'market':
                gdaxOrder = {
                    type: 'market',
                    product_id: order.productId,
                    side: side,
                    size: order.size,
                    client_oid: order.clientId,
                    funds: order.funds,
                    stp: order.extra && order.extra.stp
                };
                break;
            case 'stop':
                gdaxOrder = {
                    type: 'stop',
                    product_id: order.productId,
                    side: side,
                    size: order.size,
                    price: order.price,
                    funds: order.funds,
                    client_oid: order.clientId,
                    stp: order.extra && order.extra.stp
                };
                break;
            default:
                return Promise.reject(new errors_1.GTTError('Invalid Order type: ' + order.type));
        }
        const clientMethod = side === 'buy' ? this.authClient.buy.bind(this.authClient) : this.authClient.sell.bind(this.authClient);
        return clientMethod(gdaxOrder).then((result) => {
            // Check for error
            if (result.message) {
                return Promise.reject(new errors_1.APIError(`Placing order on ${order.productId} failed`, result));
            }
            return GDAXOrderToOrder(result);
        }, (err) => {
            const errMsg = err.response ? new errors_1.HTTPError(`Placing order on ${order.productId} failed`, errors_1.extractResponse(err.response)) : err;
            return Promise.reject(errMsg);
        });
    }
    cancelOrder(id) {
        const apiCall = this.authCall('DELETE', `/orders/${id}`, {});
        return this.handleResponse(apiCall, { order_id: id }).then((ids) => {
            return Promise.resolve(ids[0]);
        });
    }
    cancelAllOrders(product) {
        const apiCall = this.authCall('DELETE', `/orders`, {});
        const options = product ? { product_id: product } : null;
        return this.handleResponse(apiCall, options).then((ids) => {
            return Promise.resolve(ids);
        });
    }
    loadOrder(id) {
        if (!this.authClient) {
            return Promise.reject(new errors_1.GTTError('No authentication details were given for this API'));
        }
        return this.authClient.getOrder(id).then((order) => {
            return GDAXOrderToOrder(order);
        }).catch((err) => {
            return Promise.reject(new errors_1.HTTPError('Error loading order details on GDAX', errors_1.extractResponse(err.response)));
        });
    }
    loadAllOrders(product) {
        const self = this;
        let allOrders = [];
        const loop = (after) => {
            return self.loadNextOrders(product, after).then((result) => {
                const liveOrders = result.orders.map(GDAXOrderToOrder);
                allOrders = allOrders.concat(liveOrders);
                if (result.after) {
                    return loop(result.after);
                }
                else {
                    return allOrders;
                }
            });
        };
        return loop(null);
    }
    loadBalances() {
        if (!this.authClient) {
            return Promise.reject(new errors_1.GTTError('No authentication details were given for this API'));
        }
        return this.authClient.getAccounts().then((accounts) => {
            const balances = {};
            accounts.forEach((account) => {
                if (!balances[account.profile_id]) {
                    balances[account.profile_id] = {};
                }
                balances[account.profile_id][account.currency] = {
                    balance: types_1.Big(account.balance),
                    available: types_1.Big(account.available)
                };
            });
            return balances;
        }).catch((err) => {
            return Promise.reject(new errors_1.HTTPError('Error loading account balances on GDAX', errors_1.extractResponse(err.response)));
        });
    }
    authCall(method, path, opts) {
        return this.checkAuth().then(() => {
            method = method.toUpperCase();
            const url = `${this.apiURL}${path}`;
            let body = '';
            let req = request(method, url)
                .accept('application/json')
                .set('content-type', 'application/json');
            if (opts.body) {
                body = JSON.stringify(opts.body);
                req.send(body);
            }
            else if (opts.qs && Object.keys(opts.qs).length !== 0) {
                req.query(opts.qs);
                body = '?' + querystring.stringify(opts.qs);
            }
            const signature = this.getSignature(method, path, body);
            req.set(signature);
            if (opts.headers) {
                req = req.set(opts.headers);
            }
            return Promise.resolve(req);
        });
    }
    getSignature(method, relativeURI, body) {
        body = body || '';
        const timestamp = (Date.now() / 1000).toFixed(3);
        const what = timestamp + method + relativeURI + body;
        const key = Buffer.from(this.auth.secret, 'base64');
        const hmac = crypto.createHmac('sha256', key);
        const signature = hmac.update(what).digest('base64');
        return {
            'CB-ACCESS-KEY': this.auth.key,
            'CB-ACCESS-SIGN': signature,
            'CB-ACCESS-TIMESTAMP': timestamp,
            'CB-ACCESS-PASSPHRASE': this.auth.passphrase
        };
    }
    handleResponse(req, meta) {
        // then<T> is required to workaround bug in TS2.1 https://github.com/Microsoft/TypeScript/issues/10977
        return req.then((res) => {
            if (res.status >= 200 && res.status < 300) {
                return Promise.resolve(res.body);
            }
            const err = new errors_1.HTTPError(`Error handling GDAX request for ${req.url}`, res);
            return Promise.reject(err);
        }).catch((err) => {
            const error = new errors_1.GTTError('A GDAX API request failed.', err); // TODO add req url here
            return Promise.reject(error);
        });
    }
    checkAuth() {
        return new Promise((resolve, reject) => {
            if (this.auth === null) {
                return reject(new errors_1.GTTError('You cannot make authenticated requests if a GDAXAuthConfig object was not provided to the GDAXExchangeAPI constructor'));
            }
            if (!(this.auth.key && this.auth.secret && this.auth.passphrase)) {
                return reject(new errors_1.GTTError('You cannot make authenticated requests without providing all API credentials'));
            }
            return resolve();
        });
    }
    // ---------------------------------- Transfer API Methods --------------------------------------------------//
    requestCryptoAddress(cur) {
        return this.loadCoinbaseAccount(cur, false).then((account) => {
            const id = account.id;
            if (!id) {
                return Promise.reject(new errors_1.GTTError('Coinbase account does not have an ID'));
            }
            const apiCall = this.authCall('POST', `/coinbase-accounts/${id}/addresses`, {});
            return this.handleResponse(apiCall, null);
        }).then((res) => {
            const validResult = res.address && res.exchange_deposit_address === true;
            if (!validResult) {
                return Promise.reject(new errors_1.GTTError(`Could not obtain a valid crypto address for${cur}`));
            }
            return Promise.resolve({
                address: res.address,
                currency: cur
            });
        });
    }
    requestTransfer(req) {
        if (!this.authClient) {
            return Promise.reject(new errors_1.GTTError('No authentication details were given for this API'));
        }
        if (req.walletIdFrom.toLowerCase() === 'coinbase') {
            return this.coinbaseTransfer(true, req.amount, req.currency);
        }
        if (req.walletIdTo.toLowerCase() === 'coinbase') {
            return this.coinbaseTransfer(false, req.amount, req.currency);
        }
        return Promise.reject('GDAX does not support multiple accounts.');
    }
    requestWithdrawal(req) {
        if (!this.authClient) {
            return Promise.reject(new errors_1.GTTError('No authentication details were given for this API'));
        }
        const params = {
            amount: req.amount,
            currency: req.currency,
            crypto_address: req.address
        };
        return this.authClient.withdrawCrypto(params).catch((err) => {
            return Promise.reject(new errors_1.HTTPError(`Error on GDAX withdrawal request`, errors_1.extractResponse(err.response)));
        });
    }
    // ------------------------------ GDAX-specific public Methods ------------------------------------------------//
    loadCoinbaseAccounts(force) {
        if (this.coinbaseAccounts && !force) {
            return Promise.resolve(this.coinbaseAccounts);
        }
        if (!this.authClient) {
            return Promise.reject(new errors_1.GTTError('No authentication details were given for this API'));
        }
        return this.authClient.getCoinbaseAccounts().then((accounts) => {
            this.coinbaseAccounts = accounts;
            return Promise.resolve(accounts);
        }).catch((err) => {
            return Promise.reject(new errors_1.HTTPError('Error loading Coinbase accounts', errors_1.extractResponse(err.response)));
        });
    }
    coinbaseTransfer(isDeposit, amount, currency) {
        return this.loadCoinbaseAccount(currency, false).then((account) => {
            const params = {
                coinbase_account_id: account.id,
                currency: currency,
                amount: amount.toString()
            };
            return isDeposit ? this.authClient.deposit(params) : this.authClient.withdraw(params);
        }).then((result) => {
            return {
                success: !!result.id,
                details: result
            };
        }).catch((err) => {
            return Promise.reject(new errors_1.HTTPError(`Error ${isDeposit ? 'depositing from' : 'withdrawing to'} Coinbase account`, errors_1.extractResponse(err.response)));
        });
    }
    /**
     * Return a promise for a Coinbase account associated with a given currency. Rejects the promise if the account does not exist
     */
    loadCoinbaseAccount(currency, force) {
        return this.loadCoinbaseAccounts(force).then((accounts) => {
            for (const account of accounts) {
                if (account.currency === currency) {
                    return Promise.resolve(account);
                }
            }
            return Promise.reject(new errors_1.GTTError(`No Coinbase account for ${currency} exists`));
        });
    }
    buildBook(body) {
        const book = new BookBuilder_1.BookBuilder(this.logger);
        book.sequence = parseInt(body.sequence, 10);
        ['bids', 'asks'].forEach((side) => {
            const bookSide = side === 'bids' ? 'buy' : 'sell';
            body[side].forEach((data) => {
                const order = {
                    id: data[2],
                    price: types_1.Big(data[0]),
                    side: bookSide,
                    size: types_1.Big(data[1])
                };
                book.add(order);
            });
        });
        return book;
    }
    loadNextOrders(product, after) {
        const qs = {
            status: ['open', 'pending', 'active']
        };
        if (product) {
            qs.product_id = product;
        }
        if (after) {
            qs.after = after;
        }
        return this.authCall('GET', '/orders', { qs: qs }).then((res) => {
            const cbAfter = res.header['cb-after'];
            const orders = res.body;
            return {
                after: cbAfter,
                orders: orders
            };
        });
    }
    getPublicClient(product) {
        if (!product) {
            return this.publicClients.default;
        }
        if (!this.publicClients[product]) {
            this.publicClients[product] = new gdax_1.PublicClient(product, this._apiURL);
        }
        return this.publicClients[product];
    }
}
exports.GDAXExchangeAPI = GDAXExchangeAPI;
function GDAXOrderToOrder(order) {
    let size;
    let price;
    if (+order.size > 0) {
        size = types_1.Big(order.size);
    }
    else if (+order.funds > 0 && +order.price > 0) {
        size = types_1.Big(order.funds).div(order.price);
    }
    if (+order.price > 0) {
        price = types_1.Big(order.price);
    }
    else {
        price = +order.executed_value > 0 ? types_1.Big(order.executed_value).div(size) : null;
    }
    return {
        price: price,
        size: size,
        side: order.side,
        id: order.id,
        time: new Date(order.created_at),
        productId: order.product_id,
        status: order.status,
        extra: order
    };
}
//# sourceMappingURL=GDAXExchangeAPI.js.map