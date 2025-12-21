/**
 * FilterSidebar Component
 * Sidebar for filtering coach list by price, specialty, language, etc.
 * Uses dynamic lookup options and cities from AppContext
 */

import htm from '../../vendor/htm.js';
import { useLookupOptions, useCities } from '../../context/AppContext.js';

const React = window.React;
const { useMemo } = React;
const html = htm.bind(React.createElement);

// Flag CDN for SVG flag images
const FLAG_CDN = 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3';

// Language code to flag country code mapping
const LANGUAGE_TO_FLAG = {
    'en': 'gb', 'de': 'de', 'es': 'es', 'fr': 'fr', 'it': 'it',
    'nl': 'nl', 'pt': 'pt', 'ru': 'ru', 'zh': 'cn', 'ja': 'jp',
    'ko': 'kr', 'ar': 'sa', 'hi': 'in', 'pl': 'pl', 'sv': 'se',
    'no': 'no', 'da': 'dk', 'fi': 'fi', 'el': 'gr', 'tr': 'tr',
    'cs': 'cz', 'ro': 'ro', 'hu': 'hu', 'uk': 'ua'
};

// Countries list for location filter
const COUNTRIES = [
    { code: 'AT', name: 'Austria' },
    { code: 'AU', name: 'Australia' },
    { code: 'BE', name: 'Belgium' },
    { code: 'BR', name: 'Brazil' },
    { code: 'CA', name: 'Canada' },
    { code: 'CH', name: 'Switzerland' },
    { code: 'DE', name: 'Germany' },
    { code: 'DK', name: 'Denmark' },
    { code: 'ES', name: 'Spain' },
    { code: 'FI', name: 'Finland' },
    { code: 'FR', name: 'France' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'IE', name: 'Ireland' },
    { code: 'IN', name: 'India' },
    { code: 'IT', name: 'Italy' },
    { code: 'JP', name: 'Japan' },
    { code: 'LU', name: 'Luxembourg' },
    { code: 'MX', name: 'Mexico' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'NO', name: 'Norway' },
    { code: 'NZ', name: 'New Zealand' },
    { code: 'PL', name: 'Poland' },
    { code: 'PT', name: 'Portugal' },
    { code: 'SE', name: 'Sweden' },
    { code: 'SG', name: 'Singapore' },
    { code: 'US', name: 'United States' },
    { code: 'ZA', name: 'South Africa' },
    { code: 'OTHER', name: 'Other' }
];

/**
 * FilterSidebar Component
 * @param {Object} props
 * @param {Object} props.filters - Current filter values
 * @param {function} props.onChange - Handler for filter changes
 * @param {function} props.onReset - Handler for resetting filters
 */
