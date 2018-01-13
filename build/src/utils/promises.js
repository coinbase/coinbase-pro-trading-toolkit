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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
function delay(time) {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
}
exports.delay = delay;
/**
 * Apply each argument in arr to iteratorFn, waiting for the promise to resolve before continuing
 */
function eachSeries(arr, iteratorFn) {
    return arr.reduce((prev, item) => {
        return prev.then(() => {
            return iteratorFn(item);
        });
    }, Promise.resolve());
}
exports.eachSeries = eachSeries;
/**
 * Apply each argument in arr to iteratorFn in parallel, and return all results. If any of the
 * promises reject, the process will continue, with the promises that failed returning an Error.
 */
function eachParallelAndFinish(arr, iteratorFn) {
    const result = [];
    let itemsLeft = arr.length;
    return new Promise((resolve) => {
        arr.forEach((item, i) => {
            iteratorFn(item).then((val) => {
                result[i] = val;
                if (--itemsLeft === 0) {
                    return resolve(result);
                }
            }).catch((err) => {
                result[i] = err;
                if (--itemsLeft === 0) {
                    return resolve(result);
                }
            });
        });
    });
}
exports.eachParallelAndFinish = eachParallelAndFinish;
/**
 * Applies iteratorFn to each element in arr until a 'true' result is returned. Rejected promises are swallowed. A false result is returned only
 * if every iteratorFn(i) returns false or an Error
 */
function tryUntil(arr, iteratorFn, index = 0) {
    return __awaiter(this, void 0, void 0, function* () {
        if (arr.length < 1) {
            return Promise.resolve(false);
        }
        const args = arr.slice();
        while (args.length > 0) {
            try {
                const itemResult = yield iteratorFn(args.shift());
                if (itemResult !== false) {
                    return Promise.resolve(itemResult);
                }
            }
            catch (err) {
                // Swallow the error and continue
            }
        }
        return Promise.resolve(false);
    });
}
exports.tryUntil = tryUntil;
//# sourceMappingURL=promises.js.map