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
import { Side } from '../../lib/sides';
import { ExchangeAuthConfig } from '../AuthConfig';
import { getSignature, handleResponse } from '../utils';

const API_URL = 'https://api.bitfinex.com';

export type BitfinexWallet = 'deposit' | 'exchange' | 'trading';
export type BitfinexSupportedCurrency = 'bitcoin' | 'ethereum' | 'litecoin' | 'mastercoin' | 'ethereumc' | 'zcash' | 'monero';
export type BitfinexOrderType = 'exchange market' | 'exchange limit' | 'exchange stop' | 'exchange trailing-stop' | 'exchange fill-or-kill' |
    'market' | 'limit' | 'stop' | 'trailing-stop' | 'fill-or-kill';

// ---------------------------------  API endpoint request and response interfaces -----------------------------------//
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
    side: Side;
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

// ---------------------------------------  API authenticated function calls  ----------------------------------------//

function authRequest(auth: ExchangeAuthConfig, options: any): Promise<Response> {
    // build payload
    const payload = {
        request: options.path,
        nonce: Date.now().toString()
    };
    if (options.fields) {
        Object.assign(payload, options.fields);
        // don't leak request parameters in request object
        delete options.fields;
    }
    const b64Payload = new Buffer(JSON.stringify(payload)).toString('base64');
    // all authenticated api calls require a signature
    const sig = getSignature(auth, b64Payload, 'sha384');
    // all authenticated api calls require headers
    const headers = {
        'X-BFX-APIKEY': auth.key,
        'X-BFX-PAYLOAD': b64Payload,
        'X-BFX-SIGNATURE': sig
    };
    // make the request
    return request.post(API_URL + options.path)
        .set(headers)
        .send(b64Payload);
}

export function loadAccountInfo(auth: ExchangeAuthConfig): Promise<any> {
    const req =  authRequest(auth, { path: '/v1/account_infos' });
    return handleResponse<any>(req, {});
}

export function loadBalances(auth: ExchangeAuthConfig): Promise<BitfinexBalance[]> {
    const req = authRequest(auth, { path: '/v1/balances' });
    return handleResponse<BitfinexBalance[]>(req, {});
}

/**
 * Place a trade order on Bitfinex
 *
 * @param auth
 * @param order
 */
export function placeOrder(auth: ExchangeAuthConfig, order: BitfinexOrderRequest): Promise<BitfinexSuccessfulOrderExecution> {
    const fields: any = {
        symbol: order.product_id,
        amount: order.size,
        price: order.price,
        exchange: 'bitfinex',
        side: order.side,
        type: order.type,
        is_hidden: !!order.is_hidden,
        is_postonly: !!order.post_only,
        ocoorder: !!order.ocoorder
    };
    if (fields.ocoorder) {
        fields.buy_price_oco = order.buy_price_oco;
    }
    const req = authRequest(auth, { path: '/v1/order/new', fields: fields });
    return handleResponse<BitfinexSuccessfulOrderExecution>(req, {order: fields});
}

export function cancelOrder(auth: ExchangeAuthConfig, orderId: number): Promise<BitfinexSuccessfulOrderExecution> {
    const fields = {
        order_id: orderId
    };
    const req = authRequest(auth, { path: '/v1/order/cancel', fields: fields });
    return handleResponse<BitfinexSuccessfulOrderExecution>(req, {order_id: orderId});
}

export function orderStatus(auth: ExchangeAuthConfig, orderId: number) {
    const fields = {
        order_id: orderId
    };
    const req = authRequest(auth, { path: '/v1/order/status', fields: fields });
    return handleResponse<BitfinexSuccessfulOrderExecution>(req, {order_id: orderId});
}

export function activeOrders(auth: ExchangeAuthConfig) {
    const req = authRequest(auth, { path: '/v1/orders' });
    return handleResponse<BitfinexSuccessfulOrderExecution[]>(req, {});
}

export function cancelAllOrders(auth: ExchangeAuthConfig) {
    const req = authRequest(auth, { path: '/v1/order/cancel/all' });
    return handleResponse<BitfinexResult>(req, {});
}

/**
 * Gets a deposit address for the given wallet and currency
 * @param auth
 * @param details
 */
export function getAddress(auth: ExchangeAuthConfig, details: BitfinexDepositRequest): Promise<Response> {
    return authRequest(auth, { path: '/v1/deposit/new', fields: details });
}

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
export function withdraw(auth: ExchangeAuthConfig, details: BitfinexWithdrawRequest): Promise<Response> {
    return authRequest(auth, { path: '/v1/withdraw', fields: details });
}

export interface BitfinexTransferRequest {
    currency: string;
    amount: string;
    walletfrom: BitfinexWallet;
    walletto: BitfinexWallet;
}

export function transfer(auth: ExchangeAuthConfig, details: BitfinexTransferRequest) {
    return authRequest(auth, { path: '/v1/transfer', fields: details });
}

export function isBFWallet(id: string): id is BitfinexWallet {
    return id === 'deposit' || id === 'exchange' || id === 'trading';
}
