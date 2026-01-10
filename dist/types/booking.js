"use strict";
/**
 * Booking-related type definitions for RouteIQ application
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rowToBooking = rowToBooking;
exports.bookingInputToRow = bookingInputToRow;
exports.updateBookingInputToRow = updateBookingInputToRow;
/**
 * Converts a database row to a Booking entity
 */
function rowToBooking(row) {
    return {
        id: row.id,
        // Foreign key references
        clientId: row.client_id,
        serviceId: row.service_id,
        vehicleId: row.vehicle_id ?? undefined,
        locationId: row.location_id ?? undefined,
        // Booking identification
        bookingNumber: row.booking_number ?? undefined,
        // Booking type and recurrence
        bookingType: row.booking_type,
        recurrencePattern: row.recurrence_pattern ?? undefined,
        recurrenceEndDate: row.recurrence_end_date ? new Date(row.recurrence_end_date) : undefined,
        parentBookingId: row.parent_booking_id ?? undefined,
        // Scheduling information
        scheduledDate: new Date(row.scheduled_date),
        scheduledStartTime: row.scheduled_start_time ?? undefined,
        scheduledEndTime: row.scheduled_end_time ?? undefined,
        estimatedDurationMinutes: row.estimated_duration_minutes ?? undefined,
        // Actual timing
        actualStartTime: row.actual_start_time ? new Date(row.actual_start_time) : undefined,
        actualEndTime: row.actual_end_time ? new Date(row.actual_end_time) : undefined,
        actualDurationMinutes: row.actual_duration_minutes ?? undefined,
        // Status tracking
        status: row.status,
        // Service location
        serviceAddressLine1: row.service_address_line1 ?? undefined,
        serviceAddressLine2: row.service_address_line2 ?? undefined,
        serviceCity: row.service_city ?? undefined,
        serviceState: row.service_state ?? undefined,
        servicePostalCode: row.service_postal_code ?? undefined,
        serviceCountry: row.service_country ?? undefined,
        // Pricing information
        quotedPrice: row.quoted_price ?? undefined,
        finalPrice: row.final_price ?? undefined,
        priceCurrency: row.price_currency,
        // Additional details
        priority: row.priority,
        specialInstructions: row.special_instructions ?? undefined,
        internalNotes: row.internal_notes ?? undefined,
        cancellationReason: row.cancellation_reason ?? undefined,
        // Client communication
        clientNotified: row.client_notified,
        reminderSent: row.reminder_sent,
        confirmationSent: row.confirmation_sent,
        // Metadata
        tags: row.tags ?? undefined,
        // Audit timestamps
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
        // Joined fields for UI
        clientName: row.clients?.name,
        clientEmail: row.clients?.email,
        serviceName: row.services?.name,
        serviceCode: row.services?.code,
        serviceAverageDurationMinutes: row.services?.average_duration_minutes,
        locationName: row.locations?.name,
        locationLatitude: row.locations?.latitude ?? undefined,
        locationLongitude: row.locations?.longitude ?? undefined,
    };
}
/**
 * Converts a CreateBookingInput to a database row format
 */
function bookingInputToRow(input) {
    const scheduledDate = typeof input.scheduledDate === 'string'
        ? input.scheduledDate
        : input.scheduledDate.toISOString().split('T')[0];
    const recurrenceEndDate = input.recurrenceEndDate
        ? typeof input.recurrenceEndDate === 'string'
            ? input.recurrenceEndDate
            : input.recurrenceEndDate.toISOString().split('T')[0]
        : null;
    return {
        client_id: input.clientId,
        service_id: input.serviceId,
        vehicle_id: input.vehicleId ?? null,
        location_id: input.locationId ?? null,
        booking_number: input.bookingNumber ?? null,
        booking_type: input.bookingType,
        recurrence_pattern: input.recurrencePattern ?? null,
        recurrence_end_date: recurrenceEndDate,
        parent_booking_id: input.parentBookingId ?? null,
        scheduled_date: scheduledDate,
        scheduled_start_time: input.scheduledStartTime || null,
        scheduled_end_time: input.scheduledEndTime ?? null,
        estimated_duration_minutes: input.estimatedDurationMinutes ?? null,
        status: input.status ?? 'pending',
        service_address_line1: input.serviceAddressLine1 ?? null,
        service_address_line2: input.serviceAddressLine2 ?? null,
        service_city: input.serviceCity ?? null,
        service_state: input.serviceState ?? null,
        service_postal_code: input.servicePostalCode ?? null,
        service_country: input.serviceCountry ?? null,
        quoted_price: input.quotedPrice ?? null,
        final_price: input.finalPrice ?? null,
        price_currency: input.priceCurrency ?? 'USD',
        priority: input.priority ?? 'normal',
        special_instructions: input.specialInstructions ?? null,
        internal_notes: input.internalNotes ?? null,
        client_notified: input.clientNotified ?? false,
        reminder_sent: input.reminderSent ?? false,
        confirmation_sent: input.confirmationSent ?? false,
        tags: input.tags ?? null,
    };
}
/**
 * Converts an UpdateBookingInput to a database row format
 * Only includes fields that are explicitly provided in the input
 */
