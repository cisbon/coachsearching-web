/**
 * Social Proof Components
 * @fileoverview Components to build trust and encourage conversions
 */

import htm from '../../vendor/htm.js';
import { t } from '../../i18n.js';

const React = window.React;
const { useState, useEffect, useCallback, memo } = React;
const html = htm.bind(React.createElement);

/**
 * Recent Activity Toast
 * Shows recent booking notifications
 */
export const RecentActivityToast = memo(({ activities = [] }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (activities.length === 0) return;

        // Show toast every 15 seconds
        const showNext = () => {
            setIsVisible(true);
            setTimeout(() => {
                setIsVisible(false);
                setTimeout(() => {
                    setCurrentIndex(prev => (prev + 1) % activities.length);
                }, 500);
            }, 5000);
        };

        const timer = setInterval(showNext, 15000);
        showNext(); // Show first one immediately

        return () => clearInterval(timer);
    }, [activities.length]);

    if (activities.length === 0) return null;

    const activity = activities[currentIndex];

    return html`
        <div class="recent-activity-toast ${isVisible ? 'visible' : ''}">
            <div class="toast-content">
                <div class="toast-icon">🎉</div>
                <div class="toast-message">
                    <strong>${activity.name || 'Someone'}</strong> ${activity.action || 'just booked a session'}
                    ${activity.coachName && html`
                        <span class="toast-detail"> with ${activity.coachName}</span>
                    `}
                </div>
                <div class="toast-time">${activity.timeAgo || 'Just now'}</div>
            </div>
            <button class="toast-close" onClick=${() => setIsVisible(false)} aria-label="Close">×</button>
        </div>
    `;
});

/**
 * Live Visitor Count
 * Shows how many people are viewing
 */
export const LiveVisitorCount = memo(({ pageType = 'site', entityId = null }) => {
    const [count, setCount] = useState(null);

    useEffect(() => {
        // Simulate visitor count (in production, use real analytics)
        const baseCount = Math.floor(Math.random() * 15) + 5;
        setCount(baseCount);

        const interval = setInterval(() => {
            setCount(prev => {
                const change = Math.random() > 0.5 ? 1 : -1;
                return Math.max(3, prev + change);
            });
        }, 30000);

        return () => clearInterval(interval);
    }, [pageType, entityId]);

    if (count === null) return null;

    return html`
        <div class="live-visitor-count">
            <span class="pulse-dot"></span>
            <span class="visitor-text">
                ${count} ${count === 1
                    ? (t('social.personViewing') || 'person viewing')
                    : (t('social.peopleViewing') || 'people viewing')}
                ${pageType === 'coach' ? ' this profile' : ' now'}
            </span>
        </div>
    `;
});

/**
 * Testimonial Carousel
 * Rotating testimonials display
 */
export const TestimonialCarousel = memo(({ testimonials = [] }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        if (testimonials.length <= 1 || isPaused) return;

        const timer = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % testimonials.length);
        }, 6000);

        return () => clearInterval(timer);
    }, [testimonials.length, isPaused]);

    if (testimonials.length === 0) {
        // Default testimonials
        testimonials = [
            {
                text: "Finding the right coach was life-changing. I've achieved goals I never thought possible.",
                author: "Maria S.",
                role: "Marketing Executive",
                rating: 5,
                avatar: null,
            },
            {
                text: "The matching quiz found me a perfect coach. Within 3 months, my business grew 50%.",
                author: "Thomas K.",
                role: "Startup Founder",
                rating: 5,
                avatar: null,
            },
            {
                text: "Finally found a coach who speaks my language - literally! The multilingual options are great.",
                author: "Elena R.",
                role: "HR Director",
                rating: 5,
                avatar: null,
            },
        ];
    }

    const testimonial = testimonials[currentIndex];

    const renderStars = (rating) => {
        return Array(5).fill(0).map((_, i) => html`
            <span class="star ${i < rating ? 'filled' : ''}" key=${i}>★</span>
        `);
    };

    return html`
        <div
            class="testimonial-carousel"
            onMouseEnter=${() => setIsPaused(true)}
            onMouseLeave=${() => setIsPaused(false)}
        >
            <div class="testimonial-card">
                <div class="testimonial-rating">
                    ${renderStars(testimonial.rating || 5)}
                </div>
                <blockquote class="testimonial-text">
                    "${testimonial.text}"
                </blockquote>
                <div class="testimonial-author">
                    ${testimonial.avatar ? html`
                        <img src=${testimonial.avatar} alt=${testimonial.author} class="author-avatar" />
                    ` : html`
                        <div class="author-initial">
                            ${testimonial.author?.charAt(0) || 'A'}
                        </div>
                    `}
                    <div class="author-info">
                        <div class="author-name">${testimonial.author}</div>
                        <div class="author-role">${testimonial.role}</div>
                    </div>
                </div>
            </div>
            ${testimonials.length > 1 && html`
                <div class="carousel-dots">
                    ${testimonials.map((_, i) => html`
                        <button
                            key=${i}
                            class="carousel-dot ${i === currentIndex ? 'active' : ''}"
                            onClick=${() => setCurrentIndex(i)}
                            aria-label=${`Go to testimonial ${i + 1}`}
                        />
                    `)}
                </div>
            `}
        </div>
    `;
});

