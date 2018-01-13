/// <reference types="bintrees" />
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
import { RBTree } from 'bintrees';
import { OrderPool } from './BookBuilder';
import { BigJS } from './types';
export interface Orderbook {
    readonly numAsks: number;
    readonly numBids: number;
    readonly bidsTotal: BigJS;
    readonly asksTotal: BigJS;
    sequence: number;
    state(): OrderbookState;
}
export interface PriceComparable {
    price: BigJS;
}
export interface PriceLevel extends PriceComparable {
    totalSize: BigJS;
}
export interface PriceLevelWithOrders extends PriceLevel {
    orders: Level3Order[];
}
export declare function PriceLevelFactory(price: number, size: number, side: string): PriceLevelWithOrders;
export declare function PriceTreeFactory<T extends PriceComparable>(): RBTree<T>;
/**
 * BasicOrder only contains aggregated information about an order: price, side and size
 */
export interface BasicOrder {
    price: BigJS;
    size: BigJS;
    side: string;
}
export interface Level3Order extends BasicOrder {
    id: string;
}
export interface LiveOrder extends Level3Order {
    time: Date;
    productId: string;
    status: string;
    extra: any;
}
/**
 * Useful only as part of an array, the cumulative sum of the size and value of this level are included
 */
export interface CumulativePriceLevel extends PriceLevelWithOrders {
    value: BigJS;
    cumSize: BigJS;
    cumValue: BigJS;
}
export interface OrderbookState {
    sequence: number;
    sourceSequence?: number;
    asks: PriceLevelWithOrders[];
    bids: PriceLevelWithOrders[];
    orderPool: OrderPool;
}
