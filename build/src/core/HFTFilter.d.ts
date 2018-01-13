/// <reference types="node" />
import { BaseOrderMessage, ChangedOrderMessage, StreamMessage } from './Messages';
import { Duplex } from 'stream';
import { MessageTransformConfig } from '../lib/AbstractMessageTransform';
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
export declare class HFTFilter extends Duplex {
    private logger;
    private messages;
    private messagesById;
    private skippedMessages;
    private tradesSkipped;
    private targetQueueLength;
    constructor(config: HFTFilterConfig);
    getStats(): HFTFilterStats;
    readonly queueLength: number;
    readonly numSkippedMessages: number;
    read(size?: number): StreamMessage;
    /**
     * Add the message to the queue
     */
    addMessage(message: StreamMessage): boolean;
    processDoneMessage(done: BaseOrderMessage): boolean;
    processChangeMessage(change: ChangedOrderMessage): boolean;
    pop(): StreamMessage;
    clearQueue(): void;
    _read(): void;
    /**
     * If this stream has another stream piped into it, we just pass the data into the READABLE stream's filter
     */
    _write(chunk: any, encoding: string, callback: (err: Error) => void): void;
    /**
     * Returns true if the message Queue has lengthened
     */
    protected filterMessage(message: StreamMessage): boolean;
    /**
     * Simply passes the message onto the output stream
     */
    protected passThrough(message: StreamMessage): boolean;
}
