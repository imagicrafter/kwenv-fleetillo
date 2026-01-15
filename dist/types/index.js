"use strict";
/**
 * Common type definitions for RouteIQ application
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
// Re-export logger types
__exportStar(require("./logger.js"), exports);
// Re-export error types
__exportStar(require("./errors.js"), exports);
// Re-export client types
__exportStar(require("./client.js"), exports);
// Re-export service types
__exportStar(require("./service.js"), exports);
// Re-export vehicle types
__exportStar(require("./vehicle.js"), exports);
// Re-export driver types
__exportStar(require("./driver.js"), exports);
// Re-export booking types
__exportStar(require("./booking.js"), exports);
// Re-export maintenance schedule types
__exportStar(require("./maintenanceSchedule.js"), exports);
// Re-export route types
__exportStar(require("./route.js"), exports);
// Re-export Google Maps types
__exportStar(require("./googlemaps.js"), exports);
// Re-export Address Validation types
__exportStar(require("./address-validation.js"), exports);
//# sourceMappingURL=index.js.map