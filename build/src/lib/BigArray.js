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
const types_1 = require("./types");
class BigArray {
    static copy(a) {
        return new BigArray(a.values);
    }
    static random(len, max = 1) {
        const arr = new Array(len);
        const smax = +max;
        for (let i = 0; i < len; i++) {
            arr[i] = types_1.Big((Math.random() * smax).toFixed(10)); // convert to String to force 15 d.p. in constructor
        }
        return new BigArray(arr);
    }
    static constant(len, value) {
        const arr = new Array(len);
        for (let i = 0; i < len; i++) {
            arr[i] = types_1.Big(value);
        }
        return new BigArray(arr);
    }
    static ones(len) {
        return BigArray.constant(len, 1);
    }
    static zeros(len) {
        return BigArray.constant(len, 0);
    }
    /**
     * Convert an array of any 'number-compatible' type to an array of Bigs
     * @param arr {BigJS[] | number[] | string[]}
     */
    constructor(arr) {
        this.values = [];
        this.sumArray = null;
        arr.forEach((val) => {
            this.values.push(types_1.Big(val));
        });
    }
    equals(b) {
        const me = this.values;
        const it = b.values;
        if (it.length !== me.length) {
            return false;
        }
        for (let i = 0; i < me.length; i++) {
            if (!(me[i].eq(it[i]))) {
                return false;
            }
        }
        return true;
    }
    get length() {
        return this.values.length;
    }
    sumTo(i) {
        if (i < 0) {
            return types_1.ZERO;
        }
        if (!this.sumArray) {
            this.buildSumArray();
        }
        const n = this.length;
        return i < n ? this.sumArray.values[i] : this.sumArray.values[n - 1];
    }
    sum() {
        return this.sumTo(this.length - 1);
    }
    cumsum() {
        if (!this.sumArray) {
            this.buildSumArray();
        }
        return this.sumArray;
    }
    inv() {
        const inv = this.values.map((i) => types_1.ONE.div(i));
        return new BigArray(inv);
    }
    mult(B) {
        return this.apply('times', B);
    }
    add(B) {
        return this.apply('plus', B);
    }
    div(B) {
        return this.apply('div', B);
    }
    /**
     * Apply op to each element using arg
     * @param op {string}
     * @param arg {BigArray | number | undefined} Optional argument
     * @returns {BigArray}
     */
    apply(op, arg) {
        const len = this.length;
        const me = this.values;
        const vectorOp = arg && arg instanceof BigArray;
        if (vectorOp && arg.length !== len) {
            throw new Error('BigArray operations on BigArrays must be the same length');
        }
        if (len === 0) {
            return new BigArray([]);
        }
        if (typeof types_1.big.prototype[op] !== 'function') {
            throw new Error('Unsupported BigJS.js operation: ' + op);
        }
        const result = new Array(len);
        let val;
        if (!vectorOp) {
            val = types_1.Big(arg);
        }
        for (let i = 0; i < len; i++) {
            if (vectorOp) {
                val = arg.values[i];
            }
            result[i] = me[i][op](val);
        }
        return new BigArray(result);
    }
    /**
     * Map the scalar function (BigJS) => BigJS to each element in the array
     * @param func {function(BigJS)}
     */
    map(func) {
        if (typeof func !== 'function') {
            throw new Error('func must be a function');
        }
        const result = this.values.map(func);
        return new BigArray(result);
    }
    buildSumArray() {
        const values = this.values;
        const len = this.length;
        const sumArray = new Array(len);
        let total = types_1.ZERO;
        for (let i = 0; i < len; i++) {
            total = total.plus(values[i]);
            sumArray[i] = total;
        }
        this.sumArray = new BigArray(sumArray);
    }
}
exports.default = BigArray;
//# sourceMappingURL=BigArray.js.map