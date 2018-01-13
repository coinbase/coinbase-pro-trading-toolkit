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
export declare function delay(time: number): Promise<void>;
/**
 * Apply each argument in arr to iteratorFn, waiting for the promise to resolve before continuing
 */
export declare function eachSeries<T>(arr: T[], iteratorFn: (arg: T) => Promise<any>): Promise<any>;
/**
 * Apply each argument in arr to iteratorFn in parallel, and return all results. If any of the
 * promises reject, the process will continue, with the promises that failed returning an Error.
 */
export declare function eachParallelAndFinish<T, U>(arr: T[], iteratorFn: (arg: T) => Promise<U>): Promise<(U | Error)[]>;
/**
 * Applies iteratorFn to each element in arr until a 'true' result is returned. Rejected promises are swallowed. A false result is returned only
 * if every iteratorFn(i) returns false or an Error
 */
export declare function tryUntil<T, U>(arr: T[], iteratorFn: (arg: T) => Promise<U | boolean>, index?: number): Promise<U | boolean>;
