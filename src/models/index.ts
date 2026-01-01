/**
 * Models barrel export
 * Export all models from this file for convenient imports
 */

// Re-export client types and utilities
export type {
  Client,
  ClientRow,
  CreateClientInput,
  UpdateClientInput,
  ClientFilters,
  ClientStatus,
  Address,
  GeoLocation,
  ContactInfo,
} from '../types/client.js';

export { rowToClient, clientInputToRow } from '../types/client.js';

// Re-export booking types and utilities
export type {
  Booking,
  BookingRow,
  CreateBookingInput,
  UpdateBookingInput,
  BookingFilters,
  BookingType,
  BookingStatus,
  BookingPriority,
  RecurrencePattern,
  ServiceLocation,
} from '../types/booking.js';

export {
  rowToBooking,
  bookingInputToRow,
  updateBookingInputToRow,
} from '../types/booking.js';
