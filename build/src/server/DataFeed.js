"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const WebSocket = require("ws");
var Server = WebSocket.Server;
const LiveOrderbook_1 = require("../core/LiveOrderbook");
const WSCommands_1 = require("./WSCommands");
const Logger_1 = require("../utils/Logger");
const gdaxFactories_1 = require("../factories/gdaxFactories");
const bitfinexFactories_1 = require("../factories/bitfinexFactories");
const poloniexFactories_1 = require("../factories/poloniexFactories");
const Triggers_1 = require("../core/Triggers");
let server;
const logger = Logger_1.ConsoleLoggerFactory();
exports.serverOptions = {
    host: 'localhost',
    port: 3220,
    clientTracking: true
};
let dataFeed = null;
function dataFeedFactory() {
    if (server === undefined) {
        server = new Server(exports.serverOptions);
        logger.log('info', 'Websocket server listening on port ' + server.options.port);
        server.on('connection', (socket) => {
            dataFeed = new DataFeed(socket);
        });
    }
    return server;
}
exports.dataFeedFactory = dataFeedFactory;
function createLiveBook(feed, product) {
    const config = {
        logger: logger,
        strictMode: false,
        product: product
    };
    const book = new LiveOrderbook_1.LiveOrderbook(config);
    feed.pipe(book);
    return book;
}
class DataFeed {
    constructor(socket) {
        this.exchanges = {};
        this.socket = socket;
        socket.on('error', (err) => {
            if (err) {
                console.error(err);
            }
            this.close();
        });
        socket.on('message', (data) => {
            try {
                const msg = JSON.parse(data);
                this.handleIncomingCommand(msg);
            }
            catch (err) {
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
    handleIncomingCommand(msg) {
        // Handle subscription requests and delegate to relevant stream factories
        switch (msg.type) {
            case 'attach':
                this.attachToExchange(msg);
                break;
            case 'subscribe':
                this.subscribeToProduct(msg);
                break;
            case 'unsubscribe':
                this.unsubscribeFromProduct(msg);
                break;
            case 'snapshot':
                this.sendOrderbookState(msg);
                break;
            case 'ticker':
                this.sendTicker(msg);
                break;
            default:
                const reply = WSCommands_1.newError('Unknown command', msg);
                this.send(reply);
        }
    }
    send(msg) {
        if (!this.socket || this.socket.readyState <= 0) {
            logger.log('error', 'Websocket is not connected. Cannot send message', msg);
            return;
        }
        this.socket.send(JSON.stringify(msg), (err) => {
            if (err && (!err.readyState && !err.socket)) {
                this.close();
            }
        });
    }
    close() {
        this.socket.close();
    }
    attachToExchange(msg) {
        let factoryFn = null;
        const products = msg.products;
        const lcExchange = msg.exchange.toLowerCase();
        switch (lcExchange) {
            case 'gdax':
                factoryFn = gdaxFactories_1.FeedFactory.bind(null, logger, products);
                break;
            case 'bitfinex':
                factoryFn = bitfinexFactories_1.FeedFactory.bind(null, logger, products);
                break;
            case 'poloniex':
                factoryFn = poloniexFactories_1.FeedFactory.bind(null, logger, products);
                break;
        }
        if (factoryFn === null) {
            this.send(WSCommands_1.newError(`${msg.exchange} is not a supported exchange`, msg));
            return;
        }
        factoryFn().then((feed) => {
            this.initExchange(lcExchange, products, feed);
            this.send({
                type: 'attached',
                exchange: lcExchange,
                product: products,
                tag: msg.tag
            });
        }).catch((err) => {
            this.send(WSCommands_1.newError(`Could not connect to ${msg.exchange}. ${err.message}`, msg));
        });
    }
    getConnectedExchange(cmd) {
        const exchange = this.exchanges[cmd.exchange.toLowerCase()];
        if (!exchange) {
            this.send(WSCommands_1.newError(`Not connected to exchange ${cmd.exchange}. Have you tried to attach to it first?`, cmd));
            return null;
        }
        return exchange;
    }
    getLiveBook(cmd) {
        const exchange = this.getConnectedExchange(cmd);
        if (!exchange) {
            return null;
        }
        const book = exchange.liveBooks[cmd.product];
        if (!book) {
            this.send(WSCommands_1.newError(`We are connected to the ${cmd.exchange}, but not subscribed to the ${cmd.product}`, cmd));
            return null;
        }
        return book;
    }
    subscribeToProduct(cmd) {
        const exchange = this.getConnectedExchange(cmd);
        if (!exchange) {
            return;
        }
        const trigger = Triggers_1.createTickerTrigger(exchange.feed, cmd.product, false).setAction((event) => {
            this.send(WSCommands_1.wrapMessage(event, cmd));
        });
        exchange.tickerTriggers[cmd.product] = trigger;
        const response = {
            type: 'subscribe',
            tag: cmd.tag,
            command: cmd,
            result: 'success'
        };
        this.send(response);
    }
    unsubscribeFromProduct(cmd) {
        const exchange = this.getConnectedExchange(cmd);
        if (!exchange) {
            return;
        }
        if (!exchange.tickerTriggers[cmd.product]) {
            this.send(WSCommands_1.newError(`${cmd.product} on ${cmd.exchange} is not currently subscribed to ticker events`, cmd));
            return;
        }
        const trigger = exchange.tickerTriggers[cmd.product];
        trigger.cancel();
        const response = {
            type: 'unsubscribe',
            tag: cmd.tag,
            command: cmd,
            result: 'success'
        };
        this.send(response);
    }
    initExchange(exchange, products, feed) {
        this.exchanges[exchange] = {
            feed: feed,
            products: products,
            tickerTriggers: {},
            liveBooks: {}
        };
        this.exchanges[exchange].products = products;
        products.forEach((product) => {
            this.exchanges[exchange].liveBooks[product] = createLiveBook(feed, product);
        });
    }
    sendTicker(cmd) {
        const book = this.getLiveBook(cmd);
        if (!book) {
            return;
        }
        const ticker = Object.assign({ type: 'ticker', time: new Date() }, book.ticker);
        this.send(WSCommands_1.wrapMessage(ticker, cmd));
    }
    sendOrderbookState(cmd) {
        const book = this.getLiveBook(cmd);
        if (!book) {
            return;
        }
        const msg = Object.assign({ type: 'snapshot', time: new Date(), productId: cmd.product }, book.state());
        this.send(WSCommands_1.wrapMessage(msg, cmd));
    }
}
//# sourceMappingURL=DataFeed.js.map