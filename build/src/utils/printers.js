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
function printOrderbook(book, numOrders = 20, basePrec = 4, quotePrec = 2) {
    const state = book.state();
    let report = `\n\n Orderbook ${state.sequence}\n`;
    if (state.bids.length < numOrders) {
        return report;
    }
    let totalAsks = 0;
    let totalBids = 0;
    for (let i = 0; i < numOrders; i++) {
        const bid = state.bids[i];
        const ask = state.asks[i];
        totalAsks += +ask.totalSize;
        totalBids += +bid.totalSize;
        report += (`${padfloat(totalBids, 9, basePrec)}  ${padfloat(bid.totalSize, 8, basePrec)}  ${padfloat(bid.price, 7, quotePrec)}\t\t` +
            `${padfloat(ask.price, 7, quotePrec)}  ${padfloat(ask.totalSize, 8, basePrec)}  ${padfloat(totalAsks, 9, basePrec)}\n`);
    }
    return report;
}
exports.printOrderbook = printOrderbook;
function printSeparator() {
    return '--------------------------------------------------------------------------------';
}
exports.printSeparator = printSeparator;
function printTicker(ticker, quotePrec = 2) {
    return `Price: ${padfloat(ticker.price, 10, quotePrec)} | Bid: ${padfloat(ticker.bid, 10, quotePrec)} | ` +
        `Ask: ${padfloat(ticker.ask, 10, quotePrec)} | sequence: ${ticker.trade_id ? ticker.trade_id : 'N/A'}`;
}
exports.printTicker = printTicker;
function padfloat(val, total, decimals) {
    const str = (+val).toFixed(decimals);
    const padLen = total - str.length;
    let result = '';
    for (let i = 0; i < padLen; i++) {
        result += ' ';
    }
    return result + str;
}
exports.padfloat = padfloat;
//# sourceMappingURL=printers.js.map