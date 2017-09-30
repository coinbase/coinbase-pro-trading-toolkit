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

import { ConsoleLoggerFactory } from '../utils/Logger';
import * as GDAX from '../factories/gdaxFactories';
import { LiveOrderbook } from '../core/LiveOrderbook';
import { ExchangeRateFilter } from '../core/ExchangeRateFilter';
import { BookReplicator } from '../MarketMaker/BookReplicator';
import { SimpleFXServiceFactory } from '../factories/fxServiceFactories';
import { Readable } from 'stream';
import { Trader } from '../core/Trader';
import { PlaceOrderMessage, TradeExecutedMessage } from '../core/Messages';
import { useDefaultReplicatorRules } from '../MarketMaker/DefaultReplicatorRules';
import { BookReplicatorSettings } from '../MarketMaker/BookReplicatorSettings';
import RateLimiter from '../core/RateLimiter';
import { GDAXFeed } from '../exchanges/index';
import { GDAX_API_URL, GDAXExchangeAPI } from '../exchanges/gdax/GDAXExchangeAPI';
import { GDAX_WS_FEED, GDAXFeedConfig } from '../exchanges/gdax/GDAXFeed';

/*
// For arguments' sake, let's say we're copying the GDAX BTC-USD book onto the GDAX BTC-EUR book.
// We replicate orders on the target book by piping in the message stream from GDAX to the rate converter which uses
// the latest exchange rate to convert BTC-USD to BTC-EUR. This stream is then piped to the replicator which selects and
// modifies orders according to our taste (we divide order size by 4 and copy 100 BTC-worth on each side of the book);
// finally replicator streams a series of trade control messages that the replicatorTrader receives and places the necessary trades
*/
const sourceProduct = 'BTC-USD';
const targetProduct = 'BTC-EUR';
const fxPair = { from: 'USD', to: 'EUR' };
const RATE_LIMIT = 20; // messages per second
let replicatorTrader: Trader;

// Create support services
const logger = ConsoleLoggerFactory();
const { rateConverter, fxService } = createExchangeRateFilter('yahoo', 10 * 1000);

let gdaxFeed: GDAXFeed;

// Wait until we have an exchange rate before getting the feed
fxService.once('FXRateUpdate', () => {
    // GDAX.FeedFactory(logger, [sourceProduct]).then((feed: GDAXFeed) => {
    const options: GDAXFeedConfig = {
        logger: logger,
        channels: ['level2', 'user', 'ticker'],
        auth: { key: process.env.GDAX_KEY, secret: process.env.GDAX_SECRET, passphrase: process.env.GDAX_PASSPHRASE },
        apiUrl : GDAX_API_URL,
        wsUrl: GDAX_WS_FEED
    };
    GDAX.getSubscribedFeeds(options, [sourceProduct]).then((feed: GDAXFeed) => {
        gdaxFeed = feed;
        setupReplicator(gdaxFeed);
    });
});

function setupReplicator(sourceFeed: Readable) {
    const settings = new BookReplicatorSettings();
    settings.update({
        isActive: true,
        fxChangeThreshold: 0.005,
        quoteCurrencyTarget: 30000,
        baseCurrencyTarget: 10,
        extraSpread: 1,
        replicationFraction: 0.1
    });
    const sourceBook = new LiveOrderbook({
        product: sourceProduct,
        logger: logger
    });
    const replicator = new BookReplicator({
        logger: logger,
        settings: settings,
        fxService: fxService,
        fxPair: fxPair,
        sourceOrderbook: sourceBook,
        targetProductId: targetProduct
    });
    useDefaultReplicatorRules(replicator, 6, 2);
    // Connect up the live orderbook
    sourceFeed.pipe(rateConverter).pipe(sourceBook);

    // const gdaxAPI = GDAX.DefaultAPI(logger);
    const gdaxAPI = new GDAXExchangeAPI({
        logger: logger,
        apiUrl: 'http://localhost:3001',
        auth: {
            key: process.env.GDAX_KEY,
            secret: process.env.GDAX_SECRET,
            passphrase: process.env.GDAX_PASSPHRASE
        }
    });
    replicatorTrader = new Trader({
        logger: logger,
        productId: targetProduct,
        exchangeAPI: gdaxAPI,
        fitOrders: true,
        pricePrecision: 2,
        sizePrecision: 6
    });
    replicator.pipe(new RateLimiter(RATE_LIMIT, 1000)).pipe(replicatorTrader);
    replicatorTrader.on('Trader.order-placed', logMessage.bind(null, 'Target book order placed'));
    replicatorTrader.on('Trader.order-canceled', logMessage.bind(null, 'Target book order cancelled'));

    // This is only half a market-making system though. We also need a way to detect when our limit orders are filled
    // so that we can replay them on the source order book. So to do that, let's set up some event listeners to detect
    // and respond to those trades
    // const sourceTrader: Trader = new Trader({
    //     logger: logger,
    //     productId: sourceProduct,
    //     exchangeAPI: DefaultBitfinexAPI(logger)
    // });
    // For information purposes, let's just log when a limit order gets placed and cancelled.
    // When an order gets filled, we need to replay it on the source book
    replicatorTrader.on('Trader.order-executed', (msg: TradeExecutedMessage) => {
        const req: PlaceOrderMessage = {
            type: 'placeOrder',
            productId: sourceProduct,
            orderType: 'market',
            price: msg.price,
            size: msg.tradeSize,
            side: msg.side === 'buy' ? 'sell' : 'buy',
            time: new Date()
        };
        // sourceTrader.placeOrder(req).then((order: LiveOrder) => {
        //     console.log(order.id + ' placed.')
        // });
        logMessage('This order should be replayed', req);
    });
    // Start the replicator
    replicator.isActive = true;

}

function logMessage(title: string, msg: any) {
    logger.log('info', title, JSON.stringify(msg));
}

function createExchangeRateFilter(serviceProvider: string, refreshRate: number): any {
    // Create and set up the exchange rate service. Use Yahoo Finance and refresh every 10 seconds
    const _fxService = SimpleFXServiceFactory(serviceProvider, logger);
    _fxService.addCurrencyPair(fxPair)
        .setRefreshInterval(1000 * 10);

    const _fxFilter = new ExchangeRateFilter({
        fxService: _fxService,
        logger: logger,
        pair: fxPair,
        precision: 2
    });

    return {
        rateConverter: _fxFilter,
        fxService: _fxService
    };
}
