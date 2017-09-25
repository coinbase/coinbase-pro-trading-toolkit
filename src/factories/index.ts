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

/**
 * A collection of convenience methods and provider factories using the most common configurations.
 */

/**
 * Loggers
 */

export { ConsoleLoggerFactory } from '../utils/Logger';

/**
 * FXService
 */

export { SimpleFXServiceFactory, FXProviderFactory } from './fxServiceFactories';

/**
 * GDAX factories
 */

import * as GDAX from './gdaxFactories';
export  { GDAX };

/**
 * Bitfinex factories
 */

import * as Bitfinex from './bitfinexFactories';
export  { Bitfinex };

/**
 * Poloniex factories
 */

import * as Poloniex from './poloniexFactories';
export  { Poloniex };

/**
 * Bittrex factories
 */

import * as Bittrex from './bittrexFactories';
export  { Bittrex };
