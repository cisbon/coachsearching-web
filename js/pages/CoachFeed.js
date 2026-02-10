/**
 * CoachFeed - Feed page for signed-in coaches
 * 3-column LinkedIn-style layout
 */
import htm from '../vendor/htm.js';
import { t } from '../i18n.js';
import { FeedPost } from '../components/feed/FeedPost.js';
import { CreatePost } from '../components/feed/CreatePost.js';

const React = window.React;
const { useState, useEffect, useCallback, useRef } = React;
const html = htm.bind(React.createElement);

const PAGE_SIZE = 10;

export function CoachFeed({ session }) {
    const [coachProfile, setCoachProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [showMobileSections, setShowMobileSections] = useState(false);
    const [recommendationLink, setRecommendationLink] = useState('');
    const [linkCopied, setLinkCopied] = useState(false);
    const [inviteLink] = useState(`${window.location.origin}/onboarding`);
    const [inviteCopied, setInviteCopied] = useState(false);
    const [analytics, setAnalytics] = useState({ views: 0, searches: 0, discoveryRequests: 0 });
    const sentinelRef = useRef(null);

    // Load coach profile
    useEffect(() => {
        if (!session?.user?.id) return;
        const loadProfile = async () => {
            try {
                const supabase = window.supabaseClient;
                if (!supabase) return;
                const { data } = await supabase
                    .from('cs_coaches')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .single();
                if (data) setCoachProfile(data);
            } catch (err) {
                console.error('Failed to load coach profile:', err);
            }
        };
        loadProfile();
    }, [session]);

    // Load analytics
    useEffect(() => {
        if (!coachProfile?.id) return;
        const loadAnalytics = async () => {
            try {
                const supabase = window.supabaseClient;
                if (!supabase) return;

                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                const [viewsRes, discoveryRes] = await Promise.all([
                    supabase.from('cs_profile_views')
                        .select('id', { count: 'exact', head: true })
                        .eq('coach_id', coachProfile.id)
                        .gte('created_at', thirtyDaysAgo.toISOString()),
                    supabase.from('cs_discovery_requests')
                        .select('id', { count: 'exact', head: true })
                        .eq('coach_id', coachProfile.id)
                        .gte('created_at', thirtyDaysAgo.toISOString()),
                ]);

                setAnalytics({
                    views: viewsRes.count || 0,
                    searches: 0,
                    discoveryRequests: discoveryRes.count || 0
                });
            } catch (err) {
                console.error('Failed to load analytics:', err);
            }
        };
        loadAnalytics();
    }, [coachProfile]);

    // Load feed posts
    const loadPosts = useCallback(async (offset = 0) => {
        try {
            const supabase = window.supabaseClient;
            if (!supabase) return;

            const { data, error } = await supabase
                .from('cs_posts')
                .select('*')
                .order('created_at', { ascending: false })
                .range(offset, offset + PAGE_SIZE - 1);

            if (error) throw error;

            // Check which posts current user has liked
            if (data && data.length > 0 && session?.user?.id) {
                const postIds = data.map(p => p.id);
                const { data: likes } = await supabase
                    .from('cs_post_likes')
                    .select('post_id')
                    .eq('user_id', session.user.id)
                    .in('post_id', postIds);

                const likedSet = new Set((likes || []).map(l => l.post_id));
                data.forEach(p => { p._userLiked = likedSet.has(p.id); });
            }

            if (offset === 0) {
                setPosts(data || []);
            } else {
                setPosts(prev => [...prev, ...(data || [])]);
            }
            setHasMore((data || []).length >= PAGE_SIZE);
        } catch (err) {
            console.error('Failed to load posts:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [session]);

    useEffect(() => {
        loadPosts(0);
    }, [loadPosts]);

    // Infinite scroll
    useEffect(() => {
        if (!sentinelRef.current) return;
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
                setLoadingMore(true);
                loadPosts(posts.length);
            }
        }, { threshold: 0.1 });
        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, loadingMore, loading, posts.length, loadPosts]);

    const handlePostCreated = (newPost) => {
        if (coachProfile) {
            newPost.author_name = coachProfile.full_name;
            newPost.author_avatar = coachProfile.avatar_url;
            newPost.author_title = coachProfile.title;
            newPost.author_slug = coachProfile.slug;
        }
        setPosts(prev => [newPost, ...prev]);
    };

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
    const LeftColumn = html`
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
                        <span class="feed-profile-stat-value">${analytics.views}</span>
                    </div>
                    <div class="feed-profile-stat">
                        <span class="feed-profile-stat-label">${t('feed.discoveryRequests') || 'Discovery requests'}</span>
                        <span class="feed-profile-stat-value">${analytics.discoveryRequests}</span>
                    </div>
                </div>
                <a href=${profileUrl} class="feed-profile-link">${t('feed.viewMyProfile') || 'View my profile'}</a>
            </div>

            <!-- Profile Analytics (hidden on mobile via show more) -->
            <div class="feed-card feed-analytics feed-desktop-only">
                <div class="feed-card-header">
                    <h4 class="feed-card-title">${t('feed.analytics') || 'Profile Analytics'}</h4>
                </div>
                <div class="feed-card-body">
                    <div class="analytics-stat-row">
                        <span class="analytics-stat-label">${t('feed.profileViews30d') || 'Profile views (30d)'}</span>
                        <span class="analytics-stat-value">${analytics.views}</span>
                    </div>
                    <div class="analytics-stat-row">
                        <span class="analytics-stat-label">${t('feed.discoveryRequests30d') || 'Discovery requests (30d)'}</span>
                        <span class="analytics-stat-value">${analytics.discoveryRequests}</span>
                    </div>
                </div>
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
    const RightColumn = html`
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
        <div class="feed-page">
            <div class="feed-layout">
                ${LeftColumn}

                <!-- CENTER COLUMN -->
                <div class="feed-center-column">
                    <${CreatePost}
                        session=${session}
                        userProfile=${coachProfile}
                        onPostCreated=${handlePostCreated}
                    />

                    ${loading ? html`
                        <div class="feed-loading">
                            <div class="feed-loading-spinner"></div>
                            <p>${t('feed.loading') || 'Loading feed...'}</p>
                        </div>
                    ` : posts.length === 0 ? html`
                        <div class="feed-card feed-empty">
                            <div class="feed-empty-icon">📝</div>
                            <h3 class="feed-empty-title">${t('feed.emptyTitle') || 'No posts yet'}</h3>
                            <p class="feed-empty-text">${t('feed.emptyText') || 'Be the first to share something with the community!'}</p>
                        </div>
                    ` : html`
                        ${posts.map(post => html`
                            <${FeedPost} key=${post.id} post=${post} session=${session} />
                        `)}
                        ${hasMore && html`<div ref=${sentinelRef} class="feed-loading">
                            ${loadingMore && html`<div class="feed-loading-spinner"></div>`}
                        </div>`}
                    `}

                    <!-- Mobile: show more sections -->
                    <div class="feed-mobile-show-more">
                        <button class="btn-show-more-sections" onClick=${() => setShowMobileSections(!showMobileSections)}>
                            ${showMobileSections ? (t('feed.showLess') || 'Show less') : (t('feed.showMore') || 'Show more sections')} ${showMobileSections ? '▲' : '▼'}
                        </button>
                        ${showMobileSections && html`
                            <div class="feed-right-mobile-shown">
                                ${RightColumn}
                            </div>
                        `}
                    </div>
                </div>

                ${RightColumn}
            </div>
        </div>
    `;
}

export default CoachFeed;
