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
const LiveOrderbook_1 = require("../../src/core/LiveOrderbook");
const GeminiMarketFeed_1 = require("../../src/exchanges/gemini/GeminiMarketFeed");
const events_1 = require("events");
const types_1 = require("../../src/lib/types");
const BookBuilder_1 = require("../../src/lib/BookBuilder");
const Logger_1 = require("../../src/utils/Logger");
const ExchangeFeed_1 = require("../../src/exchanges/ExchangeFeed");
const simple = require("simple-mock");
const assert = require('assert');
const mockSocket = new events_1.EventEmitter();
mockSocket.send = () => { };
mockSocket.close = () => {
    mockSocket.removeAllListeners();
};
describe('Gemini Market feed', () => {
    const messages = [
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
                },
                {
                    type: 'change',
                    reason: 'initial',
                    price: '115.0',
                    delta: '5.0',
                    remaining: '5.0',
                    side: 'ask'
                }
            ],
            timestamp: '1478729300',
            timestampms: '1478729300200'
        },
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
                }
            ],
            timestamp: '1478729310',
            timestampms: '1478729310200'
        },
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
                }
            ],
            timestamp: '1478729320',
            timestampms: '1478729320200'
        },
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
                }
            ],
            timestamp: '1478729330',
            timestampms: '1478729330200'
        },
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
                }
            ],
            timestamp: '1478729340',
            timestampms: '1478729340200'
        }
    ];
    const expectedState = {
        sequence: 4,
        orderPool: {
            '100.0': { id: '100.0', side: 'buy', price: types_1.Big(100), size: types_1.Big(4) },
            '115.0': { id: '115.0', side: 'sell', price: types_1.Big(115), size: types_1.Big(2) },
            '200.0': { id: '200.0', side: 'sell', price: types_1.Big(200), size: types_1.Big(15) },
            '98.0': { id: '98.0', side: 'buy', price: types_1.Big(98), size: types_1.Big(2.5) },
            '95.0': { id: '95.0', side: 'buy', price: types_1.Big(95), size: types_1.Big(5) }
        },
        bids: [
            {
                price: types_1.Big(100),
                totalSize: types_1.Big(4),
                orders: [{ id: '100.0', side: 'buy', price: types_1.Big(100), size: types_1.Big(4) }]
            },
            {
                price: types_1.Big(98),
                totalSize: types_1.Big(2.5),
                orders: [{ id: '98.0', side: 'buy', price: types_1.Big(98), size: types_1.Big(2.5) }
                ]
            },
            {
                price: types_1.Big(95),
                totalSize: types_1.Big(5),
                orders: [{ id: '95.0', side: 'buy', price: types_1.Big(95), size: types_1.Big(5) }]
            }
        ],
        asks: [
            {
                price: types_1.Big(200),
                totalSize: types_1.Big(15),
                orders: [{ id: '200.0', side: 'sell', price: types_1.Big(200), size: types_1.Big(15) }]
            },
            {
                price: types_1.Big(115),
                totalSize: types_1.Big(2),
                orders: [{ id: '115.0', side: 'sell', price: types_1.Big(115), size: types_1.Big(2) }]
            }
        ]
    };
    let book;
    let geminiFeed;
    before(() => {
        simple.mock(ExchangeFeed_1.hooks, 'WebSocket').callFn(() => mockSocket);
        geminiFeed = new GeminiMarketFeed_1.GeminiMarketFeed({
            logger: Logger_1.NullLogger,
            auth: null,
            wsUrl: '',
            productId: 'btcusd'
        });
        book = new LiveOrderbook_1.LiveOrderbook({
            logger: Logger_1.NullLogger,
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
            const expectedBook = new BookBuilder_1.BookBuilder(Logger_1.NullLogger);
            expectedBook.fromState(expectedState);
            assert.deepEqual(book.state(), expectedBook.state());
            done();
        });
    });
    after(() => {
        simple.restore();
    });
});
//# sourceMappingURL=GeminiMarketFeedTest.js.map