/***************************************************************************************************************************
 * @license                                                                                                                *
 * Copyright 2017 Coinbase, Inc.                                                                                           *
 *                                                                                                                         *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance          *
 * with the License. You may obtain a copy of the License at                                                               *
 *                                                                                                                         *
 * http://www.apache.org/licenses/LICENSE-2.0                                                                              *
 *                                                                                                                         *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on     *
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the                      *
 * License for the specific language governing permissions and limitations under the License.                              *
 ***************************************************************************************************************************/

import WebSocket = require('ws');
import IServerOptions = WebSocket.IServerOptions;
import Server = WebSocket.Server;
import { LiveBookConfig, LiveOrderbook } from '../core/LiveOrderbook';
import * as Commands from './WSCommands';
import { Command, newError, ResponseMessage, wrapMessage } from './WSCommands';
import { ConsoleLoggerFactory, Logger } from '../utils/Logger';
import { ExchangeFeed } from '../exchanges/ExchangeFeed';
import { FeedFactory as gdaxFeedFactory } from '../factories/gdaxFactories';
import { FeedFactory as bitfinexFeedFactory } from '../factories/bitfinexFactories';
import { FeedFactory as poloniexFeedFactory } from '../factories/poloniexFactories';
import { SnapshotMessage, TickerMessage } from '../core/Messages';
import { createTickerTrigger, Trigger } from '../core/Triggers';

let server: Server;
const logger: Logger = ConsoleLoggerFactory();

export const serverOptions: IServerOptions = {
    host: 'localhost',
    port: 3220,
    clientTracking: true
};

export function dataFeedFactory(): Server {
    if (server === undefined) {
        server = new Server(serverOptions);
        logger.log('info', `Websocket server listening on port ${server.options.port}`);
        server.on('connection', (_socket: WebSocket) => {
            logger.log('debug', 'Websocket connection made to ' + server.options.host);
        });
    }
    return server;
}

export interface ExchangeConnection {
    feed: ExchangeFeed;
    products: string[];
    tickerTriggers: { [product: string]: Trigger<TickerMessage> };
    liveBooks: { [product: string]: LiveOrderbook };
}

function createLiveBook(feed: ExchangeFeed, product: string): LiveOrderbook {
    const config: LiveBookConfig = {
        logger: logger,
        strictMode: false,
        product: product
    };
    const book = new LiveOrderbook(config);
    feed.pipe(book);
    return book;
}

export class DataFeed {
    private readonly socket: WebSocket;
    private readonly exchanges: { [exchange: string]: ExchangeConnection } = {};

    constructor(socket: WebSocket) {
        this.socket = socket;
        socket.on('error', (err: Error) => {
            if (err) {
                console.error(err);
            }
            this.close();
        });

        socket.on('message', (data: any) => {
            try {
                const msg = JSON.parse(data);
                this.handleIncomingCommand(msg);
            } catch (err) {
                const out = {
                    type: 'error',
                    reason: err.message,
                    received: data
                };
                this.send(out);
                this.close();
                return;
            }
        });
    }

    handleIncomingCommand(msg: Command) {
        // Handle subscription requests and delegate to relevant stream factories
        switch (msg.type) {
            case 'attach':
                this.attachToExchange(msg as Commands.AttachCommand);
                break;
            case 'subscribe':
                this.subscribeToProduct(msg as Commands.OrderbookCommand);
                break;
            case 'unsubscribe':
                this.unsubscribeFromProduct(msg as Commands.OrderbookCommand);
                break;
            case 'snapshot':
                this.sendOrderbookState(msg as Commands.OrderbookCommand);
                break;
            case 'ticker':
                this.sendTicker(msg as Commands.OrderbookCommand);
                break;
            default:
                const reply = newError('Unknown command', msg);
                this.send(reply);
        }
    }

    send(msg: Command) {
        if (!this.socket || this.socket.readyState <= 0) {
            logger.log('error', 'Websocket is not connected. Cannot send message', msg);
            return;
        }
        this.socket.send(JSON.stringify(msg), (err: Error) => {
            if (err && (!(err as any).readyState && !(err as any).socket)) {
                this.close();
            }
        });
    }

    close() {
        this.socket.close();
    }

