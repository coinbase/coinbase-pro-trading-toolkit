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

import { PassThrough, Readable, Writable } from 'stream';
import * as assert from 'assert';
import { EventEmitter } from 'events';

/**
 * Clones a (readable) stream to multiple (writable) streams. Manages backpressure for each output stream, though if
 * one stream is much slower than the others you could get large memory consumption. There's no way around this, except
 * stopping the feed to all the other streams too.
 *
 * Accepts an optional filter function that determines whether a message goes to any particular output stream (aka a devil's
 * trapdoor).
 */
export class StreamCopier extends EventEmitter {
    private readonly outputs: StreamConnection[];
    private readonly bufferStreams: PassThrough[];
    private numConnected: number;
    private readonly numOutputs: number;

    /**
     * Create a new StreamCopier. `numOutputs` reserves that many outward conections for streams and will buffer messages
     * until a downstream consumer is attached.
     *
     * The `options` parameter is passed onto the Writable streams' constructor and defaults to `objectMode: true` if
     * omitted.
     */
    constructor(feed: Readable, numOutputs: number, options?: any) {
        super();
        this.outputs = [];
        this.bufferStreams = new Array(numOutputs);
        options = options || { objectMode: true };
        for (let i = 0; i < numOutputs; i++) {
            this.bufferStreams[i] = new PassThrough(options);
            this.bufferStreams[i].on('error', (err: Error) => {
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
    get numConnections(): number {
        return this.numConnected;
    }

    /**
     * Attachs new output stream to the feed and assign it the given id
     * Returns true if the attachement was a success, false otherwise
     */
    attach(id: string): boolean {
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

    pipe(id: string, stream: Writable): boolean {
        const connection: StreamConnection = this.findConnection(id);
        if (!connection) {
            return false;
        }
        if (connection.stream !== null) {
            return false;
        }
        const buffer = this.bufferStreams[connection.index];
        assert(buffer instanceof PassThrough);
        buffer.pipe(stream);
        return true;
    }

    /**
     *
     * @param {string} id
     * @returns {"stream".internal.Writable}
     */
    unpipe(id: string): Writable {
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

    addFilter(id: string, filter: RelayFilter): boolean {
        const connection = this.findConnection(id);
        if (!connection) {
            return false;
        }
        connection.filters.push(filter);
        return true;
    }

    private findConnection(id: string): StreamConnection {
        return this.outputs.find((o: StreamConnection) => o.id === id);
    }

    private relayMessages(msg: any) {
        for (let i = 0; i < this.numConnections; i++) {
            const buffer: PassThrough = this.bufferStreams[i];
            if (!buffer) {
                continue;
            }
            const connection: StreamConnection = this.outputs[i];
            const shouldRelay: boolean = connection.filters.reduce((prev, filter) => prev && filter(msg), true);
            if (!shouldRelay) {
                continue;
            }
            // We ignore the backpressure complaints here, because we explicitly design the PassThrough stream to act as
            // a buffer
            buffer.write(msg);
        }
    }
}

export type RelayFilter = (msg: any) => boolean;

interface StreamConnection {
    id: string;
    index: number;
    stream: Writable;
    filters: RelayFilter[];
}
