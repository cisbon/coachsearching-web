/**
 * CoachSearching - Client Dashboard Components
 *
 * React components for client dashboard:
 * - ClientDashboard - Main dashboard layout
 * - ClientBookings - Client's booking list
 * - ClientPackages - Client's session packages
 * - BookingCard - Individual booking display
 * - PackageCard - Package display with booking option
 * - RescheduleModal - Reschedule a booking
 * - CancelModal - Cancel a booking
 */

const { html, useState, useEffect, useCallback } = window.HtmPreact;

const API_BASE = window.CONFIG?.API_URL || 'https://clouedo.com/coachsearching/api';

// ============================================
// Utility Functions
// ============================================

function formatDateTime(dateStr, timezone = 'Europe/Amsterdam') {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone
    }).format(date);
}

function formatDateShort(dateStr) {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
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

    if (diffDays > 1) return `in ${diffDays} days`;
    if (diffDays === 1) return 'tomorrow';
    if (diffHours > 0) return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    return 'starting soon';
}

function isUpcoming(dateStr) {
    return new Date(dateStr) > new Date();
}

// ============================================
// BookingCard Component
// ============================================

function BookingCard({ booking, onReschedule, onCancel, onRequestRefund }) {
    const [showActions, setShowActions] = useState(false);
    const upcoming = isUpcoming(booking.start_time);
    const canReschedule = upcoming && booking.status === 'confirmed' && (booking.reschedule_count || 0) < 2;
    const canCancel = upcoming && ['pending', 'confirmed'].includes(booking.status);
    const canRefund = booking.satisfaction_guarantee && booking.status === 'completed' && !booking.refund_requested;

    const statusConfig = {
        pending: { label: 'Pending', class: 'status-pending' },
        confirmed: { label: 'Confirmed', class: 'status-confirmed' },
        completed: { label: 'Completed', class: 'status-completed' },
        cancelled: { label: 'Cancelled', class: 'status-cancelled' },
        no_show: { label: 'No Show', class: 'status-noshow' }
    };

    const status = statusConfig[booking.status] || { label: booking.status, class: '' };

    return html`
        <div class="booking-card ${booking.status}">
            <div class="booking-main">
                <div class="booking-coach">
                    ${booking.coach?.image ? html`
                        <img src=${booking.coach.image} alt=${booking.coach.name} class="coach-avatar" />
                    ` : html`
                        <div class="coach-avatar placeholder">
                            ${booking.coach?.name?.charAt(0) || 'C'}
                        </div>
                    `}
                    <div class="coach-info">
                        <h4>${booking.coach?.name || 'Coach'}</h4>
                        <span class="session-type">
                            ${booking.session_type === 'discovery' ? 'Discovery Call' :
                              booking.session_type === 'package' ? 'Package Session' : 'Coaching Session'}
                        </span>
                    </div>
                </div>

                <div class="booking-datetime">
                    <div class="datetime-main">${formatDateTime(booking.start_time)}</div>
                    <div class="datetime-duration">${booking.duration_minutes} minutes</div>
                    ${upcoming && booking.status === 'confirmed' && html`
                        <span class="time-badge">${getTimeUntil(booking.start_time)}</span>
                    `}
                </div>

                <div class="booking-status-price">
                    <span class="status-badge ${status.class}">${status.label}</span>
                    ${booking.amount?.cents > 0 && html`
                        <span class="booking-price">${formatCurrency(booking.amount.cents, booking.amount.currency)}</span>
                    `}
                </div>

                <div class="booking-actions">
                    <button class="btn-icon" onClick=${() => setShowActions(!showActions)}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                        </svg>
                    </button>
                </div>
            </div>

            ${booking.satisfaction_guarantee && booking.status !== 'completed' && html`
                <div class="satisfaction-badge">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    Satisfaction Guarantee
                </div>
            `}

            ${showActions && html`
                <div class="booking-actions-menu">
                    ${booking.video_link && upcoming && booking.status === 'confirmed' && html`
                        <a href=${booking.video_link} target="_blank" rel="noopener" class="action-item primary">
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
                                <path d="M14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
                            </svg>
                            Join Video Call
                        </a>
                    `}

                    ${canReschedule && html`
                        <button class="action-item" onClick=${() => onReschedule(booking)}>
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"/>
                            </svg>
                            Reschedule
                            ${booking.reschedule_count > 0 && html`
                                <span class="reschedule-count">(${2 - booking.reschedule_count} left)</span>
                            `}
                        </button>
                    `}

                    ${canCancel && html`
                        <button class="action-item danger" onClick=${() => onCancel(booking)}>
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
                            </svg>
                            Cancel Booking
                        </button>
                    `}

                    ${canRefund && html`
                        <button class="action-item" onClick=${() => onRequestRefund(booking)}>
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            </svg>
                            Request Satisfaction Refund
                        </button>
                    `}

                    <a href=${`/coaches/${booking.coach_id}`} class="action-item">
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/>
                        </svg>
                        View Coach Profile
                    </a>
                </div>
            `}
        </div>
    `;
}

