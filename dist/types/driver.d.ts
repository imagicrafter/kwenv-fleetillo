/**
 * Driver-related type definitions for OptiRoute application
 */
import type { ID, Timestamps } from './index.js';
/**
 * Driver status options
 */
export type DriverStatus = 'active' | 'inactive' | 'on_leave' | 'terminated';
/**
 * Driver entity representing a driver in the system
 */
export interface Driver extends Timestamps {
    id: ID;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    email?: string;
    telegramChatId?: string;
    licenseNumber?: string;
    licenseExpiry?: Date;
    licenseClass?: string;
    status: DriverStatus;
    hireDate?: Date;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    notes?: string;
    profileImageUrl?: string;
    assignedVehicleId?: ID;
    deletedAt?: Date;
}
/**
 * Database row representation (snake_case as stored in Supabase)
 */
export interface DriverRow {
    id: string;
    first_name: string;
    last_name: string;
    phone_number: string | null;
    email: string | null;
    telegram_chat_id: string | null;
    license_number: string | null;
    license_expiry: string | null;
    license_class: string | null;
    status: DriverStatus;
    hire_date: string | null;
    assigned_vehicle_id: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    notes: string | null;
    profile_image_url: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}
/**
 * Input for creating a new driver
 * Note: Date fields accept both Date objects and ISO date strings for flexibility
 */
export interface CreateDriverInput {
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    email?: string;
    telegramChatId?: string;
    licenseNumber?: string;
    licenseExpiry?: Date | string;
    licenseClass?: string;
    status?: DriverStatus;
    hireDate?: Date | string;
    assignedVehicleId?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    notes?: string;
    profileImageUrl?: string;
}
/**
 * Input for updating an existing driver
 */
export interface UpdateDriverInput extends Partial<CreateDriverInput> {
    id: ID;
}
/**
 * Driver filter options for queries
 */
export interface DriverFilters {
    status?: DriverStatus;
    searchTerm?: string;
    includeDeleted?: boolean;
}
/**
 * Converts a database row to a Driver entity
 */
export declare function rowToDriver(row: DriverRow): Driver;
/**
 * Converts a CreateDriverInput to a database row format
 * Note: assigned_vehicle_id is NOT included here - vehicle assignments are managed
 * via the vehicles table's assigned_driver_id column using assignDriverToVehicle()
 */
export declare function driverInputToRow(input: CreateDriverInput): Partial<DriverRow>;
//# sourceMappingURL=driver.d.ts.map