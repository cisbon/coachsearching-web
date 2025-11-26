// js/seoLandingPages.js - SEO-Optimized Landing Page Components
import htm from './vendor/htm.js';
import { t, getCurrentLang } from './i18n.js';
import { CoachCardEnhanced, CoachCardFeatured } from './coachProfile.js';
import { CoachProfileModal } from './coachProfileModal.js';
import { SearchBar, FilterBar } from './coachDiscovery.js';

const React = window.React;
const { useState, useEffect, useCallback, useMemo } = React;
const html = htm.bind(React.createElement);

// =============================================
// SEO LANDING PAGE COMPONENT
// =============================================

export const SEOLandingPage = ({
    specialty,
    location,
    session,
    formatPrice,
    onStartQuiz
}) => {
    const [coaches, setCoaches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCoach, setSelectedCoach] = useState(null);
    const [specialtyData, setSpecialtyData] = useState(null);
    const [locationData, setLocationData] = useState(null);

    const lang = getCurrentLang();

    // Load page data
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);

            try {
                const supabase = window.supabaseClient;
                if (!supabase) {
                    console.error('Supabase client not available');
                    setLoading(false);
                    return;
                }

                // Load coaches with filters
                let query = supabase
                    .from('cs_coaches')
                    .select('*')
                    .eq('onboarding_completed', true)
                    .order('video_intro_url', { ascending: false, nullsLast: true })
                    .order('trust_score', { ascending: false })
                    .order('rating_average', { ascending: false });

                // Load specialty data if provided
                if (specialty) {
                    const { data: specData } = await supabase
                        .from('cs_specialty_categories')
                        .select('*')
                        .eq('slug', specialty)
                        .single();

                    if (specData) {
                        setSpecialtyData(specData);
                    }
                }

                // Load location data if provided
                if (location) {
                    const { data: locData } = await supabase
                        .from('cs_locations')
                        .select('*')
                        .eq('slug', location)
                        .single();

                    if (locData) {
                        setLocationData(locData);
                        query = query.ilike('city', `%${locData.city}%`);
                    }
                }

                const { data: coachesData, error } = await query;

                if (error) {
                    console.error('Error loading coaches:', error);
                } else {
                    let filteredCoaches = coachesData || [];

                    // Filter by specialty client-side
                    if (specialty && filteredCoaches.length > 0) {
                        filteredCoaches = filteredCoaches.filter(coach =>
                            coach.specialties?.some(s =>
                                s.toLowerCase().includes(specialty.toLowerCase())
                            )
                        );
                    }

                    setCoaches(filteredCoaches);
                }
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [specialty, location]);

    // Generate page title
    const pageTitle = useMemo(() => {
        const specName = specialtyData?.name?.[lang] || specialtyData?.name?.en || specialty;
        const locName = locationData?.city || location;

        if (specName && locName) {
            return `${specName} ${t('seo.in') || 'in'} ${locName}`;
        } else if (specName) {
            return specName;
        } else if (locName) {
            return `${t('seo.coachesIn') || 'Coaches in'} ${locName}`;
        }
        return t('seo.allCoaches') || 'All Coaches';
    }, [specialtyData, locationData, specialty, location, lang]);

    // Generate page description
    const pageDescription = useMemo(() => {
        const specName = specialtyData?.name?.[lang] || specialtyData?.name?.en || specialty;
        const locName = locationData?.city || location;
        const count = coaches.length;

        if (specName && locName) {
            return t('seo.descriptionBoth', { specialty: specName, location: locName, count }) ||
                `Find ${count} certified ${specName} coaches in ${locName}. Compare profiles, watch introduction videos, and book your first session.`;
        } else if (specName) {
            return t('seo.descriptionSpecialty', { specialty: specName, count }) ||
                `Discover ${count} professional ${specName} coaches. Get personalized guidance to achieve your goals.`;
        } else if (locName) {
            return t('seo.descriptionLocation', { location: locName, count }) ||
                `Browse ${count} verified coaches in ${locName}. Find the perfect match for your coaching needs.`;
        }
        return t('seo.descriptionDefault') || 'Find your perfect coach from our network of certified professionals.';
    }, [specialtyData, locationData, specialty, location, coaches.length, lang]);

    // Separate featured and regular coaches
    const { featuredCoaches, regularCoaches } = useMemo(() => {
        const featured = coaches.filter(c => c.video_intro_url);
        const regular = coaches.filter(c => !c.video_intro_url);
        return { featuredCoaches: featured, regularCoaches: regular };
    }, [coaches]);

    const handleViewDetails = useCallback((coach) => {
        setSelectedCoach(coach);
    }, []);

    return html`
        <div class="seo-landing-page">
            <!-- Hero Section -->
            <section class="seo-hero">
                <div class="container">
                    <nav class="seo-breadcrumb">
                        <a href="/">${t('nav.home') || 'Home'}</a>
                        <span class="separator">/</span>
                        ${location && html`
                            <a href="/coaches/${location}">${locationData?.city || location}</a>
                            <span class="separator">/</span>
                        `}
                        ${specialty && html`
                            <span class="current">${specialtyData?.name?.[lang] || specialty}</span>
                        `}
                        ${!specialty && !location && html`
                            <span class="current">${t('nav.coaches') || 'Coaches'}</span>
                        `}
                    </nav>

                    <h1 class="seo-title">${pageTitle}</h1>
                    <p class="seo-description">${pageDescription}</p>

                    <div class="seo-stats">
                        <div class="stat">
                            <span class="stat-value">${coaches.length}</span>
                            <span class="stat-label">${t('seo.verifiedCoaches') || 'Verified Coaches'}</span>
                        </div>
                        ${featuredCoaches.length > 0 && html`
                            <div class="stat">
                                <span class="stat-value">${featuredCoaches.length}</span>
                                <span class="stat-label">${t('seo.withVideo') || 'With Video Intro'}</span>
                            </div>
                        `}
                    </div>

                    <div class="seo-actions">
                        <button class="btn-quiz" onClick=${onStartQuiz}>
                            ${t('seo.takeQuiz') || 'Take Matching Quiz'}
                        </button>
                    </div>
                </div>
            </section>

            <!-- Coaches List -->
            <section class="seo-coaches">
                <div class="container">
                    ${loading ? html`
                        <div class="loading-container">
                            <div class="loading-spinner"></div>
                            <p>${t('common.loading') || 'Loading coaches...'}</p>
                        </div>
                    ` : coaches.length === 0 ? html`
                        <div class="empty-state">
                            <span class="empty-icon">🔍</span>
                            <h3>${t('seo.noCoaches') || 'No coaches found'}</h3>
                            <p>${t('seo.noCoachesHint') || 'Try browsing all coaches or take our matching quiz.'}</p>
                            <a href="/coaches" class="btn-browse">
                                ${t('seo.browseAll') || 'Browse All Coaches'}
                            </a>
                        </div>
                    ` : html`
                        <!-- Featured Coaches -->
                        ${featuredCoaches.length > 0 && html`
                            <div class="coaches-section">
                                <h2 class="section-title">
                                    <span class="section-icon">🎥</span>
                                    ${t('seo.featuredCoaches') || 'Featured Coaches with Video'}
                                </h2>
                                <div class="featured-grid">
                                    ${featuredCoaches.map(coach => html`
                                        <${CoachCardFeatured}
                                            key=${coach.id}
                                            coach=${coach}
                                            onViewDetails=${handleViewDetails}
                                            formatPrice=${formatPrice}
                                        />
                                    `)}
                                </div>
                            </div>
                        `}

                        <!-- Regular Coaches -->
                        ${regularCoaches.length > 0 && html`
                            <div class="coaches-section">
                                ${featuredCoaches.length > 0 && html`
                                    <h2 class="section-title">
                                        <span class="section-icon">👨‍🏫</span>
                                        ${t('seo.moreCoaches') || 'More Coaches'}
                                    </h2>
                                `}
                                <div class="coaches-grid">
                                    ${regularCoaches.map(coach => html`
                                        <${CoachCardEnhanced}
                                            key=${coach.id}
                                            coach=${coach}
                                            onViewDetails=${handleViewDetails}
                                            formatPrice=${formatPrice}
                                        />
                                    `)}
                                </div>
                            </div>
                        `}
                    `}
                </div>
            </section>

            <!-- SEO Content Section -->
            ${(specialty || location) && html`
                <section class="seo-content">
                    <div class="container">
                        ${specialty && html`
                            <div class="content-block">
                                <h2>${t('seo.about') || 'About'} ${specialtyData?.name?.[lang] || specialty}</h2>
                                <p>${getSEOContent(specialty, 'specialty', lang)}</p>
                            </div>
                        `}

                        ${location && html`
                            <div class="content-block">
                                <h2>${t('seo.coachingIn') || 'Coaching in'} ${locationData?.city || location}</h2>
                                <p>${getSEOContent(location, 'location', lang)}</p>
                            </div>
                        `}

                        <div class="content-block">
                            <h2>${t('seo.whyChoose') || 'Why Choose Our Platform'}</h2>
                            <ul class="benefits-list">
                                <li>${t('seo.benefit1') || 'All coaches are verified and credentialed'}</li>
                                <li>${t('seo.benefit2') || 'Watch video introductions before booking'}</li>
                                <li>${t('seo.benefit3') || 'Compare prices and read authentic reviews'}</li>
                                <li>${t('seo.benefit4') || 'Book sessions online or in-person'}</li>
                                <li>${t('seo.benefit5') || 'Secure payment processing'}</li>
                            </ul>
                        </div>
                    </div>
                </section>
            `}

            <!-- FAQ Section -->
            <section class="seo-faq">
                <div class="container">
                    <h2 class="faq-title">${t('seo.faq') || 'Frequently Asked Questions'}</h2>
                    <div class="faq-list">
                        ${getFAQs(specialty, location, lang).map((faq, i) => html`
                            <${FAQItem} key=${i} question=${faq.q} answer=${faq.a} />
                        `)}
                    </div>
                </div>
            </section>

            <!-- Related Pages -->
            <${RelatedPages} currentSpecialty=${specialty} currentLocation=${location} />

            <!-- Profile Modal -->
            ${selectedCoach && html`
                <${CoachProfileModal}
                    coach=${selectedCoach}
                    onClose=${() => setSelectedCoach(null)}
                    formatPrice=${formatPrice}
                    session=${session}
                />
            `}
        </div>
    `;
};

