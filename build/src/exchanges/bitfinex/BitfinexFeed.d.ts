import { ExchangeFeed, ExchangeFeedConfig } from '../ExchangeFeed';
export interface BitfinexFeedConfig extends ExchangeFeedConfig {
    standardMessages: boolean;
    snapshotDepth?: number;
}
/**
 * A client class exposing the Bitfinex public websocket feed
 *
 * The possible channels to subscribe to are: ticker, book, trades
 *
 * The raw feed is re-interpreted and emitted as POJOs rather than Bitfinex's array structures.
 * If StandardMessages is true, the following standard messages are emitted
 *   ticker, snapshot, open, done, match
 *
 * The following events are emitted if standardMessages is false:
 *   bitfinex-ticker: BitfinexTickerMessage
 *   bitfinex-orderbook-snapshot: BitfinexOrderbookSnapshot
 *   bitfinex-orderbook-update: BitfinexOrderMessage
 *   bitfinex-trade-snapshot: BitfinexTradeSnapshot
 *   bitfinex-trade-update: BitfinexTradeMessage
 *
 * The following operational messages are also emitted
 *   close, error, open, connection
 *
 */
export declare class BitfinexFeed extends ExchangeFeed {
    private sequence;
    private subscriptions;
    private paused;
    private pinger;
    private standardMessages;
    private snapshotDepth;
    constructor(config: BitfinexFeedConfig);
    readonly owner: string;
    clearChannels(): void;
    /**
     * Resubscribe to channels using fire-and-forget.
     */
    resubscribeAll(): void;
    subscribe(channelType: string, product: string): void;
    unsubscribe(chanId: string): void;
    onOpen(): void;
    protected onClose(code: number, reason: string): void;
    protected handleMessage(data: any): void;
    private readonly nextSequence;
    private mapProduct(id);
    private mapTicker(bt);
    private mapSnapshot(bs);
    private mapOrderMessage(order);
    private mapTradeMessage(trade);
    private addSubscription(msg);
    private removeSubscription(msg);
    private getAuthMessage();
}
