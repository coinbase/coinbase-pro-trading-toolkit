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

import { Logger, ConsoleLoggerFactory } from '../utils/Logger';
import { isSequencedMessage,
         isSnapshotMessage,
         BaseOrderMessage,
         OrderbookMessage,
         SequencedMessage } from './Messages';
import { RBTree } from 'bintrees';
import assert = require('assert');
import { Duplex } from 'stream';

/**
 * Configuration interface for A MessageQueue
 *
 * @param logger {Logger} An optional logging interface
 *
 * @param product {string} A product to filter for. A single feed might be producing messages from multiple products (each with their own
 * sequence numbers). This selects for the product so that all messages can be emitted in strictly increasing sequence number.
 *
 * @param targetQueueLength {number} Tries to maintain the queue length at this value. Default is zero, but you can increase to
 * small number like 2 or 3 if messages frequently arrive out of order. This will impose small lag on your feed, but will
 * reduce the risk of messages arriving out of order
 *
 * @param waitForSnapshot If true, messages are queued up until a snapshot message is received. If false, messages are
 * emitted in the order they are received without waiting for a snapshot.
 */
export interface MessageQueueConfig {
    product: string;
    logger?: Logger;
    targetQueueLength?: number;
    waitForSnapshot: boolean;
}

/**
 * The MessageQueue does two things:
 * i) Filters input messages for a specific product
 * ii) Queues messages, sorts them and emits them in a strictly increasing order.
 *
 * The source feed can contain multiple product streams. This class will filter out any products that don't match the configured
 * product feed. This means you can create a single websocket feed that subscribes to all of, say GDAX's products and then
 * create multiple `MessageStreams` without much overhead.
 *
 * There are three different ways of using the stream:
 *
 * 1. Push mode: You attach a `data` listener to this stream and each each message will be emitted more/less instantaneously,
 * as it is received from the feed. In this case one might still get messages arriving out of order, since the queue is usually
 * going to be empty.
 * 2. Create the stream in 'paused' mode (the default when you create it) and call `read` when you want the
 * next message (perhaps every n ms).
 * 3. Pipe the stream to another stream that performs some other function (like filter out HFT trades, or apply an exchange rate)
 *
 * You can always track out-of-order messages by subscribing to the `messageOutOfSequence` event.
 *
 * ## Events
 *
 * ### data(msg)
 * Emitted for each message that gets sent out
 *
 * ### messageOutOfSequence (msg, expectedSequence)
 * Emitted if a message is about to be sent out, out of sequence and waiting would violate the `targetQueueLength` constraint
 */
export class MessageQueue extends Duplex {
    private readonly logger: Logger;
    private readonly messages: RBTree<SequencedMessage>;
    private readonly targetQueueLength: number;
    private lastSequence: number;
    private readonly productId: string;
    private readonly waitForSnapshot: boolean;

    constructor(options: MessageQueueConfig) {
        super({ readableObjectMode: true, writableObjectMode: true });
        this.logger = options.logger || ConsoleLoggerFactory();
        this.productId = options.product;
        this.targetQueueLength = options.targetQueueLength || 10;
        this.lastSequence = -1000;
        this.waitForSnapshot = options.waitForSnapshot;
        this.messages = new RBTree<BaseOrderMessage>((a: BaseOrderMessage, b: BaseOrderMessage) => {
            return a.sequence - b.sequence;
        });
    }

    get product(): string {
        return this.productId;
    }

    get queueLength(): number {
        return this.messages.size;
    }

    get sequence() {
        return this.lastSequence;
    }

    read(size?: number): OrderbookMessage {
        return super.read(size) as OrderbookMessage;
    }

    /**
     * Close the stream. No more reads will be possible after calling this method
     */
    end() {
        // Clear the queue first
        let message: SequencedMessage;
        // tslint:disable-next-line:no-conditional-assignment
        while (message = this.pop()) {
            this.push(message);
        }
        this.push(null);
    }

    /**
     * Add the message to the queue
     * @param message
     */
    addMessage(message: SequencedMessage): void {
        if (isSnapshotMessage(message) && this.waitForSnapshot) {
            this.lastSequence = message.sequence - 1;
        } else {
            this.messages.insert(message);
        }
    }

    clearQueue() {
        this.messages.clear();
    }

    _write(inputMessage: any, _encoding: string, callback: (err: Error) => void): void {
        if (this.defaultMessageHandler(inputMessage)) {
            setImmediate(() => {
                this._read();
            });
        }
        callback(null);
    }

    /**
     * Will provide the next message, in the correct order
     * @private
     */
    _read() {
        /* The rules regarding readable streams are:
         - You have to call `push` to keep the stream alive.
         - Pushing 'null' ends the stream
         Therefore, if there are no messages, and _read() is called, we delay for 250ms, and then try again
         */
        let more: boolean;
        do {
            const nextMessage = this.pop();
            if (!nextMessage) {
                return;
            }
            // downstream streams might signal us to hold up by returning false here
            more = this.push(nextMessage);
        } while (more);
    }

    /**
     * Returns the next message off the queue, and removes it from the queue. pop() tries to keep the queue at
     * `targetQueueLength` if releasing a message would result in messages being out of order, so its possible for
     * pop() to return null
     * @returns {OrderbookMessage || null}
     */
    protected pop() {
        const queueLength = this.queueLength;
        const expectedSequence = this.sequence + 1;
        if (queueLength === 0) {
            return null;
        }
        const node = this.messages.min();
        if (node) {
            // If we haven't emitted any messages yet, and we're waiting for a snapshot, it must be the first message
            if (node.sequence && expectedSequence < 0 && this.waitForSnapshot && !isSnapshotMessage(node)) {
                return null;
            }
            // If we've received a snapshot, old messages can be discarded
            if (node.sequence && expectedSequence > 0 && this.waitForSnapshot && node.sequence < expectedSequence) {
                assert(this.messages.remove(node));
                return null;
            }
            // If we've skipped a message, we can wait if the queue length < targetQueueLength
            if (node.sequence && expectedSequence > 0 && (node.sequence > expectedSequence) && (queueLength < this.targetQueueLength)) {
                this.logger.log('warn', 'A message has arrived out of order, but we can wait to see if the correct message arrives shortly', {
                    expectedSequence: expectedSequence, receivedSequence: node.sequence, queueLength: queueLength
                });
                return null;
            }
            if (node.sequence && expectedSequence > 0 && node.sequence > expectedSequence) {
                this.logger.log('warn', 'A message has arrived out of order, but we are emitting it anyway', {
                    expectedSequence: expectedSequence, receivedSequence: node.sequence, queueLength: queueLength
                });
                this.emit('messageOutOfSequence', node, expectedSequence);
            }
            assert(this.messages.remove(node));
            if (node.sequence && this.lastSequence < node.sequence) {
                this.lastSequence = node.sequence;
            }
        }
        return node;
    }

    private defaultMessageHandler(msg: any): boolean {
        if (msg.productId !== this.productId) {
            return false;
        }
        if (isSequencedMessage(msg)) {
            this.addMessage(msg);
        }
        return true;
    }
}
