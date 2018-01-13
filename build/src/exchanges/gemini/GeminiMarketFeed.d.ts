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
import { ExchangeFeed } from '../ExchangeFeed';
import * as GI from './GeminiInterfaces';
export declare class GeminiMarketFeed extends ExchangeFeed {
    readonly owner: string;
    readonly feedUrl: string;
    private productId;
    private ccxtProductId;
    constructor(config: GI.GeminiMarketFeedConfig);
    protected handleMessage(msg: string): void;
    protected onOpen(): void;
    private processUpdate(update);
    private createSnapshotMessage(update);
    private processTrade(event, update);
    private processChange(event, update);
    private processAuction(event, update);
}
