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
import { QUERY_KEYS, STALE_TIMES } from '../../config/queryConfig.js';

const React = window.React;
const { useState, useCallback, useEffect, useRef } = React;
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

/* ─── Toast notification helper ─────────────────────────────────── */
let toastTimeout = null;
function showToast(message) {
    let container = document.getElementById('feed-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'feed-toast-container';
        container.className = 'feed-toast-container';
        document.body.appendChild(container);
    }
    container.textContent = message;
    container.classList.add('visible');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        container.classList.remove('visible');
    }, 3000);
}

/* ─── PostComments sub-component ────────────────────────────────── */
function PostComments({ postId, session, commentsCount }) {
    const [comments, setComments] = useState([]);
    const [showAll, setShowAll] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [totalCount, setTotalCount] = useState(commentsCount || 0);
    const scrollRef = useRef(null);

    const loadComments = useCallback(async () => {
        const supabase = window.supabaseClient;
        if (!supabase) return;

        const cached = queryClient.getQueryData(QUERY_KEYS.postComments(postId));
        if (cached) {
            setComments(cached);
            setTotalCount(cached.length);
            setLoaded(true);
            return;
        }

        const { data, error } = await supabase
            .from('cs_post_comments')
            .select('*')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

        if (!error && data) {
            queryClient.setQueryData(QUERY_KEYS.postComments(postId), data);
            setComments(data);
            setTotalCount(data.length);
        }
        setLoaded(true);
    }, [postId]);

    // Load comments on mount
    useEffect(() => {
        loadComments();
    }, [loadComments]);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (!session?.user?.id || !commentText.trim() || submitting) return;
        setSubmitting(true);

        try {
            const supabase = window.supabaseClient;
            if (!supabase) return;

            const userName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User';
            const userAvatar = session.user.user_metadata?.avatar_url || null;

            const { data, error } = await supabase
                .from('cs_post_comments')
                .insert({
                    post_id: postId,
                    user_id: session.user.id,
                    content: commentText.trim(),
                    author_name: userName,
                    author_avatar: userAvatar
                })
                .select()
                .single();

            if (!error && data) {
                setComments(prev => [...prev, data]);
                setTotalCount(prev => prev + 1);
                setCommentText('');
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.postComments(postId) });
                queryClient.invalidateQueries({ queryKey: ['feed'] });
                queryClient.invalidateQueries({ queryKey: ['client', 'posts'] });
                queryClient.invalidateQueries({ queryKey: ['posts', 'activity'] });
            }
        } catch (err) {
            console.error('Comment submit error:', err);
        } finally {
            setSubmitting(false);
        }
    }, [commentText, postId, session, submitting]);

    const handleDelete = useCallback(async (commentId) => {
        if (!session?.user?.id) return;
        try {
            const supabase = window.supabaseClient;
            if (!supabase) return;

            const { error } = await supabase
                .from('cs_post_comments')
                .delete()
                .eq('id', commentId)
                .eq('user_id', session.user.id);

            if (!error) {
                setComments(prev => prev.filter(c => c.id !== commentId));
                setTotalCount(prev => Math.max(0, prev - 1));
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.postComments(postId) });
                queryClient.invalidateQueries({ queryKey: ['feed'] });
                queryClient.invalidateQueries({ queryKey: ['client', 'posts'] });
                queryClient.invalidateQueries({ queryKey: ['posts', 'activity'] });
            }
        } catch (err) {
            console.error('Comment delete error:', err);
        }
    }, [postId, session]);

    const visibleComments = showAll ? comments : comments.slice(-1);
    const hasMore = comments.length > 1 && !showAll;

    return html`
        <div class="feed-comments-section">
            ${loaded && comments.length > 0 && html`
                <div class="feed-comments-list">
                    ${hasMore && html`
                        <button class="feed-comments-show-more" onClick=${() => setShowAll(true)}>
                            ${t('feed.showMoreComments') || 'Show more comments'} (${totalCount})
                        </button>
                    `}
                    <div class="feed-comments-scroll ${showAll && comments.length > 4 ? 'scrollable' : ''}" ref=${scrollRef}>
                        ${visibleComments.map(comment => html`
                            <div class="feed-comment" key=${comment.id}>
                                <img
                                    src=${comment.author_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author_name || 'User')}&background=006266&color=fff&size=32`}
                                    alt=${comment.author_name}
                                    class="feed-comment-avatar"
                                />
                                <div class="feed-comment-body">
                                    <div class="feed-comment-bubble">
                                        <span class="feed-comment-author">${comment.author_name || 'User'}</span>
                                        <span class="feed-comment-text">${comment.content}</span>
                                    </div>
                                    <div class="feed-comment-meta">
                                        <span class="feed-comment-time">${timeAgo(comment.created_at)}</span>
                                        ${session?.user?.id === comment.user_id && html`
                                            <button class="feed-comment-delete" onClick=${() => handleDelete(comment.id)}>
                                                ${t('feed.deleteComment') || 'Delete'}
                                            </button>
                                        `}
                                    </div>
                                </div>
                            </div>
                        `)}
                    </div>
                </div>
            `}
            ${session?.user?.id && html`
                <form class="feed-comment-form" onSubmit=${handleSubmit}>
                    <img
                        src=${session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user.user_metadata?.full_name || 'U')}&background=006266&color=fff&size=32`}
                        alt="You"
                        class="feed-comment-avatar"
                    />
                    <input
                        type="text"
                        class="feed-comment-input"
                        placeholder=${t('feed.addComment') || 'Write a comment...'}
                        value=${commentText}
                        onInput=${(e) => setCommentText(e.target.value)}
                        disabled=${submitting}
                    />
                    ${commentText.trim() && html`
                        <button type="submit" class="feed-comment-submit" disabled=${submitting}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    `}
                </form>
            `}
        </div>
    `;
}

