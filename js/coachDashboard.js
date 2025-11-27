/**
 * CoachSearching - Coach Dashboard Components
 *
 * React components for coach dashboard:
 * - CoachDashboard - Main dashboard layout
 * - UpcomingSessions - Upcoming bookings list
 * - AvailabilityEditor - Manage weekly availability
 * - BlockedDatesManager - Block time off
 * - EarningsDashboard - Revenue and payouts
 * - StripeOnboarding - Payment setup
 * - SessionCard - Individual session display
 */

const { html, useState, useEffect, useCallback, useMemo } = window.HtmPreact;

const API_BASE = window.CONFIG?.API_URL || 'https://clouedo.com/coachsearching/api';

// ============================================
// Utility Functions
// ============================================

function formatDateTime(dateStr, timezone = 'Europe/Amsterdam') {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone
    }).format(date);
}

function formatCurrency(cents, currency = 'eur') {
    const amount = cents / 100;
    const symbols = { eur: '\u20AC', gbp: '\u00A3', usd: '$', chf: 'CHF ' };
    return (symbols[currency.toLowerCase()] || '\u20AC') + amount.toFixed(2);
}

function getTimeUntil(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = date - now;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    if (diffHours > 0) return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    return 'soon';
}

// ============================================
// SessionCard Component
// ============================================

function SessionCard({ booking, onComplete, onNoShow, onCancel, timezone }) {
    const [showActions, setShowActions] = useState(false);
    const startTime = new Date(booking.start_time);
    const isUpcoming = startTime > new Date();
    const isPast = startTime < new Date();
    const canMarkComplete = isPast && booking.status === 'confirmed';

    const statusColors = {
        pending: 'status-pending',
        confirmed: 'status-confirmed',
        completed: 'status-completed',
        cancelled: 'status-cancelled',
        no_show: 'status-noshow'
    };

    return html`
        <div class="session-card ${booking.status}">
            <div class="session-main">
                <div class="session-time">
                    <div class="session-date">${formatDateTime(booking.start_time, timezone)}</div>
                    <div class="session-duration">${booking.duration_minutes} min</div>
                    ${isUpcoming && html`<span class="time-until">${getTimeUntil(booking.start_time)}</span>`}
                </div>

                <div class="session-client">
                    <div class="client-name">${booking.client_name}</div>
                    <div class="client-email">${booking.client_email}</div>
                    <span class="session-type-badge ${booking.session_type}">
                        ${booking.session_type === 'discovery' ? 'Discovery' :
                          booking.session_type === 'package' ? 'Package' : 'Paid'}
                    </span>
                </div>

                <div class="session-status">
                    <span class="status-badge ${statusColors[booking.status]}">
                        ${booking.status}
                    </span>
                    ${booking.amount?.cents > 0 && html`
                        <span class="session-amount">${formatCurrency(booking.amount.cents, booking.amount.currency)}</span>
                    `}
                </div>

                <div class="session-actions">
                    <button class="btn-icon" onClick=${() => setShowActions(!showActions)}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                        </svg>
                    </button>
                </div>
            </div>

            ${booking.client_notes && html`
                <div class="session-notes">
                    <strong>Notes:</strong> ${booking.client_notes}
                </div>
            `}

            ${showActions && html`
                <div class="session-actions-menu">
                    ${booking.video_link && html`
                        <a href=${booking.video_link} target="_blank" class="action-item">
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
                                <path d="M14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
                            </svg>
                            Join Video Call
                        </a>
                    `}
                    ${canMarkComplete && html`
                        <button class="action-item" onClick=${() => onComplete(booking.id)}>
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                            </svg>
                            Mark Completed
                        </button>
                        <button class="action-item" onClick=${() => onNoShow(booking.id)}>
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"/>
                            </svg>
                            Mark No-Show
                        </button>
                    `}
                    ${isUpcoming && booking.status === 'confirmed' && html`
                        <button class="action-item danger" onClick=${() => onCancel(booking.id)}>
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
                            </svg>
                            Cancel Session
                        </button>
                    `}
                </div>
            `}
        </div>
    `;
}

