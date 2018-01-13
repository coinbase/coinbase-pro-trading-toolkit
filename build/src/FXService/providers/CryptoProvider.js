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
const FXProvider_1 = require("../FXProvider");
class CryptoProvider extends FXProvider_1.FXProvider {
    constructor(config) {
        super(config);
        this.exchange = config.exchange;
    }
    get name() {
        return `CryptoProvider (${this.exchange.owner})`;
    }
    supportsPair(pair) {
        const getProducts = this.products ?
            Promise.resolve(this.products) :
            this.exchange.loadProducts().then((products) => {
                this.products = products.map((p) => p.id);
                return this.products;
            }).catch((err) => {
                this.log('warn', 'CryptoProvider could not load a list of products', err);
                return [];
            });
        return getProducts.then((products) => {
            const product = FXProvider_1.pairAsString(pair);
            return products.includes(product);
        });
    }
    downloadCurrentRate(pair) {
        const product = FXProvider_1.pairAsString(pair);
        return this.exchange.loadMidMarketPrice(product).then((price) => {
            const result = {
                time: new Date(),
                from: pair.from,
                to: pair.to,
                rate: price
            };
            return result;
        }).catch((err) => {
            this.log('warn', `${this.name} failed to download the ${FXProvider_1.pairAsString(pair)} rate`, err.message);
            return Promise.reject(new FXProvider_1.EFXRateUnavailable(err.message, this.name));
        });
    }
}
exports.CryptoProvider = CryptoProvider;
//# sourceMappingURL=CryptoProvider.js.map