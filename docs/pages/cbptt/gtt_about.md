---
title: About the Coinbase Pro Trading Toolkit
keywords: CBPTT, introduction, overview
last_updated: July 14, 2017
tags: [getting_started]
summary: "The Coinbase Pro Trading Toolkit (CBPTT) is a set of open-source modules that make it straightforward to create and run trading algorithms and bots on cryptocurrency exchanges"
sidebar: cbptt_sidebar
permalink: cbptt_about.html
folder: cbptt
---

Welcome to the Coinbase Pro Trading Toolkit! We're incredibly excited to share these tools with the cryptocurrency
trading community. Everything on the CBPTT is open source and released under the [MIT license](licenses/LICENSE), which means
that you're free to use the components absolutely free of charge. We're even more excited to see what
you can do with these tools. If there's something missing, or an exchange that you'd like to see supported,
you can [open an issue]({{site.repository}}), or better yet, write it yourself and [contribute back to the project](cbptt_contributing.html).

Happy bot building!

{{ site.baseurl }}

## The CBPTT vision and philosophy

The CBPTT is designed to act as a set of Lego blocks to help you build automated trading and portfolio bots on
crypto-currency exchanges. Here are the kinds of things we envisage you could build with a few hundred lines of
code using the CBPTT:

* A unified orderbook from multiple books / exchanges
* Arbitrage trading bots
* Market maker bots
* A portfolio tracker, manager, and balancer
* Technical analysis tools

And eventually

* A customised trading console for your favorite exchange(s) (using cbptt-ui components)
* Machine learning integration into crypto-markets

This is pretty heady stuff and we're a long way from realising all of this, but with your help, the CBPTT will
become the go-to standard for crypto-currency trading bots.

### The philosophy

The basic approach of the CBPTT is to treat market and trading data from exchanges as streams of data, which
we can pipe to different tools to modify, or act on them. The market data from each crypto exchange has been
standardized so that you can pipe the data to any CBPTT component and it will work as expected.

This makes it very straightforward to format and shape the data in the way that your secret money-making trading logic wants it.

You want to arbitrage between BTC-USD and BTC-EUR on another exchange? Then pipe the BTC-USD data feed through
an `FXFilter` so that BTC-EUR data comes out the other side. Pipe this and the BTC-EUR feed to your arbitrage
logic component which pipes a set of `Trade` commands to the Trader component that knows how to place trades on your
target exchange.

{% include image.html file="pipes.svg" alt="CBPTT Pipes" caption="Data flows from a source, through a set of pipes, filters and modifiers" %}

By building almost every component of the CBPTT as a node stream, writing a bot essentially boils down to

 1. Configuring your source data feeds (API keys, urls and various options)
 1. Configuring filters and modifiers
 1. Joining the pieces together with pipes.
 1. Adding your secret trading logic

Of course, in all but the simplest and most naive bots, data doesn't simply flow in one direction only.
 You'll usually need feedback loops and/or cross-linking between multiple data pipes. As luck would have it,
 each CBPTT component is also a node `EventEmitter` with a large number of event triggers. Arbitrarily complicated trading logic can be constructed by adding listeners to CBPTT components and responding to the events that get
 triggered.

 (In theory, one could avoid using pipes completely and only use node's event system, but pipes are usually cleaner,
 more concise and make for much more readable code. So we encourage their use where possible).

{% include links.html %}
