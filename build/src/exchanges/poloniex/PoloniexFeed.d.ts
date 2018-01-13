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
import { ExchangeFeed, ExchangeFeedConfig } from '../ExchangeFeed';
import { ChannelSubscription } from './PoloniexMessages';
export interface PoloniexFeedConfig extends ExchangeFeedConfig {
    tickerChannel: boolean;
}
export declare class PoloniexFeed extends ExchangeFeed {
    private tickerChannel;
    private pinger;
    private subscriptions;
    constructor(config: PoloniexFeedConfig);
    subscribe(channel: number): void;
    unsubscribe(channel: number): void;
    resubscribe(channel: number): void;
    getSubscriptions(): ChannelSubscription[];
    protected readonly owner: string;
    protected handleMessage(message: string): void;
    protected clear_pinger(): void;
    protected onOpen(): void;
    protected onClose(code: number, reason: string): void;
    private handle_user_message(msg);
    private handle_trollbox_message(msg);
    private handle_total_volume_message(msg);
    private handle_ticker_message(msg);
    private handle_unknown_system_message(msg);
    private handle_orderbook_message(msg);
    private createSnapshotMessage(product, sequence, snapshot);
}
