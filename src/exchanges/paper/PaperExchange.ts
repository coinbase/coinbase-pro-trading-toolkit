import { PlaceOrderMessage, isStreamMessage, TradeMessage, TradeExecutedMessage, TradeFinalizedMessage } from '../../core';
import { BookBuilder, LiveOrder, AggregatedLevelWithOrders, Level3Order } from '../../lib';
import { Big, BigJS } from '../../lib/types';
import { AuthenticatedExchangeAPI, Balances } from '../AuthenticatedExchangeAPI';
import { Product, PublicExchangeAPI, Ticker, CandleRequestOptions, Candle } from '../PublicExchangeAPI';
import { HTTPError, GTTError } from '../../lib/errors';
import * as GUID from 'guid';
import * as Collections from 'typescript-collections';
import { Duplex } from 'stream';
import { Logger } from '../../utils/Logger';
import { RBTree } from 'bintrees';

let latencyMS: number = 0;
let addLatency: boolean = false;

/**
 * Method decorator to add simulated latency to public API calls.
 * @param {object} _target
 * @param {string} _propertyKey
 * @param {TypedPropertyDescriptor<any>} descriptor
 * @returns {TypedPropertyDescriptor<any>}
 */
function AddLatency(_target: object, _propertyKey: string, descriptor: TypedPropertyDescriptor<any>) {
    const originalMethod = descriptor.value;
    descriptor.value = function(...args: any[]) {
        return addLatency
            ? new Promise<void>((resolve) => {
                return setTimeout(() => resolve(originalMethod.apply(this, args)), latencyMS);
            })
            : new Promise<void>((resolve) => resolve(originalMethod.apply(this, args)));
    };
    return descriptor;
}

export interface PaperExchangeConfig {
    logger?: Logger;
    // desired percentage rate to simulate errors (0 = no errors; 0.5 = 50% of the time, etc.)
    errorRate?: number;
    latencyRange?: {low: number, high: number};
}

// TODO: take advantage of 'typed-event-emitter' module and get rid of this interface
export declare interface PaperExchange {
    /**
     * This event is emitted whenever the paper exchange injects a TradeExecuted message in the feed stream.
     * Typically, this happens in response to a TradeMessage received from upstream and that TradeMessage is at a price point that would trigger a previously placed order.
     */
    on(event: 'PaperExchange.TradeExecuted', listener: (msg: TradeExecutedMessage) => void): this;

    // tslint:disable-next-line:ban-types
    on(event: string, listener: Function): this;
}

/**
 * A non-implementation implementation of the AuthenticatedExchangeAPI that can be used for papertrading
 */
export class PaperExchange extends Duplex implements PublicExchangeAPI, AuthenticatedExchangeAPI {
    public owner: string;
    // instance properties specified by config
    protected errorRate: number;
    protected latencyRange: {low: number, high: number};
    // master collection of all live orders for quick lookup by orderId
    protected readonly liveOrdersById: Collections.Dictionary<string, LiveOrder>;
    // book of pending orders for each product that has orders
    private pendingOrdersByProduct: Collections.Dictionary<string, BookBuilder>;
    private lastBuyTradeByProduct: Collections.Dictionary<string, TradeMessage>;
    private lastSellTradeByProduct: Collections.Dictionary<string, TradeMessage>;

    private logger: Logger;

    constructor(config: PaperExchangeConfig) {
        super({ objectMode: true, highWaterMark: 1024 });
        this.errorRate = config.errorRate || 0;
        this.latencyRange = config.latencyRange && config.latencyRange.low && config.latencyRange.high
            ? {low: config.latencyRange.low, high: config.latencyRange.high}
            : {low: 0, high: 0};
        addLatency = !!(config.latencyRange && config.latencyRange.low && config.latencyRange.high);
        latencyMS = Math.floor(Math.random() * (this.latencyRange.high - this.latencyRange.low + 1)) + this.latencyRange.low;
        this.logger = config.logger;
        this.liveOrdersById = new Collections.Dictionary();
        this.pendingOrdersByProduct = new Collections.Dictionary();
        this.lastBuyTradeByProduct = new Collections.Dictionary();
        this.lastSellTradeByProduct = new Collections.Dictionary();
    }

