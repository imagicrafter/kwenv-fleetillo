"use strict";
/**
 * Route Token type definitions
 *
 * Route tokens provide time-limited, public access to view route maps
 * without requiring authentication. Used for driver dispatch links.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rowToRouteToken = rowToRouteToken;
exports.routeTokenInputToRow = routeTokenInputToRow;
/**
 * Converts a database row to a RouteToken entity
 */
function rowToRouteToken(row) {
    return {
        id: row.id,
        routeId: row.route_id,
        token: row.token,
        expiresAt: new Date(row.expires_at),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}
/**
 * Converts CreateRouteTokenInput to database row format
 */
function routeTokenInputToRow(input, token, expiresAt) {
    return {
        route_id: input.routeId,
        token,
        expires_at: expiresAt.toISOString(),
    };
}
//# sourceMappingURL=route-token.js.map