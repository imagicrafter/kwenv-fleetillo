/**
 * Unit tests for TemplateEngine
 *
 * Tests the template rendering functionality including:
 * - Variable substitution using {{variable}} syntax (Req 7.1)
 * - Access to route, driver, vehicle, bookings data (Req 7.2)
 * - Missing/null values replaced with empty strings (Req 7.3)
 * - Channel-specific templates (Req 7.4)
 * - Template parsing and variable substitution (Req 7.5)
 */

import * as path from 'path';
import { TemplateEngine, TemplateContext, buildTemplateContext } from '../../../src/core/templates.js';
import { Route, Driver, Vehicle, Booking } from '../../../src/types/index.js';

describe('TemplateEngine', () => {
  let templateEngine: TemplateEngine;
  let testTemplatesDir: string;

  // Sample test data
  const sampleContext: TemplateContext = {
    route: {
      name: 'Downtown Route A',
      code: 'DT-001',
      date: '2024-01-15',
      plannedStartTime: '08:00',
      plannedEndTime: '17:00',
      totalStops: 5,
      totalDistanceKm: 25.5,
      totalDurationMinutes: 480,
    },
    driver: {
      firstName: 'John',
      lastName: 'Doe',
      fullName: 'John Doe',
    },
    vehicle: {
      name: 'Van 1',
      licensePlate: 'ABC-123',
      make: 'Ford',
      model: 'Transit',
    },
    bookings: [
      {
        stopNumber: 1,
        clientName: 'Acme Corp',
        address: '123 Main St',
        scheduledTime: '08:30',
        services: 'Delivery',
        specialInstructions: 'Ring doorbell twice',
      },
      {
        stopNumber: 2,
        clientName: 'Tech Inc',
        address: '456 Oak Ave',
        scheduledTime: '09:15',
        services: 'Pickup',
        specialInstructions: '',
      },
    ],
    dispatchedAt: '2024-01-15T07:00:00.000Z',
  };

  beforeAll(() => {
    // Use the actual templates directory
    testTemplatesDir = path.resolve(__dirname, '../../../templates');
  });

  beforeEach(() => {
    templateEngine = new TemplateEngine(testTemplatesDir);
    templateEngine.clearCache();
  });

  describe('render()', () => {
    describe('Requirement 7.1: Variable substitution using {{variable}} syntax', () => {
      it('should substitute simple variables', () => {
        const rendered = templateEngine.render('telegram.md', sampleContext);

        expect(rendered).toContain('John Doe');
        expect(rendered).toContain('Downtown Route A');
        expect(rendered).toContain('2024-01-15');
        expect(rendered).toContain('08:00');
      });

      it('should substitute nested variables', () => {
        const rendered = templateEngine.render('telegram.md', sampleContext);

        expect(rendered).toContain(sampleContext.driver.fullName);
        expect(rendered).toContain(sampleContext.route.name);
      });

      it('should substitute array item variables in bookings', () => {
        const rendered = templateEngine.render('telegram.md', sampleContext);

        expect(rendered).toContain('Acme Corp');
        expect(rendered).toContain('123 Main St');
        expect(rendered).toContain('Tech Inc');
        expect(rendered).toContain('456 Oak Ave');
      });
    });

    describe('Requirement 7.2: Access to route, driver, vehicle, bookings data', () => {
      it('should include route information', () => {
        const rendered = templateEngine.render('telegram.md', sampleContext);

        expect(rendered).toContain(sampleContext.route.name);
        expect(rendered).toContain(sampleContext.route.date);
        expect(rendered).toContain(sampleContext.route.plannedStartTime);
        expect(rendered).toContain(String(sampleContext.route.totalStops));
      });

      it('should include driver information', () => {
        const rendered = templateEngine.render('telegram.md', sampleContext);

        expect(rendered).toContain(sampleContext.driver.fullName);
      });

      it('should include vehicle information when present', () => {
        const rendered = templateEngine.render('telegram.md', sampleContext);

        expect(rendered).toContain(sampleContext.vehicle!.name);
        expect(rendered).toContain(sampleContext.vehicle!.licensePlate);
      });

      it('should include bookings information', () => {
        const rendered = templateEngine.render('telegram.md', sampleContext);

        for (const booking of sampleContext.bookings) {
          expect(rendered).toContain(booking.clientName);
          expect(rendered).toContain(booking.address);
        }
      });
    });

    describe('Requirement 7.3: Missing/null values replaced with empty strings', () => {
      it('should handle missing route fields gracefully', () => {
        const contextWithMissing: TemplateContext = {
          ...sampleContext,
          route: {
            name: 'Test Route',
            code: '',
            date: '2024-01-15',
            plannedStartTime: '08:00',
            plannedEndTime: '',
            totalStops: 3,
            totalDistanceKm: 0,
            totalDurationMinutes: 0,
          },
        };

        const rendered = templateEngine.render('telegram.md', contextWithMissing);

        // Should not contain 'undefined' or 'null' literals
        expect(rendered).not.toContain('undefined');
        expect(rendered).not.toContain('null');
        // Should still contain valid data
        expect(rendered).toContain('Test Route');
      });

      it('should handle null vehicle gracefully', () => {
        const contextWithoutVehicle: TemplateContext = {
          ...sampleContext,
          vehicle: null,
        };

        const rendered = templateEngine.render('telegram.md', contextWithoutVehicle);

        expect(rendered).not.toContain('undefined');
        expect(rendered).not.toContain('null');
        // Should still render other content
        expect(rendered).toContain(sampleContext.driver.fullName);
      });

      it('should handle empty bookings array', () => {
        const contextWithNoBookings: TemplateContext = {
          ...sampleContext,
          bookings: [],
        };

        const rendered = templateEngine.render('telegram.md', contextWithNoBookings);

        expect(rendered).not.toContain('undefined');
        expect(rendered).not.toContain('null');
        expect(rendered).toContain(sampleContext.route.name);
      });

      it('should handle booking with missing optional fields', () => {
        const contextWithPartialBooking: TemplateContext = {
          ...sampleContext,
          bookings: [
            {
              stopNumber: 1,
              clientName: 'Test Client',
              address: '123 Test St',
              scheduledTime: '',
              services: '',
              specialInstructions: '',
            },
          ],
        };

        const rendered = templateEngine.render('telegram.md', contextWithPartialBooking);

        expect(rendered).not.toContain('undefined');
        expect(rendered).not.toContain('null');
        expect(rendered).toContain('Test Client');
        expect(rendered).toContain('123 Test St');
      });
    });

    describe('Requirement 7.5: Template parsing and variable substitution', () => {
      it('should parse and render telegram template completely', () => {
        const rendered = templateEngine.render('telegram.md', sampleContext);

        // Should not have any unsubstituted variables
        expect(rendered).not.toMatch(/\{\{[^}]+\}\}/);
      });

      it('should parse and render email template completely', () => {
        const rendered = templateEngine.render('email.html', sampleContext);

        // Should not have any unsubstituted variables
        expect(rendered).not.toMatch(/\{\{[^}]+\}\}/);
      });

      it('should include dispatched timestamp', () => {
        const rendered = templateEngine.render('telegram.md', sampleContext);

        expect(rendered).toContain(sampleContext.dispatchedAt);
      });
    });
  });

  describe('renderForChannel()', () => {
    describe('Requirement 7.4: Channel-specific templates', () => {
      it('should render telegram template for telegram channel', () => {
        const rendered = templateEngine.renderForChannel('telegram', sampleContext);

        // Telegram uses markdown formatting
        expect(rendered).toContain('**');
        expect(rendered).toContain(sampleContext.driver.fullName);
      });

      it('should render email template for email channel', () => {
        const rendered = templateEngine.renderForChannel('email', sampleContext);

        // Email uses HTML formatting
        expect(rendered).toContain('<!DOCTYPE html>');
        expect(rendered).toContain('<html');
        expect(rendered).toContain(sampleContext.driver.fullName);
      });

      it('should throw error for unsupported channel without template', () => {
        // SMS and push templates don't exist yet
        expect(() => templateEngine.renderForChannel('sms', sampleContext)).toThrow();
      });
    });
  });

  describe('getTemplates()', () => {
    it('should return telegram template for telegram channel', () => {
      const templates = templateEngine.getTemplates('telegram');

      expect(templates).toContain('telegram.md');
    });

    it('should return email template for email channel', () => {
      const templates = templateEngine.getTemplates('email');

      expect(templates).toContain('email.html');
    });

    it('should return empty array for channel without template', () => {
      const templates = templateEngine.getTemplates('sms');

      expect(templates).toEqual([]);
    });
  });

  describe('hasTemplate()', () => {
    it('should return true for telegram channel', () => {
      expect(templateEngine.hasTemplate('telegram')).toBe(true);
    });

    it('should return true for email channel', () => {
      expect(templateEngine.hasTemplate('email')).toBe(true);
    });

    it('should return false for sms channel (no template)', () => {
      expect(templateEngine.hasTemplate('sms')).toBe(false);
    });
  });

  describe('clearCache()', () => {
    it('should clear compiled templates from cache', () => {
      // Render once to populate cache
      templateEngine.render('telegram.md', sampleContext);

      // Clear cache
      templateEngine.clearCache();

      // Should still work after clearing (reloads template)
      const rendered = templateEngine.render('telegram.md', sampleContext);
      expect(rendered).toContain(sampleContext.driver.fullName);
    });
  });

  describe('error handling', () => {
    it('should throw error for non-existent template', () => {
      expect(() => templateEngine.render('nonexistent.md', sampleContext)).toThrow(
        'Template not found: nonexistent.md'
      );
    });
  });
});

