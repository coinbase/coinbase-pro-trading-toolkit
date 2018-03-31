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

import { Side } from '../../lib/sides';

/**
 * Glossary of GDAX Websocket messages
 */

export interface OptionalUserId {
    user_id?: string; // Authenticated messages only
}

export interface GDAXChannel {
    name: string;
    product_ids: string[];
}

export interface GDAXErrorMessage extends OptionalUserId {
    type: 'error';
    message: string;
    reason: string;
}

export interface ProductIdAndOptionalUserId extends OptionalUserId {
    product_id: string;
}

export interface GDAXHeartbeatMessage extends ProductIdAndOptionalUserId {
    type: 'heartbeat';
    last_trade_id: number;
    sequence: number;
    time: string;
}

export interface GDAXSubscriptionsMessage extends OptionalUserId {
    type: 'subscriptions';
    channels: GDAXChannel[];
}

export interface GDAXReceivedMessage extends ProductIdAndOptionalUserId {
    type: 'received';
    sequence: number;
    time: string;
    client_oid: string;
    order_id: string;
    order_type: 'limit' | 'market' | 'stop';
    price: string;
    size: string;
    side: Side;
}

export interface GDAXOpenMessage extends ProductIdAndOptionalUserId {
    type: 'open';
    sequence: number;
    time: string;
    order_id: string;
    price: string;
    remaining_size: string;
    side: Side;
}

export interface GDAXDoneMessage extends ProductIdAndOptionalUserId {
    type: 'done';
    sequence: number;
    time: string;
    price: string;
    order_id: string;
    reason: string;
    side: Side;
    remaining_size: string;
}

export interface GDAXMatchMessage extends ProductIdAndOptionalUserId {
    type: 'match';
    sequence: number;
    time: string;
    trade_id: string;
    maker_order_id: string;
    taker_order_id: string;
    maker_user_id?: string;
    taker_user_id?: string;
    size: string;
    price: string;
    side: Side;
}

export interface GDAXChangeMessage extends ProductIdAndOptionalUserId {
    type: 'change';
    sequence: number;
    time: string;
    order_id: string;
    new_size?: string;
    old_size?: string;
    new_funds?: string;
    old_funds?: string;
    price: string;
    side: Side;
}

export interface GDAXL2UpdateMessage extends ProductIdAndOptionalUserId {
    type: 'l2update';
    changes: [Side, string, string][]; // [ [ side, price, newSize ] ]
}

export interface GDAXTickerMessage extends ProductIdAndOptionalUserId {
    type: 'ticker';
    trade_id: number;
    sequence: number;
    time: string;
    price: string;
    side: Side;
    best_bid: string;
    best_ask: string;
    last_size: string;
    volume_24h: string;
}

export interface GDAXSnapshotMessage extends ProductIdAndOptionalUserId {
    type: 'snapshot';
    bids: [string, string][]; // [ [price, size] ]
    asks: [string, string][]; // [ [price, size] ]
}

export type GDAXMessage =
    GDAXErrorMessage |
    GDAXHeartbeatMessage |
    GDAXSubscriptionsMessage |
    GDAXReceivedMessage |
    GDAXOpenMessage |
    GDAXDoneMessage |
    GDAXMatchMessage |
    GDAXChangeMessage |
    GDAXL2UpdateMessage |
    GDAXTickerMessage |
    GDAXSnapshotMessage;

const GDAX_MESSAGE_TYPES: ReadonlySet<string> = new Set(['error',
                                                         'heartbeat',
                                                         'subscriptions',
                                                         'received',
                                                         'open',
                                                         'done',
                                                         'match',
                                                         'change',
                                                         'l2update',
                                                         'ticker',
                                                         'snapshot']);

export function isGDAXMessage(msg: any): msg is GDAXMessage {
    return GDAX_MESSAGE_TYPES.has(msg.type);
}

export interface GDAXSubscriptionRequest {
    type: string;
    product_ids: string[];
    channels: string[]; // one of level2, matches, ticker, user, heartbeat
}

export interface GDAXTickerRequest {
    type: string;
    product_id: string;
}

/**
 * The interface for new order requests
 */
export interface GDAXOrderRequest {
    product_id: string;
    size: string;
    price: string;
    side: Side;
    type: string;
    client_oid?: string;
    post_only?: boolean;
    time_in_force?: string;
    cancel_after?: string;
    funds?: string;  // ignored for limit orders. if specified for market or stop orders, size is ignored
}

/**
 * The interface for a *user-placed order* (i.e. my orders). All GDAX fields are provided and numeric fields are given
 * as strings to maintain precision
 */
export interface GDAXOrder {
    id: string;
    product_id: string;
    size: string;
    price: string;
    side: Side;
    post_only?: boolean;
    time_in_force?: string;
    status?: string;
    settled?: boolean;
    done_reason?: string;
    filled_size?: string;
    executed_value?: string;
    fill_fees?: string;
    created_at?: string;
    done_at?: string;
}
