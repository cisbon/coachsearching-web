/**
 * App Context
 * Manages global application state (currency, language, UI state)
 */

import htm from '../vendor/htm.js';
import { CONFIG } from '../config.js';

const React = window.React;
const { createContext, useContext, useState, useEffect, useCallback, useMemo } = React;
const html = htm.bind(React.createElement);

// Create context
const AppContext = createContext(null);

/**
 * App Provider Component
 */
export function AppProvider({ children }) {
    // Currency state
    const [currency, setCurrencyState] = useState(() => {
        return localStorage.getItem('currency') || CONFIG.DEFAULT_CURRENCY;
    });

    // Language state
    const [language, setLanguageState] = useState(() => {
        return localStorage.getItem('language') || CONFIG.DEFAULT_LANGUAGE;
    });

    // UI state
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState(null);

    // Current route
    const [currentRoute, setCurrentRoute] = useState(window.location.hash || '#home');

    // Listen for hash changes
    useEffect(() => {
        const handleHashChange = () => {
            setCurrentRoute(window.location.hash || '#home');
            setMobileMenuOpen(false); // Close mobile menu on navigation
        };

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    // Currency methods
    const setCurrency = useCallback((newCurrency) => {
        if (CONFIG.CURRENCIES[newCurrency]) {
            setCurrencyState(newCurrency);
            localStorage.setItem('currency', newCurrency);
        }
    }, []);

    const formatPrice = useCallback((priceInEur) => {
        const currencyConfig = CONFIG.CURRENCIES[currency];
        const convertedPrice = priceInEur * currencyConfig.rate;
        return `${currencyConfig.symbol}${convertedPrice.toFixed(2)}`;
    }, [currency]);

    // Language methods
    const setLanguage = useCallback((newLanguage) => {
        setLanguageState(newLanguage);
        localStorage.setItem('language', newLanguage);
    }, []);

    // Notification methods
    const showNotification = useCallback((message, type = 'info', duration = 5000) => {
        setNotification({ message, type, id: Date.now() });

        if (duration > 0) {
            setTimeout(() => {
                setNotification(null);
            }, duration);
        }
    }, []);

    const clearNotification = useCallback(() => {
        setNotification(null);
    }, []);

    // Navigation helper
    const navigate = useCallback((route) => {
        window.location.hash = route;
    }, []);

    // Parse route and params
    const routeInfo = useMemo(() => {
        const [path, queryString] = currentRoute.split('?');
        const params = {};

        if (queryString) {
            const searchParams = new URLSearchParams(queryString);
            for (const [key, value] of searchParams) {
                params[key] = value;
            }
        }

        // Extract ID from routes like #coach/123
        const parts = path.split('/');
        const basePath = parts[0];
        const id = parts[1] || null;

        return {
            path: basePath,
            fullPath: path,
            id,
            params,
            query: queryString || ''
        };
    }, [currentRoute]);

    const value = {
        // Currency
        currency,
        setCurrency,
        formatPrice,
        currencies: CONFIG.CURRENCIES,

        // Language
        language,
        setLanguage,

        // UI State
        isMobileMenuOpen,
        setMobileMenuOpen,
        isLoading,
        setIsLoading,

        // Notifications
        notification,
        showNotification,
        clearNotification,

        // Navigation
        currentRoute,
        routeInfo,
        navigate,

        // Config
        config: CONFIG
    };

    return html`
        <${AppContext.Provider} value=${value}>
            ${children}
        </${AppContext.Provider}>
    `;
}

/**
 * Hook to use app context
 */
export function useApp() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
}

/**
 * Hook for just currency
 */
export function useCurrency() {
    const { currency, setCurrency, formatPrice, currencies } = useApp();
    return { currency, setCurrency, formatPrice, currencies };
}

/**
 * Hook for just navigation/routing
 */
export function useNavigation() {
    const { currentRoute, routeInfo, navigate } = useApp();
    return { currentRoute, routeInfo, navigate };
}

/**
 * Hook for notifications
 */
export function useNotification() {
    const { notification, showNotification, clearNotification } = useApp();
    return { notification, showNotification, clearNotification };
}

export default AppContext;
