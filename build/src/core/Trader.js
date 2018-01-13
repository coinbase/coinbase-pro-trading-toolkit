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
const stream_1 = require("stream");
const BookBuilder_1 = require("../lib/BookBuilder");
const Messages_1 = require("./Messages");
const OrderbookDiff_1 = require("../lib/OrderbookDiff");
const types_1 = require("../lib/types");
/**
 * The Trader class places orders on your behalf. The commands for placing the trades can either come from an attached
 * stream, or directly via the API.
 *
 * One should have an *authenticated* feed piped into Trader so that it can keep track of the state of its own orderbook.
 * Failing this, it is trading 'blind' and will have to rely on REST requests to update the state of the book.
 *
 * Emitted messages:
 *   Trader.outOfSyncWarning - The internal order pool and what's actually on the exchange may be out of sync
 *   Trader.trade-finalized - An order is complete (done)
 *   Trader.my-orders-cancelled - A call to cancel all orders in this orderbook has completed
 *   Trader.all-orders-cancelled - A call to cancel ALL of the user's orders (including those placed elsewhere) has been completed
 *   Trader.order-placed - Emitted after an order has been successfully placed
 *   Trader.order-cancelled - Emitted after an order has been cancelled
 *   Trader.trade-executed - emitted after a trade has been executed against my limit order
 *   Trader.place-order-failed - A REST order request returned with an error
 *   Trader.cancel-order-failed - A Cancel request returned with an error status
 */
