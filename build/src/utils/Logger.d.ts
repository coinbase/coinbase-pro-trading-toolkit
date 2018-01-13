export interface Logger {
    log(level: string, message: string, meta?: any): void;
    error(err: Error): void;
}
export declare function ConsoleLoggerFactory(options?: any): Logger;
export declare const NullLogger: {
    log(level: string, message: string, meta?: any): void;
    error(err: Error): void;
};
/**
 * Utility function that acts exactly like ConsoleLogger, except that it runs any metadata through messageSanitizer first to blank out sensitive data
 */
export declare function SanitizedLoggerFactory(sensitiveKeys: string[], options?: any): Logger;
