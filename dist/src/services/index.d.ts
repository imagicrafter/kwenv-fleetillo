/**
 * Services barrel export
 * Export all services from this file for convenient imports
 */
export { initializeSupabase, initializeAndVerifySupabase, getSupabaseClient, getAdminSupabaseClient, verifyConnection, getConnectionStatus, isSupabaseInitialized, resetSupabaseClient, SupabaseServiceError, SupabaseErrorCodes, type ConnectionStatus, type SupabaseClient, } from './supabase.js';
export { ApiClient, apiClient, getApiClient, createApiClient, resetApiClient, type ApiClientOptions, type QueryOptions, type FilterOperator, type FilterCondition, type QueryFilter, type QueryMetrics, } from './api-client.js';
export { createClient, getClientById, getClients, updateClient, deleteClient, hardDeleteClient, restoreClient, countClients, ClientServiceError, ClientErrorCodes, } from './client.service.js';
export { createService, getServiceById, getServiceByCode, getServices, getServicesByType, updateService, deleteService, hardDeleteService, restoreService, countServices, ServiceServiceError, ServiceErrorCodes, } from './service.service.js';
export { createVehicle, getVehicleById, getVehicles, getVehiclesByServiceType, updateVehicle, updateVehicleLocation, updateVehicleStatus, deleteVehicle, hardDeleteVehicle, restoreVehicle, countVehicles, VehicleServiceError, VehicleErrorCodes, } from './vehicle.service.js';
export { createBooking, getBookingById, getBookingByNumber, getBookings, updateBooking, deleteBooking, hardDeleteBooking, restoreBooking, countBookings, BookingServiceError, BookingErrorCodes, } from './booking.service.js';
export { geocodeAddress, reverseGeocode, validateAddress, getPlaceAutocomplete, getDistanceMatrix, batchGeocodeAddresses, getAddressFromCoordinates, getCoordinatesFromAddress, GoogleMapsServiceError, GoogleMapsErrorCodes, } from './googlemaps.service.js';
export { validateAddressWithDetails, standardizeAddress, geocodeWithValidation, batchValidateAddresses, isAddressValid, getValidatedCoordinates, AddressValidationServiceError, AddressValidationErrorCodes, } from './address-validation.service.js';
export { generateOptimizedRoutes, RouteGenerationServiceError, RouteGenerationErrorCodes, type GenerateOptimizedRoutesInput, type GenerateOptimizedRoutesResponse, type BookingBatch, type OptimizedRouteBatch, } from './route-generation.service.js';
//# sourceMappingURL=index.d.ts.map