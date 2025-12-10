// js/landingPage.js - Landing Page with Video Priority Layout
import htm from './vendor/htm.js';
import { t } from './i18n.js';
import { setPageMeta } from './utils/seo.js';
import {
    TrustScore,
    CoachCardEnhanced,
    CoachCardFeatured,
    PlatformStats
} from './coachProfile.js';
import { CoachProfileModal } from './coachProfileModal.js';

const React = window.React;
const { useState, useEffect, useCallback, useMemo } = React;
const html = htm.bind(React.createElement);

// =============================================
// HERO SECTION
// =============================================

export const HeroSection = ({ onSearch }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSearch && onSearch(searchTerm);
    };

    return html`
        <section class="hero-section">
            <div class="hero-content">
                <h1 class="hero-title">${t('hero.title') || 'Find Your Perfect Coach'}</h1>
                <p class="hero-subtitle">${t('hero.subtitle') || 'Connect with certified professionals who can help you achieve your goals'}</p>

                <form class="hero-search" onSubmit=${handleSubmit}>
                    <div class="search-input-wrapper">
                        <span class="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder=${t('hero.searchPlaceholder') || 'Search by specialty, name, or location...'}
                            value=${searchTerm}
                            onChange=${(e) => setSearchTerm(e.target.value)}
                            class="hero-search-input"
                        />
                    </div>
                    <button type="submit" class="hero-search-btn">
                        ${t('hero.searchBtn') || 'Find Coaches'}
                    </button>
                </form>

                <div class="hero-tags">
                    <span class="tag-label">${t('hero.popular') || 'Popular:'}</span>
                    ${['Life Coaching', 'Career', 'Executive', 'Health'].map(tag => html`
                        <button
                            key=${tag}
                            class="hero-tag"
                            onClick=${() => onSearch && onSearch(tag)}
                        >
                            ${tag}
                        </button>
                    `)}
                </div>
            </div>
        </section>
    `;
};

// =============================================
// COACH LIST WITH VIDEO PRIORITY
// =============================================

