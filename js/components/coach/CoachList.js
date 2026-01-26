/**
 * CoachList Component
 * Displays filterable list of coaches with search, filters, and sorting
 */

import htm from '../../vendor/htm.js';
import { t } from '../../i18n.js';
import { CoachCard } from './CoachCard.js';
import { CoachCardSkeleton } from './CoachCardSkeleton.js';
import { FilterSidebar } from './FilterSidebar.js';

const React = window.React;
const { useState, useEffect, useCallback, useMemo } = React;
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
        topRated: false,
        minRating: null,
        onlineOnly: false,
        inPersonOnly: false,
        experience: '',
        offersOnsite: !!initialCity, // Enable onsite filter when city is provided
        offersVirtual: false,
        locationCountry: '',
        locationCity: initialCity || ''
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
            topRated: false,
            minRating: null,
            onlineOnly: false,
            inPersonOnly: false,
            experience: '',
            offersOnsite: false,
            offersVirtual: false,
            locationCountry: '',
            locationCity: ''
        });
    };

    // Memoized filtered and sorted coaches
    const filteredCoaches = useMemo(() => {
        let result = [...coaches];

        // Text search filter
        if (searchFilters && searchFilters.searchTerm) {
            const term = searchFilters.searchTerm.toLowerCase();
            result = result.filter(coach =>
                coach.full_name?.toLowerCase().includes(term) ||
                coach.title?.toLowerCase().includes(term) ||
                coach.bio?.toLowerCase().includes(term) ||
                coach.specialties?.some(s => s.toLowerCase().includes(term)) ||
                coach.location?.toLowerCase().includes(term)
            );
        }

        // Price filters
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
        if (filters.topRated) {
            result = result.filter(coach => (coach.rating_average || coach.rating || 0) >= 4.5);
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

        // Location filters (only apply when in-person is selected)
        if (filters.offersOnsite && filters.locationCountry) {
            result = result.filter(coach =>
                coach.location_country?.toLowerCase() === filters.locationCountry.toLowerCase()
            );
        }
        if (filters.offersOnsite && filters.locationCity) {
            const citySearch = filters.locationCity.toLowerCase().trim();
            result = result.filter(coach =>
                coach.location_city?.toLowerCase().includes(citySearch)
            );
        }

        // Experience filter
        if (filters.experience) {
            const minYears = Number(filters.experience);
            result = result.filter(coach => (coach.years_experience || 0) >= minYears);
        }

        // Helper to check if coach has video
        const hasVideo = (coach) => !!(coach.intro_video_url || coach.video_url || coach.video_intro_url);

        // Sorting - always prioritize coaches with videos first
        switch (filters.sortBy) {
            case 'rating':
                result.sort((a, b) => {
                    const aVideo = hasVideo(a) ? 1 : 0;
                    const bVideo = hasVideo(b) ? 1 : 0;
                    if (bVideo !== aVideo) return bVideo - aVideo;
                    return (b.rating_average || b.rating || 0) - (a.rating_average || a.rating || 0);
                });
                break;
            case 'price_low':
                result.sort((a, b) => {
                    const aVideo = hasVideo(a) ? 1 : 0;
                    const bVideo = hasVideo(b) ? 1 : 0;
                    if (bVideo !== aVideo) return bVideo - aVideo;
                    return (a.hourly_rate || 0) - (b.hourly_rate || 0);
                });
                break;
            case 'price_high':
                result.sort((a, b) => {
                    const aVideo = hasVideo(a) ? 1 : 0;
                    const bVideo = hasVideo(b) ? 1 : 0;
                    if (bVideo !== aVideo) return bVideo - aVideo;
                    return (b.hourly_rate || 0) - (a.hourly_rate || 0);
                });
                break;
            case 'reviews':
                result.sort((a, b) => {
                    const aVideo = hasVideo(a) ? 1 : 0;
                    const bVideo = hasVideo(b) ? 1 : 0;
                    if (bVideo !== aVideo) return bVideo - aVideo;
                    return (b.rating_count || b.reviews_count || 0) - (a.rating_count || a.reviews_count || 0);
                });
                break;
            default:
                result.sort((a, b) => {
                    const aVideo = hasVideo(a) ? 1 : 0;
                    const bVideo = hasVideo(b) ? 1 : 0;
                    if (bVideo !== aVideo) return bVideo - aVideo;
                    return (b.rating_average || b.rating || 0) - (a.rating_average || a.rating || 0);
                });
                break;
        }

        return result;
    }, [searchFilters, coaches, filters]);

    // Load coaches from Supabase
    const loadCoaches = useCallback(async () => {
        setLoading(true);

        let loadedSuccessfully = false;

        if (window.supabaseClient) {
            try {
                const { data: supabaseCoaches, error } = await window.supabaseClient
                    .from('cs_coaches')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (!error && supabaseCoaches && supabaseCoaches.length > 0) {
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
        filters.topRated,
        filters.minRating,
        filters.offersVirtual,
        filters.offersOnsite,
        filters.locationCountry,
        filters.locationCity,
        filters.experience
    ].filter(Boolean).length;

    return html`
    <div class="coaches-section">
        <div class="container" style=${{ marginTop: '40px', paddingBottom: '40px' }}>
            <!-- Header with title and filter toggle -->
            <div class="coaches-header">
                <h2 class="section-title">
                    ${searchFilters?.searchTerm ? `Search Results (${filteredCoaches.length})` : 'Top Rated Coaches'}
                </h2>
                <div class="header-actions">
                    <button
                        class="filter-toggle-btn ${showFilters ? 'active' : ''}"
                        onClick=${() => setShowFilters(!showFilters)}
                    >
                        <span>⚙️ Filters</span>
                        ${activeFilterCount > 0 && html`<span class="filter-count">${activeFilterCount}</span>`}
                    </button>
                    <select
                        class="sort-select-mobile"
                        value=${filters.sortBy}
                        onChange=${(e) => setFilters({ ...filters, sortBy: e.target.value })}
                    >
                        <option value="relevance">Sort: Relevance</option>
                        <option value="rating">Sort: Highest Rated</option>
                        <option value="price_low">Sort: Price Low-High</option>
                        <option value="price_high">Sort: Price High-Low</option>
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
                            <div class="empty-state-text">No coaches found</div>
                            <div class="empty-state-subtext">Try adjusting your filters or search criteria</div>
                            ${activeFilterCount > 0 && html`
                                <button class="btn-secondary" onClick=${resetFilters} style=${{ marginTop: '16px' }}>
                                    Clear All Filters
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
                            Showing ${filteredCoaches.length} coach${filteredCoaches.length !== 1 ? 'es' : ''}
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
