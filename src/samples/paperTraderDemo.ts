import { ExchangeFeed } from '../exchanges';
import { Ticker } from '../exchanges/PublicExchangeAPI';

import { ConsoleLoggerFactory } from '../utils/Logger';
import { Trader, TraderConfig } from '../core/Trader';
import {
    SnapshotMessage, TradeMessage, LevelMessage, TradeExecutedMessage, TradeFinalizedMessage, ErrorMessage,
} from '../core/Messages';
import * as GDAX from '../factories/gdaxFactories';
import { PaperExchange } from '../exchanges/paper/PaperExchange';
import { LiveBookConfig, LiveOrderbook, SkippedMessageEvent } from '../core/LiveOrderbook';
import { LiveOrder } from '../lib/Orderbook';
import { Big, ZERO, BigJS } from '../lib/types';
import Dictionary from 'typescript-collections/dist/lib/Dictionary';
import { PlaceOrderMessage } from '../core/index';

const logger = ConsoleLoggerFactory();

const product = 'ETH-USD';

// create feed WITHOUT authentication to ensure no account activity can really occur
GDAX.FeedFactory(logger, [product]).then((feed: ExchangeFeed) => {
    const paperExchange = new PaperExchange({
        logger: logger,

        // To further simulate real trading conditions we can add occasional errors and network latency
        errorRate: .05, // Expressed as a percentage (.05 === 5%)
        latencyRange: {low: 25, high: 150} // The paper exchange uses this range of milliseconds to generate random latencies.
    });
    const positionDeltaByProduct = new Dictionary<string, BigJS>();

    // Configure the trader using the Paper Exchange API and not the exchange feed
    const traderConfig: TraderConfig = {
        logger: logger,
        productId: product,
        exchangeAPI: paperExchange,
        fitOrders: false,
    };
    const trader = new Trader(traderConfig);

    // register for Trade events
    trader.on('Trader.order-placed', (msg: LiveOrder) => {
        logger.log('info', 'Order placed', JSON.stringify(msg, null, 2));
    });

    trader.on('Trader.trade-executed', (msg: TradeExecutedMessage) => {
        logger.log('info', 'Trade executed', JSON.stringify(msg, null, 2));

        let newDelta = positionDeltaByProduct.getValue(msg.productId);
        // after trade is executed, need to recalculate overall position delta
        let deltaChange = ZERO;
        if (msg.side === 'buy') {
            deltaChange = Big(msg.tradeSize);
        } else if (msg.side === 'sell') {
            deltaChange = Big(msg.tradeSize).neg();
        }
        // if delta has not been previously defined
        if (newDelta === undefined) {
            // set delta to 0
            newDelta = ZERO;
        }

        // update position delta based on delta change that this trade created
        newDelta = newDelta.add(deltaChange);
        positionDeltaByProduct.setValue(msg.productId, newDelta);
    });
    trader.on('Trader.trade-finalized', (msg: TradeFinalizedMessage) => {
        logger.log('info', 'Trade finalized', JSON.stringify(msg));
    });
    trader.on('Trader.my-orders-cancelled', (ids: string[]) => {
        logger.log('info', `${ids.length} orders cancelled`);
    });
    trader.on('Trader.place-order-failed', (err: ErrorMessage) => {
        logger.log('error', 'Order placement failed', err);
    });
    trader.on('error', (err: Error) => {
        logger.log('error', 'An error occurred', err);
    });

    const liveBookConfig: LiveBookConfig = {
        product: product,
        logger: logger
    };
    const book = new LiveOrderbook(liveBookConfig);
    // register for LiveOrderbook events
    book.on('LiveOrderbook.snapshot', (_snapshot: SnapshotMessage) => {
        // maybe do something
    });
    book.on('LiveOrderbook.ticker', (_ticker: Ticker) => {
       // maybe do something
    });
    book.on('LiveOrderbook.trade', (trade: TradeMessage) => {
        // place appropriate buy/sell order to remain delta neutral
        if (trade.side === 'buy' || trade.side === 'sell') {
            const positionDelta = positionDeltaByProduct.getValue(trade.productId);
            const pendingBuyOrders = trader.state().asks.length;
            const pendingSellOrders = trader.state().bids.length;

            // if there is no existing delta and there are no pending buy/sell orders
            if (positionDelta === undefined &&  pendingBuyOrders === 0 && pendingSellOrders === 0 ) {
                // then no delta position defined for this product, therefore create "straddle" orders
                // to buy and sell 1 dollar above and below the last trade price

                // We can use the trader placeOrder with PaperExchange to chain orders async...
                return trader.placeOrder({
                    type: 'placeOrder',
                    time: new Date(),
                    productId: trade.productId,
                    price: Big(trade.price).add(.01).toString(),
                    size: '1',
                    side: 'sell',
                    orderType: 'limit',
                }).then(() => {
                    return trader.placeOrder({
                        type: 'placeOrder',
                        time: new Date(),
                        productId: trade.productId,
                        price: Big(trade.price).minus(.01).toString(),
                        size: '1',
                        side: 'buy',
                        orderType: 'limit',
                    });
                });
            } else if (positionDelta && positionDelta.greaterThan(0)) {
                const deltaChangeNeeded = positionDelta.abs();
                // need to place sell order to get back to delta nuetral

                // ...or we can simply execute order placement with synchronous call to executeMessage
                return trader.executeMessage({
                    type: 'placeOrder',
                    time: new Date(),
                    productId: trade.productId,
                    price: Big(trade.price).add(.01).toString(),
                    size: deltaChangeNeeded.toString(),
                    side: 'sell',
                    orderType: 'limit',
                } as PlaceOrderMessage);
            } else if (positionDelta && positionDelta.lessThan(0)) {
                const deltaChangeNeeded = positionDelta.abs();
                // need to place buy order to get back to delta nuetral
                return trader.executeMessage({
                    type: 'placeOrder',
                    time: new Date(),
                    productId: trade.productId,
                    price: Big(trade.price).minus(.01).toString(),
                    size: deltaChangeNeeded.toString(),
                    side: 'buy',
                    orderType: 'limit',
                } as PlaceOrderMessage);
            } else {
                // already at delta neutral, so no action needed
                return null;
            }
        }
    });
    book.on('LiveOrderbook.update', (_level: LevelMessage) => {
        // maybe do something
    });
    book.on('LiveOrderbook.skippedMessage', (details: SkippedMessageEvent) => {
        // On GDAX, this event should never be emitted, but we put it here for completeness
        logger.log('error','SKIPPED MESSAGE', details);
        logger.log('error','Reconnecting to feed');
        feed.reconnect(0);
    });
    book.on('end', () => {
        logger.log('info', 'Orderbook closed');
    });
    book.on('error', (err) => {
        logger.log('error', 'Livebook errored: ', err);
        feed.pipe(book);
    });

    // pipe real exchange feed to paperExchange so it can see all trade messages coming from feed
    feed.pipe(paperExchange);
    // pipe paperExchange to the trader so paperExchange can inject order fill messages
    paperExchange.pipe(book);
    // finally pipe trader to order book
    book.pipe(trader);
});
