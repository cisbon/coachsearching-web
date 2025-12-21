/**
 * Locations Page Component
 * @fileoverview Displays all coaching locations (cities) organized by country with images
 * Uses database cities from AppContext for dynamic city data
 */

import htm from '../vendor/htm.js';
import { t } from '../i18n.js';
import { setPageMeta, generateBreadcrumbSchema, setStructuredData } from '../utils/seo.js';
import { COACHING_CATEGORIES } from './CategoryPage.js';
import { CoachList } from '../components/coach/CoachList.js';
import { CoachDetailModal } from '../components/coach/CoachDetailModal.js';
import { useCities } from '../context/AppContext.js';

const React = window.React;
const { useEffect, useMemo, useState } = React;
const html = htm.bind(React.createElement);

// City image URLs using Unsplash (curated city photos)
const CITY_IMAGES = {
    // Germany
    'berlin': 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=400&h=300&fit=crop',
    'munich': 'https://images.unsplash.com/photo-1595867818082-083862f3d630?w=400&h=300&fit=crop',
    'hamburg': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
    'frankfurt': 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=400&h=300&fit=crop',
    'dusseldorf': 'https://images.unsplash.com/photo-1577538926988-4e9684615a96?w=400&h=300&fit=crop',
    'cologne': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=300&fit=crop',
    'stuttgart': 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=400&h=300&fit=crop',
    'hanover': 'https://images.unsplash.com/photo-1599946347371-68eb71b16afc?w=400&h=300&fit=crop',
    'nuremberg': 'https://images.unsplash.com/photo-1577548093075-b7ae5e7c0b90?w=400&h=300&fit=crop',
    'leipzig': 'https://images.unsplash.com/photo-1558431382-27e303142255?w=400&h=300&fit=crop',
    'dresden': 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=400&h=300&fit=crop',
    'bonn': 'https://images.unsplash.com/photo-1597989618498-3a82da8be3bb?w=400&h=300&fit=crop',
    'essen': 'https://images.unsplash.com/photo-1558431382-27e303142255?w=400&h=300&fit=crop',
    'dortmund': 'https://images.unsplash.com/photo-1578319493707-f8ed7a6d5f7e?w=400&h=300&fit=crop',
    'bremen': 'https://images.unsplash.com/photo-1567354721844-26a30b380fc4?w=400&h=300&fit=crop',
    'duisburg': 'https://images.unsplash.com/photo-1558431382-27e303142255?w=400&h=300&fit=crop',
    'munster': 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=400&h=300&fit=crop',
    'karlsruhe': 'https://images.unsplash.com/photo-1569930784237-ea65a528f007?w=400&h=300&fit=crop',
    'mannheim': 'https://images.unsplash.com/photo-1568636029543-ca4fe4148ca2?w=400&h=300&fit=crop',
    'augsburg': 'https://images.unsplash.com/photo-1549619856-ac562a3ed1a3?w=400&h=300&fit=crop',
    'wiesbaden': 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=400&h=300&fit=crop',
    'freiburg': 'https://images.unsplash.com/photo-1570698473651-b2de99bae12f?w=400&h=300&fit=crop',

    // Austria
    'vienna': 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=400&h=300&fit=crop',

    // Switzerland
    'zurich': 'https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=400&h=300&fit=crop',
    'geneva': 'https://images.unsplash.com/photo-1573108037329-37aa135a142e?w=400&h=300&fit=crop',
    'basel': 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&h=300&fit=crop',

    // Netherlands
    'amsterdam': 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=400&h=300&fit=crop',
    'rotterdam': 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=300&fit=crop',
    'the-hague': 'https://images.unsplash.com/photo-1582654454409-778c732f8a72?w=400&h=300&fit=crop',

    // Belgium
    'brussels': 'https://images.unsplash.com/photo-1559113202-c916b8e44373?w=400&h=300&fit=crop',
    'antwerp': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',

    // UK
    'london': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=300&fit=crop',
    'manchester': 'https://images.unsplash.com/photo-1520120322929-60bb06f7f295?w=400&h=300&fit=crop',
    'birmingham': 'https://images.unsplash.com/photo-1570095035965-2d7e8a6c95e4?w=400&h=300&fit=crop',
    'edinburgh': 'https://images.unsplash.com/photo-1506377585622-bedcbb027afc?w=400&h=300&fit=crop',

    // Ireland
    'dublin': 'https://images.unsplash.com/photo-1549918864-48ac978761a4?w=400&h=300&fit=crop',

    // Nordics
    'stockholm': 'https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=400&h=300&fit=crop',
    'copenhagen': 'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=400&h=300&fit=crop',
    'oslo': 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=400&h=300&fit=crop',
    'helsinki': 'https://images.unsplash.com/photo-1538332576228-eb5b4c4de6f5?w=400&h=300&fit=crop',
    'gothenburg': 'https://images.unsplash.com/photo-1572862031783-db05c67a5107?w=400&h=300&fit=crop',
    'malmo': 'https://images.unsplash.com/photo-1558431382-27e303142255?w=400&h=300&fit=crop',

    // France
    'paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop',
    'lyon': 'https://images.unsplash.com/photo-1504214208698-ea1916a2195a?w=400&h=300&fit=crop',

    // Spain
    'madrid': 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400&h=300&fit=crop',
    'barcelona': 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&h=300&fit=crop',
    'valencia': 'https://images.unsplash.com/photo-1599302592205-d7d683c83eea?w=400&h=300&fit=crop',

    // Italy
    'milan': 'https://images.unsplash.com/photo-1520440229-6469a149ac59?w=400&h=300&fit=crop',
    'rome': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&h=300&fit=crop',

    // Poland
    'warsaw': 'https://images.unsplash.com/photo-1519197924294-4ba991a11128?w=400&h=300&fit=crop',
    'krakow': 'https://images.unsplash.com/photo-1574236170880-fae530dfa5c9?w=400&h=300&fit=crop',
    'wroclaw': 'https://images.unsplash.com/photo-1519197924294-4ba991a11128?w=400&h=300&fit=crop',

    // Other European
    'prague': 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=400&h=300&fit=crop',
    'lisbon': 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=400&h=300&fit=crop',
    'porto': 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400&h=300&fit=crop',
    'budapest': 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=400&h=300&fit=crop',
    'bucharest': 'https://images.unsplash.com/photo-1584646098378-0874589d76b1?w=400&h=300&fit=crop',
    'athens': 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=400&h=300&fit=crop',
    'luxembourg': 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=400&h=300&fit=crop',
    'tallinn': 'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=400&h=300&fit=crop',
};

