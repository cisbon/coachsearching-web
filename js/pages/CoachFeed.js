/**
 * CoachFeed - Feed page for signed-in coaches
 * Uses shared FeedLayout for the 3-column structure, post loading, and infinite scroll.
 * Only defines coach-specific profile loading and sidebar content.
 */
import htm from '../vendor/htm.js';
import { t } from '../i18n.js';
import { FeedLayout } from '../components/feed/FeedLayout.js';
import { useMyCoachProfileQuery, useCoachAnalyticsQuery } from '../hooks/useSupabaseQuery.js';

const React = window.React;
const { useState } = React;
const html = htm.bind(React.createElement);

export function CoachFeed({ session }) {
    const [recommendationLink, setRecommendationLink] = useState('');
    const [linkCopied, setLinkCopied] = useState(false);
    const [inviteLink] = useState(`${window.location.origin}/onboarding`);
    const [inviteCopied, setInviteCopied] = useState(false);

    // Cached coach profile via TanStack Query
    const { data: coachProfile } = useMyCoachProfileQuery(session?.user?.id);

    // Cached analytics via TanStack Query
    const { data: analytics } = useCoachAnalyticsQuery(coachProfile?.id);
    const analyticsData = analytics || { views: 0, searches: 0, discoveryRequests: 0 };

    const handleGenerateRecommendationLink = () => {
        if (!coachProfile) return;
        const link = `${window.location.origin}/coach/${coachProfile.slug || coachProfile.id}?action=recommend`;
        setRecommendationLink(link);
    };

    const handleCopyLink = (text, setCopied) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const profileUrl = coachProfile ? `/coach/${coachProfile.slug || coachProfile.id}` : '/dashboard';

    // ===== LEFT COLUMN =====
    const leftColumn = html`
        <div class="feed-left-column">
            <!-- My Profile Preview -->
            <div class="feed-card feed-profile-preview">
                <div class="feed-profile-banner" style=${coachProfile?.banner_url ? { backgroundImage: `url(${coachProfile.banner_url})` } : {}}></div>
                <img src=${coachProfile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(coachProfile?.full_name || 'C')}&background=006266&color=fff`} alt="" class="feed-profile-avatar" />
                <h3 class="feed-profile-name">
                    <a href=${profileUrl}>${coachProfile?.full_name || session?.user?.email?.split('@')[0] || ''}</a>
                </h3>
                <p class="feed-profile-title">${coachProfile?.title || ''}</p>
                <div class="feed-profile-stats">
                    <div class="feed-profile-stat">
                        <span class="feed-profile-stat-label">${t('feed.profileViews') || 'Profile views'}</span>
                        <span class="feed-profile-stat-value">${analyticsData.views}</span>
                    </div>
                    <div class="feed-profile-stat">
                        <span class="feed-profile-stat-label">${t('feed.discoveryRequests') || 'Discovery requests'}</span>
                        <span class="feed-profile-stat-value">${analyticsData.discoveryRequests}</span>
                    </div>
                </div>
                <a href=${profileUrl} class="feed-profile-link">${t('feed.viewMyProfile') || 'View my profile'}</a>
            </div>

            <!-- Recommendation Link -->
            <div class="feed-card recommendation-link-section">
                <div class="feed-card-header">
                    <h4 class="feed-card-title">🔗 ${t('feed.recommendationLink') || 'Recommendation Link'}</h4>
                </div>
                <div class="feed-card-body">
                    <p class="recommendation-link-desc">
                        ${t('feed.recommendationLinkDesc') || 'Generate a one-time link to send to clients so they can leave you a recommendation.'}
                    </p>
                    ${!recommendationLink ? html`
                        <button class="btn-generate-link" onClick=${handleGenerateRecommendationLink}>
                            ✨ ${t('feed.generateLink') || 'Generate Link'}
                        </button>
                    ` : html`
                        <div class="recommendation-link-url">
                            <input class="recommendation-link-input" value=${recommendationLink} readOnly />
                            <button class="btn-copy-link" onClick=${() => handleCopyLink(recommendationLink, setLinkCopied)}>
                                ${linkCopied ? '✓' : (t('feed.copy') || 'Copy')}
                            </button>
                        </div>
                        ${linkCopied && html`<div class="recommendation-link-copied">${t('feed.linkCopied') || 'Link copied!'}</div>`}
                    `}
                </div>
            </div>
        </div>
    `;

    // ===== RIGHT COLUMN =====
    const rightColumn = html`
        <div class="feed-right-column">
            <!-- Invite New Coach -->
            <div class="feed-card feed-invite-section">
                <div class="feed-card-header">
                    <h4 class="feed-card-title">🤝 ${t('feed.inviteCoach') || 'Invite a Coach'}</h4>
                </div>
                <div class="feed-card-body">
                    <p class="invite-desc">
                        ${t('feed.inviteCoachDesc') || 'Know a great coach? Invite them to join the platform and grow the community!'}
                    </p>
                    <div class="invite-link-row">
                        <input class="invite-link-input" value=${inviteLink} readOnly />
                        <button class="btn-invite-copy" onClick=${() => handleCopyLink(inviteLink, setInviteCopied)}>
                            ${inviteCopied ? '✓' : (t('feed.copy') || 'Copy')}
                        </button>
                    </div>
                    ${inviteCopied && html`<div class="invite-copied">${t('feed.linkCopied') || 'Link copied!'}</div>`}
                </div>
            </div>
        </div>
    `;

    return html`
        <${FeedLayout}
            session=${session}
            userProfile=${coachProfile}
            leftColumn=${leftColumn}
            rightColumn=${rightColumn}
        />
    `;
}

export default CoachFeed;
