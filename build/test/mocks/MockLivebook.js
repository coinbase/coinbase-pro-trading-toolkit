"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
const LiveOrderbook_1 = require("../../src/core/LiveOrderbook");
const StaticCommandSet_1 = require("../../src/lib/StaticCommandSet");
function createMockLivebook(product, messages) {
    const bookConfig = {
        logger: null,
        strictMode: false,
        product: product
    };
    const liveBook = new LiveOrderbook_1.LiveOrderbook(bookConfig);
    const messageStream = new StaticCommandSet_1.StaticCommandSet(messages);
    messageStream.pipe(liveBook);
    return {
        liveBook: liveBook,
        messages: messageStream
    };
}
exports.createMockLivebook = createMockLivebook;
//# sourceMappingURL=MockLivebook.js.map