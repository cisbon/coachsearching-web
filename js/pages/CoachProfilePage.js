/**
 * Coach Profile Page - LinkedIn-Style Layout
 * @fileoverview SEO-optimized coach profile page with two-column LinkedIn-style layout
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
import { formatPrice } from '../utils/formatting.js';
import { LanguageFlags } from '../components/coach/LanguageFlags.js';
import { TrustBadges } from '../components/coach/TrustBadges.js';
import { VideoPopup } from '../components/coach/VideoPopup.js';
import { DiscoveryCallModal } from '../components/coach/DiscoveryCallModal.js';
import { useCities, useLookupOptions } from '../context/AppContext.js';

const React = window.React;
const { useState, useEffect, useCallback, memo, useMemo } = React;
const html = htm.bind(React.createElement);

// Language to Country Code Mapping (for flag images)
const LANGUAGE_TO_COUNTRY = {
    'English': 'gb', 'German': 'de', 'Spanish': 'es', 'French': 'fr',
    'Italian': 'it', 'Dutch': 'nl', 'Portuguese': 'pt', 'Russian': 'ru',
    'Chinese': 'cn', 'Japanese': 'jp', 'Korean': 'kr', 'Arabic': 'sa',
    'Hindi': 'in', 'Polish': 'pl', 'Swedish': 'se', 'Norwegian': 'no',
    'Danish': 'dk', 'Finnish': 'fi', 'Greek': 'gr', 'Turkish': 'tr',
    'Czech': 'cz', 'Romanian': 'ro', 'Hungarian': 'hu', 'Ukrainian': 'ua',
    'en': 'gb', 'de': 'de', 'es': 'es', 'fr': 'fr', 'it': 'it',
    'nl': 'nl', 'pt': 'pt', 'ru': 'ru', 'zh': 'cn', 'ja': 'jp',
    'ko': 'kr', 'ar': 'sa', 'hi': 'in', 'pl': 'pl', 'sv': 'se',
    'no': 'no', 'da': 'dk', 'fi': 'fi', 'el': 'gr', 'tr': 'tr',
    'cs': 'cz', 'ro': 'ro', 'hu': 'hu', 'uk': 'ua'
};

const LANGUAGE_NAMES = {
    'en': 'English', 'de': 'German', 'es': 'Spanish', 'fr': 'French',
    'it': 'Italian', 'nl': 'Dutch', 'pt': 'Portuguese', 'ru': 'Russian',
    'zh': 'Chinese', 'ja': 'Japanese', 'ko': 'Korean', 'ar': 'Arabic',
    'hi': 'Hindi', 'pl': 'Polish', 'sv': 'Swedish', 'no': 'Norwegian',
    'da': 'Danish', 'fi': 'Finnish', 'el': 'Greek', 'tr': 'Turkish',
    'cs': 'Czech', 'ro': 'Romanian', 'hu': 'Hungarian', 'uk': 'Ukrainian',
    'English': 'English', 'German': 'German', 'Spanish': 'Spanish', 'French': 'French',
    'Italian': 'Italian', 'Dutch': 'Dutch', 'Portuguese': 'Portuguese', 'Russian': 'Russian'
};

/**
 * Helper to detect if a string is a UUID
 */
const isUUID = (str) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
};

/**
 * Write Review Modal Component
 */
