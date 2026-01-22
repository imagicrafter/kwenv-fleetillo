/**
 * Demo Data Loader Script
 *
 * Populates the database with realistic demo data for testing and demonstration purposes.
 * Uses @faker-js/faker for generating realistic data.
 *
 * By default, this script clears existing demo data before seeding to ensure idempotent behavior.
 *
 * Usage:
 *   npm run seed:demo                                # Default: medium size (15 customers, 75 bookings, 6 cities)
 *   npm run seed:demo -- --size=small                # Small: 5 customers, 25 bookings, 3 cities
 *   npm run seed:demo -- --size=large                # Large: 30 customers, 150 bookings, all cities
 *   npm run seed:demo -- --no-clear                  # Skip clearing existing demo data (adds to existing data)
 *   npm run seed:demo -- --locations-per-customer=10-15  # Override locations per customer (min-max)
 *   npm run seed:demo -- --depots-per-city=1         # Limit depot sites per city
 *   npm run seed:demo -- --max-cities=6              # Limit to 6 cities (concentrates data for better route testing)
 *   npm run seed:demo -- --validate-routes           # Create test route to validate data, then delete it
 *
 * Examples:
 *   npm run seed:demo -- --size=medium --max-cities=6 --locations-per-customer=10-15
 *   npm run seed:demo -- --no-clear --size=large --max-cities=8 --locations-per-customer=8-12
 *   npm run seed:demo -- --size=small --max-cities=3 --validate-routes  # Seed data and validate route creation works
 *
 * Run with: npm run seed:demo
 */

import 'dotenv/config';
import { faker } from '@faker-js/faker';
import { initializeSupabase, getAdminSupabaseClient } from '../services/supabase';
import { createCustomer } from '../services/customer.service';
import { createLocation } from '../services/location.service';
import { createService } from '../services/service.service';
import { createVehicle } from '../services/vehicle.service';
import { setVehicleLocations } from '../services/vehicle-location.service';
import { createDriver, assignDriverToVehicle } from '../services/driver.service';
import { createBooking } from '../services/booking.service';
import { createRoute } from '../services/route.service';
import type { CreateCustomerInput } from '../types/customer';
import type { CreateLocationInput } from '../services/location.service';
import type { CreateServiceInput } from '../types/service';
import type { CreateVehicleInput, FuelType } from '../types/vehicle';
import type { CreateDriverInput } from '../types/driver';
import type { CreateBookingInput, BookingServiceItem } from '../types/booking';
import type { CreateRouteInput } from '../types/route';

// ============================================================================
// Configuration
// ============================================================================

type DataSize = 'small' | 'medium' | 'large';

interface SizeConfig {
  customers: number;
  locationsPerCustomer: { min: number; max: number };
  depotsPerCity: number | null; // null means no limit
  maxCities: number | null; // null means no limit (use all available cities)
  services: number;
  vehicles: number;
  drivers: number;
  bookings: number;
  routes: number;
}

const SIZE_CONFIGS: Record<DataSize, SizeConfig> = {
  small: {
    customers: 5,
    locationsPerCustomer: { min: 3, max: 5 },
    depotsPerCity: 1,
    maxCities: 3, // Limit to 3 cities for small dataset
    services: 5,
    vehicles: 3,
    drivers: 3,
    bookings: 25,
    routes: 3,
  },
  medium: {
    customers: 15,
    locationsPerCustomer: { min: 8, max: 12 },
    depotsPerCity: 1,
    maxCities: 6, // Limit to 6 cities for medium dataset
    services: 8,
    vehicles: 5,
    drivers: 5,
    bookings: 75,
    routes: 7,
  },
  large: {
    customers: 30,
    locationsPerCustomer: { min: 10, max: 15 },
    depotsPerCity: 2,
    maxCities: null, // No limit for large dataset (use all available cities)
    services: 10,
    vehicles: 8,
    drivers: 8,
    bookings: 150,
    routes: 12,
  },
};

// Demo data marker for idempotency
const DEMO_TAG = 'demo-data';

