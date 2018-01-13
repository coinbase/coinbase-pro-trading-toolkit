/// <reference types="superagent" />
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
import request = require('superagent');
import Response = request.Response;
import { ExchangeAuthConfig } from '../AuthConfig';
export declare type BitfinexWallet = 'deposit' | 'exchange' | 'trading';
export declare type BitfinexSupportedCurrency = 'bitcoin' | 'ethereum' | 'litecoin' | 'mastercoin' | 'ethereumc' | 'zcash' | 'monero';
export declare type BitfinexOrderType = 'exchange market' | 'exchange limit' | 'exchange stop' | 'exchange trailing-stop' | 'exchange fill-or-kill' | 'market' | 'limit' | 'stop' | 'trailing-stop' | 'fill-or-kill';
export interface BitfinexOrderRequest {
    product_id: string;
    size: string;
    price: string;
    side: string;
    type: BitfinexOrderType;
    post_only?: boolean;
    is_hidden?: boolean;
    ocoorder?: boolean;
    buy_price_oco?: string;
}
export interface BitfinexDepositRequest {
    method: BitfinexSupportedCurrency;
    wallet_name: BitfinexWallet;
    renew: number;
}
export interface BitfinexResult {
    result: string;
}
export interface BitfinexSuccessfulOrderExecution {
    id: number;
    symbol: string;
    exchange: string;
    price: string;
    avg_execution_price: string;
    side: 'buy' | 'sell';
    type: string;
    timestamp: string;
    is_live: boolean;
    is_cancelled: boolean;
    is_hidden: boolean;
    was_forced: boolean;
    original_amount: string;
    remaining_amount: string;
    executed_amount: string;
}
export interface BitfinexBalance {
    type: BitfinexWallet;
    currency: string;
    amount: string;
    available: string;
}
export declare function loadAccountInfo(auth: ExchangeAuthConfig): Promise<any>;
export declare function loadBalances(auth: ExchangeAuthConfig): Promise<BitfinexBalance[]>;
/**
 * Place a trade order on Bitfinex
 *
 * @param auth
 * @param order
 */
export declare function placeOrder(auth: ExchangeAuthConfig, order: BitfinexOrderRequest): Promise<BitfinexSuccessfulOrderExecution>;
export declare function cancelOrder(auth: ExchangeAuthConfig, orderId: number): Promise<BitfinexSuccessfulOrderExecution>;
export declare function orderStatus(auth: ExchangeAuthConfig, orderId: number): Promise<BitfinexSuccessfulOrderExecution>;
export declare function activeOrders(auth: ExchangeAuthConfig): Promise<BitfinexSuccessfulOrderExecution[]>;
export declare function cancelAllOrders(auth: ExchangeAuthConfig): Promise<BitfinexResult>;
/**
 * Gets a deposit address for the given wallet and currency
 * @param auth
 * @param details
 */
export declare function getAddress(auth: ExchangeAuthConfig, details: BitfinexDepositRequest): Promise<Response>;
export interface BitfinexWithdrawRequest {
    withdraw_type: BitfinexSupportedCurrency;
    amount: string;
    address: string;
    walletselected: BitfinexWallet;
}
/**
 * Request a cryptocurrency withdrawal to the given address
 * @param auth
 * @param details
 */
export declare function withdraw(auth: ExchangeAuthConfig, details: BitfinexWithdrawRequest): Promise<Response>;
export interface BitfinexTransferRequest {
    currency: string;
    amount: string;
    walletfrom: BitfinexWallet;
    walletto: BitfinexWallet;
}
export declare function transfer(auth: ExchangeAuthConfig, details: BitfinexTransferRequest): Promise<request.Response>;
export declare function isBFWallet(id: string): id is BitfinexWallet;
