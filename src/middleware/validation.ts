import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';
import { ErrorCodes } from '../errors/codes.js';

/**
 * Validation middleware factory
 * Creates middleware that validates request data against a schema
 */
export const validate = (schema: {
  body?: (data: any) => boolean;
  query?: (data: any) => boolean;
  params?: (data: any) => boolean;
}) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // Validate request body
      if (schema.body && !schema.body(req.body)) {
        throw AppError.fromCode(ErrorCodes.VALIDATION_ERROR, {
          message: 'Invalid request body',
          context: { body: req.body },
        });
      }

      // Validate query parameters
      if (schema.query && !schema.query(req.query)) {
        throw AppError.fromCode(ErrorCodes.VALIDATION_ERROR, {
          message: 'Invalid query parameters',
          context: { query: req.query },
        });
      }

      // Validate route parameters
      if (schema.params && !schema.params(req.params)) {
        throw AppError.fromCode(ErrorCodes.VALIDATION_ERROR, {
          message: 'Invalid route parameters',
          context: { params: req.params },
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validate required fields in request body
 */
export const validateRequired = (fields: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const missingFields = fields.filter(field => !(field in req.body));

    if (missingFields.length > 0) {
      throw AppError.fromCode(ErrorCodes.VALIDATION_ERROR, {
        message: `Missing required fields: ${missingFields.join(', ')}`,
        context: {
          missingFields,
          receivedFields: Object.keys(req.body),
        },
      });
    }

    next();
  };
};

/**
 * Validate UUID format
 */
export const isValidUUID = (value: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

/**
 * Validate ID parameter middleware
 */
export const validateIdParam = (paramName: string = 'id') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const id = req.params[paramName];

    if (!id) {
      throw AppError.fromCode(ErrorCodes.VALIDATION_ERROR, {
        message: `Missing ${paramName} parameter`,
      });
    }

    if (!isValidUUID(id)) {
      throw AppError.fromCode(ErrorCodes.VALIDATION_ERROR, {
        message: `Invalid ${paramName} format. Must be a valid UUID.`,
        context: { [paramName]: id },
      });
    }

    next();
  };
};

/**
 * Sanitize request body by removing undefined values
 */
export const sanitizeBody = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (req.body[key] === undefined) {
        delete req.body[key];
      }
    });
  }
  next();
};
