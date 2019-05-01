---
title: Introduction to the Feed streams
keywords: CBPTT, feed data, exchange, Coinbase Pro
last_updated: August 2, 2017
tags: [getting_started, tutorials]
summary: "Connecting to a data feed source"
sidebar: cbptt_sidebar
permalink: cbptt_tutorials_feed.html
folder: cbptt
---

# Introduction

In the CBPTT, all feed data is consolidated and standardized and streamed as a set
of [Messages](apiref/modules/_src_core_messages_.html). Regardless of whether
the underlying exchange offers a Websocket feed, REST API, or both, the data
is collected and reformulated into a consistent data set and behaviour.

In this chapter we're simply going to connect to the Coinbase Pro data feed and tally
up the types of messages that are received.

# CBPTT Messages

All messages passed from one component to another in the CBPTT are derived from `StreamMessage`.
It is defined as

    export interface StreamMessage {
        type: string,
        time: Date,
    }

## LiveOrderbook messages

There are several message types derived from this, including `OrderbookMessage` which is the base class
for messages that represent realtime data:

    export interface OrderbookMessage extends StreamMessage {
        sequence: number;
        sourceSequence?: number;
        productId: string;
        side: string;
    }

Then there messages that are used for maintaining a live orderbook state. There are two broad classes of
order messages depending on whether we're dealing with fine-grained (Level 3, or order-level) messaging
or aggregated, or level 2-based messages. Where possible, the CBPTT will use level 2 messages for live
 orderbooks, but level 3 messages are also supported for exchanges that don't offer the former.

    export interface BaseOrderMessage extends OrderbookMessage {
        orderId: string;
        price: string;
    }

    export interface LevelMessage extends OrderbookMessage {
        price: string;
        size: string;
        count: number;
    }

Notice that the `BaseOrderMessage` carries an `orderId`, while the `LevelMessage` does not.
Each message has several sub-types representing new orders, cancelled orders, and trades.
See the [reference documentation](apiref/modules/_src_core_messages_.html) for specifics.


# Diving In

The data feed is the starting point for nearly everything you will do in the CBPTT.
Once a handle to a feed stream is obtained, you can treat it as you would any other
node.js stream, including pipe it to other streams, attach and listeners to it.

In this section we'll show you how easy it is to connect to a feed source and
process the messages it emits.

## The basics

Most CBPTT components take a logger object in their configuration, so let's create a
default logger that writes to the console. There's a convenience `ConsoleLoggerFactory`
method that will create one for you, so let's use that:

    import * as CBPTT from 'coinbase-pro-trading-toolkit';

    const logger = CBPTT.utils.ConsoleLoggerFactory();

The easiest way to grab hold of a feed stream is to use the utility factory function
`FeedFactory`. There will be one of these functions for each exchange supported
on the CBPTT.

For Coinbase Pro feeds, all we need is a logger instance and an array of products
to subscribe to. Under the hood, a connection to the REST API and Websocket feeds will
be made and the data will be coerced into CBPTT messages.

`FeedFactory` returns a Promise, so we must wait for it to be resolved before we can start working with data.

The CBPTT convention is that once a product has been subscribed to, the first message received is a `SnapshotMessage`
giving the current state of the order book. Subsequent messages reflect changes to the orderbook.

Other messages that you might expect include `TickerMessage` and `TradeMessage`.

If you supply authentication credentials to the feed factory, you might also receive `MyOrderPlacedMessage`
emitted when _my_ order has been placed, `TradeExecutedMessage`, emitted when one of _my_ orders is matched, `TradeFinalizedMessage`, for when my order is completely filled, or cancelled.


    const products: string[] = ['BTC-USD', 'ETH-USD', 'LTC-USD'];
    CBPTT.Factories.CoinbasePro.FeedFactory(logger, products).then((feed: CoinbaseProFeed) => {
        // Do stuff with the feed
    });

{% include tip.html content="For brevity, `import` statements will be omitted from tutorial source snippets. If you're using a TypeScript-friendly IDE, type definition imports should be added automatically. If you're using standard Javascript, the CBPTT is usually the only import you'll need." %}

## Doing something (not so) useful

Let's do something with the data. How about we tally up each message, sorting by
type, and separating by product, and then periodically print the tallies?

