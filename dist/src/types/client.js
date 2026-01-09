"use strict";
/**
 * Client-related type definitions for RouteIQ application
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rowToClient = rowToClient;
exports.clientInputToRow = clientInputToRow;
/**
 * Converts a database row to a Client entity
 */
function rowToClient(row) {
    return {
        id: row.id,
        name: row.name,
        companyName: row.company_name ?? undefined,
        email: row.email ?? undefined,
        phone: row.phone ?? undefined,
        mobilePhone: row.mobile_phone ?? undefined,
        addressLine1: row.address_line1 ?? undefined,
        addressLine2: row.address_line2 ?? undefined,
        city: row.city ?? undefined,
        state: row.state ?? undefined,
        postalCode: row.postal_code ?? undefined,
        country: row.country ?? undefined,
        serviceAddressLine1: row.service_address_line1 ?? undefined,
        serviceAddressLine2: row.service_address_line2 ?? undefined,
        serviceCity: row.service_city ?? undefined,
        serviceState: row.service_state ?? undefined,
        servicePostalCode: row.service_postal_code ?? undefined,
        serviceCountry: row.service_country ?? undefined,
        latitude: row.latitude ?? undefined,
        longitude: row.longitude ?? undefined,
        status: row.status,
        notes: row.notes ?? undefined,
        tags: row.tags ?? undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
    };
}
/**
 * Converts a CreateClientInput to a database row format
 */
function clientInputToRow(input) {
    return {
        name: input.name,
        company_name: input.companyName ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        mobile_phone: input.mobilePhone ?? null,
        address_line1: input.addressLine1 ?? null,
        address_line2: input.addressLine2 ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
        postal_code: input.postalCode ?? null,
        country: input.country ?? null,
        service_address_line1: input.serviceAddressLine1 ?? null,
        service_address_line2: input.serviceAddressLine2 ?? null,
        service_city: input.serviceCity ?? null,
        service_state: input.serviceState ?? null,
        service_postal_code: input.servicePostalCode ?? null,
        service_country: input.serviceCountry ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        status: input.status ?? 'active',
        notes: input.notes ?? null,
        tags: input.tags ?? null,
    };
}
//# sourceMappingURL=client.js.map