/**
 * ClientFeed - Feed page for signed-in clients and businesses
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
    const [userProfile, setUserProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [showMobileSections, setShowMobileSections] = useState(false);
    const [suggestedCoaches, setSuggestedCoaches] = useState([]);
    const sentinelRef = useRef(null);

    // Load user profile
    useEffect(() => {
        if (!session?.user?.id) return;
        const loadProfile = async () => {
            try {
                const supabase = window.supabaseClient;
                if (!supabase) return;

                // Try to load from cs_users
                const { data } = await supabase
                    .from('cs_users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (data) {
                    setUserProfile({
                        full_name: data.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
                        avatar_url: data.avatar_url || session.user.user_metadata?.avatar_url,
                        banner_url: data.banner_url || null,
                        title: data.title || null,
                        slug: null,
                    });
                } else {
                    setUserProfile({
                        full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
                        avatar_url: session.user.user_metadata?.avatar_url,
                        title: null,
                        slug: null,
                    });
                }
            } catch {
                setUserProfile({
                    full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
                    avatar_url: null,
                    title: null,
                    slug: null,
                });
            }
        };
        loadProfile();
    }, [session]);

    // Load suggested coaches
    useEffect(() => {
        const loadSuggested = async () => {
            try {
                const supabase = window.supabaseClient;
                if (!supabase) return;

                const { data } = await supabase
                    .from('cs_coaches')
                    .select('id, full_name, slug, title, avatar_url, rating_average, rating_count')
                    .eq('onboarding_completed', true)
                    .order('rating_average', { ascending: false })
                    .limit(5);

                setSuggestedCoaches(data || []);
            } catch (err) {
                console.error('Failed to load suggested coaches:', err);
            }
        };
        loadSuggested();
    }, []);

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
        if (userProfile) {
            newPost.author_name = userProfile.full_name;
            newPost.author_avatar = userProfile.avatar_url;
            newPost.author_title = userProfile.title;
        }
        setPosts(prev => [newPost, ...prev]);
    };

    const displayName = userProfile?.full_name || session?.user?.email?.split('@')[0] || '';
    const avatarUrl = userProfile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=006266&color=fff`;

    // ===== LEFT COLUMN =====
    const LeftColumn = html`
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
    const RightColumn = html`
        <div class="feed-right-column">
            <!-- Coaches You Might Like -->
            <div class="feed-card">
                <div class="feed-card-header">
                    <h4 class="feed-card-title">✨ ${t('feed.coachesForYou') || 'Coaches you might like'}</h4>
                </div>
                <div class="feed-card-body">
                    ${suggestedCoaches.length > 0 ? html`
                        <div class="suggested-coaches-list">
                            ${suggestedCoaches.map(coach => html`
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
        <div class="feed-page">
            <div class="feed-layout">
                ${LeftColumn}

                <!-- CENTER COLUMN -->
                <div class="feed-center-column">
                    <${CreatePost}
                        session=${session}
                        userProfile=${userProfile}
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

export default ClientFeed;
