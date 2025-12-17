/**
 * Discovery Requests Dashboard Component
 * Allows coaches to manage discovery call requests from clients
 */

import htm from '../../vendor/htm.js';
import { t } from '../../i18n.js';

const React = window.React;
const { useState, useEffect } = React;
const html = htm.bind(React.createElement);

/**
 * DiscoveryRequestsDashboard Component
 * @param {Object} props
 * @param {Object} props.session - User session
 */
export function DiscoveryRequestsDashboard({ session }) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all'); // all, pending, contacted, completed

    useEffect(() => {
        loadRequests();
    }, [session]);

    const loadRequests = async () => {
        setLoading(true);
        setError('');
        try {
            // Get coach ID first
            const { data: coachData } = await window.supabaseClient
                .from('cs_coaches')
                .select('id')
                .eq('user_id', session.user.id)
                .single();

            if (!coachData) {
                setError('Coach profile not found');
                setLoading(false);
                return;
            }

            // Fetch discovery requests via API
            const response = await fetch(`/api/discovery-requests?coach_id=${coachData.id}`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            const result = await response.json();

            if (result.success) {
                setRequests(result.data || []);
            } else {
                setError(result.error?.message || 'Failed to load requests');
            }
        } catch (err) {
            console.error('Error loading discovery requests:', err);
            setError('Failed to load discovery requests');
        }
        setLoading(false);
    };

    const updateRequestStatus = async (requestId, newStatus, notes = null) => {
        try {
            const response = await fetch(`/api/discovery-requests/${requestId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ status: newStatus, coach_notes: notes })
            });
            const result = await response.json();

            if (result.success) {
                // Refresh list
                loadRequests();
            } else {
                setError(result.error?.message || 'Failed to update request');
            }
        } catch (err) {
            console.error('Error updating request:', err);
            setError('Failed to update request');
        }
    };

    const formatTimePreference = (pref) => {
        const labels = {
            'flexible': t('discovery.timeFlexible'),
            'weekday_morning': t('discovery.timeWeekdayMorning'),
            'weekday_afternoon': t('discovery.timeWeekdayAfternoon'),
            'weekday_evening': t('discovery.timeWeekdayEvening'),
            'weekend_morning': t('discovery.timeWeekendMorning'),
            'weekend_afternoon': t('discovery.timeWeekendAfternoon')
        };
        return labels[pref] || pref;
    };

    const getStatusBadge = (status) => {
        const badges = {
            'pending': { class: 'badge-warning', label: t('discovery.dashboard.pending') },
            'contacted': { class: 'badge-info', label: t('discovery.dashboard.contacted') },
            'scheduled': { class: 'badge-petrol', label: t('discovery.dashboard.scheduled') },
            'completed': { class: 'badge-success', label: t('discovery.dashboard.completed') },
            'cancelled': { class: 'badge-danger', label: t('discovery.dashboard.cancelled') }
        };
        return badges[status] || { class: 'badge-secondary', label: status };
    };

    const filteredRequests = filter === 'all'
        ? requests
        : requests.filter(r => r.status === filter);

    if (loading) {
        return html`
            <div class="dashboard-section">
                <div class="loading-spinner"></div>
                <p style=${{ textAlign: 'center', marginTop: '16px' }}>Loading discovery requests...</p>
            </div>
        `;
    }

    return html`
        <div class="dashboard-section discovery-requests-section">
            <div class="section-header">
                <h3>📞 ${t('discovery.dashboard.title')}</h3>
                <p class="section-description">${t('discovery.dashboard.description')}</p>
            </div>

            ${error && html`<div class="alert alert-error">${error}</div>`}

            <div class="filter-tabs" style=${{ marginBottom: '20px' }}>
                <button class="filter-btn ${filter === 'all' ? 'active' : ''}" onClick=${() => setFilter('all')}>
                    ${t('discovery.dashboard.all')} (${requests.length})
                </button>
                <button class="filter-btn ${filter === 'pending' ? 'active' : ''}" onClick=${() => setFilter('pending')}>
                    ${t('discovery.dashboard.pending')} (${requests.filter(r => r.status === 'pending').length})
                </button>
                <button class="filter-btn ${filter === 'contacted' ? 'active' : ''}" onClick=${() => setFilter('contacted')}>
                    ${t('discovery.dashboard.contacted')} (${requests.filter(r => r.status === 'contacted').length})
                </button>
                <button class="filter-btn ${filter === 'completed' ? 'active' : ''}" onClick=${() => setFilter('completed')}>
                    ${t('discovery.dashboard.completed')} (${requests.filter(r => r.status === 'completed').length})
                </button>
            </div>

            ${filteredRequests.length === 0 ? html`
                <div class="empty-state">
                    <div class="empty-icon">📞</div>
                    <h4>${t('discovery.dashboard.noRequests')}</h4>
                    <p>${t('discovery.dashboard.noRequestsDesc')}</p>
                </div>
            ` : html`
                <div class="discovery-requests-list">
                    ${filteredRequests.map(request => {
                        const badge = getStatusBadge(request.status);
                        return html`
                            <div key=${request.id} class="discovery-request-card">
                                <div class="request-header">
                                    <div class="client-info">
                                        <span class="client-name">${request.client_name}</span>
                                        <span class="badge ${badge.class}">${badge.label}</span>
                                    </div>
                                    <span class="request-date">${new Date(request.created_at).toLocaleDateString()}</span>
                                </div>

                                <div class="request-details">
                                    <div class="detail-row">
                                        <span class="detail-icon">📱</span>
                                        <a href="tel:${request.client_phone}" class="phone-link">${request.client_phone}</a>
                                    </div>
                                    ${request.client_email && html`
                                        <div class="detail-row">
                                            <span class="detail-icon">📧</span>
                                            <a href="mailto:${request.client_email}" class="email-link">${request.client_email}</a>
                                        </div>
                                    `}
                                    <div class="detail-row">
                                        <span class="detail-icon">🕐</span>
                                        <span>${t('discovery.dashboard.preferredTime')}: ${formatTimePreference(request.time_preference)}</span>
                                    </div>
                                    ${request.client_message && html`
                                        <div class="client-message">
                                            <strong>${t('discovery.dashboard.message')}:</strong>
                                            <p>${request.client_message}</p>
                                        </div>
                                    `}
                                </div>

                                <div class="request-actions">
                                    ${request.status === 'pending' && html`
                                        <button class="btn-sm btn-petrol" onClick=${() => updateRequestStatus(request.id, 'contacted')}>
                                            ✓ ${t('discovery.dashboard.markContacted')}
                                        </button>
                                    `}
                                    ${request.status === 'contacted' && html`
                                        <button class="btn-sm btn-petrol" onClick=${() => updateRequestStatus(request.id, 'scheduled')}>
                                            📅 ${t('discovery.dashboard.markScheduled')}
                                        </button>
                                    `}
                                    ${request.status === 'scheduled' && html`
                                        <button class="btn-sm btn-success" onClick=${() => updateRequestStatus(request.id, 'completed')}>
                                            ✓ ${t('discovery.dashboard.markCompleted')}
                                        </button>
                                    `}
                                    ${['pending', 'contacted', 'scheduled'].includes(request.status) && html`
                                        <button class="btn-sm btn-outline" onClick=${() => updateRequestStatus(request.id, 'cancelled')}>
                                            ${t('discovery.dashboard.cancelRequest')}
                                        </button>
                                    `}
                                </div>
                            </div>
                        `;
                    })}
                </div>
            `}
        </div>
    `;
}

export default DiscoveryRequestsDashboard;
