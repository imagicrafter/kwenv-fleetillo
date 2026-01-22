"use strict";
/**
 * Utility functions for RouteIQ application
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = sleep;
exports.safeJsonParse = safeJsonParse;
exports.isDefined = isDefined;
exports.generateId = generateId;
exports.deepClone = deepClone;
// Re-export logger utilities
__exportStar(require("./logger"), exports);
/**
 * Sleep utility for async operations
 * @param ms - Milliseconds to sleep
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Safely parse JSON with error handling
 * @param json - JSON string to parse
 * @returns Parsed object or null if parsing fails
 */
function safeJsonParse(json) {
    try {
        return JSON.parse(json);
    }
    catch {
        return null;
    }
}
/**
 * Check if a value is defined (not null or undefined)
 * @param value - Value to check
 */
function isDefined(value) {
    return value !== null && value !== undefined;
}
/**
 * Generate a simple unique ID
 * Note: For production, use a proper UUID library
 */
function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
/**
 * Deep clone an object
 * @param obj - Object to clone
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
//# sourceMappingURL=index.js.map