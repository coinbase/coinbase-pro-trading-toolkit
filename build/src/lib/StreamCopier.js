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
const stream_1 = require("stream");
const assert = require("assert");
const events_1 = require("events");
/**
 * Clones a (readable) stream to multiple (writable) streams. Manages backpressure for each output stream, though if
 * one stream is much slower than the others you could get large memory consumption. There's no way around this, except
 * stopping the feed to all the other streams too.
 *
 * Accepts an optional filter function that determines whether a message goes to any particular output stream (aka a devil's
 * trapdoor).
 */
class StreamCopier extends events_1.EventEmitter {
    /**
     * Create a new StreamCopier. `numOutputs` reserves that many outward conections for streams and will buffer messages
     * until a downstream consumer is attached.
     *
     * The `options` parameter is passed onto the Writable streams' constructor and defaults to `objectMode: true` if
     * omitted.
     */
    constructor(feed, numOutputs, options) {
        super();
        this.feed = feed;
        this.outputs = [];
        this.bufferStreams = new Array(numOutputs);
        options = options || { objectMode: true };
        for (let i = 0; i < numOutputs; i++) {
            this.bufferStreams[i] = new stream_1.PassThrough(options);
            this.bufferStreams[i].on('error', (err) => {
                this.emit('error', err);
            });
        }
        this.numConnected = 0;
        this.numOutputs = numOutputs;
        feed.on('readable', () => {
            let msg;
            // tslint:disable-next-line no-conditional-assignment
            while (null !== (msg = feed.read())) {
                this.relayMessages(msg);
            }
        });
    }
    /**
     * Return the number of output streams conected to the feed
     */
    get numConnections() {
        return this.numConnected;
    }
    /**
     * Attachs new output stream to the feed and assign it the given id
     * Returns true if the attachement was a success, false otherwise
     */
    attach(id) {
        const numConnections = this.numConnections;
        if (numConnections >= this.numOutputs) {
            return false;
        }
        this.outputs[numConnections] = {
            id: id,
            index: numConnections,
            stream: null,
            filters: []
        };
        this.numConnected++;
        return true;
    }
    pipe(id, stream) {
        const connection = this.findConnection(id);
        if (!connection) {
            return false;
        }
        if (connection.stream !== null) {
            return false;
        }
        const buffer = this.bufferStreams[connection.index];
        assert(buffer instanceof stream_1.PassThrough);
        buffer.pipe(stream);
        return true;
    }
    /**
     *
     * @param {string} id
     * @returns {"stream".internal.Writable}
     */
    unpipe(id) {
        const output = this.findConnection(id);
        if (!output || !output.stream) {
            return null;
        }
        const buffer = this.bufferStreams[output.index];
        buffer.unpipe(output.stream);
        buffer.end();
        this.bufferStreams[output.index] = null;
        return output.stream;
    }
    addFilter(id, filter) {
        const connection = this.findConnection(id);
        if (!connection) {
            return false;
        }
        connection.filters.push(filter);
        return true;
    }
    findConnection(id) {
        return this.outputs.find((o) => o.id === id);
    }
    relayMessages(msg) {
        for (let i = 0; i < this.numConnections; i++) {
            const buffer = this.bufferStreams[i];
            if (!buffer) {
                continue;
            }
            const connection = this.outputs[i];
            const shouldRelay = connection.filters.reduce((prev, filter) => prev && filter(msg), true);
            if (!shouldRelay) {
                continue;
            }
            // We ignore the backpressure complaints here, because we explicitly design the PassThrough stream to act as
            // a buffer
            buffer.write(msg);
        }
    }
}
exports.StreamCopier = StreamCopier;
//# sourceMappingURL=StreamCopier.js.map