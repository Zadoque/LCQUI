"use strict";
jest.mock("firebase-functions/v2/https", () => {
    class HttpsError extends Error {
        code;
        constructor(code, message) {
            super(message);
            this.code = code;
            this.name = "HttpsError";
        }
    }
    return {
        onCall: jest.fn((optionsOrHandler, handler) => {
            // Handle both onCall((req) => {}) and onCall({region}, (req) => {})
            if (typeof optionsOrHandler === "function")
                return optionsOrHandler;
            return handler;
        }),
        HttpsError,
    };
});
//# sourceMappingURL=setup.js.map