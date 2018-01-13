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
const bintrees_1 = require("bintrees");
const types_1 = require("./types");
function PriceLevelFactory(price, size, side) {
    const p = types_1.Big(price);
    const s = types_1.Big(size);
    return {
        price: p,
        totalSize: s,
        orders: [{
                id: p.toString(),
                price: p,
                size: s,
                side: side
            }]
    };
}
exports.PriceLevelFactory = PriceLevelFactory;
function PriceTreeFactory() {
    return new bintrees_1.RBTree((a, b) => a.price.cmp(b.price));
}
exports.PriceTreeFactory = PriceTreeFactory;
//# sourceMappingURL=Orderbook.js.map