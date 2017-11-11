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
import { ExchangeAuthConfig } from '../AuthConfig';
import { Logger } from '../../utils/Logger';

export interface GDAXConfig {
    apiUrl?: string;
    auth?: GDAXAuthConfig;
    logger: Logger;
}

export interface GDAXAuthConfig extends ExchangeAuthConfig {
    passphrase: string;
}

export interface AuthHeaders {
    'CB-ACCESS-KEY': string;
    'CB-ACCESS-SIGN': string;
    'CB-ACCESS-TIMESTAMP': string;
    'CB-ACCESS-PASSPHRASE': string;
}

export interface GDAXAccountResponse {
    id: string;
    currency: string;
    balance: string;
    available: string;
    hold: string;
    profile_id: string;
}

export interface AuthCallOptions {
    body?: any;
    qs?: any;
    headers?: any;
}

export interface OrderbookEndpointParams {
    product: string;
    level: number;
}

export interface GDAXAPIProduct {
    id: string;
    base_currency: string;
    quote_currency: string;
    base_min_size: string;
    base_max_size: string;
    quote_increment: string;
    display_name: string;
}

export interface GDAXHTTPError {
    message: string;
    response: any;
}