function updateBookingInputToRow(input) {
    const row = {};
    // Only add fields that are explicitly provided
    if (input.clientId !== undefined)
        row.client_id = input.clientId;
    if (input.serviceId !== undefined)
        row.service_id = input.serviceId;
    if (input.vehicleId !== undefined)
        row.vehicle_id = input.vehicleId ?? null;
    if (input.locationId !== undefined)
        row.location_id = input.locationId ?? null;
    if (input.bookingNumber !== undefined)
        row.booking_number = input.bookingNumber ?? null;
    if (input.bookingType !== undefined)
        row.booking_type = input.bookingType;
    if (input.recurrencePattern !== undefined)
        row.recurrence_pattern = input.recurrencePattern ?? null;
    if (input.parentBookingId !== undefined)
        row.parent_booking_id = input.parentBookingId ?? null;
    if (input.scheduledDate !== undefined) {
        row.scheduled_date = typeof input.scheduledDate === 'string'
            ? input.scheduledDate
            : input.scheduledDate.toISOString().split('T')[0];
    }
    if (input.recurrenceEndDate !== undefined) {
        row.recurrence_end_date = input.recurrenceEndDate
            ? typeof input.recurrenceEndDate === 'string'
                ? input.recurrenceEndDate
                : input.recurrenceEndDate.toISOString().split('T')[0]
            : null;
    }
    if (input.scheduledStartTime !== undefined)
        row.scheduled_start_time = input.scheduledStartTime || null;
    if (input.scheduledEndTime !== undefined)
        row.scheduled_end_time = input.scheduledEndTime ?? null;
    if (input.estimatedDurationMinutes !== undefined)
        row.estimated_duration_minutes = input.estimatedDurationMinutes ?? null;
    if (input.status !== undefined)
        row.status = input.status;
    // Service location fields
    if (input.serviceAddressLine1 !== undefined)
        row.service_address_line1 = input.serviceAddressLine1 ?? null;
    if (input.serviceAddressLine2 !== undefined)
        row.service_address_line2 = input.serviceAddressLine2 ?? null;
    if (input.serviceCity !== undefined)
        row.service_city = input.serviceCity ?? null;
    if (input.serviceState !== undefined)
        row.service_state = input.serviceState ?? null;
    if (input.servicePostalCode !== undefined)
        row.service_postal_code = input.servicePostalCode ?? null;
    if (input.serviceCountry !== undefined)
        row.service_country = input.serviceCountry ?? null;
    // Pricing fields
    if (input.quotedPrice !== undefined)
        row.quoted_price = input.quotedPrice ?? null;
    if (input.finalPrice !== undefined)
        row.final_price = input.finalPrice ?? null;
    if (input.priceCurrency !== undefined)
        row.price_currency = input.priceCurrency;
    // Additional fields
    if (input.priority !== undefined)
        row.priority = input.priority;
    if (input.specialInstructions !== undefined)
        row.special_instructions = input.specialInstructions ?? null;
    if (input.internalNotes !== undefined)
        row.internal_notes = input.internalNotes ?? null;
    // Communication fields
    if (input.clientNotified !== undefined)
        row.client_notified = input.clientNotified;
    if (input.reminderSent !== undefined)
        row.reminder_sent = input.reminderSent;
    if (input.confirmationSent !== undefined)
        row.confirmation_sent = input.confirmationSent;
    // Metadata
    if (input.tags !== undefined)
        row.tags = input.tags ?? null;
    // Update-specific fields
    if (input.actualStartTime !== undefined) {
        row.actual_start_time = typeof input.actualStartTime === 'string'
            ? input.actualStartTime
            : input.actualStartTime.toISOString();
    }
    if (input.actualEndTime !== undefined) {
        row.actual_end_time = typeof input.actualEndTime === 'string'
            ? input.actualEndTime
            : input.actualEndTime.toISOString();
    }
    if (input.actualDurationMinutes !== undefined) {
        row.actual_duration_minutes = input.actualDurationMinutes;
    }
    if (input.cancellationReason !== undefined) {
        row.cancellation_reason = input.cancellationReason;
    }
    return row;
}
//# sourceMappingURL=booking.js.map