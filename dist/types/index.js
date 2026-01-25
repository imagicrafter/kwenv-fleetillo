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
// Re-export common base types (must be first to avoid circular deps)
__exportStar(require("./common"), exports);
// Re-export logger types
__exportStar(require("./logger"), exports);
// Re-export error types
__exportStar(require("./errors"), exports);
// Re-export customer types
__exportStar(require("./customer"), exports);
// Re-export service types
__exportStar(require("./service"), exports);
// Re-export vehicle types
__exportStar(require("./vehicle"), exports);
// Re-export driver types
__exportStar(require("./driver"), exports);
// Re-export booking types
__exportStar(require("./booking"), exports);
// Re-export maintenance schedule types
__exportStar(require("./maintenanceSchedule"), exports);
// Re-export route types
__exportStar(require("./route"), exports);
// Re-export route token types
__exportStar(require("./route-token"), exports);
// Re-export Google Maps types
__exportStar(require("./googlemaps"), exports);
// Re-export Address Validation types
__exportStar(require("./address-validation"), exports);
// Note: Google Routes types are available via direct import from './google-routes'
// to avoid naming conflicts with existing Route and TravelMode types
//# sourceMappingURL=index.js.map