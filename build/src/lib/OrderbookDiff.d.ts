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
import { StreamMessage } from '../core/Messages';
import { OrderbookState } from './Orderbook';
import { BookBuilder } from './BookBuilder';
/**
 * Represents a sequence of trading commands that would bring the state of one book to another. Do not create instances
 * of this class directly. Use createOrderbookDiff instead.
 */
export declare class OrderbookDiff {
    /**
     * Compare order books by level only. Only the price and total size are relevant for determining the diff. However,
     * the individual orders are kept according to these rules:
     *  - If the level exists on initial only, then the orders from initial are copied over (sizes are negated).
     *  - If the level exists on final only, then the orders from final are copies over.
     *  - If the level exists on both and the sizes are different, the orders from initial are kept if `keepInitial` is true. Otherwise the final orders
     *    are copied. As usual, if inital orders are copied, the sizes are negated
     *  - If the levels are equivalent, then no orders are copied over at all, even if the sets are different.
     */
    static compareByLevel(initial: BookBuilder, final: BookBuilder, absolute: boolean, keepInitial?: boolean): OrderbookState;
    /**
     * Compares the order pools of the two books and returns an orderbook state comprising the intersection complement
     * of the two sets of orders. However, orders that are in initial, but not in final have negative sizes to indicate
     * that they should be canceled to make the initial book look like final.
     */
    static compareByOrder(initial: BookBuilder, final: BookBuilder): OrderbookState;
    productId: string;
    commands: StreamMessage[];
    initial: BookBuilder;
    final: BookBuilder;
    constructor(productId: string, initial: BookBuilder, final: BookBuilder);
    /**
     * Cancel all orders then place a single order for each level on final book. No diff calculation is required to
     * generate this set. If set, defaultOrderFields will be used to provide default values for any missing fields
     * on the order
     */
    generateSimpleCommandSet(defaultOrderFields?: any): StreamMessage[];
    /**
     * Compares price levels and issues order commands to produce a _single order_ for each desired price level.
     * If set, defaultOrderFields will be used to provide default values for any missing fields
     * on the order.
     */
    generateDiffCommands(diff?: OrderbookState, defaultOrderFields?: any): StreamMessage[];
}
