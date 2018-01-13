/// <reference types="ws" />
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
import { Readable } from 'stream';
import { Logger } from '../utils/Logger';
import { ExchangeAuthConfig } from './AuthConfig';
import WebSocket = require('ws');
export declare class ExchangeFeedConfig {
    wsUrl: string;
    logger: Logger;
    auth: ExchangeAuthConfig;
}
export declare const hooks: {
    WebSocket: typeof WebSocket;
};
export declare abstract class ExchangeFeed extends Readable {
    protected auth: ExchangeAuthConfig;
    protected url: string;
    protected _isConnecting: boolean;
    protected sensitiveKeys: string[];
    private lastHeartBeat;
    private connectionChecker;
    private socket;
    private _logger;
    constructor(config: ExchangeFeedConfig);
    readonly logger: Logger;
    log(level: string, message: string, meta?: any): void;
    isConnected(): boolean;
    isConnecting(): boolean;
    reconnect(delay: number): void;
    disconnect(): void;
    _read(size: number): void;
    protected connect(): void;
    protected readonly abstract owner: string;
    protected abstract handleMessage(msg: string): void;
    protected abstract onOpen(): void;
    protected onClose(code: number, reason: string): void;
    protected onError(err: Error): void;
    /**
     * Called by sub-classes to confirm that the connection is still alive
     */
    protected confirmAlive(): void;
    protected close(): void;
    protected onNewConnection(): void;
    /**
     * Check that we have received a heartbeat message within the last period ms
     */
    protected checkConnection(period: number): void;
    /**
     * Checks that the auth object provided is fully populated and is valid. Subclasses can override this to provide
     * additional validation steps.
     *
     * This function should return the auth object or `undefined` if it isn't valid.
     */
    protected validateAuth(auth: ExchangeAuthConfig): ExchangeAuthConfig;
    protected send(msg: any, cb?: (err: Error) => void): void;
}
export interface ExchangeFeedConstructor<T extends ExchangeFeed, U extends ExchangeFeedConfig> {
    new (config: U): T;
}
/**
 * Get or create a Websocket feed to a GDAX product. A single connection is maintained per URL + auth combination.
 * Usually you'll connect to the  main GDAX feed by passing in `GDAX_WS_FEED` as the first parameter, but you can create
 * additional feeds to the public sandbox, for example by providing the relevant URL; or creating an authenticated and
 * public feed (although the authenticated feed also carries public messages)
 */
export declare function getFeed<T extends ExchangeFeed, U extends ExchangeFeedConfig>(type: ExchangeFeedConstructor<T, U>, config: U): T;
/**
 * Create a unique key hash based on URL and credentials
 */
export declare function getKey(wsUrl: string, config: any): string;