// =============================================
// FAQ ITEM COMPONENT
// =============================================

const FAQItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);

    return html`
        <div class="faq-item ${isOpen ? 'open' : ''}">
            <button class="faq-question" onClick=${() => setIsOpen(!isOpen)}>
                <span>${question}</span>
                <span class="faq-toggle">${isOpen ? '−' : '+'}</span>
            </button>
            ${isOpen && html`
                <div class="faq-answer">
                    <p>${answer}</p>
                </div>
            `}
        </div>
    `;
};

// =============================================
// RELATED PAGES COMPONENT
// =============================================

const RelatedPages = ({ currentSpecialty, currentLocation }) => {
    const [specialties, setSpecialties] = useState([]);
    const [locations, setLocations] = useState([]);

    const lang = getCurrentLang();

    useEffect(() => {
        const loadRelated = async () => {
            const supabase = window.supabaseClient;
            if (!supabase) return;

            try {
                const [specsRes, locsRes] = await Promise.all([
                    supabase
                        .from('cs_specialty_categories')
                        .select('*')
                        .eq('is_active', true)
                        .neq('slug', currentSpecialty || '')
                        .order('sort_order')
                        .limit(6),
                    supabase
                        .from('cs_locations')
                        .select('*')
                        .gt('coach_count', 0)
                        .neq('slug', currentLocation || '')
                        .order('coach_count', { ascending: false })
                        .limit(6)
                ]);

                if (specsRes.data) setSpecialties(specsRes.data);
                if (locsRes.data) setLocations(locsRes.data);
            } catch (error) {
                console.error('Error loading related pages:', error);
            }
        };

        loadRelated();
    }, [currentSpecialty, currentLocation]);

    if (specialties.length === 0 && locations.length === 0) return null;

    return html`
        <section class="related-pages">
            <div class="container">
                ${specialties.length > 0 && html`
                    <div class="related-section">
                        <h3>${t('seo.otherSpecialties') || 'Other Specialties'}</h3>
                        <div class="related-links">
                            ${specialties.map(spec => html`
                                <a
                                    key=${spec.id}
                                    href=${`/coaches/${currentLocation || 'all'}/${spec.slug}`}
                                    class="related-link"
                                >
                                    <span class="link-icon">${spec.icon}</span>
                                    <span>${spec.name[lang] || spec.name.en}</span>
                                </a>
                            `)}
                        </div>
                    </div>
                `}

                ${locations.length > 0 && html`
                    <div class="related-section">
                        <h3>${t('seo.otherLocations') || 'Other Locations'}</h3>
                        <div class="related-links">
                            ${locations.map(loc => html`
                                <a
                                    key=${loc.id}
                                    href=${`/coaches/${loc.slug}${currentSpecialty ? '/' + currentSpecialty : ''}`}
                                    class="related-link"
                                >
                                    <span class="link-icon">📍</span>
                                    <span>${loc.city}</span>
                                    ${loc.coach_count > 0 && html`
                                        <span class="link-count">(${loc.coach_count})</span>
                                    `}
                                </a>
                            `)}
                        </div>
                    </div>
                `}
            </div>
        </section>
    `;
};

