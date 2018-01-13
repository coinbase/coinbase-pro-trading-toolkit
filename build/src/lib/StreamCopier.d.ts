/// <reference types="node" />
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
import { Readable, Writable } from 'stream';
import { EventEmitter } from 'events';
/**
 * Clones a (readable) stream to multiple (writable) streams. Manages backpressure for each output stream, though if
 * one stream is much slower than the others you could get large memory consumption. There's no way around this, except
 * stopping the feed to all the other streams too.
 *
 * Accepts an optional filter function that determines whether a message goes to any particular output stream (aka a devil's
 * trapdoor).
 */
export declare class StreamCopier extends EventEmitter {
    private feed;
    private outputs;
    private bufferStreams;
    private numConnected;
    private numOutputs;
    /**
     * Create a new StreamCopier. `numOutputs` reserves that many outward conections for streams and will buffer messages
     * until a downstream consumer is attached.
     *
     * The `options` parameter is passed onto the Writable streams' constructor and defaults to `objectMode: true` if
     * omitted.
     */
    constructor(feed: Readable, numOutputs: number, options?: any);
    /**
     * Return the number of output streams conected to the feed
     */
    readonly numConnections: number;
    /**
     * Attachs new output stream to the feed and assign it the given id
     * Returns true if the attachement was a success, false otherwise
     */
    attach(id: string): boolean;
    pipe(id: string, stream: Writable): boolean;
    /**
     *
     * @param {string} id
     * @returns {"stream".internal.Writable}
     */
    unpipe(id: string): Writable;
    addFilter(id: string, filter: RelayFilter): boolean;
    private findConnection(id);
    private relayMessages(msg);
}
export declare type RelayFilter = (msg: any) => boolean;
