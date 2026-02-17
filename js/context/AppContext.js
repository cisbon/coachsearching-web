/**
 * App Context
 * Manages global application state (currency, language, UI state, lookup options, cities)
 * Lookup data (options, cities, certifications) is now powered by TanStack Query
 * for automatic caching, deduplication, and stale-time management.
 */

import htm from '../vendor/htm.js';
import { CONFIG } from '../config.js';
import { getCurrentLang } from '../i18n.js';
import { useLookupOptionsQuery, useCitiesQuery, useCertificationsQuery } from '../hooks/useSupabaseQuery.js';
import { useQueryClient } from '../config/queryClient.js';
import { QUERY_KEYS } from '../config/queryConfig.js';

const React = window.React;
const { createContext, useContext, useState, useEffect, useCallback, useMemo } = React;
const html = htm.bind(React.createElement);

// Create context
const AppContext = createContext(null);

/**
 * App Provider Component
 */
export function AppProvider({ children }) {
    // Track supabase readiness to trigger query hooks
    const [, setSupabaseReady] = useState(!!window.supabaseClient);
    useEffect(() => {
        if (window.supabaseClient) return;
        const handler = () => setSupabaseReady(true);
        window.addEventListener('supabaseReady', handler);
        // Also check immediately in case event already fired
        if (window.supabaseClient) setSupabaseReady(true);
        return () => window.removeEventListener('supabaseReady', handler);
    }, []);

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

    // ─── TanStack Query for lookup data ─────────────────────────────
    const queryClientInstance = useQueryClient();

    const { data: lookupData } = useLookupOptionsQuery();
    const lookupOptions = lookupData || {
        specialties: [],
        languages: [],
        sessionFormats: [],
        isLoaded: false,
    };

    const { data: citiesData } = useCitiesQuery();
    const cities = citiesData || { list: [], isLoaded: false };

    const { data: certificationsData } = useCertificationsQuery();
    const certifications = certificationsData || { list: [], isLoaded: false };

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

    // Force refresh lookup options (invalidates TanStack Query cache)
    const refreshLookupOptions = useCallback(() => {
        queryClientInstance.invalidateQueries({ queryKey: QUERY_KEYS.lookupOptions });
    }, [queryClientInstance]);

    // Force refresh cities (invalidates TanStack Query cache)
    const refreshCities = useCallback(() => {
        queryClientInstance.invalidateQueries({ queryKey: QUERY_KEYS.cities });
    }, [queryClientInstance]);

    // Force refresh certifications (invalidates TanStack Query cache)
    const refreshCertifications = useCallback(() => {
        queryClientInstance.invalidateQueries({ queryKey: QUERY_KEYS.certifications });
    }, [queryClientInstance]);

    // Helper to find certification by id
    const getCertificationById = useCallback((id) => {
        return certifications.list.find(c => c.id === id);
    }, [certifications.list]);

    // Helper to find certification by code
    const getCertificationByCode = useCallback((code) => {
        return certifications.list.find(c => c.code === code);
    }, [certifications.list]);

    // Helper to get certifications grouped by organization
    const getCertificationsByOrg = useCallback(() => {
        const grouped = {};
        certifications.list.forEach(cert => {
            const orgKey = cert.issuing_organization;
            if (!grouped[orgKey]) {
                grouped[orgKey] = {
                    code: cert.issuing_organization,
                    name: cert.organization_full_name || cert.issuing_organization,
                    certifications: []
                };
            }
            grouped[orgKey].certifications.push(cert);
        });
        return grouped;
    }, [certifications.list]);

    // Helper to get localized city name
    const getLocalizedCityName = useCallback((city, lang = null) => {
        const currentLang = lang || getCurrentLang() || language || 'en';
        return city?.[`name_${currentLang}`] || city?.name_en || city?.code || '';
    }, [language]);

    // Helper to get cities grouped by country
    const getCitiesByCountry = useCallback(() => {
        const grouped = {};
        const currentLang = getCurrentLang() || language || 'en';

        cities.list.forEach(city => {
            const countryKey = city.country_code;
            if (!grouped[countryKey]) {
                grouped[countryKey] = {
                    code: city.country_code,
                    name: city.country_en,
                    cities: []
                };
            }
            grouped[countryKey].cities.push({
                ...city,
                localizedName: city[`name_${currentLang}`] || city.name_en
            });
        });

        return grouped;
    }, [cities.list, language]);

    // Helper to find city by code
    const getCityByCode = useCallback((code) => {
        return cities.list.find(c => c.code === code);
    }, [cities.list]);

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

        // Cities
        cities,
        getLocalizedCityName,
        getCitiesByCountry,
        getCityByCode,
        refreshCities,

        // Certifications
        certifications,
        getCertificationById,
        getCertificationByCode,
        getCertificationsByOrg,
        refreshCertifications,

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

/**
 * Hook for cities (coaching locations)
 */
export function useCities() {
    const { cities, getLocalizedCityName, getCitiesByCountry, getCityByCode, refreshCities } = useApp();
    return { cities, getLocalizedCityName, getCitiesByCountry, getCityByCode, refreshCities };
}

/**
 * Hook for certifications (coaching certifications lookup)
 */
export function useCertifications() {
    const { certifications, getCertificationById, getCertificationByCode, getCertificationsByOrg, refreshCertifications } = useApp();
    return { certifications, getCertificationById, getCertificationByCode, getCertificationsByOrg, refreshCertifications };
}

export default AppContext;