const WriteReviewModal = ({ coach, onClose, onSubmit }) => {
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [content, setContent] = useState('');
    const [name, setName] = useState('');
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
        if (e.target.classList.contains('review-modal-overlay')) {
            onClose();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (rating < 1 || rating > 5) {
            setError(t('review.errorRating') || 'Please select a rating');
            return;
        }
        if (!content.trim() || content.trim().length < 10) {
            setError(t('review.errorContent') || 'Please write at least 10 characters');
            return;
        }

        setSubmitting(true);
        setError('');

        const result = await onSubmit({ rating, content: content.trim(), name: name.trim() });

        if (result.success) {
            setSuccess(true);
        } else {
            setError(result.error || t('review.errorGeneric') || 'Failed to submit review');
        }

        setSubmitting(false);
    };

    if (success) {
        return html`
            <div class="review-modal-overlay" onClick=${handleBackdropClick}>
                <div class="review-modal-container">
                    <div class="review-modal-header">
                        <h3>${t('review.successTitle') || 'Review Submitted!'}</h3>
                        <button class="review-modal-close" onClick=${onClose}>✕</button>
                    </div>
                    <div class="review-modal-content success-content">
                        <div class="success-icon">✓</div>
                        <p>${t('review.successMessage') || 'Thank you for your review!'}</p>
                        <p>${t('review.successPending') || 'Your review will be visible after moderation.'}</p>
                        <button class="btn-primary" onClick=${onClose}>${t('review.close') || 'Close'}</button>
                    </div>
                </div>
            </div>
        `;
    }

    return html`
        <div class="review-modal-overlay" onClick=${handleBackdropClick}>
            <div class="review-modal-container">
                <div class="review-modal-header">
                    <h3>${t('review.writeReview') || 'Write a Review'}</h3>
                    <button class="review-modal-close" onClick=${onClose}>✕</button>
                </div>
                <div class="review-modal-content">
                    <p class="review-intro">
                        ${t('review.shareExperience') || 'Share your experience with'} <strong>${coach.full_name}</strong>
                    </p>

                    ${error && html`<div class="review-error">${error}</div>`}

                    <form onSubmit=${handleSubmit}>
                        <div class="form-group">
                            <label>${t('review.yourRating') || 'Your Rating'} *</label>
                            <div class="star-rating-input">
                                ${[1, 2, 3, 4, 5].map(star => html`
                                    <button
                                        key=${star}
                                        type="button"
                                        class="star-btn ${star <= (hoverRating || rating) ? 'filled' : ''}"
                                        onClick=${() => setRating(star)}
                                        onMouseEnter=${() => setHoverRating(star)}
                                        onMouseLeave=${() => setHoverRating(0)}
                                    >
                                        ★
                                    </button>
                                `)}
                                <span class="rating-label">
                                    ${rating === 5 ? (t('review.excellent') || 'Excellent') :
                                      rating === 4 ? (t('review.veryGood') || 'Very Good') :
                                      rating === 3 ? (t('review.good') || 'Good') :
                                      rating === 2 ? (t('review.fair') || 'Fair') :
                                      (t('review.poor') || 'Poor')}
                                </span>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>${t('review.displayName') || 'Display Name'} (${t('review.optional') || 'optional'})</label>
                            <input
                                type="text"
                                placeholder=${t('review.namePlaceholder') || 'How should we display your name?'}
                                value=${name}
                                onChange=${(e) => setName(e.target.value)}
                                maxlength="50"
                            />
                        </div>

                        <div class="form-group">
                            <label>${t('review.yourReview') || 'Your Review'} *</label>
                            <textarea
                                placeholder=${t('review.contentPlaceholder') || 'Tell others about your experience...'}
                                rows="5"
                                value=${content}
                                onChange=${(e) => setContent(e.target.value)}
                                required
                                minlength="10"
                                maxlength="2000"
                            ></textarea>
                            <div class="char-count">${content.length}/2000</div>
                        </div>

                        <div class="review-form-actions">
                            <button type="button" class="btn-cancel" onClick=${onClose}>
                                ${t('review.cancel') || 'Cancel'}
                            </button>
                            <button type="submit" class="btn-primary" disabled=${submitting}>
                                ${submitting ? (t('review.submitting') || 'Submitting...') : (t('review.submit') || 'Submit Review')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
};

/**
 * Reviews Popup Component
 */
const ReviewsPopup = ({ coach, reviews, rating, reviewsCount, session, userHasReviewed, isOwnProfile, onClose, onWriteReview, getReviewBreakdown }) => {
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
        if (e.target.classList.contains('reviews-popup-overlay')) {
            onClose();
        }
    };

    return html`
        <div class="reviews-popup-overlay" onClick=${handleBackdropClick}>
            <div class="reviews-popup-container">
                <div class="reviews-popup-header">
                    <h3>${t('coach.reviews') || 'Client Reviews'}</h3>
                    <button class="reviews-popup-close" onClick=${onClose}>✕</button>
                </div>
                <div class="reviews-popup-content">
                    <div class="reviews-popup-overview">
                        <div class="popup-rating-big">
                            <span class="big-score">${rating.toFixed(1)}</span>
                            <div class="big-stars">
                                ${[1,2,3,4,5].map(star => html`
                                    <span key=${star} class="star ${star <= Math.round(rating) ? 'filled' : ''}">★</span>
                                `)}
                            </div>
                            <span class="review-count">${reviewsCount} ${reviewsCount === 1 ? 'review' : 'reviews'}</span>
                        </div>

                        ${reviews.length >= 3 && html`
                            <div class="popup-breakdown">
                                ${[5,4,3,2,1].map(stars => {
                                    const breakdown = getReviewBreakdown();
                                    const count = breakdown[stars];
                                    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                                    return html`
                                        <div key=${stars} class="breakdown-row">
                                            <span class="bar-label">${stars}★</span>
                                            <div class="bar-track">
                                                <div class="bar-fill" style=${{ width: `${percentage}%` }}></div>
                                            </div>
                                            <span class="bar-count">${count}</span>
                                        </div>
                                    `;
                                })}
                            </div>
                        `}
                    </div>

                    <div class="popup-write-review">
                        ${session?.user ? (
                            isOwnProfile ? null : (
                                userHasReviewed ? html`
                                    <div class="already-reviewed">
                                        <span class="check-icon">✓</span>
                                        ${t('review.alreadyReviewedShort') || 'You reviewed this coach'}
                                    </div>
                                ` : html`
                                    <button class="btn-write-review-popup" onClick=${onWriteReview}>
                                        ✏️ ${t('review.writeReview') || 'Write a Review'}
                                    </button>
                                `
                            )
                        ) : html`
                            <button class="btn-write-review-popup btn-login" onClick=${() => { onClose(); window.navigateTo('/login'); }}>
                                ${t('review.loginToReview') || 'Log in to write a review'}
                            </button>
                        `}
                    </div>

                    ${reviews.length > 0 ? html`
                        <div class="popup-reviews-list">
                            ${reviews.map(review => html`
                                <div key=${review.id} class="popup-review-item">
                                    <div class="review-header">
                                        <div class="reviewer-info">
                                            <span class="reviewer-name">${review.reviewer_name || 'Anonymous'}</span>
                                            <span class="review-date">${new Date(review.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div class="review-rating">
                                            ${[1,2,3,4,5].map(star => html`
                                                <span key=${star} class="star-small ${star <= review.rating ? 'filled' : ''}">★</span>
                                            `)}
                                        </div>
                                    </div>
                                    <p class="review-content">${review.content}</p>
                                </div>
                            `)}
                        </div>
                    ` : html`
                        <div class="popup-no-reviews">
                            <p>${t('review.beFirstToReview') || 'Be the first to share your experience!'}</p>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
};

/**
 * Mini Coach Card Component for Sidebar
 * Shows similar coaches with name, certification badge, title, and chemistry call button
 */
const MiniCoachCard = memo(function MiniCoachCard({ coach, onDiscoveryCall }) {
    const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);

    const handleDiscoveryClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowDiscoveryModal(true);
    };

    const handleCardClick = () => {
        window.navigateTo(`/coach/${coach.slug || coach.id}`);
    };

    return html`
        <div class="mini-coach-card" onClick=${handleCardClick}>
            <div class="mini-coach-header">
                <img
                    src=${coach.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(coach.full_name)}
                    alt=${coach.full_name}
                    class="mini-coach-avatar"
                    loading="lazy"
                />
                <div class="mini-coach-info">
                    <h4 class="mini-coach-name">
                        ${coach.full_name}
                        ${coach.cs_coach_certifications?.length > 0 && html`
                            <span class="certification-badges-inline">
                                ${coach.cs_coach_certifications
                                    .filter(cert => cert.cs_certifications?.badge_url)
                                    .slice(0, 2)
                                    .map(cert => html`
                                        <img
                                            key=${cert.id}
                                            src=${cert.cs_certifications?.badge_url}
                                            alt=${cert.cs_certifications?.short_name || 'Cert'}
                                            title=${cert.cs_certifications?.name || 'Certification'}
                                            class="certification-badge-inline-mini"
                                        />
                                    `)
                                }
                            </span>
                        `}
                    </h4>
                    <p class="mini-coach-title">${coach.title}</p>
                </div>
            </div>
            <button
                class="btn-mini-discovery"
                onClick=${handleDiscoveryClick}
            >
                <svg class="calendar-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                ${t('discovery.freeCall') || 'Free Chemistry Call'}
            </button>
        </div>

        ${showDiscoveryModal && html`
            <${DiscoveryCallModal}
                coach=${coach}
                onClose=${() => setShowDiscoveryModal(false)}
            />
        `}
    `;
});

/**
 * Profile Coach Card Component
 * Embedded coach card for the profile page with overlapping profile image and banner
 */
const ProfileCoachCard = memo(function ProfileCoachCard({ coach, onDiscoveryCall, onVideoClick, session, isOwnProfile, onEditSection }) {
    const [liveReviewsData, setLiveReviewsData] = useState({ rating: 0, count: 0, loaded: false });
    const { cities, getLocalizedCityName } = useCities();
    const { lookupOptions, getLocalizedName } = useLookupOptions();

    // Fetch live reviews data
    useEffect(() => {
        const fetchReviewsData = async () => {
            const isValidUUID = typeof coach.id === 'string' &&
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(coach.id);

            if (window.supabaseClient && isValidUUID) {
                try {
                    const { data, error } = await window.supabaseClient
                        .from('cs_reviews')
                        .select('rating')
                        .eq('coach_id', coach.id);

                    if (!error && data) {
                        const count = data.length;
                        const avgRating = count > 0
                            ? data.reduce((sum, r) => sum + (r.rating || 0), 0) / count
                            : 0;
                        setLiveReviewsData({ rating: avgRating, count, loaded: true });
                    } else {
                        setLiveReviewsData({ rating: 0, count: 0, loaded: true });
                    }
                } catch {
                    setLiveReviewsData({ rating: 0, count: 0, loaded: true });
                }
            } else {
                setLiveReviewsData({ rating: 0, count: 0, loaded: true });
            }
        };
        fetchReviewsData();
    }, [coach.id]);

    const rating = liveReviewsData.loaded
        ? liveReviewsData.rating
        : (coach.rating_average || coach.rating || 0);
    const reviewsCount = liveReviewsData.loaded
        ? liveReviewsData.count
        : (coach.rating_count || coach.reviews_count || 0);

    const location = useMemo(() => {
        if (coach.city_id && cities.list?.length > 0) {
            const city = cities.list.find(c => c.id === coach.city_id);
            if (city) {
                return getLocalizedCityName(city);
            }
        }
        return coach.location_city || coach.location || '';
    }, [coach.city_id, coach.location_city, coach.location, cities.list, getLocalizedCityName]);

    const languages = coach.languages || [];
    const specialtyCodes = coach.specialties || [];

    const localizedSpecialties = useMemo(() => {
        if (!specialtyCodes.length || !lookupOptions.specialties?.length) {
            return specialtyCodes.map(code => ({ code, name: code }));
        }
        return specialtyCodes.map(code => {
            const specialtyOption = lookupOptions.specialties.find(s => s.code === code);
            if (specialtyOption) {
                return { code, name: getLocalizedName(specialtyOption) };
            }
            return { code, name: code };
        });
    }, [specialtyCodes, lookupOptions.specialties, getLocalizedName]);

    const bio = coach.bio || '';
    const videoUrl = coach.intro_video_url || coach.video_url;
    const hasVideo = !!videoUrl;

    const sessionTypes = coach.session_types || [];
    const offersVideo = sessionTypes.includes('video') || coach.offers_virtual;
    const offersInPerson = sessionTypes.includes('in-person') || coach.offers_onsite;

    return html`
        <div class="profile-coach-card">
            <!-- Banner Image inside card -->
            <div class="profile-card-banner">
                <img
                    src=${coach.banner_url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=300&fit=crop'}
                    alt="Profile Banner"
                    class="card-banner-image"
                />
                ${isOwnProfile && html`
                    <button class="btn-edit-banner" onClick=${() => onEditSection('banner')} title="Edit banner">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                `}
            </div>

            <!-- Profile Image with Trust Badges -->
            <div class="profile-card-image-section">
                <div class="profile-image-wrapper-card ${hasVideo ? 'has-video' : ''}" onClick=${hasVideo ? onVideoClick : null}>
                    <img
                        src=${coach.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(coach.full_name) + '&size=200'}
                        alt=${coach.full_name}
                        class="profile-image-card"
                    />
                    ${hasVideo && html`
                        <div class="video-play-overlay-card">
                            <div class="play-icon">▶</div>
                        </div>
                    `}
                    <!-- Trust Badge on image -->
                    ${hasVideo && html`
                        <span class="trust-badge badge-video badge-on-image" title="Has Video">🎬</span>
                    `}
                </div>
                ${isOwnProfile && html`
                    <button class="btn-edit-photo" onClick=${() => onEditSection('photo')} title="Edit photo">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                            <circle cx="12" cy="13" r="4"></circle>
                        </svg>
                    </button>
                `}
            </div>

            <!-- Main Card Content -->
            <div class="profile-card-content">
                <div class="profile-card-main">
                    <!-- Name and Title -->
                    <h1 class="profile-coach-name">
                        ${coach.full_name}
                        ${(coach.is_verified || coach.verified) && html`<span class="verified-check" title="Verified Coach">✓</span>`}
                        ${coach.cs_coach_certifications?.length > 0 && html`
                            <span class="certification-badges-inline">
                                ${coach.cs_coach_certifications
                                    .filter(cert => cert.cs_certifications?.badge_url)
                                    .sort((a, b) => (b.cs_certifications?.sort_order || 0) - (a.cs_certifications?.sort_order || 0))
                                    .map(cert => html`
                                        <img
                                            key=${cert.id}
                                            src=${cert.cs_certifications?.badge_url}
                                            alt=${cert.cs_certifications?.short_name || cert.cs_certifications?.name || 'Certification'}
                                            title=${cert.cs_certifications?.name || 'Certification'}
                                            class="certification-badge-inline"
                                        />
                                    `)
                                }
                            </span>
                        `}
                        ${isOwnProfile && html`
                            <button class="btn-edit-inline" onClick=${() => onEditSection('name')} title="Edit name">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                        `}
                    </h1>
                    <div class="profile-coach-title">${coach.title}</div>

                    <!-- Location and Languages Row -->
                    <div class="profile-meta-row">
                        ${location && html`<span class="meta-location">📍 ${location}</span>`}
                        <${LanguageFlags} languages=${languages} />
                        ${coach.years_experience > 0 && html`
                            <span class="meta-experience">🏆 ${coach.years_experience}+ ${t('coach.yearsExperience') || 'years'}</span>
                        `}
                    </div>

                    <!-- Session Formats Row -->
                    ${(offersVideo || offersInPerson) && html`
                        <div class="profile-session-formats">
                            ${offersVideo && html`<span class="format-tag">💻 Video Call</span>`}
                            ${offersInPerson && html`<span class="format-tag">🤝 In-Person</span>`}
                        </div>
                    `}

                    <!-- Rating Section -->
                    <div class="profile-rating-section">
                        ${reviewsCount > 0 ? html`
                            <div class="rating-display">
                                <div class="rating-stars">
                                    ${[1,2,3,4,5].map(star => html`
                                        <span key=${star} class="star ${star <= Math.round(rating) ? 'filled' : ''}">★</span>
                                    `)}
                                </div>
                                <span class="rating-value">${rating.toFixed(1)}</span>
                                <span class="rating-count">(${reviewsCount} ${reviewsCount === 1 ? 'review' : 'reviews'})</span>
                            </div>
                        ` : html`
                            <div class="new-coach-badge">
                                <span>✨</span> ${t('coach.new') || 'New Coach'}
                            </div>
                        `}
                    </div>

                    <!-- Bio -->
                    ${bio && html`
                        <div class="profile-bio">
                            <p>${bio.length > 200 ? bio.substring(0, 200) + '...' : bio}</p>
                        </div>
                    `}

                    <!-- Specialties -->
                    ${localizedSpecialties.length > 0 && html`
                        <div class="profile-specialties">
                            ${localizedSpecialties.slice(0, 6).map(s => html`
                                <span key=${s.code} class="specialty-tag">${s.name}</span>
                            `)}
                            ${localizedSpecialties.length > 6 ? html`<span class="specialty-tag more">+${localizedSpecialties.length - 6}</span>` : ''}
                        </div>
                    `}
                </div>

                <!-- Price and CTA Section -->
                <div class="profile-card-actions">
                    <div class="profile-price">
                        <span class="price-label">${t('coach.hourly_rate') || 'Hourly Rate'}</span>
                        <span class="price-value">${formatPrice(coach.hourly_rate)}</span>
                    </div>

                    <!-- Primary CTA: Discovery Call - Very Prominent -->
                    <button class="btn-discovery-prominent" onClick=${onDiscoveryCall}>
                        <svg class="calendar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        <span class="btn-text">${t('discovery.bookFreeCall') || 'Book Free Chemistry Call'}</span>
                        <span class="btn-subtext">${t('discovery.freeNoObligation') || 'Free, no obligation'}</span>
                    </button>

                    <!-- Secondary Actions -->
                    <div class="profile-secondary-actions">
                        ${hasVideo && html`
                            <button class="btn-watch-video" onClick=${onVideoClick}>
                                ▶ ${t('coach.watchIntro') || 'Watch Intro'}
                            </button>
                        `}
                        <button class="btn-message" onClick=${() => window.navigateTo(`/contact/${coach.id}`)}>
                            💬 ${t('coach.sendMessage') || 'Message'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
});

/**
 * Activity Tab Component
 */
const ActivityTabs = ({ activeTab, onTabChange, articles, coach }) => {
    const tabs = [
        { id: 'posts', label: t('activity.posts') || 'Posts', count: articles.length },
        { id: 'comments', label: t('activity.comments') || 'Comments', count: 0 },
        { id: 'videos', label: t('activity.videos') || 'Videos', count: coach.intro_video_url ? 1 : 0 },
        { id: 'images', label: t('activity.images') || 'Images', count: 0 },
        { id: 'newsletters', label: t('activity.newsletters') || 'Newsletters', count: 0 },
        { id: 'documents', label: t('activity.documents') || 'Documents', count: 0 },
    ];

    return html`
        <div class="activity-tabs">
            ${tabs.map(tab => html`
                <button
                    key=${tab.id}
                    class="activity-tab ${activeTab === tab.id ? 'active' : ''}"
                    onClick=${() => onTabChange(tab.id)}
                >
                    ${tab.label}
                    ${tab.count > 0 && html`<span class="tab-count">${tab.count}</span>`}
                </button>
            `)}
        </div>
    `;
};

/**
 * Main Coach Profile Page Component - LinkedIn Style
 */
function CoachProfilePageComponent({ coachIdOrSlug, coachId, session }) {
    const identifier = coachIdOrSlug || coachId;

    const [coach, setCoach] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [articles, setArticles] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [credentials, setCredentials] = useState([]);
    const [similarCoaches, setSimilarCoaches] = useState([]);
    const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showReviewsPopup, setShowReviewsPopup] = useState(false);
    const [showVideoPopup, setShowVideoPopup] = useState(false);
    const [userHasReviewed, setUserHasReviewed] = useState(false);
    const [userExistingReview, setUserExistingReview] = useState(null);
    const [activeActivityTab, setActiveActivityTab] = useState('posts');

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

                if (isUUID(identifier)) {
                    const result = await window.supabaseClient
                        .from('cs_coaches')
                        .select('*, cs_coach_certifications(*, cs_certifications(*))')
                        .eq('id', identifier)
                        .single();
                    data = result.data;
                    fetchError = result.error;
                } else {
                    const result = await window.supabaseClient
                        .from('cs_coaches')
                        .select('*, cs_coach_certifications(*, cs_certifications(*))')
                        .eq('slug', identifier)
                        .single();
                    data = result.data;
                    fetchError = result.error;
                }

                if (fetchError) throw fetchError;
                if (!data) throw new Error('Coach not found');

                setCoach(data);

                await Promise.all([
                    loadArticles(data.id),
                    loadReviews(data.id),
                    loadCredentials(data.id),
                    loadSimilarCoaches(data),
                    checkUserHasReviewed(data.id),
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
                .from('v_coach_certifications')
                .select('*')
                .eq('coach_id', id)
                .order('is_verified', { ascending: false });
            setCredentials(data || []);
        } catch (err) {
            console.error('Failed to load credentials:', err);
        }
    };

    const loadSimilarCoaches = async (coachData) => {
        try {
            const specialties = coachData.specialties || [];
            let query = window.supabaseClient
                .from('cs_coaches')
                .select('id, full_name, title, avatar_url, hourly_rate, rating_average, rating_count, specialties, slug, location, cs_coach_certifications(*, cs_certifications(*))')
                .neq('id', coachData.id)
                .eq('is_active', true)
                .limit(5);

            if (specialties.length > 0) {
                query = query.overlaps('specialties', specialties);
            }

            const { data, error } = await query.order('rating_average', { ascending: false });

            if (error) {
                const fallback = await window.supabaseClient
                    .from('cs_coaches')
                    .select('id, full_name, title, avatar_url, hourly_rate, rating_average, rating_count, specialties, slug, location, cs_coach_certifications(*, cs_certifications(*))')
                    .neq('id', coachData.id)
                    .eq('is_active', true)
                    .order('rating_average', { ascending: false })
                    .limit(5);
                setSimilarCoaches(fallback.data || []);
            } else {
                setSimilarCoaches(data || []);
            }
        } catch (err) {
            console.error('Failed to load similar coaches:', err);
        }
    };

    const getReviewBreakdown = () => {
        const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach(review => {
            const r = Math.round(review.rating || 0);
            if (r >= 1 && r <= 5) {
                breakdown[r]++;
            }
        });
        return breakdown;
    };

    const checkUserHasReviewed = async (coachId) => {
        if (!session?.user?.id) {
            setUserHasReviewed(false);
            setUserExistingReview(null);
            return;
        }
        try {
            const { data, error } = await window.supabaseClient
                .from('cs_reviews')
                .select('*')
                .eq('coach_id', coachId)
                .eq('client_id', session.user.id)
                .maybeSingle();

            if (error) {
                console.error('Error checking user review:', error);
                return;
            }

            setUserHasReviewed(!!data);
            setUserExistingReview(data);
        } catch (err) {
            console.error('Failed to check user review:', err);
        }
    };

    const handleSubmitReview = async (reviewData) => {
        if (!session?.user?.id || !coach?.id) {
            return { success: false, error: 'Not authenticated' };
        }

        if (session.user.id === coach.user_id) {
            return { success: false, error: t('review.cannotReviewSelf') || 'You cannot review yourself' };
        }

        try {
            const { data, error } = await window.supabaseClient
                .from('cs_reviews')
                .insert({
                    coach_id: coach.id,
                    client_id: session.user.id,
                    rating: reviewData.rating,
                    content: reviewData.content,
                    reviewer_name: reviewData.name || session.user.email?.split('@')[0] || 'Anonymous',
                    status: 'pending'
                })
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    return { success: false, error: t('review.alreadyReviewed') || 'You have already reviewed this coach' };
                }
                throw error;
            }

            setUserHasReviewed(true);
            setUserExistingReview(data);
            await loadReviews(coach.id);

            return { success: true, data };
        } catch (err) {
            console.error('Failed to submit review:', err);
            return { success: false, error: err.message || 'Failed to submit review' };
        }
    };

    const setSEOData = () => {
        const baseUrl = 'https://coachsearching.com';
        const coachUrl = `${baseUrl}/#coach/${coach.id}`;
        const specialtiesList = (coach.specialties || []).slice(0, 3).join(', ');

        const description = truncateForMeta(
            coach.bio ||
            `${coach.full_name} is a professional ${coach.title || 'coach'} specializing in ${specialtiesList || 'personal development'}. Book a session and start your transformation today.`
        );

        setPageMeta({
            title: `${coach.full_name} - ${coach.title || 'Professional Coach'}`,
            description,
            url: coachUrl,
            image: coach.avatar_url || `${baseUrl}/og-image.jpg`,
            type: 'profile',
        });

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

        const localBusiness = generateLocalBusinessSchema(coach);
        if (localBusiness) {
            setStructuredData('coach-local-schema', localBusiness);
        }

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

    // Loading state
    if (loading) {
        return html`
            <div class="coach-profile-page linkedin-style">
                <div class="profile-loading">
                    <div class="skeleton banner-skeleton"></div>
                    <div class="skeleton card-skeleton"></div>
                    <div class="profile-columns">
                        <div class="skeleton content-skeleton"></div>
                        <div class="skeleton sidebar-skeleton"></div>
                    </div>
                </div>
            </div>
        `;
    }

    // Error state
    if (error || !coach) {
        return html`
            <div class="coach-profile-page linkedin-style">
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
    const videoUrl = coach.intro_video_url || coach.video_url;
    const hasVideo = !!videoUrl;

    // Check if this is the user's own profile
    const isOwnProfile = session?.user?.id && coach.user_id && session.user.id === coach.user_id;

    // Handle edit section clicks
    const handleEditSection = (sectionName) => {
        // Navigate to profile edit page with section parameter
        window.navigateTo(`/profile/edit?section=${sectionName}`);
    };

    return html`
        <div class="coach-profile-page linkedin-style">
            <!-- Main Two-Column Layout -->
            <div class="profile-container">
                <div class="profile-columns">
                    <!-- Main Content Column (70%) -->
                    <main class="profile-main-column">
                        <!-- Coach Card Section (now includes banner) -->
                        <section class="profile-section coach-card-section">
                            <${ProfileCoachCard}
                                coach=${coach}
                                onDiscoveryCall=${() => setShowDiscoveryModal(true)}
                                onVideoClick=${() => setShowVideoPopup(true)}
                                session=${session}
                                isOwnProfile=${isOwnProfile}
                                onEditSection=${handleEditSection}
                            />
                        </section>

                        <!-- Certifications Section -->
                        ${(credentials.length > 0 || isOwnProfile) && html`
                            <section class="profile-section certifications-section">
                                <div class="section-header-editable">
                                    <h2 class="section-title">
                                        <span class="section-icon">🏅</span>
                                        ${t('coach.certifications') || 'Certifications & Credentials'}
                                    </h2>
                                    ${isOwnProfile && html`
                                        <button class="btn-edit-section" onClick=${() => handleEditSection('certifications')} title="Edit certifications">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                            </svg>
                                        </button>
                                    `}
                                </div>
                                ${credentials.length > 0 ? html`
                                    <div class="certifications-list">
                                        ${credentials.map(cred => html`
                                            <div key=${cred.id} class="certification-item">
                                                ${cred.badge_url && html`
                                                    <img src=${cred.badge_url} alt=${cred.name} class="cert-badge" />
                                                `}
                                                <div class="cert-info">
                                                    <h4 class="cert-name">${cred.name}</h4>
                                                    ${cred.issuing_org && html`<p class="cert-org">${cred.issuing_org}</p>`}
                                                    ${cred.is_verified && html`<span class="cert-verified">✓ Verified</span>`}
                                                </div>
                                            </div>
                                        `)}
                                    </div>
                                ` : html`
                                    <div class="empty-section-prompt" onClick=${() => handleEditSection('certifications')}>
                                        <span class="empty-icon">+</span>
                                        <p>${t('coach.addCertifications') || 'Add your certifications and credentials'}</p>
                                    </div>
                                `}
                            </section>
                        `}

                        <!-- Featured Section -->
                        ${(articles.length > 0 || isOwnProfile) && html`
                            <section class="profile-section featured-section">
                                <div class="section-header-editable">
                                    <h2 class="section-title">
                                        <span class="section-icon">⭐</span>
                                        ${t('coach.featured') || 'Featured'}
                                    </h2>
                                    ${isOwnProfile && html`
                                        <button class="btn-edit-section" onClick=${() => handleEditSection('featured')} title="Edit featured">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                            </svg>
                                        </button>
                                    `}
                                </div>
                                ${articles.length > 0 ? html`
                                    <div class="featured-grid">
                                        ${articles.slice(0, 3).map(article => html`
                                            <article
                                                key=${article.id}
                                                class="featured-card"
                                                onClick=${() => setSelectedArticle(article)}
                                            >
                                                ${article.featured_image && html`
                                                    <div class="featured-image">
                                                        <img src=${article.featured_image} alt=${article.title} loading="lazy" />
                                                    </div>
                                                `}
                                                <div class="featured-content">
                                                    <h3 class="featured-title">${article.title}</h3>
                                                    <p class="featured-excerpt">
                                                        ${article.excerpt || (article.content_html
                                                            ? article.content_html.replace(/<[^>]*>/g, '').substring(0, 80) + '...'
                                                            : '')}
                                                    </p>
                                                </div>
                                            </article>
                                        `)}
                                    </div>
                                ` : html`
                                    <div class="empty-section-prompt" onClick=${() => handleEditSection('featured')}>
                                        <span class="empty-icon">+</span>
                                        <p>${t('coach.addFeatured') || 'Add featured content to highlight your work'}</p>
                                    </div>
                                `}
                            </section>
                        `}

                        <!-- Activity Section -->
                        <section class="profile-section activity-section">
                            <div class="section-header-editable">
                                <h2 class="section-title">
                                    <span class="section-icon">📊</span>
                                    ${t('coach.activity') || 'Activity'}
                                </h2>
                                ${isOwnProfile && html`
                                    <button class="btn-edit-section" onClick=${() => handleEditSection('activity')} title="Add content">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                    </button>
                                `}
                            </div>

                            <${ActivityTabs}
                                activeTab=${activeActivityTab}
                                onTabChange=${setActiveActivityTab}
                                articles=${articles}
                                coach=${coach}
                            />

                            <div class="activity-content">
                                ${activeActivityTab === 'posts' && html`
                                    ${articles.length > 0 ? html`
                                        <div class="activity-posts">
                                            ${articles.slice(0, 3).map(article => html`
                                                <article key=${article.id} class="activity-post" onClick=${() => setSelectedArticle(article)}>
                                                    <div class="post-author">
                                                        <img src=${coach.avatar_url} alt=${coach.full_name} class="author-avatar" />
                                                        <div class="author-info">
                                                            <span class="author-name">${coach.full_name}</span>
                                                            <span class="post-date">${new Date(article.created_at).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                    <h3 class="post-title">${article.title}</h3>
                                                    <p class="post-excerpt">
                                                        ${article.excerpt || (article.content_html
                                                            ? article.content_html.replace(/<[^>]*>/g, '').substring(0, 150) + '...'
                                                            : '')}
                                                    </p>
                                                    ${article.featured_image && html`
                                                        <img src=${article.featured_image} alt=${article.title} class="post-image" loading="lazy" />
                                                    `}
                                                </article>
                                            `)}
                                            ${articles.length > 3 && html`
                                                <button class="btn-show-all">
                                                    ${t('coach.showAllPosts') || 'Show all posts'} →
                                                </button>
                                            `}
                                        </div>
                                    ` : html`
                                        <div class="activity-empty">
                                            <p>${t('coach.noPosts') || 'No posts yet'}</p>
                                        </div>
                                    `}
                                `}

                                ${activeActivityTab === 'videos' && html`
                                    ${hasVideo ? html`
                                        <div class="activity-videos">
                                            <div class="video-card" onClick=${() => setShowVideoPopup(true)}>
                                                <div class="video-thumbnail">
                                                    <img src=${coach.video_thumbnail_url || coach.avatar_url} alt="Intro Video" />
                                                    <div class="video-play-btn">▶</div>
                                                </div>
                                                <div class="video-info">
                                                    <h4>${t('coach.introVideo') || 'Introduction Video'}</h4>
                                                    <p>${t('coach.meetCoach') || 'Get to know'} ${coach.full_name.split(' ')[0]}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ` : html`
                                        <div class="activity-empty">
                                            <p>${t('coach.noVideos') || 'No videos yet'}</p>
                                        </div>
                                    `}
                                `}

                                ${(activeActivityTab === 'comments' || activeActivityTab === 'images' ||
                                   activeActivityTab === 'newsletters' || activeActivityTab === 'documents') && html`
                                    <div class="activity-empty">
                                        <p>${t('coach.noContent') || 'No content available'}</p>
                                    </div>
                                `}
                            </div>
                        </section>

                        <!-- Experience Section -->
                        ${(coach.experience || isOwnProfile) && html`
                            <section class="profile-section experience-section">
                                <div class="section-header-editable">
                                    <h2 class="section-title">
                                        <span class="section-icon">💼</span>
                                        ${t('coach.experience') || 'Experience'}
                                    </h2>
                                    ${isOwnProfile && html`
                                        <button class="btn-edit-section" onClick=${() => handleEditSection('experience')} title="Edit experience">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                            </svg>
                                        </button>
                                    `}
                                </div>
                                ${coach.experience ? html`
                                    <div class="experience-content">
                                        ${(Array.isArray(coach.experience) ? coach.experience : [coach.experience]).map((exp, i) => html`
                                            <div key=${i} class="experience-item">
                                                ${typeof exp === 'object' ? html`
                                                    <div class="exp-header">
                                                        <h4 class="exp-title">${exp.title || exp.role}</h4>
                                                        ${exp.company && html`<p class="exp-company">${exp.company}</p>`}
                                                        ${exp.duration && html`<span class="exp-duration">${exp.duration}</span>`}
                                                    </div>
                                                    ${exp.description && html`<p class="exp-description">${exp.description}</p>`}
                                                ` : html`<p>${exp}</p>`}
                                            </div>
                                        `)}
                                    </div>
                                ` : html`
                                    <div class="empty-section-prompt" onClick=${() => handleEditSection('experience')}>
                                        <span class="empty-icon">+</span>
                                        <p>${t('coach.addExperience') || 'Add your professional experience'}</p>
                                    </div>
                                `}
                            </section>
                        `}

                        <!-- Education Section -->
                        ${(coach.education || isOwnProfile) && html`
                            <section class="profile-section education-section">
                                <div class="section-header-editable">
                                    <h2 class="section-title">
                                        <span class="section-icon">🎓</span>
                                        ${t('coach.education') || 'Education'}
                                    </h2>
                                    ${isOwnProfile && html`
                                        <button class="btn-edit-section" onClick=${() => handleEditSection('education')} title="Edit education">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                            </svg>
                                        </button>
                                    `}
                                </div>
                                ${coach.education ? html`
                                    <div class="education-content">
                                        ${(Array.isArray(coach.education) ? coach.education : [coach.education]).map((edu, i) => html`
                                            <div key=${i} class="education-item">
                                                ${typeof edu === 'object' ? html`
                                                    <h4 class="edu-degree">${edu.degree || edu.title}</h4>
                                                    ${edu.institution && html`<p class="edu-institution">${edu.institution}</p>`}
                                                    ${edu.year && html`<span class="edu-year">${edu.year}</span>`}
                                                ` : html`<p>${edu}</p>`}
                                            </div>
                                        `)}
                                    </div>
                                ` : html`
                                    <div class="empty-section-prompt" onClick=${() => handleEditSection('education')}>
                                        <span class="empty-icon">+</span>
                                        <p>${t('coach.addEducation') || 'Add your education and training'}</p>
                                    </div>
                                `}
                            </section>
                        `}

                        <!-- Skills Section -->
                        ${((coach.skills && coach.skills.length > 0) || isOwnProfile) && html`
                            <section class="profile-section skills-section">
                                <div class="section-header-editable">
                                    <h2 class="section-title">
                                        <span class="section-icon">🛠️</span>
                                        ${t('coach.skills') || 'Skills'}
                                    </h2>
                                    ${isOwnProfile && html`
                                        <button class="btn-edit-section" onClick=${() => handleEditSection('skills')} title="Edit skills">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                            </svg>
                                        </button>
                                    `}
                                </div>
                                ${coach.skills && coach.skills.length > 0 ? html`
                                    <div class="skills-list">
                                        ${(Array.isArray(coach.skills) ? coach.skills : [coach.skills]).map((skill, i) => html`
                                            <span key=${i} class="skill-tag">${skill}</span>
                                        `)}
                                    </div>
                                ` : html`
                                    <div class="empty-section-prompt" onClick=${() => handleEditSection('skills')}>
                                        <span class="empty-icon">+</span>
                                        <p>${t('coach.addSkills') || 'Add your coaching skills'}</p>
                                    </div>
                                `}
                            </section>
                        `}

                        <!-- Interests Section -->
                        ${((coach.interests && coach.interests.length > 0) || isOwnProfile) && html`
                            <section class="profile-section interests-section">
                                <div class="section-header-editable">
                                    <h2 class="section-title">
                                        <span class="section-icon">❤️</span>
                                        ${t('coach.interests') || 'Interests'}
                                    </h2>
                                    ${isOwnProfile && html`
                                        <button class="btn-edit-section" onClick=${() => handleEditSection('interests')} title="Edit interests">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                            </svg>
                                        </button>
                                    `}
                                </div>
                                ${coach.interests && coach.interests.length > 0 ? html`
                                    <div class="interests-list">
                                        ${(Array.isArray(coach.interests) ? coach.interests : [coach.interests]).map((interest, i) => html`
                                            <span key=${i} class="interest-tag">${interest}</span>
                                        `)}
                                    </div>
                                ` : html`
                                    <div class="empty-section-prompt" onClick=${() => handleEditSection('interests')}>
                                        <span class="empty-icon">+</span>
                                        <p>${t('coach.addInterests') || 'Add your interests'}</p>
                                    </div>
                                `}
                            </section>
                        `}

                        <!-- About / Coaching Approach -->
                        ${(coach.bio || coach.coaching_approach || isOwnProfile) && html`
                            <section class="profile-section about-section">
                                <div class="section-header-editable">
                                    <h2 class="section-title">
                                        <span class="section-icon">📝</span>
                                        ${t('coach.about') || 'About'}
                                    </h2>
                                    ${isOwnProfile && html`
                                        <button class="btn-edit-section" onClick=${() => handleEditSection('about')} title="Edit about">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                            </svg>
                                        </button>
                                    `}
                                </div>
                                ${(coach.bio || coach.coaching_approach) ? html`
                                    <div class="about-content">
                                        ${coach.bio && html`
                                            <div class="about-bio">
                                                ${coach.bio.split('\n').map((para, i) =>
                                                    para.trim() ? html`<p key=${i}>${para}</p>` : null
                                                )}
                                            </div>
                                        `}
                                        ${coach.coaching_approach && html`
                                            <div class="about-approach">
                                                <h3>${t('coach.myApproach') || 'My Coaching Approach'}</h3>
                                                ${coach.coaching_approach.split('\n').map((para, i) =>
                                                    para.trim() ? html`<p key=${i}>${para}</p>` : null
                                                )}
                                            </div>
                                        `}
                                    </div>
                                ` : html`
                                    <div class="empty-section-prompt" onClick=${() => handleEditSection('about')}>
                                        <span class="empty-icon">+</span>
                                        <p>${t('coach.addAbout') || 'Tell your story and describe your coaching approach'}</p>
                                    </div>
                                `}
                            </section>
                        `}
                    </main>

                    <!-- Sidebar Column (30%) -->
                    <aside class="profile-sidebar-column">
                        <!-- More Coaches For You -->
                        <section class="sidebar-section similar-coaches-sidebar">
                            <h3 class="sidebar-title">${t('coach.moreCoachesForYou') || 'More coaches for you'}</h3>
                            <div class="mini-coaches-list">
                                ${similarCoaches.map(similarCoach => html`
                                    <${MiniCoachCard}
                                        key=${similarCoach.id}
                                        coach=${similarCoach}
                                    />
                                `)}
                            </div>
                            ${similarCoaches.length >= 5 && html`
                                <a href="#coaches" class="btn-view-all-coaches">
                                    ${t('coach.viewAllCoaches') || 'View all coaches'} →
                                </a>
                            `}
                        </section>
                    </aside>
                </div>
            </div>

            <!-- Video Popup -->
            ${showVideoPopup && hasVideo && html`
                <${VideoPopup}
                    videoUrl=${videoUrl}
                    coachName=${coach.full_name}
                    onClose=${() => setShowVideoPopup(false)}
                />
            `}

            <!-- Discovery Call Modal -->
            ${showDiscoveryModal && html`
                <${DiscoveryCallModal} coach=${coach} onClose=${() => setShowDiscoveryModal(false)} />
            `}

            <!-- Write Review Modal -->
            ${showReviewModal && html`
                <${WriteReviewModal}
                    coach=${coach}
                    onClose=${() => setShowReviewModal(false)}
                    onSubmit=${handleSubmitReview}
                />
            `}

            <!-- Reviews Popup -->
            ${showReviewsPopup && html`
                <${ReviewsPopup}
                    coach=${coach}
                    reviews=${reviews}
                    rating=${rating}
                    reviewsCount=${reviewsCount}
                    session=${session}
                    userHasReviewed=${userHasReviewed}
                    isOwnProfile=${session?.user?.id === coach.user_id}
                    onClose=${() => setShowReviewsPopup(false)}
                    onWriteReview=${() => { setShowReviewsPopup(false); setShowReviewModal(true); }}
                    getReviewBreakdown=${getReviewBreakdown}
                />
            `}

            <!-- Article Modal -->
            ${selectedArticle && html`
                <div class="article-modal-overlay" onClick=${() => setSelectedArticle(null)}>
                    <div class="article-modal" onClick=${(e) => e.stopPropagation()}>
                        <button class="modal-close" onClick=${() => setSelectedArticle(null)}>×</button>
                        <article class="article-full">
                            <header class="article-header">
                                <h1>${selectedArticle.title}</h1>
                                <div class="article-author">
                                    <img src=${coach.avatar_url} alt=${coach.full_name} />
                                    <div>
                                        <span>${coach.full_name}</span>
                                        <time datetime=${selectedArticle.created_at}>
                                            ${new Date(selectedArticle.created_at).toLocaleDateString()}
                                        </time>
                                    </div>
                                </div>
                            </header>
                            <div
                                class="article-body"
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
