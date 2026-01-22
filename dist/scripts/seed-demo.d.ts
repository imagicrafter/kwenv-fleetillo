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
//# sourceMappingURL=seed-demo.d.ts.map