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
export declare class GTTError extends Error implements StreamError {
    readonly cause: Error;
    readonly time: Date;
    constructor(msg: string, err?: Error);
    asMessage(): ErrorMessage;
}
/**
 * Errors raised or captured as a result of errors coming from external network sources, such as WS Feeds or REST APIs
 */
export declare class APIError extends Error implements StreamError {
    readonly cause: any;
    readonly time: Date;
    constructor(msg: string, cause: any);
    asMessage(): ErrorMessage;
}
export interface ResponseLike {
    status: number;
    body: any;
}
/**
 * Errors raised due to failures from REST API calls. The response status and body are returned in the `cause` object.
 */
export declare class HTTPError extends Error implements StreamError {
    readonly response: ResponseLike;
    readonly time: Date;
    constructor(msg: string, res: ResponseLike);
    asMessage(): HTTPErrorMessage;
}
export declare function extractResponse(res: ResponseLike): ResponseLike;
