"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
const errors_1 = require("../lib/errors");
/**
 * A generic API response handler.
 * @param req A superagent request object
 * @param meta
 * @returns {Promise<Response>}
 */
function handleResponse(req, meta) {
    return req.then((res) => {
        if (res.status >= 200 && res.status < 300) {
            return Promise.resolve(res.body);
        }
        return Promise.reject(new errors_1.HTTPError('Error in Bitfinex request', errors_1.extractResponse(res)));
    }).catch((err) => {
        return Promise.reject(new errors_1.HTTPError('Error in Bitfinex request', errors_1.extractResponse(err.response)));
    });
}
exports.handleResponse = handleResponse;
function getSignature(auth, payload, algorithm = 'sha256') {
    return crypto
        .createHmac(algorithm, auth.secret)
        .update(payload)
        .digest('hex');
}
exports.getSignature = getSignature;
//# sourceMappingURL=utils.js.map