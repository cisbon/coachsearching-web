/**
 * FeedPost Component
 * Renders a single post in the feed (LinkedIn-style).
 * Reusable in main feed, coach profile featured section, and activity section.
 *
 * Props:
 *   post            - post object from cs_posts
 *   session         - Supabase session
 *   onHighlightToggle - (postId, isHighlighted) => void  (optional, for profile page)
 *   compact         - boolean, if true renders slightly compact version
 */
import htm from '../../vendor/htm.js';
import { t } from '../../i18n.js';
import { parseVideoUrl } from './PostEditor.js';
import { queryClient } from '../../config/queryClient.js';
import { QUERY_KEYS } from '../../config/queryConfig.js';

const React = window.React;
const { useState, useCallback, useEffect } = React;
const html = htm.bind(React.createElement);

/**
 * Format relative time (e.g., "2h ago", "3d ago")
 */
function timeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    const diffWeek = Math.floor(diffDay / 7);

    if (diffMin < 1) return t('feed.justNow') || 'just now';
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHr < 24) return `${diffHr}h`;
    if (diffDay < 7) return `${diffDay}d`;
    if (diffWeek < 4) return `${diffWeek}w`;
    return date.toLocaleDateString();
}

const CONTENT_TRUNCATE_LENGTH = 300;

