/**
 * FeedLayout - Shared 3-column feed layout with post loading and infinite scroll.
 * Used by both CoachFeed and ClientFeed to avoid duplicating the center column,
 * post fetching, and infinite scroll logic.
 *
 * Props:
 *   session       - Supabase session
 *   userProfile   - { full_name, avatar_url, title, slug, ... }
 *   leftColumn    - VNode for the left sidebar
 *   rightColumn   - VNode for the right sidebar
 */
import htm from '../../vendor/htm.js';
import { t } from '../../i18n.js';
import { FeedPost } from './FeedPost.js';
import { CreatePost } from './CreatePost.js';
import { queryClient } from '../../config/queryClient.js';
import { QUERY_KEYS, STALE_TIMES } from '../../config/queryConfig.js';

const React = window.React;
const { useState, useEffect, useCallback, useRef } = React;
const html = htm.bind(React.createElement);

const PAGE_SIZE = 10;

export function FeedLayout({ session, userProfile, leftColumn, rightColumn }) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [showMobileSections, setShowMobileSections] = useState(false);
    const sentinelRef = useRef(null);

    // Enrich posts with author data from cs_users (since author_ columns removed from cs_posts)
    const enrichPostsWithAuthors = async (posts) => {
        const supabase = window.supabaseClient;
        if (!supabase || !posts || posts.length === 0) return posts;
        const userIds = [...new Set(posts.map(p => p.user_id).filter(Boolean))];
        if (userIds.length === 0) return posts;
        const { data: usersData } = await supabase
            .from('cs_users')
            .select('id, full_name, avatar_url, title, slug')
            .in('id', userIds);
        const userMap = {};
        (usersData || []).forEach(u => { userMap[u.id] = u; });
        posts.forEach(p => {
            const user = userMap[p.user_id] || {};
            p.author_name = user.full_name || '';
            p.author_avatar = user.avatar_url || null;
            p.author_title = user.title || null;
            p.author_slug = user.slug || null;
        });
        return posts;
    };

    // Load feed posts (cached via TanStack Query)
    const loadPosts = useCallback(async (offset = 0) => {
        try {
            const supabase = window.supabaseClient;
            if (!supabase) return;

            const data = await queryClient.fetchQuery({
                queryKey: QUERY_KEYS.feedPosts(offset),
                queryFn: async () => {
                    const { data: d, error } = await supabase
                        .from('cs_posts')
                        .select('*')
                        .order('created_at', { ascending: false })
                        .range(offset, offset + PAGE_SIZE - 1);
                    if (error) throw error;
                    return d || [];
                },
                staleTime: STALE_TIMES.feedPosts,
            });

            // Enrich posts with author data from cs_users
            await enrichPostsWithAuthors(data);

            // Check which posts current user has liked, highlighted, reposted
            if (data && data.length > 0 && session?.user?.id) {
                const postIds = data.map(p => p.id);
                const [likesRes, highlightsRes, repostsRes] = await Promise.all([
                    supabase.from('cs_post_likes').select('post_id').eq('user_id', session.user.id).in('post_id', postIds),
                    supabase.from('cs_post_highlights').select('post_id').eq('user_id', session.user.id).in('post_id', postIds),
                    supabase.from('cs_post_reposts').select('post_id').eq('user_id', session.user.id).in('post_id', postIds),
                ]);

                const likedSet = new Set((likesRes.data || []).map(l => l.post_id));
                const highlightedSet = new Set((highlightsRes.data || []).map(h => h.post_id));
                const repostedSet = new Set((repostsRes.data || []).map(r => r.post_id));
                data.forEach(p => {
                    p._userLiked = likedSet.has(p.id);
                    p._userHighlighted = highlightedSet.has(p.id);
                    p._userReposted = repostedSet.has(p.id);
                });
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
        // Populate author fields from userProfile (since columns removed from cs_posts)
        newPost.author_name = userProfile?.full_name || '';
        newPost.author_avatar = userProfile?.avatar_url || null;
        newPost.author_title = userProfile?.title || null;
        newPost.author_slug = userProfile?.slug || null;
        setPosts(prev => [newPost, ...prev]);
    };

    return html`
        <div class="feed-page">
            <div class="feed-layout">
                ${leftColumn}

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
                                ${rightColumn}
                            </div>
                        `}
                    </div>
                </div>

                ${rightColumn}
            </div>
        </div>
    `;
}

export default FeedLayout;