// Default fallback image for cities without specific images
const DEFAULT_CITY_IMAGE = 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop';

// Get coaching categories for display
const CATEGORIES_LIST = Object.entries(COACHING_CATEGORIES).map(([slug, cat]) => ({
    slug,
    title: cat.title,
    icon: cat.icon
}));

/**
 * Get city image URL - prefers database picture_url, falls back to CITY_IMAGES
 * @param {Object|string} city - City object from database or city slug string
 */
function getCityImage(city) {
    // If city is an object with picture_url, use it
    if (city && typeof city === 'object' && city.picture_url) {
        return city.picture_url;
    }
    // If city is a string (slug), look it up in CITY_IMAGES
    const slug = typeof city === 'string' ? city : city?.code;
    return CITY_IMAGES[slug] || DEFAULT_CITY_IMAGE;
}

/**
 * Group cities by country (for database cities array)
 * @param {Array} citiesList - Array of city objects from database
 */
function groupCitiesByCountry(citiesList) {
    const grouped = {};
    (citiesList || []).forEach(city => {
        const country = city.country_en;
        if (!grouped[country]) {
            grouped[country] = [];
        }
        grouped[country].push(city);
    });
    return grouped;
}

/**
 * City Card Component
 * @param {Object} props - Component props
 * @param {Object} props.city - City object from database
 * @param {function} props.getLocalizedCityName - Function to get localized city name
 */
function CityCard({ city, getLocalizedCityName }) {
    const cityName = getLocalizedCityName ? getLocalizedCityName(city) : city.name_en;
    return html`
        <a href="/locations/${city.code}" class="city-card">
            <div class="city-card-image">
                <img
                    src=${getCityImage(city)}
                    alt="${cityName}, ${city.country_en}"
                    loading="lazy"
                />
                <div class="city-card-overlay">
                    <img
                        src="https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${city.country_code.toLowerCase()}.svg"
                        alt=${city.country_en}
                        class="city-flag"
                    />
                </div>
            </div>
            <div class="city-card-content">
                <h3>${cityName}</h3>
                <p>${city.country_en}</p>
            </div>
        </a>
    `;
}

/**
 * Main Locations Page Component
 * Uses database cities from AppContext
 */
