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

import request = require('superagent');
import crypto = require('crypto');
import Response = request.Response;
import { ExchangeAuthConfig } from './AuthConfig';
import { extractResponse, HTTPError } from '../lib/errors';

/**
 * A generic API response handler.
 * @param req A superagent request object
 * @param meta
 * @returns {Promise<Response>}
 */
export function handleResponse<T>(req: Promise<Response>, _meta: any): Promise<T> {
    return req.then<T>((res: Response) => {
        if (res.status >= 200 && res.status < 300) {
            return res.body as T;
        }
        return Promise.reject(new HTTPError('Error in Bitfinex request', extractResponse(res)));
    }).catch((err) => {
        return Promise.reject(new HTTPError('Error in Bitfinex request', extractResponse(err.response)));
    });
}

export function getSignature(auth: ExchangeAuthConfig, payload: string, algorithm: string = 'sha256'): string {
    return crypto
        .createHmac(algorithm, auth.secret)
        .update(payload)
        .digest('hex');
}
