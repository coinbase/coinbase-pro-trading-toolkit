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

import { DefaultAPI, getSubscribedFeeds } from '../factories/gdaxFactories';
import { ConsoleLoggerFactory } from '../utils/Logger';
import { GDAX_WS_FEED, GDAXFeed, GDAXFeedConfig } from '../exchanges/gdax/GDAXFeed';
import { PlaceOrderMessage, TickerMessage } from '../core/Messages';
import { GDAX_API_URL } from '../exchanges/gdax/GDAXExchangeAPI';
import { LiveOrder } from '../lib/Orderbook';
import { createPriceTrigger, createTickerTrigger } from '../core/Triggers';
import * as PushBullet from 'pushbullet';
import { Big } from '../lib/types';

const logger = ConsoleLoggerFactory();
const pusher = new PushBullet(process.env.PUSHBULLET_KEY);
const deviceID = process.env.PUSHBULLET_DEVICE_ID;
const product = 'ETH-USD';

/**
 * Remember to set GDAX_KEY, GDAX_SECRET and GDAX_PASSPHRASE envars to allow trading
 */

const gdaxAPI = DefaultAPI(logger);
const [base, quote] = product.split('-');
const spread = Big('2.5');

const options: GDAXFeedConfig = {
    logger: logger,
    auth: { key: null, secret: null, passphrase: null }, // use public feed
    channels: ['ticker'],
    wsUrl: GDAX_WS_FEED,
    apiUrl: GDAX_API_URL
};

getSubscribedFeeds(options, [product]).then((feed: GDAXFeed) => {
    createTickerTrigger(feed, product)
        .setAction((ticker: TickerMessage) => {
            const currentPrice = ticker.price;
            createPriceTrigger(feed, product, currentPrice.minus(spread))
                .setAction((event: TickerMessage) => {
                    pushMessage('Price Trigger', `${base} price has fallen and is now ${event.price} ${quote} on ${product} on GDAX`);
                    submitTrade('buy', '0.01');
                });
            createPriceTrigger(feed, product, currentPrice.plus(spread))
                .setAction((event: TickerMessage) => {
                    pushMessage('Price Trigger', `${base} price has risen and is now ${event.price} ${quote} on ${product} on GDAX`);
                    submitTrade('buy', '0.01');
                });
        });
});

function submitTrade(side: string, amount: string) {
    const order: PlaceOrderMessage = {
        type: 'order',
        time: null,
        productId: product,
        orderType: 'market',
        side: side,
        size: amount
    };
    gdaxAPI.placeOrder(order).then((result: LiveOrder) => {
        pushMessage('Order executed', `Order to sell 0.1 ${base} placed. Result: ${result.status}`);
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
