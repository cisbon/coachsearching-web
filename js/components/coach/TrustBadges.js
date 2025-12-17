/**
 * TrustBadges Component
 * Displays trust indicators on coach cards (verified, video, free intro, etc.)
 */

import htm from '../../vendor/htm.js';

const React = window.React;
const html = htm.bind(React.createElement);

/**
 * TrustBadges Component
 * @param {Object} props
 * @param {Object} props.coach - Coach object with badge-related properties
 */
export function TrustBadges({ coach }) {
    const badges = [];

    if (coach.is_verified || coach.verified) {
        badges.push({ icon: '✓', label: 'Verified', class: 'badge-verified' });
    }
    if (coach.intro_video_url || coach.video_url) {
        badges.push({ icon: '🎬', label: 'Video', class: 'badge-video' });
    }
    if (coach.offers_free_intro || coach.free_discovery_call) {
        badges.push({ icon: '🎁', label: 'Free Intro', class: 'badge-free' });
    }
    if (coach.certifications?.length > 0 || coach.credentials?.length > 0) {
        badges.push({ icon: '🎓', label: 'Certified', class: 'badge-certified' });
    }
    if ((coach.rating_count || coach.reviews_count || 0) >= 10) {
        badges.push({ icon: '⭐', label: 'Popular', class: 'badge-popular' });
    }
    if (coach.is_founding_coach || coach.founding_member) {
        badges.push({ icon: '🏆', label: 'Founding', class: 'badge-founding' });
    }

    if (badges.length === 0) return null;

    return html`
        <div class="trust-badges">
            ${badges.slice(0, 4).map(badge => html`
                <span key=${badge.label} class="trust-badge ${badge.class}" title=${badge.label}>
                    ${badge.icon}
                </span>
            `)}
        </div>
    `;
}

export default TrustBadges;
