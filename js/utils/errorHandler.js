// js/utils/errorHandler.js - Centralized Error Handling
import { t } from '../i18n.js';

/**
 * Error types enumeration
 */
export const ErrorTypes = {
    NETWORK: 'network',
    AUTH: 'auth',
    VALIDATION: 'validation',
    SERVER: 'server',
    PAYMENT: 'payment',
    NOT_FOUND: 'not_found',
    RATE_LIMIT: 'rate_limit',
    UNKNOWN: 'unknown'
};

/**
 * Parse error from various sources and return a normalized error object
 */
export const parseError = (error) => {
    // Supabase error
    if (error?.code && error?.message) {
        return {
            type: mapSupabaseError(error.code),
            message: error.message,
            code: error.code,
            details: error.details || null
        };
    }

    // Fetch/Network error
    if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
            type: ErrorTypes.NETWORK,
            message: t('errors.network') || 'Network error. Please check your connection.',
            code: 'NETWORK_ERROR'
        };
    }

    // HTTP Response error
    if (error?.status) {
        return {
            type: mapHttpError(error.status),
            message: error.message || getHttpErrorMessage(error.status),
            code: `HTTP_${error.status}`
        };
    }

    // Generic error
    if (error instanceof Error) {
        return {
            type: ErrorTypes.UNKNOWN,
            message: error.message,
            code: 'UNKNOWN_ERROR'
        };
    }

    // String error
    if (typeof error === 'string') {
        return {
            type: ErrorTypes.UNKNOWN,
            message: error,
            code: 'STRING_ERROR'
        };
    }

    // Unknown error
    return {
        type: ErrorTypes.UNKNOWN,
        message: t('errors.unknown') || 'An unexpected error occurred.',
        code: 'UNKNOWN_ERROR'
    };
};

/**
 * Map Supabase error codes to error types
 */
const mapSupabaseError = (code) => {
    const mapping = {
        // Auth errors
        'invalid_credentials': ErrorTypes.AUTH,
        'email_not_confirmed': ErrorTypes.AUTH,
        'user_not_found': ErrorTypes.AUTH,
        'invalid_token': ErrorTypes.AUTH,
        'expired_token': ErrorTypes.AUTH,

        // Rate limiting
        'rate_limit_exceeded': ErrorTypes.RATE_LIMIT,
        'over_request_limit': ErrorTypes.RATE_LIMIT,

        // Not found
        'PGRST116': ErrorTypes.NOT_FOUND,

        // Validation
        'validation_error': ErrorTypes.VALIDATION,
        '23505': ErrorTypes.VALIDATION, // unique violation
        '23503': ErrorTypes.VALIDATION, // foreign key violation
    };

    return mapping[code] || ErrorTypes.SERVER;
};

/**
 * Map HTTP status codes to error types
 */
const mapHttpError = (status) => {
    if (status >= 500) return ErrorTypes.SERVER;
    if (status === 429) return ErrorTypes.RATE_LIMIT;
    if (status === 404) return ErrorTypes.NOT_FOUND;
    if (status === 403 || status === 401) return ErrorTypes.AUTH;
    if (status === 400 || status === 422) return ErrorTypes.VALIDATION;
    return ErrorTypes.UNKNOWN;
};

/**
 * Get user-friendly message for HTTP status codes
 */
const getHttpErrorMessage = (status) => {
    const messages = {
        400: t('errors.badRequest') || 'Invalid request. Please check your input.',
        401: t('errors.unauthorized') || 'Please sign in to continue.',
        403: t('errors.forbidden') || 'You don\'t have permission to do this.',
        404: t('errors.notFound') || 'The requested resource was not found.',
        422: t('errors.validation') || 'Please check your input and try again.',
        429: t('errors.rateLimit') || 'Too many requests. Please wait a moment.',
        500: t('errors.server') || 'Server error. Please try again later.',
        502: t('errors.server') || 'Server is temporarily unavailable.',
        503: t('errors.server') || 'Service unavailable. Please try again later.'
    };

    return messages[status] || t('errors.unknown') || 'An error occurred.';
};

