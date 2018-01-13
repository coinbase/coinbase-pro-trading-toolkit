/// <reference types="bignumber.js" />
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
import { BigJS, Biglike } from './types';
export default class BigArray {
    static copy(a: BigArray): BigArray;
    static random(len: number, max?: Biglike): BigArray;
    static constant(len: number, value: Biglike): BigArray;
    static ones(len: number): BigArray;
    static zeros(len: number): BigArray;
    values: BigJS[];
    private sumArray;
    /**
     * Convert an array of any 'number-compatible' type to an array of Bigs
     * @param arr {BigJS[] | number[] | string[]}
     */
    constructor(arr: Biglike[]);
    equals(b: BigArray): boolean;
    readonly length: number;
    sumTo(i: number): BigNumber.BigNumber;
    sum(): BigNumber.BigNumber;
    cumsum(): BigArray;
    inv(): BigArray;
    mult(B: BigArray | Biglike): BigArray;
    add(B: BigArray | Biglike): BigArray;
    div(B: BigArray | Biglike): BigArray;
    /**
     * Apply op to each element using arg
     * @param op {string}
     * @param arg {BigArray | number | undefined} Optional argument
     * @returns {BigArray}
     */
    apply(op: string, arg?: BigArray | Biglike): BigArray;
    /**
     * Map the scalar function (BigJS) => BigJS to each element in the array
     * @param func {function(BigJS)}
     */
    map(func: (x: BigJS) => BigJS): BigArray;
    private buildSumArray();
}
