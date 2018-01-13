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
import { AbstractMessageTransform, MessageTransformConfig } from '../lib/AbstractMessageTransform';
export interface ProductFilterConfig extends MessageTransformConfig {
    productId: string;
}
/**
 * Filters out any messages that don't have the configured product_id
 */
export declare class ProductFilter extends AbstractMessageTransform {
    productId: string;
    constructor(config: ProductFilterConfig);
    transformMessage(msg: any): any;
}
