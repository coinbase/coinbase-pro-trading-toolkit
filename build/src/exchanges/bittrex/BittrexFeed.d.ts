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
export declare class BittrexFeed extends ExchangeFeed {
    private client;
    private connection;
    private counters;
    constructor(config: ExchangeFeedConfig);
    readonly owner: string;
    subscribe(products: string[]): Promise<boolean>;
    protected connect(): void;
    protected handleMessage(msg: any): void;
    protected onOpen(): void;
    protected onClose(code: number, reason: string): void;
    protected close(): void;
    private nextSequence(product);
    private setSnapshotSequence(product, sequence);
    private getSnapshotSequence(product);
    private processMessage(message);
    private updateExchangeState(states);
    private updateTickers(tickers);
    private processSnapshot(product, state);
}
