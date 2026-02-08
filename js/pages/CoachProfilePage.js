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
                    <div class="coach-rating-section" onClick=${() => {
                        const el = document.getElementById('recommendations-ratings-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}>
                        ${reviewsCount > 0 ? html`
                            <div class="rating-compact clickable">
                                <div class="rating-stars-compact">
                                    ${[1,2,3,4,5].map(star => html`
                                        <span key=${star} class="star-compact ${star <= Math.round(rating) ? 'filled' : ''}">★</span>
                                    `)}
                                </div>
                                <span class="rating-value">${rating.toFixed(1)}</span>
                                <span class="rating-count">(${reviewsCount})</span>
                            </div>
                        ` : html`
                            <div class="new-coach-compact clickable">
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
/**
 * Profile Language Sidebar Component
 * Shows languages the coach provides coaching in
 */
const ProfileLanguageSidebar = memo(function ProfileLanguageSidebar({ languages, primaryProfileLanguage, onEditLanguages, onEditEnglishProfile, isOwnProfile }) {
    if (!languages || languages.length === 0) {
        return html`
            <section class="sidebar-section profile-languages-sidebar">
                <h3 class="sidebar-title">${t('coach.profileLanguages') || 'Profile Languages'}</h3>
                <div class="empty-languages-prompt" onClick=${onEditLanguages}>
                    <span class="empty-icon">+</span>
                    <p>${t('coach.addLanguages') || 'Add languages you coach in'}</p>
                </div>
            </section>
        `;
    }

    // Determine primary language: use saved value, or auto-detect
    const primaryLang = primaryProfileLanguage || (languages.length === 1 ? languages[0] : (languages.find(l => l !== 'en' && l !== 'English') || languages[0]));
    const primaryCountryCode = LANGUAGE_TO_COUNTRY[primaryLang] || LANGUAGE_TO_COUNTRY[primaryLang?.toLowerCase()] || 'un';
    const primaryLangName = LANGUAGE_NAMES[primaryLang] || primaryLang;

    // Check if English is in the coach's languages (and is different from primary)
    const hasEnglish = languages.some(l => l === 'en' || l === 'English');
    const primaryIsEnglish = primaryLang === 'en' || primaryLang === 'English';

    return html`
        <section class="sidebar-section profile-languages-sidebar">
            <div class="sidebar-header-editable">
                <h3 class="sidebar-title">${t('coach.profileLanguages') || 'Profile Languages'}</h3>
                ${isOwnProfile && html`
                    <button class="btn-edit-sidebar" onClick=${onEditLanguages} title="Edit languages">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                `}
            </div>
            <div class="profile-languages-list">
                <!-- Primary Language -->
                <div class="profile-language-item primary-language-item">
                    <img
                        src=${`https://flagcdn.com/w40/${primaryCountryCode}.png`}
                        alt=${primaryLangName}
                        class="language-flag"
                        onError=${(e) => { e.target.style.display = 'none'; }}
                    />
                    <span class="language-name">${primaryLangName}</span>
                    <span class="language-badge primary-badge">${t('coach.primary') || 'Primary'}</span>
                </div>

                <!-- English Language (if coach has it and it's not the primary) -->
                ${hasEnglish && !primaryIsEnglish && html`
                    <div class="profile-language-item english-language-item">
                        <img
                            src="https://flagcdn.com/w40/gb.png"
                            alt="English"
                            class="language-flag"
                            onError=${(e) => { e.target.style.display = 'none'; }}
                        />
                        <span class="language-name">English</span>
                        ${isOwnProfile && html`
                            <button class="btn-edit-sidebar" onClick=${onEditEnglishProfile} title="Edit English profile">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                        `}
                    </div>
                `}
            </div>
        </section>
    `;
});

/**
 * Viewers Also Viewed Sidebar Component
 * Shows coaches that viewers of this profile also looked at (competition insight)
 */
const ViewersAlsoViewedSidebar = memo(function ViewersAlsoViewedSidebar({ coaches, isLoading }) {
    if (isLoading) {
        return html`
            <section class="sidebar-section viewers-also-viewed-sidebar">
                <h3 class="sidebar-title">${t('coach.viewersAlsoViewed') || 'Who your viewers also viewed'}</h3>
                <div class="mini-coaches-list">
                    ${[1, 2, 3].map(i => html`
                        <div key=${i} class="mini-coach-card skeleton-card">
                            <div class="skeleton skeleton-avatar"></div>
                            <div class="skeleton skeleton-text"></div>
                        </div>
                    `)}
                </div>
            </section>
        `;
    }

    if (!coaches || coaches.length === 0) {
        return html`
            <section class="sidebar-section viewers-also-viewed-sidebar">
                <h3 class="sidebar-title">${t('coach.viewersAlsoViewed') || 'Who your viewers also viewed'}</h3>
                <div class="empty-viewers-message">
                    <p>${t('coach.noViewerData') || 'Not enough data yet. Check back later!'}</p>
                </div>
            </section>
        `;
    }

    return html`
        <section class="sidebar-section viewers-also-viewed-sidebar">
            <h3 class="sidebar-title">${t('coach.viewersAlsoViewed') || 'Who your viewers also viewed'}</h3>
            <p class="sidebar-description">${t('coach.competitorInsight') || 'Coaches your profile visitors also checked out:'}</p>
            <div class="mini-coaches-list">
                ${coaches.map(coach => html`
                    <${MiniCoachCard}
                        key=${coach.id}
                        coach=${coach}
                    />
                `)}
            </div>
        </section>
    `;
});

/**
 * Banner Editor Modal Component
 * LinkedIn-style cover image editor with crop, zoom, and rotation controls
 */
const BannerEditorModal = memo(function BannerEditorModal({ coach, onClose, onSave, session }) {
    const [image, setImage] = useState(null);
    const [originalImage, setOriginalImage] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [hasExistingBanner, setHasExistingBanner] = useState(false);

    const fileInputRef = React.useRef(null);
    const canvasRef = React.useRef(null);
    const containerRef = React.useRef(null);

    // Banner aspect ratio (4:1 for LinkedIn-style banners)
    const ASPECT_RATIO = 4;
    const CROP_HEIGHT = 180;
    const CROP_WIDTH = CROP_HEIGHT * ASPECT_RATIO;

    useEffect(() => {
        document.body.style.overflow = 'hidden';

        // Check if coach has existing banner
        const existingBanner = coach.banner_url && !coach.banner_url.includes('unsplash.com');
        setHasExistingBanner(existingBanner);

        // If existing banner, load it for editing
        if (existingBanner) {
            loadImageFromUrl(coach.banner_url);
        } else {
            // If no banner, immediately prompt for file selection
            setTimeout(() => {
                fileInputRef.current?.click();
            }, 100);
        }

        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, []);

    const loadImageFromUrl = (url) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            setOriginalImage(img);
            setImage(img);
            // Reset transformations
            setZoom(1);
            setRotation(0);
            setPosition({ x: 0, y: 0 });
        };
        img.onerror = () => {
            setError('Failed to load existing banner image');
        };
        img.src = url + '?t=' + Date.now(); // Cache bust
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError('Image must be less than 10MB');
            return;
        }

        setError('');
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                setOriginalImage(img);
                setImage(img);
                setHasExistingBanner(true);
                // Reset transformations
                setZoom(1);
                setRotation(0);
                setPosition({ x: 0, y: 0 });
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const handleMouseDown = (e) => {
        if (!image) return;
        setIsDragging(true);
        setDragStart({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    };

    const handleMouseMove = (e) => {
        if (!isDragging || !image) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleTouchStart = (e) => {
        if (!image || e.touches.length !== 1) return;
        setIsDragging(true);
        setDragStart({
            x: e.touches[0].clientX - position.x,
            y: e.touches[0].clientY - position.y
        });
    };

    const handleTouchMove = (e) => {
        if (!isDragging || !image || e.touches.length !== 1) return;
        e.preventDefault();
        setPosition({
            x: e.touches[0].clientX - dragStart.x,
            y: e.touches[0].clientY - dragStart.y
        });
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
    };

    const getCroppedImage = () => {
        return new Promise((resolve, reject) => {
            if (!image || !canvasRef.current) {
                reject(new Error('No image to crop'));
                return;
            }

            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            // Set output dimensions (high quality)
            canvas.width = 1200;
            canvas.height = 300;

            // Clear canvas
            ctx.fillStyle = '#f3f2ef';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Calculate the crop area in image coordinates
            const containerWidth = containerRef.current?.offsetWidth || CROP_WIDTH;
            const containerHeight = CROP_HEIGHT;

            const scaleX = canvas.width / containerWidth;
            const scaleY = canvas.height / containerHeight;

            ctx.save();

            // Move to center for rotation
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.scale(zoom, zoom);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);

            // Calculate image position
            const imgWidth = image.width;
            const imgHeight = image.height;

            // Scale image to fit the crop area
            const fitScale = Math.max(
                containerWidth / imgWidth,
                containerHeight / imgHeight
            );

            const scaledWidth = imgWidth * fitScale * scaleX;
            const scaledHeight = imgHeight * fitScale * scaleY;

            const drawX = (canvas.width - scaledWidth) / 2 + position.x * scaleX;
            const drawY = (canvas.height - scaledHeight) / 2 + position.y * scaleY;

            ctx.drawImage(image, drawX, drawY, scaledWidth, scaledHeight);
            ctx.restore();

            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create image blob'));
                }
            }, 'image/jpeg', 0.9);
        });
    };

    const handleApply = async () => {
        if (!image) return;

        setSaving(true);
        setError('');

        try {
            const blob = await getCroppedImage();

            // Get the current user's ID for the folder name
            const userId = session?.user?.id;
            if (!userId) {
                throw new Error('Not authenticated - please sign in again');
            }

            const fileName = `${userId}/banner-${Date.now()}.jpg`;
            console.log('Uploading banner:', { fileName, coachId: coach.id, userId });

            // Upload to profile-banners bucket
            const { error: uploadError } = await window.supabaseClient.storage
                .from('profile-banners')
                .upload(fileName, blob, {
                    upsert: true,
                    contentType: 'image/jpeg'
                });

            if (uploadError) {
                console.error('Storage upload error:', uploadError);
                throw uploadError;
            }
            console.log('Storage upload successful');

            // Get public URL
            const { data: { publicUrl } } = window.supabaseClient.storage
                .from('profile-banners')
                .getPublicUrl(fileName);

            // Save to coach profile with cache busting
            const bannerUrl = publicUrl + '?t=' + Date.now();
            console.log('Saving banner URL to profile:', bannerUrl);

            await onSave({ banner_url: bannerUrl });
            console.log('Profile update successful');
            onClose();
        } catch (err) {
            console.error('Banner upload error:', err);
            setError(err.message || 'Failed to upload banner image');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete your banner image?')) return;

        setSaving(true);
        setError('');

        try {
            // Set banner_url to null or default
            await onSave({ banner_url: null });
            onClose();
        } catch (err) {
            console.error('Delete banner error:', err);
            setError(err.message || 'Failed to delete banner image');
        } finally {
            setSaving(false);
        }
    };

    const handleBackdropClick = (e) => {
        if (e.target.classList.contains('banner-editor-overlay')) {
            onClose();
        }
    };

    // Calculate image display styles
    const getImageStyle = () => {
        if (!image) return {};

        const containerWidth = containerRef.current?.offsetWidth || CROP_WIDTH;
        const containerHeight = CROP_HEIGHT;

        // Scale to cover the container
        const scaleToFit = Math.max(
            containerWidth / image.width,
            containerHeight / image.height
        );

        const width = image.width * scaleToFit * zoom;
        const height = image.height * scaleToFit * zoom;

        return {
            width: `${width}px`,
            height: `${height}px`,
            transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg)`,
            cursor: isDragging ? 'grabbing' : 'grab'
        };
    };

    return html`
        <div class="banner-editor-overlay" onClick=${handleBackdropClick}>
            <div class="banner-editor-container">
                <!-- Header -->
                <div class="banner-editor-header">
                    <h3>Banner image</h3>
                    <button class="banner-editor-close" onClick=${onClose}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <!-- Crop Area -->
                <div class="banner-editor-crop-area">
                    <div
                        class="banner-crop-container"
                        ref=${containerRef}
                        onMouseDown=${handleMouseDown}
                        onMouseMove=${handleMouseMove}
                        onMouseUp=${handleMouseUp}
                        onMouseLeave=${handleMouseUp}
                        onTouchStart=${handleTouchStart}
                        onTouchMove=${handleTouchMove}
                        onTouchEnd=${handleTouchEnd}
                    >
                        ${image ? html`
                            <img
                                src=${image.src}
                                alt="Banner preview"
                                class="banner-preview-image"
                                style=${getImageStyle()}
                                draggable="false"
                            />
                        ` : html`
                            <div class="banner-placeholder">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                    <polyline points="21 15 16 10 5 21"></polyline>
                                </svg>
                                <p>Select an image to upload</p>
                            </div>
                        `}
                        <!-- Crop frame overlay -->
                        <div class="banner-crop-frame"></div>
                    </div>
                </div>

                ${error && html`<div class="banner-editor-error">${error}</div>`}

                <!-- Controls -->
                ${image && html`
                    <div class="banner-editor-controls">
                        <div class="banner-control-tabs">
                            <button class="control-tab active">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                                    <line x1="3" y1="6" x2="21" y2="6"></line>
                                </svg>
                                Crop
                            </button>
                        </div>

                        <div class="banner-control-sliders">
                            <!-- Zoom -->
                            <div class="banner-slider-row">
                                <span class="slider-label">Zoom</span>
                                <div class="slider-container">
                                    <button
                                        class="slider-btn"
                                        onClick=${() => setZoom(z => Math.max(1, z - 0.1))}
                                    >−</button>
                                    <input
                                        type="range"
                                        min="1"
                                        max="3"
                                        step="0.1"
                                        value=${zoom}
                                        onChange=${(e) => setZoom(parseFloat(e.target.value))}
                                        class="banner-slider"
                                    />
                                    <button
                                        class="slider-btn"
                                        onClick=${() => setZoom(z => Math.min(3, z + 0.1))}
                                    >+</button>
                                </div>
                            </div>

                            <!-- Straighten (Rotation) -->
                            <div class="banner-slider-row">
                                <span class="slider-label">Straighten</span>
                                <div class="slider-container">
                                    <button
                                        class="slider-btn"
                                        onClick=${() => setRotation(r => Math.max(-45, r - 1))}
                                    >−</button>
                                    <input
                                        type="range"
                                        min="-45"
                                        max="45"
                                        step="1"
                                        value=${rotation}
                                        onChange=${(e) => setRotation(parseInt(e.target.value))}
                                        class="banner-slider"
                                    />
                                    <button
                                        class="slider-btn"
                                        onClick=${() => setRotation(r => Math.min(45, r + 1))}
                                    >+</button>
                                </div>
                            </div>
                        </div>

                        <!-- Rotation buttons -->
                        <div class="banner-rotate-buttons">
                            <button
                                class="rotate-btn"
                                onClick=${() => setRotation(r => r - 90)}
                                title="Rotate left"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="1 4 1 10 7 10"></polyline>
                                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                                </svg>
                            </button>
                            <button
                                class="rotate-btn"
                                onClick=${() => setRotation(r => r + 90)}
                                title="Rotate right"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="23 4 23 10 17 10"></polyline>
                                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                `}

                <!-- Footer Actions -->
                <div class="banner-editor-actions">
                    <div class="banner-actions-left">
                        ${hasExistingBanner && html`
                            <button
                                class="btn-delete-banner"
                                onClick=${handleDelete}
                                disabled=${saving}
                            >
                                Delete photo
                            </button>
                        `}
                    </div>
                    <div class="banner-actions-right">
                        <button
                            class="btn-change-photo"
                            onClick=${() => fileInputRef.current?.click()}
                            disabled=${saving}
                        >
                            Change photo
                        </button>
                        <button
                            class="btn-apply-banner"
                            onClick=${handleApply}
                            disabled=${saving || !image}
                        >
                            ${saving ? 'Applying...' : 'Apply'}
                        </button>
                    </div>
                </div>

                <!-- Hidden file input -->
                <input
                    type="file"
                    ref=${fileInputRef}
                    accept="image/*"
                    style=${{ display: 'none' }}
                    onChange=${handleFileSelect}
                />

                <!-- Hidden canvas for cropping -->
                <canvas ref=${canvasRef} style=${{ display: 'none' }} />
            </div>
        </div>
    `;
});

/**
 * Edit Section Modal Component
 * Allows inline editing of profile sections
 */
const EditSectionModal = memo(function EditSectionModal({ section, coach, onClose, onSave }) {
    const [formData, setFormData] = useState({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Initialize form data based on section
        switch (section) {
            case 'name':
                setFormData({ full_name: coach.full_name || '' });
                break;
            case 'title':
                setFormData({ title: coach.title || '' });
                break;
            case 'about':
                setFormData({
                    bio: coach.bio || '',
                    coaching_approach: coach.coaching_approach || ''
                });
                break;
            case 'skills':
                setFormData({ skills: (coach.skills || []).join(', ') });
                break;
            case 'experience':
                setFormData({ experience: JSON.stringify(coach.experience || [], null, 2) });
                break;
            case 'education':
                setFormData({ education: JSON.stringify(coach.education || [], null, 2) });
                break;
            case 'languages':
                setFormData({ primary_profile_language: coach.primary_profile_language || '' });
                break;
            case 'hourly_rate':
                setFormData({ hourly_rate: coach.hourly_rate || '' });
                break;
            default:
                setFormData({});
        }

        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, [section, coach]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            let updateData = {};

            switch (section) {
                case 'name':
                    updateData = { full_name: formData.full_name };
                    break;
                case 'title':
                    updateData = { title: formData.title };
                    break;
                case 'about':
                    updateData = {
                        bio: formData.bio,
                        coaching_approach: formData.coaching_approach
                    };
                    break;
                case 'skills':
                    updateData = {
                        skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean)
                    };
                    break;
                case 'experience':
                    updateData = { experience: JSON.parse(formData.experience) };
                    break;
                case 'education':
                    updateData = { education: JSON.parse(formData.education) };
                    break;
                case 'languages':
                    updateData = {
                        primary_profile_language: formData.primary_profile_language
                    };
                    break;
                case 'hourly_rate':
                    updateData = { hourly_rate: parseFloat(formData.hourly_rate) || 0 };
                    break;
            }

            await onSave(updateData);
            onClose();
        } catch (err) {
            console.error('Save error:', err);
            setError(err.message || 'Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleBackdropClick = (e) => {
        if (e.target.classList.contains('edit-modal-overlay')) {
            onClose();
        }
    };

    const getSectionTitle = () => {
        const titles = {
            name: t('edit.name') || 'Edit Name',
            title: t('edit.title') || 'Edit Title',
            about: t('edit.about') || 'Edit About',
            skills: t('edit.skills') || 'Edit Skills',
            experience: t('edit.experience') || 'Edit Experience',
            education: t('edit.education') || 'Edit Education',
            languages: t('edit.primaryLanguage') || 'Edit Primary Profile Language',
            hourly_rate: t('edit.hourlyRate') || 'Edit Hourly Rate'
        };
        return titles[section] || 'Edit Section';
    };

    const renderFormFields = () => {
        switch (section) {
            case 'name':
                return html`
                    <div class="form-group">
                        <label>${t('edit.fullName') || 'Full Name'}</label>
                        <input
                            type="text"
                            value=${formData.full_name || ''}
                            onChange=${(e) => handleChange('full_name', e.target.value)}
                            placeholder="Your full name"
                            required
                        />
                    </div>
                `;
            case 'title':
                return html`
                    <div class="form-group">
                        <label>${t('edit.professionalTitle') || 'Professional Title'}</label>
                        <input
                            type="text"
                            value=${formData.title || ''}
                            onChange=${(e) => handleChange('title', e.target.value)}
                            placeholder="e.g., Executive Coach, Life Coach"
                            required
                        />
                    </div>
                `;
            case 'about':
                return html`
                    <div class="form-group">
                        <label>${t('edit.bio') || 'Bio'}</label>
                        <textarea
                            value=${formData.bio || ''}
                            onChange=${(e) => handleChange('bio', e.target.value)}
                            placeholder="Tell your story..."
                            rows="6"
                        ></textarea>
                        <div class="char-count">${(formData.bio || '').length}/2000</div>
                    </div>
                    <div class="form-group">
                        <label>${t('edit.coachingApproach') || 'Coaching Approach'}</label>
                        <textarea
                            value=${formData.coaching_approach || ''}
                            onChange=${(e) => handleChange('coaching_approach', e.target.value)}
                            placeholder="Describe your coaching methodology..."
                            rows="4"
                        ></textarea>
                    </div>
                `;
            case 'skills':
                return html`
                    <div class="form-group">
                        <label>${t('edit.skills') || 'Skills'}</label>
                        <textarea
                            value=${formData.skills || ''}
                            onChange=${(e) => handleChange('skills', e.target.value)}
                            placeholder="Enter skills separated by commas (e.g., Leadership, Communication, Time Management)"
                            rows="3"
                        ></textarea>
                        <p class="form-hint">${t('edit.skillsHint') || 'Separate each skill with a comma'}</p>
                    </div>
                `;
            case 'languages':
                return html`
                    <div class="form-group">
                        <label>${t('edit.selectPrimaryLanguage') || 'Select Primary Profile Language'}</label>
                        <p class="form-hint">${t('edit.primaryLanguageHint') || 'Choose which language will be your primary profile language. Click on a flag to select it.'}</p>
                        <div class="primary-language-selector">
                            ${(coach.languages || []).map(lang => {
                                const countryCode = LANGUAGE_TO_COUNTRY[lang] || LANGUAGE_TO_COUNTRY[lang?.toLowerCase()] || 'un';
                                const langName = LANGUAGE_NAMES[lang] || lang;
                                const isSelected = formData.primary_profile_language === lang;
                                return html`
                                    <button
                                        key=${lang}
                                        type="button"
                                        class="primary-lang-flag-btn ${isSelected ? 'selected' : ''}"
                                        onClick=${() => handleChange('primary_profile_language', lang)}
                                        title=${langName}
                                    >
                                        <img
                                            src=${`https://flagcdn.com/w80/${countryCode}.png`}
                                            alt=${langName}
                                            class="primary-lang-flag-img"
                                            onError=${(e) => { e.target.style.display = 'none'; }}
                                        />
                                        <span class="primary-lang-flag-name">${langName}</span>
                                        ${isSelected && html`<span class="primary-lang-check">✓</span>`}
                                    </button>
                                `;
                            })}
                        </div>
                    </div>
                `;
            case 'hourly_rate':
                return html`
                    <div class="form-group">
                        <label>${t('edit.hourlyRate') || 'Hourly Rate (€)'}</label>
                        <input
                            type="number"
                            value=${formData.hourly_rate || ''}
                            onChange=${(e) => handleChange('hourly_rate', e.target.value)}
                            placeholder="e.g., 150"
                            min="0"
                            step="5"
                        />
                    </div>
                `;
            case 'experience':
            case 'education':
                return html`
                    <div class="form-group">
                        <label>${section === 'experience' ? (t('edit.experienceJson') || 'Experience (JSON format)') : (t('edit.educationJson') || 'Education (JSON format)')}</label>
                        <textarea
                            value=${formData[section] || '[]'}
                            onChange=${(e) => handleChange(section, e.target.value)}
                            placeholder='[{"title": "...", "company": "...", "duration": "..."}]'
                            rows="8"
                            class="json-textarea"
                        ></textarea>
                        <p class="form-hint">${t('edit.jsonHint') || 'Enter as JSON array. Each item can have: title, company/institution, duration/year, description'}</p>
                    </div>
                `;
            default:
                return html`<p>${t('edit.notSupported') || 'This section cannot be edited inline.'}</p>`;
        }
    };

    return html`
        <div class="edit-modal-overlay" onClick=${handleBackdropClick}>
            <div class="edit-modal-container">
                <div class="edit-modal-header">
                    <h3>${getSectionTitle()}</h3>
                    <button class="edit-modal-close" onClick=${onClose}>✕</button>
                </div>
                <form onSubmit=${handleSubmit}>
                    <div class="edit-modal-content">
                        ${error && html`<div class="edit-error">${error}</div>`}
                        ${renderFormFields()}
                    </div>
                    <div class="edit-modal-actions">
                        <button type="button" class="btn-cancel" onClick=${onClose}>
                            ${t('edit.cancel') || 'Cancel'}
                        </button>
                        <button type="submit" class="btn-primary" disabled=${saving}>
                            ${saving ? (t('edit.saving') || 'Saving...') : (t('edit.save') || 'Save Changes')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
});

/**
 * Edit English Profile Modal Component
 * Allows editing English-specific profile fields (title_en, bio_en)
 */
const EditEnglishProfileModal = memo(function EditEnglishProfileModal({ coach, onClose, onSave }) {
    const [titleEn, setTitleEn] = useState(coach.title_en || '');
    const [bioEn, setBioEn] = useState(coach.bio_en || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    const handleBackdropClick = (e) => {
        if (e.target.classList.contains('edit-modal-overlay')) {
            onClose();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            await onSave({
                title_en: titleEn.trim(),
                bio_en: bioEn.trim()
            });
            onClose();
        } catch (err) {
            console.error('Save English profile error:', err);
            setError(err.message || 'Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    return html`
        <div class="edit-modal-overlay" onClick=${handleBackdropClick}>
            <div class="edit-modal-container">
                <div class="edit-modal-header">
                    <h3>${t('edit.englishProfile') || 'English Profile'}</h3>
                    <button class="edit-modal-close" onClick=${onClose}>✕</button>
                </div>
                <form onSubmit=${handleSubmit}>
                    <div class="edit-modal-content">
                        ${error && html`<div class="edit-error">${error}</div>`}
                        <p class="form-hint" style=${{ marginBottom: '16px' }}>
                            ${t('edit.englishProfileHint') || 'Set your English profile details so visitors can view your profile in English alongside your primary language.'}
                        </p>
                        <div class="form-group">
                            <label>${t('edit.professionalTitle') || 'Professional Title'}</label>
                            <input
                                type="text"
                                value=${titleEn}
                                onChange=${(e) => setTitleEn(e.target.value)}
                                placeholder=${t('edit.titlePlaceholder') || 'e.g., Executive Coach, Life Coach'}
                                maxlength="150"
                            />
                        </div>
                        <div class="form-group">
                            <label>${t('edit.aboutYou') || 'About You'}</label>
                            <textarea
                                value=${bioEn}
                                onChange=${(e) => setBioEn(e.target.value)}
                                placeholder=${t('edit.bioEnPlaceholder') || 'Tell your story in English...'}
                                rows="6"
                                maxlength="2000"
                            ></textarea>
                            <div class="char-count">${bioEn.length}/2000</div>
                        </div>
                    </div>
                    <div class="edit-modal-actions">
                        <button type="button" class="btn-cancel" onClick=${onClose}>
                            ${t('edit.cancel') || 'Cancel'}
                        </button>
                        <button type="submit" class="btn-primary" disabled=${saving}>
                            ${saving ? (t('edit.saving') || 'Saving...') : (t('edit.save') || 'Save Changes')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
});

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

    // Edit mode states
    const [editingSection, setEditingSection] = useState(null);
    const [showBannerEditor, setShowBannerEditor] = useState(false);
    const [showEnglishProfileEditor, setShowEnglishProfileEditor] = useState(false);

    // Viewers also viewed coaches (for own profile)
    const [viewersAlsoViewed, setViewersAlsoViewed] = useState([]);
    const [loadingViewersAlsoViewed, setLoadingViewersAlsoViewed] = useState(false);

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

    // Load "viewers also viewed" coaches for own profile insights
    const loadViewersAlsoViewed = async (coachData) => {
        setLoadingViewersAlsoViewed(true);
        try {
            // For now, we'll show similar coaches as "competition"
            // In the future, this could be based on actual analytics data
            const specialties = coachData.specialties || [];
            const location = coachData.location_city || coachData.location;

            let query = window.supabaseClient
                .from('cs_coaches')
                .select('id, full_name, title, avatar_url, hourly_rate, rating_average, rating_count, specialties, slug, location, cs_coach_certifications(*, cs_certifications(*))')
                .neq('id', coachData.id)
                .eq('is_active', true)
                .limit(5);

            // Try to find coaches with similar specialties OR same location
            if (specialties.length > 0) {
                query = query.overlaps('specialties', specialties);
            }

            const { data, error } = await query.order('rating_average', { ascending: false });

            if (error) {
                // Fallback to just top rated coaches
                const fallback = await window.supabaseClient
                    .from('cs_coaches')
                    .select('id, full_name, title, avatar_url, hourly_rate, rating_average, rating_count, specialties, slug, location, cs_coach_certifications(*, cs_certifications(*))')
                    .neq('id', coachData.id)
                    .eq('is_active', true)
                    .order('rating_average', { ascending: false })
                    .limit(5);
                setViewersAlsoViewed(fallback.data || []);
            } else {
                setViewersAlsoViewed(data || []);
            }
        } catch (err) {
            console.error('Failed to load viewers also viewed:', err);
            setViewersAlsoViewed([]);
        } finally {
            setLoadingViewersAlsoViewed(false);
        }
    };

    // Save coach profile changes
    const saveCoachProfile = async (updateData) => {
        if (!coach?.id || !session?.user?.id) {
            throw new Error('Not authenticated');
        }

        // Verify this is the user's own profile
        if (session.user.id !== coach.user_id) {
            throw new Error('You can only edit your own profile');
        }

        const { data, error } = await window.supabaseClient
            .from('cs_coaches')
            .update(updateData)
            .eq('id', coach.id)
            .eq('user_id', session.user.id)
            .select()
            .single();

        if (error) throw error;

        // Update local state with new data
        setCoach(prev => ({ ...prev, ...data }));

        return data;
    };

    // Load viewers also viewed when viewing own profile
    useEffect(() => {
        if (coach && session?.user?.id && coach.user_id === session.user.id) {
            loadViewersAlsoViewed(coach);
        }
    }, [coach, session]);

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

    // Handle edit section clicks - open inline edit modal
    const handleEditSection = (sectionName) => {
        // Sections that can be edited inline
        const inlineEditableSections = ['name', 'title', 'about', 'skills', 'experience', 'education', 'languages', 'hourly_rate'];

        if (sectionName === 'banner') {
            // Open the banner editor modal
            setShowBannerEditor(true);
        } else if (inlineEditableSections.includes(sectionName)) {
            setEditingSection(sectionName);
        } else {
            // For complex sections (photo, video, certifications, featured), navigate to edit page
            window.navigateTo(`/profile/edit?section=${sectionName}`);
        }
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

                        <!-- Featured Section -->
                        ${(articles.length > 0 || isOwnProfile) && html`
                            <section class="profile-section featured-section">
                                <div class="section-header-editable">
                                    <h2 class="section-title">
                                        <span class="section-icon">⭐</span>
                                        ${t('coach.highlights') || 'Highlights'}
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

                        <!-- Recommendations & Ratings Section -->
                        <section id="recommendations-ratings-section" class="profile-section rating-section">
                            <div class="section-header-editable">
                                <h2 class="section-title">
                                    <span class="section-icon">⭐</span>
                                    ${t('coach.recommendationsRatings') || 'Recommendations & Ratings'}
                                </h2>
                            </div>
                            ${reviews.length > 0 ? html`
                                <div class="ratings-overview">
                                    <div class="ratings-summary">
                                        <div class="ratings-big-score">
                                            <span class="big-number">${rating.toFixed(1)}</span>
                                            <div class="rating-stars-compact">
                                                ${[1,2,3,4,5].map(star => html`
                                                    <span key=${star} class="star-compact ${star <= Math.round(rating) ? 'filled' : ''}">★</span>
                                                `)}
                                            </div>
                                            <span class="ratings-total">${reviewsCount} ${reviewsCount === 1 ? (t('coach.review') || 'review') : (t('coach.reviews') || 'reviews')}</span>
                                        </div>
                                        ${reviews.length >= 3 && html`
                                            <div class="ratings-breakdown">
                                                ${[5,4,3,2,1].map(stars => {
                                                    const breakdown = getReviewBreakdown();
                                                    const count = breakdown[stars];
                                                    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                                                    return html`
                                                        <div key=${stars} class="breakdown-row">
                                                            <span class="bar-label">${stars}★</span>
                                                            <div class="bar-track">
                                                                <div class="bar-fill" style=${{ width: percentage + '%' }}></div>
                                                            </div>
                                                            <span class="bar-count">${count}</span>
                                                        </div>
                                                    `;
                                                })}
                                            </div>
                                        `}
                                    </div>
                                    <div class="ratings-reviews-list">
                                        ${reviews.slice(0, 3).map(review => html`
                                            <div key=${review.id} class="rating-review-item">
                                                <div class="review-header">
                                                    <div class="reviewer-info">
                                                        <span class="reviewer-name">${review.reviewer_name || 'Anonymous'}</span>
                                                        <span class="review-date">${new Date(review.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                    <div class="review-rating">
                                                        ${[1,2,3,4,5].map(star => html`
                                                            <span key=${star} class="star-compact ${star <= review.rating ? 'filled' : ''}">★</span>
                                                        `)}
                                                    </div>
                                                </div>
                                                <p class="review-content">${review.content}</p>
                                            </div>
                                        `)}
                                        ${reviews.length > 3 && html`
                                            <button class="btn-show-all" onClick=${() => setShowReviewsPopup(true)}>
                                                ${t('coach.showAllReviews') || 'Show all reviews'} →
                                            </button>
                                        `}
                                    </div>
                                </div>
                            ` : html`
                                <div class="ratings-empty">
                                    <p>${t('coach.noReviewsYet') || 'No recommendations or ratings yet.'}</p>
                                </div>
                            `}
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

                        <!-- Volunteering Section -->
                        ${isOwnProfile && html`
                            <section class="profile-section volunteering-section">
                                <div class="section-header-editable">
                                    <h2 class="section-title">
                                        <span class="section-icon">🤝</span>
                                        ${t('coach.volunteering') || 'Volunteering'}
                                    </h2>
                                    ${isOwnProfile && html`
                                        <button class="btn-edit-section" onClick=${() => handleEditSection('volunteering')} title="Edit volunteering">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                            </svg>
                                        </button>
                                    `}
                                </div>
                                <div class="empty-section-prompt" onClick=${() => handleEditSection('volunteering')}>
                                    <span class="empty-icon">+</span>
                                    <p>${t('coach.addVolunteering') || 'Add your volunteering experience'}</p>
                                </div>
                            </section>
                        `}

                        <!-- Publications Section -->
                        ${isOwnProfile && html`
                            <section class="profile-section publications-section">
                                <div class="section-header-editable">
                                    <h2 class="section-title">
                                        <span class="section-icon">📚</span>
                                        ${t('coach.publications') || 'Publications'}
                                    </h2>
                                    ${isOwnProfile && html`
                                        <button class="btn-edit-section" onClick=${() => handleEditSection('publications')} title="Edit publications">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                            </svg>
                                        </button>
                                    `}
                                </div>
                                <div class="empty-section-prompt" onClick=${() => handleEditSection('publications')}>
                                    <span class="empty-icon">+</span>
                                    <p>${t('coach.addPublications') || 'Add your publications'}</p>
                                </div>
                            </section>
                        `}
                    </main>

                    <!-- Sidebar Column (30%) -->
                    <aside class="profile-sidebar-column">
                        ${isOwnProfile ? html`
                            <!-- Own Profile: Profile Languages Section -->
                            <${ProfileLanguageSidebar}
                                languages=${coach.languages || []}
                                primaryProfileLanguage=${coach.primary_profile_language}
                                onEditLanguages=${() => handleEditSection('languages')}
                                onEditEnglishProfile=${() => setShowEnglishProfileEditor(true)}
                                isOwnProfile=${true}
                            />

                            <!-- Own Profile: Who Your Viewers Also Viewed -->
                            <${ViewersAlsoViewedSidebar}
                                coaches=${viewersAlsoViewed}
                                isLoading=${loadingViewersAlsoViewed}
                            />
                        ` : html`
                            <!-- Other Profile: More Coaches For You -->
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
                        `}
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

            <!-- Edit Section Modal (for own profile inline editing) -->
            ${editingSection && isOwnProfile && html`
                <${EditSectionModal}
                    section=${editingSection}
                    coach=${coach}
                    onClose=${() => setEditingSection(null)}
                    onSave=${saveCoachProfile}
                />
            `}

            <!-- Banner Editor Modal -->
            ${showBannerEditor && isOwnProfile && html`
                <${BannerEditorModal}
                    coach=${coach}
                    session=${session}
                    onClose=${() => setShowBannerEditor(false)}
                    onSave=${saveCoachProfile}
                />
            `}

            <!-- English Profile Editor Modal -->
            ${showEnglishProfileEditor && isOwnProfile && html`
                <${EditEnglishProfileModal}
                    coach=${coach}
                    onClose=${() => setShowEnglishProfileEditor(false)}
                    onSave=${saveCoachProfile}
                />
            `}
        </div>
    `;
}

export const CoachProfilePage = memo(CoachProfilePageComponent);
export default CoachProfilePage;
