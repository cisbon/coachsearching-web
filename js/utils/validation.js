/**
 * Validation Utilities
 * @fileoverview Schema-based validation for forms and data
 */

import {
  EMAIL_PATTERN,
  URL_PATTERN,
  YOUTUBE_PATTERN,
  MIN_PASSWORD_LENGTH,
  MAX_BIO_LENGTH,
  MAX_TITLE_LENGTH,
  MIN_HOURLY_RATE,
  MAX_HOURLY_RATE,
} from './constants.js';

// ============================================================================
// Validation Result Type
// ============================================================================

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {string|null} error - Error message if invalid
 */

/**
 * Create a validation result
 * @param {boolean} valid - Whether valid
 * @param {string} [error] - Error message
 * @returns {ValidationResult}
 */
function result(valid, error = null) {
  return { valid, error: valid ? null : error };
}

// ============================================================================
// Basic Validators
// ============================================================================

/**
 * Check if value is defined and not null
 * @param {*} value - Value to check
 * @param {string} [message='This field is required'] - Error message
 * @returns {ValidationResult}
 */
export function required(value, message = 'This field is required') {
  if (value === undefined || value === null || value === '') {
    return result(false, message);
  }
  if (Array.isArray(value) && value.length === 0) {
    return result(false, message);
  }
  return result(true);
}

/**
 * Validate string minimum length
 * @param {string} value - String to validate
 * @param {number} min - Minimum length
 * @param {string} [message] - Error message
 * @returns {ValidationResult}
 */
export function minLength(value, min, message) {
  if (typeof value !== 'string') {
    return result(false, 'Must be a string');
  }
  const valid = value.length >= min;
  return result(valid, message || `Must be at least ${min} characters`);
}

/**
 * Validate string maximum length
 * @param {string} value - String to validate
 * @param {number} max - Maximum length
 * @param {string} [message] - Error message
 * @returns {ValidationResult}
 */
export function maxLength(value, max, message) {
  if (typeof value !== 'string') {
    return result(true); // Non-strings pass max length
  }
  const valid = value.length <= max;
  return result(valid, message || `Must be no more than ${max} characters`);
}

/**
 * Validate minimum number value
 * @param {number} value - Number to validate
 * @param {number} minVal - Minimum value
 * @param {string} [message] - Error message
 * @returns {ValidationResult}
 */
export function min(value, minVal, message) {
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (Number.isNaN(num)) {
    return result(false, 'Must be a number');
  }
  const valid = num >= minVal;
  return result(valid, message || `Must be at least ${minVal}`);
}

/**
 * Validate maximum number value
 * @param {number} value - Number to validate
 * @param {number} maxVal - Maximum value
 * @param {string} [message] - Error message
 * @returns {ValidationResult}
 */
export function max(value, maxVal, message) {
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (Number.isNaN(num)) {
    return result(false, 'Must be a number');
  }
  const valid = num <= maxVal;
  return result(valid, message || `Must be no more than ${maxVal}`);
}

/**
 * Validate against a regex pattern
 * @param {string} value - String to validate
 * @param {RegExp} regex - Pattern to match
 * @param {string} [message='Invalid format'] - Error message
 * @returns {ValidationResult}
 */
export function pattern(value, regex, message = 'Invalid format') {
  if (typeof value !== 'string') {
    return result(false, 'Must be a string');
  }
  const valid = regex.test(value);
  return result(valid, message);
}

// ============================================================================
// Specific Validators
// ============================================================================

/**
 * Validate email format
 * @param {string} value - Email to validate
 * @returns {ValidationResult}
 */
export function email(value) {
  if (!value) {
    return result(true); // Empty is OK, use required() for mandatory
  }
  return pattern(value, EMAIL_PATTERN, 'Please enter a valid email address');
}

/**
 * Validate password
 * @param {string} value - Password to validate
 * @returns {ValidationResult}
 */
