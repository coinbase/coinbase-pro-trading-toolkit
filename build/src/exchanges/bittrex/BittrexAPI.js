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
const index_1 = require("../ccxt/index");
const ccxt_1 = require("ccxt");
class BittrexAPI extends index_1.default {
    static normalizeProduct(gdaxProduct) {
        const [base, quote] = gdaxProduct.split('-');
        return `${quote}-${base}`;
    }
    constructor(auth, logger) {
        const options = { apiKey: auth.key, secret: auth.secret };
        const ccxtInstance = new ccxt_1.bittrex(options);
        super('Bittrex', options, ccxtInstance, logger);
    }
}
exports.BittrexAPI = BittrexAPI;
//# sourceMappingURL=BittrexAPI.js.map