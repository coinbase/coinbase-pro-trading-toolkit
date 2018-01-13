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
import { Logger } from '../../utils/Logger';
export declare const POLONIEX_WS_FEED = "wss://api2.poloniex.com";
export declare const POLONIEX_API_URL = "https://poloniex.com";
/**
 * A map of supported GDAX books to the equivalent Poloniex book
 */
export declare const PRODUCT_MAP: {
    [index: string]: string;
};
export declare const REVERSE_PRODUCT_MAP: {
    [index: string]: string;
};
export declare const CURRENCY_MAP: {
    [index: string]: string;
};
export declare const REVERSE_CURRENCY_MAP: {
    [index: string]: string;
};
/**
 * Takes a Poloniex product name an 'GDAXifies' it, but replacing '_' with '-' and swapping the quote and base symbols
 * @param poloProduct
 */
export declare function gdaxifyProduct(poloProduct: string): Product;
export interface PoloniexProducts {
    [id: number]: Product;
}
export declare function getProductInfo(id: number, refresh: boolean, logger?: Logger): Promise<Product>;
export declare function getAllProductInfo(refresh: boolean, logger?: Logger): Promise<PoloniexProducts>;
export declare function gdaxToPolo(product: string): string;
