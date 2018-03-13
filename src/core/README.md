# Core

This directory contains the main building-block classes for the GDAX trading toolkit. As a user of the GTT, you will almost exclusively build your trading engines from classes in this and the `factories` folder.

* LiveOrderbook - A real-time representation of an exchange's order book for a single product. It is automatically kept up to date by piping a Feed stream into it.
* Messages - A unified abstraction for exchange product trade and user messages.
* Trader - A writable stream that places, cancels and tracks any orders you make on an orderbook. It maintains an in-memory copy of your current position at all times. It also follows and trade commands that are piped into it from a connected stream.
* Filters - Various transform streams that modify a data stream in some way, e.g. filtering out for a product, applying a rate limiter, or applying an exchange rate.
* Triggers - event listeners that can be attached to streams to trigger when a certain condition is true

