/**********************************************************************************************************************
 * @license                                                                                                           *
 * Copyright 2017 Coinbase, Inc.                                                                                      *
 *                                                                                                                    *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance     *
 * with the License. You may obtain a copy of the License at                                                          *
 *                                                                                                                    *
 * http://www.apache.org/licenses/LICENSE-2.0                                                                         *
 *                                                                                                                    *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on*
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the                 *
 * License for the specific language governing permissions and limitations under the License.                         *
 **********************************************************************************************************************/

import { AuthenticatedExchangeAPI } from '../exchanges/AuthenticatedExchangeAPI';
import { delay, eachSeries } from '../utils/promises';

/**
 * Send cancellation commands for the array of order ids with limited to 'limit' requests per second
 */

export interface BulkCancelResult {
    cancelled: string[];
    failed: string[];
}

export function bulkCancelWithRateLimit(api: AuthenticatedExchangeAPI, ids: string[], limit: number): Promise<BulkCancelResult> {
    const start = Date.now();
    const secondsPerRequest = 1.0 / limit;
    let requestsSent = 0;
    const cancelled: string[] = [];
    const failed: string[] = [];
    return eachSeries(ids, (id: string) => {
        const desiredElapsed = (requestsSent + 1) * secondsPerRequest;
        const actualElapsed = (Date.now() - start) * 0.001;
        const interval = Math.max(0, desiredElapsed - actualElapsed);
        return delay(interval).then(() => {
            return api.cancelOrder(id).then((result: string) => {
                requestsSent++;
                cancelled.push(result);
                return Promise.resolve();
            }, () => {
                failed.push(id);
                return Promise.resolve();
            });
        });
    }).then(() => {
        return { cancelled, failed };
    });
}