export function LocationsPage() {
    // Get cities from database context
    const { cities, getLocalizedCityName } = useCities();

    // Group cities by country
    const citiesByCountry = useMemo(() => groupCitiesByCountry(cities.list), [cities.list]);

    // Country display order
    const countryOrder = [
        'Germany', 'Austria', 'Switzerland', 'Netherlands', 'Belgium',
        'United Kingdom', 'Ireland', 'Sweden', 'Denmark', 'Norway', 'Finland',
        'France', 'Spain', 'Italy', 'Poland', 'Czech Republic',
        'Portugal', 'Hungary', 'Romania', 'Greece', 'Luxembourg', 'Estonia'
    ];

    // Set page meta
    useEffect(() => {
        setPageMeta({
            title: t('locations.metaTitle') || 'Find Coaches by Location | CoachSearching',
            description: t('locations.metaDesc') || 'Browse professional coaches in cities across Europe. Find executive, life, career, and business coaches near you.',
            keywords: 'coaching locations, coaches by city, local coaches, European coaches, find coach near me',
            canonical: `${window.location.origin}/locations`
        });

        // Breadcrumb schema
        setStructuredData(generateBreadcrumbSchema([
            { name: 'Home', url: '/' },
            { name: 'Locations', url: '/locations' }
        ]));
    }, []);

    // Show loading state if cities not loaded
    if (!cities.isLoaded) {
        return html`
            <div class="locations-page">
                <div class="container" style=${{ textAlign: 'center', padding: '80px 20px' }}>
                    <div class="loading-spinner"></div>
                    <p>${t('common.loading') || 'Loading...'}</p>
                </div>
            </div>
        `;
    }

    return html`
        <div class="locations-page">
            <!-- Hero Section -->
            <section class="locations-hero">
                <div class="container">
                    <h1>${t('locations.title') || 'Find Coaches by Location'}</h1>
                    <p class="hero-description">
                        ${t('locations.subtitle') || 'Discover professional coaches in major cities across Europe. Connect with local experts who understand your market and can meet you in person or online.'}
                    </p>
                </div>
            </section>

            <!-- Coaching Categories Quick Links -->
            <section class="locations-categories">
                <div class="container">
                    <h2>${t('locations.coachingTypes') || 'Coaching Categories'}</h2>
                    <div class="categories-chips">
                        ${CATEGORIES_LIST.map(cat => html`
                            <a key=${cat.slug} href="/coaching/${cat.slug}" class="category-chip">
                                <span class="chip-icon">${cat.icon}</span>
                                <span>${t(`categoryPage.${cat.slug}.title`) || cat.title}</span>
                            </a>
                        `)}
                    </div>
                </div>
            </section>

            <!-- Cities by Country -->
            <section class="locations-cities">
                <div class="container">
                    ${countryOrder.filter(country => citiesByCountry[country]).map(country => html`
                        <div key=${country} class="country-section">
                            <h2 class="country-title">
                                <img
                                    src="https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${citiesByCountry[country][0].country_code.toLowerCase()}.svg"
                                    alt=${country}
                                    class="country-flag"
                                />
                                ${country}
                            </h2>
                            <div class="cities-grid">
                                ${citiesByCountry[country].map(city => html`
                                    <${CityCard}
                                        key=${city.code}
                                        city=${city}
                                        getLocalizedCityName=${getLocalizedCityName}
                                    />
                                `)}
                            </div>
                        </div>
                    `)}
                </div>
            </section>

            <!-- CTA Section -->
            <section class="locations-cta">
                <div class="container">
                    <h2>${t('locations.ctaTitle') || "Can't find your city?"}</h2>
                    <p>${t('locations.ctaDesc') || 'Many of our coaches offer virtual sessions worldwide. Browse all coaches to find your perfect match.'}</p>
                    <div class="cta-buttons">
                        <a href="/coaches" class="btn btn-primary btn-lg">${t('locations.browseAll') || 'Browse All Coaches'}</a>
                        <a href="/quiz" class="btn btn-secondary btn-lg">${t('category.takeQuiz') || 'Take the Quiz'}</a>
                    </div>
                </div>
            </section>
        </div>
    `;
}

/**
 * City Location Page Component - Shows all coaching categories for a specific city
 * Uses database cities from AppContext - looks up city by code (slug)
 */
