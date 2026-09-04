jest.mock("firebase-functions/v2/https", () => {
  class HttpsError extends Error {
    constructor(public code: string, message: string) {
      super(message);
      this.name = "HttpsError";
    }
  }
  return {
    onCall: jest.fn((optionsOrHandler, handler) => {
      // Handle both onCall((req) => {}) and onCall({region}, (req) => {})
      if (typeof optionsOrHandler === "function") return optionsOrHandler;
      return handler;
    }),
    HttpsError,
  };
});
