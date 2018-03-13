---
title: GTT Development Roadmap
keywords: GTT, overview, roadmap
last_updated: July 14, 2017
tags: [getting_started]
summary: "The roadmap outlines the development vision for the GTT"
sidebar: gtt_sidebar
permalink: gtt_roadmap.html
folder: gtt
---

*Note*: The GTT is currently in alpha mode. Right now the code will have (possibly money-losing) bugs

## A modular approach to building out trading platforms

We've seen the GTT gain a fair amount of traction since its first release, which is great news. We've also
had a chance to look at other projects that have been doing great things in this space. It's become clear that
trying to be "everything to everybody" is not a sustainable goal for an open-source project like this; especially
given the limited amount of resources dedicated to the project. A better approach is to use something akin to the Unix
philosophy of building out a set of interoperable tools, each of which does one thing and does it well.

With this in mind, one can roughly separate the entire "Trading Platform" space into layers, where each layer builds on the
previous one.

{% include image.html file="platform_layers.svg" alt="Trading platform layers" caption="Each layer builds upon the previous, adding functionality and complexity" %}

The GTT's zone of influence is primarily Layer 2, and to some extent Layer 1.

### Layer 1 - A unified messaging interface

The goal of Layer 1 functionality is to bring external data from a variety of sources and with minimal manipulation, present it to GTT users in a uniform way.

There are dozens of crypto-currency exchanges (at least 70 and counting) running at present. Most of these exchanges offer a REST API for pulling orderbook data, querying balances, placing orders etc. Some also provide a live data stream (usually as a websocket interface) for live data monitoring. This means that there are essentially 70 different implementations of roughly the same set of user requirements.

The purpose of Layer 1 is to provide a standard communication interface so that a single set of instructions can be translated to any supported exchange and _vice versa_.

Initially, one of the goals of the GTT was to provide this functionality. However, we soon discovered the [CCXT project](https://github.com/ccxt/ccxt), which does a fabulous job of this already for over 70 exchanges. Therefore, the GTT delegates the majority of Level 1 functionality to CCXT. Specifically, almost all non-GDAX REST requests will be serviced by CCXT.

The GTT currently implements WS support for some of the larger exchanges (GDAX, Poloniex, Bitfinex, Bittrex). As CCXT begins to support WS data, we may consider phasing out WS support in the GTT. Until that happens, the GTT intends to provide Layer 1 functionality for live WS message tooling for GDAX and a few of the major other exchanges.

A unified APi for communicating back to the exchange also resides in Layer 1. This includes order placements and management, balance queries and deposits and withdrawals. For the most part this functionality is also delegated to CCXT where appropriate.

Other services that the GTT also supports that fall under Layer 1 include:
* Fiat exchange rates

Layer 1 services that are NOT considered in the GTT scope:
* Qualitative data streams (e.g. Twitter) for sentiment analysis
* Traditional stock tickers (e.g. S&P-500)

### Layer 2 - Data aggregation and interpretation

The Layer 2 tools take the data from Layer 1, which is now in a consistent format, regardless of source, and starts to make sense of it. The types of things one could expect to find here:

* Live orderbooks - the digestion of live (or simulated) websocket messages to derive and maintain a live orderbook.
* Aggregated orderbooks - combining several live orderbooks into an aggregated orderbook
* Order statistics - For example, [market order slippage](https://www.investopedia.com/terms/s/slippage.asp), the total immediate cost for _n_ units and spread
* High-Level Order management - This tool sends order messages to exchanges via Layer 1, but also tracks metadata such as total orders made and current position.
* Exchange rate services - Using fiat price data from Layer 1, messages can be transformed to reflect prices in any desired fiat currency equivalent.
* Market statistics - For example, market / trading history (candles), TA indicators like moving average, Bollinger bands and the like.
* Logging and reporting - includes Logging interfaces and conditional alerts and triggers.

### Layer 3 - Trading Bots

Layer 3 is where the big impact lies. More or less sophisticated trading bots can be built up using the tools in Layer 2 to actually implement and execute trading strategies. This layer is generally out-of-scope og the GTT, but we hope to provide some sample projects that illustrate what can be done. Some examples we plan on demonstrating:

* A simple market-maker bot
* A portfolio manager
* A utility to easily query the state of any exchange or currency with a simple command line interface

### Layer 4 - Support tools

Layer 4 covers support tools. For expedience, these tools have been included as an additional layer, but in reality many of them are stand-alone tools that add key functionality to any project employing the GTT

* Profit monitor - track individual trades, deposits and withdrawals and provide profitability reports. See [ALE](https://github.com/CjS77/ale) as an example of a simple implementation. It provides features to track every trade, calculate your current position, realized and unrealized profits/losses. It's currently lacking a REST interface to make it a truly standalone utility.
* Data storage and replay tools (useful for backtesting). For example, InfluxDB is a very good time-series focused database, which can ingest thousands of messages per second. It is fairly straightforward to pipe unified Layer 1 websocket data into InfluxDB for permanent storage and later retrieval. GTT Layer 2 objects will be able to ingest those messages as if they're coming from a live source.
* Machine learning - Optimizing and tuning trading algorithms is typically done using historical data. If you're
capturing GTT data in a persistent store, like InfluxDB, then you're freed up to carry out model exploration and optimization in any suitable environment, independent of the GTT. Arguably, as of early 2018, the leading environment for ML, whether it's classical optimization or neural nets, is (Tensorflow)[https://www.tensorflow.org/]. If C/C++ isn't your cup of tea, there are very good bindings for Python as well. There are no node.js or Typescript bindings as of yet, so if you use Tensorflow and the GTT for your trading bot tuning, you will likely have two separate implementations of your models.


## Roadmap

With all that said, we can map out the project roadmap. Ideally, the roadmap would be paired with target dates and a regular release schedule, but the GDAX team is incredibly resource constrained and alas, the GTT has a lower priority than say, keeping  our customers' money safe, keeping the site up running and adding awesome new features.

This roadmap is also not cast in stone. We might move things around, add new things, or remove others. But it should serve as a fair indicator of the near-, medium- and long-term goals of the project.



### Priority 1 (0.5.0 release)
* Bug fixes
* \>75% test coverage
* Complete authenticated action support (trades, account management, withdrawals & transfers)
* Console utility

### Priority 2 (0.7.0 release)
* 80% test coverage
* Working market maker bot
* Basic TA indicators (RSI, MA, EMA)

### Priority 3 (1.0.0 release)
* 90% test coverage
* Additional TA indicators
* Advanced trading algorithms (VWAP, TWAP etc.)

### No Priority
Ideas that we're thinking about but have no plans to implement any time soon:
* Portfolio balancing application
* gRPC service for interfacing with external services (e.g. UIs, applications in other languages, databases)


