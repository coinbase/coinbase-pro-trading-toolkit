---
title: Introduction to filters
keywords: CBPTT, FXService, arbitrage, exchange, Coinbase Pro, filters
last_updated: August 16, 2017
tags: [getting_started, tutorials]
summary: "In this tutorial, you will use the CBPTT to build a arbitrage ticker tape for three Coinbase Pro order books"
sidebar: cbptt_sidebar
permalink: cbptt_tutorials_arbitrage1.html
folder: cbptt
---

# Introduction

As was mentioned in the [Overview](cbptt_about.html), one of the core concepts of the CBPTT revolves around the idea of financial
and market data being interpreted as a stream of information being pumped down a pipe. The stream can enter various filters
and transformation operations before being piped into into something that reads the data stream and generates actions based
on what it sees.

In this tutorial, you'll be introduced to some of the standard filters that ship with the CBPTT. We'll be creating the kernel
for an arbitrage bot across multiple currency books on Coinbase Pro (e.g. BTC-USD vs. BTC-EUR).

To do this we'll create a single feed stream that provides ticker info on all three BTC books (see the [Live order book](cbptt_tutorials_liveorderbook.html) and [Message feed](cbptt_tutorials_feed.md) tutorials for how to do this).

We'll then pipe the same feed through three product filters to get three streams corresponding to the three orderbooks.

Then we'll do something neat: We'll spin up an `FXService` instance that will poll a currency exchange rate provider
for the USD-EUR and USD-GBP exchange rates. We'll then use the `FXService` to configure two `ExchangeRateFilter` filters that
 will modify the EUR and GBP message streams on-the-fly, so that it looks like they're denominated in USD.

Then every time there's a tick on any of the books, we'll print out the three last traded prices to get an indication
of the arbitrage opportunity across the three books.

{% include note.html content="Obviously a fully-fledged arbitrage bot requires several additional features than just printing out the latest ticker price. In particular you need insight into the market depth of each book, which a `LiveOrderbook` object can provide. You'll also need a `Trader` instance to execute the trades. Implementing these details is out of the scope of this tutorial, but using the CBPTT components, should be reasonably straightforward." %}

{% include image.html file="fxdemo.svg" alt="Feed stream currency conversion schematic" caption="A schematic of the data flow for the arbitrage ticker tutorial application." %}

# The product filter

The product filter is very simple. A message stream is piped to it, and it filters out any message
that doesn't match the filter's `productId`.

Assuming you have a message `feed` that is streaming multiple products' messages, the product filter works
like this:

    const ltcFilter = new CBPTT.Core.ProductFilter({ logger: logger, productId: 'LTC-BTC' }));
    feed.pipe(ltcFilter);
    ltcfilter.on('data', msg => {
      assert.equal(msg.productId, 'LTC-BTC');
    });

# The Exchange Rate filter

The other key component of the arbitrage ticker is the `ExchangeRateFilter`.

`ExchangeRateFilter` works by applying an exchange rate (which it receives from an `FXService`) for a specified
currency pair to each price field that comes in from the feed stream. This includes bids and ask arrays in snapshot messages.

The filter is easy to configure. It accepts a [ExchangeRateFilterConfig](apiref/interfaces/_core_exchangeratefilter_.exchangeratefilterconfig.html) object which provides the `FXService` and indicates which currency pair to use as the exchange rate.

        const config: ExchangeRateFilterConfig = {
            fxService: fxService,
            logger: logger,
            pair: { from: 'GBP', to: 'USD' },
            precision: 2
        };
        const fxGBP = new CBPTT.Core.ExchangeRateFilter(config);
        feed.pipe(fxGBP);

The filter also exposes a single method `getRate` that allows you to obtain the current exchange rate at any time.

# FX Service

