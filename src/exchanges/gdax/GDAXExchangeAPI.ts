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

import { Candle, CandleRequestOptions, IntervalInMS, Product, PublicExchangeAPI, Ticker } from '../PublicExchangeAPI';
import { AuthenticatedExchangeAPI, Balances } from '../AuthenticatedExchangeAPI';
import { BookBuilder } from '../../lib/BookBuilder';
import { Big, BigJS, ZERO } from '../../lib/types';
import { Logger } from '../../utils/Logger';
import { PlaceOrderMessage } from '../../core/Messages';
import { Level3Order, LiveOrder } from '../../lib/Orderbook';
import { CryptoAddress, ExchangeTransferAPI, TransferRequest, TransferResult, WithdrawalRequest } from '../ExchangeTransferAPI';
import { AuthCallOptions, AuthHeaders, GDAXAuthConfig, GDAXConfig, GDAXHTTPError, OrderbookEndpointParams } from './GDAXInterfaces';
import { Account,
         AuthenticatedClient,
         CoinbaseAccount,
         OrderInfo,
         OrderParams,
         OrderResult,
         ProductInfo,
         ProductTicker,
         PublicClient } from 'gdax';
import { APIError, extractResponse, GTTError, HTTPError } from '../../lib/errors';
import request = require('superagent');
import querystring = require('querystring');
import crypto = require('crypto');
import Response = request.Response;

export const GDAX_API_URL = 'https://api.gdax.com';

interface OrderPage {
    after: string;
    orders: OrderInfo[];
}

export class GDAXExchangeAPI implements PublicExchangeAPI, AuthenticatedExchangeAPI, ExchangeTransferAPI {
    readonly owner: string;
    readonly quoteCurrency: string;
    readonly baseCurrency: string;
    private coinbaseAccounts: CoinbaseAccount[];
    private readonly _apiURL: string;
    private readonly publicClient: PublicClient;
    private readonly authClient: AuthenticatedClient;
    private readonly auth: GDAXAuthConfig;
    private readonly logger: Logger;

    constructor(options: GDAXConfig) {
        this.owner = 'GDAX';
        this._apiURL = options.apiUrl || GDAX_API_URL;
        this.auth = options.auth;
        this.logger = options.logger;
        if (this.auth) {
            this.authClient = new AuthenticatedClient(this.auth.key, this.auth.secret, this.auth.passphrase, this._apiURL);
        }
        this.publicClient = new PublicClient(this._apiURL);
    }

    get apiURL(): string {
        return this._apiURL;
    }

    log(level: string, message: string, meta?: any) {
        if (!this.logger) {
            return;
        }
        this.logger.log(level, message, meta);
    }

    loadProducts(): Promise<Product[]> {
        return this.publicClient.getProducts()
            .then((products: ProductInfo[]) => {
                return products.map((prod: ProductInfo) => {
                    const p: Product = {
                        id: prod.id,
                        sourceId: prod.id,
                        baseCurrency: prod.base_currency,
                        quoteCurrency: prod.quote_currency,
                        baseMinSize: Big(prod.base_min_size),
                        baseMaxSize: Big(prod.base_max_size),
                        quoteIncrement: Big(prod.quote_increment),
                        sourceData: prod
                    };
                    return p;
                });
            }).catch((err: GDAXHTTPError) => {
                return Promise.reject(new HTTPError('Error loading products from GDAX', extractResponse(err.response)));
            });
    }

    loadMidMarketPrice(product: string): Promise<BigJS> {
        return this.loadTicker(product).then((ticker) => {
            if (!ticker || !ticker.bid || !ticker.ask) {
                const err = new HTTPError(`Loading midmarket price for ${product} failed because ticker data was incomplete or unavailable`, {status: 200, body: ticker});
                return Promise.reject(err);
            }
            return Promise.resolve(ticker.ask.plus(ticker.bid).times(0.5));
        });
    }

    loadOrderbook(product: string): Promise<BookBuilder> {
        return this.loadFullOrderbook(product);
    }

    loadFullOrderbook(product: string): Promise<BookBuilder> {
        return this.loadGDAXOrderbook({product: product, level: 3}).then((body) => {
            return this.buildBook(body);
        });
    }

    loadGDAXOrderbook(options: OrderbookEndpointParams): Promise<any> {
        const {product, ...params} = options;
        return this.publicClient.getProductOrderBook(product, params)
            .then((orders) => {
                if (!(orders.bids && orders.asks)) {
                    return Promise.reject(new HTTPError(`Error loading ${product} orderbook from GDAX`, {status: 200, body: orders}));
                }
                return orders;
            }).catch((err: GDAXHTTPError) => {
                return Promise.reject(new HTTPError(`Error loading ${product} orderbook from GDAX`, extractResponse(err.response)));
            });
    }

