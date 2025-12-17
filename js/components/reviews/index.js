/**
 * Review Components Barrel Export
 * StarRating, ReviewCard, WriteReviewModal
 */

import htm from '../../vendor/htm.js';

const React = window.React;
const { useState } = React;
const html = htm.bind(React.createElement);

/**
 * StarRating Component
 * Displays star ratings with optional interactive mode
 */
export const StarRating = ({ rating, size = 'medium', interactive = false, onChange }) => {
    const [hoverRating, setHoverRating] = useState(0);
    const [selectedRating, setSelectedRating] = useState(rating || 0);

    const sizes = {
        small: '16px',
        medium: '20px',
        large: '24px'
    };

    const handleClick = (value) => {
        if (interactive) {
            setSelectedRating(value);
            if (onChange) onChange(value);
        }
    };

    const displayRating = interactive ? (hoverRating || selectedRating) : rating;

    return html`
        <div style=${{ display: 'flex', gap: '4px' }}>
            ${[1, 2, 3, 4, 5].map(star => html`
                <span
                    key=${star}
                    onClick=${() => handleClick(star)}
                    onMouseEnter=${() => interactive && setHoverRating(star)}
                    onMouseLeave=${() => interactive && setHoverRating(0)}
                    style=${{
                        fontSize: sizes[size],
                        color: star <= displayRating ? '#FFB800' : '#E0E0E0',
                        cursor: interactive ? 'pointer' : 'default',
                        transition: 'color 0.2s'
                    }}
                >
                    ★
                </span>
            `)}
        </div>
    `;
};

/**
 * ReviewCard Component
 * Displays a single review with optional coach response
 */
export const ReviewCard = ({ review, isCoach = false, onRespond }) => {
    const [showResponseForm, setShowResponseForm] = useState(false);
    const [response, setResponse] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmitResponse = async () => {
        if (!response.trim()) return;

        setSubmitting(true);
        if (onRespond) {
            await onRespond(review.id, response);
        }
        setSubmitting(false);
        setShowResponseForm(false);
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return html`
        <div class="review-card" style=${{
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '16px',
            background: 'white'
        }}>
            <div style=${{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div>
                    <div style=${{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <${StarRating} rating=${review.rating} size="medium" />
                        ${review.is_verified_booking && html`
                            <span style=${{
                                background: '#E8F5E9',
                                color: '#2E7D32',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '600'
                            }}>
                                ✓ Verified Booking
                            </span>
                        `}
                    </div>
                    ${review.title && html`
                        <h4 style=${{ margin: '0 0 8px 0', fontSize: '16px' }}>${review.title}</h4>
                    `}
                </div>
                <span style=${{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    ${formatDate(review.created_at)}
                </span>
            </div>

            <p style=${{ margin: '0 0 16px 0', lineHeight: '1.6' }}>
                ${review.content}
            </p>

            ${review.coach_response && html`
                <div style=${{
                    background: '#F5F5F5',
                    padding: '12px 16px',
                    borderRadius: '6px',
                    borderLeft: '3px solid var(--primary-petrol)',
                    marginTop: '12px'
                }}>
                    <div style=${{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <strong style=${{ fontSize: '14px' }}>Coach Response</strong>
                        <span style=${{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            ${formatDate(review.coach_responded_at)}
                        </span>
                    </div>
                    <p style=${{ margin: 0, fontSize: '14px', lineHeight: '1.6' }}>
                        ${review.coach_response}
                    </p>
                </div>
            `}

            ${isCoach && !review.coach_response && html`
                <div>
                    ${!showResponseForm ? html`
                        <button
                            class="btn-secondary"
                            onClick=${() => setShowResponseForm(true)}
                            style=${{ padding: '6px 12px', fontSize: '14px' }}
                        >
                            Respond to Review
                        </button>
                    ` : html`
                        <div style=${{ marginTop: '12px' }}>
                            <textarea
                                class="form-control"
                                rows="3"
                                placeholder="Write your response..."
                                value=${response}
                                onInput=${(e) => setResponse(e.target.value)}
                                style=${{ marginBottom: '8px' }}
                            ></textarea>
                            <div style=${{ display: 'flex', gap: '8px' }}>
                                <button
                                    class="btn-primary"
                                    onClick=${handleSubmitResponse}
                                    disabled=${submitting || !response.trim()}
                                >
                                    ${submitting ? 'Submitting...' : 'Submit Response'}
                                </button>
                                <button
                                    class="btn-secondary"
                                    onClick=${() => setShowResponseForm(false)}
                                    disabled=${submitting}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    `}
                </div>
            `}
        </div>
    `;
};

/**
 * WriteReviewModal Component
 * Modal for writing new reviews
 */
export const WriteReviewModal = ({ booking, onClose, onSubmit }) => {
    const [rating, setRating] = useState(5);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!content.trim()) {
            alert('Please write your review');
            return;
        }

        setSubmitting(true);
        if (onSubmit) {
            await onSubmit({ rating, title, content });
        }
        setSubmitting(false);
    };

    return html`
        <div class="booking-modal" onClick=${onClose}>
            <div class="booking-content" onClick=${(e) => e.stopPropagation()} style=${{ maxWidth: '600px' }}>
                <div class="booking-header">
                    <h2>Write a Review</h2>
                    <button class="modal-close-btn" onClick=${onClose}>×</button>
                </div>

                <div style=${{ padding: '20px' }}>
                    <div class="form-group">
                        <label>Your Rating *</label>
                        <${StarRating} rating=${rating} size="large" interactive=${true} onChange=${setRating} />
                    </div>

                    <div class="form-group">
                        <label>Review Title (Optional)</label>
                        <input
                            type="text"
                            class="form-control"
                            placeholder="e.g., Great coaching session!"
                            value=${title}
                            onInput=${(e) => setTitle(e.target.value)}
                            maxLength="100"
                        />
                    </div>

                    <div class="form-group">
                        <label>Your Review *</label>
                        <textarea
                            class="form-control"
                            rows="6"
                            placeholder="Share your experience with this coach..."
                            value=${content}
                            onInput=${(e) => setContent(e.target.value)}
                            required
                        ></textarea>
                        <div class="form-hint">${content.length}/1000 characters</div>
                    </div>

                    <div style=${{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                        <button
                            class="btn-primary"
                            onClick=${handleSubmit}
                            disabled=${submitting || !content.trim()}
                            style=${{ flex: 1 }}
                        >
                            ${submitting ? 'Submitting...' : 'Submit Review'}
                        </button>
                        <button
                            class="btn-secondary"
                            onClick=${onClose}
                            disabled=${submitting}
                            style=${{ flex: 1 }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
};
