/**
 * Client Profile Page
 * Public profile page for clients at /u/{slug}
 * Shows profile info, avatar, banner, and the client's posts.
 */
import htm from '../vendor/htm.js';
import { t } from '../i18n.js';
import { FeedPost } from '../components/feed/FeedPost.js';
import { queryClient } from '../config/queryClient.js';
import { QUERY_KEYS, STALE_TIMES } from '../config/queryConfig.js';

const React = window.React;
const { useState, useEffect, useCallback } = React;
const html = htm.bind(React.createElement);

const PAGE_SIZE = 10;

export function ClientProfilePage({ clientSlug, session }) {
    const [client, setClient] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [postsLoading, setPostsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState(null);

    const loadClient = useCallback(async () => {
        const supabase = window.supabaseClient;
        if (!supabase || !clientSlug) return;

        setLoading(true);
        setError(null);

        try {
            const data = await queryClient.fetchQuery({
                queryKey: QUERY_KEYS.clientBySlug(clientSlug),
                queryFn: async () => {
                    const { data, error } = await supabase
                        .from('cs_clients')
                        .select('*')
                        .eq('slug', clientSlug)
                        .single();
                    if (error) throw error;
                    return data;
                },
                staleTime: STALE_TIMES.clientProfile,
            });

            setClient(data);
        } catch (err) {
            console.error('Failed to load client:', err);
            setError('Profile not found');
        } finally {
            setLoading(false);
        }
    }, [clientSlug]);

    const loadPosts = useCallback(async (offset = 0) => {
        if (!client?.user_id) return;
        const supabase = window.supabaseClient;
        if (!supabase) return;

        setPostsLoading(true);
        try {
            const data = await queryClient.fetchQuery({
                queryKey: QUERY_KEYS.clientPosts(client.user_id, offset),
                queryFn: async () => {
                    const { data, error } = await supabase
                        .from('cs_posts')
                        .select('*')
                        .eq('user_id', client.user_id)
                        .order('created_at', { ascending: false })
                        .range(offset, offset + PAGE_SIZE - 1);
                    if (error) throw error;
                    return data || [];
                },
                staleTime: STALE_TIMES.clientPosts,
            });

            // Check user interactions for this batch
            if (data.length > 0 && session?.user?.id) {
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
                setPosts(data);
            } else {
                setPosts(prev => [...prev, ...data]);
            }
            setHasMore(data.length >= PAGE_SIZE);
        } catch (err) {
            console.error('Failed to load posts:', err);
        } finally {
            setPostsLoading(false);
        }
    }, [client, session]);

    useEffect(() => {
        loadClient();
    }, [loadClient]);

    useEffect(() => {
        if (client) loadPosts(0);
    }, [client, loadPosts]);

    if (loading) {
        return html`
            <div class="client-profile-loading">
                <div class="feed-loading-spinner"></div>
                <p>${t('common.loading') || 'Loading...'}</p>
            </div>
        `;
    }

    if (error || !client) {
        return html`
            <div class="client-profile-error">
                <h2>${t('client.profileNotFound') || 'Profile not found'}</h2>
                <p>${t('client.profileNotFoundDesc') || 'This profile does not exist or has been removed.'}</p>
                <a href="/feed" class="btn-back-feed">${t('client.backToFeed') || 'Back to Feed'}</a>
            </div>
        `;
    }

    const displayName = client.full_name || 'User';
    const avatarUrl = client.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=006266&color=fff&size=128`;
    const isOwnProfile = session?.user?.id === client.user_id;

    return html`
        <div class="client-profile-page">
            <div class="client-profile-container">
                <!-- Profile Header -->
                <div class="client-profile-card">
                    <div class="client-profile-banner" style=${client.banner_url ? { backgroundImage: `url(${client.banner_url})` } : {}}></div>
                    <div class="client-profile-header-content">
                        <img
                            src=${avatarUrl}
                            alt=${displayName}
                            class="client-profile-avatar"
                        />
                        <div class="client-profile-info">
                            <h1 class="client-profile-name">${displayName}</h1>
                            ${client.timezone && html`
                                <p class="client-profile-detail">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style=${{ verticalAlign: 'middle', marginRight: '4px' }}>
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <polyline points="12 6 12 12 16 14"></polyline>
                                    </svg>
                                    ${client.timezone}
                                </p>
                            `}
                            <p class="client-profile-member-since">
                                ${t('client.memberSince') || 'Member since'} ${new Date(client.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Posts Section -->
                <div class="client-profile-posts-section">
                    <h3 class="client-profile-section-title">
                        ${t('client.posts') || 'Posts'}
                        ${posts.length > 0 ? ` (${posts.length}${hasMore ? '+' : ''})` : ''}
                    </h3>

                    ${posts.length === 0 && !postsLoading ? html`
                        <div class="client-profile-no-posts">
                            <p>${isOwnProfile
                                ? (t('client.noPostsOwn') || 'You haven\'t posted anything yet. Share your thoughts on the feed!')
                                : (t('client.noPosts') || 'No posts yet.')}</p>
                        </div>
                    ` : html`
                        <div class="client-profile-posts-list">
                            ${posts.map(post => html`
                                <${FeedPost} key=${post.id} post=${post} session=${session} />
                            `)}
                        </div>
                    `}

                    ${postsLoading && html`
                        <div class="client-profile-posts-loading">
                            <div class="feed-loading-spinner"></div>
                        </div>
                    `}

                    ${hasMore && posts.length > 0 && !postsLoading && html`
                        <button class="btn-show-more-posts" onClick=${() => loadPosts(posts.length)}>
                            ${t('client.loadMorePosts') || 'Load more posts'}
                        </button>
                    `}
                </div>
            </div>
        </div>
    `;
}

export default ClientProfilePage;
