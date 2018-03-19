import * as GTT from '..';
import { LiveBookConfig, LiveOrderbook, SkippedMessageEvent, TradeMessage, LevelMessage, SnapshotMessage } from '../core';
import { Ticker } from '../exchanges/PublicExchangeAPI';

const product = 'BTC-USD';

import { S3LoggerFactory } from '../utils';
const logger: GTT.utils.Logger = S3LoggerFactory(
    {
        // see full list of options for this S3 transport here: https://github.com/Coggle/s3-streamlogger
        bucket: 'cryptotrader.data',
        folder: 'gdax/' + product,
        // add your own AWS info here
        access_key_id: '...',
        secret_access_key: '...',
        // tags: {type: 'myType', project: 'myProject'},
        // let files grow to 100MB (bits * kb * mb)
        max_file_size: 1000 * 1000 * 100,
        // create a bigger buffer to accomodate heavy data flow
        buffer_size: 1024 * 10,
        // upload files every minute
        upload_every: 60 * 1000,
    },
    {
        // we don't want any of the logging to be formatted, just write to the file exactly what we log
        level: 'info',
        json: false,
        formatter: (options: any) => {
            return options.message;
        },
    },
    (error: any) => {
        console.log(error);
    },

);

setupGDAXFeedLogging();

async function setupGDAXFeedLogging() {
    const feed = await GTT.Factories.GDAX.FeedFactory(logger, [product]);

    const config: LiveBookConfig = {
        product: product,
        logger: logger
    };

    const book = new LiveOrderbook(config);
    book.on('LiveOrderbook.snapshot', (snapshot: SnapshotMessage) => {
        logger.log('info', JSON.stringify(snapshot));
    });
    book.on('LiveOrderbook.ticker', (ticker: Ticker) => {
        logger.log('info', JSON.stringify(ticker));
    });
    book.on('LiveOrderbook.trade', (trade: TradeMessage) => {
        logger.log('info', JSON.stringify(trade));
    });
    book.on('LiveOrderbook.update', (level: LevelMessage) => {
        logger.log('info', JSON.stringify(level));
    });
    book.on('LiveOrderbook.skippedMessage', (details: SkippedMessageEvent) => {
        // On GDAX, this event should never be emitted, but we put it here for completeness
        logger.log('error','SKIPPED MESSAGE', details);
        logger.log('error','Reconnecting to feed');
        feed.reconnect(0);
    });
    book.on('end', () => {
        logger.log('info', 'Orderbook closed');
    });
    book.on('error', (err) => {
        logger.log('error', 'Livebook errored: ', err);
        feed.pipe(book);
    });
    feed.pipe(book);
}
