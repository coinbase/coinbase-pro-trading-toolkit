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
const types_1 = require("../../src/lib/types");
const BigArray_1 = require("../../src/lib/BigArray");
const assert = require('assert');
const arr = [types_1.Big(2), types_1.Big(4), types_1.Big(6), types_1.Big(8)];
describe('BigArray', () => {
    describe('general', () => {
        let A;
        beforeEach(() => {
            A = new BigArray_1.default([2, 4, 6, 8]);
        });
        it('must wrap an array', () => {
            assert.throws(() => {
                // tslint:disable-next-line:no-unused-expression
                new BigArray_1.default(5);
            });
        });
        it('tests equality', () => {
            let B = new BigArray_1.default([2, 4, 6, 8]);
            assert.ok(A.equals(B));
            assert.deepEqual(A.values, arr);
            B = new BigArray_1.default([2, 4, 6]);
            assert(!A.equals(B));
            B = new BigArray_1.default([2, 4, 6, 8, 10]);
            assert(!A.equals(B));
            B = new BigArray_1.default([2, 4, 8, 8]);
            assert(!A.equals(B));
            A = new BigArray_1.default([]);
            B = new BigArray_1.default([]);
            assert(A.equals(B));
        });
        it('wraps an array', () => {
            assert.deepEqual(A.values, arr);
        });
        it('defines a length', () => {
            assert.equal(A.length, 4);
        });
        it('calculates the inverse', () => {
            assert(A.inv().equals(new BigArray_1.default([0.5, 0.25, types_1.Big(1).div(6), 0.125])));
        });
        it('calculates the sum', () => {
            assert.equal(A.sum().valueOf(), '20');
        });
        it('calculates sum to 1', () => {
            assert.equal(A.sumTo(1), 6);
        });
        it('sum_to 0', () => {
            assert.equal(A.sumTo(0), 2);
        });
        it('sum_to -1 returns 0', () => {
            assert.equal(A.sumTo(-1), 0);
        });
        it('sum to large number is sum', () => {
            assert.equal(A.sumTo(8), 20);
        });
        it('returns a cumulative sum array', () => {
            assert(A.cumsum().equals(new BigArray_1.default([2, 6, 12, 20])));
        });
        it('clones a wrapper', () => {
            const B = BigArray_1.default.copy(A);
            assert(B.values !== A.values);
            assert.deepEqual(B.values, A.values);
        });
        it('multiplies 2 arrays', () => {
            const B = new BigArray_1.default([-1, 2, 0, 5]);
            assert.deepEqual(A.mult(B).values, new BigArray_1.default([-2, 8, 0, 40]).values);
        });
        it('divides 2 arrays', () => {
            const B = new BigArray_1.default([2, 1, 3, 4]);
            assert.deepEqual(A.div(B).values, new BigArray_1.default([1, 4, 2, 2]).values);
        });
        it('divide by zero returns infinity', () => {
            const B = new BigArray_1.default([1, 1, 1, 0]);
            assert.ok(!A.div(B).values[3].isFinite());
        });
        it('throws an error if multiplying different length arrays', () => {
            const B = new BigArray_1.default([-1, 2, 0]);
            assert.throws(() => {
                A.mult(B);
            });
            assert.throws(() => {
                B.mult(A);
            });
        });
        it('throws an error if mapping an unsupported operation', () => {
            assert.throws(() => A.apply('floogle'));
        });
        it('throws an error if mapping doesn\'t get a function', () => {
            assert.throws(() => A.map([1, 2, 3]));
        });
        it('can apply a function to the array', () => {
            const B = A.map((x) => x.pow(2));
            assert.deepEqual(B.values, new BigArray_1.default([4, 16, 36, 64]).values);
        });
        it('multiples a scalar', () => {
            assert.deepEqual(A.mult(3).values, new BigArray_1.default([6, 12, 18, 24]).values);
        });
        it('adds two arrays', () => {
            const B = new BigArray_1.default([6, 4, 3, 2]);
            assert.deepEqual(A.add(B).values, new BigArray_1.default([8, 8, 9, 10]).values);
        });
        it('adds a scalar', () => {
            assert.deepEqual(A.add(3).values, new BigArray_1.default([5, 7, 9, 11]).values);
        });
    });
    describe('static methods', () => {
        it('new BigArray is a shortcut function for a new wrapper', () => {
            const A = new BigArray_1.default([2, 4, 6, 8]);
            assert(A instanceof BigArray_1.default);
            assert.deepEqual(A.values, arr);
        });
        it('creates a random array', () => {
            const A = BigArray_1.default.random(5);
            assert.equal(A.length, 5);
        });
        it('creates ones', () => {
            const A = BigArray_1.default.ones(5);
            assert.deepEqual(A.values, new BigArray_1.default([1, 1, 1, 1, 1]).values);
        });
        it('creates zeros', () => {
            const A = BigArray_1.default.zeros(5);
            assert.deepEqual(A.values, new BigArray_1.default([0, 0, 0, 0, 0]).values);
        });
    });
    describe('Arithmetic properties', () => {
        it('addition & multiplication are commutative', () => {
            for (let i = 0; i < 100; i++) {
                const A = BigArray_1.default.random(5);
                const B = BigArray_1.default.random(5);
                assert(A.add(B).equals(B.add(A)));
                assert(A.mult(B).equals(B.mult(A)));
            }
        });
        it('multiplication is associative', () => {
            for (let i = 0; i < 100; i++) {
                const A = BigArray_1.default.random(10);
                const B = BigArray_1.default.random(10);
                const C = BigArray_1.default.random(10);
                assert(A.mult(B.add(C)).equals(A.mult(B).add(A.mult(C))));
            }
        });
        it('1 / ( 1 / A ) === A', () => {
            for (let i = 0; i < 100; i++) {
                const A = BigArray_1.default.random(10);
                assert(A.inv().inv().equals(A));
            }
        });
    });
});
//# sourceMappingURL=BigArrayTest.js.map