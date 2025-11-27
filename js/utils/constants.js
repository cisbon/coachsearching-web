/**
 * Application Constants
 * @fileoverview Centralized constants for the CoachSearching platform
 */

// ============================================================================
// API Configuration
// ============================================================================

/** @type {string} Base URL for the API */
export const API_BASE = 'https://clouedo.com/coachsearching/api';

/** @type {string} Environment configuration endpoint */
export const ENV_URL = `${API_BASE}/env.php`;

/** @type {number} Default API timeout in milliseconds */
export const API_TIMEOUT = 30000;

/** @type {number} Maximum retry attempts for failed requests */
export const MAX_RETRIES = 3;

/** @type {number} Base delay for exponential backoff in milliseconds */
export const RETRY_DELAY = 1000;

// ============================================================================
// Currency Configuration
// ============================================================================

/**
 * Supported currencies with their symbols and conversion rates
 * @type {Record<string, {symbol: string, rate: number, name: string}>}
 */
export const CURRENCIES = Object.freeze({
  EUR: { symbol: '€', rate: 1, name: 'Euro' },
  USD: { symbol: '$', rate: 1.09, name: 'US Dollar' },
  GBP: { symbol: '£', rate: 0.86, name: 'British Pound' },
  CHF: { symbol: 'CHF', rate: 0.95, name: 'Swiss Franc' },
});

/** @type {string} Default currency code */
export const DEFAULT_CURRENCY = 'EUR';

// ============================================================================
// Language Configuration
// ============================================================================

/**
 * Supported languages
 * @type {ReadonlyArray<{code: string, flagCode: string, label: string}>}
 */
export const LANGUAGES = Object.freeze([
  { code: 'en', flagCode: 'gb', label: 'English' },
  { code: 'de', flagCode: 'de', label: 'Deutsch' },
  { code: 'es', flagCode: 'es', label: 'Español' },
  { code: 'fr', flagCode: 'fr', label: 'Français' },
  { code: 'it', flagCode: 'it', label: 'Italiano' },
]);

/** @type {string} Default language code */
export const DEFAULT_LANGUAGE = 'en';

// ============================================================================
// Session & Booking Configuration
// ============================================================================

/**
 * Available session durations in minutes
 * @type {ReadonlyArray<number>}
 */
export const SESSION_DURATIONS = Object.freeze([30, 60, 90, 120]);

/**
 * Session types
 * @type {ReadonlyArray<{value: string, label: string, icon: string}>}
 */
export const SESSION_TYPES = Object.freeze([
  { value: 'online', label: 'Online', icon: '💻' },
  { value: 'onsite', label: 'In-Person', icon: '📍' },
]);

// ============================================================================
// Platform Fees
// ============================================================================

/** @type {number} Standard platform fee percentage (15%) */
export const PLATFORM_FEE_PERCENT = 0.15;

/** @type {number} Founding coach fee percentage (10%) */
export const FOUNDING_COACH_FEE_PERCENT = 0.10;

/** @type {number} Premium session fee percentage (12%) */
export const PREMIUM_FEE_PERCENT = 0.12;

/** @type {number} Number of founding coach slots */
export const FOUNDING_COACH_SLOTS = 50;

/** @type {number} Duration of founding coach benefits in months */
export const FOUNDING_COACH_BENEFIT_MONTHS = 12;

// ============================================================================
// Pagination
// ============================================================================

/** @type {number} Default number of coaches per page */
export const COACHES_PER_PAGE = 12;

/** @type {number} Default number of reviews per page */
export const REVIEWS_PER_PAGE = 5;

/** @type {number} Default number of bookings per page */
export const BOOKINGS_PER_PAGE = 10;

// ============================================================================
// Validation Rules
// ============================================================================

/** @type {number} Minimum password length */
export const MIN_PASSWORD_LENGTH = 6;

/** @type {number} Maximum bio length */
export const MAX_BIO_LENGTH = 2000;

/** @type {number} Maximum title length */
export const MAX_TITLE_LENGTH = 100;

/** @type {number} Minimum hourly rate */
export const MIN_HOURLY_RATE = 10;

/** @type {number} Maximum hourly rate */
export const MAX_HOURLY_RATE = 1000;

