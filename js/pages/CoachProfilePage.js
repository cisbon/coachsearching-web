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
import { AuthModal } from '../components/auth/AuthModal.js';
import { useCities, useLookupOptions, useCertifications } from '../context/AppContext.js';
import { FeedPost } from '../components/feed/FeedPost.js';
import { queryClient } from '../config/queryClient.js';
import { QUERY_KEYS, STALE_TIMES } from '../config/queryConfig.js';

const React = window.React;
const { useState, useEffect, useCallback, memo, useMemo } = React;
const html = htm.bind(React.createElement);

/**
 * Cached fetch helper — wraps queryClient.fetchQuery so repeated profile visits
 * return data from TanStack Query cache instead of hitting Supabase again.
 */
const cachedFetch = (queryKey, queryFn, staleTime) =>
    queryClient.fetchQuery({ queryKey, queryFn, staleTime });

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

// Helper function to validate video URLs
const isValidVideoUrl = (url) => {
    if (!url || url.trim() === '') return true;
    const lowerUrl = url.toLowerCase();
    return (
        lowerUrl.includes('youtube.com') ||
        lowerUrl.includes('youtu.be') ||
        lowerUrl.includes('vimeo.com') ||
        lowerUrl.includes('loom.com') ||
        lowerUrl.includes('dailymotion.com') ||
        lowerUrl.includes('dai.ly')
    );
};

/**
 * Service Request Modal Component
 * Shown when a visitor clicks "Request" on a service line item
 */
const ServiceRequestModal = ({ coach, service, onClose }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        const handleEscape = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleEscape);
        return () => { document.removeEventListener('keydown', handleEscape); document.body.style.overflow = ''; };
    }, [onClose]);

    const handleBackdropClick = (e) => {
        if (e.target.classList.contains('discovery-modal-overlay')) onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim() || !email.trim()) {
            setError(t('service.errorRequired') || 'Please fill in your name and email');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            if (window.supabaseClient) {
                await window.supabaseClient.from('cs_discovery_requests').insert({
                    coach_id: coach.id,
                    client_name: name.trim(),
                    client_email: email.trim(),
                    message: `[${t('service.requestFor') || 'Service Request'}: ${service.name}] ${message.trim()}`,
                    source: 'service_request'
                });
            }
            setSuccess(true);
        } catch (err) {
            setError(err.message || 'Failed to send request');
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return html`
            <div class="discovery-modal-overlay" onClick=${handleBackdropClick}>
                <div class="discovery-modal-container">
                    <div class="discovery-modal-header">
                        <h3>${t('service.requestSent') || 'Request Sent!'}</h3>
                        <button class="discovery-modal-close" onClick=${onClose}>✕</button>
                    </div>
                    <div class="discovery-modal-content success-content">
                        <div class="success-icon">✓</div>
                        <h4>${t('service.thankYou') || 'Thank you!'}</h4>
                        <p>${(t('service.requestConfirmation') || '{coachName} will get back to you with more information about this service.').replace('{coachName}', coach.full_name)}</p>
                        <button class="btn-primary" onClick=${onClose}>${t('common.close') || 'Close'}</button>
                    </div>
                </div>
            </div>
        `;
    }

    return html`
        <div class="discovery-modal-overlay" onClick=${handleBackdropClick}>
            <div class="discovery-modal-container">
                <div class="discovery-modal-header">
                    <h3>${t('service.requestService') || 'Request Service'}</h3>
                    <button class="discovery-modal-close" onClick=${onClose}>✕</button>
                </div>
                <div class="discovery-modal-content">
                    <p class="discovery-intro">
                        ${(t('service.requestIntro') || 'I would like to request the service <strong>{serviceName}</strong> and would like to receive additional information.').replace('{serviceName}', `<strong>${service.name}</strong>`)}
                    </p>

                    ${error && html`<div class="discovery-error">${error}</div>`}

                    <form onSubmit=${handleSubmit}>
                        <div class="form-group">
                            <label>${t('service.yourName') || 'Your Name'} *</label>
                            <input type="text" value=${name} onChange=${(e) => setName(e.target.value)} placeholder=${t('service.namePlaceholder') || 'Your full name'} required />
                        </div>
                        <div class="form-group">
                            <label>${t('service.yourEmail') || 'Your Email'} *</label>
                            <input type="email" value=${email} onChange=${(e) => setEmail(e.target.value)} placeholder=${t('service.emailPlaceholder') || 'your@email.com'} required />
                        </div>
                        <div class="form-group">
                            <label>${t('service.additionalMessage') || 'Message'} (${t('review.optional') || 'optional'})</label>
                            <textarea value=${message} onChange=${(e) => setMessage(e.target.value)} placeholder=${t('service.messagePlaceholder') || 'Any questions or additional information...'} rows="3"></textarea>
                        </div>
                        <div class="discovery-form-actions">
                            <button type="button" class="btn-cancel" onClick=${onClose}>${t('common.cancel') || 'Cancel'}</button>
                            <button type="submit" class="btn-primary" disabled=${submitting}>
                                ${submitting ? (t('common.sending') || 'Sending...') : (t('service.sendRequest') || 'Send Request')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
};

/**
 * Write Review Modal Component
 */
const WriteRecommendationModal = ({ coach, onClose, onSubmit, userHasReviewed }) => {
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

    // C.2: If user has already reviewed, show message instead of form
    if (userHasReviewed) {
        return html`
            <div class="review-modal-overlay" onClick=${handleBackdropClick}>
                <div class="review-modal-container">
                    <div class="review-modal-header">
                        <h3>${t('review.alreadyReviewedTitle') || 'Already Recommended'}</h3>
                        <button class="review-modal-close" onClick=${onClose}>✕</button>
                    </div>
                    <div class="review-modal-content success-content">
                        <div class="success-icon">✓</div>
                        <p>${t('review.alreadyReviewed') || 'You have already recommended this coach'}</p>
                        <button class="btn-primary" onClick=${onClose}>${t('review.close') || 'Close'}</button>
                    </div>
                </div>
            </div>
        `;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (rating < 1 || rating > 5) {
            setError(t('review.errorRating') || 'Please select a rating');
            return;
        }
        if (!content.trim() || content.trim().length < 10) {
            setError(t('review.errorContent') || 'Please write at least 10 characters for your recommendation');
            return;
        }

        setSubmitting(true);
        setError('');

        const result = await onSubmit({ rating, content: content.trim(), name: name.trim() });

        if (result.success) {
            setSuccess(true);
        } else {
            setError(result.error || t('review.errorGeneric') || 'Failed to submit recommendation');
        }

        setSubmitting(false);
    };

    if (success) {
        return html`
            <div class="review-modal-overlay" onClick=${handleBackdropClick}>
                <div class="review-modal-container">
                    <div class="review-modal-header">
                        <h3>${t('review.successTitle') || 'Recommendation Submitted!'}</h3>
                        <button class="review-modal-close" onClick=${onClose}>✕</button>
                    </div>
                    <div class="review-modal-content success-content">
                        <div class="success-icon">✓</div>
                        <p>${t('review.successMessage') || 'Thank you for your recommendation!'}</p>
                        <p>${t('review.successPending') || 'Your recommendation will be visible after moderation.'}</p>
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
                    <h3>${t('review.writeReview') || 'Write a Recommendation'}</h3>
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
                            <label>${t('review.yourReview') || 'Your Recommendation'} *</label>
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
                                ${submitting ? (t('review.submitting') || 'Submitting...') : (t('review.submit') || 'Submit Recommendation')}
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
const RecommendationsPopup = ({ coach, reviews, rating, reviewsCount, session, userHasReviewed, isOwnProfile, onClose, onWriteReview, getReviewBreakdown }) => {
    const [starFilter, setStarFilter] = useState(0); // 0 = all stars

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

    // Filter reviews: only shown=true for visitors, then apply star filter
    const visibleReviews = reviews.filter(r => r.shown !== false);
    const filteredReviews = starFilter > 0
        ? visibleReviews.filter(r => Math.round(r.rating) === starFilter)
        : visibleReviews;

    return html`
        <div class="reviews-popup-overlay" onClick=${handleBackdropClick}>
            <div class="reviews-popup-container">
                <div class="reviews-popup-header">
                    <h3>${t('coach.reviews') || 'Client Recommendations'}</h3>
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
                            <span class="review-count">${visibleReviews.length} ${visibleReviews.length === 1 ? 'recommendation' : 'recommendations'}</span>
                        </div>

                        ${visibleReviews.length >= 3 && html`
                            <div class="popup-breakdown">
                                ${[5,4,3,2,1].map(stars => {
                                    const breakdown = getReviewBreakdown();
                                    const count = breakdown[stars];
                                    const percentage = visibleReviews.length > 0 ? (count / visibleReviews.length) * 100 : 0;
                                    return html`
                                        <div key=${stars} class="breakdown-row clickable ${starFilter === stars ? 'active-filter' : ''}" onClick=${() => setStarFilter(starFilter === stars ? 0 : stars)}>
                                            <span class="bar-label">${stars}★</span>
                                            <div class="bar-track">
                                                <div class="bar-fill" style=${{ width: `${percentage}%` }}></div>
                                            </div>
                                            <span class="bar-count">${count}</span>
                                        </div>
                                    `;
                                })}
                                ${starFilter > 0 && html`
                                    <button class="btn-clear-filter" onClick=${() => setStarFilter(0)}>
                                        ${t('review.clearFilter') || 'Clear filter'} ✕
                                    </button>
                                `}
                            </div>
                        `}
                    </div>

                    <div class="popup-write-review">
                        ${session?.user ? (
                            isOwnProfile ? null : (
                                userHasReviewed ? html`
                                    <div class="already-reviewed">
                                        <span class="check-icon">✓</span>
                                        ${t('review.alreadyReviewed') || 'You recommended this coach'}
                                    </div>
                                ` : html`
                                    <button class="btn-write-review-popup" onClick=${onWriteReview}>
                                        ✏️ ${t('review.writeReview') || 'Write a Recommendation'}
                                    </button>
                                `
                            )
                        ) : html`
                            <button class="btn-write-review-popup btn-login" onClick=${() => { onClose(); window.navigateTo('/login'); }}>
                                ${t('review.loginToReview') || 'Log in to write a recommendation'}
                            </button>
                        `}
                    </div>

                    ${filteredReviews.length > 0 ? html`
                        <div class="popup-reviews-list">
                            ${filteredReviews.map(review => html`
                                <div key=${review.id} class="popup-review-item">
                                    <div class="review-header">
                                        <div class="reviewer-info">
                                            <span class="reviewer-name">${review.reviewer_name || (t('review.anonymous') || 'Anonymous')}</span>
                                            <span class="review-date">${new Date(review.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div class="review-rating">
                                            ${[1,2,3,4,5].map(star => html`
                                                <span key=${star} class="star-small ${star <= review.rating ? 'filled' : ''}">★</span>
                                            `)}
                                        </div>
                                    </div>
                                    <p class="review-content">${review.text || review.content || ''}</p>
                                    ${review.comment && html`
                                        <div class="review-coach-comment popup-coach-comment">
                                            <div class="coach-comment-header">
                                                <strong>${coach.full_name}</strong>
                                                <span class="coach-comment-label">${t('review.coachReply') || 'Coach Reply'}</span>
                                            </div>
                                            <p class="coach-comment-text">${review.comment}</p>
                                        </div>
                                    `}
                                </div>
                            `)}
                        </div>
                    ` : html`
                        <div class="popup-no-reviews">
                            <p>${starFilter > 0 ? (t('review.noMatchingReviews') || 'No recommendations with this rating.') : (t('review.beFirstToReview') || 'Be the first to share your recommendation!')}</p>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
};

/**
 * ReviewItem Component
 * Renders a single review with toggle (own profile), coach comment, and edit comment
 */
const ReviewItem = ({ review, isOwnProfile, coachName, onToggleShown, onSaveComment }) => {
    const [editingComment, setEditingComment] = useState(false);
    const [commentDraft, setCommentDraft] = useState(review.comment || '');

    const isShown = review.shown !== false; // default true

    const handleSaveComment = () => {
        onSaveComment(review.id, commentDraft);
        setEditingComment(false);
    };

    return html`
        <div class="rating-review-item ${!isShown && isOwnProfile ? 'review-hidden' : ''}">
            <div class="review-main-row">
                <div class="review-left-column">
                    <span class="reviewer-name">${review.reviewer_name || (t('review.anonymous') || 'Anonymous')}</span>
                    <span class="review-date">${new Date(review.created_at).toLocaleDateString()}</span>
                </div>
                ${(review.text || review.content) && html`
                    <div class="review-middle-column">
                        <p class="review-text">${review.text || review.content}</p>
                    </div>
                `}
                <div class="review-right-column">
                    ${[1,2,3,4,5].map(star => html`
                        <span key=${star} class="star-compact ${star <= review.rating ? 'filled' : ''}">★</span>
                    `)}
                    ${isOwnProfile && html`
                        <div class="review-toggle-wrapper" title=${isShown ? (t('coach.hideReview') || 'Hide this review') : (t('coach.showReview') || 'Show this review')}>
                            <div class="ios-toggle-switch ios-toggle-sm ${isShown ? 'active' : ''}" onClick=${() => onToggleShown(review.id, isShown)}>
                                <div class="ios-toggle-knob"></div>
                            </div>
                        </div>
                    `}
                </div>
            </div>

            <!-- D.3.2: Display coach comment for all users -->
            ${review.comment && !editingComment && html`
                <div class="review-coach-comment">
                    <div class="coach-comment-header">
                        <strong>${coachName}</strong>
                        <span class="coach-comment-label">${t('review.coachReply') || 'Coach Reply'}</span>
                    </div>
                    <p class="coach-comment-text">${review.comment}</p>
                    ${isOwnProfile && html`
                        <button class="btn-edit-comment" onClick=${() => { setCommentDraft(review.comment); setEditingComment(true); }}>
                            ${t('review.editComment') || 'Edit'}
                        </button>
                    `}
                </div>
            `}

            <!-- D.3: Coach can add comment (own profile) -->
            ${isOwnProfile && !review.comment && !editingComment && html`
                <button class="btn-add-comment" onClick=${() => setEditingComment(true)}>
                    💬 ${t('review.addComment') || 'Add a reply'}
                </button>
            `}

            <!-- D.3.1: Comment edit form -->
            ${editingComment && html`
                <div class="coach-comment-edit">
                    <textarea
                        class="comment-edit-textarea"
                        value=${commentDraft}
                        onChange=${(e) => setCommentDraft(e.target.value)}
                        placeholder=${t('review.commentPlaceholder') || 'Thank you for your recommendation...'}
                        rows="3"
                    ></textarea>
                    <div class="comment-edit-actions">
                        <button class="btn-cancel btn-sm" onClick=${() => setEditingComment(false)}>${t('common.cancel') || 'Cancel'}</button>
                        <button class="btn-primary btn-sm" onClick=${handleSaveComment}>${t('common.save') || 'Save'}</button>
                    </div>
                </div>
            `}
        </div>
    `;
};

/**
 * Mini Coach Card Component for Sidebar
 * Shows similar coaches with name, certification badge, title, and chemistry call button
 */