// ============================================
// UpcomingSessions Component
// ============================================

function UpcomingSessions({ coachId, timezone }) {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('upcoming');

    useEffect(() => {
        fetchBookings();
    }, [coachId, filter]);

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/bookings/coach?coach_id=${coachId}&status=${filter}`);
            const data = await response.json();
            setBookings(data.bookings || []);
        } catch (error) {
            console.error('Error fetching bookings:', error);
        }
        setLoading(false);
    };

    const handleComplete = async (bookingId) => {
        try {
            await fetch(`${API_BASE}/bookings/${bookingId}/complete`, { method: 'POST' });
            fetchBookings();
        } catch (error) {
            console.error('Error completing booking:', error);
        }
    };

    const handleNoShow = async (bookingId) => {
        try {
            await fetch(`${API_BASE}/bookings/${bookingId}/no-show`, { method: 'POST' });
            fetchBookings();
        } catch (error) {
            console.error('Error marking no-show:', error);
        }
    };

    const handleCancel = async (bookingId) => {
        if (!confirm('Are you sure you want to cancel this session?')) return;
        try {
            await fetch(`${API_BASE}/bookings/${bookingId}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cancelled_by: 'coach', reason: 'Cancelled by coach' })
            });
            fetchBookings();
        } catch (error) {
            console.error('Error cancelling booking:', error);
        }
    };

    return html`
        <div class="upcoming-sessions">
            <div class="section-header">
                <h3>Sessions</h3>
                <div class="filter-tabs">
                    <button class="filter-tab ${filter === 'upcoming' ? 'active' : ''}"
                            onClick=${() => setFilter('upcoming')}>
                        Upcoming
                    </button>
                    <button class="filter-tab ${filter === 'completed' ? 'active' : ''}"
                            onClick=${() => setFilter('completed')}>
                        Completed
                    </button>
                    <button class="filter-tab ${filter === 'cancelled' ? 'active' : ''}"
                            onClick=${() => setFilter('cancelled')}>
                        Cancelled
                    </button>
                </div>
            </div>

            ${loading ? html`
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                </div>
            ` : bookings.length === 0 ? html`
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <p>No ${filter} sessions</p>
                </div>
            ` : html`
                <div class="sessions-list">
                    ${bookings.map(booking => html`
                        <${SessionCard}
                            key=${booking.id}
                            booking=${booking}
                            timezone=${timezone}
                            onComplete=${handleComplete}
                            onNoShow=${handleNoShow}
                            onCancel=${handleCancel}
                        />
                    `)}
                </div>
            `}
        </div>
    `;
}

// ============================================
// AvailabilityEditor Component
// ============================================