// =============================================
// SEO CONTENT HELPERS
// =============================================

function getSEOContent(slug, type, lang) {
    const content = {
        specialty: {
            'executive': {
                en: 'Executive coaching helps senior leaders and C-suite executives develop strategic thinking, improve decision-making, and enhance their leadership impact. Our certified executive coaches bring decades of corporate experience to help you navigate complex business challenges.',
                de: 'Executive Coaching hilft Führungskräften und C-Level-Executives, strategisches Denken zu entwickeln, Entscheidungsfindung zu verbessern und ihre Führungswirkung zu verstärken.'
            },
            'career': {
                en: 'Career coaching guides professionals through career transitions, job searches, and professional development. Whether you\'re looking to advance in your current role or make a complete career change, our coaches provide personalized strategies for success.',
                de: 'Karriere-Coaching begleitet Fachleute durch Karrierewechsel, Jobsuche und berufliche Entwicklung.'
            },
            'life': {
                en: 'Life coaching focuses on personal growth, work-life balance, and achieving your full potential. Our life coaches help you clarify your goals, overcome obstacles, and create lasting positive changes in all areas of your life.',
                de: 'Life Coaching konzentriert sich auf persönliches Wachstum, Work-Life-Balance und das Erreichen Ihres vollen Potenzials.'
            },
            'health': {
                en: 'Health and wellness coaching supports you in achieving your physical and mental well-being goals. From nutrition and fitness to stress management and mindfulness, our coaches help you build sustainable healthy habits.',
                de: 'Gesundheits- und Wellness-Coaching unterstützt Sie dabei, Ihre körperlichen und geistigen Wohlbefindensziele zu erreichen.'
            },
            'business': {
                en: 'Business coaching helps entrepreneurs and business owners grow their companies, improve operations, and achieve their business objectives. Our coaches bring real-world business experience to help you succeed.',
                de: 'Business Coaching hilft Unternehmern und Geschäftsinhabern, ihre Unternehmen zu wachsen und ihre Geschäftsziele zu erreichen.'
            },
            'leadership': {
                en: 'Leadership coaching develops your ability to inspire teams, drive organizational change, and lead with confidence. Our leadership coaches help you build the skills needed to excel as a leader at any level.',
                de: 'Leadership Coaching entwickelt Ihre Fähigkeit, Teams zu inspirieren, organisatorischen Wandel voranzutreiben und mit Selbstvertrauen zu führen.'
            }
        },
        location: {
            'berlin': {
                en: 'Berlin is a vibrant hub for professionals seeking coaching services. With its diverse international community and thriving startup scene, the city offers access to multilingual coaches specializing in various fields.',
                de: 'Berlin ist ein pulsierender Knotenpunkt für Fachleute, die Coaching-Dienstleistungen suchen. Mit seiner vielfältigen internationalen Gemeinschaft bietet die Stadt Zugang zu mehrsprachigen Coaches.'
            },
            'munich': {
                en: 'Munich\'s strong business environment makes it an ideal location for executive and business coaching. The city\'s concentration of major corporations means coaches here are experienced with corporate leadership challenges.',
                de: 'Münchens starkes Geschäftsumfeld macht es zu einem idealen Standort für Executive- und Business-Coaching.'
            },
            'london': {
                en: 'London offers one of the most diverse coaching communities in Europe. From the City\'s financial sector to the creative industries, you\'ll find specialized coaches for every career path and life goal.',
                de: 'London bietet eine der vielfältigsten Coaching-Gemeinschaften in Europa.'
            },
            'paris': {
                en: 'Paris combines European sophistication with world-class coaching expertise. The city\'s coaches are experienced in working with international clients across various industries.',
                de: 'Paris verbindet europäische Raffinesse mit erstklassiger Coaching-Expertise.'
            }
        }
    };

    const typeContent = content[type] || {};
    const slugContent = typeContent[slug.toLowerCase()] || {};

    return slugContent[lang] || slugContent['en'] ||
        (type === 'specialty'
            ? `Discover professional ${slug} coaches who can help you achieve your goals.`
            : `Find verified coaches in ${slug} ready to support your personal and professional growth.`);
}

