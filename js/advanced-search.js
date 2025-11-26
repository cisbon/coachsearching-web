import { html } from 'https://esm.sh/htm/react';
import { useState, useEffect, useRef } from 'react';
import api from './api-client.js';

/**
 * Advanced Search & Filter System
 *
 * Features:
 * - Real-time search with debouncing
 * - Advanced filters (price, rating, specialties, availability, location)
 * - Sort options (relevance, price, rating, experience)
 * - Search suggestions & autocomplete
 * - Save search preferences
 * - Filter chips for active filters
 * - Results count
 * - Pagination
 * - Mobile-optimized filter drawer
 */

export const AdvancedSearch = ({ onSelectCoach }) => {
    const [query, setQuery] = useState('');
    const [filters, setFilters] = useState({
        specialties: [],
        min_price: null,
        max_price: null,
        min_rating: null,
        languages: [],
        is_verified: null,
        availability_day: null
    });
    const [sort, setSort] = useState('rating');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [showFilters, setShowFilters] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const searchTimeout = useRef(null);
    const suggestionsTimeout = useRef(null);

    // Debounced search
    useEffect(() => {
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        searchTimeout.current = setTimeout(() => {
            if (query || Object.values(filters).some(v => v !== null && (Array.isArray(v) ? v.length > 0 : true))) {
                performSearch();
            }
        }, 500);

        return () => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
        };
    }, [query, filters, sort, page]);

    // Search suggestions
    useEffect(() => {
        if (suggestionsTimeout.current) {
            clearTimeout(suggestionsTimeout.current);
        }

        if (query.length >= 2) {
            suggestionsTimeout.current = setTimeout(async () => {
                try {
                    const data = await api.search.suggestions(query);
                    setSuggestions(data.suggestions || []);
                    setShowSuggestions(true);
                } catch (error) {
                    console.error('Failed to load suggestions:', error);
                }
            }, 300);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }

        return () => {
            if (suggestionsTimeout.current) {
                clearTimeout(suggestionsTimeout.current);
            }
        };
    }, [query]);

    const performSearch = async () => {
        try {
            setLoading(true);

            const searchFilters = {
                ...filters,
                sort,
                page,
                limit: 20
            };

            const data = await api.search.coaches(query, searchFilters);

            setResults(data.results || []);
            setTotalResults(data.total || 0);
        } catch (error) {
            console.error('Search failed:', error);
            setResults([]);
            setTotalResults(0);
        } finally {
            setLoading(false);
        }
    };

    const updateFilter = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1); // Reset to first page when filters change
    };

    const toggleSpecialty = (specialty) => {
        setFilters(prev => ({
            ...prev,
            specialties: prev.specialties.includes(specialty)
                ? prev.specialties.filter(s => s !== specialty)
                : [...prev.specialties, specialty]
        }));
        setPage(1);
    };

    const toggleLanguage = (language) => {
        setFilters(prev => ({
            ...prev,
            languages: prev.languages.includes(language)
                ? prev.languages.filter(l => l !== language)
                : [...prev.languages, language]
        }));
        setPage(1);
    };

    const clearFilters = () => {
        setFilters({
            specialties: [],
            min_price: null,
            max_price: null,
            min_rating: null,
            languages: [],
            is_verified: null,
            availability_day: null
        });
        setPage(1);
    };

    const getActiveFiltersCount = () => {
        return Object.entries(filters).filter(([key, value]) => {
            if (Array.isArray(value)) return value.length > 0;
            return value !== null;
        }).length;
    };

    return html`
        <div class="advanced-search">
            <!-- Search Bar -->
            <div class="search-container">
                <div class="search-bar">
                    <div class="search-icon">🔍</div>
                    <input
                        type="text"
                        class="search-input"
                        placeholder="Search for coaches, specialties, or skills..."
                        value=${query}
                        onInput=${(e) => setQuery(e.target.value)}
                        onFocus=${() => query && setSuggestions(suggestions)}
                        onBlur=${() => setTimeout(() => setShowSuggestions(false), 200)}
                    />
                    ${query && html`
                        <button
                            class="clear-search"
                            onClick=${() => {
                                setQuery('');
                                setShowSuggestions(false);
                            }}
                        >
                            ✕
                        </button>
                    `}
                </div>

                <!-- Search Suggestions -->
                ${showSuggestions && suggestions.length > 0 && html`
                    <div class="search-suggestions">
                        ${suggestions.map(suggestion => html`
                            <div
                                key=${suggestion}
                                class="suggestion-item"
                                onClick=${() => {
                                    setQuery(suggestion);
                                    setShowSuggestions(false);
                                }}
                            >
                                <span class="suggestion-icon">🔍</span>
                                <span>${suggestion}</span>
                            </div>
                        `)}
                    </div>
                `}

                <!-- Filter Toggle Button (Mobile) -->
                <button
                    class="filter-toggle-btn"
                    onClick=${() => setShowFilters(!showFilters)}
                >
                    <span>🎛️ Filters</span>
                    ${getActiveFiltersCount() > 0 && html`
                        <span class="filter-count-badge">${getActiveFiltersCount()}</span>
                    `}
                </button>
            </div>

            <div class="search-layout">
                <!-- Filters Sidebar -->
                <div class="filters-sidebar ${showFilters ? 'filters-sidebar-open' : ''}">
                    <div class="filters-header">
                        <h3>Filters</h3>
                        ${getActiveFiltersCount() > 0 && html`
                            <button class="clear-filters-btn" onClick=${clearFilters}>
                                Clear all
                            </button>
                        `}
                    </div>

                    <${FilterSection} title="Specialties">
                        <${CheckboxGroup}
                            options=${SPECIALTIES}
                            selected=${filters.specialties}
                            onToggle=${toggleSpecialty}
                        />
                    <//>

                    <${FilterSection} title="Price Range">
                        <div class="price-inputs">
                            <input
                                type="number"
                                placeholder="Min €"
                                value=${filters.min_price || ''}
                                onInput=${(e) => updateFilter('min_price', e.target.value ? parseFloat(e.target.value) : null)}
                            />
                            <span>to</span>
                            <input
                                type="number"
                                placeholder="Max €"
                                value=${filters.max_price || ''}
                                onInput=${(e) => updateFilter('max_price', e.target.value ? parseFloat(e.target.value) : null)}
                            />
                        </div>
                    <//>

                    <${FilterSection} title="Minimum Rating">
                        <${RatingSelector}
                            selected=${filters.min_rating}
                            onSelect=${(rating) => updateFilter('min_rating', rating)}
                        />
                    <//>

                    <${FilterSection} title="Languages">
                        <${CheckboxGroup}
                            options=${LANGUAGES}
                            selected=${filters.languages}
                            onToggle=${toggleLanguage}
                        />
                    <//>

                    <${FilterSection} title="Availability">
                        <select
                            class="filter-select"
                            value=${filters.availability_day || ''}
                            onChange=${(e) => updateFilter('availability_day', e.target.value || null)}
                        >
                            <option value="">Any day</option>
                            <option value="monday">Monday</option>
                            <option value="tuesday">Tuesday</option>
                            <option value="wednesday">Wednesday</option>
                            <option value="thursday">Thursday</option>
                            <option value="friday">Friday</option>
                            <option value="saturday">Saturday</option>
                            <option value="sunday">Sunday</option>
                        </select>
                    <//>

                    <${FilterSection} title="Verified Coaches">
                        <label class="checkbox-label">
                            <input
                                type="checkbox"
                                checked=${filters.is_verified === true}
                                onChange=${(e) => updateFilter('is_verified', e.target.checked ? true : null)}
                            />
                            <span>Show only verified coaches</span>
                        </label>
                    <//>
                </div>

                <!-- Results Area -->
                <div class="results-area">
                    <!-- Sort & Results Count -->
                    <div class="results-header">
                        <div class="results-count">
                            ${loading
                                ? 'Searching...'
                                : `${totalResults} ${totalResults === 1 ? 'coach' : 'coaches'} found`
                            }
                        </div>
                        <div class="sort-selector">
                            <label>Sort by:</label>
                            <select value=${sort} onChange=${(e) => setSort(e.target.value)}>
                                <option value="rating">Highest Rated</option>
                                <option value="price_low">Price: Low to High</option>
                                <option value="price_high">Price: High to Low</option>
                                <option value="experience">Most Experienced</option>
                                <option value="created_at">Newest First</option>
                            </select>
                        </div>
                    </div>

                    <!-- Active Filter Chips -->
                    ${getActiveFiltersCount() > 0 && html`
                        <div class="active-filters-chips">
                            ${filters.specialties.map(specialty => html`
                                <div class="filter-chip" key=${specialty}>
                                    <span>${specialty}</span>
                                    <button onClick=${() => toggleSpecialty(specialty)}>×</button>
                                </div>
                            `)}
                            ${filters.min_price && html`
                                <div class="filter-chip">
                                    <span>Min: €${filters.min_price}</span>
                                    <button onClick=${() => updateFilter('min_price', null)}>×</button>
                                </div>
                            `}
                            ${filters.max_price && html`
                                <div class="filter-chip">
                                    <span>Max: €${filters.max_price}</span>
                                    <button onClick=${() => updateFilter('max_price', null)}>×</button>
                                </div>
                            `}
                            ${filters.min_rating && html`
                                <div class="filter-chip">
                                    <span>⭐ ${filters.min_rating}+</span>
                                    <button onClick=${() => updateFilter('min_rating', null)}>×</button>
                                </div>
                            `}
                        </div>
                    `}

                    <!-- Results Grid -->
                    ${loading && html`
                        <div class="search-loading">
                            <div class="spinner"></div>
                            <p>Searching for coaches...</p>
                        </div>
                    `}

                    ${!loading && results.length === 0 && html`
                        <div class="no-results">
                            <div class="no-results-icon">🔍</div>
                            <h3>No coaches found</h3>
                            <p>Try adjusting your filters or search query</p>
                            ${getActiveFiltersCount() > 0 && html`
                                <button class="btn-clear-filters" onClick=${clearFilters}>
                                    Clear all filters
                                </button>
                            `}
                        </div>
                    `}

                    ${!loading && results.length > 0 && html`
                        <div class="results-grid">
                            ${results.map(coach => html`
                                <${CoachCard}
                                    key=${coach.id}
                                    coach=${coach}
                                    onSelect=${() => onSelectCoach && onSelectCoach(coach)}
                                />
                            `)}
                        </div>

                        <${Pagination}
                            currentPage=${page}
                            totalResults=${totalResults}
                            resultsPerPage=${20}
                            onPageChange=${setPage}
                        />
                    `}
                </div>
            </div>
        </div>
    `;
};

