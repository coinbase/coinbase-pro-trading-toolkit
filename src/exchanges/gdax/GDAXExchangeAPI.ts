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

import { Product, PublicExchangeAPI, Ticker } from '../PublicExchangeAPI';
import { AuthenticatedExchangeAPI, Balances } from '../AuthenticatedExchangeAPI';
import { BookBuilder } from '../../lib/BookBuilder';
import { Big, BigJS, ZERO } from '../../lib/types';
import { Logger } from '../../utils/Logger';
import { PlaceOrderMessage } from '../../core/Messages';
import { Level3Order, LiveOrder } from '../../lib/Orderbook';
import { CryptoAddress, ExchangeTransferAPI, TransferRequest, TransferResult, WithdrawalRequest } from '../ExchangeTransferAPI';
import { AuthCallOptions, AuthHeaders, GDAXAuthConfig, GDAXConfig, OrderbookEndpointParams } from './GDAXInterfaces';
import { Account, AuthenticatedClient, BaseOrderInfo, CoinbaseAccount, OrderInfo, OrderParams, OrderResult, ProductInfo, ProductTicker, PublicClient } from 'gdax';
import * as assert from 'assert';
import request = require('superagent');
import querystring = require('querystring');
import crypto = require('crypto');
import Response = request.Response;

export const GDAX_API_URL = 'https://api.gdax.com';

interface OrderPage {
    after: string;
    orders: BaseOrderInfo[];
}

interface PublicClients {
    default: PublicClient;

    [product: string]: PublicClient;
}

export class GDAXExchangeAPI implements PublicExchangeAPI, AuthenticatedExchangeAPI, ExchangeTransferAPI {
    owner: string;
    quoteCurrency: string;
    baseCurrency: string;
    private coinbaseAccounts: CoinbaseAccount[];
    private _apiURL: string;
    private publicClients: PublicClients;
    private authClient: AuthenticatedClient;
    private auth: GDAXAuthConfig;
    private logger: Logger;

    constructor(options: GDAXConfig) {
        this.owner = 'GDAX';
        this._apiURL = options.apiUrl || GDAX_API_URL;
        this.auth = options.auth;
        this.logger = options.logger;
        if (this.auth) {
            this.authClient = new AuthenticatedClient(this.auth.key, this.auth.secret, this.auth.passphrase, this._apiURL);
        }
        this.publicClients = { default: new PublicClient('BTC-USD', this._apiURL) };
        this.publicClients['BTC-USD'] = this.publicClients.default;
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
        return this.getPublicClient().getProducts().then((products: ProductInfo[]) => {
            return products.map((prod: ProductInfo) => {
                return {
                    id: prod.id,
                    sourceId: prod.id,
                    baseCurrency: prod.base_currency,
                    quoteCurrency: prod.quote_currency,
                    baseMinSize: Big(prod.base_min_size),
                    baseMaxSize: Big(prod.base_max_size),
                    quoteIncrement: Big(prod.quote_increment),
                    sourceData: prod
                } as Product;
            });
        });
    }

    loadMidMarketPrice(product: string): Promise<BigJS> {
        return this.loadTicker(product).then((ticker) => {
            if (!ticker || !ticker.bid || !ticker.ask) {
                throw new Error('Loading midmarket price failed because ticker data was incomplete or unavailable');
            }
            return ticker.ask.plus(ticker.bid).times(0.5);
        });
    }

    loadOrderbook(product: string): Promise<BookBuilder> {
        return this.loadFullOrderbook(product);
    }

    loadFullOrderbook(product: string): Promise<BookBuilder> {
        return this.loadGDAXOrderbook({ product: product, level: 3 }).then((body) => {
            return this.buildBook(body);
        });
    }

    loadGDAXOrderbook(options: OrderbookEndpointParams): Promise<any> {
        const { product, ...params } = options;
        return this.getPublicClient(product).getProductOrderBook(params).then((orders) => {
            if (!(orders.bids && orders.asks)) {
                throw new Error('loadOrderbook did not return an bids or asks: ' + orders);
            }
            return orders;
        });
    }

    loadTicker(product: string): Promise<Ticker> {
        return this.getPublicClient(product).getProductTicker().then((ticker: ProductTicker) => {
            return {
                productId: product,
                ask: ticker.ask ? Big(ticker.ask) : undefined,
                bid: ticker.bid ? Big(ticker.bid) : undefined,
                price: Big(ticker.price || 0),
                size: Big(ticker.size || 0),
                volume: Big(ticker.volume || 0),
                time: new Date(ticker.time || new Date()),
                trade_id: ticker.trade_id ? ticker.trade_id.toString() : '0'
            };
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
            return Promise.reject(new Error('No authentication details were given for this API'));
        }
        let gdaxOrder: OrderParams;
        assert(order.side === 'buy' || order.side === 'sell');
        const side: 'buy' | 'sell' = order.side === 'buy' ? 'buy' : 'sell';
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
            case 'stop':
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
            default:
                return Promise.reject(new Error('Invalid Order type: ' + order.type));
        }
        const clientMethod = side === 'buy' ? this.authClient.buy : this.authClient.sell;
        return clientMethod(gdaxOrder).then((result: OrderResult) => {
            return GDAXOrderToOrder(result);
        }).catch((err: Error) => {
            this.logger.log('error', 'Placing order failed', { order: order, reason: err.message });
            return Promise.reject(err);
        });
    }

