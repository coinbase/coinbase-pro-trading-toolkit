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

import { AbstractMessageTransform,
         MessageTransformConfig } from '../lib/AbstractMessageTransform';
import { StreamMessage } from '../core/Messages';

export interface ProductFilterConfig extends MessageTransformConfig {
    productId: string;
}

/**
 * Filters out any messages that don't have the configured product_id
 */
export class ProductFilter extends AbstractMessageTransform {
    public readonly productId: string;

    constructor(config: ProductFilterConfig) {
        super(config);
        this.productId = config.productId;
    }

    transformMessage(msg: StreamMessage): StreamMessage {
        if (!msg || !(msg as any).productId || (msg as any).productId !== this.productId) {
            return null;
        }
        return msg;
    }
}
