/**********************************************************************************************************************
 * @license                                                                                                           *
 * Copyright 2017 Coinbase, Inc.                                                                                      *
 *                                                                                                                    *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance     *
 * with the License. You may obtain a copy of the License at                                                          *
 *                                                                                                                    *
 * http://www.apache.org/licenses/LICENSE-2.0                                                                         *
 *                                                                                                                    *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on*
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the                 *
 * License for the specific language governing permissions and limitations under the License.                         *
 **********************************************************************************************************************/
import { ErrorMessage, HTTPErrorMessage } from '../core/Messages';

export interface StreamError {
    asMessage: () => ErrorMessage;
}

/**
 * Errors raised as a result of an internal exception raised by GTT code.
 */
export class GTTError extends Error implements StreamError {
    readonly cause: Error;
    readonly time: Date;

    constructor(msg: string, cause?: Error) {
        super(msg);
        this.cause = cause;
        this.time = new Date();
    }

    asMessage(): ErrorMessage {
        return {
            type: 'error',
            time: this.time,
            message: this.message,
            cause: this.cause ? this.cause.message : undefined
        };
    }
}

/**
 * Errors raised or captured as a result of errors coming from external network sources, such as WS Feeds or REST APIs
 */
export class APIError extends Error implements StreamError {
    readonly cause: any;
    readonly time: Date;

    constructor(msg: string, cause: any) {
        super(msg);
        this.cause = cause;
        this.time = new Date();
    }

    asMessage(): ErrorMessage {
        return {
            type: 'error',
            time: this.time,
            message: this.message,
            cause: this.cause
        };
    }
}

export interface ResponseLike {
    status: number;
    body: any;
}

/**
 * Errors raised due to failures from REST API calls. The response status and body are returned in the `cause` object.
 */
export class HTTPError extends Error implements StreamError {
    readonly response: ResponseLike;
    readonly time: Date;

    constructor(msg: string, res: ResponseLike) {
        super(msg);
        this.time = new Date();
        this.response = res || { status: undefined, body: undefined };
    }

    asMessage(): HTTPErrorMessage {
        return {
            type: 'error',
            time: this.time,
            message: this.message,
            cause: {
                status: this.response.status,
                body: this.response.body
            }
        };
    }
}

export function extractResponse(res: ResponseLike): ResponseLike {
    if (!res) {
        return {
            status: undefined,
            body: undefined
        };
    }
    return {
        status: res.status,
        body: res.body
    };
}
