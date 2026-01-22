/**
 * Models barrel export
 * Export all models from this file for convenient imports
 */

// Re-export customer types and utilities
export type {
  Customer,
  CustomerRow,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerFilters,
  CustomerStatus,
  Address,
  GeoLocation,
  ContactInfo,
} from '../types/customer';

export { rowToCustomer, customerInputToRow } from '../types/customer';

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
} from '../types/booking';

export {
  rowToBooking,
  bookingInputToRow,
  updateBookingInputToRow,
} from '../types/booking';
