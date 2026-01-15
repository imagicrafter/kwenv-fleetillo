"use strict";
/**
 * Driver-related type definitions for OptiRoute application
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
        licenseNumber: row.license_number ?? undefined,
        licenseExpiry: row.license_expiry ? new Date(row.license_expiry) : undefined,
        licenseClass: row.license_class ?? undefined,
        status: row.status,
        hireDate: row.hire_date ? new Date(row.hire_date) : undefined,
        emergencyContactName: row.emergency_contact_name ?? undefined,
        emergencyContactPhone: row.emergency_contact_phone ?? undefined,
        notes: row.notes ?? undefined,
        profileImageUrl: row.profile_image_url ?? undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
    };
}
/**
 * Converts a CreateDriverInput to a database row format
 */
function driverInputToRow(input) {
    return {
        first_name: input.firstName,
        last_name: input.lastName,
        phone_number: input.phoneNumber ?? null,
        email: input.email ?? null,
        telegram_chat_id: input.telegramChatId ?? null,
        license_number: input.licenseNumber ?? null,
        license_expiry: input.licenseExpiry?.toISOString().split('T')[0] ?? null,
        license_class: input.licenseClass ?? null,
        status: input.status ?? 'active',
        hire_date: input.hireDate?.toISOString().split('T')[0] ?? null,
        emergency_contact_name: input.emergencyContactName ?? null,
        emergency_contact_phone: input.emergencyContactPhone ?? null,
        notes: input.notes ?? null,
        profile_image_url: input.profileImageUrl ?? null,
    };
}
//# sourceMappingURL=driver.js.map