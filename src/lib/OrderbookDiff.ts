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

import { CancelOrderRequestMessage,
         PlaceOrderMessage } from '../core/Messages';
import { TraderStreamMessage } from '../core/Trader';
import { Level3Order,
         OrderbookState,
         PriceLevelWithOrders } from './Orderbook';
import { AggregatedLevel,
         AggregatedLevelWithOrders,
         BookBuilder } from './BookBuilder';
import { RBTree } from 'bintrees';
import { SIDES } from './sides';
import { BigJS, ZERO } from './types';

/**
 * Represents a sequence of trading commands that would bring the state of one book to another. Do not create instances
 * of this class directly. Use createOrderbookDiff instead.
 */
export class OrderbookDiff {
    /**
     * Compare order books by level only. Only the price and total size are relevant for determining the diff. However,
     * the individual orders are kept according to these rules:
     *  - If the level exists on initial only, then the orders from initial are copied over (sizes are negated).
     *  - If the level exists on final only, then the orders from final are copies over.
     *  - If the level exists on both and the sizes are different, the orders from initial are kept if `keepInitial` is true. Otherwise the final orders
     *    are copied. As usual, if inital orders are copied, the sizes are negated
     *  - If the levels are equivalent, then no orders are copied over at all, even if the sets are different.
     */
    static compareByLevel(initial: BookBuilder, final: BookBuilder, absolute: boolean, keepInitial?: boolean): OrderbookState {
        keepInitial = keepInitial || false;
        const diffs: OrderbookState = {
            sequence: -1,
            orderPool: null,
            bids: [],
            asks: []
        };
        SIDES.forEach((side) => {
            const diff: PriceLevelWithOrders[] = side === 'buy' ? diffs.bids : diffs.asks;
            const initialOrders: RBTree<AggregatedLevelWithOrders> = initial.getTree(side);
            const finalOrders: RBTree<AggregatedLevelWithOrders> = final.getTree(side);
            const iiter = initialOrders.iterator();
            const fiter = finalOrders.iterator();
            let ilevel: PriceLevelWithOrders;
            let flevel: PriceLevelWithOrders = fiter.next();
            // tslint:disable-next-line:no-conditional-assignment
            while (ilevel = iiter.next()) {
                // If there are no more final levels, or the initial price is lower than the final price, push the whole
                // level as a diff (size is negated though)
                if (!flevel || ilevel.price.lt(flevel.price)) {
                    const levelDiff: PriceLevelWithOrders = {
                        totalSize: ilevel.totalSize.negated(),
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
                    const sizeDiff: BigJS = flevel.totalSize.minus(ilevel.totalSize);
                    if (!sizeDiff.eq(ZERO)) {
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
    static compareByOrder(initial: BookBuilder, final: BookBuilder): OrderbookState {
        const iorders = Object.assign({}, initial.orderPool);
        const forders = Object.assign({}, final.orderPool);
        for (const orderId in forders) {
            if (iorders[orderId]) {
                delete iorders[orderId];
                delete forders[orderId];
            }
        }
        const book = new BookBuilder(null);
        for (const orderId in forders) {
            book.add(forders[orderId]);
        }
        for (const orderId in iorders) {
            const order = iorders[orderId];
            order.size = order.size.negated();
            book.add(order);
        }
        return book.state();
    }

    readonly productId: string;
    readonly initial: BookBuilder;
    readonly final: BookBuilder;

    constructor(productId: string, initial: BookBuilder, final: BookBuilder) {
        this.initial = initial;
        this.final = final;
        this.productId = productId;
    }

    /**
     * Cancel all orders then place a single order for each level on final book. No diff calculation is required to
     * generate this set. If set, defaultOrderFields will be used to provide default values for any missing fields
     * on the order
     */
    generateSimpleCommandSet(defaultOrderFields?: any): TraderStreamMessage[] {
        const commands: TraderStreamMessage[] = [];
        const now = new Date();
        commands.push({ type: 'cancelAllOrders', time: now });
        SIDES.forEach((side) => {
            const levels: RBTree<AggregatedLevel> = this.final.getTree(side);
            const iterFn: string = side === 'buy' ? 'reach' : 'each';
            (levels as any)[iterFn]((level: AggregatedLevel) => {
                const order: PlaceOrderMessage = {
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
        return commands;
    }

    /**
     * Compares price levels and issues order commands to produce a _single order_ for each desired price level.
     * If set, defaultOrderFields will be used to provide default values for any missing fields
     * on the order.
     */
    generateDiffCommands(diff?: OrderbookState, defaultOrderFields?: any): TraderStreamMessage[] {
        const commands: TraderStreamMessage[] = [];
        const now = new Date();
        if (!diff) {
            diff = OrderbookDiff.compareByLevel(this.initial, this.final, true, true);
        }
        ['bids', 'asks'].forEach((side: string) => {
            const diffLevels = side === 'bids' ? diff.bids : diff.asks;
            diffLevels.forEach((diffLevel: PriceLevelWithOrders) => {
                // Cancel all existing orders on this price level
                diffLevel.orders.forEach((order: Level3Order) => {
                    if (order.size.gt(ZERO)) {
                        return;
                    }
                    const cmd: CancelOrderRequestMessage = {
                        type: 'cancelOrder',
                        time: now,
                        orderId: order.id
                    };
                    commands.push(cmd);
                });
                // Place a new order for the desired size
                if (diffLevel.totalSize.gt(ZERO)) {
                    const order: PlaceOrderMessage = {
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

function copyWithNegativeSizes(orders: Level3Order[]): Level3Order[] {
    return orders.map((order) => {
        const newOrder = Object.assign({}, order);
        newOrder.size = order.size.negated();
        return newOrder;
    });
}
