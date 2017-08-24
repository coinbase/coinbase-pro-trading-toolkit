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

export interface BitfinexTickerMessage {
    channel_id: string;
    bid: string;
    bid_size: string;
    ask: string;
    ask_size: string;
    daily_change: string;
    daily_change_perc: string;
    last_price: string;
    volume: string;
    high: string;
    low: string;
}

export interface BitfinexOrderMessage {
    channel_id?: string;
    price: string;
    count: number;
    size: string;
}

export interface BitfinexOrderbookSnapshot {
    channel_id: string;
    orders: BitfinexOrderMessage[];
}

export interface BitfinexTradeMessage {
    channel_id?: string;
    trade_id?: string;
    sequence: string;
    timestamp: Date;
    price: string;
    size: string;
}

export interface BitfinexTradeSnapshot {
    channel_id: string;
    trades: BitfinexTradeMessage[];
}
