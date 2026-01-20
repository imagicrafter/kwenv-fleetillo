"use strict";
/**
 * Services barrel export
 * Export all services from this file for convenient imports
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VehicleErrorCodes = exports.VehicleServiceError = exports.countVehicles = exports.restoreVehicle = exports.hardDeleteVehicle = exports.deleteVehicle = exports.updateVehicleStatus = exports.updateVehicleLocation = exports.updateVehicle = exports.getVehiclesByServiceType = exports.getVehicles = exports.getVehicleById = exports.createVehicle = exports.ServiceErrorCodes = exports.ServiceServiceError = exports.countServices = exports.restoreService = exports.hardDeleteService = exports.deleteService = exports.updateService = exports.getServicesByType = exports.getServices = exports.getServiceByCode = exports.getServiceById = exports.createService = exports.CustomerErrorCodes = exports.CustomerServiceError = exports.countCustomers = exports.restoreCustomer = exports.hardDeleteCustomer = exports.deleteCustomer = exports.updateCustomer = exports.getCustomers = exports.getCustomerById = exports.createCustomer = exports.resetApiClient = exports.createApiClient = exports.getApiClient = exports.apiClient = exports.ApiClient = exports.SupabaseErrorCodes = exports.SupabaseServiceError = exports.resetSupabaseClient = exports.isSupabaseInitialized = exports.getConnectionStatus = exports.verifyConnection = exports.getAdminSupabaseClient = exports.getSupabaseClient = exports.initializeAndVerifySupabase = exports.initializeSupabase = void 0;
exports.RouteGenerationErrorCodes = exports.RouteGenerationServiceError = exports.generateOptimizedRoutes = exports.AddressValidationErrorCodes = exports.AddressValidationServiceError = exports.getValidatedCoordinates = exports.isAddressValid = exports.batchValidateAddresses = exports.geocodeWithValidation = exports.standardizeAddress = exports.validateAddressWithDetails = exports.GoogleMapsErrorCodes = exports.GoogleMapsServiceError = exports.getCoordinatesFromAddress = exports.getAddressFromCoordinates = exports.batchGeocodeAddresses = exports.getDistanceMatrix = exports.getPlaceAutocomplete = exports.validateAddress = exports.reverseGeocode = exports.geocodeAddress = exports.BookingErrorCodes = exports.BookingServiceError = exports.countBookings = exports.restoreBooking = exports.hardDeleteBooking = exports.deleteBooking = exports.updateBooking = exports.getBookings = exports.getBookingByNumber = exports.getBookingById = exports.createBooking = exports.DriverErrorCodes = exports.DriverServiceError = exports.getDriverVehicles = exports.unassignDriverFromVehicle = exports.assignDriverToVehicle = exports.getDriverWithVehicle = exports.countDrivers = exports.deleteDriver = exports.updateDriver = exports.getDrivers = exports.getDriverById = exports.createDriver = void 0;
// Supabase client service
var supabase_js_1 = require("./supabase.js");
Object.defineProperty(exports, "initializeSupabase", { enumerable: true, get: function () { return supabase_js_1.initializeSupabase; } });
Object.defineProperty(exports, "initializeAndVerifySupabase", { enumerable: true, get: function () { return supabase_js_1.initializeAndVerifySupabase; } });
Object.defineProperty(exports, "getSupabaseClient", { enumerable: true, get: function () { return supabase_js_1.getSupabaseClient; } });
Object.defineProperty(exports, "getAdminSupabaseClient", { enumerable: true, get: function () { return supabase_js_1.getAdminSupabaseClient; } });
Object.defineProperty(exports, "verifyConnection", { enumerable: true, get: function () { return supabase_js_1.verifyConnection; } });
Object.defineProperty(exports, "getConnectionStatus", { enumerable: true, get: function () { return supabase_js_1.getConnectionStatus; } });
Object.defineProperty(exports, "isSupabaseInitialized", { enumerable: true, get: function () { return supabase_js_1.isSupabaseInitialized; } });
Object.defineProperty(exports, "resetSupabaseClient", { enumerable: true, get: function () { return supabase_js_1.resetSupabaseClient; } });
Object.defineProperty(exports, "SupabaseServiceError", { enumerable: true, get: function () { return supabase_js_1.SupabaseServiceError; } });
Object.defineProperty(exports, "SupabaseErrorCodes", { enumerable: true, get: function () { return supabase_js_1.SupabaseErrorCodes; } });
// API client service (database operations wrapper)
var api_client_js_1 = require("./api-client.js");
Object.defineProperty(exports, "ApiClient", { enumerable: true, get: function () { return api_client_js_1.ApiClient; } });
Object.defineProperty(exports, "apiClient", { enumerable: true, get: function () { return api_client_js_1.apiClient; } });
Object.defineProperty(exports, "getApiClient", { enumerable: true, get: function () { return api_client_js_1.getApiClient; } });
Object.defineProperty(exports, "createApiClient", { enumerable: true, get: function () { return api_client_js_1.createApiClient; } });
Object.defineProperty(exports, "resetApiClient", { enumerable: true, get: function () { return api_client_js_1.resetApiClient; } });
// Customer service
var customer_service_js_1 = require("./customer.service.js");
Object.defineProperty(exports, "createCustomer", { enumerable: true, get: function () { return customer_service_js_1.createCustomer; } });
Object.defineProperty(exports, "getCustomerById", { enumerable: true, get: function () { return customer_service_js_1.getCustomerById; } });
Object.defineProperty(exports, "getCustomers", { enumerable: true, get: function () { return customer_service_js_1.getCustomers; } });
Object.defineProperty(exports, "updateCustomer", { enumerable: true, get: function () { return customer_service_js_1.updateCustomer; } });
Object.defineProperty(exports, "deleteCustomer", { enumerable: true, get: function () { return customer_service_js_1.deleteCustomer; } });
Object.defineProperty(exports, "hardDeleteCustomer", { enumerable: true, get: function () { return customer_service_js_1.hardDeleteCustomer; } });
Object.defineProperty(exports, "restoreCustomer", { enumerable: true, get: function () { return customer_service_js_1.restoreCustomer; } });
Object.defineProperty(exports, "countCustomers", { enumerable: true, get: function () { return customer_service_js_1.countCustomers; } });
Object.defineProperty(exports, "CustomerServiceError", { enumerable: true, get: function () { return customer_service_js_1.CustomerServiceError; } });
Object.defineProperty(exports, "CustomerErrorCodes", { enumerable: true, get: function () { return customer_service_js_1.CustomerErrorCodes; } });
// Service service (for service types/offerings)
var service_service_js_1 = require("./service.service.js");
Object.defineProperty(exports, "createService", { enumerable: true, get: function () { return service_service_js_1.createService; } });
Object.defineProperty(exports, "getServiceById", { enumerable: true, get: function () { return service_service_js_1.getServiceById; } });
Object.defineProperty(exports, "getServiceByCode", { enumerable: true, get: function () { return service_service_js_1.getServiceByCode; } });
Object.defineProperty(exports, "getServices", { enumerable: true, get: function () { return service_service_js_1.getServices; } });
Object.defineProperty(exports, "getServicesByType", { enumerable: true, get: function () { return service_service_js_1.getServicesByType; } });
Object.defineProperty(exports, "updateService", { enumerable: true, get: function () { return service_service_js_1.updateService; } });
Object.defineProperty(exports, "deleteService", { enumerable: true, get: function () { return service_service_js_1.deleteService; } });
Object.defineProperty(exports, "hardDeleteService", { enumerable: true, get: function () { return service_service_js_1.hardDeleteService; } });
Object.defineProperty(exports, "restoreService", { enumerable: true, get: function () { return service_service_js_1.restoreService; } });
Object.defineProperty(exports, "countServices", { enumerable: true, get: function () { return service_service_js_1.countServices; } });
Object.defineProperty(exports, "ServiceServiceError", { enumerable: true, get: function () { return service_service_js_1.ServiceServiceError; } });
Object.defineProperty(exports, "ServiceErrorCodes", { enumerable: true, get: function () { return service_service_js_1.ServiceErrorCodes; } });
// Vehicle service
var vehicle_service_js_1 = require("./vehicle.service.js");
Object.defineProperty(exports, "createVehicle", { enumerable: true, get: function () { return vehicle_service_js_1.createVehicle; } });
Object.defineProperty(exports, "getVehicleById", { enumerable: true, get: function () { return vehicle_service_js_1.getVehicleById; } });
Object.defineProperty(exports, "getVehicles", { enumerable: true, get: function () { return vehicle_service_js_1.getVehicles; } });
Object.defineProperty(exports, "getVehiclesByServiceType", { enumerable: true, get: function () { return vehicle_service_js_1.getVehiclesByServiceType; } });
Object.defineProperty(exports, "updateVehicle", { enumerable: true, get: function () { return vehicle_service_js_1.updateVehicle; } });
Object.defineProperty(exports, "updateVehicleLocation", { enumerable: true, get: function () { return vehicle_service_js_1.updateVehicleLocation; } });
Object.defineProperty(exports, "updateVehicleStatus", { enumerable: true, get: function () { return vehicle_service_js_1.updateVehicleStatus; } });
Object.defineProperty(exports, "deleteVehicle", { enumerable: true, get: function () { return vehicle_service_js_1.deleteVehicle; } });
Object.defineProperty(exports, "hardDeleteVehicle", { enumerable: true, get: function () { return vehicle_service_js_1.hardDeleteVehicle; } });
Object.defineProperty(exports, "restoreVehicle", { enumerable: true, get: function () { return vehicle_service_js_1.restoreVehicle; } });
Object.defineProperty(exports, "countVehicles", { enumerable: true, get: function () { return vehicle_service_js_1.countVehicles; } });
Object.defineProperty(exports, "VehicleServiceError", { enumerable: true, get: function () { return vehicle_service_js_1.VehicleServiceError; } });
Object.defineProperty(exports, "VehicleErrorCodes", { enumerable: true, get: function () { return vehicle_service_js_1.VehicleErrorCodes; } });
// Driver service
var driver_service_js_1 = require("./driver.service.js");
Object.defineProperty(exports, "createDriver", { enumerable: true, get: function () { return driver_service_js_1.createDriver; } });
Object.defineProperty(exports, "getDriverById", { enumerable: true, get: function () { return driver_service_js_1.getDriverById; } });
Object.defineProperty(exports, "getDrivers", { enumerable: true, get: function () { return driver_service_js_1.getDrivers; } });
Object.defineProperty(exports, "updateDriver", { enumerable: true, get: function () { return driver_service_js_1.updateDriver; } });
Object.defineProperty(exports, "deleteDriver", { enumerable: true, get: function () { return driver_service_js_1.deleteDriver; } });
Object.defineProperty(exports, "countDrivers", { enumerable: true, get: function () { return driver_service_js_1.countDrivers; } });
Object.defineProperty(exports, "getDriverWithVehicle", { enumerable: true, get: function () { return driver_service_js_1.getDriverWithVehicle; } });
Object.defineProperty(exports, "assignDriverToVehicle", { enumerable: true, get: function () { return driver_service_js_1.assignDriverToVehicle; } });
Object.defineProperty(exports, "unassignDriverFromVehicle", { enumerable: true, get: function () { return driver_service_js_1.unassignDriverFromVehicle; } });
Object.defineProperty(exports, "getDriverVehicles", { enumerable: true, get: function () { return driver_service_js_1.getDriverVehicles; } });
Object.defineProperty(exports, "DriverServiceError", { enumerable: true, get: function () { return driver_service_js_1.DriverServiceError; } });
Object.defineProperty(exports, "DriverErrorCodes", { enumerable: true, get: function () { return driver_service_js_1.DriverErrorCodes; } });
// Booking service
var booking_service_js_1 = require("./booking.service.js");
Object.defineProperty(exports, "createBooking", { enumerable: true, get: function () { return booking_service_js_1.createBooking; } });
Object.defineProperty(exports, "getBookingById", { enumerable: true, get: function () { return booking_service_js_1.getBookingById; } });
Object.defineProperty(exports, "getBookingByNumber", { enumerable: true, get: function () { return booking_service_js_1.getBookingByNumber; } });
Object.defineProperty(exports, "getBookings", { enumerable: true, get: function () { return booking_service_js_1.getBookings; } });
Object.defineProperty(exports, "updateBooking", { enumerable: true, get: function () { return booking_service_js_1.updateBooking; } });
Object.defineProperty(exports, "deleteBooking", { enumerable: true, get: function () { return booking_service_js_1.deleteBooking; } });
Object.defineProperty(exports, "hardDeleteBooking", { enumerable: true, get: function () { return booking_service_js_1.hardDeleteBooking; } });
Object.defineProperty(exports, "restoreBooking", { enumerable: true, get: function () { return booking_service_js_1.restoreBooking; } });
Object.defineProperty(exports, "countBookings", { enumerable: true, get: function () { return booking_service_js_1.countBookings; } });
Object.defineProperty(exports, "BookingServiceError", { enumerable: true, get: function () { return booking_service_js_1.BookingServiceError; } });
Object.defineProperty(exports, "BookingErrorCodes", { enumerable: true, get: function () { return booking_service_js_1.BookingErrorCodes; } });
// Google Maps service
var googlemaps_service_js_1 = require("./googlemaps.service.js");
Object.defineProperty(exports, "geocodeAddress", { enumerable: true, get: function () { return googlemaps_service_js_1.geocodeAddress; } });
Object.defineProperty(exports, "reverseGeocode", { enumerable: true, get: function () { return googlemaps_service_js_1.reverseGeocode; } });
Object.defineProperty(exports, "validateAddress", { enumerable: true, get: function () { return googlemaps_service_js_1.validateAddress; } });
Object.defineProperty(exports, "getPlaceAutocomplete", { enumerable: true, get: function () { return googlemaps_service_js_1.getPlaceAutocomplete; } });
Object.defineProperty(exports, "getDistanceMatrix", { enumerable: true, get: function () { return googlemaps_service_js_1.getDistanceMatrix; } });
Object.defineProperty(exports, "batchGeocodeAddresses", { enumerable: true, get: function () { return googlemaps_service_js_1.batchGeocodeAddresses; } });
Object.defineProperty(exports, "getAddressFromCoordinates", { enumerable: true, get: function () { return googlemaps_service_js_1.getAddressFromCoordinates; } });
Object.defineProperty(exports, "getCoordinatesFromAddress", { enumerable: true, get: function () { return googlemaps_service_js_1.getCoordinatesFromAddress; } });
Object.defineProperty(exports, "GoogleMapsServiceError", { enumerable: true, get: function () { return googlemaps_service_js_1.GoogleMapsServiceError; } });
Object.defineProperty(exports, "GoogleMapsErrorCodes", { enumerable: true, get: function () { return googlemaps_service_js_1.GoogleMapsErrorCodes; } });
// Address Validation service
var address_validation_service_js_1 = require("./address-validation.service.js");
Object.defineProperty(exports, "validateAddressWithDetails", { enumerable: true, get: function () { return address_validation_service_js_1.validateAddressWithDetails; } });
Object.defineProperty(exports, "standardizeAddress", { enumerable: true, get: function () { return address_validation_service_js_1.standardizeAddress; } });
Object.defineProperty(exports, "geocodeWithValidation", { enumerable: true, get: function () { return address_validation_service_js_1.geocodeWithValidation; } });
Object.defineProperty(exports, "batchValidateAddresses", { enumerable: true, get: function () { return address_validation_service_js_1.batchValidateAddresses; } });
Object.defineProperty(exports, "isAddressValid", { enumerable: true, get: function () { return address_validation_service_js_1.isAddressValid; } });
Object.defineProperty(exports, "getValidatedCoordinates", { enumerable: true, get: function () { return address_validation_service_js_1.getValidatedCoordinates; } });
Object.defineProperty(exports, "AddressValidationServiceError", { enumerable: true, get: function () { return address_validation_service_js_1.AddressValidationServiceError; } });
Object.defineProperty(exports, "AddressValidationErrorCodes", { enumerable: true, get: function () { return address_validation_service_js_1.AddressValidationErrorCodes; } });
// Route Generation service
var route_generation_service_js_1 = require("./route-generation.service.js");
Object.defineProperty(exports, "generateOptimizedRoutes", { enumerable: true, get: function () { return route_generation_service_js_1.generateOptimizedRoutes; } });
Object.defineProperty(exports, "RouteGenerationServiceError", { enumerable: true, get: function () { return route_generation_service_js_1.RouteGenerationServiceError; } });
Object.defineProperty(exports, "RouteGenerationErrorCodes", { enumerable: true, get: function () { return route_generation_service_js_1.RouteGenerationErrorCodes; } });
//# sourceMappingURL=index.js.map