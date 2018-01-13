"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const gdaxFactories_1 = require("../factories/gdaxFactories");
const Logger_1 = require("../utils/Logger");
const Trader_1 = require("../core/Trader");
const RateLimiter_1 = require("../core/RateLimiter");
const StaticCommandSet_1 = require("../lib/StaticCommandSet");
const auth = {
    key: process.env.GDAX_KEY,
    secret: process.env.GDAX_SECRET,
    passphrase: process.env.GDAX_PASSPHRASE
};
const logger = Logger_1.ConsoleLoggerFactory();
const product = 'LTC-USD';
/**
 * Prepare a set of order execution messages. For simplicity, we'll use `StaticCommandSet` to play them to
 * the `Trader`.
 * You need about 0.015 LTC and 50c in your account for this to execute completely without errors.
 * Because of fees and spread, you'll lose a penny or two each time you run it.
 *
 * The messages will
 *
 * 1. Buy 10c worth of LTC at market rates
 * 2. Place a limit order for 0.1 LTC at $1.10
 * 3. Sell 10c worth of LTC at market
 * 4. Place a stop-loss for 0.01 LTC at $10
 * 5. Place a limit buy order for 0.1 LTC at $1.40
 * 6. Cancel the 2 limits orders and the stop orders
 */
const messages = [
    {
        type: 'placeOrder',
        productId: product,
        funds: '0.1',
        side: 'buy',
        orderType: 'market'
    },
    {
        type: 'placeOrder',
        productId: product,
        size: '0.1',
        price: '1.1',
        side: 'buy',
        orderType: 'limit',
        postOnly: true
    },
    {
        type: 'placeOrder',
        productId: product,
        funds: '0.1',
        side: 'sell',
        orderType: 'market'
    },
    {
        type: 'placeOrder',
        productId: product,
        size: '0.01',
        price: '10',
        side: 'sell',
        orderType: 'stop',
        postOnly: true
    },
    {
        type: 'placeOrder',
        productId: product,
        size: '0.1',
        price: '1.4',
        side: 'buy',
        orderType: 'limit',
        postOnly: true
    }
];
// We could also use FeedFactory here and avoid all the config above.
gdaxFactories_1.getSubscribedFeeds({ auth: auth, logger: logger }, [product]).then((feed) => {
    // Configure the trader, and use the API provided by the feed
    const traderConfig = {
        logger: logger,
        productId: product,
        exchangeAPI: feed.authenticatedAPI,
        fitOrders: false
    };
    const trader = new Trader_1.Trader(traderConfig);
    const orders = new StaticCommandSet_1.StaticCommandSet(messages, false);
    let cancellations = 0;
    // We use a limiter to play each order once every 2 seconds.
    const limiter = new RateLimiter_1.default(1, 500);
    // We'll play the orders through the limiter, so connect them up
    orders.pipe(limiter);
    // We can only pipe one stream into the trader, so we can't pipe both the GDAX feed as well as our trading commands.
    // We can pipe one, and then use the event mechanism to handle the other. In this demo we'll pipe the message feed
    // to trader,
    feed.pipe(trader);
    // .. and execute the trade messages as they come out of the limiter.
    limiter.on('data', (msg) => {
        trader.executeMessage(msg);
    });
    // We're basically done. Now set up listeners to log the trades as they happen
    trader.on('Trader.order-placed', (msg) => {
        logger.log('info', 'Order placed', JSON.stringify(msg));
        if (msg.extra.type === 'market') {
            return;
        }
        const cancel = {
            time: null,
            type: 'cancelOrder',
            orderId: msg.id
        };
        orders.messages.push(cancel);
        orders.sendOne();
        cancellations++;
        if (msg.price.toString() === '1.4') {
            orders.end();
        }
    });
    trader.on('Trader.trade-executed', (msg) => {
        logger.log('info', 'Trade executed', JSON.stringify(msg));
    });
    trader.on('Trader.trade-finalized', (msg) => {
        logger.log('info', 'Order complete', JSON.stringify(msg));
    });
    trader.on('Trader.my-orders-cancelled', (ids) => {
        logger.log('info', `${ids.length} orders cancelled`);
    });
    trader.on('Trader.place-order-failed', (err) => {
        logger.log('error', 'Order placement failed', err);
    });
    trader.on('error', (err) => {
        logger.log('error', 'An error occurred', err);
    });
    limiter.on('end', () => {
        // Wait a second to allow final order to settle
        setTimeout(() => {
            console.log('..and we are done. Final Trader state:');
            console.log(JSON.stringify(trader.state()));
            process.exit(0);
            // trader.cancelMyOrders().catch((err: Error) => {
            //     logger.log('error', 'Error cancelling orders', err);
            // });
        }, 5000);
    });
    // Send the orders once the feed has initialised
    feed.once('snapshot', () => {
        orders.send();
    });
});
//# sourceMappingURL=traderDemo.js.map