/**
 * Display error to user (toast notification)
 */
export const showError = (error, options = {}) => {
    const parsed = parseError(error);
    const { duration = 5000, action = null } = options;

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `error-toast error-toast-${parsed.type}`;
    toast.innerHTML = `
        <div class="error-toast-content">
            <span class="error-toast-icon">${getErrorIcon(parsed.type)}</span>
            <span class="error-toast-message">${parsed.message}</span>
            ${action ? `<button class="error-toast-action">${action.label}</button>` : ''}
            <button class="error-toast-close" aria-label="Close">&times;</button>
        </div>
    `;

    // Add to DOM
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    container.appendChild(toast);

    // Animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Close handlers
    const close = () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    };

    toast.querySelector('.error-toast-close').addEventListener('click', close);

    if (action) {
        toast.querySelector('.error-toast-action').addEventListener('click', () => {
            action.onClick();
            close();
        });
    }

    // Auto-dismiss
    if (duration > 0) {
        setTimeout(close, duration);
    }

    return { close, parsed };
};

/**
 * Get icon for error type
 */
const getErrorIcon = (type) => {
    const icons = {
        [ErrorTypes.NETWORK]: '📡',
        [ErrorTypes.AUTH]: '🔐',
        [ErrorTypes.VALIDATION]: '⚠️',
        [ErrorTypes.SERVER]: '🔧',
        [ErrorTypes.PAYMENT]: '💳',
        [ErrorTypes.NOT_FOUND]: '🔍',
        [ErrorTypes.RATE_LIMIT]: '⏳',
        [ErrorTypes.UNKNOWN]: '❌'
    };
    return icons[type] || '❌';
};

/**
 * Check if in development mode
 * @returns {boolean}
 */
const isDevelopment = () => {
    return window.DEBUG_MODE === true ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.includes('.local');
};

/**
 * Log error for debugging (only in development)
 * @param {Error|unknown} error - Error to log
 * @param {string} [context=''] - Context where error occurred
 */
export const logError = (error, context = '') => {
    if (isDevelopment()) {
        console.group(`🔴 Error${context ? ` in ${context}` : ''}`);
        console.error('Original error:', error);
        console.log('Parsed error:', parseError(error));
        console.trace('Stack trace:');
        console.groupEnd();
    }
};

/**
 * Handle error with consistent behavior
 * @param {Error|unknown} error - Error to handle
 * @param {Object} [options] - Options
 * @param {string} [options.context] - Context where error occurred
 * @param {boolean} [options.showToast=true] - Show toast notification
 * @param {boolean} [options.log=true] - Log to console
 * @param {boolean} [options.rethrow=false] - Rethrow the error
 */
export const handleError = (error, options = {}) => {
    const { context = '', showToast = true, log = true, rethrow = false } = options;

    if (log) {
        logError(error, context);
    }

    if (showToast) {
        showError(error);
    }

    if (rethrow) {
        throw error;
    }
};

/**
 * Error boundary helper for async operations
 */
export const withErrorHandling = async (asyncFn, options = {}) => {
    const { showErrorToast = true, logToConsole = true, fallback = null } = options;

    try {
        return await asyncFn();
    } catch (error) {
        if (logToConsole) {
            logError(error, options.context);
        }

        if (showErrorToast) {
            showError(error, options);
        }

        return fallback;
    }
};

/**
 * Retry wrapper for flaky operations
 */
export const withRetry = async (asyncFn, options = {}) => {
    const { retries = 3, delay = 1000, backoff = 2, onRetry = null } = options;

    let lastError;
    for (let i = 0; i < retries; i++) {
        try {
            return await asyncFn();
        } catch (error) {
            lastError = error;

            if (i < retries - 1) {
                if (onRetry) onRetry(i + 1, error);
                await new Promise(resolve => setTimeout(resolve, delay * Math.pow(backoff, i)));
            }
        }
    }

    throw lastError;
};

// Default export
export default {
    ErrorTypes,
    parseError,
    showError,
    logError,
    handleError,
    withErrorHandling,
    withRetry,
    isDevelopment
};
