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

import { EventEmitter } from 'events';

export interface BookReplicatorSettingsValues {
    baseCurrencyTarget: number;
    quoteCurrencyTarget: number;
    isActive: boolean;
    replicationFraction: number;
    extraSpread: number;
    fxChangeThreshold: number;
}

/**
 * The run-time settings for the marketMaker algorithm. These determine how the MarketMaker behaves
 *
 * baseCurrencyTarget - The quantity of base currency to use for limit order bids
 * quoteCurrencyTarget - The quantity of quote currency to use for limit order asks
 * isActive - whether the market maker is currently watching the markets and updating orders
 * The full order from the source book needn't be replicated. You can use the max- and minReplicationLimit settings
 * to specify what percentage of each order to copy to the destination book. A random value from the range will be
 * used. So if min- and maxReplicationLimit are set at 25 and 50 respectively, a 100 BTC order will be copied as anything
 * between 25 and 50 BTC on the target book. Every order will be copied in this way until the base- and quoteCurrencyTargets
 * are reached
 * extraSpread - The target order price is moved away from the mid-market price by the percentage given in extraSpread.
 * This variable is the largest determinant of your profit on each trade. In principle, an extraSpread value of 2 will
 * give you around 2% profit on each trade (before fees).
 */
export class BookReplicatorSettings extends EventEmitter {
    private _values: BookReplicatorSettingsValues = {
        baseCurrencyTarget: 0,
        quoteCurrencyTarget: 0,
        isActive: false,
        replicationFraction: 10,
        extraSpread: 1.0,
        fxChangeThreshold: 0.5,
    };

    constructor() {
        super();
    }

    get values(): BookReplicatorSettingsValues {
        return this._values;
    }

    setParameter<T>(parameter: string, value: T): boolean {
        if ((this as any).values[parameter] === undefined) {
            return false;
        }
        const oldValue: any = (this as any).values[parameter];
        if (value === oldValue) {
            return false;
        }
        (this._values as any)[parameter] = value;
        this.emit(`BookReplicator.${parameter}Changed`, { oldValue, value });
        return true;
    }

    /**
     * Batch settings update. #setParameter is called for every element in newValues
     */
    update(newValues: BookReplicatorSettingsValues): boolean {
        let anyChanges = false;
        for (const key in newValues) {
            const val = (newValues as any)[key];
            anyChanges = this.setParameter(key, val) || anyChanges;
        }
        return anyChanges;
    }
}
