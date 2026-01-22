/**
 * Booking-related type definitions for Fleetillo application
 */
import type { ID, Timestamps } from './index';
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
 * Individual service item within a booking
 */
export interface BookingServiceItem {
    serviceId: ID;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    duration: number;
}
/**
 * Booking entity representing a service booking in the system
 */
export interface Booking extends Timestamps {
    id: ID;
    customerId: ID;
    serviceId?: ID;
    serviceIds: ID[];
    serviceItems: BookingServiceItem[];
    routeId?: ID;
    locationId?: ID;
    stopOrder?: number;
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
    customerNotified: boolean;
    reminderSent: boolean;
    confirmationSent: boolean;
    tags?: string[];
    crmStatus?: string;
    crmId?: string;
    deletedAt?: Date;
    customerName?: string;
    customerEmail?: string;
    serviceName?: string;
    serviceCode?: string;
    serviceAverageDurationMinutes?: number;
    locationName?: string;
    locationLatitude?: number;
    locationLongitude?: number;
    routeCode?: string;
    vehicleId?: ID;
    vehicleName?: string;
}
/**
 * Database row representation (snake_case as stored in Supabase)
 */
export interface BookingRow {
    id: string;
    customer_id: string;
    service_id: string | null;
    service_ids: string[] | null;
    service_items: BookingServiceItem[] | null;
    route_id: string | null;
    location_id: string | null;
    stop_order: number | null;
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
    customer_notified: boolean;
    reminder_sent: boolean;
    confirmation_sent: boolean;
    tags: string[] | null;
    crm_status: string | null;
    crm_id: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    customers?: {
        name: string;
        email?: string;
    } | null;
    services?: {
        name: string;
        code?: string;
        average_duration_minutes?: number;
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
    customerId: ID;
    serviceId?: ID;
    serviceItems?: BookingServiceItem[];
    serviceIds?: ID[];
    bookingType: BookingType;
    scheduledDate: Date | string;
    scheduledStartTime: string;
    routeId?: ID;
    locationId?: ID;
    stopOrder?: number;
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
    customerNotified?: boolean;
    reminderSent?: boolean;
    confirmationSent?: boolean;
    tags?: string[];
    crmStatus?: string;
    crmId?: string;
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
    customerId?: ID;
    serviceId?: ID;
    routeId?: ID;
    routeIdIsNull?: boolean;
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