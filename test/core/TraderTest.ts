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
import { Trader, TraderConfig } from '../../src/core/Trader';
import { NullLogger } from '../../src/utils/Logger';
import { CancelOrderRequestMessage, PlaceOrderMessage } from '../../src/core/Messages';
import { LiveOrder } from '../../src/lib/Orderbook';
import { GDAXConfig, GDAXExchangeAPI } from '../../src/exchanges/gdax/GDAXExchangeAPI';
import { BulkCancelResult } from '../../src/lib/bulkOrderUtils';

const assert = require('assert');
const nock = require('nock');

describe('Trader', () => {
    let trader: Trader;
    before(() => {
        const apiOptions: GDAXConfig = {
            logger: NullLogger,
            auth: { key: 'key', secret: 'secret', passphrase: 'passphrase' },
            apiUrl: 'http://127.0.0.1'
        };
        const config: TraderConfig = {
            logger: NullLogger,
            productId: 'ABC-BTC',
            exchangeAPI: new GDAXExchangeAPI(apiOptions),
            fitOrders: true,
            pricePrecision: 4,
            sizePrecision: 2,
            rateLimit: 100
        };
        trader = new Trader(config);
    });

    it('orders will be resized', () => {
        assert.equal(trader.fitOrders, true);
    });

    it('orders will be filtered for the registered product ID', () => {
        assert.equal(trader.productId, 'ABC-BTC');
    });

    it('resizes orders automatically from stream message', (done) => {
        const order: PlaceOrderMessage = {
            type: 'placeOrder',
            productId: 'ABC-BTC',
            price: '100.12345678',
            size: '10.125678',
            side: 'buy',
            orderType: 'limit',
            time: new Date()
        };
        nock('http://127.0.0.1', { encodedQueryParams: true })
            .post('/orders', {
                size: '10.12', // size is truncated
                price: '100.1234', // price is always rounded down for buys
                product_id: 'ABC-BTC',
                side: 'buy',
                type: 'limit'
            }).reply(200, { id: '100', price: '100.1234', size: '10.12', side: 'buy' });
        const onError = (err: Error) => {
            throw err;
        };
        trader.on('Trader.place-order-failed', onError);
        trader.on('Trader.order-placed', (msg: any) => {
            assert.equal(msg.id, '100');
            trader.removeListener('Trader.place-order-failed', onError);
            assert.equal(trader.orderBook.numAsks, 0);
            assert.equal(trader.orderBook.numBids, 1);
            done();
        });
        trader.write(order);
    });

    it('resizes orders automatically from API', () => {
        const order: PlaceOrderMessage = {
            type: 'placeOrder',
            productId: 'ABC-BTC',
            price: '100.9999545745',
            size: '10.996666',
            side: 'sell',
            orderType: 'limit',
            time: new Date()
        };
        nock('http://127.0.0.1', { encodedQueryParams: true })
            .post('/orders', {
                size: '10.99', // size is truncated
                price: '101', // price is rounded up for sells
                product_id: 'ABC-BTC',
                side: 'sell',
                type: 'limit'
            }).reply(200, { id: '101', price: '101.0000', size: '10.99', side: 'sell' });
        return trader.placeOrder(order).then((result: LiveOrder) => {
            assert.equal(result.id, 101);
            assert.equal(trader.orderBook.numAsks, 1);
            assert.equal(trader.orderBook.numBids, 1);
        });
    });

    it('orders are cancellable via the API', () => {
        nock('http://127.0.0.1', { encodedQueryParams: true })
            .delete('/orders/200').reply(200, ['200']);
        return trader.cancelOrder('200', null).then((result: string) => {
            assert.equal(result, '200');
            // We don't update the orderbook here. We wait for WS messages to come through
            assert.equal(trader.orderBook.numAsks, 1);
            assert.equal(trader.orderBook.numBids, 1);
        });
    });

    it('orders are cancellable via the stream', (done) => {
        nock('http://127.0.0.1', { encodedQueryParams: true })
            .delete('/orders/201').reply(200, ['201']);
        const cancel: CancelOrderRequestMessage = {
            type: 'cancelOrder',
            time: new Date(),
            orderId: '201'
        };
        const onError = (err: Error) => {
            throw err;
        };
        trader.on('Trader.cancel-order-failed', onError);
        trader.on('Trader.order-cancelled', (msg: any) => {
            assert.equal(msg.orderId, '201');
            trader.removeListener('Trader.place-order-failed', onError);
            // We don't update the orderbook here. We wait for WS messages to come through
            assert.equal(trader.orderBook.numAsks, 1);
            assert.equal(trader.orderBook.numBids, 1);
            done();
        });
        trader.write(cancel);
    });

    it('cancels orders at a given price', () => {
        let id = 300;
        nock('http://127.0.0.1', { encodedQueryParams: true })
            .post('/orders', (body: any) => {
                return (body.type === 'limit' && body.product_id === 'ABC-BTC');
            })
            .times(3)
            .reply(200, (url: string, req: any) => {
                req = JSON.parse(req);
                return { id: id++, price: req.price, size: req.size, side: req.side };
            });
        nock('http://127.0.0.1', { encodedQueryParams: true })
            .delete(/\/orders\/\d+/)
            .times(2)
            .reply(200, (url: string) => {
                return [url.split('/')[2]];
            });
        // First place some orders
        return trader.placeOrder({
            type: 'placeOrder',
            productId: 'ABC-BTC',
            price: '100',
            size: '1',
            side: 'sell',
            orderType: 'limit',
            time: new Date()
        }).then(() => {
            return trader.placeOrder({
                type: 'placeOrder',
                productId: 'ABC-BTC',
                price: '110',
                size: '2',
                side: 'sell',
                orderType: 'limit',
                time: new Date()
            });
        }).then(() => {
            return trader.placeOrder({
                type: 'placeOrder',
                productId: 'ABC-BTC',
                price: '110',
                size: '3',
                side: 'sell',
                orderType: 'limit',
                time: new Date()
            });
        }).then(() => { // cancell them all
            return trader.cancelOrdersAtPrice('sell', 'ABC-BTC', '110');
        }).then((result: BulkCancelResult) => {
            assert.deepEqual(result.cancelled, ['301', '302']);
            assert.deepEqual(result.failed, []);
            // We don't update the orderbook here. We wait for WS messages to come through
            assert.equal(trader.orderBook.numAsks, 3); // 3 levels
            assert.equal(trader.orderBook.numBids, 1);
        });
    });

    it('cancels all my orders', () => {
        nock('http://127.0.0.1', { encodedQueryParams: true })
            .delete(/\/orders\/\d+/)
            .times(5)
            .reply(200, (url: string) => {
                return [url.split('/')[2]];
            });
        return trader.cancelMyOrders().then((result: BulkCancelResult) => {
            assert.deepEqual(result.cancelled, ['100', '101', '300', '301', '302']);
            assert.deepEqual(result.failed, []);
            // We don't update the orderbook here. We wait for WS messages to come through
            assert.equal(trader.orderBook.numAsks, 3); // 3 levels
            assert.equal(trader.orderBook.numBids, 1);
        });
    });

    it('removes orders when the finalization messages come in on the stream', (done) => {
        const ids = ['100', '101', '300', '301', '302'];
        let triggers = 0;
        const onCancel = () => {
            triggers++;
            if (triggers === 5) {
                assert.equal(trader.orderBook.numAsks, 0);
                assert.equal(trader.orderBook.numBids, 0);
                trader.removeListener('Trader.trade-finalized', onCancel);
                done();
            }
        };
        trader.on('Trader.trade-finalized', onCancel);
        ids.forEach((id) => {
            trader.write({
                type: 'tradeFinalized',
                productId: 'ABC-BTC',
                orderId: id,
                side: id === '100' ? 'buy' : 'sell',
                remainingSize: '0.0',
                reason: 'cancelled'
            });
        });
    });
});