const MiniCoachCard = memo(function MiniCoachCard({ coach, onDiscoveryCall, session }) {
    const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);

    const handleDiscoveryClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (session) {
            setShowDiscoveryModal(true);
        } else {
            setShowAuthModal(true);
        }
    };

    const handleAuthSuccess = () => {
        setShowAuthModal(false);
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

        ${showAuthModal && html`
            <${AuthModal}
                onClose=${() => setShowAuthModal(false)}
                onSuccess=${handleAuthSuccess}
                title=${t('auth.signInToBook') || 'Sign in to book your call'}
                subtitle=${(t('auth.signInToBookSubtitle') || 'Create an account or sign in to book a free discovery call with {coachName}').replace('{coachName}', coach.full_name)}
            />
        `}
    `;
});

/**
 * Profile Coach Card Component
 * Embedded coach card for the profile page with overlapping profile image and banner
 */
const ProfileCoachCard = memo(function ProfileCoachCard({ coach, onDiscoveryCall, onVideoClick, onWriteReview, onConnect, connectionStatus, session, isOwnProfile, onEditSection, hasOtherVisibleSections }) {
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

            <!-- Profile Image with Name beside it -->
            <div class="profile-card-header-row">
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

                <div class="profile-card-name-section">
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
                    </h1>
                    <div class="profile-coach-title">${coach.title}</div>
                </div>

                <div class="profile-card-header-actions">
                    <!-- External Links -->
                    ${coach.linkedin_url && html`
                        <a href=${coach.linkedin_url} target="_blank" rel="noopener noreferrer" class="btn-external-link btn-linkedin" title="LinkedIn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                        </a>
                    `}
                    ${coach.website_url && html`
                        <a href=${coach.website_url} target="_blank" rel="noopener noreferrer" class="btn-external-link btn-website" title="Website">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="2" y1="12" x2="22" y2="12"></line>
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                            </svg>
                        </a>
                    `}
                    ${coach.instagram_url && html`
                        <a href=${coach.instagram_url} target="_blank" rel="noopener noreferrer" class="btn-external-link btn-instagram" title="Instagram">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                            </svg>
                        </a>
                    `}
                    <!-- Edit Profile Button (own profile only) -->
                    ${isOwnProfile && html`
                        <button class="btn-edit-profile" onClick=${() => onEditSection('coach-profile')} title="Edit profile">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                    `}
                </div>
            </div>

            <!-- Main Card Content -->
            <div class="profile-card-content">
                <div class="profile-card-main">
                    <!-- Location and Languages Row -->
                    <div class="profile-meta-row">
                        ${location && html`<span class="meta-location">📍 ${location}</span>`}
                        <${LanguageFlags} languages=${languages} />
                        ${coach.years_experience > 0 && html`
                            <span class="meta-experience">🏆 ${coach.years_experience}+ ${t('coach.yearsExperience') || 'years'}</span>
                        `}
                    </div>

                    <!-- Session Formats & Rating Row -->
                    <div class="profile-session-formats">
                        ${offersVideo && html`<span class="format-tag">💻 Video Call</span>`}
                        ${offersInPerson && html`<span class="format-tag">🤝 In-Person</span>`}
                        ${reviewsCount > 0 && hasOtherVisibleSections && html`
                            <span class="format-tag rating-tag clickable" onClick=${() => {
                                const el = document.getElementById('recommendations-ratings-section');
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}>
                                ${[1,2,3,4,5].map(star => html`
                                    <span key=${star} class="star-compact ${star <= Math.round(rating) ? 'filled' : ''}">★</span>
                                `)}
                                <span class="rating-value">${rating.toFixed(1)}</span>
                                <span class="rating-count">(${reviewsCount})</span>
                            </span>
                        `}
                    </div>

                    <!-- Bio -->
                    ${bio && html`
                        <div class="profile-bio">
                            <p>${bio}</p>
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

                    <!-- Connect Button -->
                    ${!isOwnProfile && html`
                        <button
                            class="btn-connect ${connectionStatus === 'pending' ? 'btn-connect-pending' : connectionStatus === 'granted' ? 'btn-connect-granted' : ''}"
                            onClick=${onConnect}
                            disabled=${connectionStatus === 'pending' || connectionStatus === 'granted'}
                        >
                            ${connectionStatus === 'pending' ? html`
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="12"></line>
                                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                </svg>
                                <span>${t('connect.pending') || 'Pending'}</span>
                            ` : connectionStatus === 'granted' ? html`
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </svg>
                                <span>${t('connect.connected') || 'Connected'}</span>
                            ` : html`
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="8.5" cy="7" r="4"></circle>
                                    <line x1="20" y1="8" x2="20" y2="14"></line>
                                    <line x1="23" y1="11" x2="17" y2="11"></line>
                                </svg>
                                <span>${t('connect.connect') || 'Connect'}</span>
                            `}
                        </button>
                    `}

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
                    ${!isOwnProfile && html`
                        <button class="btn-recommendation" onClick=${onWriteReview}>
                            ⭐ ${t('coach.giveRecommendation') || 'Give Recommendation'}
                        </button>
                    `}
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
const ViewersAlsoViewedSidebar = memo(function ViewersAlsoViewedSidebar({ coaches, isLoading, session }) {
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
                        session=${session}
                    />
                `)}
            </div>
        </section>
    `;
});

/**
 * Constants for language flags (shared with onboarding)
 */
const FLAG_CDN = 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3';
const LANGUAGE_TO_FLAG = {
    'en': 'gb', 'de': 'de', 'es': 'es', 'fr': 'fr', 'it': 'it',
    'nl': 'nl', 'pt': 'pt', 'ru': 'ru', 'zh': 'cn', 'ja': 'jp',
    'ko': 'kr', 'ar': 'sa', 'hi': 'in', 'pl': 'pl', 'sv': 'se',
    'no': 'no', 'da': 'dk', 'fi': 'fi', 'el': 'gr', 'tr': 'tr',
    'cs': 'cz', 'ro': 'ro', 'hu': 'hu', 'uk': 'ua'
};

/**
 * Edit Coach Profile Modal
 * Comprehensive profile editor reusing onboarding-style field patterns
 */
const EditCoachProfileModal = memo(function EditCoachProfileModal({ coach, onClose, onSave }) {
    const { lookupOptions, getLocalizedName, getLocalizedDescription } = useLookupOptions();
    const { cities, getLocalizedCityName } = useCities();

    const [formData, setFormData] = useState({
        full_name: coach.full_name || '',
        title: coach.title || '',
        intro_video_url: coach.intro_video_url || '',
        linkedin_url: coach.linkedin_url || '',
        website_url: coach.website_url || '',
        instagram_url: coach.instagram_url || '',
        city_id: coach.city_id || null,
        location_country: '',
        languages: coach.languages || [],
        years_experience: coach.years_experience || '',
        bio: coach.bio || '',
        specialties: coach.specialties || [],
        session_types: coach.session_types || [],
        offers_free_discovery: coach.offers_free_discovery !== false
    });
    const [videoUrlError, setVideoUrlError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Derive country from city_id on mount
    useEffect(() => {
        if (coach.city_id && cities.list?.length > 0) {
            const city = cities.list.find(c => c.id === coach.city_id);
            if (city) {
                setFormData(prev => ({ ...prev, location_country: city.country_en }));
            }
        }
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, [cities.list]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleBackdropClick = (e) => {
        if (e.target.classList.contains('edit-modal-overlay')) onClose();
    };

    // Lookup data
    const languages = lookupOptions.languages || [];
    const specialties = lookupOptions.specialties || [];
    const sessionFormats = (lookupOptions.sessionFormats || []).filter(f => !['chat', 'hybrid', 'phone'].includes(f.code));

    // Country/city derivation
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

    const filteredCities = useMemo(() => {
        if (!cities.list || cities.list.length === 0) return [];
        if (!formData.location_country) return cities.list;
        return cities.list.filter(city => city.country_en === formData.location_country);
    }, [formData.location_country, cities.list]);

    const toggleLanguage = (code) => {
        const langs = formData.languages || [];
        handleChange('languages', langs.includes(code) ? langs.filter(l => l !== code) : [...langs, code]);
    };

    const toggleSpecialty = (code) => {
        const current = formData.specialties || [];
        handleChange('specialties', current.includes(code) ? current.filter(s => s !== code) : current.length < 10 ? [...current, code] : current);
    };

    const toggleFormat = (code) => {
        const formats = formData.session_types || [];
        handleChange('session_types', formats.includes(code) ? formats.filter(f => f !== code) : [...formats, code]);
    };

    const getSpecialtyDisplayName = (code) => {
        const s = specialties.find(sp => sp.code === code);
        return s ? String(getLocalizedName(s)) : String(code);
    };

    const selectedSpecCount = (formData.specialties || []).length;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        if (!formData.full_name.trim()) { setError('Name is required'); setSaving(false); return; }

        try {
            await onSave({
                full_name: formData.full_name.trim(),
                title: formData.title.trim() || null,
                intro_video_url: isValidVideoUrl(formData.intro_video_url) ? (formData.intro_video_url.trim() || null) : null,
                linkedin_url: formData.linkedin_url.trim() || null,
                website_url: formData.website_url.trim() || null,
                instagram_url: formData.instagram_url.trim() || null,
                city_id: formData.city_id ? parseInt(formData.city_id) : null,
                languages: formData.languages,
                years_experience: parseInt(formData.years_experience) || 0,
                bio: formData.bio.trim() || null,
                specialties: formData.specialties,
                session_types: formData.session_types,
                offers_free_discovery: formData.offers_free_discovery
            });
            onClose();
        } catch (err) {
            console.error('Save profile error:', err);
            setError(err.message || 'Failed to save profile');
        } finally {
            setSaving(false);
        }
    };

    return html`
        <div class="edit-modal-overlay" onClick=${handleBackdropClick}>
            <div class="edit-modal-container edit-coach-profile-modal">
                <div class="edit-modal-header">
                    <h3>${t('edit.editProfile') || 'Edit Profile'}</h3>
                    <button class="edit-modal-close" onClick=${onClose}>✕</button>
                </div>
                <form onSubmit=${handleSubmit}>
                    <div class="edit-modal-content edit-coach-profile-content">
                        ${error && html`<div class="edit-error">${error}</div>`}

                        <!-- Name & Title -->
                        <div class="form-row">
                            <div class="form-group form-group-flex">
                                <label>${t('edit.fullName') || 'Full Name'} *</label>
                                <input type="text" value=${formData.full_name} onChange=${(e) => handleChange('full_name', e.target.value)} required />
                            </div>
                            <div class="form-group form-group-flex">
                                <label>${t('edit.professionalTitle') || 'Professional Title'}</label>
                                <input type="text" value=${formData.title} onChange=${(e) => handleChange('title', e.target.value)} placeholder="e.g., Executive Coach" />
                            </div>
                        </div>

                        <!-- Intro Video URL (prominent) -->
                        <div class="form-group intro-video-section">
                            <div class="intro-video-promo">
                                <span class="promo-badge">⭐ ${t('edit.recommended') || 'Highly Recommended'}</span>
                            </div>
                            <label class="form-label" style=${{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                🎥 ${t('edit.introVideo') || 'Introduction Video'}
                            </label>
                            <div class="form-hint">${t('edit.introVideoHint') || 'Add a short video (1-2 min) to introduce yourself. This is the #1 way to build trust with potential clients. Use YouTube, Vimeo, or Loom links.'}</div>
                            <div style=${{ position: 'relative' }}>
                                <input
                                    type="url"
                                    value=${formData.intro_video_url}
                                    onChange=${(e) => {
                                        handleChange('intro_video_url', e.target.value);
                                        setVideoUrlError(e.target.value.trim() !== '' && !isValidVideoUrl(e.target.value));
                                    }}
                                    placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                                    style=${{ paddingLeft: '44px', borderColor: videoUrlError ? '#ef4444' : undefined }}
                                />
                                <span style=${{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px' }}>🔗</span>
                            </div>
                            ${videoUrlError && html`<div class="form-error">${t('edit.invalidVideoUrl') || 'Please enter a valid YouTube, Vimeo, or Loom URL'}</div>`}
                        </div>

                        <!-- Location: Country & City -->
                        <div class="form-row">
                            <div class="form-group form-group-flex">
                                <label>${t('edit.country') || 'Country'}</label>
                                <select value=${formData.location_country || ''} onChange=${(e) => { handleChange('location_country', e.target.value); handleChange('city_id', null); }}>
                                    <option value="">...</option>
                                    ${countriesFromCities.map(country => html`
                                        <option key=${country.code} value=${country.name}>${country.name}</option>
                                    `)}
                                </select>
                            </div>
                            <div class="form-group form-group-flex">
                                <label>${t('edit.city') || 'City'}</label>
                                <select value=${String(formData.city_id || '')} onChange=${(e) => handleChange('city_id', e.target.value ? parseInt(e.target.value) : null)} disabled=${!formData.location_country}>
                                    <option value="">${formData.location_country ? 'Select city...' : 'Select country first'}</option>
                                    ${filteredCities.map(city => html`
                                        <option key=${city.id} value=${city.id}>${getLocalizedCityName ? getLocalizedCityName(city) : city.name_en}</option>
                                    `)}
                                </select>
                            </div>
                        </div>

                        <!-- Years of Experience -->
                        <div class="form-group">
                            <label>${t('edit.yearsExperience') || 'Years of Experience'}</label>
                            <div class="years-stepper-inline">
                                <button type="button" class="btn-stepper-inline" onClick=${() => {
                                    const c = parseInt(formData.years_experience) || 0;
                                    if (c > 0) handleChange('years_experience', String(c - 1));
                                }}>−</button>
                                <input type="number" value=${String(formData.years_experience || '')} onInput=${(e) => handleChange('years_experience', e.target.value)} placeholder="0" min="0" class="years-input-inline" />
                                <button type="button" class="btn-stepper-inline" onClick=${() => {
                                    const c = parseInt(formData.years_experience) || 0;
                                    handleChange('years_experience', String(c + 1));
                                }}>+</button>
                            </div>
                        </div>

                        <!-- Languages -->
                        <div class="form-group">
                            <label>🌍 ${t('edit.languages') || 'Languages'}</label>
                            <div class="language-grid-inline">
                                ${languages.map(lang => {
                                    const isSelected = (formData.languages || []).includes(lang.code);
                                    const flagCode = LANGUAGE_TO_FLAG[lang.code];
                                    return html`
                                        <button key=${lang.code} type="button" class="language-option-inline ${isSelected ? 'selected' : ''}" onClick=${() => toggleLanguage(lang.code)}>
                                            ${flagCode ? html`<img src="${FLAG_CDN}/${flagCode}.svg" alt=${getLocalizedName(lang)} class="lang-flag-inline" loading="lazy" />` : html`<span>🌐</span>`}
                                            <span>${String(getLocalizedName(lang))}</span>
                                        </button>
                                    `;
                                })}
                            </div>
                        </div>

                        <!-- Bio -->
                        <div class="form-group">
                            <label>${t('edit.aboutYou') || 'About You'}</label>
                            <textarea value=${formData.bio} onChange=${(e) => handleChange('bio', e.target.value)} placeholder="Tell your story..." rows="5"></textarea>
                            <div class="char-count">${(formData.bio || '').length}/2000</div>
                        </div>

                        <!-- Specialties -->
                        <div class="form-group">
                            <label>🎯 ${t('edit.specialties') || 'Specialties'} ${selectedSpecCount > 0 ? `(${selectedSpecCount}/10)` : ''}</label>
                            ${selectedSpecCount > 0 && html`
                                <div class="selected-pills">
                                    ${(formData.specialties || []).map(code => html`
                                        <span key=${code} class="specialty-pill-inline">
                                            ${getSpecialtyDisplayName(code)}
                                            <button type="button" class="pill-remove" onClick=${() => toggleSpecialty(code)}>×</button>
                                        </span>
                                    `)}
                                </div>
                            `}
                            <div class="specialty-grid-inline">
                                ${specialties.map(s => {
                                    const isSel = (formData.specialties || []).includes(s.code);
                                    const isDis = !isSel && selectedSpecCount >= 10;
                                    return html`
                                        <button key=${s.code} type="button" class="specialty-option-inline ${isSel ? 'selected' : ''}" onClick=${() => toggleSpecialty(s.code)} disabled=${isDis}>
                                            <span>${String(s.icon || '🎯')}</span>
                                            <span>${String(getLocalizedName(s))}</span>
                                        </button>
                                    `;
                                })}
                            </div>
                        </div>

                        <!-- Session Formats -->
                        <div class="form-group">
                            <label>💬 ${t('edit.sessionFormats') || 'Session Formats'}</label>
                            <div class="format-grid-inline">
                                ${sessionFormats.map(format => {
                                    const isSel = (formData.session_types || []).includes(format.code);
                                    return html`
                                        <div key=${format.code} class="format-card-inline ${isSel ? 'selected' : ''}" onClick=${() => toggleFormat(format.code)}>
                                            <div class="format-icon-inline">${String(format.icon || '💬')}</div>
                                            <div class="format-title-inline">${String(getLocalizedName(format))}</div>
                                        </div>
                                    `;
                                })}
                            </div>
                        </div>

                        <!-- Free Discovery Call (iOS-style toggle) -->
                        <div class="form-group">
                            <div class="ios-toggle-row" onClick=${() => handleChange('offers_free_discovery', !formData.offers_free_discovery)}>
                                <div class="ios-toggle-info">
                                    <span class="ios-toggle-label">📞 ${t('edit.offerDiscoveryCall') || 'Offer Free Discovery Call'}</span>
                                    <span class="ios-toggle-hint">${t('edit.discoveryCallHint') || 'Allow potential clients to book a free introductory call'}</span>
                                </div>
                                <div class="ios-toggle-switch ${formData.offers_free_discovery ? 'active' : ''}">
                                    <div class="ios-toggle-knob"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Social Links Section -->
                        <div class="form-group social-links-section">
                            <label class="section-label">🔗 ${t('edit.socialLinks') || 'Social Links'}</label>
                            <div class="form-row">
                                <div class="form-group form-group-flex">
                                    <label>LinkedIn</label>
                                    <input type="url" value=${formData.linkedin_url} onChange=${(e) => handleChange('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/..." />
                                </div>
                                <div class="form-group form-group-flex">
                                    <label>${t('edit.website') || 'Website'}</label>
                                    <input type="url" value=${formData.website_url} onChange=${(e) => handleChange('website_url', e.target.value)} placeholder="https://..." />
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Instagram</label>
                                <input type="url" value=${formData.instagram_url} onChange=${(e) => handleChange('instagram_url', e.target.value)} placeholder="https://instagram.com/..." />
                            </div>
                        </div>
                    </div>
                    <div class="edit-modal-actions">
                        <div class="edit-modal-actions-right">
                            <button type="button" class="btn-cancel" onClick=${onClose}>${t('edit.cancel') || 'Cancel'}</button>
                            <button type="submit" class="btn-primary" disabled=${saving}>
                                ${saving ? (t('edit.saving') || 'Saving...') : (t('edit.save') || 'Save Changes')}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    `;
});

/**
 * Profile Photo Editor Modal Component
 * Reuses banner editor pattern with square (1:1) crop for profile images
 */
const ProfilePhotoEditorModal = memo(function ProfilePhotoEditorModal({ coach, onClose, onSave, session }) {
    const [image, setImage] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [hasExistingPhoto, setHasExistingPhoto] = useState(false);

    const fileInputRef = React.useRef(null);
    const canvasRef = React.useRef(null);
    const containerRef = React.useRef(null);

    const CROP_SIZE = 280; // Square crop area

    useEffect(() => {
        document.body.style.overflow = 'hidden';

        const existingPhoto = coach.avatar_url && !coach.avatar_url.includes('ui-avatars.com');
        setHasExistingPhoto(existingPhoto);

        if (existingPhoto) {
            loadImageFromUrl(coach.avatar_url);
        } else {
            setTimeout(() => { fileInputRef.current?.click(); }, 100);
        }

        const handleEscape = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, []);

    const loadImageFromUrl = (url) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => { setImage(img); setZoom(1); setPosition({ x: 0, y: 0 }); };
        img.onerror = () => { setError('Failed to load existing photo'); };
        img.src = url + '?t=' + Date.now();
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { setError('Please select an image file'); return; }
        if (file.size > 10 * 1024 * 1024) { setError('Image must be less than 10MB'); return; }

        setError('');
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => { setImage(img); setHasExistingPhoto(true); setZoom(1); setPosition({ x: 0, y: 0 }); };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const handleMouseDown = (e) => { if (!image) return; setIsDragging(true); setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y }); };
    const handleMouseMove = (e) => { if (!isDragging || !image) return; setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); };
    const handleMouseUp = () => { setIsDragging(false); };
    const handleTouchStart = (e) => { if (!image || e.touches.length !== 1) return; setIsDragging(true); setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y }); };
    const handleTouchMove = (e) => { if (!isDragging || !image || e.touches.length !== 1) return; e.preventDefault(); setPosition({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y }); };
    const handleTouchEnd = () => { setIsDragging(false); };

    const getCroppedImage = () => {
        return new Promise((resolve, reject) => {
            if (!image || !canvasRef.current) { reject(new Error('No image to crop')); return; }
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            canvas.width = 400;
            canvas.height = 400;
            ctx.fillStyle = '#f3f2ef';
            ctx.fillRect(0, 0, 400, 400);

            const containerSize = containerRef.current?.offsetWidth || CROP_SIZE;
            const scale = 400 / containerSize;

            ctx.save();
            ctx.translate(200, 200);
            ctx.scale(zoom, zoom);
            ctx.translate(-200, -200);

            const fitScale = Math.max(containerSize / image.width, containerSize / image.height);
            const scaledWidth = image.width * fitScale * scale;
            const scaledHeight = image.height * fitScale * scale;
            const drawX = (400 - scaledWidth) / 2 + position.x * scale;
            const drawY = (400 - scaledHeight) / 2 + position.y * scale;

            ctx.drawImage(image, drawX, drawY, scaledWidth, scaledHeight);
            ctx.restore();

            canvas.toBlob((blob) => { blob ? resolve(blob) : reject(new Error('Failed to create image blob')); }, 'image/jpeg', 0.9);
        });
    };

    const handleApply = async () => {
        if (!image) return;
        setSaving(true);
        setError('');

        try {
            const blob = await getCroppedImage();
            const userId = session?.user?.id;
            if (!userId) throw new Error('Not authenticated');

            const fileName = `${userId}/avatar-${Date.now()}.jpg`;
            const { error: uploadError } = await window.supabaseClient.storage
                .from('profile-banners')
                .upload(fileName, blob, { upsert: true, contentType: 'image/jpeg' });
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = window.supabaseClient.storage
                .from('profile-banners')
                .getPublicUrl(fileName);

            const avatarUrl = publicUrl + '?t=' + Date.now();
            await onSave({ avatar_url: avatarUrl });
            onClose();
        } catch (err) {
            console.error('Photo upload error:', err);
            setError(err.message || 'Failed to upload photo');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to remove your profile photo?')) return;
        setSaving(true);
        try {
            await onSave({ avatar_url: null });
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to remove photo');
        } finally {
            setSaving(false);
        }
    };

    const handleBackdropClick = (e) => {
        if (e.target.classList.contains('banner-editor-overlay')) onClose();
    };

    const getImageStyle = () => {
        if (!image) return {};
        const containerSize = containerRef.current?.offsetWidth || CROP_SIZE;
        const scaleToFit = Math.max(containerSize / image.width, containerSize / image.height);
        const width = image.width * scaleToFit * zoom;
        const height = image.height * scaleToFit * zoom;
        return {
            width: `${width}px`,
            height: `${height}px`,
            transform: `translate(${position.x}px, ${position.y}px)`,
            cursor: isDragging ? 'grabbing' : 'grab'
        };
    };

    return html`
        <div class="banner-editor-overlay" onClick=${handleBackdropClick}>
            <div class="banner-editor-container photo-editor-container">
                <div class="banner-editor-header">
                    <h3>${t('edit.profilePhoto') || 'Profile Photo'}</h3>
                    <button class="banner-editor-close" onClick=${onClose}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div class="banner-editor-crop-area photo-crop-area">
                    <div
                        class="photo-crop-container"
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
                            <img src=${image.src} alt="Photo preview" class="banner-preview-image" style=${getImageStyle()} draggable="false" />
                        ` : html`
                            <div class="banner-placeholder">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                <p>Select a photo to upload</p>
                            </div>
                        `}
                        <div class="photo-crop-frame"></div>
                    </div>
                </div>

                ${error && html`<div class="banner-editor-error">${error}</div>`}

                ${image && html`
                    <div class="banner-editor-controls">
                        <div class="banner-control-sliders">
                            <div class="banner-slider-row">
                                <span class="slider-label">Zoom</span>
                                <div class="slider-container">
                                    <button class="slider-btn" onClick=${() => setZoom(z => Math.max(1, z - 0.1))}>−</button>
                                    <input type="range" min="1" max="3" step="0.1" value=${zoom} onChange=${(e) => setZoom(parseFloat(e.target.value))} class="banner-slider" />
                                    <button class="slider-btn" onClick=${() => setZoom(z => Math.min(3, z + 0.1))}>+</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `}

                <div class="banner-editor-actions">
                    <div class="banner-actions-left">
                        ${hasExistingPhoto && html`
                            <button class="btn-delete-banner" onClick=${handleDelete} disabled=${saving}>Delete photo</button>
                        `}
                    </div>
                    <div class="banner-actions-right">
                        <button class="btn-change-photo" onClick=${() => fileInputRef.current?.click()} disabled=${saving}>Change photo</button>
                        <button class="btn-apply-banner" onClick=${handleApply} disabled=${saving || !image}>
                            ${saving ? 'Applying...' : 'Apply'}
                        </button>
                    </div>
                </div>

                <input type="file" ref=${fileInputRef} accept="image/*" style=${{ display: 'none' }} onChange=${handleFileSelect} />
                <canvas ref=${canvasRef} style=${{ display: 'none' }} />
            </div>
        </div>
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
 * Edit Experience Modal Component
 * Used for both adding new and editing existing experience items
 * Data is stored in cs_coach_experiences table
 */
const EditExperienceModal = memo(function EditExperienceModal({ coach, experience, onClose, onSaved }) {
    const isEditing = !!experience;
    const [formData, setFormData] = useState({
        title: experience?.title || '',
        title_en: experience?.title_en || '',
        employment_type: experience?.employment_type || '',
        organization: experience?.organization || '',
        start_date: experience?.start_date || '',
        end_date: experience?.end_date || '',
        location: experience?.location || '',
        description: experience?.description || '',
        description_en: experience?.description_en || ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleBackdropClick = (e) => {
        if (e.target.classList.contains('edit-modal-overlay')) {
            onClose();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        if (!formData.title.trim()) {
            setError(t('edit.titleRequired') || 'Title is required');
            setSaving(false);
            return;
        }
        if (!formData.organization.trim()) {
            setError(t('edit.organizationRequired') || 'Organization is required');
            setSaving(false);
            return;
        }
        if (!formData.start_date) {
            setError(t('edit.startDateRequired') || 'Start date is required');
            setSaving(false);
            return;
        }

        try {
            const payload = {
                coach_id: coach.id,
                title: formData.title.trim(),
                title_en: formData.title_en.trim() || null,
                employment_type: formData.employment_type || null,
                organization: formData.organization.trim(),
                start_date: formData.start_date,
                end_date: formData.end_date || null,
                location: formData.location.trim() || null,
                description: formData.description.trim() || null,
                description_en: formData.description_en.trim() || null
            };

            if (isEditing) {
                const { error: dbError } = await window.supabaseClient
                    .from('cs_coach_experiences')
                    .update(payload)
                    .eq('id', experience.id)
                    .eq('coach_id', coach.id);
                if (dbError) throw dbError;
            } else {
                const { error: dbError } = await window.supabaseClient
                    .from('cs_coach_experiences')
                    .insert(payload);
                if (dbError) throw dbError;
            }

            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.coachExperiences(coach.id) });
            await onSaved();
            onClose();
        } catch (err) {
            console.error('Save experience error:', err);
            setError(err.message || 'Failed to save experience');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!isEditing) return;
        if (!confirm(t('edit.confirmDeleteExperience') || 'Are you sure you want to delete this experience?')) return;

        setSaving(true);
        try {
            const { error: dbError } = await window.supabaseClient
                .from('cs_coach_experiences')
                .delete()
                .eq('id', experience.id)
                .eq('coach_id', coach.id);
            if (dbError) throw dbError;

            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.coachExperiences(coach.id) });
            await onSaved();
            onClose();
        } catch (err) {
            console.error('Delete experience error:', err);
            setError(err.message || 'Failed to delete experience');
        } finally {
            setSaving(false);
        }
    };

    return html`
        <div class="edit-modal-overlay" onClick=${handleBackdropClick}>
            <div class="edit-modal-container edit-modal-wide">
                <div class="edit-modal-header">
                    <h3>${isEditing ? (t('edit.editExperience') || 'Edit Experience') : (t('edit.addExperience') || 'Add Experience')}</h3>
                    <button class="edit-modal-close" onClick=${onClose}>✕</button>
                </div>
                <form onSubmit=${handleSubmit}>
                    <div class="edit-modal-content">
                        ${error && html`<div class="edit-error">${error}</div>`}

                        <div class="form-row">
                            <div class="form-group form-group-flex">
                                <label>${t('edit.jobTitle') || 'Title'} *</label>
                                <input
                                    type="text"
                                    value=${formData.title}
                                    onChange=${(e) => handleChange('title', e.target.value)}
                                    placeholder=${t('edit.jobTitlePlaceholder') || 'e.g., Executive Coach'}
                                    required
                                />
                            </div>
                            <div class="form-group form-group-flex">
                                <label>${t('edit.titleEn') || 'Title (English)'}</label>
                                <input
                                    type="text"
                                    value=${formData.title_en}
                                    onChange=${(e) => handleChange('title_en', e.target.value)}
                                    placeholder=${t('edit.titleEnPlaceholder') || 'English translation of title'}
                                />
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group form-group-flex">
                                <label>${t('edit.organization') || 'Organization'} *</label>
                                <input
                                    type="text"
                                    value=${formData.organization}
                                    onChange=${(e) => handleChange('organization', e.target.value)}
                                    placeholder=${t('edit.organizationPlaceholder') || 'e.g., Company Name'}
                                    required
                                />
                            </div>
                            <div class="form-group form-group-flex">
                                <label>${t('edit.employmentType') || 'Employment Type'}</label>
                                <select
                                    value=${formData.employment_type}
                                    onChange=${(e) => handleChange('employment_type', e.target.value)}
                                >
                                    <option value="">${t('edit.selectType') || 'Select type...'}</option>
                                    <option value="Full-Time">${t('edit.fullTime') || 'Full-Time'}</option>
                                    <option value="Part-Time">${t('edit.partTime') || 'Part-Time'}</option>
                                    <option value="Self-Employed">${t('edit.selfEmployed') || 'Self-Employed'}</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group form-group-flex">
                                <label>${t('edit.startDate') || 'Start Date'} *</label>
                                <input
                                    type="date"
                                    value=${formData.start_date}
                                    onChange=${(e) => handleChange('start_date', e.target.value)}
                                    required
                                />
                            </div>
                            <div class="form-group form-group-flex">
                                <label>${t('edit.endDate') || 'End Date'}</label>
                                <input
                                    type="date"
                                    value=${formData.end_date}
                                    onChange=${(e) => handleChange('end_date', e.target.value)}
                                />
                                <p class="form-hint">${t('edit.endDateHint') || 'Leave empty if current position'}</p>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>${t('edit.location') || 'Location'}</label>
                            <input
                                type="text"
                                value=${formData.location}
                                onChange=${(e) => handleChange('location', e.target.value)}
                                placeholder=${t('edit.locationPlaceholder') || 'e.g., Berlin, Germany'}
                            />
                        </div>

                        <div class="form-group">
                            <label>${t('edit.description') || 'Description'}</label>
                            <textarea
                                value=${formData.description}
                                onChange=${(e) => handleChange('description', e.target.value)}
                                placeholder=${t('edit.descriptionPlaceholder') || 'Describe your role and responsibilities...'}
                                rows="4"
                            ></textarea>
                        </div>

                        <div class="form-group">
                            <label>${t('edit.descriptionEn') || 'Description (English)'}</label>
                            <textarea
                                value=${formData.description_en}
                                onChange=${(e) => handleChange('description_en', e.target.value)}
                                placeholder=${t('edit.descriptionEnPlaceholder') || 'English translation of description...'}
                                rows="4"
                            ></textarea>
                        </div>
                    </div>
                    <div class="edit-modal-actions">
                        ${isEditing && html`
                            <button type="button" class="btn-delete" onClick=${handleDelete} disabled=${saving}>
                                ${t('edit.delete') || 'Delete'}
                            </button>
                        `}
                        <div class="edit-modal-actions-right">
                            <button type="button" class="btn-cancel" onClick=${onClose}>
                                ${t('edit.cancel') || 'Cancel'}
                            </button>
                            <button type="submit" class="btn-primary" disabled=${saving}>
                                ${saving ? (t('edit.saving') || 'Saving...') : (isEditing ? (t('edit.save') || 'Save Changes') : (t('edit.add') || 'Add Experience'))}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    `;
});

/**
 * Edit Education Modal Component
 * Used for both adding new and editing existing education items
 * Data is stored in cs_coach_educations table
 */
const EditEducationModal = memo(function EditEducationModal({ coach, education, onClose, onSaved }) {
    const isEditing = !!education;
    const [formData, setFormData] = useState({
        institute: education?.institute || '',
        degree: education?.degree || '',
        field_of_study: education?.field_of_study || '',
        field_of_study_en: education?.field_of_study_en || '',
        start_date: education?.start_date || '',
        end_date: education?.end_date || '',
        location: education?.location || '',
        description: education?.description || '',
        description_en: education?.description_en || ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleBackdropClick = (e) => {
        if (e.target.classList.contains('edit-modal-overlay')) {
            onClose();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        if (!formData.institute.trim()) {
            setError(t('edit.instituteRequired') || 'Institute is required');
            setSaving(false);
            return;
        }
        if (!formData.field_of_study.trim()) {
            setError(t('edit.fieldOfStudyRequired') || 'Field of study is required');
            setSaving(false);
            return;
        }
        if (!formData.start_date) {
            setError(t('edit.startDateRequired') || 'Start date is required');
            setSaving(false);
            return;
        }

        try {
            const payload = {
                coach_id: coach.id,
                institute: formData.institute.trim(),
                degree: formData.degree.trim() || null,
                field_of_study: formData.field_of_study.trim(),
                field_of_study_en: formData.field_of_study_en.trim() || null,
                start_date: formData.start_date,
                end_date: formData.end_date || null,
                location: formData.location.trim() || null,
                description: formData.description.trim() || null,
                description_en: formData.description_en.trim() || null
            };

            if (isEditing) {
                const { error: dbError } = await window.supabaseClient
                    .from('cs_coach_educations')
                    .update(payload)
                    .eq('id', education.id)
                    .eq('coach_id', coach.id);
                if (dbError) throw dbError;
            } else {
                const { error: dbError } = await window.supabaseClient
                    .from('cs_coach_educations')
                    .insert(payload);
                if (dbError) throw dbError;
            }

            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.coachEducations(coach.id) });
            await onSaved();
            onClose();
        } catch (err) {
            console.error('Save education error:', err);
            setError(err.message || 'Failed to save education');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!isEditing) return;
        if (!confirm(t('edit.confirmDeleteEducation') || 'Are you sure you want to delete this education?')) return;

        setSaving(true);
        try {
            const { error: dbError } = await window.supabaseClient
                .from('cs_coach_educations')
                .delete()
                .eq('id', education.id)
                .eq('coach_id', coach.id);
            if (dbError) throw dbError;

            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.coachEducations(coach.id) });
            await onSaved();
            onClose();
        } catch (err) {
            console.error('Delete education error:', err);
            setError(err.message || 'Failed to delete education');
        } finally {
            setSaving(false);
        }
    };

    return html`
        <div class="edit-modal-overlay" onClick=${handleBackdropClick}>
            <div class="edit-modal-container edit-modal-wide">
                <div class="edit-modal-header">
                    <h3>${isEditing ? (t('edit.editEducation') || 'Edit Education') : (t('edit.addEducation') || 'Add Education')}</h3>
                    <button class="edit-modal-close" onClick=${onClose}>✕</button>
                </div>
                <form onSubmit=${handleSubmit}>
                    <div class="edit-modal-content">
                        ${error && html`<div class="edit-error">${error}</div>`}

                        <div class="form-row">
                            <div class="form-group form-group-flex">
                                <label>${t('edit.institute') || 'Institute'} *</label>
                                <input
                                    type="text"
                                    value=${formData.institute}
                                    onChange=${(e) => handleChange('institute', e.target.value)}
                                    placeholder=${t('edit.institutePlaceholder') || 'e.g., University of Oxford'}
                                    required
                                />
                            </div>
                            <div class="form-group form-group-flex">
                                <label>${t('edit.degree') || 'Degree'}</label>
                                <input
                                    type="text"
                                    value=${formData.degree}
                                    onChange=${(e) => handleChange('degree', e.target.value)}
                                    placeholder=${t('edit.degreePlaceholder') || "e.g., Master's, Bachelor's, MBA"}
                                />
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group form-group-flex">
                                <label>${t('edit.fieldOfStudy') || 'Field of Study'} *</label>
                                <input
                                    type="text"
                                    value=${formData.field_of_study}
                                    onChange=${(e) => handleChange('field_of_study', e.target.value)}
                                    placeholder=${t('edit.fieldOfStudyPlaceholder') || 'e.g., Psychology, Business Administration'}
                                    required
                                />
                            </div>
                            <div class="form-group form-group-flex">
                                <label>${t('edit.fieldOfStudyEn') || 'Field of Study (English)'}</label>
                                <input
                                    type="text"
                                    value=${formData.field_of_study_en}
                                    onChange=${(e) => handleChange('field_of_study_en', e.target.value)}
                                    placeholder=${t('edit.fieldOfStudyEnPlaceholder') || 'English translation'}
                                />
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group form-group-flex">
                                <label>${t('edit.startDate') || 'Start Date'} *</label>
                                <input
                                    type="date"
                                    value=${formData.start_date}
                                    onChange=${(e) => handleChange('start_date', e.target.value)}
                                    required
                                />
                            </div>
                            <div class="form-group form-group-flex">
                                <label>${t('edit.endDate') || 'End Date'}</label>
                                <input
                                    type="date"
                                    value=${formData.end_date}
                                    onChange=${(e) => handleChange('end_date', e.target.value)}
                                />
                                <p class="form-hint">${t('edit.endDateHint') || 'Leave empty if currently studying'}</p>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>${t('edit.location') || 'Location'}</label>
                            <input
                                type="text"
                                value=${formData.location}
                                onChange=${(e) => handleChange('location', e.target.value)}
                                placeholder=${t('edit.locationPlaceholder') || 'e.g., Berlin, Germany'}
                            />
                        </div>

                        <div class="form-group">
                            <label>${t('edit.description') || 'Description'}</label>
                            <textarea
                                value=${formData.description}
                                onChange=${(e) => handleChange('description', e.target.value)}
                                placeholder=${t('edit.eduDescriptionPlaceholder') || 'Describe your studies, achievements...'}
                                rows="4"
                            ></textarea>
                        </div>

                        <div class="form-group">
                            <label>${t('edit.descriptionEn') || 'Description (English)'}</label>
                            <textarea
                                value=${formData.description_en}
                                onChange=${(e) => handleChange('description_en', e.target.value)}
                                placeholder=${t('edit.descriptionEnPlaceholder') || 'English translation of description...'}
                                rows="4"
                            ></textarea>
                        </div>
                    </div>
                    <div class="edit-modal-actions">
                        ${isEditing && html`
                            <button type="button" class="btn-delete" onClick=${handleDelete} disabled=${saving}>
                                ${t('edit.delete') || 'Delete'}
                            </button>
                        `}
                        <div class="edit-modal-actions-right">
                            <button type="button" class="btn-cancel" onClick=${onClose}>
                                ${t('edit.cancel') || 'Cancel'}
                            </button>
                            <button type="submit" class="btn-primary" disabled=${saving}>
                                ${saving ? (t('edit.saving') || 'Saving...') : (isEditing ? (t('edit.save') || 'Save Changes') : (t('edit.add') || 'Add Education'))}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    `;
});

