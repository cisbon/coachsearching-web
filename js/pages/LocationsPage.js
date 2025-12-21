/**
 * Locations Page Component
 * @fileoverview Displays all coaching locations (cities) organized by country with images
 */

import htm from '../vendor/htm.js';
import { t } from '../i18n.js';
import { setPageMeta, generateBreadcrumbSchema, setStructuredData } from '../utils/seo.js';
import { COACHING_CITIES, COACHING_CATEGORIES } from './CategoryPage.js';

const React = window.React;
const { useEffect, useMemo } = React;
const html = htm.bind(React.createElement);

// City image URLs using Unsplash (curated city photos)
const CITY_IMAGES = {
    // Germany
    'berlin': 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=400&h=300&fit=crop',
    'munich': 'https://images.unsplash.com/photo-1595867818082-083862f3d630?w=400&h=300&fit=crop',
    'hamburg': 'https://images.unsplash.com/photo-1566657817352-c24f7c9bfef4?w=400&h=300&fit=crop',
    'frankfurt': 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=400&h=300&fit=crop',
    'dusseldorf': 'https://images.unsplash.com/photo-1574192324831-a0b85de7e40b?w=400&h=300&fit=crop',
    'cologne': 'https://images.unsplash.com/photo-1515091943-9d5c0ad475af?w=400&h=300&fit=crop',
    'stuttgart': 'https://images.unsplash.com/photo-1597993668915-66cf4ecc8fd4?w=400&h=300&fit=crop',
    'hanover': 'https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=400&h=300&fit=crop',
    'nuremberg': 'https://images.unsplash.com/photo-1573997073013-c44f35d97236?w=400&h=300&fit=crop',
    'leipzig': 'https://images.unsplash.com/photo-1567354721844-26a30b380fc4?w=400&h=300&fit=crop',
    'dresden': 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=400&h=300&fit=crop',
    'bonn': 'https://images.unsplash.com/photo-1578322050563-48e87b5d7e70?w=400&h=300&fit=crop',
    'essen': 'https://images.unsplash.com/photo-1570698473651-b2de99bae12f?w=400&h=300&fit=crop',
    'dortmund': 'https://images.unsplash.com/photo-1570698473651-b2de99bae12f?w=400&h=300&fit=crop',
    'bremen': 'https://images.unsplash.com/photo-1600623471616-8c1966c91ff6?w=400&h=300&fit=crop',
    'duisburg': 'https://images.unsplash.com/photo-1567354721844-26a30b380fc4?w=400&h=300&fit=crop',
    'munster': 'https://images.unsplash.com/photo-1577174881658-0f30ed549adc?w=400&h=300&fit=crop',
    'karlsruhe': 'https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=400&h=300&fit=crop',
    'mannheim': 'https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=400&h=300&fit=crop',
    'augsburg': 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=400&h=300&fit=crop',
    'wiesbaden': 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=400&h=300&fit=crop',
    'freiburg': 'https://images.unsplash.com/photo-1597993668915-66cf4ecc8fd4?w=400&h=300&fit=crop',

    // Austria
    'vienna': 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=400&h=300&fit=crop',

    // Switzerland
    'zurich': 'https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=400&h=300&fit=crop',
    'geneva': 'https://images.unsplash.com/photo-1573108037329-37aa135a142e?w=400&h=300&fit=crop',
    'basel': 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&h=300&fit=crop',

    // Netherlands
    'amsterdam': 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=400&h=300&fit=crop',
    'rotterdam': 'https://images.unsplash.com/photo-1543785832-f6ca4fe7aee3?w=400&h=300&fit=crop',
    'the-hague': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',

    // Belgium
    'brussels': 'https://images.unsplash.com/photo-1559113513-d5e09c78b9dd?w=400&h=300&fit=crop',
    'antwerp': 'https://images.unsplash.com/photo-1569317002804-ab77bcf1bce4?w=400&h=300&fit=crop',

    // UK
    'london': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=300&fit=crop',
    'manchester': 'https://images.unsplash.com/photo-1574864845668-8f4c2b31b8bd?w=400&h=300&fit=crop',
    'birmingham': 'https://images.unsplash.com/photo-1579424469556-cbe8baf32f45?w=400&h=300&fit=crop',
    'edinburgh': 'https://images.unsplash.com/photo-1506377585622-bedcbb027afc?w=400&h=300&fit=crop',

    // Ireland
    'dublin': 'https://images.unsplash.com/photo-1549918864-48ac978761a4?w=400&h=300&fit=crop',

    // Nordics
    'stockholm': 'https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=400&h=300&fit=crop',
    'copenhagen': 'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=400&h=300&fit=crop',
    'oslo': 'https://images.unsplash.com/photo-1533156228664-f55538b99ab3?w=400&h=300&fit=crop',
    'helsinki': 'https://images.unsplash.com/photo-1538332576228-eb5b4c4de6f5?w=400&h=300&fit=crop',
    'gothenburg': 'https://images.unsplash.com/photo-1571935441080-230d8698a54e?w=400&h=300&fit=crop',
    'malmo': 'https://images.unsplash.com/photo-1559310278-18a9192d909a?w=400&h=300&fit=crop',

    // France
    'paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop',
    'lyon': 'https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=400&h=300&fit=crop',

    // Spain
    'madrid': 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400&h=300&fit=crop',
    'barcelona': 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&h=300&fit=crop',
    'valencia': 'https://images.unsplash.com/photo-1580910051074-3eb694886f94?w=400&h=300&fit=crop',

    // Italy
    'milan': 'https://images.unsplash.com/photo-1520440229-6469a149ac59?w=400&h=300&fit=crop',
    'rome': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&h=300&fit=crop',

    // Poland
    'warsaw': 'https://images.unsplash.com/photo-1519197924294-4ba991a11128?w=400&h=300&fit=crop',
    'krakow': 'https://images.unsplash.com/photo-1561102877-3a7e33f8e0fe?w=400&h=300&fit=crop',
    'wroclaw': 'https://images.unsplash.com/photo-1528669851476-e03395ff1556?w=400&h=300&fit=crop',

    // Other European
    'prague': 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=400&h=300&fit=crop',
    'lisbon': 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=400&h=300&fit=crop',
    'porto': 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400&h=300&fit=crop',
    'budapest': 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=400&h=300&fit=crop',
    'bucharest': 'https://images.unsplash.com/photo-1584646098378-0874589d76b1?w=400&h=300&fit=crop',
    'athens': 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=400&h=300&fit=crop',
    'luxembourg': 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=400&h=300&fit=crop',
    'tallinn': 'https://images.unsplash.com/photo-1567067249025-d79f89bdeca9?w=400&h=300&fit=crop',
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
 * Get city image URL
 */
function getCityImage(citySlug) {
    return CITY_IMAGES[citySlug] || DEFAULT_CITY_IMAGE;
}

/**
 * Group cities by country
 */
function groupCitiesByCountry(cities) {
    const grouped = {};
    Object.entries(cities).forEach(([slug, city]) => {
        const country = city.country;
        if (!grouped[country]) {
            grouped[country] = [];
        }
        grouped[country].push({ slug, ...city });
    });
    return grouped;
}

/**
 * City Card Component
 */
function CityCard({ slug, name, country, countryCode }) {
    return html`
        <a href="/locations/${slug}" class="city-card">
            <div class="city-card-image">
                <img
                    src=${getCityImage(slug)}
                    alt="${name}, ${country}"
                    loading="lazy"
                />
                <div class="city-card-overlay">
                    <img
                        src="https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${countryCode.toLowerCase()}.svg"
                        alt=${country}
                        class="city-flag"
                    />
                </div>
            </div>
            <div class="city-card-content">
                <h3>${name}</h3>
                <p>${country}</p>
            </div>
        </a>
    `;
}

/**
 * Main Locations Page Component
 */
export function LocationsPage() {
    // Group cities by country
    const citiesByCountry = useMemo(() => groupCitiesByCountry(COACHING_CITIES), []);

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
                                    src="https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${citiesByCountry[country][0].countryCode.toLowerCase()}.svg"
                                    alt=${country}
                                    class="country-flag"
                                />
                                ${country}
                            </h2>
                            <div class="cities-grid">
                                ${citiesByCountry[country].map(city => html`
                                    <${CityCard}
                                        key=${city.slug}
                                        slug=${city.slug}
                                        name=${city.name}
                                        country=${city.country}
                                        countryCode=${city.countryCode}
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
 */
export function CityLocationPage({ citySlug }) {
    const city = COACHING_CITIES[citySlug];

    // Set page meta
    useEffect(() => {
        if (city) {
            setPageMeta({
                title: t('locations.cityMetaTitle', { city: city.name }) || `Coaches in ${city.name} | CoachSearching`,
                description: t('locations.cityMetaDesc', { city: city.name }) || `Find professional coaches in ${city.name}. Executive, life, career, and business coaching - in person or online.`,
                keywords: `coaches ${city.name}, coaching ${city.name}, ${city.name} coach, local coaching`,
                canonical: `${window.location.origin}/locations/${citySlug}`
            });

            // Breadcrumb schema
            setStructuredData(generateBreadcrumbSchema([
                { name: 'Home', url: '/' },
                { name: 'Locations', url: '/locations' },
                { name: city.name, url: `/locations/${citySlug}` }
            ]));
        }
    }, [citySlug, city]);

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

    return html`
        <div class="locations-page city-location-page">
            <!-- Hero Section with City Image -->
            <section class="city-location-hero" style=${{ backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${getCityImage(citySlug)})` }}>
                <div class="container">
                    <div class="city-hero-content">
                        <img
                            src="https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${city.countryCode.toLowerCase()}.svg"
                            alt=${city.country}
                            class="city-hero-flag"
                        />
                        <h1>${t('locations.coachesIn', { city: city.name }) || `Coaches in ${city.name}`}</h1>
                        <p class="hero-description">
                            ${t('locations.cityHeroDesc', { city: city.name, country: city.country }) ||
                              `Find professional coaches in ${city.name}, ${city.country}. Connect with local experts for in-person or online coaching sessions.`}
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

            <!-- Other Cities in Same Country -->
            <section class="related-cities-section">
                <div class="container">
                    <h2>${t('locations.otherCitiesIn', { country: city.country }) || `Other Cities in ${city.country}`}</h2>
                    <div class="related-cities-grid">
                        ${Object.entries(COACHING_CITIES)
                            .filter(([slug, c]) => c.country === city.country && slug !== citySlug)
                            .slice(0, 6)
                            .map(([slug, c]) => html`
                                <a key=${slug} href="/locations/${slug}" class="related-city-link">
                                    <img
                                        src=${getCityImage(slug)}
                                        alt=${c.name}
                                        loading="lazy"
                                    />
                                    <span>${c.name}</span>
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
