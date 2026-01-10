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
export type BookingStatus =
  | 'pending'       // Initial state
  | 'confirmed'     // Booking confirmed
  | 'scheduled'     // Scheduled on a route
  | 'in_progress'   // Service currently being performed
  | 'completed'     // Service completed
  | 'cancelled'     // Booking cancelled
  | 'no_show'       // Client didn't show up
  | 'rescheduled';  // Booking was rescheduled

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

  // Foreign key references
  clientId: ID;
  serviceId: ID;
  vehicleId?: ID;
  locationId?: ID;

  // Booking identification
  bookingNumber?: string;

  // Booking type and recurrence
  bookingType: BookingType;
  recurrencePattern?: RecurrencePattern;
  recurrenceEndDate?: Date;
  parentBookingId?: ID; // For recurring booking instances

  // Scheduling information
  scheduledDate: Date;
  scheduledStartTime?: string; // TIME format (HH:MM:SS), optional until route planning
  scheduledEndTime?: string; // TIME format (HH:MM:SS)
  estimatedDurationMinutes?: number;

  // Actual timing (for completed bookings)
  actualStartTime?: Date;
  actualEndTime?: Date;
  actualDurationMinutes?: number;

  // Status tracking
  status: BookingStatus;

  // Service location
  serviceAddressLine1?: string;
  serviceAddressLine2?: string;
  serviceCity?: string;
  serviceState?: string;
  servicePostalCode?: string;
  serviceCountry?: string;
  serviceLatitude?: number;
  serviceLongitude?: number;

  // Pricing information
  quotedPrice?: number;
  finalPrice?: number;
  priceCurrency: string;

  // Additional details
  priority: BookingPriority;
  specialInstructions?: string;
  internalNotes?: string;
  cancellationReason?: string;

  // Client communication
  clientNotified: boolean;
  reminderSent: boolean;
  confirmationSent: boolean;

  // Metadata
  tags?: string[];

  // Soft delete
  deletedAt?: Date;

  // Joined fields for UI display
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

  // Foreign key references
  client_id: string;
  service_id: string;
  vehicle_id: string | null;
  location_id: string | null;

  // Booking identification
  booking_number: string | null;

  // Booking type and recurrence
  booking_type: BookingType;
  recurrence_pattern: RecurrencePattern | null;
  recurrence_end_date: string | null; // DATE format
  parent_booking_id: string | null;

  // Scheduling information
  scheduled_date: string; // DATE format
  scheduled_start_time: string | null; // TIME format, null when unscheduled
  scheduled_end_time: string | null; // TIME format
  estimated_duration_minutes: number | null;

  // Actual timing
  actual_start_time: string | null; // TIMESTAMPTZ
  actual_end_time: string | null; // TIMESTAMPTZ
  actual_duration_minutes: number | null;

  // Status tracking
  status: BookingStatus;

  // Service location
  service_address_line1: string | null;
  service_address_line2: string | null;
  service_city: string | null;
  service_state: string | null;
  service_postal_code: string | null;
  service_country: string | null;

  // Pricing information
  quoted_price: number | null;
  final_price: number | null;
  price_currency: string;

  // Additional details
  priority: BookingPriority;
  special_instructions: string | null;
  internal_notes: string | null;
  cancellation_reason: string | null;

  // Client communication
  client_notified: boolean;
  reminder_sent: boolean;
  confirmation_sent: boolean;

  // Metadata
  tags: string[] | null;

  // Audit timestamps
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  // Joined fields from Supabase
  clients?: { name: string; email?: string } | null;
  services?: { name: string; code?: string } | null;
  locations?: { name: string; latitude?: number; longitude?: number } | null;
}

/**
 * Input for creating a new booking
 */
export interface CreateBookingInput {
  // Required fields
  clientId: ID;
  serviceId: ID;
  bookingType: BookingType;
  scheduledDate: Date | string;
  scheduledStartTime: string; // TIME format (HH:MM:SS or HH:MM)

  // Optional foreign keys
  vehicleId?: ID;
  locationId?: ID;

  // Booking identification
  bookingNumber?: string;

  // Recurrence (required if bookingType is 'recurring')
  recurrencePattern?: RecurrencePattern;
  recurrenceEndDate?: Date | string;
  parentBookingId?: ID;

  // Scheduling
  scheduledEndTime?: string; // TIME format
  estimatedDurationMinutes?: number;

  // Status
  status?: BookingStatus;

