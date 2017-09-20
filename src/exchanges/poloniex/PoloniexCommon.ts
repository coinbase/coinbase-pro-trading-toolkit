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

import { Product } from '../PublicExchangeAPI';
import { Big } from '../../lib/types';
import { DefaultAPI } from '../../factories/poloniexFactories';
import { Logger } from '../../utils/Logger';
import { PoloniexTicker, PoloniexTickers } from './PoloniexMessages';
import { handleResponse } from '../utils';

export const POLONIEX_WS_FEED = 'wss://api2.poloniex.com';
export const POLONIEX_API_URL = 'https://poloniex.com/public';

/**
 * A map of supported GDAX books to the equivalent Poloniex book
 */
export const PRODUCT_MAP: { [index: string]: string } = {
    'ETH-BTC': 'BTC_ETH',
    'LTC-BTC': 'BTC_LTC'
};
export const REVERSE_PRODUCT_MAP: { [index: string]: string } = {
    BTC_ETH: 'ETH-BTC',
    BTC_LTC: 'LTC-BTC'
};

// GDAX Code => Poloniex Code
export const CURRENCY_MAP: { [index: string]: string } = {
    BTC: 'BTC',
    ETH: 'ETH',
    LTC: 'LTC'
};
// Poloniex Code => GDAX Code
export const REVERSE_CURRENCY_MAP: { [index: string]: string } = {
    BTC: 'BTC',
    ETH: 'ETH',
    LTC: 'LTC'
};

/**
 * Takes a Poloniex product name an 'GDAXifies' it, but replacing '_' with '-' and swapping the quote and base symbols
 * @param poloProduct
 */
export function gdaxifyProduct(poloProduct: string): Product {
    let [quote, base] = poloProduct.split('_');
    quote = REVERSE_CURRENCY_MAP[quote] || quote;
    base = REVERSE_CURRENCY_MAP[base] || base;
    return {
        id: REVERSE_PRODUCT_MAP[poloProduct] || `${base}-${quote}`,
        sourceId: poloProduct,
        quoteCurrency: quote,
        baseCurrency: base,
        baseMaxSize: Big(1e6),
        baseMinSize: Big(1e-6),
        quoteIncrement: Big(1e-6),
        sourceData: null
    };
}

export interface PoloniexProduct extends Product {
    poloniexId: number;
    poloniexSymbol: string;
    isFrozen: boolean;
}

export interface PoloniexProducts { [id: number]: PoloniexProduct; }
let productInfo: PoloniexProducts  = {};

export function getProductInfo(id: number, refresh: boolean, logger?: Logger): Promise<PoloniexProduct> {
    if (!refresh && productInfo[id]) {
        return Promise.resolve(productInfo[id]);
    }
    productInfo = {};
    const req =  DefaultAPI(logger).publicRequest('returnTicker');
    return handleResponse<PoloniexTickers>(req, null).then((tickers: PoloniexTickers) => {
        for (const poloProduct in tickers) {
            const ticker: PoloniexTicker = tickers[poloProduct];
            const product: PoloniexProduct = {
                poloniexId: ticker.id,
                poloniexSymbol: poloProduct,
                isFrozen: ticker.isFrozen === '1',
                ...gdaxifyProduct(poloProduct)
            };
            productInfo[ticker.id] = product;
        }
        return Promise.resolve(productInfo[id]);
    });
}

export function getAllProductInfo(refresh: boolean, logger?: Logger): Promise<PoloniexProducts> {
    return getProductInfo(0, refresh, logger).then(() => {
        return Promise.resolve(productInfo);
    });
}

/**
 * Return the product Info given a product ID, which can be in GDAX or Poloniex format
 */
export function getProductID(product: string, refresh: boolean, logger?: Logger): Promise<PoloniexProduct> {
    return getProductInfo(1, refresh, logger).then(() => {
        const result: PoloniexProduct = (productInfo as any).values().find((p: PoloniexProduct) => {
            return p.poloniexSymbol === (PRODUCT_MAP[product] || product);
        });
        return Promise.resolve(result);
    });
}

export function gdaxToPolo(product: string) {
    const [base, quote] = product.split('-');
    return `${quote}_${base}`;
}
