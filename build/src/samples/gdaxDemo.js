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
const types_1 = require("../lib/types");
const gdaxFactories_1 = require("../factories/gdaxFactories");
const gdax = gdaxFactories_1.DefaultAPI(null);
const product = 'BTC-USD';
gdax.loadMidMarketPrice(product).then((price) => {
    console.log(`Mid-market Price: $${price}/BTC`);
}).catch(logError);
gdax.loadTicker(product).then((ticker) => {
    console.log(`24hr Vol - ${ticker.volume.toFixed(2)}\t\t\t Price - ${ticker.price.toFixed(2)}`);
    console.log(`Ask - ${ticker.ask.toFixed(2)}\t\t\t Bid - ${ticker.bid.toFixed(2)}`);
}).catch(logError);
gdax.loadOrderbook(product).then((orderbook) => {
    console.log(`The orderbook has ${orderbook.numAsks} asks and ${orderbook.numBids} bids`);
}).catch(logError);
gdax.loadBalances().then((balances) => {
    for (const profile in balances) {
        for (const cur in balances[profile]) {
            const bal = balances[profile][cur];
            console.log(`${cur}: Balance = ${bal.balance.toFixed(2)}, Available = ${bal.available.toFixed(2)}`);
        }
    }
}).catch(logError);
gdax.loadAllOrders(product).then((orders) => {
    let total = types_1.Big(0);
    orders.forEach((o) => {
        total = total.plus(o.size);
    });
    console.log(`You have ${orders.length} orders on the book for a total of ${total.toFixed(1)} BTC`);
    return gdax.handleResponse(gdax.authCall('GET', '/users/self', {}), {});
}).then((result) => {
    console.log('Self');
    console.log(JSON.stringify(result));
    return gdax.handleResponse(gdax.authCall('GET', '/users/self/verify', {}), {});
}).then((result) => {
    console.log('Self verify');
    console.log(JSON.stringify(result));
}).catch(logError);
const order = {
    time: new Date(),
    type: 'placeOrder',
    productId: 'BTC-USD',
    clientId: null,
    price: '10',
    size: '1',
    side: 'buy',
    orderType: 'limit',
    postOnly: true
};
gdax.placeOrder(order).then((o) => {
    console.log(`Order ${o.id} successfully placed`);
    return gdax.loadOrder(o.id);
}).then((o) => {
    console.log(`Order status: ${o.status}, ${o.time}`);
    return gdax.cancelOrder(o.id);
}).then((id) => {
    console.log(`Order ${id} has been cancelled`);
}).catch(logError);
function logError(err) {
    console.log(err.message, err.response ? `${err.response.status}: ${err.response.body.message}` : '');
}
//# sourceMappingURL=gdaxDemo.js.map