// Real Texas commercial addresses for realistic geolocation data
// These are actual routable addresses that work with Google Routes API
const REAL_TEXAS_ADDRESSES = [
  // Houston - Stadiums & Event Venues
  { addressLine1: '1 NRG Pkwy', city: 'Houston', state: 'TX', postalCode: '77054', lat: 29.6847, lng: -95.4107, type: 'event' },
  { addressLine1: '1510 Polk St', city: 'Houston', state: 'TX', postalCode: '77002', lat: 29.7509, lng: -95.3621, type: 'event' },
  { addressLine1: '1001 Avenida de las Americas', city: 'Houston', state: 'TX', postalCode: '77010', lat: 29.7522, lng: -95.3571, type: 'event' },
  { addressLine1: '501 Crawford St', city: 'Houston', state: 'TX', postalCode: '77002', lat: 29.7573, lng: -95.3555, type: 'event' },
  // Houston - Shopping & Commercial
  { addressLine1: '5085 Westheimer Rd', city: 'Houston', state: 'TX', postalCode: '77056', lat: 29.7400, lng: -95.4621, type: 'commercial' },
  { addressLine1: '8400 Westheimer Rd', city: 'Houston', state: 'TX', postalCode: '77063', lat: 29.7371, lng: -95.5089, type: 'commercial' },
  { addressLine1: '7925 Westheimer Rd', city: 'Houston', state: 'TX', postalCode: '77063', lat: 29.7386, lng: -95.4997, type: 'commercial' },
  { addressLine1: '2131 Westheimer Rd', city: 'Houston', state: 'TX', postalCode: '77098', lat: 29.7430, lng: -95.4058, type: 'commercial' },
  { addressLine1: '9401 Katy Fwy', city: 'Houston', state: 'TX', postalCode: '77024', lat: 29.7830, lng: -95.5430, type: 'commercial' },
  { addressLine1: '12300 North Fwy', city: 'Houston', state: 'TX', postalCode: '77060', lat: 29.9194, lng: -95.4178, type: 'commercial' },
  // Houston - Additional Commercial & Industrial
  { addressLine1: '1200 Smith St', city: 'Houston', state: 'TX', postalCode: '77002', lat: 29.7518, lng: -95.3617, type: 'commercial' },
  { addressLine1: '2525 W Loop S', city: 'Houston', state: 'TX', postalCode: '77027', lat: 29.7357, lng: -95.4646, type: 'commercial' },
  { addressLine1: '5718 Westheimer Rd', city: 'Houston', state: 'TX', postalCode: '77057', lat: 29.7391, lng: -95.4715, type: 'commercial' },
  { addressLine1: '10001 Westheimer Rd', city: 'Houston', state: 'TX', postalCode: '77042', lat: 29.7351, lng: -95.5447, type: 'commercial' },
  { addressLine1: '4444 Westheimer Rd', city: 'Houston', state: 'TX', postalCode: '77027', lat: 29.7406, lng: -95.4528, type: 'commercial' },
  { addressLine1: '1919 Briarpark Dr', city: 'Houston', state: 'TX', postalCode: '77042', lat: 29.7444, lng: -95.5589, type: 'commercial' },
  { addressLine1: '3131 W Alabama St', city: 'Houston', state: 'TX', postalCode: '77098', lat: 29.7392, lng: -95.4228, type: 'commercial' },
  { addressLine1: '6565 W Loop S', city: 'Houston', state: 'TX', postalCode: '77401', lat: 29.7167, lng: -95.4608, type: 'commercial' },
  { addressLine1: '10777 Westheimer Rd', city: 'Houston', state: 'TX', postalCode: '77042', lat: 29.7338, lng: -95.5609, type: 'commercial' },
  { addressLine1: '5300 Memorial Dr', city: 'Houston', state: 'TX', postalCode: '77007', lat: 29.7694, lng: -95.4331, type: 'commercial' },
  // Houston - Industrial & Construction
  { addressLine1: '6900 N Eldridge Pkwy', city: 'Houston', state: 'TX', postalCode: '77041', lat: 29.8752, lng: -95.5949, type: 'construction' },
  { addressLine1: '11211 Katy Fwy', city: 'Houston', state: 'TX', postalCode: '77079', lat: 29.7837, lng: -95.5741, type: 'construction' },
  { addressLine1: '8500 Cypress Creek Pkwy', city: 'Houston', state: 'TX', postalCode: '77070', lat: 29.9619, lng: -95.5181, type: 'construction' },
  { addressLine1: '15350 Vickery Dr', city: 'Houston', state: 'TX', postalCode: '77032', lat: 29.9822, lng: -95.3428, type: 'construction' },
  { addressLine1: '2700 Greens Rd', city: 'Houston', state: 'TX', postalCode: '77032', lat: 29.9619, lng: -95.3773, type: 'construction' },
  // Houston - Depot Sites (Industrial Parks)
  { addressLine1: '5900 N Sam Houston Pkwy E', city: 'Houston', state: 'TX', postalCode: '77032', lat: 29.9667, lng: -95.3389, type: 'depot' },
  { addressLine1: '15500 John F Kennedy Blvd', city: 'Houston', state: 'TX', postalCode: '77032', lat: 29.9928, lng: -95.3350, type: 'depot' },

  // Dallas - Stadiums & Event Venues
  { addressLine1: '2500 Victory Ave', city: 'Dallas', state: 'TX', postalCode: '75219', lat: 32.7905, lng: -96.8103, type: 'event' },
  { addressLine1: '650 S Griffin St', city: 'Dallas', state: 'TX', postalCode: '75202', lat: 32.7750, lng: -96.8009, type: 'event' },
  // Dallas - Shopping & Commercial
  { addressLine1: '8687 N Central Expy', city: 'Dallas', state: 'TX', postalCode: '75225', lat: 32.8695, lng: -96.7736, type: 'commercial' },
  { addressLine1: '13350 Dallas Pkwy', city: 'Dallas', state: 'TX', postalCode: '75240', lat: 32.9340, lng: -96.8208, type: 'commercial' },
  { addressLine1: '11920 Inwood Rd', city: 'Dallas', state: 'TX', postalCode: '75244', lat: 32.9112, lng: -96.8334, type: 'commercial' },
  { addressLine1: '3030 Mockingbird Ln', city: 'Dallas', state: 'TX', postalCode: '75205', lat: 32.8378, lng: -96.7821, type: 'commercial' },
  { addressLine1: '400 N Olive St', city: 'Dallas', state: 'TX', postalCode: '75201', lat: 32.7875, lng: -96.8005, type: 'commercial' },
  // Dallas - Additional Commercial
  { addressLine1: '2100 Ross Ave', city: 'Dallas', state: 'TX', postalCode: '75201', lat: 32.7891, lng: -96.7958, type: 'commercial' },
  { addressLine1: '1601 Elm St', city: 'Dallas', state: 'TX', postalCode: '75201', lat: 32.7825, lng: -96.7997, type: 'commercial' },
  { addressLine1: '500 S Ervay St', city: 'Dallas', state: 'TX', postalCode: '75201', lat: 32.7797, lng: -96.7971, type: 'commercial' },
  { addressLine1: '5050 Quorum Dr', city: 'Dallas', state: 'TX', postalCode: '75254', lat: 32.9342, lng: -96.8208, type: 'commercial' },
  { addressLine1: '17300 Dallas Pkwy', city: 'Dallas', state: 'TX', postalCode: '75248', lat: 32.9654, lng: -96.8222, type: 'commercial' },
  { addressLine1: '18111 Preston Rd', city: 'Dallas', state: 'TX', postalCode: '75252', lat: 32.9814, lng: -96.8003, type: 'commercial' },
  { addressLine1: '14850 Quorum Dr', city: 'Dallas', state: 'TX', postalCode: '75254', lat: 32.9558, lng: -96.8172, type: 'commercial' },
  { addressLine1: '2828 N Haskell Ave', city: 'Dallas', state: 'TX', postalCode: '75204', lat: 32.8017, lng: -96.7822, type: 'commercial' },
  { addressLine1: '4100 Harry Hines Blvd', city: 'Dallas', state: 'TX', postalCode: '75219', lat: 32.8067, lng: -96.8297, type: 'commercial' },
  { addressLine1: '6300 N Central Expy', city: 'Dallas', state: 'TX', postalCode: '75206', lat: 32.8442, lng: -96.7728, type: 'commercial' },
  // Dallas - Industrial & Construction
  { addressLine1: '8350 N Stemmons Fwy', city: 'Dallas', state: 'TX', postalCode: '75247', lat: 32.8517, lng: -96.8779, type: 'construction' },
  { addressLine1: '1999 Bryan St', city: 'Dallas', state: 'TX', postalCode: '75201', lat: 32.7897, lng: -96.7908, type: 'construction' },
  { addressLine1: '2301 N Field St', city: 'Dallas', state: 'TX', postalCode: '75201', lat: 32.7917, lng: -96.8089, type: 'construction' },
  // Dallas - Depot Sites
  { addressLine1: '4545 Royal Ln', city: 'Dallas', state: 'TX', postalCode: '75229', lat: 32.8833, lng: -96.8711, type: 'depot' },
  { addressLine1: '10515 Miller Rd', city: 'Dallas', state: 'TX', postalCode: '75238', lat: 32.8553, lng: -96.6931, type: 'depot' },

  // Arlington - AT&T Stadium
  { addressLine1: '1 AT&T Way', city: 'Arlington', state: 'TX', postalCode: '76011', lat: 32.7473, lng: -97.0945, type: 'event' },
  { addressLine1: '1000 Ballpark Way', city: 'Arlington', state: 'TX', postalCode: '76011', lat: 32.7512, lng: -97.0832, type: 'event' },
  { addressLine1: '3811 S Cooper St', city: 'Arlington', state: 'TX', postalCode: '76015', lat: 32.6927, lng: -97.1234, type: 'commercial' },
  // Arlington - Additional
  { addressLine1: '401 E Abram St', city: 'Arlington', state: 'TX', postalCode: '76010', lat: 32.7359, lng: -97.1073, type: 'commercial' },
  { addressLine1: '2701 E Lamar Blvd', city: 'Arlington', state: 'TX', postalCode: '76006', lat: 32.7547, lng: -97.0711, type: 'commercial' },
  { addressLine1: '4200 S Cooper St', city: 'Arlington', state: 'TX', postalCode: '76015', lat: 32.6831, lng: -97.1236, type: 'commercial' },
  { addressLine1: '700 Six Flags Dr', city: 'Arlington', state: 'TX', postalCode: '76011', lat: 32.7563, lng: -97.0781, type: 'event' },
  { addressLine1: '5000 S Cooper St', city: 'Arlington', state: 'TX', postalCode: '76017', lat: 32.6678, lng: -97.1233, type: 'commercial' },
  // Arlington - Depot
  { addressLine1: '1901 E Randol Mill Rd', city: 'Arlington', state: 'TX', postalCode: '76011', lat: 32.7639, lng: -97.0831, type: 'depot' },

  // Austin - Venues & Commercial
  { addressLine1: '500 E Cesar Chavez St', city: 'Austin', state: 'TX', postalCode: '78701', lat: 30.2634, lng: -97.7395, type: 'event' },
  { addressLine1: '9201 Circuit of the Americas Blvd', city: 'Austin', state: 'TX', postalCode: '78617', lat: 30.1346, lng: -97.6358, type: 'event' },
  { addressLine1: '2139 San Jacinto Blvd', city: 'Austin', state: 'TX', postalCode: '78712', lat: 30.2836, lng: -97.7326, type: 'event' },
  { addressLine1: '11410 Century Oaks Ter', city: 'Austin', state: 'TX', postalCode: '78758', lat: 30.4021, lng: -97.7254, type: 'commercial' },
  { addressLine1: '10000 Research Blvd', city: 'Austin', state: 'TX', postalCode: '78759', lat: 30.3916, lng: -97.7457, type: 'commercial' },
  { addressLine1: '9500 S IH 35', city: 'Austin', state: 'TX', postalCode: '78748', lat: 30.1675, lng: -97.7909, type: 'commercial' },
  { addressLine1: '2901 S Capital of Texas Hwy', city: 'Austin', state: 'TX', postalCode: '78746', lat: 30.2594, lng: -97.8254, type: 'commercial' },
  // Austin - Additional Commercial
  { addressLine1: '301 Congress Ave', city: 'Austin', state: 'TX', postalCode: '78701', lat: 30.2669, lng: -97.7428, type: 'commercial' },
  { addressLine1: '600 Congress Ave', city: 'Austin', state: 'TX', postalCode: '78701', lat: 30.2697, lng: -97.7428, type: 'commercial' },
  { addressLine1: '1300 E 6th St', city: 'Austin', state: 'TX', postalCode: '78702', lat: 30.2640, lng: -97.7282, type: 'commercial' },
  { addressLine1: '2525 W Anderson Ln', city: 'Austin', state: 'TX', postalCode: '78757', lat: 30.3589, lng: -97.7378, type: 'commercial' },
  { addressLine1: '5501 N Lamar Blvd', city: 'Austin', state: 'TX', postalCode: '78751', lat: 30.3269, lng: -97.7297, type: 'commercial' },
  { addressLine1: '4001 N Lamar Blvd', city: 'Austin', state: 'TX', postalCode: '78756', lat: 30.3083, lng: -97.7422, type: 'commercial' },
  { addressLine1: '6301 W Parmer Ln', city: 'Austin', state: 'TX', postalCode: '78729', lat: 30.4194, lng: -97.7608, type: 'commercial' },
  { addressLine1: '12901 N Mopac Expy', city: 'Austin', state: 'TX', postalCode: '78727', lat: 30.4322, lng: -97.7197, type: 'commercial' },
  { addressLine1: '3300 Bee Caves Rd', city: 'Austin', state: 'TX', postalCode: '78746', lat: 30.2797, lng: -97.8011, type: 'commercial' },
  { addressLine1: '7701 N Lamar Blvd', city: 'Austin', state: 'TX', postalCode: '78752', lat: 30.3486, lng: -97.7169, type: 'commercial' },
  // Austin - Industrial & Construction
  { addressLine1: '4001 S Lamar Blvd', city: 'Austin', state: 'TX', postalCode: '78704', lat: 30.2338, lng: -97.7726, type: 'construction' },
  { addressLine1: '6500 River Place Blvd', city: 'Austin', state: 'TX', postalCode: '78730', lat: 30.3706, lng: -97.8269, type: 'construction' },
  { addressLine1: '12345 Research Blvd', city: 'Austin', state: 'TX', postalCode: '78759', lat: 30.4175, lng: -97.7542, type: 'construction' },
  // Austin - Depot Sites
  { addressLine1: '6001 Ed Bluestein Blvd', city: 'Austin', state: 'TX', postalCode: '78723', lat: 30.2831, lng: -97.6753, type: 'depot' },
  { addressLine1: '8700 Shoal Creek Blvd', city: 'Austin', state: 'TX', postalCode: '78757', lat: 30.3694, lng: -97.7406, type: 'depot' },

  // San Antonio - Venues & Commercial
  { addressLine1: '100 Montana St', city: 'San Antonio', state: 'TX', postalCode: '78203', lat: 29.4167, lng: -98.4780, type: 'event' },
  { addressLine1: '1 Frost Bank Center Dr', city: 'San Antonio', state: 'TX', postalCode: '78219', lat: 29.4270, lng: -98.4375, type: 'event' },
  { addressLine1: '900 E Market St', city: 'San Antonio', state: 'TX', postalCode: '78205', lat: 29.4218, lng: -98.4853, type: 'event' },
  { addressLine1: '15900 La Cantera Pkwy', city: 'San Antonio', state: 'TX', postalCode: '78256', lat: 29.6075, lng: -98.6170, type: 'commercial' },
  { addressLine1: '255 E Basse Rd', city: 'San Antonio', state: 'TX', postalCode: '78209', lat: 29.4861, lng: -98.4648, type: 'commercial' },
  { addressLine1: '7400 San Pedro Ave', city: 'San Antonio', state: 'TX', postalCode: '78216', lat: 29.5186, lng: -98.4858, type: 'commercial' },
  { addressLine1: '849 E Commerce St', city: 'San Antonio', state: 'TX', postalCode: '78205', lat: 29.4254, lng: -98.4858, type: 'commercial' },
  // San Antonio - Additional Commercial
  { addressLine1: '321 W Commerce St', city: 'San Antonio', state: 'TX', postalCode: '78205', lat: 29.4236, lng: -98.4953, type: 'commercial' },
  { addressLine1: '200 E Houston St', city: 'San Antonio', state: 'TX', postalCode: '78205', lat: 29.4243, lng: -98.4897, type: 'commercial' },
  { addressLine1: '4522 Fredericksburg Rd', city: 'San Antonio', state: 'TX', postalCode: '78201', lat: 29.4650, lng: -98.5247, type: 'commercial' },
  { addressLine1: '6301 NW Loop 410', city: 'San Antonio', state: 'TX', postalCode: '78238', lat: 29.5089, lng: -98.5864, type: 'commercial' },
  { addressLine1: '8103 Broadway', city: 'San Antonio', state: 'TX', postalCode: '78209', lat: 29.4928, lng: -98.4658, type: 'commercial' },
  { addressLine1: '11745 IH 10 W', city: 'San Antonio', state: 'TX', postalCode: '78230', lat: 29.5428, lng: -98.6003, type: 'commercial' },
  { addressLine1: '5511 NW Loop 410', city: 'San Antonio', state: 'TX', postalCode: '78238', lat: 29.5022, lng: -98.5700, type: 'commercial' },
  { addressLine1: '999 E Basse Rd', city: 'San Antonio', state: 'TX', postalCode: '78209', lat: 29.4847, lng: -98.4589, type: 'commercial' },
  { addressLine1: '12651 Vance Jackson Rd', city: 'San Antonio', state: 'TX', postalCode: '78230', lat: 29.5578, lng: -98.5842, type: 'commercial' },
  { addressLine1: '2310 NW Military Hwy', city: 'San Antonio', state: 'TX', postalCode: '78213', lat: 29.5122, lng: -98.5247, type: 'commercial' },
  // San Antonio - Industrial & Construction
  { addressLine1: '1800 Wurzbach Rd', city: 'San Antonio', state: 'TX', postalCode: '78209', lat: 29.4836, lng: -98.4894, type: 'construction' },
  { addressLine1: '111 Soledad St', city: 'San Antonio', state: 'TX', postalCode: '78205', lat: 29.4264, lng: -98.4917, type: 'construction' },
  // San Antonio - Depot Sites
  { addressLine1: '9800 Fredericksburg Rd', city: 'San Antonio', state: 'TX', postalCode: '78240', lat: 29.5375, lng: -98.5781, type: 'depot' },
  { addressLine1: '3500 Pan Am Expy', city: 'San Antonio', state: 'TX', postalCode: '78219', lat: 29.4197, lng: -98.4164, type: 'depot' },

  // Fort Worth - Venues & Commercial
  { addressLine1: '1911 Montgomery St', city: 'Fort Worth', state: 'TX', postalCode: '76107', lat: 32.7483, lng: -97.3564, type: 'event' },
  { addressLine1: '3401 W Lancaster Ave', city: 'Fort Worth', state: 'TX', postalCode: '76107', lat: 32.7424, lng: -97.3655, type: 'commercial' },
  { addressLine1: '4800 S Hulen St', city: 'Fort Worth', state: 'TX', postalCode: '76132', lat: 32.6858, lng: -97.3982, type: 'commercial' },
  { addressLine1: '500 Terminal Rd', city: 'Fort Worth', state: 'TX', postalCode: '76106', lat: 32.7992, lng: -97.3428, type: 'construction' },
  { addressLine1: '1401 Meacham Blvd', city: 'Fort Worth', state: 'TX', postalCode: '76106', lat: 32.8229, lng: -97.3508, type: 'construction' },
  // Fort Worth - Additional Commercial
  { addressLine1: '500 Throckmorton St', city: 'Fort Worth', state: 'TX', postalCode: '76102', lat: 32.7558, lng: -97.3311, type: 'commercial' },
  { addressLine1: '201 Main St', city: 'Fort Worth', state: 'TX', postalCode: '76102', lat: 32.7547, lng: -97.3330, type: 'commercial' },
  { addressLine1: '300 Houston St', city: 'Fort Worth', state: 'TX', postalCode: '76102', lat: 32.7564, lng: -97.3297, type: 'commercial' },
  { addressLine1: '4200 South Fwy', city: 'Fort Worth', state: 'TX', postalCode: '76115', lat: 32.7008, lng: -97.3283, type: 'commercial' },
  { addressLine1: '6000 N Tarrant Pkwy', city: 'Fort Worth', state: 'TX', postalCode: '76137', lat: 32.8756, lng: -97.2700, type: 'commercial' },
  { addressLine1: '5601 Bridge St', city: 'Fort Worth', state: 'TX', postalCode: '76112', lat: 32.7664, lng: -97.2419, type: 'commercial' },
  { addressLine1: '2600 W 7th St', city: 'Fort Worth', state: 'TX', postalCode: '76107', lat: 32.7503, lng: -97.3533, type: 'commercial' },
  { addressLine1: '3000 S Hulen St', city: 'Fort Worth', state: 'TX', postalCode: '76109', lat: 32.7136, lng: -97.3981, type: 'commercial' },
  // Fort Worth - Depot Sites
  { addressLine1: '4900 Alliance Gateway Fwy', city: 'Fort Worth', state: 'TX', postalCode: '76177', lat: 32.9622, lng: -97.3106, type: 'depot' },
  { addressLine1: '2001 Brennan Ave', city: 'Fort Worth', state: 'TX', postalCode: '76106', lat: 32.7947, lng: -97.3544, type: 'depot' },

  // Plano - Commercial
  { addressLine1: '6121 W Park Blvd', city: 'Plano', state: 'TX', postalCode: '75093', lat: 33.0317, lng: -96.7689, type: 'commercial' },
  { addressLine1: '2301 N Central Expy', city: 'Plano', state: 'TX', postalCode: '75075', lat: 33.0216, lng: -96.7134, type: 'commercial' },
  { addressLine1: '1100 Central Expy S', city: 'Plano', state: 'TX', postalCode: '75074', lat: 33.0089, lng: -96.6998, type: 'commercial' },
  // Plano - Additional
  { addressLine1: '8000 Coit Rd', city: 'Plano', state: 'TX', postalCode: '75025', lat: 33.0678, lng: -96.7700, type: 'commercial' },
  { addressLine1: '5800 Legacy Dr', city: 'Plano', state: 'TX', postalCode: '75024', lat: 33.0747, lng: -96.8194, type: 'commercial' },
  { addressLine1: '7300 Lone Star Dr', city: 'Plano', state: 'TX', postalCode: '75024', lat: 33.0642, lng: -96.8017, type: 'commercial' },
  { addressLine1: '3100 Independence Pkwy', city: 'Plano', state: 'TX', postalCode: '75075', lat: 33.0314, lng: -96.7489, type: 'commercial' },
  { addressLine1: '601 Preston Rd', city: 'Plano', state: 'TX', postalCode: '75093', lat: 33.0122, lng: -96.8047, type: 'commercial' },
  // Plano - Depot
  { addressLine1: '2200 E Spring Creek Pkwy', city: 'Plano', state: 'TX', postalCode: '75074', lat: 33.0494, lng: -96.6828, type: 'depot' },

  // Irving - Additional City
  { addressLine1: '3333 W Airport Fwy', city: 'Irving', state: 'TX', postalCode: '75062', lat: 32.8403, lng: -96.9878, type: 'commercial' },
  { addressLine1: '545 E John Carpenter Fwy', city: 'Irving', state: 'TX', postalCode: '75062', lat: 32.8783, lng: -96.9489, type: 'commercial' },
  { addressLine1: '6330 N State Hwy 161', city: 'Irving', state: 'TX', postalCode: '75038', lat: 32.8897, lng: -96.9686, type: 'commercial' },
  { addressLine1: '7800 N Macarthur Blvd', city: 'Irving', state: 'TX', postalCode: '75063', lat: 32.9172, lng: -96.9608, type: 'commercial' },
  { addressLine1: '8201 Esters Blvd', city: 'Irving', state: 'TX', postalCode: '75063', lat: 32.9008, lng: -97.0139, type: 'commercial' },
  { addressLine1: '2700 Las Colinas Blvd', city: 'Irving', state: 'TX', postalCode: '75039', lat: 32.8822, lng: -96.9539, type: 'commercial' },
  // Irving - Depot
  { addressLine1: '4800 W John Carpenter Fwy', city: 'Irving', state: 'TX', postalCode: '75063', lat: 32.8775, lng: -97.0114, type: 'depot' },

  // Carrollton - Additional City
  { addressLine1: '1625 W Crosby Rd', city: 'Carrollton', state: 'TX', postalCode: '75006', lat: 32.9724, lng: -96.9203, type: 'construction' },
  { addressLine1: '2100 E Trinity Mills Rd', city: 'Carrollton', state: 'TX', postalCode: '75006', lat: 32.9967, lng: -96.8878, type: 'commercial' },
  { addressLine1: '4220 E Hebron Pkwy', city: 'Carrollton', state: 'TX', postalCode: '75010', lat: 33.0222, lng: -96.8808, type: 'commercial' },
  { addressLine1: '1805 S Broadway St', city: 'Carrollton', state: 'TX', postalCode: '75006', lat: 32.9436, lng: -96.8917, type: 'commercial' },
  // Carrollton - Depot
  { addressLine1: '1500 Luna Rd', city: 'Carrollton', state: 'TX', postalCode: '75006', lat: 32.9781, lng: -96.9261, type: 'depot' },

  // Frisco - Additional City
  { addressLine1: '6755 Toyota Stadium Dr', city: 'Frisco', state: 'TX', postalCode: '75034', lat: 33.1547, lng: -96.8339, type: 'event' },
  { addressLine1: '2601 Preston Rd', city: 'Frisco', state: 'TX', postalCode: '75034', lat: 33.1314, lng: -96.8089, type: 'commercial' },
  { addressLine1: '8980 TX-121', city: 'Frisco', state: 'TX', postalCode: '75034', lat: 33.1317, lng: -96.7864, type: 'commercial' },
  { addressLine1: '3211 Cowboys Way', city: 'Frisco', state: 'TX', postalCode: '75034', lat: 33.0992, lng: -96.8342, type: 'event' },
  { addressLine1: '5355 Dallas Pkwy', city: 'Frisco', state: 'TX', postalCode: '75034', lat: 33.0953, lng: -96.8206, type: 'commercial' },
  // Frisco - Depot
  { addressLine1: '7600 John Q Hammons Dr', city: 'Frisco', state: 'TX', postalCode: '75034', lat: 33.1469, lng: -96.8175, type: 'depot' },

  // Round Rock - Additional City (Austin metro)
  { addressLine1: '2800 S IH 35', city: 'Round Rock', state: 'TX', postalCode: '78681', lat: 30.5214, lng: -97.6650, type: 'commercial' },
  { addressLine1: '2400 S IH 35', city: 'Round Rock', state: 'TX', postalCode: '78681', lat: 30.5158, lng: -97.6650, type: 'commercial' },
  { addressLine1: '4401 N IH 35', city: 'Round Rock', state: 'TX', postalCode: '78681', lat: 30.5461, lng: -97.6706, type: 'commercial' },
  { addressLine1: '2601 S IH 35', city: 'Round Rock', state: 'TX', postalCode: '78681', lat: 30.5181, lng: -97.6653, type: 'commercial' },
  { addressLine1: '110 N IH 35', city: 'Round Rock', state: 'TX', postalCode: '78681', lat: 30.5089, lng: -97.6792, type: 'commercial' },
  // Round Rock - Depot
  { addressLine1: '3350 Sunrise Rd', city: 'Round Rock', state: 'TX', postalCode: '78665', lat: 30.5633, lng: -97.6436, type: 'depot' },
];

