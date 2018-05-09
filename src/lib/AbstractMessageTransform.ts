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

import stream = require('stream');
import { isStreamMessage, StreamMessage } from '../core/Messages';
import { Logger } from '../utils/Logger';

export interface MessageTransformConfig {
    logger?: Logger;
}

/**
 * A base class for providing message transform streams and filters. All this class does is implement some common logic,
 * making sure that the streamed messages are GDAXMessages before calling the `transformMessage` method that subclasses
 * will implement.
 */
export abstract class AbstractMessageTransform extends stream.Transform {
    protected readonly logger: Logger;

    constructor(config: MessageTransformConfig) {
        super({ readableObjectMode: true, writableObjectMode: true });
        this.logger = config.logger;
    }

    log(level: string, message: string, meta?: any): void {
        if (!this.logger) {
            return;
        }
        this.logger.log(level, message, meta);
    }

    read(size?: number): StreamMessage {
        return super.read(size) as StreamMessage;
    }

    _transform(chunk: any, _encoding: string, callback: (err: Error, chunk?: any) => void) {
        if (typeof chunk === 'object' && isStreamMessage(chunk)) {
            const transformed = this.transformMessage(chunk);
            if (transformed) {
                this.push(transformed);
            }
            return callback(null);
        }
        return callback(null, chunk);
    }

    abstract transformMessage(msg: StreamMessage): null | StreamMessage;
}
