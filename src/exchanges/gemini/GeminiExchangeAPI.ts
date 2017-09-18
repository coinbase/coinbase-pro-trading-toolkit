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
import { PublicExchangeAPI, Product, Ticker } from '../PublicExchangeAPI';
import { AuthenticatedExchangeAPI, Balances } from '../AuthenticatedExchangeAPI';
import { BookBuilder } from '../../lib/BookBuilder';
import { PlaceOrderMessage } from '../../core/Messages';
import { LiveOrder } from '../../lib/Orderbook';

export class GeminiExchangeAPI implements PublicExchangeAPI, AuthenticatedExchangeAPI {
    placeOrder(order: PlaceOrderMessage): Promise<LiveOrder> {
        throw new Error("Method not implemented.");
    }
    cancelOrder(id: string): Promise<string> {
        throw new Error("Method not implemented.");
    }
    cancelAllOrders(product: string): Promise<string[]> {
        throw new Error("Method not implemented.");
    }
    loadOrder(id: string): Promise<LiveOrder> {
        throw new Error("Method not implemented.");
    }
    loadAllOrders(gdaxProduct: string): Promise<LiveOrder[]> {
        throw new Error("Method not implemented.");
    }
    loadBalances(): Promise<Balances> {
        throw new Error("Method not implemented.");
    }
    owner: string;
    loadProducts(): Promise<Product[]> {
        throw new Error("Method not implemented.");
    }
    loadMidMarketPrice(gdaxProduct: string): Promise<BigNumber.BigNumber> {
        throw new Error("Method not implemented.");
    }
    loadOrderbook(gdaxProduct: string): Promise<BookBuilder> {
        throw new Error("Method not implemented.");
    }
    loadTicker(gdaxProduct: string): Promise<Ticker> {
        throw new Error("Method not implemented.");
    }
}