export function FeedPost({ post, session, onHighlightToggle, compact }) {
    const [expanded, setExpanded] = useState(false);
    const [liked, setLiked] = useState(post._userLiked || false);
    const [likesCount, setLikesCount] = useState(post.likes_count || 0);
    const [highlighted, setHighlighted] = useState(post._userHighlighted || false);
    const [reposted, setReposted] = useState(post._userReposted || false);
    const [showComments, setShowComments] = useState(false);

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
            queryClient.invalidateQueries({ queryKey: ['client', 'posts'] });
            queryClient.invalidateQueries({ queryKey: ['posts', 'activity'] });
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
            queryClient.invalidateQueries({ queryKey: ['client', 'posts'] });
            queryClient.invalidateQueries({ queryKey: ['posts', 'activity'] });
            if (onHighlightToggle) onHighlightToggle(post.id, newHighlighted);
            showToast(newHighlighted ? (t('feed.highlighted') || 'Highlighted') : (t('feed.highlightRemoved') || 'Highlight removed'));
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
            queryClient.invalidateQueries({ queryKey: ['client', 'posts'] });
            queryClient.invalidateQueries({ queryKey: ['posts', 'activity'] });
            if (newReposted) {
                showToast(t('feed.reposted') || 'Reposted');
            }
        } catch (err) {
            setReposted(!newReposted);
            console.error('Repost error:', err);
        }
    }, [reposted, post.id, session]);

    // New schema: author data from joined cs_users object.
    // Fall back gracefully to legacy author_* fields during the transition period.
    const authorName   = post.cs_users?.full_name          || post.author_name   || null;
    const authorAvatar = post.cs_users?.avatar_url         || post.author_avatar || null;
    const authorSlug   = post.cs_users?.slug               || post.author_slug   || null;
    const authorTitle  = post.cs_users?.profile_data?.title || post.author_title  || null;

    const handleShare = useCallback(() => {
        const url = `${window.location.origin}/feed?post=${post.id}`;
        if (navigator.share) {
            navigator.share({ title: authorName, text: post.content?.slice(0, 100), url });
        } else {
            navigator.clipboard.writeText(url).then(() => {
                showToast(t('feed.linkCopied') || 'Link copied!');
            });
        }
    }, [post, authorName]);

    const handleAuthorClick = () => {
        if (authorSlug) {
            if (authorSlug.startsWith('u/')) {
                window.navigateTo(`/${authorSlug}`);
            } else {
                window.navigateTo(`/coach/${authorSlug}`);
            }
        }
    };

    const handleCommentClick = () => {
        setShowComments(prev => !prev);
    };

    const content = post.content || '';
    const shouldTruncate = content.length > CONTENT_TRUNCATE_LENGTH && !expanded;

    return html`
        <div class="feed-card feed-post ${compact ? 'feed-post-compact' : ''}">
            <div class="feed-post-header">
                <img
                    src=${authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName || 'User')}&background=006266&color=fff`}
                    alt=${authorName}
                    class="feed-post-avatar"
                    onClick=${handleAuthorClick}
                />
                <div class="feed-post-meta">
                    <div class="feed-post-author" onClick=${handleAuthorClick}>${authorName || (t('feed.anonymous') || 'Anonymous')}</div>
                    ${authorTitle && html`<div class="feed-post-author-title">${authorTitle}</div>`}
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
                        ${post.video_url}
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
                <button class="feed-post-action-btn ${showComments ? 'active' : ''}" onClick=${handleCommentClick}>
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

            ${showComments && html`
                <${PostComments} postId=${post.id} session=${session} commentsCount=${post.comments_count} />
            `}
        </div>
    `;
}

export default FeedPost;
