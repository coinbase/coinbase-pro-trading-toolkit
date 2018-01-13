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
/**
 * Glossary of GDAX Websocket messages
 */
export interface GDAXMessage {
    type: string;
    user_id?: string;
}
export interface GDAXChannel {
    name: string;
    product_ids: string[];
}
export interface GDAXErrorMessage extends GDAXMessage {
    type: string;
    message: string;
    reason: string;
}
export interface GDAXProductMessage extends GDAXMessage {
    product_id: string;
}
export interface GDAXSubscriptionsMessage extends GDAXMessage {
    type: string;
    channels: GDAXChannel[];
}
export interface GDAXOpenMessage extends GDAXProductMessage {
    sequence: number;
    time: string;
    order_id: string;
    price: string;
    remaining_size: string;
    side: string;
}
export interface GDAXDoneMessage extends GDAXProductMessage {
    sequence: number;
    time: string;
    price: string;
    order_id: string;
    reason: string;
    side: string;
    remaining_size: string;
}
export interface GDAXMatchMessage extends GDAXProductMessage {
    sequence: number;
    time: string;
    trade_id: string;
    maker_order_id: string;
    taker_order_id: string;
    size: string;
    price: string;
    side: string;
}
export interface GDAXChangeMessage extends GDAXProductMessage {
    sequence: number;
    time: string;
    order_id: string;
    new_size?: string;
    old_size?: string;
    new_funds?: string;
    old_funds?: string;
    price: string;
    side: string;
}
export interface GDAXL2UpdateMessage extends GDAXProductMessage {
    changes: string[][];
}
export interface GDAXTickerMessage extends GDAXProductMessage {
    trade_id: number;
    sequence: number;
    time: string;
    price: string;
    side: string;
    best_bid: string;
    best_ask: string;
    last_size: string;
}
export interface GDAXSnapshotMessage extends GDAXProductMessage {
    bids: string[][];
    asks: string[][];
}
export interface GDAXSubscriptionRequest {
    type: string;
    product_ids: string[];
    channels: string[];
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
    side: string;
    type: string;
    client_oid?: string;
    post_only?: boolean;
    time_in_force?: string;
    cancel_after?: string;
    funds?: string;
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
    side: 'buy' | 'sell';
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
