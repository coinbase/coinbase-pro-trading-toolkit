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

import * as GTT from "gdax-trading-toolkit";
import { Big } from "gdax-trading-toolkit/build/src/lib/types";
import { GDAX_WS_FEED, GDAXFeed, GDAXFeedConfig } from "gdax-trading-toolkit/build/src/exchanges";
import { GDAX_API_URL } from "gdax-trading-toolkit/build/src/exchanges/gdax/GDAXExchangeAPI";
import { PlaceOrderMessage, TickerMessage } from "gdax-trading-toolkit/build/src/core";
import { LiveOrder } from "gdax-trading-toolkit/build/src/lib";

const logger = GTT.utils.ConsoleLoggerFactory();
const pusher = new GTT.utils.PushBullet(process.env.PUSHBULLET_KEY);
const deviceID = process.env.PUSHBULLET_DEVICE_ID;
const product = 'ETH-USD';
/**
 * Remember to set GDAX_KEY, GDAX_SECRET and GDAX_PASSPHRASE envars to allow trading
 */

const gdaxAPI = GTT.Factories.GDAX.DefaultAPI(logger);
const [base, quote] = product.split('-');
const spread = Big('0.15');

const options: GDAXFeedConfig = {
    logger: logger,
    auth: undefined, // use public feed
    channels: ['ticker'],
    wsUrl: GDAX_WS_FEED,
    apiUrl: GDAX_API_URL
};

GTT.Factories.GDAX.getSubscribedFeeds(options, [product]).then((feed: GDAXFeed) => {
    GTT.Core.createTickerTrigger(feed, product)
        .setAction((ticker: TickerMessage) => {
            const currentPrice = ticker.price;
            GTT.Core.createPriceTrigger(feed, product, currentPrice.minus(spread))
                .setAction((event: TickerMessage) => {
                    pushMessage('Price Trigger', `${base} price has fallen and is now ${event.price} ${quote} on ${product} on GDAX`);
                    submitTrade('buy', '0.01');
                });
            GTT.Core.createPriceTrigger(feed, product, currentPrice.plus(spread))
                .setAction((event: TickerMessage) => {
                    pushMessage('Price Trigger', `${base} price has risen and is now ${event.price} ${quote} on ${product} on GDAX`);
                    submitTrade('sell', '0.01');
                });
        });
    GTT.Core.createTickerTrigger(feed, product, false)
        .setAction((ticker: TickerMessage) => {
            console.log(GTT.utils.printTicker(ticker, 3));
        });
});

function submitTrade(side: string, amount: string) {
    const order: PlaceOrderMessage = {
        type: 'placeOrder',
        time: null,
        productId: product,
        orderType: 'market',
        side: side,
        size: amount
    };
    gdaxAPI.placeOrder(order).then((result: LiveOrder) => {
        pushMessage('Order executed', `Order to ${order.side} 0.1 ${base} placed. Result: ${result.status}`);
    });
}

function pushMessage(title: string, msg: string): void {
    pusher.note(deviceID, title, msg, (err: Error, res: any) => {
        if (err) {
            logger.log('error', 'Push message failed', err);
            return;
        }
        logger.log('info', 'Push message result', res);
    });
}
