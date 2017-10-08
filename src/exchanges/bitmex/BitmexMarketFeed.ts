'use strict';
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
import * as R from 'ramda';

import { ExchangeFeed, ExchangeFeedConfig } from '../ExchangeFeed';
import { SnapshotMessage, LevelMessage, TradeMessage } from '../../core/Messages';
import { BITMEX_WS_FEED } from './BitmexCommon';
import { Big } from '../../lib/types';
import { Level3Order, PriceLevelWithOrders } from '../../lib/Orderbook';
import {
    BitmexMessage, OrderbookSnapshotMessage, OrderbookUpdateMessage, TradeMessage as BitmexTradeMessage,
    TradeData, SubscriptionResponseMessage, PriceData,
} from './BitmexInterfaces';

const mapLevelUpdates = (updates: PriceData[]): PriceLevelWithOrders => updates.map( ({ id, side, size, price }) => {
    const level3: Level3Order = {
        price: Big(price),
        size: Big(size),
        side: side.toLowerCase(),
        id: id.toString(),
    };

    return {
        price: level3.price,
        totalSize: level3.size,
        orders: [ level3 ],
    };
} );

export class BitmexMarketFeed extends ExchangeFeed {
    readonly owner: string;
    readonly feedUrl: string;
    // Maps order IDs to the price that they exist at
    private orderIdMap: { [orderId: number]: number };

    constructor(config: ExchangeFeedConfig) {
        if (!config.wsUrl) {
            config.wsUrl = BITMEX_WS_FEED;
        }
        super(config);
        this.owner = 'BitMEX';
        this.feedUrl = config.wsUrl;
        this.connect();
    }

    public subscribe(productIds: string[]) {
        this.logger.log('debug', `Subscribing to the following symbols: ${JSON.stringify(productIds)}`);
        productIds.forEach((productId: string) => {
            const subscribeMessage = {
                op: 'subscribe',
                args: [`orderBookL2:${productId}`, `trade:${productId}`],
            };

            this.send(JSON.stringify(subscribeMessage));
        });
    }

    protected onOpen(): void {
        // Nothing for now
    }

    protected handleMessage(rawMsg: string): void {
        const msg: BitmexMessage = JSON.parse(rawMsg) as BitmexMessage;
        // console.log(msg);

        if (msg.error) {
            // this.onError(msg.error);
            // TODO
        } else if (msg.table === 'trade') {
            const tradeMsg: BitmexTradeMessage = msg as BitmexTradeMessage;
            this.handleTrade(tradeMsg);
        } else if (msg.action) {
            if (msg.action === 'partial') {
                const snapshotMsg = msg as OrderbookSnapshotMessage;
                this.handleSnapshot(snapshotMsg);
            } else {
                const updateMsg = msg as OrderbookUpdateMessage;
                this.handleOrderbookUpdate(updateMsg);
            }
        } else if (msg.success !== undefined) {
            const subscriptionResMSg: SubscriptionResponseMessage = msg as SubscriptionResponseMessage;
            this.handleSubscriptionSuccess(subscriptionResMSg);
        } else {
            // TODO: Throw error for unexpected message type
        }
    }

    private handleSnapshot(snapshot: OrderbookSnapshotMessage) {
        // (re)initialize our order id map
        const newIdMap = snapshot.data.reduce((acc, { id, price }) => ({...acc, [id]: price }), {});
        this.orderIdMap = newIdMap;

        const asks = snapshot.data
            .filter(R.propEq('side', 'Sell'))
            .map(mapLevelUpdates);

        const bids = snapshot.data
            .filter(R.propEq('side', 'Buy'))
            .map(mapLevelUpdates);

        const snapshotMsg: SnapshotMessage = {
            time: new Date(),
            sequence: 0,
            type: 'snapshot',
            productId: snapshot.data[0].symbol,
            asks,
            bids,
        };

        this.push(snapshotMsg);
    }

    private handleOrderbookUpdate(updates: OrderbookUpdateMessage) {
        updates.data.forEach((update: LevelUpdate) => {
            const price: number = this.orderIdMap[update.id];
            if (update.price) {
                // insert
                this.orderIdMap[update.id] = update.price;
            } else if (!update.size) {
                // delete
                delete this.orderIdMap[update.id];
            }

            const message: LevelMessage = {
                type: 'level',
                productId: update.symbol,
                price: price.toString(),
                size: update.size || 0,
                side: update.side.toLowerCase(),
                count: 1,
            };

            this.push(message);
        });
    }

    private handleTrade(trades: BitmexTradeMessage) {
        trades.data.forEach((trade: TradeData) => {
            const message: TradeMessage = {
                type: 'trade',
                productId: trade.symbol,
                time: new Date(trade.timestamp),
                tradeId: trade.trdMatchID,
                price: trade.price.toString(),
                size: trade.size.toString(),
                side: trade.side.toLowerCase(),
            };

            this.push(message);
        });
    }

    private handleSubscriptionSuccess(successMsg: SubscriptionResponseMessage) {
        // TODO
    }
}