export function password(value) {
  if (!value) {
    return result(true);
  }
  return minLength(value, MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
}

/**
 * Validate password confirmation matches
 * @param {string} value - Confirmation password
 * @param {string} original - Original password
 * @returns {ValidationResult}
 */
export function passwordMatch(value, original) {
  const valid = value === original;
  return result(valid, 'Passwords do not match');
}

/**
 * Validate URL format
 * @param {string} value - URL to validate
 * @returns {ValidationResult}
 */
export function url(value) {
  if (!value) {
    return result(true);
  }
  try {
    new URL(value);
    return result(true);
  } catch {
    return result(false, 'Please enter a valid URL');
  }
}

/**
 * Validate YouTube URL
 * @param {string} value - URL to validate
 * @returns {ValidationResult}
 */
export function youtubeUrl(value) {
  if (!value) {
    return result(true);
  }
  return pattern(value, YOUTUBE_PATTERN, 'Please enter a valid YouTube URL');
}

/**
 * Validate hourly rate
 * @param {number|string} value - Rate to validate
 * @returns {ValidationResult}
 */
export function hourlyRate(value) {
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (Number.isNaN(num)) {
    return result(false, 'Please enter a valid number');
  }
  if (num < MIN_HOURLY_RATE) {
    return result(false, `Rate must be at least €${MIN_HOURLY_RATE}`);
  }
  if (num > MAX_HOURLY_RATE) {
    return result(false, `Rate cannot exceed €${MAX_HOURLY_RATE}`);
  }
  return result(true);
}

/**
 * Validate bio length
 * @param {string} value - Bio to validate
 * @returns {ValidationResult}
 */
export function bio(value) {
  return maxLength(value, MAX_BIO_LENGTH, `Bio cannot exceed ${MAX_BIO_LENGTH} characters`);
}

/**
 * Validate title length
 * @param {string} value - Title to validate
 * @returns {ValidationResult}
 */
export function title(value) {
  return maxLength(value, MAX_TITLE_LENGTH, `Title cannot exceed ${MAX_TITLE_LENGTH} characters`);
}

// ============================================================================
// Schema Validation
// ============================================================================

/**
 * @typedef {Object} FieldSchema
 * @property {boolean} [required] - Whether field is required
 * @property {number} [minLength] - Minimum string length
 * @property {number} [maxLength] - Maximum string length
 * @property {number} [min] - Minimum numeric value
 * @property {number} [max] - Maximum numeric value
 * @property {RegExp} [pattern] - Pattern to match
 * @property {'email'|'url'|'youtube'|'password'} [type] - Special validation type
 * @property {Function} [custom] - Custom validation function
 * @property {string} [message] - Custom error message
 */

/**
 * @typedef {Record<string, FieldSchema>} ValidationSchema
 */

/**
 * @typedef {Object} SchemaValidationResult
 * @property {boolean} valid - Whether all fields are valid
 * @property {Record<string, string>} errors - Field errors
 */

/**
 * Validate an object against a schema
 * @param {Record<string, *>} data - Data to validate
 * @param {ValidationSchema} schema - Validation schema
 * @returns {SchemaValidationResult}
 */
export function validateSchema(data, schema) {
  /** @type {Record<string, string>} */
  const errors = {};
  let valid = true;

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    // Required check
    if (rules.required) {
      const check = required(value, rules.message);
      if (!check.valid) {
        errors[field] = check.error;
        valid = false;
        continue; // Skip other validations if required fails
      }
    }

    // Skip empty optional fields
    if (value === undefined || value === null || value === '') {
      continue;
    }

    // Type-specific validation
    if (rules.type) {
      let check;
      switch (rules.type) {
        case 'email':
          check = email(value);
          break;
        case 'url':
          check = url(value);
          break;
        case 'youtube':
          check = youtubeUrl(value);
          break;
        case 'password':
          check = password(value);
          break;
        default:
          check = result(true);
      }
      if (!check.valid) {
        errors[field] = check.error;
        valid = false;
        continue;
      }
    }

    // Length validations
    if (rules.minLength !== undefined) {
      const check = minLength(value, rules.minLength, rules.message);
      if (!check.valid) {
        errors[field] = check.error;
        valid = false;
        continue;
      }
    }

    if (rules.maxLength !== undefined) {
      const check = maxLength(value, rules.maxLength, rules.message);
      if (!check.valid) {
        errors[field] = check.error;
        valid = false;
        continue;
      }
    }

    // Numeric validations
    if (rules.min !== undefined) {
      const check = min(value, rules.min, rules.message);
      if (!check.valid) {
        errors[field] = check.error;
        valid = false;
        continue;
      }
    }

    if (rules.max !== undefined) {
      const check = max(value, rules.max, rules.message);
      if (!check.valid) {
        errors[field] = check.error;
        valid = false;
        continue;
      }
    }

    // Pattern validation
    if (rules.pattern) {
      const check = pattern(value, rules.pattern, rules.message || 'Invalid format');
      if (!check.valid) {
        errors[field] = check.error;
        valid = false;
        continue;
      }
    }

    // Custom validation
    if (rules.custom) {
      const check = rules.custom(value, data);
      if (!check.valid) {
        errors[field] = check.error;
        valid = false;
      }
    }
  }

  return { valid, errors };
}

