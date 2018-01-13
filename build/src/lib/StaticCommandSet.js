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
const stream_1 = require("stream");
/**
 * Simple stream that pipes through a supplied set of stream messages when the `send` method is called.
 */
class StaticCommandSet extends stream_1.Readable {
    constructor(messages, autoClose = true) {
        super({ objectMode: true });
        this.messages = messages;
        this.autoClose = autoClose;
    }
    send() {
        while (this.sendOne()) {
            /* no-op */
        }
    }
    sendOne() {
        const message = this.messages.shift();
        if (message) {
            this.push(message);
        }
        if (this.messages.length === 0 && this.autoClose) {
            this.push(null);
        }
        return !!message;
    }
    end() {
        this.push(null);
    }
    _read(size) {
    }
}
exports.StaticCommandSet = StaticCommandSet;
//# sourceMappingURL=StaticCommandSet.js.map