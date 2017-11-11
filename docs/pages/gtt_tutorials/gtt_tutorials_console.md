---
title: Introduction to the exchange console
keywords: GTT, console, CLI, exchange, GDAX
last_updated: July 14, 2017
tags: [getting_started, tutorials]
summary: "How to access exchange APIs from the CLI"
sidebar: gtt_sidebar
permalink: gtt_tutorials_console.html
folder: gtt
toc: false
---

# The Exchange Consoles

The GTT comes bundled with a handy CLI utility that lets you make API calls to supported exchanges with a unified interface
and set of commands.

{% include tip.html content="If you've installed the GTT as a node package via yarn or npm, the consoles are installed in `node_modules/.bin`, so you make want to symlink them, or put the `.bin` folder in your
path so that they are always accessible" %}

# Supported commands

## help
Prints out a help message to the console:

    Usage: gdaxConsole.ts [options]
    Options:

    --api [value]                              API url
    -p --product [value]                       The GDAX product to query
    -t --ticker                                Fetch ticker
    -N --newMarketOrder [side,size]            Place a new market order
    -L --newLimitOrder [side,size,price]       Place a new limit order
    -B --balances                              Retrieve all account balances
    -O --orders                                Retrieve all my open orders (if product is provided, limited to that book)
    -X --cancelAllOrders                       Cancel all open orders (if product is provided, limited to that book)
    -W --crypto_withdraw [amount,cur,address]  Withdraw to a crypto address
    --transfer [type,amount,cur,coinbase_id]   deposit or withdraw from/to coinbase
    -X --method [method]                       method for general request
    -U --url [url]                             request url
    -P --body [body]                           request body
    -h, --help                                 output usage information

        
## ticker

Prints the latest ticker data to the console. The `--product` argument is also required.

## balances
Fetches the balances associated with the API key. For GDAX console the following envars are required:
* GDAX_KEY
* GDAX_SECRET
* GDAX_PASSPHRASE

## newMarketOrder and newLimitOrder

Place a market, or limit order onto the book. `--product` and the auth keys are required.

The side ("buy" or "sell") and size must be given as parameter values, e.g. to buy 1.5 BTC:
       
      gdaxConsole -N buy.1.5

for limit orders, price must also be provided

## orders

Print a list of orders that you have resting on the order book. The `product` option is optional
and if provided, will limit the order list to those resting on the given book.

## cancel all orders

Cancel all open orders on all books. If the `product` option is provided, only cancel
orders from that book.

{% include warning.html content="On GDAX, cancel all is a 'best effort' request and you may need to execute this call multiple times until it returns an empty array" %}

## Crypto withdraw

TODO


## FAQ

### The console doesn't support all the features of the API

Sorry about that, it's been crazy. Why not submit a PR for the feature that you want? Check out [our contribution guidelines](gtt_contributing.html) for more details.

### Why isn't \[my favorite exchange\] supported?

We're adding support for new features and exchanges all the time. If you're impatient, why not write the API interface yourself and contribute to the project?
Check out [our contribution guidelines](gtt_contributing.html) for more details.

