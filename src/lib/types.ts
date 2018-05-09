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

import * as BigNumber from 'bignumber.js';
export const big: typeof BigNumber.BigNumber = BigNumber.BigNumber.another({
    ROUNDING_MODE: 4,
    ERRORS: false,
    CRYPTO: false
});
export type Biglike = number | string | BigNumber.BigNumber;
export const Big = (x: Biglike): BigNumber.BigNumber => new big(x);
export const ZERO = Big(0);
export const ONE = Big(1);
export type BigJS = BigNumber.BigNumber;
