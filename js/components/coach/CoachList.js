/**
 * CoachList Component
 * Displays filterable list of coaches with search, filters, and sorting
 */

import htm from '../../vendor/htm.js';
import { t } from '../../i18n.js';
import { CoachCard } from './CoachCard.js';
import { CoachCardSkeleton } from './CoachCardSkeleton.js';
import { FilterSidebar } from './FilterSidebar.js';
import { useCities } from '../../context/AppContext.js';
import { queryClient } from '../../config/queryClient.js';
import { QUERY_KEYS, STALE_TIMES } from '../../config/queryConfig.js';

const React = window.React;
const { useState, useEffect, useCallback, useMemo, useRef } = React;
const html = htm.bind(React.createElement);

// Mock data fallback
const mockCoaches = [
    {
        id: '1',
        full_name: 'Sarah Johnson',
        avatar_url: 'https://ui-avatars.com/api/?name=Sarah+Johnson',
        title: 'Executive Leadership Coach',
        bio: 'Helping executives and entrepreneurs achieve their full potential through strategic coaching and mentorship.',
        location: 'New York, USA',
        languages: ['English', 'Spanish'],
        specialties: ['Leadership', 'Career Transition', 'Executive Coaching'],
        hourly_rate: 150,
        rating_average: 4.9,
        rating_count: 127
    },
    {
        id: '2',
        full_name: 'Michael Chen',
        avatar_url: 'https://ui-avatars.com/api/?name=Michael+Chen',
        title: 'Career Development Coach',
        bio: 'Specializing in career transitions and professional development for mid-career professionals.',
        location: 'San Francisco, USA',
        languages: ['English', 'Mandarin'],
        specialties: ['Career Change', 'Interview Prep', 'Salary Negotiation'],
        hourly_rate: 120,
        rating_average: 4.8,
        rating_count: 89
    },
    {
        id: '3',
        full_name: 'Emma Schmidt',
        avatar_url: 'https://ui-avatars.com/api/?name=Emma+Schmidt',
        title: 'Life & Wellness Coach',
        bio: 'Empowering individuals to create balanced, fulfilling lives through holistic coaching approaches.',
        location: 'Berlin, Germany',
        languages: ['German', 'English'],
        specialties: ['Work-Life Balance', 'Stress Management', 'Personal Growth'],
        hourly_rate: 100,
        rating_average: 5.0,
        rating_count: 64
    }
];

/**
 * CoachList Component
 * @param {Object} props
 * @param {Object} props.searchFilters - Search filters from parent
 * @param {Object} props.session - User session
 * @param {React.Component} props.CoachDetailModal - Modal component for coach details
 * @param {Array} props.initialSpecialties - Pre-selected specialty filters
 * @param {string} props.initialCity - Pre-selected city filter for location-based pages
 */
