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

import { Readable } from 'stream';
import { StreamMessage } from '../core/Messages';

/**
 * Simple stream that pipes through a supplied set of stream messages when the `send` method is called.
 */
export class StaticCommandSet extends Readable {
    readonly messages: StreamMessage[];
    private readonly autoClose: boolean;

    constructor(messages: StreamMessage[], autoClose: boolean = true) {
        super({ objectMode: true });
        this.messages = messages;
        this.autoClose = autoClose;
    }

    send() {
        while (this.sendOne()) {
            /* no-op */
        }
    }

    sendOne(): boolean {
        const message: StreamMessage = this.messages.shift();
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

    _read(_size: number): void { /* no-op */
    }
}
