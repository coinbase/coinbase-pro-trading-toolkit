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
const request = require("superagent");
const utils_1 = require("../utils");
const API_URL = 'https://api.bitfinex.com';
// ---------------------------------------  API authenticated function calls  ----------------------------------------//
function authRequest(auth, options) {
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
    const sig = utils_1.getSignature(auth, b64Payload, 'sha384');
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
function loadAccountInfo(auth) {
    const req = authRequest(auth, { path: '/v1/account_infos' });
    return utils_1.handleResponse(req, {});
}
exports.loadAccountInfo = loadAccountInfo;
function loadBalances(auth) {
    const req = authRequest(auth, { path: '/v1/balances' });
    return utils_1.handleResponse(req, {});
}
exports.loadBalances = loadBalances;
/**
 * Place a trade order on Bitfinex
 *
 * @param auth
 * @param order
 */
function placeOrder(auth, order) {
    const fields = {
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
    return utils_1.handleResponse(req, { order: fields });
}
exports.placeOrder = placeOrder;
function cancelOrder(auth, orderId) {
    const fields = {
        order_id: orderId
    };
    const req = authRequest(auth, { path: '/v1/order/cancel', fields: fields });
    return utils_1.handleResponse(req, { order_id: orderId });
}
exports.cancelOrder = cancelOrder;
function orderStatus(auth, orderId) {
    const fields = {
        order_id: orderId
    };
    const req = authRequest(auth, { path: '/v1/order/status', fields: fields });
    return utils_1.handleResponse(req, { order_id: orderId });
}
exports.orderStatus = orderStatus;
function activeOrders(auth) {
    const req = authRequest(auth, { path: '/v1/orders' });
    return utils_1.handleResponse(req, {});
}
exports.activeOrders = activeOrders;
function cancelAllOrders(auth) {
    const req = authRequest(auth, { path: '/v1/order/cancel/all' });
    return utils_1.handleResponse(req, {});
}
exports.cancelAllOrders = cancelAllOrders;
/**
 * Gets a deposit address for the given wallet and currency
 * @param auth
 * @param details
 */
function getAddress(auth, details) {
    return authRequest(auth, { path: '/v1/deposit/new', fields: details });
}
exports.getAddress = getAddress;
/**
 * Request a cryptocurrency withdrawal to the given address
 * @param auth
 * @param details
 */
function withdraw(auth, details) {
    return authRequest(auth, { path: '/v1/withdraw', fields: details });
}
exports.withdraw = withdraw;
function transfer(auth, details) {
    return authRequest(auth, { path: '/v1/transfer', fields: details });
}
exports.transfer = transfer;
function isBFWallet(id) {
    return id === 'deposit' || id === 'exchange' || id === 'trading';
}
exports.isBFWallet = isBFWallet;
//# sourceMappingURL=BitfinexAuth.js.map