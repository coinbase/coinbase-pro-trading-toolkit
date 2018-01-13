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
const Messages_1 = require("./Messages");
const bintrees_1 = require("bintrees");
const stream_1 = require("stream");
const types_1 = require("../lib/types");
const assert = require("assert");
/**
 * Filters the raw WS message stream by batching messages and auto-cancelling zero-effect trades.
 *
 * If you read from this stream in 'push' mode, i.e. by attaching a `data` listener to it, then each message will
 * be emitted more/less  instantaneously, and so the filtering mechanism won't have time to catch HFTs. The
 * way you probably want to use this stream is to always have it paused and call `read` when you want the
 * next message (perhaps every n ms). This way, there's maximum opportunity to pre-filter zero-effect trades; and
 * re-order any messages that may have arrived out of order
 */
class HFTFilter extends stream_1.Duplex {
    constructor(config) {
        super({ readableObjectMode: true, writableObjectMode: true });
        this.skippedMessages = 0;
        this.tradesSkipped = 0;
        this.logger = config.logger;
        this.targetQueueLength = config.targetQueueLength;
        this.clearQueue();
    }
    getStats() {
        const numUnprocessedMessages = this.messages.size;
        const stats = {
            backlog: numUnprocessedMessages,
            skippedMessages: this.skippedMessages,
            tradesSkipped: this.tradesSkipped
        };
        this.skippedMessages = 0;
        this.tradesSkipped = 0;
        return stats;
    }
    get queueLength() {
        return this.messages.size;
    }
    get numSkippedMessages() {
        return this.skippedMessages;
    }
    read(size) {
        return super.read(size);
    }
    /**
     * Add the message to the queue
     */
    addMessage(message) {
        if (Messages_1.isOrderMessage(message)) {
            const order = message;
            this.messagesById[order.orderId] = order;
        }
        this.messages.insert(message);
        return true;
    }
    processDoneMessage(done) {
        // If the open order is not already in the queue, add it.
        const message = this.messagesById[done.orderId];
        if (!message) {
            this.addMessage(done);
            return true;
        }
        // Otherwise, we can remove both the open and done messages. Efficiency!
        this.messages.remove(message);
        delete this.messagesById[message.orderId];
        this.tradesSkipped++;
        this.skippedMessages += 2;
        return false;
    }
    processChangeMessage(change) {
        if (!change.newSize && !change.changedAmount) {
            return false;
        }
        // If the open message for this change message hasn't been seen before, treat this as an open message
        const message = this.messagesById[change.orderId];
        if (!message && change.newSize) {
            const updatedMessage = {
                type: 'newOrder',
                sequence: change.sequence,
                productId: change.productId,
                time: change.time,
                orderId: change.orderId,
                side: change.side,
                price: change.price,
                size: change.newSize
            };
            return this.addMessage(updatedMessage);
        }
        if (!message) {
            return false;
        }
        // Otherwise, update the order
        message.size = change.newSize || types_1.Big(message.size).plus(change.changedAmount).toString();
        this.skippedMessages++;
        return false;
    }
    pop() {
        const queueLength = this.queueLength;
        if (queueLength <= this.targetQueueLength) {
            return null;
        }
        const node = this.messages.min();
        if (node) {
            assert(this.messages.remove(node));
            if (Messages_1.isOrderMessage(node)) {
                delete this.messagesById[node.orderId];
            }
        }
        return node;
    }
    clearQueue() {
        this.messagesById = {};
        this.skippedMessages = 0;
        this.tradesSkipped = 0;
        this.messages = new bintrees_1.RBTree((a, b) => {
            return a.sequence - b.sequence;
        });
    }
    _read() {
        /* The rules regarding readable streams are:
         - You have to call `push` to keep the stream alive.
         - Pushing 'null' ends the stream
         Therefore, if there are no messages, and _read() is called, we delay for pollInterval ms, and then try again
         */
        let more;
        do {
            const nextMessage = this.pop();
            if (!nextMessage) {
                return;
            }
            more = this.push(nextMessage);
        } while (more);
    }
    /**
     * If this stream has another stream piped into it, we just pass the data into the READABLE stream's filter
     */
    _write(chunk, encoding, callback) {
        if (typeof chunk === 'object' && Messages_1.isStreamMessage(chunk)) {
            this.filterMessage(chunk);
            return callback(null);
        }
        // Maybe the messages have been serialised as strings
        const data = chunk.toString ? chunk.toString() : chunk;
        let err;
        try {
            const message = JSON.parse(data);
            if (Messages_1.isStreamMessage(message)) {
                this.filterMessage(message);
                return callback(null);
            }
        }
        catch (e) {
            err = new Error('Invalid GDAX websocket message');
            err.data = data;
            return callback(err);
        }
        err = new Error('Invalid data written to FilteredMessageStream');
        err.data = chunk;
        return callback(err);
    }
    /**
     * Returns true if the message Queue has lengthened
     */
    filterMessage(message) {
        switch (message.type) {
            case 'newOrder':
                return this.addMessage(message);
            case 'orderDone':
                return this.processDoneMessage(message);
            case 'changedOrder':
                return this.processChangeMessage(message);
            default:
                return this.passThrough(message);
        }
    }
    /**
     * Simply passes the message onto the output stream
     */
    passThrough(message) {
        this.push(message);
        return true;
    }
}
exports.HFTFilter = HFTFilter;
//# sourceMappingURL=HFTFilter.js.map