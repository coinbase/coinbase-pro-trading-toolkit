# Change Log

## 0.3.1
* Candles support via `loadCandles` method on Public API interface.
* Support for Typescript 2.7
 
## 0.3.0
* Fix bug where timestamps from Bittrex were interpreted as local time. This is a potential breaking change, hence minor
  version update.
* CCXT v1.10

## 0.2.2
* GDAX API public clients can use custom API url
* GDAX stop orders work when price field is provided
* Fix Poloniex reconnection bug
* Fix tickertape tutorial
* Improvements tp Bittrex WS feed
* Fix trader logic for market orders
* Basic general console support for all exchanges

## 0.2.0
* Error API - Underlying exchange errors get propagated properly
* FX service handles null results from calculator
* GDAX API and console is complete (and uses official library)
* BittrexAPI deprecated in favour of CCXT implementation

## 0.1.28
* Lots of bugfixes
* Added `RobustCalculator`, `FailoverCalculator` and `FailoverProvider` to FXService

## 0.1.21
* Bugfixes (#64)
* Don't leak API keys in logs (see `Messages.sanitizeMessage`)
* Update some package indices
* CCXT Historical Data Retrieval Methods (thanks @Ameobea)

## 0.1.20

* Add BitMex live feed
* Add CryptoProvider (exchange rates)
* Add RobustCalculator (exchange rates)
* `Trader` should handle Market orders better

## v0.1.19

* Bugfixes

## v0.1.18

* Add `origin` tag to messages
* Many bugfixes to GDAX feed

## v0.1.17

* New Features
    * Gemini Market feed! Thanks @github-ajt
* Bug Fixes
    * Handle new API feed messages for GDAX
    * GDAX Feed messages handle error messages more elegantly. Thanks @kostola
* Other
    * Use CircleCI for integration testing on Github

## v0.1.16

Bug fixes and basic CCXT integration. There are quite a few bugfixes as well as public REST support for some 70 exchanges :)

## v0.1.13

* New Exchange support: Bittrex
* New Core filters:
    * Product splitter (split a feed stream by product, with proper backpressure handling)

## v0.1.12

* Add ProductSplitter
