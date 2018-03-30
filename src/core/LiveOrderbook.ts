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

import { Big, BigJS, Biglike, ZERO } from '../lib/types';
import { CumulativePriceLevel, Level3Order, Orderbook, OrderbookState } from '../lib/Orderbook';
import { AggregatedLevelFactory, AggregatedLevelWithOrders, BookBuilder, StartPoint } from '../lib/BookBuilder';
import { Logger } from '../utils/Logger';
import { Ticker } from '../exchanges/PublicExchangeAPI';
import {
    ChangedOrderMessage,
    isStreamMessage,
    LevelMessage,
    NewOrderMessage,
    OrderbookMessage,
    OrderDoneMessage,
    SnapshotMessage,
    TickerMessage
} from './Messages';
import { Duplex } from 'stream';

export interface LiveBookConfig {
    product: string;
    strictMode?: boolean;             // If true, throws errors when state goes out of sync rather than restarting
    logger?: Logger;
}

export enum SequenceStatus {
    OK,
    ALREADY_PROCESSED,
    SKIP_DETECTED
}

export interface SkippedMessageEvent {
    sequence: number;
    expected_sequence: number;
}

/**
 * A live orderbook. This class maintains the state of an orderbook (using BookBuilder) in realtime by responding to
 * messages from attached feeds.
 */
export class LiveOrderbook extends Duplex implements Orderbook {
    public readonly product: string;
    public readonly baseCurrency: string;
    public readonly quoteCurrency: string;
    protected snapshotReceived: boolean;
    protected strictMode: boolean;
    protected lastBookUpdate: Date;
    protected _book: BookBuilder;
    protected liveTicker: Ticker;
    protected _sourceSequence: number;
    private logger: Logger;

    constructor(config: LiveBookConfig) {
        super({ objectMode: true, highWaterMark: 1024 });
        this.product = config.product;
        [this.baseCurrency, this.quoteCurrency] = this.product.split('-');
        this.logger = config.logger;
        this._book = new BookBuilder(this.logger);
        this.liveTicker = {
            productId: config.product,
            price: undefined,
            bid: undefined,
            ask: undefined,
            volume: ZERO,
            time: undefined,
            trade_id: undefined,
            size: undefined
        };
        this.strictMode = !!(config.strictMode as any);
        this.snapshotReceived = false;
    }

    log(level: string, message: string, meta?: any) {
        if (!this.logger) {
            return;
        }
        this.logger.log(level, message, meta);
    }

    get sourceSequence(): number {
        return this._sourceSequence;
    }

    get numAsks(): number {
        return this._book.numAsks;
    }

    get numBids(): number {
        return this._book.numBids;
    }

    get bidsTotal(): BigJS {
        return this._book.bidsTotal;
    }

    get asksTotal(): BigJS {
        return this._book.asksTotal;
    }

    state(): OrderbookState {
        return this._book.state();
    }

    get book(): BookBuilder {
        return this._book;
    }

    get ticker(): Ticker {
        return this.liveTicker;
    }

    get sequence(): number {
        return this._book.sequence;
    }

    /**
     * The time (in seconds) since the last ticker update
     */
    get timeSinceTickerUpdate(): number {
        const time: number = this.ticker.time ? this.ticker.time.valueOf() : 0;
        return (Date.now() - time);
    }

    /**
     * The time (in seconds) since the last orderbook update
     */
    get timeSinceOrderbookUpdate(): number {
        const time: number = this.lastBookUpdate ? this.lastBookUpdate.valueOf() : 0;
        return (Date.now() - time);
    }

    /**
     * Return an array of (aggregated) orders whose sum is equal to or greater than `value`. The side parameter is from
     * the perspective of the purchaser, so 'buy' returns asks and 'sell' bids.
     */
    ordersForValue(side: string, value: Biglike, useQuote: boolean, startPrice?: StartPoint): CumulativePriceLevel[] {
        return this._book.ordersForValue(side, Big(value), useQuote, startPrice);
    }

    _read() { /* no-op */ }

