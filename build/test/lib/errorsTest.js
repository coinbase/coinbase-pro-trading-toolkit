"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const errors_1 = require("../../src/lib/errors");
describe('Errors', () => {
    describe('GTTError', () => {
        it('accepts an error as metadata', () => {
            const err = new errors_1.GTTError('GTT Error Test 1', new Error('a bug'));
            const msg = err.asMessage();
            assert.equal(msg.type, 'error');
            assert.ok(msg.time);
            assert.equal(msg.message, 'GTT Error Test 1');
            assert.equal(msg.cause, 'a bug');
        });
        it('behaves like a standard error', () => {
            const err = new errors_1.GTTError('GTT Error Test 2');
            const msg = err.asMessage();
            assert.equal(msg.type, 'error');
            assert.ok(msg.time);
            assert.equal(msg.message, 'GTT Error Test 2');
            assert.equal(msg.cause, undefined);
        });
    });
    describe('APIError', () => {
        it('accepts a cause', () => {
            const cause = { reason: 'That thing' };
            const err = new errors_1.APIError('API Error Test 1', cause);
            const msg = err.asMessage();
            assert.equal(msg.type, 'error');
            assert.ok(msg.time);
            assert.equal(msg.message, 'API Error Test 1');
            assert.deepEqual(msg.cause, cause);
        });
        it('acts like a standard Error', () => {
            const err = new errors_1.APIError('API Error Test 2', null);
            const msg = err.asMessage();
            assert.equal(msg.type, 'error');
            assert.ok(msg.time);
            assert.equal(msg.message, 'API Error Test 2');
            assert.deepEqual(msg.cause, null);
        });
    });
    describe('HTTPError', () => {
        it('accepts a response', () => {
            const response = {
                status: 403, body: {
                    message: 'Invalid API key'
                }
            };
            const err = new errors_1.HTTPError('HTTP Error Test 1', response);
            const msg = err.asMessage();
            assert.equal(msg.type, 'error');
            assert.ok(msg.time);
            assert.equal(msg.message, 'HTTP Error Test 1');
            assert.deepEqual(msg.cause.status, 403);
            assert.deepEqual(msg.cause.body.message, 'Invalid API key');
        });
        it('accepts a null response', () => {
            const err = new errors_1.HTTPError('HTTP Error Test 2', null);
            const msg = err.asMessage();
            assert.equal(msg.type, 'error');
            assert.ok(msg.time);
            assert.equal(msg.message, 'HTTP Error Test 2');
            assert.deepEqual(msg.cause.status, undefined);
            assert.deepEqual(msg.cause.body, undefined);
        });
    });
});
//# sourceMappingURL=errorsTest.js.map