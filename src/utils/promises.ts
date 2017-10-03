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

export type PromiseFactory<T> = () => Promise<T>;

/**
 * Execute an array of promises, waiting for one to complete before starting the next. For this reason, the argument is an array of Promise factories
 * since a promise starts executing as soon as it is created.
 * @param {Promise<T>} tasks
 * @returns {Promise<T[]>}
 */
export function series<T>(taskFactories: PromiseFactory<T>[]): Promise<T[]> {
    const results: T[] = [];
    const last = taskFactories.reduce((prevPromise: Promise<T>, factory: PromiseFactory<T>, i: number) => {
        return prevPromise.then((result: T) => {
            if (i > 0) {
                results.push(result);
            }
            return factory();
        });
    }, Promise.resolve(null));
    return last.then((result: T) => {
        results.push(result);
        return results;
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

export function delayPromise<T>(delay: number, fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve) => {
        setTimeout(() => {
            return fn().then((result: T) => {
                return resolve(result);
            });
        }, delay);
    });
}
