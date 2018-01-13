"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**********************************************************************************************************************
 * @license                                                                                                           *
 * Copyright 2018 Coinbase, Inc.                                                                                      *
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
const assert = require("assert");
const promises_1 = require("../../src/utils/promises");
describe('Promise utilities', () => {
    describe('delay', () => {
        it('returns a promise for a delay', () => __awaiter(this, void 0, void 0, function* () {
            const start = Date.now();
            yield promises_1.delay(500);
            assert.ok(Date.now() - start > 400);
        }));
    });
    describe('eachSeries', () => {
        it('gracefully handles empty array', () => __awaiter(this, void 0, void 0, function* () {
            yield promises_1.eachSeries([], (x) => promises_1.delay(x));
        }));
        it('waits for each function to complete before executing the next', () => __awaiter(this, void 0, void 0, function* () {
            let s = '';
            const iterator = (x) => __awaiter(this, void 0, void 0, function* () {
                yield promises_1.delay(x);
                return s += 2 * x;
            });
            const start = Date.now();
            yield promises_1.eachSeries([20, 40, 60], iterator);
            assert.ok(Date.now() - start > 120);
            assert.equal(s, '4080120');
        }));
    });
    describe('eachParallelAndFinish', () => {
        it('runs tasks in parallel', () => __awaiter(this, void 0, void 0, function* () {
            const iterator = (x) => __awaiter(this, void 0, void 0, function* () {
                yield promises_1.delay(x);
                return 2 * x;
            });
            const start = Date.now();
            const result = yield promises_1.eachParallelAndFinish([10, 20, 40, 100], iterator);
            const elapsed = Date.now() - start;
            assert.ok(elapsed > 99 && elapsed < 110, `Call took ${elapsed}ms`);
            assert.deepEqual(result, [20, 40, 80, 200]);
        }));
        it('collects errors', () => __awaiter(this, void 0, void 0, function* () {
            const iterator = (x) => __awaiter(this, void 0, void 0, function* () {
                if (x % 2 === 1) {
                    throw new Error(`${x} is odd`);
                }
                yield promises_1.delay(x);
                return x;
            });
            const start = Date.now();
            const result = yield promises_1.eachParallelAndFinish([5, 10, 155, 20], iterator);
            const elapsed = Date.now() - start;
            assert.ok(elapsed > 15 && elapsed < 25, `Call took ${elapsed}ms`);
            assert.equal(result[0].message, '5 is odd');
            assert.equal(result[2].message, '155 is odd');
            assert.equal(result[1], 10);
            assert.equal(result[3], 20);
        }));
    });
    describe('tryUntil', () => {
        let attempts = 0;
        const iterator = (v) => {
            attempts++;
            if (v.reject) {
                return Promise.reject(new Error(v.value));
            }
            return v.result ? Promise.resolve(v.value) : Promise.resolve(false);
        };
        beforeEach(() => {
            attempts = 0;
        });
        it('resolves with result at first success', () => __awaiter(this, void 0, void 0, function* () {
            const trials = [
                { result: false, value: 10 },
                { result: false, value: 20 },
                { result: true, value: 30 },
                { result: false, value: 40 }
            ];
            const result = yield promises_1.tryUntil(trials, iterator);
            assert.equal(result, 30);
            assert.equal(attempts, 3);
        }));
        it('resolves as false if no successes', () => __awaiter(this, void 0, void 0, function* () {
            const trials = [
                { result: false, value: 10 },
                { result: false, value: 20 },
                { result: false, value: 30 },
                { result: false, value: 40 }
            ];
            const result = yield promises_1.tryUntil(trials, iterator);
            assert.equal(result, false);
            assert.equal(attempts, 4);
        }));
        it('resolves with result even with errors', () => __awaiter(this, void 0, void 0, function* () {
            const trials = [
                { result: false, value: 10 },
                { result: false, value: 20, reject: true },
                { result: false, value: 30 },
                { result: true, value: 40 }
            ];
            const result = yield promises_1.tryUntil(trials, iterator);
            assert.equal(result, 40);
            assert.equal(attempts, 4);
        }));
        it('resolves as false with errors', () => __awaiter(this, void 0, void 0, function* () {
            const trials = [
                { result: false, value: 10 },
                { result: false, value: 20, reject: true },
                { result: false, value: 30 },
                { result: false, value: 40, reject: true }
            ];
            const result = yield promises_1.tryUntil(trials, iterator);
            assert.equal(result, false);
            assert.equal(attempts, 4);
        }));
    });
});
//# sourceMappingURL=promisesTest.js.map