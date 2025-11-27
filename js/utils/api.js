/**
 * API Client Utilities
 * @fileoverview HTTP client with retry logic, error handling, and request management
 */

import { API_BASE, API_TIMEOUT, MAX_RETRIES, RETRY_DELAY } from './constants.js';

// ============================================================================
// Error Types
// ============================================================================

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} status - HTTP status code
   * @param {string} [code] - Error code
   * @param {*} [data] - Additional error data
   */
  constructor(message, status, code = null, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }

  /**
   * Check if error is a network error
   * @returns {boolean}
   */
  isNetworkError() {
    return this.status === 0;
  }

  /**
   * Check if error is a client error (4xx)
   * @returns {boolean}
   */
  isClientError() {
    return this.status >= 400 && this.status < 500;
  }

  /**
   * Check if error is a server error (5xx)
   * @returns {boolean}
   */
  isServerError() {
    return this.status >= 500;
  }

  /**
   * Check if error is retryable
   * @returns {boolean}
   */
  isRetryable() {
    return this.isNetworkError() || this.isServerError() || this.status === 429;
  }
}

// ============================================================================
// Request Queue (Prevents duplicate requests)
// ============================================================================

/** @type {Map<string, Promise<*>>} */
const pendingRequests = new Map();

/**
 * Create a unique key for a request
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 * @param {*} body - Request body
 * @returns {string}
 */
function createRequestKey(method, url, body) {
  return `${method}:${url}:${JSON.stringify(body || '')}`;
}

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Calculate delay for exponential backoff
 * @param {number} attempt - Current attempt number
 * @param {number} baseDelay - Base delay in ms
 * @returns {number} Delay in ms
 */
function calculateBackoff(attempt, baseDelay = RETRY_DELAY) {
  // Exponential backoff with jitter
  const exponential = Math.pow(2, attempt) * baseDelay;
  const jitter = Math.random() * baseDelay;
  return Math.min(exponential + jitter, 30000); // Max 30 seconds
}

/**
 * Sleep for a given duration
 * @param {number} ms - Duration in milliseconds
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Core Fetch Function
// ============================================================================

/**
 * @typedef {Object} RequestOptions
 * @property {string} [method='GET'] - HTTP method
 * @property {Record<string, string>} [headers] - Request headers
 * @property {*} [body] - Request body
 * @property {number} [timeout] - Request timeout in ms
 * @property {number} [retries] - Number of retries
 * @property {boolean} [dedupe=true] - Deduplicate identical requests
 * @property {AbortSignal} [signal] - Abort signal
 */

/**
 * Make an HTTP request with retry logic
 * @param {string} url - Request URL
 * @param {RequestOptions} [options={}] - Request options
 * @returns {Promise<*>} Response data
 * @throws {ApiError} On request failure
 */
export async function request(url, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = API_TIMEOUT,
    retries = MAX_RETRIES,
    dedupe = true,
    signal,
  } = options;

  // Deduplicate GET requests
  const requestKey = createRequestKey(method, url, body);
  if (dedupe && method === 'GET' && pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey);
  }

  const executeRequest = async (attempt = 0) => {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Merge signals if provided
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const requestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        signal: controller.signal,
      };

      if (body && method !== 'GET' && method !== 'HEAD') {
        requestInit.body = JSON.stringify(body);
      }

      const response = await fetch(url, requestInit);

      if (!response.ok) {
        let errorData = null;
        try {
          errorData = await response.json();
        } catch {
          // Response is not JSON
        }

        const error = new ApiError(
          errorData?.message || errorData?.error || `Request failed with status ${response.status}`,
          response.status,
          errorData?.code,
          errorData
        );

        // Retry if appropriate
        if (error.isRetryable() && attempt < retries) {
          const delay = calculateBackoff(attempt);
          console.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
          await sleep(delay);
          return executeRequest(attempt + 1);
        }

        throw error;
      }

      // Parse response
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return response.json();
      }
      return response.text();

    } catch (err) {
      if (err.name === 'AbortError') {
        throw new ApiError('Request timeout', 0, 'TIMEOUT');
      }

      if (err instanceof ApiError) {
        throw err;
      }

      // Network error - retry
      if (attempt < retries) {
        const delay = calculateBackoff(attempt);
        console.warn(`Network error, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
        await sleep(delay);
        return executeRequest(attempt + 1);
      }

      throw new ApiError(err.message || 'Network error', 0, 'NETWORK_ERROR');
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const promise = executeRequest();

  // Store pending request for deduplication
  if (dedupe && method === 'GET') {
    pendingRequests.set(requestKey, promise);
    promise.finally(() => {
      pendingRequests.delete(requestKey);
    });
  }

  return promise;
}

// ============================================================================
// API Client
// ============================================================================

/**
 * Create an API client instance
 * @param {string} [baseUrl=API_BASE] - Base URL for API
 * @returns {Object} API client
 */
export function createApiClient(baseUrl = API_BASE) {
  let authToken = null;

  /**
   * Set the auth token for requests
   * @param {string|null} token - Auth token
   */
  function setAuthToken(token) {
    authToken = token;
  }

  /**
   * Get default headers including auth
   * @returns {Record<string, string>}
   */
  function getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
  }

  /**
   * Make an API request
   * @param {string} endpoint - API endpoint
   * @param {RequestOptions} [options={}] - Request options
   * @returns {Promise<*>}
   */
  async function apiRequest(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
    return request(url, {
      ...options,
      headers: {
        ...getHeaders(),
        ...options.headers,
      },
    });
  }

  return {
    setAuthToken,

    /**
     * GET request
     * @param {string} endpoint
     * @param {RequestOptions} [options]
     */
    get: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'GET' }),

    /**
     * POST request
     * @param {string} endpoint
     * @param {*} body
     * @param {RequestOptions} [options]
     */
    post: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'POST', body }),

    /**
     * PUT request
     * @param {string} endpoint
     * @param {*} body
     * @param {RequestOptions} [options]
     */
    put: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'PUT', body }),

    /**
     * PATCH request
     * @param {string} endpoint
     * @param {*} body
     * @param {RequestOptions} [options]
     */
    patch: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'PATCH', body }),

    /**
     * DELETE request
     * @param {string} endpoint
     * @param {RequestOptions} [options]
     */
    delete: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'DELETE' }),
  };
}

// ============================================================================
// Singleton API Instance
// ============================================================================

/** @type {ReturnType<typeof createApiClient>} */
export const api = createApiClient();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build query string from object
 * @param {Record<string, *>} params - Query parameters
 * @returns {string} Query string
 */
export function buildQueryString(params) {
  const entries = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map(v => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`).join('&');
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    });

  return entries.length > 0 ? `?${entries.join('&')}` : '';
}

/**
 * Parse API error to user-friendly message
 * @param {Error|ApiError} error - Error object
 * @returns {string} User-friendly message
 */
export function parseApiError(error) {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 0:
        return 'Unable to connect. Please check your internet connection.';
      case 400:
        return error.message || 'Invalid request. Please check your input.';
      case 401:
        return 'Please sign in to continue.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }

  return error.message || 'An unexpected error occurred.';
}

// ============================================================================
// Request Cancellation
// ============================================================================

/**
 * Create a cancellable request
 * @returns {{signal: AbortSignal, cancel: () => void}}
 */
export function createCancellableRequest() {
  const controller = new AbortController();
  return {
    signal: controller.signal,
    cancel: () => controller.abort(),
  };
}

export default {
  ApiError,
  request,
  createApiClient,
  api,
  buildQueryString,
  parseApiError,
  createCancellableRequest,
};
