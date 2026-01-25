/**
 * Template Engine for rendering dispatch messages
 *
 * Uses Handlebars for template rendering with support for:
 * - {{variable}} syntax for substitution
 * - Missing/null values replaced with empty strings
 * - Channel-specific templates (telegram.md, email.html)
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { ChannelType, Route, Driver, Vehicle, Booking } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Template context interface for rendering dispatch messages
 * Provides access to route, driver, vehicle, and bookings data
 * Requirement 7.2
 */
export interface TemplateContext {
  route: {
    name: string;
    code: string;
    date: string;
    plannedStartTime: string;
    plannedEndTime: string;
    totalStops: number;
    totalDistanceKm: number;
    totalDurationMinutes: number;
  };
  driver: {
    firstName: string;
    lastName: string;
    fullName: string;
  };
  vehicle: {
    name: string;
    licensePlate: string;
    make: string;
    model: string;
  } | null;
  bookings: Array<{
    stopNumber: number;
    clientName: string;
    address: string;
    scheduledTime: string;
    services: string;
    specialInstructions: string;
    mapsUrl: string;
  }>;
  routeMapsUrl: string;
  dispatchedAt: string;
}

/**
 * Channel to template file mapping
 */
const CHANNEL_TEMPLATES: Record<ChannelType, string> = {
  telegram: 'telegram.md',
  email: 'email.html',
  sms: 'sms.txt',
  push: 'push.txt',
};

/**
 * TemplateEngine class for rendering dispatch messages
 *
 * Implements:
 * - Variable substitution using {{variable}} syntax (Req 7.1)
 * - Access to route, driver, vehicle, bookings data (Req 7.2)
 * - Missing/null values replaced with empty strings (Req 7.3)
 * - Channel-specific templates (Req 7.4)
 * - Template parsing and variable substitution (Req 7.5)
 */
export class TemplateEngine {
  private templatesDir: string;
  private compiledTemplates: Map<string, Handlebars.TemplateDelegate> = new Map();
  private handlebars: typeof Handlebars;

  constructor(templatesDir?: string) {
    // Default to templates folder relative to dispatch-service
    if (templatesDir) {
      this.templatesDir = templatesDir;
    } else {
      // Use import.meta.url to get the path relative to this module
      // This works in ESM environments and is more reliable than process.cwd()
      // In embedded mode, process.cwd() may be the web-launcher directory
      const moduleDir = new URL('.', import.meta.url).pathname;
      // Templates are at dispatch-service/templates, this file is at dispatch-service/src/core/
      this.templatesDir = path.resolve(moduleDir, '../../templates');
    }

    // Create a new Handlebars instance with custom configuration
    this.handlebars = Handlebars.create();

    // Register custom helpers
    this.registerHelpers();
  }

  /**
   * Register custom Handlebars helpers
   */
  private registerHelpers(): void {
    // Helper to handle missing values - returns empty string for undefined/null
    // Requirement 7.3: Missing/null values replaced with empty strings
    this.handlebars.registerHelper('safe', (value: unknown) => {
      if (value === undefined || value === null) {
        return '';
      }
      return String(value);
    });

    // Helper for formatting dates
    this.handlebars.registerHelper('formatDate', (dateStr: string) => {
      if (!dateStr) return '';
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      } catch {
        return dateStr;
      }
    });

    // Helper for formatting time
    this.handlebars.registerHelper('formatTime', (timeStr: string) => {
      if (!timeStr) return '';
      return timeStr;
    });

