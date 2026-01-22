"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeBody = exports.validateIdParam = exports.isValidUUID = exports.validateRequired = exports.validate = void 0;
const AppError_1 = require("../errors/AppError");
const codes_1 = require("../errors/codes");
/**
 * Validation middleware factory
 * Creates middleware that validates request data against a schema
 */
const validate = (schema) => {
    return (req, _res, next) => {
        try {
            // Validate request body
            if (schema.body && !schema.body(req.body)) {
                throw AppError_1.AppError.fromCode(codes_1.ErrorCodes.VALIDATION_ERROR, {
                    message: 'Invalid request body',
                    context: { body: req.body },
                });
            }
            // Validate query parameters
            if (schema.query && !schema.query(req.query)) {
                throw AppError_1.AppError.fromCode(codes_1.ErrorCodes.VALIDATION_ERROR, {
                    message: 'Invalid query parameters',
                    context: { query: req.query },
                });
            }
            // Validate route parameters
            if (schema.params && !schema.params(req.params)) {
                throw AppError_1.AppError.fromCode(codes_1.ErrorCodes.VALIDATION_ERROR, {
                    message: 'Invalid route parameters',
                    context: { params: req.params },
                });
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.validate = validate;
/**
 * Validate required fields in request body
 */
const validateRequired = (fields) => {
    return (req, _res, next) => {
        const missingFields = fields.filter(field => !(field in req.body));
        if (missingFields.length > 0) {
            throw AppError_1.AppError.fromCode(codes_1.ErrorCodes.VALIDATION_ERROR, {
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
exports.validateRequired = validateRequired;
/**
 * Validate UUID format
 */
const isValidUUID = (value) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
};
exports.isValidUUID = isValidUUID;
/**
 * Validate ID parameter middleware
 */
const validateIdParam = (paramName = 'id') => {
    return (req, _res, next) => {
        const id = req.params[paramName];
        if (!id) {
            throw AppError_1.AppError.fromCode(codes_1.ErrorCodes.VALIDATION_ERROR, {
                message: `Missing ${paramName} parameter`,
            });
        }
        if (!(0, exports.isValidUUID)(id)) {
            throw AppError_1.AppError.fromCode(codes_1.ErrorCodes.VALIDATION_ERROR, {
                message: `Invalid ${paramName} format. Must be a valid UUID.`,
                context: { [paramName]: id },
            });
        }
        next();
    };
};
exports.validateIdParam = validateIdParam;
/**
 * Sanitize request body by removing undefined values
 */
const sanitizeBody = (req, _res, next) => {
    if (req.body && typeof req.body === 'object') {
        Object.keys(req.body).forEach(key => {
            if (req.body[key] === undefined) {
                delete req.body[key];
            }
        });
    }
    next();
};
exports.sanitizeBody = sanitizeBody;
//# sourceMappingURL=validation.js.map