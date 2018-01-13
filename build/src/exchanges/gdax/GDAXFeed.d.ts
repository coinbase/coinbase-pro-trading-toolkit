import { AuthenticatedExchangeAPI } from '../AuthenticatedExchangeAPI';
import { ExchangeFeed, ExchangeFeedConfig } from '../ExchangeFeed';
import { ExchangeAuthConfig } from '../AuthConfig';
import { GDAXAuthConfig } from './GDAXInterfaces';
export declare const GDAX_WS_FEED = "wss://ws-feed.gdax.com";
/**
 * Configuration interface for a GDAX websocket feed stream. `wsUrl` is used to override the default websocket URL.
 * Usually, you don't need this, but you may want to obtain a feed from the sandbox for testing, or an historical
 * message source, for example.
 *
 * The channels array determines which types of messages are sent back down the feed. Leave this as null to receive
 * all messages, or specify any of
 *   - `level2` - The orderbook messages
 *   - `matches` - aLl trades
 *   - `ticker` - Ticker updates (these come after every trade, so specifying both `matches` and `ticker` may be redundant)
 *   - `user` - If you provided auth credentials, private messages will also be sent
 */
export interface GDAXFeedConfig extends ExchangeFeedConfig {
    auth: GDAXAuthConfig;
    wsUrl: string;
    channels: string[];
    apiUrl: string;
}
/**
 * The GDAX message feed. Messages are created via a combination of WS and REST calls, which are then sent down the pipe.
 * It handles automatically reconnects on errors and tracks the connection by monitoring a heartbeat.
 * You can create the feeds from here, but it's preferable to use the `getFeed` or `FeedFactory` functions to get a
 * connection from the pool.
 * Error messages from the Websocket feed are passed down the stream and also emitted as 'feederror' events.
 */
export declare class GDAXFeed extends ExchangeFeed {
    private products;
    private gdaxAPI;
    private queue;
    private queueing;
    private internalSequence;
    private channels;
    constructor(config: GDAXFeedConfig);
    readonly owner: string;
    /**
     * Returns the Authenticated API instance if auth credentials were supplied in the constructor; null otherwise
     */
    readonly authenticatedAPI: AuthenticatedExchangeAPI;
    /**
     * Subscribe to the products given in the `products` array.
     *
     * `subscribe` returns a Promise that resolves to true if the subscription was successful.
     */
    subscribe(products: string[]): Promise<boolean>;
    protected onClose(code: number, reason: string): void;
    protected validateAuth(auth: ExchangeAuthConfig): ExchangeAuthConfig;
    /**
     * Converts a GDAX feed message into a GTT [[StreamMessage]] instance
     */
    protected handleMessage(msg: string): void;
    protected onOpen(): void;
    private signMessage(msg);
    /**
     * Returns the current message counter value for the given product. This does not correspond to the
     * official sequence numbers of the message feeds (if they exist), but is purely an internal counter value
     */
    private getSequence(product);
    /**
     * Marked for deprecation
     */
    private pushMessage(message);
    private createSnapshotMessage(snapshot);
    private processUpdate(update);
    private mapTicker(ticker);
    private mapFullFeed(feedMessage);
    private processSnapshot(snapshot);
    /**
     * Converts GDAX messages into standardised GTT messages. Unknown messages are passed on as_is
     * @param feedMessage
     */
    private mapMessage(feedMessage);
    private mapMatchMessage(msg);
    /**
     * When the user_id field is set, these are authenticated messages only we receive and so deserve special
     * consideration
     */
    private mapAuthMessage(feedMessage);
    private setProducts(msg);
}
