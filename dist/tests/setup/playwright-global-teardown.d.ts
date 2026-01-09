/**
 * Playwright Global Teardown
 *
 * Runs once after all tests to clean up the test environment
 */
import { FullConfig } from '@playwright/test';
declare function globalTeardown(config: FullConfig): Promise<void>;
export default globalTeardown;
//# sourceMappingURL=playwright-global-teardown.d.ts.map