function AvailabilityEditor({ coachId, onSave }) {
    const [availability, setAvailability] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    useEffect(() => {
        fetchAvailability();
    }, [coachId]);

    const fetchAvailability = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/availability?coach_id=${coachId}`);
            const data = await response.json();

            // Transform to editable format
            const slots = {};
            dayNames.forEach(day => {
                slots[day] = data.availability?.[day] || [];
            });
            setAvailability(slots);
        } catch (error) {
            console.error('Error fetching availability:', error);
        }
        setLoading(false);
    };

    const addSlot = (day) => {
        const newSlot = { start_time: '09:00', end_time: '17:00' };
        setAvailability({
            ...availability,
            [day]: [...(availability[day] || []), newSlot]
        });
    };

    const updateSlot = (day, index, field, value) => {
        const slots = [...availability[day]];
        slots[index] = { ...slots[index], [field]: value };
        setAvailability({ ...availability, [day]: slots });
    };

    const removeSlot = (day, index) => {
        const slots = availability[day].filter((_, i) => i !== index);
        setAvailability({ ...availability, [day]: slots });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await fetch(`${API_BASE}/availability?coach_id=${coachId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ availability })
            });
            onSave?.();
        } catch (error) {
            console.error('Error saving availability:', error);
        }
        setSaving(false);
    };

    if (loading) {
        return html`<div class="loading-state"><div class="loading-spinner"></div></div>`;
    }

    return html`
        <div class="availability-editor">
            <div class="section-header">
                <h3>Weekly Availability</h3>
                <p class="section-description">Set your regular available hours for each day of the week.</p>
            </div>

            <div class="availability-days">
                ${dayNames.map((day, dayIndex) => html`
                    <div class="day-row">
                        <div class="day-label">
                            <span class="day-name">${dayLabels[dayIndex]}</span>
                        </div>

                        <div class="day-slots">
                            ${(availability[day] || []).length === 0 ? html`
                                <span class="no-slots">Not available</span>
                            ` : (availability[day] || []).map((slot, slotIndex) => html`
                                <div class="time-slot-row" key=${slotIndex}>
                                    <input
                                        type="time"
                                        value=${slot.start_time}
                                        onChange=${(e) => updateSlot(day, slotIndex, 'start_time', e.target.value)}
                                    />
                                    <span class="slot-separator">to</span>
                                    <input
                                        type="time"
                                        value=${slot.end_time}
                                        onChange=${(e) => updateSlot(day, slotIndex, 'end_time', e.target.value)}
                                    />
                                    <button class="btn-icon remove" onClick=${() => removeSlot(day, slotIndex)}>
                                        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
                                        </svg>
                                    </button>
                                </div>
                            `)}
                        </div>

                        <button class="btn-add-slot" onClick=${() => addSlot(day)}>
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/>
                            </svg>
                        </button>
                    </div>
                `)}
            </div>

            <div class="form-actions">
                <button class="btn btn-primary" onClick=${handleSave} disabled=${saving}>
                    ${saving ? 'Saving...' : 'Save Availability'}
                </button>
            </div>
        </div>
    `;
}

// ============================================
// BlockedDatesManager Component
// ============================================

