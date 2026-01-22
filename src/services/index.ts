/**
 * Services barrel export
 * Export all services from this file for convenient imports
 */

// Supabase client service
export {
  initializeSupabase,
  initializeAndVerifySupabase,
  getSupabaseClient,
  getAdminSupabaseClient,
  verifyConnection,
  getConnectionStatus,
  isSupabaseInitialized,
  resetSupabaseClient,
  SupabaseServiceError,
  SupabaseErrorCodes,
  type ConnectionStatus,
  type SupabaseClient,
} from './supabase';

// API client service (database operations wrapper)
export {
  ApiClient,
  apiClient,
  getApiClient,
  createApiClient,
  resetApiClient,
  type ApiClientOptions,
  type QueryOptions,
  type FilterOperator,
  type FilterCondition,
  type QueryFilter,
  type QueryMetrics,
} from './api-client';

// Customer service
export {
  createCustomer,
  getCustomerById,
  getCustomers,
  updateCustomer,
  deleteCustomer,
  hardDeleteCustomer,
  restoreCustomer,
  countCustomers,
  CustomerServiceError,
  CustomerErrorCodes,
} from './customer.service';

// Service service (for service types/offerings)
export {
  createService,
  getServiceById,
  getServiceByCode,
  getServices,
  getServicesByType,
  updateService,
  deleteService,
  hardDeleteService,
  restoreService,
  countServices,
  ServiceServiceError,
  ServiceErrorCodes,
} from './service.service';

// Vehicle service
export {
  createVehicle,
  getVehicleById,
  getVehicles,
  getVehiclesByServiceType,
  updateVehicle,
  updateVehicleLocation,
  updateVehicleStatus,
  deleteVehicle,
  hardDeleteVehicle,
  restoreVehicle,
  countVehicles,
  VehicleServiceError,
  VehicleErrorCodes,
} from './vehicle.service';

// Driver service
export {
  createDriver,
  getDriverById,
  getDrivers,
  updateDriver,
  deleteDriver,
  countDrivers,
  getDriverWithVehicle,
  assignDriverToVehicle,
  unassignDriverFromVehicle,
  getDriverVehicles,
  DriverServiceError,
  DriverErrorCodes,
} from './driver.service';

// Booking service
export {
  createBooking,
  getBookingById,
  getBookingByNumber,
  getBookings,
  updateBooking,
  deleteBooking,
  hardDeleteBooking,
  restoreBooking,
  countBookings,
  BookingServiceError,
  BookingErrorCodes,
} from './booking.service';

// Google Maps service
export {
  geocodeAddress,
  reverseGeocode,
  validateAddress,
  getPlaceAutocomplete,
  getDistanceMatrix,
  batchGeocodeAddresses,
  getAddressFromCoordinates,
  getCoordinatesFromAddress,
  GoogleMapsServiceError,
  GoogleMapsErrorCodes,
} from './googlemaps.service';

// Address Validation service
export {
  validateAddressWithDetails,
  standardizeAddress,
  geocodeWithValidation,
  batchValidateAddresses,
  isAddressValid,
  getValidatedCoordinates,
  AddressValidationServiceError,
  AddressValidationErrorCodes,
} from './address-validation.service';

// Route Generation service
export {
  generateOptimizedRoutes,
  RouteGenerationServiceError,
  RouteGenerationErrorCodes,
  type GenerateOptimizedRoutesInput,
  type GenerateOptimizedRoutesResponse,
  type BookingBatch,
  type OptimizedRouteBatch,
} from './route-generation.service';
