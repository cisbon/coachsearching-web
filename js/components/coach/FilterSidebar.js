/**
 * FilterSidebar Component
 * Sidebar for filtering coach list by price, specialty, language, etc.
 */

import htm from '../../vendor/htm.js';

const React = window.React;
const html = htm.bind(React.createElement);

// Available filter options
export const SPECIALTY_OPTIONS = [
    'Leadership', 'Career', 'Executive', 'Life Coaching', 'Business',
    'Health & Wellness', 'Relationships', 'Mindfulness', 'Performance',
    'Communication', 'Stress Management', 'Work-Life Balance'
];

export const LANGUAGE_OPTIONS = ['English', 'German', 'Spanish', 'French', 'Italian', 'Dutch', 'Portuguese'];

/**
 * FilterSidebar Component
 * @param {Object} props
 * @param {Object} props.filters - Current filter values
 * @param {function} props.onChange - Handler for filter changes
 * @param {function} props.onReset - Handler for resetting filters
 */
export function FilterSidebar({ filters, onChange, onReset }) {
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
                    ${SPECIALTY_OPTIONS.map(specialty => html`
                        <label key=${specialty} class="filter-checkbox">
                            <input
                                type="checkbox"
                                checked=${filters.specialties?.includes(specialty)}
                                onChange=${(e) => {
                                    const current = filters.specialties || [];
                                    const updated = e.target.checked
                                        ? [...current, specialty]
                                        : current.filter(s => s !== specialty);
                                    onChange({ ...filters, specialties: updated });
                                }}
                            />
                            <span>${specialty}</span>
                        </label>
                    `)}
                </div>
            </div>

            <!-- Languages -->
            <div class="filter-section">
                <h4>Languages</h4>
                <div class="filter-checkboxes">
                    ${LANGUAGE_OPTIONS.map(lang => html`
                        <label key=${lang} class="filter-checkbox">
                            <input
                                type="checkbox"
                                checked=${filters.languages?.includes(lang)}
                                onChange=${(e) => {
                                    const current = filters.languages || [];
                                    const updated = e.target.checked
                                        ? [...current, lang]
                                        : current.filter(l => l !== lang);
                                    onChange({ ...filters, languages: updated });
                                }}
                            />
                            <span>${lang}</span>
                        </label>
                    `)}
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
