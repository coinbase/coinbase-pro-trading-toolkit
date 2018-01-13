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
const GDAXFeed_1 = require("../../src/exchanges/gdax/GDAXFeed");
const Logger_1 = require("../../src/utils/Logger");
const events_1 = require("events");
const types_1 = require("../../src/lib/types");
const BookBuilder_1 = require("../../src/lib/BookBuilder");
const ExchangeFeed_1 = require("../../src/exchanges/ExchangeFeed");
const simple = require("simple-mock");
const assert = require('assert');
const mockSocket = new events_1.EventEmitter();
mockSocket.send = () => { };
mockSocket.close = () => {
    mockSocket.removeAllListeners();
};
describe('GDAX Message feed', () => {
    const messages = [
        {
            type: 'l2update',
            product_id: 'BTC-USD',
            changes: [['buy', '100.0', '10.0']]
        },
        {
            type: 'l2update',
            product_id: 'BTC-USD',
            changes: [['buy', '95.0', '5.0']]
        },
        {
            type: 'l2update',
            product_id: 'BTC-USD',
            changes: [['buy', '98.0', '2.5']]
        },
        {
            type: 'l2update',
            product_id: 'BTC-USD',
            changes: [['buy', '100.0', '15.0']]
        },
        {
            type: 'l2update',
            product_id: 'BTC-USD',
            changes: [['sell', '200.0', '15.0']]
        },
        {
            type: 'l2update',
            product_id: 'BTC-USD',
            changes: [['buy', '100.0', '5.0']]
        },
        {
            type: 'l2update',
            product_id: 'BTC-USD',
            changes: [['buy', '100.0', '11.0']]
        },
        {
            type: 'l2update',
            product_id: 'BTC-USD',
            changes: [['sell', '115.0', '5.0']]
        },
        {
            type: 'l2update',
            product_id: 'BTC-USD',
            changes: [['sell', '111.0', '1.0']]
        },
        {
            type: 'l2update',
            product_id: 'BTC-USD',
            changes: [['sell', '115.0', '3.0']]
        },
        {
            type: 'match',
            product_id: 'BTC-USD',
            sequence: 10,
            time: '2017-01-01 15:00Z',
            price: '100.0',
            size: '4.0',
            side: 'buy',
            maker_order_id: '9e8aa3b8-60bd-11e7-907b-a6006ad30006',
            taker_order_id: '9e8aa3b8-60bd-11e7-907b-a6006ad0010',
            trade_id: '1'
        },
        {
            type: 'l2update',
            product_id: 'BTC-USD',
            changes: [['buy', '100.0', '7.0']]
        },
        {
            type: 'match',
            product_id: 'BTC-USD',
            sequence: 12,
            time: '2017-01-01 15:00Z',
            price: '111.0',
            size: '1.0',
            side: 'sell',
            maker_order_id: '9e8aa3b8-60bd-11e7-907b-a6006ad30008',
            taker_order_id: '9e8aa3b8-60bd-11e7-907b-a6006ad00800',
            trade_id: '2'
        },
        {
            type: 'l2update',
            product_id: 'BTC-USD',
            changes: [['sell', '111.0', '0.0']]
        },
        {
            type: 'match',
            product_id: 'BTC-USD',
            sequence: 14,
            time: '2017-01-01 15:00Z',
            price: '115.0',
            size: '1.0',
            side: 'sell',
            maker_order_id: '9e8aa3b8-60bd-11e7-907b-a6006ad30007',
            taker_order_id: '9e8aa3b8-60bd-11e7-907b-a6006ad00800',
            trade_id: '3'
        },
        {
            type: 'l2update',
            product_id: 'BTC-USD',
            changes: [['sell', '115.0', '2.0']]
        },
        {
            type: 'match',
            product_id: 'BTC-USD',
            sequence: 16,
            time: '2017-01-01 15:00Z',
            price: '200.0',
            size: '3.0',
            side: 'sell',
            maker_order_id: '9e8aa3b8-60bd-11e7-907b-a6006ad30004',
            taker_order_id: '9e8aa3b8-60bd-11e7-907b-a6006ad01600',
            trade_id: '4'
        },
        {
            type: 'l2update',
            product_id: 'BTC-USD',
            changes: [['buy', '100.0', '10.0']]
        },
        {
            type: 'l2update',
            product_id: 'BTC-USD',
            changes: [['buy', '100.0', '10.1']]
        },
        {
            type: 'match',
            product_id: 'BTC-USD',
            sequence: 20,
            time: '2017-01-01 15:00Z',
            price: '100.0',
            size: '2.0',
            side: 'buy',
            maker_order_id: '9e8aa3b8-60bd-11e7-907b-a6006ad30006',
            taker_order_id: '9e8aa3b8-60bd-11e7-907b-a6006ad00801',
            trade_id: '4'
        },
        {
            type: 'match',
            product_id: 'BTC-USD',
            sequence: 21,
            time: '2017-01-01 15:00Z',
            price: '100.0',
            size: '4.0',
            side: 'buy',
            maker_order_id: '9e8aa3b8-60bd-11e7-907b-a6006ad30018',
            taker_order_id: '9e8aa3b8-60bd-11e7-907b-a6006ad00802',
            trade_id: '5'
        },
        {
            type: 'l2update',
            product_id: 'BTC-USD',
            changes: [['buy', '100.0', '5.1']]
        }
    ];
    const expectedState = {
        sequence: 17,
        orderPool: {
            '100.0': { id: '100.0', side: 'buy', price: types_1.Big(100), size: types_1.Big(4.1) },
            '115.0': { id: '115.0', side: 'sell', price: types_1.Big(115), size: types_1.Big(2) },
            '200.0': { id: '200.0', side: 'sell', price: types_1.Big(200), size: types_1.Big(15) },
            '98.0': { id: '98.0', side: 'buy', price: types_1.Big(98), size: types_1.Big(2.5) },
            '95.0': { id: '95.0', side: 'buy', price: types_1.Big(95), size: types_1.Big(5) }
        },
        bids: [
            {
                price: types_1.Big(100),
                totalSize: types_1.Big(5.1),
                orders: [{ id: '100.0', side: 'buy', price: types_1.Big(100), size: types_1.Big(5.1) }]
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
    let gdaxFeed;
    before(() => {
        simple.mock(ExchangeFeed_1.hooks, 'WebSocket').callFn(() => mockSocket);
        gdaxFeed = new GDAXFeed_1.GDAXFeed({
            logger: null,
            auth: null,
            apiUrl: '',
            wsUrl: '',
            channels: null
        });
        book = new LiveOrderbook_1.LiveOrderbook({
            logger: Logger_1.NullLogger,
            strictMode: true,
            product: 'BTC-USD'
        });
        gdaxFeed.pipe(book);
    });
    after(() => {
        gdaxFeed.disconnect();
    });
    it('produces a matching live GDAX book', (done) => {
        book.once('LiveOrderbook.snapshot', () => {
            snapshot = true;
        });
        let snapshot = false;
        mockSocket.emit('open');
        mockSocket.emit('message', JSON.stringify({
            type: 'snapshot',
            product_id: 'BTC-USD',
            sequence: 0,
            bids: [],
            asks: []
        }));
        for (const message of messages) {
            mockSocket.emit('message', JSON.stringify(message));
        }
        setImmediate(() => {
            assert.equal(book.sequence, 17, 'Did not process all relevant messages');
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
describe('GDAX feed with channels', () => {
    let book;
    let gdaxFeed;
    const messages = [
        {
            type: 'snapshot',
            product_id: 'BTC-EUR',
            bids: [['100', '10'], ['90', '5']],
            asks: [['110', '1'], ['115', '2']]
        },
        {
            type: 'l2update',
            product_id: 'BTC-EUR',
            from_sequence: 1000,
            to_sequence: 1010,
            changes: [['buy', '100', '5'], ['sell', '110', '3']]
        },
        {
            type: 'l2update',
            product_id: 'BTC-EUR',
            from_sequence: 1010,
            to_sequence: 1011,
            changes: [['buy', '90', '0']]
        },
        {
            type: 'l2update',
            product_id: 'BTC-EUR',
            from_sequence: 1011,
            to_sequence: 1025,
            changes: [['sell', '200', '1']]
        }
    ];
    const expectedState = {
        sequence: 5,
        orderPool: {
            100: {
                id: '100',
                price: types_1.Big(100),
                size: types_1.Big(5),
                side: 'buy'
            },
            115: {
                id: '115',
                price: types_1.Big(115),
                size: types_1.Big(2),
                side: 'sell'
            },
            110: {
                id: '110',
                price: types_1.Big(110),
                size: types_1.Big(3),
                side: 'sell'
            },
            200: {
                id: '200',
                price: types_1.Big(200),
                size: types_1.Big(1),
                side: 'sell'
            }
        },
        bids: [
            {
                price: types_1.Big(100),
                totalSize: types_1.Big(5),
                orders: [
                    {
                        id: '100',
                        price: types_1.Big(100),
                        size: types_1.Big(5),
                        side: 'buy'
                    }
                ]
            }
        ],
        asks: [
            {
                price: types_1.Big(110),
                totalSize: types_1.Big(3),
                orders: [
                    {
                        id: '110',
                        price: types_1.Big(110),
                        size: types_1.Big(3),
                        side: 'sell'
                    }
                ]
            },
            {
                price: types_1.Big(115),
                totalSize: types_1.Big(2),
                orders: [
                    {
                        id: '115',
                        price: types_1.Big(115),
                        size: types_1.Big(2),
                        side: 'sell'
                    }
                ]
            },
            {
                price: types_1.Big(200),
                totalSize: types_1.Big(1),
                orders: [
                    {
                        id: '200',
                        price: types_1.Big(200),
                        size: types_1.Big(1),
                        side: 'sell'
                    }
                ]
            }
        ]
    };
    before(() => {
        simple.mock(ExchangeFeed_1.hooks, 'WebSocket').callFn(() => mockSocket);
        gdaxFeed = new GDAXFeed_1.GDAXFeed({
            logger: Logger_1.NullLogger,
            apiUrl: '',
            auth: null,
            wsUrl: GDAXFeed_1.GDAX_WS_FEED,
            channels: null
        });
        gdaxFeed.queueing['BTC-EUR'] = false;
        book = new LiveOrderbook_1.LiveOrderbook({
            logger: Logger_1.NullLogger,
            strictMode: true,
            product: 'BTC-EUR'
        });
        gdaxFeed.pipe(book);
    });
    it('produces a matching live GDAX book', (done) => {
        book.once('LiveOrderbook.snapshot', () => {
            snapshot = true;
        });
        let snapshot = false;
        mockSocket.emit('open');
        for (const message of messages) {
            mockSocket.emit('message', JSON.stringify(message));
        }
        setImmediate(() => {
            assert.equal(book.sequence, 5, 'Did not process all relevant messages');
            assert.ok(snapshot, 'Did not receive snapshot');
            const expectedBook = new BookBuilder_1.BookBuilder(Logger_1.NullLogger);
            expectedBook.fromState(expectedState);
            assert.deepEqual(book.state(), expectedBook.state());
            done();
        });
    });
});
//# sourceMappingURL=GDAXFeedTest.js.map