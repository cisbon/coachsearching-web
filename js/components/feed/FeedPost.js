/**
 * FeedPost Component
 * Renders a single post in the feed (LinkedIn-style)
 */
import htm from '../../vendor/htm.js';
import { t } from '../../i18n.js';
import { parseVideoUrl } from './PostEditor.js';

const React = window.React;
const { useState, useCallback } = React;
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

export function FeedPost({ post, session }) {
    const [expanded, setExpanded] = useState(false);
    const [liked, setLiked] = useState(post._userLiked || false);
    const [likesCount, setLikesCount] = useState(post.likes_count || 0);

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
        } catch (err) {
            // Revert on error
            setLiked(!newLiked);
            setLikesCount(prev => newLiked ? prev - 1 : prev + 1);
            console.error('Like error:', err);
        }
    }, [liked, post.id, session]);

    const handleAuthorClick = () => {
        if (post.author_slug) {
            window.navigateTo(`/coach/${post.author_slug}`);
        }
    };

    const content = post.content || '';
    const shouldTruncate = content.length > CONTENT_TRUNCATE_LENGTH && !expanded;

    return html`
        <div class="feed-card feed-post">
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
                    <span>${liked ? '👍' : '👍'}</span>
                    <span>${t('feed.likeAction') || 'Like'}</span>
                </button>
                <button class="feed-post-action-btn">
                    <span>💬</span>
                    <span>${t('feed.commentAction') || 'Comment'}</span>
                </button>
                <button class="feed-post-action-btn">
                    <span>🔄</span>
                    <span>${t('feed.share') || 'Share'}</span>
                </button>
            </div>
        </div>
    `;
}

export default FeedPost;
