# Market Maker

A market-making bot.

It works by copying orders from a source book onto a target book (as limit orders); usually modifying the orders in some way.
It then waits for those orders to be filled and replays them onto the source book (as market orders) to maintain a constant position. If set up correctly, this strategy can yield a small but consistent profit.
