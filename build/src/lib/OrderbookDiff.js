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
const BookBuilder_1 = require("./BookBuilder");
const types_1 = require("./types");
/**
 * Represents a sequence of trading commands that would bring the state of one book to another. Do not create instances
 * of this class directly. Use createOrderbookDiff instead.
 */
class OrderbookDiff {
    constructor(productId, initial, final) {
        this.commands = [];
        this.initial = initial;
        this.final = final;
        this.productId = productId;
    }
    /**
     * Compare order books by level only. Only the price and total size are relevant for determining the diff. However,
     * the individual orders are kept according to these rules:
     *  - If the level exists on initial only, then the orders from initial are copied over (sizes are negated).
     *  - If the level exists on final only, then the orders from final are copies over.
     *  - If the level exists on both and the sizes are different, the orders from initial are kept if `keepInitial` is true. Otherwise the final orders
     *    are copied. As usual, if inital orders are copied, the sizes are negated
     *  - If the levels are equivalent, then no orders are copied over at all, even if the sets are different.
     */
    static compareByLevel(initial, final, absolute, keepInitial) {
        keepInitial = keepInitial || false;
        const diffs = {
            sequence: -1,
            orderPool: null,
            bids: [],
            asks: []
        };
        ['buy', 'sell'].forEach((side) => {
            const diff = side === 'buy' ? diffs.bids : diffs.asks;
            const initialOrders = initial.getTree(side);
            const finalOrders = final.getTree(side);
            const iiter = initialOrders.iterator();
            const fiter = finalOrders.iterator();
            let ilevel;
            let flevel = fiter.next();
            // tslint:disable-next-line:no-conditional-assignment
            while (ilevel = iiter.next()) {
                // If there are no more final levels, or the initial price is lower than the final price, push the whole
                // level as a diff (size is negated though)
                if (!flevel || ilevel.price.lt(flevel.price)) {
                    const levelDiff = {
                        totalSize: ilevel.totalSize.neg(),
                        price: ilevel.price,
                        orders: copyWithNegativeSizes(ilevel.orders)
                    };
                    diff.push(levelDiff);
                    continue;
                }
                // Push final levels until the final price >= initial price
                while (flevel && flevel.price.lt(ilevel.price)) {
                    diff.push({
                        totalSize: flevel.totalSize,
                        price: flevel.price,
                        orders: flevel.orders
                    });
                    flevel = fiter.next();
                    // if flevel price > ilevel price, we should move the ilevel pointer back becuase we're not done with
                    // and it will be advances on the next loop
                    if (flevel.price.gt(ilevel.price)) {
                        iiter.prev();
                    }
                }
                // If prices are equal, compare sizes
                if (ilevel.price.eq(flevel.price)) {
                    const sizeDiff = flevel.totalSize.minus(ilevel.totalSize);
                    if (sizeDiff.cmp(types_1.ZERO) !== 0) {
                        diff.push({
                            totalSize: absolute ? flevel.totalSize : sizeDiff,
                            price: ilevel.price,
                            orders: keepInitial ? copyWithNegativeSizes(ilevel.orders) : flevel.orders
                        });
                    }
                    flevel = fiter.next();
                }
            }
            fiter.prev();
            // Any remaining orders on final must be added
            // tslint:disable-next-line:no-conditional-assignment
            while (flevel = fiter.next()) {
                diff.push({
                    totalSize: flevel.totalSize,
                    price: flevel.price,
                    orders: flevel.orders
                });
            }
        });
        return diffs;
    }
    /**
     * Compares the order pools of the two books and returns an orderbook state comprising the intersection complement
     * of the two sets of orders. However, orders that are in initial, but not in final have negative sizes to indicate
     * that they should be canceled to make the initial book look like final.
     */
    static compareByOrder(initial, final) {
        const iorders = Object.assign({}, initial.orderPool);
        const forders = Object.assign({}, final.orderPool);
        for (const orderId in forders) {
            if (iorders[orderId]) {
                delete iorders[orderId];
                delete forders[orderId];
            }
        }
        const book = new BookBuilder_1.BookBuilder(null);
        for (const orderId in forders) {
            book.add(forders[orderId]);
        }
        for (const orderId in iorders) {
            const order = iorders[orderId];
            order.size = order.size.neg();
            book.add(order);
        }
        return book.state();
    }
    /**
     * Cancel all orders then place a single order for each level on final book. No diff calculation is required to
     * generate this set. If set, defaultOrderFields will be used to provide default values for any missing fields
     * on the order
     */
    generateSimpleCommandSet(defaultOrderFields) {
        const commands = [];
        const now = new Date();
        commands.push({ type: 'cancelAllOrders', time: now });
        ['buy', 'sell'].forEach((side) => {
            const levels = this.final.getTree(side);
            const iterFn = side === 'buy' ? 'reach' : 'each';
            levels[iterFn]((level) => {
                const order = {
                    type: 'placeOrder',
                    time: now,
                    size: level.totalSize.toString(),
                    side: side,
                    productId: this.productId,
                    orderType: 'limit',
                    price: level.price.toString(),
                };
                if (defaultOrderFields) {
                    Object.assign(order, defaultOrderFields);
                }
                commands.push(order);
            });
        });
        this.commands = commands;
        return commands;
    }
    /**
     * Compares price levels and issues order commands to produce a _single order_ for each desired price level.
     * If set, defaultOrderFields will be used to provide default values for any missing fields
     * on the order.
     */
    generateDiffCommands(diff, defaultOrderFields) {
        const commands = [];
        const now = new Date();
        if (!diff) {
            diff = OrderbookDiff.compareByLevel(this.initial, this.final, true, true);
        }
        ['bids', 'asks'].forEach((side) => {
            const diffLevels = diff[side];
            diffLevels.forEach((diffLevel) => {
                // Cancel all existing orders on this price level
                diffLevel.orders.forEach((order) => {
                    if (order.size.gt(types_1.ZERO)) {
                        return;
                    }
                    const cmd = {
                        type: 'cancelOrder',
                        time: now,
                        orderId: order.id
                    };
                    commands.push(cmd);
                });
                // Place a new order for the desired size
                if (diffLevel.totalSize.gt(types_1.ZERO)) {
                    const order = {
                        type: 'placeOrder',
                        time: now,
                        size: diffLevel.totalSize.toString(),
                        side: side === 'bids' ? 'buy' : 'sell',
                        productId: this.productId,
                        orderType: 'limit',
                        price: diffLevel.price.toString(),
                    };
                    if (defaultOrderFields) {
                        Object.assign(order, defaultOrderFields);
                    }
                    commands.push(order);
                }
            });
        });
        return commands;
    }
}
exports.OrderbookDiff = OrderbookDiff;
function copyWithNegativeSizes(orders) {
    return orders.map((order) => {
        const newOrder = Object.assign({}, order);
        newOrder.size = order.size.neg();
        return newOrder;
    });
}
//# sourceMappingURL=OrderbookDiff.js.map