/**
 * Application Configuration
 * Centralized configuration for the entire app
 */

export const CONFIG = {
    API_BASE: 'https://clouedo.com/coachsearching/api',
    ENV_URL: 'https://clouedo.com/coachsearching/api/env.php',

    // Currency settings
    CURRENCIES: {
        EUR: { symbol: '€', rate: 1 },
        USD: { symbol: '$', rate: 1.09 },
        GBP: { symbol: '£', rate: 0.86 },
        CHF: { symbol: 'CHF ', rate: 0.95 }
    },

    // Default settings
    DEFAULT_CURRENCY: 'EUR',
    DEFAULT_LANGUAGE: 'en',

    // Pagination
    COACHES_PER_PAGE: 12,
    REVIEWS_PER_PAGE: 5,

    // Session durations (minutes)
    SESSION_DURATIONS: [30, 60, 90, 120],

    // Platform fees
    PLATFORM_FEE_PERCENT: 0.15,
    FOUNDING_COACH_FEE_PERCENT: 0.10,

    // Routes
    ROUTES: {
        HOME: '#home',
        COACHES: '#coaches',
        LOGIN: '#login',
        SIGNUP: '#signup',
        DASHBOARD: '#dashboard',
        ONBOARDING: '#onboarding',
        SIGNOUT: '#signout',
        COACH_PROFILE: '#coach',
        DISCOVER: '#discover',
        QUIZ: '#quiz'
    }
};

// Make config available globally for legacy code
window.CONFIG = CONFIG;

export default CONFIG;
