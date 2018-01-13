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
import { AuthenticatedExchangeAPI, Balances } from '../AuthenticatedExchangeAPI';
import { Product, PublicExchangeAPI, Ticker } from '../PublicExchangeAPI';
import { BookBuilder } from '../../lib/BookBuilder';
import { BitfinexSuccessfulOrderExecution } from './BitfinexAuth';
import { Logger } from '../../utils/Logger';
import { CryptoAddress, ExchangeTransferAPI, TransferRequest, TransferResult, WithdrawalRequest } from '../ExchangeTransferAPI';
import { ExchangeAuthConfig } from '../AuthConfig';
import { BigJS } from '../../lib/types';
import { PlaceOrderMessage } from '../../core/Messages';
import { LiveOrder } from '../../lib/Orderbook';
export interface BitfinexConfig {
    auth?: ExchangeAuthConfig;
    logger?: Logger;
}
export interface BitfinexRESTOrder {
    price: string;
    amount: string;
    timestamp: string;
}
export interface BitfinexOrderbook {
    bids: BitfinexRESTOrder[];
    asks: BitfinexRESTOrder[];
}
export interface BitfinexProduct {
    pair: string;
    price_precision: number;
    initial_margin: string;
    minimum_margin: string;
    maximum_order_size: string;
    minimum_order_size: string;
    expiration: string;
}
/**
 * An adapter class that maps the standardized API calls to Bitfinex's API interface
 */
export declare class BitfinexExchangeAPI implements PublicExchangeAPI, AuthenticatedExchangeAPI, ExchangeTransferAPI {
    /**
     * Returns the Bitfinex product that's equivalent to the given GDAX product. If it doesn't exist,
     * return the given product
     * @param gdaxProduct
     * @returns {string} Bitfinex product code
     */
    static product(gdaxProduct: string): string;
    static convertBSOPToOrder(bfOrder: BitfinexSuccessfulOrderExecution): LiveOrder;
    owner: string;
    private auth;
    private logger;
    constructor(config: BitfinexConfig);
    loadProducts(): Promise<Product[]>;
    loadMidMarketPrice(gdaxProduct: string): Promise<BigJS>;
    loadOrderbook(gdaxProduct: string): Promise<BookBuilder>;
    loadTicker(gdaxProduct: string): Promise<Ticker>;
    checkAuth(): Promise<ExchangeAuthConfig>;
    placeOrder(order: PlaceOrderMessage): Promise<LiveOrder>;
    cancelOrder(id: string): Promise<string>;
    cancelAllOrders(): Promise<string[]>;
    loadOrder(id: string): Promise<LiveOrder>;
    loadAllOrders(): Promise<LiveOrder[]>;
    loadBalances(): Promise<Balances>;
    requestCryptoAddress(cur: string): Promise<CryptoAddress>;
    requestTransfer(req: TransferRequest): Promise<TransferResult>;
    requestWithdrawal(req: WithdrawalRequest): Promise<TransferResult>;
    transfer(cur: string, amount: BigJS, from: string, to: string, options: any): Promise<TransferResult>;
    convertBitfinexBookToGdaxBook(bfBook: BitfinexOrderbook): BookBuilder;
}
