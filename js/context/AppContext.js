/**
 * App Context
 * Manages global application state (currency, language, UI state, lookup options, cities)
 */

import htm from '../vendor/htm.js';
import { CONFIG } from '../config.js';
import { getCurrentLang } from '../i18n.js';

const React = window.React;
const { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } = React;
const html = htm.bind(React.createElement);

// Cache configuration
const LOOKUP_CACHE_KEY = 'cs_lookup_options';
const CITIES_CACHE_KEY = 'cs_cities';
const CERTIFICATIONS_CACHE_KEY = 'cs_certifications';
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

    // Cities state (coaching locations)
    const [cities, setCities] = useState(() => {
        // Try to load from cache on initial render
        try {
            const cached = localStorage.getItem(CITIES_CACHE_KEY);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < LOOKUP_CACHE_TTL) {
                    return { list: data, isLoaded: true };
                }
            }
        } catch (e) {
            console.warn('AppContext: Failed to load cities cache', e);
        }
        return { list: [], isLoaded: false };
    });
    const citiesFetchRef = useRef(false); // Prevent duplicate fetches

    // Certifications state (coaching certifications lookup table)
    const [certifications, setCertifications] = useState(() => {
        // Try to load from cache on initial render
        try {
            const cached = localStorage.getItem(CERTIFICATIONS_CACHE_KEY);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < LOOKUP_CACHE_TTL) {
                    return { list: data, isLoaded: true };
                }
            }
        } catch (e) {
            console.warn('AppContext: Failed to load certifications cache', e);
        }
        return { list: [], isLoaded: false };
    });
    const certificationsFetchRef = useRef(false); // Prevent duplicate fetches

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
                    lookupFetchRef.current = false; // Allow retry
                    return;
                }

                const { data: options, error } = await window.supabaseClient
                    .from('cs_lookup_options')
                    .select('*')
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true });

                if (error) {
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

                // Update state
                setLookupOptions(grouped);

                // Save to localStorage cache
                try {
                    localStorage.setItem(LOOKUP_CACHE_KEY, JSON.stringify({
                        data: grouped,
                        timestamp: Date.now()
                    }));
                } catch {
                    // Silently ignore cache errors
                }
            } catch {
                lookupFetchRef.current = false; // Allow retry
            }
        };

        fetchLookupOptions();
    }, [lookupOptions.isLoaded]);

    // Fetch cities on mount (if not cached)
    useEffect(() => {
        const fetchCities = async () => {
            // Prevent duplicate fetches
            if (citiesFetchRef.current) return;

            // Skip if already loaded from cache
            if (cities.isLoaded) return;

            citiesFetchRef.current = true;

            try {
                // Wait for supabase client to be available
                let attempts = 0;
                while (!window.supabaseClient && attempts < 50) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }

                if (!window.supabaseClient) {
                    citiesFetchRef.current = false; // Allow retry
                    return;
                }

                const { data: cityList, error } = await window.supabaseClient
                    .from('cs_cities')
                    .select('*')
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true });

                if (error) {
                    console.warn('AppContext: Failed to fetch cities', error);
                    citiesFetchRef.current = false; // Allow retry
                    return;
                }

                // Update state
                setCities({ list: cityList || [], isLoaded: true });

                // Save to localStorage cache
                try {
                    localStorage.setItem(CITIES_CACHE_KEY, JSON.stringify({
                        data: cityList || [],
                        timestamp: Date.now()
                    }));
                } catch {
                    // Silently ignore cache errors
                }
            } catch (err) {
                console.warn('AppContext: Cities fetch error', err);
                citiesFetchRef.current = false; // Allow retry
            }
        };

        fetchCities();
    }, [cities.isLoaded]);

    // Fetch certifications on mount (if not cached)
    useEffect(() => {
        const fetchCertifications = async () => {
            // Prevent duplicate fetches
            if (certificationsFetchRef.current) return;

            // Skip if already loaded from cache
            if (certifications.isLoaded) return;

            certificationsFetchRef.current = true;

            try {
                // Wait for supabase client to be available
                let attempts = 0;
                while (!window.supabaseClient && attempts < 50) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }

                if (!window.supabaseClient) {
                    certificationsFetchRef.current = false; // Allow retry
                    return;
                }

                const { data: certList, error } = await window.supabaseClient
                    .from('cs_certifications')
                    .select('*')
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true });

                if (error) {
                    console.warn('AppContext: Failed to fetch certifications', error);
                    certificationsFetchRef.current = false; // Allow retry
                    return;
                }

                // Update state
                setCertifications({ list: certList || [], isLoaded: true });

                // Save to localStorage cache
                try {
                    localStorage.setItem(CERTIFICATIONS_CACHE_KEY, JSON.stringify({
                        data: certList || [],
                        timestamp: Date.now()
                    }));
                } catch {
                    // Silently ignore cache errors
                }
            } catch (err) {
                console.warn('AppContext: Certifications fetch error', err);
                certificationsFetchRef.current = false; // Allow retry
            }
        };

        fetchCertifications();
    }, [certifications.isLoaded]);

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

    // Force refresh cities (clears cache)
    const refreshCities = useCallback(() => {
        localStorage.removeItem(CITIES_CACHE_KEY);
        citiesFetchRef.current = false;
        setCities({ list: [], isLoaded: false });
    }, []);

    // Force refresh certifications (clears cache)
    const refreshCertifications = useCallback(() => {
        localStorage.removeItem(CERTIFICATIONS_CACHE_KEY);
        certificationsFetchRef.current = false;
        setCertifications({ list: [], isLoaded: false });
    }, []);

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
