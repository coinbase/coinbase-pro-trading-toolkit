"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Errors raised as a result of an internal exception raised by GTT code.
 */
class GTTError extends Error {
    constructor(msg, err) {
        super(msg);
        this.cause = err;
        this.time = new Date();
    }
    asMessage() {
        return {
            type: 'error',
            time: this.time,
            message: this.message,
            cause: this.cause ? this.cause.message : undefined
        };
    }
}
exports.GTTError = GTTError;
/**
 * Errors raised or captured as a result of errors coming from external network sources, such as WS Feeds or REST APIs
 */
class APIError extends Error {
    constructor(msg, cause) {
        super(msg);
        this.cause = cause;
        this.time = new Date();
    }
    asMessage() {
        return {
            type: 'error',
            time: this.time,
            message: this.message,
            cause: this.cause
        };
    }
}
exports.APIError = APIError;
/**
 * Errors raised due to failures from REST API calls. The response status and body are returned in the `cause` object.
 */
class HTTPError extends Error {
    constructor(msg, res) {
        super(msg);
        this.time = new Date();
        this.response = res || { status: undefined, body: undefined };
    }
    asMessage() {
        return {
            type: 'error',
            time: this.time,
            message: this.message,
            cause: {
                status: this.response.status,
                body: this.response.body
            }
        };
    }
}
exports.HTTPError = HTTPError;
function extractResponse(res) {
    if (!res) {
        return {
            status: undefined,
            body: undefined
        };
    }
    return {
        status: res.status,
        body: res.body
    };
}
exports.extractResponse = extractResponse;
//# sourceMappingURL=errors.js.map