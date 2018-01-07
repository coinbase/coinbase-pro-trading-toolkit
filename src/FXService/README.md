# Overview

FX Service a fully-fledged and extendible Exchange Rate service for use in GTT components and streams.

The Service comprises two sub-components:

1. `FXProvider` determines how the exchange rates are obtained, typically via an external service. `YahooFXProvider` and `OpenExchangeProvider` are provided out of the box, which retrieves data from Yahoo finance and [OpenExchangeRates][http://openExchangeRates.org] respectively. For crypto pricing, we also provide `coinmarketcap`,
 which loads prices from [coinmarketcap.com](https://coinmarketcap.com).
1. `FXRateCalculator`, determines how the data is presented to clients of the FX Service. This can be as simple
  as parsing and relaying the information directly from `FXProvider` (like `SimpleRateCalculator` does), or it can do more complicated things like calculate a median price based on multiple providers, a rolling time-weighted price; or a failover mechanism between providers. The interface is designed to be as flexible as your needs are.

