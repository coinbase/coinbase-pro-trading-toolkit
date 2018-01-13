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
const types_1 = require("../lib/types");
const BookBuilder_1 = require("../lib/BookBuilder");
const Messages_1 = require("./Messages");
const stream_1 = require("stream");
var SequenceStatus;
(function (SequenceStatus) {
    SequenceStatus[SequenceStatus["OK"] = 0] = "OK";
    SequenceStatus[SequenceStatus["ALREADY_PROCESSED"] = 1] = "ALREADY_PROCESSED";
    SequenceStatus[SequenceStatus["SKIP_DETECTED"] = 2] = "SKIP_DETECTED";
})(SequenceStatus = exports.SequenceStatus || (exports.SequenceStatus = {}));
/**
 * A live orderbook. This class maintains the state of an orderbook (using BookBuilder) in realtime by responding to
 * messages from attached feeds.
 */
class LiveOrderbook extends stream_1.Duplex {
    constructor(config) {
        super({ objectMode: true, highWaterMark: 1024 });
        this.product = config.product;
        [this.baseCurrency, this.quoteCurrency] = this.product.split('-');
        this.logger = config.logger;
        this._book = new BookBuilder_1.BookBuilder(this.logger);
        this.liveTicker = {
            productId: config.product,
            price: undefined,
            bid: undefined,
            ask: undefined,
            volume: types_1.ZERO,
            time: undefined,
            trade_id: undefined,
            size: undefined
        };
        this.strictMode = !!config.strictMode;
        this.snapshotReceived = false;
    }
    log(level, message, meta) {
        if (!this.logger) {
            return;
        }
        this.logger.log(level, message, meta);
    }
    get sourceSequence() {
        return this._sourceSequence;
    }
    get numAsks() {
        return this._book.numAsks;
    }
    get numBids() {
        return this._book.numBids;
    }
    get bidsTotal() {
        return this._book.bidsTotal;
    }
    get asksTotal() {
        return this._book.asksTotal;
    }
    state() {
        return this._book.state();
    }
    get book() {
        return this._book;
    }
    get ticker() {
        return this.liveTicker;
    }
    get sequence() {
        return this._book.sequence;
    }
    /**
     * The time (in seconds) since the last ticker update
     */
    get timeSinceTickerUpdate() {
        const time = this.ticker.time ? this.ticker.time.valueOf() : 0;
        return (Date.now() - time);
    }
    /**
     * The time (in seconds) since the last orderbook update
     */
    get timeSinceOrderbookUpdate() {
        const time = this.lastBookUpdate ? this.lastBookUpdate.valueOf() : 0;
        return (Date.now() - time);
    }
    /**
     * Return an array of (aggregated) orders whose sum is equal to or greater than `value`. The side parameter is from
     * the perspective of the purchaser, so 'buy' returns asks and 'sell' bids.
     */
    ordersForValue(side, value, useQuote, startPrice) {
        return this._book.ordersForValue(side, types_1.Big(value), useQuote, startPrice);
    }
    _read() { }
    _write(msg, encoding, callback) {
        // Pass the msg on to downstream users
        this.push(msg);
        // Process the message for the orderbook state
        if (!Messages_1.isStreamMessage(msg) || !msg.productId) {
            return callback();
        }
        if (msg.productId !== this.product) {
            return callback();
        }
        switch (msg.type) {
            case 'ticker':
                this.updateTicker(msg);
                // ticker is emitted in pvs method
                break;
            case 'snapshot':
                this.processSnapshot(msg);
                break;
            case 'level':
                this.processLevelChange(msg);
                this.emit('LiveOrderbook.update', msg);
                break;
            case 'trade':
                // Trade messages don't affect the orderbook
                this.emit('LiveOrderbook.trade', msg);
                break;
            default:
                this.processLevel3Messages(msg);
                this.emit('LiveOrderbook.update', msg);
                break;
        }
        callback();
    }
    /**
     * Checks the given sequence number against the expected number for a message and returns a status result
     */
    checkSequence(sequence) {
        if (sequence <= this.sequence) {
            return SequenceStatus.ALREADY_PROCESSED;
        }
        if (sequence !== this.sequence + 1) {
            // Dropped a message, restart the synchronising
            this.log('info', `Dropped a message. Expected ${this.sequence + 1} but received ${sequence}.`);
            const event = {
                expected_sequence: this.sequence + 1,
                sequence: sequence
            };
            const diff = event.expected_sequence - event.sequence;
            const msg = `LiveOrderbook detected a skipped message. Expected ${event.expected_sequence}, but received ${event.sequence}. Diff = ${diff}`;
            if (this.strictMode) {
                throw new Error(msg);
            }
            this.emit('LiveOrderbook.skippedMessage', event);
            return SequenceStatus.SKIP_DETECTED;
        }
        this.lastBookUpdate = new Date();
        this._book.sequence = sequence;
        return SequenceStatus.OK;
    }
    updateTicker(tickerMessage) {
        const ticker = this.liveTicker;
        ticker.price = tickerMessage.price;
        ticker.bid = tickerMessage.bid;
        ticker.ask = tickerMessage.ask;
        ticker.volume = tickerMessage.volume;
        ticker.time = tickerMessage.time;
        ticker.trade_id = tickerMessage.trade_id;
        ticker.size = tickerMessage.size;
        this.emit('LiveOrderbook.ticker', ticker);
    }
    processSnapshot(snapshot) {
        this._book.fromState(snapshot);
        this._sourceSequence = snapshot.sourceSequence;
        this.snapshotReceived = true;
        this.emit('LiveOrderbook.snapshot', snapshot);
    }
    /**
     * Handles order messages from aggregated books
     * @param msg
     */
    processLevelChange(msg) {
        if (!msg.sequence) {
            return;
        }
        this._sourceSequence = msg.sourceSequence;
        const sequenceStatus = this.checkSequence(msg.sequence);
        if (sequenceStatus === SequenceStatus.ALREADY_PROCESSED) {
            return;
        }
        const level = BookBuilder_1.AggregatedLevelFactory(msg.size, msg.price, msg.side);
        this._book.setLevel(msg.side, level);
    }
    /**
     * Processes order messages from order-level books.
     */
    processLevel3Messages(message) {
        // Can't do anything until we get a snapshot
        if (!this.snapshotReceived || !message.sequence) {
            return;
        }
        const sequenceStatus = this.checkSequence(message.sequence);
        if (sequenceStatus === SequenceStatus.ALREADY_PROCESSED) {
            return;
        }
        this._sourceSequence = message.sourceSequence;
        switch (message.type) {
            case 'newOrder':
                this.processNewOrderMessage(message);
                break;
            case 'orderDone':
                this.processDoneMessage(message);
                break;
            case 'changedOrder':
                this.processChangedOrderMessage(message);
                break;
            default:
                return;
        }
    }
    processNewOrderMessage(msg) {
        const order = {
            id: msg.orderId,
            size: types_1.Big(msg.size),
            price: types_1.Big(msg.price),
            side: msg.side
        };
        if (!(this._book.add(order))) {
            this.emitError(msg);
        }
    }
    processDoneMessage(msg) {
        // If we're using an order pool, then we only remove orders that we're aware of. GDAX, for example might
        // send a done message for a stop order that is cancelled (and was not previously known to us).
        // Also filled orders will already have been removed by the time a GDAX done order reaches here
        const book = this._book;
        if (!book.hasOrder(msg.orderId)) {
            return;
        }
        if (!(this._book.remove(msg.orderId))) {
            this.emitError(msg);
        }
    }
    processChangedOrderMessage(msg) {
        if (!msg.newSize && !msg.changedAmount) {
            return;
        }
        let newSize;
        const newSide = msg.side;
        if (msg.changedAmount) {
            const order = this.book.getOrder(msg.orderId);
            newSize = order.size.plus(msg.changedAmount);
        }
        else {
            newSize = types_1.Big(msg.newSize);
        }
        if (!(this._book.modify(msg.orderId, newSize, newSide))) {
            this.emitError(msg);
        }
    }
    emitError(message) {
        const err = new Error('An inconsistent orderbook state occurred');
        err.msg = message;
        this.log('error', err.message, { message: message });
        this.emit('error', err);
    }
}
exports.LiveOrderbook = LiveOrderbook;
//# sourceMappingURL=LiveOrderbook.js.map