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
import { GDAX_WS_FEED, GDAXFeed } from '../../src/exchanges/gdax/GDAXFeed';
import { NullLogger } from '../../src/utils/Logger';
import { EventEmitter } from 'events';
import { Big } from '../../src/lib/types';
import { GDAXL2UpdateMessage, GDAXMatchMessage, GDAXMessage, GDAXSnapshotMessage } from '../../src/exchanges/gdax/GDAXMessages';
import { OrderbookState } from '../../src/lib/Orderbook';
import { BookBuilder } from '../../src/lib/BookBuilder';
import { hooks } from '../../src/exchanges/ExchangeFeed';
import simple = require('simple-mock');

const assert = require('assert');

const mockSocket: any = new EventEmitter();

mockSocket.send = () => { /* no-op */ };

mockSocket.close = () => {
    mockSocket.removeAllListeners();
};

describe('GDAX Message feed', () => {
    const messages: GDAXMessage[] = [
        {
            type: 'l2update',
            product_id: 'BTC-USD',
            changes: [['buy', '100.0', '10.0']]
        } as GDAXL2UpdateMessage,
        {
            type: 'l2update',
            product_id: 'BTC-USD',
            changes: [['buy', '95.0', '5.0']]
        } as GDAXL2UpdateMessage,
        {
            type: 'l2update',
            product_id: 'BTC-USD',
            changes: [['buy', '98.0', '2.5']]
        } as GDAXL2UpdateMessage,
        {
            type: 'l2update',
            product_id: 'BTC-USD',
            changes: [['buy', '100.0', '15.0']]
        } as GDAXL2UpdateMessage,
        {
            type: 'l2update',
            product_id: 'BTC-USD',
            changes: [['sell', '200.0', '15.0']]
        } as GDAXL2UpdateMessage,
        {
            type: 'l2update',
            product_id: 'BTC-USD',
            changes: [['buy', '100.0', '5.0']]
        } as GDAXL2UpdateMessage,
        {
            type: 'l2update',
            product_id: 'BTC-USD',
            changes: [['buy', '100.0', '11.0']]
        } as GDAXL2UpdateMessage,
        {
            type: 'l2update',
            product_id: 'BTC-USD',
            changes: [['sell', '115.0', '5.0']]
        } as GDAXL2UpdateMessage,
        {
            type: 'l2update',
            product_id: 'BTC-USD',
            changes: [['sell', '111.0', '1.0']]
        } as GDAXL2UpdateMessage,
        {
            type: 'l2update',
            product_id: 'BTC-USD',
            changes: [['sell', '115.0', '3.0']]
        } as GDAXL2UpdateMessage,
        {
            type: 'match',
            product_id: 'BTC-USD',
            sequence: 10,
            time: '2017-01-01 15:00Z',
            price: '100.0',
            size: '4.0',
            side: 'buy',
            maker_order_id: '9e8aa3b8-60bd-11e7-907b-a6006ad30006', // Remaining = 2
            taker_order_id: '9e8aa3b8-60bd-11e7-907b-a6006ad0010',
            trade_id: '1'
        } as GDAXMatchMessage,
        {
            type: 'l2update',
            product_id: 'BTC-USD',
            changes: [['buy', '100.0', '7.0']]
        } as GDAXL2UpdateMessage,
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
        } as GDAXMatchMessage,
        {
            type: 'l2update',
            product_id: 'BTC-USD',
            changes: [['sell', '111.0', '0.0']]
        } as GDAXL2UpdateMessage,
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
        } as GDAXMatchMessage,
        {
            type: 'l2update',
            product_id: 'BTC-USD',
            changes: [['sell', '115.0', '2.0']]
        } as GDAXL2UpdateMessage,
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
        } as GDAXMatchMessage,
        {
            type: 'l2update',
            product_id: 'BTC-USD',
            changes: [['buy', '100.0', '10.0']]
        } as GDAXL2UpdateMessage,
        {
            type: 'l2update',
            product_id: 'BTC-USD',
            changes: [['buy', '100.0', '10.1']]
        } as GDAXL2UpdateMessage,
        {
            type: 'match',
            product_id: 'BTC-USD',
            sequence: 20,
            time: '2017-01-01 15:00Z',
            price: '100.0',
            size: '2.0',
            side: 'buy',
            maker_order_id: '9e8aa3b8-60bd-11e7-907b-a6006ad30006', // Filled
            taker_order_id: '9e8aa3b8-60bd-11e7-907b-a6006ad00801',
            trade_id: '4'
        } as GDAXMatchMessage,
        {
            type: 'match',
            product_id: 'BTC-USD',
            sequence: 21,
            time: '2017-01-01 15:00Z',
            price: '100.0',
            size: '4.0',
            side: 'buy',
            maker_order_id: '9e8aa3b8-60bd-11e7-907b-a6006ad30018', // Remaining = 4
            taker_order_id: '9e8aa3b8-60bd-11e7-907b-a6006ad00802',
            trade_id: '5'
        } as GDAXMatchMessage,
        {
            type: 'l2update',
            product_id: 'BTC-USD',
            changes: [['buy', '100.0', '5.1']]
        } as GDAXL2UpdateMessage
    ];

    const expectedState: OrderbookState = {
        sequence: 17,
        orderPool: {
            '100.0': { id: '100.0', side: 'buy', price: Big(100), size: Big(4.1) },
            '115.0': { id: '115.0', side: 'sell', price: Big(115), size: Big(2) },
            '200.0': { id: '200.0', side: 'sell', price: Big(200), size: Big(15) },
            '98.0': { id: '98.0', side: 'buy', price: Big(98), size: Big(2.5) },
            '95.0': { id: '95.0', side: 'buy', price: Big(95), size: Big(5) }
        },
        bids: [
            {
                price: Big(100),
                totalSize: Big(5.1),
                orders: [{ id: '100.0', side: 'buy', price: Big(100), size: Big(5.1) }]
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
    let gdaxFeed: GDAXFeed;

    before(() => {
        simple.mock(hooks, 'WebSocket').callFn(() => mockSocket);
        gdaxFeed = new GDAXFeed({
            logger: null,
            auth: null,
            apiUrl: '',
            wsUrl: '',
            channels: null
        });
        book = new LiveOrderbook({
            logger: NullLogger,
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
        } as GDAXSnapshotMessage));
        for (const message of messages) {
            mockSocket.emit('message', JSON.stringify(message));
        }
        setImmediate(() => {
            assert.equal(book.sequence, 17, 'Did not process all relevant messages');
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

describe('GDAX feed with channels', () => {
    let book: LiveOrderbook;
    let gdaxFeed: GDAXFeed;
    const messages: GDAXMessage[] = [
        {
            type: 'snapshot',
            product_id: 'BTC-EUR',
            bids: [['100', '10'], ['90', '5']],
            asks: [['110', '1'], ['115', '2']]
        } as GDAXSnapshotMessage,
        {
            type: 'l2update',
            product_id: 'BTC-EUR',
            from_sequence: 1000,
            to_sequence: 1010,
            changes: [['buy', '100', '5'], ['sell', '110', '3']]
        } as GDAXL2UpdateMessage,
        {
            type: 'l2update',
            product_id: 'BTC-EUR',
            from_sequence: 1010,
            to_sequence: 1011,
            changes: [['buy', '90', '0']]
        } as GDAXL2UpdateMessage,
        {
            type: 'l2update',
            product_id: 'BTC-EUR',
            from_sequence: 1011,
            to_sequence: 1025,
            changes: [['sell', '200', '1']]
        } as GDAXL2UpdateMessage
    ];

    const expectedState: OrderbookState = {
        sequence: 5,
        orderPool: {
            100: {
                id: '100',
                price: Big(100),
                size: Big(5),
                side: 'buy'
            },
            115: {
                id: '115',
                price: Big(115),
                size: Big(2),
                side: 'sell'
            },
            110: {
                id: '110',
                price: Big(110),
                size: Big(3),
                side: 'sell'
            },
            200: {
                id: '200',
                price: Big(200),
                size: Big(1),
                side: 'sell'
            }
        },
        bids: [
            {
                price: Big(100),
                totalSize: Big(5),
                orders: [
                    {
                        id: '100',
                        price: Big(100),
                        size: Big(5),
                        side: 'buy'
                    }
                ]
            }
        ],
        asks: [
            {
                price: Big(110),
                totalSize: Big(3),
                orders: [
                    {
                        id: '110',
                        price: Big(110),
                        size: Big(3),
                        side: 'sell'
                    }
                ]
            },
            {
                price: Big(115),
                totalSize: Big(2),
                orders: [
                    {
                        id: '115',
                        price: Big(115),
                        size: Big(2),
                        side: 'sell'
                    }
                ]
            },
            {
                price: Big(200),
                totalSize: Big(1),
                orders: [
                    {
                        id: '200',
                        price: Big(200),
                        size: Big(1),
                        side: 'sell'
                    }
                ]
            }
        ]
    };

    before(() => {
        simple.mock(hooks, 'WebSocket').callFn(() => mockSocket);
        gdaxFeed = new GDAXFeed({
            logger: NullLogger,
            apiUrl: '',
            auth: null,
            wsUrl: GDAX_WS_FEED,
            channels: null
        });
        book = new LiveOrderbook({
            logger: NullLogger,
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
            const expectedBook = new BookBuilder(NullLogger);
            expectedBook.fromState(expectedState);
            assert.deepEqual(book.state(), expectedBook.state());
            done();
        });
    });
});
