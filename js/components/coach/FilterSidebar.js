/**
 * FilterSidebar Component
 * Sidebar for filtering coach list by budget, specialty, language, etc.
 * Uses dynamic lookup options and cities from AppContext
 */

import htm from '../../vendor/htm.js';
import { t } from '../../i18n.js';
import { getCurrentCurrency, formatPrice } from '../../utils/formatting.js';
import { CURRENCIES, DEFAULT_CURRENCY } from '../../utils/constants.js';
import { useLookupOptions, useCities } from '../../context/AppContext.js';

const React = window.React;
const { useMemo, useState, useEffect, useCallback, useRef } = React;
const html = htm.bind(React.createElement);

// Languages to show initially (most common)
const INITIAL_LANGUAGES = ['en', 'de', 'fr', 'es', 'it', 'nl', 'ru', 'tr'];

// Specialties to show initially (most common)
const INITIAL_SPECIALTIES = [
    'life-coaching',
    'business-coaching',
    'career-coaching',
    'executive-coaching',
    'leadership-development',
    'health-wellness',
    'life-transitions',
    'relationship-coaching'
];

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

const NUM_BARS = 20;
const SLIDER_MIN_EUR = 150;
const SLIDER_MAX_EUR = 450;

/**
 * BudgetSlider Component
 * Booking.com-style histogram budget slider with currency support
 */
