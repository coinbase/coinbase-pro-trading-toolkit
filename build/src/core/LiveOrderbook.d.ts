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
import { BigJS, Biglike } from '../lib/types';
import { CumulativePriceLevel, Orderbook, OrderbookState } from '../lib/Orderbook';
import { BookBuilder, StartPoint } from '../lib/BookBuilder';
import { Logger } from '../utils/Logger';
import { Ticker } from '../exchanges/PublicExchangeAPI';
import { Duplex } from 'stream';
export interface LiveBookConfig {
    product: string;
    strictMode?: boolean;
    logger?: Logger;
}
export declare enum SequenceStatus {
    OK = 0,
    ALREADY_PROCESSED = 1,
    SKIP_DETECTED = 2,
}
export interface SkippedMessageEvent {
    sequence: number;
    expected_sequence: number;
}
/**
 * A live orderbook. This class maintains the state of an orderbook (using BookBuilder) in realtime by responding to
 * messages from attached feeds.
 */
export declare class LiveOrderbook extends Duplex implements Orderbook {
    readonly product: string;
    readonly baseCurrency: string;
    readonly quoteCurrency: string;
    protected snapshotReceived: boolean;
    protected strictMode: boolean;
    protected lastBookUpdate: Date;
    protected _book: BookBuilder;
    protected liveTicker: Ticker;
    protected _sourceSequence: number;
    private logger;
    constructor(config: LiveBookConfig);
    log(level: string, message: string, meta?: any): void;
    readonly sourceSequence: number;
    readonly numAsks: number;
    readonly numBids: number;
    readonly bidsTotal: BigJS;
    readonly asksTotal: BigJS;
    state(): OrderbookState;
    readonly book: BookBuilder;
    readonly ticker: Ticker;
    readonly sequence: number;
    /**
     * The time (in seconds) since the last ticker update
     */
    readonly timeSinceTickerUpdate: number;
    /**
     * The time (in seconds) since the last orderbook update
     */
    readonly timeSinceOrderbookUpdate: number;
    /**
     * Return an array of (aggregated) orders whose sum is equal to or greater than `value`. The side parameter is from
     * the perspective of the purchaser, so 'buy' returns asks and 'sell' bids.
     */
    ordersForValue(side: string, value: Biglike, useQuote: boolean, startPrice?: StartPoint): CumulativePriceLevel[];
    _read(): void;
    _write(msg: any, encoding: string, callback: () => void): void;
    /**
     * Checks the given sequence number against the expected number for a message and returns a status result
     */
    private checkSequence(sequence);
    private updateTicker(tickerMessage);
    private processSnapshot(snapshot);
    /**
     * Handles order messages from aggregated books
     * @param msg
     */
    private processLevelChange(msg);
    /**
     * Processes order messages from order-level books.
     */
    private processLevel3Messages(message);
    private processNewOrderMessage(msg);
    private processDoneMessage(msg);
    private processChangedOrderMessage(msg);
    private emitError(message?);
}
