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
var GTT = require("gdax-trading-toolkit");
var types_1 = require("gdax-trading-toolkit/build/src/lib/types");
var exchanges_1 = require("gdax-trading-toolkit/build/src/exchanges");
var GDAXExchangeAPI_1 = require("gdax-trading-toolkit/build/src/exchanges/gdax/GDAXExchangeAPI");
var logger = GTT.utils.ConsoleLoggerFactory();
var pusher = new GTT.utils.PushBullet(process.env.PUSHBULLET_KEY);
var deviceID = process.env.PUSHBULLET_DEVICE_ID;
var product = 'ETH-USD';
/**
 * Remember to set GDAX_KEY, GDAX_SECRET and GDAX_PASSPHRASE envars to allow trading
 */
var gdaxAPI = GTT.Factories.GDAX.DefaultAPI(logger);
var _a = product.split('-'), base = _a[0], quote = _a[1];
var spread = types_1.Big('0.15');
var options = {
    logger: logger,
    auth: { key: null, secret: null, passphrase: null },
    channels: ['ticker'],
    wsUrl: exchanges_1.GDAX_WS_FEED,
    apiUrl: GDAXExchangeAPI_1.GDAX_API_URL
};
GTT.Factories.GDAX.getSubscribedFeeds(options, [product]).then(function (feed) {
    GTT.Core.createTickerTrigger(feed, product)
        .setAction(function (ticker) {
        var currentPrice = ticker.price;
        GTT.Core.createPriceTrigger(feed, product, currentPrice.minus(spread))
            .setAction(function (event) {
            pushMessage('Price Trigger', base + " price has fallen and is now " + event.price + " " + quote + " on " + product + " on GDAX");
            submitTrade('buy', '0.01');
        });
        GTT.Core.createPriceTrigger(feed, product, currentPrice.plus(spread))
            .setAction(function (event) {
            pushMessage('Price Trigger', base + " price has risen and is now " + event.price + " " + quote + " on " + product + " on GDAX");
            submitTrade('buy', '0.01');
        });
    });
    GTT.Core.createTickerTrigger(feed, product, false)
        .setAction(function (ticker) {
        console.log(GTT.utils.printTicker(ticker, 3));
    });
});
function submitTrade(side, amount) {
    var order = {
        type: 'order',
        time: null,
        productId: product,
        orderType: 'market',
        side: side,
        size: amount
    };
    gdaxAPI.placeOrder(order).then(function (result) {
        pushMessage('Order executed', "Order to sell 0.1 " + base + " placed. Result: " + result.status);
    });
}
function pushMessage(title, msg) {
    pusher.note(deviceID, title, msg, function (err, res) {
        if (err) {
            logger.log('error', 'Push message failed', err);
            return;
        }
        logger.log('info', 'Push message result', res);
    });
}
