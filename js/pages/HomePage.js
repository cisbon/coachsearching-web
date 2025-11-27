/**
 * Home Page Component
 * Landing page with hero section and coach list
 */

import htm from '../vendor/htm.js';
import { useAuth } from '../context/index.js';
import { t } from '../i18n.js';

const React = window.React;
const { useState, useEffect, useCallback } = React;
const html = htm.bind(React.createElement);

/**
 * Hero Section Component
 */
function Hero({ onSearch }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [sessionType, setSessionType] = useState('online');
    const [location, setLocation] = useState('');
    const [radius, setRadius] = useState('25');
    const [date, setDate] = useState('');
    const [maxRate, setMaxRate] = useState('');
    const [gettingLocation, setGettingLocation] = useState(false);

    const handleSearch = (e) => {
        e.preventDefault();
        if (onSearch) {
            onSearch({ searchTerm, sessionType, location, radius, date, maxRate });
        }
    };

    const handleUseMyLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        setGettingLocation(true);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
                        { headers: { 'User-Agent': 'CoachSearching/1.0' } }
                    );
                    const data = await response.json();
                    const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county;
                    const country = data.address?.country;
                    const locationString = city ? `${city}, ${country}` : `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
                    setLocation(locationString);
                } catch (error) {
                    console.error('Geocoding error:', error);
                    setLocation(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
                }

                setGettingLocation(false);
            },
            (error) => {
                console.error('Geolocation error:', error);
                let errorMessage = 'Unable to get your location. Please enter it manually.';

                if (error.code === 1) {
                    errorMessage = 'Location access was denied. Please enter your location manually.';
                }

                alert(errorMessage);
                setGettingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    return html`
        <section class="hero">
            <div class="container">
                <h1>${t('hero.title')}</h1>
                <p class="hero-subtitle">${t('hero.subtitle')}</p>

                <form class="search-form" onSubmit=${handleSearch}>
                    <div class="search-input-wrapper">
                        <input
                            type="text"
                            class="search-input"
                            placeholder=${t('search.placeholder')}
                            value=${searchTerm}
                            onInput=${(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div class="search-filters">
                        <div class="filter-group">
                            <label class="filter-label">Session Type</label>
                            <div class="session-type-toggle">
                                <button
                                    type="button"
                                    class="toggle-btn ${sessionType === 'online' ? 'active' : ''}"
                                    onClick=${() => setSessionType('online')}
                                >
                                    ${t('search.online')}
                                </button>
                                <button
                                    type="button"
                                    class="toggle-btn ${sessionType === 'onsite' ? 'active' : ''}"
                                    onClick=${() => setSessionType('onsite')}
                                >
                                    ${t('search.onsite')}
                                </button>
                            </div>
                        </div>

                        ${sessionType === 'onsite' && html`
                            <div class="filter-group location-group">
                                <label class="filter-label">${t('search.locationPlaceholder')}</label>
                                <div class="location-input-group">
                                    <input
                                        type="text"
                                        class="form-control"
                                        placeholder=${t('search.locationPlaceholder')}
                                        value=${location}
                                        onInput=${(e) => setLocation(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        class="btn-secondary location-btn"
                                        onClick=${handleUseMyLocation}
                                        disabled=${gettingLocation}
                                        title="Use my location"
                                    >
                                        ${gettingLocation ? '...' : '📍'}
                                    </button>
                                </div>
                                <div class="radius-select">
                                    <label>${t('search.within')}</label>
                                    <select
                                        class="form-control"
                                        value=${radius}
                                        onChange=${(e) => setRadius(e.target.value)}
                                    >
                                        <option value="10">10 km</option>
                                        <option value="25">25 km</option>
                                        <option value="50">50 km</option>
                                        <option value="100">100 km</option>
                                    </select>
                                </div>
                            </div>
                        `}
                    </div>

                    <button type="submit" class="btn-primary search-btn">
                        ${t('search.btn')}
                    </button>
                </form>
            </div>
        </section>
    `;
}

/**
 * Featured Coaches Section (placeholder - will load from CoachList)
 */
function FeaturedCoaches() {
    return html`
        <section class="featured-coaches">
            <div class="container">
                <h2 class="section-title">Featured Coaches</h2>
                <p class="text-center text-muted">Browse our network of professional coaches</p>
                <div class="text-center" style=${{ marginTop: '20px' }}>
                    <a href="#coaches" class="btn-primary">View All Coaches</a>
                </div>
            </div>
        </section>
    `;
}

/**
 * Home Page Component
 */
export function HomePage() {
    const { session } = useAuth();
    const [searchFilters, setSearchFilters] = useState(null);

    const handleSearch = useCallback((filters) => {
        console.log('Search filters:', filters);
        setSearchFilters(filters);
        // Navigate to coaches page with filters
        const params = new URLSearchParams();
        if (filters.searchTerm) params.set('q', filters.searchTerm);
        if (filters.sessionType) params.set('type', filters.sessionType);
        if (filters.location) params.set('location', filters.location);
        window.location.hash = `#coaches${params.toString() ? '?' + params.toString() : ''}`;
    }, []);

    return html`
        <div class="home-page">
            <${Hero} onSearch=${handleSearch} />
            <${FeaturedCoaches} />
        </div>
    `;
}

export default HomePage;
