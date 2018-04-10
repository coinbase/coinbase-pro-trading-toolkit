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

import { AvailableBalance,
         Balances } from '../exchanges/AuthenticatedExchangeAPI';
import { BigJS, ZERO } from '../lib/types';
import { Ticker } from '../exchanges/PublicExchangeAPI';
import { LiveOrder, Orderbook } from '../lib/Orderbook';
import { GDAXExchangeAPI } from '../exchanges/gdax/GDAXExchangeAPI';
import { DefaultAPI } from '../factories/gdaxFactories';
import { PlaceOrderMessage } from '../core/Messages';

const gdax: GDAXExchangeAPI = DefaultAPI(null);
const product = 'BTC-USD';

gdax.loadMidMarketPrice(product).then((price: BigJS) => {
    console.log(`Mid-market Price: $${price}/BTC`);
}).catch(logError);

gdax.loadTicker(product).then((ticker: Ticker) => {
    console.log(`24hr Vol - ${ticker.volume.toFixed(2)}\t\t\t Price - ${ticker.price.toFixed(2)}`);
    console.log(`Ask - ${ticker.ask.toFixed(2)}\t\t\t Bid - ${ticker.bid.toFixed(2)}`);
}).catch(logError);

gdax.loadOrderbook(product).then((orderbook: Orderbook) => {
    console.log(`The orderbook has ${orderbook.numAsks} asks and ${orderbook.numBids} bids`);
}).catch(logError);

gdax.loadBalances().then((balances: Balances) => {
    for (const profile in balances) {
        for (const cur in balances[profile]) {
            const bal: AvailableBalance = balances[profile][cur];
            console.log(`${cur}: Balance = ${bal.balance.toFixed(2)}, Available = ${bal.available.toFixed(2)}`);
        }
    }
}).catch(logError);

gdax.loadAllOrders(product).then((orders) => {
    let total = ZERO;
    orders.forEach((o: LiveOrder) => {
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

const order: PlaceOrderMessage = {
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

gdax.placeOrder(order).then((o: LiveOrder) => {
    console.log(`Order ${o.id} successfully placed`);
    return gdax.loadOrder(o.id);
}).then((o) => {
    console.log(`Order status: ${o.status}, ${o.time}`);
    return gdax.cancelOrder(o.id);
}).then((id) => {
    console.log(`Order ${id} has been cancelled`);
}).catch(logError);

function logError(err: any): void {
    console.log(err.message, err.response ? `${err.response.status}: ${err.response.body.message}` : '');
}