class Trader extends stream_1.Writable {
    constructor(config) {
        super({ objectMode: true });
        this._fitOrders = true;
        this.api = config.exchangeAPI;
        this.logger = config.logger;
        this.myBook = new BookBuilder_1.BookBuilder(this.logger);
        this._productId = config.productId;
        this.sizePrecision = config.sizePrecision || 2;
        this.pricePrecision = config.pricePrecision || 2;
        this.unfilledMarketOrders = new Set();
        if (!this.api) {
            throw new Error('Trader cannot work without an exchange interface using valid credentials. Have you set the necessary ENVARS?');
        }
    }
    get productId() {
        return this._productId;
    }
    get fitOrders() {
        return this._fitOrders;
    }
    set fitOrders(value) {
        this._fitOrders = value;
    }
    placeOrder(req) {
        if (this.fitOrders) {
            req.size = req.size ? types_1.Big(req.size).round(this.sizePrecision, 1).toString() : undefined;
            req.funds = req.funds ? types_1.Big(req.funds).round(this.pricePrecision, 1).toString() : undefined;
            req.price = types_1.Big(req.price).round(this.pricePrecision, 2).toString();
        }
        return this.api.placeOrder(req).then((order) => {
            if (req.orderType !== 'market') {
                this.myBook.add(order);
            }
            else {
                this.unfilledMarketOrders.add(order.id);
            }
            return order;
        }).catch((err) => {
            // Errors can fail if they're too precise, too small, or the API is down
            // We pass the message along, but let the user decide what to do
            // We also have to wrap this call in a setImmediate; else any errors in the event handler will get thrown from here and lead to an unhandledRejection
            this.emitMessageAsync('Trader.place-order-failed', err.asMessage());
            return Promise.resolve(null);
        });
    }
    cancelOrder(orderId) {
        return this.api.cancelOrder(orderId).then((id) => {
            // To avoid race conditions, we only actually remove the order when the tradeFinalized message arrives
            return id;
        });
    }
    cancelMyOrders() {
        if (!this.myBook.orderPool) {
            return Promise.resolve([]);
        }
        const orderIds = Object.keys(this.myBook.orderPool);
        const promises = orderIds.map((id) => {
            return this.cancelOrder(id);
        });
        return Promise.all(promises).then((ids) => {
            this.emitMessageAsync('Trader.my-orders-cancelled', ids);
            return ids;
        });
    }
    /**
     * Cancel all, and we mean ALL orders (even those not placed by this Trader). To cancel only the messages
     * listed in the in-memory orderbook, use `cancelMyOrders`
     */
    cancelAllOrders() {
        return this.api.cancelAllOrders(null).then((ids) => {
            this.myBook.clear();
            this.emitMessageAsync('Trader.all-orders-cancelled', ids);
            return ids;
        }, (err) => {
            this.emitMessageAsync('error', err);
            return [];
        });
    }
    state() {
        return this.myBook.state();
    }
    /**
     * Compare the state of the in-memory orderbook with the one returned from a REST query of all my orders. The
     * result is an `OrderbookState` object that represents the diff between the two states. Negative sizes represent
     * orders in-memory that don't exist on the book and positive ones are vice versa
     */
    checkState() {
        return this.api.loadAllOrders(this.productId).then((actualOrders) => {
            const book = new BookBuilder_1.BookBuilder(this.logger);
            actualOrders.forEach((order) => {
                book.add(order);
            });
            const diff = OrderbookDiff_1.OrderbookDiff.compareByOrder(this.myBook, book);
            return Promise.resolve(diff);
        });
    }
    executeMessage(msg) {
        if (!Messages_1.isStreamMessage(msg)) {
            return;
        }
        switch (msg.type) {
            case 'placeOrder':
                this.handleOrderRequest(msg);
                break;
            case 'cancelOrder':
                this.handleCancelOrder(msg);
                break;
            case 'cancelAllOrders':
                this.cancelAllOrders();
                break;
            case 'cancelMyOrders':
                this.cancelMyOrders();
                break;
            case 'tradeExecuted':
                this.handleTradeExecutedMessage(msg);
                break;
            case 'tradeFinalized':
                this.handleTradeFinalized(msg);
                break;
            case 'myOrderPlaced':
                this.handleOrderPlacedConfirmation(msg);
                break;
        }
    }
    _write(msg, encoding, callback) {
        this.executeMessage(msg);
        callback();
    }
    handleOrderRequest(request) {
        if (request.productId !== this._productId) {
            return;
        }
        this.placeOrder(request).then((result) => {
            if (result) {
                this.emitMessageAsync('Trader.order-placed', result);
            }
        });
    }
    handleCancelOrder(request) {
        this.cancelOrder(request.orderId).then((result) => {
            return this.emitMessageAsync('Trader.order-cancelled', result);
        }, (err) => {
            this.emitMessageAsync('Trader.cancel-order-failed', err);
        });
    }
    handleTradeExecutedMessage(msg) {
        if (msg.orderType === 'market') {
            if (this.unfilledMarketOrders.has(msg.orderId)) {
                this.emit('Trader.trade-executed', msg);
            }
            return;
        }
        this.emit('Trader.trade-executed', msg);
        const order = this.myBook.getOrder(msg.orderId);
        if (!order) {
            this.logger.log('warn', 'Traded order not in my book', msg);
            this.emit('Trader.outOfSyncWarning', 'Traded order not in my book');
            return;
        }
        let newSize;
        if (msg.tradeSize) {
            newSize = order.size.minus(msg.tradeSize);
        }
        else {
            newSize = types_1.Big(msg.remainingSize);
        }
        this.myBook.modify(order.id, newSize);
    }
    handleTradeFinalized(msg) {
        const id = msg.orderId;
        const order = this.myBook.remove(id);
        if (!order && this.unfilledMarketOrders.has(id)) {
            this.unfilledMarketOrders.delete(id);
        }
        this.emit('Trader.trade-finalized', msg);
    }
    /**
     *  We should just confirm that we have the order, since we added when we placed it.
     *  Otherwise this Trader didn't place the order (or somehow missed the callback), but we should add
     *  it to our memory book anyway otherwise it will go out of sync
     */
    handleOrderPlacedConfirmation(msg) {
        const orderId = msg.orderId;
        if (this.myBook.getOrder(orderId)) {
            this.logger.log('debug', 'Order confirmed', msg);
            return;
        }
        const order = {
            id: orderId,
            price: types_1.Big(msg.price),
            side: msg.side,
            size: types_1.Big(msg.size)
        };
        this.myBook.add(order);
        this.emit('Trader.external-order-placement', msg);
    }
    /**
     * Wraps a message emission in a setImmediate. This should be called from inside Promise handlers, otherwise errors in the user code (event handler) will
     * get thrown from here, which leads to confusing stack traces.
     * @param {string} event
     * @param payload
     */
    emitMessageAsync(event, payload) {
        setImmediate(() => {
            this.emit(event, payload);
        });
    }
}
exports.Trader = Trader;
//# sourceMappingURL=Trader.js.map