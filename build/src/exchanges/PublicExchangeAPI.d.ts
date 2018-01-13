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
import { BookBuilder } from '../lib/BookBuilder';
import { BigJS } from '../lib/types';
/**
 * A generic API interface that defines the standard REST features that any crypto exchange typically exposes
 *
 * This interface does not define any behaviour related to maintaining a live orderbook, typically synchronized with a
 * websocket feed. Look at #LiveBook for an interface that handles this behaviour.
 *
 * This interface should typically not require authentication credentials; information such as ticker price and the
 * orderbook snapshots are usually available over a public API.
 *
 */
export interface PublicExchangeAPI {
    readonly owner: string;
    /**
     * Load the list of supported products on this exchange. Resolves with a list of products, or otherwise rejects the Promise with an HTTPError
     */
    loadProducts(): Promise<Product[]>;
    /**
     * Load the mid-market price from the exchange's ticker. Resolves with the latest midmarket price, or else rejects with an HTTPError
     */
    loadMidMarketPrice(gdaxProduct: string): Promise<BigJS>;
    /**
     * Load the order book from the REST API and resolves as an aggregated book as a #{../core/BookBuilder} object, otherwise the promise is rejected with an HTTPError
     */
    loadOrderbook(gdaxProduct: string): Promise<BookBuilder>;
    /**
     * Load the ticker for the configured product from the REST API, Resolves with the latest ticker object, or else rejects with an HTTPError
     */
    loadTicker(gdaxProduct: string): Promise<Ticker>;
}
/**
 * The interface for the book ticker. The standard GDAX api is employed. See (https://docs.gdax.com/#get-product-ticker)
 */
export interface Ticker {
    productId: string;
    price: BigJS;
    bid: BigJS;
    ask: BigJS;
    side?: string;
    volume?: BigJS;
    time: Date;
    trade_id?: string;
    size?: BigJS;
}
export interface Product {
    id: string;
    sourceId: string;
    baseCurrency: string;
    quoteCurrency: string;
    baseMinSize: BigJS;
    baseMaxSize: BigJS;
    quoteIncrement: BigJS;
    sourceData: any;
}
