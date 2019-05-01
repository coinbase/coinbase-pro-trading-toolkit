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

import * as CBPTT from "coinbase-pro-trading-toolkit";
import { Big } from "coinbase-pro-trading-toolkit/build/src/lib/types";
import { COINBASE_PRO_WS_FEED, CoinbaseProFeed, CoinbaseProFeedConfig } from "coinbase-pro-trading-toolkit/build/src/exchanges";
import { COINBASE_PRO_API_URL } from "coinbase-pro-trading-toolkit/build/src/exchanges/coinbasePro/CoinbaseProExchangeAPI";
import { PlaceOrderMessage, TickerMessage } from "coinbase-pro-trading-toolkit/build/src/core";
import { LiveOrder } from "coinbase-pro-trading-toolkit/build/src/lib";

const logger = CBPTT.utils.ConsoleLoggerFactory();
const pusher = new CBPTT.utils.PushBullet(process.env.PUSHBULLET_KEY);
const deviceID = process.env.PUSHBULLET_DEVICE_ID;
const product = 'ETH-USD';
/**
 * Remember to set COINBASE_PRO_KEY, COINBASE_PRO_SECRET and COINBASE_PRO_PASSPHRASE envars to allow trading
 */

const coinbaseProAPI = CBPTT.Factories.CoinbasePro.DefaultAPI(logger);
const [base, quote] = product.split('-');
const spread = Big('0.15');

const options: CoinbaseProFeedConfig = {
    logger: logger,
    auth: undefined, // use public feed
    channels: ['ticker'],
    wsUrl: COINBASE_PRO_WS_FEED,
    apiUrl: COINBASE_PRO_API_URL
};

CBPTT.Factories.CoinbasePro.getSubscribedFeeds(options, [product]).then((feed: CoinbaseProFeed) => {
    CBPTT.Core.createTickerTrigger(feed, product)
        .setAction((ticker: TickerMessage) => {
            const currentPrice = ticker.price;
            CBPTT.Core.createPriceTrigger(feed, product, currentPrice.minus(spread))
                .setAction((event: TickerMessage) => {
                    pushMessage('Price Trigger', `${base} price has fallen and is now ${event.price} ${quote} on ${product} on Coinbase Pro`);
                    submitTrade('buy', '0.01');
                });
            CBPTT.Core.createPriceTrigger(feed, product, currentPrice.plus(spread))
                .setAction((event: TickerMessage) => {
                    pushMessage('Price Trigger', `${base} price has risen and is now ${event.price} ${quote} on ${product} on Coinbase Pro`);
                    submitTrade('sell', '0.01');
                });
        });
    CBPTT.Core.createTickerTrigger(feed, product, false)
        .setAction((ticker: TickerMessage) => {
            console.log(CBPTT.utils.printTicker(ticker, 3));
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
    coinbaseProAPI.placeOrder(order).then((result: LiveOrder) => {
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