// ============================================
// ClientBookings Component
// ============================================

function ClientBookings({ clientId, clientEmail }) {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('upcoming');
    const [rescheduleBooking, setRescheduleBooking] = useState(null);
    const [cancelBooking, setCancelBooking] = useState(null);
    const [refundBooking, setRefundBooking] = useState(null);

    useEffect(() => {
        fetchBookings();
    }, [clientId, clientEmail, filter]);

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (clientId) params.append('client_id', clientId);
            if (clientEmail) params.append('client_email', clientEmail);
            params.append('status', filter);

            const response = await fetch(`${API_BASE}/bookings/client?${params}`);
            const data = await response.json();
            setBookings(data.bookings || []);
        } catch (error) {
            console.error('Error fetching bookings:', error);
        }
        setLoading(false);
    };

    const handleReschedule = (booking) => {
        setRescheduleBooking(booking);
    };

    const handleCancel = (booking) => {
        setCancelBooking(booking);
    };

    const handleRequestRefund = (booking) => {
        setRefundBooking(booking);
    };

    const upcomingCount = bookings.filter(b =>
        isUpcoming(b.start_time) && ['pending', 'confirmed'].includes(b.status)
    ).length;

    return html`
        <div class="client-bookings">
            <div class="section-header">
                <h3>My Bookings</h3>
                <div class="filter-tabs">
                    <button class="filter-tab ${filter === 'upcoming' ? 'active' : ''}"
                            onClick=${() => setFilter('upcoming')}>
                        Upcoming ${upcomingCount > 0 && html`<span class="count">${upcomingCount}</span>`}
                    </button>
                    <button class="filter-tab ${filter === 'completed' ? 'active' : ''}"
                            onClick=${() => setFilter('completed')}>
                        Past
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
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <h4>No ${filter} bookings</h4>
                    <p>
                        ${filter === 'upcoming'
                            ? 'Ready to start your coaching journey?'
                            : 'Your booking history will appear here'}
                    </p>
                    ${filter === 'upcoming' && html`
                        <a href="/discover" class="btn btn-primary">Find a Coach</a>
                    `}
                </div>
            ` : html`
                <div class="bookings-list">
                    ${bookings.map(booking => html`
                        <${BookingCard}
                            key=${booking.id}
                            booking=${booking}
                            onReschedule=${handleReschedule}
                            onCancel=${handleCancel}
                            onRequestRefund=${handleRequestRefund}
                        />
                    `)}
                </div>
            `}

            ${rescheduleBooking && html`
                <${RescheduleModal}
                    booking=${rescheduleBooking}
                    onClose=${() => setRescheduleBooking(null)}
                    onSuccess=${() => { setRescheduleBooking(null); fetchBookings(); }}
                />
            `}

            ${cancelBooking && html`
                <${CancelModal}
                    booking=${cancelBooking}
                    onClose=${() => setCancelBooking(null)}
                    onSuccess=${() => { setCancelBooking(null); fetchBookings(); }}
                />
            `}

            ${refundBooking && html`
                <${RefundModal}
                    booking=${refundBooking}
                    onClose=${() => setRefundBooking(null)}
                    onSuccess=${() => { setRefundBooking(null); fetchBookings(); }}
                />
            `}
        </div>
    `;
}

// ============================================
// PackageCard Component
// ============================================

function PackageCard({ pkg, onBookSession }) {
    const isExpired = pkg.expires_at && new Date(pkg.expires_at) < new Date();
    const isActive = pkg.status === 'active' && !isExpired && pkg.sessions_remaining > 0;

    return html`
        <div class="package-card ${isActive ? 'active' : 'inactive'}">
            <div class="package-header">
                <div class="coach-info">
                    ${pkg.coach?.image ? html`
                        <img src=${pkg.coach.image} alt=${pkg.coach.name} class="coach-avatar" />
                    ` : html`
                        <div class="coach-avatar placeholder">${pkg.coach?.name?.charAt(0) || 'C'}</div>
                    `}
                    <div>
                        <h4>${pkg.coach?.name || 'Coach'}</h4>
                        <span class="package-duration">${pkg.session_duration_minutes} min sessions</span>
                    </div>
                </div>
                <span class="package-status ${isActive ? 'active' : 'expired'}">
                    ${isActive ? 'Active' : isExpired ? 'Expired' : 'Used'}
                </span>
            </div>

            <div class="package-sessions">
                <div class="sessions-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${(pkg.sessions_used / pkg.total_sessions) * 100}%"></div>
                    </div>
                    <div class="sessions-count">
                        <span class="remaining">${pkg.sessions_remaining}</span>
                        <span class="total">/ ${pkg.total_sessions} sessions remaining</span>
                    </div>
                </div>
            </div>

            <div class="package-footer">
                <div class="package-meta">
                    <span class="package-price">${formatCurrency(pkg.amount_cents, pkg.currency)}</span>
                    ${pkg.expires_at && html`
                        <span class="package-expires">
                            ${isExpired ? 'Expired' : `Expires ${formatDateShort(pkg.expires_at)}`}
                        </span>
                    `}
                </div>
                ${isActive && html`
                    <button class="btn btn-primary btn-sm" onClick=${() => onBookSession(pkg)}>
                        Book Session
                    </button>
                `}
            </div>
        </div>
    `;
}

// ============================================
// ClientPackages Component
// ============================================

function ClientPackages({ clientId, clientEmail }) {
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [bookingPackage, setBookingPackage] = useState(null);

    useEffect(() => {
        fetchPackages();
    }, [clientId, clientEmail]);

    const fetchPackages = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (clientId) params.append('client_id', clientId);
            if (clientEmail) params.append('client_email', clientEmail);

            const response = await fetch(`${API_BASE}/packages/client?${params}`);
            const data = await response.json();
            setPackages(data.packages || []);
        } catch (error) {
            console.error('Error fetching packages:', error);
        }
        setLoading(false);
    };

    const handleBookSession = (pkg) => {
        setBookingPackage(pkg);
    };

    const activePackages = packages.filter(p =>
        p.status === 'active' && p.sessions_remaining > 0 &&
        (!p.expires_at || new Date(p.expires_at) > new Date())
    );

    const usedPackages = packages.filter(p => !activePackages.includes(p));

    return html`
        <div class="client-packages">
            <div class="section-header">
                <h3>Session Packages</h3>
            </div>

            ${loading ? html`
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                </div>
            ` : packages.length === 0 ? html`
                <div class="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                        <line x1="12" y1="22.08" x2="12" y2="12"/>
                    </svg>
                    <h4>No packages yet</h4>
                    <p>Purchase a session package to save on coaching sessions</p>
                    <a href="/discover" class="btn btn-primary">Find a Coach</a>
                </div>
            ` : html`
                ${activePackages.length > 0 && html`
                    <div class="packages-section">
                        <h4 class="section-subtitle">Active Packages</h4>
                        <div class="packages-grid">
                            ${activePackages.map(pkg => html`
                                <${PackageCard} key=${pkg.id} pkg=${pkg} onBookSession=${handleBookSession} />
                            `)}
                        </div>
                    </div>
                `}

                ${usedPackages.length > 0 && html`
                    <div class="packages-section">
                        <h4 class="section-subtitle">Past Packages</h4>
                        <div class="packages-grid">
                            ${usedPackages.map(pkg => html`
                                <${PackageCard} key=${pkg.id} pkg=${pkg} onBookSession=${handleBookSession} />
                            `)}
                        </div>
                    </div>
                `}
            `}

            ${bookingPackage && html`
                <${PackageBookingModal}
                    package=${bookingPackage}
                    onClose=${() => setBookingPackage(null)}
                    onSuccess=${() => { setBookingPackage(null); fetchPackages(); }}
                />
            `}
        </div>
    `;
}

// ============================================
// RescheduleModal Component
// ============================================

function RescheduleModal({ booking, onClose, onSuccess }) {
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleReschedule = async () => {
        if (!selectedSlot) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE}/bookings/${booking.id}/reschedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    new_start_time: selectedSlot.start_time,
                    rescheduled_by: 'client'
                })
            });

            const data = await response.json();
            if (data.success) {
                onSuccess();
            } else {
                setError(data.error || 'Failed to reschedule');
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        }

        setLoading(false);
    };

    // Use the AvailabilityCalendar and TimeSlotPicker from bookingFlow.js
    const { AvailabilityCalendar, TimeSlotPicker } = window.BookingComponents || {};

    return html`
        <div class="modal-overlay" onClick=${(e) => e.target === e.currentTarget && onClose()}>
            <div class="modal reschedule-modal">
                <button class="modal-close" onClick=${onClose}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>

                <div class="modal-header">
                    <h3>Reschedule Session</h3>
                    <p>Select a new date and time with ${booking.coach?.name}</p>
                </div>

                <div class="modal-content">
                    ${error && html`
                        <div class="error-banner">${error}</div>
                    `}

                    <div class="current-booking">
                        <strong>Current:</strong> ${formatDateTime(booking.start_time)}
                    </div>

                    ${AvailabilityCalendar && TimeSlotPicker ? html`
                        <div class="reschedule-picker">
                            <${AvailabilityCalendar}
                                coachId=${booking.coach_id}
                                onDateSelect=${setSelectedDate}
                                selectedDate=${selectedDate}
                            />
                            <${TimeSlotPicker}
                                coachId=${booking.coach_id}
                                selectedDate=${selectedDate}
                                duration=${booking.duration_minutes}
                                onSlotSelect=${setSelectedSlot}
                                selectedSlot=${selectedSlot}
                            />
                        </div>
                    ` : html`
                        <p>Loading calendar...</p>
                    `}
                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary" onClick=${onClose}>Cancel</button>
                    <button class="btn btn-primary" onClick=${handleReschedule}
                            disabled=${!selectedSlot || loading}>
                        ${loading ? 'Rescheduling...' : 'Confirm New Time'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// CancelModal Component
// ============================================

function CancelModal({ booking, onClose, onSuccess }) {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Calculate refund amount based on cancellation policy
    const startTime = new Date(booking.start_time);
    const now = new Date();
    const hoursUntil = (startTime - now) / (1000 * 60 * 60);

    let refundPercent = 0;
    let refundMessage = '';

    if (booking.session_type === 'discovery' || booking.amount?.cents === 0) {
        refundMessage = 'Free session - no refund needed';
    } else if (hoursUntil >= 24) {
        refundPercent = 100;
        refundMessage = 'Full refund (24+ hours notice)';
    } else if (hoursUntil >= 12) {
        refundPercent = 50;
        refundMessage = '50% refund (12-24 hours notice)';
    } else {
        refundPercent = 0;
        refundMessage = 'No refund (less than 12 hours notice)';
    }

    const handleCancel = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE}/bookings/${booking.id}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cancelled_by: 'client',
                    reason: reason
                })
            });

            const data = await response.json();
            if (data.success) {
                onSuccess();
            } else {
                setError(data.error || 'Failed to cancel booking');
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        }

        setLoading(false);
    };

    return html`
        <div class="modal-overlay" onClick=${(e) => e.target === e.currentTarget && onClose()}>
            <div class="modal cancel-modal">
                <button class="modal-close" onClick=${onClose}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>

                <div class="modal-header">
                    <h3>Cancel Booking</h3>
                </div>

                <div class="modal-content">
                    ${error && html`
                        <div class="error-banner">${error}</div>
                    `}

                    <div class="booking-summary">
                        <p><strong>Session with:</strong> ${booking.coach?.name}</p>
                        <p><strong>Date:</strong> ${formatDateTime(booking.start_time)}</p>
                    </div>

                    <div class="refund-info ${refundPercent === 100 ? 'full' : refundPercent > 0 ? 'partial' : 'none'}">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"/>
                        </svg>
                        <div>
                            <strong>${refundMessage}</strong>
                            ${refundPercent > 0 && booking.amount?.cents > 0 && html`
                                <p>Refund amount: ${formatCurrency(Math.round(booking.amount.cents * refundPercent / 100), booking.amount.currency)}</p>
                            `}
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Reason for cancellation (optional)</label>
                        <textarea
                            value=${reason}
                            onChange=${(e) => setReason(e.target.value)}
                            placeholder="Let the coach know why you're cancelling..."
                            rows="3"
                        ></textarea>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary" onClick=${onClose}>Keep Booking</button>
                    <button class="btn btn-danger" onClick=${handleCancel} disabled=${loading}>
                        ${loading ? 'Cancelling...' : 'Cancel Booking'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// RefundModal Component
// ============================================

function RefundModal({ booking, onClose, onSuccess }) {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleRefund = async () => {
        if (!reason.trim()) {
            setError('Please provide a reason for your refund request');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE}/stripe/refund/satisfaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    booking_id: booking.id,
                    reason: reason
                })
            });

            const data = await response.json();
            if (data.success) {
                onSuccess();
            } else {
                setError(data.error || 'Failed to process refund');
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        }

        setLoading(false);
    };

    return html`
        <div class="modal-overlay" onClick=${(e) => e.target === e.currentTarget && onClose()}>
            <div class="modal refund-modal">
                <button class="modal-close" onClick=${onClose}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>

                <div class="modal-header">
                    <h3>Satisfaction Guarantee Refund</h3>
                </div>

                <div class="modal-content">
                    ${error && html`
                        <div class="error-banner">${error}</div>
                    `}

                    <div class="guarantee-info">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            <path d="M9 12l2 2 4-4"/>
                        </svg>
                        <div>
                            <h4>Your First Session Guarantee</h4>
                            <p>We're sorry your first session didn't meet your expectations.
                            You're entitled to a full refund within 48 hours of the session.</p>
                        </div>
                    </div>

                    <div class="refund-amount">
                        <span>Refund Amount:</span>
                        <strong>${formatCurrency(booking.amount.cents, booking.amount.currency)}</strong>
                    </div>

                    <div class="form-group">
                        <label>Please tell us what wasn't right *</label>
                        <textarea
                            value=${reason}
                            onChange=${(e) => setReason(e.target.value)}
                            placeholder="Your feedback helps us improve our platform and coach quality..."
                            rows="4"
                            required
                        ></textarea>
                        <span class="form-hint">This feedback will help us improve but won't be shared with the coach</span>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary" onClick=${onClose}>Cancel</button>
                    <button class="btn btn-primary" onClick=${handleRefund} disabled=${loading || !reason.trim()}>
                        ${loading ? 'Processing...' : 'Request Refund'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// PackageBookingModal Component
// ============================================

function PackageBookingModal({ package: pkg, onClose, onSuccess }) {
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleBook = async () => {
        if (!selectedSlot) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE}/bookings/package-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    package_id: pkg.id,
                    start_time: selectedSlot.start_time,
                    notes: notes
                })
            });

            const data = await response.json();
            if (data.success) {
                onSuccess();
            } else {
                setError(data.error || 'Failed to book session');
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        }

        setLoading(false);
    };

    const { AvailabilityCalendar, TimeSlotPicker } = window.BookingComponents || {};

    return html`
        <div class="modal-overlay" onClick=${(e) => e.target === e.currentTarget && onClose()}>
            <div class="modal package-booking-modal">
                <button class="modal-close" onClick=${onClose}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>

                <div class="modal-header">
                    <h3>Book from Package</h3>
                    <p>Session with ${pkg.coach?.name} (${pkg.sessions_remaining} sessions remaining)</p>
                </div>

                <div class="modal-content">
                    ${error && html`
                        <div class="error-banner">${error}</div>
                    `}

                    ${AvailabilityCalendar && TimeSlotPicker ? html`
                        <div class="booking-picker">
                            <${AvailabilityCalendar}
                                coachId=${pkg.coach_id}
                                onDateSelect=${setSelectedDate}
                                selectedDate=${selectedDate}
                            />
                            <${TimeSlotPicker}
                                coachId=${pkg.coach_id}
                                selectedDate=${selectedDate}
                                duration=${pkg.session_duration_minutes}
                                onSlotSelect=${setSelectedSlot}
                                selectedSlot=${selectedSlot}
                            />
                        </div>
                    ` : html`
                        <p>Loading calendar...</p>
                    `}

                    <div class="form-group">
                        <label>Notes for the session (optional)</label>
                        <textarea
                            value=${notes}
                            onChange=${(e) => setNotes(e.target.value)}
                            placeholder="What would you like to discuss?"
                            rows="3"
                        ></textarea>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary" onClick=${onClose}>Cancel</button>
                    <button class="btn btn-primary" onClick=${handleBook}
                            disabled=${!selectedSlot || loading}>
                        ${loading ? 'Booking...' : 'Book Session'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// ClientDashboard Component (Main)
// ============================================

function ClientDashboard({ user }) {
    const [activeTab, setActiveTab] = useState('bookings');

    const tabs = [
        { id: 'bookings', label: 'My Bookings' },
        { id: 'packages', label: 'Packages' }
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'bookings':
                return html`<${ClientBookings} clientId=${user?.id} clientEmail=${user?.email} />`;
            case 'packages':
                return html`<${ClientPackages} clientId=${user?.id} clientEmail=${user?.email} />`;
            default:
                return null;
        }
    };

    return html`
        <div class="client-dashboard">
            <div class="dashboard-header">
                <div class="welcome-section">
                    <h1>Welcome${user?.name ? `, ${user.name}` : ''}</h1>
                    <p>Manage your coaching sessions</p>
                </div>
                <a href="/discover" class="btn btn-primary">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"/>
                    </svg>
                    Find a Coach
                </a>
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
window.ClientDashboardComponents = {
    ClientDashboard,
    ClientBookings,
    ClientPackages,
    BookingCard,
    PackageCard,
    RescheduleModal,
    CancelModal,
    RefundModal,
    PackageBookingModal
};
