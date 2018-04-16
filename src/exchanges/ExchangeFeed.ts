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
import { createHmac } from 'crypto';
import WebSocket = require('ws');
import Timer = NodeJS.Timer;
import { sanitizeMessage } from '../core/Messages';

export class ExchangeFeedConfig {
    wsUrl: string;
    logger: Logger;
    auth?: ExchangeAuthConfig;
}

// hooks for replacing libraries if desired
export const hooks = {
    WebSocket: WebSocket
};

export abstract class ExchangeFeed extends Readable {
    protected readonly auth: ExchangeAuthConfig;
    protected url: string;
    protected _isConnecting: boolean;
    // keys in this list will be sanitised in log messages
    protected readonly sensitiveKeys: string[];
    private lastHeartBeat: number = -1;
    private connectionChecker: Timer = null;
    private socket: WebSocket;
    private readonly _logger: Logger;

    constructor(config: ExchangeFeedConfig) {
        super({ objectMode: true, highWaterMark: 1024 });
        this._logger = config.logger;
        this.url = config.wsUrl;
        this._isConnecting = false;
        this.auth = this.validateAuth(config.auth);
        this.sensitiveKeys = ['key', 'secret', 'signature'];
    }

    get logger(): Logger {
        return this._logger;
    }

    log(level: string, message: string, meta?: any) {
        if (!this._logger) {
            return;
        }
        if (meta && typeof meta === 'object') {
            meta = sanitizeMessage(meta, this.sensitiveKeys);
        }
        this._logger.log(level, message, meta);
    }

    isConnected(): boolean {
        return this.socket && this.socket.readyState === 1;
    }

    isConnecting(): boolean {
        return this._isConnecting;
    }

    reconnect(delay: number) {
        this._logger.log('debug', `Reconnecting to ${this.url} ${this.auth ? '(authenticated)' : ''} in ${delay * 0.001} seconds...`);
        // If applicable, close the current socket first
        if (this.socket && this.socket.readyState < 2) {
            this._logger.log('debug', 'Closing existing socket prior to reconnecting to ' + this.url);
            this.close();
        }
        setTimeout(() => {
            // Force a reconnect
            this._isConnecting = false;
            this.connect();
        }, delay);
    }

    disconnect() {
        if (!this.isConnected()) {
            return;
        }
        this.close();
    }

    _read(_size: number) {
        // This is not an on-demand service. For that, I refer you to Netflix. Data gets pushed to the queue as it comes
        // in from the websocket, so there's nothing to do here.
    }

    protected connect() {
        if (this._isConnecting || this.isConnected()) {
            return;
        }
        this._isConnecting = true;
        const socket = new hooks.WebSocket(this.url);
        socket.on('message', (msg: any) => this.handleMessage(msg));
        socket.on('open', () => this.onNewConnection());
        socket.on('close', (code: number, reason: string) => this.onClose(code, reason));
        socket.on('error', (err: Error) => this.onError(err));
        socket.on('connection', () => {
            this.emit('websocket-connection');
        });
        this.socket = socket;
        this.lastHeartBeat = -1;
        this.connectionChecker = setInterval(() => this.checkConnection(30 * 1000), 5 * 1000);
    }

    protected abstract get owner(): string;

    protected abstract handleMessage(msg: string): void;

    protected abstract onOpen(): void;

    protected onClose(_code: number, _reason: string): void {
        this.emit('websocket-closed');
        this.socket = null;
    }

    protected onError(err: Error) {
        this._logger.log(
            'error',
            `The websocket feed to ${this.url} ${this.auth ? '(authenticated)' : ''} has reported an error. If necessary, we will reconnect.`,
            { error: err }
        );
        if (!this.socket || this.socket.readyState !== 1) {
            this.reconnect(15000);
        } else {
            this.resume();
        }
    }

    /**
     * Called by sub-classes to confirm that the connection is still alive
     */
    protected confirmAlive() {
        this.lastHeartBeat = Date.now();
    }

    protected close() {
        if (this.connectionChecker) {
            clearInterval(this.connectionChecker);
            this.connectionChecker = null;
        }
        // We're initiating the socket closure, so don't reconnect
        this.socket.removeAllListeners('close');
        this.socket.removeAllListeners('message');
        this.socket.removeAllListeners('open');
        this.socket.removeAllListeners('close');
        this.socket.removeAllListeners('connection');
        this.socket.close();
    }

    protected onNewConnection() {
        this._isConnecting = false;
        this.log('debug', `Connection to ${this.url} ${this.auth ? '(authenticated)' : ''} has been established.`);
        this.onOpen();
        this.emit('websocket-open');
    }

    /**
     * Check that we have received a heartbeat message within the last period ms
     */
    protected checkConnection(period: number) {
        if (this.lastHeartBeat < 0) {
            return;
        }
        const diff = Date.now() - this.lastHeartBeat;
        if (diff > period) {
            this._logger.log(
                'error',
                `No heartbeat has been received from ${this.url} ${this.auth ? '(authenticated)' : ''} in ${diff} ms. Assuming the connection is dead and reconnecting`
            );
            clearInterval(this.connectionChecker);
            this.connectionChecker = null;
            this.reconnect(2500);
        }
    }

    /**
     * Checks that the auth object provided is fully populated and is valid. Subclasses can override this to provide
     * additional validation steps.
     *
     * This function should return the auth object or `undefined` if it isn't valid.
     */
    protected validateAuth(auth: ExchangeAuthConfig): ExchangeAuthConfig {
        return auth && auth.key && auth.secret ? auth : undefined;
    }

    protected send(msg: any, cb?: (err: Error) => void): void {
        try {
            const msgString = typeof(msg) === 'string' ? msg : JSON.stringify(msg);
            this.log('debug', `Sending message to WS server`, { message: msg });
            this.socket.send(msgString, cb);
        } catch (err) {
            // If there's an error just log and carry on
            this.log('error', 'Could not send message to GDAX WS server because the message was invalid',
                { error: err, message: msg });
        }
    }
}

const feedSources: { [index: string]: ExchangeFeed } = {};

export interface ExchangeFeedConstructor<T extends ExchangeFeed, U extends ExchangeFeedConfig> {
    new (config: U): T;
}

/**
 * Get or create a Websocket feed to a GDAX product. A single connection is maintained per URL + auth combination.
 * Usually you'll connect to the  main GDAX feed by passing in `GDAX_WS_FEED` as the first parameter, but you can create
 * additional feeds to the public sandbox, for example by providing the relevant URL; or creating an authenticated and
 * public feed (although the authenticated feed also carries public messages)
 */
export function getFeed<T extends ExchangeFeed, U extends ExchangeFeedConfig>(type: ExchangeFeedConstructor<T, U>, config: U): T {
    const auth = config.auth && config.auth.key && config.auth.secret ? config.auth : undefined;
    const key = getKey(config.wsUrl, auth);
    const logger = config.logger;
    let feed: T = feedSources[key] as T;
    if (!feed) {
        logger.log('info', `Creating new Websocket connection to ${config.wsUrl} ${auth ? '(authenticated)' : ''}`);
        feed = new type(config);
        feedSources[key] = feed;
    } else {
        logger.log('info', `Using existing GDAX Websocket connection to ${config.wsUrl} ${auth ? '(authenticated)' : ''}`);
    }
    return feed;
}

/**
 * Create a unique key hash based on URL and credentials
 */
export function getKey(wsUrl: string, config: any) {
    const index = new Buffer(`${wsUrl}+${JSON.stringify(config)}`, 'base64');
    return createHmac('sha256', index).digest('base64');
}
