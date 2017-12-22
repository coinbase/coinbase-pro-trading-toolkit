// Type definitions for s3-streamlogger
// Project: https://github.com/Coggle/s3-streamlogger
// Definitions by: James Leone

declare module 's3-streamlogger' {
    namespace S3StreamLogger {
        export interface S3TransportOptions {
            bucket: string;
            folder?: string;
            access_key_id?: string;
            secret_access_key?: string;
            tags?: { [s: string] : string; } 
            name_format?: string;
            rotate_every?: number;
            max_file_size?: number;
            upload_every?: number;
            buffer_size?: number;
            server_side_encryption?: boolean;
            acl?: boolean;
            compress?: boolean;
        }
    }
    declare class S3StreamLogger {
        constructor(options: S3StreamLogger.S3TransportOptions);
        flushFile(): void;
    }
}
    