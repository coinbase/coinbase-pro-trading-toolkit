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

const winston = require('winston');

export interface Logger {
    log(level: string, message: string, meta?: any): void;

    error(err: Error): void;
}

export function ConsoleLoggerFactory(options?: any): Logger {
    const logOptions: any = Object.assign({
        level: 'debug',
        transports: [
            new winston.transports.Console({
                colorize: 'all',
                json: false,
                timestamp: true
            })
        ],
        colorize: true
    }, options || {});
    return new winston.Logger(logOptions);
}

export const NullLogger = {
    log(level: string, message: string, meta?: any): void {  /* no-op */
    },
    error(err: Error): void { /* no-op */
    }
};

/**
 * Utility function that acts exactly like ConsoleLogger, except that it runs any metadata through messageSanitizer first to blank out sensitive data
 */
export function SanitizedLoggerFactory(sensitiveKeys: string[], options?: any): Logger {
    const logger: Logger = ConsoleLoggerFactory(options);
    return {
        log: (level: string, message: string, meta?: any) => {
            meta = meta && typeof meta === 'object' ? sanitizeMessage(meta, sensitiveKeys) : meta;
            logger.log(level, message, meta);
        },
        error: (err: Error): void => {
            logger.error(sanitizeMessage(err, sensitiveKeys));
        }
    };
}
