/**
 * Utilities Index
 * @fileoverview Central export for all utility modules
 */

// Constants
export * from './constants.js';

// Security utilities
export * from './security.js';
export { default as security } from './security.js';

// Validation utilities
export * from './validation.js';
export { default as validation } from './validation.js';

// API utilities
export * from './api.js';
export { default as apiUtils } from './api.js';

// Formatting utilities
export * from './formatting.js';
export { default as formatting } from './formatting.js';

// DOM utilities
export * from './dom.js';
export { default as dom } from './dom.js';

// Performance utilities
export * from './performance.js';
export { default as performance } from './performance.js';

// SEO utilities
export * from './seo.js';
export { default as seo } from './seo.js';

// Legacy error handler export
export { handleError, logError } from './errorHandler.js';
