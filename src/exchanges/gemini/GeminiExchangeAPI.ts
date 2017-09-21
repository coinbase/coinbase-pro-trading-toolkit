'use strict';
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
import { PublicExchangeAPI, Product, Ticker } from '../PublicExchangeAPI';
import { AuthenticatedExchangeAPI, Balances } from '../AuthenticatedExchangeAPI';
import { BookBuilder } from '../../lib/BookBuilder';
import { PlaceOrderMessage } from '../../core/Messages';
import { LiveOrder, Level3Order } from '../../lib/Orderbook';
import { ExchangeAuthConfig } from '../AuthConfig';
import { Logger } from '../../utils/Logger';
import { Big } from '../../lib/types';
import request = require('superagent');

export const GEMINI_API_URL = 'https://api.gemini.com/v1';

export interface GeminiConfig {
    apiUrl?: string;
    auth?: GeminiAuthConfig;
    logger: Logger;
}

export interface GeminiAuthConfig extends ExchangeAuthConfig {
    passphrase: string;
}

export class GeminiExchangeAPI implements PublicExchangeAPI, AuthenticatedExchangeAPI {
    readonly owner: string;
    private _apiURL: string;
    private auth: GeminiAuthConfig;
    private logger: Logger;

    constructor(options: GeminiConfig) {
        this.owner = 'Gemini';
        this._apiURL = options.apiUrl || GEMINI_API_URL;
        this.auth = options.auth;
        this.logger = options.logger;
    }

    get apiURL(): string {
        return this._apiURL;
    }

    loadProducts(): Promise<Product[]> {
        // Public API only returns symbols; so have to hard-code
        const products: Product[] = [
            {
                id: 'btcusd',
                baseCurrency: 'BTC',
                quoteCurrency: 'USD',
                baseMinSize: Big(0.00001),
                baseMaxSize: Big('1e18'),
                quoteIncrement: Big(0.01)
            },
            {
                id: 'ethusd',
                baseCurrency: 'ETH',
                quoteCurrency: 'USD',
                baseMinSize: Big(0.001),
                baseMaxSize: Big('1e18'),
                quoteIncrement: Big(0.01)
            },
            {
                id: 'ethbtc',
                baseCurrency: 'ETH',
                quoteCurrency: 'BTC',
                baseMinSize: Big(0.001),
                baseMaxSize: Big('1e18'),
                quoteIncrement: Big(0.00001)
            }
        ];
        return Promise.resolve(products);
    }
    loadMidMarketPrice(gdaxProduct: string): Promise<BigNumber.BigNumber> {
        return this.loadTicker(gdaxProduct).then((ticker) => {
            if (!ticker || !ticker.bid || !ticker.ask) {
                throw new Error('Loading midmarket price failed because ticker data was incomplete or unavailable');
            }
            return ticker.ask.plus(ticker.bid).times(0.5);
        });
    }
    loadOrderbook(gdaxProduct: string): Promise<BookBuilder> {
        return this.loadGeminiOrderbook(gdaxProduct).then((body) => {
            return Promise.resolve(this.buildBook(body));
        });
    }
    loadGeminiOrderbook(gdaxProduct: string): Promise<string> {
        return this.publicRequest('/book/' + gdaxProduct)
            .then((body) => {
                if (!(body.bids && body.asks)) {
                    throw new Error('loadGeminiOrderbook did not return bids or asks');
                }
                return Promise.resolve(body);
            });
    }
    loadTicker(gdaxProduct: string): Promise<Ticker> {
        return this.publicRequest('/pubticker/' + gdaxProduct)
            .then((ticker) => {
                return {
                    productId: gdaxProduct,
                    ask: ticker.ask ? Big(ticker.ask) : undefined,
                    bid: ticker.bid ? Big(ticker.bid) : undefined,
                    price: Big(ticker.last || 0),
                    time: new Date()
                };
            });
    }
    placeOrder(order: PlaceOrderMessage): Promise<LiveOrder> {
        throw new Error('Method not implemented.');
    }
    cancelOrder(id: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    cancelAllOrders(product: string): Promise<string[]> {
        throw new Error('Method not implemented.');
    }
    loadOrder(id: string): Promise<LiveOrder> {
        throw new Error('Method not implemented.');
    }
    loadAllOrders(gdaxProduct: string): Promise<LiveOrder[]> {
        throw new Error('Method not implemented.');
    }
    loadBalances(): Promise<Balances> {
        throw new Error('Method not implemented.');
    }

    private publicRequest(command: string): Promise<any> {
        const url = `${this.apiURL}${command}`;
        return request.get(url)
            .accept('application/json')
            .then((response) => {
                if (response.status !== 200) {
                    throw new Error('publicRequest for ' + command + ' was not successful');
                }
                return response.body;
            });
    }

    private buildBook(body: any): BookBuilder {
        const book = new BookBuilder(this.logger);
        body.bids.forEach((data: any) => {
            const order: Level3Order = {
                id: data.price,
                price: Big(data.price),
                size: Big(data.amount),
                side: 'buy'
            };
            book.add(order);
        });
        body.asks.forEach((data: any) => {
            const order: Level3Order = {
                id: data.price,
                price: Big(data.price),
                size: Big(data.amount),
                side: 'sell'
            };
            book.add(order);
        });
        return book;
    }
}
