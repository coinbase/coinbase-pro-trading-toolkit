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
const stream = require("stream");
const Messages_1 = require("../core/Messages");
/**
 * A base class for providing message transform streams and filters. All this class does is implement some common logic,
 * making sure that the streamed messages are GDAXMessages before calling the `transformMessage` method that subclasses
 * will implement.
 */
class AbstractMessageTransform extends stream.Transform {
    constructor(config) {
        super({ readableObjectMode: true, writableObjectMode: true });
        this.logger = config.logger;
    }
    log(level, message, meta) {
        if (!this.logger) {
            return;
        }
        this.logger.log(level, message, meta);
    }
    read(size) {
        return super.read(size);
    }
    _transform(chunk, encoding, callback) {
        if (typeof chunk === 'object' && Messages_1.isStreamMessage(chunk)) {
            const msg = chunk;
            const transformed = this.transformMessage(msg);
            if (transformed) {
                this.push(transformed);
            }
            return callback(null);
        }
        return callback(null, chunk);
    }
}
exports.AbstractMessageTransform = AbstractMessageTransform;
//# sourceMappingURL=AbstractMessageTransform.js.map