describe('buildTemplateContext()', () => {
  const sampleRoute: Route = {
    id: 'route-123',
    name: 'Test Route',
    code: 'TR-001',
    date: '2024-01-15',
    plannedStartTime: '08:00',
    plannedEndTime: '17:00',
    totalStops: 3,
    totalDistanceKm: 50,
    totalDurationMinutes: 300,
    vehicleId: 'vehicle-123',
    driverId: 'driver-123',
  };

  const sampleDriver: Driver = {
    id: 'driver-123',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    telegramChatId: '12345',
    preferredChannel: 'telegram',
    fallbackEnabled: true,
    status: 'active',
  };

  const sampleVehicle: Vehicle = {
    id: 'vehicle-123',
    name: 'Truck 1',
    licensePlate: 'XYZ-789',
    make: 'Mercedes',
    model: 'Sprinter',
  };

  const sampleBookings: Booking[] = [
    {
      id: 'booking-1',
      routeId: 'route-123',
      stopNumber: 1,
      clientName: 'Client A',
      address: '100 First St',
      scheduledTime: '09:00',
      services: 'Standard Delivery',
      specialInstructions: 'Leave at door',
    },
  ];

  it('should build context from entity objects', () => {
    const context = buildTemplateContext(sampleRoute, sampleDriver, sampleVehicle, sampleBookings);

    expect(context.route.name).toBe('Test Route');
    expect(context.driver.firstName).toBe('Jane');
    expect(context.driver.fullName).toBe('Jane Smith');
    expect(context.vehicle?.name).toBe('Truck 1');
    expect(context.bookings).toHaveLength(1);
    expect(context.bookings[0]?.clientName).toBe('Client A');
  });

  it('should handle null vehicle', () => {
    const context = buildTemplateContext(sampleRoute, sampleDriver, null, sampleBookings);

    expect(context.vehicle).toBeNull();
  });

  it('should handle empty bookings', () => {
    const context = buildTemplateContext(sampleRoute, sampleDriver, sampleVehicle, []);

    expect(context.bookings).toEqual([]);
  });

  it('should set dispatchedAt timestamp', () => {
    const dispatchTime = new Date('2024-01-15T10:00:00Z');
    const context = buildTemplateContext(
      sampleRoute,
      sampleDriver,
      sampleVehicle,
      sampleBookings,
      dispatchTime
    );

    expect(context.dispatchedAt).toBe('2024-01-15T10:00:00.000Z');
  });

  it('should use current time if dispatchedAt not provided', () => {
    const before = new Date();
    const context = buildTemplateContext(sampleRoute, sampleDriver, sampleVehicle, sampleBookings);
    const after = new Date();

    const dispatchedAt = new Date(context.dispatchedAt);
    expect(dispatchedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(dispatchedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should handle missing optional fields in route', () => {
    const routeWithMissing: Route = {
      id: 'route-123',
      name: 'Minimal Route',
      date: '2024-01-15',
      totalStops: 1,
    };

    const context = buildTemplateContext(routeWithMissing, sampleDriver, null, []);

    expect(context.route.name).toBe('Minimal Route');
    expect(context.route.code).toBe('');
    expect(context.route.plannedStartTime).toBe('');
  });

  it('should handle missing optional fields in driver', () => {
    const driverWithMissing: Driver = {
      id: 'driver-123',
      firstName: 'Bob',
      lastName: '',
      fallbackEnabled: false,
      status: 'active',
    };

    const context = buildTemplateContext(sampleRoute, driverWithMissing, null, []);

    expect(context.driver.firstName).toBe('Bob');
    expect(context.driver.lastName).toBe('');
    expect(context.driver.fullName).toBe('Bob');
  });
});
