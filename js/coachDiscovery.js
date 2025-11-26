// js/coachDiscovery.js - Coach Discovery System Components
import htm from './vendor/htm.js';
import { t, getCurrentLang } from './i18n.js';
import { CoachCardEnhanced, CoachCardFeatured, TrustScore } from './coachProfile.js';
import { CoachProfileModal } from './coachProfileModal.js';

const React = window.React;
const { useState, useEffect, useCallback, useMemo, useRef } = React;
const html = htm.bind(React.createElement);

// =============================================
// UTILITY: URL STATE MANAGEMENT
// =============================================

const useURLState = (key, defaultValue) => {
    const getURLValue = useCallback(() => {
        const params = new URLSearchParams(window.location.search);
        const value = params.get(key);
        if (!value) return defaultValue;

        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }, [key, defaultValue]);

    const [state, setState] = useState(getURLValue);

    const setURLState = useCallback((newValue) => {
        const params = new URLSearchParams(window.location.search);

        if (newValue === null || newValue === undefined || newValue === '' ||
            (Array.isArray(newValue) && newValue.length === 0)) {
            params.delete(key);
        } else {
            const stringValue = typeof newValue === 'object' ? JSON.stringify(newValue) : newValue;
            params.set(key, stringValue);
        }

        const newURL = params.toString()
            ? `${window.location.pathname}?${params.toString()}`
            : window.location.pathname;

        window.history.replaceState({}, '', newURL);
        setState(newValue);
    }, [key]);

    return [state, setURLState];
};

// =============================================
// SEARCH BAR COMPONENT
// =============================================

