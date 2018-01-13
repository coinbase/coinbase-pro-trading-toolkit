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
import { CCXTMarket, CCXTOHLCV } from 'ccxt';
import { Product, PublicExchangeAPI, Ticker } from '../PublicExchangeAPI';
import { AuthenticatedExchangeAPI, Balances } from '../AuthenticatedExchangeAPI';
import { CryptoAddress, ExchangeTransferAPI, TransferRequest, TransferResult, WithdrawalRequest } from '../ExchangeTransferAPI';
import { ExchangeAuthConfig } from '../AuthConfig';
import { BigJS } from '../../lib/types';
import { BookBuilder } from '../../lib/BookBuilder';
import { PlaceOrderMessage, TradeMessage } from '../../core/Messages';
import { LiveOrder } from '../../lib/Orderbook';
import { Logger } from '../../utils/Logger';
export default class CCXTExchangeWrapper implements PublicExchangeAPI, AuthenticatedExchangeAPI, ExchangeTransferAPI {
    static createExchange(name: string, auth: ExchangeAuthConfig, logger: Logger, opts?: any): CCXTExchangeWrapper;
    static supportedExchanges(): string[];
    static supportedExchangeNames(): string[];
    static getGDAXSymbol(m: CCXTMarket): string;
    readonly owner: string;
    private instance;
    private options;
    private logger;
    constructor(owner: string, opts: any, ccxtInstance: ccxt.Exchange, logger: Logger);
    log(level: string, msg: string, meta?: any): void;
    getSourceSymbol(gdaxProduct: string): Promise<string>;
    loadProducts(): Promise<Product[]>;
    loadMidMarketPrice(gdaxProduct: string): Promise<BigJS>;
    loadOrderbook(gdaxProduct: string): Promise<BookBuilder>;
    loadTicker(gdaxProduct: string): Promise<Ticker>;
    placeOrder(order: PlaceOrderMessage): Promise<LiveOrder>;
    cancelOrder(id: string): Promise<string>;
    cancelAllOrders(product: string): Promise<string[]>;
    loadOrder(id: string): Promise<LiveOrder>;
    loadAllOrders(gdaxProduct: string): Promise<LiveOrder[]>;
    loadBalances(): Promise<Balances>;
    requestCryptoAddress(cur: string): Promise<CryptoAddress>;
    requestTransfer(request: TransferRequest): Promise<TransferResult>;
    requestWithdrawal(request: WithdrawalRequest): Promise<TransferResult>;
    transfer(cur: string, amount: BigJS, from: string, to: string, options: any): Promise<TransferResult>;
    /**
     * Attempts to fetch historical trade data from the exchange and return it in
     */
    fetchHistTrades(symbol: string, params?: {}): Promise<TradeMessage[]>;
    fetchOHLCV(symbol: string, params?: {}): Promise<CCXTOHLCV[] | null>;
}