/**
 * Edit Skill Modal Component
 * Used for both adding new and editing existing skill items
 * Data is stored in cs_coach_skills table
 */
const EditSkillModal = memo(function EditSkillModal({ coach, skill, onClose, onSaved }) {
    const isEditing = !!skill;
    const [formData, setFormData] = useState({
        skill: skill?.skill || '',
        skill_en: skill?.skill_en || ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleBackdropClick = (e) => {
        if (e.target.classList.contains('edit-modal-overlay')) {
            onClose();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        if (!formData.skill.trim()) {
            setError(t('edit.skillRequired') || 'Skill name is required');
            setSaving(false);
            return;
        }

        try {
            const payload = {
                coach_id: coach.id,
                skill: formData.skill.trim(),
                skill_en: formData.skill_en.trim() || null
            };

            if (isEditing) {
                const { error: dbError } = await window.supabaseClient
                    .from('cs_coach_skills')
                    .update(payload)
                    .eq('id', skill.id)
                    .eq('coach_id', coach.id);
                if (dbError) throw dbError;
            } else {
                const { error: dbError } = await window.supabaseClient
                    .from('cs_coach_skills')
                    .insert(payload);
                if (dbError) throw dbError;
            }

            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.coachSkills(coach.id) });
            await onSaved();
            onClose();
        } catch (err) {
            console.error('Save skill error:', err);
            setError(err.message || 'Failed to save skill');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!isEditing) return;
        if (!confirm(t('edit.confirmDeleteSkill') || 'Are you sure you want to delete this skill?')) return;

        setSaving(true);
        try {
            const { error: dbError } = await window.supabaseClient
                .from('cs_coach_skills')
                .delete()
                .eq('id', skill.id)
                .eq('coach_id', coach.id);
            if (dbError) throw dbError;

            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.coachSkills(coach.id) });
            await onSaved();
            onClose();
        } catch (err) {
            console.error('Delete skill error:', err);
            setError(err.message || 'Failed to delete skill');
        } finally {
            setSaving(false);
        }
    };

    return html`
        <div class="edit-modal-overlay" onClick=${handleBackdropClick}>
            <div class="edit-modal-container">
                <div class="edit-modal-header">
                    <h3>${isEditing ? (t('edit.editSkill') || 'Edit Skill') : (t('edit.addSkill') || 'Add Skill')}</h3>
                    <button class="edit-modal-close" onClick=${onClose}>✕</button>
                </div>
                <form onSubmit=${handleSubmit}>
                    <div class="edit-modal-content">
                        ${error && html`<div class="edit-error">${error}</div>`}

                        <div class="form-group">
                            <label>${t('edit.skillName') || 'Skill'} *</label>
                            <input
                                type="text"
                                value=${formData.skill}
                                onChange=${(e) => handleChange('skill', e.target.value)}
                                placeholder=${t('edit.skillPlaceholder') || 'e.g., Leadership Coaching'}
                                required
                            />
                        </div>

                        <div class="form-group">
                            <label>${t('edit.skillNameEn') || 'Skill (English)'}</label>
                            <input
                                type="text"
                                value=${formData.skill_en}
                                onChange=${(e) => handleChange('skill_en', e.target.value)}
                                placeholder=${t('edit.skillEnPlaceholder') || 'English translation'}
                            />
                        </div>
                    </div>
                    <div class="edit-modal-actions">
                        ${isEditing && html`
                            <button type="button" class="btn-delete" onClick=${handleDelete} disabled=${saving}>
                                ${t('edit.delete') || 'Delete'}
                            </button>
                        `}
                        <div class="edit-modal-actions-right">
                            <button type="button" class="btn-cancel" onClick=${onClose}>
                                ${t('edit.cancel') || 'Cancel'}
                            </button>
                            <button type="submit" class="btn-primary" disabled=${saving}>
                                ${saving ? (t('edit.saving') || 'Saving...') : (isEditing ? (t('edit.save') || 'Save Changes') : (t('edit.add') || 'Add Skill'))}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    `;
});