    loadTicker(product: string): Promise<Ticker> {
        return this.publicClient.getProductTicker(product)
            .then((ticker: ProductTicker) => {
                return {
                    productId: product,
                    ask: ticker.ask ? Big(ticker.ask) : undefined,
                    bid: ticker.bid ? Big(ticker.bid) : undefined,
                    price: Big(ticker.price || 0),
                    size: Big(ticker.size || 0),
                    volume: Big(ticker.volume || 0),
                    time: ticker.time ? new Date(ticker.time) : new Date(),
                    trade_id: ticker.trade_id ? ticker.trade_id.toString() : '0'
                };
            }).catch((err: GDAXHTTPError) => {
                return Promise.reject(new HTTPError(`Error loading ${product} ticker from GDAX`, extractResponse(err.response)));
            });
    }

    loadCandles(options: CandleRequestOptions): Promise<Candle[]> {
        const product = options.gdaxProduct;
        if (!product) {
            return Promise.reject(new Error('No product ID provided to loadCandles'));
        }
        return this.publicClient.getProductHistoricRates(product, {
            granularity: IntervalInMS[options.interval] * 0.001,
            limit: options.limit || 350
        }).then((data: any[][]) => {
            return data.map((d: any[]) => {
                return {
                    timestamp: new Date(d[0] * 1000),
                    low: Big(d[1]),
                    high: Big(d[2]),
                    open: Big(d[3]),
                    close: Big(d[4]),
                    volume: Big(d[5])
                };
            });
        }).catch((err: GDAXHTTPError) => {
            return Promise.reject(new HTTPError(`Error loading ${product} candles from GDAX`, extractResponse(err.response)));
        });
    }

