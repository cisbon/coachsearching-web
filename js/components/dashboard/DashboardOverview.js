/**
 * Dashboard Overview Component
 * Shows statistics, quick actions, upcoming sessions, and recent activity
 */

import htm from '../../vendor/htm.js';
import { t } from '../../i18n.js';

const React = window.React;
const { useState, useEffect } = React;
const html = htm.bind(React.createElement);

// Use global formatPrice from app.js or fallback
const formatPrice = (price) => {
    if (window.formatPrice) {
        return window.formatPrice(price);
    }
    return '€' + (price || 0).toFixed(0);
};

/**
 * DashboardOverview Component
 * @param {Object} props
 * @param {string} props.userType - 'client', 'coach', or 'business'
 * @param {Object} props.session - User session
 */
export function DashboardOverview({ userType, session }) {
    const [stats, setStats] = useState({
        totalBookings: 0,
        upcomingSessions: 0,
        completedSessions: 0,
        totalEarnings: 0,
        proBonoHours: 0,
        averageRating: 0,
        totalReviews: 0,
        responseRate: 100,
        unreadMessages: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [upcomingBookings, setUpcomingBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, [userType]);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            if (!window.supabaseClient || !session) {
                console.warn('Supabase client or session not available');
                setLoading(false);
                return;
            }

            const userId = session.user.id;

            // Load bookings statistics
            const { data: bookings, error: bookingsError } = await window.supabaseClient
                .from('cs_bookings')
                .select('*')
                .or(`client_id.eq.${userId},coach_id.eq.${userId}`);

            if (!bookingsError && bookings) {
                const now = new Date();
                const upcoming = bookings.filter(b =>
                    new Date(b.start_time) > now &&
                    (b.status === 'confirmed' || b.status === 'pending')
                );
                const completed = bookings.filter(b => b.status === 'completed');

                setStats(prev => ({
                    ...prev,
                    totalBookings: bookings.length,
                    upcomingSessions: upcoming.length,
                    completedSessions: completed.length
                }));

                // Set upcoming bookings for quick view
                setUpcomingBookings(upcoming.slice(0, 3));
            }

            // If coach, load additional stats
            if (userType === 'coach') {
                // Load coach profile for rating
                const { data: coachData } = await window.supabaseClient
                    .from('cs_coaches')
                    .select('rating_average, total_reviews, total_sessions, total_earnings')
                    .eq('user_id', userId)
                    .single();

                if (coachData) {
                    setStats(prev => ({
                        ...prev,
                        averageRating: coachData.rating_average || 0,
                        totalReviews: coachData.total_reviews || 0,
                        totalEarnings: coachData.total_earnings || 0
                    }));
                }

                // Load pro bono hours
                const { data: proBonoData } = await window.supabaseClient
                    .from('cs_pro_bono_bookings')
                    .select('duration_minutes')
                    .eq('coach_id', userId)
                    .eq('status', 'completed');

                if (proBonoData) {
                    const totalMinutes = proBonoData.reduce((sum, b) => sum + (b.duration_minutes || 0), 0);
                    setStats(prev => ({
                        ...prev,
                        proBonoHours: (totalMinutes / 60).toFixed(1)
                    }));
                }

                // Load unread messages count
                const { data: messagesData } = await window.supabaseClient
                    .from('cs_messages')
                    .select('id', { count: 'exact' })
                    .eq('recipient_id', userId)
                    .eq('is_read', false);

                if (messagesData) {
                    setStats(prev => ({
                        ...prev,
                        unreadMessages: messagesData.length
                    }));
                }
            }

            // Load recent activity (last 5 bookings)
            if (bookings && bookings.length > 0) {
                const sorted = [...bookings].sort((a, b) =>
                    new Date(b.created_at) - new Date(a.created_at)
                ).slice(0, 5);
                setRecentActivity(sorted);
            }

        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDateTime = (dateStr) => {
        const date = new Date(dateStr);
        return {
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
    };

    if (loading) {
        return html`
            <div class="dashboard-overview-loading">
                <div class="dashboard-grid">
                    ${[1, 2, 3, 4].map(i => html`
                        <div key=${i} class="stat-card skeleton-card">
                            <div class="skeleton-line" style=${{ width: '60%', height: '14px', marginBottom: '12px' }}></div>
                            <div class="skeleton-line" style=${{ width: '40%', height: '32px' }}></div>
                        </div>
                    `)}
                </div>
            </div>
        `;
    }

    return html`
        <div class="dashboard-overview">
            <!-- Statistics Cards -->
            <div class="dashboard-grid">
                <div class="stat-card stat-card-blue">
                    <div class="stat-icon">📅</div>
                    <div class="stat-content">
                        <div class="stat-label">Total Bookings</div>
                        <div class="stat-value">${stats.totalBookings}</div>
                        <div class="stat-trend">
                            ${stats.completedSessions > 0 && html`
                                <span class="stat-subtext">${stats.completedSessions} completed</span>
                            `}
                        </div>
                    </div>
                </div>

                <div class="stat-card stat-card-petrol">
                    <div class="stat-icon">🕐</div>
                    <div class="stat-content">
                        <div class="stat-label">Upcoming Sessions</div>
                        <div class="stat-value">${stats.upcomingSessions}</div>
                        ${stats.upcomingSessions > 0 && html`
                            <div class="stat-subtext">Next session soon</div>
                        `}
                    </div>
                </div>

                ${userType === 'coach' && html`
                    <div class="stat-card stat-card-yellow">
                        <div class="stat-icon">⭐</div>
                        <div class="stat-content">
                            <div class="stat-label">Average Rating</div>
                            <div class="stat-value">${stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}</div>
                            ${stats.totalReviews > 0 && html`
                                <div class="stat-subtext">${stats.totalReviews} review${stats.totalReviews !== 1 ? 's' : ''}</div>
                            `}
                        </div>
                    </div>

                    <div class="stat-card stat-card-green">
                        <div class="stat-icon">💰</div>
                        <div class="stat-content">
                            <div class="stat-label">Total Earnings</div>
                            <div class="stat-value">${formatPrice(stats.totalEarnings)}</div>
                            ${stats.completedSessions > 0 && html`
                                <div class="stat-subtext">${stats.completedSessions} sessions</div>
                            `}
                        </div>
                    </div>

                    <div class="stat-card stat-card-purple">
                        <div class="stat-icon">🎁</div>
                        <div class="stat-content">
                            <div class="stat-label">Pro-bono Hours</div>
                            <div class="stat-value">${stats.proBonoHours}h</div>
                            <div class="stat-subtext">Community impact</div>
                        </div>
                    </div>

                    ${stats.unreadMessages > 0 && html`
                        <div class="stat-card stat-card-orange" style=${{ cursor: 'pointer' }} onClick=${() => {
                            const event = new CustomEvent('switchTab', { detail: 'messages' });
                            window.dispatchEvent(event);
                        }}>
                            <div class="stat-icon">💬</div>
                            <div class="stat-content">
                                <div class="stat-label">Unread Messages</div>
                                <div class="stat-value">${stats.unreadMessages}</div>
                                <div class="stat-subtext">Click to view</div>
                            </div>
                        </div>
                    `}
                `}
            </div>

            <!-- Quick Actions -->
            <div class="dashboard-section">
                <h3 class="section-subtitle">Quick Actions</h3>
                <div class="quick-actions-grid">
                    ${userType === 'coach' ? html`
                        <button class="quick-action-card" onClick=${() => {
                            const event = new CustomEvent('switchTab', { detail: 'availability' });
                            window.dispatchEvent(event);
                        }}>
                            <div class="quick-action-icon">📆</div>
                            <div class="quick-action-title">Set Availability</div>
                            <div class="quick-action-desc">Update your schedule</div>
                        </button>
                        <button class="quick-action-card" onClick=${() => {
                            const event = new CustomEvent('switchTab', { detail: 'articles' });
                            window.dispatchEvent(event);
                        }}>
                            <div class="quick-action-icon">✍️</div>
                            <div class="quick-action-title">Write Article</div>
                            <div class="quick-action-desc">Share your expertise</div>
                        </button>
                        <button class="quick-action-card" onClick=${() => {
                            const event = new CustomEvent('switchTab', { detail: 'probono' });
                            window.dispatchEvent(event);
                        }}>
                            <div class="quick-action-icon">🎁</div>
                            <div class="quick-action-title">Add Pro-bono Slot</div>
                            <div class="quick-action-desc">Give back to community</div>
                        </button>
                        <button class="quick-action-card" onClick=${() => {
                            const event = new CustomEvent('switchTab', { detail: 'profile' });
                            window.dispatchEvent(event);
                        }}>
                            <div class="quick-action-icon">👤</div>
                            <div class="quick-action-title">Edit Profile</div>
                            <div class="quick-action-desc">Update your info</div>
                        </button>
                    ` : html`
                        <button class="quick-action-card" onClick=${() => window.navigateTo('/coaches')}>
                            <div class="quick-action-icon">🔍</div>
                            <div class="quick-action-title">Find a Coach</div>
                            <div class="quick-action-desc">Browse coaches</div>
                        </button>
                        <button class="quick-action-card" onClick=${() => {
                            const event = new CustomEvent('switchTab', { detail: 'bookings' });
                            window.dispatchEvent(event);
                        }}>
                            <div class="quick-action-icon">📅</div>
                            <div class="quick-action-title">My Bookings</div>
                            <div class="quick-action-desc">View your sessions</div>
                        </button>
                        <button class="quick-action-card" onClick=${() => {
                            const event = new CustomEvent('switchTab', { detail: 'profile' });
                            window.dispatchEvent(event);
                        }}>
                            <div class="quick-action-icon">👤</div>
                            <div class="quick-action-title">Edit Profile</div>
                            <div class="quick-action-desc">Update your info</div>
                        </button>
                    `}
                </div>
            </div>

            <!-- Two Column Layout for Upcoming and Activity -->
            <div class="dashboard-columns">
                <!-- Upcoming Sessions -->
                <div class="dashboard-section">
                    <h3 class="section-subtitle">Upcoming Sessions</h3>
                    ${upcomingBookings.length === 0 ? html`
                        <div class="empty-state-mini">
                            <div class="empty-icon">📅</div>
                            <div class="empty-text">No upcoming sessions</div>
                        </div>
                    ` : html`
                        <div class="upcoming-sessions-list">
                            ${upcomingBookings.map(booking => {
                                const dt = formatDateTime(booking.start_time);
                                return html`
                                    <div key=${booking.id} class="upcoming-session-card">
                                        <div class="session-date-badge">
                                            <div class="session-date-day">${dt.date.split(' ')[1]}</div>
                                            <div class="session-date-month">${dt.date.split(' ')[0]}</div>
                                        </div>
                                        <div class="session-details">
                                            <div class="session-title">
                                                ${userType === 'coach' ? 'Session with Client' : 'Coaching Session'}
                                            </div>
                                            <div class="session-time">⏰ ${dt.time}</div>
                                            <div class="session-duration">${booking.duration_minutes} min • ${booking.meeting_type}</div>
                                        </div>
                                        <div class="session-status">
                                            <span class="status-badge status-${booking.status}">${booking.status}</span>
                                        </div>
                                    </div>
                                `;
                            })}
                        </div>
                        ${stats.upcomingSessions > 3 && html`
                            <button class="view-all-link" onClick=${() => {
                                const event = new CustomEvent('switchTab', { detail: 'bookings' });
                                window.dispatchEvent(event);
                            }}>
                                View all ${stats.upcomingSessions} upcoming sessions →
                            </button>
                        `}
                    `}
                </div>

                <!-- Recent Activity -->
                <div class="dashboard-section">
                    <h3 class="section-subtitle">Recent Activity</h3>
                    ${recentActivity.length === 0 ? html`
                        <div class="empty-state-mini">
                            <div class="empty-icon">📊</div>
                            <div class="empty-text">No recent activity</div>
                        </div>
                    ` : html`
                        <div class="activity-list">
                            ${recentActivity.map(activity => {
                                const dt = formatDateTime(activity.created_at);
                                return html`
                                    <div key=${activity.id} class="activity-item">
                                        <div class="activity-icon">
                                            ${activity.status === 'completed' ? '✅' :
                                              activity.status === 'confirmed' ? '📅' :
                                              activity.status === 'pending' ? '⏳' : '❌'}
                                        </div>
                                        <div class="activity-content">
                                            <div class="activity-title">
                                                ${activity.status === 'completed' ? 'Session completed' :
                                                  activity.status === 'confirmed' ? 'Booking confirmed' :
                                                  activity.status === 'pending' ? 'New booking request' :
                                                  'Booking cancelled'}
                                            </div>
                                            <div class="activity-time">${dt.date} at ${dt.time}</div>
                                        </div>
                                    </div>
                                `;
                            })}
                        </div>
                    `}
                </div>
            </div>

            ${(stats.totalBookings === 0 && userType === 'client') && html`
                <div class="welcome-card">
                    <h3>👋 Welcome to CoachSearching!</h3>
                    <p>You haven't booked any sessions yet. Start your coaching journey today!</p>
                    <button class="btn-primary" onClick=${() => window.navigateTo('/coaches')}>
                        Browse Coaches
                    </button>
                </div>
            `}

            ${(stats.totalBookings === 0 && userType === 'coach') && html`
                <div class="welcome-card">
                    <h3>👋 Welcome, Coach!</h3>
                    <p>Complete your profile and set your availability to start receiving bookings.</p>
                    <div style=${{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                        <button class="btn-primary" onClick=${() => {
                            const event = new CustomEvent('switchTab', { detail: 'profile' });
                            window.dispatchEvent(event);
                        }}>
                            Complete Profile
                        </button>
                        <button class="btn-secondary" onClick=${() => {
                            const event = new CustomEvent('switchTab', { detail: 'availability' });
                            window.dispatchEvent(event);
                        }}>
                            Set Availability
                        </button>
                    </div>
                </div>
            `}
        </div>
    `;
}

export default DashboardOverview;