/**
 * Edit Volunteering Modal Component
 * Used for both adding new and editing existing volunteering items
 * Data is stored in cs_coach_volunteering table
 */
const EditVolunteeringModal = memo(function EditVolunteeringModal({ coach, volunteering, onClose, onSaved }) {
    const isEditing = !!volunteering;
    const [formData, setFormData] = useState({
        title: volunteering?.title || '',
        title_en: volunteering?.title_en || '',
        organization: volunteering?.organization || '',
        start_date: volunteering?.start_date || '',
        end_date: volunteering?.end_date || '',
        location: volunteering?.location || '',
        description: volunteering?.description || '',
        description_en: volunteering?.description_en || ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleBackdropClick = (e) => {
        if (e.target.classList.contains('edit-modal-overlay')) {
            onClose();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        if (!formData.title.trim()) {
            setError(t('edit.titleRequired') || 'Title is required');
            setSaving(false);
            return;
        }
        if (!formData.organization.trim()) {
            setError(t('edit.organizationRequired') || 'Organization is required');
            setSaving(false);
            return;
        }
        if (!formData.start_date) {
            setError(t('edit.startDateRequired') || 'Start date is required');
            setSaving(false);
            return;
        }

        try {
            const payload = {
                coach_id: coach.id,
                title: formData.title.trim(),
                title_en: formData.title_en.trim() || null,
                organization: formData.organization.trim(),
                start_date: formData.start_date,
                end_date: formData.end_date || null,
                location: formData.location.trim() || null,
                description: formData.description.trim() || null,
                description_en: formData.description_en.trim() || null
            };

            if (isEditing) {
                const { error: dbError } = await window.supabaseClient
                    .from('cs_coach_volunteering')
                    .update(payload)
                    .eq('id', volunteering.id)
                    .eq('coach_id', coach.id);
                if (dbError) throw dbError;
            } else {
                const { error: dbError } = await window.supabaseClient
                    .from('cs_coach_volunteering')
                    .insert(payload);
                if (dbError) throw dbError;
            }

            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.coachVolunteering(coach.id) });
            await onSaved();
            onClose();
        } catch (err) {
            console.error('Save volunteering error:', err);
            setError(err.message || 'Failed to save volunteering');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!isEditing) return;
        if (!confirm(t('edit.confirmDeleteVolunteering') || 'Are you sure you want to delete this volunteering entry?')) return;

        setSaving(true);
        try {
            const { error: dbError } = await window.supabaseClient
                .from('cs_coach_volunteering')
                .delete()
                .eq('id', volunteering.id)
                .eq('coach_id', coach.id);
            if (dbError) throw dbError;

            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.coachVolunteering(coach.id) });
            await onSaved();
            onClose();
        } catch (err) {
            console.error('Delete volunteering error:', err);
            setError(err.message || 'Failed to delete volunteering');
        } finally {
            setSaving(false);
        }
    };

    return html`
        <div class="edit-modal-overlay" onClick=${handleBackdropClick}>
            <div class="edit-modal-container edit-modal-wide">
                <div class="edit-modal-header">
                    <h3>${isEditing ? (t('edit.editVolunteering') || 'Edit Volunteering') : (t('edit.addVolunteering') || 'Add Volunteering')}</h3>
                    <button class="edit-modal-close" onClick=${onClose}>✕</button>
                </div>
                <form onSubmit=${handleSubmit}>
                    <div class="edit-modal-content">
                        ${error && html`<div class="edit-error">${error}</div>`}

                        <div class="form-row">
                            <div class="form-group form-group-flex">
                                <label>${t('edit.role') || 'Role'} *</label>
                                <input
                                    type="text"
                                    value=${formData.title}
                                    onChange=${(e) => handleChange('title', e.target.value)}
                                    placeholder=${t('edit.volunteerRolePlaceholder') || 'e.g., Mentor, Workshop Facilitator'}
                                    required
                                />
                            </div>
                            <div class="form-group form-group-flex">
                                <label>${t('edit.titleEn') || 'Role (English)'}</label>
                                <input
                                    type="text"
                                    value=${formData.title_en}
                                    onChange=${(e) => handleChange('title_en', e.target.value)}
                                    placeholder=${t('edit.titleEnPlaceholder') || 'English translation'}
                                />
                            </div>
                        </div>

                        <div class="form-group">
                            <label>${t('edit.organization') || 'Organization'} *</label>
                            <input
                                type="text"
                                value=${formData.organization}
                                onChange=${(e) => handleChange('organization', e.target.value)}
                                placeholder=${t('edit.organizationPlaceholder') || 'e.g., Organization Name'}
                                required
                            />
                        </div>

                        <div class="form-row">
                            <div class="form-group form-group-flex">
                                <label>${t('edit.startDate') || 'Start Date'} *</label>
                                <input
                                    type="date"
                                    value=${formData.start_date}
                                    onChange=${(e) => handleChange('start_date', e.target.value)}
                                    required
                                />
                            </div>
                            <div class="form-group form-group-flex">
                                <label>${t('edit.endDate') || 'End Date'}</label>
                                <input
                                    type="date"
                                    value=${formData.end_date}
                                    onChange=${(e) => handleChange('end_date', e.target.value)}
                                />
                                <p class="form-hint">${t('edit.endDateHint') || 'Leave empty if ongoing'}</p>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>${t('edit.location') || 'Location'}</label>
                            <input
                                type="text"
                                value=${formData.location}
                                onChange=${(e) => handleChange('location', e.target.value)}
                                placeholder=${t('edit.locationPlaceholder') || 'e.g., Berlin, Germany'}
                            />
                        </div>

                        <div class="form-group">
                            <label>${t('edit.description') || 'Description'}</label>
                            <textarea
                                value=${formData.description}
                                onChange=${(e) => handleChange('description', e.target.value)}
                                placeholder=${t('edit.volunteerDescriptionPlaceholder') || 'Describe your volunteering activities...'}
                                rows="4"
                            ></textarea>
                        </div>

                        <div class="form-group">
                            <label>${t('edit.descriptionEn') || 'Description (English)'}</label>
                            <textarea
                                value=${formData.description_en}
                                onChange=${(e) => handleChange('description_en', e.target.value)}
                                placeholder=${t('edit.descriptionEnPlaceholder') || 'English translation of description...'}
                                rows="4"
                            ></textarea>
                        </div>
                    </div>
                    <div class="edit-modal-actions">
                        ${isEditing && html`
                            <button type="button" class="btn-delete" onClick=${handleDelete} disabled=${saving}>
                                ${t('edit.delete') || 'Delete'}
                            </button>
                        `}
                        <div class="edit-modal-actions-right">
                            <button type="button" class="btn-cancel" onClick=${onClose}>
                                ${t('edit.cancel') || 'Cancel'}
                            </button>
                            <button type="submit" class="btn-primary" disabled=${saving}>
                                ${saving ? (t('edit.saving') || 'Saving...') : (isEditing ? (t('edit.save') || 'Save Changes') : (t('edit.add') || 'Add Volunteering'))}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    `;
});

/**
 * Edit Publication Modal Component
 * Used for both adding new and editing existing publication items
 * Data is stored in cs_coach_publications table
 */