    _write(msg: any, encoding: string, callback: () => void): void {
        // Pass the msg on to downstream users
        this.push(msg);
        // Process the message for the orderbook state
        if (msg.productId !== this.product) {
            return callback();
        }
        if (!isStreamMessage(msg)) {
            return callback();
        }
        switch (msg.type) {
            case 'ticker':
                this.updateTicker(msg as TickerMessage);
                // ticker is emitted in pvs method
                break;
            case 'snapshot':
                this.processSnapshot(msg as SnapshotMessage);
                break;
            case 'level':
                this.processLevelChange(msg as LevelMessage);
                this.emit('LiveOrderbook.update', msg);
                break;
            case 'trade':
                // Trade messages don't affect the orderbook
                this.emit('LiveOrderbook.trade', msg);
                break;
            default:
                this.processLevel3Messages(msg as OrderbookMessage);
                this.emit('LiveOrderbook.update', msg);
                break;
        }
        callback();
    }

    /**
     * Checks the given sequence number against the expected number for a message and returns a status result
     */
    private checkSequence(sequence: number): SequenceStatus {
        if (sequence <= this.sequence) {
            return SequenceStatus.ALREADY_PROCESSED;
        }
        if (sequence !== this.sequence + 1) {
            // Dropped a message, restart the synchronising
            this.log('info', `Dropped a message. Expected ${this.sequence + 1} but received ${sequence}.`);
            const event: SkippedMessageEvent = {
                expected_sequence: this.sequence + 1,
                sequence: sequence
            };
            const diff: number = event.expected_sequence - event.sequence;
            if (this.strictMode) {
                const msg = `LiveOrderbook detected a skipped message. Expected ${event.expected_sequence}, but received ${event.sequence}. Diff = ${diff}`;
                throw new Error(msg);
            }
            this.emit('LiveOrderbook.skippedMessage', event);
            return SequenceStatus.SKIP_DETECTED;
        }
        this.lastBookUpdate = new Date();
        this._book.sequence = sequence;
        return SequenceStatus.OK;
    }

    private updateTicker(tickerMessage: TickerMessage) {
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

    private processSnapshot(snapshot: SnapshotMessage) {
        this._book.fromState(snapshot);
        this._sourceSequence = snapshot.sourceSequence;
        this.snapshotReceived = true;
        this.emit('LiveOrderbook.snapshot', snapshot);
    }

    /**
     * Handles order messages from aggregated books
     * @param msg
     */
    private processLevelChange(msg: LevelMessage): void {
        if (!msg.sequence) {
            return;
        }
        this._sourceSequence = msg.sourceSequence;
        const sequenceStatus = this.checkSequence(msg.sequence);
        if (sequenceStatus === SequenceStatus.ALREADY_PROCESSED) {
            return;
        }
        const level: AggregatedLevelWithOrders = AggregatedLevelFactory(msg.size, msg.price, msg.side);
        this._book.setLevel(msg.side, level);
    }

    /**
     * Processes order messages from order-level books.
     */
    private processLevel3Messages(message: OrderbookMessage): void {
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
                this.processNewOrderMessage(message as NewOrderMessage);
                break;
            case 'orderDone':
                this.processDoneMessage(message as OrderDoneMessage);
                break;
            case 'changedOrder':
                this.processChangedOrderMessage(message as ChangedOrderMessage);
                break;
            default:
                return;
        }
    }

    private processNewOrderMessage(msg: NewOrderMessage) {
        const order: Level3Order = {
            id: msg.orderId,
            size: Big(msg.size),
            price: Big(msg.price),
            side: msg.side
        };
        if (!(this._book.add(order))) {
            this.emitError(msg);
        }
    }

    private processDoneMessage(msg: OrderDoneMessage) {
        // If we're using an order pool, then we only remove orders that we're aware of. GDAX, for example might
        // send a done message for a stop order that is cancelled (and was not previously known to us).
        // Also filled orders will already have been removed by the time a GDAX done order reaches here
        const book: BookBuilder = this._book;
        if (!book.hasOrder(msg.orderId)) {
            return;
        }
        if (!(this._book.remove(msg.orderId))) {
            this.emitError(msg);
        }
    }

    private processChangedOrderMessage(msg: ChangedOrderMessage) {
        if (!msg.newSize && !msg.changedAmount) {
            return;
        }
        let newSize: BigJS;
        const newSide: string = msg.side;
        if (msg.changedAmount) {
            const order: Level3Order = this.book.getOrder(msg.orderId);
            newSize = order.size.plus(msg.changedAmount);
        } else {
            newSize = Big(msg.newSize);
        }

        if (!(this._book.modify(msg.orderId, newSize, newSide))) {
            this.emitError(msg);
        }
    }

    private emitError(message?: OrderbookMessage) {
        const err: any = new Error('An inconsistent orderbook state occurred');
        err.msg = message;
        this.log('error', err.message, { message: message });
        this.emit('error', err);
    }
}
