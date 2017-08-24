// Type definitions for pushbullet 2.0.0
// Project: https://github.com/alexwhitman/node-pushbullet-api
// Definitions by: Cayle Sharrock <https://github.com/CjS77>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

declare module 'pushbullet' {

    namespace PushBullet {
        export type Callback = (err: Error, res: any) => void;
        export type DeviceParams = string | number | object;
        export interface DeviceOptions {
            active?: boolean;
            limit?: number;
            cursor?: number;
        }
    }
    class PushBullet {
        constructor(api_key: string);
        me(cb: PushBullet.Callback): void;

        devices(options: PushBullet.DeviceOptions, cb: PushBullet.Callback): void;

        note(deviceParams: PushBullet.DeviceParams, noteTitle: string, noteBody: string, cb: PushBullet.Callback): void;

        link(deviceParams: PushBullet.DeviceParams, name: string, url: string, cb: PushBullet.Callback): void;

        file(deviceParams: PushBullet.DeviceParams, filePath: string, message: string, cb: PushBullet.Callback): void;

        deletePush(pushId: string, cb: PushBullet.Callback): void;

        deleteAllPushes(cb: PushBullet.Callback): void;
    }

    export = PushBullet;
}