export function CityLocationPage({ citySlug, session }) {
    // Get cities from database context
    const { cities, getLocalizedCityName, getCityByCode } = useCities();

    // Find city by code (slug)
    const city = useMemo(() => getCityByCode(citySlug), [citySlug, getCityByCode]);

    // Get localized city name
    const cityName = city ? getLocalizedCityName(city) : '';

    // Get related cities in same country
    const relatedCities = useMemo(() => {
        if (!city || !cities.list) return [];
        return cities.list
            .filter(c => c.country_code === city.country_code && c.code !== citySlug)
            .slice(0, 6);
    }, [city, cities.list, citySlug]);

    // Set page meta
    useEffect(() => {
        if (city) {
            setPageMeta({
                title: t('locations.cityMetaTitle', { city: cityName }) || `Coaches in ${cityName} | CoachSearching`,
                description: t('locations.cityMetaDesc', { city: cityName }) || `Find professional coaches in ${cityName}. Executive, life, career, and business coaching - in person or online.`,
                keywords: `coaches ${cityName}, coaching ${cityName}, ${cityName} coach, local coaching`,
                canonical: `${window.location.origin}/locations/${citySlug}`
            });

            // Breadcrumb schema
            setStructuredData(generateBreadcrumbSchema([
                { name: 'Home', url: '/' },
                { name: 'Locations', url: '/locations' },
                { name: cityName, url: `/locations/${citySlug}` }
            ]));
        }
    }, [citySlug, city, cityName]);

    // Show loading state if cities not loaded yet
    if (!cities.isLoaded) {
        return html`
            <div class="locations-page">
                <div class="container" style=${{ textAlign: 'center', padding: '80px 20px' }}>
                    <div class="loading-spinner"></div>
                    <p>${t('common.loading') || 'Loading...'}</p>
                </div>
            </div>
        `;
    }

    // City not found
    if (!city) {
        return html`
            <div class="locations-page">
                <div class="container" style=${{ textAlign: 'center', padding: '80px 20px' }}>
                    <h1>${t('locations.notFound') || 'Location Not Found'}</h1>
                    <p>${t('locations.notFoundDesc') || "We couldn't find this location. Please browse our available locations."}</p>
                    <a href="/locations" class="btn btn-primary" style=${{ marginTop: '20px' }}>
                        ${t('locations.viewAll') || 'View All Locations'}
                    </a>
                </div>
            </div>
        `;
    }

    // Wrapper component to pass CoachDetailModal to CoachList
    const CoachDetailModalWrapper = (props) => html`
        <${CoachDetailModal} ...${props} session=${session} />
    `;

    return html`
        <div class="locations-page city-location-page">
            <!-- Hero Section with City Image -->
            <section class="city-location-hero" style=${{ backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${getCityImage(city)})` }}>
                <div class="container">
                    <div class="city-hero-content">
                        <img
                            src="https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${city.country_code.toLowerCase()}.svg"
                            alt=${city.country_en}
                            class="city-hero-flag"
                        />
                        <h1>${t('locations.coachesIn', { city: cityName }) || `Coaches in ${cityName}`}</h1>
                        <p class="hero-description">
                            ${t('locations.cityHeroDesc', { city: cityName, country: city.country_en }) ||
                              `Find professional coaches in ${cityName}, ${city.country_en}. Connect with local experts for in-person or online coaching sessions.`}
                        </p>
                    </div>
                </div>
            </section>

            <!-- Coaching Categories Grid -->
            <section class="city-categories-section">
                <div class="container">
                    <h2>${t('locations.chooseCategory') || 'Choose a Coaching Category'}</h2>
                    <div class="city-categories-grid">
                        ${Object.entries(COACHING_CATEGORIES).map(([slug, category]) => html`
                            <a key=${slug} href="/coaching/${slug}/${citySlug}" class="city-category-card">
                                <div class="category-card-icon">${category.icon}</div>
                                <h3>${t(`categoryPage.${slug}.title`) || category.title}</h3>
                                <p>${t(`categoryPage.${slug}.shortDesc`) || category.description.substring(0, 100)}...</p>
                                <span class="card-cta">
                                    ${t('locations.viewCoaches') || 'View Coaches'} →
                                </span>
                            </a>
                        `)}
                    </div>
                </div>
            </section>

            <!-- Coaches in City Section -->
            <section id="city-coaches" class="city-coaches-section" style=${{ padding: '40px 0', background: 'white' }}>
                <div class="container">
                    <h2 style=${{ textAlign: 'center', marginBottom: '30px', fontSize: '1.75rem' }}>
                        ${t('locations.coachesIn', { city: cityName }) || `Coaches in ${cityName}`}
                    </h2>
                    <${CoachList}
                        session=${session}
                        CoachDetailModal=${CoachDetailModalWrapper}
                        initialCity=${cityName}
                    />
                </div>
            </section>

            <!-- Other Cities in Same Country -->
            <section class="related-cities-section">
                <div class="container">
                    <h2>${t('locations.otherCitiesIn', { country: city.country_en }) || `Other Cities in ${city.country_en}`}</h2>
                    <div class="related-cities-grid">
                        ${relatedCities.map(relCity => html`
                            <a key=${relCity.code} href="/locations/${relCity.code}" class="related-city-link">
                                <img
                                    src=${getCityImage(relCity)}
                                    alt=${getLocalizedCityName(relCity)}
                                    loading="lazy"
                                />
                                <span>${getLocalizedCityName(relCity)}</span>
                            </a>
                        `)}
                    </div>
                    <div style=${{ textAlign: 'center', marginTop: '20px' }}>
                        <a href="/locations" class="btn btn-secondary">
                            ${t('locations.viewAll') || 'View All Locations'}
                        </a>
                    </div>
                </div>
            </section>
        </div>
    `;
}

export default LocationsPage;
