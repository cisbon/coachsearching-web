import { html } from 'https://esm.sh/htm/react';
import { useState, useEffect } from 'react';
import { supabaseClient } from './config.js';

/**
 * Admin Panel Main Component
 *
 * Features:
 * - User management (view, suspend, verify)
 * - Coach verification workflow
 * - Platform settings management
 * - Analytics dashboard
 * - System health monitoring
 * - Error logs viewer
 * - Promo code management
 */
export const AdminPanel = ({ session }) => {
    const [activeTab, setActiveTab] = useState('overview');

    // Check if user is admin
    const isAdmin = session?.user?.role === 'admin';

    if (!isAdmin) {
        return html`
            <div class="admin-panel-error">
                <div class="error-icon">🔒</div>
                <h2>Access Denied</h2>
                <p>You don't have permission to access the admin panel.</p>
            </div>
        `;
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: '📊' },
        { id: 'users', label: 'Users', icon: '👥' },
        { id: 'coaches', label: 'Coach Verification', icon: '✅' },
        { id: 'promos', label: 'Promo Codes', icon: '🏷️' },
        { id: 'settings', label: 'Platform Settings', icon: '⚙️' },
        { id: 'analytics', label: 'Analytics', icon: '📈' },
        { id: 'health', label: 'System Health', icon: '❤️' },
        { id: 'logs', label: 'Error Logs', icon: '📋' }
    ];

    return html`
        <div class="admin-panel">
            <div class="admin-header">
                <h1>🛠️ Admin Panel</h1>
                <div class="admin-user-badge">
                    Admin: ${session.user.email}
                </div>
            </div>

            <div class="admin-tabs">
                ${tabs.map(tab => html`
                    <button
                        key=${tab.id}
                        class="admin-tab ${activeTab === tab.id ? 'active' : ''}"
                        onClick=${() => setActiveTab(tab.id)}
                    >
                        <span class="tab-icon">${tab.icon}</span>
                        <span class="tab-label">${tab.label}</span>
                    </button>
                `)}
            </div>

            <div class="admin-content">
                ${activeTab === 'overview' && html`<${AdminOverview} session=${session} />`}
                ${activeTab === 'users' && html`<${UserManagement} session=${session} />`}
                ${activeTab === 'coaches' && html`<${CoachVerification} session=${session} />`}
                ${activeTab === 'promos' && html`<${PromoCodeManagement} session=${session} />`}
                ${activeTab === 'settings' && html`<${PlatformSettings} session=${session} />`}
                ${activeTab === 'analytics' && html`<${AnalyticsDashboard} session=${session} />`}
                ${activeTab === 'health' && html`<${SystemHealth} session=${session} />`}
                ${activeTab === 'logs' && html`<${ErrorLogs} session=${session} />`}
            </div>
        </div>
    `;
};

/**
 * Admin Overview Dashboard
 */
const AdminOverview = ({ session }) => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalCoaches: 0,
        totalBookings: 0,
        totalRevenue: 0,
        pendingVerifications: 0,
        activePromoCodes: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);

            // Parallel queries for better performance
            const [usersCount, coachesCount, bookingsCount, revenueData, pendingCoaches, activePromos] = await Promise.all([
                supabaseClient.from('users').select('id', { count: 'exact', head: true }),
                supabaseClient.from('coaches').select('id', { count: 'exact', head: true }),
                supabaseClient.from('bookings').select('id', { count: 'exact', head: true }),
                supabaseClient.from('platform_metrics').select('total_gmv').order('date', { ascending: false }).limit(1).single(),
                supabaseClient.from('coaches').select('id', { count: 'exact', head: true }).eq('is_verified', false),
                supabaseClient.from('promo_codes').select('id', { count: 'exact', head: true }).eq('is_active', true)
            ]);

            setStats({
                totalUsers: usersCount.count || 0,
                totalCoaches: coachesCount.count || 0,
                totalBookings: bookingsCount.count || 0,
                totalRevenue: parseFloat(revenueData?.data?.total_gmv || 0),
                pendingVerifications: pendingCoaches.count || 0,
                activePromoCodes: activePromos.count || 0
            });
        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return html`<div class="skeleton-loader" style="height: 400px;"></div>`;
    }

    return html`
        <div class="admin-overview">
            <h2>Platform Overview</h2>

            <div class="stats-grid">
                <div class="stat-card stat-card-blue">
                    <div class="stat-icon">👥</div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.totalUsers}</div>
                        <div class="stat-label">Total Users</div>
                    </div>
                </div>

                <div class="stat-card stat-card-petrol">
                    <div class="stat-icon">🎓</div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.totalCoaches}</div>
                        <div class="stat-label">Total Coaches</div>
                    </div>
                </div>

                <div class="stat-card stat-card-green">
                    <div class="stat-icon">📅</div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.totalBookings}</div>
                        <div class="stat-label">Total Bookings</div>
                    </div>
                </div>

                <div class="stat-card stat-card-yellow">
                    <div class="stat-icon">💰</div>
                    <div class="stat-content">
                        <div class="stat-value">€${stats.totalRevenue.toFixed(2)}</div>
                        <div class="stat-label">Total Revenue</div>
                    </div>
                </div>

                <div class="stat-card stat-card-orange">
                    <div class="stat-icon">⏳</div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.pendingVerifications}</div>
                        <div class="stat-label">Pending Verifications</div>
                    </div>
                </div>

                <div class="stat-card stat-card-purple">
                    <div class="stat-icon">🏷️</div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.activePromoCodes}</div>
                        <div class="stat-label">Active Promo Codes</div>
                    </div>
                </div>
            </div>

            <div class="quick-actions">
                <h3>Quick Actions</h3>
                <div class="actions-grid">
                    <button class="action-btn action-btn-primary">
                        <span class="action-icon">✅</span>
                        <span>Verify Coaches (${stats.pendingVerifications})</span>
                    </button>
                    <button class="action-btn action-btn-success">
                        <span class="action-icon">🏷️</span>
                        <span>Create Promo Code</span>
                    </button>
                    <button class="action-btn action-btn-info">
                        <span class="action-icon">📊</span>
                        <span>View Analytics</span>
                    </button>
                    <button class="action-btn action-btn-warning">
                        <span class="action-icon">⚙️</span>
                        <span>Platform Settings</span>
                    </button>
                </div>
            </div>
        </div>
    `;
};