/**
 * Success Stats Counter
 * Animated statistics display
 */
export const SuccessStats = memo(({ stats = null }) => {
    const [animated, setAnimated] = useState(false);
    const [counts, setCounts] = useState({});

    const defaultStats = stats || [
        { key: 'coaches', value: 500, label: t('stats.verifiedCoaches') || 'Verified Coaches', suffix: '+' },
        { key: 'sessions', value: 10000, label: t('stats.sessionsCompleted') || 'Sessions Completed', suffix: '+' },
        { key: 'countries', value: 45, label: t('stats.countries') || 'Countries', suffix: '' },
        { key: 'rating', value: 4.9, label: t('stats.avgRating') || 'Average Rating', suffix: '★', isDecimal: true },
    ];

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !animated) {
                    setAnimated(true);
                    animateCounts();
                }
            },
            { threshold: 0.3 }
        );

        const element = document.querySelector('.success-stats');
        if (element) observer.observe(element);

        return () => observer.disconnect();
    }, [animated]);

    const animateCounts = () => {
        defaultStats.forEach(stat => {
            const duration = 2000;
            const steps = 60;
            const increment = stat.value / steps;
            let current = 0;

            const timer = setInterval(() => {
                current += increment;
                if (current >= stat.value) {
                    current = stat.value;
                    clearInterval(timer);
                }
                setCounts(prev => ({
                    ...prev,
                    [stat.key]: stat.isDecimal ? current.toFixed(1) : Math.floor(current),
                }));
            }, duration / steps);
        });
    };

    const formatNumber = (num) => {
        if (num >= 1000) {
            return (num / 1000).toFixed(num % 1000 === 0 ? 0 : 1) + 'K';
        }
        return num;
    };

    return html`
        <div class="success-stats">
            ${defaultStats.map(stat => html`
                <div class="stat-item" key=${stat.key}>
                    <div class="stat-value">
                        ${formatNumber(counts[stat.key] || 0)}${stat.suffix}
                    </div>
                    <div class="stat-label">${stat.label}</div>
                </div>
            `)}
        </div>
    `;
});

/**
 * Urgency Banner
 * Creates urgency for bookings
 */
