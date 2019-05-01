---
title: Introduction to Triggers
keywords: CBPTT, trading, trigger, push notification, Coinbase Pro, Poloniex
last_updated: August 21, 2017
tags: [getting_started, tutorials]
summary: "In this tutorial, we will set up triggers to execute a trade when prices cross a given threshold"
sidebar: cbptt_sidebar
permalink: cbptt_tutorials_triggers.html
folder: cbptt
---

# Introduction

This tutorial builds on from what we've done in previous sessions to build a small demo app that watches
 exchange book prices and then executes a trade if the threshold is reached.

 For added winning, we'll send a push notification to your phone when this happens.

# Triggers

Triggers are little more than semantic sugar that abstract out event listeners and replaces them with functions that make it
 much clearer what the _intent_ of a specific event listener is.

 So instead of

    feed.on('data', msg => {
        if (msg.type !== 'ticker' || msg.productId !== 'BTC-EUR') {
            return;
        }
        if (msg.productId == 'BTC-EUR' && msg.price && msg.price > 1000) {
            doSomething(msg as TickerMessage);
        }
    });

we have

    CBPTT.Core.createPriceTrigger(feed, 'BTC-EUR', 1000)
      .setAction((event: TickerMessage) => {
          doSomething(event);
      });

The second snippet makes it explicit that we're executing `doSomething` based on a price threshold trigger. The Price trigger implementation also has a few extra nuances: It handles price changes across the threshold whether the price is rising or falling; and the trigger clears after the first
time it has activated, so you won't be spammed with events.

# Push notifications

We'll be using [PushBullet](https://www.pushbullet.com/) to handle push notifications to our phone for this tutorial.

{% include note.html content="The PushBullet integration is very loosely coupled (it's just the npm package, really), so if you'd rather not use push notifications,
just comment out the few lines of code that refer to it, and log the notifications to the console instead" %}

You'll need a (free) account on the PushBullet website. You can use a gmail address to sign up. You also need to install the PushBullet app onto your phone (there are Android and iOS versions).

Then you need to grab the following information:

* *Your API key* - Go to the [settings page](https://www.pushbullet.com/#settings/account) and click "Create an access token". Save this string to the `PUSHBULLET_KEY` environment variable in your OS.
* *Your device ID* - First add your device to your account using the mobile app. Then, on your computer, run `curl --header "Access-Token: $PUSHBULLET_KEY" https://api.pushbullet.com/v2/devices` in a console and copy the `iden` string associated with your device. Store this in the `PUSHBULLET_DEVICE_ID` envar.

# The demo

{% include note.html content="The full code for this demo is available at `tutorials/t005_alertTrader.ts`." %}

The basic strategy of our bot is this:

* After configuring and connecting to the message feed,
* Get the next ticker price
* Set two triggers, once above and one below the price with a given spread between the two
* If an event triggers,
  * push a notification to my phone
  * and place a small trade, buying at the lower price and selling at the higher price

*Note:* You need the following environment variables to be set correctly for this to work:

* PUSHBULLET_KEY
* PUSHBULLET_DEVICE_ID
* COINBASE_PRO_PASSPHRASE
* COINBASE_PRO_KEY
* COINBASE_PRO_SECRET

If you don't have one, you can create a Coinbase Pro API key on [the website](https://pro.coinbase.com/settings/api). Make sure to enable the `view` and `trading` permissions.

Now that all the admin is out of the way, let's get coding!

Usually we use `FeedFactory` to grab a feed, but since we're only interested in ticker messages, let's save some bandwidth and only subscribe to that channel:

    const options: CoinbaseProFeedConfig = {
        logger: logger,
        auth: { key: null, secret: null, passphrase: null}, // use public feed
        channels: ['ticker'],
        wsUrl: COINBASE_PRO_WS_FEED,
        apiUrl: COINBASE_PRO_API_URL
    };

    CBPTT.Factories.CoinbasePro.getSubscribedFeeds(options, [product]).then((feed: CoinbaseProFeed) => {
       ...
    });

Pretty painless. Note that we nulled out the `auth` object to force the feed to use unauthenticated messages. You can set `auth: null` to just use the defaults, which since you have your Coinbase Pro API keys set in the environment, will automatically use those and receive authenticated messages (nice if you want to confim when your trades are filled).

Now we can make use of a [TickerTrigger](apiref/modules/_src_core_triggers_.html) to get the next ticker from the websocket feed. We extract
the current price, and use that as the basis to create two price triggers, one above, and one below the current price:

    CBPTT.Core.createTickerTrigger(feed, product).setAction((ticker: TickerMessage) => {
        const currentPrice = ticker.price;
        CBPTT.Core.createPriceTrigger(feed, product, currentPrice.minus(spread)).setAction((event: TickerMessage) => {
            pushMessage('Price Trigger', `${base} price has fallen and is now ${event.price} ${quote} on ${product} on Coinbase Pro`);
            submitTrade('buy', '0.01');
        });
        CBPTT.Core.createPriceTrigger(feed, product, currentPrice.plus(spread)).setAction((event: TickerMessage) => {
            pushMessage('Price Trigger', `${base} price has risen and is now ${event.price} ${quote} on ${product} on Coinbase Pro`);
            submitTrade('buy', '0.01');
        });
    });

The `pushMessage` function just uses the `PushBullet` A{I to direct the information to your phone:

    const pusher = new CBPTT.utils.PushBullet(process.env.PUSHBULLET_KEY);
    function pushMessage(title: string, msg: string): void {
        pusher.note(deviceID, title, msg, (err: Error, res: any) => {
            if (err) {
                logger.log('error', 'Push message failed', err);
                return;
            }
            logger.log('info', 'Push message result', res);
        });
    }

and `submitTrade` uses the REST API to place a trade for you:


    const coinbaseProAPI = CBPTT.Factories.CoinbasePro.DefaultAPI(logger);
    function submitTrade(side: string, amount: string) {
        const order: PlaceOrderMessage = {
            type: 'order',
            time: null,
            productId: product,
            orderType: 'market',
            side: side,
            size: amount
        };
        coinbaseProAPI.placeOrder(order).then((result: LiveOrder) => {
            pushMessage('Order executed', `Order to sell 0.1 ${base} placed. Result: ${result.status}`);
        });
    }


# Next steps

This is just a little proof-of-concept app. But it can be used as a template to do some real bot-making.

Here's are some suggestions to play around with this code some more:

* Use `commander` to specify products, price targets and trade orders from the command line.
* Add a `LiveOrderbook` and add some of your secret trading logic to estimate the upper and
  lower price ranges automatically, rather than specifying them manually.
  * Once you have a LiveOrderbook, you might consider using a `Trader` class to place your trades
    rather than using the REST API directly. `Trader` will be the focus of another tutorial.
* Write a new Trigger that responds to `tradeFinalized` messages so that you can be notified when you order is filled.
* Use the API to fetch your balances and trade based on how much you have available.
* Add some feedback from the push notification to reset targets (e.g. "Drop targets by $20")

{% include tip.html content="Done something awesome? Contribute it back into the project by submitting a PR! Check out our [contribution guidelines](cbptt_contributing.html) for more information" %}
