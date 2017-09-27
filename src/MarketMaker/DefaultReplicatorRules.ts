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

import { ReplicatorRule } from './ReplicatorRule';
import { AggregatedLevelFromPriceLevel, BookBuilder } from '../lib/BookBuilder';
import { BookReplicatorSettingsValues } from './BookReplicatorSettings';
import { CumulativePriceLevel, OrderbookState, PriceLevel } from '../lib/Orderbook';
import { ONE, Big } from '../lib/types';
import { BookReplicator } from './BookReplicator';

/**
 * For each order, modifies the size to a random value between `settings.maxReplicationLimit` and
 * `settings.minReplicationLimit`.
 */
export function createSizeFractionRule(baseSizePrecision: number): ReplicatorRule {
    return {
        apply(source: BookBuilder, settings: BookReplicatorSettingsValues): BookBuilder {
            const fraction = settings.replicationFraction;
            // We use a state clone so that we don't have to keep track to totalSize / Value and just recalculate at the end
            const state: OrderbookState = source.state();
            ['bids', 'asks'].forEach((side: string) => {
                ((state as any)[side] as PriceLevel[]).forEach((level: PriceLevel) => {
                    level.totalSize = level.totalSize.times(fraction).round(baseSizePrecision, 1);
                });
            });
            source.fromState(state);
            return source;
        }
    };
}

export function createValueBoundRule()  {
    return {
        apply(source: BookBuilder, settings: BookReplicatorSettingsValues): BookBuilder {
            const maxAskSize = settings.baseCurrencyTarget;
            const maxBidValue = settings.quoteCurrencyTarget;
            // orderForValue is from a taker's perspective, so our bids would be the result of a sell order
            const bids: CumulativePriceLevel[] = source.ordersForValue('sell', Big(maxBidValue), true);
            const asks: CumulativePriceLevel[] = source.ordersForValue('buy', Big(maxAskSize), false);
            const newBook: BookBuilder = new BookBuilder(null);
            bids.forEach((level: CumulativePriceLevel) => {
                newBook.addLevel('buy', AggregatedLevelFromPriceLevel(level));
            });
            asks.forEach((level: CumulativePriceLevel) => {
                newBook.addLevel('sell', AggregatedLevelFromPriceLevel(level));
            });
            newBook.sequence = source.sequence;
            return newBook;
        }
    };
}

export function createSpreadRule(pricePrecision: number): ReplicatorRule {
    return {
        apply(source: BookBuilder, settings: BookReplicatorSettingsValues): BookBuilder {
            const spread = Big(settings.extraSpread * 0.01);
            // We use a state clone so that we don't have to keep track to totalSize / Value and just recalculate at the end
            const state: OrderbookState = source.state();
            ['bids', 'asks'].forEach((side: string) => {
                ((state as any)[side] as PriceLevel[]).forEach((level: PriceLevel) => {
                    const multiplier = side === 'bids' ? ONE.minus(spread) : ONE.plus(spread);
                    level.price = level.price.times(multiplier).round(pricePrecision, 4); // Round half-up
                });
            });
            source.fromState(state);
            return source;
        }
    };
}

export function useDefaultReplicatorRules(replicator: BookReplicator, baseSizePrecision: number, pricePrecision: number) {
    replicator.addRule(createSizeFractionRule(baseSizePrecision))
        .addRule(createSpreadRule(pricePrecision))
        .addRule(createValueBoundRule());
}
