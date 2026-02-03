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
import { useCities } from '../../context/AppContext.js';

const React = window.React;
const { useState, useEffect, memo, useMemo } = React;
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

    // Get cities for location lookup with localized names
    const { cities, getLocalizedCityName } = useCities();

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

    // Get localized city name from city_id lookup
    const location = useMemo(() => {
        // If coach has city_id, look up the city and get localized name
        if (coach.city_id && cities.list?.length > 0) {
            const city = cities.list.find(c => c.id === coach.city_id);
            if (city) {
                return getLocalizedCityName(city);
            }
        }
        // Fallback to legacy location fields
        return coach.location_city || coach.location || '';
    }, [coach.city_id, coach.location_city, coach.location, cities.list, getLocalizedCityName]);

    const languages = coach.languages || [];
    const specialties = coach.specialties || [];
    const bio = coach.bio || '';
    const videoUrl = coach.intro_video_url || coach.video_url;
    const hasVideo = !!videoUrl;

    // Session formats
    const sessionTypes = coach.session_types || [];
    const offersVideo = sessionTypes.includes('video') || coach.offers_virtual;
    const offersInPerson = sessionTypes.includes('in-person') || coach.offers_onsite;

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
                </h3>
                <div class="coach-title">${coach.title}</div>

                <!-- Location and Languages Row -->
                <div class="coach-meta-row">
                    ${location && html`<span class="meta-location">📍 ${location}</span>`}
                    <${LanguageFlags} languages=${languages} />
                </div>

                <!-- Session Formats Row -->
                ${(offersVideo || offersInPerson) && html`
                    <div class="coach-session-formats" style=${{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '0.85rem', color: '#64748b' }}>
                        ${offersVideo && html`<span>💻 Video Call</span>`}
                        ${offersInPerson && html`<span>🤝 In-Person</span>`}
                    </div>
                `}

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
