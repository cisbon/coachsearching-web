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
        { value: 'flexible', label: t('discovery.timeFlexible') },
        { value: 'weekday_morning', label: t('discovery.timeWeekdayMorning') },
        { value: 'weekday_afternoon', label: t('discovery.timeWeekdayAfternoon') },
        { value: 'weekday_evening', label: t('discovery.timeWeekdayEvening') },
        { value: 'weekend_morning', label: t('discovery.timeWeekendMorning') },
        { value: 'weekend_afternoon', label: t('discovery.timeWeekendAfternoon') }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            setError(t('discovery.errorName'));
            return;
        }
        if (!formData.phone.trim()) {
            setError(t('discovery.errorPhone'));
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
                setError(result.error?.message || t('discovery.errorGeneric'));
            }
        } catch (err) {
            console.error('Discovery call request error:', err);
            setError(t('discovery.errorNetwork'));
        }

        setSubmitting(false);
    };

    if (success) {
        const coachName = coach.full_name || coach.display_name;
        return html`
            <div class="discovery-modal-overlay" onClick=${handleBackdropClick}>
                <div class="discovery-modal-container">
                    <div class="discovery-modal-header">
                        <h3>${t('discovery.successTitle')}</h3>
                        <button class="discovery-modal-close" onClick=${onClose}>✕</button>
                    </div>
                    <div class="discovery-modal-content success-content">
                        <div class="success-icon">✓</div>
                        <p>${t('discovery.successMessage').replace('{coachName}', coachName)}</p>
                        <p>${t('discovery.successFollowUp')}</p>
                        <button class="btn-primary" onClick=${onClose}>${t('discovery.close')}</button>
                    </div>
                </div>
            </div>
        `;
    }

    const coachName = coach.full_name || coach.display_name;
    return html`
        <div class="discovery-modal-overlay" onClick=${handleBackdropClick}>
            <div class="discovery-modal-container">
                <div class="discovery-modal-header">
                    <h3>${t('discovery.modalTitle')}</h3>
                    <button class="discovery-modal-close" onClick=${onClose}>✕</button>
                </div>
                <div class="discovery-modal-content">
                    <p class="discovery-intro">
                        ${t('discovery.modalIntro').replace('{coachName}', coachName)}
                    </p>

                    ${error && html`<div class="discovery-error">${error}</div>`}

                    <form onSubmit=${handleSubmit}>
                        <div class="form-group">
                            <label>${t('discovery.yourName')} *</label>
                            <input
                                type="text"
                                placeholder=${t('discovery.yourNamePlaceholder')}
                                value=${formData.name}
                                onChange=${(e) => setFormData({...formData, name: e.target.value})}
                                required
                            />
                        </div>

                        <div class="form-group">
                            <label>${t('discovery.phoneNumber')} *</label>
                            <input
                                type="tel"
                                placeholder=${t('discovery.phonePlaceholder')}
                                value=${formData.phone}
                                onChange=${(e) => setFormData({...formData, phone: e.target.value})}
                                required
                            />
                        </div>

                        <div class="form-group">
                            <label>${t('discovery.email')}</label>
                            <input
                                type="email"
                                placeholder=${t('discovery.emailPlaceholder')}
                                value=${formData.email}
                                onChange=${(e) => setFormData({...formData, email: e.target.value})}
                            />
                        </div>

                        <div class="form-group">
                            <label>${t('discovery.preferredTime')}</label>
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
                            <label>${t('discovery.message')}</label>
                            <textarea
                                placeholder=${t('discovery.messagePlaceholder')}
                                rows="3"
                                value=${formData.message}
                                onChange=${(e) => setFormData({...formData, message: e.target.value})}
                            ></textarea>
                        </div>

                        <div class="discovery-form-actions">
                            <button type="button" class="btn-cancel" onClick=${onClose}>${t('discovery.cancel')}</button>
                            <button type="submit" class="btn-primary" disabled=${submitting}>
                                ${submitting ? t('discovery.submitting') : t('discovery.submit')}
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
 * Allows logged-in users to write a review for a coach
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
                        <!-- Star Rating -->
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

                        <!-- Name (optional) -->
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

                        <!-- Review Content -->
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
    const [similarCoaches, setSimilarCoaches] = useState([]);
    const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [userHasReviewed, setUserHasReviewed] = useState(false);
    const [userExistingReview, setUserExistingReview] = useState(null);

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

    const loadSimilarCoaches = async (coachData) => {
        try {
            // Find coaches with similar specialties, excluding current coach
            const specialties = coachData.specialties || [];
            let query = window.supabaseClient
                .from('cs_coaches')
                .select('id, full_name, title, avatar_url, hourly_rate, rating_average, rating_count, specialties, slug, location')
                .neq('id', coachData.id)
                .eq('is_active', true)
                .limit(4);

            // If coach has specialties, try to find similar ones
            if (specialties.length > 0) {
                query = query.overlaps('specialties', specialties);
            }

            const { data, error } = await query.order('rating_average', { ascending: false });

            if (error) {
                // Fallback: just get top rated coaches if overlaps query fails
                const fallback = await window.supabaseClient
                    .from('cs_coaches')
                    .select('id, full_name, title, avatar_url, hourly_rate, rating_average, rating_count, specialties, slug, location')
                    .neq('id', coachData.id)
                    .eq('is_active', true)
                    .order('rating_average', { ascending: false })
                    .limit(4);
                setSimilarCoaches(fallback.data || []);
            } else {
                setSimilarCoaches(data || []);
            }
        } catch (err) {
            console.error('Failed to load similar coaches:', err);
        }
    };

    // Calculate review breakdown for chart
    const getReviewBreakdown = () => {
        const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach(review => {
            const rating = Math.round(review.rating || 0);
            if (rating >= 1 && rating <= 5) {
                breakdown[rating]++;
            }
        });
        return breakdown;
    };

    // Get featured testimonial (highest rated review with text)
    const getFeaturedTestimonial = () => {
        const reviewsWithText = reviews.filter(r => r.content && r.content.length > 50);
        if (reviewsWithText.length === 0) return null;
        return reviewsWithText.sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
    };

    // Check if logged-in user has already reviewed this coach
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

    // Submit a new review
    const handleSubmitReview = async (reviewData) => {
        if (!session?.user?.id || !coach?.id) {
            return { success: false, error: 'Not authenticated' };
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
                    status: 'pending' // Reviews go to pending for moderation
                })
                .select()
                .single();

            if (error) {
                // Check for unique constraint violation
                if (error.code === '23505') {
                    return { success: false, error: t('review.alreadyReviewed') || 'You have already reviewed this coach' };
                }
                throw error;
            }

            // Update local state
            setUserHasReviewed(true);
            setUserExistingReview(data);

            // Reload reviews to show the new one (if approved)
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

    // handleBookClick removed - MVP uses Discovery Calls only

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

                            <!-- Featured Testimonial -->
                            ${(() => {
                                const featured = getFeaturedTestimonial();
                                return featured ? html`
                                    <div class="featured-testimonial">
                                        <div class="testimonial-quote">
                                            <span class="quote-mark">"</span>
                                            ${featured.content.length > 150
                                                ? featured.content.substring(0, 150) + '...'
                                                : featured.content}
                                        </div>
                                        <div class="testimonial-author">
                                            <span class="stars">${'★'.repeat(Math.round(featured.rating || 5))}</span>
                                            <span class="author-name">— ${featured.reviewer_name || t('coach.verifiedClient') || 'Verified Client'}</span>
                                        </div>
                                    </div>
                                ` : null;
                            })()}

                            <!-- Availability Indicator -->
                            ${coach.is_available !== false && html`
                                <div class="availability-indicator available">
                                    <span class="availability-dot"></span>
                                    <span>${t('coach.availableNow') || 'Available for new clients'}</span>
                                    ${coach.response_time_hours && html`
                                        <span class="response-time">· ${t('coach.respondsWithin') || 'Responds within'} ${coach.response_time_hours}h</span>
                                    `}
                                </div>
                            `}

                            <!-- Pricing & CTA -->
                            <div class="coach-cta-section">
                                <!-- Package Pricing -->
                                <div class="pricing-options">
                                    <div class="price-display">
                                        <span class="price-label">${t('coach.singleSession') || 'Single Session'}</span>
                                        <span class="price-value" itemprop="priceRange">${formatPrice(coach.hourly_rate)}</span>
                                    </div>
                                    ${coach.package_price && html`
                                        <div class="price-display package-price">
                                            <span class="price-label">${t('coach.packageDeal') || '4-Session Package'}</span>
                                            <span class="price-value">${formatPrice(coach.package_price)}</span>
                                            <span class="price-savings">${t('coach.savePercent') || 'Save'} ${Math.round((1 - coach.package_price / (coach.hourly_rate * 4)) * 100)}%</span>
                                        </div>
                                    `}
                                </div>

                                <!-- Primary CTA: Discovery Call -->
                                <button class="btn-discovery-primary" onClick=${() => setShowDiscoveryModal(true)}>
                                    📞 ${t('discovery.bookFreeCall')}
                                    <span class="btn-subtitle">${t('discovery.freeNoObligation') || 'Free, no obligation'}</span>
                                </button>

                                <!-- Send Message -->
                                <button class="btn-contact-link" onClick=${() => window.navigateTo(`/contact/${coach.id}`)}>
                                    💬 ${t('coach.sendMessage') || 'Send a Message'}
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

                            <!-- My Approach -->
                            ${coach.coaching_approach && html`
                                <article class="coach-section coach-approach-section">
                                    <h2 class="section-title">${t('coach.myApproach') || 'My Coaching Approach'}</h2>
                                    <div class="approach-content">
                                        ${(coach.coaching_approach || '').split('\n').map((para, i) =>
                                            para.trim() ? html`<p key=${i}>${para}</p>` : null
                                        )}
                                    </div>
                                    ${coach.coaching_style && html`
                                        <div class="coaching-style">
                                            <h4>${t('coach.coachingStyle') || 'Coaching Style'}</h4>
                                            <div class="style-tags">
                                                ${(Array.isArray(coach.coaching_style) ? coach.coaching_style : [coach.coaching_style]).map((style, i) => html`
                                                    <span key=${i} class="style-tag">${style}</span>
                                                `)}
                                            </div>
                                        </div>
                                    `}
                                </article>
                            `}

                            <!-- What to Expect -->
                            <article class="coach-section what-to-expect-section">
                                <h2 class="section-title">${t('coach.whatToExpect') || 'What to Expect'}</h2>
                                <div class="expect-grid">
                                    <div class="expect-item">
                                        <span class="expect-icon">📞</span>
                                        <h4>${t('coach.expectStep1Title') || 'Free Discovery Call'}</h4>
                                        <p>${t('coach.expectStep1Desc') || 'Start with a free call to discuss your goals and see if we\'re a good fit.'}</p>
                                    </div>
                                    <div class="expect-item">
                                        <span class="expect-icon">🎯</span>
                                        <h4>${t('coach.expectStep2Title') || 'Personalized Plan'}</h4>
                                        <p>${t('coach.expectStep2Desc') || 'Together we\'ll create a tailored coaching plan based on your unique needs.'}</p>
                                    </div>
                                    <div class="expect-item">
                                        <span class="expect-icon">🚀</span>
                                        <h4>${t('coach.expectStep3Title') || 'Ongoing Support'}</h4>
                                        <p>${t('coach.expectStep3Desc') || 'Regular sessions with accountability and support between meetings.'}</p>
                                    </div>
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
                            <article class="coach-section coach-reviews-section" id="reviews">
                                <div class="reviews-header">
                                    <h2 class="section-title">
                                        ${t('coach.reviews') || 'Client Reviews'}
                                        ${reviews.length > 0 && html`
                                            <span class="reviews-summary">
                                                ⭐ ${rating.toFixed(1)} (${reviewsCount} ${t('coach.reviews') || 'reviews'})
                                            </span>
                                        `}
                                    </h2>

                                    <!-- Write Review Button -->
                                    <div class="write-review-cta">
                                        ${session?.user ? (
                                            userHasReviewed ? html`
                                                <div class="already-reviewed">
                                                    <span class="check-icon">✓</span>
                                                    ${t('review.alreadyReviewedShort') || 'You reviewed this coach'}
                                                </div>
                                            ` : html`
                                                <button
                                                    class="btn-write-review"
                                                    onClick=${() => setShowReviewModal(true)}
                                                >
                                                    ✏️ ${t('review.writeReview') || 'Write a Review'}
                                                </button>
                                            `
                                        ) : html`
                                            <button
                                                class="btn-write-review btn-write-review-login"
                                                onClick=${() => window.navigateTo('/login')}
                                            >
                                                ${t('review.loginToReview') || 'Log in to write a review'}
                                            </button>
                                        `}
                                    </div>
                                </div>

                                <!-- Review Breakdown Chart -->
                                ${reviews.length >= 3 && html`
                                    <div class="review-breakdown">
                                        <div class="breakdown-summary">
                                            <div class="breakdown-score">
                                                <span class="big-rating">${rating.toFixed(1)}</span>
                                                <div class="breakdown-stars">
                                                    ${[1,2,3,4,5].map(star => html`
                                                        <span key=${star} class="star ${star <= Math.round(rating) ? 'filled' : ''}">★</span>
                                                    `)}
                                                </div>
                                                <span class="breakdown-total">${reviewsCount} ${t('coach.reviewsTotal') || 'reviews'}</span>
                                            </div>
                                            <div class="breakdown-bars">
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
                                        </div>
                                    </div>
                                `}

                                ${reviews.length > 0 ? html`
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
                                ` : html`
                                    <div class="no-reviews-yet">
                                        <p>${t('review.noReviewsYet') || 'No reviews yet. Be the first to share your experience!'}</p>
                                    </div>
                                `}
                            </article>
                        </div>

                        <!-- Sidebar -->
                        <aside class="coach-sidebar">
                            <!-- Discovery Call Widget -->
                            <div class="sidebar-widget booking-widget">
                                <h3>${t('coach.getStarted') || 'Get Started'}</h3>
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
                                    📞 ${t('discovery.bookFreeCall')}
                                </button>
                                <p class="booking-note">
                                    ${t('discovery.freeDiscoveryAvailable')}
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
                                        class="share-btn share-whatsapp"
                                        onClick=${() => window.open(`https://wa.me/?text=${encodeURIComponent(`${t('coach.shareText') || 'Check out this coach'}: ${coach.full_name} - ${window.location.href}`)}`, '_blank')}
                                        aria-label="Share on WhatsApp"
                                    >
                                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                        </svg>
                                    </button>
                                    <button
                                        class="share-btn share-linkedin"
                                        onClick=${() => window.open(`https://linkedin.com/shareArticle?url=${encodeURIComponent(window.location.href)}`, '_blank')}
                                        aria-label="Share on LinkedIn"
                                    >
                                        in
                                    </button>
                                    <button
                                        class="share-btn share-twitter"
                                        onClick=${() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(`${t('coach.shareText') || 'Check out this coach'}: ${coach.full_name}`)}`, '_blank')}
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
            ${similarCoaches.length > 0 && html`
                <section class="similar-coaches-section">
                    <div class="container">
                        <h2 class="section-title">${t('coach.similarCoaches') || 'Similar Coaches You Might Like'}</h2>
                        <div class="similar-coaches-grid">
                            ${similarCoaches.map(similarCoach => html`
                                <a
                                    key=${similarCoach.id}
                                    href="/coach/${similarCoach.slug || similarCoach.id}"
                                    class="similar-coach-card"
                                    onClick=${(e) => { e.preventDefault(); window.navigateTo(`/coach/${similarCoach.slug || similarCoach.id}`); }}
                                >
                                    <div class="similar-coach-avatar">
                                        <img
                                            src=${similarCoach.avatar_url || 'https://via.placeholder.com/80'}
                                            alt=${similarCoach.full_name}
                                            loading="lazy"
                                        />
                                    </div>
                                    <div class="similar-coach-info">
                                        <h4 class="similar-coach-name">${similarCoach.full_name}</h4>
                                        <p class="similar-coach-title">${similarCoach.title}</p>
                                        ${similarCoach.rating_average > 0 && html`
                                            <div class="similar-coach-rating">
                                                <span class="stars">★</span>
                                                <span>${similarCoach.rating_average.toFixed(1)}</span>
                                                <span class="review-count">(${similarCoach.rating_count || 0})</span>
                                            </div>
                                        `}
                                        <div class="similar-coach-price">
                                            ${formatPrice(similarCoach.hourly_rate)}/${t('coach.hour') || 'hr'}
                                        </div>
                                    </div>
                                </a>
                            `)}
                        </div>
                    </div>
                </section>
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