const EditPublicationModal = memo(function EditPublicationModal({ coach, publication, onClose, onSaved }) {
    const isEditing = !!publication;
    const [formData, setFormData] = useState({
        title: publication?.title || '',
        title_en: publication?.title_en || '',
        publisher: publication?.publisher || '',
        publication_date: publication?.publication_date || '',
        authors: publication?.authors || '',
        publication_url: publication?.publication_url || '',
        description: publication?.description || '',
        description_en: publication?.description_en || ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleBackdropClick = (e) => {
        if (e.target.classList.contains('edit-modal-overlay')) {
            onClose();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        if (!formData.title.trim()) {
            setError(t('edit.titleRequired') || 'Title is required');
            setSaving(false);
            return;
        }

        try {
            const payload = {
                coach_id: coach.id,
                title: formData.title.trim(),
                title_en: formData.title_en.trim() || null,
                publisher: formData.publisher.trim() || null,
                publication_date: formData.publication_date || null,
                authors: formData.authors.trim() || null,
                publication_url: formData.publication_url.trim() || null,
                description: formData.description.trim() || null,
                description_en: formData.description_en.trim() || null
            };

            if (isEditing) {
                const { error: dbError } = await window.supabaseClient
                    .from('cs_coach_publications')
                    .update(payload)
                    .eq('id', publication.id)
                    .eq('coach_id', coach.id);
                if (dbError) throw dbError;
            } else {
                const { error: dbError } = await window.supabaseClient
                    .from('cs_coach_publications')
                    .insert(payload);
                if (dbError) throw dbError;
            }

            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.coachPublications(coach.id) });
            await onSaved();
            onClose();
        } catch (err) {
            console.error('Save publication error:', err);
            setError(err.message || 'Failed to save publication');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!isEditing) return;
        if (!confirm(t('edit.confirmDeletePublication') || 'Are you sure you want to delete this publication?')) return;

        setSaving(true);
        try {
            const { error: dbError } = await window.supabaseClient
                .from('cs_coach_publications')
                .delete()
                .eq('id', publication.id)
                .eq('coach_id', coach.id);
            if (dbError) throw dbError;

            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.coachPublications(coach.id) });
            await onSaved();
            onClose();
        } catch (err) {
            console.error('Delete publication error:', err);
            setError(err.message || 'Failed to delete publication');
        } finally {
            setSaving(false);
        }
    };

    return html`
        <div class="edit-modal-overlay" onClick=${handleBackdropClick}>
            <div class="edit-modal-container edit-modal-wide">
                <div class="edit-modal-header">
                    <h3>${isEditing ? (t('edit.editPublication') || 'Edit Publication') : (t('edit.addPublication') || 'Add Publication')}</h3>
                    <button class="edit-modal-close" onClick=${onClose}>✕</button>
                </div>
                <form onSubmit=${handleSubmit}>
                    <div class="edit-modal-content">
                        ${error && html`<div class="edit-error">${error}</div>`}

                        <div class="form-row">
                            <div class="form-group form-group-flex">
                                <label>${t('edit.publicationTitle') || 'Title'} *</label>
                                <input
                                    type="text"
                                    value=${formData.title}
                                    onChange=${(e) => handleChange('title', e.target.value)}
                                    placeholder=${t('edit.publicationTitlePlaceholder') || 'e.g., The Art of Executive Coaching'}
                                    required
                                />
                            </div>
                            <div class="form-group form-group-flex">
                                <label>${t('edit.titleEn') || 'Title (English)'}</label>
                                <input
                                    type="text"
                                    value=${formData.title_en}
                                    onChange=${(e) => handleChange('title_en', e.target.value)}
                                    placeholder=${t('edit.titleEnPlaceholder') || 'English translation'}
                                />
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group form-group-flex">
                                <label>${t('edit.publisher') || 'Publisher'}</label>
                                <input
                                    type="text"
                                    value=${formData.publisher}
                                    onChange=${(e) => handleChange('publisher', e.target.value)}
                                    placeholder=${t('edit.publisherPlaceholder') || 'e.g., Springer, Harvard Business Review'}
                                />
                            </div>
                            <div class="form-group form-group-flex">
                                <label>${t('edit.publicationDate') || 'Publication Date'}</label>
                                <input
                                    type="date"
                                    value=${formData.publication_date}
                                    onChange=${(e) => handleChange('publication_date', e.target.value)}
                                />
                            </div>
                        </div>

                        <div class="form-group">
                            <label>${t('edit.authors') || 'Authors'}</label>
                            <input
                                type="text"
                                value=${formData.authors}
                                onChange=${(e) => handleChange('authors', e.target.value)}
                                placeholder=${t('edit.authorsPlaceholder') || 'e.g., John Smith, Jane Doe'}
                            />
                        </div>

                        <div class="form-group">
                            <label>${t('edit.publicationUrl') || 'Publication URL'}</label>
                            <input
                                type="url"
                                value=${formData.publication_url}
                                onChange=${(e) => handleChange('publication_url', e.target.value)}
                                placeholder=${t('edit.publicationUrlPlaceholder') || 'https://...'}
                            />
                        </div>

                        <div class="form-group">
                            <label>${t('edit.description') || 'Description'}</label>
                            <textarea
                                value=${formData.description}
                                onChange=${(e) => handleChange('description', e.target.value)}
                                placeholder=${t('edit.publicationDescriptionPlaceholder') || 'Brief description of the publication...'}
                                rows="4"
                            ></textarea>
                        </div>

                        <div class="form-group">
                            <label>${t('edit.descriptionEn') || 'Description (English)'}</label>
                            <textarea
                                value=${formData.description_en}
                                onChange=${(e) => handleChange('description_en', e.target.value)}
                                placeholder=${t('edit.descriptionEnPlaceholder') || 'English translation of description...'}
                                rows="4"
                            ></textarea>
                        </div>
                    </div>
                    <div class="edit-modal-actions">
                        ${isEditing && html`
                            <button type="button" class="btn-delete" onClick=${handleDelete} disabled=${saving}>
                                ${t('edit.delete') || 'Delete'}
                            </button>
                        `}
                        <div class="edit-modal-actions-right">
                            <button type="button" class="btn-cancel" onClick=${onClose}>
                                ${t('edit.cancel') || 'Cancel'}
                            </button>
                            <button type="submit" class="btn-primary" disabled=${saving}>
                                ${saving ? (t('edit.saving') || 'Saving...') : (isEditing ? (t('edit.save') || 'Save Changes') : (t('edit.add') || 'Add Publication'))}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    `;
});

/**
 * Edit Certification Modal Component
 * Used for both adding new and editing existing certification items
 * Data is stored in cs_coach_certifications table, linked to cs_certifications lookup
 */
const EditCertificationModal = memo(function EditCertificationModal({ coach, credential, certificationsList, onClose, onSaved }) {
    const isEditing = !!credential;
    const [certificationId, setCertificationId] = useState(credential?.certification_id || '');
    const [dateAcquired, setDateAcquired] = useState(credential?.date_acquired || '');
    const [certificateUrl, setCertificateUrl] = useState(credential?.certificate_url || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Get certifications grouped by organization for the dropdown
    const activeCerts = (certificationsList || []).filter(c => c.is_active);

    // Filter certifications by search term
    const filteredCerts = searchTerm.trim()
        ? activeCerts.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.short_name && c.short_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            c.issuing_organization.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : activeCerts;

    // Group by organization
    const groupedCerts = filteredCerts.reduce((acc, cert) => {
        const org = cert.issuing_organization;
        if (!acc[org]) acc[org] = [];
        acc[org].push(cert);
        return acc;
    }, {});

    const selectedCert = activeCerts.find(c => c.id === parseInt(certificationId));

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const handleBackdropClick = (e) => {
        if (e.target.classList.contains('edit-modal-overlay')) {
            onClose();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        if (!certificationId) {
            setError(t('edit.certificationRequired') || 'Please select a certification');
            setSaving(false);
            return;
        }

        try {
            const payload = {
                coach_id: coach.id,
                certification_id: parseInt(certificationId),
                date_acquired: dateAcquired || null,
                certificate_url: certificateUrl.trim() || null
            };

            if (isEditing) {
                const { error: dbError } = await window.supabaseClient
                    .from('cs_coach_certifications')
                    .update(payload)
                    .eq('id', credential.id)
                    .eq('coach_id', coach.id);
                if (dbError) throw dbError;
            } else {
                const { error: dbError } = await window.supabaseClient
                    .from('cs_coach_certifications')
                    .insert(payload);
                if (dbError) throw dbError;
            }

            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.coachCertifications(coach.id) });
            queryClient.invalidateQueries({ queryKey: ['coach', 'profile'] });
            await onSaved();
            onClose();
        } catch (err) {
            console.error('Save certification error:', err);
            if (err.message?.includes('unique')) {
                setError(t('edit.certificationDuplicate') || 'You already have this certification added');
            } else {
                setError(err.message || 'Failed to save certification');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!isEditing) return;
        if (!confirm(t('edit.confirmDeleteCertification') || 'Are you sure you want to remove this certification?')) return;

        setSaving(true);
        try {
            const { error: dbError } = await window.supabaseClient
                .from('cs_coach_certifications')
                .delete()
                .eq('id', credential.id)
                .eq('coach_id', coach.id);
            if (dbError) throw dbError;

            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.coachCertifications(coach.id) });
            queryClient.invalidateQueries({ queryKey: ['coach', 'profile'] });
            await onSaved();
            onClose();
        } catch (err) {
            console.error('Delete certification error:', err);
            setError(err.message || 'Failed to delete certification');
        } finally {
            setSaving(false);
        }
    };

    return html`
        <div class="edit-modal-overlay" onClick=${handleBackdropClick}>
            <div class="edit-modal-container edit-modal-wide">
                <div class="edit-modal-header">
                    <h3>${isEditing ? (t('edit.editCertification') || 'Edit Certification') : (t('edit.addCertification') || 'Add Certification')}</h3>
                    <button class="edit-modal-close" onClick=${onClose}>✕</button>
                </div>
                <form onSubmit=${handleSubmit}>
                    <div class="edit-modal-content">
                        ${error && html`<div class="edit-error">${error}</div>`}

                        <div class="form-group">
                            <label>${t('edit.certification') || 'Certification'} *</label>
                            <input
                                type="text"
                                value=${searchTerm}
                                onChange=${(e) => setSearchTerm(e.target.value)}
                                placeholder=${t('edit.searchCertifications') || 'Search certifications...'}
                                class="cert-search-input"
                            />
                            <div class="cert-select-list">
                                ${Object.keys(groupedCerts).length > 0 ? Object.entries(groupedCerts).map(([org, certs]) => html`
                                    <div key=${org} class="cert-org-group">
                                        <div class="cert-org-label">${org}</div>
                                        ${certs.map(cert => html`
                                            <div
                                                key=${cert.id}
                                                class="cert-select-option ${parseInt(certificationId) === cert.id ? 'selected' : ''}"
                                                onClick=${() => { setCertificationId(cert.id); setSearchTerm(''); }}
                                            >
                                                ${cert.badge_url && html`<img src=${cert.badge_url} alt="" class="cert-option-badge" />`}
                                                <div class="cert-option-info">
                                                    <span class="cert-option-name">${cert.name}</span>
                                                    ${cert.short_name && html`<span class="cert-option-short">(${cert.short_name})</span>`}
                                                </div>
                                            </div>
                                        `)}
                                    </div>
                                `) : html`
                                    <div class="cert-no-results">${t('edit.noCertificationsFound') || 'No certifications found'}</div>
                                `}
                            </div>
                            ${selectedCert && html`
                                <div class="cert-selected-preview">
                                    ${selectedCert.badge_url && html`<img src=${selectedCert.badge_url} alt="" class="cert-preview-badge" />`}
                                    <div>
                                        <strong>${selectedCert.name}</strong>
                                        <p class="cert-preview-org">${selectedCert.issuing_organization}</p>
                                    </div>
                                </div>
                            `}
                        </div>

                        <div class="form-row">
                            <div class="form-group form-group-flex">
                                <label>${t('edit.dateAcquired') || 'Date Acquired'}</label>
                                <input
                                    type="date"
                                    value=${dateAcquired}
                                    onChange=${(e) => setDateAcquired(e.target.value)}
                                />
                            </div>
                            <div class="form-group form-group-flex">
                                <label>${t('edit.certificateUrl') || 'Certificate URL'}</label>
                                <input
                                    type="url"
                                    value=${certificateUrl}
                                    onChange=${(e) => setCertificateUrl(e.target.value)}
                                    placeholder=${t('edit.certificateUrlPlaceholder') || 'https://... (link to verify)'}
                                />
                            </div>
                        </div>
                    </div>
                    <div class="edit-modal-actions">
                        ${isEditing && html`
                            <button type="button" class="btn-delete" onClick=${handleDelete} disabled=${saving}>
                                ${t('edit.delete') || 'Delete'}
                            </button>
                        `}
                        <div class="edit-modal-actions-right">
                            <button type="button" class="btn-cancel" onClick=${onClose}>
                                ${t('edit.cancel') || 'Cancel'}
                            </button>
                            <button type="submit" class="btn-primary" disabled=${saving}>
                                ${saving ? (t('edit.saving') || 'Saving...') : (isEditing ? (t('edit.save') || 'Save Changes') : (t('edit.add') || 'Add Certification'))}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    `;
});

/**
 * Edit Service Modal Component
 * Used for both adding new and editing existing service items
 * Data is stored in cs_coach_services table
 */
const EditServiceModal = memo(function EditServiceModal({ coach, service, onClose, onSaved }) {
    const isEditing = !!service;
    const [formData, setFormData] = useState({
        name: service?.name || '',
        name_en: service?.name_en || '',
        description: service?.description || '',
        description_en: service?.description_en || '',
        unit: service?.unit || 'hour',
        price: service?.price || '',
        currency: service?.currency || 'EUR',
        active: service?.active !== false
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleBackdropClick = (e) => {
        if (e.target.classList.contains('edit-modal-overlay')) {
            onClose();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        if (!formData.name.trim()) {
            setError(t('edit.serviceNameRequired') || 'Service name is required');
            setSaving(false);
            return;
        }
        if (!formData.price || parseFloat(formData.price) < 0) {
            setError(t('edit.priceRequired') || 'Please enter a valid price');
            setSaving(false);
            return;
        }

        try {
            const payload = {
                coach_id: coach.id,
                name: formData.name.trim(),
                name_en: formData.name_en.trim() || null,
                description: formData.description.trim() || null,
                description_en: formData.description_en.trim() || null,
                unit: formData.unit,
                price: parseFloat(formData.price) || 0,
                currency: formData.currency,
                active: formData.active
            };

            if (isEditing) {
                const { error: dbError } = await window.supabaseClient
                    .from('cs_coach_services')
                    .update(payload)
                    .eq('id', service.id)
                    .eq('coach_id', coach.id);
                if (dbError) throw dbError;
            } else {
                const { error: dbError } = await window.supabaseClient
                    .from('cs_coach_services')
                    .insert(payload);
                if (dbError) throw dbError;
            }

            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.coachServices(coach.id) });
            await onSaved();
            onClose();
        } catch (err) {
            console.error('Save service error:', err);
            setError(err.message || 'Failed to save service');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!isEditing) return;
        if (!confirm(t('edit.confirmDeleteService') || 'Are you sure you want to delete this service?')) return;

        setSaving(true);
        try {
            const { error: dbError } = await window.supabaseClient
                .from('cs_coach_services')
                .delete()
                .eq('id', service.id)
                .eq('coach_id', coach.id);
            if (dbError) throw dbError;

            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.coachServices(coach.id) });
            await onSaved();
            onClose();
        } catch (err) {
            console.error('Delete service error:', err);
            setError(err.message || 'Failed to delete service');
        } finally {
            setSaving(false);
        }
    };

    const unitLabels = {
        hour: t('service.perHour') || '/ hour',
        day: t('service.perDay') || '/ day',
        session: t('service.perSession') || '/ session'
    };

    return html`
        <div class="edit-modal-overlay" onClick=${handleBackdropClick}>
            <div class="edit-modal-container edit-modal-wide">
                <div class="edit-modal-header">
                    <h3>${isEditing ? (t('edit.editService') || 'Edit Service') : (t('edit.addService') || 'Add Service')}</h3>
                    <button class="edit-modal-close" onClick=${onClose}>✕</button>
                </div>
                <form onSubmit=${handleSubmit}>
                    <div class="edit-modal-content">
                        ${error && html`<div class="edit-error">${error}</div>`}

                        <div class="form-row">
                            <div class="form-group form-group-flex">
                                <label>${t('edit.serviceName') || 'Service Name'} *</label>
                                <input
                                    type="text"
                                    value=${formData.name}
                                    onChange=${(e) => handleChange('name', e.target.value)}
                                    placeholder=${t('edit.serviceNamePlaceholder') || 'e.g., Executive Coaching Session'}
                                    required
                                />
                            </div>
                            <div class="form-group form-group-flex">
                                <label>${t('edit.serviceNameEn') || 'Service Name (English)'}</label>
                                <input
                                    type="text"
                                    value=${formData.name_en}
                                    onChange=${(e) => handleChange('name_en', e.target.value)}
                                    placeholder=${t('edit.serviceNameEnPlaceholder') || 'English translation'}
                                />
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group form-group-flex">
                                <label>${t('edit.price') || 'Price'} *</label>
                                <div class="price-input-row">
                                    <input
                                        type="number"
                                        value=${formData.price}
                                        onChange=${(e) => handleChange('price', e.target.value)}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                        required
                                        class="price-input"
                                    />
                                    <select
                                        value=${formData.currency}
                                        onChange=${(e) => handleChange('currency', e.target.value)}
                                        class="currency-select"
                                    >
                                        <option value="EUR">EUR</option>
                                        <option value="USD">USD</option>
                                        <option value="GBP">GBP</option>
                                        <option value="CHF">CHF</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group form-group-flex">
                                <label>${t('edit.unit') || 'Unit'}</label>
                                <select
                                    value=${formData.unit}
                                    onChange=${(e) => handleChange('unit', e.target.value)}
                                >
                                    <option value="hour">${t('edit.perHour') || 'Per Hour'}</option>
                                    <option value="day">${t('edit.perDay') || 'Per Day'}</option>
                                    <option value="session">${t('edit.perSession') || 'Per Session'}</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>${t('edit.description') || 'Description'}</label>
                            <textarea
                                value=${formData.description}
                                onChange=${(e) => handleChange('description', e.target.value)}
                                placeholder=${t('edit.serviceDescriptionPlaceholder') || 'Describe this service...'}
                                rows="3"
                            ></textarea>
                        </div>

                        <div class="form-group">
                            <label>${t('edit.descriptionEn') || 'Description (English)'}</label>
                            <textarea
                                value=${formData.description_en}
                                onChange=${(e) => handleChange('description_en', e.target.value)}
                                placeholder=${t('edit.descriptionEnPlaceholder') || 'English translation of description...'}
                                rows="3"
                            ></textarea>
                        </div>

                        <div class="form-group">
                            <label class="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked=${formData.active}
                                    onChange=${(e) => handleChange('active', e.target.checked)}
                                />
                                <span>${t('edit.serviceActive') || 'Service is active and visible'}</span>
                            </label>
                        </div>
                    </div>
                    <div class="edit-modal-actions">
                        ${isEditing && html`
                            <button type="button" class="btn-delete" onClick=${handleDelete} disabled=${saving}>
                                ${t('edit.delete') || 'Delete'}
                            </button>
                        `}
                        <div class="edit-modal-actions-right">
                            <button type="button" class="btn-cancel" onClick=${onClose}>
                                ${t('edit.cancel') || 'Cancel'}
                            </button>
                            <button type="submit" class="btn-primary" disabled=${saving}>
                                ${saving ? (t('edit.saving') || 'Saving...') : (isEditing ? (t('edit.save') || 'Save Changes') : (t('edit.add') || 'Add Service'))}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    `;
});

