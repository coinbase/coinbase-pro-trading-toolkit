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

import { ExchangeAuthConfig } from '../AuthConfig';
import { Side } from '../../lib/sides';
import { Logger } from '../../utils/Logger';
import { ExchangeFeedConfig } from '../ExchangeFeed';

export interface GeminiConfig {
    apiUrl?: string;
    auth?: ExchangeAuthConfig;
    logger: Logger;
}

export interface GeminiMarketFeedConfig extends ExchangeFeedConfig {
    productId: string;
}

export interface GeminiMessage {
    type: string;
}

export interface GeminiOrderMessage extends GeminiMessage {
    socket_sequence: number;
    order_id: string;
    event_id: string;
    api_session: string;
    client_order_id: string;
    symbol: string;
    side: Side;
    behavior: string;
    order_type: string;
    timestamp: string;
    timestampms: string;
    is_live: boolean;
    is_cancelled: boolean;
    is_hidden: boolean;
    avg_execution_price: string;
    executed_amount: string;
    remaining_amount: string;
    original_amount: string;
    price: string;
    total_spend: string;
}

export interface GeminiAckMessage extends GeminiMessage {
    accountId: number;
    subscriptionId: string;
    symbolFilter: string[];
    apiSessionFilter: string[];
    eventTypeFilter: string[];
}

export interface GeminiHeartbeatMessage extends GeminiMessage {
    timestampms: number;
    sequence: number;
    socket_sequence: number;
    trace_id: string;
}

export interface GeminiUpdateMessage extends GeminiMessage {
    type: 'update';
    socket_sequence: number;
    eventId: string;
    events: GeminiEvent[];
    timestamp: string;
    timestampms: string;
}

export interface GeminiEvent {
    type: string;
}

export interface GeminiChangeEvent extends GeminiEvent {
    type: 'change';
    price: string;
    side: 'bid' | 'ask';
    reason: string;
    remaining: string;
    delta: string;
}

export interface GeminiTradeEvent extends GeminiEvent {
    type: 'trade';
    tid: number;
    price: string;
    amount: string;
    makerSide: 'bid' | 'ask' | 'auction';
}

export interface GeminiAuctionEvent extends GeminiEvent {
    type: 'auction';
}

export interface GeminiAuctionOpenEvent extends GeminiAuctionEvent {
    auction_open_ms: string;
    auction_time_ms: string;
    first_indicative_ms: string;
    last_cancel_time_ms: string;
}

export interface GeminiAuctionIndicativeEvent extends GeminiAuctionEvent {
    result: string;
    event_time_ms: string;
    highest_bid_price: string;
    lowest_ask_price: string;
    eid: number;
    indicative_price: string;
    indicative_quantity: string;
}

export interface GeminiAuctionOutcomeEvent extends GeminiAuctionEvent {
    result: 'success' | 'failure';
    event_time_ms: string;
    highest_bid_price: string;
    eid: number;
    auction_price: string;
    auction_quantity: string;
}
