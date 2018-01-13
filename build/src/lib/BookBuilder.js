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
const Orderbook_1 = require("./Orderbook");
const types_1 = require("./types");
const events_1 = require("events");
const Logger_1 = require("../utils/Logger");
const assert = require("assert");
function AggregatedLevelFactory(totalSize, price, side) {
    const level = new AggregatedLevelWithOrders(types_1.Big(price));
    const size = types_1.Big(totalSize);
    if (!size.eq(types_1.ZERO)) {
        const order = {
            id: price.toString(),
            price: types_1.Big(price),
            size: types_1.Big(totalSize),
            side: side
        };
        level.addOrder(order);
    }
    return level;
}
exports.AggregatedLevelFactory = AggregatedLevelFactory;
function AggregatedLevelFromPriceLevel(priceLevel) {
    const level = new AggregatedLevelWithOrders(priceLevel.price);
    level.totalSize = priceLevel.totalSize;
    level.totalValue = priceLevel.price.times(priceLevel.totalSize);
    level._orders = priceLevel.orders;
    return level;
}
exports.AggregatedLevelFromPriceLevel = AggregatedLevelFromPriceLevel;
class AggregatedLevel {
    constructor(price) {
        this._numOrders = 0;
        this.totalSize = types_1.ZERO;
        this.totalValue = types_1.ZERO;
        this.price = price;
    }
    get numOrders() {
        return this._numOrders;
    }
    isEmpty() {
        return this._numOrders === 0;
    }
    equivalent(level) {
        return this.price.eq(level.price) && this.totalSize.eq(level.totalSize);
    }
    add(amount) {
        this.totalSize = this.totalSize.plus(amount);
        this.totalValue = this.totalValue.plus(amount.times(this.price));
    }
    subtract(amount) {
        this.totalSize = this.totalSize.minus(amount);
        this.totalValue = this.totalValue.minus(amount.times(this.price));
    }
}
exports.AggregatedLevel = AggregatedLevel;
class AggregatedLevelWithOrders extends AggregatedLevel {
    constructor(price) {
        super(price);
        this._orders = [];
    }
    get orders() {
        return this._orders;
    }
    get numOrders() {
        return this._orders.length;
    }
    findOrder(id) {
        return this._orders.find((order) => order.id === id);
    }
    addOrder(order) {
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
    removeOrder(id) {
        const order = this.findOrder(id);
        if (!order) {
            return false;
        }
        this.subtract(order.size);
        const i = this._orders.indexOf(order);
        this._orders.splice(i, 1);
        return true;
    }
}
exports.AggregatedLevelWithOrders = AggregatedLevelWithOrders;
/**
 * BookBuilder is a convenience class for maintaining an in-memory Level 3 order book. Each
 * side of the book is represented internally by a binary tree and a global order hash map
 *
 * The individual orders can be tracked globally via the orderPool set, or per level. The orderpool and the aggregated
 * levels point to the same order objects, and not copies.
 *
 * Call #state to get a hierarchical object representation of the orderbook
 */
class BookBuilder extends events_1.EventEmitter {
    constructor(logger) {
        super();
        this.sequence = -1;
        this._bidsTotal = types_1.ZERO;
        this._bidsValueTotal = types_1.ZERO;
        this._asksTotal = types_1.ZERO;
        this._asksValueTotal = types_1.ZERO;
        this._orderPool = {};
        this.logger = logger || Logger_1.ConsoleLoggerFactory();
        this.clear();
    }
    clear() {
        this.bids = Orderbook_1.PriceTreeFactory();
        this.asks = Orderbook_1.PriceTreeFactory();
        this._bidsTotal = types_1.ZERO;
        this._asksTotal = types_1.ZERO;
        this._bidsValueTotal = types_1.ZERO;
        this._asksValueTotal = types_1.ZERO;
        this._orderPool = {};
        this.sequence = -1;
    }
    get bidsTotal() {
        return this._bidsTotal;
    }
    get bidsValueTotal() {
        return this._bidsValueTotal;
    }
    get asksTotal() {
        return this._asksTotal;
    }
    get asksValueTotal() {
        return this._asksValueTotal;
    }
    get numAsks() {
        return this.asks.size;
    }
    get numBids() {
        return this.bids.size;
    }
    get orderPool() {
        return this._orderPool;
    }
    set orderPool(value) {
        this._orderPool = value;
    }
    get highestBid() {
        return this.bids.max();
    }
    get lowestAsk() {
        return this.asks.min();
    }
    getOrder(id) {
        return this._orderPool[id];
    }
    hasOrder(orderId) {
        return this._orderPool.hasOwnProperty(orderId);
    }
    getLevel(side, price) {
        const tree = this.getTree(side);
        return tree.find({ price: price });
    }
    /**
     * Add an order's information to the book
     * @param order
     */
    add(order) {
        const side = order.side;
        const tree = this.getTree(side);
        let level = new AggregatedLevelWithOrders(order.price);
        const existing = tree.find(level);
        if (existing) {
            level = existing;
        }
        else {
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
     * If the newSize is zero, the order is removed.
     * If newSize is negative, an error is thrown.
     * It is possible for an order to switch sides, in which case the newSide parameter determines the new side.
     */
    modify(id, newSize, newSide) {
        if (newSize.lt(types_1.ZERO)) {
            throw new Error('Cannot set an order size to a negative number');
        }
        const order = this.getOrder(id);
        if (!order) {
            return false;
        }
        if (!this.remove(id)) {
            return false;
        }
        if (newSize.gt(types_1.ZERO)) {
            order.size = newSize;
            order.side = newSide || order.side;
            this.add(order);
        }
        return true;
    }
    // Add a complete price level with orders to the order book. If the price level already exists, throw an exception
    addLevel(side, level) {
        const tree = this.getTree(side);
        if (tree.find(level)) {
            throw new Error(`cannot add a new level to orderbook since the level already exists at price ${level.price.toString()}`);
        }
        tree.insert(level);
        this.addToTotal(level.totalSize, side, level.price);
        // Add links to orders
        level.orders.forEach((order) => {
            this._orderPool[order.id] = order;
        });
    }
    /**
     * Remove a complete level and links to orders in the order pool. If the price level doesn't exist, it returns
     * false
     */
    removeLevel(side, priceLevel) {
        const tree = this.getTree(side);
        const level = tree.find(priceLevel);
        if (!level) {
            return false;
        }
        assert(tree.remove(level));
        level.orders.forEach((order) => {
            delete this.orderPool[order.id];
        });
        this.subtractFromTotal(level.totalSize, side, level.price);
        return true;
    }
    /**
     * Shortcut method for replacing a level. First removeLevel is called, and then addLevel
     */
    setLevel(side, level) {
        this.removeLevel(side, level);
        if (level.numOrders > 0) {
            this.addLevel(side, level);
        }
        return true;
    }
    /**
     * Remove the order from the orderbook If numOrders drops to zero, remove the level
     */
    remove(orderId) {
        const order = this.getOrder(orderId);
        if (!order) {
            return null;
        }
        const side = order.side;
        const tree = this.getTree(side);
        let level = new AggregatedLevelWithOrders(order.price);
        level = tree.find(level);
        if (!level) {
            // If a market order has filled, we can carry on
            if (order.size.eq(types_1.ZERO)) {
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
            if (!(level.totalSize.eq(types_1.ZERO))) {
                this.logger.log('error', `Total size should be zero at level $${level.price} but was ${level.totalSize}.`);
                return null;
            }
            tree.remove(level);
        }
        return order;
    }
    getTree(side) {
        return side === 'buy' ? this.bids : this.asks;
    }
    /**
     * Returns a book object that has all the bids and asks at this current moment. For performance reasons, this method
     * returns a shallow copy of the underlying orders, so modifying the state object may break the orderbook generally.
     * For deep copies, call #stateCopy instead
     */
    state() {
        const book = {
            sequence: this.sequence,
            asks: [],
            bids: [],
            orderPool: this.orderPool
        };
        this.bids.reach((bid) => {
            book.bids.push(bid);
        });
        this.asks.each((ask) => {
            book.asks.push(ask);
        });
        return book;
    }
    /**
     * Returns a deep copy of the orderbook state.
     */
    stateCopy() {
        const shallowBook = this.state();
        return Object.assign({}, shallowBook);
    }
    fromState(state) {
        this.clear();
        this.sequence = state.sequence;
        // The order pool gets set up in setLevel
        state.asks.forEach((priceLevel) => {
            const level = AggregatedLevelFromPriceLevel(priceLevel);
            this.setLevel('sell', level);
        });
        state.bids.forEach((priceLevel) => {
            const level = AggregatedLevelFromPriceLevel(priceLevel);
            this.setLevel('buy', level);
        });
    }
    /**
     * Return an array of (aggregated) orders whose sum is equal to or greater than `value`.
     * The side parameter is from the perspective of the purchaser, so 'buy' returns asks and 'sell' bids.
     * If useQuote is true, value is assumed to represent price * size, otherwise just size is used
     * startPrice sets the first price to start counting from (inclusive). The default is undefined, which starts at the best bid/by
     */
    ordersForValue(side, value, useQuote, start) {
        const source = side === 'buy' ? this.asks : this.bids;
        const iter = source.iterator();
        let totalSize = types_1.ZERO;
        let totalValue = types_1.ZERO;
        const orders = [];
        let level;
        // Find start order with price >= startPrice (for buys)
        if (start) {
            if (side === 'buy') {
                do {
                    level = iter.next();
                } while (level && level.price.lt(start.price));
            }
            else {
                do {
                    level = iter.prev();
                } while (level && level.price.gt(start.price));
            }
            level = Object.assign({}, level);
            level.totalSize = level.totalSize.minus(start.size);
        }
        else {
            level = side === 'buy' ? iter.next() : iter.prev();
        }
        while (level !== null && ((useQuote && totalValue.lt(value)) || (!useQuote && totalSize.lt(value)))) {
            let levelValue = level.price.times(level.totalSize);
            let levelSize = level.totalSize;
            if (useQuote && levelValue.plus(totalValue).gte(value)) {
                levelValue = value.minus(totalValue);
                levelSize = levelValue.div(level.price);
            }
            else if (!useQuote && levelSize.plus(totalSize).gte(value)) {
                levelSize = value.minus(totalSize);
                levelValue = levelSize.times(level.price);
            }
            else {
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
    removeFromPool(orderId) {
        const exists = this.hasOrder(orderId);
        if (exists) {
            delete this._orderPool[orderId];
        }
        return exists;
    }
    subtractFromTotal(amount, side, price) {
        if (side === 'buy') {
            this._bidsTotal = this._bidsTotal.minus(amount);
            this._bidsValueTotal = this._bidsValueTotal.minus(amount.times(price));
        }
        else {
            this._asksTotal = this._asksTotal.minus(amount);
            this._asksValueTotal = this._asksValueTotal.minus(amount.times(price));
        }
    }
    addToTotal(amount, side, price) {
        if (side === 'buy') {
            this._bidsTotal = this._bidsTotal.plus(amount);
            this._bidsValueTotal = this._bidsValueTotal.plus(amount.times(price));
        }
        else {
            this._asksTotal = this._asksTotal.plus(amount);
            this._asksValueTotal = this._asksValueTotal.plus(amount.times(price));
        }
    }
}
exports.BookBuilder = BookBuilder;
//# sourceMappingURL=BookBuilder.js.map