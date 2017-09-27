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

import { BookReplicatorSettingsValues } from './BookReplicatorSettings';
import { BookBuilder } from '../lib/BookBuilder';

/**
 * Defines a rule for modifying the source order book for MarketMaker bots. It is permitted to modify the state
 * parameter and return it
 */
export interface ReplicatorRule {
    apply(state: BookBuilder, settings: BookReplicatorSettingsValues): BookBuilder;
}
