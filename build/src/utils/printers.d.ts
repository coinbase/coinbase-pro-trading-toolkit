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
import { Orderbook } from '../lib/Orderbook';
import { Ticker } from '../exchanges/PublicExchangeAPI';
import { BigJS } from '../lib/types';
export declare function printOrderbook(book: Orderbook, numOrders?: number, basePrec?: number, quotePrec?: number): string;
export declare function printSeparator(): string;
export declare function printTicker(ticker: Ticker, quotePrec?: number): string;
export declare function padfloat(val: BigJS | number, total: number, decimals: number): string;