export function CoachList({ searchFilters, session, CoachDetailModal, initialSpecialties, initialCity }) {
    const [coaches, setCoaches] = useState(mockCoaches);
    const [selectedCoach, setSelectedCoach] = useState(null);
    const [loading, setLoading] = useState(false);
    const [, forceUpdate] = useState({});

    // Local search state (for the inline search bar)
    const [localSearchTerm, setLocalSearchTerm] = useState(searchFilters?.searchTerm || '');
    const [activeSearchTerm, setActiveSearchTerm] = useState(searchFilters?.searchTerm || '');
    const searchInputRef = useRef(null);

    // Sync with external searchFilters when they change
    useEffect(() => {
        if (searchFilters?.searchTerm !== undefined) {
            setLocalSearchTerm(searchFilters.searchTerm);
            setActiveSearchTerm(searchFilters.searchTerm);
        }
    }, [searchFilters?.searchTerm]);

    const handleSearchSubmit = useCallback((e) => {
        e && e.preventDefault();
        setActiveSearchTerm(localSearchTerm.trim());
    }, [localSearchTerm]);

    const handleSearchClear = useCallback(() => {
        setLocalSearchTerm('');
        setActiveSearchTerm('');
        if (searchInputRef.current) searchInputRef.current.focus();
    }, []);

    // Get cities list to look up state info for coaches
    const { cities, getLocalizedCityName } = useCities();

    // Convert initialCity (name) to city_id when cities are loaded
    useEffect(() => {
        if (initialCity && cities.list?.length > 0) {
            const cityNameLower = initialCity.toLowerCase().trim();
            const matchingCity = cities.list.find(city =>
                city.name_en?.toLowerCase() === cityNameLower ||
                city.name_de?.toLowerCase() === cityNameLower ||
                city.name_fr?.toLowerCase() === cityNameLower ||
                city.name_es?.toLowerCase() === cityNameLower ||
                city.name_it?.toLowerCase() === cityNameLower ||
                city.code?.toLowerCase() === cityNameLower
            );
            if (matchingCity) {
                setFilters(prev => ({
                    ...prev,
                    locationCityId: matchingCity.id,
                    locationCountry: matchingCity.country_en,
                    locationState: matchingCity.state || ''
                }));
            }
        }
    }, [initialCity, cities.list]);

    // Hide filters by default on mobile screens (< 768px), show on larger screens
    const [showFilters, setShowFilters] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth >= 768;
        }
        return true; // Default to true for SSR
    });
    const [filters, setFilters] = useState({
        sortBy: 'relevance',
        minPrice: '',
        maxPrice: '',
        specialties: initialSpecialties || [],
        languages: [],
        hasVideo: false,
        freeIntro: false,
        hasCertification: false,
        isVerified: false,
        topRated: false,
        minRating: null,
        onlineOnly: false,
        inPersonOnly: false,
        experience: '',
        offersOnsite: !!initialCity, // Enable onsite filter when city is provided
        offersVirtual: false,
        locationCountry: '',
        locationCityId: null,    // Reference to cs_cities.id for filtering
        locationState: ''        // State code for regional filtering (e.g., DE-BW for Baden-Württemberg)
    });

    const resetFilters = () => {
        setFilters({
            sortBy: 'relevance',
            minPrice: '',
            maxPrice: '',
            specialties: [],
            languages: [],
            hasVideo: false,
            freeIntro: false,
            hasCertification: false,
            isVerified: false,
            topRated: false,
            minRating: null,
            onlineOnly: false,
            inPersonOnly: false,
            experience: '',
            offersOnsite: false,
            offersVirtual: false,
            locationCountry: '',
            locationCityId: null,
            locationState: ''
        });
    };

    // Helper: search across all relevant coach profile fields
    const matchesSearch = useCallback((coach, term) => {
        if (!term) return true;
        const t = term.toLowerCase();
        return (
            coach.full_name?.toLowerCase().includes(t) ||
            coach.title?.toLowerCase().includes(t) ||
            coach.bio?.toLowerCase().includes(t) ||
            coach.specialties?.some(s => s.toLowerCase().includes(t)) ||
            coach.location?.toLowerCase().includes(t) ||
            coach.location_city?.toLowerCase().includes(t) ||
            coach.city?.toLowerCase().includes(t) ||
            coach.languages?.some(l => l.toLowerCase().includes(t))
        );
    }, []);

    // Coaches filtered by everything EXCEPT budget (for budget histogram)
    const coachesExcludingBudget = useMemo(() => {
        let result = [...coaches];

        // Text search filter (use activeSearchTerm from inline search bar)
        const searchTerm = activeSearchTerm || (searchFilters && searchFilters.searchTerm) || '';
        if (searchTerm) {
            result = result.filter(coach => matchesSearch(coach, searchTerm));
        }

        // Specialty filter
        if (filters.specialties?.length > 0) {
            result = result.filter(coach =>
                filters.specialties.some(s =>
                    coach.specialties?.some(cs => cs.toLowerCase().includes(s.toLowerCase()))
                )
            );
        }

        // Language filter
        if (filters.languages?.length > 0) {
            result = result.filter(coach =>
                filters.languages.some(l =>
                    coach.languages?.some(cl => cl.toLowerCase().includes(l.toLowerCase()))
                )
            );
        }

        // Feature filters
        if (filters.hasVideo) {
            result = result.filter(coach => coach.intro_video_url || coach.video_url || coach.video_intro_url);
        }
        if (filters.freeIntro) {
            result = result.filter(coach => coach.offers_free_intro || coach.free_discovery_call || coach.offers_free_discovery);
        }
        if (filters.hasCertification) {
            result = result.filter(coach => coach.cs_coach_certifications?.length > 0);
        }
        if (filters.isVerified) {
            result = result.filter(coach => coach.is_verified === true);
        }

        // Session format filters
        if (filters.offersVirtual) {
            result = result.filter(coach =>
                coach.session_types?.includes('video') ||
                coach.session_formats?.includes('online') ||
                coach.session_formats?.includes('video') ||
                coach.offers_online
            );
        }
        if (filters.offersOnsite) {
            result = result.filter(coach =>
                coach.session_types?.includes('in-person') ||
                coach.session_formats?.includes('in-person') ||
                coach.offers_in_person ||
                coach.location_city
            );
        }

        // Location filters
        const getCoachCityExcl = (coach) => {
            if (!coach.city_id || !cities.list || cities.list.length === 0) return null;
            return cities.list.find(city => city.id === coach.city_id);
        };

        if (filters.locationCountry) {
            result = result.filter(coach => {
                const city = getCoachCityExcl(coach);
                return city?.country_en?.toLowerCase() === filters.locationCountry.toLowerCase();
            });
        }

        if (filters.locationCityId) {
            const selectedState = filters.locationState;
            if (selectedState && cities.list && cities.list.length > 0) {
                result = result.filter(coach => {
                    if (coach.city_id === filters.locationCityId) return true;
                    const city = getCoachCityExcl(coach);
                    const coachState = city?.state || null;
                    if (coachState && coachState === selectedState) return true;
                    return false;
                });
            } else {
                result = result.filter(coach => coach.city_id === filters.locationCityId);
            }
        }

        if (filters.experience) {
            const minYears = Number(filters.experience);
            result = result.filter(coach => (coach.years_experience || 0) >= minYears);
        }

        return result;
    }, [searchFilters, activeSearchTerm, coaches, filters.specialties, filters.languages, filters.hasVideo, filters.freeIntro, filters.hasCertification, filters.isVerified, filters.offersVirtual, filters.offersOnsite, filters.locationCountry, filters.locationCityId, filters.locationState, filters.experience, cities.list, matchesSearch]);

    // IDs of coaches matching all filters except budget (for histogram)
    const filteredCoachIdsForBudget = useMemo(() => {
        return coachesExcludingBudget.map(c => c.id);
    }, [coachesExcludingBudget]);

    // Memoized filtered and sorted coaches
    const filteredCoaches = useMemo(() => {
        let result = [...coaches];

        // Text search filter (use activeSearchTerm from inline search bar)
        const searchTerm = activeSearchTerm || (searchFilters && searchFilters.searchTerm) || '';
        if (searchTerm) {
            result = result.filter(coach => matchesSearch(coach, searchTerm));
        }

        // Price/Budget filters - now work via service prices loaded in FilterSidebar
        // Still check hourly_rate as fallback for coaches without services
        if (filters.minPrice) {
            result = result.filter(coach => coach.hourly_rate >= Number(filters.minPrice));
        }
        if (filters.maxPrice) {
            result = result.filter(coach => coach.hourly_rate <= Number(filters.maxPrice));
        }

        // Specialty filter
        if (filters.specialties?.length > 0) {
            result = result.filter(coach =>
                filters.specialties.some(s =>
                    coach.specialties?.some(cs => cs.toLowerCase().includes(s.toLowerCase()))
                )
            );
        }

        // Language filter
        if (filters.languages?.length > 0) {
            result = result.filter(coach =>
                filters.languages.some(l =>
                    coach.languages?.some(cl => cl.toLowerCase().includes(l.toLowerCase()))
                )
            );
        }

        // Feature filters
        if (filters.hasVideo) {
            result = result.filter(coach => coach.intro_video_url || coach.video_url || coach.video_intro_url);
        }
        if (filters.freeIntro) {
            result = result.filter(coach => coach.offers_free_intro || coach.free_discovery_call || coach.offers_free_discovery);
        }
        if (filters.hasCertification) {
            result = result.filter(coach => coach.cs_coach_certifications?.length > 0);
        }
        if (filters.topRated) {
            result = result.filter(coach => (coach.rating_average || coach.rating || 0) >= 4.5);
        }
        if (filters.isVerified) {
            result = result.filter(coach => coach.is_verified === true);
        }

        // Rating filter
        if (filters.minRating) {
            result = result.filter(coach => (coach.rating_average || coach.rating || 0) >= filters.minRating);
        }

        // Session format filters
        if (filters.offersVirtual) {
            result = result.filter(coach =>
                coach.session_types?.includes('video') ||
                coach.session_formats?.includes('online') ||
                coach.session_formats?.includes('video') ||
                coach.offers_online
            );
        }
        if (filters.offersOnsite) {
            result = result.filter(coach =>
                coach.session_types?.includes('in-person') ||
                coach.session_formats?.includes('in-person') ||
                coach.offers_in_person ||
                coach.location_city
            );
        }

        // Helper function to get city object for a coach (by city_id)
        const getCoachCity = (coach) => {
            if (!coach.city_id || !cities.list || cities.list.length === 0) return null;
            return cities.list.find(city => city.id === coach.city_id);
        };

        // Helper function to get state code for a coach
        const getCoachState = (coach) => {
            const city = getCoachCity(coach);
            return city?.state || null;
        };

        // Location filters - work independently of session type filters
        // Country filter - filter by the country of the coach's city
        if (filters.locationCountry) {
            result = result.filter(coach => {
                const city = getCoachCity(coach);
                return city?.country_en?.toLowerCase() === filters.locationCountry.toLowerCase();
            });
        }

        // City filter - when a city is selected, include coaches from the exact city OR the same state
        // This enables showing coaches from the same region (e.g., Munich + Nuremberg in Bavaria/DE-BY)
        if (filters.locationCityId) {
            const selectedState = filters.locationState;

            if (selectedState && cities.list && cities.list.length > 0) {
                // Include coaches from the exact city OR any city in the same state
                result = result.filter(coach => {
                    // Exact city match by city_id - always include
                    if (coach.city_id === filters.locationCityId) return true;

                    // Check if coach is in the same state (e.g., both Munich and Nuremberg are in DE-BY)
                    const coachState = getCoachState(coach);
                    if (coachState && coachState === selectedState) return true;

                    return false;
                });
            } else {
                // No state info available or cities not loaded, just filter by exact city_id match
                result = result.filter(coach => coach.city_id === filters.locationCityId);
            }
        }

        // Experience filter
        if (filters.experience) {
            const minYears = Number(filters.experience);
            result = result.filter(coach => (coach.years_experience || 0) >= minYears);
        }

        // Helper to check if coach has video
        const hasVideo = (coach) => !!(coach.intro_video_url || coach.video_url || coach.video_intro_url);

        // Helper to get location priority (0 = exact city match, 1 = same state, 2 = other)
        // This ensures coaches are sorted: exact city first, then same state, then others
        const getLocationPriority = (coach) => {
            if (!filters.locationCityId) return 2; // No city filter, all equal

            // Check for exact city match by city_id
            if (coach.city_id === filters.locationCityId) {
                return 0; // Highest priority - exact city match
            }

            // Check for same state match (e.g., Nuremberg when Munich is selected, both in DE-BY)
            if (filters.locationState && cities.list && cities.list.length > 0) {
                const coachState = getCoachState(coach);
                if (coachState && coachState === filters.locationState) {
                    return 1; // Medium priority - same state
                }
            }

            return 2; // Lowest priority - other locations
        };

        // Sorting - prioritize: 1) location match, 2) has video, 3) sort criteria
        switch (filters.sortBy) {
            case 'rating':
                result.sort((a, b) => {
                    const aLoc = getLocationPriority(a);
                    const bLoc = getLocationPriority(b);
                    if (aLoc !== bLoc) return aLoc - bLoc;
                    const aVideo = hasVideo(a) ? 1 : 0;
                    const bVideo = hasVideo(b) ? 1 : 0;
                    if (bVideo !== aVideo) return bVideo - aVideo;
                    return (b.rating_average || b.rating || 0) - (a.rating_average || a.rating || 0);
                });
                break;
            case 'price_low':
                result.sort((a, b) => {
                    const aLoc = getLocationPriority(a);
                    const bLoc = getLocationPriority(b);
                    if (aLoc !== bLoc) return aLoc - bLoc;
                    const aVideo = hasVideo(a) ? 1 : 0;
                    const bVideo = hasVideo(b) ? 1 : 0;
                    if (bVideo !== aVideo) return bVideo - aVideo;
                    return (a.hourly_rate || 0) - (b.hourly_rate || 0);
                });
                break;
            case 'price_high':
                result.sort((a, b) => {
                    const aLoc = getLocationPriority(a);
                    const bLoc = getLocationPriority(b);
                    if (aLoc !== bLoc) return aLoc - bLoc;
                    const aVideo = hasVideo(a) ? 1 : 0;
                    const bVideo = hasVideo(b) ? 1 : 0;
                    if (bVideo !== aVideo) return bVideo - aVideo;
                    return (b.hourly_rate || 0) - (a.hourly_rate || 0);
                });
                break;
            case 'reviews':
                result.sort((a, b) => {
                    const aLoc = getLocationPriority(a);
                    const bLoc = getLocationPriority(b);
                    if (aLoc !== bLoc) return aLoc - bLoc;
                    const aVideo = hasVideo(a) ? 1 : 0;
                    const bVideo = hasVideo(b) ? 1 : 0;
                    if (bVideo !== aVideo) return bVideo - aVideo;
                    return (b.rating_count || b.reviews_count || 0) - (a.rating_count || a.reviews_count || 0);
                });
                break;
            default:
                result.sort((a, b) => {
                    const aLoc = getLocationPriority(a);
                    const bLoc = getLocationPriority(b);
                    if (aLoc !== bLoc) return aLoc - bLoc;
                    const aVideo = hasVideo(a) ? 1 : 0;
                    const bVideo = hasVideo(b) ? 1 : 0;
                    if (bVideo !== aVideo) return bVideo - aVideo;
                    return (b.rating_average || b.rating || 0) - (a.rating_average || a.rating || 0);
                });
                break;
        }

        return result;
    }, [searchFilters, activeSearchTerm, coaches, filters, cities.list, matchesSearch]);

    // Load coaches from Supabase (cached via TanStack Query)
    const loadCoaches = useCallback(async () => {
        setLoading(true);

        let loadedSuccessfully = false;

        if (window.supabaseClient) {
            try {
                const supabaseCoaches = await queryClient.fetchQuery({
                    queryKey: QUERY_KEYS.coachList('all'),
                    queryFn: async () => {
                        const { data, error } = await window.supabaseClient
                            .from('cs_coaches')
                            .select(`
                                *,
                                cs_coach_certifications (
                                    id,
                                    certification_id,
                                    date_acquired,
                                    certificate_url,
                                    certificate_file_path,
                                    is_verified,
                                    cs_certifications (
                                        id,
                                        code,
                                        name,
                                        short_name,
                                        badge_url,
                                        sort_order
                                    )
                                )
                            `)
                            .order('created_at', { ascending: false });
                        if (error) throw error;
                        return data || [];
                    },
                    staleTime: STALE_TIMES.coachList,
                });

                if (supabaseCoaches && supabaseCoaches.length > 0) {
                    setCoaches(supabaseCoaches);
                    loadedSuccessfully = true;
                }
            } catch {
                // Silently handle errors
            }
        }

        if (!loadedSuccessfully) {
            setCoaches(mockCoaches);
        }

        setLoading(false);
    }, []);

    useEffect(() => {
        loadCoaches();
    }, [loadCoaches]);

    useEffect(() => {
        const handleCurrencyChange = () => {
            forceUpdate({});
        };
        window.addEventListener('currencyChange', handleCurrencyChange);
        return () => window.removeEventListener('currencyChange', handleCurrencyChange);
    }, []);

    const activeFilterCount = [
        filters.minPrice,
        filters.maxPrice,
        ...(filters.specialties || []),
        ...(filters.languages || []),
        filters.hasVideo,
        filters.freeIntro,
        filters.hasCertification,
        filters.isVerified,
        filters.topRated,
        filters.minRating,
        filters.offersVirtual,
        filters.offersOnsite,
        filters.locationCountry,
        filters.locationCityId,
        filters.experience
    ].filter(Boolean).length;

    return html`
    <div class="coaches-section">
        <div class="container" style=${{ marginTop: '40px', paddingBottom: '40px' }}>
            <!-- Mobile Search Bar (above filters on mobile) -->
            <div class="coaches-search-mobile">
                <form class="coaches-search-bar" onSubmit=${handleSearchSubmit}>
                    <div class="coaches-search-input-wrapper">
                        <span class="coaches-search-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        </span>
                        <input
                            type="text"
                            class="coaches-search-input"
                            placeholder=${t('hero.searchPlaceholder') || 'Search coaches, specialties...'}
                            value=${localSearchTerm}
                            onInput=${(e) => setLocalSearchTerm(e.target.value)}
                        />
                        ${localSearchTerm && html`
                            <button type="button" class="coaches-search-clear" onClick=${handleSearchClear}>×</button>
                        `}
                    </div>
                    <button type="submit" class="coaches-search-btn">
                        ${t('hero.searchBtn') || 'Search'}
                    </button>
                </form>
            </div>

            <!-- Header with search bar and filter toggle -->
            <div class="coaches-header">
                <div class="coaches-search-desktop">
                    <form class="coaches-search-bar" onSubmit=${handleSearchSubmit}>
                        <div class="coaches-search-input-wrapper">
                            <span class="coaches-search-icon">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                            </span>
                            <input
                                ref=${searchInputRef}
                                type="text"
                                class="coaches-search-input"
                                placeholder=${t('hero.searchPlaceholder') || 'Search coaches, specialties...'}
                                value=${localSearchTerm}
                                onInput=${(e) => setLocalSearchTerm(e.target.value)}
                            />
                            ${localSearchTerm && html`
                                <button type="button" class="coaches-search-clear" onClick=${handleSearchClear}>×</button>
                            `}
                        </div>
                        <button type="submit" class="coaches-search-btn">
                            ${t('hero.searchBtn') || 'Search'}
                        </button>
                    </form>
                </div>
                <div class="header-actions">
                    <button
                        class="filter-toggle-btn ${showFilters ? 'active' : ''}"
                        onClick=${() => setShowFilters(!showFilters)}
                    >
                        <span>⚙️ ${t('filter.filters') || 'Filters'}</span>
                        ${activeFilterCount > 0 && html`<span class="filter-count">${activeFilterCount}</span>`}
                    </button>
                    <select
                        class="sort-select-mobile"
                        value=${filters.sortBy}
                        onChange=${(e) => setFilters({ ...filters, sortBy: e.target.value })}
                    >
                        <option value="relevance">${t('filter.sortBy') || 'Sort'}: ${t('filter.relevance') || 'Relevance'}</option>
                        <option value="rating">${t('filter.sortBy') || 'Sort'}: ${t('filter.highestRated') || 'Highest Rated'}</option>
                        <option value="price_low">${t('filter.sortBy') || 'Sort'}: ${t('filter.budgetLowHigh') || 'Budget Low-High'}</option>
                        <option value="price_high">${t('filter.sortBy') || 'Sort'}: ${t('filter.budgetHighLow') || 'Budget High-Low'}</option>
                    </select>
                </div>
            </div>

            <div class="coaches-layout ${showFilters ? 'with-filters' : ''}">
                <!-- Filter Sidebar -->
                ${showFilters && html`
                    <${FilterSidebar}
                        filters=${filters}
                        onChange=${setFilters}
                        onReset=${resetFilters}
                        filteredCoachIds=${filteredCoachIdsForBudget}
                    />
                `}

                <!-- Coach List -->
                <div class="coaches-main">
                    ${loading && html`
                        <div class="coach-list">
                            ${[...Array(6)].map((_, i) => html`<${CoachCardSkeleton} key=${'skeleton-' + i} />`)}
                        </div>
                    `}
                    ${!loading && filteredCoaches.length === 0 && html`
                        <div class="empty-state">
                            <div class="empty-state-icon">🔍</div>
                            <div class="empty-state-text">${t('filter.noResults') || 'No coaches found'}</div>
                            <div class="empty-state-subtext">${t('filter.adjustFilters') || 'Try adjusting your filters or search criteria'}</div>
                            ${activeFilterCount > 0 && html`
                                <button class="btn-secondary" onClick=${resetFilters} style=${{ marginTop: '16px' }}>
                                    ${t('filter.clearAll') || 'Clear All Filters'}
                                </button>
                            `}
                            <div class="empty-state-promo" style=${{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
                                <a href=${session?.user ? '/ai-council' : '/login'} class="ai-council-promo-link" style=${{ color: '#8B5CF6', fontWeight: '500', textDecoration: 'none' }}>
                                    🎯 ${session?.user ? t('aiCouncil.promoTry') : t('aiCouncil.promoSignIn')}
                                </a>
                            </div>
                        </div>
                    `}
                    ${!loading && filteredCoaches.length > 0 && html`
                        <div class="results-info">
                            ${t('filter.showing') || 'Showing'} ${filteredCoaches.length} ${filteredCoaches.length !== 1 ? (t('filter.coaches') || 'coaches') : (t('filter.coach') || 'coach')}
                        </div>
                        <div class="coach-list">
                            ${filteredCoaches.map(coach => html`<${CoachCard} key=${coach.id} coach=${coach} session=${session} onViewDetails=${setSelectedCoach} />`)}
                        </div>
                    `}
                </div>
            </div>
        </div>
        ${selectedCoach && CoachDetailModal && html`<${CoachDetailModal} coach=${selectedCoach} session=${session} onClose=${() => setSelectedCoach(null)} />`}
    </div>
    `;
}

export default CoachList;
