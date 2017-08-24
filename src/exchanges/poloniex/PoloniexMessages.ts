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

// ------------------------- REST API response message types ------------------------------ //
export interface PoloniexTicker {
    id: number;
    last: string;
    lowestAsk: string;
    highestBid: string;
    percentChange: string;
    baseVolume: string;
    quoteVolume: string;
    isFrozen: string;
    high24hr: string;
    low24hr: string;
}

export interface PoloniexTickers {
    [ product: string]: PoloniexTicker;
}

export interface PoloniexBalance {
    available: string;
    onOrders: string;
    btcValue: string;
}

export interface PoloniexBalances {
    [ currency: string ]: PoloniexBalance;
}

export type PoloniexOrderbookLevel = [number, number];

export interface PoloniexOrderbook {
    asks: PoloniexOrderbookLevel[];
    bids: PoloniexOrderbookLevel[];
    isFrozen: number;
    seq: number;
}

export interface ChannelSubscription {
    id: number;
    connected: boolean;
    sequence: number;
}

// ------------------------- Websocket API response message types ------------------------------ //

export interface PoloniexTrollboxMessage {
    sequence: number;
    user: string;
    text: string;
    reputation: number;
}

export interface PoloniexVolumeMessage {
    timestamp: Date;
    sequence: number;
    volume: number;
}

export interface PoloniexSnapshotLevel {
    [price: number]: string;
}

export interface PoloniexSnapshotMessage {
    currencyPair: string;
    orderBook: [PoloniexSnapshotLevel, PoloniexSnapshotLevel];
}
