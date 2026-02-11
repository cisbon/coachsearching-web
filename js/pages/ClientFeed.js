/**
 * ClientFeed - Feed page for signed-in clients and businesses
 * Uses shared FeedLayout for the 3-column structure, post loading, and infinite scroll.
 * Only defines client-specific profile loading and sidebar content.
 */
import htm from '../vendor/htm.js';
import { t } from '../i18n.js';
import { FeedLayout } from '../components/feed/FeedLayout.js';
import { useUserProfileQuery, useSuggestedCoachesQuery } from '../hooks/useSupabaseQuery.js';

const React = window.React;
const { useMemo } = React;
const html = htm.bind(React.createElement);

const COACHING_CATEGORIES = [
    { slug: 'life-coaching', icon: '🌟', titleKey: 'category.life.title', fallback: 'Life Coaching' },
    { slug: 'career-coaching', icon: '💼', titleKey: 'category.career.title', fallback: 'Career Coaching' },
    { slug: 'business-coaching', icon: '📊', titleKey: 'category.business.title', fallback: 'Business Coaching' },
    { slug: 'executive-coaching', icon: '👔', titleKey: 'category.executive.title', fallback: 'Executive Coaching' },
    { slug: 'leadership', icon: '👑', titleKey: 'category.leadership.title', fallback: 'Leadership Coaching' },
    { slug: 'health-wellness', icon: '💪', titleKey: 'category.health.title', fallback: 'Health & Wellness' },
    { slug: 'mindfulness', icon: '🧘', titleKey: 'category.mindfulness.title', fallback: 'Mindfulness' },
    { slug: 'relationship-coaching', icon: '💑', titleKey: 'category.relationship.title', fallback: 'Relationship Coaching' },
];

export function ClientFeed({ session }) {
    // Cached user profile via TanStack Query
    const { data: userData } = useUserProfileQuery(session?.user?.id);

    const userProfile = useMemo(() => {
        if (userData) {
            return {
                full_name: userData.full_name || session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0],
                avatar_url: userData.avatar_url || session?.user?.user_metadata?.avatar_url,
                banner_url: userData.banner_url || null,
                title: userData.title || null,
                slug: null,
            };
        }
        if (session?.user) {
            return {
                full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
                avatar_url: session.user.user_metadata?.avatar_url,
                title: null,
                slug: null,
            };
        }
        return null;
    }, [userData, session]);

    // Cached suggested coaches via TanStack Query
    const { data: suggestedCoaches } = useSuggestedCoachesQuery();
    const coaches = suggestedCoaches || [];

    const displayName = userProfile?.full_name || session?.user?.email?.split('@')[0] || '';
    const avatarUrl = userProfile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=006266&color=fff`;

    // ===== LEFT COLUMN =====
    const leftColumn = html`
        <div class="feed-left-column">
            <!-- My Profile Preview -->
            <div class="feed-card feed-profile-preview">
                <div class="feed-profile-banner" style=${userProfile?.banner_url ? { backgroundImage: `url(${userProfile.banner_url})` } : {}}></div>
                <img src=${avatarUrl} alt="" class="feed-profile-avatar" />
                <h3 class="feed-profile-name">${displayName}</h3>
                <p class="feed-profile-title">${userProfile?.title || (t('feed.clientMember') || 'Member')}</p>
                <a href="/coaches" class="feed-profile-link">${t('feed.browseCoaches') || 'Browse Coaches'}</a>
            </div>

            <!-- Coaching Categories -->
            <div class="feed-card">
                <div class="feed-card-header">
                    <h4 class="feed-card-title">🎯 ${t('feed.categories') || 'Coaching Categories'}</h4>
                </div>
                <div class="feed-card-body" style=${{ padding: '8px 8px 12px' }}>
                    <div class="feed-categories-list">
                        ${COACHING_CATEGORIES.map(cat => html`
                            <a key=${cat.slug} href="/coaching/${cat.slug}" class="feed-category-item">
                                <span class="feed-category-icon">${cat.icon}</span>
                                <span>${t(cat.titleKey) || cat.fallback}</span>
                            </a>
                        `)}
                    </div>
                </div>
            </div>
        </div>
    `;

    // ===== RIGHT COLUMN =====
    const rightColumn = html`
        <div class="feed-right-column">
            <!-- Coaches You Might Like -->
            <div class="feed-card">
                <div class="feed-card-header">
                    <h4 class="feed-card-title">✨ ${t('feed.coachesForYou') || 'Coaches you might like'}</h4>
                </div>
                <div class="feed-card-body">
                    ${coaches.length > 0 ? html`
                        <div class="suggested-coaches-list">
                            ${coaches.map(coach => html`
                                <div key=${coach.id} class="suggested-coach-item" onClick=${() => window.navigateTo(`/coach/${coach.slug || coach.id}`)}>
                                    <img
                                        src=${coach.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(coach.full_name)}&background=006266&color=fff`}
                                        alt=${coach.full_name}
                                        class="suggested-coach-avatar"
                                    />
                                    <div class="suggested-coach-info">
                                        <div class="suggested-coach-name">${coach.full_name}</div>
                                        ${coach.title && html`<div class="suggested-coach-title">${coach.title}</div>`}
                                        ${coach.rating_average > 0 && html`
                                            <div class="suggested-coach-rating">★ ${coach.rating_average.toFixed(1)} (${coach.rating_count || 0})</div>
                                        `}
                                    </div>
                                    <button class="btn-view-coach" onClick=${(e) => { e.stopPropagation(); window.navigateTo(`/coach/${coach.slug || coach.id}`); }}>
                                        ${t('feed.viewProfile') || 'View'}
                                    </button>
                                </div>
                            `)}
                        </div>
                    ` : html`
                        <p style=${{ fontSize: '0.82rem', color: '#6b7280', textAlign: 'center' }}>
                            ${t('feed.loadingCoaches') || 'Loading coaches...'}
                        </p>
                    `}
                </div>
                <a href="/coaches" class="btn-view-all-feed">${t('feed.viewAllCoaches') || 'View all coaches'} →</a>
            </div>
        </div>
    `;

    return html`
        <${FeedLayout}
            session=${session}
            userProfile=${userProfile}
            leftColumn=${leftColumn}
            rightColumn=${rightColumn}
        />
    `;
}

export default ClientFeed;
