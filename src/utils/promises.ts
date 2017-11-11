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

export function delay(time: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
}

/**
 * Apply each argument in arr to iteratorFn, waiting for the promise to resolve before continuing
 */
export function eachSeries<T>(arr: T[], iteratorFn: (arg: T) => Promise<any>) {
    return arr.reduce((prev, item) => {
        return prev.then(() => {
            return iteratorFn(item);
        });
    }, Promise.resolve());
}

/**
 * Apply each argument in arr to iteratorFn in parallel, and return all results. If any of the
 * promises reject, the process will continue, with the promises that failed returning an Error.
 */
export function eachParallelAndFinish<T, U>(arr: T[], iteratorFn: (arg: T) => Promise<U>): Promise<(U | Error)[]> {
    const result: (U | Error)[] = [];
    let itemsLeft = arr.length;
    return new Promise((resolve) => {
        arr.forEach((item: T, i: number) => {
            iteratorFn(item).then((val: U) => {
                result[i] = val;
                if (--itemsLeft === 0) {
                    return resolve(result);
                }
            }).catch((err: Error) => {
                result[i] = err;
                if (--itemsLeft === 0) {
                    return resolve(result);
                }
            });
        });
    });
}

/**
 * Applies iteratorFn to each element in arr until a 'true' result is returned. Rejected promises are swallowed. A false result is returned only
 * if every iteratorFn(i) returns false or an Error
 */
export function tryUntil<T, U>(arr: T[], iteratorFn: (arg: T) => Promise<U | boolean>, index: number = 0): Promise<U | boolean> {
    if (arr.length < 1) {
        return Promise.resolve(false);
    }
    return iteratorFn(arr[index]).then((result: U | boolean) => {
       if (result !== false) {
           return Promise.resolve(result);
       }
       if (++index >= arr.length) {
           return Promise.resolve(false);
       }
       return tryUntil(arr, iteratorFn, index);
    }).catch(() => {
        // Swallow the error and continue
        const clone: T[] = arr.slice();
        return tryUntil(clone.splice(0,1), iteratorFn);
    });
}