export const SearchBar = ({ value, onChange, onSearch, placeholder, suggestions = [] }) => {
    const [inputValue, setInputValue] = useState(value || '');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeSuggestion, setActiveSuggestion] = useState(-1);
    const inputRef = useRef(null);

    useEffect(() => {
        setInputValue(value || '');
    }, [value]);

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        setShowSuggestions(newValue.length > 0 && suggestions.length > 0);
        setActiveSuggestion(-1);
        onChange && onChange(newValue);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setShowSuggestions(false);
        onSearch && onSearch(inputValue);
    };

    const handleSuggestionClick = (suggestion) => {
        setInputValue(suggestion.term);
        setShowSuggestions(false);
        onSearch && onSearch(suggestion.term);
    };

    const handleKeyDown = (e) => {
        if (!showSuggestions) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveSuggestion(prev => Math.min(prev + 1, suggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveSuggestion(prev => Math.max(prev - 1, -1));
        } else if (e.key === 'Enter' && activeSuggestion >= 0) {
            e.preventDefault();
            handleSuggestionClick(suggestions[activeSuggestion]);
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    const handleBlur = () => {
        setTimeout(() => setShowSuggestions(false), 200);
    };

    return html`
        <form class="search-bar" onSubmit=${handleSubmit}>
            <div class="search-input-container">
                <span class="search-icon">🔍</span>
                <input
                    ref=${inputRef}
                    type="text"
                    class="search-input"
                    placeholder=${placeholder || t('search.placeholder') || 'Search coaches, specialties, locations...'}
                    value=${inputValue}
                    onChange=${handleInputChange}
                    onKeyDown=${handleKeyDown}
                    onFocus=${() => inputValue.length > 0 && setShowSuggestions(true)}
                    onBlur=${handleBlur}
                    autocomplete="off"
                />
                ${inputValue && html`
                    <button
                        type="button"
                        class="search-clear"
                        onClick=${() => {
                            setInputValue('');
                            onChange && onChange('');
                            inputRef.current?.focus();
                        }}
                    >×</button>
                `}
            </div>
            <button type="submit" class="search-button">
                ${t('search.button') || 'Search'}
            </button>

            ${showSuggestions && suggestions.length > 0 && html`
                <div class="search-suggestions">
                    ${suggestions.map((suggestion, index) => html`
                        <button
                            key=${suggestion.term}
                            type="button"
                            class="suggestion-item ${index === activeSuggestion ? 'active' : ''}"
                            onClick=${() => handleSuggestionClick(suggestion)}
                        >
                            <span class="suggestion-icon">
                                ${suggestion.type === 'specialty' ? '🎯' :
                                  suggestion.type === 'location' ? '📍' :
                                  suggestion.type === 'coach_name' ? '👤' : '🔍'}
                            </span>
                            <span class="suggestion-term">${suggestion.term}</span>
                            <span class="suggestion-type">${suggestion.type}</span>
                        </button>
                    `)}
                </div>
            `}
        </form>
    `;
};

// =============================================
// FILTER BAR COMPONENT
// =============================================

export const FilterBar = ({ filters, onChange, onClear, activeCount = 0 }) => {
    const [showFilters, setShowFilters] = useState(false);

    return html`
        <div class="filter-bar">
            <div class="filter-bar-main">
                <button
                    class="filter-toggle ${activeCount > 0 ? 'has-filters' : ''}"
                    onClick=${() => setShowFilters(!showFilters)}
                >
                    <span class="filter-icon">⚙️</span>
                    <span>${t('filters.title') || 'Filters'}</span>
                    ${activeCount > 0 && html`
                        <span class="filter-count">${activeCount}</span>
                    `}
                </button>

                <!-- Quick filter chips -->
                <div class="quick-filters">
                    <${QuickFilterChip}
                        label=${t('filters.hasVideo') || 'Has Video'}
                        icon="🎥"
                        active=${filters.hasVideo}
                        onClick=${() => onChange({ ...filters, hasVideo: !filters.hasVideo })}
                    />
                    <${QuickFilterChip}
                        label=${t('filters.verified') || 'Verified'}
                        icon="✓"
                        active=${filters.verified}
                        onClick=${() => onChange({ ...filters, verified: !filters.verified })}
                    />
                    <${QuickFilterChip}
                        label=${t('filters.online') || 'Online'}
                        icon="💻"
                        active=${filters.sessionType === 'online'}
                        onClick=${() => onChange({
                            ...filters,
                            sessionType: filters.sessionType === 'online' ? null : 'online'
                        })}
                    />
                    <${QuickFilterChip}
                        label=${t('filters.inPerson') || 'In-Person'}
                        icon="🏢"
                        active=${filters.sessionType === 'onsite'}
                        onClick=${() => onChange({
                            ...filters,
                            sessionType: filters.sessionType === 'onsite' ? null : 'onsite'
                        })}
                    />
                </div>

                ${activeCount > 0 && html`
                    <button class="clear-filters" onClick=${onClear}>
                        ${t('filters.clear') || 'Clear All'}
                    </button>
                `}
            </div>

            ${showFilters && html`
                <${FilterPanel}
                    filters=${filters}
                    onChange=${onChange}
                    onClose=${() => setShowFilters(false)}
                />
            `}
        </div>
    `;
};

// =============================================
// QUICK FILTER CHIP
// =============================================

const QuickFilterChip = ({ label, icon, active, onClick }) => {
    return html`
        <button
            class="quick-filter-chip ${active ? 'active' : ''}"
            onClick=${onClick}
        >
            ${icon && html`<span class="chip-icon">${icon}</span>`}
            <span class="chip-label">${label}</span>
        </button>
    `;
};

// =============================================
// FILTER PANEL (Expanded)
// =============================================

export const FilterPanel = ({ filters, onChange, onClose }) => {
    const [localFilters, setLocalFilters] = useState(filters);
    const [specialties, setSpecialties] = useState([]);
    const [locations, setLocations] = useState([]);

    // Load filter options
    useEffect(() => {
        const loadOptions = async () => {
            const supabase = window.supabaseClient;
            if (!supabase) return;

            try {
                const [specialtiesRes, locationsRes] = await Promise.all([
                    supabase.from('cs_specialty_categories').select('*').eq('is_active', true).order('sort_order'),
                    supabase.from('cs_locations').select('*').order('coach_count', { ascending: false }).limit(20)
                ]);

                if (specialtiesRes.data) setSpecialties(specialtiesRes.data);
                if (locationsRes.data) setLocations(locationsRes.data);
            } catch (error) {
                console.error('Error loading filter options:', error);
            }
        };

        loadOptions();
    }, []);

    const handleApply = () => {
        onChange(localFilters);
        onClose();
    };

    const handleReset = () => {
        const resetFilters = {
            specialties: [],
            location: null,
            priceMin: null,
            priceMax: null,
            languages: [],
            sessionType: null,
            hasVideo: false,
            verified: false,
            minRating: null
        };
        setLocalFilters(resetFilters);
    };

    const lang = getCurrentLang();

    return html`
        <div class="filter-panel">
            <div class="filter-panel-header">
                <h3>${t('filters.title') || 'Filters'}</h3>
                <button class="filter-panel-close" onClick=${onClose}>×</button>
            </div>

            <div class="filter-panel-content">
                <!-- Specialties -->
                <div class="filter-section">
                    <h4>${t('filters.specialty') || 'Specialty'}</h4>
                    <div class="filter-options-grid">
                        ${specialties.map(spec => html`
                            <label class="filter-checkbox" key=${spec.id}>
                                <input
                                    type="checkbox"
                                    checked=${localFilters.specialties?.includes(spec.slug)}
                                    onChange=${(e) => {
                                        const newSpecialties = e.target.checked
                                            ? [...(localFilters.specialties || []), spec.slug]
                                            : (localFilters.specialties || []).filter(s => s !== spec.slug);
                                        setLocalFilters({ ...localFilters, specialties: newSpecialties });
                                    }}
                                />
                                <span class="checkbox-icon">${spec.icon}</span>
                                <span class="checkbox-label">${spec.name[lang] || spec.name.en}</span>
                            </label>
                        `)}
                    </div>
                </div>

                <!-- Location -->
                <div class="filter-section">
                    <h4>${t('filters.location') || 'Location'}</h4>
                    <select
                        class="filter-select"
                        value=${localFilters.location || ''}
                        onChange=${(e) => setLocalFilters({ ...localFilters, location: e.target.value || null })}
                    >
                        <option value="">${t('filters.anyLocation') || 'Any Location'}</option>
                        ${locations.map(loc => html`
                            <option key=${loc.id} value=${loc.slug}>
                                ${loc.city}, ${loc.country} ${loc.coach_count > 0 ? `(${loc.coach_count})` : ''}
                            </option>
                        `)}
                    </select>
                </div>

                <!-- Price Range -->
                <div class="filter-section">
                    <h4>${t('filters.priceRange') || 'Price Range'}</h4>
                    <div class="price-range-inputs">
                        <div class="price-input-group">
                            <span class="currency">€</span>
                            <input
                                type="number"
                                placeholder=${t('filters.min') || 'Min'}
                                value=${localFilters.priceMin || ''}
                                onChange=${(e) => setLocalFilters({
                                    ...localFilters,
                                    priceMin: e.target.value ? parseInt(e.target.value) : null
                                })}
                                min="0"
                            />
                        </div>
                        <span class="price-separator">-</span>
                        <div class="price-input-group">
                            <span class="currency">€</span>
                            <input
                                type="number"
                                placeholder=${t('filters.max') || 'Max'}
                                value=${localFilters.priceMax || ''}
                                onChange=${(e) => setLocalFilters({
                                    ...localFilters,
                                    priceMax: e.target.value ? parseInt(e.target.value) : null
                                })}
                                min="0"
                            />
                        </div>
                    </div>
                </div>

                <!-- Languages -->
                <div class="filter-section">
                    <h4>${t('filters.languages') || 'Languages'}</h4>
                    <div class="filter-options-row">
                        ${[
                            { code: 'en', label: 'English', flag: '🇬🇧' },
                            { code: 'de', label: 'German', flag: '🇩🇪' },
                            { code: 'es', label: 'Spanish', flag: '🇪🇸' },
                            { code: 'fr', label: 'French', flag: '🇫🇷' },
                            { code: 'it', label: 'Italian', flag: '🇮🇹' }
                        ].map(lang => html`
                            <label class="filter-checkbox compact" key=${lang.code}>
                                <input
                                    type="checkbox"
                                    checked=${localFilters.languages?.includes(lang.code)}
                                    onChange=${(e) => {
                                        const newLangs = e.target.checked
                                            ? [...(localFilters.languages || []), lang.code]
                                            : (localFilters.languages || []).filter(l => l !== lang.code);
                                        setLocalFilters({ ...localFilters, languages: newLangs });
                                    }}
                                />
                                <span class="checkbox-icon">${lang.flag}</span>
                                <span class="checkbox-label">${lang.label}</span>
                            </label>
                        `)}
                    </div>
                </div>

                <!-- Session Type -->
                <div class="filter-section">
                    <h4>${t('filters.sessionType') || 'Session Type'}</h4>
                    <div class="filter-options-row">
                        <label class="filter-radio">
                            <input
                                type="radio"
                                name="sessionType"
                                checked=${!localFilters.sessionType}
                                onChange=${() => setLocalFilters({ ...localFilters, sessionType: null })}
                            />
                            <span>${t('filters.any') || 'Any'}</span>
                        </label>
                        <label class="filter-radio">
                            <input
                                type="radio"
                                name="sessionType"
                                checked=${localFilters.sessionType === 'online'}
                                onChange=${() => setLocalFilters({ ...localFilters, sessionType: 'online' })}
                            />
                            <span>💻 ${t('filters.online') || 'Online'}</span>
                        </label>
                        <label class="filter-radio">
                            <input
                                type="radio"
                                name="sessionType"
                                checked=${localFilters.sessionType === 'onsite'}
                                onChange=${() => setLocalFilters({ ...localFilters, sessionType: 'onsite' })}
                            />
                            <span>🏢 ${t('filters.inPerson') || 'In-Person'}</span>
                        </label>
                    </div>
                </div>

                <!-- Minimum Rating -->
                <div class="filter-section">
                    <h4>${t('filters.minRating') || 'Minimum Rating'}</h4>
                    <div class="rating-filter">
                        ${[4.5, 4.0, 3.5, 3.0].map(rating => html`
                            <button
                                key=${rating}
                                class="rating-option ${localFilters.minRating === rating ? 'active' : ''}"
                                onClick=${() => setLocalFilters({
                                    ...localFilters,
                                    minRating: localFilters.minRating === rating ? null : rating
                                })}
                            >
                                <span class="rating-stars">★</span>
                                <span>${rating}+</span>
                            </button>
                        `)}
                    </div>
                </div>

                <!-- Additional Options -->
                <div class="filter-section">
                    <h4>${t('filters.additional') || 'Additional'}</h4>
                    <div class="filter-options-col">
                        <label class="filter-checkbox">
                            <input
                                type="checkbox"
                                checked=${localFilters.hasVideo}
                                onChange=${(e) => setLocalFilters({ ...localFilters, hasVideo: e.target.checked })}
                            />
                            <span class="checkbox-icon">🎥</span>
                            <span class="checkbox-label">${t('filters.hasVideoIntro') || 'Has Video Introduction'}</span>
                        </label>
                        <label class="filter-checkbox">
                            <input
                                type="checkbox"
                                checked=${localFilters.verified}
                                onChange=${(e) => setLocalFilters({ ...localFilters, verified: e.target.checked })}
                            />
                            <span class="checkbox-icon">✓</span>
                            <span class="checkbox-label">${t('filters.verifiedCoach') || 'Verified Coach'}</span>
                        </label>
                    </div>
                </div>
            </div>

            <div class="filter-panel-footer">
                <button class="btn-reset" onClick=${handleReset}>
                    ${t('filters.reset') || 'Reset'}
                </button>
                <button class="btn-apply" onClick=${handleApply}>
                    ${t('filters.apply') || 'Apply Filters'}
                </button>
            </div>
        </div>
    `;
};

// =============================================
// SORT DROPDOWN
// =============================================

export const SortDropdown = ({ value, onChange }) => {
    const sortOptions = [
        { value: 'recommended', label: t('sort.recommended') || 'Recommended' },
        { value: 'rating', label: t('sort.rating') || 'Highest Rated' },
        { value: 'price_low', label: t('sort.priceLow') || 'Price: Low to High' },
        { value: 'price_high', label: t('sort.priceHigh') || 'Price: High to Low' },
        { value: 'experience', label: t('sort.experience') || 'Most Experienced' },
        { value: 'newest', label: t('sort.newest') || 'Newest' }
    ];

    return html`
        <div class="sort-dropdown">
            <label class="sort-label">${t('sort.label') || 'Sort by'}:</label>
            <select
                class="sort-select"
                value=${value || 'recommended'}
                onChange=${(e) => onChange(e.target.value)}
            >
                ${sortOptions.map(opt => html`
                    <option key=${opt.value} value=${opt.value}>${opt.label}</option>
                `)}
            </select>
        </div>
    `;
};

// =============================================
// RESULTS HEADER
// =============================================

export const ResultsHeader = ({ count, searchTerm, sortValue, onSortChange }) => {
    return html`
        <div class="results-header">
            <div class="results-info">
                <h2 class="results-title">
                    ${searchTerm
                        ? `${t('search.resultsFor') || 'Results for'} "${searchTerm}"`
                        : (t('search.allCoaches') || 'All Coaches')
                    }
                </h2>
                <span class="results-count">
                    ${count} ${count === 1
                        ? (t('search.coachFound') || 'coach found')
                        : (t('search.coachesFound') || 'coaches found')
                    }
                </span>
            </div>
            <${SortDropdown} value=${sortValue} onChange=${onSortChange} />
        </div>
    `;
};

// =============================================
// COACH SEARCH RESULTS
// =============================================

export const CoachSearchResults = ({
    coaches,
    loading,
    onViewDetails,
    formatPrice,
    emptyMessage
}) => {
    if (loading) {
        return html`
            <div class="search-loading">
                <div class="loading-spinner"></div>
                <p>${t('common.loading') || 'Loading coaches...'}</p>
            </div>
        `;
    }

    if (!coaches || coaches.length === 0) {
        return html`
            <div class="search-empty">
                <span class="empty-icon">🔍</span>
                <h3>${t('search.noResults') || 'No coaches found'}</h3>
                <p>${emptyMessage || t('search.noResultsHint') || 'Try adjusting your search criteria'}</p>
            </div>
        `;
    }

    // Separate featured (with video) and regular coaches
    const featuredCoaches = coaches.filter(c => c.video_intro_url);
    const regularCoaches = coaches.filter(c => !c.video_intro_url);

    return html`
        <div class="search-results">
            ${featuredCoaches.length > 0 && html`
                <section class="results-section featured">
                    <h3 class="section-label">
                        <span class="section-icon">🎥</span>
                        ${t('search.withVideo') || 'Coaches with Video'}
                    </h3>
                    <div class="featured-grid">
                        ${featuredCoaches.map(coach => html`
                            <${CoachCardFeatured}
                                key=${coach.id}
                                coach=${coach}
                                onViewDetails=${onViewDetails}
                                formatPrice=${formatPrice}
                            />
                        `)}
                    </div>
                </section>
            `}

            ${regularCoaches.length > 0 && html`
                <section class="results-section">
                    ${featuredCoaches.length > 0 && html`
                        <h3 class="section-label">
                            <span class="section-icon">👨‍🏫</span>
                            ${t('search.moreCoaches') || 'More Coaches'}
                        </h3>
                    `}
                    <div class="coaches-grid">
                        ${regularCoaches.map(coach => html`
                            <${CoachCardEnhanced}
                                key=${coach.id}
                                coach=${coach}
                                onViewDetails=${onViewDetails}
                                formatPrice=${formatPrice}
                            />
                        `)}
                    </div>
                </section>
            `}
        </div>
    `;
};

// =============================================
// SPECIALTY BROWSER
// =============================================

export const SpecialtyBrowser = ({ onSelect, selectedSpecialties = [] }) => {
    const [categories, setCategories] = useState([]);
    const lang = getCurrentLang();

    useEffect(() => {
        const loadCategories = async () => {
            const supabase = window.supabaseClient;
            if (!supabase) return;

            try {
                const { data } = await supabase
                    .from('cs_specialty_categories')
                    .select('*')
                    .eq('is_active', true)
                    .order('sort_order');

                if (data) setCategories(data);
            } catch (error) {
                console.error('Error loading categories:', error);
            }
        };

        loadCategories();
    }, []);

    const handleToggle = (slug) => {
        const newSelection = selectedSpecialties.includes(slug)
            ? selectedSpecialties.filter(s => s !== slug)
            : [...selectedSpecialties, slug];
        onSelect(newSelection);
    };

    return html`
        <div class="specialty-browser">
            <h3 class="browser-title">${t('browse.specialties') || 'Browse by Specialty'}</h3>
            <div class="specialty-grid">
                ${categories.map(cat => html`
                    <button
                        key=${cat.id}
                        class="specialty-card ${selectedSpecialties.includes(cat.slug) ? 'selected' : ''}"
                        onClick=${() => handleToggle(cat.slug)}
                    >
                        <span class="specialty-icon">${cat.icon}</span>
                        <span class="specialty-name">${cat.name[lang] || cat.name.en}</span>
                    </button>
                `)}
            </div>
        </div>
    `;
};

// =============================================
// LOCATION BROWSER
// =============================================

export const LocationBrowser = ({ onSelect, selectedLocation }) => {
    const [locations, setLocations] = useState([]);

    useEffect(() => {
        const loadLocations = async () => {
            const supabase = window.supabaseClient;
            if (!supabase) return;

            try {
                const { data } = await supabase
                    .from('cs_locations')
                    .select('*')
                    .gt('coach_count', 0)
                    .order('coach_count', { ascending: false })
                    .limit(12);

                if (data) setLocations(data);
            } catch (error) {
                console.error('Error loading locations:', error);
            }
        };

        loadLocations();
    }, []);

    return html`
        <div class="location-browser">
            <h3 class="browser-title">${t('browse.locations') || 'Popular Locations'}</h3>
            <div class="location-grid">
                ${locations.map(loc => html`
                    <button
                        key=${loc.id}
                        class="location-card ${selectedLocation === loc.slug ? 'selected' : ''}"
                        onClick=${() => onSelect(selectedLocation === loc.slug ? null : loc.slug)}
                    >
                        <span class="location-city">${loc.city}</span>
                        <span class="location-country">${loc.country}</span>
                        <span class="location-count">${loc.coach_count} ${t('browse.coaches') || 'coaches'}</span>
                    </button>
                `)}
            </div>
        </div>
    `;
};

// =============================================
// DISCOVERY PAGE (Main Component)
// =============================================

export const DiscoveryPage = ({ session, formatPrice, onStartQuiz }) => {
    // URL-synced state
    const [searchTerm, setSearchTerm] = useURLState('q', '');
    const [filters, setFilters] = useURLState('filters', {
        specialties: [],
        location: null,
        priceMin: null,
        priceMax: null,
        languages: [],
        sessionType: null,
        hasVideo: false,
        verified: false,
        minRating: null
    });
    const [sortBy, setSortBy] = useURLState('sort', 'recommended');

    // Local state
    const [coaches, setCoaches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [suggestions, setSuggestions] = useState([]);
    const [selectedCoach, setSelectedCoach] = useState(null);

    // Count active filters
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.specialties?.length > 0) count++;
        if (filters.location) count++;
        if (filters.priceMin || filters.priceMax) count++;
        if (filters.languages?.length > 0) count++;
        if (filters.sessionType) count++;
        if (filters.hasVideo) count++;
        if (filters.verified) count++;
        if (filters.minRating) count++;
        return count;
    }, [filters]);

    // Load coaches
    const loadCoaches = useCallback(async () => {
        setLoading(true);

        try {
            const supabase = window.supabaseClient;
            if (!supabase) {
                console.error('Supabase client not available');
                setLoading(false);
                return;
            }

            let query = supabase
                .from('cs_coaches')
                .select('*')
                .eq('onboarding_completed', true);

            // Apply search term
            if (searchTerm) {
                query = query.or(`full_name.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`);
            }

            // Apply filters
            if (filters.location) {
                query = query.ilike('city', `%${filters.location}%`);
            }
            if (filters.priceMin) {
                query = query.gte('hourly_rate', filters.priceMin);
            }
            if (filters.priceMax) {
                query = query.lte('hourly_rate', filters.priceMax);
            }
            if (filters.hasVideo) {
                query = query.not('video_intro_url', 'is', null);
            }
            if (filters.verified) {
                query = query.eq('is_verified', true);
            }
            if (filters.minRating) {
                query = query.gte('rating_average', filters.minRating);
            }

            // Apply sorting
            switch (sortBy) {
                case 'rating':
                    query = query.order('rating_average', { ascending: false, nullsLast: true });
                    break;
                case 'price_low':
                    query = query.order('hourly_rate', { ascending: true, nullsLast: true });
                    break;
                case 'price_high':
                    query = query.order('hourly_rate', { ascending: false, nullsLast: true });
                    break;
                case 'experience':
                    query = query.order('years_experience', { ascending: false, nullsLast: true });
                    break;
                case 'newest':
                    query = query.order('created_at', { ascending: false });
                    break;
                default: // recommended
                    query = query
                        .order('video_intro_url', { ascending: false, nullsLast: true })
                        .order('trust_score', { ascending: false, nullsLast: true })
                        .order('rating_average', { ascending: false, nullsLast: true });
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error loading coaches:', error);
            } else {
                // Apply client-side filters for array fields
                let filteredData = data || [];

                if (filters.specialties?.length > 0) {
                    filteredData = filteredData.filter(coach =>
                        coach.specialties?.some(s =>
                            filters.specialties.some(fs =>
                                s.toLowerCase().includes(fs.toLowerCase())
                            )
                        )
                    );
                }

                if (filters.languages?.length > 0) {
                    filteredData = filteredData.filter(coach =>
                        coach.languages?.some(l => filters.languages.includes(l))
                    );
                }

                if (filters.sessionType) {
                    filteredData = filteredData.filter(coach =>
                        coach.session_types?.includes(filters.sessionType)
                    );
                }

                setCoaches(filteredData);

                // Track search event
                trackSearchEvent({
                    searchTerm,
                    filters,
                    resultsCount: filteredData.length
                });
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }, [searchTerm, filters, sortBy]);

    // Load coaches on mount and when filters change
    useEffect(() => {
        loadCoaches();
    }, [loadCoaches]);

    // Load search suggestions
    const loadSuggestions = useCallback(async (term) => {
        if (!term || term.length < 2) {
            setSuggestions([]);
            return;
        }

        try {
            const supabase = window.supabaseClient;
            if (!supabase) return;

            const { data } = await supabase
                .from('cs_search_suggestions')
                .select('*')
                .ilike('term', `%${term}%`)
                .order('weight', { ascending: false })
                .limit(5);

            if (data) {
                setSuggestions(data);
            }
        } catch (error) {
            console.error('Error loading suggestions:', error);
        }
    }, []);

    const handleSearch = useCallback((term) => {
        setSearchTerm(term);
    }, [setSearchTerm]);

    const handleSearchChange = useCallback((term) => {
        loadSuggestions(term);
    }, [loadSuggestions]);

    const handleClearFilters = useCallback(() => {
        setFilters({
            specialties: [],
            location: null,
            priceMin: null,
            priceMax: null,
            languages: [],
            sessionType: null,
            hasVideo: false,
            verified: false,
            minRating: null
        });
    }, [setFilters]);

    const handleViewDetails = useCallback((coach) => {
        setSelectedCoach(coach);
    }, []);

    const handleCloseModal = useCallback(() => {
        setSelectedCoach(null);
    }, []);

    return html`
        <div class="discovery-page">
            <!-- Search Section -->
            <section class="discovery-search-section">
                <div class="container">
                    <h1 class="discovery-title">${t('discovery.title') || 'Find Your Perfect Coach'}</h1>
                    <p class="discovery-subtitle">${t('discovery.subtitle') || 'Search, filter, or take our matching quiz'}</p>

                    <div class="search-wrapper">
                        <${SearchBar}
                            value=${searchTerm}
                            onChange=${handleSearchChange}
                            onSearch=${handleSearch}
                            suggestions=${suggestions}
                        />
                    </div>

                    <!-- Quiz CTA -->
                    <div class="quiz-cta">
                        <span>${t('discovery.orTry') || "Not sure? Try our"}</span>
                        <button class="quiz-link" onClick=${onStartQuiz}>
                            ${t('discovery.matchingQuiz') || 'Matching Quiz'} →
                        </button>
                    </div>
                </div>
            </section>

            <!-- Filters & Results -->
            <section class="discovery-content">
                <div class="container">
                    <${FilterBar}
                        filters=${filters}
                        onChange=${setFilters}
                        onClear=${handleClearFilters}
                        activeCount=${activeFilterCount}
                    />

                    <${ResultsHeader}
                        count=${coaches.length}
                        searchTerm=${searchTerm}
                        sortValue=${sortBy}
                        onSortChange=${setSortBy}
                    />

                    <${CoachSearchResults}
                        coaches=${coaches}
                        loading=${loading}
                        onViewDetails=${handleViewDetails}
                        formatPrice=${formatPrice}
                    />
                </div>
            </section>

            <!-- Browse Sections -->
            ${!searchTerm && activeFilterCount === 0 && html`
                <section class="discovery-browse">
                    <div class="container">
                        <${SpecialtyBrowser}
                            selectedSpecialties=${filters.specialties || []}
                            onSelect=${(specs) => setFilters({ ...filters, specialties: specs })}
                        />

                        <${LocationBrowser}
                            selectedLocation=${filters.location}
                            onSelect=${(loc) => setFilters({ ...filters, location: loc })}
                        />
                    </div>
                </section>
            `}

            <!-- Profile Modal -->
            ${selectedCoach && html`
                <${CoachProfileModal}
                    coach=${selectedCoach}
                    onClose=${handleCloseModal}
                    formatPrice=${formatPrice}
                    session=${session}
                />
            `}
        </div>
    `;
};

// =============================================
// ANALYTICS TRACKING
// =============================================

const trackSearchEvent = async ({ searchTerm, filters, resultsCount }) => {
    try {
        const supabase = window.supabaseClient;
        if (!supabase) return;

        // Get or create session ID
        let sessionId = sessionStorage.getItem('search_session_id');
        if (!sessionId) {
            sessionId = crypto.randomUUID();
            sessionStorage.setItem('search_session_id', sessionId);
        }

        await supabase.from('cs_search_events').insert({
            session_id: sessionId,
            search_query: searchTerm || null,
            filters: filters,
            results_count: resultsCount,
            page_url: window.location.href,
            referrer: document.referrer,
            device_type: getDeviceType()
        });
    } catch (error) {
        console.error('Error tracking search event:', error);
    }
};

const getDeviceType = () => {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
};

// =============================================
// EXPORTS
// =============================================

export default {
    SearchBar,
    FilterBar,
    FilterPanel,
    SortDropdown,
    ResultsHeader,
    CoachSearchResults,
    SpecialtyBrowser,
    LocationBrowser,
    DiscoveryPage
};