// Service types for a portable sanitation / fleet service company
const SERVICE_DEFINITIONS = [
  {
    name: 'Routine Full Pump-Out & Clean',
    code: 'PUMP-FULL',
    type: 'maintenance',
    duration: 45,
    price: 150,
    description: 'Complete pump-out and interior cleaning of portable restroom unit',
  },
  {
    name: 'Pump-Out Only (Partial Clean)',
    code: 'PUMP-PART',
    type: 'maintenance',
    duration: 25,
    price: 85,
    description: 'Quick pump-out service without full interior cleaning',
  },
  {
    name: 'Emergency Service Call',
    code: 'EMERGENCY',
    type: 'repair',
    duration: 60,
    price: 250,
    description: 'Priority emergency response for urgent issues',
  },
  {
    name: 'Unit Delivery',
    code: 'DELIVERY',
    type: 'installation',
    duration: 30,
    price: 125,
    description: 'Delivery and setup of new portable restroom unit',
  },
  {
    name: 'Unit Pickup',
    code: 'PICKUP',
    type: 'installation',
    duration: 20,
    price: 75,
    description: 'Pickup and removal of portable restroom unit',
  },
  {
    name: 'Deep Cleaning Service',
    code: 'DEEP-CLEAN',
    type: 'maintenance',
    duration: 90,
    price: 275,
    description: 'Thorough deep cleaning and sanitization of unit',
  },
  {
    name: 'Damage Assessment',
    code: 'INSPECT',
    type: 'inspection',
    duration: 30,
    price: 50,
    description: 'On-site inspection and damage assessment',
  },
  {
    name: 'Repair Service',
    code: 'REPAIR',
    type: 'repair',
    duration: 60,
    price: 175,
    description: 'On-site repair of damaged or malfunctioning unit',
  },
  {
    name: 'Restocking Supplies',
    code: 'RESTOCK',
    type: 'maintenance',
    duration: 15,
    price: 40,
    description: 'Refill toilet paper, hand sanitizer, and other supplies',
  },
  {
    name: 'Site Consultation',
    code: 'CONSULT',
    type: 'consultation',
    duration: 45,
    price: 0,
    description: 'On-site consultation for event planning or long-term placement',
  },
];

