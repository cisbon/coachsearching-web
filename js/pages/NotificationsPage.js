/**
 * NotificationsPage - Displays user notifications in a feed-like layout.
 * Shows connect requests (with accept/decline), likes, comments, reposts,
 * messages, and reviews received.
 */
import htm from '../vendor/htm.js';
import { t } from '../i18n.js';
import { QUERY_KEYS, STALE_TIMES } from '../config/queryConfig.js';
import { queryClient } from '../config/queryClient.js';
import { useNotificationCountQuery } from '../hooks/useSupabaseQuery.js';

const React = window.React;
const { useState, useEffect, useCallback, useMemo } = React;
const html = htm.bind(React.createElement);

// How far back to look for activity notifications (30 days)
const ACTIVITY_LOOKBACK_DAYS = 30;

/**
 * Resolve user profiles from a list of user IDs.
 * Tries cs_clients first, then cs_coaches for any missing.
 */
async function resolveUserProfiles(userIds) {
    if (!userIds.length) return {};
    const supabase = window.supabaseClient;
    if (!supabase) return {};

    const profiles = {};

    // Try cs_clients first
    const { data: clients } = await supabase
        .from('cs_clients')
        .select('user_id, full_name, avatar_url, slug')
        .in('user_id', userIds);
    (clients || []).forEach(c => {
        profiles[c.user_id] = { full_name: c.full_name, avatar_url: c.avatar_url, slug: c.slug, type: 'client' };
    });

    // For any missing, try cs_coaches
    const missing = userIds.filter(id => !profiles[id]);
    if (missing.length > 0) {
        const { data: coaches } = await supabase
            .from('cs_coaches')
            .select('user_id, full_name, avatar_url, slug')
            .in('user_id', missing);
        (coaches || []).forEach(c => {
            profiles[c.user_id] = { full_name: c.full_name, avatar_url: c.avatar_url, slug: c.slug, type: 'coach' };
        });
    }

    return profiles;
}

/**
 * Format a relative time string (e.g. "2 hours ago")
 */
function timeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return t('notifications.justNow') || 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w`;
    return date.toLocaleDateString();
}

export function NotificationsPage({ session }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [acceptingIds, setAcceptingIds] = useState(new Set());
    const [filter, setFilter] = useState('all');

    const userId = session?.user?.id;
    const { refetch: refetchCount } = useNotificationCountQuery(userId);

    const loadNotifications = useCallback(async () => {
        const supabase = window.supabaseClient;
        if (!supabase || !userId) return;

        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - ACTIVITY_LOOKBACK_DAYS);
            const cutoff = cutoffDate.toISOString();

            // Fetch all notification sources in parallel
            const [
                connectionsRes,
                myPostsRes,
            ] = await Promise.all([
                // 1. Pending + recently granted connection requests TO me
                supabase
                    .from('cs_connections')
                    .select('id, user_id, coach_id, connected_at, status')
                    .eq('coach_id', userId)
                    .in('status', ['pending', 'granted'])
                    .order('connected_at', { ascending: false })
                    .limit(50),
                // 2. My posts (to find likes/comments/reposts on them)
                supabase
                    .from('cs_posts')
                    .select('id, content, created_at')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(100),
            ]);

            const connections = connectionsRes.data || [];
            const myPosts = myPostsRes.data || [];
            const myPostIds = myPosts.map(p => p.id);
            const myPostMap = {};
            myPosts.forEach(p => { myPostMap[p.id] = p; });

            // Fetch activity on my posts (in parallel)
            const [likesRes, commentsRes, repostsRes] = myPostIds.length > 0
                ? await Promise.all([
                    supabase
                        .from('cs_post_likes')
                        .select('id, post_id, user_id, created_at')
                        .in('post_id', myPostIds)
                        .neq('user_id', userId)
                        .gte('created_at', cutoff)
                        .order('created_at', { ascending: false })
                        .limit(50),
                    supabase
                        .from('cs_post_comments')
                        .select('id, post_id, user_id, content, author_name, author_avatar, created_at')
                        .in('post_id', myPostIds)
                        .neq('user_id', userId)
                        .gte('created_at', cutoff)
                        .order('created_at', { ascending: false })
                        .limit(50),
                    supabase
                        .from('cs_post_reposts')
                        .select('id, post_id, user_id, reposted_at')
                        .in('post_id', myPostIds)
                        .neq('user_id', userId)
                        .gte('reposted_at', cutoff)
                        .order('reposted_at', { ascending: false })
                        .limit(50),
                ])
                : [{ data: [] }, { data: [] }, { data: [] }];

            const likes = likesRes.data || [];
            const comments = commentsRes.data || [];
            const reposts = repostsRes.data || [];

            // Collect all user IDs that need profile resolution
            const userIdsToResolve = new Set();
            connections.forEach(c => userIdsToResolve.add(c.user_id));
            likes.forEach(l => userIdsToResolve.add(l.user_id));
            reposts.forEach(r => userIdsToResolve.add(r.user_id));
            // Comments already have author_name/author_avatar

            const profiles = await resolveUserProfiles([...userIdsToResolve]);

            // Build unified notification list
            const allNotifications = [];

            // Connection requests
            connections.forEach(c => {
                const profile = profiles[c.user_id] || {};
                allNotifications.push({
                    id: `connection-${c.id}`,
                    type: 'connection',
                    connectionId: c.id,
                    status: c.status,
                    actorId: c.user_id,
                    actorName: profile.full_name || (t('notifications.someone') || 'Someone'),
                    actorAvatar: profile.avatar_url,
                    actorSlug: profile.type === 'client' ? `u/${profile.slug}` : (profile.type === 'coach' ? `coach/${profile.slug}` : null),
                    timestamp: c.connected_at,
                    message: c.status === 'pending'
                        ? (t('notifications.connectionRequest') || 'sent you a connection request')
                        : (t('notifications.connectionAccepted') || 'is now connected with you'),
                });
            });

            // Likes on my posts
            likes.forEach(l => {
                const profile = profiles[l.user_id] || {};
                const post = myPostMap[l.post_id];
                allNotifications.push({
                    id: `like-${l.id}`,
                    type: 'like',
                    actorId: l.user_id,
                    actorName: profile.full_name || (t('notifications.someone') || 'Someone'),
                    actorAvatar: profile.avatar_url,
                    actorSlug: profile.type === 'client' ? `u/${profile.slug}` : (profile.type === 'coach' ? `coach/${profile.slug}` : null),
                    timestamp: l.created_at,
                    message: t('notifications.likedPost') || 'liked your post',
                    postPreview: post?.content?.substring(0, 80) || '',
                    postId: l.post_id,
                });
            });

            // Comments on my posts
            comments.forEach(c => {
                const post = myPostMap[c.post_id];
                allNotifications.push({
                    id: `comment-${c.id}`,
                    type: 'comment',
                    actorId: c.user_id,
                    actorName: c.author_name || (t('notifications.someone') || 'Someone'),
                    actorAvatar: c.author_avatar,
                    timestamp: c.created_at,
                    message: t('notifications.commentedPost') || 'commented on your post',
                    commentPreview: c.content?.substring(0, 80) || '',
                    postPreview: post?.content?.substring(0, 80) || '',
                    postId: c.post_id,
                });
            });

            // Reposts of my posts
            reposts.forEach(r => {
                const profile = profiles[r.user_id] || {};
                const post = myPostMap[r.post_id];
                allNotifications.push({
                    id: `repost-${r.id}`,
                    type: 'repost',
                    actorId: r.user_id,
                    actorName: profile.full_name || (t('notifications.someone') || 'Someone'),
                    actorAvatar: profile.avatar_url,
                    actorSlug: profile.type === 'client' ? `u/${profile.slug}` : (profile.type === 'coach' ? `coach/${profile.slug}` : null),
                    timestamp: r.reposted_at,
                    message: t('notifications.repostedPost') || 'reposted your post',
                    postPreview: post?.content?.substring(0, 80) || '',
                    postId: r.post_id,
                });
            });

            // Sort by timestamp descending
            allNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            setNotifications(allNotifications);
        } catch (err) {
            console.error('Failed to load notifications:', err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (session?.user) {
            loadNotifications();
        } else {
            setLoading(false);
        }
    }, [session, loadNotifications]);

    // Accept a connection request
    const handleAcceptConnection = async (connectionId) => {
        const supabase = window.supabaseClient;
        if (!supabase) return;

        setAcceptingIds(prev => new Set([...prev, connectionId]));

        try {
            const { error } = await supabase
                .from('cs_connections')
                .update({ status: 'granted' })
                .eq('id', connectionId)
                .eq('coach_id', userId);

            if (error) throw error;

            // Update local state
            setNotifications(prev => prev.map(n =>
                n.connectionId === connectionId
                    ? { ...n, status: 'granted', message: t('notifications.connectionAccepted') || 'is now connected with you' }
                    : n
            ));

            // Refresh the notification count
            refetchCount();

            // Invalidate notifications cache
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        } catch (err) {
            console.error('Failed to accept connection:', err);
        } finally {
            setAcceptingIds(prev => {
                const next = new Set(prev);
                next.delete(connectionId);
                return next;
            });
        }
    };

    // Decline a connection request
    const handleDeclineConnection = async (connectionId) => {
        const supabase = window.supabaseClient;
        if (!supabase) return;

        setAcceptingIds(prev => new Set([...prev, connectionId]));

        try {
            const { error } = await supabase
                .from('cs_connections')
                .update({ status: 'denied' })
                .eq('id', connectionId)
                .eq('coach_id', userId);

            if (error) throw error;

            // Remove from local state
            setNotifications(prev => prev.filter(n => n.connectionId !== connectionId));
            refetchCount();
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        } catch (err) {
            console.error('Failed to decline connection:', err);
        } finally {
            setAcceptingIds(prev => {
                const next = new Set(prev);
                next.delete(connectionId);
                return next;
            });
        }
    };

    // Filter notifications
    const filteredNotifications = useMemo(() => {
        if (filter === 'all') return notifications;
        return notifications.filter(n => n.type === filter);
    }, [notifications, filter]);

    const connectionCount = notifications.filter(n => n.type === 'connection' && n.status === 'pending').length;

    // Notification type icon
    const getIcon = (type) => {
        switch (type) {
            case 'connection': return html`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#006266" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
            case 'like': return html`<svg width="18" height="18" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
            case 'comment': return html`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
            case 'repost': return html`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`;
            default: return html`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`;
        }
    };

    // Not logged in
    if (!session?.user) {
        return html`
            <div class="feed-page">
                <div style=${{ textAlign: 'center', padding: '60px 20px' }}>
                    <h2>${t('notifications.signInRequired') || 'Sign in to view notifications'}</h2>
                    <button class="btn-primary" style=${{ marginTop: '16px' }} onClick=${() => window.navigateTo('/login')}>
                        ${t('nav.signIn') || 'Sign In'}
                    </button>
                </div>
            </div>
        `;
    }

    // Left column - filters
    const leftColumn = html`
        <div class="feed-left-column">
            <div class="feed-card" style=${{ padding: '16px' }}>
                <h4 style=${{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: '700', color: '#1f2937' }}>
                    ${t('notifications.title') || 'Notifications'}
                </h4>
                <div style=${{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    ${[
                        { key: 'all', label: t('notifications.filterAll') || 'All' },
                        { key: 'connection', label: t('notifications.filterConnections') || 'Connections' },
                        { key: 'like', label: t('notifications.filterLikes') || 'Likes' },
                        { key: 'comment', label: t('notifications.filterComments') || 'Comments' },
                        { key: 'repost', label: t('notifications.filterReposts') || 'Reposts' },
                    ].map(f => html`
                        <button
                            key=${f.key}
                            onClick=${() => setFilter(f.key)}
                            style=${{
                                background: filter === f.key ? '#006266' : 'transparent',
                                color: filter === f.key ? 'white' : '#374151',
                                border: 'none',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: '0.88rem',
                                fontWeight: filter === f.key ? '600' : '400',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            ${f.label}
                            ${f.key === 'connection' && connectionCount > 0 ? html`
                                <span style=${{
                                    background: '#ef4444',
                                    color: 'white',
                                    borderRadius: '10px',
                                    padding: '1px 7px',
                                    fontSize: '0.75rem',
                                    fontWeight: '700',
                                    marginLeft: '6px',
                                }}>${connectionCount}</span>
                            ` : null}
                        </button>
                    `)}
                </div>
            </div>
        </div>
    `;

    // Right column - empty for now (can add suggestions later)
    const rightColumn = html`
        <div class="feed-right-column">
            <div class="feed-card" style=${{ padding: '16px' }}>
                <h4 style=${{ margin: '0 0 8px', fontSize: '0.95rem', fontWeight: '700', color: '#1f2937' }}>
                    ${t('notifications.manage') || 'Manage notifications'}
                </h4>
                <p style=${{ margin: 0, fontSize: '0.82rem', color: '#6b7280' }}>
                    ${t('notifications.manageDesc') || 'Stay up to date with your coaching network activity.'}
                </p>
            </div>
        </div>
    `;

    return html`
        <div class="feed-page">
            <div class="feed-layout">
                ${leftColumn}

                <!-- CENTER COLUMN - Notifications -->
                <div class="feed-center-column">
                    <div class="feed-card" style=${{ padding: '16px 20px' }}>
                        <h2 style=${{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#1f2937' }}>
                            ${t('notifications.title') || 'Notifications'}
                        </h2>
                    </div>

                    ${loading ? html`
                        <div class="feed-loading">
                            <div class="feed-loading-spinner"></div>
                            <p>${t('notifications.loading') || 'Loading notifications...'}</p>
                        </div>
                    ` : filteredNotifications.length === 0 ? html`
                        <div class="feed-card" style=${{ padding: '40px 20px', textAlign: 'center' }}>
                            <div style=${{ fontSize: '2.5rem', marginBottom: '12px' }}>
                                ${filter === 'all' ? html`
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                    </svg>
                                ` : null}
                            </div>
                            <h3 style=${{ margin: '0 0 8px', color: '#6b7280', fontWeight: '600' }}>
                                ${t('notifications.empty') || 'No notifications yet'}
                            </h3>
                            <p style=${{ margin: 0, color: '#9ca3af', fontSize: '0.88rem' }}>
                                ${t('notifications.emptyDesc') || 'When you get notifications, they will show up here.'}
                            </p>
                        </div>
                    ` : html`
                        <div style=${{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            ${filteredNotifications.map(notif => html`
                                <div key=${notif.id} class="feed-card" style=${{
                                    padding: '14px 16px',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '12px',
                                    background: notif.type === 'connection' && notif.status === 'pending' ? '#f0fdfa' : 'white',
                                    cursor: notif.actorSlug ? 'pointer' : 'default',
                                    transition: 'background 0.15s ease',
                                }} onClick=${() => {
                                    if (notif.actorSlug) window.navigateTo(`/${notif.actorSlug}`);
                                }}>
                                    <!-- Icon -->
                                    <div style=${{
                                        flexShrink: 0,
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        background: '#f3f4f6',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        ${getIcon(notif.type)}
                                    </div>

                                    <!-- Avatar -->
                                    <img
                                        src=${notif.actorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(notif.actorName)}&background=006266&color=fff&size=40`}
                                        alt=${notif.actorName}
                                        style=${{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            objectFit: 'cover',
                                            flexShrink: 0,
                                        }}
                                    />

                                    <!-- Content -->
                                    <div style=${{ flex: 1, minWidth: 0 }}>
                                        <div style=${{ fontSize: '0.9rem', color: '#1f2937', lineHeight: '1.4' }}>
                                            <strong>${notif.actorName}</strong>${' '}${notif.message}
                                        </div>
                                        ${(notif.postPreview || notif.commentPreview) && html`
                                            <div style=${{
                                                fontSize: '0.82rem',
                                                color: '#6b7280',
                                                marginTop: '4px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                ${notif.commentPreview
                                                    ? html`"${notif.commentPreview}${notif.commentPreview.length >= 80 ? '...' : ''}"`
                                                    : html`${notif.postPreview}${notif.postPreview.length >= 80 ? '...' : ''}`
                                                }
                                            </div>
                                        `}
                                        <div style=${{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '4px' }}>
                                            ${timeAgo(notif.timestamp)}
                                        </div>
                                    </div>

                                    <!-- Action buttons for connection requests -->
                                    ${notif.type === 'connection' && notif.status === 'pending' && html`
                                        <div style=${{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }} onClick=${(e) => e.stopPropagation()}>
                                            <button
                                                onClick=${() => handleAcceptConnection(notif.connectionId)}
                                                disabled=${acceptingIds.has(notif.connectionId)}
                                                style=${{
                                                    background: '#006266',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '6px 16px',
                                                    borderRadius: '20px',
                                                    fontSize: '0.82rem',
                                                    fontWeight: '600',
                                                    cursor: acceptingIds.has(notif.connectionId) ? 'not-allowed' : 'pointer',
                                                    opacity: acceptingIds.has(notif.connectionId) ? 0.6 : 1,
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                ${acceptingIds.has(notif.connectionId)
                                                    ? (t('notifications.accepting') || 'Accepting...')
                                                    : (t('notifications.accept') || 'Accept')
                                                }
                                            </button>
                                            <button
                                                onClick=${() => handleDeclineConnection(notif.connectionId)}
                                                disabled=${acceptingIds.has(notif.connectionId)}
                                                style=${{
                                                    background: 'transparent',
                                                    color: '#6b7280',
                                                    border: '1px solid #d1d5db',
                                                    padding: '6px 16px',
                                                    borderRadius: '20px',
                                                    fontSize: '0.82rem',
                                                    fontWeight: '600',
                                                    cursor: acceptingIds.has(notif.connectionId) ? 'not-allowed' : 'pointer',
                                                    opacity: acceptingIds.has(notif.connectionId) ? 0.6 : 1,
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                ${t('notifications.decline') || 'Decline'}
                                            </button>
                                        </div>
                                    `}

                                    <!-- Accepted badge -->
                                    ${notif.type === 'connection' && notif.status === 'granted' && html`
                                        <div style=${{
                                            background: '#d1fae5',
                                            color: '#065f46',
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '0.78rem',
                                            fontWeight: '600',
                                            flexShrink: 0,
                                            whiteSpace: 'nowrap',
                                        }}>
                                            ${t('notifications.connected') || 'Connected'}
                                        </div>
                                    `}
                                </div>
                            `)}
                        </div>
                    `}

                    <!-- Mobile: show right column -->
                    <div class="feed-mobile-show-more">
                        ${rightColumn}
                    </div>
                </div>

                ${rightColumn}
            </div>
        </div>
    `;
}

export default NotificationsPage;