// Components
const FilterSection = ({ title, children }) => html`
    <div class="filter-section">
        <h4 class="filter-section-title">${title}</h4>
        <div class="filter-section-content">
            ${children}
        </div>
    </div>
`;

const CheckboxGroup = ({ options, selected, onToggle }) => html`
    <div class="checkbox-group">
        ${options.map(option => html`
            <label class="checkbox-label" key=${option}>
                <input
                    type="checkbox"
                    checked=${selected.includes(option)}
                    onChange=${() => onToggle(option)}
                />
                <span>${option}</span>
            </label>
        `)}
    </div>
`;

const RatingSelector = ({ selected, onSelect }) => {
    const ratings = [5, 4, 3, 2, 1];
    return html`
        <div class="rating-selector">
            ${ratings.map(rating => html`
                <button
                    key=${rating}
                    class="rating-btn ${selected === rating ? 'selected' : ''}"
                    onClick=${() => onSelect(selected === rating ? null : rating)}
                >
                    ${'⭐'.repeat(rating)} & up
                </button>
            `)}
        </div>
    `;
};

const CoachCard = ({ coach, onSelect }) => html`
    <div class="coach-card" onClick=${onSelect}>
        <div class="coach-card-image">
            ${coach.avatar_url
                ? html`<img src=${coach.avatar_url} alt=${coach.name} />`
                : html`<div class="coach-placeholder">${coach.name[0]}</div>`
            }
            ${coach.is_verified && html`
                <div class="verified-badge">✓ Verified</div>
            `}
        </div>
        <div class="coach-card-content">
            <h3 class="coach-name">${coach.name}</h3>
            <div class="coach-rating">
                <span class="stars">${'⭐'.repeat(Math.round(coach.rating || 0))}</span>
                <span class="rating-value">${(coach.rating || 0).toFixed(1)}</span>
                <span class="review-count">(${coach.review_count || 0})</span>
            </div>
            <p class="coach-bio">${(coach.bio || '').substring(0, 100)}${coach.bio?.length > 100 ? '...' : ''}</p>
            <div class="coach-specialties">
                ${(coach.specialties || []).slice(0, 3).map(specialty => html`
                    <span class="specialty-tag" key=${specialty}>${specialty}</span>
                `)}
            </div>
            <div class="coach-price">
                <span class="price-label">From</span>
                <span class="price-value">€${coach.hourly_rate || 0}/hour</span>
            </div>
        </div>
    </div>
`;