    attachToExchange(msg: Commands.AttachCommand) {
        let factoryFn: () => Promise<ExchangeFeed> = null;
        const products = msg.products;
        const lcExchange = msg.exchange.toLowerCase();
        switch (lcExchange) {
            case 'gdax':
                factoryFn = gdaxFeedFactory.bind(null, logger, products);
                break;
            case 'bitfinex':
                factoryFn = bitfinexFeedFactory.bind(null, logger, products);
                break;
            case 'poloniex':
                factoryFn = poloniexFeedFactory.bind(null, logger, products);
                break;
        }
        if (factoryFn === null) {
            this.send(newError(`${msg.exchange} is not a supported exchange`, msg));
            return;
        }
        factoryFn().then((feed: ExchangeFeed) => {
            this.initExchange(lcExchange, products, feed);
            this.send({
                type: 'attached',
                exchange: lcExchange,
                product: products,
                tag: msg.tag
            } as Command);
        }).catch((err: Error) => {
            this.send(newError(`Could not connect to ${msg.exchange}. ${err.message}`, msg));
        });
    }

    getConnectedExchange(cmd: Commands.ExchangeCommand): ExchangeConnection {
        const exchange: ExchangeConnection = this.exchanges[cmd.exchange.toLowerCase()];
        if (!exchange) {
            this.send(newError(`Not connected to exchange ${cmd.exchange}. Have you tried to attach to it first?`, cmd));
            return null;
        }
        return exchange;
    }

    getLiveBook(cmd: Commands.OrderbookCommand): LiveOrderbook {
        const exchange = this.getConnectedExchange(cmd);
        if (!exchange) {
            return null;
        }
        const book = exchange.liveBooks[cmd.product];
        if (!book) {
            this.send(newError(`We are connected to the ${cmd.exchange}, but not subscribed to the ${cmd.product}`, cmd));
            return null;
        }
        return book;
    }

    private subscribeToProduct(cmd: Commands.OrderbookCommand) {
        const exchange = this.getConnectedExchange(cmd);
        if (!exchange) {
            return;
        }
        const trigger = createTickerTrigger(exchange.feed, cmd.product, false).setAction((event: TickerMessage) => {
            this.send(wrapMessage(event, cmd));
        });
        exchange.tickerTriggers[cmd.product] = trigger;
        const response: ResponseMessage = {
            type: 'subscribe',
            tag: cmd.tag,
            command: cmd,
            result: 'success'
        };
        this.send(response);
    }

    private unsubscribeFromProduct(cmd: Commands.OrderbookCommand) {
        const exchange = this.getConnectedExchange(cmd);
        if (!exchange) {
            return;
        }
        if (!exchange.tickerTriggers[cmd.product]) {
            this.send(newError(`${cmd.product} on ${cmd.exchange} is not currently subscribed to ticker events`, cmd));
            return;
        }
        const trigger = exchange.tickerTriggers[cmd.product];
        trigger.cancel();
        const response: ResponseMessage = {
            type: 'unsubscribe',
            tag: cmd.tag,
            command: cmd,
            result: 'success'
        };
        this.send(response);
    }

    private initExchange(exchange: string, products: string[], feed: ExchangeFeed) {
        this.exchanges[exchange] = {
            feed: feed,
            products: products,
            tickerTriggers: {},
            liveBooks: {}
        };
        this.exchanges[exchange].products = products;
        products.forEach((product: string) => {
            this.exchanges[exchange].liveBooks[product] = createLiveBook(feed, product);
        });
    }

    private sendTicker(cmd: Commands.OrderbookCommand) {
        const book = this.getLiveBook(cmd);
        if (!book) {
            return;
        }
        const ticker: TickerMessage = {type: 'ticker', time: new Date(), ...book.ticker};
        this.send(wrapMessage(ticker, cmd));
    }

    private sendOrderbookState(cmd: Commands.OrderbookCommand) {
        const book = this.getLiveBook(cmd);
        if (!book) {
            return;
        }
        const msg: SnapshotMessage = {
            type: 'snapshot',
            time: new Date(),
            productId: cmd.product,
            ...book.state()
        };
        this.send(wrapMessage(msg, cmd));
    }
}
