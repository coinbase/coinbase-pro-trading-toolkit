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
import * as assert from 'assert';
import { delay, eachParallelAndFinish, eachSeries, tryUntil } from '../../src/utils/promises';

describe('Promise utilities', () => {

    describe('delay', () => {
        it('returns a promise for a delay', async () => {
            const start = Date.now();
            await delay(500);
            assert.ok(Date.now() - start > 400);
        });
    });

    describe('eachSeries', () => {
        it('gracefully handles empty array', async () => {
            await eachSeries([], (x) => delay(x));
        });

        it('waits for each function to complete before executing the next', async () => {
            let s = '';
            const iterator: (x: number) => Promise<string> = async (x: number) => {
                await delay(x);
                return s += 2 * x;
            };
            const start = Date.now();
            await eachSeries([20, 40, 60], iterator);
            assert.ok(Date.now() - start >= 120);
            assert.equal(s, '4080120');
        });
    });

    describe('eachParallelAndFinish', () => {
        it('runs tasks in parallel', async () => {
            const iterator: (x: number) => Promise<number> = async (x: number) => {
                await delay(x);
                return 2 * x;
            };
            const start = Date.now();
            const result = await eachParallelAndFinish([10, 20, 40, 100], iterator);
            const elapsed = Date.now() - start;
            assert.ok(elapsed > 99 && elapsed < 110, `Call took ${elapsed}ms`);
            assert.deepEqual(result, [20, 40, 80, 200]);
        });

        it('collects errors', async () => {
            const iterator: (x: number) => Promise<number> = async (x: number) => {
                if (x % 2 === 1) {
                    throw new Error(`${x} is odd`);
                }
                await delay(x);
                return x;
            };
            const start = Date.now();
            const result = await eachParallelAndFinish([5, 10, 155, 20], iterator);
            const elapsed = Date.now() - start;
            assert.ok(elapsed > 15 && elapsed < 25, `Call took ${elapsed}ms`);
            assert.equal((result[0] as Error).message, '5 is odd');
            assert.equal((result[2] as Error).message, '155 is odd');
            assert.equal(result[1], 10);
            assert.equal(result[3], 20);
        });
    });

    describe('tryUntil', () => {
        let attempts = 0;
        const iterator = (v: any) => {
            attempts++;
            if (v.reject) {
                return Promise.reject(new Error(v.value));
            }
            return v.result ? Promise.resolve(v.value) : Promise.resolve(false);
        };

        beforeEach(() => {
            attempts = 0;
        });

        it('resolves with result at first success', async () => {
            const trials = [
                { result: false, value: 10 },
                { result: false, value: 20 },
                { result: true, value: 30 },
                { result: false, value: 40 }
            ];
            const result = await tryUntil(trials, iterator);
            assert.equal(result, 30);
            assert.equal(attempts, 3);
        });

        it('resolves as false if no successes', async () => {
            const trials = [
                { result: false, value: 10 },
                { result: false, value: 20 },
                { result: false, value: 30 },
                { result: false, value: 40 }
            ];
            const result = await tryUntil(trials, iterator);
            assert.equal(result, false);
            assert.equal(attempts, 4);
        });

        it('resolves with result even with errors', async () => {
            const trials = [
                { result: false, value: 10 },
                { result: false, value: 20, reject: true },
                { result: false, value: 30 },
                { result: true, value: 40 }
            ];
            const result = await tryUntil(trials, iterator);
            assert.equal(result, 40);
            assert.equal(attempts, 4);
        });

        it('resolves as false with errors', async () => {
            const trials = [
                { result: false, value: 10 },
                { result: false, value: 20, reject: true },
                { result: false, value: 30 },
                { result: false, value: 40, reject: true }
            ];
            const result = await tryUntil(trials, iterator);
            assert.equal(result, false);
            assert.equal(attempts, 4);
        });
    });
});