export function FilterSidebar({ filters, onChange, onReset }) {
    // Get lookup options from global context (cached)
    const { lookupOptions, getLocalizedName } = useLookupOptions();

    // Get cities from global context (cached)
    const { cities, getLocalizedCityName } = useCities();

    // Extract specialties and languages from lookup options
    const specialtyOptions = lookupOptions.specialties || [];
    const languageOptions = lookupOptions.languages || [];

    // Get unique countries from cities list
    const countriesFromCities = useMemo(() => {
        const countryMap = new Map();
        (cities.list || []).forEach(city => {
            if (!countryMap.has(city.country_code)) {
                countryMap.set(city.country_code, city.country_en);
            }
        });
        return Array.from(countryMap.entries())
            .map(([code, name]) => ({ code, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [cities.list]);

    // Filter cities by selected country
    const filteredCities = useMemo(() => {
        if (!cities.list || cities.list.length === 0) return [];

        // If no country selected, show all cities
        if (!filters.locationCountry) {
            return cities.list;
        }

        // Filter cities by the selected country name
        return cities.list.filter(city => city.country_en === filters.locationCountry);
    }, [cities.list, filters.locationCountry]);

    return html`
        <div class="filter-sidebar">
            <div class="filter-header">
                <h3>Filters</h3>
                <button class="filter-reset-btn" onClick=${onReset}>Reset</button>
            </div>

            <!-- Price Range -->
            <div class="filter-section">
                <h4>Price Range</h4>
                <div class="price-range-inputs">
                    <input
                        type="number"
                        placeholder="Min"
                        class="filter-input"
                        value=${filters.minPrice || ''}
                        onChange=${(e) => onChange({ ...filters, minPrice: e.target.value })}
                    />
                    <span>-</span>
                    <input
                        type="number"
                        placeholder="Max"
                        class="filter-input"
                        value=${filters.maxPrice || ''}
                        onChange=${(e) => onChange({ ...filters, maxPrice: e.target.value })}
                    />
                </div>
            </div>

            <!-- Location (Country & City) -->
            <div class="filter-section">
                <h4>Location</h4>
                <div class="location-filters">
                    <div style=${{ marginBottom: '10px' }}>
                        <label style=${{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>Country</label>
                        <select
                            class="filter-input"
                            value=${filters.locationCountry || ''}
                            onChange=${(e) => {
                                // When country changes, clear the city selection
                                onChange({ ...filters, locationCountry: e.target.value, locationCity: '' });
                            }}
                            style=${{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e0e0e0' }}
                        >
                            <option value="">All Countries</option>
                            ${(countriesFromCities.length > 0 ? countriesFromCities : COUNTRIES).map(country => html`
                                <option key=${country.code} value=${country.name}>${country.name}</option>
                            `)}
                        </select>
                    </div>
                    <div>
                        <label style=${{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>City</label>
                        <select
                            class="filter-input"
                            value=${filters.locationCity || ''}
                            onChange=${(e) => onChange({ ...filters, locationCity: e.target.value })}
                            style=${{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e0e0e0' }}
                        >
                            <option value="">All Cities</option>
                            ${filteredCities.map(city => html`
                                <option key=${city.code} value=${getLocalizedCityName(city)}>${getLocalizedCityName(city)}</option>
                            `)}
                        </select>
                    </div>
                </div>
            </div>

            <!-- Specialties -->
            <div class="filter-section">
                <h4>Specialties</h4>
                <div class="filter-checkboxes">
                    ${specialtyOptions.map(specialty => {
                        // Check if specialty is selected (exact match or partial match for initial filters)
                        const isChecked = filters.specialties?.some(s =>
                            s === specialty.code ||
                            specialty.code.toLowerCase().includes(s.toLowerCase()) ||
                            s.toLowerCase().includes(specialty.code.toLowerCase())
                        );
                        return html`
                            <label key=${specialty.code} class="filter-checkbox">
                                <input
                                    type="checkbox"
                                    checked=${isChecked}
                                    onChange=${(e) => {
                                        const current = filters.specialties || [];
                                        const updated = e.target.checked
                                            ? [...current, specialty.code]
                                            : current.filter(s => s !== specialty.code && !specialty.code.toLowerCase().includes(s.toLowerCase()));
                                        onChange({ ...filters, specialties: updated });
                                    }}
                                />
                                <span>${specialty.icon || ''} ${getLocalizedName(specialty)}</span>
                            </label>
                        `;
                    })}
                </div>
            </div>

            <!-- Languages -->
            <div class="filter-section">
                <h4>Languages</h4>
                <div class="filter-checkboxes">
                    ${languageOptions.map(lang => {
                        const flagCode = LANGUAGE_TO_FLAG[lang.code];
                        return html`
                            <label key=${lang.code} class="filter-checkbox">
                                <input
                                    type="checkbox"
                                    checked=${filters.languages?.includes(lang.code)}
                                    onChange=${(e) => {
                                        const current = filters.languages || [];
                                        const updated = e.target.checked
                                            ? [...current, lang.code]
                                            : current.filter(l => l !== lang.code);
                                        onChange({ ...filters, languages: updated });
                                    }}
                                />
                                <span style=${{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    ${flagCode ? html`
                                        <img
                                            src="${FLAG_CDN}/${flagCode}.svg"
                                            alt=${getLocalizedName(lang)}
                                            style=${{ width: '20px', height: '15px', borderRadius: '2px', objectFit: 'cover' }}
                                            loading="lazy"
                                        />
                                    ` : html`<span style=${{ fontSize: '14px' }}>🌐</span>`}
                                    ${getLocalizedName(lang)}
                                </span>
                            </label>
                        `;
                    })}
                </div>
            </div>

            <!-- Session Type -->
            <div class="filter-section">
                <h4>Session Type</h4>
                <div class="filter-checkboxes">
                    <label class="filter-checkbox">
                        <input
                            type="checkbox"
                            checked=${filters.offersVirtual}
                            onChange=${(e) => onChange({ ...filters, offersVirtual: e.target.checked })}
                        />
                        <span>Virtual Sessions</span>
                    </label>
                    <label class="filter-checkbox">
                        <input
                            type="checkbox"
                            checked=${filters.offersOnsite}
                            onChange=${(e) => onChange({ ...filters, offersOnsite: e.target.checked })}
                        />
                        <span>In-Person</span>
                    </label>
                </div>
            </div>

            <!-- Other Options -->
            <div class="filter-section">
                <h4>Other</h4>
                <div class="filter-checkboxes">
                    <label class="filter-checkbox">
                        <input
                            type="checkbox"
                            checked=${filters.hasVideo}
                            onChange=${(e) => onChange({ ...filters, hasVideo: e.target.checked })}
                        />
                        <span>Has Intro Video</span>
                    </label>
                    <label class="filter-checkbox">
                        <input
                            type="checkbox"
                            checked=${filters.freeIntro}
                            onChange=${(e) => onChange({ ...filters, freeIntro: e.target.checked })}
                        />
                        <span>Free Discovery Call</span>
                    </label>
                </div>
            </div>
        </div>
    `;
}

export default FilterSidebar;