A little more effort is required to configure the FX Service. The Service comprises two sub-components. The first, `FXProvider`
 determines how the exchange rates are obtained, typically via an external service. `YahooFXProvider` and `OpenExchangeProvider`
 are provided out of the box, which retrieves data from Yahoo finance and [OpenExchangeRates](http://openExchangeRates.org) respectively. For crypto pricing, we also provide `coinmarketcap`,
 which loads prices from [coimarketcap.com](https://coimarketcap.com).

 {% include note.html content="To use OpenExchangeRates, you'll need to supply an API key based on your subscription plan. They do offer a free option which will allow you to obtain hourly updates on exchange rates." %}


 {% include tip.html content="CoinmarketCap's data is updated every 5 minutes. For up-to-date tickers, interrogate `ticker` messages from the exchange's message feed." %}

 The other component, `FXRateCalculator`, determines how the data is presented to clients of the FX Service. This can be as simple
  as parsing and relaying the information directly from `FXProvider` (like `SimpleRateCalculator` does), or it can do more complicated
  things like calculate a median price based on multiple providers, a rolling time-weighted price; or a failover mechanism between providers. The interface is designed to be as flexible as your needs are.

This can all be a little hairy to begin with, so to keep things simple, we've wrapped up the most common configuration options
and provided the `SimpleFXServiceFactory` method that merely accepts a provider (and a logger) and returns a working `FXService`.
 This service uses a single provider (for now, either 'yahoo' or 'openexchangerates' are accepted) and a `SimpleRateCalculator`
 that simply returns the latest spot price for the exchange rate; and is updated every ten minutes.

    const fxService = SimpleFXServiceFactory('yahoo', logger);

{% include warning.html content="This simple service is fine for demonstrations, but for production services, or if you're working with real money, you should consider a more robust FXService. If an API malfunction suddenly returns zero or Infinity as a price, the Simple service can lead to ruinous problems." %}

{% include tip.html content="For a slightly more flexible `FXService` factory, look at the code for `SimpleFXServiceFactory.ts` and [`FXProviderFactory`](apiref/modules/_src_factories_fxservicefactories_.html#fxproviderfactory) on which it is based." %}

Once you have an `FXService` instance you need to tell it which currency pairs to go and fetch, using the `addCurrencyPair` method or `setActivePairs` methods.

# Putting it all together

Now that we have all our filters configured, we need to grab a message feed for our three order books. We'll follow the usual pattern
and use the CoinbaseProFeedFactory:

    const products = ['BTC-USD', 'BTC-EUR', 'BTC-GBP'];
    // Create a single logger instance to pass around
    const logger = CBPTT.utils.ConsoleLoggerFactory();
    CBPTT.Factories.CoinbasePro.FeedFactory(logger, products).then((feed: CoinbaseProFeed) => {
      ...
    });

The feed has messages from all three books mixed up in it, So we need to pipe it through three separate product filters to
 split the feed into the three product streams.

    const streams = products.map(product => new CBPTT.Core.ProductFilter({ logger: logger, productId: product }));

We then create our FXService and add the currency pairs we want it to fetch from Yahoo finance, and ask it to update every minute:

    const fxService = CBPTT.Factories.SimpleFXServiceFactory('yahoo', logger);
    fxService
        .addCurrencyPair({ from: 'GBP', to: 'USD' })
        .addCurrencyPair({ from: 'EUR', to: 'USD' })
        .setRefreshInterval(1000 * 60);

Now we need to convert GBP and EUR price data from their respective streams to USD on the fly. We'll use some ES6-fu and use the spread operator to make the coding more concise:

    const commonFilterConfig: ExchangeRateFilterConfig = {
        fxService: fxService,
        logger: logger,
        pair: { from: null, to: 'USD' }, // this will be overwritten
        precision: 2
    };
    const fxGBP = new CBPTT.Core.ExchangeRateFilter({ ...commonFilterConfig, pair: { from: 'GBP', to: 'USD' } });
    const fxEUR = new CBPTT.Core.ExchangeRateFilter({ ...commonFilterConfig, pair: { from: 'EUR', to: 'USD' } });

Now we can connect all the pieces together. The `streams` array was created above and contains the split feed streams.
We'll pipe the BTC-EUR stream (`streams[1]`) and the BTC-GBP stream (`steams[2]`) through their respective exchange rate filters:

    let outStream = new Array(3);
    outStream[0] = feed.pipe(streams[0]);
    outStream[1] = feed.pipe(streams[1]).pipe(fxEUR);
    outStream[2] = feed.pipe(streams[2]).pipe(fxGBP);

Finally we need to add a listener for ticker events. We do this by adding a `data` listener for each of the streams and
checking whether a ticker message has been sent:

    for (let i = 0; i < 3; i++) {
        outStream[i].on('data', (msg: StreamMessage) => {
            if (msg.type === 'trade') {
                printLatestPrices(latest);
            }
        });
    }

We've manged to do some pretty nifty stuff in about 45 lines of code. We're printing out the USD-equivalent
price of all three BTC books on Coinbase Pro *in real time* as each trade happens, using up-to-the-minute exchange rate data. Pretty neat!

{% include note.html content="A fully working version of this tutorial is available as `tutorials/t004_fxfilter.ts`." %}
