"use strict";
/**
 * Driver-related type definitions for Fleetillo application
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rowToDriver = rowToDriver;
exports.driverInputToRow = driverInputToRow;
/**
 * Converts a database row to a Driver entity
 */
function rowToDriver(row) {
    return {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        phoneNumber: row.phone_number ?? undefined,
        email: row.email ?? undefined,
        telegramChatId: row.telegram_chat_id ?? undefined,
        preferredChannel: row.preferred_channel ?? 'telegram',
        fallbackEnabled: row.fallback_enabled ?? true,
        licenseNumber: row.license_number ?? undefined,
        licenseExpiry: row.license_expiry ? new Date(row.license_expiry) : undefined,
        licenseClass: row.license_class ?? undefined,
        status: row.status,
        hireDate: row.hire_date ? new Date(row.hire_date) : undefined,
        emergencyContactName: row.emergency_contact_name ?? undefined,
        emergencyContactPhone: row.emergency_contact_phone ?? undefined,
        notes: row.notes ?? undefined,
        profileImageUrl: row.profile_image_url ?? undefined,
        tags: row.tags ?? [],
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
    };
}
/**
 * Helper to convert a date input (Date object or string) to YYYY-MM-DD format
 */
function formatDateForDb(date) {
    if (!date)
        return null;
    if (date instanceof Date) {
        return date.toISOString().split('T')[0] ?? null;
    }
    // If it's already a string, validate it looks like a date and return as-is
    if (typeof date === 'string' && date.trim().length > 0) {
        // Return the date portion (handles both YYYY-MM-DD and ISO strings)
        return date.split('T')[0] ?? null;
    }
    return null;
}
/**
 * Converts a CreateDriverInput to a database row format
 * Note: assigned_vehicle_id is NOT included here - vehicle assignments are managed
 * via the vehicles table's assigned_driver_id column using assignDriverToVehicle()
 */
function driverInputToRow(input) {
    return {
        first_name: input.firstName,
        last_name: input.lastName,
        phone_number: input.phoneNumber ?? null,
        email: input.email ?? null,
        telegram_chat_id: input.telegramChatId ?? null,
        preferred_channel: input.preferredChannel ?? 'telegram',
        fallback_enabled: input.fallbackEnabled ?? true,
        license_number: input.licenseNumber ?? null,
        license_expiry: formatDateForDb(input.licenseExpiry),
        license_class: input.licenseClass ?? null,
        status: input.status ?? 'active',
        hire_date: formatDateForDb(input.hireDate),
        emergency_contact_name: input.emergencyContactName ?? null,
        emergency_contact_phone: input.emergencyContactPhone ?? null,
        notes: input.notes ?? null,
        profile_image_url: input.profileImageUrl ?? null,
        tags: input.tags ?? [],
    };
}
//# sourceMappingURL=driver.js.map