    // ----------------------------------- Authenticated API methods --------------------------------------------------//
    @AddLatency
    public placeOrder(order: PlaceOrderMessage): Promise<LiveOrder> {
        // randomly throw error to simulate connection problems
        if (Math.random() <= this.errorRate) {
            return Promise.reject(new HTTPError(`Placing order on ${order.productId} failed`, {status: 1, body: 'Random error simulation'}));
        }

        // make sure order message meets expected formats
        if (order.side !== 'buy' && order.side !== 'sell') {
            return Promise.reject(new GTTError('Order side must be either \'buy\' or \'sell\'.  Order side was: ' + order.side));
        }

        // util function, n must be a number (not undefined or NaN) and must be positive
        const assertPositiveNumber = (n: any): boolean => !n || isNaN(+n) || +n < 0;

        // make sure order price and size are positive numbers before assignment
        if (assertPositiveNumber(order.price)) {
            return Promise.reject(new GTTError('Order price must be a positive number'));
        } else if (assertPositiveNumber(order.size)) {
            return Promise.reject(new GTTError('Order size must be a positive number'));
        }

        const orderSize: BigJS = Big(order.size);
        const orderPrice: BigJS = Big(order.price);

        // generate random order id
        const orderID: string = GUID.raw();
        const liveOrder: LiveOrder = {
            price: orderPrice,
            size: orderSize,
            side: order.side,
            id: orderID,
            time: new Date(),
            productId: order.productId,
            status: 'Pending',
            extra: order
        };
        // put copy of the live order in hash to allow quick lookup by orderId
        this.liveOrdersById.setValue(liveOrder.id, liveOrder);
        // put limit order in the book to for future lookup by order type and price
        const book = this.getBookForProduct(liveOrder.productId);
        if (order.orderType === 'limit') {
            // Handle slippage for post-only limit orders
            if (order.postOnly) {
                const highestBid: AggregatedLevelWithOrders = book.highestBid;
                const lowestAsk: AggregatedLevelWithOrders = book.lowestAsk;
                if (order.side === 'buy' && lowestAsk !== null) {
                    const bidPrice: BigJS = lowestAsk.price;
                    const msg: string = `Buy order price ($${order.price}) is higher than (or equal to) current lowest ask ($${bidPrice.toNumber()}).`;
                    if (orderPrice.greaterThanOrEqualTo(bidPrice)) {
                        return Promise.reject(new GTTError(msg));
                    }
                } else if (order.side === 'sell' && highestBid !== null) {
                    const askPrice: BigJS = highestBid.price;
                    const msg: string = `Sell order price ($${order.price}) is lower than (or equal to) current highest bid ($${askPrice.toNumber()}).`;
                    if (orderPrice.lessThanOrEqualTo(askPrice)) {
                        return Promise.reject(new GTTError(msg));
                    }
                }
            }
            book.add(liveOrder);
        } else if (order.orderType === 'market') {
            this.fillMarketOrder(order, liveOrder);
        } else {
            return Promise.reject(new GTTError('PaperExchange does not support orderType:' + order.orderType));
        }

        return Promise.resolve(liveOrder);
    }

    @AddLatency
    public cancelOrder(id: string): Promise<string> {
        if (this.liveOrdersById.containsKey(id)) {
            // remove order from both the id lookup table and the orderbook
            const orderToCancel = this.liveOrdersById.getValue(id);
            this.clearOrder(orderToCancel.id, orderToCancel.productId);
            return Promise.resolve(id);
        }
        return Promise.reject('Could not locate order to remove with id:' + id);
    }

    @AddLatency
    public cancelAllOrders(productId: string): Promise<string[]> {
        if (!productId) {
            // remove all orders for all products
            const allOrderIds = this.liveOrdersById.keys();
            return Promise.all(allOrderIds.map((orderId: string) => {
                return this.cancelOrder(orderId);
            })).then(() => {
                return allOrderIds;
            });
        }

        // remove just orders for a specific product
        const cancelledOrderIds = new Collections.Set<string>();
        if (this.pendingOrdersByProduct.getValue(productId) !== undefined) {

            // collect all orders on the buy side
            cancelledOrderIds.union(this.collectOrderIds(this.pendingOrdersByProduct.getValue(productId).bidTree));
            // collect all orders on the sell side
            cancelledOrderIds.union(this.collectOrderIds(this.pendingOrdersByProduct.getValue(productId).askTree));

            // remove all order id's from lookup
            const canceledOrdersArray: string[] = cancelledOrderIds.toArray();
            canceledOrdersArray.forEach((orderId: string) => {
                return this.clearOrder(orderId, productId);
            });
            // undefined out the orderbook for future garbage collection
            this.pendingOrdersByProduct.remove(productId);
            return Promise.resolve(canceledOrdersArray);
        }

        return Promise.resolve(cancelledOrderIds.toArray());
    }

