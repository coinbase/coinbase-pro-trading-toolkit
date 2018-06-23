// Type definitions for s3-streamlogger
// Project: https://github.com/Coggle/s3-streamlogger
// Definitions by: James Leone

declare module 's3-streamlogger' {
    namespace S3StreamLogger {
        // would prefer to figure out what to inherit from GenericTransportOptions, but couldn't get that working
        // export interface S3TransportOptions extends GenericTransportOptions {
        export interface S3TransportOptions {
            bucket: string;
            folder?: string;
            file_name?: string;
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
            // "inheritted" through copy-paste
            level?: string;
            json?: boolean;
            formatter?(options?: any): string;

        }
    }
    declare class S3StreamLogger {
        constructor(options: S3StreamLogger.S3TransportOptions);
        flushFile(): void;
    }
}
    