const Pagination = ({ currentPage, totalResults, resultsPerPage, onPageChange }) => {
    const totalPages = Math.ceil(totalResults / resultsPerPage);
    if (totalPages <= 1) return null;

    const pages = [];
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
        pages.push(i);
    }

    return html`
        <div class="pagination">
            <button
                class="pagination-btn"
                disabled=${currentPage === 1}
                onClick=${() => onPageChange(currentPage - 1)}
            >
                ← Previous
            </button>
            ${pages.map(page => html`
                <button
                    key=${page}
                    class="pagination-btn ${page === currentPage ? 'active' : ''}"
                    onClick=${() => onPageChange(page)}
                >
                    ${page}
                </button>
            `)}
            ${totalPages > 5 && html`<span class="pagination-ellipsis">...</span>`}
            <button
                class="pagination-btn"
                disabled=${currentPage === totalPages}
                onClick=${() => onPageChange(currentPage + 1)}
            >
                Next →
            </button>
        </div>
    `;
};

// Constants
const SPECIALTIES = [
    'Life Coaching',
    'Career Coaching',
    'Leadership',
    'Executive Coaching',
    'Business Coaching',
    'Health & Wellness',
    'Relationships',
    'Mindset',
    'Performance',
    'Financial Coaching'
];

const LANGUAGES = [
    'English',
    'German',
    'French',
    'Spanish',
    'Italian',
    'Dutch',
    'Portuguese'
];

export default AdvancedSearch;
