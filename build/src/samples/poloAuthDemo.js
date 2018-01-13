"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
const Polo = require("../factories/poloniexFactories");
const Logger_1 = require("../utils/Logger");
const logger = Logger_1.ConsoleLoggerFactory({ level: 'info' });
const polo = Polo.DefaultAPI(logger);
logger.log('info', `key: ${process.env.POLONIEX_KEY.slice(0, 10)}...`);
logger.log('info', `sec: ${process.env.POLONIEX_SECRET.slice(0, 10)}...`);
polo.loadProducts().then((products) => {
    console.log(products.length);
});
polo.loadBalances()
    .then((balances) => {
    logger.log('info', JSON.stringify(balances));
})
    .catch((err) => {
    logger.log('error', 'Poloniex Error', err.asMessage());
});
//# sourceMappingURL=poloAuthDemo.js.map