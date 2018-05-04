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

import { Transform } from 'stream';
import { RateLimiter as Limiter } from 'limiter';
import { StreamMessage } from './Messages';

/**
 * A simple transform stream that passes messages through at a specified rate. The timestamp is updated to reflect when
 * the message was actually sent
 */
export default class RateLimiter extends Transform {
    private readonly limiter: Limiter;

    /**
     * Limit outgoing message to `limit` per `interval`
     * @param limit The number of messages released per interval
     * @param interval The length of an interval in ms
     */
    constructor(limit: number, interval: number) {
        super({ readableObjectMode: true, writableObjectMode: true, highWaterMark: 4196 });
        this.limiter = new Limiter(limit, interval, false);
    }

    _transform(msg: StreamMessage, _encoding: string, callback: (err?: Error, data?: any) => void): void {
        this.limiter.removeTokens(1, () => {
            msg.time = new Date();
            this.push(msg);
            callback();
        });
    }
}