// Vehicle types for fleet
const VEHICLE_SPECS = [
  { make: 'Ford', model: 'F-450 Service Truck', year: 2022, fuelType: 'diesel' as FuelType, capacity: 1500 },
  { make: 'Freightliner', model: 'M2 106 Pumper', year: 2021, fuelType: 'diesel' as FuelType, capacity: 2500 },
  { make: 'Isuzu', model: 'NPR HD', year: 2023, fuelType: 'diesel' as FuelType, capacity: 1200 },
  { make: 'Peterbilt', model: '337 Vacuum Truck', year: 2020, fuelType: 'diesel' as FuelType, capacity: 3000 },
  { make: 'Kenworth', model: 'T270 Service', year: 2022, fuelType: 'diesel' as FuelType, capacity: 1800 },
  { make: 'Hino', model: '268A', year: 2021, fuelType: 'diesel' as FuelType, capacity: 1400 },
  { make: 'International', model: 'CV515', year: 2023, fuelType: 'diesel' as FuelType, capacity: 1600 },
  { make: 'Ram', model: '5500 Chassis', year: 2022, fuelType: 'diesel' as FuelType, capacity: 1100 },
];

// ============================================================================
// Helper Functions
// ============================================================================

interface ParsedArgs {
  size: DataSize;
  clear: boolean;
  locationsPerCustomer: { min: number; max: number } | null;
  depotsPerCity: number | null;
  maxCities: number | null;
  validateRoutes: boolean;
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  let size: DataSize = 'medium';
  let clear = true; // Clear by default for idempotent behavior
  let locationsPerCustomer: { min: number; max: number } | null = null;
  let depotsPerCity: number | null = null;
  let maxCities: number | null = null;
  let validateRoutes = false;

  for (const arg of args) {
    if (arg.startsWith('--size=')) {
      const sizeArg = arg.replace('--size=', '') as DataSize;
      if (sizeArg in SIZE_CONFIGS) {
        size = sizeArg;
      }
    }
    if (arg === '--no-clear') {
      clear = false;
    }
    if (arg === '--validate-routes') {
      validateRoutes = true;
    }
    if (arg.startsWith('--locations-per-customer=')) {
      const value = arg.replace('--locations-per-customer=', '');
      // Parse format: "10-15" or just "10"
      if (value.includes('-')) {
        const [minStr, maxStr] = value.split('-');
        const min = parseInt(minStr!, 10);
        const max = parseInt(maxStr!, 10);
        if (!isNaN(min) && !isNaN(max) && min > 0 && max >= min) {
          locationsPerCustomer = { min, max };
        } else {
          console.warn(`Invalid --locations-per-customer value: ${value}. Using default.`);
        }
      } else {
        const count = parseInt(value, 10);
        if (!isNaN(count) && count > 0) {
          locationsPerCustomer = { min: count, max: count };
        } else {
          console.warn(`Invalid --locations-per-customer value: ${value}. Using default.`);
        }
      }
    }
    if (arg.startsWith('--depots-per-city=')) {
      const value = arg.replace('--depots-per-city=', '');
      const count = parseInt(value, 10);
      if (!isNaN(count) && count >= 0) {
        depotsPerCity = count;
      } else {
        console.warn(`Invalid --depots-per-city value: ${value}. Using default.`);
      }
    }
    if (arg.startsWith('--max-cities=')) {
      const value = arg.replace('--max-cities=', '');
      const count = parseInt(value, 10);
      if (!isNaN(count) && count > 0) {
        maxCities = count;
      } else {
        console.warn(`Invalid --max-cities value: ${value}. Using default.`);
      }
    }
  }

