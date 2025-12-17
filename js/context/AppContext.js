/**
 * App Context
 * Manages global application state (currency, language, UI state, lookup options)
 */

import htm from '../vendor/htm.js';
import { CONFIG } from '../config.js';
import { getCurrentLang } from '../i18n.js';

const React = window.React;
const { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } = React;
const html = htm.bind(React.createElement);

// Cache configuration
const LOOKUP_CACHE_KEY = 'cs_lookup_options';
const LOOKUP_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

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

    // Lookup options state (specialties, languages, session formats)
    const [lookupOptions, setLookupOptions] = useState(() => {
        // Try to load from cache on initial render
        try {
            const cached = localStorage.getItem(LOOKUP_CACHE_KEY);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < LOOKUP_CACHE_TTL) {
                    return data;
                }
            }
        } catch (e) {
            console.warn('AppContext: Failed to load lookup cache', e);
        }
        return {
            specialties: [],
            languages: [],
            sessionFormats: [],
            isLoaded: false
        };
    });
    const lookupFetchRef = useRef(false); // Prevent duplicate fetches

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

    // Fetch lookup options on mount (if not cached)
    useEffect(() => {
        const fetchLookupOptions = async () => {
            // Prevent duplicate fetches
            if (lookupFetchRef.current) return;

            // Skip if already loaded from cache
            if (lookupOptions.isLoaded) return;

            lookupFetchRef.current = true;

            try {
                // Wait for supabase client to be available (initialized in App component)
                let attempts = 0;
                while (!window.supabaseClient && attempts < 50) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }

                if (!window.supabaseClient) {
                    console.warn('AppContext: Supabase client not available after waiting');
                    lookupFetchRef.current = false; // Allow retry
                    return;
                }

                console.log('AppContext: Fetching lookup options...');
                const { data: options, error } = await window.supabaseClient
                    .from('cs_lookup_options')
                    .select('*')
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true });

                if (error) {
                    console.error('AppContext: Error fetching lookup options:', error);
                    lookupFetchRef.current = false; // Allow retry
                    return;
                }

                // Group by type
                const grouped = {
                    specialties: options?.filter(o => o.type === 'specialty') || [],
                    languages: options?.filter(o => o.type === 'language') || [],
                    sessionFormats: options?.filter(o => o.type === 'session_format') || [],
                    isLoaded: true
                };

                console.log('AppContext: Loaded', grouped.specialties.length, 'specialties,', grouped.languages.length, 'languages');

                // Update state
                setLookupOptions(grouped);

                // Save to localStorage cache
                try {
                    localStorage.setItem(LOOKUP_CACHE_KEY, JSON.stringify({
                        data: grouped,
                        timestamp: Date.now()
                    }));
                    console.log('AppContext: Lookup options cached');
                } catch (e) {
                    console.warn('AppContext: Failed to cache lookup options', e);
                }
            } catch (error) {
                console.error('AppContext: Failed to fetch lookup options:', error);
                lookupFetchRef.current = false; // Allow retry
            }
        };

        fetchLookupOptions();
    }, [lookupOptions.isLoaded]);

    // Helper to get localized name from lookup option
    const getLocalizedName = useCallback((option, lang = null) => {
        const currentLang = lang || getCurrentLang() || language || 'en';
        return option?.[`name_${currentLang}`] || option?.name_en || option?.code || '';
    }, [language]);

    // Helper to get localized description from lookup option
    const getLocalizedDescription = useCallback((option, lang = null) => {
        const currentLang = lang || getCurrentLang() || language || 'en';
        return option?.[`description_${currentLang}`] || option?.description_en || '';
    }, [language]);

    // Force refresh lookup options (clears cache)
    const refreshLookupOptions = useCallback(() => {
        localStorage.removeItem(LOOKUP_CACHE_KEY);
        lookupFetchRef.current = false;
        setLookupOptions({
            specialties: [],
            languages: [],
            sessionFormats: [],
            isLoaded: false
        });
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

        // Lookup Options
        lookupOptions,
        getLocalizedName,
        getLocalizedDescription,
        refreshLookupOptions,

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

/**
 * Hook for lookup options (specialties, languages, session formats)
 */
export function useLookupOptions() {
    const { lookupOptions, getLocalizedName, getLocalizedDescription, refreshLookupOptions } = useApp();
    return { lookupOptions, getLocalizedName, getLocalizedDescription, refreshLookupOptions };
}

export default AppContext;