/** @type {RegExp} Email validation pattern */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** @type {RegExp} URL validation pattern */
export const URL_PATTERN = /^https?:\/\/.+/;

/** @type {RegExp} YouTube URL pattern */
export const YOUTUBE_PATTERN = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;

// ============================================================================
// Routes
// ============================================================================

/**
 * Application routes
 * @type {Readonly<Record<string, string>>}
 */
export const ROUTES = Object.freeze({
  HOME: '#home',
  COACHES: '#coaches',
  LOGIN: '#login',
  SIGNUP: '#signup',
  DASHBOARD: '#dashboard',
  ONBOARDING: '#onboarding',
  SIGNOUT: '#signout',
  COACH_PROFILE: '#coach',
  DISCOVER: '#discover',
  QUIZ: '#quiz',
  ADMIN: '#admin',
  BOOKING: '#booking',
  REFERRALS: '#referrals',
  SETTINGS: '#settings',
});

// ============================================================================
// Status Constants
// ============================================================================

/**
 * Booking status values
 * @type {Readonly<Record<string, string>>}
 */
export const BOOKING_STATUS = Object.freeze({
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  REFUNDED: 'refunded',
});

/**
 * Payment status values
 * @type {Readonly<Record<string, string>>}
 */
export const PAYMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  PAID: 'paid',
  REFUNDED: 'refunded',
  FAILED: 'failed',
});

/**
 * User roles
 * @type {Readonly<Record<string, string>>}
 */
export const USER_ROLES = Object.freeze({
  CLIENT: 'client',
  COACH: 'coach',
  ADMIN: 'admin',
  BUSINESS: 'business',
});

// ============================================================================
// UI Constants
// ============================================================================

/** @type {number} Debounce delay for search inputs in milliseconds */
export const SEARCH_DEBOUNCE_MS = 300;

/** @type {number} Toast notification duration in milliseconds */
export const TOAST_DURATION_MS = 5000;

/** @type {number} Modal animation duration in milliseconds */
export const MODAL_ANIMATION_MS = 200;

/** @type {number} Minimum click delay to prevent double clicks */
export const CLICK_DEBOUNCE_MS = 250;

// ============================================================================
// Storage Keys
// ============================================================================

/**
 * LocalStorage keys
 * @type {Readonly<Record<string, string>>}
 */
export const STORAGE_KEYS = Object.freeze({
  CURRENCY: 'currency',
  LANGUAGE: 'language',
  THEME: 'theme',
  AUTH_TOKEN: 'auth_token',
  USER_PREFERENCES: 'user_preferences',
  SEARCH_HISTORY: 'search_history',
  RECENT_COACHES: 'recent_coaches',
});

// ============================================================================
// Event Names
// ============================================================================

/**
 * Custom event names
 * @type {Readonly<Record<string, string>>}
 */
export const EVENTS = Object.freeze({
  CURRENCY_CHANGE: 'currencyChange',
  LANGUAGE_CHANGE: 'langChange',
  AUTH_CHANGE: 'authChange',
  THEME_CHANGE: 'themeChange',
  TOAST: 'toast',
  MODAL_OPEN: 'modalOpen',
  MODAL_CLOSE: 'modalClose',
});

// ============================================================================
// Specialties
// ============================================================================

/**
 * Coach specialty categories
 * @type {ReadonlyArray<string>}
 */
export const SPECIALTIES = Object.freeze([
  'Executive Coaching',
  'Leadership Development',
  'Career Coaching',
  'Life Coaching',
  'Business Coaching',
  'Health & Wellness',
  'Relationship Coaching',
  'Financial Coaching',
  'Performance Coaching',
  'Mindfulness & Meditation',
  'Public Speaking',
  'Communication Skills',
  'Time Management',
  'Stress Management',
  'Work-Life Balance',
  'Entrepreneurship',
  'Team Building',
  'Conflict Resolution',
  'Personal Development',
  'Goal Setting',
]);

export default {
  API_BASE,
  ENV_URL,
  CURRENCIES,
  LANGUAGES,
  SESSION_DURATIONS,
  PLATFORM_FEE_PERCENT,
  ROUTES,
  BOOKING_STATUS,
  PAYMENT_STATUS,
  USER_ROLES,
  STORAGE_KEYS,
  EVENTS,
  SPECIALTIES,
};