export const UrgencyBanner = memo(({ type = 'limited', coach = null }) => {
    const [timeLeft, setTimeLeft] = useState(null);

    useEffect(() => {
        if (type === 'offer') {
            // Calculate time until end of day
            const now = new Date();
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);
            setTimeLeft(endOfDay - now);

            const timer = setInterval(() => {
                const remaining = endOfDay - new Date();
                if (remaining <= 0) {
                    clearInterval(timer);
                    setTimeLeft(0);
                } else {
                    setTimeLeft(remaining);
                }
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [type]);

    const formatTime = (ms) => {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((ms % (1000 * 60)) / 1000);
        return `${hours}h ${minutes}m ${seconds}s`;
    };

    if (type === 'limited' && coach) {
        const slotsLeft = Math.floor(Math.random() * 3) + 1;
        return html`
            <div class="urgency-banner urgency-limited">
                <span class="urgency-icon">🔥</span>
                <span class="urgency-text">
                    ${t('urgency.limited') || 'Limited availability!'}
                    <strong>${slotsLeft} ${slotsLeft === 1 ? 'slot' : 'slots'}</strong> left this week
                </span>
            </div>
        `;
    }

    if (type === 'popular') {
        return html`
            <div class="urgency-banner urgency-popular">
                <span class="urgency-icon">⭐</span>
                <span class="urgency-text">
                    ${t('urgency.popular') || 'Highly requested!'}
                    ${Math.floor(Math.random() * 20) + 10} people booked recently
                </span>
            </div>
        `;
    }

    if (type === 'offer' && timeLeft !== null) {
        return html`
            <div class="urgency-banner urgency-offer">
                <span class="urgency-icon">⏰</span>
                <span class="urgency-text">
                    ${t('urgency.offer') || 'Today only!'}
                    Free discovery call ends in <strong>${formatTime(timeLeft)}</strong>
                </span>
            </div>
        `;
    }

    return null;
});

/**
 * Social Proof Badge
 * Shows trust indicators
 */
export const SocialProofBadge = memo(({ type, value }) => {
    const badges = {
        rating: {
            icon: '⭐',
            format: (v) => `${v} out of 5 stars`,
        },
        reviews: {
            icon: '💬',
            format: (v) => `${v}+ verified reviews`,
        },
        sessions: {
            icon: '📅',
            format: (v) => `${v}+ sessions completed`,
        },
        trusted: {
            icon: '✓',
            format: () => 'Trusted by 10,000+ clients',
        },
    };

    const badge = badges[type];
    if (!badge) return null;

    return html`
        <div class="social-proof-badge badge-${type}">
            <span class="badge-icon">${badge.icon}</span>
            <span class="badge-text">${badge.format(value)}</span>
        </div>
    `;
});

/**
 * Comparison Table
 * Compare coaches side by side
 */
export const ComparisonWidget = memo(({ coaches = [], onRemove, onBook }) => {
    if (coaches.length === 0) return null;

    const formatPrice = (price) => {
        return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR',
        }).format(price || 0);
    };

    return html`
        <div class="comparison-widget ${coaches.length > 0 ? 'visible' : ''}">
            <div class="comparison-header">
                <h4>${t('compare.title') || 'Compare Coaches'} (${coaches.length}/3)</h4>
                <button class="btn-compare" disabled=${coaches.length < 2}>
                    ${t('compare.button') || 'Compare Now'}
                </button>
            </div>
            <div class="comparison-coaches">
                ${coaches.map(coach => html`
                    <div class="comparison-coach" key=${coach.id}>
                        <img src=${coach.avatar_url} alt=${coach.full_name} />
                        <div class="coach-mini-info">
                            <div class="coach-name">${coach.full_name}</div>
                            <div class="coach-price">${formatPrice(coach.hourly_rate)}/hr</div>
                        </div>
                        <button class="btn-remove" onClick=${() => onRemove(coach.id)} aria-label="Remove">×</button>
                    </div>
                `)}
            </div>
        </div>
    `;
});

/**
 * Exit Intent Popup
 * Shows when user is about to leave
 */
export const ExitIntentPopup = memo(({ onClose, onSubmit }) => {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (email) {
            onSubmit && onSubmit(email);
            setSubmitted(true);
        }
    };

    return html`
        <div class="exit-intent-overlay" onClick=${(e) => e.target === e.currentTarget && onClose()}>
            <div class="exit-intent-popup">
                <button class="popup-close" onClick=${onClose} aria-label="Close">×</button>

                ${!submitted ? html`
                    <div class="popup-content">
                        <div class="popup-icon">🎯</div>
                        <h2>${t('exit.title') || "Wait! Don't leave empty-handed"}</h2>
                        <p>${t('exit.description') || 'Get our free guide: "5 Questions to Ask Before Choosing a Coach"'}</p>

                        <form onSubmit=${handleSubmit} class="popup-form">
                            <input
                                type="email"
                                placeholder=${t('exit.emailPlaceholder') || 'Enter your email'}
                                value=${email}
                                onInput=${(e) => setEmail(e.target.value)}
                                required
                            />
                            <button type="submit" class="btn-popup-submit">
                                ${t('exit.submit') || 'Get Free Guide'}
                            </button>
                        </form>

                        <div class="popup-trust">
                            <span>🔒</span>
                            ${t('exit.privacy') || 'No spam. Unsubscribe anytime.'}
                        </div>
                    </div>
                ` : html`
                    <div class="popup-success">
                        <div class="success-icon">✓</div>
                        <h2>${t('exit.successTitle') || 'Check your inbox!'}</h2>
                        <p>${t('exit.successMessage') || "We've sent the guide to your email."}</p>
                        <button class="btn-popup-continue" onClick=${onClose}>
                            ${t('exit.continue') || 'Continue Browsing'}
                        </button>
                    </div>
                `}
            </div>
        </div>
    `;
});

export default {
    RecentActivityToast,
    LiveVisitorCount,
    TestimonialCarousel,
    SuccessStats,
    UrgencyBanner,
    SocialProofBadge,
    ComparisonWidget,
    ExitIntentPopup,
};
