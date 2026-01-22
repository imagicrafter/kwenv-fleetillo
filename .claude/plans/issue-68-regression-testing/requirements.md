# Requirements: Issue #68 - Implement Robust Regression Testing

## Introduction

This document defines the requirements for implementing a comprehensive regression testing strategy for the Fleetillo application. The motivation stems from issue #57, where UI regressions in the Locations list and Edit Modal were discovered after the Client → Customer terminology refactor (#14). These regressions were not caught before merge, indicating a critical gap in the testing strategy.

The goal is to establish automated testing infrastructure that catches UI breaks before they reach production, runs on every pull request, and provides fast feedback to developers. This aligns with the project's quality standards and will serve as a foundation for ongoing development.

## Glossary

- **E2E Testing**: End-to-end testing that simulates real user interactions through the full application stack
- **Visual Regression**: Detecting unintended visual changes by comparing screenshots against baseline images
- **Playwright**: A modern browser automation framework recommended for E2E testing
- **CI/CD**: Continuous Integration/Continuous Deployment pipeline (GitHub Actions)
- **Test Isolation**: Ensuring tests don't affect each other through shared state

## Requirements

### Requirement 1: E2E Test Infrastructure

**User Story:** As a developer, I want automated E2E tests that run on every PR, so that UI regressions are caught before merge.

#### Acceptance Criteria

1. WHEN a developer opens a pull request, THE system SHALL automatically run E2E tests via GitHub Actions
2. WHEN any E2E test fails, THE system SHALL block the PR from merging and display clear failure messages
3. WHEN tests complete, THE system SHALL provide test results summary with pass/fail counts
4. IF a test fails, THEN THE system SHALL capture screenshots and/or video recordings for debugging
5. THE test suite SHALL complete execution in under 10 minutes for standard PR workflows

### Requirement 2: Critical Path Test Coverage

**User Story:** As a quality assurance process, I want critical user workflows to have E2E test coverage, so that core functionality is always verified.

#### Acceptance Criteria

1. THE system SHALL have E2E tests covering Customer CRUD operations (create, read, update, delete)
2. THE system SHALL have E2E tests covering Location CRUD operations including customer assignment
3. THE system SHALL have E2E tests covering the Booking/Route creation workflow
4. THE system SHALL have E2E tests for form field population in edit modals
5. THE system SHALL have E2E tests for navigation between primary views (Dashboard, Calendar, Dispatch)
6. WHEN a form modal opens in edit mode, THE test SHALL verify all fields are correctly populated

### Requirement 3: Regression-Prone Area Coverage

**User Story:** As a developer, I want specific tests for known regression-prone areas, so that previously fixed bugs don't recur.

#### Acceptance Criteria

1. THE system SHALL have tests verifying terminology consistency (Customer vs Client)
2. THE system SHALL have tests for foreign key relationships (customer_id displays correct customer name)
3. THE system SHALL have tests for tag/metadata display across views
4. WHEN the Locations list loads, THE test SHALL verify customer names appear correctly (not "Unknown")
5. WHEN the Edit Location modal opens, THE test SHALL verify the customer dropdown shows the correct selection

### Requirement 4: Test Data Management

**User Story:** As a test framework, I want consistent test data management, so that tests are reliable and reproducible.

#### Acceptance Criteria

1. THE system SHALL seed the test database with realistic sample data before test runs
2. THE system SHALL isolate test data to prevent cross-test interference
3. WHEN tests run against external APIs (Google Places, Telegram), THE system SHALL use mocks or stubs
4. THE system SHALL support resetting database state between test suites
5. IF test data is modified, THEN subsequent tests SHALL not be affected by those modifications

### Requirement 5: Developer Experience

**User Story:** As a developer, I want clear documentation and easy test execution, so that I can write and run tests efficiently.

#### Acceptance Criteria

1. THE system SHALL provide documented guidelines for writing new E2E tests
2. THE system SHALL support running tests locally with a single command
3. WHEN a test fails locally, THE system SHALL provide clear error messages and debugging steps
4. THE system SHALL provide commands to run specific test files or test suites
5. THE system SHALL include example tests as templates for common scenarios

### Requirement 6: Visual Regression Testing (Phase 2)

**User Story:** As a quality process, I want visual regression detection, so that unintended styling changes are caught automatically.

#### Acceptance Criteria

1. THE system SHALL capture baseline screenshots for key pages after successful tests
2. WHEN a PR introduces visual changes, THE system SHALL compare against baseline screenshots
3. IF visual differences exceed threshold, THE system SHALL flag the PR for visual review
4. THE system SHALL allow developers to update baseline images when changes are intentional
5. THE system SHALL integrate visual regression reports into the PR review workflow
