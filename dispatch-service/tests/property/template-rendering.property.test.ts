/**
 * Property-Based Tests for Template Rendering
 *
 * Feature: dispatch-service, Property 15: Template Variable Substitution
 *
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.5**
 *
 * Property 15 from design.md states:
 * "For any template with {{variable}} placeholders and a valid template context,
 * rendering SHALL replace all placeholders with corresponding values. Missing or
 * null values SHALL be replaced with empty strings, never with literal 'undefined'
 * or 'null'."
 *
 * This test verifies:
 * 1. All {{variable}} placeholders are substituted
 * 2. Rendered output contains no literal "undefined" strings
 * 3. Rendered output contains no literal "null" strings
 * 4. Missing/null values are replaced with empty strings
 */

import * as fc from 'fast-check';
import * as path from 'path';
import { TemplateEngine, TemplateContext } from '../../src/core/templates.js';

// Mock the logger to avoid console output during tests
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Feature: dispatch-service, Property 15: Template Variable Substitution', () => {
  let templateEngine: TemplateEngine;
  let templatesDir: string;

  // =============================================================================
  // Arbitrary Generators
  // =============================================================================

  /**
   * Arbitrary generator for non-empty strings that don't contain template syntax.
   * This ensures we generate valid content that won't be confused with template variables.
   */
  const arbitrarySafeString = (minLength = 1, maxLength = 50): fc.Arbitrary<string> =>
    fc.string({ minLength, maxLength }).map((s) =>
      // Remove any characters that could be confused with template syntax
      s.replace(/[{}]/g, '').trim() || 'default'
    );

  /**
   * Arbitrary generator for optional strings (can be empty or have content).
   */
  const arbitraryOptionalString = (): fc.Arbitrary<string> =>
    fc.oneof(fc.constant(''), arbitrarySafeString(1, 30));

  /**
   * Arbitrary generator for positive integers.
   */
  const arbitraryPositiveInt = (): fc.Arbitrary<number> =>
    fc.integer({ min: 0, max: 1000 });

  /**
   * Arbitrary generator for time strings in HH:MM format.
   */
  const arbitraryTimeString = (): fc.Arbitrary<string> =>
    fc
      .record({
        hour: fc.integer({ min: 0, max: 23 }),
        minute: fc.integer({ min: 0, max: 59 }),
      })
      .map(({ hour, minute }) => `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);

  /**
   * Arbitrary generator for date strings in YYYY-MM-DD format.
   */
  const arbitraryDateString = (): fc.Arbitrary<string> =>
    fc
      .record({
        year: fc.integer({ min: 2020, max: 2030 }),
        month: fc.integer({ min: 1, max: 12 }),
        day: fc.integer({ min: 1, max: 28 }),
      })
      .map(
        ({ year, month, day }) =>
          `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      );

  /**
   * Arbitrary generator for ISO timestamp strings.
   */
  const arbitraryIsoTimestamp = (): fc.Arbitrary<string> =>
    fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map((d) => d.toISOString());

  /**
   * Arbitrary generator for route context data.
   * Requirement 7.2: Provide access to route data in templates.
   */
  const arbitraryRouteContext = (): fc.Arbitrary<TemplateContext['route']> =>
    fc.record({
      name: arbitrarySafeString(1, 50),
      code: arbitraryOptionalString(),
      date: arbitraryDateString(),
      plannedStartTime: fc.oneof(arbitraryTimeString(), fc.constant('')),
      plannedEndTime: fc.oneof(arbitraryTimeString(), fc.constant('')),
      totalStops: arbitraryPositiveInt(),
      totalDistanceKm: arbitraryPositiveInt(),
      totalDurationMinutes: arbitraryPositiveInt(),
    });

  /**
   * Arbitrary generator for driver context data.
   * Requirement 7.2: Provide access to driver data in templates.
   */
  const arbitraryDriverContext = (): fc.Arbitrary<TemplateContext['driver']> =>
    fc
      .record({
        firstName: arbitrarySafeString(1, 30),
        lastName: arbitrarySafeString(1, 30),
      })
      .map(({ firstName, lastName }) => ({
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
      }));

  /**
   * Arbitrary generator for vehicle context data (can be null).
   * Requirement 7.2: Provide access to vehicle data in templates.
   */
  const arbitraryVehicleContext = (): fc.Arbitrary<TemplateContext['vehicle']> =>
    fc.option(
      fc.record({
        name: arbitrarySafeString(1, 30),
        licensePlate: arbitraryOptionalString(),
        make: arbitraryOptionalString(),
        model: arbitraryOptionalString(),
      }),
      { nil: null }
    );

  /**
   * Arbitrary generator for a single booking context.
   * Requirement 7.2: Provide access to bookings data in templates.
   */
  const arbitraryBookingContext = (): fc.Arbitrary<TemplateContext['bookings'][0]> =>
    fc.record({
      stopNumber: fc.integer({ min: 1, max: 100 }),
      clientName: arbitrarySafeString(1, 50),
      address: arbitrarySafeString(5, 100),
      scheduledTime: fc.oneof(arbitraryTimeString(), fc.constant('')),
      services: arbitraryOptionalString(),
      specialInstructions: arbitraryOptionalString(),
    });

  /**
   * Arbitrary generator for bookings array.
   */
  const arbitraryBookingsContext = (): fc.Arbitrary<TemplateContext['bookings']> =>
    fc.array(arbitraryBookingContext(), { minLength: 0, maxLength: 10 });

  /**
   * Arbitrary generator for complete template context.
   * Requirement 7.2: Provide access to route, driver, vehicle, and bookings data.
   */
  const arbitraryTemplateContext = (): fc.Arbitrary<TemplateContext> =>
    fc.record({
      route: arbitraryRouteContext(),
      driver: arbitraryDriverContext(),
      vehicle: arbitraryVehicleContext(),
      bookings: arbitraryBookingsContext(),
      dispatchedAt: arbitraryIsoTimestamp(),
    });

  /**
   * Arbitrary generator for template context with some null/undefined values.
   * Used to test Requirement 7.3: Missing/null values replaced with empty strings.
   */
  const arbitraryTemplateContextWithMissingValues = (): fc.Arbitrary<TemplateContext> =>
    fc.record({
      route: fc.record({
        name: arbitrarySafeString(1, 50),
        code: fc.constant(''), // Empty string
        date: arbitraryDateString(),
        plannedStartTime: fc.constant(''), // Empty string
        plannedEndTime: fc.constant(''), // Empty string
        totalStops: arbitraryPositiveInt(),
        totalDistanceKm: fc.constant(0), // Zero value
        totalDurationMinutes: fc.constant(0), // Zero value
      }),
      driver: fc
        .record({
          firstName: arbitrarySafeString(1, 30),
          lastName: fc.constant(''), // Empty last name
        })
        .map(({ firstName, lastName }) => ({
          firstName,
          lastName,
          fullName: firstName.trim(),
        })),
      vehicle: fc.constant(null), // No vehicle
      bookings: fc.constant([]), // No bookings
      dispatchedAt: arbitraryIsoTimestamp(),
    });

  // =============================================================================
  // Setup
  // =============================================================================

  beforeAll(() => {
    // Use the actual templates directory
    templatesDir = path.resolve(__dirname, '../../templates');
  });

  beforeEach(() => {
    templateEngine = new TemplateEngine(templatesDir);
    templateEngine.clearCache();
  });

  // =============================================================================
  // Property Tests
  // =============================================================================

  describe('Requirement 7.1: Variable substitution using {{variable}} syntax', () => {
    /**
     * Property: For any valid template context, the rendered telegram template
     * SHALL have no unsubstituted {{variable}} placeholders.
     */
    it('should substitute all variables in telegram template', () => {
      fc.assert(
        fc.property(arbitraryTemplateContext(), (context) => {
          const rendered = templateEngine.render('telegram.md', context);

          // Check for unsubstituted Handlebars variables (simple {{var}} syntax)
          // Note: We exclude {{#if}}, {{#each}}, {{/if}}, {{/each}} as those are control structures
          const unsubstitutedVars = rendered.match(/\{\{(?!#|\/)[^}]+\}\}/g);

          // Should have no unsubstituted variables
          expect(unsubstitutedVars).toBeNull();

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any valid template context, the rendered email template
     * SHALL have no unsubstituted {{variable}} placeholders.
     */
    it('should substitute all variables in email template', () => {
      fc.assert(
        fc.property(arbitraryTemplateContext(), (context) => {
          const rendered = templateEngine.render('email.html', context);

          // Check for unsubstituted Handlebars variables
          const unsubstitutedVars = rendered.match(/\{\{(?!#|\/)[^}]+\}\}/g);

          // Should have no unsubstituted variables
          expect(unsubstitutedVars).toBeNull();

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Requirement 7.3: Missing/null values replaced with empty strings', () => {
    /**
     * Property: For any template context, the rendered output SHALL NOT contain
     * the literal string "undefined".
     */
    it('should never render literal "undefined" in telegram template', () => {
      fc.assert(
        fc.property(arbitraryTemplateContext(), (context) => {
          const rendered = templateEngine.render('telegram.md', context);

          // Should not contain literal 'undefined'
          expect(rendered).not.toContain('undefined');

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any template context, the rendered output SHALL NOT contain
     * the literal string "null".
     */
    it('should never render literal "null" in telegram template', () => {
      fc.assert(
        fc.property(arbitraryTemplateContext(), (context) => {
          const rendered = templateEngine.render('telegram.md', context);

          // Should not contain literal 'null'
          expect(rendered).not.toContain('null');

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any template context, the rendered email output SHALL NOT
     * contain the literal string "undefined".
     */
    it('should never render literal "undefined" in email template', () => {
      fc.assert(
        fc.property(arbitraryTemplateContext(), (context) => {
          const rendered = templateEngine.render('email.html', context);

          // Should not contain literal 'undefined'
          expect(rendered).not.toContain('undefined');

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any template context, the rendered email output SHALL NOT
     * contain the literal string "null".
     */
    it('should never render literal "null" in email template', () => {
      fc.assert(
        fc.property(arbitraryTemplateContext(), (context) => {
          const rendered = templateEngine.render('email.html', context);

          // Should not contain literal 'null'
          expect(rendered).not.toContain('null');

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any template context with missing/empty values, the rendered
     * output SHALL NOT contain "undefined" or "null" literals.
     */
    it('should handle missing values gracefully in telegram template', () => {
      fc.assert(
        fc.property(arbitraryTemplateContextWithMissingValues(), (context) => {
          const rendered = templateEngine.render('telegram.md', context);

          // Should not contain literal 'undefined' or 'null'
          expect(rendered).not.toContain('undefined');
          expect(rendered).not.toContain('null');

          // Should still contain the required content
          expect(rendered).toContain(context.driver.firstName);
          expect(rendered).toContain(context.route.name);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any template context with missing/empty values, the rendered
     * email output SHALL NOT contain "undefined" or "null" literals.
     */
    it('should handle missing values gracefully in email template', () => {
      fc.assert(
        fc.property(arbitraryTemplateContextWithMissingValues(), (context) => {
          const rendered = templateEngine.render('email.html', context);

          // Should not contain literal 'undefined' or 'null'
          expect(rendered).not.toContain('undefined');
          expect(rendered).not.toContain('null');

          // Should still contain the required content
          expect(rendered).toContain(context.driver.firstName);
          expect(rendered).toContain(context.route.name);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Requirement 7.2: Access to route, driver, vehicle, bookings data', () => {
    /**
     * Property: For any template context with route data, the rendered output
     * SHALL contain the route name.
     */
    it('should include route name in rendered output', () => {
      fc.assert(
        fc.property(arbitraryTemplateContext(), (context) => {
          const rendered = templateEngine.render('telegram.md', context);

          // Route name should appear in the output
          expect(rendered).toContain(context.route.name);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any template context with driver data, the rendered output
     * SHALL contain the driver's full name.
     */
    it('should include driver full name in rendered output', () => {
      fc.assert(
        fc.property(arbitraryTemplateContext(), (context) => {
          const rendered = templateEngine.render('telegram.md', context);

          // Driver full name should appear in the output
          expect(rendered).toContain(context.driver.fullName);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any template context with vehicle data, the rendered output
     * SHALL contain the vehicle name when vehicle is present.
     */
    it('should include vehicle name when vehicle is present', () => {
      fc.assert(
        fc.property(
          arbitraryTemplateContext().filter((ctx) => ctx.vehicle !== null),
          (context) => {
            const rendered = templateEngine.render('telegram.md', context);

            // Vehicle name should appear in the output when vehicle exists
            expect(rendered).toContain(context.vehicle!.name);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any template context with bookings, the rendered output
     * SHALL contain each booking's client name.
     */
    it('should include all booking client names in rendered output', () => {
      fc.assert(
        fc.property(
          arbitraryTemplateContext().filter((ctx) => ctx.bookings.length > 0),
          (context) => {
            const rendered = templateEngine.render('telegram.md', context);

            // Each booking's client name should appear in the output
            for (const booking of context.bookings) {
              expect(rendered).toContain(booking.clientName);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Requirement 7.5: Template parsing and variable substitution', () => {
    /**
     * Property: For any valid template context, the template engine SHALL
     * successfully parse and render the template without throwing errors.
     */
    it('should successfully render telegram template for any valid context', () => {
      fc.assert(
        fc.property(arbitraryTemplateContext(), (context) => {
          // Should not throw
          expect(() => templateEngine.render('telegram.md', context)).not.toThrow();

          const rendered = templateEngine.render('telegram.md', context);

          // Should return a non-empty string
          expect(typeof rendered).toBe('string');
          expect(rendered.length).toBeGreaterThan(0);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any valid template context, the template engine SHALL
     * successfully parse and render the email template without throwing errors.
     */
    it('should successfully render email template for any valid context', () => {
      fc.assert(
        fc.property(arbitraryTemplateContext(), (context) => {
          // Should not throw
          expect(() => templateEngine.render('email.html', context)).not.toThrow();

          const rendered = templateEngine.render('email.html', context);

          // Should return a non-empty string
          expect(typeof rendered).toBe('string');
          expect(rendered.length).toBeGreaterThan(0);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any template context, the dispatchedAt timestamp SHALL
     * appear in the rendered output.
     */
    it('should include dispatchedAt timestamp in rendered output', () => {
      fc.assert(
        fc.property(arbitraryTemplateContext(), (context) => {
          const rendered = templateEngine.render('telegram.md', context);

          // dispatchedAt should appear in the output
          expect(rendered).toContain(context.dispatchedAt);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge cases for template variable substitution', () => {
    /**
     * Property: For any template context with empty bookings array,
     * the rendered output SHALL NOT contain "undefined" or "null".
     */
    it('should handle empty bookings array without errors', () => {
      fc.assert(
        fc.property(
          arbitraryTemplateContext().map((ctx) => ({ ...ctx, bookings: [] })),
          (context) => {
            const rendered = templateEngine.render('telegram.md', context);

            expect(rendered).not.toContain('undefined');
            expect(rendered).not.toContain('null');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any template context with null vehicle,
     * the rendered output SHALL NOT contain "undefined" or "null".
     */
    it('should handle null vehicle without errors', () => {
      fc.assert(
        fc.property(
          arbitraryTemplateContext().map((ctx) => ({ ...ctx, vehicle: null })),
          (context) => {
            const rendered = templateEngine.render('telegram.md', context);

            expect(rendered).not.toContain('undefined');
            expect(rendered).not.toContain('null');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any template context with zero values for numeric fields,
     * the rendered output SHALL contain "0" (not "undefined" or "null").
     */
    it('should render zero values as "0" not as undefined/null', () => {
      fc.assert(
        fc.property(
          arbitraryTemplateContext().map((ctx) => ({
            ...ctx,
            route: {
              ...ctx.route,
              totalStops: 0,
              totalDistanceKm: 0,
              totalDurationMinutes: 0,
            },
          })),
          (context) => {
            const rendered = templateEngine.render('telegram.md', context);

            expect(rendered).not.toContain('undefined');
            expect(rendered).not.toContain('null');
            // Zero should be rendered as "0"
            expect(rendered).toContain('0');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


/**
 * Property-Based Tests for Channel-Specific Templates
 *
 * Feature: dispatch-service, Property 16: Channel-Specific Templates
 *
 * **Validates: Requirements 7.4**
 *
 * Property 16 from design.md states:
 * "For any channel type, the template engine SHALL load and use the channel-specific
 * template file (telegram.md for Telegram, email.html for Email)."
 *
 * This test verifies:
 * 1. Telegram channel uses telegram.md template (Markdown formatting)
 * 2. Email channel uses email.html template (HTML formatting)
 * 3. Unsupported channels throw appropriate errors
 */

describe('Feature: dispatch-service, Property 16: Channel-Specific Templates', () => {
  let templateEngine: TemplateEngine;
  let templatesDir: string;

  // =============================================================================
  // Arbitrary Generators (reused from Property 15)
  // =============================================================================

  /**
   * Arbitrary generator for non-empty strings that don't contain template syntax.
   */
  const arbitrarySafeString = (minLength = 1, maxLength = 50): fc.Arbitrary<string> =>
    fc.string({ minLength, maxLength }).map((s) =>
      s.replace(/[{}]/g, '').trim() || 'default'
    );

  /**
   * Arbitrary generator for optional strings.
   */
  const arbitraryOptionalString = (): fc.Arbitrary<string> =>
    fc.oneof(fc.constant(''), arbitrarySafeString(1, 30));

  /**
   * Arbitrary generator for positive integers.
   */
  const arbitraryPositiveInt = (): fc.Arbitrary<number> =>
    fc.integer({ min: 0, max: 1000 });

  /**
   * Arbitrary generator for time strings in HH:MM format.
   */
  const arbitraryTimeString = (): fc.Arbitrary<string> =>
    fc
      .record({
        hour: fc.integer({ min: 0, max: 23 }),
        minute: fc.integer({ min: 0, max: 59 }),
      })
      .map(({ hour, minute }) => `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);

  /**
   * Arbitrary generator for date strings in YYYY-MM-DD format.
   */
  const arbitraryDateString = (): fc.Arbitrary<string> =>
    fc
      .record({
        year: fc.integer({ min: 2020, max: 2030 }),
        month: fc.integer({ min: 1, max: 12 }),
        day: fc.integer({ min: 1, max: 28 }),
      })
      .map(
        ({ year, month, day }) =>
          `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      );

  /**
   * Arbitrary generator for ISO timestamp strings.
   */
  const arbitraryIsoTimestamp = (): fc.Arbitrary<string> =>
    fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map((d) => d.toISOString());

  /**
   * Arbitrary generator for route context data.
   */
  const arbitraryRouteContext = (): fc.Arbitrary<TemplateContext['route']> =>
    fc.record({
      name: arbitrarySafeString(1, 50),
      code: arbitraryOptionalString(),
      date: arbitraryDateString(),
      plannedStartTime: fc.oneof(arbitraryTimeString(), fc.constant('')),
      plannedEndTime: fc.oneof(arbitraryTimeString(), fc.constant('')),
      totalStops: arbitraryPositiveInt(),
      totalDistanceKm: arbitraryPositiveInt(),
      totalDurationMinutes: arbitraryPositiveInt(),
    });

  /**
   * Arbitrary generator for driver context data.
   */
  const arbitraryDriverContext = (): fc.Arbitrary<TemplateContext['driver']> =>
    fc
      .record({
        firstName: arbitrarySafeString(1, 30),
        lastName: arbitrarySafeString(1, 30),
      })
      .map(({ firstName, lastName }) => ({
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
      }));

  /**
   * Arbitrary generator for vehicle context data (can be null).
   */
  const arbitraryVehicleContext = (): fc.Arbitrary<TemplateContext['vehicle']> =>
    fc.option(
      fc.record({
        name: arbitrarySafeString(1, 30),
        licensePlate: arbitraryOptionalString(),
        make: arbitraryOptionalString(),
        model: arbitraryOptionalString(),
      }),
      { nil: null }
    );

  /**
   * Arbitrary generator for a single booking context.
   */
  const arbitraryBookingContext = (): fc.Arbitrary<TemplateContext['bookings'][0]> =>
    fc.record({
      stopNumber: fc.integer({ min: 1, max: 100 }),
      clientName: arbitrarySafeString(1, 50),
      address: arbitrarySafeString(5, 100),
      scheduledTime: fc.oneof(arbitraryTimeString(), fc.constant('')),
      services: arbitraryOptionalString(),
      specialInstructions: arbitraryOptionalString(),
    });

  /**
   * Arbitrary generator for bookings array.
   */
  const arbitraryBookingsContext = (): fc.Arbitrary<TemplateContext['bookings']> =>
    fc.array(arbitraryBookingContext(), { minLength: 1, maxLength: 10 });

  /**
   * Arbitrary generator for complete template context.
   */
  const arbitraryTemplateContext = (): fc.Arbitrary<TemplateContext> =>
    fc.record({
      route: arbitraryRouteContext(),
      driver: arbitraryDriverContext(),
      vehicle: arbitraryVehicleContext(),
      bookings: arbitraryBookingsContext(),
      dispatchedAt: arbitraryIsoTimestamp(),
    });

  // =============================================================================
  // Setup
  // =============================================================================

  beforeAll(() => {
    templatesDir = path.resolve(__dirname, '../../templates');
  });

  beforeEach(() => {
    templateEngine = new TemplateEngine(templatesDir);
    templateEngine.clearCache();
  });

  // =============================================================================
  // Property Tests for Channel-Specific Templates
  // =============================================================================

  describe('Requirement 7.4: Channel-specific templates', () => {
    /**
     * Property: For any template context, the telegram channel SHALL use
     * telegram.md template and produce Markdown-formatted output.
     *
     * Markdown indicators include:
     * - Bold text using **text** syntax
     * - Italic text using _text_ syntax
     * - No HTML tags (except possibly in content)
     */
    it('should use telegram.md template with Markdown formatting for telegram channel', () => {
      fc.assert(
        fc.property(arbitraryTemplateContext(), (context) => {
          const rendered = templateEngine.renderForChannel('telegram', context);

          // Telegram template should use Markdown formatting
          // Check for Markdown bold syntax (**text**)
          expect(rendered).toMatch(/\*\*[^*]+\*\*/);

          // Should NOT contain HTML structural tags (telegram uses Markdown, not HTML)
          expect(rendered).not.toMatch(/<html/i);
          expect(rendered).not.toMatch(/<body/i);
          expect(rendered).not.toMatch(/<div/i);
          expect(rendered).not.toMatch(/<style/i);

          // Should contain expected content from context
          expect(rendered).toContain(context.driver.fullName);
          expect(rendered).toContain(context.route.name);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any template context, the email channel SHALL use
     * email.html template and produce HTML-formatted output.
     *
     * HTML indicators include:
     * - DOCTYPE declaration
     * - <html>, <head>, <body> tags
     * - <style> or inline styles
     * - <div>, <span>, <p> tags
     */
    it('should use email.html template with HTML formatting for email channel', () => {
      fc.assert(
        fc.property(arbitraryTemplateContext(), (context) => {
          const rendered = templateEngine.renderForChannel('email', context);

          // Email template should use HTML formatting
          // Check for HTML structure
          expect(rendered).toMatch(/<!DOCTYPE html>/i);
          expect(rendered).toMatch(/<html/i);
          expect(rendered).toMatch(/<head/i);
          expect(rendered).toMatch(/<body/i);
          expect(rendered).toMatch(/<\/html>/i);

          // Should contain CSS styling
          expect(rendered).toMatch(/<style/i);

          // Should contain HTML structural elements
          expect(rendered).toMatch(/<div/i);

          // Should contain expected content from context
          expect(rendered).toContain(context.driver.fullName);
          expect(rendered).toContain(context.route.name);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any template context, the telegram template output
     * SHALL be distinct from the email template output in format.
     */
    it('should produce different output formats for telegram vs email channels', () => {
      fc.assert(
        fc.property(arbitraryTemplateContext(), (context) => {
          const telegramOutput = templateEngine.renderForChannel('telegram', context);
          const emailOutput = templateEngine.renderForChannel('email', context);

          // Outputs should be different (different templates)
          expect(telegramOutput).not.toEqual(emailOutput);

          // Telegram should be shorter (no HTML boilerplate)
          expect(telegramOutput.length).toBeLessThan(emailOutput.length);

          // Both should contain the same core data
          expect(telegramOutput).toContain(context.driver.fullName);
          expect(emailOutput).toContain(context.driver.fullName);
          expect(telegramOutput).toContain(context.route.name);
          expect(emailOutput).toContain(context.route.name);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any template context, the template engine SHALL correctly
     * map channel types to their respective template files.
     */
    it('should correctly map telegram channel to telegram.md template', () => {
      fc.assert(
        fc.property(arbitraryTemplateContext(), (context) => {
          // renderForChannel('telegram', ...) should be equivalent to render('telegram.md', ...)
          const viaChannel = templateEngine.renderForChannel('telegram', context);
          const viaDirect = templateEngine.render('telegram.md', context);

          expect(viaChannel).toEqual(viaDirect);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any template context, the template engine SHALL correctly
     * map email channel to email.html template.
     */
    it('should correctly map email channel to email.html template', () => {
      fc.assert(
        fc.property(arbitraryTemplateContext(), (context) => {
          // renderForChannel('email', ...) should be equivalent to render('email.html', ...)
          const viaChannel = templateEngine.renderForChannel('email', context);
          const viaDirect = templateEngine.render('email.html', context);

          expect(viaChannel).toEqual(viaDirect);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any template context, the hasTemplate method SHALL return
     * true for supported channels (telegram, email) and false for unsupported ones.
     */
    it('should report template availability correctly for supported channels', () => {
      fc.assert(
        fc.property(arbitraryTemplateContext(), () => {
          // Supported channels should have templates
          expect(templateEngine.hasTemplate('telegram')).toBe(true);
          expect(templateEngine.hasTemplate('email')).toBe(true);

          // Unsupported channels (sms, push) should not have templates
          // (templates not created for MVP)
          expect(templateEngine.hasTemplate('sms')).toBe(false);
          expect(templateEngine.hasTemplate('push')).toBe(false);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any template context, the getTemplates method SHALL return
     * the correct template file name for each supported channel.
     */
    it('should return correct template names for supported channels', () => {
      fc.assert(
        fc.property(arbitraryTemplateContext(), () => {
          // Telegram should return telegram.md
          const telegramTemplates = templateEngine.getTemplates('telegram');
          expect(telegramTemplates).toContain('telegram.md');

          // Email should return email.html
          const emailTemplates = templateEngine.getTemplates('email');
          expect(emailTemplates).toContain('email.html');

          // Unsupported channels should return empty array
          const smsTemplates = templateEngine.getTemplates('sms');
          expect(smsTemplates).toEqual([]);

          const pushTemplates = templateEngine.getTemplates('push');
          expect(pushTemplates).toEqual([]);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Unsupported channel error handling', () => {
    /**
     * Property: For any unsupported channel type without a template file,
     * the template engine SHALL throw an appropriate error.
     */
    it('should throw error for channels without template files', () => {
      fc.assert(
        fc.property(arbitraryTemplateContext(), (context) => {
          // SMS and Push channels don't have template files in MVP
          // Attempting to render should throw an error
          expect(() => templateEngine.renderForChannel('sms', context)).toThrow(
            /Template not found/
          );
          expect(() => templateEngine.renderForChannel('push', context)).toThrow(
            /Template not found/
          );

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any non-existent template file, the template engine
     * SHALL throw an error with a descriptive message.
     */
    it('should throw descriptive error for non-existent template files', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).map((s) => `${s.replace(/[^a-z]/gi, 'x')}.txt`),
          (randomTemplateName) => {
            const context: TemplateContext = {
              route: {
                name: 'Test Route',
                code: 'TR001',
                date: '2024-01-15',
                plannedStartTime: '09:00',
                plannedEndTime: '17:00',
                totalStops: 5,
                totalDistanceKm: 50,
                totalDurationMinutes: 480,
              },
              driver: {
                firstName: 'John',
                lastName: 'Doe',
                fullName: 'John Doe',
              },
              vehicle: null,
              bookings: [],
              dispatchedAt: new Date().toISOString(),
            };

            // Non-existent templates should throw
            expect(() => templateEngine.render(randomTemplateName, context)).toThrow(
              /Template not found/
            );

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Template content format verification', () => {
    /**
     * Property: For any template context with bookings, the telegram template
     * SHALL render bookings with Markdown list formatting.
     */
    it('should render telegram bookings with Markdown formatting', () => {
      fc.assert(
        fc.property(
          arbitraryTemplateContext().filter((ctx) => ctx.bookings.length > 0),
          (context) => {
            const rendered = templateEngine.renderForChannel('telegram', context);

            // Each booking should have its stop number rendered
            for (const booking of context.bookings) {
              expect(rendered).toContain(booking.clientName);
              expect(rendered).toContain(booking.address);
            }

            // Should use emoji indicators (Markdown-friendly)
            expect(rendered).toMatch(/📍|📋|📅|⏰|🚚|🚗/);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any template context with bookings, the email template
     * SHALL render bookings with HTML card formatting.
     */
    it('should render email bookings with HTML card formatting', () => {
      fc.assert(
        fc.property(
          arbitraryTemplateContext().filter((ctx) => ctx.bookings.length > 0),
          (context) => {
            const rendered = templateEngine.renderForChannel('email', context);

            // Each booking should be rendered
            for (const booking of context.bookings) {
              expect(rendered).toContain(booking.clientName);
              expect(rendered).toContain(booking.address);
            }

            // Should use HTML class names for styling
            expect(rendered).toMatch(/class="booking-card"/);
            expect(rendered).toMatch(/class="stop-number"/);
            expect(rendered).toMatch(/class="client-name"/);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any template context with a vehicle, the telegram template
     * SHALL include vehicle information with Markdown formatting.
     */
    it('should include vehicle info in telegram template when present', () => {
      fc.assert(
        fc.property(
          arbitraryTemplateContext().filter((ctx) => ctx.vehicle !== null),
          (context) => {
            const rendered = templateEngine.renderForChannel('telegram', context);

            // Vehicle name should be present
            expect(rendered).toContain(context.vehicle!.name);

            // Should use vehicle emoji
            expect(rendered).toMatch(/🚗/);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any template context with a vehicle, the email template
     * SHALL include vehicle information in a styled section.
     */
    it('should include vehicle info in email template when present', () => {
      fc.assert(
        fc.property(
          arbitraryTemplateContext().filter((ctx) => ctx.vehicle !== null),
          (context) => {
            const rendered = templateEngine.renderForChannel('email', context);

            // Vehicle name should be present
            expect(rendered).toContain(context.vehicle!.name);

            // Should have vehicle info section with styling
            expect(rendered).toMatch(/class="vehicle-info"/);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
