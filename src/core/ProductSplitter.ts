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
import { StreamCopier } from '../lib/StreamCopier';
import { ExchangeFeed } from '../exchanges/ExchangeFeed';

export class ProductSplitter extends StreamCopier {
    private readonly products: string[];

    constructor(feed: ExchangeFeed, productIds: string[]) {
        const numProducts = productIds.length;
        super(feed, numProducts + 1);
        this.products = productIds;
        this.init();
    }

    private init() {
        this.products.forEach((product: string) => {
            this.attach(product);
            this.addFilter(product, (msg: any) => {
                return msg && msg.productId && msg.productId === product;
            });
        });
        // Add a raw feed channel for other filters to connect to
        this.attach('raw');
    }
}
