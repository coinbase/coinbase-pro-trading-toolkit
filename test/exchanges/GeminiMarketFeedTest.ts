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

import { LiveOrderbook } from '../../src/core/LiveOrderbook';
import { GeminiMarketFeed } from '../../src/exchanges/gemini/GeminiMarketFeed';
import { EventEmitter } from 'events';
import { Big } from '../../src/lib/types';
import { BookBuilder } from '../../src/lib/BookBuilder';
import { NullLogger } from '../../src/utils/Logger';
import { hooks } from '../../src/exchanges/ExchangeFeed';
import { OrderbookState } from '../../src/lib/Orderbook';
import * as GI from '../../src/exchanges/gemini/GeminiInterfaces';
import simple = require('simple-mock');

const assert = require('assert');

const mockSocket: any = new EventEmitter();

mockSocket.send = () => { /* no-op */ };

mockSocket.close = () => {
    mockSocket.removeAllListeners();
};

describe('Gemini Market feed', () => {
    const messages: GI.GeminiMessage[] = [
        {
            type: 'update',
            socket_sequence: 0,
            eventId: '1122334455',
            events: [
                {
                    type: 'change',
                    reason: 'initial',
                    price: '95.0',
                    delta: '5.0',
                    remaining: '5.0',
                    side: 'bid'
                } as GI.GeminiChangeEvent,
                {
                    type: 'change',
                    reason: 'initial',
                    price: '115.0',
                    delta: '5.0',
                    remaining: '5.0',
                    side: 'ask'
                } as GI.GeminiChangeEvent
            ],
            timestamp: '1478729300',
            timestampms: '1478729300200'
        } as GI.GeminiUpdateMessage,
        {
            type: 'update',
            socket_sequence: 1,
            eventId: '1122334466',
            events: [
                {
                    type: 'change',
                    reason: 'trade',
                    price: '115.0',
                    delta: '-3.0',
                    remaining: '2.0',
                    side: 'ask'
                } as GI.GeminiChangeEvent
            ],
            timestamp: '1478729310',
            timestampms: '1478729310200'
        } as GI.GeminiUpdateMessage,
        {
            type: 'update',
            socket_sequence: 2,
            eventId: '1122334477',
            events: [
                {
                    type: 'change',
                    reason: 'place',
                    price: '100.0',
                    delta: '4.0',
                    remaining: '4.0',
                    side: 'bid'
                } as GI.GeminiChangeEvent
            ],
            timestamp: '1478729320',
            timestampms: '1478729320200'
        } as GI.GeminiUpdateMessage,
        {
            type: 'update',
            socket_sequence: 3,
            eventId: '1122334488',
            events: [
                {
                    type: 'change',
                    reason: 'place',
                    price: '200.0',
                    delta: '15.0',
                    remaining: '15.0',
                    side: 'ask'
                } as GI.GeminiChangeEvent
            ],
            timestamp: '1478729330',
            timestampms: '1478729330200'
        } as GI.GeminiUpdateMessage,
        {
            type: 'update',
            socket_sequence: 4,
            eventId: '1122334499',
            events: [
                {
                    type: 'change',
                    reason: 'place',
                    price: '98.0',
                    delta: '2.5',
                    remaining: '2.5',
                    side: 'bid'
                } as GI.GeminiChangeEvent
            ],
            timestamp: '1478729340',
            timestampms: '1478729340200'
        } as GI.GeminiUpdateMessage
    ];

    const expectedState: OrderbookState = {
        sequence: 4,
        orderPool: {
            '100.0': { id: '100.0', side: 'buy', price: Big(100), size: Big(4) },
            '115.0': { id: '115.0', side: 'sell', price: Big(115), size: Big(2) },
            '200.0': { id: '200.0', side: 'sell', price: Big(200), size: Big(15) },
            '98.0': { id: '98.0', side: 'buy', price: Big(98), size: Big(2.5) },
            '95.0': { id: '95.0', side: 'buy', price: Big(95), size: Big(5) }
        },
        bids: [
            {
                price: Big(100),
                totalSize: Big(4),
                orders: [{ id: '100.0', side: 'buy', price: Big(100), size: Big(4) }]
            },
            {
                price: Big(98),
                totalSize: Big(2.5),
                orders: [{ id: '98.0', side: 'buy', price: Big(98), size: Big(2.5) }
                ]
            },
            {
                price: Big(95),
                totalSize: Big(5),
                orders: [{ id: '95.0', side: 'buy', price: Big(95), size: Big(5) }]
            }
        ],
        asks: [
            {
                price: Big(200),
                totalSize: Big(15),
                orders: [{ id: '200.0', side: 'sell', price: Big(200), size: Big(15) }]
            },
            {
                price: Big(115),
                totalSize: Big(2),
                orders: [{ id: '115.0', side: 'sell', price: Big(115), size: Big(2) }]
            }
        ]
    };

    let book: LiveOrderbook;
    let geminiFeed: GeminiMarketFeed;

    before(() => {
        simple.mock(hooks, 'WebSocket').callFn(() => mockSocket);
        geminiFeed = new GeminiMarketFeed({
            logger: NullLogger,
            auth: null,
            wsUrl: '',
            productId: 'btcusd'
        });
        book = new LiveOrderbook({
            logger: NullLogger,
            strictMode: true,
            product: 'BTC-USD'
        });
        geminiFeed.pipe(book);
    });

    after(() => {
        geminiFeed.disconnect();
    });

    it('produces a matching live Gemini book', (done) => {
        book.once('LiveOrderbook.snapshot', () => {
            snapshot = true;
        });
        let snapshot = false;
        mockSocket.emit('open');
        for (const message of messages) {
            mockSocket.emit('message', JSON.stringify(message));
        }
        setImmediate(() => {
            assert.equal(book.sequence, 4, 'Did not process all relevant messages');
            assert.ok(snapshot, 'Did not receive snapshot');
            const expectedBook = new BookBuilder(NullLogger);
            expectedBook.fromState(expectedState);
            assert.deepEqual(book.state(), expectedBook.state());
            done();
        });
    });

    after(() => {
        simple.restore();
    });
});
