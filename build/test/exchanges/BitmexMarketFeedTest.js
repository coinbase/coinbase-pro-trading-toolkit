"use strict";
/**********************************************************************************************************************
 * @license                                                                                                           *
 * Copyright 2017 Coinbase, Inc.                                                                                      *
 *                                                                                                                    *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance     *
 * with the License. You may obtain a copy of the License at                                                          *
 *                                                                                                                    *
 * http://www.apache.org/licenses/LICENSE-2.0                                                                         *
 *                                                                                                                    *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on*
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the                 *
 * License for the specific language governing permissions and limitations under the License.                         *
 **********************************************************************************************************************/
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require('assert');
const LiveOrderbook_1 = require("../../src/core/LiveOrderbook");
const ExchangeFeed_1 = require("../../src/exchanges/ExchangeFeed");
const BitmexMarketFeed_1 = require("../../src/exchanges/bitmex/BitmexMarketFeed");
const types_1 = require("../../src/lib/types");
const BookBuilder_1 = require("../../src/lib/BookBuilder");
const Logger_1 = require("../../src/utils/Logger");
const events_1 = require("events");
const simple = require("simple-mock");
const mockSocket = new events_1.EventEmitter();
mockSocket.send = () => { };
mockSocket.close = () => {
    mockSocket.removeAllListeners();
};
describe('BitMEX Market Feed', () => {
    // Set of simulated messages
    const messages = [{
            info: 'Welcome to the BitMEX Realtime API.',
            version: '1.2.0',
            timestamp: '2017-10-09T01:25:50.490Z',
            docs: 'https://www.bitmex.com/app/wsAPI',
        }, {
            success: true,
            subscribe: 'orderBookL2:XBTUSD',
            request: {
                op: 'subscribe',
                args: ['orderBookL2:XBTUSD', 'trade:XBTUSD'],
            },
        }, {
            success: true,
            subscribe: 'trade:XBTUSD',
            request: {
                op: 'subscribe',
                args: ['orderBookL2:XBTUSD', 'trade:XBTUSD'],
            },
        }, {
            table: 'orderBookL2',
            keys: ['symbol', 'id', 'side'],
            types: {
                symbol: 'symbol',
                id: 'long',
                side: 'symbol',
                size: 'long',
                price: 'float',
            },
            foreignKeys: {
                symbol: 'instrument',
                side: 'side',
            },
            attributes: {
                symbol: 'grouped',
                id: 'sorted',
            },
            action: 'partial',
            data: [
                { symbol: 'XBTUSD', id: 22899900000, side: 'Sell', size: 5000, price: 4505 },
                { symbol: 'XBTUSD', id: 22899900001, side: 'Sell', size: 3000, price: 4502.8 },
                { symbol: 'XBTUSD', id: 22899900002, side: 'Sell', size: 450, price: 4500.2 },
                { symbol: 'XBTUSD', id: 22899900003, side: 'Buy', size: 30, price: 4499.9 },
                { symbol: 'XBTUSD', id: 22899900004, side: 'Buy', size: 2000, price: 4499 },
                { symbol: 'XBTUSD', id: 22899900005, side: 'Buy', size: 1007, price: 4498.9 },
            ],
        }, {
            table: 'orderBookL2',
            action: 'delete',
            data: [{ symbol: 'XBTUSD', id: 22899900001, side: 'Sell' }],
        }, {
            table: 'orderBookL2',
            action: 'insert',
            data: [
                { symbol: 'XBTUSD', id: 22899900006, side: 'Sell', size: 440, price: 4505.3 },
                { symbol: 'XBTUSD', id: 22899900007, side: 'Sell', size: 4180, price: 4505.4 },
                { symbol: 'XBTUSD', id: 22899900008, side: 'Sell', size: 4180, price: 4506 },
            ]
        }, {
            table: 'orderBookL2',
            action: 'update',
            data: [{ symbol: 'XBTUSD', id: 22899900004, side: 'Buy', size: 1300 }]
        }];
    const expectedState = {
        sequence: 5,
        orderPool: {
            [4498.9]: { id: '22899900005', side: 'buy', price: types_1.Big(4498.9), size: types_1.Big(1007) },
            [4499]: { id: '22899900004', side: 'buy', price: types_1.Big(4499), size: types_1.Big(1300) },
            [4499.9]: { id: '22899900003', side: 'buy', price: types_1.Big(4499.9), size: types_1.Big(30) },
            [4500.2]: { id: '22899900002', side: 'sell', price: types_1.Big(4500.2), size: types_1.Big(450) },
            [4505]: { id: '22899900000', side: 'sell', price: types_1.Big(4505), size: types_1.Big(5000) },
            [4505.3]: { id: '22899900006', side: 'sell', price: types_1.Big(4505.3), size: types_1.Big(440) },
            [4505.4]: { id: '22899900007', side: 'sell', price: types_1.Big(4505.4), size: types_1.Big(4180) },
            [4506]: { id: '22899900008', side: 'sell', price: types_1.Big(4506), size: types_1.Big(4180) },
        },
        bids: [{
                price: types_1.Big(4498.9),
                totalSize: types_1.Big(1007),
                orders: [{ id: '4498.9', side: 'buy', price: types_1.Big(4498.9), size: types_1.Big(1007) }],
            }, {
                price: types_1.Big(4499),
                totalSize: types_1.Big(1300),
                orders: [{ id: '4499', side: 'buy', price: types_1.Big(4499), size: types_1.Big(1300) }],
            }, {
                price: types_1.Big(4499.9),
                totalSize: types_1.Big(30),
                orders: [{ id: '4499.9', side: 'buy', price: types_1.Big(4499.9), size: types_1.Big(30) }],
            }],
        asks: [{
                price: types_1.Big(4500.2),
                totalSize: types_1.Big(450),
                orders: [{ id: '4500.2', side: 'sell', price: types_1.Big(4500.2), size: types_1.Big(450) }],
            }, {
                price: types_1.Big(4505),
                totalSize: types_1.Big(5000),
                orders: [{ id: '4505', side: 'sell', price: types_1.Big(4505), size: types_1.Big(5000) }],
            }, {
                price: types_1.Big(4505.3),
                totalSize: types_1.Big(440),
                orders: [{ id: '4505.3', side: 'sell', price: types_1.Big(4505.3), size: types_1.Big(440) }],
            }, {
                price: types_1.Big(4505.4),
                totalSize: types_1.Big(4180),
                orders: [{ id: '4505.4', side: 'sell', price: types_1.Big(4505.4), size: types_1.Big(4180) }],
            }, {
                price: types_1.Big(4506),
                totalSize: types_1.Big(4180),
                orders: [{ id: '4506', side: 'sell', price: types_1.Big(4506), size: types_1.Big(4180) }],
            }],
    };
    let book;
    let bitmexFeed;
    before(() => {
        simple.mock(ExchangeFeed_1.hooks, 'WebSocket').callFn(() => mockSocket);
        bitmexFeed = new BitmexMarketFeed_1.BitmexMarketFeed({
            logger: Logger_1.NullLogger,
            wsUrl: null,
            auth: null,
        });
        bitmexFeed.subscribe(['XBTUSD']);
        book = new LiveOrderbook_1.LiveOrderbook({
            logger: Logger_1.NullLogger,
            strictMode: true,
            product: 'XBTUSD',
        });
        bitmexFeed.pipe(book);
    });
    after(() => {
        bitmexFeed.disconnect();
    });
    it('produces a matching live BitMEX book', (done) => {
        book.once('LiveOrderbook.snapshot', () => {
            snapshot = true;
        });
        let snapshot = false;
        mockSocket.emit('open');
        for (const message of messages) {
            mockSocket.emit('message', JSON.stringify(message));
        }
        // make sure that the produced and expected books' states are the same
        setImmediate(() => {
            assert.equal(snapshot, true);
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
//# sourceMappingURL=BitmexMarketFeedTest.js.map