function getFAQs(specialty, location, lang) {
    const baseFAQs = [
        {
            q: t('faq.q1') || 'How do I choose the right coach?',
            a: t('faq.a1') || 'Start by watching coach introduction videos to get a sense of their style and approach. Review their credentials, specialties, and client reviews. Many coaches offer a free initial consultation to ensure a good fit.'
        },
        {
            q: t('faq.q2') || 'What\'s the difference between online and in-person coaching?',
            a: t('faq.a2') || 'Both formats are equally effective. Online coaching offers flexibility and convenience, while in-person sessions may feel more personal. Many clients start online and occasionally meet in person, or vice versa.'
        },
        {
            q: t('faq.q3') || 'How much does coaching typically cost?',
            a: t('faq.a3') || 'Coaching rates vary based on the coach\'s experience, specialization, and location. Most coaches on our platform offer sessions ranging from €50 to €250 per hour. Many offer package deals for multiple sessions.'
        },
        {
            q: t('faq.q4') || 'How long does a typical coaching engagement last?',
            a: t('faq.a4') || 'This depends on your goals. Some clients achieve results in 3-6 sessions, while others prefer ongoing support over several months. Your coach will help you determine the right approach for your situation.'
        }
    ];

    if (specialty) {
        baseFAQs.unshift({
            q: `What is ${specialty} coaching?`,
            a: getSEOContent(specialty, 'specialty', lang)
        });
    }

    return baseFAQs;
}

// =============================================
// EXPORTS
// =============================================

export default {
    SEOLandingPage,
    FAQItem,
    RelatedPages
};
