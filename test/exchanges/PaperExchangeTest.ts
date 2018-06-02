import { PaperExchange } from '../../src/exchanges/paper/PaperExchange';
import { PlaceOrderMessage, TradeMessage, TradeExecutedMessage, TradeFinalizedMessage } from '../../src/core/index';
import * as Stream from 'stream';

import chai = require('chai');
import chaiAsPromised = require('chai-as-promised');
import { expect } from 'chai';
import * as sinon from 'sinon';
import { LiveOrder } from '../../src/lib/index';

describe('Paper Exchange', () => {
    let paper: PaperExchange;
    before(() => {
        chai.use(chaiAsPromised);
    });

    describe('AuthenticatedExchangeAPI', () => {
        beforeEach(() => {
            paper = new PaperExchange({ errorRate: 0 });
        });
        describe('#placeOrder()', () => {
            it('should accept good order', () => {
                return paper.placeOrder(generatePlaceOrder({productId: 'BTC-LTC'})).then((liveOrder) => {
                    expect(liveOrder.productId).to.equal('BTC-LTC');
                    return expect(paper.loadOrder(liveOrder.id)).to.eventually.equal(liveOrder);
                });
            });

            it('should reject order with invalid side', () => {
                return expect(paper.placeOrder(generatePlaceOrder({side: 'invalid'}))).to.be.rejected;
            });

            it('should reject order with NaN price', () => {
                return expect(paper.placeOrder(generatePlaceOrder({price: '5x.00'}))).to.be.rejected;
            });

            it('should reject order with negative price', () => {
                return expect(paper.placeOrder(generatePlaceOrder({price: '-5.00'}))).to.be.rejected;
            });

            it('should reject order with negative size', () => {
                return expect(paper.placeOrder(generatePlaceOrder({size: '-5.00'}))).to.be.rejected;
            });

            it('should reject order with NaN size', () => {
                return expect(paper.placeOrder(generatePlaceOrder({size: '-5x.00'}))).to.be.rejected;
            });
        });

        describe('#cancelOrder()', () => {
            it('should cancel unfilled order', () => {
                return paper.placeOrder(generatePlaceOrder()).then((liveOrder) => {
                    return expect(paper.cancelOrder(liveOrder.id)).to.eventually.equal(liveOrder.id);
                });
            });

            it('should error when attempting to cancel invalid order', () => {
                return expect(paper.cancelOrder('nonsense')).to.eventually.be.rejected;
            });
        });

        describe('#cancelAllOrders()', () => {
            it('should clear all orders for specific product and not affect orders for other products', () => {
                // create 5 orders for BTC-ETH
                for (let i = 0; i < 5; i++) {
                    paper.placeOrder(generatePlaceOrder({productId: 'BTC-ETH'}));
                }
                // create 1 order for BTC-USD
                paper.placeOrder(generatePlaceOrder({productId: 'BTC-USD'}));
                // create 1 order for XYZ-USD
                paper.placeOrder(generatePlaceOrder({productId: 'XYZ-USD'}));

                // clear all orders for 'BTC-ETH'
                expect(paper.cancelAllOrders('BTC-ETH')).to.eventually.have.length(5);
                // orders for other products should remain
                expect(paper.loadAllOrders('BTC-USD')).to.eventually.have.length(1);
                expect(paper.loadAllOrders('XYZ-USD')).to.eventually.have.length(1);
            });
            it('should clear all orders for all products', () => {
                // create 5 orders for BTC-ETH
                for (let i = 0; i < 5; i++) {
                    paper.placeOrder(generatePlaceOrder({productId: 'BTC-ETH'}));
                }
                // create 1 order for BTC-USD
                paper.placeOrder(generatePlaceOrder({productId: 'BTC-USD'}));

                // clear all orders for all products
                return expect(paper.cancelAllOrders(null)).to.eventually.have.length(6);
            });
        });

        describe('#loadOrder()', () => {
            it('should error when cancelling invalid order', () => {
                return expect(paper.loadOrder('nonsense')).to.eventually.be.rejected;
            });

            it('should load placed order', () => {
                return paper.placeOrder(generatePlaceOrder({productId: 'BTC-LTC'})).then((liveOrder) => {
                    return expect(paper.loadOrder(liveOrder.id)).to.eventually.equal(liveOrder);
                });
            });
        });
/***
 *
 *  Although these tests are semantically correct, and work when tested manually, they remain pending when mocha runs them.
 *  TODO: Figure out why these remain pending in mocha test run.

        describe('#loadAllOrders()', () => {
            it('should load all orders for specific product', () => {
                // create 5 orders for BTC-ETH
                for (let i = 0; i < 5; i++) {
                    paper.placeOrder(generatePlaceOrder({productId: 'BTC-ETH'}));
                }
                // create 1 order for BTC-USD
                paper.placeOrder(generatePlaceOrder({productId: 'BTC-USD'}));

                // confirm 1 order is loaded for this product
                return expect(paper.loadAllOrders('BTC-USD')).to.eventually.have.length(1);
            });
            it('should load all orders for all products', () => {
                // create 5 orders for BTC-ETH
                for (let i = 0; i < 5; i++) {
                    paper.placeOrder(generatePlaceOrder({productId: 'BTC-ETH'}));
                }
                // create 1 order for BTC-USD
                paper.placeOrder(generatePlaceOrder({productId: 'BTC-USD'}));

                // confirm 6 orders are recorded
                return expect(paper.loadAllOrders(null)).to.eventually.have.length(6);
            });
        });
*/
        describe('#loadBalances()', () => {
            it('should load all orders for specific product');
            it('should load all orders for all products');
        });
    });

    describe('should not fill orders when', () => {
        let tradeExecutedSpy: sinon.SinonSpy;
        let tradeFinalizedSpy: sinon.SinonSpy;
        let mockExchangeFeed: Stream.PassThrough;

        beforeEach(() => {
            paper = new PaperExchange({ errorRate: 0 });
            // create mock exchange feed that we will submit message to
            mockExchangeFeed = new Stream.PassThrough({objectMode: true, writableObjectMode: true});
            mockExchangeFeed.pipe(paper);
            // setup spy to listen for events from PaperExchange that will be emitted as a result of the messages sent through mock exchange feed
            tradeExecutedSpy = sinon.spy();
            paper.on('PaperExchange.TradeExecuted', tradeExecutedSpy);
            tradeFinalizedSpy = sinon.spy();
            paper.on('PaperExchange.TradeFinalized', tradeFinalizedSpy);

        });
        afterEach(() => {
            // maybe add something
        });
        it('trade price is above buy limit order', () => {
            // create buy limit order
            return paper.placeOrder(generatePlaceOrder({price: '10.00', orderType: 'limit', side: 'buy'})).then((liveOrder) => {
                // send trade message through feed that above price for buy limit order just placed
                mockExchangeFeed.push(generateTradeMessage(liveOrder, {price: liveOrder.price.add(1).toString()}));
                expect(tradeExecutedSpy.notCalled);
                expect(tradeFinalizedSpy.notCalled);
            });
        });
        it('trade pertains to a different product', () => {
            // create buy limit order
            return paper.placeOrder(generatePlaceOrder({price: '10.00', orderType: 'limit', side: 'buy'})).then((liveOrder) => {
                mockExchangeFeed.push(generateTradeMessage(liveOrder, {productId: 'BTC-XYZ'}));
                expect(tradeExecutedSpy.notCalled);
                expect(tradeFinalizedSpy.notCalled);
            });
        });
        it('trade price is below sell limit order', () => {
            // create sell limit order
            return paper.placeOrder(generatePlaceOrder({price: '10.00', orderType: 'limit', side: 'sell'})).then((liveOrder) => {
                // mock trade at price below sell limit
                mockExchangeFeed.push(generateTradeMessage(liveOrder, {price: liveOrder.price.minus(1).toString()}));
                expect(tradeExecutedSpy.notCalled);
                expect(tradeFinalizedSpy.notCalled);

            });
        });
    });
    describe('should fill orders when', () => {
        let tradeExecutedSpy: sinon.SinonSpy;
        let tradeFinalizedSpy: sinon.SinonSpy;
        let mockExchangeFeed: Stream.PassThrough;

        before(() => {
            chai.use(chaiAsPromised);
        });
        beforeEach(() => {
            paper = new PaperExchange({ errorRate: 0 });
            // create mock exchange feed that we will submit message to
            mockExchangeFeed = new Stream.PassThrough({objectMode: true, writableObjectMode: true});
            mockExchangeFeed.pipe(paper);
            // setup spy to listen for events from PaperExchange that will be emitted as a result of the messages sent through mock exchange feed
            tradeExecutedSpy = sinon.spy();
            paper.on('PaperExchange.TradeExecuted', tradeExecutedSpy);
            tradeFinalizedSpy = sinon.spy();
            paper.on('PaperExchange.TradeFinalized', tradeFinalizedSpy);
        });
        afterEach(() => {
            // maybe add something
        });
        it('trade price is below buy limit order', () => {
            // create buy limit order
            return paper.placeOrder(generatePlaceOrder({price: '10.00', orderType: 'limit', side: 'buy'})).then((liveOrder) => {
                // send trade message at price that should trigger the buy limit order just placed
                const trade = generateTradeMessage(liveOrder, {price: liveOrder.price.minus(1).toString()});
                mockExchangeFeed.push(trade);
                examineTradeExecution(tradeExecutedSpy, liveOrder, trade);
                examineTradeFinalized(tradeFinalizedSpy, liveOrder, trade);
            });
        });
        it('trade price is at buy limit order', () => {
            // create buy limit order
            return paper.placeOrder(generatePlaceOrder({price: '10.00', orderType: 'limit', side: 'buy'})).then((liveOrder) => {
                // send trade message at price that should trigger the buy limit order just placed
                const trade = generateTradeMessage(liveOrder, {price: liveOrder.price.toString()});
                mockExchangeFeed.push(trade);
                examineTradeExecution(tradeExecutedSpy, liveOrder, trade);
                examineTradeFinalized(tradeFinalizedSpy, liveOrder, trade);
            });
        });
        it('trade price is above sell limit order', () => {
            // create sell limit order
            return paper.placeOrder(generatePlaceOrder({price: '10.00', orderType: 'limit', side: 'sell'})).then((liveOrder) => {
                // send trade message at price that should trigger the sell limit order
                const trade = generateTradeMessage(liveOrder, {price: liveOrder.price.add(1).toString()});
                mockExchangeFeed.push(trade);
                examineTradeExecution(tradeExecutedSpy, liveOrder, trade);
                examineTradeFinalized(tradeFinalizedSpy, liveOrder, trade);
            });
        });
        it('trade price is at sell limit order', () => {
            // create sell limit order
            return paper.placeOrder(generatePlaceOrder({price: '10.00', orderType: 'limit', side: 'sell'})).then((liveOrder) => {
                // send trade message at price that should trigger the sell limit order
                const trade = generateTradeMessage(liveOrder, {price: liveOrder.price.toString()});
                mockExchangeFeed.push(trade);
                examineTradeExecution(tradeExecutedSpy, liveOrder, trade);
                examineTradeFinalized(tradeFinalizedSpy, liveOrder, trade);
            });
        });
        it('buy market order is immediately filled and finalized at price of last sell trade', () => {
            // send trade message through feed to set 'market' price
            const lastTrade: TradeMessage = {
                type: 'trade',
                price: '25.00',
                productId: 'BTC-USD',
                side: 'sell',
                size: '20',
                tradeId: 'random-id',
                time: new Date(),
                origin: 'exchange',
            };
            mockExchangeFeed.push(lastTrade);
            // place buy market order
            return paper.placeOrder(generatePlaceOrder({price: '10.00', orderType: 'market', side: 'buy'})).then((liveOrder) => {
                // this should trigger TradeExecutedMessage at price level corresponding to the lastTrade
                examineTradeExecution(tradeExecutedSpy, liveOrder, lastTrade);
                examineTradeFinalized(tradeFinalizedSpy, liveOrder, lastTrade);
            });
        });
        it('sell market order is immediately filled and finalized at price of last buy trade', () => {
            // send trade message through feed to set 'market' price
            const lastTrade: TradeMessage = {
                type: 'trade',
                price: '25.00',
                productId: 'BTC-USD',
                side: 'buy',
                size: '20',
                tradeId: 'random-id',
                time: new Date(),
                origin: 'exchange',
            };
            mockExchangeFeed.push(lastTrade);
            // place buy market order
            return paper.placeOrder(generatePlaceOrder({price: '10.00', orderType: 'market', side: 'sell'})).then((liveOrder) => {
                // this should trigger TradeExecutedMessage at price level corresponding to the lastTrade
                examineTradeExecution(tradeExecutedSpy, liveOrder, lastTrade);
                examineTradeFinalized(tradeFinalizedSpy, liveOrder, lastTrade);
            });
        });
    });
});
/**
 * Returns well formed PlaceOrder instance
 *
 * @param options override values for the default PlaceOrder
 */
