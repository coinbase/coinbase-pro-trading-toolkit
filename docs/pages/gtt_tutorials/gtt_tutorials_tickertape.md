---
title: The common API framework
keywords: GTT, trading, ticker, exchange, GDAX
last_updated: August 16, 2017
tags: [getting_started, tutorials]
summary: "In this tutorial, you will use the GTT's common API framework to build a simple ticker tape console script"
sidebar: gtt_sidebar
permalink: gtt_tutorials_tickertape.html
folder: gtt
---

# Introduction

One of the core aims of the GTT is to make building trading bots easy. One of the ways we do this is by hiding away all the specifics
of the various crypto-exchanges' APIs and make everything accessible via a common, unified framework.

Whether you want a ticker price, to place an order, or get your account balances, you'll use the same GTT command regardless
 of which exchange you're targeting.

In this tutorial, we will build a simple ticker-tape console program using the GDAX Trading Toolkit's common API framework.

# Getting started

Every exchange supported by the GTT has its REST API abstracted behind two interfaces: [`PublicExchangeAPI`](apiref/modules/_src_exchanges_publicexchangeapi_.html) and [`AuthenticatedExchangeAPI`](apiref/modules/_src_exchanges_authenticatedexchangeapi_.html).

The first interface provides a common way of polling for publicly accessible information on the exchanges, such as
the ticker price, and order books. `AuthenticatedExchangeAPI` provides access to calls requiring API keys, such as wallet
balances or placing trades.

So let's try something. Assume you have two exchange classes configured (we'll get to that in a moment) as follows:

    let exchanges = [ gdaxExchangeAPI, bitfinexExchangeAPI ];