function BlockedDatesManager({ coachId }) {
    const [blockedDates, setBlockedDates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [newBlock, setNewBlock] = useState({ start_date: '', end_date: '', reason: '' });

    useEffect(() => {
        fetchBlockedDates();
    }, [coachId]);

    const fetchBlockedDates = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/availability/blocked?coach_id=${coachId}`);
            const data = await response.json();
            setBlockedDates(data.blocked_dates || []);
        } catch (error) {
            console.error('Error fetching blocked dates:', error);
        }
        setLoading(false);
    };

    const addBlockedDates = async () => {
        if (!newBlock.start_date || !newBlock.end_date) return;

        try {
            await fetch(`${API_BASE}/availability/blocked?coach_id=${coachId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newBlock)
            });
            setNewBlock({ start_date: '', end_date: '', reason: '' });
            setShowForm(false);
            fetchBlockedDates();
        } catch (error) {
            console.error('Error adding blocked dates:', error);
        }
    };

    const removeBlockedDates = async (blockId) => {
        try {
            await fetch(`${API_BASE}/availability/blocked?coach_id=${coachId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ block_id: blockId })
            });
            fetchBlockedDates();
        } catch (error) {
            console.error('Error removing blocked dates:', error);
        }
    };

    return html`
        <div class="blocked-dates-manager">
            <div class="section-header">
                <h3>Blocked Dates</h3>
                <button class="btn btn-secondary btn-sm" onClick=${() => setShowForm(!showForm)}>
                    ${showForm ? 'Cancel' : 'Block Time Off'}
                </button>
            </div>

            ${showForm && html`
                <div class="block-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Start Date</label>
                            <input
                                type="date"
                                value=${newBlock.start_date}
                                onChange=${(e) => setNewBlock({...newBlock, start_date: e.target.value})}
                            />
                        </div>
                        <div class="form-group">
                            <label>End Date</label>
                            <input
                                type="date"
                                value=${newBlock.end_date}
                                min=${newBlock.start_date}
                                onChange=${(e) => setNewBlock({...newBlock, end_date: e.target.value})}
                            />
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Reason (optional)</label>
                        <input
                            type="text"
                            value=${newBlock.reason}
                            placeholder="e.g., Vacation, Conference"
                            onChange=${(e) => setNewBlock({...newBlock, reason: e.target.value})}
                        />
                    </div>
                    <button class="btn btn-primary" onClick=${addBlockedDates}>
                        Add Blocked Dates
                    </button>
                </div>
            `}

            ${loading ? html`
                <div class="loading-state"><div class="loading-spinner"></div></div>
            ` : blockedDates.length === 0 ? html`
                <div class="empty-state small">
                    <p>No blocked dates</p>
                </div>
            ` : html`
                <div class="blocked-dates-list">
                    ${blockedDates.map(block => html`
                        <div class="blocked-date-item" key=${block.id}>
                            <div class="block-dates">
                                <strong>${new Date(block.start_date).toLocaleDateString()}</strong>
                                ${block.start_date !== block.end_date && html`
                                    <span> - ${new Date(block.end_date).toLocaleDateString()}</span>
                                `}
                            </div>
                            ${block.reason && html`<span class="block-reason">${block.reason}</span>`}
                            <button class="btn-icon remove" onClick=${() => removeBlockedDates(block.id)}>
                                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9z"/>
                                </svg>
                            </button>
                        </div>
                    `)}
                </div>
            `}
        </div>
    `;
}

// ============================================
// EarningsDashboard Component
// ============================================

function EarningsDashboard({ coachId }) {
    const [earnings, setEarnings] = useState(null);
    const [period, setPeriod] = useState('month');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEarnings();
    }, [coachId, period]);

    const fetchEarnings = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/coaches/${coachId}/earnings?period=${period}`);
            const data = await response.json();
            setEarnings(data);
        } catch (error) {
            console.error('Error fetching earnings:', error);
            // Fallback to mock data for demo
            setEarnings({
                total_cents: 245000,
                sessions_count: 18,
                currency: 'eur',
                pending_payout_cents: 75000,
                comparison: { change_percent: 15, direction: 'up' }
            });
        }
        setLoading(false);
    };

    if (loading) {
        return html`<div class="loading-state"><div class="loading-spinner"></div></div>`;
    }

    return html`
        <div class="earnings-dashboard">
            <div class="section-header">
                <h3>Earnings</h3>
                <select value=${period} onChange=${(e) => setPeriod(e.target.value)}>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                    <option value="all">All Time</option>
                </select>
            </div>

            <div class="earnings-cards">
                <div class="earnings-card primary">
                    <div class="card-label">Total Earnings</div>
                    <div class="card-value">${formatCurrency(earnings.total_cents, earnings.currency)}</div>
                    ${earnings.comparison && html`
                        <div class="card-change ${earnings.comparison.direction}">
                            ${earnings.comparison.direction === 'up' ? '+' : '-'}${earnings.comparison.change_percent}%
                            vs last ${period}
                        </div>
                    `}
                </div>

                <div class="earnings-card">
                    <div class="card-label">Sessions</div>
                    <div class="card-value">${earnings.sessions_count}</div>
                </div>

                <div class="earnings-card">
                    <div class="card-label">Pending Payout</div>
                    <div class="card-value">${formatCurrency(earnings.pending_payout_cents, earnings.currency)}</div>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// StripeOnboarding Component
// ============================================

function StripeOnboarding({ coachId, onComplete }) {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchStatus();
    }, [coachId]);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/stripe/connect/status?coach_id=${coachId}`);
            const data = await response.json();
            setStatus(data);
        } catch (error) {
            console.error('Error fetching Stripe status:', error);
        }
        setLoading(false);
    };

    const startOnboarding = async () => {
        setActionLoading(true);
        try {
            const endpoint = status?.has_account
                ? `${API_BASE}/stripe/connect/onboard?coach_id=${coachId}`
                : `${API_BASE}/stripe/connect/create`;

            const options = status?.has_account
                ? { method: 'GET' }
                : {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ coach_id: coachId })
                };

            const response = await fetch(endpoint, options);
            const data = await response.json();

            if (data.onboarding_url) {
                window.location.href = data.onboarding_url;
            }
        } catch (error) {
            console.error('Error starting onboarding:', error);
        }
        setActionLoading(false);
    };

    const openDashboard = async () => {
        setActionLoading(true);
        try {
            const response = await fetch(`${API_BASE}/stripe/connect/dashboard?coach_id=${coachId}`);
            const data = await response.json();
            if (data.dashboard_url) {
                window.open(data.dashboard_url, '_blank');
            }
        } catch (error) {
            console.error('Error opening dashboard:', error);
        }
        setActionLoading(false);
    };

    if (loading) {
        return html`<div class="loading-state"><div class="loading-spinner"></div></div>`;
    }

    const isActive = status?.status === 'active';
    const isPending = status?.status === 'pending_verification';
    const needsSetup = !status?.has_account || status?.status === 'incomplete';

    return html`
        <div class="stripe-onboarding">
            <div class="section-header">
                <h3>Payment Setup</h3>
                ${status?.founding_coach && html`
                    <span class="founding-badge">Founding Coach - ${status.platform_fee_percent}% fee</span>
                `}
            </div>

            ${isActive ? html`
                <div class="status-active">
                    <div class="status-icon success">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                    </div>
                    <div class="status-text">
                        <h4>Payments Active</h4>
                        <p>You can receive payments from clients</p>
                    </div>
                    <button class="btn btn-secondary" onClick=${openDashboard} disabled=${actionLoading}>
                        ${actionLoading ? 'Loading...' : 'View Stripe Dashboard'}
                    </button>
                </div>
            ` : isPending ? html`
                <div class="status-pending">
                    <div class="status-icon pending">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                    </div>
                    <div class="status-text">
                        <h4>Verification Pending</h4>
                        <p>Stripe is reviewing your information. This usually takes 1-2 business days.</p>
                    </div>
                </div>
            ` : html`
                <div class="status-setup">
                    <div class="status-icon setup">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                            <line x1="1" y1="10" x2="23" y2="10"/>
                        </svg>
                    </div>
                    <div class="status-text">
                        <h4>Set Up Payments</h4>
                        <p>Connect your Stripe account to receive payments from clients.</p>
                        ${status?.requirements?.currently_due?.length > 0 && html`
                            <p class="requirements-note">
                                Additional information needed: ${status.requirements.currently_due.length} items
                            </p>
                        `}
                    </div>
                    <button class="btn btn-primary" onClick=${startOnboarding} disabled=${actionLoading}>
                        ${actionLoading ? 'Loading...' : needsSetup ? 'Connect Stripe' : 'Complete Setup'}
                    </button>
                </div>
            `}
        </div>
    `;
}

