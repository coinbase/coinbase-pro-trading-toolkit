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

import { BaseOrderMessage,
         ChangedOrderMessage,
         isBaseOrderMessage,
         isStreamMessage,
         NewOrderMessage,
         StreamMessage } from './Messages';
import { RBTree } from 'bintrees';
import { Duplex } from 'stream';
import { MessageTransformConfig } from '../lib/AbstractMessageTransform';
import { Big } from '../lib/types';
import assert = require('assert');

export interface HFTFilterConfig extends MessageTransformConfig {
    targetQueueLength: number;
}

export interface HFTFilterStats {
    backlog: number;
    skippedMessages: number;
    tradesSkipped: number;
}

/**
 * Filters the raw WS message stream by batching messages and auto-cancelling zero-effect trades.
 *
 * If you read from this stream in 'push' mode, i.e. by attaching a `data` listener to it, then each message will
 * be emitted more/less  instantaneously, and so the filtering mechanism won't have time to catch HFTs. The
 * way you probably want to use this stream is to always have it paused and call `read` when you want the
 * next message (perhaps every n ms). This way, there's maximum opportunity to pre-filter zero-effect trades; and
 * re-order any messages that may have arrived out of order
 */
export class HFTFilter extends Duplex {
    private messages: RBTree<StreamMessage>;
    private messagesById: { [id: string]: BaseOrderMessage };
    private skippedMessages: number = 0;
    private tradesSkipped: number = 0;
    private readonly targetQueueLength: number;

    constructor(config: HFTFilterConfig) {
        super({ readableObjectMode: true, writableObjectMode: true });
        this.targetQueueLength = config.targetQueueLength;
        this.clearQueue();
    }

    getStats(): HFTFilterStats {
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

    get queueLength(): number {
        return this.messages.size;
    }

    get numSkippedMessages() {
        return this.skippedMessages;
    }

    read(size?: number): StreamMessage {
        return super.read(size) as StreamMessage;
    }

    /**
     * Add the message to the queue
     */
    addMessage(message: StreamMessage): boolean {
        if (isBaseOrderMessage(message)) {
            this.messagesById[message.orderId] = message;
        }
        this.messages.insert(message);
        return true;
    }

    processDoneMessage(done: BaseOrderMessage): boolean {
        // If the open order is not already in the queue, add it.
        const message: BaseOrderMessage = this.messagesById[done.orderId];
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

    processChangeMessage(change: ChangedOrderMessage): boolean {
        if (!change.newSize && !change.changedAmount) {
            return false;
        }
        // If the open message for this change message hasn't been seen before, treat this as an open message
        const message = this.messagesById[change.orderId] as NewOrderMessage;
        if (!message && change.newSize) {
            const updatedMessage: NewOrderMessage = {
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
        message.size = change.newSize || Big(message.size).plus(change.changedAmount).toString();
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
            if (isBaseOrderMessage(node)) {
                delete this.messagesById[node.orderId];
            }
        }
        return node;
    }

    clearQueue() {
        this.messagesById = {};
        this.skippedMessages = 0;
        this.tradesSkipped = 0;
        this.messages = new RBTree<BaseOrderMessage>((a: BaseOrderMessage, b: BaseOrderMessage) => {
            return a.sequence - b.sequence;
        });
    }

    _read() {
        /* The rules regarding readable streams are:
         - You have to call `push` to keep the stream alive.
         - Pushing 'null' ends the stream
         Therefore, if there are no messages, and _read() is called, we delay for pollInterval ms, and then try again
         */
        let more: boolean;
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
    _write(chunk: any, _encoding: string, callback: (err: Error) => void) {
        if (typeof chunk === 'object' && isStreamMessage(chunk)) {
            this.filterMessage(chunk);
            return callback(null);
        }
        // Maybe the messages have been serialised as strings
        const data = chunk.toString ? chunk.toString() : chunk;
        let err: Error;
        try {
            const message = JSON.parse(data);
            if (isStreamMessage(message)) {
                this.filterMessage(message);
                return callback(null);
            }
        } catch (e) {
            err = new Error('Invalid GDAX websocket message');
            (err as any).data = data;
            return callback(err);
        }
        err = new Error('Invalid data written to FilteredMessageStream');
        (err as any).data = chunk;
        return callback(err);
    }

    /**
     * Returns true if the message Queue has lengthened
     */
    protected filterMessage(message: StreamMessage): boolean {
        switch (message.type) {
            case 'newOrder':
                return this.addMessage(message as BaseOrderMessage);
            case 'orderDone':
                return this.processDoneMessage(message as BaseOrderMessage);
            case 'changedOrder':
                return this.processChangeMessage(message as ChangedOrderMessage);
            default:
                return this.passThrough(message);
        }
    }

    /**
     * Simply passes the message onto the output stream
     */
    protected passThrough(message: StreamMessage): boolean {
        this.push(message);
        return true;
    }
}