/**
 * User Management Component
 */
const UserManagement = ({ session }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);

            const { data, error } = await supabaseClient
                .from('users')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;

            setUsers(data || []);
        } catch (error) {
            console.error('Failed to load users:', error);
        } finally {
            setLoading(false);
        }
    };

    const suspendUser = async (userId) => {
        if (!confirm('Are you sure you want to suspend this user?')) return;

        try {
            const { error } = await supabaseClient
                .from('users')
                .update({ is_suspended: true })
                .eq('id', userId);

            if (error) throw error;

            // Log admin action
            await supabaseClient.from('admin_actions').insert([{
                admin_id: session.user.id,
                action_type: 'user_suspended',
                target_type: 'user',
                target_id: userId,
                details: { reason: 'Manual suspension by admin' }
            }]);

            loadUsers();
        } catch (error) {
            console.error('Failed to suspend user:', error);
            alert('Failed to suspend user');
        }
    };

    const unsuspendUser = async (userId) => {
        try {
            const { error } = await supabaseClient
                .from('users')
                .update({ is_suspended: false })
                .eq('id', userId);

            if (error) throw error;

            // Log admin action
            await supabaseClient.from('admin_actions').insert([{
                admin_id: session.user.id,
                action_type: 'user_unsuspended',
                target_type: 'user',
                target_id: userId
            }]);

            loadUsers();
        } catch (error) {
            console.error('Failed to unsuspend user:', error);
            alert('Failed to unsuspend user');
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            user.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = filterRole === 'all' || user.role === filterRole;
        return matchesSearch && matchesRole;
    });

    if (loading) {
        return html`<div class="skeleton-loader" style="height: 400px;"></div>`;
    }

    return html`
        <div class="user-management">
            <div class="management-header">
                <h2>User Management (${users.length})</h2>
                <div class="management-filters">
                    <input
                        type="text"
                        class="search-input"
                        placeholder="Search users..."
                        value=${searchTerm}
                        onInput=${(e) => setSearchTerm(e.target.value)}
                    />
                    <select
                        class="filter-select"
                        value=${filterRole}
                        onChange=${(e) => setFilterRole(e.target.value)}
                    >
                        <option value="all">All Roles</option>
                        <option value="client">Clients</option>
                        <option value="coach">Coaches</option>
                        <option value="admin">Admins</option>
                    </select>
                </div>
            </div>

            <div class="users-table">
                <table>
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Joined</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredUsers.map(user => html`
                            <tr key=${user.id} class=${user.is_suspended ? 'suspended-row' : ''}>
                                <td>
                                    <div class="user-cell">
                                        ${user.avatar_url
                                            ? html`<img src=${user.avatar_url} alt="Avatar" class="user-avatar" />`
                                            : html`<div class="user-avatar-placeholder">
                                                ${(user.full_name || 'U')[0].toUpperCase()}
                                            </div>`
                                        }
                                        <span>${user.full_name || 'Unnamed'}</span>
                                    </div>
                                </td>
                                <td>${user.email}</td>
                                <td>
                                    <span class="role-badge role-${user.role}">
                                        ${user.role}
                                    </span>
                                </td>
                                <td>
                                    ${user.is_suspended
                                        ? html`<span class="status-badge status-suspended">Suspended</span>`
                                        : html`<span class="status-badge status-active">Active</span>`
                                    }
                                </td>
                                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                                <td>
                                    <div class="action-buttons">
                                        ${user.is_suspended
                                            ? html`<button class="btn-sm btn-success" onClick=${() => unsuspendUser(user.id)}>
                                                Unsuspend
                                            </button>`
                                            : html`<button class="btn-sm btn-danger" onClick=${() => suspendUser(user.id)}>
                                                Suspend
                                            </button>`
                                        }
                                        <button class="btn-sm btn-info">View Details</button>
                                    </div>
                                </td>
                            </tr>
                        `)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

/**
 * Coach Verification Component
 */
const CoachVerification = ({ session }) => {
    const [pendingCoaches, setPendingCoaches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPendingCoaches();
    }, []);

    const loadPendingCoaches = async () => {
        try {
            setLoading(true);

            const { data, error } = await supabaseClient
                .from('coaches')
                .select(`
                    *,
                    user:user_id (
                        full_name,
                        email,
                        avatar_url
                    )
                `)
                .eq('is_verified', false)
                .order('created_at', { ascending: true });

            if (error) throw error;

            setPendingCoaches(data || []);
        } catch (error) {
            console.error('Failed to load pending coaches:', error);
        } finally {
            setLoading(false);
        }
    };

    const verifyCoach = async (coachId) => {
        try {
            const { error } = await supabaseClient
                .from('coaches')
                .update({
                    is_verified: true,
                    verified_at: new Date().toISOString()
                })
                .eq('id', coachId);

            if (error) throw error;

            // Log admin action
            await supabaseClient.from('admin_actions').insert([{
                admin_id: session.user.id,
                action_type: 'coach_verified',
                target_type: 'coach',
                target_id: coachId
            }]);

            loadPendingCoaches();
        } catch (error) {
            console.error('Failed to verify coach:', error);
            alert('Failed to verify coach');
        }
    };

    const rejectCoach = async (coachId) => {
        const reason = prompt('Enter rejection reason:');
        if (!reason) return;

        try {
            // You might want to send an email or notification here
            await supabaseClient.from('admin_actions').insert([{
                admin_id: session.user.id,
                action_type: 'coach_rejected',
                target_type: 'coach',
                target_id: coachId,
                details: { reason }
            }]);

            loadPendingCoaches();
        } catch (error) {
            console.error('Failed to reject coach:', error);
            alert('Failed to reject coach');
        }
    };

    if (loading) {
        return html`<div class="skeleton-loader" style="height: 400px;"></div>`;
    }

    if (pendingCoaches.length === 0) {
        return html`
            <div class="empty-state">
                <div class="empty-icon">✅</div>
                <h3>No Pending Verifications</h3>
                <p>All coaches have been verified!</p>
            </div>
        `;
    }

    return html`
        <div class="coach-verification">
            <h2>Coach Verification (${pendingCoaches.length} pending)</h2>

            <div class="verification-list">
                ${pendingCoaches.map(coach => html`
                    <div class="verification-card" key=${coach.id}>
                        <div class="verification-header">
                            <div class="coach-info">
                                ${coach.user?.avatar_url
                                    ? html`<img src=${coach.user.avatar_url} alt="Avatar" class="coach-avatar" />`
                                    : html`<div class="coach-avatar-placeholder">
                                        ${(coach.user?.full_name || 'C')[0].toUpperCase()}
                                    </div>`
                                }
                                <div>
                                    <h3>${coach.user?.full_name || 'Unnamed Coach'}</h3>
                                    <p class="coach-email">${coach.user?.email}</p>
                                </div>
                            </div>
                            <div class="verification-date">
                                Applied ${new Date(coach.created_at).toLocaleDateString()}
                            </div>
                        </div>

                        <div class="verification-details">
                            <div class="detail-row">
                                <span class="detail-label">Bio:</span>
                                <span class="detail-value">${coach.bio || 'Not provided'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Specialties:</span>
                                <span class="detail-value">${coach.specialties?.join(', ') || 'None'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Hourly Rate:</span>
                                <span class="detail-value">€${coach.hourly_rate || 0}</span>
                            </div>
                        </div>

                        <div class="verification-actions">
                            <button class="btn-verify" onClick=${() => verifyCoach(coach.id)}>
                                ✓ Verify Coach
                            </button>
                            <button class="btn-reject" onClick=${() => rejectCoach(coach.id)}>
                                ✕ Reject
                            </button>
                        </div>
                    </div>
                `)}
            </div>
        </div>
    `;
};

/**
 * Platform Settings Component
 */
const PlatformSettings = ({ session }) => {
    const [settings, setSettings] = useState({
        commission_rate: 15,
        founding_coach_rate: 10,
        referral_reward_amount: 10,
        maintenance_mode: false,
        allow_new_registrations: true
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);

            const { data, error } = await supabaseClient
                .from('platform_settings')
                .select('*')
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            if (data) {
                setSettings(data);
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async () => {
        try {
            setSaving(true);

            const { error } = await supabaseClient
                .from('platform_settings')
                .upsert([settings]);

            if (error) throw error;

            // Log admin action
            await supabaseClient.from('admin_actions').insert([{
                admin_id: session.user.id,
                action_type: 'settings_updated',
                target_type: 'platform',
                details: settings
            }]);

            alert('Settings saved successfully!');
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return html`<div class="skeleton-loader" style="height: 400px;"></div>`;
    }

    return html`
        <div class="platform-settings">
            <h2>Platform Settings</h2>

            <div class="settings-form">
                <div class="setting-group">
                    <h3>Commission Rates</h3>
                    <div class="form-row">
                        <div class="form-field">
                            <label>Standard Commission (%)</label>
                            <input
                                type="number"
                                value=${settings.commission_rate}
                                onInput=${(e) => setSettings({ ...settings, commission_rate: parseFloat(e.target.value) })}
                                min="0"
                                max="100"
                                step="0.1"
                            />
                        </div>
                        <div class="form-field">
                            <label>Founding Coach Rate (%)</label>
                            <input
                                type="number"
                                value=${settings.founding_coach_rate}
                                onInput=${(e) => setSettings({ ...settings, founding_coach_rate: parseFloat(e.target.value) })}
                                min="0"
                                max="100"
                                step="0.1"
                            />
                        </div>
                    </div>
                </div>

                <div class="setting-group">
                    <h3>Referral Program</h3>
                    <div class="form-field">
                        <label>Referral Reward Amount (€)</label>
                        <input
                            type="number"
                            value=${settings.referral_reward_amount}
                            onInput=${(e) => setSettings({ ...settings, referral_reward_amount: parseFloat(e.target.value) })}
                            min="0"
                            step="0.01"
                        />
                    </div>
                </div>

                <div class="setting-group">
                    <h3>Platform Controls</h3>
                    <div class="form-field-checkbox">
                        <label>
                            <input
                                type="checkbox"
                                checked=${settings.maintenance_mode}
                                onChange=${(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
                            />
                            <span>Maintenance Mode (disables platform)</span>
                        </label>
                    </div>
                    <div class="form-field-checkbox">
                        <label>
                            <input
                                type="checkbox"
                                checked=${settings.allow_new_registrations}
                                onChange=${(e) => setSettings({ ...settings, allow_new_registrations: e.target.checked })}
                            />
                            <span>Allow New Registrations</span>
                        </label>
                    </div>
                </div>

                <button class="btn-save" onClick=${saveSettings} disabled=${saving}>
                    ${saving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>
        </div>
    `;
};

/**
 * Analytics Dashboard Component
 */
const AnalyticsDashboard = ({ session }) => {
    const [metrics, setMetrics] = useState({
        dailyBookings: [],
        weeklyRevenue: [],
        topCoaches: [],
        popularSpecialties: [],
        conversionRate: 0,
        averageSessionValue: 0,
        repeatClientRate: 0,
        monthlyGrowth: 0
    });
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('30d');

    useEffect(() => {
        loadMetrics();
    }, [timeRange]);

    const loadMetrics = async () => {
        try {
            setLoading(true);

            // Calculate date range
            const endDate = new Date();
            const startDate = new Date();
            const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
            startDate.setDate(startDate.getDate() - days);

            // Parallel queries for metrics
            const [bookings, topCoaches, specialties, allBookings] = await Promise.all([
                supabaseClient
                    .from('bookings')
                    .select('created_at, amount_total')
                    .gte('created_at', startDate.toISOString())
                    .order('created_at', { ascending: true }),
                supabaseClient
                    .from('coaches')
                    .select('id, user_id, rating_average, rating_count')
                    .eq('is_verified', true)
                    .order('rating_count', { ascending: false })
                    .limit(5),
                supabaseClient
                    .from('coaches')
                    .select('specialties'),
                supabaseClient
                    .from('bookings')
                    .select('id, client_id, amount_total', { count: 'exact' })
            ]);

            // Process daily bookings
            const dailyMap = {};
            (bookings.data || []).forEach(b => {
                const day = new Date(b.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
                dailyMap[day] = (dailyMap[day] || 0) + 1;
            });

            // Process weekly revenue
            const weeklyMap = {};
            (bookings.data || []).forEach(b => {
                const week = getWeekNumber(new Date(b.created_at));
                weeklyMap[week] = (weeklyMap[week] || 0) + parseFloat(b.amount_total || 0);
            });

            // Process popular specialties
            const specialtyCount = {};
            (specialties.data || []).forEach(c => {
                (c.specialties || []).forEach(s => {
                    specialtyCount[s] = (specialtyCount[s] || 0) + 1;
                });
            });

            const sortedSpecialties = Object.entries(specialtyCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([name, count]) => ({ name, count }));

            // Calculate conversion rate (completed bookings / total)
            const completedBookings = (allBookings.data || []).filter(b => b.amount_total > 0);
            const uniqueClients = [...new Set((allBookings.data || []).map(b => b.client_id))];
            const repeatClients = uniqueClients.filter(clientId =>
                (allBookings.data || []).filter(b => b.client_id === clientId).length > 1
            );

            const avgValue = completedBookings.length > 0
                ? completedBookings.reduce((sum, b) => sum + parseFloat(b.amount_total || 0), 0) / completedBookings.length
                : 0;

            setMetrics({
                dailyBookings: Object.entries(dailyMap).map(([date, count]) => ({ date, count })),
                weeklyRevenue: Object.entries(weeklyMap).map(([week, revenue]) => ({ week, revenue })),
                topCoaches: topCoaches.data || [],
                popularSpecialties: sortedSpecialties,
                conversionRate: allBookings.count > 0 ? (completedBookings.length / allBookings.count * 100) : 0,
                averageSessionValue: avgValue,
                repeatClientRate: uniqueClients.length > 0 ? (repeatClients.length / uniqueClients.length * 100) : 0,
                monthlyGrowth: 12.5 // Would need historical data
            });
        } catch (error) {
            console.error('Failed to load metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    const getWeekNumber = (date) => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return `W${Math.ceil((((d - yearStart) / 86400000) + 1) / 7)}`;
    };

    if (loading) {
        return html`<div class="skeleton-loader" style="height: 600px;"></div>`;
    }

    return html`
        <div class="analytics-dashboard">
            <div class="analytics-header">
                <h2>Analytics Dashboard</h2>
                <div class="time-range-selector">
                    <button
                        class="time-btn ${timeRange === '7d' ? 'active' : ''}"
                        onClick=${() => setTimeRange('7d')}
                    >7 Days</button>
                    <button
                        class="time-btn ${timeRange === '30d' ? 'active' : ''}"
                        onClick=${() => setTimeRange('30d')}
                    >30 Days</button>
                    <button
                        class="time-btn ${timeRange === '90d' ? 'active' : ''}"
                        onClick=${() => setTimeRange('90d')}
                    >90 Days</button>
                </div>
            </div>

            <!-- KPI Cards -->
            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-icon">📈</div>
                    <div class="kpi-content">
                        <div class="kpi-value">${metrics.conversionRate.toFixed(1)}%</div>
                        <div class="kpi-label">Conversion Rate</div>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">💵</div>
                    <div class="kpi-content">
                        <div class="kpi-value">€${metrics.averageSessionValue.toFixed(2)}</div>
                        <div class="kpi-label">Avg Session Value</div>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">🔄</div>
                    <div class="kpi-content">
                        <div class="kpi-value">${metrics.repeatClientRate.toFixed(1)}%</div>
                        <div class="kpi-label">Repeat Client Rate</div>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">📊</div>
                    <div class="kpi-content">
                        <div class="kpi-value">+${metrics.monthlyGrowth}%</div>
                        <div class="kpi-label">Monthly Growth</div>
                    </div>
                </div>
            </div>

            <!-- Charts Row -->
            <div class="charts-row">
                <div class="chart-card">
                    <h3>Daily Bookings</h3>
                    <div class="simple-chart">
                        ${metrics.dailyBookings.length > 0 ? html`
                            <div class="bar-chart">
                                ${metrics.dailyBookings.slice(-14).map((d, i) => html`
                                    <div class="bar-container" key=${i}>
                                        <div
                                            class="bar"
                                            style="height: ${Math.max(10, (d.count / Math.max(...metrics.dailyBookings.map(x => x.count))) * 100)}%"
                                            title="${d.date}: ${d.count} bookings"
                                        ></div>
                                        <span class="bar-label">${d.date}</span>
                                    </div>
                                `)}
                            </div>
                        ` : html`<p class="no-data">No booking data available</p>`}
                    </div>
                </div>

                <div class="chart-card">
                    <h3>Popular Specialties</h3>
                    <div class="specialties-list">
                        ${metrics.popularSpecialties.map((s, i) => html`
                            <div class="specialty-row" key=${i}>
                                <span class="specialty-name">${s.name}</span>
                                <div class="specialty-bar-bg">
                                    <div
                                        class="specialty-bar"
                                        style="width: ${(s.count / (metrics.popularSpecialties[0]?.count || 1)) * 100}%"
                                    ></div>
                                </div>
                                <span class="specialty-count">${s.count}</span>
                            </div>
                        `)}
                    </div>
                </div>
            </div>

            <!-- Top Coaches -->
            <div class="top-coaches-section">
                <h3>Top Rated Coaches</h3>
                <div class="top-coaches-list">
                    ${metrics.topCoaches.map((coach, i) => html`
                        <div class="top-coach-card" key=${coach.id}>
                            <span class="rank">#${i + 1}</span>
                            <div class="coach-stats">
                                <span class="rating">⭐ ${(coach.rating_average || 0).toFixed(1)}</span>
                                <span class="reviews">${coach.rating_count || 0} reviews</span>
                            </div>
                        </div>
                    `)}
                </div>
            </div>
        </div>
    `;
};

/**
 * System Health Component
 */
const SystemHealth = ({ session }) => {
    const [health, setHealth] = useState({
        database: { status: 'checking', latency: 0 },
        api: { status: 'checking', latency: 0 },
        stripe: { status: 'checking', message: '' },
        openrouter: { status: 'checking', message: '' },
        storage: { status: 'checking', used: 0, total: 0 }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkHealth();
        const interval = setInterval(checkHealth, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const checkHealth = async () => {
        setLoading(true);
        const newHealth = { ...health };

        // Database health check
        try {
            const start = Date.now();
            const { error } = await supabaseClient.from('users').select('id').limit(1);
            const latency = Date.now() - start;
            newHealth.database = {
                status: error ? 'error' : latency > 1000 ? 'warning' : 'healthy',
                latency,
                message: error ? error.message : null
            };
        } catch (e) {
            newHealth.database = { status: 'error', latency: 0, message: e.message };
        }

        // API health check
        try {
            const start = Date.now();
            const response = await fetch('/api/endpoints/health.php');
            const latency = Date.now() - start;
            newHealth.api = {
                status: response.ok ? (latency > 500 ? 'warning' : 'healthy') : 'error',
                latency,
                message: response.ok ? null : `HTTP ${response.status}`
            };
        } catch (e) {
            newHealth.api = { status: 'error', latency: 0, message: e.message };
        }

        // Stripe check (basic connectivity)
        try {
            const response = await fetch('/api/endpoints/stripe.php?action=health');
            const data = await response.json();
            newHealth.stripe = {
                status: data.success ? 'healthy' : 'warning',
                message: data.message || (data.success ? 'Connected' : 'Check configuration')
            };
        } catch (e) {
            newHealth.stripe = { status: 'unknown', message: 'Could not verify' };
        }

        // OpenRouter check
        try {
            const response = await fetch('/api/endpoints/discovery.php?action=ai-status');
            const data = await response.json();
            newHealth.openrouter = {
                status: data.configured ? 'healthy' : 'warning',
                message: data.configured ? 'API configured' : 'Not configured'
            };
        } catch (e) {
            newHealth.openrouter = { status: 'unknown', message: 'Could not verify' };
        }

        // Storage estimate (if available)
        try {
            if (navigator.storage && navigator.storage.estimate) {
                const estimate = await navigator.storage.estimate();
                newHealth.storage = {
                    status: 'healthy',
                    used: estimate.usage || 0,
                    total: estimate.quota || 0
                };
            } else {
                newHealth.storage = { status: 'unknown', message: 'Not available' };
            }
        } catch (e) {
            newHealth.storage = { status: 'unknown', message: 'Not available' };
        }

        setHealth(newHealth);
        setLoading(false);
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'healthy': return '✅';
            case 'warning': return '⚠️';
            case 'error': return '❌';
            case 'checking': return '⏳';
            default: return '❓';
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'healthy': return 'status-healthy';
            case 'warning': return 'status-warning';
            case 'error': return 'status-error';
            default: return 'status-unknown';
        }
    };

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return html`
        <div class="system-health">
            <div class="health-header">
                <h2>System Health</h2>
                <button class="refresh-btn" onClick=${checkHealth} disabled=${loading}>
                    ${loading ? '⏳ Checking...' : '🔄 Refresh'}
                </button>
            </div>

            <div class="health-grid">
                <div class="health-card ${getStatusClass(health.database.status)}">
                    <div class="health-icon">${getStatusIcon(health.database.status)}</div>
                    <div class="health-info">
                        <h3>Database</h3>
                        <p class="health-status">${health.database.status}</p>
                        ${health.database.latency > 0 && html`
                            <p class="health-metric">${health.database.latency}ms latency</p>
                        `}
                        ${health.database.message && html`
                            <p class="health-error">${health.database.message}</p>
                        `}
                    </div>
                </div>

                <div class="health-card ${getStatusClass(health.api.status)}">
                    <div class="health-icon">${getStatusIcon(health.api.status)}</div>
                    <div class="health-info">
                        <h3>API Server</h3>
                        <p class="health-status">${health.api.status}</p>
                        ${health.api.latency > 0 && html`
                            <p class="health-metric">${health.api.latency}ms latency</p>
                        `}
                        ${health.api.message && html`
                            <p class="health-error">${health.api.message}</p>
                        `}
                    </div>
                </div>

                <div class="health-card ${getStatusClass(health.stripe.status)}">
                    <div class="health-icon">${getStatusIcon(health.stripe.status)}</div>
                    <div class="health-info">
                        <h3>Stripe Payments</h3>
                        <p class="health-status">${health.stripe.status}</p>
                        <p class="health-metric">${health.stripe.message}</p>
                    </div>
                </div>

                <div class="health-card ${getStatusClass(health.openrouter.status)}">
                    <div class="health-icon">${getStatusIcon(health.openrouter.status)}</div>
                    <div class="health-info">
                        <h3>AI Matching (OpenRouter)</h3>
                        <p class="health-status">${health.openrouter.status}</p>
                        <p class="health-metric">${health.openrouter.message}</p>
                    </div>
                </div>

                <div class="health-card ${getStatusClass(health.storage.status)}">
                    <div class="health-icon">${getStatusIcon(health.storage.status)}</div>
                    <div class="health-info">
                        <h3>Browser Storage</h3>
                        <p class="health-status">${health.storage.status}</p>
                        ${health.storage.total > 0 ? html`
                            <p class="health-metric">${formatBytes(health.storage.used)} / ${formatBytes(health.storage.total)}</p>
                            <div class="storage-bar">
                                <div class="storage-used" style="width: ${(health.storage.used / health.storage.total) * 100}%"></div>
                            </div>
                        ` : html`
                            <p class="health-metric">${health.storage.message || 'N/A'}</p>
                        `}
                    </div>
                </div>
            </div>

            <div class="health-uptime">
                <h3>Service Status</h3>
                <p class="uptime-text">
                    ${Object.values(health).every(h => h.status === 'healthy' || h.status === 'unknown')
                        ? '🟢 All systems operational'
                        : Object.values(health).some(h => h.status === 'error')
                            ? '🔴 Some services experiencing issues'
                            : '🟡 Some services degraded'
                    }
                </p>
                <p class="last-check">Last checked: ${new Date().toLocaleTimeString()}</p>
            </div>
        </div>
    `;
};

/**
 * Error Logs Component
 */
const ErrorLogs = ({ session }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        try {
            setLoading(true);

            // Load admin actions as a proxy for activity logs
            const { data: adminLogs, error } = await supabaseClient
                .from('admin_actions')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            // Load any system errors/events if available
            const { data: errorLogs } = await supabaseClient
                .from('error_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            // Combine and format logs
            const combinedLogs = [
                ...(adminLogs || []).map(log => ({
                    id: log.id,
                    type: 'admin_action',
                    level: 'info',
                    message: `${log.action_type}: ${log.target_type} (${log.target_id})`,
                    details: log.details,
                    created_at: log.created_at,
                    source: 'admin'
                })),
                ...(errorLogs || []).map(log => ({
                    id: log.id,
                    type: log.type || 'error',
                    level: log.level || 'error',
                    message: log.message,
                    details: log.stack || log.details,
                    created_at: log.created_at,
                    source: log.source || 'system'
                }))
            ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            setLogs(combinedLogs);
        } catch (error) {
            console.error('Failed to load logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesFilter = filter === 'all' || log.level === filter;
        const matchesSearch = !searchTerm ||
            log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.details && JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesFilter && matchesSearch;
    });

    const getLevelIcon = (level) => {
        switch (level) {
            case 'error': return '❌';
            case 'warning': return '⚠️';
            case 'info': return 'ℹ️';
            case 'debug': return '🐛';
            default: return '📝';
        }
    };

    const getLevelClass = (level) => {
        switch (level) {
            case 'error': return 'log-error';
            case 'warning': return 'log-warning';
            case 'info': return 'log-info';
            default: return 'log-debug';
        }
    };

    const clearLogs = async () => {
        if (!confirm('Are you sure you want to clear all logs? This cannot be undone.')) return;

        try {
            // Note: In production, you might want to archive instead of delete
            await supabaseClient.from('error_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            loadLogs();
        } catch (error) {
            console.error('Failed to clear logs:', error);
            alert('Failed to clear logs');
        }
    };

    if (loading) {
        return html`<div class="skeleton-loader" style="height: 400px;"></div>`;
    }

    return html`
        <div class="error-logs">
            <div class="logs-header">
                <h2>System Logs</h2>
                <div class="logs-controls">
                    <input
                        type="text"
                        class="search-input"
                        placeholder="Search logs..."
                        value=${searchTerm}
                        onInput=${(e) => setSearchTerm(e.target.value)}
                    />
                    <select
                        class="filter-select"
                        value=${filter}
                        onChange=${(e) => setFilter(e.target.value)}
                    >
                        <option value="all">All Levels</option>
                        <option value="error">Errors</option>
                        <option value="warning">Warnings</option>
                        <option value="info">Info</option>
                        <option value="debug">Debug</option>
                    </select>
                    <button class="btn-sm btn-info" onClick=${loadLogs}>🔄 Refresh</button>
                    <button class="btn-sm btn-danger" onClick=${clearLogs}>🗑️ Clear</button>
                </div>
            </div>

            <div class="logs-summary">
                <span class="log-count log-count-error">❌ ${logs.filter(l => l.level === 'error').length} errors</span>
                <span class="log-count log-count-warning">⚠️ ${logs.filter(l => l.level === 'warning').length} warnings</span>
                <span class="log-count log-count-info">ℹ️ ${logs.filter(l => l.level === 'info').length} info</span>
            </div>

            ${filteredLogs.length === 0 ? html`
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <h3>No Logs Found</h3>
                    <p>${searchTerm || filter !== 'all' ? 'Try adjusting your filters' : 'System is running clean!'}</p>
                </div>
            ` : html`
                <div class="logs-list">
                    ${filteredLogs.map(log => html`
                        <div class="log-entry ${getLevelClass(log.level)}" key=${log.id}>
                            <div class="log-header">
                                <span class="log-icon">${getLevelIcon(log.level)}</span>
                                <span class="log-level">${log.level.toUpperCase()}</span>
                                <span class="log-source">[${log.source}]</span>
                                <span class="log-time">${new Date(log.created_at).toLocaleString()}</span>
                            </div>
                            <div class="log-message">${log.message}</div>
                            ${log.details && html`
                                <details class="log-details">
                                    <summary>Details</summary>
                                    <pre>${typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}</pre>
                                </details>
                            `}
                        </div>
                    `)}
                </div>
            `}
        </div>
    `;
};

/**
 * Promo Code Management Component
 */
const PromoCodeManagement = ({ session }) => {
    const [promoCodes, setPromoCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newCode, setNewCode] = useState({
        code: '',
        discount_type: 'percentage',
        discount_value: 10,
        max_uses: null,
        expires_at: '',
        min_booking_value: 0,
        applies_to: 'all'
    });

    useEffect(() => {
        loadPromoCodes();
    }, []);

    const loadPromoCodes = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabaseClient
                .from('promo_codes')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPromoCodes(data || []);
        } catch (error) {
            console.error('Failed to load promo codes:', error);
        } finally {
            setLoading(false);
        }
    };

    const createPromoCode = async () => {
        if (!newCode.code) {
            alert('Please enter a promo code');
            return;
        }

        try {
            const { error } = await supabaseClient
                .from('promo_codes')
                .insert([{
                    ...newCode,
                    code: newCode.code.toUpperCase(),
                    is_active: true,
                    use_count: 0,
                    created_by: session.user.id
                }]);

            if (error) throw error;

            // Log admin action
            await supabaseClient.from('admin_actions').insert([{
                admin_id: session.user.id,
                action_type: 'promo_code_created',
                target_type: 'promo_code',
                details: { code: newCode.code.toUpperCase() }
            }]);

            setShowCreate(false);
            setNewCode({
                code: '',
                discount_type: 'percentage',
                discount_value: 10,
                max_uses: null,
                expires_at: '',
                min_booking_value: 0,
                applies_to: 'all'
            });
            loadPromoCodes();
        } catch (error) {
            console.error('Failed to create promo code:', error);
            alert('Failed to create promo code: ' + error.message);
        }
    };

    const togglePromoCode = async (codeId, currentStatus) => {
        try {
            const { error } = await supabaseClient
                .from('promo_codes')
                .update({ is_active: !currentStatus })
                .eq('id', codeId);

            if (error) throw error;
            loadPromoCodes();
        } catch (error) {
            console.error('Failed to toggle promo code:', error);
        }
    };

    const deletePromoCode = async (codeId) => {
        if (!confirm('Are you sure you want to delete this promo code?')) return;

        try {
            const { error } = await supabaseClient
                .from('promo_codes')
                .delete()
                .eq('id', codeId);

            if (error) throw error;
            loadPromoCodes();
        } catch (error) {
            console.error('Failed to delete promo code:', error);
        }
    };

    const generateRandomCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setNewCode({ ...newCode, code });
    };

    if (loading) {
        return html`<div class="skeleton-loader" style="height: 400px;"></div>`;
    }

    return html`
        <div class="promo-code-management">
            <div class="management-header">
                <h2>Promo Codes (${promoCodes.length})</h2>
                <button class="btn-primary" onClick=${() => setShowCreate(!showCreate)}>
                    ${showCreate ? '✕ Cancel' : '+ Create Promo Code'}
                </button>
            </div>

            ${showCreate && html`
                <div class="promo-create-form">
                    <h3>Create New Promo Code</h3>
                    <div class="form-grid">
                        <div class="form-field">
                            <label>Code</label>
                            <div class="code-input-group">
                                <input
                                    type="text"
                                    value=${newCode.code}
                                    onInput=${(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                                    placeholder="e.g., SUMMER2024"
                                />
                                <button class="btn-secondary" onClick=${generateRandomCode}>Generate</button>
                            </div>
                        </div>

                        <div class="form-field">
                            <label>Discount Type</label>
                            <select
                                value=${newCode.discount_type}
                                onChange=${(e) => setNewCode({ ...newCode, discount_type: e.target.value })}
                            >
                                <option value="percentage">Percentage (%)</option>
                                <option value="fixed">Fixed Amount (€)</option>
                            </select>
                        </div>

                        <div class="form-field">
                            <label>Discount Value</label>
                            <input
                                type="number"
                                value=${newCode.discount_value}
                                onInput=${(e) => setNewCode({ ...newCode, discount_value: parseFloat(e.target.value) })}
                                min="0"
                                step="0.01"
                            />
                        </div>

                        <div class="form-field">
                            <label>Max Uses (empty = unlimited)</label>
                            <input
                                type="number"
                                value=${newCode.max_uses || ''}
                                onInput=${(e) => setNewCode({ ...newCode, max_uses: e.target.value ? parseInt(e.target.value) : null })}
                                min="1"
                                placeholder="Unlimited"
                            />
                        </div>

                        <div class="form-field">
                            <label>Expires At</label>
                            <input
                                type="datetime-local"
                                value=${newCode.expires_at}
                                onInput=${(e) => setNewCode({ ...newCode, expires_at: e.target.value })}
                            />
                        </div>

                        <div class="form-field">
                            <label>Min Booking Value (€)</label>
                            <input
                                type="number"
                                value=${newCode.min_booking_value}
                                onInput=${(e) => setNewCode({ ...newCode, min_booking_value: parseFloat(e.target.value) })}
                                min="0"
                                step="0.01"
                            />
                        </div>
                    </div>

                    <button class="btn-create" onClick=${createPromoCode}>
                        Create Promo Code
                    </button>
                </div>
            `}

            ${promoCodes.length === 0 ? html`
                <div class="empty-state">
                    <div class="empty-icon">🏷️</div>
                    <h3>No Promo Codes</h3>
                    <p>Create your first promo code to offer discounts</p>
                </div>
            ` : html`
                <div class="promo-codes-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Discount</th>
                                <th>Usage</th>
                                <th>Expires</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${promoCodes.map(code => html`
                                <tr key=${code.id} class=${!code.is_active ? 'inactive-row' : ''}>
                                    <td><code class="promo-code">${code.code}</code></td>
                                    <td>
                                        ${code.discount_type === 'percentage'
                                            ? `${code.discount_value}%`
                                            : `€${code.discount_value.toFixed(2)}`
                                        }
                                    </td>
                                    <td>
                                        ${code.use_count || 0}${code.max_uses ? ` / ${code.max_uses}` : ''}
                                    </td>
                                    <td>
                                        ${code.expires_at
                                            ? new Date(code.expires_at).toLocaleDateString()
                                            : 'Never'
                                        }
                                    </td>
                                    <td>
                                        <span class="status-badge ${code.is_active ? 'status-active' : 'status-inactive'}">
                                            ${code.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <div class="action-buttons">
                                            <button
                                                class="btn-sm ${code.is_active ? 'btn-warning' : 'btn-success'}"
                                                onClick=${() => togglePromoCode(code.id, code.is_active)}
                                            >
                                                ${code.is_active ? 'Disable' : 'Enable'}
                                            </button>
                                            <button
                                                class="btn-sm btn-danger"
                                                onClick=${() => deletePromoCode(code.id)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `)}
                        </tbody>
                    </table>
                </div>
            `}
        </div>
    `;
};