export function FeedPost({ post, session, onHighlightToggle, compact }) {
    const [expanded, setExpanded] = useState(false);
    const [liked, setLiked] = useState(post._userLiked || false);
    const [likesCount, setLikesCount] = useState(post.likes_count || 0);
    const [highlighted, setHighlighted] = useState(post._userHighlighted || false);
    const [reposted, setReposted] = useState(post._userReposted || false);

    // Sync from prop changes (e.g. when post list refreshes)
    useEffect(() => {
        setHighlighted(post._userHighlighted || false);
    }, [post._userHighlighted]);

    useEffect(() => {
        setReposted(post._userReposted || false);
    }, [post._userReposted]);

    const handleLike = useCallback(async () => {
        if (!session?.user?.id) return;

        const newLiked = !liked;
        setLiked(newLiked);
        setLikesCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1));

        try {
            const supabase = window.supabaseClient;
            if (!supabase) return;

            if (newLiked) {
                await supabase.from('cs_post_likes').insert({
                    post_id: post.id,
                    user_id: session.user.id
                });
            } else {
                await supabase.from('cs_post_likes')
                    .delete()
                    .eq('post_id', post.id)
                    .eq('user_id', session.user.id);
            }
            queryClient.invalidateQueries({ queryKey: ['feed'] });
        } catch (err) {
            setLiked(!newLiked);
            setLikesCount(prev => newLiked ? prev - 1 : prev + 1);
            console.error('Like error:', err);
        }
    }, [liked, post.id, session]);

    const handleHighlight = useCallback(async () => {
        if (!session?.user?.id) return;

        const newHighlighted = !highlighted;
        setHighlighted(newHighlighted);

        try {
            const supabase = window.supabaseClient;
            if (!supabase) return;

            if (newHighlighted) {
                await supabase.from('cs_post_highlights').insert({
                    post_id: post.id,
                    user_id: session.user.id
                });
            } else {
                await supabase.from('cs_post_highlights')
                    .delete()
                    .eq('post_id', post.id)
                    .eq('user_id', session.user.id);
            }

            queryClient.invalidateQueries({ queryKey: ['feed'] });
            queryClient.invalidateQueries({ queryKey: ['posts', 'highlighted'] });
            if (onHighlightToggle) onHighlightToggle(post.id, newHighlighted);
        } catch (err) {
            setHighlighted(!newHighlighted);
            console.error('Highlight error:', err);
        }
    }, [highlighted, post.id, session, onHighlightToggle]);

    const handleRepost = useCallback(async () => {
        if (!session?.user?.id) return;

        const newReposted = !reposted;
        setReposted(newReposted);

        try {
            const supabase = window.supabaseClient;
            if (!supabase) return;

            if (newReposted) {
                await supabase.from('cs_post_reposts').insert({
                    post_id: post.id,
                    user_id: session.user.id
                });
            } else {
                await supabase.from('cs_post_reposts')
                    .delete()
                    .eq('post_id', post.id)
                    .eq('user_id', session.user.id);
            }
            queryClient.invalidateQueries({ queryKey: ['feed'] });
        } catch (err) {
            setReposted(!newReposted);
            console.error('Repost error:', err);
        }
    }, [reposted, post.id, session]);

    const handleShare = useCallback(() => {
        const url = `${window.location.origin}/feed?post=${post.id}`;
        if (navigator.share) {
            navigator.share({ title: post.author_name, text: post.content?.slice(0, 100), url });
        } else {
            navigator.clipboard.writeText(url).then(() => {
                // Simple feedback
                const el = document.getElementById(`share-feedback-${post.id}`);
                if (el) { el.textContent = t('feed.linkCopied') || 'Link copied!'; setTimeout(() => { el.textContent = ''; }, 2000); }
            });
        }
    }, [post]);

    const handleAuthorClick = () => {
        if (post.author_slug) {
            window.navigateTo(`/coach/${post.author_slug}`);
        }
    };

    const content = post.content || '';
    const shouldTruncate = content.length > CONTENT_TRUNCATE_LENGTH && !expanded;

    return html`
        <div class="feed-card feed-post ${compact ? 'feed-post-compact' : ''}">
            <div class="feed-post-header">
                <img
                    src=${post.author_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author_name || 'User')}&background=006266&color=fff`}
                    alt=${post.author_name}
                    class="feed-post-avatar"
                    onClick=${handleAuthorClick}
                />
                <div class="feed-post-meta">
                    <div class="feed-post-author" onClick=${handleAuthorClick}>${post.author_name || (t('feed.anonymous') || 'Anonymous')}</div>
                    ${post.author_title && html`<div class="feed-post-author-title">${post.author_title}</div>`}
                    <div class="feed-post-time">${timeAgo(post.created_at)}</div>
                </div>
                <!-- Highlight star -->
                ${session?.user?.id && html`
                    <button class="feed-post-highlight-btn ${highlighted ? 'highlighted' : ''}" onClick=${handleHighlight}
                        title=${highlighted ? (t('feed.removeHighlight') || 'Remove highlight') : (t('feed.addHighlight') || 'Add to highlights')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill=${highlighted ? '#f59e0b' : 'none'} stroke=${highlighted ? '#f59e0b' : '#9ca3af'} stroke-width="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                    </button>
                `}
            </div>

            <div class="feed-post-content ${shouldTruncate ? 'truncated' : ''}">
                ${shouldTruncate ? content.slice(0, CONTENT_TRUNCATE_LENGTH) + '...' : content}
            </div>
            ${shouldTruncate && html`
                <button class="btn-read-more" onClick=${() => setExpanded(true)}>
                    ${t('feed.readMore') || '...see more'}
                </button>
            `}

            ${post.image_url && html`
                <img src=${post.image_url} alt="" class="feed-post-image" />
            `}

            ${post.video_url && (() => {
                const embed = parseVideoUrl(post.video_url);
                return embed ? html`
                    <div class="feed-post-video">
                        <iframe
                            src=${embed.embedUrl}
                            class="feed-post-video-iframe"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                    </div>
                ` : html`
                    <a href=${post.video_url} target="_blank" rel="noopener noreferrer" class="feed-post-video-link">
                        🎥 ${post.video_url}
                    </a>
                `;
            })()}

            ${(likesCount > 0 || post.comments_count > 0) && html`
                <div class="feed-post-stats">
                    <span>${likesCount > 0 ? `${likesCount} ${likesCount === 1 ? (t('feed.like') || 'like') : (t('feed.likes') || 'likes')}` : ''}</span>
                    <span>${post.comments_count > 0 ? `${post.comments_count} ${post.comments_count === 1 ? (t('feed.comment') || 'comment') : (t('feed.comments') || 'comments')}` : ''}</span>
                </div>
            `}

            <div class="feed-post-actions">
                <button class="feed-post-action-btn ${liked ? 'liked' : ''}" onClick=${handleLike}>
                    <span>👍</span>
                    <span>${t('feed.likeAction') || 'Like'}</span>
                </button>
                <button class="feed-post-action-btn">
                    <span>💬</span>
                    <span>${t('feed.commentAction') || 'Comment'}</span>
                </button>
                <button class="feed-post-action-btn ${reposted ? 'reposted' : ''}" onClick=${handleRepost}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style=${{ verticalAlign: 'middle' }}>
                        <polyline points="17 1 21 5 17 9"></polyline>
                        <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                        <polyline points="7 23 3 19 7 15"></polyline>
                        <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                    </svg>
                    <span>${t('feed.repost') || 'Repost'}</span>
                </button>
                <button class="feed-post-action-btn" onClick=${handleShare}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style=${{ verticalAlign: 'middle' }}>
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                    <span>${t('feed.share') || 'Share'}</span>
                </button>
            </div>
            <span id="share-feedback-${post.id}" class="feed-share-feedback"></span>
        </div>
    `;
}

export default FeedPost;
