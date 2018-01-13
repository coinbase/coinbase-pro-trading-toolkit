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
const program = require("commander");
const DataFeed_1 = require("./DataFeed");
program
    .option('-p --port [value]', 'The port to host the server on', 3220)
    .parse(process.argv);
DataFeed_1.serverOptions.port = program.port;
const server = DataFeed_1.dataFeedFactory();
server.on('connection', () => {
    console.log('Client connected');
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled promise rejection: ', reason, promise);
});
//# sourceMappingURL=server-cli.js.map