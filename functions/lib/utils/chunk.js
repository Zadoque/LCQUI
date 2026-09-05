"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chunkArray = chunkArray;
function chunkArray(items, chunkSize = 250) {
    const chunks = [];
    for (let i = 0; i < items.length; i += chunkSize) {
        chunks.push(items.slice(i, i + chunkSize));
    }
    return chunks;
}
//# sourceMappingURL=chunk.js.map