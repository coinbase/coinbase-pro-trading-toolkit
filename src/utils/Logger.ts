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
import { sanitizeMessage } from '../core/Messages';
import { S3StreamLogger } from 's3-streamlogger';
import * as Winston from 'winston';

export interface Logger {
    log(level: string, message: string, meta?: any): void;
}

export function ConsoleLoggerFactory(options?: any): Logger {
    const logOptions: any = Object.assign({
        level: 'debug',
        transports: [
            new Winston.transports.Console({
                colorize: 'all',
                json: false,
                timestamp: true
            })
        ],
        colorize: true
    }, options || {});
    return new Winston.Logger(logOptions);
}
export type TransportErrorHandler = (error: any) => any;

export function S3LoggerFactory(transportOptions: S3StreamLogger.S3TransportOptions,
                                loggerOptions?: Winston.LoggerOptions,
                                errorHandler?: TransportErrorHandler,): Winston.LoggerInstance {

    const s3stream = new S3StreamLogger(transportOptions);
    const fTransportOptions: any = Object.assign({
        stream: s3stream,
    }, transportOptions, loggerOptions || {});

    const s3FileTransport = new Winston.transports.File(fTransportOptions);
    if (errorHandler) {
        s3FileTransport.on('error', errorHandler);
    }

    const logOptions: any = Object.assign({
        level: 'debug',
        transports: [s3FileTransport],
    }, transportOptions, loggerOptions || {});

    return new Winston.Logger(logOptions);
}

export function FileLoggerFactory(transportOptions?: Winston.FileTransportOptions,
                                  loggerOptions?: Winston.LoggerOptions,
                                  errorHandler?: TransportErrorHandler): Winston.LoggerInstance {

    const fileTransport = new Winston.transports.File(transportOptions);

    if (errorHandler) {
        fileTransport.on('error', errorHandler);
    }

    const logOptions: Winston.LoggerOptions = Object.assign({
        level: 'debug',
        transports: [ fileTransport ],
    }, transportOptions, loggerOptions || {});

    return new Winston.Logger(logOptions);
}

export const NullLogger = new Winston.Logger({
    transports: [],
});

/**
 * Utility function that acts exactly like ConsoleLogger, except that it runs any metadata through messageSanitizer first to blank out sensitive data
 */

export function SanitizedLoggerFactory(sensitiveKeys: string[], options?: any): Logger {
    const logger: Logger = ConsoleLoggerFactory(options);
    return {
        log: (level: string, message: string, meta?: any) => {
            meta = meta && typeof meta === 'object' ? sanitizeMessage(meta, sensitiveKeys) : meta;
            logger.log(level, message, meta);
        }
    };
}
