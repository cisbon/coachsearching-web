/**
 * Coach Profile Page
 * @fileoverview SEO-optimized coach profile page with structured data
 */

import htm from '../vendor/htm.js';
import { t } from '../i18n.js';
import {
    setPageMeta,
    setStructuredData,
    removeStructuredData,
    generateCoachSchema,
    generateServiceSchema,
    generateLocalBusinessSchema,
    generateBreadcrumbSchema,
    truncateForMeta,
} from '../utils/seo.js';
import { Breadcrumbs, CoachBreadcrumbs } from '../components/common/Breadcrumbs.js';
import {
    TrustScore,
    TrustSignalsBar,
    CoachVideoPlayer,
    CoachStatsBanner,
    CredentialsList,
    ReviewCard,
    GuaranteeBadge,
} from '../coachProfile.js';

const React = window.React;
const { useState, useEffect, useCallback, memo } = React;
const html = htm.bind(React.createElement);

/**
 * Discovery Call Modal Component - Simple booking for discovery calls
 */
const DiscoveryCallModal = ({ coach, onClose }) => {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        message: '',
        timePreference: 'flexible'
    });
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    const handleBackdropClick = (e) => {
        if (e.target.classList.contains('discovery-modal-overlay')) {
            onClose();
        }
    };

    const timePreferenceOptions = [
        { value: 'flexible', label: 'Flexible - Any time works' },
        { value: 'weekday_morning', label: 'Weekday Morning (9am-12pm)' },
        { value: 'weekday_afternoon', label: 'Weekday Afternoon (12pm-5pm)' },
        { value: 'weekday_evening', label: 'Weekday Evening (5pm-8pm)' },
        { value: 'weekend_morning', label: 'Weekend Morning (9am-12pm)' },
        { value: 'weekend_afternoon', label: 'Weekend Afternoon (12pm-5pm)' }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            setError('Please enter your name');
            return;
        }
        if (!formData.phone.trim()) {
            setError('Please enter your phone number');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const response = await fetch('/api/discovery-requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    coach_id: coach.id,
                    client_name: formData.name.trim(),
                    client_phone: formData.phone.trim(),
                    client_email: formData.email.trim() || null,
                    client_message: formData.message.trim() || null,
                    time_preference: formData.timePreference
                })
            });

            const result = await response.json();

            if (result.success) {
                setSuccess(true);
            } else {
                setError(result.error?.message || 'Failed to submit request. Please try again.');
            }
        } catch (err) {
            console.error('Discovery call request error:', err);
            setError('Network error. Please check your connection and try again.');
        }

        setSubmitting(false);
    };

    if (success) {
        return html`
            <div class="discovery-modal-overlay" onClick=${handleBackdropClick}>
                <div class="discovery-modal-container">
                    <div class="discovery-modal-header">
                        <h3>Request Sent!</h3>
                        <button class="discovery-modal-close" onClick=${onClose}>✕</button>
                    </div>
                    <div class="discovery-modal-content success-content">
                        <div class="success-icon">✓</div>
                        <h4>Thank you for your interest!</h4>
                        <p>Your discovery call request has been sent to <strong>${coach.full_name || coach.display_name}</strong>.</p>
                        <p>They will contact you soon at the phone number you provided.</p>
                        <button class="btn-primary" onClick=${onClose}>Close</button>
                    </div>
                </div>
            </div>
        `;
    }

    return html`
        <div class="discovery-modal-overlay" onClick=${handleBackdropClick}>
            <div class="discovery-modal-container">
                <div class="discovery-modal-header">
                    <h3>Book a Free Discovery Call</h3>
                    <button class="discovery-modal-close" onClick=${onClose}>✕</button>
                </div>
                <div class="discovery-modal-content">
                    <p class="discovery-intro">
                        Get to know <strong>${coach.full_name || coach.display_name}</strong> with a free discovery call.
                        Share your contact info and preferred time, and they'll reach out to schedule.
                    </p>

                    ${error && html`<div class="discovery-error">${error}</div>`}

                    <form onSubmit=${handleSubmit}>
                        <div class="form-group">
                            <label>Your Name *</label>
                            <input
                                type="text"
                                placeholder="Enter your full name"
                                value=${formData.name}
                                onChange=${(e) => setFormData({...formData, name: e.target.value})}
                                required
                            />
                        </div>

                        <div class="form-group">
                            <label>Phone Number *</label>
                            <input
                                type="tel"
                                placeholder="Your phone number"
                                value=${formData.phone}
                                onChange=${(e) => setFormData({...formData, phone: e.target.value})}
                                required
                            />
                        </div>

                        <div class="form-group">
                            <label>Email (optional)</label>
                            <input
                                type="email"
                                placeholder="Your email address"
                                value=${formData.email}
                                onChange=${(e) => setFormData({...formData, email: e.target.value})}
                            />
                        </div>

                        <div class="form-group">
                            <label>Preferred Time</label>
                            <select
                                value=${formData.timePreference}
                                onChange=${(e) => setFormData({...formData, timePreference: e.target.value})}
                            >
                                ${timePreferenceOptions.map(opt => html`
                                    <option key=${opt.value} value=${opt.value}>${opt.label}</option>
                                `)}
                            </select>
                        </div>

                        <div class="form-group">
                            <label>Message (optional)</label>
                            <textarea
                                placeholder="Tell ${coach.full_name || 'the coach'} a bit about what you're looking for..."
                                rows="3"
                                value=${formData.message}
                                onChange=${(e) => setFormData({...formData, message: e.target.value})}
                            ></textarea>
                        </div>

                        <div class="discovery-form-actions">
                            <button type="button" class="btn-cancel" onClick=${onClose}>Cancel</button>
                            <button type="submit" class="btn-primary" disabled=${submitting}>
                                ${submitting ? 'Sending...' : 'Request Discovery Call'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
};

/**
 * Helper to detect if a string is a UUID
 */
const isUUID = (str) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
};

/**
 * Main Coach Profile Page Component
 * Renders a full page for a coach profile with SEO optimizations
 * Supports both UUID and slug-based lookups for SEO-friendly URLs
 */
function CoachProfilePageComponent({ coachIdOrSlug, coachId, session }) {
    // Support both old coachId prop and new coachIdOrSlug prop
    const identifier = coachIdOrSlug || coachId;

    const [coach, setCoach] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [articles, setArticles] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [credentials, setCredentials] = useState([]);
    const [showBooking, setShowBooking] = useState(false);
    const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState(null);

    // Load coach data
    useEffect(() => {
        if (identifier) {
            loadCoach();
        }
    }, [identifier]);

    // Set SEO metadata when coach loads
    useEffect(() => {
        if (coach) {
            setSEOData();

            // Update URL to use slug if we came in via UUID
            if (coach.slug && isUUID(identifier) && window.history.replaceState) {
                const newUrl = `/coach/${coach.slug}`;
                window.history.replaceState(null, '', newUrl);
            }
        }
        return () => cleanupSEO();
    }, [coach]);

    const loadCoach = async () => {
        setLoading(true);
        setError(null);
        try {
            if (window.supabaseClient) {
                let data, fetchError;

                // Try to load by UUID first if it looks like a UUID, otherwise by slug
                if (isUUID(identifier)) {
                    const result = await window.supabaseClient
                        .from('cs_coaches')
                        .select('*')
                        .eq('id', identifier)
                        .single();
                    data = result.data;
                    fetchError = result.error;
                } else {
                    // Load by slug
                    const result = await window.supabaseClient
                        .from('cs_coaches')
                        .select('*')
                        .eq('slug', identifier)
                        .single();
                    data = result.data;
                    fetchError = result.error;
                }

                if (fetchError) throw fetchError;
                if (!data) throw new Error('Coach not found');

                setCoach(data);

                // Load related data in parallel
                await Promise.all([
                    loadArticles(data.id),
                    loadReviews(data.id),
                    loadCredentials(data.id),
                ]);
            }
        } catch (err) {
            console.error('Failed to load coach:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadArticles = async (id) => {
        try {
            const { data } = await window.supabaseClient
                .from('cs_articles')
                .select('*')
                .eq('coach_id', id)
                .eq('status', 'published')
                .order('created_at', { ascending: false })
                .limit(10);
            setArticles(data || []);
        } catch (err) {
            console.error('Failed to load articles:', err);
        }
    };

    const loadReviews = async (id) => {
        try {
            const { data } = await window.supabaseClient
                .from('cs_reviews')
                .select('*')
                .eq('coach_id', id)
                .eq('status', 'approved')
                .order('created_at', { ascending: false })
                .limit(10);
            setReviews(data || []);
        } catch (err) {
            console.error('Failed to load reviews:', err);
        }
    };

    const loadCredentials = async (id) => {
        try {
            const { data } = await window.supabaseClient
                .from('cs_credentials')
                .select('*')
                .eq('coach_id', id)
                .order('is_verified', { ascending: false });
            setCredentials(data || []);
        } catch (err) {
            console.error('Failed to load credentials:', err);
        }
    };

    const setSEOData = () => {
        const baseUrl = 'https://coachsearching.com';
        const coachUrl = `${baseUrl}/#coach/${coach.id}`;
        const specialtiesList = (coach.specialties || []).slice(0, 3).join(', ');

        // Build SEO description
        const description = truncateForMeta(
            coach.bio ||
            `${coach.full_name} is a professional ${coach.title || 'coach'} specializing in ${specialtiesList || 'personal development'}. Book a session and start your transformation today.`
        );

        // Set page meta tags
        setPageMeta({
            title: `${coach.full_name} - ${coach.title || 'Professional Coach'}`,
            description,
            url: coachUrl,
            image: coach.avatar_url || `${baseUrl}/og-image.jpg`,
            type: 'profile',
        });

        // Set structured data
        setStructuredData('coach-person-schema', generateCoachSchema({
            ...coach,
            rating: coach.rating_average,
            reviews_count: coach.rating_count,
        }));

        setStructuredData('coach-service-schema', generateServiceSchema({
            ...coach,
            reviews: reviews.map(r => ({
                rating: r.rating,
                content: r.comment,
                author_name: r.client_name,
                created_at: r.created_at,
            })),
        }));

        // Add local business schema for in-person coaches
        const localBusiness = generateLocalBusinessSchema(coach);
        if (localBusiness) {
            setStructuredData('coach-local-schema', localBusiness);
        }

        // Breadcrumb schema
        const breadcrumbItems = [
            { name: 'Home', url: baseUrl },
            { name: 'Coaches', url: `${baseUrl}/#coaches` },
        ];
        if (coach.specialties?.[0]) {
            breadcrumbItems.push({
                name: coach.specialties[0],
                url: `${baseUrl}/#coaching/${coach.specialties[0].toLowerCase().replace(/\s+/g, '-')}`,
            });
        }
        breadcrumbItems.push({ name: coach.full_name, url: coachUrl });
        setStructuredData('coach-breadcrumb-schema', generateBreadcrumbSchema(breadcrumbItems));
    };

    const cleanupSEO = () => {
        removeStructuredData('coach-person-schema');
        removeStructuredData('coach-service-schema');
        removeStructuredData('coach-local-schema');
        removeStructuredData('coach-breadcrumb-schema');
    };

    const handleBookClick = useCallback(() => {
        if (!session) {
            alert(t('auth.loginRequired') || 'Please sign in to book a session');
            window.location.hash = '#login';
            return;
        }
        setShowBooking(true);
    }, [session]);

    const formatPrice = (price) => {
        return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR',
        }).format(price || 0);
    };

    // Loading state
    if (loading) {
        return html`
            <div class="coach-profile-page">
                <div class="container">
                    <div class="loading-skeleton">
                        <div class="skeleton skeleton-hero"></div>
                        <div class="skeleton skeleton-text"></div>
                        <div class="skeleton skeleton-text short"></div>
                    </div>
                </div>
            </div>
        `;
    }

    // Error state
    if (error || !coach) {
        return html`
            <div class="coach-profile-page">
                <div class="container">
                    <div class="error-state">
                        <div class="error-icon">😔</div>
                        <h2>${t('coach.notFound') || 'Coach Not Found'}</h2>
                        <p>${error || t('coach.notFoundDesc') || 'The coach profile you are looking for does not exist or has been removed.'}</p>
                        <a href="#coaches" class="btn-primary">${t('coach.browseAll') || 'Browse All Coaches'}</a>
                    </div>
                </div>
            </div>
        `;
    }

    const rating = coach.rating_average || coach.rating || 0;
    const reviewsCount = coach.rating_count || 0;
    const location = coach.location || 'Remote';
    const languages = coach.languages || [];
    const specialties = coach.specialties || [];
    const sessionFormats = coach.session_formats || ['online'];

    return html`
        <div class="coach-profile-page">
            <!-- Breadcrumbs -->
            <div class="breadcrumb-container">
                <div class="container">
                    <${CoachBreadcrumbs} coach=${coach} specialty=${specialties[0]} />
                </div>
            </div>

            <!-- Hero Section -->
            <section class="coach-hero-section">
                <div class="container">
                    <div class="coach-hero-grid">
                        <!-- Video/Image Column -->
                        <div class="coach-media-column">
                            ${coach.video_intro_url ? html`
                                <${CoachVideoPlayer}
                                    videoUrl=${coach.video_intro_url}
                                    thumbnailUrl=${coach.video_thumbnail_url}
                                    coachName=${coach.full_name}
                                />
                            ` : html`
                                <div class="coach-hero-image">
                                    <img
                                        src=${coach.avatar_url || 'https://via.placeholder.com/400'}
                                        alt=${coach.full_name}
                                        loading="eager"
                                    />
                                </div>
                            `}
                        </div>

                        <!-- Info Column -->
                        <div class="coach-info-column">
                            <div class="coach-header-content">
                                ${coach.video_intro_url ? html`
                                    <img
                                        src=${coach.avatar_url || 'https://via.placeholder.com/80'}
                                        alt=${coach.full_name}
                                        class="coach-mini-avatar"
                                        loading="eager"
                                    />
                                ` : null}
                                <div>
                                    <h1 class="coach-name" itemprop="name">${coach.full_name}</h1>
                                    <p class="coach-title" itemprop="jobTitle">${coach.title}</p>
                                </div>
                                ${coach.trust_score ? html`
                                    <${TrustScore} score=${coach.trust_score} size="medium" />
                                ` : null}
                            </div>

                            <div class="coach-meta-row">
                                <span class="coach-meta-item">
                                    <span class="meta-icon">📍</span>
                                    <span itemprop="address">${location}</span>
                                </span>
                                ${languages.length > 0 && html`
                                    <span class="coach-meta-item">
                                        <span class="meta-icon">💬</span>
                                        <span>${languages.slice(0, 3).join(', ')}</span>
                                    </span>
                                `}
                                ${coach.years_experience > 0 && html`
                                    <span class="coach-meta-item">
                                        <span class="meta-icon">🏆</span>
                                        <span>${coach.years_experience}+ ${t('coach.yearsExperience') || 'years'}</span>
                                    </span>
                                `}
                            </div>

                            <${TrustSignalsBar} coach=${coach} />

                            <${CoachStatsBanner} coach=${coach} />

                            <!-- Pricing & CTA -->
                            <div class="coach-cta-section">
                                <div class="price-display">
                                    <span class="price-label">${t('coach.startingFrom') || 'Starting from'}</span>
                                    <span class="price-value" itemprop="priceRange">${formatPrice(coach.hourly_rate)}</span>
                                    <span class="price-unit">/${t('coach.perSession') || 'session'}</span>
                                </div>
                                <button class="btn-discovery-prominent" onClick=${() => setShowDiscoveryModal(true)}>
                                    📞 ${t('coach.bookDiscoveryCall') || 'Book Free Discovery Call'}
                                </button>
                                <button class="btn-book-prominent" onClick=${handleBookClick}>
                                    ${t('coach.bookSession') || 'Book a Session'}
                                </button>
                                <button class="btn-contact-coach" onClick=${() => window.navigateTo(`/contact/${coach.id}`)}>
                                    ${t('coach.sendMessage') || 'Send Message'}
                                </button>
                            </div>

                            <!-- Guarantees -->
                            <div class="guarantees-row">
                                <${GuaranteeBadge} type="satisfaction" />
                                <${GuaranteeBadge} type="secure" />
                                ${coach.is_verified && html`<${GuaranteeBadge} type="verified" />`}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Main Content -->
            <section class="coach-content-section">
                <div class="container">
                    <div class="coach-content-grid">
                        <!-- Main Column -->
                        <div class="coach-main-column">
                            <!-- About -->
                            <article class="coach-section">
                                <h2 class="section-title">${t('coach.about') || 'About'} ${coach.full_name.split(' ')[0]}</h2>
                                <div class="coach-bio" itemprop="description">
                                    ${(coach.bio || '').split('\n').map((para, i) =>
                                        para.trim() ? html`<p key=${i}>${para}</p>` : null
                                    )}
                                </div>
                            </article>

                            <!-- Specialties -->
                            ${specialties.length > 0 && html`
                                <article class="coach-section">
                                    <h2 class="section-title">${t('coach.specialties') || 'Specialties'}</h2>
                                    <div class="specialties-grid">
                                        ${specialties.map((spec, i) => html`
                                            <a
                                                key=${i}
                                                href="#coaching/${spec.toLowerCase().replace(/\s+/g, '-')}"
                                                class="specialty-card"
                                            >
                                                ${spec}
                                            </a>
                                        `)}
                                    </div>
                                </article>
                            `}

                            <!-- Session Formats -->
                            <article class="coach-section">
                                <h2 class="section-title">${t('coach.sessionFormats') || 'Session Formats'}</h2>
                                <div class="session-formats-grid">
                                    ${sessionFormats.includes('online') && html`
                                        <div class="format-card">
                                            <span class="format-icon">💻</span>
                                            <span class="format-name">${t('coach.online') || 'Online'}</span>
                                            <span class="format-desc">${t('coach.onlineDesc') || 'Video call sessions'}</span>
                                        </div>
                                    `}
                                    ${sessionFormats.includes('in-person') && html`
                                        <div class="format-card">
                                            <span class="format-icon">🏢</span>
                                            <span class="format-name">${t('coach.inPerson') || 'In-Person'}</span>
                                            <span class="format-desc">${location}</span>
                                        </div>
                                    `}
                                    ${sessionFormats.includes('phone') && html`
                                        <div class="format-card">
                                            <span class="format-icon">📞</span>
                                            <span class="format-name">${t('coach.phone') || 'Phone'}</span>
                                            <span class="format-desc">${t('coach.phoneDesc') || 'Voice call sessions'}</span>
                                        </div>
                                    `}
                                </div>
                            </article>

                            <!-- Credentials -->
                            ${credentials.length > 0 && html`
                                <article class="coach-section">
                                    <h2 class="section-title">${t('coach.credentials') || 'Credentials & Certifications'}</h2>
                                    <${CredentialsList} credentials=${credentials} />
                                </article>
                            `}

                            <!-- Articles -->
                            ${articles.length > 0 && html`
                                <article class="coach-section coach-articles-section" id="articles">
                                    <h2 class="section-title">
                                        ${t('coach.articles') || 'Articles & Insights'}
                                        <span class="articles-count">(${articles.length})</span>
                                    </h2>
                                    <div class="articles-grid">
                                        ${articles.map(article => html`
                                            <article
                                                key=${article.id}
                                                class="article-card"
                                                onClick=${() => setSelectedArticle(article)}
                                                itemscope
                                                itemtype="https://schema.org/Article"
                                            >
                                                ${article.featured_image && html`
                                                    <div class="article-image">
                                                        <img
                                                            src=${article.featured_image}
                                                            alt=${article.title}
                                                            loading="lazy"
                                                            itemprop="image"
                                                        />
                                                    </div>
                                                `}
                                                <div class="article-content">
                                                    <h3 class="article-title" itemprop="headline">${article.title}</h3>
                                                    <p class="article-excerpt" itemprop="description">
                                                        ${article.excerpt || (article.content_html
                                                            ? article.content_html.replace(/<[^>]*>/g, '').substring(0, 150) + '...'
                                                            : '')}
                                                    </p>
                                                    <div class="article-meta">
                                                        <time datetime=${article.created_at} itemprop="datePublished">
                                                            ${new Date(article.created_at).toLocaleDateString()}
                                                        </time>
                                                        ${article.view_count > 0 && html`
                                                            <span>👁️ ${article.view_count} views</span>
                                                        `}
                                                    </div>
                                                </div>
                                            </article>
                                        `)}
                                    </div>
                                </article>
                            `}

                            <!-- Reviews -->
                            ${reviews.length > 0 && html`
                                <article class="coach-section coach-reviews-section" id="reviews">
                                    <h2 class="section-title">
                                        ${t('coach.reviews') || 'Client Reviews'}
                                        <span class="reviews-summary">
                                            ⭐ ${rating.toFixed(1)} (${reviewsCount} ${t('coach.reviews') || 'reviews'})
                                        </span>
                                    </h2>
                                    <div class="reviews-list">
                                        ${reviews.map(review => html`
                                            <${ReviewCard} key=${review.id} review=${review} />
                                        `)}
                                    </div>
                                    ${reviews.length < reviewsCount && html`
                                        <button class="btn-load-more">
                                            ${t('coach.loadMoreReviews') || 'Load More Reviews'}
                                        </button>
                                    `}
                                </article>
                            `}
                        </div>

                        <!-- Sidebar -->
                        <aside class="coach-sidebar">
                            <!-- Booking Widget -->
                            <div class="sidebar-widget booking-widget">
                                <h3>${t('coach.bookNow') || 'Book Now'}</h3>
                                <div class="widget-price">
                                    <span class="price-main">${formatPrice(coach.hourly_rate)}</span>
                                    <span class="price-per">/${t('coach.hour') || 'hour'}</span>
                                </div>
                                ${rating > 0 && html`
                                    <div class="widget-rating">
                                        <span class="stars">${'★'.repeat(Math.round(rating))}${'☆'.repeat(5 - Math.round(rating))}</span>
                                        <span class="rating-text">${rating.toFixed(1)} (${reviewsCount})</span>
                                    </div>
                                `}
                                <button class="btn-discovery-widget" onClick=${() => setShowDiscoveryModal(true)}>
                                    📞 Book Free Discovery Call
                                </button>
                                <button class="btn-book-widget" onClick=${handleBookClick}>
                                    ${t('coach.selectTime') || 'Select Date & Time'}
                                </button>
                                <p class="booking-note">
                                    ${t('coach.freeDiscoveryAvailable') || 'Free discovery call available!'}
                                </p>
                            </div>

                            <!-- Languages -->
                            ${languages.length > 0 && html`
                                <div class="sidebar-widget">
                                    <h3>${t('coach.languages') || 'Languages'}</h3>
                                    <div class="languages-list">
                                        ${languages.map((lang, i) => html`
                                            <span key=${i} class="language-badge">${lang}</span>
                                        `)}
                                    </div>
                                </div>
                            `}

                            <!-- Quick Stats -->
                            <div class="sidebar-widget">
                                <h3>${t('coach.quickStats') || 'Quick Stats'}</h3>
                                <ul class="quick-stats-list">
                                    ${coach.total_sessions > 0 && html`
                                        <li>
                                            <span class="stat-icon">📅</span>
                                            <span>${coach.total_sessions}+ ${t('coach.sessionsCompleted') || 'sessions'}</span>
                                        </li>
                                    `}
                                    ${coach.years_experience > 0 && html`
                                        <li>
                                            <span class="stat-icon">🏆</span>
                                            <span>${coach.years_experience}+ ${t('coach.yearsExperience') || 'years experience'}</span>
                                        </li>
                                    `}
                                    ${coach.response_time_hours && html`
                                        <li>
                                            <span class="stat-icon">⚡</span>
                                            <span>${t('coach.respondsIn') || 'Responds in'} ${coach.response_time_hours}h</span>
                                        </li>
                                    `}
                                    <li>
                                        <span class="stat-icon">📍</span>
                                        <span>${location}</span>
                                    </li>
                                </ul>
                            </div>

                            <!-- Share Widget -->
                            <div class="sidebar-widget share-widget">
                                <h3>${t('coach.share') || 'Share Profile'}</h3>
                                <div class="share-buttons">
                                    <button
                                        class="share-btn share-linkedin"
                                        onClick=${() => window.open(`https://linkedin.com/shareArticle?url=${encodeURIComponent(window.location.href)}`, '_blank')}
                                        aria-label="Share on LinkedIn"
                                    >
                                        in
                                    </button>
                                    <button
                                        class="share-btn share-twitter"
                                        onClick=${() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(`Check out ${coach.full_name} on CoachSearching!`)}`, '_blank')}
                                        aria-label="Share on Twitter"
                                    >
                                        𝕏
                                    </button>
                                    <button
                                        class="share-btn share-copy"
                                        onClick=${() => {
                                            navigator.clipboard.writeText(window.location.href);
                                            alert(t('coach.linkCopied') || 'Link copied!');
                                        }}
                                        aria-label="Copy link"
                                    >
                                        🔗
                                    </button>
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </section>

            <!-- Similar Coaches Section -->
            <section class="similar-coaches-section">
                <div class="container">
                    <h2 class="section-title">${t('coach.similarCoaches') || 'Similar Coaches You Might Like'}</h2>
                    <div class="similar-coaches-placeholder">
                        <p>${t('coach.loadingSimilar') || 'Loading similar coaches...'}</p>
                    </div>
                </div>
            </section>

            <!-- Discovery Call Modal -->
            ${showDiscoveryModal && html`
                <${DiscoveryCallModal} coach=${coach} onClose=${() => setShowDiscoveryModal(false)} />
            `}

            <!-- Article Modal -->
            ${selectedArticle && html`
                <div class="article-modal-overlay" onClick=${() => setSelectedArticle(null)}>
                    <div class="article-modal" onClick=${(e) => e.stopPropagation()}>
                        <button class="modal-close" onClick=${() => setSelectedArticle(null)}>×</button>
                        <article class="article-full" itemscope itemtype="https://schema.org/Article">
                            <header class="article-header">
                                <h1 itemprop="headline">${selectedArticle.title}</h1>
                                <div class="article-author">
                                    <img src=${coach.avatar_url} alt=${coach.full_name} />
                                    <div>
                                        <span itemprop="author">${coach.full_name}</span>
                                        <time datetime=${selectedArticle.created_at} itemprop="datePublished">
                                            ${new Date(selectedArticle.created_at).toLocaleDateString()}
                                        </time>
                                    </div>
                                </div>
                            </header>
                            <div
                                class="article-body"
                                itemprop="articleBody"
                                dangerouslySetInnerHTML=${{ __html: selectedArticle.content_html || '' }}
                            />
                        </article>
                    </div>
                </div>
            `}
        </div>
    `;
}

export const CoachProfilePage = memo(CoachProfilePageComponent);
export default CoachProfilePage;
