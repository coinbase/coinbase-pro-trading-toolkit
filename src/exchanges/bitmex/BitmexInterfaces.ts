/***************************************************************************************************************************
 * @license                                                                                                                *
 * Copyright 2017 Coinbase; Inc.                                                                                           *
 *                                                                                                                         *
 * Licensed under the Apache License; Version 2.0 (the "License"); you may not use this file except in compliance          *
 * with the License. You may obtain a copy of the License at                                                               *
 *                                                                                                                         *
 * http://www.apache.org/licenses/LICENSE-2.0                                                                              *
 *                                                                                                                         *
 * Unless required by applicable law or agreed to in writing; software distributed under the License is distributed on     *
 * an "AS IS" BASIS; WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND; either express or implied. See the                      *
 * License for the specific language governing permissions and limitations under the License.                              *
 ***************************************************************************************************************************/
export type ActionType =
      'partial'
    | 'update'
    | 'insert'
    | 'delete';

export type BitmexSide = 'Buy' | 'Sell';

export interface SubscriptionRequestMessage {
    op: 'subscribe';
    args: string[];
}

export interface BitmexMessage {
    error?: string;
    table?: string;
    action?: string;
    success?: boolean;
    info?: string;
}

export interface WelcomeMessage extends BitmexMessage {
    info: string;
    version: string;
    timestamp: string;
    docs: string;
}

// Three possible message types: `SubscriptionResponseMessage`; `ErrorMessage`; `DataMessage`
export interface SubscriptionResponseMessage extends BitmexMessage {
    success: boolean;
    subscribe: string;
    request: SubscriptionRequestMessage;
}

export interface ErrorMessage extends BitmexMessage {
    error: string;
}

export interface DataMessage extends BitmexMessage {
    table: string;
    action: ActionType;
    keys?: string[];
    data: {}[]; // Specialized in subinterfaces
    foreignKeys?: { [key: string]: string };
    types?: { [key: string]: string };
    filter?: { account?: number; symbol?: string };
    attributes?: { [key: string]: string };
}

export interface PriceData {
    symbol: string;
    id: number;
    side: BitmexSide;
    size: number;
    price: number;
}

export interface OrderbookSnapshotMessage extends DataMessage {
    table: 'orderBookL2';
    action: 'partial';
    data: PriceData[];
}

export interface LevelUpdate {
    symbol: string;
    id: number;
    side: BitmexSide;
    size?: number;
    price?: number;
}

export interface OrderbookInsert extends LevelUpdate {
    size: number;
    price: number;
}

export interface OrderbookInsertMessage extends DataMessage {
    action: 'insert';
    data: OrderbookInsert[];
}

export interface OrderbookUpdate extends LevelUpdate {
    size: number;
}

export interface OrderbookUpdateMessage extends DataMessage {
    data: OrderbookUpdate[];
}

export interface OrderbookDeleteMessage extends DataMessage {
    data: LevelUpdate[];
}

export type TickDirection = 'MinusTick' | 'PlusTick' | 'ZeroMinusTick' | 'ZeroPlusTick';

export interface TradeData {
    timestamp: string;
    symbol: string;
    side: BitmexSide;
    size: number;
    price: number;
    tickDirection: TickDirection;
    trdMatchID: string;
    grossValue: number;
    homeNotional: number;
    foreignNotional: number;
}

export interface TradeMessage extends DataMessage {
    table: 'trade';
    data: TradeData[];
}
