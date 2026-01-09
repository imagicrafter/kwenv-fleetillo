/**
 * Playwright Fixtures for API Testing
 *
 * Custom fixtures that extend Playwright's test object with:
 * - API client with built-in helpers
 * - Database setup and teardown
 * - Test data factories
 * - Authentication helpers
 */
import { expect } from '@playwright/test';
import { ApiClient } from '../helpers/api-client.js';
/**
 * Extended test fixtures
 */
type ApiFixtures = {
    apiClient: ApiClient;
    authenticatedApiClient: ApiClient;
    dbSetup: void;
};
/**
 * Extend base test with custom fixtures
 */
export declare const test: import("@playwright/test").TestType<import("@playwright/test").PlaywrightTestArgs & import("@playwright/test").PlaywrightTestOptions & ApiFixtures, import("@playwright/test").PlaywrightWorkerArgs & import("@playwright/test").PlaywrightWorkerOptions>;
/**
 * Export expect for convenience
 */
export { expect };
/**
 * Test data factories
 */
export declare const TestDataFactory: {
    /**
     * Create test vehicle data
     */
    createVehicleData: (overrides?: {}) => {
        name: string;
        description: string;
        licensePlate: string;
        make: string;
        model: string;
        year: number;
        status: "available";
        serviceTypes: string[];
        fuelType: "gasoline";
    };
    /**
     * Create test service data
     */
    createServiceData: (overrides?: {}) => {
        name: string;
        description: string;
        service_type: string;
        status: "active";
    };
    /**
     * Create test maintenance schedule data
     */
    createMaintenanceScheduleData: (vehicleId: string, overrides?: {}) => {
        vehicle_id: string;
        maintenance_type: string;
        scheduled_date: string;
        description: string;
        status: "scheduled";
    };
};
//# sourceMappingURL=api-fixtures.d.ts.map