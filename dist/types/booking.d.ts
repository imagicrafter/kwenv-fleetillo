/**
 * Booking-related type definitions for RouteIQ application
 */
import type { ID, Timestamps } from './index.js';
/**
 * Booking type options
 */
export type BookingType = 'one_time' | 'recurring';
/**
 * Recurrence pattern options for recurring bookings
 */
export type RecurrencePattern = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
/**
 * Booking status options
 */
export type BookingStatus = 'pending' | 'confirmed' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
/**
 * Priority levels for bookings
 */
export type BookingPriority = 'low' | 'normal' | 'high' | 'urgent';
/**
 * Service location information
 */
export interface ServiceLocation {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
}
/**
 * Booking entity representing a service booking in the system
 */
export interface Booking extends Timestamps {
    id: ID;
    clientId: ID;
    serviceId: ID;
    vehicleId?: ID;
    locationId?: ID;
    bookingNumber?: string;
    bookingType: BookingType;
    recurrencePattern?: RecurrencePattern;
    recurrenceEndDate?: Date;
    parentBookingId?: ID;
    scheduledDate: Date;
    scheduledStartTime?: string;
    scheduledEndTime?: string;
    estimatedDurationMinutes?: number;
    actualStartTime?: Date;
    actualEndTime?: Date;
    actualDurationMinutes?: number;
    status: BookingStatus;
    serviceAddressLine1?: string;
    serviceAddressLine2?: string;
    serviceCity?: string;
    serviceState?: string;
    servicePostalCode?: string;
    serviceCountry?: string;
    serviceLatitude?: number;
    serviceLongitude?: number;
    quotedPrice?: number;
    finalPrice?: number;
    priceCurrency: string;
    priority: BookingPriority;
    specialInstructions?: string;
    internalNotes?: string;
    cancellationReason?: string;
    clientNotified: boolean;
    reminderSent: boolean;
    confirmationSent: boolean;
    tags?: string[];
    deletedAt?: Date;
    clientName?: string;
    clientEmail?: string;
    serviceName?: string;
    serviceCode?: string;
    serviceAverageDurationMinutes?: number;
    locationName?: string;
    locationLatitude?: number;
    locationLongitude?: number;
}
/**
 * Database row representation (snake_case as stored in Supabase)
 */
export interface BookingRow {
    id: string;
    client_id: string;
    service_id: string;
    vehicle_id: string | null;
    location_id: string | null;
    booking_number: string | null;
    booking_type: BookingType;
    recurrence_pattern: RecurrencePattern | null;
    recurrence_end_date: string | null;
    parent_booking_id: string | null;
    scheduled_date: string;
    scheduled_start_time: string | null;
    scheduled_end_time: string | null;
    estimated_duration_minutes: number | null;
    actual_start_time: string | null;
    actual_end_time: string | null;
    actual_duration_minutes: number | null;
    status: BookingStatus;
    service_address_line1: string | null;
    service_address_line2: string | null;
    service_city: string | null;
    service_state: string | null;
    service_postal_code: string | null;
    service_country: string | null;
    quoted_price: number | null;
    final_price: number | null;
    price_currency: string;
    priority: BookingPriority;
    special_instructions: string | null;
    internal_notes: string | null;
    cancellation_reason: string | null;
    client_notified: boolean;
    reminder_sent: boolean;
    confirmation_sent: boolean;
    tags: string[] | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    clients?: {
        name: string;
        email?: string;
    } | null;
    services?: {
        name: string;
        code?: string;
    } | null;
    locations?: {
        name: string;
        latitude?: number;
        longitude?: number;
    } | null;
}
/**
 * Input for creating a new booking
 */
export interface CreateBookingInput {
    clientId: ID;
    serviceId: ID;
    bookingType: BookingType;
    scheduledDate: Date | string;
    scheduledStartTime: string;
    vehicleId?: ID;
    locationId?: ID;
    bookingNumber?: string;
    recurrencePattern?: RecurrencePattern;
    recurrenceEndDate?: Date | string;
    parentBookingId?: ID;
    scheduledEndTime?: string;
    estimatedDurationMinutes?: number;
    status?: BookingStatus;
    serviceAddressLine1?: string;
    serviceAddressLine2?: string;
    serviceCity?: string;
    serviceState?: string;
    servicePostalCode?: string;
    serviceCountry?: string;
    serviceLatitude?: number;
    serviceLongitude?: number;
    quotedPrice?: number;
    finalPrice?: number;
    priceCurrency?: string;
    priority?: BookingPriority;
    specialInstructions?: string;
    internalNotes?: string;
    clientNotified?: boolean;
    reminderSent?: boolean;
    confirmationSent?: boolean;
    tags?: string[];
}
/**
 * Input for updating an existing booking
 */
export interface UpdateBookingInput extends Partial<CreateBookingInput> {
    id: ID;
    actualStartTime?: Date | string;
    actualEndTime?: Date | string;
    actualDurationMinutes?: number;
    cancellationReason?: string;
}
/**
 * Booking filter options for queries
 */
export interface BookingFilters {
    clientId?: ID;
    serviceId?: ID;
    vehicleId?: ID;
    bookingType?: BookingType;
    status?: BookingStatus;
    priority?: BookingPriority;
    scheduledDateFrom?: Date | string;
    scheduledDateTo?: Date | string;
    tags?: string[];
    searchTerm?: string;
    includeDeleted?: boolean;
    ids?: ID[];
}
/**
 * Converts a database row to a Booking entity
 */
export declare function rowToBooking(row: BookingRow): Booking;
/**
 * Converts a CreateBookingInput to a database row format
 */
export declare function bookingInputToRow(input: CreateBookingInput): Partial<BookingRow>;
/**
 * Converts an UpdateBookingInput to a database row format
 * Only includes fields that are explicitly provided in the input
 */
export declare function updateBookingInputToRow(input: UpdateBookingInput): Partial<BookingRow>;
//# sourceMappingURL=booking.d.ts.map