function BudgetSlider({ prices, minBudget, maxBudget, onChange }) {
    const trackRef = useRef(null);
    const [dragging, setDragging] = useState(null); // 'min' or 'max'
    const [, forceUpdate] = useState({});

    // Listen for currency changes
    useEffect(() => {
        const handleCurrencyChange = () => forceUpdate({});
        window.addEventListener('currencyChange', handleCurrencyChange);
        return () => window.removeEventListener('currencyChange', handleCurrencyChange);
    }, []);

    // Get current currency config
    const currencyCode = getCurrentCurrency();
    const currencyConfig = CURRENCIES[currencyCode] || CURRENCIES[DEFAULT_CURRENCY];
    const symbol = currencyConfig.symbol;
    const rate = currencyConfig.rate;

    // Convert EUR bounds to current currency
    const sliderMinConverted = Math.round(SLIDER_MIN_EUR * rate);
    const sliderMaxConverted = Math.round(SLIDER_MAX_EUR * rate);

    // Compute price range from available prices, clamped to slider bounds
    const priceRange = useMemo(() => {
        // Convert prices to current currency
        const converted = (prices || []).map(p => Math.round(p * rate));
        if (converted.length === 0) return { min: sliderMinConverted, max: sliderMaxConverted, step: Math.max(1, Math.round((sliderMaxConverted - sliderMinConverted) / NUM_BARS)) };

        // Use slider bounds as the visible range, but allow prices outside
        const dataMin = Math.min(...converted);
        const dataMax = Math.max(...converted);
        const min = Math.min(sliderMinConverted, dataMin);
        const max = Math.max(sliderMaxConverted, dataMax);
        const range = max - min || 100;
        const step = Math.max(1, Math.round(range / NUM_BARS));
        return { min, max: min + step * NUM_BARS, step };
    }, [prices, rate, sliderMinConverted, sliderMaxConverted]);

    // Build histogram bars
    const bars = useMemo(() => {
        const converted = (prices || []).map(p => Math.round(p * rate));
        if (converted.length === 0) return Array(NUM_BARS).fill(0);
        const { min, step } = priceRange;
        const buckets = Array(NUM_BARS).fill(0);
        converted.forEach(p => {
            const idx = Math.min(NUM_BARS - 1, Math.floor((p - min) / step));
            buckets[idx]++;
        });
        return buckets;
    }, [prices, rate, priceRange]);

    const maxCount = Math.max(1, ...bars);

    // Current slider values (default to slider bounds in current currency)
    const currentMin = minBudget !== '' && minBudget !== undefined ? Number(minBudget) : priceRange.min;
    const currentMax = maxBudget !== '' && maxBudget !== undefined ? Number(maxBudget) : priceRange.max;

    // Convert value to percentage position
    const valToPercent = useCallback((val) => {
        const range = priceRange.max - priceRange.min;
        if (range === 0) return 0;
        return Math.max(0, Math.min(100, ((val - priceRange.min) / range) * 100));
    }, [priceRange]);

    // Convert percentage to value
    const percentToVal = useCallback((pct) => {
        const range = priceRange.max - priceRange.min;
        const raw = priceRange.min + (pct / 100) * range;
        return Math.round(raw / priceRange.step) * priceRange.step;
    }, [priceRange]);

    const minPct = valToPercent(currentMin);
    const maxPct = valToPercent(currentMax);

    // Handle drag on track
    const handlePointerDown = useCallback((e, handle) => {
        e.preventDefault();
        setDragging(handle);
    }, []);

    useEffect(() => {
        if (!dragging) return;

        const handleMove = (e) => {
            const track = trackRef.current;
            if (!track) return;
            const rect = track.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
            const val = percentToVal(pct);

            if (dragging === 'min') {
                const newMin = Math.min(val, currentMax - priceRange.step);
                onChange({ minBudget: newMin <= priceRange.min ? '' : newMin, maxBudget: maxBudget });
            } else {
                const newMax = Math.max(val, currentMin + priceRange.step);
                onChange({ minBudget: minBudget, maxBudget: newMax >= priceRange.max ? '' : newMax });
            }
        };

        const handleUp = () => setDragging(null);

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleUp);
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleUp);
        };
    }, [dragging, currentMin, currentMax, minBudget, maxBudget, priceRange, percentToVal, onChange]);

    const isBarInRange = (barIndex) => {
        const barStart = priceRange.min + barIndex * priceRange.step;
        const barEnd = barStart + priceRange.step;
        return barStart < currentMax && barEnd > currentMin;
    };

    // Format label with current currency symbol
    const formatLabel = (val) => `${symbol}${val}`;

    return html`
        <div class="budget-slider-container">
            <!-- Histogram -->
            <div class="budget-histogram">
                ${bars.map((count, i) => {
                    const height = count > 0 ? Math.max(4, (count / maxCount) * 48) : 2;
                    const inRange = isBarInRange(i);
                    return html`
                        <div key=${i} class="budget-bar-wrapper">
                            <div
                                class="budget-bar ${inRange ? 'in-range' : 'out-range'}"
                                style=${{ height: height + 'px' }}
                            ></div>
                        </div>
                    `;
                })}
            </div>
            <!-- Dual Range Slider -->
            <div class="budget-track" ref=${trackRef}>
                <div class="budget-track-bg"></div>
                <div class="budget-track-fill" style=${{ left: minPct + '%', width: (maxPct - minPct) + '%' }}></div>
                <div
                    class="budget-handle budget-handle-min ${dragging === 'min' ? 'active' : ''}"
                    style=${{ left: minPct + '%' }}
                    onMouseDown=${(e) => handlePointerDown(e, 'min')}
                    onTouchStart=${(e) => handlePointerDown(e, 'min')}
                ></div>
                <div
                    class="budget-handle budget-handle-max ${dragging === 'max' ? 'active' : ''}"
                    style=${{ left: maxPct + '%' }}
                    onMouseDown=${(e) => handlePointerDown(e, 'max')}
                    onTouchStart=${(e) => handlePointerDown(e, 'max')}
                ></div>
            </div>
            <!-- Labels -->
            <div class="budget-labels">
                <span class="budget-label-min">${formatLabel(currentMin)}</span>
                <span class="budget-label-max">${currentMax >= priceRange.max ? formatLabel(priceRange.max) + '+' : formatLabel(currentMax)}</span>
            </div>
        </div>
    `;
}

/**
 * FilterSidebar Component
 * @param {Object} props
 * @param {Object} props.filters - Current filter values
 * @param {function} props.onChange - Handler for filter changes
 * @param {function} props.onReset - Handler for resetting filters
 * @param {Array} props.filteredCoachIds - IDs of coaches matching current non-price filters
 */