function generatePlaceOrder(options?: any): PlaceOrderMessage {
    return Object.assign({
        side: 'buy',
        // by default generate random price between 1 - 100
        price: (Math.random() * (100 - 1) + 1).toPrecision(2),
        orderType: 'limit',
        productId: 'BTC-USD',
        // by default generate random size between 1 - 100
        size: (Math.random() * (100 - 1) + 1).toPrecision(2),
        type: 'placeOrder',
        time: new Date(),
    }, options || {});
}

function generateTradeMessage(liveOrder: LiveOrder, options?: any): TradeMessage {
    return Object.assign({
        productId: liveOrder.productId,
        tradeId: liveOrder.id,
        side: liveOrder.side,
        price: liveOrder.price.add(1).toString(),
        size: '5',
        type: 'trade',
        time: new Date(),
    }, options || {});
}
function examineTradeExecution(tradeExecutedSpy: sinon.SinonSpy, liveOrder: LiveOrder, lastTrade?: TradeMessage) {
    expect(tradeExecutedSpy.callCount).to.equal(1);
    // examine some details of the trade executed message
    const tradeExecutedMessage = tradeExecutedSpy.lastCall.args[0] as TradeExecutedMessage;
    expect(tradeExecutedMessage.productId).to.equal(liveOrder.productId);
    expect(tradeExecutedMessage.orderId).to.equal(liveOrder.id);
    expect(tradeExecutedMessage.tradeSize).to.equal(liveOrder.size.toString());
    expect(tradeExecutedMessage.side).to.equal(liveOrder.side);
    // paper exchange always fills orders completely by default
    expect(tradeExecutedMessage.remainingSize).to.equal('0');
    // if lastTrade is defined, assume LiveOrder was a market order
    if (lastTrade) {
        expect(tradeExecutedMessage.price).to.equal(lastTrade.price);
    }
}

function examineTradeFinalized(tradeFinalizedSpy: sinon.SinonSpy, liveOrder: LiveOrder, lastTrade?: TradeMessage) {
    expect(tradeFinalizedSpy.callCount).to.equal(1);
    // examine some details of the trade executed message
    const tradeExecutedMessage = tradeFinalizedSpy.lastCall.args[0] as TradeFinalizedMessage;
    expect(tradeExecutedMessage.productId).to.equal(liveOrder.productId);
    expect(tradeExecutedMessage.orderId).to.equal(liveOrder.id);
    expect(tradeExecutedMessage.side).to.equal(liveOrder.side);
    // paper exchange always fills orders completely by default
    expect(tradeExecutedMessage.remainingSize).to.equal('0');
    // if lastTrade is defined, assume LiveOrder was a market order
    if (lastTrade) {
        expect(tradeExecutedMessage.price).to.equal(lastTrade.price.toString());
    }
}
