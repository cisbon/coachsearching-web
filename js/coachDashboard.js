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
// CoachProfileEditor Component (LinkedIn-style)
// ============================================

function CoachProfileEditor({ coachId, coach: initialCoach }) {
    const [coach, setCoach] = useState(initialCoach || {});
    const [loading, setLoading] = useState(!initialCoach);
    const [saving, setSaving] = useState(false);
    const [editingSection, setEditingSection] = useState(null);
    const [credentials, setCredentials] = useState([]);
    const [services, setServices] = useState([]);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Temp state for editing
    const [editData, setEditData] = useState({});

    // Available specialties for suggestions
    const specialtySuggestions = [
        'Executive Coaching', 'Life Coaching', 'Career Coaching', 'Business Coaching',
        'Leadership Development', 'Health & Wellness', 'Mindfulness', 'Relationship Coaching',
        'Performance Coaching', 'Transition Coaching', 'Communication Skills', 'Stress Management',
        'Work-Life Balance', 'Team Coaching', 'Confidence Building', 'Goal Setting'
    ];

    const languageOptions = [
        { code: 'en', name: 'English', flag: '🇬🇧' },
        { code: 'de', name: 'German', flag: '🇩🇪' },
        { code: 'es', name: 'Spanish', flag: '🇪🇸' },
        { code: 'fr', name: 'French', flag: '🇫🇷' },
        { code: 'it', name: 'Italian', flag: '🇮🇹' },
        { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
        { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
        { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
        { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
        { code: 'ar', name: 'Arabic', flag: '🇸🇦' }
    ];

    // Load coach data
    useEffect(() => {
        if (initialCoach) {
            setCoach(initialCoach);
            setLoading(false);
        } else {
            loadCoachData();
        }
        loadCredentials();
        loadServices();
    }, [coachId]);

    const loadCoachData = async () => {
        try {
            const { data, error } = await window.supabaseClient
                .from('cs_coaches')
                .select('*')
                .eq('id', coachId)
                .single();
            if (error) throw error;
            setCoach(data);
        } catch (err) {
            console.error('Failed to load coach:', err);
            setMessage({ type: 'error', text: 'Failed to load profile data' });
        } finally {
            setLoading(false);
        }
    };

    const loadCredentials = async () => {
        try {
            const { data, error } = await window.supabaseClient
                .from('cs_coach_credentials')
                .select('*')
                .eq('coach_id', coachId)
                .order('issue_date', { ascending: false });
            if (!error && data) setCredentials(data);
        } catch (err) {
            console.error('Failed to load credentials:', err);
        }
    };

    const loadServices = async () => {
        try {
            const { data, error } = await window.supabaseClient
                .from('cs_coach_services')
                .select('*')
                .eq('coach_id', coachId)
                .eq('is_active', true)
                .order('sort_order', { ascending: true });
            if (!error && data) setServices(data);
        } catch (err) {
            console.error('Failed to load services:', err);
        }
    };

    const startEditing = (section, data = {}) => {
        setEditingSection(section);
        setEditData({ ...data });
    };

    const cancelEditing = () => {
        setEditingSection(null);
        setEditData({});
    };

    const saveSection = async (section, updates) => {
        setSaving(true);
        setMessage({ type: '', text: '' });
        try {
            const { error } = await window.supabaseClient
                .from('cs_coaches')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', coachId);
            if (error) throw error;
            setCoach(prev => ({ ...prev, ...updates }));
            setEditingSection(null);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (err) {
            console.error('Failed to save:', err);
            setMessage({ type: 'error', text: 'Failed to save changes' });
        } finally {
            setSaving(false);
        }
    };

    // Calculate profile completion
    const calculateCompletion = () => {
        const fields = [
            { name: 'avatar', check: coach.avatar_url },
            { name: 'title', check: coach.title },
            { name: 'bio', check: coach.bio && coach.bio.length > 50 },
            { name: 'specialties', check: coach.specialties && coach.specialties.length > 0 },
            { name: 'experience', check: coach.years_experience > 0 },
            { name: 'languages', check: coach.languages && coach.languages.length > 0 },
            { name: 'hourlyRate', check: coach.hourly_rate > 0 },
            { name: 'location', check: coach.location_city },
            { name: 'credentials', check: credentials.length > 0 },
            { name: 'services', check: services.length > 0 }
        ];
        const completed = fields.filter(f => f.check).length;
        return Math.round((completed / fields.length) * 100);
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setSaving(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${coachId}/avatar.${fileExt}`;

            const { error: uploadError } = await window.supabaseClient.storage
                .from('avatars')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = window.supabaseClient.storage
                .from('avatars')
                .getPublicUrl(fileName);

            await saveSection('avatar', { avatar_url: publicUrl });
        } catch (err) {
            console.error('Upload failed:', err);
            setMessage({ type: 'error', text: 'Failed to upload image' });
        } finally {
            setSaving(false);
        }
    };

    const handleBannerUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setSaving(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${coachId}/banner.${fileExt}`;

            const { error: uploadError } = await window.supabaseClient.storage
                .from('avatars')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = window.supabaseClient.storage
                .from('avatars')
                .getPublicUrl(fileName);

            await saveSection('banner', { banner_url: publicUrl });
        } catch (err) {
            console.error('Upload failed:', err);
            setMessage({ type: 'error', text: 'Failed to upload banner' });
        } finally {
            setSaving(false);
        }
    };

    // Credential management
    const saveCredential = async (credentialData) => {
        setSaving(true);
        try {
            if (credentialData.id) {
                const { error } = await window.supabaseClient
                    .from('cs_coach_credentials')
                    .update(credentialData)
                    .eq('id', credentialData.id);
                if (error) throw error;
            } else {
                const { error } = await window.supabaseClient
                    .from('cs_coach_credentials')
                    .insert({ ...credentialData, coach_id: coachId });
                if (error) throw error;
            }
            await loadCredentials();
            setEditingSection(null);
            setMessage({ type: 'success', text: 'Credential saved!' });
        } catch (err) {
            console.error('Failed to save credential:', err);
            setMessage({ type: 'error', text: 'Failed to save credential' });
        } finally {
            setSaving(false);
        }
    };

    const deleteCredential = async (id) => {
        if (!confirm('Delete this credential?')) return;
        try {
            const { error } = await window.supabaseClient
                .from('cs_coach_credentials')
                .delete()
                .eq('id', id);
            if (error) throw error;
            await loadCredentials();
            setMessage({ type: 'success', text: 'Credential removed' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to delete' });
        }
    };

    // Service management
    const saveService = async (serviceData) => {
        setSaving(true);
        try {
            if (serviceData.id) {
                const { error } = await window.supabaseClient
                    .from('cs_coach_services')
                    .update(serviceData)
                    .eq('id', serviceData.id);
                if (error) throw error;
            } else {
                const { error } = await window.supabaseClient
                    .from('cs_coach_services')
                    .insert({ ...serviceData, coach_id: coachId, is_active: true });
                if (error) throw error;
            }
            await loadServices();
            setEditingSection(null);
            setMessage({ type: 'success', text: 'Service saved!' });
        } catch (err) {
            console.error('Failed to save service:', err);
            setMessage({ type: 'error', text: 'Failed to save service' });
        } finally {
            setSaving(false);
        }
    };

    const deleteService = async (id) => {
        if (!confirm('Delete this service?')) return;
        try {
            const { error } = await window.supabaseClient
                .from('cs_coach_services')
                .update({ is_active: false })
                .eq('id', id);
            if (error) throw error;
            await loadServices();
            setMessage({ type: 'success', text: 'Service removed' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to delete' });
        }
    };

    if (loading) {
        return html`<div class="profile-editor-loading">Loading profile...</div>`;
    }

    const completion = calculateCompletion();

    return html`
        <div class="profile-editor linkedin-style">
            ${message.text && html`
                <div class="profile-message ${message.type}">${message.text}</div>
            `}

            <!-- Profile Completion Bar -->
            <div class="profile-completion-card">
                <div class="completion-header">
                    <span class="completion-title">Profile Strength</span>
                    <span class="completion-percent">${completion}%</span>
                </div>
                <div class="completion-bar">
                    <div class="completion-fill" style="width: ${completion}%"></div>
                </div>
                <p class="completion-hint">
                    ${completion < 50 ? 'Add more details to attract clients' :
                      completion < 80 ? 'Good progress! A few more sections to complete' :
                      completion < 100 ? 'Almost there! Complete your profile' :
                      'Excellent! Your profile is complete'}
                </p>
            </div>

            <!-- Header/Banner Section -->
            <div class="profile-header-section">
                <div class="banner-container" style="background-image: url('${coach.banner_url || ''}')">
                    <label class="banner-upload-btn">
                        <input type="file" accept="image/*" onChange=${handleBannerUpload} hidden />
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                            <circle cx="12" cy="13" r="4"/>
                        </svg>
                        ${saving ? 'Uploading...' : 'Edit Banner'}
                    </label>
                </div>

                <div class="profile-header-content">
                    <div class="avatar-container">
                        <img src=${coach.avatar_url || 'https://via.placeholder.com/150?text=Photo'}
                             alt=${coach.full_name} class="profile-avatar" />
                        <label class="avatar-upload-btn">
                            <input type="file" accept="image/*" onChange=${handleAvatarUpload} hidden />
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                                <circle cx="12" cy="13" r="4"/>
                            </svg>
                        </label>
                    </div>

                    <div class="profile-header-info">
                        ${editingSection === 'header' ? html`
                            <div class="edit-form">
                                <input type="text" class="edit-input large" placeholder="Full Name"
                                       value=${editData.full_name || coach.full_name || ''}
                                       onChange=${e => setEditData({...editData, full_name: e.target.value})} />
                                <input type="text" class="edit-input" placeholder="Professional Title (e.g., Executive Coach)"
                                       value=${editData.title || coach.title || ''}
                                       onChange=${e => setEditData({...editData, title: e.target.value})} />
                                <div class="edit-row">
                                    <input type="text" class="edit-input" placeholder="City"
                                           value=${editData.location_city || coach.location_city || ''}
                                           onChange=${e => setEditData({...editData, location_city: e.target.value})} />
                                    <input type="text" class="edit-input" placeholder="Country"
                                           value=${editData.location_country || coach.location_country || ''}
                                           onChange=${e => setEditData({...editData, location_country: e.target.value})} />
                                </div>
                                <div class="edit-row">
                                    <input type="number" class="edit-input" placeholder="Years of Experience" min="0"
                                           value=${editData.years_experience || coach.years_experience || ''}
                                           onChange=${e => setEditData({...editData, years_experience: parseInt(e.target.value)})} />
                                </div>
                                <div class="edit-actions">
                                    <button class="btn-save" onClick=${() => saveSection('header', editData)} disabled=${saving}>
                                        ${saving ? 'Saving...' : 'Save'}
                                    </button>
                                    <button class="btn-cancel" onClick=${cancelEditing}>Cancel</button>
                                </div>
                            </div>
                        ` : html`
                            <div class="header-display">
                                <h1 class="profile-name">${coach.full_name || 'Your Name'}</h1>
                                <p class="profile-title">${coach.title || 'Add your professional title'}</p>
                                <p class="profile-location">
                                    ${coach.location_city || coach.location_country
                                        ? `${coach.location_city || ''}${coach.location_city && coach.location_country ? ', ' : ''}${coach.location_country || ''}`
                                        : 'Add your location'}
                                </p>
                                ${coach.years_experience ? html`
                                    <p class="profile-experience">${coach.years_experience}+ years of experience</p>
                                ` : ''}
                                <button class="edit-btn" onClick=${() => startEditing('header', coach)}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                    </svg>
                                </button>
                            </div>
                        `}
                    </div>
                </div>
            </div>

            <!-- About Section -->
            <div class="profile-section">
                <div class="section-header">
                    <h2>About</h2>
                    ${editingSection !== 'about' && html`
                        <button class="edit-btn" onClick=${() => startEditing('about', { bio: coach.bio })}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                    `}
                </div>
                ${editingSection === 'about' ? html`
                    <div class="edit-form">
                        <textarea class="edit-textarea" rows="6" placeholder="Tell potential clients about yourself, your coaching philosophy, and what makes you unique..."
                                  value=${editData.bio || ''}
                                  onChange=${e => setEditData({...editData, bio: e.target.value})}></textarea>
                        <div class="char-count">${(editData.bio || '').length}/2000 characters</div>
                        <div class="edit-actions">
                            <button class="btn-save" onClick=${() => saveSection('about', { bio: editData.bio })} disabled=${saving}>
                                ${saving ? 'Saving...' : 'Save'}
                            </button>
                            <button class="btn-cancel" onClick=${cancelEditing}>Cancel</button>
                        </div>
                    </div>
                ` : html`
                    <p class="section-content ${!coach.bio ? 'placeholder' : ''}">
                        ${coach.bio || 'Add a summary about yourself and your coaching approach. This helps potential clients understand who you are and how you can help them.'}
                    </p>
                `}
            </div>

            <!-- Specialties Section -->
            <div class="profile-section">
                <div class="section-header">
                    <h2>Specialties</h2>
                    ${editingSection !== 'specialties' && html`
                        <button class="edit-btn" onClick=${() => startEditing('specialties', { specialties: coach.specialties || [] })}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                    `}
                </div>
                ${editingSection === 'specialties' ? html`
                    <div class="edit-form">
                        <div class="tags-editor">
                            <div class="selected-tags">
                                ${(editData.specialties || []).map((spec, i) => html`
                                    <span class="tag selected" key=${i}>
                                        ${spec}
                                        <button class="tag-remove" onClick=${() => {
                                            const newSpecs = editData.specialties.filter((_, idx) => idx !== i);
                                            setEditData({...editData, specialties: newSpecs});
                                        }}>×</button>
                                    </span>
                                `)}
                            </div>
                            <input type="text" class="tag-input" placeholder="Type and press Enter to add..."
                                   onKeyDown=${(e) => {
                                       if (e.key === 'Enter' && e.target.value.trim()) {
                                           e.preventDefault();
                                           const newSpec = e.target.value.trim();
                                           if (!editData.specialties?.includes(newSpec)) {
                                               setEditData({
                                                   ...editData,
                                                   specialties: [...(editData.specialties || []), newSpec]
                                               });
                                           }
                                           e.target.value = '';
                                       }
                                   }} />
                            <div class="tag-suggestions">
                                ${specialtySuggestions
                                    .filter(s => !(editData.specialties || []).includes(s))
                                    .slice(0, 8)
                                    .map(s => html`
                                        <button class="tag suggestion" key=${s}
                                                onClick=${() => setEditData({
                                                    ...editData,
                                                    specialties: [...(editData.specialties || []), s]
                                                })}>+ ${s}</button>
                                    `)}
                            </div>
                        </div>
                        <div class="edit-actions">
                            <button class="btn-save" onClick=${() => saveSection('specialties', { specialties: editData.specialties })} disabled=${saving}>
                                ${saving ? 'Saving...' : 'Save'}
                            </button>
                            <button class="btn-cancel" onClick=${cancelEditing}>Cancel</button>
                        </div>
                    </div>
                ` : html`
                    <div class="tags-display">
                        ${coach.specialties && coach.specialties.length > 0
                            ? coach.specialties.map(s => html`<span class="tag" key=${s}>${s}</span>`)
                            : html`<p class="placeholder">Add your coaching specialties to help clients find you</p>`
                        }
                    </div>
                `}
            </div>

            <!-- Languages Section -->
            <div class="profile-section">
                <div class="section-header">
                    <h2>Languages</h2>
                    ${editingSection !== 'languages' && html`
                        <button class="edit-btn" onClick=${() => startEditing('languages', { languages: coach.languages || [] })}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                    `}
                </div>
                ${editingSection === 'languages' ? html`
                    <div class="edit-form">
                        <div class="language-grid">
                            ${languageOptions.map(lang => html`
                                <label class="language-option ${(editData.languages || []).includes(lang.code) ? 'selected' : ''}" key=${lang.code}>
                                    <input type="checkbox"
                                           checked=${(editData.languages || []).includes(lang.code)}
                                           onChange=${(e) => {
                                               const langs = editData.languages || [];
                                               if (e.target.checked) {
                                                   setEditData({...editData, languages: [...langs, lang.code]});
                                               } else {
                                                   setEditData({...editData, languages: langs.filter(l => l !== lang.code)});
                                               }
                                           }} />
                                    <span class="lang-flag">${lang.flag}</span>
                                    <span class="lang-name">${lang.name}</span>
                                </label>
                            `)}
                        </div>
                        <div class="edit-actions">
                            <button class="btn-save" onClick=${() => saveSection('languages', { languages: editData.languages })} disabled=${saving}>
                                ${saving ? 'Saving...' : 'Save'}
                            </button>
                            <button class="btn-cancel" onClick=${cancelEditing}>Cancel</button>
                        </div>
                    </div>
                ` : html`
                    <div class="languages-display">
                        ${coach.languages && coach.languages.length > 0
                            ? coach.languages.map(code => {
                                const lang = languageOptions.find(l => l.code === code);
                                return lang ? html`<span class="language-badge" key=${code}>${lang.flag} ${lang.name}</span>` : '';
                            })
                            : html`<p class="placeholder">Add languages you offer coaching in</p>`
                        }
                    </div>
                `}
            </div>

            <!-- Session Formats & Pricing Section -->
            <div class="profile-section">
                <div class="section-header">
                    <h2>Session Formats & Pricing</h2>
                    ${editingSection !== 'formats' && html`
                        <button class="edit-btn" onClick=${() => startEditing('formats', {
                            offers_virtual: coach.offers_virtual !== false,
                            offers_onsite: coach.offers_onsite || false,
                            hourly_rate: coach.hourly_rate || '',
                            currency: coach.currency || 'EUR'
                        })}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                    `}
                </div>
                ${editingSection === 'formats' ? html`
                    <div class="edit-form">
                        <div class="format-options">
                            <label class="format-option ${editData.offers_virtual ? 'selected' : ''}">
                                <input type="checkbox" checked=${editData.offers_virtual}
                                       onChange=${e => setEditData({...editData, offers_virtual: e.target.checked})} />
                                <span class="format-icon">💻</span>
                                <span class="format-label">Video Call</span>
                            </label>
                            <label class="format-option ${editData.offers_onsite ? 'selected' : ''}">
                                <input type="checkbox" checked=${editData.offers_onsite}
                                       onChange=${e => setEditData({...editData, offers_onsite: e.target.checked})} />
                                <span class="format-icon">🤝</span>
                                <span class="format-label">In-Person</span>
                            </label>
                        </div>
                        <div class="pricing-editor">
                            <label>Hourly Rate</label>
                            <div class="price-input-group">
                                <select value=${editData.currency} onChange=${e => setEditData({...editData, currency: e.target.value})}>
                                    <option value="EUR">EUR €</option>
                                    <option value="USD">USD $</option>
                                    <option value="GBP">GBP £</option>
                                    <option value="CHF">CHF</option>
                                </select>
                                <input type="number" min="0" step="5" placeholder="150"
                                       value=${editData.hourly_rate}
                                       onChange=${e => setEditData({...editData, hourly_rate: parseInt(e.target.value)})} />
                            </div>
                        </div>
                        <div class="edit-actions">
                            <button class="btn-save" onClick=${() => saveSection('formats', editData)} disabled=${saving}>
                                ${saving ? 'Saving...' : 'Save'}
                            </button>
                            <button class="btn-cancel" onClick=${cancelEditing}>Cancel</button>
                        </div>
                    </div>
                ` : html`
                    <div class="formats-display">
                        <div class="format-badges">
                            ${coach.offers_virtual !== false && html`<span class="format-badge">💻 Video Call</span>`}
                            ${coach.offers_onsite && html`<span class="format-badge">🤝 In-Person</span>`}
                        </div>
                        ${coach.hourly_rate ? html`
                            <div class="rate-display">
                                <span class="rate-amount">${coach.currency === 'USD' ? '$' : coach.currency === 'GBP' ? '£' : coach.currency === 'CHF' ? 'CHF ' : '€'}${coach.hourly_rate}</span>
                                <span class="rate-period">/ hour</span>
                            </div>
                        ` : html`<p class="placeholder">Set your hourly rate</p>`}
                    </div>
                `}
            </div>

            <!-- Credentials Section -->
            <div class="profile-section">
                <div class="section-header">
                    <h2>Credentials & Certifications</h2>
                    <button class="add-btn" onClick=${() => startEditing('credential-new', {
                        credential_type: 'certification',
                        title: '',
                        issuing_organization: '',
                        issue_date: ''
                    })}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Add
                    </button>
                </div>
                ${editingSection?.startsWith('credential') ? html`
                    <div class="edit-form credential-form">
                        <div class="form-group">
                            <label>Type</label>
                            <select value=${editData.credential_type} onChange=${e => setEditData({...editData, credential_type: e.target.value})}>
                                <option value="certification">Certification</option>
                                <option value="degree">Degree</option>
                                <option value="accreditation">Accreditation</option>
                                <option value="training">Training</option>
                                <option value="award">Award</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Title</label>
                            <input type="text" placeholder="e.g., ICF Professional Certified Coach (PCC)"
                                   value=${editData.title}
                                   onChange=${e => setEditData({...editData, title: e.target.value})} />
                        </div>
                        <div class="form-group">
                            <label>Issuing Organization</label>
                            <input type="text" placeholder="e.g., International Coaching Federation"
                                   value=${editData.issuing_organization}
                                   onChange=${e => setEditData({...editData, issuing_organization: e.target.value})} />
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Issue Date</label>
                                <input type="date" value=${editData.issue_date}
                                       onChange=${e => setEditData({...editData, issue_date: e.target.value})} />
                            </div>
                            <div class="form-group">
                                <label>Expiry Date (optional)</label>
                                <input type="date" value=${editData.expiry_date || ''}
                                       onChange=${e => setEditData({...editData, expiry_date: e.target.value})} />
                            </div>
                        </div>
                        <div class="edit-actions">
                            <button class="btn-save" onClick=${() => saveCredential(editData)} disabled=${saving || !editData.title}>
                                ${saving ? 'Saving...' : 'Save Credential'}
                            </button>
                            <button class="btn-cancel" onClick=${cancelEditing}>Cancel</button>
                        </div>
                    </div>
                ` : html`
                    <div class="credentials-list">
                        ${credentials.length > 0 ? credentials.map(cred => html`
                            <div class="credential-card" key=${cred.id}>
                                <div class="credential-icon">
                                    ${cred.credential_type === 'certification' ? '🏅' :
                                      cred.credential_type === 'degree' ? '🎓' :
                                      cred.credential_type === 'accreditation' ? '✓' :
                                      cred.credential_type === 'award' ? '🏆' : '📜'}
                                </div>
                                <div class="credential-info">
                                    <h4>${cred.title}</h4>
                                    <p>${cred.issuing_organization}</p>
                                    ${cred.issue_date && html`<span class="credential-date">Issued ${new Date(cred.issue_date).getFullYear()}</span>`}
                                </div>
                                <div class="credential-actions">
                                    <button class="btn-icon" onClick=${() => startEditing('credential-edit', cred)}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                        </svg>
                                    </button>
                                    <button class="btn-icon danger" onClick=${() => deleteCredential(cred.id)}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        `) : html`<p class="placeholder">Add your certifications, degrees, and credentials to build trust with clients</p>`}
                    </div>
                `}
            </div>

            <!-- Services Section -->
            <div class="profile-section">
                <div class="section-header">
                    <h2>Services & Packages</h2>
                    <button class="add-btn" onClick=${() => startEditing('service-new', {
                        service_type: 'single_session',
                        name: '',
                        description: '',
                        duration_minutes: 60,
                        session_count: 1,
                        price: '',
                        currency: coach.currency || 'EUR'
                    })}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Add
                    </button>
                </div>
                ${editingSection?.startsWith('service') ? html`
                    <div class="edit-form service-form">
                        <div class="form-group">
                            <label>Service Type</label>
                            <select value=${editData.service_type} onChange=${e => setEditData({...editData, service_type: e.target.value})}>
                                <option value="discovery_call">Discovery Call (Free/Intro)</option>
                                <option value="single_session">Single Session</option>
                                <option value="package">Package (Multiple Sessions)</option>
                                <option value="subscription">Monthly Subscription</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Name</label>
                            <input type="text" placeholder="e.g., Leadership Coaching Session"
                                   value=${editData.name}
                                   onChange=${e => setEditData({...editData, name: e.target.value})} />
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <textarea rows="3" placeholder="Describe what's included..."
                                      value=${editData.description || ''}
                                      onChange=${e => setEditData({...editData, description: e.target.value})}></textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Duration (minutes)</label>
                                <select value=${editData.duration_minutes} onChange=${e => setEditData({...editData, duration_minutes: parseInt(e.target.value)})}>
                                    <option value="30">30 min</option>
                                    <option value="45">45 min</option>
                                    <option value="60">60 min</option>
                                    <option value="90">90 min</option>
                                    <option value="120">120 min</option>
                                </select>
                            </div>
                            ${editData.service_type === 'package' && html`
                                <div class="form-group">
                                    <label>Number of Sessions</label>
                                    <input type="number" min="2" max="20"
                                           value=${editData.session_count}
                                           onChange=${e => setEditData({...editData, session_count: parseInt(e.target.value)})} />
                                </div>
                            `}
                        </div>
                        <div class="form-group">
                            <label>Price</label>
                            <div class="price-input-group">
                                <select value=${editData.currency} onChange=${e => setEditData({...editData, currency: e.target.value})}>
                                    <option value="EUR">EUR €</option>
                                    <option value="USD">USD $</option>
                                    <option value="GBP">GBP £</option>
                                    <option value="CHF">CHF</option>
                                </select>
                                <input type="number" min="0" step="5"
                                       placeholder=${editData.service_type === 'discovery_call' ? '0 (Free)' : '150'}
                                       value=${editData.price}
                                       onChange=${e => setEditData({...editData, price: parseInt(e.target.value)})} />
                            </div>
                        </div>
                        <div class="edit-actions">
                            <button class="btn-save" onClick=${() => saveService(editData)} disabled=${saving || !editData.name}>
                                ${saving ? 'Saving...' : 'Save Service'}
                            </button>
                            <button class="btn-cancel" onClick=${cancelEditing}>Cancel</button>
                        </div>
                    </div>
                ` : html`
                    <div class="services-list">
                        ${services.length > 0 ? services.map(service => html`
                            <div class="service-card" key=${service.id}>
                                <div class="service-type-badge ${service.service_type}">
                                    ${service.service_type === 'discovery_call' ? 'Discovery' :
                                      service.service_type === 'package' ? 'Package' :
                                      service.service_type === 'subscription' ? 'Monthly' : 'Session'}
                                </div>
                                <div class="service-info">
                                    <h4>${service.name}</h4>
                                    <p>${service.description || ''}</p>
                                    <span class="service-duration">${service.duration_minutes} min${service.session_count > 1 ? ` × ${service.session_count} sessions` : ''}</span>
                                </div>
                                <div class="service-price">
                                    ${service.price === 0 ? 'Free' : html`
                                        <span class="price-amount">${service.currency === 'USD' ? '$' : service.currency === 'GBP' ? '£' : '€'}${service.price}</span>
                                    `}
                                </div>
                                <div class="service-actions">
                                    <button class="btn-icon" onClick=${() => startEditing('service-edit', service)}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                        </svg>
                                    </button>
                                    <button class="btn-icon danger" onClick=${() => deleteService(service.id)}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        `) : html`<p class="placeholder">Add services and packages to let clients book with you</p>`}
                    </div>
                `}
            </div>

            <!-- Links Section -->
            <div class="profile-section">
                <div class="section-header">
                    <h2>Links</h2>
                    ${editingSection !== 'links' && html`
                        <button class="edit-btn" onClick=${() => startEditing('links', {
                            website_url: coach.website_url || '',
                            linkedin_url: coach.linkedin_url || ''
                        })}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                    `}
                </div>
                ${editingSection === 'links' ? html`
                    <div class="edit-form">
                        <div class="form-group">
                            <label>Website</label>
                            <input type="url" placeholder="https://yourwebsite.com"
                                   value=${editData.website_url}
                                   onChange=${e => setEditData({...editData, website_url: e.target.value})} />
                        </div>
                        <div class="form-group">
                            <label>LinkedIn Profile</label>
                            <input type="url" placeholder="https://linkedin.com/in/yourprofile"
                                   value=${editData.linkedin_url}
                                   onChange=${e => setEditData({...editData, linkedin_url: e.target.value})} />
                        </div>
                        <div class="edit-actions">
                            <button class="btn-save" onClick=${() => saveSection('links', editData)} disabled=${saving}>
                                ${saving ? 'Saving...' : 'Save'}
                            </button>
                            <button class="btn-cancel" onClick=${cancelEditing}>Cancel</button>
                        </div>
                    </div>
                ` : html`
                    <div class="links-display">
                        ${coach.website_url && html`
                            <a href=${coach.website_url} target="_blank" class="link-item">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                                </svg>
                                Website
                            </a>
                        `}
                        ${coach.linkedin_url && html`
                            <a href=${coach.linkedin_url} target="_blank" class="link-item">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                </svg>
                                LinkedIn
                            </a>
                        `}
                        ${!coach.website_url && !coach.linkedin_url && html`
                            <p class="placeholder">Add your website and social links</p>
                        `}
                    </div>
                `}
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
        { id: 'profile', label: 'Profile', icon: 'user' },
        { id: 'sessions', label: 'Sessions', icon: 'calendar' },
        { id: 'availability', label: 'Availability', icon: 'clock' },
        { id: 'earnings', label: 'Earnings', icon: 'currency' },
        { id: 'payments', label: 'Payments', icon: 'card' },
        { id: 'settings', label: 'Settings', icon: 'settings' }
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'profile':
                return html`<${CoachProfileEditor} coachId=${coach.id} coach=${coach} />`;
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
    CoachProfileEditor,
    UpcomingSessions,
    AvailabilityEditor,
    BlockedDatesManager,
    EarningsDashboard,
    StripeOnboarding,
    BookingSettings,
    SessionCard
};
