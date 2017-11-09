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

import { BigJS } from '../lib/types';
/**
 * WalletAPI defines a general adapter interface for handling wallet transactions, such as deposits and withdrawals
 * on a crypto exchange
 */
export interface ExchangeTransferAPI {

    /**
     * Request a new crypto `cur` address for deposits
     * @param cur {string} the crypto-currency to request an address for
     */
    requestCryptoAddress(cur: string): Promise<CryptoAddress>;

    /**
     * Request a transfer to another wallet or account on the same exchange. This operation should resolve near-instantaneously.
     * If the exchange does not support this operation, the promise is rejected, but there are ways of implementing
     * pseudo-wallets so that this operation can be emulated on exchanges that don't formally support multiple wallets.
     * @param request
     */
    requestTransfer(request: TransferRequest): Promise<TransferResult>;

    /**
     * Request a crypto-currency transfer of [amount] cur to the given crypto address
     */
    requestWithdrawal(request: WithdrawalRequest): Promise<TransferResult>;

}

/**
 * @param currency {string} the Currency to transfer (BTC, ETH etc)
 * @param amount {BigJS} the amount to transfer
 * @param address {string} a valid destination address
 * @param options {object} any additional options the underlying exchange API may accept
 */
export interface WithdrawalRequest {
    currency: string;
    amount: BigJS;
    address: string;
    options?: any;
}

export interface TransferResult {
    success: boolean;
    details?: any;
}

export interface CryptoAddress {
    currency: string;
    address: string;
}

export interface TransferRequest {
    currency: string;
    amount: BigJS;
    walletIdFrom: string;
    walletIdTo: string;
    options?: any;
}
