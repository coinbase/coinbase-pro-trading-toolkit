/// <reference types="node" />
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
import { Writable } from 'stream';
import { Logger } from '../utils/Logger';
import { AuthenticatedExchangeAPI } from '../exchanges/AuthenticatedExchangeAPI';
import { LiveOrder, OrderbookState } from '../lib/Orderbook';
import { PlaceOrderMessage, StreamMessage } from './Messages';
export interface TraderConfig {
    logger: Logger;
    exchangeAPI: AuthenticatedExchangeAPI;
    productId: string;
    fitOrders: boolean;
    sizePrecision?: number;
    pricePrecision?: number;
}
/**
 * The Trader class places orders on your behalf. The commands for placing the trades can either come from an attached
 * stream, or directly via the API.
 *
 * One should have an *authenticated* feed piped into Trader so that it can keep track of the state of its own orderbook.
 * Failing this, it is trading 'blind' and will have to rely on REST requests to update the state of the book.
 *
 * Emitted messages:
 *   Trader.outOfSyncWarning - The internal order pool and what's actually on the exchange may be out of sync
 *   Trader.trade-finalized - An order is complete (done)
 *   Trader.my-orders-cancelled - A call to cancel all orders in this orderbook has completed
 *   Trader.all-orders-cancelled - A call to cancel ALL of the user's orders (including those placed elsewhere) has been completed
 *   Trader.order-placed - Emitted after an order has been successfully placed
 *   Trader.order-cancelled - Emitted after an order has been cancelled
 *   Trader.trade-executed - emitted after a trade has been executed against my limit order
 *   Trader.place-order-failed - A REST order request returned with an error
 *   Trader.cancel-order-failed - A Cancel request returned with an error status
 */
export declare class Trader extends Writable {
    private _productId;
    private logger;
    private myBook;
    private api;
    private _fitOrders;
    private sizePrecision;
    private pricePrecision;
    private unfilledMarketOrders;
    constructor(config: TraderConfig);
    readonly productId: string;
    fitOrders: boolean;
    placeOrder(req: PlaceOrderMessage): Promise<LiveOrder>;
    cancelOrder(orderId: string): Promise<string>;
    cancelMyOrders(): Promise<string[]>;
    /**
     * Cancel all, and we mean ALL orders (even those not placed by this Trader). To cancel only the messages
     * listed in the in-memory orderbook, use `cancelMyOrders`
     */
    cancelAllOrders(): Promise<string[]>;
    state(): OrderbookState;
    /**
     * Compare the state of the in-memory orderbook with the one returned from a REST query of all my orders. The
     * result is an `OrderbookState` object that represents the diff between the two states. Negative sizes represent
     * orders in-memory that don't exist on the book and positive ones are vice versa
     */
    checkState(): Promise<OrderbookState>;
    executeMessage(msg: StreamMessage): void;
    _write(msg: any, encoding: string, callback: (err?: Error) => any): void;
    private handleOrderRequest(request);
    private handleCancelOrder(request);
    private handleTradeExecutedMessage(msg);
    private handleTradeFinalized(msg);
    /**
     *  We should just confirm that we have the order, since we added when we placed it.
     *  Otherwise this Trader didn't place the order (or somehow missed the callback), but we should add
     *  it to our memory book anyway otherwise it will go out of sync
     */
    private handleOrderPlacedConfirmation(msg);
    /**
     * Wraps a message emission in a setImmediate. This should be called from inside Promise handlers, otherwise errors in the user code (event handler) will
     * get thrown from here, which leads to confusing stack traces.
     * @param {string} event
     * @param payload
     */
    private emitMessageAsync(event, payload);
}