This is pretty straightforward. After setting up the tally variables, we
 subscribe to the `data` event on the feed (it's just a standard node.js stream
 and EventEmitter) and process the messages as they arrive.

 Node streams emit objects of type `any`, but we know these are CBPTT messages, so we will typecast
 messages as an [`OrderbookMessage`](apiref/interfaces/_core_messages_.orderbookmessage.html)
 which carries a `productId` field. Most messages will be, but we check for the presence of that field
 first and log it as an 'other' message if not.

    const logger = CBPTT.utils.ConsoleLoggerFactory();
    const products: string[] = ['BTC-USD', 'ETH-USD', 'LTC-USD'];
    const tallies: any = {};
    products.forEach((product: string) => {
        tallies[product] = {};
    });

    let count = 0;

    CBPTT.Factories.CoinbasePro.FeedFactory(logger, products).then((feed: CoinbaseProFeed) => {
        feed.on('data', (msg: OrderbookMessage) => {
            count++;
            if (!(msg as any).productId) {
                tallies.other += 1;
            } else {
                const tally = tallies[msg.productId];
                if (!tally[msg.type]) {
                    tally[msg.type] = 0;
                }
                tally[msg.type] += 1;
            }
            if (count % 1000 === 0) {
                printTallies();
            }
        });
    }).catch((err: Error) => {
        logger.log('error', err.message);
        process.exit(1);
    });

The `printTallies` function is just a bit of string-fu:

    function printTallies() {
        console.log(`${count} messages received`);
        for (let p in tallies) {
            let types: string[] = Object.keys(tallies[p]).sort();
            let tally: string = types.map(t => `${t}: ${tallies[p][t]}`).join('\t');
            console.log(`${p}: ${tally}`);
        }
    }

## Run the script

If you've skipped ahead, or want to see the finished product, the full script resides at `/tutorials/t001_feeds.ts`.
 Execute it with

    $ ts-node tutorials/t001_feeds.ts

{% include tip.html content="`ts-node` is a useful utility that compiles and runs Typescript code directly. Install it with `npm install -g ts-node typescript`" %}

Typical output for the script will look like:

    2017-08-02T14:31:58.648Z - info: Creating new Coinbase Pro Websocket connection to wss://ws-feed.pro.coinbase.com
    2017-08-02T14:32:00.203Z - debug: Connection to wss://ws-feed.pro.coinbase.com  has been established.
    1000 messages received
    BTC-USD: newOrder: 111  orderDone: 112  snapshot: 1     trade: 1        unknown: 111
    ETH-USD: newOrder: 168  orderDone: 174  snapshot: 1     trade: 7        unknown: 168
    LTC-USD: newOrder: 42   orderDone: 56   snapshot: 1     trade: 3        unknown: 44
    2000 messages received
    BTC-USD: newOrder: 250  orderDone: 254  snapshot: 1     trade: 1        unknown: 250
    ETH-USD: newOrder: 302  orderDone: 303  snapshot: 1     trade: 8        unknown: 303
    LTC-USD: newOrder: 101  orderDone: 114  snapshot: 1     trade: 8        unknown: 103

If you're familiar with the Coinbase Pro WS API, you'll see that the message types have changed. `done` and `open`
 messages have been converted to `orderDone` and `newOrder` respectively. Other messages, such as `received`
 don't have a use in the CBPTT and are passed on as `unknown` messages.

# Things to try

1. Do a similar tally using stats from Bitfinex. All you need to do is swap out the corresponding `FeedFactory`
function. You can still use Coinbase Pro product names in the factory method call (they automatically get mapped to
Bitfinex names if they are different).
1. Dig a bit deeper and see what other data is provided in the messages.
1. Explore the underlying `getFeed` and `getSubscribedFeeds` functions that offer greater flexibility in how
the feed streams are configured.
1. Provide your authentication details in a [CoinbaseProAuthConfig](apiref/interfaces/_exchanges_coinbase_pro_coinbaseproexchangeapi_.gdaxauthconfig.html) object and check for additional messages in the authenticated feed if you place orders or
  rtades on the exchange.

# See also

* [Coinbase Pro Exchange API](apiref/classes/_src_exchanges_coinbase_pro_coinbaseproexchangeapi_.gdaxexchangeapi.html)
* [Coinbase Pro Feed](apiref/modules/_src_exchanges_coinbase_pro_coinbaseprofeed_.html)
* [Coinbase Pro Feed factories](apiref/modules/_src_factories_gdaxfactories_.html)
* [Bitfinex Feed factories](apiref/modules/_src_factories_bitfinexfactories_.html)
