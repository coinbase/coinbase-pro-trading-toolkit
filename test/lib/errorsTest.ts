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

import assert = require('assert');
import { APIError, GTTError, HTTPError, ResponseLike } from '../../src/lib/errors';
import { ErrorMessage } from '../../src/core/Messages';

describe('Errors', () => {
    describe('GTTError', () => {
        it('accepts an error as metadata', () => {
            const cause = new Error('a bug');
            const err = new GTTError('GTT Error Test 1', cause);
            const msg: ErrorMessage = err.asMessage();
            assert.equal(msg.type, 'error');
            assert.ok(msg.time);
            assert.equal(msg.message, 'GTT Error Test 1');
            assert.deepEqual(msg.cause, cause);
        });

        it('behaves like a standard error', () => {
            const err = new GTTError('GTT Error Test 2');
            const msg: ErrorMessage = err.asMessage();
            assert.equal(msg.type, 'error');
            assert.ok(msg.time);
            assert.equal(msg.message, 'GTT Error Test 2');
            assert.equal(msg.cause, undefined);
        });
    });

    describe('APIError', () => {
        it('accepts a meta', () => {
            const meta = { reason: 'That thing' };
            const err = new APIError('API Error Test 1', null, meta);
            const msg: ErrorMessage = err.asMessage();
            assert.equal(msg.type, 'error');
            assert.ok(msg.time);
            assert.equal(msg.message, 'API Error Test 1');
            assert.deepEqual(msg.cause, null);
            assert.deepEqual(msg.meta, meta);
        });

        it('accepts a cause', () => {
            const cause = new Error('That thing');
            const err = new APIError('API Error Test 2', cause);
            const msg: ErrorMessage = err.asMessage();
            assert.equal(msg.type, 'error');
            assert.ok(msg.time);
            assert.equal(msg.message, 'API Error Test 2');
            assert.deepEqual(msg.cause, cause);
            assert.deepEqual(msg.meta, null);
        });

        it('acts like a standard Error', () => {
            const err = new APIError('API Error Test 3', null);
            const msg: ErrorMessage = err.asMessage();
            assert.equal(msg.type, 'error');
            assert.ok(msg.time);
            assert.equal(msg.message, 'API Error Test 3');
            assert.deepEqual(msg.cause, null);
            assert.deepEqual(msg.meta, null);
        });
    });

    describe('HTTPError', () => {
        it('accepts a response', () => {
            const response: ResponseLike = {
                status: 403, body: {
                    message: 'Invalid API key'
                }
            };
            const err = new HTTPError('HTTP Error Test 1', response);
            const msg: ErrorMessage = err.asMessage();
            assert.equal(msg.type, 'error');
            assert.ok(msg.time);
            assert.equal(msg.message, 'HTTP Error Test 1');
            assert.deepEqual(msg.meta.status, 403);
            assert.deepEqual(msg.meta.body.message, 'Invalid API key');
        });

        it('accepts a response and a cause', () => {
            const cause = new Error('Unit test');
            const response: ResponseLike = {
                status: 403, body: {
                    message: 'Invalid API key'
                }
            };
            const err = new HTTPError('HTTP Error Test 2', response, cause);
            const msg: ErrorMessage = err.asMessage();
            assert.equal(msg.type, 'error');
            assert.ok(msg.time);
            assert.equal(msg.message, 'HTTP Error Test 2');
            assert.deepEqual(msg.meta.status, 403);
            assert.deepEqual(msg.meta.body.message, 'Invalid API key');
            assert.strictEqual(err.cause, cause);
        });

        it('accepts a null response and a non-null cause', () => {
            const cause = new Error('Unit test');
            const err = new HTTPError('HTTP Error Test 3', null, cause);
            const msg: ErrorMessage = err.asMessage();
            assert.equal(msg.type, 'error');
            assert.ok(msg.time);
            assert.equal(msg.message, 'HTTP Error Test 3');
            assert.deepEqual(msg.meta.status, undefined);
            assert.deepEqual(msg.meta.body, undefined);
            assert.strictEqual(err.cause, cause);
        });
    });
});
