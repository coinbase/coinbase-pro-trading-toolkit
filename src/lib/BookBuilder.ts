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

import { CumulativePriceLevel,
         Level3Order,
         Orderbook,
         OrderbookState,
         PriceComparable,
         PriceLevel,
         PriceLevelWithOrders,
         PriceTreeFactory } from './Orderbook';
import { Big, BigJS, Biglike, ZERO } from './types';
import { Side } from './sides';
import { RBTree } from 'bintrees';
import { EventEmitter } from 'events';
import { ConsoleLoggerFactory, Logger } from '../utils/Logger';
import assert = require('assert');

export function AggregatedLevelFactory(totalSize: Biglike, price: Biglike, side: Side): AggregatedLevelWithOrders {
    const level = new AggregatedLevelWithOrders(Big(price));
    const size = Big(totalSize);
    if (!size.eq(ZERO)) {
        const order: Level3Order = {
            id: price.toString(),
            price: Big(price),
            size: Big(totalSize),
            side: side
        };
        level.addOrder(order);
    }
    return level;
}

export function AggregatedLevelFromPriceLevel(priceLevel: PriceLevelWithOrders): AggregatedLevelWithOrders {
    const level = new AggregatedLevelWithOrders(priceLevel.price);
    level.totalSize = priceLevel.totalSize;
    level.totalValue = priceLevel.price.times(priceLevel.totalSize);
    (level as any)._orders = priceLevel.orders;
    return level;
}

/**
 * For cumulative order calculations, indicates at which price to start counting at and from which order size to start
 * within that level
 */
export interface StartPoint {
    price: BigJS;
    size: BigJS;
}

export interface OrderPool { [id: string]: Level3Order; }

export class AggregatedLevel implements PriceLevel {
    totalSize: BigJS;
    totalValue: BigJS;
    readonly price: BigJS;
    private _numOrders: number;

    constructor(price: BigJS) {
        this._numOrders = 0;
        this.totalSize = ZERO;
        this.totalValue = ZERO;
        this.price = price;
    }

    get numOrders(): number {
        return this._numOrders;
    }

    isEmpty(): boolean {
        return this._numOrders === 0;
    }

    equivalent(level: AggregatedLevel) {
        return this.price.eq(level.price) && this.totalSize.eq(level.totalSize);
    }

    protected add(amount: BigJS) {
        this.totalSize = this.totalSize.plus(amount);
        this.totalValue = this.totalValue.plus(amount.times(this.price));
    }

    protected subtract(amount: BigJS) {
        this.totalSize = this.totalSize.minus(amount);
        this.totalValue = this.totalValue.minus(amount.times(this.price));
    }
}

export class AggregatedLevelWithOrders extends AggregatedLevel implements PriceLevelWithOrders {
    private readonly _orders: Level3Order[];

    constructor(price: BigJS) {
        super(price);
        this._orders = [];
    }

    get orders(): Level3Order[] {
        return this._orders;
    }

    get numOrders(): number {
        return this._orders.length;
    }

    findOrder(id: string): Level3Order {
        return this._orders.find((order: Level3Order) => order.id === id);
    }

    addOrder(order: Level3Order): boolean {
        if (!this.price.eq(order.price)) {
            throw new Error(`Tried to add order with price ${order.price.toString()} to level with price ${this.price.toString()}`);
        }
        if (this.findOrder(order.id)) {
            return false;
        }
        this.add(order.size);
        this._orders.push(order);
        return true;
    }

    removeOrder(id: string): boolean {
        const order: Level3Order = this.findOrder(id);
        if (!order) {
            return false;
        }
        this.subtract(order.size);
        const i = this._orders.indexOf(order);
        this._orders.splice(i, 1);
        return true;
    }
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
export class BookBuilder extends EventEmitter implements Orderbook {
    public sequence: number;
    protected readonly bids: RBTree<AggregatedLevelWithOrders> = PriceTreeFactory<AggregatedLevelWithOrders>();
    protected readonly asks: RBTree<AggregatedLevelWithOrders> = PriceTreeFactory<AggregatedLevelWithOrders>();
    protected _bidsTotal: BigJS;
    protected _bidsValueTotal: BigJS;
    protected _asksTotal: BigJS;
    protected _asksValueTotal: BigJS;
    private _orderPool: OrderPool;
    private readonly logger: Logger;

    constructor(logger: Logger) {
        super();
        this.logger = logger || ConsoleLoggerFactory();
        this.clear();
    }

    clear() {
        this.bids.clear();
        this.asks.clear();
        this._bidsTotal = ZERO;
        this._asksTotal = ZERO;
        this._bidsValueTotal = ZERO;
        this._asksValueTotal = ZERO;
        this._orderPool = {};
        this.sequence = -1;
    }

    get bidsTotal(): BigJS {
        return this._bidsTotal;
    }

