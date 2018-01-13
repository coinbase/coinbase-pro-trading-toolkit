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
import { StreamMessage } from '../core/Messages';
export interface Command {
    type: string;
    tag?: string;
}
export interface ExchangeCommand extends Command {
    exchange: string;
}
export interface AttachCommand extends ExchangeCommand {
    products: string[];
}
/**
 * Valid types of OrderbookCommand:
 *   * `subscribe`
 *   * `unsubscribe`
 *   * `snapshot`
 *   * `ticker` - manually request a ticker, though once you've subscribed, tickers will come through automatically
 *
 */
export interface OrderbookCommand extends ExchangeCommand {
    product: string;
}
export interface ErrorMessage extends Command {
    message: string;
    command: any;
}
export interface ResponseMessage extends Command {
    tag: string;
    result: string;
    command: Command;
}
/**
 * The data feed message simply wraps a conventional stream message with some metadata so that the client can identify it.
 * The type will be the same as `data.type` and the `tag` will be copied from the command that originated this message.
 */
export interface DataFeedMessage {
    type: string;
    tag: string;
    data: StreamMessage;
}
export declare function wrapMessage(msg: StreamMessage, command?: Command): DataFeedMessage;
export declare function newError(message: string, command?: Command): ErrorMessage;
