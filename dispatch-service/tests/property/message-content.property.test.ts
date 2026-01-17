/**
 * Property-Based Tests for Message Content
 *
 * Feature: dispatch-service, Property 11: Telegram Message Content
 * Feature: dispatch-service, Property 12: Email Message Content
 *
 * **Validates: Requirements 4.5, 4.6, 5.5, 5.6**
 *
 * Property 11 from design.md states:
 * "For any dispatch context with route, driver, and bookings data, the rendered
 * Telegram message SHALL contain: route date, planned start time, total stops count,
 * and at least one booking summary. The message SHALL use Markdown formatting."
 *
 * Property 12 from design.md states:
 * "For any dispatch context with route, driver, vehicle, and bookings data, the
 * rendered email SHALL contain: route name, route date, vehicle information (if
 * assigned), and complete booking list with addresses and scheduled times. The
 * email SHALL use HTML formatting."
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

describe('Feature: dispatch-service, Property 11: Telegram Message Content', () => {
  let templateEngine: TemplateEngine;
  let templatesDir: string;

  // =============================================================================
  // Arbitrary Generators
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
    fc.integer({ min: 1, max: 1000 });

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
   * Arbitrary generator for route context data with required fields for Telegram.
   * Requirement 4.6: Include route date, start time, total stops.
   */
  const arbitraryRouteContext = (): fc.Arbitrary<TemplateContext['route']> =>
    fc.record({
      name: arbitrarySafeString(1, 50),
      code: arbitraryOptionalString(),
      date: arbitraryDateString(),
      plannedStartTime: arbitraryTimeString(),
      plannedEndTime: fc.oneof(arbitraryTimeString(), fc.constant('')),
      totalStops: arbitraryPositiveInt(),
      totalDistanceKm: fc.integer({ min: 0, max: 500 }),
      totalDurationMinutes: fc.integer({ min: 0, max: 600 }),
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
   * Requirement 4.6: Include booking summaries with client names and addresses.
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
   * Arbitrary generator for bookings array with at least one booking.
   * Property 11 requires at least one booking summary.
   */
  const arbitraryBookingsContext = (): fc.Arbitrary<TemplateContext['bookings']> =>
    fc.array(arbitraryBookingContext(), { minLength: 1, maxLength: 20 });

  /**
   * Arbitrary generator for complete template context for Telegram.
   * Ensures route, driver, and bookings data are present.
   */
  const arbitraryTelegramContext = (): fc.Arbitrary<TemplateContext> =>
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
  // Property Tests for Telegram Message Content
  // =============================================================================

  describe('Requirement 4.5: Telegram message uses Markdown formatting', () => {
    /**
     * Property: For any dispatch context, the rendered Telegram message
     * SHALL use Markdown formatting.
     *
     * Markdown indicators include:
     * - Bold text using **text** syntax
     * - Italic text using _text_ syntax
     */
    it('should use Markdown formatting in Telegram messages', () => {
      fc.assert(
        fc.property(arbitraryTelegramContext(), (context) => {
          const rendered = templateEngine.renderForChannel('telegram', context);

          // Telegram template should use Markdown bold syntax (**text**)
          expect(rendered).toMatch(/\*\*[^*]+\*\*/);

          // Should NOT contain HTML structural tags
          expect(rendered).not.toMatch(/<html/i);
          expect(rendered).not.toMatch(/<body/i);
          expect(rendered).not.toMatch(/<div/i);
          expect(rendered).not.toMatch(/<style/i);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any dispatch context, the Telegram message SHALL
     * contain Markdown-formatted headers/labels.
     */
    it('should contain Markdown-formatted labels for route information', () => {
      fc.assert(
        fc.property(arbitraryTelegramContext(), (context) => {
          const rendered = templateEngine.renderForChannel('telegram', context);

          // Should contain Markdown bold labels
          expect(rendered).toMatch(/\*\*Route.*\*\*/i);
          expect(rendered).toMatch(/\*\*Date.*\*\*/i);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Requirement 4.6: Telegram message includes required route information', () => {
    /**
     * Property: For any dispatch context with route data, the rendered
     * Telegram message SHALL contain the route date.
     */
    it('should contain route date in Telegram message', () => {
      fc.assert(
        fc.property(arbitraryTelegramContext(), (context) => {
          const rendered = templateEngine.renderForChannel('telegram', context);

          // Route date should appear in the output
          expect(rendered).toContain(context.route.date);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any dispatch context with route data, the rendered
     * Telegram message SHALL contain the planned start time.
     */
    it('should contain planned start time in Telegram message', () => {
      fc.assert(
        fc.property(arbitraryTelegramContext(), (context) => {
          const rendered = templateEngine.renderForChannel('telegram', context);

          // Planned start time should appear in the output
          expect(rendered).toContain(context.route.plannedStartTime);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any dispatch context with route data, the rendered
     * Telegram message SHALL contain the total stops count.
     */
    it('should contain total stops count in Telegram message', () => {
      fc.assert(
        fc.property(arbitraryTelegramContext(), (context) => {
          const rendered = templateEngine.renderForChannel('telegram', context);

          // Total stops should appear in the output
          expect(rendered).toContain(String(context.route.totalStops));

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any dispatch context with bookings, the rendered
     * Telegram message SHALL contain at least one booking summary.
     */
    it('should contain at least one booking summary in Telegram message', () => {
      fc.assert(
        fc.property(arbitraryTelegramContext(), (context) => {
          const rendered = templateEngine.renderForChannel('telegram', context);

          // At least one booking's client name should appear
          const hasAtLeastOneBooking = context.bookings.some(
            (booking) => rendered.includes(booking.clientName)
          );
          expect(hasAtLeastOneBooking).toBe(true);

          // At least one booking's address should appear
          const hasAtLeastOneAddress = context.bookings.some(
            (booking) => rendered.includes(booking.address)
          );
          expect(hasAtLeastOneAddress).toBe(true);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any dispatch context with multiple bookings, the rendered
     * Telegram message SHALL contain all booking summaries.
     */
    it('should contain all booking summaries in Telegram message', () => {
      fc.assert(
        fc.property(arbitraryTelegramContext(), (context) => {
          const rendered = templateEngine.renderForChannel('telegram', context);

          // All bookings should be included
          for (const booking of context.bookings) {
            expect(rendered).toContain(booking.clientName);
            expect(rendered).toContain(booking.address);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Telegram message content completeness', () => {
    /**
     * Property: For any dispatch context, the Telegram message SHALL
     * contain the driver's name.
     */
    it('should contain driver name in Telegram message', () => {
      fc.assert(
        fc.property(arbitraryTelegramContext(), (context) => {
          const rendered = templateEngine.renderForChannel('telegram', context);

          expect(rendered).toContain(context.driver.fullName);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any dispatch context with vehicle data, the Telegram
     * message SHALL contain vehicle information when present.
     */
    it('should contain vehicle information when vehicle is assigned', () => {
      fc.assert(
        fc.property(
          arbitraryTelegramContext().filter((ctx) => ctx.vehicle !== null),
          (context) => {
            const rendered = templateEngine.renderForChannel('telegram', context);

            // Vehicle name should appear when vehicle is assigned
            expect(rendered).toContain(context.vehicle!.name);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any dispatch context, the Telegram message SHALL
     * contain stop numbers for bookings.
     */
    it('should contain stop numbers for bookings', () => {
      fc.assert(
        fc.property(arbitraryTelegramContext(), (context) => {
          const rendered = templateEngine.renderForChannel('telegram', context);

          // Stop numbers should appear
          for (const booking of context.bookings) {
            expect(rendered).toContain(String(booking.stopNumber));
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});


describe('Feature: dispatch-service, Property 12: Email Message Content', () => {
  let templateEngine: TemplateEngine;
  let templatesDir: string;

  // =============================================================================
  // Arbitrary Generators
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
    fc.integer({ min: 1, max: 1000 });

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
      plannedStartTime: arbitraryTimeString(),
      plannedEndTime: fc.oneof(arbitraryTimeString(), fc.constant('')),
      totalStops: arbitraryPositiveInt(),
      totalDistanceKm: fc.integer({ min: 0, max: 500 }),
      totalDurationMinutes: fc.integer({ min: 0, max: 600 }),
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
   * Arbitrary generator for vehicle context data (always present for email tests).
   * Requirement 5.6: Include vehicle info in email.
   */
  const arbitraryVehicleContext = (): fc.Arbitrary<TemplateContext['vehicle']> =>
    fc.record({
      name: arbitrarySafeString(1, 30),
      licensePlate: arbitrarySafeString(5, 10),
      make: arbitrarySafeString(1, 20),
      model: arbitrarySafeString(1, 20),
    });

  /**
   * Arbitrary generator for optional vehicle context (can be null).
   */
  const arbitraryOptionalVehicleContext = (): fc.Arbitrary<TemplateContext['vehicle']> =>
    fc.option(arbitraryVehicleContext(), { nil: null });

  /**
   * Arbitrary generator for a single booking context with scheduled time.
   * Requirement 5.6: Include addresses and scheduled times.
   */
  const arbitraryBookingContext = (): fc.Arbitrary<TemplateContext['bookings'][0]> =>
    fc.record({
      stopNumber: fc.integer({ min: 1, max: 100 }),
      clientName: arbitrarySafeString(1, 50),
      address: arbitrarySafeString(5, 100),
      scheduledTime: arbitraryTimeString(),
      services: arbitraryOptionalString(),
      specialInstructions: arbitraryOptionalString(),
    });

  /**
   * Arbitrary generator for bookings array with at least one booking.
   */
  const arbitraryBookingsContext = (): fc.Arbitrary<TemplateContext['bookings']> =>
    fc.array(arbitraryBookingContext(), { minLength: 1, maxLength: 20 });

  /**
   * Arbitrary generator for complete template context for Email with vehicle.
   * Ensures route, driver, vehicle, and bookings data are present.
   */
  const arbitraryEmailContextWithVehicle = (): fc.Arbitrary<TemplateContext> =>
    fc.record({
      route: arbitraryRouteContext(),
      driver: arbitraryDriverContext(),
      vehicle: arbitraryVehicleContext(),
      bookings: arbitraryBookingsContext(),
      dispatchedAt: arbitraryIsoTimestamp(),
    });

  /**
   * Arbitrary generator for complete template context for Email (vehicle optional).
   */
  const arbitraryEmailContext = (): fc.Arbitrary<TemplateContext> =>
    fc.record({
      route: arbitraryRouteContext(),
      driver: arbitraryDriverContext(),
      vehicle: arbitraryOptionalVehicleContext(),
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
  // Property Tests for Email Message Content
  // =============================================================================

  describe('Requirement 5.5: Email uses HTML formatting', () => {
    /**
     * Property: For any dispatch context, the rendered email
     * SHALL use HTML formatting.
     *
     * HTML indicators include:
     * - DOCTYPE declaration
     * - <html>, <head>, <body> tags
     * - <style> or inline styles
     * - <div> tags
     */
    it('should use HTML formatting in email messages', () => {
      fc.assert(
        fc.property(arbitraryEmailContext(), (context) => {
          const rendered = templateEngine.renderForChannel('email', context);

          // Email template should use HTML formatting
          expect(rendered).toMatch(/<!DOCTYPE html>/i);
          expect(rendered).toMatch(/<html/i);
          expect(rendered).toMatch(/<head/i);
          expect(rendered).toMatch(/<body/i);
          expect(rendered).toMatch(/<\/html>/i);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any dispatch context, the email SHALL contain
     * CSS styling for professional appearance.
     */
    it('should contain CSS styling in email messages', () => {
      fc.assert(
        fc.property(arbitraryEmailContext(), (context) => {
          const rendered = templateEngine.renderForChannel('email', context);

          // Should contain CSS styling
          expect(rendered).toMatch(/<style/i);

          // Should contain HTML structural elements
          expect(rendered).toMatch(/<div/i);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Requirement 5.6: Email includes complete route details', () => {
    /**
     * Property: For any dispatch context, the rendered email
     * SHALL contain the route name.
     */
    it('should contain route name in email message', () => {
      fc.assert(
        fc.property(arbitraryEmailContext(), (context) => {
          const rendered = templateEngine.renderForChannel('email', context);

          expect(rendered).toContain(context.route.name);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any dispatch context, the rendered email
     * SHALL contain the route date.
     */
    it('should contain route date in email message', () => {
      fc.assert(
        fc.property(arbitraryEmailContext(), (context) => {
          const rendered = templateEngine.renderForChannel('email', context);

          expect(rendered).toContain(context.route.date);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any dispatch context with vehicle data, the rendered
     * email SHALL contain vehicle information.
     */
    it('should contain vehicle information when vehicle is assigned', () => {
      fc.assert(
        fc.property(arbitraryEmailContextWithVehicle(), (context) => {
          const rendered = templateEngine.renderForChannel('email', context);

          // Vehicle name should appear
          expect(rendered).toContain(context.vehicle!.name);

          // License plate should appear if provided
          if (context.vehicle!.licensePlate) {
            expect(rendered).toContain(context.vehicle!.licensePlate);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any dispatch context with vehicle make/model, the rendered
     * email SHALL contain vehicle make and model information.
     */
    it('should contain vehicle make and model when provided', () => {
      fc.assert(
        fc.property(
          arbitraryEmailContextWithVehicle().filter(
            (ctx) => ctx.vehicle !== null && ctx.vehicle.make !== '' && ctx.vehicle.model !== ''
          ),
          (context) => {
            const rendered = templateEngine.renderForChannel('email', context);

            // Make and model should appear
            expect(rendered).toContain(context.vehicle!.make);
            expect(rendered).toContain(context.vehicle!.model);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any dispatch context with bookings, the rendered email
     * SHALL contain the complete booking list with addresses.
     */
    it('should contain complete booking list with addresses', () => {
      fc.assert(
        fc.property(arbitraryEmailContext(), (context) => {
          const rendered = templateEngine.renderForChannel('email', context);

          // All bookings should be included with addresses
          for (const booking of context.bookings) {
            expect(rendered).toContain(booking.clientName);
            expect(rendered).toContain(booking.address);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any dispatch context with bookings that have scheduled times,
     * the rendered email SHALL contain the scheduled times.
     */
    it('should contain scheduled times for bookings', () => {
      fc.assert(
        fc.property(arbitraryEmailContext(), (context) => {
          const rendered = templateEngine.renderForChannel('email', context);

          // Scheduled times should appear for bookings that have them
          for (const booking of context.bookings) {
            if (booking.scheduledTime) {
              expect(rendered).toContain(booking.scheduledTime);
            }
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Email message content completeness', () => {
    /**
     * Property: For any dispatch context, the email SHALL
     * contain the driver's name.
     */
    it('should contain driver name in email message', () => {
      fc.assert(
        fc.property(arbitraryEmailContext(), (context) => {
          const rendered = templateEngine.renderForChannel('email', context);

          expect(rendered).toContain(context.driver.fullName);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any dispatch context, the email SHALL
     * contain the total stops count.
     */
    it('should contain total stops count in email message', () => {
      fc.assert(
        fc.property(arbitraryEmailContext(), (context) => {
          const rendered = templateEngine.renderForChannel('email', context);

          expect(rendered).toContain(String(context.route.totalStops));

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any dispatch context, the email SHALL
     * contain the planned start time.
     */
    it('should contain planned start time in email message', () => {
      fc.assert(
        fc.property(arbitraryEmailContext(), (context) => {
          const rendered = templateEngine.renderForChannel('email', context);

          expect(rendered).toContain(context.route.plannedStartTime);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any dispatch context, the email SHALL
     * contain stop numbers for bookings.
     */
    it('should contain stop numbers for bookings in email', () => {
      fc.assert(
        fc.property(arbitraryEmailContext(), (context) => {
          const rendered = templateEngine.renderForChannel('email', context);

          // Stop numbers should appear
          for (const booking of context.bookings) {
            expect(rendered).toContain(String(booking.stopNumber));
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any dispatch context, the email SHALL
     * contain the dispatch timestamp.
     */
    it('should contain dispatch timestamp in email message', () => {
      fc.assert(
        fc.property(arbitraryEmailContext(), (context) => {
          const rendered = templateEngine.renderForChannel('email', context);

          expect(rendered).toContain(context.dispatchedAt);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Email handles optional vehicle gracefully', () => {
    /**
     * Property: For any dispatch context without vehicle data, the email
     * SHALL still render successfully without errors.
     */
    it('should render email successfully when vehicle is null', () => {
      fc.assert(
        fc.property(
          arbitraryEmailContext().map((ctx) => ({ ...ctx, vehicle: null })),
          (context) => {
            // Should not throw
            expect(() => templateEngine.renderForChannel('email', context)).not.toThrow();

            const rendered = templateEngine.renderForChannel('email', context);

            // Should still contain required content
            expect(rendered).toContain(context.route.name);
            expect(rendered).toContain(context.route.date);
            expect(rendered).toContain(context.driver.fullName);

            // Should not contain "undefined" or "null" literals
            expect(rendered).not.toContain('undefined');
            expect(rendered).not.toContain('null');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