    get bidsValueTotal(): BigJS {
        return this._bidsValueTotal;
    }

    get asksTotal(): BigJS {
        return this._asksTotal;
    }

    get asksValueTotal(): BigJS {
        return this._asksValueTotal;
    }

    get numAsks(): number {
        return this.asks.size;
    }

    get numBids(): number {
        return this.bids.size;
    }

    get orderPool(): OrderPool {
        return this._orderPool;
    }

    set orderPool(value: OrderPool) {
        this._orderPool = value;
    }

    get highestBid(): AggregatedLevelWithOrders {
        return this.bids.max();
    }

    get lowestAsk(): AggregatedLevelWithOrders {
        return this.asks.min();
    }

    getOrder(id: string): Level3Order {
        return this._orderPool[id];
    }

    hasOrder(orderId: string): boolean {
        return this._orderPool.hasOwnProperty(orderId);
    }

    getLevel(side: Side, price: BigJS): AggregatedLevelWithOrders {
        const tree = this.getTree(side);
        return tree.find({ price: price } as any);
    }

    /**
     * Add an order's information to the book
     * @param order
     */
    add(order: Level3Order): boolean {
        const side = order.side;
        const tree = this.getTree(side);
        let level = new AggregatedLevelWithOrders(order.price);
        const existing: AggregatedLevelWithOrders = tree.find(level);
        if (existing) {
            level = existing;
        } else {
            if (!tree.insert(level)) {
                return false;
            }
        }
        // Add order to the aggregated level
        if (!level.addOrder(order)) {
            return false;
        }
        // Update global order pool stats
        this._orderPool[order.id] = order;
        this.addToTotal(order.size, order.side, order.price);
        return true;
    }

    /**
     * Changes the size of an existing order to newSize. If the order doesn't exist, returns false.
     * If newSize is negative, an error is thrown.
     * Even if newSize is zero, the order is kept.
     * It is possible for an order to switch sides, in which case the newSide parameter determines the new side.
     */
    modify(id: string, newSize: BigJS, newSide?: Side): boolean {
        if (newSize.lt(ZERO)) {
            throw new Error('Cannot set an order size to a negative number');
        }
        const order = this.remove(id);
        if (!order) {
            return false;
        }
        order.size = newSize;
        order.side = newSide || order.side;
        this.add(order);
        return true;
    }

    // Add a complete price level with orders to the order book. If the price level already exists, throw an exception
    addLevel(side: Side, level: AggregatedLevelWithOrders) {
        const tree = this.getTree(side);
        if (tree.find(level)) {
            throw new Error(`cannot add a new level to orderbook since the level already exists at price ${level.price.toString()}`);
        }
        tree.insert(level);
        this.addToTotal(level.totalSize, side, level.price);
        // Add links to orders
        level.orders.forEach((order: Level3Order) => {
            this._orderPool[order.id] = order;
        });
    }

    /**
     * Remove a complete level and links to orders in the order pool. If the price level doesn't exist, it returns
     * false
     */
    removeLevel(side: Side, priceLevel: PriceComparable): boolean {
        const tree = this.getTree(side);
        const level: AggregatedLevelWithOrders = tree.find(priceLevel as any);
        if (!level) {
            return false;
        }
        assert(tree.remove(level));
        level.orders.forEach((order: Level3Order) => {
            delete this.orderPool[order.id];
        });
        this.subtractFromTotal(level.totalSize, side, level.price);
        return true;
    }

    /**
     * Shortcut method for replacing a level. First removeLevel is called, and then addLevel
     */
    setLevel(side: Side, level: AggregatedLevelWithOrders): boolean {
        this.removeLevel(side, level);
        if (level.numOrders > 0) {
            this.addLevel(side, level);
        }
        return true;
    }

    /**
     * Remove the order from the orderbook If numOrders drops to zero, remove the level
     */
    remove(orderId: string): Level3Order {
        const order: Level3Order = this.getOrder(orderId);
        if (!order) {
            return null;
        }
        const side = order.side;
        const tree = this.getTree(side);
        let level = new AggregatedLevelWithOrders(order.price);
        level = tree.find(level);
        if (!level) {
            // If a market order has filled, we can carry on
            if (order.size.eq(ZERO)) {
                return order;
            }
            this.logger.log('error', `There should have been orders at price level ${order.price} for at least ${order.size}, but there were none`);
            return null;
        }
        if (this.removeFromPool(order.id)) {
            this.subtractFromTotal(order.size, order.side, order.price);
        }
        level.removeOrder(order.id);
        if (level.numOrders === 0) {
            if (!(level.totalSize.eq(ZERO))) {
                this.logger.log('error', `Total size should be zero at level $${level.price} but was ${level.totalSize}.`);
                return null;
            }
            tree.remove(level);
        }
        return order;
    }