    // Helper for conditional blocks
    this.handlebars.registerHelper('ifExists', function (
      this: unknown,
      value: unknown,
      options: Handlebars.HelperOptions
    ) {
      if (value !== undefined && value !== null && value !== '') {
        return options.fn(this);
      }
      return options.inverse(this);
    });
  }

  /**
   * Load and compile a template from file
   */
  private loadTemplate(templateName: string): Handlebars.TemplateDelegate {
    // Check cache first
    const cached = this.compiledTemplates.get(templateName);
    if (cached) {
      return cached;
    }

    const templatePath = path.join(this.templatesDir, templateName);

    // Check if template file exists
    if (!fs.existsSync(templatePath)) {
      logger.warn(`Template file not found: ${templatePath}`);
      throw new Error(`Template not found: ${templateName}`);
    }

    // Read and compile template
    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    const compiled = this.handlebars.compile(templateContent, {
      strict: false, // Don't throw on missing properties
      noEscape: true, // Don't escape HTML (we handle this per-channel)
    });

    // Cache compiled template
    this.compiledTemplates.set(templateName, compiled);

    return compiled;
  }

  /**
   * Render a template with the given context
   *
   * Requirement 7.5: Parse template and substitute all variables with actual values
   *
   * @param templateName - Name of the template file (e.g., 'telegram.md')
   * @param context - Template context with route, driver, vehicle, bookings data
   * @returns Rendered template string
   */
  render(templateName: string, context: TemplateContext): string {
    const template = this.loadTemplate(templateName);

    // Sanitize context to replace null/undefined with empty strings
    // Requirement 7.3: Missing/null values replaced with empty strings
    const sanitizedContext = this.sanitizeContext(context);

    // Render template with sanitized context
    const rendered = template(sanitizedContext);

    return rendered;
  }

  /**
   * Render a template for a specific channel
   *
   * Requirement 7.4: Support channel-specific templates
   *
   * @param channelType - The channel type (telegram, email, etc.)
   * @param context - Template context
   * @returns Rendered template string
   */
  renderForChannel(channelType: ChannelType, context: TemplateContext): string {
    const templateName = CHANNEL_TEMPLATES[channelType];
    if (!templateName) {
      throw new Error(`No template configured for channel: ${channelType}`);
    }
    return this.render(templateName, context);
  }

  /**
   * Get available templates for a channel
   *
   * @param channelType - The channel type
   * @returns Array of template names available for the channel
   */
  getTemplates(channelType: ChannelType): string[] {
    const templateName = CHANNEL_TEMPLATES[channelType];
    if (!templateName) {
      return [];
    }

    const templatePath = path.join(this.templatesDir, templateName);
    if (fs.existsSync(templatePath)) {
      return [templateName];
    }

    return [];
  }

  /**
   * Check if a template exists for a channel
   *
   * @param channelType - The channel type
   * @returns true if template exists
   */
  hasTemplate(channelType: ChannelType): boolean {
    const templateName = CHANNEL_TEMPLATES[channelType];
    if (!templateName) {
      return false;
    }

    const templatePath = path.join(this.templatesDir, templateName);
    return fs.existsSync(templatePath);
  }

  /**
   * Sanitize context to replace null/undefined values with empty strings
   *
   * Requirement 7.3: When a template variable is missing or null,
   * replace it with an empty string
   */
  private sanitizeContext(context: TemplateContext): TemplateContext {
    const sanitizeValue = <T>(value: T | null | undefined, defaultValue: T): T => {
      if (value === null || value === undefined) {
        return defaultValue;
      }
      return value;
    };

    const sanitizeString = (value: string | null | undefined): string => {
      return sanitizeValue(value, '');
    };

    const sanitizeNumber = (value: number | null | undefined): number => {
      return sanitizeValue(value, 0);
    };

    return {
      route: {
        name: sanitizeString(context.route?.name),
        code: sanitizeString(context.route?.code),
        date: sanitizeString(context.route?.date),
        plannedStartTime: sanitizeString(context.route?.plannedStartTime),
        plannedEndTime: sanitizeString(context.route?.plannedEndTime),
        totalStops: sanitizeNumber(context.route?.totalStops),
        totalDistanceKm: sanitizeNumber(context.route?.totalDistanceKm),
        totalDurationMinutes: sanitizeNumber(context.route?.totalDurationMinutes),
      },
      driver: {
        firstName: sanitizeString(context.driver?.firstName),
        lastName: sanitizeString(context.driver?.lastName),
        fullName: sanitizeString(context.driver?.fullName),
      },
      vehicle: context.vehicle
        ? {
          name: sanitizeString(context.vehicle.name),
          licensePlate: sanitizeString(context.vehicle.licensePlate),
          make: sanitizeString(context.vehicle.make),
          model: sanitizeString(context.vehicle.model),
        }
        : null,
      bookings: (context.bookings || []).map((booking) => ({
        stopNumber: sanitizeNumber(booking?.stopNumber),
        clientName: sanitizeString(booking?.clientName),
        address: sanitizeString(booking?.address),
        scheduledTime: sanitizeString(booking?.scheduledTime),
        services: sanitizeString(booking?.services),
        specialInstructions: sanitizeString(booking?.specialInstructions),
        mapsUrl: sanitizeString(booking?.mapsUrl),
      })),
      routeMapsUrl: sanitizeString(context.routeMapsUrl),
      dispatchedAt: sanitizeString(context.dispatchedAt),
    };
  }

  /**
   * Clear the template cache
   * Useful for development/testing when templates change
   */
  clearCache(): void {
    this.compiledTemplates.clear();
  }

  /**
   * Get the templates directory path
   */
  getTemplatesDir(): string {
    return this.templatesDir;
  }
}

/**
 * Build a TemplateContext from entity data
 *
 * Helper function to construct a TemplateContext from raw entity objects
 * Requirement 7.2: Provide access to route, driver, vehicle, and bookings data
 */
export function buildTemplateContext(
  route: Route,
  driver: Driver,
  vehicle: Vehicle | null,
  bookings: Booking[],
  _startLocation?: { latitude: number; longitude: number } | null,
  dispatchedAt?: Date
): TemplateContext {
  // Generate route map URL pointing to the app's route view
  // This shows all stops correctly, unlike Google Maps which has waypoint limits
  // Note: _startLocation parameter kept for backwards compatibility but no longer used
  const appBaseUrl = process.env.APP_BASE_URL || 'https://fleetillo.com';
  const routeMapsUrl = `${appBaseUrl}/routes.html?routeId=${route.id}`;

  return {
    route: {
      name: route.name || '',
      code: route.code || '',
      date: route.date || '',
      plannedStartTime: route.plannedStartTime || '',
      plannedEndTime: route.plannedEndTime || '',
      totalStops: route.totalStops || 0,
      totalDistanceKm: route.totalDistanceKm || 0,
      totalDurationMinutes: route.totalDurationMinutes || 0,
    },
    driver: {
      firstName: driver.firstName || '',
      lastName: driver.lastName || '',
      fullName: `${driver.firstName || ''} ${driver.lastName || ''}`.trim(),
    },
    vehicle: vehicle
      ? {
        name: vehicle.name || '',
        licensePlate: vehicle.licensePlate || '',
        make: vehicle.make || '',
        model: vehicle.model || '',
      }
      : null,
    bookings: (bookings || []).map((booking) => ({
      stopNumber: booking.stopNumber || 0,
      clientName: booking.clientName || '',
      address: booking.address || '',
      scheduledTime: booking.scheduledTime || '',
      services: booking.services || '',
      specialInstructions: booking.specialInstructions || '',
      mapsUrl: booking.mapsUrl || '',
    })),
    routeMapsUrl,
    dispatchedAt: (dispatchedAt || new Date()).toISOString(),
  };
}

// Export a default instance for convenience
export const templateEngine = new TemplateEngine();