    @AddLatency
    public loadOrder(id: string): Promise<LiveOrder> {
        if (this.liveOrdersById.containsKey(id)) {
            return Promise.resolve(this.liveOrdersById.getValue(id));
        } else {
            return Promise.reject('Could not find live order with id:' + id);
        }
    }

    @AddLatency
    public loadAllOrders(productId: string): Promise<LiveOrder[]> {
        if (!productId) {
            return Promise.resolve(this.liveOrdersById.values());
        } else {
            // create Set that distinguishes LiveOrder items by their id
            const values = new Collections.Set<LiveOrder>((item) => item.id);
            if (this.pendingOrdersByProduct.getValue(productId) !== undefined) {
                const orderIdsForProduct = new Collections.Set<string>();
                // collect all orders on the buy side
                orderIdsForProduct.union(this.collectOrderIds(this.pendingOrdersByProduct.getValue(productId).bidTree));
                // collect all orders on the sell side
                orderIdsForProduct.union(this.collectOrderIds(this.pendingOrdersByProduct.getValue(productId).askTree));
                // lookup all of the LiveOrder objects by id and put them in a set
                orderIdsForProduct.forEach((orderId) => {
                    values.add(this.liveOrdersById.getValue(orderId));
                });
            }
            return Promise.resolve(values.toArray());
        }
    }

    public loadBalances(): Promise<Balances> {
        throw new Error('Not implemented yet.');
    }

    // ----------------------------------- PublicExchange API methods --------------------------------------------------//
    public loadProducts(): Promise<Product[]> {
        throw new Error('Not implemented yet.');
    }

    public loadMidMarketPrice(_gdaxProduct: string): Promise<BigJS> {
        throw new Error('Not implemented yet.');
    }

    public loadOrderbook(_gdaxProduct: string): Promise<BookBuilder> {
        throw new Error('Not implemented yet.');
    }

    public loadTicker(_gdaxProduct: string): Promise<Ticker> {
        throw new Error('Not implemented yet.');
    }

    loadCandles(_options: CandleRequestOptions): Promise<Candle[]> {
        throw new Error('Method not implemented.');
    }

    // -------------------------------------------------------------------------------------------------------------------//

    _read() { /* no-op */
    }

    _write(msg: any, _encoding: string, callback: () => void): void {
        // Pass the msg on to downstream users
        this.push(msg);
        // Process the message to determine if paper trade should be filled
        if (!isStreamMessage(msg) || !msg.hasOwnProperty('productId')) {
            return callback();
        }

        switch (msg.type) {
            case 'trade':
                this.processTrade(msg as TradeMessage);
                break;
        }
        callback();
    }

    private collectOrderIds(tree: RBTree<AggregatedLevelWithOrders>): Collections.Set<string> {
        const orderIds = new Collections.Set<string>();
        const iterator = tree.iterator();
        let l: AggregatedLevelWithOrders = iterator.next();
        while (l !== null) {
            l.orders.forEach((level3Order) => {
                orderIds.add(level3Order.id);
            });
            l = iterator.next();
        }
        return orderIds;
    }

    private getBookForProduct(productId: string): BookBuilder {
        if (!this.pendingOrdersByProduct.containsKey(productId)) {
            this.pendingOrdersByProduct.setValue(productId, new BookBuilder(this.logger));
        }
        return this.pendingOrdersByProduct.getValue(productId);
    }

