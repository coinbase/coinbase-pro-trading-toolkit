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
/**
 * A collection of convenience methods and provider factories using the most common configurations.
 */
/**
 * Loggers
 */
var Logger_1 = require("../utils/Logger");
exports.ConsoleLoggerFactory = Logger_1.ConsoleLoggerFactory;
/**
 * FXService
 */
var fxServiceFactories_1 = require("./fxServiceFactories");
exports.SimpleFXServiceFactory = fxServiceFactories_1.SimpleFXServiceFactory;
exports.FXProviderFactory = fxServiceFactories_1.FXProviderFactory;
/**
 * GDAX factories
 */
const GDAX = require("./gdaxFactories");
exports.GDAX = GDAX;
/**
 * Bitfinex factories
 */
const Bitfinex = require("./bitfinexFactories");
exports.Bitfinex = Bitfinex;
/**
 * Poloniex factories
 */
const Poloniex = require("./poloniexFactories");
exports.Poloniex = Poloniex;
/**
 * Bittrex factories
 */
const Bittrex = require("./bittrexFactories");
exports.Bittrex = Bittrex;
//# sourceMappingURL=index.js.map