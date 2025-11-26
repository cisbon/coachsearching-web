// js/coachProfileModal.js - Full Coach Profile Modal Component
import htm from './vendor/htm.js';
import { t } from './i18n.js';
import {
    TrustScore,
    TrustSignalsBar,
    CoachVideoPlayer,
    CredentialsList,
    ReviewCard,
    PricingCard
} from './coachProfile.js';

const React = window.React;
const { useState, useEffect, useCallback, useMemo } = React;
const html = htm.bind(React.createElement);

// =============================================
// COACH PROFILE MODAL
// =============================================

export const CoachProfileModal = ({ coach, onClose, onBook, formatPrice, session }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [credentials, setCredentials] = useState([]);
    const [services, setServices] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    // Load additional profile data
    useEffect(() => {
        const loadProfileData = async () => {
            if (!coach?.id || !window.supabaseClient) {
                setLoading(false);
                return;
            }

            try {
                const supabase = window.supabaseClient;

                // Load credentials, services, and reviews in parallel
                const [credentialsRes, servicesRes, reviewsRes] = await Promise.all([
                    supabase
                        .from('cs_coach_credentials')
                        .select('*')
                        .eq('coach_id', coach.id)
                        .order('is_verified', { ascending: false }),
                    supabase
                        .from('cs_coach_services')
                        .select('*')
                        .eq('coach_id', coach.id)
                        .eq('is_active', true)
                        .order('sort_order'),
                    supabase
                        .from('cs_reviews')
                        .select('*, cs_clients(full_name, avatar_url)')
                        .eq('coach_id', coach.id)
                        .order('created_at', { ascending: false })
                        .limit(10)
                ]);

                if (credentialsRes.data) setCredentials(credentialsRes.data);
                if (servicesRes.data) setServices(servicesRes.data);
                if (reviewsRes.data) {
                    // Map client data to review
                    const reviewsWithClient = reviewsRes.data.map(r => ({
                        ...r,
                        client_name: r.cs_clients?.full_name || 'Anonymous',
                        client_avatar: r.cs_clients?.avatar_url
                    }));
                    setReviews(reviewsWithClient);
                }
            } catch (error) {
                console.error('Error loading profile data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadProfileData();
    }, [coach?.id]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    const rating = coach.rating_average || coach.rating || 0;
    const reviewsCount = coach.rating_count || coach.reviews_count || 0;
    const location = coach.location || coach.city || 'Remote';
    const languages = coach.languages || [];
    const specialties = coach.specialties || [];
    const trustScore = coach.trust_score || 0;
    const isVerified = coach.is_verified;
    const yearsExp = coach.years_experience || 0;
    const totalSessions = coach.total_sessions || 0;

    const tabs = [
        { id: 'overview', label: t('profile.overview') || 'Overview' },
        { id: 'credentials', label: t('profile.credentials') || 'Credentials', count: credentials.length },
        { id: 'services', label: t('profile.services') || 'Services', count: services.length },
        { id: 'reviews', label: t('profile.reviews') || 'Reviews', count: reviewsCount }
    ];

    const renderStars = (rating) => {
        return Array(5).fill(0).map((_, i) => {
            const filled = i < Math.floor(rating);
            const half = !filled && i < rating;
            return html`
                <span class="star ${filled ? 'filled' : ''} ${half ? 'half' : ''}" key=${i}>★</span>
            `;
        });
    };

    return html`
        <div class="profile-modal-overlay" onClick=${onClose}>
            <div class="profile-modal" onClick=${(e) => e.stopPropagation()}>
                <button class="modal-close" onClick=${onClose}>×</button>

                <div class="profile-modal-content">
                    <!-- Header Section -->
                    <div class="profile-header">
                        <div class="profile-header-bg"></div>
                        <div class="profile-header-content">
                            <div class="profile-video-section">
                                <${CoachVideoPlayer}
                                    videoUrl=${coach.video_intro_url}
                                    thumbnailUrl=${coach.video_thumbnail_url}
                                    coachName=${coach.full_name}
                                />
                            </div>

                            <div class="profile-info-section">
                                <div class="profile-avatar-row">
                                    <div class="profile-avatar-container">
                                        <img
                                            src=${coach.avatar_url || 'https://via.placeholder.com/120'}
                                            alt=${coach.full_name}
                                            class="profile-avatar"
                                        />
                                        ${isVerified && html`
                                            <div class="profile-verified-badge">✓</div>
                                        `}
                                    </div>
                                    <${TrustScore} score=${trustScore} size="large" />
                                </div>

                                <h1 class="profile-name">${coach.full_name}</h1>
                                <p class="profile-title">${coach.title}</p>

                                <div class="profile-meta">
                                    <span class="meta-item">📍 ${location}</span>
                                    ${languages.length > 0 && html`
                                        <span class="meta-item">💬 ${languages.join(', ')}</span>
                                    `}
                                    ${yearsExp > 0 && html`
                                        <span class="meta-item">📅 ${yearsExp}+ ${t('coach.yearsExp') || 'years experience'}</span>
                                    `}
                                    ${totalSessions > 0 && html`
                                        <span class="meta-item">✅ ${totalSessions} ${t('coach.sessionsCompleted') || 'sessions'}</span>
                                    `}
                                </div>

                                ${rating > 0 && html`
                                    <div class="profile-rating">
                                        <div class="rating-stars">${renderStars(rating)}</div>
                                        <span class="rating-value">${rating.toFixed(1)}</span>
                                        <span class="rating-count">(${reviewsCount} ${t('coach.reviews') || 'reviews'})</span>
                                    </div>
                                `}

                                <${TrustSignalsBar} coach=${{
                                    ...coach,
                                    verified_credentials_count: credentials.filter(c => c.is_verified).length
                                }} />
                            </div>
                        </div>
                    </div>

                    <!-- Navigation Tabs -->
                    <div class="profile-tabs">
                        ${tabs.map(tab => html`
                            <button
                                key=${tab.id}
                                class="profile-tab ${activeTab === tab.id ? 'active' : ''}"
                                onClick=${() => setActiveTab(tab.id)}
                            >
                                ${tab.label}
                                ${tab.count > 0 && html`<span class="tab-count">${tab.count}</span>`}
                            </button>
                        `)}
                    </div>

                    <!-- Tab Content -->
                    <div class="profile-tab-content">
                        ${loading && html`
                            <div class="profile-loading">
                                <div class="spinner"></div>
                                <span>${t('common.loading') || 'Loading...'}</span>
                            </div>
                        `}

                        ${!loading && activeTab === 'overview' && html`
                            <div class="tab-overview">
                                <section class="profile-section">
                                    <h3>${t('profile.about') || 'About'}</h3>
                                    <div class="profile-bio">${coach.bio || t('profile.noBio') || 'No bio provided yet.'}</div>
                                </section>

                                ${specialties.length > 0 && html`
                                    <section class="profile-section">
                                        <h3>${t('profile.specialties') || 'Specialties'}</h3>
                                        <div class="specialties-list">
                                            ${specialties.map(spec => html`
                                                <span class="specialty-tag" key=${spec}>${spec}</span>
                                            `)}
                                        </div>
                                    </section>
                                `}

                                ${coach.session_types?.length > 0 && html`
                                    <section class="profile-section">
                                        <h3>${t('profile.sessionTypes') || 'Session Types'}</h3>
                                        <div class="session-types-list">
                                            ${coach.session_types.map(type => html`
                                                <div class="session-type-item" key=${type}>
                                                    <span class="type-icon">${type === 'online' ? '💻' : '🏢'}</span>
                                                    <span class="type-label">${type === 'online' ? (t('session.online') || 'Online') : (t('session.onsite') || 'On-site')}</span>
                                                </div>
                                            `)}
                                        </div>
                                    </section>
                                `}

                                ${(coach.website_url || coach.linkedin_url) && html`
                                    <section class="profile-section">
                                        <h3>${t('profile.links') || 'Links'}</h3>
                                        <div class="profile-links">
                                            ${coach.website_url && html`
                                                <a href=${coach.website_url} target="_blank" rel="noopener noreferrer" class="profile-link">
                                                    🌐 ${t('profile.website') || 'Website'}
                                                </a>
                                            `}
                                            ${coach.linkedin_url && html`
                                                <a href=${coach.linkedin_url} target="_blank" rel="noopener noreferrer" class="profile-link">
                                                    💼 LinkedIn
                                                </a>
                                            `}
                                        </div>
                                    </section>
                                `}

                                <!-- Quick booking CTA -->
                                <div class="quick-book-cta">
                                    <div class="cta-price">
                                        <span class="price-from">${t('coach.from') || 'From'}</span>
                                        <span class="price-value">${formatPrice ? formatPrice(coach.hourly_rate) : '€' + coach.hourly_rate}</span>
                                        <span class="price-per">/${t('coach.session') || 'session'}</span>
                                    </div>
                                    <button class="btn-book-now" onClick=${() => onBook && onBook(coach)}>
                                        ${t('coach.bookSession') || 'Book a Session'}
                                    </button>
                                </div>
                            </div>
                        `}

                        ${!loading && activeTab === 'credentials' && html`
                            <div class="tab-credentials">
                                ${credentials.length === 0 ? html`
                                    <div class="empty-state">
                                        <span class="empty-icon">🎓</span>
                                        <p>${t('credentials.none') || 'No credentials added yet.'}</p>
                                    </div>
                                ` : html`
                                    <${CredentialsList} credentials=${credentials} />
                                `}
                            </div>
                        `}

                        ${!loading && activeTab === 'services' && html`
                            <div class="tab-services">
                                ${services.length === 0 ? html`
                                    <div class="empty-state">
                                        <span class="empty-icon">📦</span>
                                        <p>${t('services.none') || 'No services available.'}</p>
                                        <p class="empty-hint">${t('services.contactCoach') || 'Contact the coach directly for pricing.'}</p>
                                    </div>
                                ` : html`
                                    <div class="services-grid">
                                        ${services.map(service => html`
                                            <${PricingCard}
                                                key=${service.id}
                                                service=${service}
                                                onBook=${(s) => onBook && onBook(coach, s)}
                                                formatPrice=${formatPrice}
                                            />
                                        `)}
                                    </div>
                                `}
                            </div>
                        `}

                        ${!loading && activeTab === 'reviews' && html`
                            <div class="tab-reviews">
                                ${reviews.length === 0 ? html`
                                    <div class="empty-state">
                                        <span class="empty-icon">⭐</span>
                                        <p>${t('reviews.none') || 'No reviews yet.'}</p>
                                        <p class="empty-hint">${t('reviews.beFirst') || 'Be the first to leave a review!'}</p>
                                    </div>
                                ` : html`
                                    <div class="reviews-summary">
                                        <div class="reviews-score">
                                            <span class="score-value">${rating.toFixed(1)}</span>
                                            <div class="score-stars">${renderStars(rating)}</div>
                                            <span class="score-count">${reviewsCount} ${t('coach.reviews') || 'reviews'}</span>
                                        </div>
                                    </div>
                                    <div class="reviews-list">
                                        ${reviews.map(review => html`
                                            <${ReviewCard} key=${review.id} review=${review} />
                                        `)}
                                    </div>
                                `}
                            </div>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `;
};

// =============================================
// EXPORT
// =============================================

export default CoachProfileModal;