export function FilterSidebar({ filters, onChange, onReset, filteredCoachIds }) {
    // Get lookup options from global context (cached)
    const { lookupOptions, getLocalizedName } = useLookupOptions();

    // Get cities from global context (cached)
    const { cities, getLocalizedCityName } = useCities();

    // State for showing all languages/specialties
    const [showAllLanguages, setShowAllLanguages] = useState(false);
    const [showAllSpecialties, setShowAllSpecialties] = useState(false);

    // Service prices state - map of coach_id -> min price
    const [allServicePrices, setAllServicePrices] = useState([]);

    // Load service prices from cs_coach_services
    useEffect(() => {
        const loadPrices = async () => {
            if (!window.supabaseClient) return;
            try {
                const { data, error } = await window.supabaseClient
                    .from('cs_coach_services')
                    .select('coach_id, price')
                    .eq('active', true)
                    .gt('price', 0);
                if (!error && data) {
                    setAllServicePrices(data);
                }
            } catch (err) {
                console.error('Failed to load service prices:', err);
            }
        };
        loadPrices();
    }, []);

    // Compute prices relevant to current filters (excluding budget filter itself)
    const relevantPrices = useMemo(() => {
        if (!allServicePrices.length) return [];
        if (filteredCoachIds && filteredCoachIds.length > 0) {
            const idSet = new Set(filteredCoachIds);
            return allServicePrices.filter(s => idSet.has(s.coach_id)).map(s => Number(s.price));
        }
        return allServicePrices.map(s => Number(s.price));
    }, [allServicePrices, filteredCoachIds]);

    // Extract specialties and languages from lookup options
    const specialtyOptions = lookupOptions.specialties || [];
    const languageOptions = lookupOptions.languages || [];

    // Filter languages and specialties based on show more state
    const visibleLanguages = useMemo(() => {
        if (showAllLanguages) return languageOptions;
        return languageOptions.filter(lang => INITIAL_LANGUAGES.includes(lang.code));
    }, [languageOptions, showAllLanguages]);

    const visibleSpecialties = useMemo(() => {
        if (showAllSpecialties) return specialtyOptions;
        return specialtyOptions.filter(spec => INITIAL_SPECIALTIES.includes(spec.code));
    }, [specialtyOptions, showAllSpecialties]);

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

    const handleBudgetChange = useCallback(({ minBudget, maxBudget }) => {
        onChange({ ...filters, minPrice: minBudget, maxPrice: maxBudget });
    }, [filters, onChange]);

    return html`
        <div class="filter-sidebar">
            <div class="filter-header">
                <h3>${t('filter.filters') || 'Filters'}</h3>
                <button class="filter-reset-btn" onClick=${onReset}>${t('filter.reset') || 'Reset'}</button>
            </div>

            <!-- Budget Range -->
            <div class="filter-section">
                <h4>${t('filter.budget') || 'Budget'}</h4>
                ${relevantPrices.length > 0 ? html`
                    <${BudgetSlider}
                        prices=${relevantPrices}
                        minBudget=${filters.minPrice}
                        maxBudget=${filters.maxPrice}
                        onChange=${handleBudgetChange}
                    />
                ` : html`
                    <div class="budget-loading">${t('common.loading') || 'Loading'}...</div>
                `}
            </div>

            <!-- Location (Country & City) -->
            <div class="filter-section">
                <h4>${t('filter.location') || 'Location'}</h4>
                <div class="location-filters">
                    <div style=${{ marginBottom: '10px' }}>
                        <label style=${{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>${t('filter.country') || 'Country'}</label>
                        <select
                            class="filter-input"
                            value=${filters.locationCountry || ''}
                            onChange=${(e) => {
                                // When country changes, clear the city selection
                                onChange({ ...filters, locationCountry: e.target.value, locationCityId: null, locationState: '' });
                            }}
                            style=${{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e0e0e0' }}
                        >
                            <option value="">${t('filter.allCountries') || 'All Countries'}</option>
                            ${(countriesFromCities.length > 0 ? countriesFromCities : COUNTRIES).map(country => html`
                                <option key=${country.code} value=${country.name}>${country.name}</option>
                            `)}
                        </select>
                    </div>
                    <div>
                        <label style=${{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>${t('filter.city') || 'City'}</label>
                        <select
                            class="filter-input"
                            value=${filters.locationCityId || ''}
                            onChange=${(e) => {
                                const cityId = e.target.value ? parseInt(e.target.value, 10) : null;
                                // Find the selected city to get its state
                                const selectedCity = filteredCities.find(city => city.id === cityId);
                                onChange({
                                    ...filters,
                                    locationCityId: cityId,
                                    locationState: selectedCity?.state || ''
                                });
                            }}
                            style=${{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e0e0e0' }}
                        >
                            <option value="">${t('filter.allCities') || 'All Cities'}</option>
                            ${filteredCities.map(city => html`
                                <option key=${city.id} value=${city.id}>${getLocalizedCityName(city)}</option>
                            `)}
                        </select>
                    </div>
                </div>
            </div>

            <!-- Specialties -->
            <div class="filter-section">
                <h4>${t('filter.specialties') || 'Specialties'}</h4>
                <div class="filter-checkboxes">
                    ${visibleSpecialties.map(specialty => {
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
                ${!showAllSpecialties && specialtyOptions.length > visibleSpecialties.length ? html`
                    <button
                        type="button"
                        class="filter-show-more-btn"
                        onClick=${() => setShowAllSpecialties(true)}
                    >
                        ${t('filter.showMore') || 'Show more'}
                    </button>
                ` : null}
            </div>

            <!-- Languages -->
            <div class="filter-section">
                <h4>${t('filter.languages') || 'Languages'}</h4>
                <div class="filter-checkboxes">
                    ${visibleLanguages.map(lang => {
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
                ${!showAllLanguages && languageOptions.length > visibleLanguages.length ? html`
                    <button
                        type="button"
                        class="filter-show-more-btn"
                        onClick=${() => setShowAllLanguages(true)}
                    >
                        ${t('filter.showMore') || 'Show more'}
                    </button>
                ` : null}
            </div>

            <!-- Session Type -->
            <div class="filter-section">
                <h4>${t('filter.sessionType') || 'Session Type'}</h4>
                <div class="filter-checkboxes">
                    <label class="filter-checkbox">
                        <input
                            type="checkbox"
                            checked=${filters.offersVirtual}
                            onChange=${(e) => onChange({ ...filters, offersVirtual: e.target.checked })}
                        />
                        <span>💻 ${t('filter.videoCall') || 'Video Call'}</span>
                    </label>
                    <label class="filter-checkbox">
                        <input
                            type="checkbox"
                            checked=${filters.offersOnsite}
                            onChange=${(e) => onChange({ ...filters, offersOnsite: e.target.checked })}
                        />
                        <span>🤝 ${t('filter.inPerson') || 'In-Person'}</span>
                    </label>
                </div>
            </div>

            <!-- Other Options -->
            <div class="filter-section">
                <h4>${t('filter.other') || 'Other'}</h4>
                <div class="filter-checkboxes">
                    <label class="filter-checkbox">
                        <input
                            type="checkbox"
                            checked=${filters.hasVideo}
                            onChange=${(e) => onChange({ ...filters, hasVideo: e.target.checked })}
                        />
                        <span>🎬 ${t('filter.hasVideo') || 'Has Intro Video'}</span>
                    </label>
                    <label class="filter-checkbox">
                        <input
                            type="checkbox"
                            checked=${filters.freeIntro}
                            onChange=${(e) => onChange({ ...filters, freeIntro: e.target.checked })}
                        />
                        <span>🗓️ ${t('filter.freeDiscovery') || 'Chemistry Call'}</span>
                    </label>
                    <label class="filter-checkbox">
                        <input
                            type="checkbox"
                            checked=${filters.hasCertification}
                            onChange=${(e) => onChange({ ...filters, hasCertification: e.target.checked })}
                        />
                        <span>🎓 ${t('filter.hasCertification') || 'Has Certification'}</span>
                    </label>
                    <label class="filter-checkbox">
                        <input
                            type="checkbox"
                            checked=${filters.isVerified}
                            onChange=${(e) => onChange({ ...filters, isVerified: e.target.checked })}
                        />
                        <span>✅ ${t('filter.isVerified') || 'Is Verified'}</span>
                    </label>
                </div>
            </div>
        </div>
    `;
}

export default FilterSidebar;