  // Service location
  serviceAddressLine1?: string;
  serviceAddressLine2?: string;
  serviceCity?: string;
  serviceState?: string;
  servicePostalCode?: string;
  serviceCountry?: string;
  serviceLatitude?: number;
  serviceLongitude?: number;

  // Pricing
  quotedPrice?: number;
  finalPrice?: number;
  priceCurrency?: string;

  // Additional details
  priority?: BookingPriority;
  specialInstructions?: string;
  internalNotes?: string;

  // Client communication
  clientNotified?: boolean;
  reminderSent?: boolean;
  confirmationSent?: boolean;

  // Metadata
  tags?: string[];
}

/**
 * Input for updating an existing booking
 */
export interface UpdateBookingInput extends Partial<CreateBookingInput> {
  id: ID;

  // Additional fields that can be updated
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
  searchTerm?: string; // Search in booking_number, special_instructions, etc.
  includeDeleted?: boolean;
  ids?: ID[]; // Filter by specific IDs
}

/**
 * Converts a database row to a Booking entity
 */
export function rowToBooking(row: BookingRow): Booking {
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
    serviceName: (row as any).services?.name,
    serviceCode: (row as any).services?.code,
    serviceAverageDurationMinutes: (row as any).services?.average_duration_minutes,
    locationName: (row as any).locations?.name,
    locationLatitude: row.locations?.latitude ?? undefined,
    locationLongitude: row.locations?.longitude ?? undefined,
  };
}

/**
 * Converts a CreateBookingInput to a database row format
 */
export function bookingInputToRow(input: CreateBookingInput): Partial<BookingRow> {
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
export function updateBookingInputToRow(input: UpdateBookingInput): Partial<BookingRow> {
  const row: Partial<BookingRow> = {};

  // Only add fields that are explicitly provided
  if (input.clientId !== undefined) row.client_id = input.clientId;
  if (input.serviceId !== undefined) row.service_id = input.serviceId;
  if (input.vehicleId !== undefined) row.vehicle_id = input.vehicleId ?? null;
  if (input.locationId !== undefined) row.location_id = input.locationId ?? null;
  if (input.bookingNumber !== undefined) row.booking_number = input.bookingNumber ?? null;
  if (input.bookingType !== undefined) row.booking_type = input.bookingType;
  if (input.recurrencePattern !== undefined) row.recurrence_pattern = input.recurrencePattern ?? null;
  if (input.parentBookingId !== undefined) row.parent_booking_id = input.parentBookingId ?? null;

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

  if (input.scheduledStartTime !== undefined) row.scheduled_start_time = input.scheduledStartTime || null;
  if (input.scheduledEndTime !== undefined) row.scheduled_end_time = input.scheduledEndTime ?? null;
  if (input.estimatedDurationMinutes !== undefined) row.estimated_duration_minutes = input.estimatedDurationMinutes ?? null;
  if (input.status !== undefined) row.status = input.status;

  // Service location fields
  if (input.serviceAddressLine1 !== undefined) row.service_address_line1 = input.serviceAddressLine1 ?? null;
  if (input.serviceAddressLine2 !== undefined) row.service_address_line2 = input.serviceAddressLine2 ?? null;
  if (input.serviceCity !== undefined) row.service_city = input.serviceCity ?? null;
  if (input.serviceState !== undefined) row.service_state = input.serviceState ?? null;
  if (input.servicePostalCode !== undefined) row.service_postal_code = input.servicePostalCode ?? null;
  if (input.serviceCountry !== undefined) row.service_country = input.serviceCountry ?? null;

  // Pricing fields
  if (input.quotedPrice !== undefined) row.quoted_price = input.quotedPrice ?? null;
  if (input.finalPrice !== undefined) row.final_price = input.finalPrice ?? null;
  if (input.priceCurrency !== undefined) row.price_currency = input.priceCurrency;

  // Additional fields
  if (input.priority !== undefined) row.priority = input.priority;
  if (input.specialInstructions !== undefined) row.special_instructions = input.specialInstructions ?? null;
  if (input.internalNotes !== undefined) row.internal_notes = input.internalNotes ?? null;

  // Communication fields
  if (input.clientNotified !== undefined) row.client_notified = input.clientNotified;
  if (input.reminderSent !== undefined) row.reminder_sent = input.reminderSent;
  if (input.confirmationSent !== undefined) row.confirmation_sent = input.confirmationSent;

  // Metadata
  if (input.tags !== undefined) row.tags = input.tags ?? null;

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