    cancelOrder(id: string): Promise<string> {
        const apiCall = this.authCall('DELETE', `/orders/${id}`, {});
        return this.handleResponse<string[]>(apiCall, { order_id: id }).then((ids: string[]) => {
            return Promise.resolve(ids[0]);
        });

    }

    cancelAllOrders(product: string): Promise<string[]> {
        const apiCall = this.authCall('DELETE', `/orders`, {});
        const options = product ? { product_id: product } : null;
        return this.handleResponse<string[]>(apiCall, options).then((ids: string[]) => {
            return Promise.resolve(ids);
        });
    }

    loadOrder(id: string): Promise<LiveOrder> {
        if (!this.authClient) {
            return Promise.reject(new Error('No authentication details were given for this API'));
        }
        return this.authClient.getOrder(id).then((order: OrderInfo) => {
            return GDAXOrderToOrder(order);
        });
    }

    loadAllOrders(product: string): Promise<LiveOrder[]> {
        const self = this;
        let allOrders: LiveOrder[] = [];
        const loop: (after: string) => Promise<LiveOrder[]> = (after: string) => {
            return self.loadNextOrders(product, after).then((result) => {
                const liveOrders: LiveOrder[] = result.orders.map(GDAXOrderToOrder);
                allOrders = allOrders.concat(liveOrders);
                if (result.after) {
                    return loop(result.after);
                } else {
                    return allOrders;
                }
            });
        };
        return new Promise((resolve, reject) => {
            return loop(null).then((orders) => {
                return resolve(orders);
            }, reject);
        });
    }

    loadBalances(): Promise<Balances> {
        if (!this.authClient) {
            return Promise.reject(new Error('No authentication details were given for this API'));
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
            return Promise.resolve(req);
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

    handleResponse<T>(req: Promise<Response>, meta: any): Promise<T> {
        // then<T> is required to workaround bug in TS2.1 https://github.com/Microsoft/TypeScript/issues/10977
        return req.then<T>((res: Response) => {
            if (res.status >= 200 && res.status < 300) {
                return Promise.resolve<T>(res.body as T);
            }
            const err: Error = new Error(res.body.message);
            (err as any).details = res.body;
            return Promise.reject(err);
        }).catch((err) => {
            const reason: any = err.message;
            const error: any = Object.assign(new Error('A GDAX API request failed. ' + reason), meta);
            error.reason = reason;
            return Promise.reject(error);
        });
    }

    checkAuth(): Promise<GDAXAuthConfig> {
        return new Promise((resolve, reject) => {
            if (this.auth === null) {
                return reject(new Error('You cannot make authenticated requests if a GDAXAuthConfig object was not provided to the GDAXExchangeAPI constructor'));
            }
            if (!(this.auth.key && this.auth.secret && this.auth.passphrase)) {
                return reject(new Error('You cannot make authenticated requests without providing all API credentials'));
            }
            return resolve();
        });
    }

    // ---------------------------------- Transfer API Methods --------------------------------------------------//
    requestCryptoAddress(cur: string): Promise<CryptoAddress> {
        return this.loadCoinbaseAccount(cur, false).then((account: CoinbaseAccount) => {
            const id: string = account.id;
            if (!id) {
                return Promise.reject(new Error('Coinbase account does not have an ID'));
            }
            const apiCall = this.authCall('POST', `/coinbase-accounts/${id}/addresses`, {});
            return this.handleResponse<any>(apiCall, null);
        }).then((res: any) => {
            const validResult = res.address && res.exchange_deposit_address === true;
            if (!validResult) {
                return Promise.reject(new Error('Could not obtain a valid crypto address for' + cur));
            }
            return Promise.resolve({
                address: res.address,
                currency: cur
            });
        });
    }

    requestTransfer(req: TransferRequest): Promise<TransferResult> {
        if (!this.authClient) {
            return Promise.reject(new Error('No authentication details were given for this API'));
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
            return Promise.reject(new Error('No authentication details were given for this API'));
        }
        const params = {
            amount: req.amount,
            currency: req.currency,
            crypto_address: req.address
        };
        return this.authClient.withdrawCrypto(params);
    }

    // ------------------------------ GDAX-specific public Methods ------------------------------------------------//

    loadCoinbaseAccounts(force: boolean): Promise<CoinbaseAccount[]> {
        if (this.coinbaseAccounts && !force) {
            return Promise.resolve(this.coinbaseAccounts);
        }
        if (!this.authClient) {
            return Promise.reject(new Error('No authentication details were given for this API'));
        }
        return this.authClient.getCoinbaseAccounts().then((accounts: CoinbaseAccount[]) => {
            this.coinbaseAccounts = accounts;
            return Promise.resolve(accounts);
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
            return Promise.reject(new Error(`No Coinbase account for ${currency} exists`));
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

    private loadNextOrders(product: string, after: string): Promise<OrderPage> {
        const qs: any = {
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

    private getPublicClient(product?: string): PublicClient {
        if (!product) {
            return this.publicClients.default;
        }
        if (!this.publicClients[product]) {
            this.publicClients[product] = new PublicClient(product);
        }
        return this.publicClients[product];
    }
}

function GDAXOrderToOrder(order: BaseOrderInfo): LiveOrder {
    const size = Big(order.size);
    // this is actually the average price, since an order can me matched multiple times if it was a market order
    const price: BigJS = +order.executed_value > 0 ? Big(order.executed_value).div(size) : null;
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
