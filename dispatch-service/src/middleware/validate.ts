/**
 * Zod Validation Middleware
 *
 * Provides Express middleware for validating request bodies, params, and queries
 * using Zod schemas. Returns consistent API error responses on validation failure.
 *
 * @module middleware/validate
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, ZodIssue } from 'zod';
import { ApiError } from '../types/index.js';

/**
 * Location of data to validate in the request
 */
type ValidationTarget = 'body' | 'params' | 'query';

/**
 * Format Zod validation errors into a consistent structure
 */
function formatZodErrors(error: ZodError<unknown>): Array<{ field: string; message: string }> {
  return error.issues.map((issue: ZodIssue) => ({
    field: issue.path.join('.') || 'root',
    message: issue.message,
  }));
}

/**
 * Create a validation middleware for the specified request property
 *
 * @param schema - Zod schema to validate against
 * @param target - Which part of the request to validate ('body', 'params', or 'query')
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * router.post('/dispatch', validate(singleDispatchBodySchema, 'body'), handler);
 * router.get('/dispatch/:id', validate(dispatchIdParamSchema, 'params'), handler);
 * router.get('/dispatch', validate(listDispatchesQuerySchema, 'query'), handler);
 * ```
 */
export function validate<T>(schema: ZodSchema<T>, target: ValidationTarget = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const dataToValidate = req[target];

    const result = schema.safeParse(dataToValidate);

    if (!result.success) {
      const errors = formatZodErrors(result.error);
      const firstError = errors[0];

      const apiError: ApiError = {
        error: {
          code: 'VALIDATION_ERROR',
          message: firstError?.message ?? 'Validation failed',
          details: {
            errors,
          },
        },
        requestId: req.correlationId,
      };

      res.status(400).json(apiError);
      return;
    }

    // Replace the validated data on the request to get type coercion benefits
    // (e.g., query string numbers are converted to actual numbers)
    if (target === 'body') {
      req.body = result.data;
    } else if (target === 'query') {
      // TypeScript doesn't allow direct assignment to req.query
      // Store validated query in a custom property
      (req as Request & { validatedQuery: T }).validatedQuery = result.data;
    } else if (target === 'params') {
      // Store validated params in a custom property
      (req as Request & { validatedParams: T }).validatedParams = result.data;
    }

    next();
  };
}

/**
 * Convenience middleware creators for common validation targets
 */
export const validateBody = <T>(schema: ZodSchema<T>) => validate(schema, 'body');
export const validateParams = <T>(schema: ZodSchema<T>) => validate(schema, 'params');
export const validateQuery = <T>(schema: ZodSchema<T>) => validate(schema, 'query');
