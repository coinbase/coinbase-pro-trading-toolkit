"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
const StreamCopier_1 = require("../lib/StreamCopier");
class ProductSplitter extends StreamCopier_1.StreamCopier {
    constructor(feed, productIds) {
        const numProducts = productIds.length;
        super(feed, numProducts + 1);
        this.products = productIds;
        this.init();
    }
    init() {
        this.products.forEach((product) => {
            this.attach(product);
            this.addFilter(product, (msg) => {
                return msg && msg.productId && msg.productId === product;
            });
        });
        // Add a raw feed channel for other filters to connect to
        this.attach('raw');
    }
}
exports.ProductSplitter = ProductSplitter;
//# sourceMappingURL=ProductSplitter.js.map