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

import OrderbookUtils from '../../src/lib/OrderbookUtils';
import { OrderbookState } from '../../src/lib/Orderbook';
import { AggregatedLevelFactory } from '../../src/lib/BookBuilder';

export default function createOrderbookUtils(bids: number[][], asks: number[][]): OrderbookUtils {
    const book: OrderbookState = {
        sequence: 100,
        bids: [],
        asks: [],
        orderPool: {}
    };
    bids.forEach((bid: number[]) => {
        book.bids.push(AggregatedLevelFactory(bid[1], bid[0], 'buy'));
    });
    asks.forEach((ask: number[]) => {
        book.asks.push(AggregatedLevelFactory(ask[1], ask[0], 'sell'));
    });
    const obu = new OrderbookUtils(book);
    (obu as any).calculateStatsNoCache = () => {
        throw new Error('Expecting cached version to be called');
    };
    obu.precache();
    return obu;
}
