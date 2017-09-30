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

import { BookReplicatorSettings } from './BookReplicatorSettings';
import { OrderbookMessage, StreamMessage } from '../core/Messages';
import { OrderbookState } from '../lib/Orderbook';
import { FXRates, FXService } from '../FXService/FXService';
import { LiveOrderbook } from '../core/LiveOrderbook';
import { CurrencyPair, FXObject, pairAsString } from '../FXService/FXProvider';
import { Readable } from 'stream';
import { BookBuilder } from '../lib/BookBuilder';
import { OrderbookDiff } from '../lib/OrderbookDiff';
import { ReplicatorRule } from './ReplicatorRule';
import { Logger } from '../utils/Logger';

export interface BookReplicatorConfig {
    settings: BookReplicatorSettings;
    fxService: FXService;
    fxPair: CurrencyPair;
    sourceOrderbook: LiveOrderbook;
    targetProductId: string;
    logger?: Logger;
}

/**
 * Listens to a message feed and maintains a modified copy of a source orderbook. In addition, it produces trade messages
 * that when executed by a Trader will result in a set of resting orders that reflect the copied orderbook state
 */
export class BookReplicator extends Readable {
    private logger: Logger;
    private targetProduct: string;
    private _isActive: boolean;
    private isRecalculating: boolean;
    private _fxService: FXService;
    private _settings: BookReplicatorSettings;
    private _sourceOrderbook: LiveOrderbook;
    private currentFXRate: FXObject = null;
    private fxPair: CurrencyPair = null;
    private clonedBook: BookBuilder;
    private replicatorRules: ReplicatorRule[];

    constructor(config: BookReplicatorConfig) {
        super({ objectMode: true, highWaterMark: 1024 });
        this._settings = config.settings;
        this._fxService = config.fxService;
        this.fxPair = config.fxPair;
        this._sourceOrderbook = config.sourceOrderbook;
        this.listenForFXChanges();
        this.listenForSettingsChanges();
        this.listenForOrderbookUpdates();
        this._fxService.addCurrencyPair(config.fxPair);
        this.logger = config.logger;
        this.clonedBook = new BookBuilder(this.logger);
        this.targetProduct = config.targetProductId;
        this.replicatorRules = [];
    }

    get settings(): BookReplicatorSettings {
        return this._settings;
    }

    get fxService(): FXService {
        return this._fxService;
    }

    get isActive(): boolean {
        return this._isActive;
    }

    /**
     * Turns emission of trade orders on/off. BookReplicator will still keep the internal state synced, even if
     * the replicator is off. When it is turned off, all active orders are cancelled. When it is turned on, a
     * full refresh is performed.
     */
    set isActive(value: boolean) {
        this._isActive = value;
        if (!value) {
            this.cancelMyOrders();
        } else {
            this.recalculate();
        }
    }

    log(level: string, message: string, meta?: any) {
        if (!this.logger) {
            return;
        }
        this.logger.log(level, message, meta);
    }

    addRule(rule: ReplicatorRule): BookReplicator {
        this.replicatorRules.push(rule);
        return this;
    }

    clearRules(): BookReplicator {
        this.replicatorRules = [];
        return this;
    }

    get orderBook(): BookBuilder {
        return this.clonedBook;
    }

    protected listenForSettingsChanges() {
        const settings = this._settings;
        settings.on('BookReplicator.baseCurrencyTargetChanged', (value: number) => {
            // TODO
        });
        settings.on('BookReplicator.quoteCurrencyTargetChanged', (value: number) => {
            // TODO
        });
        settings.on('BookReplicator.isActiveChanged', (value: boolean) => {
            this.isActive = value;
        });
        settings.on('BookReplicator.maxReplicationLimitChanged', (value: number) => {
            // TODO
        });
        settings.on('BookReplicator.minReplicationLimitChanged', (value: number) => {
            // TODO
        });
        settings.on('BookReplicator.extraSpreadChanged', (value: number) => {
            // TODO
        });
        settings.on('BookReplicator.fxExchangeThresholdChanged', (value: number) => {
            // TODO
        });
    }

    protected listenForFXChanges() {
        this.fxService.on('FXRateUpdate', (rates: FXRates) => {
            const current: FXObject = this.currentFXRate;
            const pair = pairAsString(this.fxPair);
            const newRate: FXObject = rates[pair];
            if (!newRate) {
                this.emit('error', new Error(`The FX Service is not providing the necessary exchange rate for this BookReplicator. An exchange rate for ${pair} was expected.`));
                return;
            }
            let shouldRecalculate = true;
            if (current) {
                let delta = current.rate.minus(newRate.rate).abs(); // Absolute difference
                delta = delta.div(current.rate).times(100); // Percentage change
                shouldRecalculate = delta.gt(this.settings.values.fxChangeThreshold);
            }
            if (shouldRecalculate) {
                this.emit('BookReplicator.FXUpdate', newRate);
                this.currentFXRate = newRate;
                this.recalculate();
            }
        });
    }

    protected listenForOrderbookUpdates() {
        const book = this._sourceOrderbook;
        book.on('LiveOrderbook.update', (update: OrderbookMessage) => {
            this.recalculate();
        });
        book.on('LiveOrderbook.snapshot', (snapshot: OrderbookState) => {
            this.log('debug', 'BookReplicator: Source snapshot received');
            this.recalculate(snapshot);
        });

    }

    /**
     * Apply all the replicator rules to the snapshot, calculate the diff from our present orderbook state, and then
     * emit messages to apply the diff.
     */
    protected recalculate(snapshot?: OrderbookState) {
        if (this.isRecalculating) {
            return;
        }
        this.isRecalculating = true;
        // Create a copy of the source orderbook because the Replicator rules are allowed to modify them
        snapshot = snapshot || this._sourceOrderbook.book.stateCopy();
        const sourceBook: BookBuilder = new BookBuilder(this.logger);
        sourceBook.fromState(snapshot);
        const desiredState: BookBuilder = this.applyReplicatorRules(sourceBook);
        const diff: OrderbookDiff = new OrderbookDiff(this.targetProduct, this.clonedBook, desiredState);
        this.clonedBook = desiredState;
        const commandSet: StreamMessage[] = diff.generateDiffCommands();
        this.sendMessages(commandSet);
        this.isRecalculating = false;
    }

    protected cancelMyOrders() {
        const msg: StreamMessage = {
            type: 'cancelMyOrders',
            time: new Date()
        };
        this.push(msg);
    }

    protected sendMessages(commandSet: StreamMessage[]) {
        commandSet.forEach((command: StreamMessage) => {
            if ((command as any).productId) {
                (command as any).productId = this.targetProduct;
            }
            this.push(command);
        });
    }

    protected applyReplicatorRules(state: BookBuilder): BookBuilder {
        this.replicatorRules.forEach((rule: ReplicatorRule) => {
            state = rule.apply(state, this._settings.values);
        });
        return state;
    }

    protected _read(size: number): void { /* TODO */ }
}