  return { size, clear, locationsPerCustomer, depotsPerCity, maxCities, validateRoutes };
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Track used addresses to avoid duplicates within a single run
const usedAddressIndices = new Set<number>();

// Selected cities for this data generation run (null = all cities available)
let selectedCities: string[] | null = null;

function generateTexasAddress(city?: string): { city: string; state: string; postalCode: string; lat: number; lng: number; addressLine1: string } {
  // Find an unused address, or reset if all have been used
  if (usedAddressIndices.size >= REAL_TEXAS_ADDRESSES.length) {
    usedAddressIndices.clear();
  }

  let index: number;
  let location: typeof REAL_TEXAS_ADDRESSES[0];

  if (city) {
    // Find an unused address in the specified city
    const maxAttempts = 100;
    let attempts = 0;

    do {
      index = randomInt(0, REAL_TEXAS_ADDRESSES.length - 1);
      location = REAL_TEXAS_ADDRESSES[index]!;
      attempts++;

      // Accept if city matches and not used yet, or if we've tried too many times
      if (location.city === city && !usedAddressIndices.has(index)) {
        break;
      }

      // Fallback: accept any address in the city after many attempts
      if (attempts >= maxAttempts && location.city === city) {
        break;
      }
    } while (attempts < maxAttempts);

    // If we couldn't find an address in the specified city, fall back to any address
    if (location.city !== city) {
      console.warn(`  Could not find unused address in ${city}, using ${location.city} instead`);
    }
  } else {
    // Find any unused address (limited to selectedCities if set)
    const maxAttempts = 500;
    let attempts = 0;
    let foundAddress = false;

    // First try: find an unused address in selected cities
    do {
      index = randomInt(0, REAL_TEXAS_ADDRESSES.length - 1);
      location = REAL_TEXAS_ADDRESSES[index]!;
      attempts++;

      // Check if we've already used this address
      if (usedAddressIndices.has(index)) {
        continue;
      }

      // If selectedCities is set, only accept addresses from those cities
      if (selectedCities !== null && !selectedCities.includes(location.city)) {
        continue;
      }

      // Found a valid address
      foundAddress = true;
      break;
    } while (attempts < maxAttempts);

    // If no unused address found in selected cities, allow reuse
    if (!foundAddress && selectedCities !== null && selectedCities.length > 0) {
      // Clear used addresses for selected cities only to allow reuse
      const cityList = selectedCities; // For type narrowing
      const selectedCityIndices = REAL_TEXAS_ADDRESSES
        .map((addr, idx) => cityList.includes(addr.city) ? idx : -1)
        .filter(idx => idx !== -1);

      if (selectedCityIndices.length > 0) {
        // Remove selected city addresses from usedAddressIndices to allow reuse
        selectedCityIndices.forEach(idx => usedAddressIndices.delete(idx));

        // Pick a random address from selected cities
        const randomSelectedIndex = randomElement(selectedCityIndices);
        index = randomSelectedIndex;
        location = REAL_TEXAS_ADDRESSES[index]!;
        console.warn(`  ⚠️  Reusing address in ${location.city} (all addresses in selected cities exhausted)`);
      }
    }
  }

  usedAddressIndices.add(index);

  return {
    city: location.city,
    state: location.state,
    postalCode: location.postalCode,
    lat: location.lat,
    lng: location.lng,
    addressLine1: location.addressLine1,
  };
}

function generateFutureDate(daysAhead: number): Date {
  const now = new Date();
  const futureDate = new Date(now);
  futureDate.setDate(now.getDate() + daysAhead);
  return futureDate;
}

function formatDateForDb(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

function formatTimeForDb(hours: number, minutes: number): string {
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
}

// ============================================================================
// Data Generation Functions
// ============================================================================

async function clearDemoData(): Promise<void> {
  console.log('Clearing existing demo data...');

  const supabase = getAdminSupabaseClient();
  if (!supabase) {
    throw new Error('Admin Supabase client not available');
  }

  // Delete in order of dependencies (most dependent first)
  // Routes -> Bookings -> Locations -> Customers -> Services -> Vehicles -> Drivers

  // Clear routes with demo tag
  const { error: routeErr } = await supabase.from('routes').delete().contains('tags', [DEMO_TAG]);
  if (routeErr) console.warn('Error clearing routes:', routeErr.message);

  // Clear bookings with demo tag
  const { error: bookingErr } = await supabase.from('bookings').delete().contains('tags', [DEMO_TAG]);
  if (bookingErr) console.warn('Error clearing bookings:', bookingErr.message);

  // Get demo customer IDs to clear any bookings referencing them (even without demo tag)
  const { data: demoCustomers } = await supabase
    .from('customers')
    .select('id')
    .contains('tags', [DEMO_TAG]);

  if (demoCustomers && demoCustomers.length > 0) {
    const customerIds = demoCustomers.map((c: { id: string }) => c.id);
    const { error: bookingByCustomerErr } = await supabase
      .from('bookings')
      .delete()
      .in('customer_id', customerIds);
    if (bookingByCustomerErr) console.warn('Error clearing bookings by customer:', bookingByCustomerErr.message);
  }

  // Get demo location IDs to clear any bookings referencing them (even without demo tag)
  const { data: demoLocations } = await supabase
    .from('locations')
    .select('id')
    .contains('tags', [DEMO_TAG]);

  if (demoLocations && demoLocations.length > 0) {
    const locationIds = demoLocations.map((l: { id: string }) => l.id);
    const { error: bookingByLocationErr } = await supabase
      .from('bookings')
      .delete()
      .in('location_id', locationIds);
    if (bookingByLocationErr) console.warn('Error clearing bookings by location:', bookingByLocationErr.message);
  }

  // Clear vehicle_locations junction table (must be before vehicles or locations)
  const { data: demoVehicles } = await supabase
    .from('vehicles')
    .select('id')
    .contains('tags', [DEMO_TAG]);

  if (demoVehicles && demoVehicles.length > 0) {
    const vehicleIds = demoVehicles.map((v: { id: string }) => v.id);
    const { error: vehicleLocationErr } = await supabase
      .from('vehicle_locations')
      .delete()
      .in('vehicle_id', vehicleIds);
    if (vehicleLocationErr) console.warn('Error clearing vehicle_locations:', vehicleLocationErr.message);
  }

  // Clear vehicles with demo tag (must be before locations due to home_location_id FK)
  const { error: vehicleErr } = await supabase.from('vehicles').delete().contains('tags', [DEMO_TAG]);
  if (vehicleErr) console.warn('Error clearing vehicles:', vehicleErr.message);

  // Clear drivers with demo tag
  const { error: driverErr } = await supabase.from('drivers').delete().contains('tags', [DEMO_TAG]);
  if (driverErr) console.warn('Error clearing drivers:', driverErr.message);

  // Clear locations with demo tag (must be after vehicles)
  const { error: locationErr } = await supabase.from('locations').delete().contains('tags', [DEMO_TAG]);
  if (locationErr) console.warn('Error clearing locations:', locationErr.message);

  // Clear customers with demo tag
  const { error: customerErr } = await supabase.from('customers').delete().contains('tags', [DEMO_TAG]);
  if (customerErr) console.warn('Error clearing customers:', customerErr.message);

  // Clear services with demo tag
  const { error: serviceErr } = await supabase.from('services').delete().contains('tags', [DEMO_TAG]);
  if (serviceErr) console.warn('Error clearing services:', serviceErr.message);

  console.log('Demo data cleared.');
}

async function generateCustomers(count: number): Promise<string[]> {
  console.log(`\nGenerating ${count} customers...`);
  const customerIds: string[] = [];

  for (let i = 0; i < count; i++) {
    const addr = generateTexasAddress();
    const companyName = faker.company.name();

    const input: CreateCustomerInput = {
      name: faker.person.fullName(),
      companyName,
      email: faker.internet.email({ provider: 'example.com' }),
      phone: faker.phone.number({ style: 'national' }),
      mobilePhone: faker.phone.number({ style: 'national' }),
      addressLine1: addr.addressLine1,
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: 'USA',
      latitude: addr.lat,
      longitude: addr.lng,
      status: 'active',
      notes: `Demo customer for ${companyName}`,
      tags: [DEMO_TAG, faker.helpers.arrayElement(['commercial', 'residential', 'event', 'construction'])],
    };

    const result = await createCustomer(input, { skipLocationCreation: true });
    if (result.success && result.data) {
      customerIds.push(result.data.id);
      console.log(`  Created customer: ${result.data.name} (${result.data.companyName})`);
    } else {
      console.error(`  Failed to create customer: ${result.error?.message}`);
    }
  }

  return customerIds;
}

// Track depots created per city for depot-per-city constraint
const depotsPerCityCount = new Map<string, number>();

async function generateLocations(
  customerIds: string[],
  config: SizeConfig
): Promise<{
  locationsByCustomer: Map<string, string[]>;
  customerLocationsByCity: Map<string, string[]>;
  depotLocationsByCity: Map<string, string[]>;
  homeLocationsByCity: Map<string, string[]>;
  allLocationIds: string[];
}> {
  console.log(`\nGenerating locations for ${customerIds.length} customers...`);
  console.log(`  Locations per customer: ${config.locationsPerCustomer.min}-${config.locationsPerCustomer.max}`);
  console.log(`  Depots per city limit: ${config.depotsPerCity === null ? 'unlimited' : config.depotsPerCity}`);
  console.log(`  Max cities: ${config.maxCities === null ? 'unlimited' : config.maxCities}`);

  // Initialize selected cities based on maxCities config
  if (config.maxCities !== null && config.maxCities > 0) {
    // Get all unique cities from REAL_TEXAS_ADDRESSES
    const allCities = Array.from(new Set(REAL_TEXAS_ADDRESSES.map(addr => addr.city))).sort();

    // Randomly select maxCities cities
    const shuffled = [...allCities].sort(() => Math.random() - 0.5);
    selectedCities = shuffled.slice(0, Math.min(config.maxCities, allCities.length));

    console.log(`  Selected cities (${selectedCities.length}): ${selectedCities.join(', ')}`);
  } else {
    selectedCities = null; // Use all available cities
  }

  const locationsByCustomer = new Map<string, string[]>();

  // Reset depot count for this run
  depotsPerCityCount.clear();

  // Track location name usage to append sequence numbers for uniqueness
  const locationNameCount = new Map<string, number>();

  // Location names by type
  const locationNamesByType: Record<string, string[]> = {
    client: ['Site A', 'Site B', 'North Location', 'South Location', 'East Location', 'West Location', 'Main Site', 'Secondary Site'],
    depot: ['Distribution Center', 'Fleet Yard', 'Operations Hub', 'Service Depot'],
    disposal: ['Waste Facility', 'Processing Center', 'Disposal Site'],
    maintenance: ['Service Bay', 'Repair Shop', 'Maintenance Facility'],
    home: ['Vehicle Base', 'Fleet Home', 'Vehicle Yard'],
    other: ['Satellite Office', 'Warehouse', 'Event Site', 'Construction Zone', 'Field Office', 'Storage Yard'],
  };

  const allLocationIds: string[] = [];
  const depotLocationsByCity = new Map<string, string[]>();
  const homeLocationsByCity = new Map<string, string[]>();
  const customerLocationsByCity = new Map<string, string[]>(); // Track customer locations by city for booking distribution
  const citiesWithCustomerLocations = new Set<string>(); // Track cities that need depots/vehicles

  // PHASE 1: Generate customer locations (mostly client type, all with customerId)
  for (const customerId of customerIds) {
    const locationCount = randomInt(config.locationsPerCustomer.min, config.locationsPerCustomer.max);
    const customerLocations: string[] = [];

    for (let i = 0; i < locationCount; i++) {
      const addr = generateTexasAddress();
      const isPrimary = i === 0;

      // Track that this city has customer locations
      citiesWithCustomerLocations.add(addr.city);

      // Determine location type - 80% client, 20% other types
      let locationType: 'client' | 'disposal' | 'maintenance' | 'other';

      if (isPrimary) {
        // First location is always a client site
        locationType = 'client';
      } else {
        const rand = Math.random();
        if (rand < 0.80) {
          locationType = 'client';
        } else if (rand < 0.90) {
          locationType = 'maintenance';
        } else if (rand < 0.95) {
          locationType = 'disposal';
        } else {
          locationType = 'other';
        }
      }

      // Generate location name based on type
      const typeNames = locationNamesByType[locationType] || ['Location'];
      const baseName = isPrimary ? 'Primary Site' : randomElement(typeNames);
      const baseLocationName = isPrimary ? baseName : `${baseName} - ${addr.city}`;

      // Track name usage and append sequence number to ensure uniqueness
      const nameKey = baseLocationName.toLowerCase();
      const nameCount = locationNameCount.get(nameKey) || 0;
      locationNameCount.set(nameKey, nameCount + 1);

      // Append sequence number if this is not the first occurrence
      const locationName = nameCount > 0
        ? `${baseLocationName} ${String(nameCount + 1).padStart(2, '0')}`
        : baseLocationName;

      const input: CreateLocationInput = {
        customerId, // All customer locations have customerId set
        name: locationName,
        locationType,
        addressLine1: addr.addressLine1,
        city: addr.city,
        state: addr.state,
        postalCode: addr.postalCode,
        country: 'USA',
        latitude: addr.lat,
        longitude: addr.lng,
        isPrimary,
        tags: [DEMO_TAG, locationType],
      };

      const result = await createLocation(input);
      if (result.success && result.data) {
        customerLocations.push(result.data.id);
        allLocationIds.push(result.data.id);

        // Track customer location by city for booking distribution
        const cityCustomerLocs = customerLocationsByCity.get(addr.city) || [];
        cityCustomerLocs.push(result.data.id);
        customerLocationsByCity.set(addr.city, cityCustomerLocs);
      } else {
        console.error(`  Failed to create location: ${result.error?.message}`);
      }
    }

    locationsByCustomer.set(customerId, customerLocations);
    console.log(`  Created ${customerLocations.length} locations for customer ${customerId.substring(0, 8)}...`);
  }

  // PHASE 2: Generate depot locations (one per city that has customer locations, no customerId)
  const citiesWithCustomers = Array.from(citiesWithCustomerLocations).sort();
  console.log(`\n  Creating depot locations in cities with customers: ${citiesWithCustomers.join(', ')}...`);

  for (const city of citiesWithCustomers) {
    const currentCount = depotsPerCityCount.get(city) || 0;

    if (config.depotsPerCity !== null && currentCount >= config.depotsPerCity) {
      continue;
    }

    const addr = generateTexasAddress(city);
    const baseName = randomElement(locationNamesByType.depot || ['Depot']);
    const baseLocationName = `${baseName} - ${addr.city}`;

    const nameKey = baseLocationName.toLowerCase();
    const nameCount = locationNameCount.get(nameKey) || 0;
    locationNameCount.set(nameKey, nameCount + 1);

    const locationName = nameCount > 0
      ? `${baseLocationName} ${String(nameCount + 1).padStart(2, '0')}`
      : baseLocationName;

    const depotInput: CreateLocationInput = {
      customerId: null, // Depots are not customer-specific
      name: locationName,
      locationType: 'depot',
      addressLine1: addr.addressLine1,
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: 'USA',
      latitude: addr.lat,
      longitude: addr.lng,
      isPrimary: false,
      tags: [DEMO_TAG, 'depot'],
    };

    const result = await createLocation(depotInput);
    if (result.success && result.data) {
      allLocationIds.push(result.data.id);
      const cityDepots = depotLocationsByCity.get(addr.city) || [];
      cityDepots.push(result.data.id);
      depotLocationsByCity.set(addr.city, cityDepots);
      depotsPerCityCount.set(addr.city, (depotsPerCityCount.get(addr.city) || 0) + 1);
    }
  }

  // PHASE 3: Generate vehicle home locations (ONLY in cities with customer locations)
  console.log(`  Creating vehicle home locations...`);
  // Use citiesWithCustomerLocations to ensure vehicles are placed where bookings can be generated
  const citiesForHomes = Array.from(citiesWithCustomerLocations);

  for (const city of citiesForHomes) {
    // Create 1-2 home locations per city with customer locations
    const homeCount = randomInt(1, 2);

    for (let i = 0; i < homeCount; i++) {
      const addr = generateTexasAddress(city);

      // Skip if we couldn't get an address in the requested city
      if (addr.city !== city) {
        console.warn(`  ⚠️  Skipping home location - wanted ${city} but got ${addr.city}`);
        continue;
      }
      const baseName = randomElement(locationNamesByType.home || ['Vehicle Home']);
      const baseLocationName = `${baseName} - ${addr.city}`;

      const nameKey = baseLocationName.toLowerCase();
      const nameCount = locationNameCount.get(nameKey) || 0;
      locationNameCount.set(nameKey, nameCount + 1);

      const locationName = nameCount > 0
        ? `${baseLocationName} ${String(nameCount + 1).padStart(2, '0')}`
        : baseLocationName;

      const homeInput: CreateLocationInput = {
        customerId: null, // Home locations are not customer-specific
        name: locationName,
        locationType: 'home',
        addressLine1: addr.addressLine1,
        city: addr.city,
        state: addr.state,
        postalCode: addr.postalCode,
        country: 'USA',
        latitude: addr.lat,
        longitude: addr.lng,
        isPrimary: false,
        tags: [DEMO_TAG, 'home'],
      };

      const result = await createLocation(homeInput);
      if (result.success && result.data) {
        allLocationIds.push(result.data.id);
        const cityHomes = homeLocationsByCity.get(addr.city) || [];
        cityHomes.push(result.data.id);
        homeLocationsByCity.set(addr.city, cityHomes);
      }
    }
  }

  // Log distribution
  console.log(`\n  Location distribution:`);
  console.log(`    Customer locations: ${Array.from(locationsByCustomer.values()).flat().length}`);
  console.log(`    Depot locations: ${Array.from(depotLocationsByCity.values()).flat().length}`);
  console.log(`    Vehicle home locations: ${Array.from(homeLocationsByCity.values()).flat().length}`);
  console.log(`\n  Depot distribution by city:`);
  depotsPerCityCount.forEach((count, city) => {
    const homes = homeLocationsByCity.get(city)?.length || 0;
    console.log(`    ${city}: ${count} depot(s), ${homes} vehicle home(s)`);
  });

  return { locationsByCustomer, customerLocationsByCity, depotLocationsByCity, homeLocationsByCity, allLocationIds };
}

async function generateServices(count: number): Promise<string[]> {
  console.log(`\nGenerating ${count} services...`);
  const serviceIds: string[] = [];

  // Use predefined services up to count
  const servicesToCreate = SERVICE_DEFINITIONS.slice(0, count);

  for (const svc of servicesToCreate) {
    const input: CreateServiceInput = {
      name: svc.name,
      code: svc.code,
      serviceType: svc.type,
      description: svc.description,
      averageDurationMinutes: svc.duration,
      minimumDurationMinutes: Math.floor(svc.duration * 0.7),
      maximumDurationMinutes: Math.floor(svc.duration * 1.5),
      basePrice: svc.price,
      priceCurrency: 'USD',
      requiresAppointment: true,
      maxPerDay: randomInt(8, 15),
      status: 'active',
      tags: [DEMO_TAG],
    };

    const result = await createService(input);
    if (result.success && result.data) {
      serviceIds.push(result.data.id);
      console.log(`  Created service: ${result.data.name} ($${result.data.basePrice})`);
    } else {
      console.error(`  Failed to create service: ${result.error?.message}`);
    }
  }

  return serviceIds;
}

async function generateVehicles(
  count: number,
  serviceIds: string[],
  homeLocationsByCity: Map<string, string[]>,
  depotLocationsByCity: Map<string, string[]>
): Promise<{ vehicleIds: string[]; vehiclesPerCity: Map<string, number> }> {
  // Get all cities with home locations
  const citiesWithHomes = Array.from(homeLocationsByCity.keys());
  const allHomeLocationIds = Array.from(homeLocationsByCity.values()).flat();

  // Ensure we have at least one vehicle per city
  const minVehiclesNeeded = citiesWithHomes.length;
  const actualVehicleCount = Math.max(count, minVehiclesNeeded);

  if (actualVehicleCount > count) {
    console.log(`\n⚠️  Increasing vehicle count from ${count} to ${actualVehicleCount} to cover all ${citiesWithHomes.length} cities`);
  }

  console.log(`\nGenerating ${actualVehicleCount} vehicles...`);
  console.log(`  Cities with home locations: ${citiesWithHomes.join(', ')}`);
  console.log(`  Total home locations available: ${allHomeLocationIds.length}`);

  const vehicleIds: string[] = [];

  // Track which cities have been assigned at least one vehicle
  const citiesWithVehicles = new Set<string>();

  // Track vehicle count per city for booking distribution
  const vehiclesPerCity = new Map<string, number>();

  // Track city assignments for vehicle_locations population
  const vehicleCityAssignments = new Map<string, string>(); // vehicleId -> city

  // Track used vehicle names to ensure uniqueness
  const usedVehicleNames = new Set<string>();

  // Query existing vehicle names to avoid conflicts
  const supabase = getAdminSupabaseClient();
  if (supabase) {
    const { data: existingVehicles } = await supabase
      .from('vehicles')
      .select('name');

    existingVehicles?.forEach((v: any) => {
      if (v.name) {
        usedVehicleNames.add(v.name);
      }
    });

    if (usedVehicleNames.size > 0) {
      console.log(`  Found ${usedVehicleNames.size} existing vehicle name(s) to avoid duplicates`);
    }
  }

  for (let i = 0; i < actualVehicleCount; i++) {
    const spec = VEHICLE_SPECS[i % VEHICLE_SPECS.length]!;

    // Assign home location and track city first (needed for city prefix in name)
    let homeLocationId: string | undefined;
    let assignedCity: string | undefined;
    let isFirstInCity = false;

    if (allHomeLocationIds.length > 0) {
      // Ensure each city gets at least one vehicle first
      const citiesNeedingVehicles = citiesWithHomes.filter(city => !citiesWithVehicles.has(city));

      if (citiesNeedingVehicles.length > 0) {
        // Assign to a city that doesn't have a vehicle yet
        assignedCity = citiesNeedingVehicles[0]!;
        const cityHomes = homeLocationsByCity.get(assignedCity) || [];
        homeLocationId = randomElement(cityHomes);
        citiesWithVehicles.add(assignedCity);
        isFirstInCity = true;
      } else {
        // All cities have at least one vehicle, distribute randomly
        homeLocationId = randomElement(allHomeLocationIds);
        assignedCity = citiesWithHomes.find(city =>
          homeLocationsByCity.get(city)?.includes(homeLocationId!)
        );
        if (assignedCity) {
          citiesWithVehicles.add(assignedCity);
        }
      }
    }

    // Generate unique vehicle name with city prefix
    const cityPrefix = assignedCity ? assignedCity.substring(0, 3).toUpperCase() : 'XXX';
    let unitNumber: string;
    let counter = 100 + i;
    do {
      unitNumber = `${cityPrefix}-V${counter.toString()}`;
      counter++;
    } while (usedVehicleNames.has(unitNumber));

    // Mark this name as used
    usedVehicleNames.add(unitNumber);

    if (assignedCity) {
      console.log(`  Assigning vehicle ${unitNumber} to ${assignedCity}${isFirstInCity ? ' (first vehicle in city)' : ''}`);
    }

    const input: CreateVehicleInput = {
      name: unitNumber,
      description: `${spec.make} ${spec.model} - Unit ${unitNumber}`,
      licensePlate: faker.vehicle.vrm(),
      vin: faker.vehicle.vin(),
      make: spec.make,
      model: spec.model,
      year: spec.year,
      color: faker.vehicle.color(),
      maxCapacityWeight: spec.capacity,
      serviceTypes: serviceIds, // Associate vehicle with all service IDs
      status: i === count - 1 ? 'maintenance' : 'available', // Last one in maintenance
      fuelType: spec.fuelType,
      fuelCapacity: 50,
      currentFuelLevel: randomInt(40, 95),
      fuelEfficiencyMpg: randomInt(8, 14),
      odometerReading: randomInt(15000, 85000),
      homeLocationId, // Assign home location
      notes: `Demo vehicle - ${spec.make} ${spec.model}`,
      tags: [DEMO_TAG],
    };

    const result = await createVehicle(input);
    if (result.success && result.data) {
      const vehicleId = result.data.id;
      vehicleIds.push(vehicleId);
      const homeInfo = homeLocationId ? ` (home location assigned)` : '';
      console.log(`  Created vehicle: ${result.data.name} (${spec.make} ${spec.model}) - ${serviceIds.length} services${homeInfo}`);

      // Store city assignment for later vehicle_locations population
      if (assignedCity) {
        vehicleCityAssignments.set(vehicleId, assignedCity);
        // Increment vehicle count for this city
        vehiclesPerCity.set(assignedCity, (vehiclesPerCity.get(assignedCity) || 0) + 1);
      }

      // Populate vehicle_locations junction table
      if (homeLocationId && assignedCity) {
        const locationsToAssociate = [];

        // Add home location as primary
        locationsToAssociate.push({
          locationId: homeLocationId,
          isPrimary: true,
        });

        // Add depot location in same city (not primary)
        const cityDepots = depotLocationsByCity.get(assignedCity) || [];
        if (cityDepots.length > 0) {
          const depotId = randomElement(cityDepots);
          locationsToAssociate.push({
            locationId: depotId,
            isPrimary: false,
          });
        }

        // Set vehicle locations via junction table
        const vlResult = await setVehicleLocations(vehicleId, locationsToAssociate);
        if (vlResult.success) {
          console.log(`    Associated ${locationsToAssociate.length} location(s) with ${result.data.name}`);
        } else {
          console.error(`    Failed to associate locations with ${result.data.name}: ${vlResult.error?.message}`);
        }
      }
    } else {
      console.error(`  Failed to create vehicle: ${result.error?.message}`);
    }
  }

  // Report on city coverage
  console.log(`\n  Vehicle distribution: ${citiesWithVehicles.size}/${citiesWithHomes.length} cities have vehicles`);
  citiesWithHomes.forEach(city => {
    if (!citiesWithVehicles.has(city)) {
      console.warn(`  ⚠️  City ${city} has home locations but no vehicles assigned`);
    }
  });

  // Log vehicles per city for debugging
  console.log(`  Vehicles per city:`);
  vehiclesPerCity.forEach((count, city) => {
    console.log(`    ${city}: ${count} vehicle(s)`);
  });

  return { vehicleIds, vehiclesPerCity };
}

async function generateDrivers(count: number, vehicleIds: string[]): Promise<string[]> {
  console.log(`\nGenerating ${count} drivers and assigning to vehicles...`);
  const driverIds: string[] = [];

  for (let i = 0; i < count; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const hireDate = faker.date.past({ years: 5 });

    const input: CreateDriverInput = {
      firstName,
      lastName,
      email: faker.internet.email({ firstName, lastName, provider: 'fleetillo.com' }),
      phoneNumber: faker.phone.number({ style: 'national' }),
      licenseNumber: `TX${faker.string.numeric(8)}`,
      licenseExpiry: faker.date.future({ years: 3 }),
      licenseClass: 'C',
      status: 'active',
      hireDate,
      emergencyContactName: faker.person.fullName(),
      emergencyContactPhone: faker.phone.number({ style: 'national' }),
      tags: [DEMO_TAG],
    };

    const result = await createDriver(input);
    if (result.success && result.data) {
      driverIds.push(result.data.id);
      console.log(`  Created driver: ${result.data.firstName} ${result.data.lastName}`);

      // Assign driver to vehicle if available
      if (i < vehicleIds.length) {
        const vehicleId = vehicleIds[i]!;
        const assignResult = await assignDriverToVehicle(result.data.id, vehicleId);
        if (assignResult.success) {
          console.log(`    Assigned to vehicle ${vehicleId.substring(0, 8)}...`);
        } else {
          console.warn(`    Failed to assign vehicle: ${assignResult.error?.message}`);
        }
      }
    } else {
      console.error(`  Failed to create driver: ${result.error?.message}`);
    }
  }

  return driverIds;
}

interface ServiceData {
  id: string;
  name: string;
  duration: number;
  price: number;
}

async function generateBookings(
  count: number,
  _customerIds: string[], // Not used directly - we use locationToCustomer map instead
  locationsByCustomer: Map<string, string[]>,
  customerLocationsByCity: Map<string, string[]>,
  vehiclesPerCity: Map<string, number>,
  serviceIds: string[]
): Promise<string[]> {
  console.log(`\nGenerating bookings with city-based distribution...`);
  const bookingIds: string[] = [];

  // Fetch service details for service items
  const supabase = getAdminSupabaseClient();
  if (!supabase) throw new Error('Admin client not available');

  const { data: servicesData } = await supabase
    .from('services')
    .select('id, name, average_duration_minutes, base_price')
    .in('id', serviceIds);

  const serviceMap = new Map<string, ServiceData>();
  servicesData?.forEach((s: any) => {
    serviceMap.set(s.id, {
      id: s.id,
      name: s.name,
      duration: s.average_duration_minutes,
      price: s.base_price ?? 0,
    });
  });

  // Status distribution: 10% pending, 90% confirmed
  const getBookingStatus = (): 'pending' | 'confirmed' => {
    return Math.random() < 0.1 ? 'pending' : 'confirmed';
  };

  const priorityOptions: Array<'low' | 'normal' | 'high' | 'urgent'> = ['low', 'normal', 'normal', 'normal', 'high', 'urgent'];

  // Calculate target bookings per city per day (6-10 per vehicle)
  const MIN_BOOKINGS_PER_VEHICLE = 6;
  const MAX_BOOKINGS_PER_VEHICLE = 10;
  const TARGET_BOOKINGS_PER_VEHICLE = 8; // Average

  // Calculate total daily bookings needed based on vehicles
  let totalDailyBookingsNeeded = 0;
  const cityTargets = new Map<string, { min: number; max: number; target: number }>();

  vehiclesPerCity.forEach((vehicleCount, city) => {
    const min = vehicleCount * MIN_BOOKINGS_PER_VEHICLE;
    const max = vehicleCount * MAX_BOOKINGS_PER_VEHICLE;
    const target = vehicleCount * TARGET_BOOKINGS_PER_VEHICLE;
    cityTargets.set(city, { min, max, target });
    totalDailyBookingsNeeded += target;
  });

  // Determine number of days
  const numDays = Math.max(1, Math.ceil(count / totalDailyBookingsNeeded));

  console.log(`  Vehicles per city and booking targets:`);
  vehiclesPerCity.forEach((vehicleCount, city) => {
    const targets = cityTargets.get(city)!;
    const locationsAvailable = customerLocationsByCity.get(city)?.length || 0;
    console.log(`    ${city}: ${vehicleCount} vehicle(s) → ${targets.min}-${targets.max} bookings/day (${locationsAvailable} locations available)`);
  });
  console.log(`  Total daily target: ${totalDailyBookingsNeeded} bookings`);
  console.log(`  Distributing ${count} bookings across ${numDays} day(s)`);

  // Track locations used per day per city to prevent duplicates
  const locationsUsedPerDayPerCity = new Map<string, Map<string, Set<string>>>(); // Map<dateKey, Map<city, Set<locationId>>>

  // Get location to customer mapping for booking creation
  const locationToCustomer = new Map<string, string>();
  locationsByCustomer.forEach((locations, customerId) => {
    locations.forEach(locationId => {
      locationToCustomer.set(locationId, customerId);
    });
  });

  // Generate bookings day by day, city by city
  for (let day = 0; day < numDays; day++) {
    const scheduledDate = generateFutureDate(day);
    const dateKey = formatDateForDb(scheduledDate);

    // Initialize tracking for this day
    if (!locationsUsedPerDayPerCity.has(dateKey)) {
      locationsUsedPerDayPerCity.set(dateKey, new Map<string, Set<string>>());
    }
    const dayUsedLocations = locationsUsedPerDayPerCity.get(dateKey)!;

    // Generate bookings for each city based on their vehicle count
    for (const [city, vehicleCount] of vehiclesPerCity) {
      const cityLocations = customerLocationsByCity.get(city) || [];
      if (cityLocations.length === 0) {
        console.warn(`  ⚠️  No customer locations in ${city}, skipping`);
        continue;
      }

      // Initialize used locations for this city on this day
      if (!dayUsedLocations.has(city)) {
        dayUsedLocations.set(city, new Set<string>());
      }
      const usedCityLocations = dayUsedLocations.get(city)!;

      // Calculate bookings for this city
      const targets = cityTargets.get(city)!;
      // Use random value between min and max for variety
      const cityBookingsTarget = randomInt(targets.min, Math.min(targets.max, cityLocations.length));

      let cityBookingsCreated = 0;
      const availableLocations = cityLocations.filter(loc => !usedCityLocations.has(loc));

      for (let b = 0; b < cityBookingsTarget && availableLocations.length > 0; b++) {
        // Pick a random available location
        const locationIndex = randomInt(0, availableLocations.length - 1);
        const locationId = availableLocations[locationIndex]!;
        availableLocations.splice(locationIndex, 1); // Remove from available
        usedCityLocations.add(locationId);

        // Get the customer for this location
        const customerId = locationToCustomer.get(locationId);
        if (!customerId) {
          console.warn(`  ⚠️  No customer found for location ${locationId}`);
          continue;
        }

        const serviceId = randomElement(serviceIds);
        const service = serviceMap.get(serviceId);
        if (!service) {
          console.warn(`  Skipping booking - service not found ${serviceId}`);
          continue;
        }

        const hour = randomInt(7, 16);
        const minute = randomElement([0, 15, 30, 45]);

        // Create service item
        const serviceItem: BookingServiceItem = {
          serviceId: service.id,
          name: service.name,
          quantity: 1,
          unitPrice: service.price,
          total: service.price,
          duration: service.duration,
        };

        const input: CreateBookingInput = {
          customerId,
          locationId,
          serviceId,
          serviceItems: [serviceItem],
          serviceIds: [serviceId],
          bookingType: 'one_time',
          scheduledDate: formatDateForDb(scheduledDate),
          scheduledStartTime: formatTimeForDb(hour, minute),
          estimatedDurationMinutes: service.duration,
          status: getBookingStatus(),
          priority: randomElement(priorityOptions),
          quotedPrice: service.price,
          priceCurrency: 'USD',
          specialInstructions: Math.random() > 0.7 ? faker.lorem.sentence() : undefined,
          tags: [DEMO_TAG],
        };

        const result = await createBooking(input);
        if (result.success && result.data) {
          bookingIds.push(result.data.id);
          cityBookingsCreated++;
        } else {
          console.error(`  Failed to create booking: ${result.error?.message}`);
        }
      }

      if (cityBookingsCreated > 0) {
        console.log(`  ${dateKey} - ${city}: ${cityBookingsCreated} bookings (${vehicleCount} vehicle(s))`);
      }
    }
  }

  console.log(`\n  Completed: ${bookingIds.length} bookings created.`);

  // Log distribution summary
  console.log(`\n  Booking distribution summary:`);
  locationsUsedPerDayPerCity.forEach((cityMap, dateKey) => {
    let dayTotal = 0;
    const cityDetails: string[] = [];
    cityMap.forEach((locations, city) => {
      dayTotal += locations.size;
      cityDetails.push(`${city}:${locations.size}`);
    });
    console.log(`    ${dateKey}: ${dayTotal} bookings (${cityDetails.join(', ')})`);
  });

  return bookingIds;
}

async function generateRoutes(
  count: number,
  vehicleIds: string[],
  bookingIds: string[]
): Promise<string[]> {
  console.log(`\nGenerating ${count} routes...`);
  const routeIds: string[] = [];

  // Get available vehicles (not in maintenance)
  const supabase = getAdminSupabaseClient();
  if (!supabase) throw new Error('Admin client not available');

  const availableVehicles = vehicleIds.slice(0, -1); // Exclude last one (in maintenance)

  // Get confirmed/scheduled bookings for route assignment
  const { data: eligibleBookings } = await supabase
    .from('bookings')
    .select('id, scheduled_date')
    .in('id', bookingIds)
    .in('status', ['confirmed', 'scheduled'])
    .is('route_id', null)
    .order('scheduled_date', { ascending: true });

  const bookingsByDate = new Map<string, string[]>();
  eligibleBookings?.forEach((b: any) => {
    const dateKey = b.scheduled_date;
    if (!bookingsByDate.has(dateKey)) {
      bookingsByDate.set(dateKey, []);
    }
    bookingsByDate.get(dateKey)!.push(b.id);
  });

  const routeDates = Array.from(bookingsByDate.keys()).slice(0, count);

  for (let i = 0; i < routeDates.length; i++) {
    const routeDate = routeDates[i]!;
    const vehicleId = availableVehicles[i % availableVehicles.length];
    const dateBookings = bookingsByDate.get(routeDate) || [];

    // Take up to 8 bookings per route
    const routeBookings = dateBookings.slice(0, Math.min(8, dateBookings.length));

    const input: CreateRouteInput = {
      routeName: `Route ${routeDate} - ${i + 1}`,
      routeCode: `R-${routeDate.replace(/-/g, '')}-${(i + 1).toString().padStart(2, '0')}`,
      vehicleId,
      routeDate: new Date(routeDate),
      plannedStartTime: '07:30:00',
      plannedEndTime: '17:00:00',
      totalStops: routeBookings.length,
      optimizationType: 'balanced',
      status: 'planned',
      stopSequence: routeBookings,
      notes: `Demo route for ${routeDate}`,
      tags: [DEMO_TAG],
    };

    const result = await createRoute(input);
    if (result.success && result.data) {
      routeIds.push(result.data.id);
      console.log(`  Created route: ${result.data.routeName} (${routeBookings.length} stops)`);

      // Update bookings with route assignment
      if (routeBookings.length > 0) {
        for (let j = 0; j < routeBookings.length; j++) {
          await supabase
            .from('bookings')
            .update({
              route_id: result.data.id,
              stop_order: j + 1,
              status: 'scheduled',
            })
            .eq('id', routeBookings[j]);
        }
      }
    } else {
      console.error(`  Failed to create route: ${result.error?.message}`);
    }
  }

  return routeIds;
}

// ============================================================================
// Main Execution
// ============================================================================

async function main(): Promise<void> {
  console.log('========================================');
  console.log('  Fleetillo Demo Data Loader');
  console.log('========================================\n');

  // Parse command line arguments
  const { size, clear, locationsPerCustomer, depotsPerCity, maxCities, validateRoutes } = parseArgs();

  // Start with base config and apply overrides
  const config: SizeConfig = { ...SIZE_CONFIGS[size] };

  // Apply CLI overrides
  if (locationsPerCustomer !== null) {
    config.locationsPerCustomer = locationsPerCustomer;
    console.log(`Override: locations-per-customer = ${locationsPerCustomer.min}-${locationsPerCustomer.max}`);
  }
  if (depotsPerCity !== null) {
    config.depotsPerCity = depotsPerCity;
    console.log(`Override: depots-per-city = ${depotsPerCity}`);
  }
  if (maxCities !== null) {
    config.maxCities = maxCities;
    console.log(`Override: max-cities = ${maxCities}`);
  }
  if (validateRoutes) {
    console.log(`Option: --validate-routes (will create test route and delete it)`);
  }

  console.log(`\nConfiguration: ${size}`);
  console.log(`  Customers: ${config.customers}`);
  console.log(`  Locations per customer: ${config.locationsPerCustomer.min}-${config.locationsPerCustomer.max}`);
  console.log(`  Depots per city: ${config.depotsPerCity === null ? 'unlimited' : config.depotsPerCity}`);
  console.log(`  Max cities: ${config.maxCities === null ? 'unlimited' : config.maxCities}`);
  console.log(`  Services: ${config.services}`);
  console.log(`  Vehicles: ${config.vehicles}`);
  console.log(`  Drivers: ${config.drivers}`);
  console.log(`  Bookings: ${config.bookings}`);

  // Initialize Supabase
  console.log('\nInitializing Supabase connection...');
  initializeSupabase({
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  const adminClient = getAdminSupabaseClient();
  if (!adminClient) {
    console.error('ERROR: Admin Supabase client not available. Make sure SUPABASE_SERVICE_ROLE_KEY is set.');
    process.exit(1);
  }
  console.log('Supabase initialized successfully.');

  // Clear existing demo data if requested
  if (clear) {
    await clearDemoData();
  }

  // Generate data in dependency order
  const customerIds = await generateCustomers(config.customers);
  const { locationsByCustomer, customerLocationsByCity, depotLocationsByCity, homeLocationsByCity, allLocationIds } = await generateLocations(customerIds, config);
  const serviceIds = await generateServices(config.services);

  // Calculate optimal vehicle count for route testing
  // Goal: 1 vehicle per city minimum, ideally 1 vehicle per 8-12 bookings
  const numCities = homeLocationsByCity.size;
  const targetVehiclesForBookings = Math.ceil(config.bookings / 10); // Average of 8-12 is 10
  const optimalVehicleCount = Math.max(config.vehicles, numCities, targetVehiclesForBookings);

  if (optimalVehicleCount > config.vehicles) {
    console.log(`\n⚙️  Adjusting vehicle count from ${config.vehicles} to ${optimalVehicleCount} for better route testing`);
    console.log(`   (${numCities} cities × 1 vehicle/city minimum, plus ~1 vehicle per 10 bookings)`);
  }

  const { vehicleIds, vehiclesPerCity } = await generateVehicles(optimalVehicleCount, serviceIds, homeLocationsByCity, depotLocationsByCity);
  const driverIds = await generateDrivers(config.drivers, vehicleIds);
  const bookingIds = await generateBookings(config.bookings, customerIds, locationsByCustomer, customerLocationsByCity, vehiclesPerCity, serviceIds);

  // Calculate total locations
  const totalLocations = allLocationIds.length;

  // Validate routes if requested (creates a test route then deletes it)
  let routeValidationStatus = 'skipped';
  if (validateRoutes) {
    console.log('\n--- Route Validation ---');
    console.log('Creating test route to validate dependent data...');

    const testRouteIds = await generateRoutes(1, vehicleIds, bookingIds);
    if (testRouteIds.length > 0) {
      console.log('Test route created successfully. Deleting test route...');
      const supabase = getAdminSupabaseClient();
      if (supabase) {
        const { error } = await supabase.from('routes').delete().in('id', testRouteIds);
        if (error) {
          console.warn('Warning: Failed to delete test route:', error.message);
          routeValidationStatus = 'created (cleanup failed)';
        } else {
          console.log('Test route deleted.');
          routeValidationStatus = 'PASSED';
        }
      }
    } else {
      console.error('Failed to create test route.');
      routeValidationStatus = 'FAILED';
    }
  }

  // Summary
  console.log('\n========================================');
  console.log('  Demo Data Generation Complete!');
  console.log('========================================');
  console.log(`  Customers created: ${customerIds.length}`);
  console.log(`  Locations created: ${totalLocations} (avg ${(totalLocations / customerIds.length).toFixed(1)} per customer)`);
  console.log(`  Services created: ${serviceIds.length}`);
  console.log(`  Vehicles created: ${vehicleIds.length}`);
  console.log(`  Drivers created: ${driverIds.length}`);
  console.log(`  Bookings created: ${bookingIds.length}`);
  console.log(`  Route validation: ${routeValidationStatus}`);
  console.log('\nAll data has been tagged with "demo-data" for easy cleanup.');
  console.log('Demo data is cleared automatically on each run. Use --no-clear to preserve existing data.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\nFatal error:', err);
    process.exit(1);
  });
