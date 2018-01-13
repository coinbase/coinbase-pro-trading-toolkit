"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CryptoProvider_1 = require("../../src/FXService/providers/CryptoProvider");
const gdaxFactories_1 = require("../../src/factories/gdaxFactories");
const Logger_1 = require("../../src/utils/Logger");
const FXProvider_1 = require("../../src/FXService/FXProvider");
const assert = require('assert');
const nock = require('nock');
describe('CryptoProvider', () => {
    let exchange;
    let provider;
    before(() => {
        exchange = gdaxFactories_1.DefaultAPI(Logger_1.NullLogger);
        provider = new CryptoProvider_1.CryptoProvider({
            exchange: exchange,
            logger: Logger_1.NullLogger
        });
    });
    it('returns true for supported currencies', () => {
        nock('https://api.gdax.com')
            .get('/products')
            .reply(200, [{
                id: 'BTC-USD',
                base_currency: 'BTC',
                quote_currency: 'USD',
                base_min_size: '0.01',
                base_max_size: '1000000',
                quote_increment: '0.01',
                display_name: 'BTC/USD'
            }]);
        return provider.supportsPair({ from: 'BTC', to: 'USD' }).then((result) => {
            assert.equal(result, true);
        });
    });
    it('returns false for unsupported currencies', () => {
        return provider.supportsPair({ from: 'USD', to: 'XYZ' }).then((result) => {
            assert.equal(result, false);
        });
    });
    it('returns 1.0 for identities', () => {
        return provider.fetchCurrentRate({ from: 'XYZ', to: 'XYZ' }).then((result) => {
            assert.equal(result.rate.toNumber(), 1.0);
            assert.equal(result.from, 'XYZ');
            assert.equal(result.to, 'XYZ');
        });
    });
    it('returns spot rate for supported currencies', () => {
        nock('https://api.gdax.com:443')
            .get('/products/BTC-USD/ticker')
            .reply(200, {
            trade_id: 10000,
            price: '10500.00',
            bid: '10400.00',
            ask: '10600.00',
            time: '2017-10-26T06:17:41.579000Z'
        });
        return provider.fetchCurrentRate({ from: 'BTC', to: 'USD' }).then((result) => {
            assert.equal(result.rate.toNumber(), 10500);
            assert.equal(result.from, 'BTC');
            assert.equal(result.to, 'USD');
        });
    });
    it('returns inverse spot rate for supported currencies', () => {
        nock('https://api.gdax.com:443')
            .get('/products/BTC-USD/ticker')
            .reply(200, {
            trade_id: 10000,
            price: '10500.00',
            bid: '10400.00',
            ask: '10600.00',
            time: '2017-10-26T06:17:41.579000Z'
        });
        return provider.fetchCurrentRate({ from: 'USD', to: 'BTC' }).then((result) => {
            assert.equal(result.rate.toNumber(), 1 / 10500);
            assert.equal(result.from, 'USD');
            assert.equal(result.to, 'BTC');
        });
    });
    it('rejects for unsupported currencies', () => {
        nock('https://api.gdax.com:443')
            .get('/products/BTC-XYZ/ticker')
            .reply(404, { message: 'NotFound' });
        return provider.fetchCurrentRate({ from: 'BTC', to: 'XYZ' }).then((result) => {
            throw new Error('should reject this promise');
        }).catch((err) => {
            assert.ok(err instanceof FXProvider_1.EFXRateUnavailable);
        });
    });
});
//# sourceMappingURL=CryptoProviderTest.js.map