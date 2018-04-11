/* tslint:disable:max-classes-per-file */

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
 * Base class for all errors.
 */
export class BaseError extends Error implements StreamError {
    readonly cause: undefined | Error;
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
            cause: this.cause
        };
    }
}

/**
 * Errors raised as a result of an internal exception raised by GTT code.
 */
export class GTTError extends BaseError {
    constructor(msg: string, cause?: Error) {
        super(msg, cause);
    }
}

/**
 * Errors raised or captured as a result of errors coming from external network sources, such as WS Feeds or REST APIs
 */
export class APIError extends BaseError {
    readonly meta: any;

    constructor(msg: string, cause?: Error, meta?: any) {
        super(msg, cause);
        this.meta = meta;
    }

    asMessage(): ErrorMessage {
        return {...super.asMessage(),
                meta: this.meta};
    }
}

export interface ResponseLike {
    status: number;
    body: any;
}

/**
 * Errors raised due to failures from REST API calls. The response
 * status and body are returned in the `response` property or in
 * asMessage()'s `meta` property.
 */
export class HTTPError extends BaseError {
    readonly response: ResponseLike;

    constructor(msg: string, res: ResponseLike, cause?: Error) {
        super(msg, cause);
        this.response = res || { status: undefined, body: undefined };
    }

    asMessage(): HTTPErrorMessage {
        return {...super.asMessage(),
                meta: this.response};
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
