/**
 * ReviewsPopup Component
 * Modal displaying coach reviews with ability to add new reviews
 */

import htm from '../../vendor/htm.js';
import { t } from '../../i18n.js';

const React = window.React;
const { useState, useEffect } = React;
const html = htm.bind(React.createElement);

/**
 * ReviewsPopup Component
 * @param {Object} props
 * @param {Object} props.coach - Coach object
 * @param {function} props.onClose - Close handler
 * @param {Object} props.session - User session (optional)
 */
export function ReviewsPopup({ coach, onClose, session }) {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddReview, setShowAddReview] = useState(false);
    const [newReview, setNewReview] = useState({ rating: 5, name: '', comment: '' });
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [userHasReviewed, setUserHasReviewed] = useState(false);

    // Check if current user has already reviewed this coach
    const checkUserHasReviewed = async () => {
        if (!session?.user?.id || !window.supabaseClient) {
            setUserHasReviewed(false);
            return;
        }
        try {
            const { data } = await window.supabaseClient
                .from('cs_reviews')
                .select('id')
                .eq('coach_id', coach.id)
                .eq('client_id', session.user.id)
                .maybeSingle();
            setUserHasReviewed(!!data);
        } catch (err) {
            console.error('Error checking user review:', err);
            setUserHasReviewed(false);
        }
    };

    const loadReviews = async () => {
        setLoading(true);
        try {
            if (window.supabaseClient) {
                const { data, error } = await window.supabaseClient
                    .from('cs_reviews')
                    .select('*')
                    .eq('coach_id', coach.id)
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    setReviews(data);
                }
            }
        } catch (err) {
            console.error('Error loading reviews:', err);
        }
        setLoading(false);
    };

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';

        loadReviews();
        checkUserHasReviewed();

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [coach.id, onClose, session?.user?.id]);

    const handleBackdropClick = (e) => {
        if (e.target.classList.contains('reviews-popup-overlay')) {
            onClose();
        }
    };

    const handleSubmitReview = async () => {
        if (!session?.user?.id) {
            setMessage('Please log in to write a review');
            return;
        }

        if (userHasReviewed) {
            setMessage('You have already reviewed this coach');
            return;
        }

        if (!newReview.comment.trim()) {
            setMessage('Please write a review');
            return;
        }

        setSubmitting(true);
        setMessage('');

        try {
            if (window.supabaseClient) {
                const reviewText = newReview.comment.trim();
                const reviewerName = newReview.name.trim() || null;
                const clientId = session.user.id;

                // Try inserting with 'text' column first, then 'comment' as fallback
                let data = null;
                let lastError = null;

                const attempt1 = await window.supabaseClient
                    .from('cs_reviews')
                    .insert([{
                        coach_id: coach.id,
                        client_id: clientId,
                        rating: newReview.rating,
                        text: reviewText,
                        reviewer_name: reviewerName
                    }])
                    .select();

                if (!attempt1.error) {
                    data = attempt1.data;
                } else {
                    lastError = attempt1.error;

                    const attempt2 = await window.supabaseClient
                        .from('cs_reviews')
                        .insert([{
                            coach_id: coach.id,
                            client_id: clientId,
                            rating: newReview.rating,
                            comment: reviewText,
                            reviewer_name: reviewerName
                        }])
                        .select();

                    if (!attempt2.error) {
                        data = attempt2.data;
                    } else {
                        throw lastError;
                    }
                }

                // Update coach's rating average
                const newCount = reviews.length + 1;
                const totalRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) + newReview.rating;
                const newAverage = totalRating / newCount;

                await window.supabaseClient
                    .from('cs_coaches')
                    .update({
                        rating_average: newAverage,
                        rating_count: newCount
                    })
                    .eq('id', coach.id);

                setMessage('Review submitted successfully!');
                setNewReview({ rating: 5, name: '', comment: '' });
                setShowAddReview(false);
                setUserHasReviewed(true);
                await loadReviews();
            }
        } catch (err) {
            console.error('Error submitting review:', err);
            setMessage('Error: ' + (err.message || 'Failed to submit review'));
        }
        setSubmitting(false);
    };

    const reviewsCount = reviews.length;
    const rating = reviewsCount > 0
        ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviewsCount
        : 0;

    return html`
        <div class="reviews-popup-overlay" onClick=${handleBackdropClick}>
            <div class="reviews-popup-container">
                <div class="reviews-popup-header">
                    <div class="reviews-header-info">
                        <h3>Reviews for ${coach.full_name}</h3>
                        <div class="reviews-summary">
                            <div class="reviews-avg-rating">
                                <span class="big-rating">${reviewsCount > 0 ? rating.toFixed(1) : '—'}</span>
                                <div class="rating-stars-large">
                                    ${[1,2,3,4,5].map(star => html`
                                        <span key=${star} class="star ${star <= Math.round(rating) ? 'filled' : ''}">★</span>
                                    `)}
                                </div>
                                <span class="total-reviews">${reviewsCount} review${reviewsCount !== 1 ? 's' : ''}</span>
                            </div>
                        </div>
                    </div>
                    <button class="reviews-popup-close" onClick=${onClose}>✕</button>
                </div>
                <div class="reviews-popup-content">
                    ${message && html`
                        <div class="review-message ${message.includes('Error') ? 'error' : 'success'}">${message}</div>
                    `}

                    ${!showAddReview && html`
                        <div class="review-action-area">
                            ${session?.user ? (
                                userHasReviewed ? html`
                                    <div class="already-reviewed-notice">
                                        <span class="check-icon">✓</span>
                                        ${t('review.alreadyReviewed') || 'You have already reviewed this coach'}
                                    </div>
                                ` : html`
                                    <button class="add-review-btn" onClick=${() => setShowAddReview(true)}>
                                        ✏️ ${t('review.writeReview') || 'Write a Review'}
                                    </button>
                                `
                            ) : html`
                                <button class="add-review-btn login-to-review" onClick=${() => window.navigateTo ? window.navigateTo('/login') : window.location.hash = '#login'}>
                                    🔒 ${t('review.loginToReview') || 'Log in to write a review'}
                                </button>
                            `}
                        </div>
                    `}

                    ${showAddReview && html`
                        <div class="add-review-form">
                            <h4>Write Your Review</h4>
                            <div class="rating-select">
                                <label>Your Rating:</label>
                                <div class="star-select">
                                    ${[1,2,3,4,5].map(star => html`
                                        <span
                                            key=${star}
                                            class="star-selectable ${star <= newReview.rating ? 'selected' : ''}"
                                            onClick=${() => setNewReview({...newReview, rating: star})}
                                        >★</span>
                                    `)}
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Your Name (optional)</label>
                                <input
                                    type="text"
                                    placeholder="Anonymous"
                                    value=${newReview.name}
                                    onChange=${(e) => setNewReview({...newReview, name: e.target.value})}
                                />
                            </div>
                            <div class="form-group">
                                <label>Your Review *</label>
                                <textarea
                                    placeholder="Share your experience with this coach..."
                                    rows="4"
                                    value=${newReview.comment}
                                    onChange=${(e) => setNewReview({...newReview, comment: e.target.value})}
                                ></textarea>
                            </div>
                            <div class="review-form-actions">
                                <button class="btn-cancel" onClick=${() => setShowAddReview(false)}>Cancel</button>
                                <button class="btn-submit" onClick=${handleSubmitReview} disabled=${submitting}>
                                    ${submitting ? 'Submitting...' : 'Submit Review'}
                                </button>
                            </div>
                        </div>
                    `}

                    ${loading ? html`
                        <div class="reviews-loading">Loading reviews...</div>
                    ` : reviews.length === 0 ? html`
                        <div class="no-reviews">
                            <div class="no-reviews-icon">📝</div>
                            <p>No reviews yet</p>
                            <p class="no-reviews-subtext">Be the first to review this coach!</p>
                        </div>
                    ` : html`
                        <div class="reviews-list">
                            ${reviews.map(review => html`
                                <div key=${review.id} class="review-item">
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
                                    <p class="review-text">${review.comment || review.text || ''}</p>
                                </div>
                            `)}
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
}

export default ReviewsPopup;