// ============================================================================
// Common Schemas
// ============================================================================

/**
 * Login form validation schema
 * @type {ValidationSchema}
 */
export const loginSchema = {
  email: { required: true, type: 'email' },
  password: { required: true, minLength: MIN_PASSWORD_LENGTH },
};

/**
 * Registration form validation schema
 * @type {ValidationSchema}
 */
export const registrationSchema = {
  email: { required: true, type: 'email' },
  password: { required: true, type: 'password' },
  userType: { required: true },
};

/**
 * Coach profile validation schema
 * @type {ValidationSchema}
 */
export const coachProfileSchema = {
  full_name: { required: true, minLength: 2, maxLength: 100 },
  title: { required: true, minLength: 5, maxLength: MAX_TITLE_LENGTH },
  bio: { required: true, minLength: 50, maxLength: MAX_BIO_LENGTH },
  hourly_rate: {
    required: true,
    min: MIN_HOURLY_RATE,
    max: MAX_HOURLY_RATE,
    message: `Rate must be between €${MIN_HOURLY_RATE} and €${MAX_HOURLY_RATE}`
  },
  specialties: { required: true, message: 'Please select at least one specialty' },
  youtube_intro_url: { type: 'youtube' },
};

/**
 * Booking form validation schema
 * @type {ValidationSchema}
 */
export const bookingSchema = {
  date: { required: true, message: 'Please select a date' },
  time: { required: true, message: 'Please select a time' },
  duration: { required: true, message: 'Please select a duration' },
  sessionType: { required: true, message: 'Please select a session type' },
};

/**
 * Review form validation schema
 * @type {ValidationSchema}
 */
export const reviewSchema = {
  rating: { required: true, min: 1, max: 5 },
  comment: { maxLength: 1000 },
};

// ============================================================================
// Form Helpers
// ============================================================================

/**
 * Create a field validator function
 * @param {FieldSchema} schema - Field schema
 * @returns {(value: *) => ValidationResult}
 */
export function createFieldValidator(schema) {
  return value => {
    const tempSchema = { field: schema };
    const res = validateSchema({ field: value }, tempSchema);
    return {
      valid: res.valid,
      error: res.errors.field || null,
    };
  };
}

/**
 * Validate a single field value
 * @param {*} value - Value to validate
 * @param {FieldSchema} schema - Validation rules
 * @returns {ValidationResult}
 */
export function validateField(value, schema) {
  return createFieldValidator(schema)(value);
}

export default {
  // Basic validators
  required,
  minLength,
  maxLength,
  min,
  max,
  pattern,
  // Specific validators
  email,
  password,
  passwordMatch,
  url,
  youtubeUrl,
  hourlyRate,
  bio,
  title,
  // Schema validation
  validateSchema,
  validateField,
  createFieldValidator,
  // Schemas
  loginSchema,
  registrationSchema,
  coachProfileSchema,
  bookingSchema,
  reviewSchema,
};