    getTree(side: Side): RBTree<AggregatedLevelWithOrders> {
        return side === 'buy' ? this.bids : this.asks;
    }

    /**
     * Returns a book object that has all the bids and asks at this current moment. For performance reasons, this method
     * returns a shallow copy of the underlying orders, so modifying the state object may break the orderbook generally.
     * For deep copies, call #stateCopy instead
     */
    state(): OrderbookState {
        const book: OrderbookState = {
            sequence: this.sequence,
            asks: [],
            bids: [],
            orderPool: this.orderPool
        };
        this.bids.reach((bid: AggregatedLevelWithOrders) => {
            book.bids.push(bid);
        });
        this.asks.each((ask: AggregatedLevelWithOrders) => {
            book.asks.push(ask);
        });
        return book;
    }

    /**
     * Returns a deep copy of the orderbook state.
     */
    stateCopy(): OrderbookState {
        const shallowBook: OrderbookState = this.state();
        return Object.assign({}, shallowBook);
    }

    fromState(state: OrderbookState) {
        this.clear();
        this.sequence = state.sequence;
        // The order pool gets set up in setLevel
        state.asks.forEach((priceLevel: PriceLevelWithOrders) => {
            const level: AggregatedLevelWithOrders = AggregatedLevelFromPriceLevel(priceLevel);
            this.setLevel('sell', level);
        });
        state.bids.forEach((priceLevel: PriceLevelWithOrders) => {
            const level: AggregatedLevelWithOrders = AggregatedLevelFromPriceLevel(priceLevel);
            this.setLevel('buy', level);
        });
    }

    /**
     * Return an array of (aggregated) orders whose sum is equal to or greater than `value`.
     * The side parameter is from the perspective of the purchaser, so 'buy' returns asks and 'sell' bids.
     * If useQuote is true, value is assumed to represent price * size, otherwise just size is used
     * startPrice sets the first price to start counting from (inclusive). The default is undefined, which starts at the best bid/by
     */
    ordersForValue(side: Side, value: BigJS, useQuote: boolean, start?: StartPoint): CumulativePriceLevel[] {
        const source = side === 'buy' ? this.asks : this.bids;
        const iter = source.iterator();
        let totalSize = ZERO;
        let totalValue = ZERO;
        const orders: CumulativePriceLevel[] = [];
        let level: AggregatedLevelWithOrders;
        // Find start order with price >= startPrice (for buys)
        if (start) {
            if (side === 'buy') {
                do {
                    level = iter.next();
                } while (level && level.price.lt(start.price));
            } else {
                do {
                    level = iter.prev();
                } while (level && level.price.gt(start.price));
            }
            level = Object.assign({}, level);
            level.totalSize = level.totalSize.minus(start.size);
        } else {
            level = side === 'buy' ? iter.next() : iter.prev();
        }
        while (level !== null && (
            (useQuote && totalValue.lt(value)) || (!useQuote && totalSize.lt(value))
        )) {
            let levelValue = level.price.times(level.totalSize);
            let levelSize = level.totalSize;
            if (useQuote && levelValue.plus(totalValue).gte(value)) {
                levelValue = value.minus(totalValue);
                levelSize = levelValue.div(level.price);
            } else if (!useQuote && levelSize.plus(totalSize).gte(value)) {
                levelSize = value.minus(totalSize);
                levelValue = levelSize.times(level.price);
            } else {
                levelSize = level.totalSize;
                levelValue = levelSize.times(level.price);
            }
            totalSize = totalSize.plus(levelSize);
            totalValue = totalValue.plus(levelValue);
            orders.push({
                totalSize: levelSize,
                value: levelValue,
                price: level.price,
                cumSize: totalSize,
                cumValue: totalValue,
                orders: level.orders
            });
            level = side === 'buy' ? iter.next() : iter.prev();
        }
        return orders;
    }

    protected removeFromPool(orderId: string): boolean {
        const exists = this.hasOrder(orderId);
        if (exists) { delete this._orderPool[orderId]; }
        return exists;
    }

    private subtractFromTotal(amount: BigJS, side: Side, price: BigJS) {
        if (side === 'buy') {
            this._bidsTotal = this._bidsTotal.minus(amount);
            this._bidsValueTotal = this._bidsValueTotal.minus(amount.times(price));
        } else {
            this._asksTotal = this._asksTotal.minus(amount);
            this._asksValueTotal = this._asksValueTotal.minus(amount.times(price));
        }
    }

    private addToTotal(amount: BigJS, side: Side, price: BigJS) {
        if (side === 'buy') {
            this._bidsTotal = this._bidsTotal.plus(amount);
            this._bidsValueTotal = this._bidsValueTotal.plus(amount.times(price));
        } else {
            this._asksTotal = this._asksTotal.plus(amount);
            this._asksValueTotal = this._asksValueTotal.plus(amount.times(price));
        }
    }
}
