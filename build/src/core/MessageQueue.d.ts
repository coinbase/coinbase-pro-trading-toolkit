/// <reference types="node" />
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
import { Logger } from '../utils/Logger';
import { OrderbookMessage } from './Messages';
import { Duplex } from 'stream';
/**
 * Configuration interface for A MessageQueue
 *
 * @param logger {Logger} An optional logging interface
 *
 * @param product {string} A product to filter for. A single feed might be producing messages form multiple products (each with their own
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
export declare class MessageQueue extends Duplex {
    private logger;
    private messages;
    private targetQueueLength;
    private lastSequence;
    private productId;
    private messageListener;
    private waitForSnapshot;
    constructor(options: MessageQueueConfig);
    readonly product: string;
    readonly queueLength: number;
    readonly sequence: number;
    read(size?: number): OrderbookMessage;
    /**
     * Close the stream. No more reads will be possible after calling this method
     */
    end(): void;
    /**
     * Add the message to the queue
     * @param message
     */
    addMessage(message: OrderbookMessage): void;
    clearQueue(): void;
    _write(inputMessage: any, encoding: string, callback: (err: Error) => void): void;
    /**
     * Will provide the next message, in the correct order
     * @private
     */
    _read(): void;
    /**
     * Returns the next message off the queue, and removes it from the queue. pop() tries to keep the queue at
     * `targetQueueLength` if releasing a message would result in messages being out of order, so its possible for
     * pop() to return null
     * @returns {OrderbookMessage || null}
     */
    protected pop(): OrderbookMessage;
    private defaultMessageHandler(msg);
}