    private processTrade(msg: TradeMessage) {
        if (msg.side === 'sell') {
            this.lastSellTradeByProduct.setValue(msg.productId, msg);
        } else if (msg.side === 'buy') {
            this.lastBuyTradeByProduct.setValue(msg.productId, msg);
        }
        const orderBook = this.pendingOrdersByProduct.getValue(msg.productId);
        // do we have any pending orders for this product?
        if (orderBook !== undefined) {
            const tradePrice: BigJS = Big(msg.price);

            // any buy orders at price above this trade?
            if (orderBook.highestBid !== null && orderBook.highestBid.price.greaterThanOrEqualTo(tradePrice)) {
                // simulate order fill for all buy orders at or above trade price
                const i = orderBook.bidTree.iterator();
                let l: AggregatedLevelWithOrders = i.next();
                while (l !== null) {
                    l.orders.forEach((level3Order: Level3Order) => {
                        if (level3Order.price.greaterThanOrEqualTo(tradePrice)) {
                            this.fillLimitOrder(orderBook, level3Order, msg);
                        }
                    });
                    l = i.next();
                }
            }
            // any sell orders at price below this trade?
            if (orderBook.lowestAsk !== null && orderBook.lowestAsk.price.lessThanOrEqualTo(tradePrice)) {
                // simulate order fill for all sell orders at or below trade price
                const i = orderBook.askTree.iterator();
                let l: AggregatedLevelWithOrders = i.next();
                while (l !== null) {
                    l.orders.forEach((level3Order: Level3Order) => {
                        if (level3Order.price.lessThanOrEqualTo(tradePrice)) {
                            this.fillLimitOrder(orderBook, level3Order, msg);
                        }
                    });
                    l = i.next();
                }
            }
        }
    }

    private fillLimitOrder(_orderBook: BookBuilder, l3Order: Level3Order, tradeMsg: TradeMessage) {
        // clear order from book
        this.clearOrder(l3Order.id, tradeMsg.productId);

        const executedMsg: TradeExecutedMessage = {
            type: 'tradeExecuted',
            productId: tradeMsg.productId,
            orderId: l3Order.id,
            side: l3Order.side,
            price: tradeMsg.price.toString(),
            orderType: 'limit',
            tradeSize: l3Order.size.toString(),
            remainingSize: '0',
            time: new Date(),
        };
        this.announceTradeExecuted(executedMsg);

        // current implementation completely fills orders, so emit TradeFinalizedMessage as well
        const finalizedMsg: TradeFinalizedMessage = {
            type: 'tradeFinalized',
            productId: tradeMsg.productId,
            orderId: l3Order.id,
            side: l3Order.side,
            price: tradeMsg.price.toString(),
            remainingSize: '0',
            time: new Date(),
            reason: 'limit order triggered by trade price',
        };
        this.announceTradeFinalized(finalizedMsg);
    }

    private announceTradeExecuted(executedMsg: TradeExecutedMessage) {
        // emit TradeExecutedMessage and push message to stream
        this.emit('PaperExchange.TradeExecuted', executedMsg);
        this.push(executedMsg);
    }

    private announceTradeFinalized(finalizedMsg: TradeFinalizedMessage) {
        // emit TradeExecutedMessage and push message to stream
        this.emit('PaperExchange.TradeFinalized', finalizedMsg);
        this.push(finalizedMsg);
    }

    private fillMarketOrder(order: PlaceOrderMessage, liveOrder: LiveOrder) {
        let lastTrade: TradeMessage;
        if (order.side === 'buy') {
            if (this.lastSellTradeByProduct.getValue(order.productId)) {
                lastTrade = this.lastSellTradeByProduct.getValue(order.productId);
            } else {
                // TODO implement method to queue market orders then fill them once a TradeMessage is received
                throw new GTTError('Cannot fill buy market order until I have seen sell TradeMessage');
            }
        } else {
            if (this.lastBuyTradeByProduct.getValue(order.productId)) {
                lastTrade = this.lastBuyTradeByProduct.getValue(order.productId);
            } else {
                // TODO implement method to queue market orders then fill them once a TradeMessage is received
                throw new GTTError('Cannot fill sell market order until I have seen buy TradeMessage');
            }
        }

        const executedMsg: TradeExecutedMessage = {
            type: 'tradeExecuted',
            productId: order.productId,
            orderId: liveOrder.id,
            side: order.side,
            price: lastTrade.price,
            orderType: 'market',
            tradeSize: order.size,
            remainingSize: '0',
            time: new Date(),
        };
        this.announceTradeExecuted(executedMsg);

        const finalizedMsg: TradeFinalizedMessage = {
            type: 'tradeFinalized',
            productId: order.productId,
            orderId: liveOrder.id,
            side: order.side,
            price: lastTrade.price,
            remainingSize: '0',
            time: new Date(),
            reason: 'market orders get filled quickly at a bad price',
        };
        this.announceTradeFinalized(finalizedMsg);
    }

    private clearOrder(orderId: string, productId: string) {
        this.pendingOrdersByProduct.getValue(productId).remove(orderId);
        this.liveOrdersById.remove(orderId);
    }
}
