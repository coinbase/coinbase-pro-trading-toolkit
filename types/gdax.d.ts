// Type definitions for gdax 0.3.0
// Project: https://github.com/coinbase/gdax-node
// Definitions by: Cayle Sharrock <https://github.com/CjS77>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

declare module 'gdax' {
    import EventEmitter = NodeJS.EventEmitter;

    interface GDAXAuthConfig {
        key: string;
        secret: string;
        passphrase: string;
    }

    export class WebsocketClient extends EventEmitter {
        constructor(productID: string, websocketURL: string, auth?: GDAXAuthConfig)
        connect(): void;
        disconnect(): void;
        protected onOpen(): void;
        protected onMessage(): void;
        protected onClose(): void;
    }
}
