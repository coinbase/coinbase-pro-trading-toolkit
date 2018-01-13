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
function isStreamMessage(msg) {
    return !!msg.type;
}
exports.isStreamMessage = isStreamMessage;
function isErrorMessage(msg) {
    return isStreamMessage(msg) && !!msg.message && typeof msg.message === 'string';
}
exports.isErrorMessage = isErrorMessage;
function isUnknownMessage(msg) {
    return isStreamMessage(msg) && !!msg.message && typeof msg.message !== 'string';
}
exports.isUnknownMessage = isUnknownMessage;
function isOrderbookMessage(msg) {
    return msg.sequence && msg.productId && msg.side;
}
exports.isOrderbookMessage = isOrderbookMessage;
function isOrderMessage(msg) {
    return msg.orderId && msg.side && msg.price;
}
exports.isOrderMessage = isOrderMessage;
/**
 * Sanitises a message by replacing any keys in the msg object with '***'.
 * Keys are searched recursively.
 * The original message is not modified.
 */
function sanitizeMessage(msg, sensitiveKeys) {
    const clean = {};
    for (const key in msg) {
        if (msg.hasOwnProperty(key)) {
            if (sensitiveKeys.includes(key)) {
                clean[key] = '***';
            }
            else if (typeof msg[key] === 'object') {
                clean[key] = sanitizeMessage(msg[key], sensitiveKeys);
            }
            else {
                clean[key] = msg[key];
            }
        }
    }
    return clean;
}
exports.sanitizeMessage = sanitizeMessage;
//# sourceMappingURL=Messages.js.map