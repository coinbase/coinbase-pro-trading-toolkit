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

import { Big, ONE, ZERO } from '../lib/types';
import { Logger } from '../utils/Logger';
import { BigNumber as BigJS } from 'bignumber.js';

export interface CurrencyPair {
    from: string;
    to: string;
}

export function pairAsString(pair: CurrencyPair) {
    return pair.from + '-' + pair.to;
}

export interface FXObject extends CurrencyPair {
    time: Date;
    rate: BigJS;
    change?: BigJS;
}

function makeFXObject(pair: CurrencyPair, value: string | number): FXObject {
    return {
        time: new Date(),
        from: pair.from,
        to: pair.to,
        rate: Big(value),
        change: ZERO
    };
}

export class EFXRateUnavailable extends Error {
    readonly provider: string;

    constructor(msg: string, provider: string) {
        super(msg);
        this.provider = provider;
    }
}

export interface FXProviderConfig {
    logger?: Logger;
}

export abstract class FXProvider {
    private readonly logger: Logger;
    private readonly _pending: { [pair: string]: Promise<FXObject> } = {};

    constructor(config: FXProviderConfig) {
        this.logger = config.logger;
    }

    abstract get name(): string;

    log(level: string, message: string, meta?: any) {
        if (!this.logger) {
            return;
        }
        this.logger.log(level, message, meta);
    }

    fetchCurrentRate(pair: CurrencyPair): Promise<FXObject> {
        // Special case immediately return 1.0
        if (pair.from === pair.to) {
            return Promise.resolve(makeFXObject(pair, 1));
        }
        return this.supportsPair(pair).then((ok: boolean) => {
            if (!ok) {
                // See if the inverse is supported
                const inversePair: CurrencyPair = {
                    from: pair.to,
                    to: pair.from
                };
                // then<FXObject> is required to workaround bug in TS2.1 https://github.com/Microsoft/TypeScript/issues/10977
                return this.supportsPair(inversePair).then<FXObject>((inverseOk: boolean) => {
                    if (inverseOk) {
                        return this.getPromiseForRate(inversePair).then((inverse: FXObject) => {
                            const rate: FXObject = {
                                from: pair.from,
                                to: pair.to,
                                rate: ONE.div(inverse.rate),
                                time: inverse.time
                            };
                            return rate;
                        });
                    } else {
                        return Promise.reject(new EFXRateUnavailable(`Currency pair ${pair.from}-${pair.to} or its inverse is not supported`, this.name));
                    }
                });
            }
            return this.getPromiseForRate(pair);
        });
    }

    abstract supportsPair(pair: CurrencyPair): Promise<boolean>;

    /**
     * Returns a promise for the current rate. IsSupported must be true, and is not checked here. The method returns a
     * promise for the current network request, or generates a new one.
     * @param pair
     * @returns {Promise<FXObject>}
     */
    protected getPromiseForRate(pair: CurrencyPair): Promise<FXObject> {
        // If there's already a current promise to fetch this pair, wait for that request to resolve
        const index = pair.from + '-' + pair.to;
        let pending = this._pending[index];
        if (pending) {
            return pending;
        }
        this.log('debug', `Downloading current ${pair.from}-${pair.to} exchange rate from ${this.name}`);
        pending = this.downloadCurrentRate(pair);
        this._pending[index] = pending;
        return pending.then((result: FXObject) => {
            this._pending[index] = undefined;
            return result;
        }).catch((err) => {
            this._pending[index] = undefined;
            return Promise.reject(err);
        });
    }

    /**
     * Fetch the latest FX exchange rate from the service provider and return a promise for an FXObject.
     * If the service is down, or the latest value is unavailable, reject the promise with an EFXRateUnavailable error
     * @param pair
     */
    protected abstract downloadCurrentRate(pair: CurrencyPair): Promise<FXObject>;
}