You can get the trading pairs supported by each exchange as follows:

    exchanges.forEach((exchange: PublicExchangeAPI) => {
        exchange.loadProducts().then(products => {
            logger.log('info', 'Products for ' + exchange.owner, products.map(p => p.id).join(' '));

The output of this looks like

    2017-08-16T18:57:03.800Z - info: Products for GDAX LTC-EUR LTC-BTC BTC-GBP BTC-EUR ETH-EUR ETH-BTC LTC-USD BTC-USD ETH-USD
    2017-08-16T18:57:04.394Z - info: Products for Bitfinex BTC-USD LTC-USD LTC-BTC ETH-USD ETH-BTC etcbtc etcusd rrtusd rrtbtc zecusd zecbtc xmrusd xmrbtc dshusd dshbtc bccbtc bcubtc bccusd bcuusd xrpusd xrpbtc iotusd iotbtc ioteth eosusd eosbtc eoseth sanusd sanbtc saneth omgusd omgbtc omgeth bchusd bchbtc bcheth


# Configuration

For convenience, we'll provide a common [`Logger`](apiref/modules/_src_utils_logger_.html) object to all our API objects. A simple logger -- one that simply writes
messages to the console -- can be created using the [`ConsoleLoggerFactory`](apiref/modules/_src_utils_logger_.html) factory method (though it's easy to create
your own to write to file, RDBMS, Kibana etc., just make sure your implementation implements the Logger interface).

    const logger = GTT.utils.ConsoleLoggerFactory({ level: 'info' });
  
To set up the exchange objects, we need to provide a config object for each exchange. The exact configuration can vary
from exchange to exchange, but typically, you need to give authorization credentials and a product ID. Note that the GTT
always accepts a GDAX-standard product name (e.g. BTC-USD) and will map to the target exchange name behind the scenes).

Since we're configuring the Bitfinex and GDAX API interfaces, we'll supply a [BitfinexConfig](apiref/interfaces/_src_exchanges_bitfinex_bitfinexexchangeapi_.bitfinexconfig.html) and [GDAXConfig](apiref/interfaces/_src_exchanges_gdax_gdaxexchangeapi_.gdaxconfig.html) object to the corresponding public API interface implementation.
    
    const bitfinexConfig: BitfinexConfig = {
        gdaxProduct: 'BTC-USD',
        logger: logger,
        auth: {
            key: process.env.BITFINEX_KEY,
            secret: process.env.BITFINEX_SECRET
        }
    };
    
    const gdaxConfig: GDAXConfig = {
        apiURL: process.env.GDAX_API_URL || 'https://api.gdax.com',
        product: 'BTC-USD',
        auth: {
            key: process.env.GDAX_KEY,
            secret: process.env.GDAX_SECRET,
            passphrase: process.env.GDAX_PASSPHRASE
        }
    };

    const bitfinex = new BitfinexExchangeAPI(bitfinexConfig);
    const gdax = new GDAXExchangeAPI(gdaxConfig);

Strictly speaking, you can leave the `auth` fields out, since we're not making any authenticated calls in this tutorial, but it's
included in the config object as a demonstration of how one would keep your API credentials from leaking to anyone seeing your code.

# A ticker tape parade in your console

Since we're going to make calls against the `PublicExchangeAPI` interface, we can forget about the different 
implementations of each exchange and just make some calls.

{% include note.html content="All the interface methods return a Promise. If you're unfamiliar with Promises in Javascript,
there are many good references online" %}

The essential strategy in our ticker app is, starting with an array of `PublicExchangeAPI` instances,
 make a call to `loadTicker`, collect the results, and print them out.

All the real work is done in this two-line function:

    function getTickers(exchanges: PublicExchangeAPI[], product: string): Promise<Ticker[]> {
        const promises = exchanges.map((ex: PublicExchangeAPI) => ex.loadTicker(product));
        return Promise.all(promises);
    }

Basically, we use the `Array.map` method to call `loadTicker` for each exchange. Each call returns a promise for
a ticker which will resolve to the actual Ticker object at some point in the future (once the REST API call returns with
its data, in fact). So we use the `Promise.all` function to wait for all the results, collect them up and return them
as an array of `Ticker` objects.

The rest is just formatting:

    function getAndPrintTickers(exchanges: PublicExchangeAPI[], product: string) {
        return getTickers(publicExchanges, product).then((tickers: Ticker[]) => {
            const quoteCurrency = tickers[0].productId.split('-')[1];
            console.log(`${new Date().toTimeString()}\t| Price ${quoteCurrency}  |   Best Bid |   Best Ask`);
            for (let i = 0; i < exchanges.length; i++) {
                printTicker(exchanges[i], tickers[i])
            }
            console.log();
            return Promise.resolve();
        });
    }

Run `getAndPrintTickers` inside an interval timer and away we go:

    setInterval(() => {
        getAndPrintTickers(publicExchanges, 'BTC-USD').then(() => {
            return getAndPrintTickers(publicExchanges, 'ETH-USD');
        }).catch((err) => {
            logger.log('error', err.message, err);
        });
    }, 5000);

There are a few formatting details left out of the code snippets above, but these are fairly simple and left
as an exercise to the reader. The full working example that produced the output below is available as `tutorials/t003_tickertape.ts`.

Pulling this all together and running it produces something like:

    22:21:25 GMT+0200 (SAST)        | Price USD  |   Best Bid |   Best Ask
    BTC-USD (GDAX)                  |    4310.02 |    4310.01 |    4310.02
    BTC-USD (Bitfinex)              |    4324.10 |    4324.10 |    4324.20

    22:21:26 GMT+0200 (SAST)        | Price USD  |   Best Bid |   Best Ask
    ETH-USD (GDAX)                  |     297.99 |     297.98 |     297.99
    ETH-USD (Bitfinex)              |     299.03 |     298.64 |     299.00

    22:21:30 GMT+0200 (SAST)        | Price USD  |   Best Bid |   Best Ask
    BTC-USD (GDAX)                  |    4310.02 |    4310.01 |    4310.02
    BTC-USD (Bitfinex)              |    4324.10 |    4324.10 |    4324.20

    22:21:31 GMT+0200 (SAST)        | Price USD  |   Best Bid |   Best Ask
    ETH-USD (GDAX)                  |     297.99 |     297.98 |     297.99
    ETH-USD (Bitfinex)              |     299.03 |     298.64 |     299.00

# A final comment

This tutorial produced crypto prices by polling the REST API endpoint of a few exchanges. If you've done the
[tutorial on live order books](gtt_tutorials_liveorderbook.html), you may be thinking that there must be a better way
than having your information being up to 5 seconds out of date, and you'd be right!

A much better version of this little app would be to respond to the `ticker` event from an array
 of message feeds. That would make your ticker data realtime, but the implementation is left as an exercise :)
