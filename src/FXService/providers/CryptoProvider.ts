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
import { CurrencyPair, EFXRateUnavailable, FXObject, FXProvider, FXProviderConfig, pairAsString } from '../FXProvider';
import { Product, PublicExchangeAPI } from '../../exchanges/PublicExchangeAPI';
import { BigJS } from '../../lib/types';

export interface CryptoProviderConfig extends FXProviderConfig {
    exchange: PublicExchangeAPI;
}

export class CryptoProvider extends FXProvider {
    private readonly exchange: PublicExchangeAPI;
    private products: string[];

    constructor(config: CryptoProviderConfig) {
        super(config);
        this.exchange = config.exchange;
    }

    get name(): string {
        return `CryptoProvider (${this.exchange.owner})`;
    }

    supportsPair(pair: CurrencyPair): Promise<boolean> {
        const getProducts = this.products ?
            Promise.resolve(this.products) :
            this.exchange.loadProducts().then((products: Product[]) => {
                this.products = products.map((p) => p.id);
                return this.products;
            }).catch((err: Error) => {
                this.log('warn', 'CryptoProvider could not load a list of products', err);
                return [];
            });
        return getProducts.then((products: string[]) => {
            const product = pairAsString(pair);
            return products.includes(product);
        });
    }

    protected downloadCurrentRate(pair: CurrencyPair): Promise<FXObject> {
        const product: string = pairAsString(pair);
        return this.exchange.loadMidMarketPrice(product).then((price: BigJS) => {
            const result: FXObject = {
                time: new Date(),
                from: pair.from,
                to: pair.to,
                rate: price
            };
            return result;
        }).catch((err: Error) => {
            this.log('warn', `${this.name} failed to download the ${pairAsString(pair)} rate`, err.message);
            return Promise.reject(new EFXRateUnavailable(err.message, this.name));
        });
    }

}
