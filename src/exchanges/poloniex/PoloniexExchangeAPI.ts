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
import { CryptoAddress, ExchangeTransferAPI, TransferRequest, TransferResult, WithdrawalRequest } from '../ExchangeTransferAPI';
import { BookBuilder } from '../../lib/BookBuilder';
import { ExchangeAuthConfig } from '../AuthConfig';
import { gdaxifyProduct, POLONIEX_API_URL, PRODUCT_MAP } from './PoloniexCommon';
import { getSignature, handleResponse } from '../utils';
import { ConsoleLoggerFactory, Logger } from '../../utils/Logger';
import { Big, BigJS } from '../../lib/types';
import { Level3Order, LiveOrder } from '../../lib/Orderbook';
import { PlaceOrderMessage } from '../../core/Messages';
import { PoloniexBalances, PoloniexOrderbook, PoloniexOrderbookLevel, PoloniexTickers } from './PoloniexMessages';
import superAgent = require('superagent');

export interface PoloniexConfig {
    auth?: ExchangeAuthConfig;
    logger?: Logger;
}

/**
 * An adapter class that maps the standardized API calls to Polinex's API interface
 */
export class PoloniexExchangeAPI implements PublicExchangeAPI, AuthenticatedExchangeAPI, ExchangeTransferAPI {
    static product(gdaxProduct: string) {
        return PRODUCT_MAP[gdaxProduct] || gdaxProduct;
    }

    owner: string;
    auth: ExchangeAuthConfig;
    logger: Logger;

    constructor(config: PoloniexConfig) {
        this.owner = 'Poloniex';
        this.auth = config.auth || null;
        this.logger = config.logger || ConsoleLoggerFactory();
    }

    loadProducts(): Promise<Product[]> {
        const req = this.publicRequest('returnTicker');
        return handleResponse<PoloniexTickers>(req, null).then((tickers: PoloniexTickers) => {
            const products: string[] = Object.keys(tickers);
            const productList: Product[] = products.map(gdaxifyProduct);
            return Promise.resolve(productList);
        });
    }

    placeOrder(order: PlaceOrderMessage): Promise<LiveOrder> {
        return undefined;
    }

    cancelOrder(id: string): Promise<string> {
        return undefined;
    }

    cancelAllOrders(): Promise<string[]> {
        return undefined;
    }

    loadOrder(id: string): Promise<LiveOrder> {
        return undefined;
    }

    loadAllOrders(gdaxProduct: string): Promise<LiveOrder[]> {
        return undefined;
    }

    loadBalances(): Promise<Balances> {
        const req = this.authRequest('returnCompleteBalances', { account: 'all' });
        return handleResponse(req, {
            owner: this.owner,
            req: 'returnBalances'
        }).then((balances: PoloniexBalances) => {
            const result: Balances = {
                exchange: {}
            };
            for (const currency in balances) {
                const balance = balances[currency];
                const available = Big(balance.available);
                const total = available.plus(balance.onOrders);
                // TODO include other accounts
                result.exchange[currency] = { balance: total, available: available };
            }
            return result;
        });
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

    loadMidMarketPrice(gdaxProduct: string): Promise<BigJS> {
        const req = this.publicRequest('returnTicker');
        return handleResponse<PoloniexTickers>(req, {
            owner: this.owner,
            req: 'returnTicker'
        }).then((tickers: PoloniexTickers) => {
            const ticker = tickers[PoloniexExchangeAPI.product(gdaxProduct)];
            return Big(ticker.lowestAsk).plus(ticker.highestBid).times(0.5);
        });
    }

    loadOrderbook(gdaxProduct: string): Promise<BookBuilder> {
        const product = PoloniexExchangeAPI.product(gdaxProduct);
        const req = this.publicRequest('returnOrderBook', { currencyPair: product });
        return handleResponse<PoloniexOrderbook>(req, {
            owner: this.owner,
            req: 'returnOrderBook',
            product: product
        }).then((book: PoloniexOrderbook) => {
            const builder = new BookBuilder(this.logger);
            let order: Level3Order;
            book.asks.forEach((level: PoloniexOrderbookLevel) => {
                order = {
                    id: level[0].toString(),
                    side: 'sell',
                    price: Big(level[0]),
                    size: Big(level[1])
                };
                builder.add(order);
            });
            book.bids.forEach((level: PoloniexOrderbookLevel) => {
                order = {
                    id: level[0].toString(),
                    side: 'buy',
                    price: Big(level[0]),
                    size: Big(level[1])
                };
                builder.add(order);
            });
            return builder;
        });
    }

    loadTicker(gdaxProduct: string): Promise<Ticker> {
        const product = PoloniexExchangeAPI.product(gdaxProduct);
        const req = this.publicRequest('returnTicker');
        return handleResponse<PoloniexTickers>(req, {
            owner: this.owner,
            req: 'returnTicker'
        }).then((tickers: PoloniexTickers) => {
            const ticker = tickers[product];
            return {
                productId: gdaxProduct,
                price: Big(ticker.last),
                bid: Big(ticker.highestBid),
                ask: Big(ticker.lowestAsk),
                volume: Big(ticker.baseVolume),
                time: new Date()
            };
        });
    }

    publicRequest(command: string, params?: object): Promise<superAgent.Response> {
        const url = `${POLONIEX_API_URL}?command=${command}`;
        return superAgent.get(url).query(params).accept('json');
    }

    authRequest(command: string, params?: object): Promise<superAgent.Response> {
        if (!this.auth) {
            return null;
        }
        const nonce = new Date().valueOf();
        const url = `${POLONIEX_API_URL}?command=${command}&nonce=${nonce}`;
        const body = Object.assign({ command: command, nonce: nonce }, params);
        const signature = getSignature(this.auth, JSON.stringify(body), 'sha512');
        return superAgent.post(url)
            .set({
                Key: this.auth.key,
                Sign: signature
            })
            .send(body)
            .accept('json');
    }
}