    public aggregateBook(body: any): BookBuilder {
        const book = new BookBuilder(this.logger);
        book.sequence = parseInt(body.sequence, 10);
        ['bids', 'asks'].forEach((side) => {
            let currentPrice: string;
            let order: Level3Order;
            const bookSide = side === 'bids' ? 'buy' : 'sell';
            body[side].forEach((bid: string[]) => {
                if (bid[0] !== currentPrice) {
                    // Set the price on the old level
                    if (order) {
                        book.add(order);
                    }
                    currentPrice = bid[0];
                    order = {
                        id: currentPrice,
                        price: Big(currentPrice),
                        side: bookSide,
                        size: ZERO
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
    placeOrder(order: PlaceOrderMessage): Promise<LiveOrder> {
        if (!this.authClient) {
            return Promise.reject(new GTTError('No authentication details were given for this API'));
        }
        let gdaxOrder: OrderParams;
        switch (order.orderType) {
            case 'limit':
                gdaxOrder = {
                    product_id: order.productId,
                    size: order.size,
                    price: order.price,
                    side: order.side,
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
                    side: order.side,
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
                    side: order.side,
                    size: order.size,
                    price: order.price,
                    funds: order.funds,
                    client_oid: order.clientId,
                    stp: order.extra && order.extra.stp
                } as OrderParams; // Override for incomplete definition in GDAX lib
                break;
            default:
                return Promise.reject(new GTTError(`Invalid order type: ${order.type}`));
        }

        return this.authClient.placeOrder(gdaxOrder).then((result: OrderResult) => {
            // Check for error
            if (result.status === 'rejected' || (result as any).message) {
                return Promise.reject(new APIError(`Placing order on ${order.productId} failed`, undefined, result));
            }
            return Promise.resolve(GDAXOrderResultToOrder(result));
        }, (err: GDAXHTTPError) => {
            const errMsg: any = err.response ? new HTTPError(`Placing order on ${order.productId} failed`, extractResponse(err.response)) : err;
            return Promise.reject(errMsg);
        });
    }

    cancelOrder(id: string): Promise<string> {
        const apiCall = this.authCall('DELETE', `/orders/${id}`, {});
        return this.handleResponse<string[]>(apiCall, {order_id: id}).then((ids: string[]) => {
            return ids[0];
        });
    }

    cancelAllOrders(product?: string): Promise<string[]> {
        const apiCall = this.authCall('DELETE', `/orders`, {});
        const options = product ? {product_id: product} : null;
        return this.handleResponse<string[]>(apiCall, options);
    }

    loadOrder(id: string): Promise<LiveOrder> {
        if (!this.authClient) {
            return Promise.reject(new GTTError('No authentication details were given for this API'));
        }
        return this.authClient.getOrder(id).then((order: OrderInfo) => {
            return GDAXOrderInfoToOrder(order);
        }).catch((err: GDAXHTTPError) => {
            return Promise.reject(new HTTPError('Error loading order details on GDAX', extractResponse(err.response)));
        });
    }

    loadAllOrders(product?: string): Promise<LiveOrder[]> {
        const self = this;
        let allOrders: LiveOrder[] = [];
        const loop: (after?: string) => Promise<LiveOrder[]> = (after?: string) => {
            return self.loadNextOrders(product, after).then((result) => {
                const liveOrders: LiveOrder[] = result.orders.map(GDAXOrderInfoToOrder);
                allOrders = allOrders.concat(liveOrders);
                if (result.after) {
                    return loop(result.after);
                } else {
                    return allOrders;
                }
            });
        };
        return loop();
    }

    loadBalances(): Promise<Balances> {
        if (!this.authClient) {
            return Promise.reject(new GTTError('No authentication details were given for this API'));
        }
        return this.authClient.getAccounts().then((accounts: Account[]) => {
            const balances: Balances = {};
            accounts.forEach((account: Account) => {
                if (!balances[account.profile_id]) {
                    balances[account.profile_id] = {};
                }
                balances[account.profile_id][account.currency] = {
                    balance: Big(account.balance),
                    available: Big(account.available)
                };
            });
            return balances;
        }).catch((err: GDAXHTTPError) => {
            return Promise.reject(new HTTPError('Error loading account balances on GDAX', extractResponse(err.response)));
        });
    }

    authCall(method: string, path: string, opts: AuthCallOptions): Promise<Response> {
        return this.checkAuth().then(() => {
            method = method.toUpperCase();
            const url = `${this.apiURL}${path}`;
            let body: string = '';
            let req = request(method, url)
                .accept('application/json')
                .set('content-type', 'application/json');
            if (opts.body) {
                body = JSON.stringify(opts.body);
                req.send(body);
            } else if (opts.qs && Object.keys(opts.qs).length !== 0) {
                req.query(opts.qs);
                body = '?' + querystring.stringify(opts.qs);
            }
            const signature = this.getSignature(method, path, body);
            req.set(signature);
            if (opts.headers) {
                req = req.set(opts.headers);
            }
            return req;
        });
    }

    getSignature(method: string, relativeURI: string, body: string): AuthHeaders {
        body = body || '';
        const timestamp = (Date.now() / 1000).toFixed(3);
        const what: string = timestamp + method + relativeURI + body;
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

    handleResponse<T>(req: Promise<Response>, _meta: any): Promise<T> {
        return req.then((res: Response) => {
            if (res.status >= 200 && res.status < 300) {
                return res.body;
            }
            const err: HTTPError = new HTTPError(`Error handling GDAX request for ${(req as any).url}`, res);
            return Promise.reject(err);
        }).catch((err) => {
            const error: GTTError = new GTTError('A GDAX API request failed.', err); // TODO add req url here
            return Promise.reject(error);
        });
    }

    checkAuth(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.auth) {
                return reject(new GTTError('You cannot make authenticated requests if a GDAXAuthConfig object was not provided to the GDAXExchangeAPI constructor'));
            }
            if (!(this.auth.key && this.auth.secret && this.auth.passphrase)) {
                return reject(new GTTError('You cannot make authenticated requests without providing all API credentials'));
            }
            return resolve();
        });
    }

    // ---------------------------------- Transfer API Methods --------------------------------------------------//
    requestCryptoAddress(cur: string): Promise<CryptoAddress> {
        return this.loadCoinbaseAccount(cur, false).then((account: CoinbaseAccount) => {
            const id: string = account.id;
            if (!id) {
                return Promise.reject(new GTTError('Coinbase account does not have an ID'));
            }
            const apiCall = this.authCall('POST', `/coinbase-accounts/${id}/addresses`, {});
            return this.handleResponse<any>(apiCall, null);
        }).then((res: any) => {
            const validResult = res.address && res.exchange_deposit_address === true;
            if (!validResult) {
                return Promise.reject(new GTTError(`Could not obtain a valid crypto address for${cur}`));
            }
            return Promise.resolve({
                address: res.address,
                currency: cur
            });
        });
    }

    requestTransfer(req: TransferRequest): Promise<TransferResult> {
        if (!this.authClient) {
            return Promise.reject(new GTTError('No authentication details were given for this API'));
        }
        if (req.walletIdFrom.toLowerCase() === 'coinbase') {
            return this.coinbaseTransfer(true, req.amount, req.currency);
        }
        if (req.walletIdTo.toLowerCase() === 'coinbase') {
            return this.coinbaseTransfer(false, req.amount, req.currency);
        }
        return Promise.reject('GDAX does not support multiple accounts.');
    }

    requestWithdrawal(req: WithdrawalRequest): Promise<TransferResult> {
        if (!this.authClient) {
            return Promise.reject(new GTTError('No authentication details were given for this API'));
        }
        const params = {
            amount: req.amount,
            currency: req.currency,
            crypto_address: req.address
        };
        return this.authClient.withdrawCrypto(params).catch((err: GDAXHTTPError) => {
            return Promise.reject(new HTTPError(`Error on GDAX withdrawal request`, extractResponse(err.response)));
        });
    }

    // ------------------------------ GDAX-specific public Methods ------------------------------------------------//

    loadCoinbaseAccounts(force: boolean): Promise<CoinbaseAccount[]> {
        if (this.coinbaseAccounts && !force) {
            return Promise.resolve(this.coinbaseAccounts);
        }
        if (!this.authClient) {
            return Promise.reject(new GTTError('No authentication details were given for this API'));
        }
        return this.authClient.getCoinbaseAccounts().then((accounts: CoinbaseAccount[]) => {
            this.coinbaseAccounts = accounts;
            return accounts;
        }).catch((err: GDAXHTTPError) => {
            return Promise.reject(new HTTPError('Error loading Coinbase accounts', extractResponse(err.response)));
        });
    }

    coinbaseTransfer(isDeposit: boolean, amount: BigJS, currency: string): Promise<TransferResult> {
        return this.loadCoinbaseAccount(currency, false).then((account: CoinbaseAccount) => {
            const params: any = {
                coinbase_account_id: account.id,
                currency: currency,
                amount: amount.toString()
            };
            return isDeposit ? this.authClient.deposit(params) : this.authClient.withdraw(params);
        }).then((result: any) => {
            return {
                success: !!result.id,
                details: result
            };
        }).catch((err: GDAXHTTPError) => {
            return Promise.reject(new HTTPError(`Error ${isDeposit ? 'depositing from' : 'withdrawing to'} Coinbase account`, extractResponse(err.response)));
        });
    }

    /**
     * Return a promise for a Coinbase account associated with a given currency. Rejects the promise if the account does not exist
     */
    loadCoinbaseAccount(currency: string, force: boolean): Promise<CoinbaseAccount> {
        return this.loadCoinbaseAccounts(force).then((accounts: CoinbaseAccount[]) => {
            for (const account of  accounts) {
                if (account.currency === currency) {
                    return Promise.resolve(account);
                }
            }
            return Promise.reject(new GTTError(`No Coinbase account for ${currency} exists`));
        });
    }

    private buildBook(body: any): BookBuilder {
        const book = new BookBuilder(this.logger);
        book.sequence = parseInt(body.sequence, 10);
        ['bids', 'asks'].forEach((side) => {
            const bookSide = side === 'bids' ? 'buy' : 'sell';
            body[side].forEach((data: string[]) => {
                const order: Level3Order = {
                    id: data[2],
                    price: Big(data[0]),
                    side: bookSide,
                    size: Big(data[1])
                };
                book.add(order);
            });
        });
        return book;
    }

    private loadNextOrders(product?: string, after?: string): Promise<OrderPage> {
        const qs: any = {
            status: ['open', 'pending', 'active']
        };
        if (product) {
            qs.product_id = product;
        }
        if (after) {
            qs.after = after;
        }
        return this.authCall('GET', '/orders', {qs: qs}).then((res) => {
            const cbAfter = res.header['cb-after'];
            const orders = res.body;
            return {
                after: cbAfter,
                orders: orders
            };
        });
    }
}

function GDAXOrderResultToOrder(order: OrderResult): LiveOrder {
    let size: BigJS;
    let price: BigJS;
    if (+order.size > 0) {
        size = Big(order.size);
    }
    if (+order.price > 0) {
        price = Big(order.price);
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

function GDAXOrderInfoToOrder(order: OrderInfo): LiveOrder {
    let size: BigJS;
    let price: BigJS;
    if (+order.size > 0) {
        size = Big(order.size);
    } else if (+order.funds > 0 && +order.price > 0) {
        size = Big(order.funds).div(order.price);
    }
    if (+order.price > 0) {
        price = Big(order.price);
    } else {
        price = +order.executed_value > 0 ? Big(order.executed_value).div(size) : null;
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
