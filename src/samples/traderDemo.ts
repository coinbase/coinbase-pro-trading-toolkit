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
import { Trader, TraderConfig } from '../core/Trader';
import { CancelOrdersAtPriceRequestMessage, PlaceOrderMessage, StreamMessage, TradeExecutedMessage, TradeFinalizedMessage } from '../core/Messages';
import { StaticCommandSet } from '../lib/StaticCommandSet';
import { LiveOrder } from '../lib/Orderbook';
import { getSubscribedFeeds } from '../factories/gdaxFactories';
import { GDAXFeed, GDAXFeedConfig } from '../exchanges/gdax/GDAXFeed';
import Timer = NodeJS.Timer;

const logger = ConsoleLoggerFactory();

/**
 * Prepare a set of order execution messages. For simplicity, we'll use `StaticCommandSet` to play them to
 * the `Trader`
 */
const messages: StreamMessage[] = [
    {
        type: 'placeOrder',
        productId: 'BTC-USD',
        size: '0.1',
        price: '1.0',
        side: 'buy',
        orderType: 'limit',
        postOnly: true
    } as PlaceOrderMessage,
    {
        type: 'placeOrder',
        productId: 'BTC-USD',
        size: '0.1',
        price: '1.1',
        side: 'buy',
        orderType: 'limit',
        postOnly: true
    } as PlaceOrderMessage,
    {
        type: 'placeOrder',
        productId: 'BTC-USD',
        size: '0.1',
        price: '1.2',
        side: 'buy',
        orderType: 'limit',
        postOnly: true
    } as PlaceOrderMessage,
    {
        type: 'placeOrder',
        productId: 'BTC-USD',
        size: '0.1',
        price: '1.3',
        side: 'buy',
        orderType: 'limit',
        postOnly: true
    } as PlaceOrderMessage,
    {
        type: 'placeOrder',
        productId: 'BTC-USD',
        size: '0.1',
        price: '1.4',
        side: 'buy',
        orderType: 'limit',
        postOnly: true
    } as PlaceOrderMessage
];

const feedOptions: GDAXFeedConfig = {
    apiUrl: process.env.GDAX_API_URL,
    logger: logger,
    auth: {
        key: process.env.GDAX_KEY,
        secret: process.env.GDAX_SECRET,
        passphrase: process.env.GDAX_PASSPHRASE
    },
    channels: ['user'],
    wsUrl: process.env.GDAX_WS_URL
};

getSubscribedFeeds(feedOptions, ['BTC-USD']).then((feed: GDAXFeed) => {

// Configure the trader, and use the API provided by the feed
    const traderConfig: TraderConfig = {
        logger: logger,
        productId: 'BTC-USD',
        exchangeAPI: feed.authenticatedAPI,
        messageFeed: feed,
        fitOrders: false,
        rateLimit: 1
    };
    const trader = new Trader(traderConfig);
    const orders = new StaticCommandSet(messages);
    let timer: Timer = null;
    orders.pipe(trader);
// We're basically done. Now set up listeners to log the trades as they happen
    trader.on('Trader.order-placed', (msg: LiveOrder) => {
        logger.log('info', 'Order placed', JSON.stringify(msg));
        if (!timer) {
            timer = setTimeout(() => {
                orders.sendOne({
                    type: 'cancelOrdersAtPrice',
                    productId: 'BTC-USD',
                    price: '1.1',
                    side: 'buy'
                } as CancelOrdersAtPriceRequestMessage);
            }, 5000);
        }
    });
    trader.on('Trader.trade-executed', (msg: TradeExecutedMessage) => {
        logger.log('info', 'Trade executed', JSON.stringify(msg));
    });
    trader.on('Trader.trade-finalized', (msg: TradeFinalizedMessage) => {
        logger.log('info', 'Order complete', JSON.stringify(msg));
        orders.end();
        setTimeout(() => process.exit(0), 5000);
    });
    trader.on('Trader.my-orders-cancelled', (ids: string[]) => {
        logger.log('info', `${ids.length} orders cancelled`);
    });
    trader.on('error', (err: Error) => {
        logger.log('error', 'Error cancelling orders', err);
    });
    orders.send();
});
