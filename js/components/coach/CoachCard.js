/**
 * CoachCard Component
 * Main coach card display with video, reviews, and booking functionality
 */

import htm from '../../vendor/htm.js';
import { t } from '../../i18n.js';
import { formatPrice } from '../../utils/formatting.js';
import { LanguageFlags } from './LanguageFlags.js';
import { TrustBadges } from './TrustBadges.js';
import { VideoPopup } from './VideoPopup.js';
import { ReviewsPopup } from './ReviewsPopup.js';
import { DiscoveryCallModal } from './DiscoveryCallModal.js';

const React = window.React;
const { useState, useEffect, memo } = React;
const html = htm.bind(React.createElement);

/**
 * CoachCard Component
 * @param {Object} props
 * @param {Object} props.coach - Coach data object
 * @param {function} [props.onViewDetails] - Handler for viewing coach details
 * @param {Object} [props.session] - User session (for reviews)
 */
export const CoachCard = memo(function CoachCard({ coach, onViewDetails, session }) {
    const [showVideoPopup, setShowVideoPopup] = useState(false);
    const [showReviewsPopup, setShowReviewsPopup] = useState(false);
    const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
    const [liveReviewsData, setLiveReviewsData] = useState({ rating: 0, count: 0, loaded: false });

    // Fetch live reviews data from database
    useEffect(() => {
        const fetchReviewsData = async () => {
            // Only query if coach.id is a valid UUID (not integer mock IDs)
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
                // Skip query for non-UUID IDs (mock data)
                setLiveReviewsData({ rating: 0, count: 0, loaded: true });
            }
        };
        fetchReviewsData();
    }, [coach.id, showReviewsPopup]);

    // Use live data if loaded, otherwise fall back to coach object data
    const rating = liveReviewsData.loaded
        ? liveReviewsData.rating
        : (coach.rating_average || coach.rating || 0);
    const reviewsCount = liveReviewsData.loaded
        ? liveReviewsData.count
        : (coach.rating_count || coach.reviews_count || 0);
    const location = coach.location || 'Remote';
    const languages = coach.languages || [];
    const specialties = coach.specialties || [];
    const bio = coach.bio || '';
    const videoUrl = coach.intro_video_url || coach.video_url;
    const hasVideo = !!videoUrl;

    const handleImageClick = (e) => {
        if (hasVideo) {
            e.preventDefault();
            e.stopPropagation();
            setShowVideoPopup(true);
        }
    };

    const handleReviewsClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowReviewsPopup(true);
    };

    return html`
        <div class="coach-card ${hasVideo ? 'has-video' : ''}">
            <!-- Left Column: Image + Rating -->
            <div class="coach-image-column">
                <!-- Image Container with Video Play Overlay -->
                <div class="coach-img-container ${hasVideo ? 'clickable' : ''}" onClick=${handleImageClick}>
                    <img
                        src=${coach.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(coach.full_name)}
                        alt=${coach.full_name}
                        class="coach-img"
                        loading="lazy"
                    />
                    ${hasVideo && html`
                        <div class="video-play-overlay">
                            <div class="play-button">
                                <span>▶</span>
                            </div>
                            <span class="video-label">Watch Intro</span>
                        </div>
                    `}
                    <!-- Trust Badges Overlay -->
                    <${TrustBadges} coach=${coach} />
                </div>

                <!-- Rating Section - Under Profile Picture -->
                <div class="coach-rating-section" onClick=${handleReviewsClick}>
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
                            <span class="new-badge-compact">✨ NEW</span>
                        </div>
                    `}
                </div>
            </div>

            <div class="coach-info">
                <!-- Name and Title -->
                <h3 class="coach-name">
                    ${coach.full_name}
                    ${(coach.is_verified || coach.verified) && html`<span class="verified-check" title="Verified Coach">✓</span>`}
                </h3>
                <div class="coach-title">${coach.title}</div>

                <!-- Location and Languages Row -->
                <div class="coach-meta-row">
                    <span class="meta-location">📍 ${location}</span>
                    <${LanguageFlags} languages=${languages} />
                </div>

                <!-- Bio -->
                <div class="coach-bio">
                    <p>${bio.length > 120 ? bio.substring(0, 120) + '...' : bio}</p>
                </div>

                <!-- Specialties -->
                ${specialties.length > 0 ? html`
                    <div class="specialty-tags">
                        ${specialties.slice(0, 4).map(s => html`
                            <span key=${s} class="specialty-tag">${s}</span>
                        `)}
                        ${specialties.length > 4 ? html`<span class="specialty-tag more">+${specialties.length - 4}</span>` : ''}
                    </div>
                ` : ''}
            </div>

            <!-- Price Section -->
            <div class="coach-price-section">
                <div class="price-info">
                    <div class="price-label">${t('coach.hourly_rate') || 'Hourly Rate'}</div>
                    <div class="price-value">${formatPrice(coach.hourly_rate)}</div>
                </div>
                <button class="btn-discovery" onClick=${(e) => { e.preventDefault(); e.stopPropagation(); setShowDiscoveryModal(true); }}>
                    📞 ${t('discovery.bookFreeCall') || 'Free Discovery Call'}
                </button>
                <a href="/coach/${coach.slug || coach.id}" class="btn-book">
                    ${t('coach.view_profile') || 'View Profile'} →
                </a>
            </div>
        </div>

        ${showVideoPopup && html`
            <${VideoPopup}
                videoUrl=${videoUrl}
                coachName=${coach.full_name}
                onClose=${() => setShowVideoPopup(false)}
            />
        `}

        ${showReviewsPopup && html`
            <${ReviewsPopup}
                coach=${coach}
                session=${session}
                onClose=${() => setShowReviewsPopup(false)}
            />
        `}

        ${showDiscoveryModal && html`
            <${DiscoveryCallModal}
                coach=${coach}
                onClose=${() => setShowDiscoveryModal(false)}
            />
        `}
    `;
});

export default CoachCard;
