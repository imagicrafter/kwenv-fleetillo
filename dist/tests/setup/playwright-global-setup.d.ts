/**
 * Playwright Global Setup
 *
 * Runs once before all tests to prepare the test environment
 */
import { FullConfig } from '@playwright/test';
declare function globalSetup(config: FullConfig): Promise<void>;
export default globalSetup;
//# sourceMappingURL=playwright-global-setup.d.ts.map