// ============================================
// BookingSettings Component
// ============================================

function BookingSettings({ coachId }) {
    const [settings, setSettings] = useState({
        timezone: 'Europe/Amsterdam',
        buffer_before_minutes: 15,
        buffer_after_minutes: 15,
        minimum_notice_hours: 24,
        maximum_advance_days: 60,
        video_link: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const timezones = [
        'Europe/Amsterdam', 'Europe/Berlin', 'Europe/Brussels', 'Europe/London',
        'Europe/Paris', 'Europe/Madrid', 'Europe/Rome', 'Europe/Zurich'
    ];

    useEffect(() => {
        fetchSettings();
    }, [coachId]);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/availability/settings?coach_id=${coachId}`);
            const data = await response.json();
            if (data.settings) {
                setSettings({ ...settings, ...data.settings });
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await fetch(`${API_BASE}/availability/settings?coach_id=${coachId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
        } catch (error) {
            console.error('Error saving settings:', error);
        }
        setSaving(false);
    };

    if (loading) {
        return html`<div class="loading-state"><div class="loading-spinner"></div></div>`;
    }

    return html`
        <div class="booking-settings">
            <div class="section-header">
                <h3>Booking Settings</h3>
            </div>

            <div class="settings-form">
                <div class="form-group">
                    <label>Timezone</label>
                    <select value=${settings.timezone}
                            onChange=${(e) => setSettings({...settings, timezone: e.target.value})}>
                        ${timezones.map(tz => html`<option value=${tz}>${tz}</option>`)}
                    </select>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Buffer Before (minutes)</label>
                        <input type="number" min="0" max="60"
                               value=${settings.buffer_before_minutes}
                               onChange=${(e) => setSettings({...settings, buffer_before_minutes: parseInt(e.target.value)})} />
                    </div>
                    <div class="form-group">
                        <label>Buffer After (minutes)</label>
                        <input type="number" min="0" max="60"
                               value=${settings.buffer_after_minutes}
                               onChange=${(e) => setSettings({...settings, buffer_after_minutes: parseInt(e.target.value)})} />
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Minimum Notice (hours)</label>
                        <input type="number" min="1" max="168"
                               value=${settings.minimum_notice_hours}
                               onChange=${(e) => setSettings({...settings, minimum_notice_hours: parseInt(e.target.value)})} />
                    </div>
                    <div class="form-group">
                        <label>Max Advance Booking (days)</label>
                        <input type="number" min="7" max="365"
                               value=${settings.maximum_advance_days}
                               onChange=${(e) => setSettings({...settings, maximum_advance_days: parseInt(e.target.value)})} />
                    </div>
                </div>

                <div class="form-group">
                    <label>Default Video Call Link</label>
                    <input type="url"
                           value=${settings.video_link}
                           placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                           onChange=${(e) => setSettings({...settings, video_link: e.target.value})} />
                    <span class="form-hint">This link will be included in booking confirmations</span>
                </div>

                <div class="form-actions">
                    <button class="btn btn-primary" onClick=${handleSave} disabled=${saving}>
                        ${saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// CoachDashboard Component (Main)
// ============================================

function CoachDashboard({ coach, user }) {
    const [activeTab, setActiveTab] = useState('sessions');

    const tabs = [
        { id: 'sessions', label: 'Sessions', icon: 'calendar' },
        { id: 'availability', label: 'Availability', icon: 'clock' },
        { id: 'earnings', label: 'Earnings', icon: 'currency' },
        { id: 'payments', label: 'Payments', icon: 'card' },
        { id: 'settings', label: 'Settings', icon: 'settings' }
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'sessions':
                return html`<${UpcomingSessions} coachId=${coach.id} timezone=${coach.timezone || 'Europe/Amsterdam'} />`;
            case 'availability':
                return html`
                    <${AvailabilityEditor} coachId=${coach.id} />
                    <${BlockedDatesManager} coachId=${coach.id} />
                `;
            case 'earnings':
                return html`<${EarningsDashboard} coachId=${coach.id} />`;
            case 'payments':
                // Use the new comprehensive PayoutDashboard if available, otherwise fall back to StripeOnboarding
                const PayoutDashboard = window.PaymentComponents?.PayoutDashboard;
                if (PayoutDashboard) {
                    return html`
                        <${PayoutDashboard} coachId=${coach.id} coach=${coach} />
                        <${StripeOnboarding} coachId=${coach.id} />
                    `;
                }
                return html`<${StripeOnboarding} coachId=${coach.id} />`;
            case 'settings':
                return html`<${BookingSettings} coachId=${coach.id} />`;
            default:
                return null;
        }
    };

    return html`
        <div class="coach-dashboard">
            <div class="dashboard-header">
                <div class="welcome-section">
                    <h1>Welcome back, ${coach.display_name}</h1>
                    <p>Manage your coaching practice</p>
                </div>
            </div>

            <div class="dashboard-tabs">
                ${tabs.map(tab => html`
                    <button
                        class="dashboard-tab ${activeTab === tab.id ? 'active' : ''}"
                        onClick=${() => setActiveTab(tab.id)}
                    >
                        ${tab.label}
                    </button>
                `)}
            </div>

            <div class="dashboard-content">
                ${renderTabContent()}
            </div>
        </div>
    `;
}

// Export components
window.CoachDashboardComponents = {
    CoachDashboard,
    UpcomingSessions,
    AvailabilityEditor,
    BlockedDatesManager,
    EarningsDashboard,
    StripeOnboarding,
    BookingSettings,
    SessionCard
};
