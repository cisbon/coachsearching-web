/**
 * NotificationsPage - Displays user notifications in a feed-like layout.
 * Shows connect requests (with accept/decline), likes, comments, reposts,
 * messages, reviews received, and chemistry call requests.
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
 * Fetches from cs_users (authoritative for full_name, avatar_url, slug)
 * and determines user type from cs_clients/cs_coaches membership.
 */
async function resolveUserProfiles(userIds) {
    if (!userIds.length) return {};
    const supabase = window.supabaseClient;
    if (!supabase) return {};

    const profiles = {};

    // Fetch user-level fields from cs_users (authoritative source)
    const { data: users } = await supabase
        .from('cs_users')
        .select('id, full_name, avatar_url, slug, user_type')
        .in('id', userIds);

    (users || []).forEach(u => {
        profiles[u.id] = {
            full_name: u.full_name,
            avatar_url: u.avatar_url,
            slug: u.slug,
            type: u.user_type === 'coach' ? 'coach' : 'client',
        };
    });

    // For any user IDs not found in cs_users, fall back to cs_coaches/cs_clients
    const missing = userIds.filter(id => !profiles[id]);
    if (missing.length > 0) {
        const [clientsRes, coachesRes] = await Promise.all([
            supabase.from('cs_clients').select('user_id').in('user_id', missing),
            supabase.from('cs_coaches').select('user_id, full_name, avatar_url, slug').in('user_id', missing),
        ]);
        const clientIds = new Set((clientsRes.data || []).map(c => c.user_id));
        (coachesRes.data || []).forEach(c => {
            profiles[c.user_id] = {
                full_name: c.full_name,
                avatar_url: c.avatar_url,
                slug: c.slug,
                type: clientIds.has(c.user_id) ? 'client' : 'coach',
            };
        });
        missing.filter(id => !profiles[id]).forEach(id => {
            if (clientIds.has(id)) {
                profiles[id] = { full_name: '', avatar_url: null, slug: null, type: 'client' };
            }
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

    // Reset notification badge to 0 when user visits this page
    // Save "last seen" timestamp to localStorage so it persists across refreshes
    useEffect(() => {
        if (userId) {
            try {
                window.localStorage.setItem('cs_notifications_seen_at', new Date().toISOString());
            } catch (e) {
                // ignore localStorage errors
            }
            queryClient.setQueryData(QUERY_KEYS.notificationCount(userId), { total: 0, hasChemistryCall: false });
        }
    }, [userId]);

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
                myAcceptedConnectionsRes,
                myPostsRes,
                chemistryCallsRes,
            ] = await Promise.all([
                // 1. Pending + recently granted connection requests TO me
                supabase
                    .from('cs_connections')
                    .select('id, user_id, coach_id, connected_at, status')
                    .eq('coach_id', userId)
                    .in('status', ['pending', 'granted'])
                    .order('connected_at', { ascending: false })
                    .limit(50),
                // 2. Connection requests I sent that were accepted (granted)
                supabase
                    .from('cs_connections')
                    .select('id, user_id, coach_id, connected_at, status')
                    .eq('user_id', userId)
                    .eq('status', 'granted')
                    .order('connected_at', { ascending: false })
                    .limit(50),
                // 3. My posts (to find likes/comments/reposts on them)
                supabase
                    .from('cs_posts')
                    .select('id, content, created_at')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(100),
                // 4. Chemistry call requests TO me (as coach)
                supabase
                    .from('cs_chemistry_call_requests')
                    .select('id, user_id, coach_id, name, phone, email, specialties, goal, status, created_at')
                    .eq('coach_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(50),
            ]);

            const connections = connectionsRes.data || [];
            const myAcceptedConnections = myAcceptedConnectionsRes.data || [];
            const myPosts = myPostsRes.data || [];
            const chemistryCalls = chemistryCallsRes.data || [];
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
                        .select('id, post_id, user_id, content, created_at')
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
            myAcceptedConnections.forEach(c => userIdsToResolve.add(c.coach_id));
            likes.forEach(l => userIdsToResolve.add(l.user_id));
            reposts.forEach(r => userIdsToResolve.add(r.user_id));
            // Comment authors are looked up via user_id from cs_users
            comments.forEach(c => userIdsToResolve.add(c.user_id));

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

            // My connection requests that were accepted (show to the requester)
            myAcceptedConnections.forEach(c => {
                const profile = profiles[c.coach_id] || {};
                allNotifications.push({
                    id: `connection-accepted-${c.id}`,
                    type: 'connection',
                    connectionId: c.id,
                    status: 'granted',
                    actorId: c.coach_id,
                    actorName: profile.full_name || (t('notifications.someone') || 'Someone'),
                    actorAvatar: profile.avatar_url,
                    actorSlug: profile.type === 'client' ? `u/${profile.slug}` : (profile.type === 'coach' ? `coach/${profile.slug}` : null),
                    timestamp: c.connected_at,
                    message: t('notifications.connectionYouAccepted') || 'accepted your connection request',
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
                const profile = profiles[c.user_id] || {};
                const post = myPostMap[c.post_id];
                allNotifications.push({
                    id: `comment-${c.id}`,
                    type: 'comment',
                    actorId: c.user_id,
                    actorName: profile.full_name || (t('notifications.someone') || 'Someone'),
                    actorAvatar: profile.avatar_url,
                    actorSlug: profile.type === 'client' ? `u/${profile.slug}` : (profile.type === 'coach' ? `coach/${profile.slug}` : null),
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

            // Chemistry call requests to me
            chemistryCalls.forEach(cc => {
                allNotifications.push({
                    id: `chemistry-${cc.id}`,
                    type: 'chemistry_call',
                    actorId: cc.user_id,
                    actorName: cc.name || (t('notifications.someone') || 'Someone'),
                    actorAvatar: null,
                    actorSlug: null,
                    timestamp: cc.created_at,
                    status: cc.status,
                    message: t('notifications.chemistryCallRequest') || 'requested a chemistry call',
                    chemistryCall: {
                        id: cc.id,
                        name: cc.name,
                        phone: cc.phone,
                        email: cc.email,
                        specialties: cc.specialties || [],
                        goal: cc.goal,
                        status: cc.status,
                    },
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
            case 'chemistry_call': return html`<svg width="18" height="18" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
            default: return html`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`;
        }
    };

    // Not logged in
    if (!session?.user) {
        return html`
            <div class="feed-page">
                <div class="notif-signin">
                    <h2>${t('notifications.signInRequired') || 'Sign in to view notifications'}</h2>
                    <button class="btn-primary" onClick=${() => window.navigateTo('/login')}>
                        ${t('nav.signIn') || 'Sign In'}
                    </button>
                </div>
            </div>
        `;
    }

    // Render a chemistry call notification card
    const renderChemistryCard = (notif) => {
        const cc = notif.chemistryCall;
        return html`
            <div key=${notif.id} class="feed-card notif-card notif-card-chemistry">
                <!-- Header row: icon + avatar + text -->
                <div class="notif-header-row">
                    <div class="notif-icon">
                        ${getIcon(notif.type)}
                    </div>
                    <img
                        class="notif-avatar"
                        src=${notif.actorAvatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(notif.actorName) + '&background=f59e0b&color=fff&size=40'}
                        alt=${notif.actorName}
                    />
                    <div class="notif-content">
                        <div class="notif-text">
                            <strong>${notif.actorName}</strong>${' '}${notif.message}
                        </div>
                        <div class="notif-time">${timeAgo(notif.timestamp)}</div>
                    </div>
                </div>

                <!-- Chemistry call details -->
                <div class="notif-chemistry-details">
                    <div class="notif-chemistry-row">
                        <span class="notif-chemistry-label">${t('notifications.chemistryCallPhone') || 'Phone'}:</span>
                        <a class="notif-chemistry-link" href=${'tel:' + cc.phone}>${cc.phone}</a>
                    </div>
                    <div class="notif-chemistry-row">
                        <span class="notif-chemistry-label">${t('notifications.chemistryCallEmail') || 'Email'}:</span>
                        <a class="notif-chemistry-link" href=${'mailto:' + cc.email}>${cc.email}</a>
                    </div>
                    ${cc.specialties && cc.specialties.length > 0 && html`
                        <div class="notif-chemistry-row">
                            <span class="notif-chemistry-label">${t('notifications.chemistryCallSpecialties') || 'Topics'}:</span>
                            <div class="notif-chemistry-pills">
                                ${cc.specialties.map(s => html`
                                    <span key=${s} class="notif-chemistry-pill">${s}</span>
                                `)}
                            </div>
                        </div>
                    `}
                    ${cc.goal && html`
                        <div>
                            <span class="notif-chemistry-label">${t('notifications.chemistryCallGoal') || 'Goal'}:</span>
                            <div class="notif-chemistry-goal">${cc.goal}</div>
                        </div>
                    `}
                </div>
            </div>
        `;
    };

    // Render a standard notification card
    const renderStandardCard = (notif) => {
        const isPending = notif.type === 'connection' && notif.status === 'pending';
        const isGranted = notif.type === 'connection' && notif.status === 'granted';
        const cardClass = 'feed-card notif-card' + (isPending ? ' notif-card-pending' : '') + (notif.actorSlug ? ' notif-card-clickable' : '');

        return html`
            <div key=${notif.id} class=${cardClass} onClick=${() => {
                if (notif.actorSlug) window.navigateTo('/' + notif.actorSlug);
            }}>
                <div class="notif-icon">
                    ${getIcon(notif.type)}
                </div>
                <img
                    class="notif-avatar"
                    src=${notif.actorAvatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(notif.actorName) + '&background=006266&color=fff&size=40'}
                    alt=${notif.actorName}
                />
                <div class="notif-content">
                    <div class="notif-text">
                        <strong>${notif.actorName}</strong>${' '}${notif.message}
                    </div>
                    ${(notif.postPreview || notif.commentPreview) && html`
                        <div class="notif-preview">
                            ${notif.commentPreview
                                ? html`"${notif.commentPreview}${notif.commentPreview.length >= 80 ? '...' : ''}"`
                                : html`${notif.postPreview}${notif.postPreview.length >= 80 ? '...' : ''}`
                            }
                        </div>
                    `}
                    <div class="notif-time">${timeAgo(notif.timestamp)}</div>
                </div>

                ${isPending && html`
                    <div class="notif-actions" onClick=${(e) => e.stopPropagation()}>
                        <button
                            class="notif-btn-accept"
                            onClick=${() => handleAcceptConnection(notif.connectionId)}
                            disabled=${acceptingIds.has(notif.connectionId)}
                        >
                            ${acceptingIds.has(notif.connectionId)
                                ? (t('notifications.accepting') || 'Accepting...')
                                : (t('notifications.accept') || 'Accept')
                            }
                        </button>
                        <button
                            class="notif-btn-decline"
                            onClick=${() => handleDeclineConnection(notif.connectionId)}
                            disabled=${acceptingIds.has(notif.connectionId)}
                        >
                            ${t('notifications.decline') || 'Decline'}
                        </button>
                    </div>
                `}

                ${isGranted && html`
                    <div class="notif-badge-connected">
                        ${t('notifications.connected') || 'Connected'}
                    </div>
                `}
            </div>
        `;
    };

    // Left column - filters
    const leftColumn = html`
        <div class="feed-left-column">
            <div class="feed-card" style=${{ padding: '16px' }}>
                <h4 class="notif-sidebar-title">
                    ${t('notifications.title') || 'Notifications'}
                </h4>
                <div class="notif-filter-list">
                    ${[
                        { key: 'all', label: t('notifications.filterAll') || 'All' },
                        { key: 'connection', label: t('notifications.filterConnections') || 'Connections' },
                        { key: 'like', label: t('notifications.filterLikes') || 'Likes' },
                        { key: 'comment', label: t('notifications.filterComments') || 'Comments' },
                        { key: 'repost', label: t('notifications.filterReposts') || 'Reposts' },
                        { key: 'chemistry_call', label: t('notifications.filterChemistryCalls') || 'Chemistry Calls' },
                    ].map(f => html`
                        <button
                            key=${f.key}
                            onClick=${() => setFilter(f.key)}
                            class=${'notif-filter-btn' + (filter === f.key ? ' active' : '')}
                        >
                            ${f.label}
                            ${f.key === 'connection' && connectionCount > 0 ? html`
                                <span class="notif-filter-badge">${connectionCount}</span>
                            ` : null}
                        </button>
                    `)}
                </div>
            </div>
        </div>
    `;

    // Right column
    const rightColumn = html`
        <div class="feed-right-column">
            <div class="feed-card" style=${{ padding: '16px' }}>
                <h4 class="notif-manage-title">
                    ${t('notifications.manage') || 'Manage notifications'}
                </h4>
                <p class="notif-manage-text">
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
                    <div class="feed-card notif-page-header">
                        <h2 class="notif-page-title">
                            ${t('notifications.title') || 'Notifications'}
                        </h2>
                    </div>

                    ${loading ? html`
                        <div class="feed-loading">
                            <div class="feed-loading-spinner"></div>
                            <p>${t('notifications.loading') || 'Loading notifications...'}</p>
                        </div>
                    ` : filteredNotifications.length === 0 ? html`
                        <div class="feed-card notif-empty">
                            ${filter === 'all' ? html`
                                <div style=${{ fontSize: '2.5rem', marginBottom: '12px' }}>
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                    </svg>
                                </div>
                            ` : null}
                            <h3 class="notif-empty-title">
                                ${t('notifications.empty') || 'No notifications yet'}
                            </h3>
                            <p class="notif-empty-text">
                                ${t('notifications.emptyDesc') || 'When you get notifications, they will show up here.'}
                            </p>
                        </div>
                    ` : html`
                        <div class="notif-list">
                            ${filteredNotifications.map(notif =>
                                notif.type === 'chemistry_call'
                                    ? renderChemistryCard(notif)
                                    : renderStandardCard(notif)
                            )}
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
