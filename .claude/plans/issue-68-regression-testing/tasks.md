# Tasks: Issue #68 - Implement Robust Regression Testing

## Overview

Implementation of E2E testing infrastructure using Playwright, with GitHub Actions integration. Organized in three phases: Foundation, Critical Path Coverage, and CI Integration.

## Tasks

- [ ] 0. Create Feature Branch
  - Create `issue/68-regression-testing`
  - Branch from main

---

### Phase 1: Foundation

- [ ] 1. Set Up Playwright Infrastructure
  - [ ] 1.1 Install Playwright and dependencies
    - `npm install -D @playwright/test`
    - `npx playwright install`
    - _Requirements: 1.1, 1.2_
  - [ ] 1.2 Create playwright.config.ts
    - Configure baseURL, timeout, retries, workers
    - Set up screenshot/video on failure
    - _Requirements: 1.4_
  - [ ] 1.3 Create test directory structure
    - `tests/e2e/fixtures/`, `pages/`, `specs/`, `utils/`
    - _Requirements: 5.1_

- [ ] 2. Checkpoint - Infrastructure Complete
  - Run `npx playwright test --help` to verify installation
  - Verify config file is valid

- [ ] 3. Create Base Page Objects
  - [ ] 3.1 Implement base.page.ts
    - Common navigation, wait methods
    - _Requirements: 2.1_
  - [ ] 3.2 Implement locations.page.ts
    - openEditModal, verifyCustomerName, saveLocation
    - _Requirements: 2.2, 3.4, 3.5_
  - [ ] 3.3 Implement customers.page.ts
    - createCustomer, deleteCustomer, verifyCustomerInList
    - _Requirements: 2.1_

- [ ] 4. Set Up Test Fixtures
  - [ ] 4.1 Create test-data.fixture.ts
    - Customer, Location, Driver seed functions
    - Cleanup after each test
    - _Requirements: 4.1, 4.2, 4.5_
  - [ ] 4.2 Create database utility
    - Direct Supabase connection for test data
    - _Requirements: 4.4_

- [ ] 5. Checkpoint - Foundation Complete
  - Run example test locally
  - Verify fixture cleanup works

---

### Phase 2: Critical Path Tests

- [ ] 6. Customer CRUD Tests
  - [ ] 6.1 Write customers.spec.ts
    - Create customer test
    - Edit customer test
    - Delete customer test
    - _Requirements: 2.1_

- [ ] 7. Location CRUD Tests
  - [ ] 7.1 Write locations.spec.ts
    - Create location with customer assignment
    - Edit location - verify customer populated
    - Delete location
    - _Requirements: 2.2, 2.4_

- [ ] 8. Regression-Specific Tests
  - [ ] 8.1 Write issue-57-customer-terminology.spec.ts
    - Verify "Customer" not "Client" in Locations list
    - Verify customer name in edit modal
    - _Requirements: 3.1, 3.4, 3.5_
  - [ ] 8.2 Test foreign key display
    - customer_id shows customer name, not ID/Unknown
    - _Requirements: 3.2_

- [ ] 9. Navigation Tests
  - [ ] 9.1 Write navigation.spec.ts
    - Dashboard → Calendar → Dispatch flow
    - _Requirements: 2.5_

- [ ] 10. Checkpoint - Tests Complete
  - All 5+ critical path tests passing locally
  - Test coverage for regression areas confirmed

---

### Phase 3: CI Integration

- [ ] 11. GitHub Actions Workflow
  - [ ] 11.1 Create .github/workflows/e2e-tests.yml
    - Trigger on pull_request
    - Install dependencies
    - Start test server
    - Run Playwright
    - _Requirements: 1.1, 1.2_
  - [ ] 11.2 Configure artifact upload
    - Upload screenshots/videos on failure
    - _Requirements: 1.4_
  - [ ] 11.3 Configure merge blocking
    - Set required status check
    - _Requirements: 1.2_

- [ ] 12. Test Data Seeding for CI
  - [ ] 12.1 Create seed script for CI
    - Minimal reproducible dataset
    - _Requirements: 4.1_
  - [ ] 12.2 Configure test database in CI
    - Use service container or Supabase project
    - _Requirements: 4.3, 4.4_

- [ ] 13. Checkpoint - CI Complete
  - Create test PR
  - Verify tests run automatically
  - Verify PR blocked on test failure

---

### Phase 4: Documentation & Polish

- [ ] 14. Documentation
  - [ ] 14.1 Update testing.md with E2E guidelines
    - How to write new tests
    - How to run locally
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ] 14.2 Add example test templates
    - _Requirements: 5.5_
  - [ ] 14.3 Document debugging tips
    - _Requirements: 5.3_

- [ ] 15. Final Checkpoint
  - All tests pass locally
  - CI workflow passes
  - Documentation complete
  - Create PR for review

---

## Notes

- **Test execution target**: < 10 minutes for full suite
- **Parallel workers**: 4 (configurable based on CI resources)
- **Phase 2 (Visual Regression)**: Separate issue after Phase 1 complete
- **External API mocking**: Use Playwright's route interception

## Dependencies

- Node.js 18+
- Playwright browsers
- Access to test database (Supabase or local)
