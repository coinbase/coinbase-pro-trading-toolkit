# Exchanges

All supported Exchange interfaces will be found in this directory. The GTT maintains a standard and unified API for obtaining and placing trade data, regardless of the exchange that you're connected to.

Currently supported exchanges:

* GDAX
* Bitfinex - partial
* Poloniex - partial

Do not instantiate instances form these objects directly, unless you have a very specific use case in mind. 99% of the time you can obtain
a unified feed stream (agnostic of the underlying exchange) from the various factory methods in the `factories` folder.
