# Lib

This directory contains the workhorse classes for the GDAX trading toolkit. As a user of the GTT, you are unlikely to have to use these classes directly, but they make up the foundations for the higher level classes that you will use.

* BookBuilder - An orderbook descendant that allows an orderbook to be maintained by adding, removing or changing orders.
* Orderbook - Contains interfaces for orders and orderbook-type objects
* OrderbookDiff - A class for determining differences between orderbook and the trade commands required to make them equivalent
* OrderbookUtils - Common calculations for orderbooks, particularly cumulative sums
* types - some handly type definitions used throughout the GTT
* utils - common small utility functions

