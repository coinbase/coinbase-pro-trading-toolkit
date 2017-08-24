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

import { OrderbookState, PriceLevelFactory } from '../../src/lib/Orderbook';
import { BookBuilder } from '../../src/lib/BookBuilder';
import { OrderDoneMessage, SnapshotMessage, StreamMessage } from '../../src/core/Messages';
import { NullLogger } from '../../src/utils/Logger';

function shallowState(): OrderbookState {
    return {
        sequence: 1,
        bids: [
            PriceLevelFactory(100, 10, 'buy'),
            PriceLevelFactory(99, 5, 'buy'),
            PriceLevelFactory(98, 20, 'buy'),
            PriceLevelFactory(97, 10, 'buy'),
            PriceLevelFactory(96, 1, 'buy'),
            PriceLevelFactory(95, 15, 'buy'),
            PriceLevelFactory(94, 10, 'buy'),
            PriceLevelFactory(93, 25, 'buy'),
            PriceLevelFactory(92, 25, 'buy'),
            PriceLevelFactory(91, 2, 'buy')
        ],
        asks: [
            PriceLevelFactory(110, 10, 'sell'),
            PriceLevelFactory(112, 5, 'sell'),
            PriceLevelFactory(113, 1, 'sell'),
            PriceLevelFactory(114, 1, 'sell'),
            PriceLevelFactory(115, 20, 'sell'),
            PriceLevelFactory(116, 30, 'sell'),
            PriceLevelFactory(117, 10, 'sell'),
            PriceLevelFactory(118, 5, 'sell'),
            PriceLevelFactory(119, 50, 'sell'),
            PriceLevelFactory(120, 2, 'sell')
        ]
    } as OrderbookState;
}

const shallowBook: BookBuilder = new BookBuilder(NullLogger);
shallowBook.fromState(shallowState());

function level3Messages(): StreamMessage[] {
    return [
        Object.assign({
            type: 'snapshot',
            time: new Date('2017-06-01'),
            productId: 'ABC-XYZ'
        }, shallowState()) as SnapshotMessage,
        { type: 'orderDone',
            sequence: 2,
            time: new Date('2017-06-01 00:00:01'),
            productId: 'ABC-XYZ',
            price: '113',
            remainingSize: '1',
            reason: 'cancelled'
        } as OrderDoneMessage
    ];
}

export { shallowBook, shallowState, level3Messages };