/**
 * Profile Services Sidebar Component
 * Shows coach services with pricing in the sidebar
 */
const ProfileServicesSidebar = memo(function ProfileServicesSidebar({ coach, services, isOwnProfile, onAddService, onEditService, onRequestService }) {
    const CURRENCY_SYMBOLS = { EUR: '\u20AC', USD: '$', GBP: '\u00A3', CHF: 'CHF' };
    const UNIT_LABELS = { hour: '/hr', day: '/day', session: '/session' };

    return html`
        <section class="sidebar-section profile-services-sidebar">
            <div class="sidebar-header-editable">
                <h3 class="sidebar-title">${t('coach.servicesOf') || 'Services of'} ${coach.full_name}</h3>
                ${isOwnProfile && html`
                    <button class="btn-add-sidebar" onClick=${onAddService} title="Add service">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                `}
            </div>
            ${services.length > 0 ? html`
                <div class="services-list">
                    ${services.filter(s => s.active || isOwnProfile).map(svc => html`
                        <div key=${svc.id} class="service-line-item ${isOwnProfile ? 'editable' : ''} ${!svc.active ? 'inactive' : ''}">
                            <div class="service-line-main">
                                <div class="service-line-info">
                                    <span class="service-line-name">${svc.name}${!svc.active ? ' (inactive)' : ''}</span>
                                    <span class="service-line-price">${CURRENCY_SYMBOLS[svc.currency] || svc.currency}${parseFloat(svc.price).toFixed(0)}${UNIT_LABELS[svc.unit] || ''}</span>
                                </div>
                                ${isOwnProfile ? html`
                                    <button class="btn-edit-service" onClick=${() => onEditService(svc)} title="Edit service">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                    </button>
                                ` : html`
                                    <button class="btn-request-service" onClick=${() => onRequestService && onRequestService(svc)}>
                                        ${t('service.request') || 'Request'}
                                    </button>
                                `}
                            </div>
                            ${svc.description && html`
                                <p class="service-line-description">${svc.description}</p>
                            `}
                        </div>
                    `)}
                </div>
            ` : html`
                ${isOwnProfile ? html`
                    <div class="empty-services-prompt" onClick=${onAddService}>
                        <span class="empty-icon">+</span>
                        <p>${t('coach.addServices') || 'Add your coaching services'}</p>
                    </div>
                ` : html`
                    <p class="no-services-text">${t('coach.noServicesYet') || 'No services listed yet.'}</p>
                `}
            `}
        </section>
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
    const { certifications: certificationsLookup } = useCertifications();

    const [coach, setCoach] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [articles, setArticles] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [credentials, setCredentials] = useState([]);
    const [experiences, setExperiences] = useState([]);
    const [educations, setEducations] = useState([]);
    const [similarCoaches, setSimilarCoaches] = useState([]);
    const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [pendingAuthAction, setPendingAuthAction] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState(null); // null, 'pending', 'granted', 'denied'
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
    const [editingExperience, setEditingExperience] = useState(null); // null=closed, 'new'=add new, object=edit existing
    const [editingEducation, setEditingEducation] = useState(null); // null=closed, 'new'=add new, object=edit existing
    const [coachSkills, setCoachSkills] = useState([]); // skills from cs_coach_skills table
    const [editingSkill, setEditingSkill] = useState(null); // null=closed, 'new'=add new, object=edit existing
    const [volunteering, setVolunteering] = useState([]);
    const [editingVolunteering, setEditingVolunteering] = useState(null);
    const [publications, setPublications] = useState([]);
    const [editingPublication, setEditingPublication] = useState(null);
    const [coachServices, setCoachServices] = useState([]);
    const [editingService, setEditingService] = useState(null);
    const [editingCertification, setEditingCertification] = useState(null);
    const [showPhotoEditor, setShowPhotoEditor] = useState(false);
    const [showCoachProfileEditor, setShowCoachProfileEditor] = useState(false);
    const [requestingService, setRequestingService] = useState(null); // service object for request modal

    // Feed posts on profile
    const [highlightedPosts, setHighlightedPosts] = useState([]);
    const [activityPosts, setActivityPosts] = useState([]);
    const [activityPostsPage, setActivityPostsPage] = useState(0);
    const [hasMoreActivityPosts, setHasMoreActivityPosts] = useState(false);
    const [loadingMorePosts, setLoadingMorePosts] = useState(false);

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
                // Fetch coach profile through TanStack Query cache
                const qKey = isUUID(identifier)
                    ? QUERY_KEYS.coachById(identifier)
                    : QUERY_KEYS.coachBySlug(identifier);

                const data = await cachedFetch(qKey, async () => {
                    const field = isUUID(identifier) ? 'id' : 'slug';
                    const { data: d, error } = await window.supabaseClient
                        .from('cs_coaches')
                        .select('*, cs_coach_certifications(*, cs_certifications(*))')
                        .eq(field, identifier)
                        .single();
                    if (error) throw error;
                    if (!d) throw new Error('Coach not found');
                    return d;
                }, STALE_TIMES.coachProfile);

                setCoach(data);

                await Promise.all([
                    loadArticles(data.id),
                    loadReviews(data.id),
                    loadCredentials(data.id),
                    loadExperiences(data.id),
                    loadEducations(data.id),
                    loadCoachSkills(data.id),
                    loadVolunteering(data.id),
                    loadPublications(data.id),
                    loadCoachServices(data.id),
                    loadSimilarCoaches(data),
                    checkUserHasReviewed(data.id),
                    loadHighlightedPosts(data.user_id),
                    loadActivityPosts(data.user_id, 0),
                ]);
            }
        } catch (err) {
            console.error('Failed to load coach:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Load highlighted posts for this coach's user_id
    const loadHighlightedPosts = async (userId) => {
        try {
            const supabase = window.supabaseClient;
            if (!supabase) return;

            // Get post IDs that this user highlighted
            const { data: highlights } = await supabase
                .from('cs_post_highlights')
                .select('post_id')
                .eq('user_id', userId)
                .order('highlighted_at', { ascending: false });

            if (!highlights || highlights.length === 0) {
                setHighlightedPosts([]);
                return;
            }

            const postIds = highlights.map(h => h.post_id);
            const { data: posts } = await supabase
                .from('cs_posts')
                .select('*')
                .in('id', postIds);

            if (posts) {
                // Preserve highlight order
                const postMap = {};
                posts.forEach(p => { postMap[p.id] = p; });
                const ordered = postIds.map(id => postMap[id]).filter(Boolean);

                // Mark as highlighted and check likes/reposts for current viewer
                if (session?.user?.id) {
                    const [likesRes, highlightsRes, repostsRes] = await Promise.all([
                        supabase.from('cs_post_likes').select('post_id').eq('user_id', session.user.id).in('post_id', postIds),
                        supabase.from('cs_post_highlights').select('post_id').eq('user_id', session.user.id).in('post_id', postIds),
                        supabase.from('cs_post_reposts').select('post_id').eq('user_id', session.user.id).in('post_id', postIds),
                    ]);
                    const likedSet = new Set((likesRes.data || []).map(l => l.post_id));
                    const highlightedSet = new Set((highlightsRes.data || []).map(h => h.post_id));
                    const repostedSet = new Set((repostsRes.data || []).map(r => r.post_id));
                    ordered.forEach(p => {
                        p._userLiked = likedSet.has(p.id);
                        p._userHighlighted = highlightedSet.has(p.id);
                        p._userReposted = repostedSet.has(p.id);
                    });
                } else {
                    ordered.forEach(p => { p._userHighlighted = true; }); // They are all highlighted by the coach
                }

                setHighlightedPosts(ordered);
            }
        } catch (err) {
            console.error('Failed to load highlighted posts:', err);
        }
    };

    // Load activity posts (own posts + reposts + comments + likes) using user_id
    const ACTIVITY_PAGE_SIZE = 3;
    const loadActivityPosts = async (userId, page) => {
        try {
            const supabase = window.supabaseClient;
            if (!supabase) return;

            const offset = page * ACTIVITY_PAGE_SIZE;
            const fetchSize = ACTIVITY_PAGE_SIZE * 2; // Fetch extra to account for dedup

            const [ownPostsRes, repostsRes, commentsRes, likesRes] = await Promise.all([
                supabase.from('cs_posts').select('*').eq('user_id', userId)
                    .order('created_at', { ascending: false }).range(offset, offset + fetchSize - 1),
                supabase.from('cs_post_reposts').select('post_id, created_at, cs_posts(*)').eq('user_id', userId)
                    .order('created_at', { ascending: false }).range(offset, offset + fetchSize - 1),
                supabase.from('cs_post_comments').select('post_id, created_at, cs_posts(*)').eq('user_id', userId)
                    .order('created_at', { ascending: false }).range(offset, offset + fetchSize * 2 - 1),
                supabase.from('cs_post_likes').select('post_id, created_at, cs_posts(*)').eq('user_id', userId)
                    .order('created_at', { ascending: false }).range(offset, offset + fetchSize - 1),
            ]);

            // Build activity items with priority dedup: posted > reposted > commented > liked
            const activityByPost = new Map();
            const PRIORITY = { posted: 4, reposted: 3, commented: 2, liked: 1 };

            const addActivity = (postId, post, activityType, activityTime) => {
                if (!post) return;
                const existing = activityByPost.get(postId);
                if (!existing || PRIORITY[activityType] > PRIORITY[existing.activityType]) {
                    activityByPost.set(postId, { post, activityType, activityTime });
                } else if (existing && PRIORITY[activityType] === PRIORITY[existing.activityType]) {
                    if (new Date(activityTime) > new Date(existing.activityTime)) {
                        existing.activityTime = activityTime;
                    }
                }
            };

            (ownPostsRes.data || []).forEach(post => {
                addActivity(post.id, post, 'posted', post.created_at);
            });
            (repostsRes.data || []).forEach(r => {
                if (r.cs_posts) addActivity(r.post_id, r.cs_posts, 'reposted', r.created_at);
            });
            const commentTimeByPost = new Map();
            (commentsRes.data || []).forEach(c => {
                if (c.cs_posts) {
                    const existing = commentTimeByPost.get(c.post_id);
                    if (!existing || new Date(c.created_at) > new Date(existing)) {
                        commentTimeByPost.set(c.post_id, c.created_at);
                    }
                    addActivity(c.post_id, c.cs_posts, 'commented', commentTimeByPost.get(c.post_id));
                }
            });
            (likesRes.data || []).forEach(l => {
                if (l.cs_posts) addActivity(l.post_id, l.cs_posts, 'liked', l.created_at);
            });

            let activityItems = Array.from(activityByPost.values());
            activityItems.sort((a, b) => new Date(b.activityTime) - new Date(a.activityTime));
            activityItems = activityItems.slice(0, ACTIVITY_PAGE_SIZE);

            // Enrich with current viewer's interaction status
            if (session?.user?.id && activityItems.length > 0) {
                const postIds = activityItems.map(a => a.post.id);
                const [uLikes, uHighlights, uReposts] = await Promise.all([
                    supabase.from('cs_post_likes').select('post_id').eq('user_id', session.user.id).in('post_id', postIds),
                    supabase.from('cs_post_highlights').select('post_id').eq('user_id', session.user.id).in('post_id', postIds),
                    supabase.from('cs_post_reposts').select('post_id').eq('user_id', session.user.id).in('post_id', postIds),
                ]);
                const likedSet = new Set((uLikes.data || []).map(l => l.post_id));
                const highlightedSet = new Set((uHighlights.data || []).map(h => h.post_id));
                const repostedSet = new Set((uReposts.data || []).map(r => r.post_id));
                activityItems.forEach(a => {
                    a.post._userLiked = likedSet.has(a.post.id);
                    a.post._userHighlighted = highlightedSet.has(a.post.id);
                    a.post._userReposted = repostedSet.has(a.post.id);
                });
            }

            if (page === 0) {
                setActivityPosts(activityItems);
            } else {
                setActivityPosts(prev => [...prev, ...activityItems]);
            }
            setHasMoreActivityPosts(activityItems.length >= ACTIVITY_PAGE_SIZE);
            setActivityPostsPage(page);
        } catch (err) {
            console.error('Failed to load activity posts:', err);
        }
    };

    const handleLoadMoreActivityPosts = async () => {
        if (!coach?.user_id || loadingMorePosts) return;
        setLoadingMorePosts(true);
        await loadActivityPosts(coach.user_id, activityPostsPage + 1);
        setLoadingMorePosts(false);
    };

    // Handle highlight toggle from FeedPost on the profile page
    const handleHighlightToggle = (postId, isHighlighted) => {
        if (!isHighlighted) {
            // Remove from highlighted posts list
            setHighlightedPosts(prev => prev.filter(p => p.id !== postId));
        }
    };

    const loadArticles = async (id) => {
        try {
            const data = await cachedFetch(QUERY_KEYS.coachArticles(id), async () => {
                const { data: d, error } = await window.supabaseClient
                    .from('cs_articles').select('*')
                    .eq('coach_id', id).eq('status', 'published')
                    .order('created_at', { ascending: false }).limit(10);
                if (error) throw error;
                return d || [];
            }, STALE_TIMES.coachArticles);
            setArticles(data);
        } catch (err) {
            console.error('Failed to load articles:', err);
        }
    };

    const loadReviews = async (id) => {
        try {
            const data = await cachedFetch(QUERY_KEYS.coachReviews(id), async () => {
                const { data: d, error } = await window.supabaseClient
                    .from('cs_reviews').select('*')
                    .eq('coach_id', id)
                    .order('created_at', { ascending: false });
                if (error) throw error;
                return d || [];
            }, STALE_TIMES.coachReviews);
            setReviews(data);
        } catch (err) {
            console.error('Failed to load reviews:', err);
        }
    };

    const loadCredentials = async (id) => {
        try {
            const data = await cachedFetch(QUERY_KEYS.coachCertifications(id), async () => {
                const { data: d, error } = await window.supabaseClient
                    .from('v_coach_certifications').select('*')
                    .eq('coach_id', id)
                    .order('is_verified', { ascending: false });
                if (error) throw error;
                return d || [];
            }, STALE_TIMES.coachCertifications);
            setCredentials(data);
        } catch (err) {
            console.error('Failed to load credentials:', err);
        }
    };

    const loadExperiences = async (id) => {
        try {
            const data = await cachedFetch(QUERY_KEYS.coachExperiences(id), async () => {
                const { data: d, error } = await window.supabaseClient
                    .from('cs_coach_experiences').select('*')
                    .eq('coach_id', id)
                    .order('start_date', { ascending: false });
                if (error) throw error;
                return d || [];
            }, STALE_TIMES.coachExperiences);
            setExperiences(data);
        } catch (err) {
            console.error('Failed to load experiences:', err);
        }
    };

    const loadEducations = async (id) => {
        try {
            const data = await cachedFetch(QUERY_KEYS.coachEducations(id), async () => {
                const { data: d, error } = await window.supabaseClient
                    .from('cs_coach_educations').select('*')
                    .eq('coach_id', id)
                    .order('start_date', { ascending: false });
                if (error) throw error;
                return d || [];
            }, STALE_TIMES.coachEducations);
            setEducations(data);
        } catch (err) {
            console.error('Failed to load educations:', err);
        }
    };

    const loadCoachSkills = async (id) => {
        try {
            const data = await cachedFetch(QUERY_KEYS.coachSkills(id), async () => {
                const { data: d, error } = await window.supabaseClient
                    .from('cs_coach_skills')
                    .select('*, cs_coach_skills_commendations(id, commendation_user_id)')
                    .eq('coach_id', id)
                    .order('created_at', { ascending: true });
                if (error) throw error;
                return d || [];
            }, STALE_TIMES.coachSkills);
            setCoachSkills(data);
        } catch (err) {
            console.error('Failed to load coach skills:', err);
        }
    };

    const loadVolunteering = async (id) => {
        try {
            const data = await cachedFetch(QUERY_KEYS.coachVolunteering(id), async () => {
                const { data: d, error } = await window.supabaseClient
                    .from('cs_coach_volunteering').select('*')
                    .eq('coach_id', id)
                    .order('start_date', { ascending: false });
                if (error) throw error;
                return d || [];
            }, STALE_TIMES.coachVolunteering);
            setVolunteering(data);
        } catch (err) {
            console.error('Failed to load volunteering:', err);
        }
    };

    const loadPublications = async (id) => {
        try {
            const data = await cachedFetch(QUERY_KEYS.coachPublications(id), async () => {
                const { data: d, error } = await window.supabaseClient
                    .from('cs_coach_publications').select('*')
                    .eq('coach_id', id)
                    .order('publication_date', { ascending: false });
                if (error) throw error;
                return d || [];
            }, STALE_TIMES.coachPublications);
            setPublications(data);
        } catch (err) {
            console.error('Failed to load publications:', err);
        }
    };

    const loadCoachServices = async (id) => {
        try {
            const data = await cachedFetch(QUERY_KEYS.coachServices(id), async () => {
                const { data: d, error } = await window.supabaseClient
                    .from('cs_coach_services').select('*')
                    .eq('coach_id', id)
                    .order('created_at', { ascending: true });
                if (error) throw error;
                return d || [];
            }, STALE_TIMES.coachServices);
            setCoachServices(data);
        } catch (err) {
            console.error('Failed to load coach services:', err);
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

        // Invalidate TanStack Query cache so next visit re-fetches
        queryClient.invalidateQueries({ queryKey: ['coach', 'profile'] });

        return data;
    };

    // Load viewers also viewed when viewing own profile
    useEffect(() => {
        if (coach && session?.user?.id && coach.user_id === session.user.id) {
            loadViewersAlsoViewed(coach);
        }
    }, [coach, session]);

    // Check existing connection status (must be before early returns to follow Rules of Hooks)
    useEffect(() => {
        const isOwn = session?.user?.id && coach?.user_id && session.user.id === coach.user_id;
        if (!session?.user?.id || !coach?.user_id || isOwn) return;
        const checkConnection = async () => {
            const supabase = window.supabaseClient;
            if (!supabase) return;
            try {
                const { data } = await supabase
                    .from('cs_connections')
                    .select('status')
                    .eq('user_id', session.user.id)
                    .eq('coach_id', coach.user_id)
                    .single();
                if (data) setConnectionStatus(data.status);
            } catch {
                // No existing connection
            }
        };
        checkConnection();
    }, [session?.user?.id, coach?.user_id]);

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
                .eq('user_id', session.user.id)
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
            return { success: false, error: t('review.cannotReviewSelf') || 'You cannot recommend yourself' };
        }

        try {
            // Ensure user exists in cs_users (may be missing if created before trigger)
            await window.supabaseClient
                .from('cs_users')
                .upsert({ id: session.user.id, email: session.user.email || '' }, { onConflict: 'id', ignoreDuplicates: true });

            const { data, error } = await window.supabaseClient
                .from('cs_reviews')
                .insert({
                    coach_id: coach.id,
                    user_id: session.user.id,
                    rating: reviewData.rating,
                    text: reviewData.content,
                    reviewer_name: reviewData.name || null
                })
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    return { success: false, error: t('review.alreadyReviewed') || 'You have already recommended this coach' };
                }
                throw error;
            }

            setUserHasReviewed(true);
            setUserExistingReview(data);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.coachReviews(coach.id) });
            queryClient.invalidateQueries({ queryKey: ['coach', 'profile'] });
            await loadReviews(coach.id);

            return { success: true, data };
        } catch (err) {
            console.error('Failed to submit review:', err);
            return { success: false, error: err.message || 'Failed to submit recommendation' };
        }
    };

    // D.1: Toggle review visibility (own profile)
    const handleToggleReviewShown = async (reviewId, currentShown) => {
        try {
            const newShown = !currentShown;
            await window.supabaseClient
                .from('cs_reviews')
                .update({ shown: newShown })
                .eq('id', reviewId);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.coachReviews(coach.id) });
            setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, shown: newShown } : r));
        } catch (err) {
            console.error('Failed to toggle review visibility:', err);
        }
    };

    // D.3: Add or update coach comment on a review
    const handleSaveCoachComment = async (reviewId, commentText) => {
        try {
            await window.supabaseClient
                .from('cs_reviews')
                .update({ comment: commentText.trim() || null })
                .eq('id', reviewId);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.coachReviews(coach.id) });
            setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, comment: commentText.trim() || null } : r));
        } catch (err) {
            console.error('Failed to save coach comment:', err);
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

    // Compute rating from loaded reviews for accuracy (matching ProfileCoachCard's live data approach)
    const rating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
        : (coach.rating_average || coach.rating || 0);
    const reviewsCount = reviews.length > 0 ? reviews.length : (coach.rating_count || 0);
    const videoUrl = coach.intro_video_url || coach.video_url;
    const hasVideo = !!videoUrl;

    // Check if this is the user's own profile
    const isOwnProfile = session?.user?.id && coach.user_id && session.user.id === coach.user_id;

    // Handle connect button click
    const handleConnectClick = async () => {
        if (!session) {
            setPendingAuthAction('connect');
            setShowAuthModal(true);
            return;
        }
        const supabase = window.supabaseClient;
        if (!supabase) return;
        try {
            const { error } = await supabase
                .from('cs_connections')
                .insert({
                    user_id: session.user.id,
                    coach_id: coach.user_id,
                    status: 'pending'
                });
            if (!error) {
                setConnectionStatus('pending');
            }
        } catch (err) {
            console.error('Connection error:', err);
        }
    };

    // Handle discovery button click - check auth status first
    const handleDiscoveryClick = () => {
        if (session) {
            setShowDiscoveryModal(true);
        } else {
            setPendingAuthAction('discovery');
            setShowAuthModal(true);
        }
    };

    // Handle write review click - check auth status first
    const handleWriteReviewClick = () => {
        if (session) {
            setShowReviewModal(true);
        } else {
            setPendingAuthAction('review');
            setShowAuthModal(true);
        }
    };

    // Handle successful auth - close auth modal and open the pending modal
    const handleAuthSuccess = () => {
        setShowAuthModal(false);
        if (pendingAuthAction === 'connect') {
            // After auth, trigger the connect action
            handleConnectClick();
        } else if (pendingAuthAction === 'review') {
            setShowReviewModal(true);
        } else {
            setShowDiscoveryModal(true);
        }
        setPendingAuthAction(null);
    };

    // Handle skill commendation toggle
    const handleCommendSkill = async (skillId) => {
        if (!session) return;
        const userId = session.user.id;
        const skill = coachSkills.find(s => s.id === skillId);
        if (!skill) return;

        const existing = (skill.cs_coach_skills_commendations || []).find(c => c.commendation_user_id === userId);

        try {
            if (existing) {
                // Remove commendation
                await window.supabaseClient
                    .from('cs_coach_skills_commendations')
                    .delete()
                    .eq('id', existing.id);
            } else {
                // Add commendation
                await window.supabaseClient
                    .from('cs_coach_skills_commendations')
                    .insert({ coach_skill_id: skillId, commendation_user_id: userId });
            }
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.coachSkills(coach.id) });
            await loadCoachSkills(coach.id);
        } catch (err) {
            console.error('Commendation error:', err);
        }
    };

    // Handle edit section clicks - open inline edit modal
    const handleEditSection = (sectionName) => {
        // Sections that can be edited inline
        const inlineEditableSections = ['name', 'title', 'about', 'languages', 'hourly_rate'];

        if (sectionName === 'banner') {
            setShowBannerEditor(true);
        } else if (sectionName === 'photo') {
            setShowPhotoEditor(true);
        } else if (sectionName === 'coach-profile') {
            setShowCoachProfileEditor(true);
        } else if (inlineEditableSections.includes(sectionName)) {
            setEditingSection(sectionName);
        } else {
            // For complex sections (photo, video, certifications, featured), navigate to edit page
            window.navigateTo(`/profile/edit?section=${sectionName}`);
        }
    };

    // Check if there are other visible sections besides recommendations-ratings
    const hasActivityContent = activityPosts.length > 0 || hasVideo;
    const hasOtherVisibleSections = highlightedPosts.length > 0 || // featured/highlights
        hasActivityContent || // activity
        experiences.length > 0 || isOwnProfile || // experience
        educations.length > 0 || isOwnProfile || // education
        credentials.length > 0 || isOwnProfile || // certifications
        coachSkills.length > 0 || isOwnProfile || // skills
        volunteering.length > 0 || isOwnProfile || // volunteering
        publications.length > 0 || isOwnProfile; // publications

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
                                onDiscoveryCall=${handleDiscoveryClick}
                                onVideoClick=${() => setShowVideoPopup(true)}
                                onWriteReview=${handleWriteReviewClick}
                                onConnect=${handleConnectClick}
                                connectionStatus=${connectionStatus}
                                session=${session}
                                isOwnProfile=${isOwnProfile}
                                onEditSection=${handleEditSection}
                                hasOtherVisibleSections=${hasOtherVisibleSections}
                            />
                        </section>

                        <!-- Featured / Highlighted Posts Section -->
                        ${highlightedPosts.length > 0 && html`
                            <section class="profile-section featured-section">
                                <div class="section-header-editable">
                                    <h2 class="section-title">
                                        <span class="section-icon">⭐</span>
                                        ${t('coach.highlights') || 'Highlights'}
                                    </h2>
                                </div>
                                <div class="profile-feed-posts">
                                    ${highlightedPosts.map(post => html`
                                        <${FeedPost}
                                            key=${post.id}
                                            post=${post}
                                            session=${session}
                                            onHighlightToggle=${isOwnProfile ? handleHighlightToggle : null}
                                        />
                                    `)}
                                </div>
                            </section>
                        `}

                        <!-- Activity Section - coach's own posts -->
                        ${hasActivityContent && html`
                            <section class="profile-section activity-section">
                                <div class="section-header-editable">
                                    <h2 class="section-title">
                                        <span class="section-icon">📊</span>
                                        ${t('coach.activity') || 'Activity'}
                                    </h2>
                                </div>

                                <div class="activity-content">
                                
                                    <!-- Feed Posts -->
                                    ${activityPosts.length > 0 && html`
                                        <div class="profile-feed-posts">
                                            ${activityPosts.map(item => {
                                                const post = item.post || item;
                                                const activityType = item.activityType || 'posted';
                                                return html`
                                                    <div key=${post.id + '-' + activityType} class="coach-activity-item">
                                                        ${activityType !== 'posted' && html`
                                                            <div class="client-activity-label client-activity-${activityType}">
                                                                ${activityType === 'liked' && html`
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                                                                `}
                                                                ${activityType === 'reposted' && html`
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 1l4 4-4 4"></path><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><path d="M7 23l-4-4 4-4"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
                                                                `}
                                                                ${activityType === 'commented' && html`
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                                                `}
                                                                <span>${activityType === 'liked' ? (t('client.activityLiked') || 'Liked')
                                                                    : activityType === 'reposted' ? (t('client.activityReposted') || 'Reposted')
                                                                    : (t('client.activityCommented') || 'Commented on')}</span>
                                                            </div>
                                                        `}
                                                        <${FeedPost} post=${post} session=${session} />
                                                    </div>
                                                `;
                                            })}
                                        </div>
                                        ${hasMoreActivityPosts && html`
                                            <button class="btn-show-more-posts" onClick=${handleLoadMoreActivityPosts} disabled=${loadingMorePosts}>
                                                ${loadingMorePosts
                                                    ? (t('feed.loading') || 'Loading...')
                                                    : (t('coach.showMorePosts') || 'Show more posts')}
                                            </button>
                                        `}
                                    `}
                                </div>
                            </section>
                        `}

                        <!-- Recommendations & Ratings Section - only show when there are ratings -->
                        ${reviews.length > 0 && html`
                            <section id="recommendations-ratings-section" class="profile-section rating-section">
                                <div class="section-header-editable">
                                    <h2 class="section-title">
                                        <span class="section-icon">⭐</span>
                                        ${t('coach.recommendationsRatings') || 'Recommendations & Ratings'}
                                    </h2>
                                    <div class="section-header-rating">
                                        <span class="big-number">${rating.toFixed(1)}</span>
                                        <div class="rating-stars-compact">
                                            ${[1,2,3,4,5].map(star => html`
                                                <span key=${star} class="star-compact ${star <= Math.round(rating) ? 'filled' : ''}">★</span>
                                            `)}
                                        </div>
                                    </div>
                                </div>
                                ${isOwnProfile && html`
                                    <div class="review-visibility-hint">
                                        <span class="hint-icon">ℹ️</span>
                                        ${t('coach.reviewVisibilityHint') || 'Only recommendations that are toggled ON are visible to visitors.'}
                                    </div>
                                `}
                                <div class="ratings-overview">
                                    ${reviews.length >= 3 && html`
                                        <div class="ratings-summary">
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
                                        </div>
                                    `}
                                    <div class="ratings-reviews-list">
                                        ${(() => {
                                            // D.2: For visitors, show only shown=true reviews (max 5)
                                            // For own profile, show all reviews (coach can see and toggle)
                                            const visibleReviews = isOwnProfile
                                                ? reviews
                                                : reviews.filter(r => r.shown !== false);
                                            const displayReviews = isOwnProfile ? visibleReviews : visibleReviews.slice(0, 5);
                                            const hasMore = !isOwnProfile && visibleReviews.length > 5;

                                            return html`
                                                ${displayReviews.map(review => html`
                                                    <${ReviewItem}
                                                        key=${review.id}
                                                        review=${review}
                                                        isOwnProfile=${isOwnProfile}
                                                        coachName=${coach.full_name}
                                                        onToggleShown=${handleToggleReviewShown}
                                                        onSaveComment=${handleSaveCoachComment}
                                                    />
                                                `)}
                                                ${hasMore && html`
                                                    <button class="btn-show-all" onClick=${() => setShowReviewsPopup(true)}>
                                                        ${t('coach.showAllReviews') || 'Show all recommendations'} (${visibleReviews.length}) →
                                                    </button>
                                                `}
                                            `;
                                        })()}
                                    </div>
                                </div>
                            </section>
                        `}

                        <!-- Experience Section -->
                        ${(experiences.length > 0 || isOwnProfile) && html`
                            <section class="profile-section experience-section">
                                <div class="section-header-editable">
                                    <h2 class="section-title">
                                        <span class="section-icon">💼</span>
                                        ${t('coach.experience') || 'Experience'}
                                    </h2>
                                    ${isOwnProfile && html`
                                        <button class="btn-add-section" onClick=${() => setEditingExperience('new')} title="Add experience">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                            </svg>
                                        </button>
                                    `}
                                </div>
                                ${experiences.length > 0 ? html`
                                    <div class="experience-content">
                                        ${experiences.map(exp => html`
                                            <div key=${exp.id} class="experience-item ${isOwnProfile ? 'editable' : ''}" onClick=${isOwnProfile ? () => setEditingExperience(exp) : null}>
                                                <div class="exp-header">
                                                    <h4 class="exp-title">${exp.title}</h4>
                                                    <div class="exp-meta">
                                                        <span class="exp-organization">${exp.organization}</span>
                                                        ${exp.employment_type && html`<span class="exp-type">${exp.employment_type}</span>`}
                                                    </div>
                                                    <div class="exp-dates">
                                                        <span>${new Date(exp.start_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                                                        <span> - </span>
                                                        <span>${exp.end_date ? new Date(exp.end_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : (t('coach.present') || 'Present')}</span>
                                                        ${exp.location && html` · <span class="exp-location">${exp.location}</span>`}
                                                    </div>
                                                </div>
                                                ${exp.description && html`<p class="exp-description">${exp.description}</p>`}
                                                ${isOwnProfile && html`
                                                    <span class="exp-edit-icon">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                        </svg>
                                                    </span>
                                                `}
                                            </div>
                                        `)}
                                    </div>
                                ` : html`
                                    <div class="empty-section-prompt" onClick=${() => setEditingExperience('new')}>
                                        <span class="empty-icon">+</span>
                                        <p>${t('coach.addExperience') || 'Add your professional experience'}</p>
                                    </div>
                                `}
                            </section>
                        `}

                        <!-- Education Section -->
                        ${(educations.length > 0 || isOwnProfile) && html`
                            <section class="profile-section education-section">
                                <div class="section-header-editable">
                                    <h2 class="section-title">
                                        <span class="section-icon">🎓</span>
                                        ${t('coach.education') || 'Education'}
                                    </h2>
                                    ${isOwnProfile && html`
                                        <button class="btn-add-section" onClick=${() => setEditingEducation('new')} title="Add education">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                            </svg>
                                        </button>
                                    `}
                                </div>
                                ${educations.length > 0 ? html`
                                    <div class="education-content">
                                        ${educations.map(edu => html`
                                            <div key=${edu.id} class="education-item ${isOwnProfile ? 'editable' : ''}" onClick=${isOwnProfile ? () => setEditingEducation(edu) : null}>
                                                <div class="edu-header">
                                                    <h4 class="edu-degree">${edu.degree ? `${edu.degree}, ${edu.field_of_study}` : edu.field_of_study}</h4>
                                                    <p class="edu-institution">${edu.institute}</p>
                                                    <div class="edu-dates">
                                                        <span>${new Date(edu.start_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                                                        <span> - </span>
                                                        <span>${edu.end_date ? new Date(edu.end_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : (t('coach.present') || 'Present')}</span>
                                                        ${edu.location && html` · <span class="edu-location">${edu.location}</span>`}
                                                    </div>
                                                </div>
                                                ${edu.description && html`<p class="edu-description">${edu.description}</p>`}
                                                ${isOwnProfile && html`
                                                    <span class="edu-edit-icon">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                        </svg>
                                                    </span>
                                                `}
                                            </div>
                                        `)}
                                    </div>
                                ` : html`
                                    <div class="empty-section-prompt" onClick=${() => setEditingEducation('new')}>
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
                                        <button class="btn-add-section" onClick=${() => setEditingCertification('new')} title="Add certification">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                            </svg>
                                        </button>
                                    `}
                                </div>
                                ${credentials.length > 0 ? html`
                                    <div class="certifications-list">
                                        ${credentials.map(cred => html`
                                            <div key=${cred.id} class="certification-item ${isOwnProfile ? 'editable' : ''}" onClick=${isOwnProfile ? () => setEditingCertification(cred) : null}>
                                                ${cred.badge_url && html`
                                                    <img src=${cred.badge_url} alt=${cred.certification_name || cred.name} class="cert-badge" />
                                                `}
                                                <div class="cert-info">
                                                    <h4 class="cert-name">${cred.certification_name || cred.name}</h4>
                                                    ${(cred.issuing_organization || cred.issuing_org) && html`<p class="cert-org">${cred.issuing_organization || cred.issuing_org}</p>`}
                                                    ${cred.date_acquired && html`<p class="cert-date">${new Date(cred.date_acquired).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</p>`}
                                                    ${cred.is_verified && html`<span class="cert-verified">✓ Verified</span>`}
                                                </div>
                                                ${isOwnProfile && html`
                                                    <span class="cert-edit-icon">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                        </svg>
                                                    </span>
                                                `}
                                            </div>
                                        `)}
                                    </div>
                                ` : html`
                                    <div class="empty-section-prompt" onClick=${() => setEditingCertification('new')}>
                                        <span class="empty-icon">+</span>
                                        <p>${t('coach.addCertifications') || 'Add your certifications and credentials'}</p>
                                    </div>
                                `}
                            </section>
                        `}

                        <!-- Skills Section -->
                        ${(coachSkills.length > 0 || isOwnProfile) && html`
                            <section class="profile-section skills-section">
                                <div class="section-header-editable">
                                    <h2 class="section-title">
                                        <span class="section-icon">🛠️</span>
                                        ${t('coach.skills') || 'Skills'}
                                    </h2>
                                    ${isOwnProfile && html`
                                        <button class="btn-add-section" onClick=${() => setEditingSkill('new')} title="Add skill">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                            </svg>
                                        </button>
                                    `}
                                </div>
                                ${coachSkills.length > 0 ? html`
                                    <div class="skills-list">
                                        ${coachSkills.map(sk => html`
                                            <div key=${sk.id} class="skill-item ${isOwnProfile ? 'editable' : ''}">
                                                <span class="skill-tag ${isOwnProfile ? 'clickable' : ''}" onClick=${isOwnProfile ? () => setEditingSkill(sk) : null}>
                                                    ${sk.skill}
                                                </span>
                                                ${!isOwnProfile && session && html`
                                                    <button
                                                        class="btn-commend ${(sk.cs_coach_skills_commendations || []).find(c => c.commendation_user_id === session.user.id) ? 'commended' : ''}"
                                                        onClick=${() => handleCommendSkill(sk.id)}
                                                        title=${(sk.cs_coach_skills_commendations || []).find(c => c.commendation_user_id === session.user.id) ? 'Remove endorsement' : 'Endorse this skill'}
                                                    >
                                                        👍
                                                    </button>
                                                `}
                                                ${(sk.cs_coach_skills_commendations || []).length > 0 && html`
                                                    <span class="commendation-count">${(sk.cs_coach_skills_commendations || []).length}</span>
                                                `}
                                            </div>
                                        `)}
                                    </div>
                                ` : html`
                                    <div class="empty-section-prompt" onClick=${() => setEditingSkill('new')}>
                                        <span class="empty-icon">+</span>
                                        <p>${t('coach.addSkills') || 'Add your coaching skills'}</p>
                                    </div>
                                `}
                            </section>
                        `}

                        <!-- Volunteering Section -->
                        ${(volunteering.length > 0 || isOwnProfile) && html`
                            <section class="profile-section volunteering-section">
                                <div class="section-header-editable">
                                    <h2 class="section-title">
                                        <span class="section-icon">🤝</span>
                                        ${t('coach.volunteering') || 'Volunteering'}
                                    </h2>
                                    ${isOwnProfile && html`
                                        <button class="btn-add-section" onClick=${() => setEditingVolunteering('new')} title="Add volunteering">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                            </svg>
                                        </button>
                                    `}
                                </div>
                                ${volunteering.length > 0 ? html`
                                    <div class="volunteering-content">
                                        ${volunteering.map(vol => html`
                                            <div key=${vol.id} class="volunteering-item ${isOwnProfile ? 'editable' : ''}" onClick=${isOwnProfile ? () => setEditingVolunteering(vol) : null}>
                                                <div class="vol-header">
                                                    <h4 class="vol-title">${vol.title}</h4>
                                                    <p class="vol-organization">${vol.organization}</p>
                                                    <div class="vol-dates">
                                                        <span>${new Date(vol.start_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                                                        <span> - </span>
                                                        <span>${vol.end_date ? new Date(vol.end_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : (t('coach.present') || 'Present')}</span>
                                                        ${vol.location && html` · <span class="vol-location">${vol.location}</span>`}
                                                    </div>
                                                </div>
                                                ${vol.description && html`<p class="vol-description">${vol.description}</p>`}
                                                ${isOwnProfile && html`
                                                    <span class="vol-edit-icon">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                        </svg>
                                                    </span>
                                                `}
                                            </div>
                                        `)}
                                    </div>
                                ` : html`
                                    <div class="empty-section-prompt" onClick=${() => setEditingVolunteering('new')}>
                                        <span class="empty-icon">+</span>
                                        <p>${t('coach.addVolunteering') || 'Add your volunteering experience'}</p>
                                    </div>
                                `}
                            </section>
                        `}

                        <!-- Publications Section -->
                        ${(publications.length > 0 || isOwnProfile) && html`
                            <section class="profile-section publications-section">
                                <div class="section-header-editable">
                                    <h2 class="section-title">
                                        <span class="section-icon">📚</span>
                                        ${t('coach.publications') || 'Publications'}
                                    </h2>
                                    ${isOwnProfile && html`
                                        <button class="btn-add-section" onClick=${() => setEditingPublication('new')} title="Add publication">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                            </svg>
                                        </button>
                                    `}
                                </div>
                                ${publications.length > 0 ? html`
                                    <div class="publications-content">
                                        ${publications.map(pub => html`
                                            <div key=${pub.id} class="publication-item ${isOwnProfile ? 'editable' : ''}" onClick=${isOwnProfile ? () => setEditingPublication(pub) : null}>
                                                <div class="pub-header">
                                                    <h4 class="pub-title">${pub.title}</h4>
                                                    ${pub.publisher && html`<p class="pub-publisher">${pub.publisher}</p>`}
                                                    ${pub.publication_url && html`
                                                        <a href=${pub.publication_url} target="_blank" rel="noopener noreferrer" class="btn-view-publication" onClick=${(e) => e.stopPropagation()}>
                                                            ${t('coach.viewPublication') || 'View Publication'} 🔗
                                                        </a>
                                                    `}
                                                    <div class="pub-meta">
                                                        ${pub.publication_date && html`<span class="pub-date">${new Date(pub.publication_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>`}
                                                        ${pub.authors && html`<span class="pub-authors">${pub.authors}</span>`}
                                                    </div>
                                                </div>
                                                ${pub.description && html`<p class="pub-description">${pub.description}</p>`}
                                                ${isOwnProfile && html`
                                                    <span class="pub-edit-icon">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                        </svg>
                                                    </span>
                                                `}
                                            </div>
                                        `)}
                                    </div>
                                ` : html`
                                    <div class="empty-section-prompt" onClick=${() => setEditingPublication('new')}>
                                        <span class="empty-icon">+</span>
                                        <p>${t('coach.addPublications') || 'Add your publications'}</p>
                                    </div>
                                `}
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

                            <!-- Own Profile: Services Section -->
                            <${ProfileServicesSidebar}
                                coach=${coach}
                                services=${coachServices}
                                isOwnProfile=${true}
                                onAddService=${() => setEditingService('new')}
                                onEditService=${(svc) => setEditingService(svc)}
                            />

                            <!-- Own Profile: Who Your Viewers Also Viewed -->
                            <${ViewersAlsoViewedSidebar}
                                coaches=${viewersAlsoViewed}
                                isLoading=${loadingViewersAlsoViewed}
                                session=${session}
                            />
                        ` : html`
                            <!-- Other Profile: Services Section -->
                            ${coachServices.filter(s => s.active).length > 0 && html`
                                <${ProfileServicesSidebar}
                                    coach=${coach}
                                    services=${coachServices}
                                    isOwnProfile=${false}
                                    onRequestService=${(svc) => setRequestingService(svc)}
                                />
                            `}

                            <!-- Other Profile: More Coaches For You -->
                            <section class="sidebar-section similar-coaches-sidebar">
                                <h3 class="sidebar-title">${t('coach.moreCoachesForYou') || 'More coaches for you'}</h3>
                                <div class="mini-coaches-list">
                                    ${similarCoaches.map(similarCoach => html`
                                        <${MiniCoachCard}
                                            key=${similarCoach.id}
                                            coach=${similarCoach}
                                            session=${session}
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

            <!-- Auth Modal (for non-logged-in users) -->
            ${showAuthModal && html`
                <${AuthModal}
                    onClose=${() => setShowAuthModal(false)}
                    onSuccess=${handleAuthSuccess}
                    title=${pendingAuthAction === 'connect'
                        ? (t('auth.signInToConnect') || 'Sign in to connect')
                        : (t('auth.signInToBook') || 'Sign in to book your call')}
                    subtitle=${pendingAuthAction === 'connect'
                        ? (t('auth.signInToConnectSubtitle') || 'Create an account or sign in to connect with {coachName}').replace('{coachName}', coach.full_name)
                        : (t('auth.signInToBookSubtitle') || 'Create an account or sign in to book a free discovery call with {coachName}').replace('{coachName}', coach.full_name)}
                />
            `}

            <!-- Write Recommendation Modal -->
            ${showReviewModal && html`
                <${WriteRecommendationModal}
                    coach=${coach}
                    onClose=${() => setShowReviewModal(false)}
                    onSubmit=${handleSubmitReview}
                    userHasReviewed=${userHasReviewed}
                />
            `}

            <!-- Recommendations Popup -->
            ${showReviewsPopup && html`
                <${RecommendationsPopup}
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

            <!-- Edit Experience Modal (add new / edit existing) -->
            ${editingExperience && isOwnProfile && html`
                <${EditExperienceModal}
                    coach=${coach}
                    experience=${editingExperience === 'new' ? null : editingExperience}
                    onClose=${() => setEditingExperience(null)}
                    onSaved=${() => loadExperiences(coach.id)}
                />
            `}

            <!-- Edit Education Modal (add new / edit existing) -->
            ${editingEducation && isOwnProfile && html`
                <${EditEducationModal}
                    coach=${coach}
                    education=${editingEducation === 'new' ? null : editingEducation}
                    onClose=${() => setEditingEducation(null)}
                    onSaved=${() => loadEducations(coach.id)}
                />
            `}

            <!-- Edit Skill Modal (add new / edit existing) -->
            ${editingSkill && isOwnProfile && html`
                <${EditSkillModal}
                    coach=${coach}
                    skill=${editingSkill === 'new' ? null : editingSkill}
                    onClose=${() => setEditingSkill(null)}
                    onSaved=${() => loadCoachSkills(coach.id)}
                />
            `}

            <!-- Edit Volunteering Modal (add new / edit existing) -->
            ${editingVolunteering && isOwnProfile && html`
                <${EditVolunteeringModal}
                    coach=${coach}
                    volunteering=${editingVolunteering === 'new' ? null : editingVolunteering}
                    onClose=${() => setEditingVolunteering(null)}
                    onSaved=${() => loadVolunteering(coach.id)}
                />
            `}

            <!-- Edit Publication Modal (add new / edit existing) -->
            ${editingPublication && isOwnProfile && html`
                <${EditPublicationModal}
                    coach=${coach}
                    publication=${editingPublication === 'new' ? null : editingPublication}
                    onClose=${() => setEditingPublication(null)}
                    onSaved=${() => loadPublications(coach.id)}
                />
            `}

            <!-- Edit Service Modal (add new / edit existing) -->
            ${editingService && isOwnProfile && html`
                <${EditServiceModal}
                    coach=${coach}
                    service=${editingService === 'new' ? null : editingService}
                    onClose=${() => setEditingService(null)}
                    onSaved=${() => loadCoachServices(coach.id)}
                />
            `}

            <!-- Edit Certification Modal (add new / edit existing) -->
            ${editingCertification && isOwnProfile && html`
                <${EditCertificationModal}
                    coach=${coach}
                    credential=${editingCertification === 'new' ? null : editingCertification}
                    certificationsList=${certificationsLookup.list || []}
                    onClose=${() => setEditingCertification(null)}
                    onSaved=${() => loadCredentials(coach.id)}
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

            <!-- Profile Photo Editor Modal -->
            ${showPhotoEditor && isOwnProfile && html`
                <${ProfilePhotoEditorModal}
                    coach=${coach}
                    session=${session}
                    onClose=${() => setShowPhotoEditor(false)}
                    onSave=${saveCoachProfile}
                />
            `}

            <!-- Edit Coach Profile Modal -->
            ${showCoachProfileEditor && isOwnProfile && html`
                <${EditCoachProfileModal}
                    coach=${coach}
                    onClose=${() => setShowCoachProfileEditor(false)}
                    onSave=${saveCoachProfile}
                />
            `}

            <!-- Service Request Modal -->
            ${requestingService && html`
                <${ServiceRequestModal}
                    coach=${coach}
                    service=${requestingService}
                    onClose=${() => setRequestingService(null)}
                />
            `}
        </div>
    `;
}

export const CoachProfilePage = memo(CoachProfilePageComponent);
export default CoachProfilePage;
