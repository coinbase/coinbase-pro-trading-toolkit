/// <reference types="node" />
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
import { CumulativePriceLevel, Level3Order, Orderbook, OrderbookState, PriceComparable, PriceLevel, PriceLevelWithOrders } from './Orderbook';
import { BigJS, Biglike } from './types';
import { RBTree } from 'bintrees';
import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
export declare function AggregatedLevelFactory(totalSize: Biglike, price: Biglike, side: string): AggregatedLevelWithOrders;
export declare function AggregatedLevelFromPriceLevel(priceLevel: PriceLevelWithOrders): AggregatedLevelWithOrders;
/**
 * For cumulative order calculations, indicates at which price to start counting at and from which order size to start
 * within that level
 */
export interface StartPoint {
    price: BigJS;
    size: BigJS;
}
export interface OrderPool {
    [id: string]: Level3Order;
}
export declare class AggregatedLevel implements PriceLevel {
    totalSize: BigJS;
    totalValue: BigJS;
    price: BigJS;
    private _numOrders;
    constructor(price: BigJS);
    readonly numOrders: number;
    isEmpty(): boolean;
    equivalent(level: AggregatedLevel): boolean;
    protected add(amount: BigJS): void;
    protected subtract(amount: BigJS): void;
}
export declare class AggregatedLevelWithOrders extends AggregatedLevel implements PriceLevelWithOrders {
    private _orders;
    constructor(price: BigJS);
    readonly orders: Level3Order[];
    readonly numOrders: number;
    findOrder(id: string): Level3Order;
    addOrder(order: Level3Order): boolean;
    removeOrder(id: string): boolean;
}
/**
 * BookBuilder is a convenience class for maintaining an in-memory Level 3 order book. Each
 * side of the book is represented internally by a binary tree and a global order hash map
 *
 * The individual orders can be tracked globally via the orderPool set, or per level. The orderpool and the aggregated
 * levels point to the same order objects, and not copies.
 *
 * Call #state to get a hierarchical object representation of the orderbook
 */
export declare class BookBuilder extends EventEmitter implements Orderbook {
    sequence: number;
    protected bids: RBTree<AggregatedLevelWithOrders>;
    protected asks: RBTree<AggregatedLevelWithOrders>;
    protected _bidsTotal: BigJS;
    protected _bidsValueTotal: BigJS;
    protected _asksTotal: BigJS;
    protected _asksValueTotal: BigJS;
    private _orderPool;
    private logger;
    constructor(logger: Logger);
    clear(): void;
    readonly bidsTotal: BigJS;
    readonly bidsValueTotal: BigJS;
    readonly asksTotal: BigJS;
    readonly asksValueTotal: BigJS;
    readonly numAsks: number;
    readonly numBids: number;
    orderPool: OrderPool;
    readonly highestBid: AggregatedLevelWithOrders;
    readonly lowestAsk: AggregatedLevelWithOrders;
    getOrder(id: string): Level3Order;
    hasOrder(orderId: string): boolean;
    getLevel(side: string, price: BigJS): AggregatedLevelWithOrders;
    /**
     * Add an order's information to the book
     * @param order
     */
    add(order: Level3Order): boolean;
    /**
     * Changes the size of an existing order to newSize. If the order doesn't exist, returns false.
     * If the newSize is zero, the order is removed.
     * If newSize is negative, an error is thrown.
     * It is possible for an order to switch sides, in which case the newSide parameter determines the new side.
     */
    modify(id: string, newSize: BigJS, newSide?: string): boolean;
    addLevel(side: string, level: AggregatedLevelWithOrders): void;
    /**
     * Remove a complete level and links to orders in the order pool. If the price level doesn't exist, it returns
     * false
     */
    removeLevel(side: string, priceLevel: PriceComparable): boolean;
    /**
     * Shortcut method for replacing a level. First removeLevel is called, and then addLevel
     */
    setLevel(side: string, level: AggregatedLevelWithOrders): boolean;
    /**
     * Remove the order from the orderbook If numOrders drops to zero, remove the level
     */
    remove(orderId: string): Level3Order;
    getTree(side: string): RBTree<AggregatedLevelWithOrders>;
    /**
     * Returns a book object that has all the bids and asks at this current moment. For performance reasons, this method
     * returns a shallow copy of the underlying orders, so modifying the state object may break the orderbook generally.
     * For deep copies, call #stateCopy instead
     */
    state(): OrderbookState;
    /**
     * Returns a deep copy of the orderbook state.
     */
    stateCopy(): OrderbookState;
    fromState(state: OrderbookState): void;
    /**
     * Return an array of (aggregated) orders whose sum is equal to or greater than `value`.
     * The side parameter is from the perspective of the purchaser, so 'buy' returns asks and 'sell' bids.
     * If useQuote is true, value is assumed to represent price * size, otherwise just size is used
     * startPrice sets the first price to start counting from (inclusive). The default is undefined, which starts at the best bid/by
     */
    ordersForValue(side: string, value: BigJS, useQuote: boolean, start?: StartPoint): CumulativePriceLevel[];
    protected removeFromPool(orderId: string): boolean;
    private subtractFromTotal(amount, side, price);
    private addToTotal(amount, side, price);
}
