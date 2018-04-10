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

import { PlaceOrderMessage } from '../core/Messages';
import { LiveOrder } from '../lib/Orderbook';
import { BigJS } from '../lib/types';

/**
 * Exchange functionality that requires user authentication lives here, like querying balances, or making trades
 */
export interface AuthenticatedExchangeAPI {
    readonly owner: string;
    /**
     * Place a new order. Returns a promise for placing a new order on the exchange. It will resolve with the order id if successful,
     * or undefined if not. If any other error occurs, the promise will be rejected.
     */
    placeOrder(order: PlaceOrderMessage): Promise<LiveOrder>;

    /**
     * Cancel the order identified by id. The returned promise resolves with the result of the cancellation. This will be
     * the order id if the order was cancelled, or the promise will be rejected with an error
     *
     * @param id {string} The order ID to cancel
     */
    cancelOrder(id: string): Promise<string>;

    /**
     * Cancel all orders. If product is truthy, only cancel orders from that book
     */
    cancelAllOrders(gdaxProduct?: string): Promise<string[]>;

    /**
     * Load details for a user-placed order on the exchange
     */
    loadOrder(id: string): Promise<LiveOrder>;

    /**
     * Loads all currently active orders placed by the user (i.e. not the full orderbook). If product is undefined, load
     * all orders from all books
     */
    loadAllOrders(gdaxProduct?: string): Promise<LiveOrder[]>;

    /**
     * Return the balances for all the accounts the user has associated with the current authentication credentials
     */
    loadBalances(): Promise<Balances>;
}

export interface AvailableBalance {
    balance: BigJS;
    available: BigJS;
}

export interface AvailableBalances {
    [currency: string]: AvailableBalance;
}

export interface Balances {
    [profileId: string]: AvailableBalances;
}