export const CoachListVideoPriority = ({ searchFilters, session, formatPrice }) => {
    const [coaches, setCoaches] = useState([]);
    const [platformStats, setPlatformStats] = useState(null);
    const [selectedCoach, setSelectedCoach] = useState(null);
    const [loading, setLoading] = useState(true);

    // Load coaches with video priority sorting
    const loadCoaches = useCallback(async () => {
        setLoading(true);

        try {
            const supabase = window.supabaseClient;
            if (!supabase) {
                console.error('Supabase client not available');
                setLoading(false);
                return;
            }

            // Load coaches with video priority: coaches with videos first, then by trust score
            const { data: coachesData, error } = await supabase
                .from('cs_coaches')
                .select('*')
                .eq('onboarding_completed', true)
                .order('video_intro_url', { ascending: false, nullsLast: true })
                .order('trust_score', { ascending: false })
                .order('rating_average', { ascending: false });

            if (error) {
                console.error('Error loading coaches:', error);
            } else {
                setCoaches(coachesData || []);
            }

            // Load platform stats
            const { data: statsData } = await supabase
                .from('cs_platform_stats')
                .select('*')
                .eq('id', 1)
                .single();

            if (statsData) {
                setPlatformStats(statsData);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCoaches();
    }, [loadCoaches]);

    // Filter coaches based on search
    const filteredCoaches = useMemo(() => {
        if (!searchFilters?.searchTerm) return coaches;

        const term = searchFilters.searchTerm.toLowerCase();
        return coaches.filter(coach =>
            coach.full_name?.toLowerCase().includes(term) ||
            coach.title?.toLowerCase().includes(term) ||
            coach.bio?.toLowerCase().includes(term) ||
            coach.specialties?.some(s => s.toLowerCase().includes(term)) ||
            coach.location?.toLowerCase().includes(term) ||
            coach.city?.toLowerCase().includes(term)
        );
    }, [coaches, searchFilters]);

    // Separate coaches with and without videos
    const { featuredCoaches, regularCoaches } = useMemo(() => {
        const featured = filteredCoaches.filter(c => c.video_intro_url);
        const regular = filteredCoaches.filter(c => !c.video_intro_url);
        return { featuredCoaches: featured, regularCoaches: regular };
    }, [filteredCoaches]);

    const handleViewDetails = useCallback((coach) => {
        setSelectedCoach(coach);
    }, []);

    const handleCloseModal = useCallback(() => {
        setSelectedCoach(null);
    }, []);

    const handleBook = useCallback((coach, service) => {
        // Navigate to booking flow
        console.log('Book:', coach, service);
        // You can implement navigation to booking page here
    }, []);

    if (loading) {
        return html`
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>${t('common.loading') || 'Loading coaches...'}</p>
            </div>
        `;
    }

    return html`
        <div class="coach-list-video-priority">
            <!-- Platform Stats -->
            ${platformStats && html`
                <section class="stats-section">
                    <${PlatformStats} stats=${platformStats} />
                </section>
            `}

            <!-- Search Results Header -->
            ${searchFilters?.searchTerm && html`
                <div class="search-results-header">
                    <h2>${t('search.resultsFor') || 'Results for'} "${searchFilters.searchTerm}"</h2>
                    <p>${filteredCoaches.length} ${t('search.coachesFound') || 'coaches found'}</p>
                </div>
            `}

            <!-- Featured Coaches (with video) -->
            ${featuredCoaches.length > 0 && html`
                <section class="featured-coaches-section">
                    <div class="section-header">
                        <h2>
                            <span class="section-icon">🎥</span>
                            ${t('coaches.featured') || 'Featured Coaches'}
                        </h2>
                        <p class="section-subtitle">${t('coaches.featuredSubtitle') || 'Watch their introduction videos'}</p>
                    </div>
                    <div class="featured-coaches-grid">
                        ${featuredCoaches.slice(0, 4).map(coach => html`
                            <${CoachCardFeatured}
                                key=${coach.id}
                                coach=${coach}
                                onViewDetails=${handleViewDetails}
                                formatPrice=${formatPrice}
                            />
                        `)}
                    </div>
                </section>
            `}

            <!-- Regular Coaches -->
            ${regularCoaches.length > 0 && html`
                <section class="regular-coaches-section">
                    <div class="section-header">
                        <h2>
                            <span class="section-icon">👨‍🏫</span>
                            ${featuredCoaches.length > 0
                                ? (t('coaches.moreCoaches') || 'More Coaches')
                                : (t('coaches.allCoaches') || 'All Coaches')
                            }
                        </h2>
                    </div>
                    <div class="coaches-grid-enhanced">
                        ${regularCoaches.map(coach => html`
                            <${CoachCardEnhanced}
                                key=${coach.id}
                                coach=${coach}
                                onViewDetails=${handleViewDetails}
                                formatPrice=${formatPrice}
                            />
                        `)}
                    </div>
                </section>
            `}

            <!-- Empty State -->
            ${filteredCoaches.length === 0 && html`
                <div class="empty-coaches-state">
                    <span class="empty-icon">🔍</span>
                    <h3>${t('search.noResults') || 'No coaches found'}</h3>
                    <p>${t('search.noResultsHint') || 'Try adjusting your search criteria'}</p>
                </div>
            `}

            <!-- Profile Modal -->
            ${selectedCoach && html`
                <${CoachProfileModal}
                    coach=${selectedCoach}
                    onClose=${handleCloseModal}
                    onBook=${handleBook}
                    formatPrice=${formatPrice}
                    session=${session}
                />
            `}
        </div>
    `;
};

// =============================================
// TRUST SECTION
// =============================================

export const TrustSection = () => {
    const trustFeatures = [
        {
            icon: '✓',
            title: t('trust.verified') || 'Verified Profiles',
            description: t('trust.verifiedDesc') || 'All coaches go through identity and credential verification'
        },
        {
            icon: '🎥',
            title: t('trust.videoIntros') || 'Video Introductions',
            description: t('trust.videoIntrosDesc') || 'See and hear from coaches before booking'
        },
        {
            icon: '⭐',
            title: t('trust.reviews') || 'Authentic Reviews',
            description: t('trust.reviewsDesc') || 'Real feedback from verified clients'
        },
        {
            icon: '🔒',
            title: t('trust.secure') || 'Secure Payments',
            description: t('trust.secureDesc') || 'Protected transactions through Stripe'
        }
    ];

    return html`
        <section class="trust-section">
            <div class="container">
                <h2 class="trust-title">${t('trust.title') || 'Why Choose Our Platform'}</h2>
                <div class="trust-grid">
                    ${trustFeatures.map((feature, i) => html`
                        <div class="trust-feature" key=${i}>
                            <div class="feature-icon">${feature.icon}</div>
                            <h3 class="feature-title">${feature.title}</h3>
                            <p class="feature-description">${feature.description}</p>
                        </div>
                    `)}
                </div>
            </div>
        </section>
    `;
};

// =============================================
// HOW IT WORKS SECTION
// =============================================

export const HowItWorksSection = () => {
    const steps = [
        {
            number: '1',
            title: t('how.step1.title') || 'Browse Coaches',
            description: t('how.step1.desc') || 'Search by specialty, watch introduction videos, and review credentials'
        },
        {
            number: '2',
            title: t('how.step2.title') || 'Book a Session',
            description: t('how.step2.desc') || 'Choose a time that works for you and book with secure payment'
        },
        {
            number: '3',
            title: t('how.step3.title') || 'Start Coaching',
            description: t('how.step3.desc') || 'Connect online or in-person and achieve your goals'
        }
    ];

    return html`
        <section class="how-it-works-section">
            <div class="container">
                <h2 class="section-title">${t('how.title') || 'How It Works'}</h2>
                <div class="steps-container">
                    ${steps.map((step, i) => html`
                        <div class="step" key=${i}>
                            <div class="step-number">${step.number}</div>
                            <h3 class="step-title">${step.title}</h3>
                            <p class="step-description">${step.description}</p>
                        </div>
                    `)}
                </div>
            </div>
        </section>
    `;
};

// =============================================
// CTA SECTION
// =============================================

export const CTASection = ({ onBecomeCoach }) => {
    return html`
        <section class="cta-section">
            <div class="container">
                <div class="cta-content">
                    <div class="cta-text">
                        <h2>${t('cta.title') || 'Are You a Coach?'}</h2>
                        <p>${t('cta.subtitle') || 'Join our platform and reach thousands of potential clients'}</p>
                        <ul class="cta-benefits">
                            <li>${t('cta.benefit1') || 'Manage your schedule easily'}</li>
                            <li>${t('cta.benefit2') || 'Get paid securely'}</li>
                            <li>${t('cta.benefit3') || 'Build your reputation with reviews'}</li>
                        </ul>
                    </div>
                    <div class="cta-action">
                        <button class="btn-become-coach" onClick=${onBecomeCoach}>
                            ${t('cta.button') || 'Become a Coach'}
                        </button>
                    </div>
                </div>
            </div>
        </section>
    `;
};

// =============================================
// COMPLETE LANDING PAGE
// =============================================

export const LandingPage = ({ session, formatPrice, onBecomeCoach }) => {
    const [searchFilters, setSearchFilters] = useState({});

    // Set SEO meta tags for landing page
    useEffect(() => {
        setPageMeta({
            title: t('seo.home.title') || 'Find Your Perfect Coach',
            description: t('seo.home.description') || 'Connect with certified professional coaches for business, life, career, and personal development. Book online or in-person coaching sessions.',
            url: 'https://coachsearching.com/',
            type: 'website',
        });
    }, []);

    const handleSearch = useCallback((term) => {
        setSearchFilters({ searchTerm: term });
        // Scroll to results
        const resultsSection = document.querySelector('.coach-list-video-priority');
        if (resultsSection) {
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        }
    }, []);

    return html`
        <div class="landing-page">
            <${HeroSection} onSearch=${handleSearch} />

            <div class="container">
                <${CoachListVideoPriority}
                    searchFilters=${searchFilters}
                    session=${session}
                    formatPrice=${formatPrice}
                />
            </div>

            <${TrustSection} />

            <${HowItWorksSection} />

            <${CTASection} onBecomeCoach=${onBecomeCoach} />
        </div>
    `;
};

// =============================================
// EXPORT
// =============================================

export default {
    HeroSection,
    CoachListVideoPriority,
    TrustSection,
    HowItWorksSection,
    CTASection,
    LandingPage
};
