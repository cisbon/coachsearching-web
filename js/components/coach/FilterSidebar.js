/**
 * FilterSidebar Component
 * Sidebar for filtering coach list by price, specialty, language, etc.
 * Uses dynamic lookup options from AppContext
 */

import htm from '../../vendor/htm.js';
import { useLookupOptions } from '../../context/AppContext.js';

const React = window.React;
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

    // Extract specialties and languages from lookup options
    const specialtyOptions = lookupOptions.specialties || [];
    const languageOptions = lookupOptions.languages || [];

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
                    <label class="filter-checkbox">
                        <input
                            type="checkbox"
                            checked=${filters.verified}
                            onChange=${(e) => onChange({ ...filters, verified: e.target.checked })}
                        />
                        <span>Verified Only</span>
                    </label>
                </div>
            </div>
        </div>
    `;
}

export default FilterSidebar;
