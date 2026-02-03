/**
 * TrustBadges Component
 * Displays trust indicators on coach cards (verified, video, free intro, etc.)
 */

import htm from '../../vendor/htm.js';

const React = window.React;
const html = htm.bind(React.createElement);

/**
 * Get the certification with the highest sort_order from coach's certifications
 * @param {Array} certifications - Array of coach certifications
 * @returns {Object|null} The certification with highest sort_order, or null
 */
function getTopCertification(certifications) {
    if (!certifications || certifications.length === 0) return null;

    // Filter certifications that have badge_url
    const withBadges = certifications.filter(c => c.cs_certifications?.badge_url);
    if (withBadges.length === 0) return null;

    // Sort by sort_order (descending) and return the first one
    const sorted = [...withBadges].sort((a, b) => {
        const sortA = a.cs_certifications?.sort_order || 0;
        const sortB = b.cs_certifications?.sort_order || 0;
        return sortB - sortA;
    });

    return sorted[0];
}

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

    // Get the top certification (highest sort_order) with badge_url
    const topCert = getTopCertification(coach.cs_coach_certifications);

    if ((coach.rating_count || coach.reviews_count || 0) >= 10) {
        badges.push({ icon: '⭐', label: 'Popular', class: 'badge-popular' });
    }
    if (coach.is_founding_coach || coach.founding_member) {
        badges.push({ icon: '🏆', label: 'Founding', class: 'badge-founding' });
    }

    // If no badges and no certification, return null
    if (badges.length === 0 && !topCert) return null;

    return html`
        <div class="trust-badges">
            ${topCert && html`
                <span class="trust-badge badge-certified certification-image-badge" title=${topCert.cs_certifications?.name || 'Certified'}>
                    <img
                        src=${topCert.cs_certifications?.badge_url}
                        alt=${topCert.cs_certifications?.short_name || topCert.cs_certifications?.name || 'Certification'}
                        class="certification-badge-img"
                    />
                </span>
            `}
            ${badges.slice(0, topCert ? 3 : 4).map(badge => html`
                <span key=${badge.label} class="trust-badge ${badge.class}" title=${badge.label}>
                    ${badge.icon}
                </span>
            `)}
        </div>
    `;
}

export default TrustBadges;
