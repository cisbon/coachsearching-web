/**
 * CoachSearching - Booking Flow Components
 *
 * React components for the booking flow:
 * - AvailabilityCalendar - Month/week view calendar
 * - TimeSlotPicker - Select available time slots
 * - DurationSelector - Choose session length
 * - BookingForm - Client information form
 * - BookingModal - Complete booking modal
 * - PaymentForm - Stripe payment integration
 * - BookingConfirmation - Success confirmation
 */

const { html, useState, useEffect, useCallback, useMemo } = window.HtmPreact;

// API base URL
const API_BASE = window.CONFIG?.API_URL || 'https://clouedo.com/coachsearching/api';

// ============================================
// Utility Functions
// ============================================

function formatDate(date, locale = 'en-GB') {
    return new Intl.DateTimeFormat(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
    }).format(date);
}

function formatTime(date, locale = 'en-GB') {
    return new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function formatCurrency(cents, currency = 'eur') {
    const amount = cents / 100;
    const symbols = { eur: '\u20AC', gbp: '\u00A3', usd: '$', chf: 'CHF ' };
    const symbol = symbols[currency.toLowerCase()] || '\u20AC';
    return symbol + amount.toFixed(2);
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

function getWeekDays(startDate) {
    const days = [];
    for (let i = 0; i < 7; i++) {
        days.push(addDays(startDate, i));
    }
    return days;
}

// ============================================
// AvailabilityCalendar Component
// ============================================

function AvailabilityCalendar({ coachId, onDateSelect, selectedDate, minDate = new Date() }) {
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const monday = addDays(today, -((dayOfWeek + 6) % 7)); // Get Monday
        return monday;
    });
    const [availableDates, setAvailableDates] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch available dates for the visible range
    useEffect(() => {
        async function fetchAvailability() {
            setLoading(true);
            try {
                const endDate = addDays(currentWeekStart, 28); // 4 weeks
                const response = await fetch(
                    `${API_BASE}/availability/slots?coach_id=${coachId}&from=${currentWeekStart.toISOString()}&to=${endDate.toISOString()}`
                );
                const data = await response.json();
                if (data.dates_with_slots) {
                    setAvailableDates(data.dates_with_slots.map(d => new Date(d)));
                }
            } catch (error) {
                console.error('Error fetching availability:', error);
            }
            setLoading(false);
        }
        fetchAvailability();
    }, [coachId, currentWeekStart]);

    const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart]);

    const goToPreviousWeek = () => {
        const newStart = addDays(currentWeekStart, -7);
        if (newStart >= minDate || isSameDay(addDays(newStart, 6), minDate)) {
            setCurrentWeekStart(newStart);
        }
    };

    const goToNextWeek = () => {
        setCurrentWeekStart(addDays(currentWeekStart, 7));
    };

    const isDateAvailable = (date) => {
        return availableDates.some(d => isSameDay(d, date));
    };

    const isPastDate = (date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    };

    return html`
        <div class="availability-calendar">
            <div class="calendar-header">
                <button class="calendar-nav" onClick=${goToPreviousWeek} disabled=${isPastDate(currentWeekStart)}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"/>
                    </svg>
                </button>
                <span class="calendar-month">
                    ${new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(currentWeekStart)}
                </span>
                <button class="calendar-nav" onClick=${goToNextWeek}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"/>
                    </svg>
                </button>
            </div>

            <div class="calendar-week-header">
                ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => html`
                    <div class="week-day-label">${day}</div>
                `)}
            </div>

            <div class="calendar-days">
                ${loading ? html`
                    <div class="calendar-loading">
                        <div class="loading-spinner"></div>
                    </div>
                ` : weekDays.map(date => {
                    const available = isDateAvailable(date);
                    const past = isPastDate(date);
                    const selected = selectedDate && isSameDay(date, selectedDate);

                    return html`
                        <button
                            class="calendar-day ${available ? 'available' : ''} ${past ? 'past' : ''} ${selected ? 'selected' : ''}"
                            onClick=${() => available && !past && onDateSelect(date)}
                            disabled=${!available || past}
                        >
                            <span class="day-number">${date.getDate()}</span>
                            ${available && !past && html`<span class="availability-dot"></span>`}
                        </button>
                    `;
                })}
            </div>

            <div class="calendar-legend">
                <span class="legend-item">
                    <span class="legend-dot available"></span>
                    ${window.t?.('booking.available') || 'Available'}
                </span>
                <span class="legend-item">
                    <span class="legend-dot unavailable"></span>
                    ${window.t?.('booking.unavailable') || 'Unavailable'}
                </span>
            </div>
        </div>
    `;
}

// ============================================
// TimeSlotPicker Component
// ============================================

function TimeSlotPicker({ coachId, selectedDate, duration, onSlotSelect, selectedSlot }) {
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!selectedDate || !duration) return;

        async function fetchSlots() {
            setLoading(true);
            try {
                const dateStr = selectedDate.toISOString().split('T')[0];
                const response = await fetch(
                    `${API_BASE}/availability/slots?coach_id=${coachId}&date=${dateStr}&duration=${duration}`
                );
                const data = await response.json();
                setSlots(data.slots || []);
            } catch (error) {
                console.error('Error fetching slots:', error);
                setSlots([]);
            }
            setLoading(false);
        }
        fetchSlots();
    }, [coachId, selectedDate, duration]);

    if (!selectedDate) {
        return html`
            <div class="time-slot-picker empty">
                <p>${window.t?.('booking.selectDate') || 'Select a date to see available times'}</p>
            </div>
        `;
    }

    if (loading) {
        return html`
            <div class="time-slot-picker loading">
                <div class="loading-spinner"></div>
            </div>
        `;
    }

    if (slots.length === 0) {
        return html`
            <div class="time-slot-picker empty">
                <p>${window.t?.('booking.noSlots') || 'No available times for this date'}</p>
            </div>
        `;
    }

    // Group slots by morning/afternoon/evening
    const groupedSlots = {
        morning: slots.filter(s => {
            const hour = new Date(s.start_time).getHours();
            return hour >= 6 && hour < 12;
        }),
        afternoon: slots.filter(s => {
            const hour = new Date(s.start_time).getHours();
            return hour >= 12 && hour < 17;
        }),
        evening: slots.filter(s => {
            const hour = new Date(s.start_time).getHours();
            return hour >= 17 && hour < 22;
        })
    };

    return html`
        <div class="time-slot-picker">
            <h4 class="slots-date">${formatDate(selectedDate)}</h4>

            ${Object.entries(groupedSlots).map(([period, periodSlots]) => periodSlots.length > 0 && html`
                <div class="slot-group">
                    <h5 class="slot-group-label">
                        ${period === 'morning' ? (window.t?.('booking.morning') || 'Morning') :
                          period === 'afternoon' ? (window.t?.('booking.afternoon') || 'Afternoon') :
                          (window.t?.('booking.evening') || 'Evening')}
                    </h5>
                    <div class="slot-grid">
                        ${periodSlots.map(slot => html`
                            <button
                                class="time-slot ${selectedSlot?.start_time === slot.start_time ? 'selected' : ''}"
                                onClick=${() => onSlotSelect(slot)}
                            >
                                ${formatTime(new Date(slot.start_time))}
                            </button>
                        `)}
                    </div>
                </div>
            `)}
        </div>
    `;
}

// ============================================
// DurationSelector Component
// ============================================

function DurationSelector({ hourlyRate, currency, onDurationSelect, selectedDuration, sessionType = 'paid' }) {
    const durations = sessionType === 'discovery'
        ? [{ minutes: 30, label: '30 min' }]
        : [
            { minutes: 60, label: '60 min' },
            { minutes: 90, label: '90 min' },
            { minutes: 120, label: '2 hours' }
        ];

    const calculatePrice = (minutes) => {
        if (sessionType === 'discovery') return 0;
        return Math.round((hourlyRate / 60) * minutes * 100);
    };

    return html`
        <div class="duration-selector">
            <label class="selector-label">${window.t?.('booking.selectDuration') || 'Select Session Length'}</label>
            <div class="duration-options">
                ${durations.map(({ minutes, label }) => {
                    const price = calculatePrice(minutes);
                    return html`
                        <button
                            class="duration-option ${selectedDuration === minutes ? 'selected' : ''}"
                            onClick=${() => onDurationSelect(minutes)}
                        >
                            <span class="duration-time">${label}</span>
                            <span class="duration-price">
                                ${sessionType === 'discovery'
                                    ? (window.t?.('booking.free') || 'Free')
                                    : formatCurrency(price, currency)}
                            </span>
                        </button>
                    `;
                })}
            </div>
        </div>
    `;
}

// ============================================
// BookingForm Component
// ============================================

function BookingForm({ onSubmit, initialData = {}, isFirstSession = false }) {
    const [formData, setFormData] = useState({
        client_name: initialData.name || '',
        client_email: initialData.email || '',
        notes: '',
        client_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
    const [errors, setErrors] = useState({});

    const validateForm = () => {
        const newErrors = {};
        if (!formData.client_name.trim()) {
            newErrors.client_name = window.t?.('booking.nameRequired') || 'Name is required';
        }
        if (!formData.client_email.trim()) {
            newErrors.client_email = window.t?.('booking.emailRequired') || 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.client_email)) {
            newErrors.client_email = window.t?.('booking.invalidEmail') || 'Invalid email address';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateForm()) {
            onSubmit(formData);
        }
    };

    return html`
        <form class="booking-form" onSubmit=${handleSubmit}>
            <div class="form-group">
                <label for="client_name">${window.t?.('booking.yourName') || 'Your Name'} *</label>
                <input
                    type="text"
                    id="client_name"
                    value=${formData.client_name}
                    onChange=${(e) => setFormData({...formData, client_name: e.target.value})}
                    placeholder=${window.t?.('booking.namePlaceholder') || 'Enter your full name'}
                    class=${errors.client_name ? 'error' : ''}
                />
                ${errors.client_name && html`<span class="error-message">${errors.client_name}</span>`}
            </div>

            <div class="form-group">
                <label for="client_email">${window.t?.('booking.yourEmail') || 'Your Email'} *</label>
                <input
                    type="email"
                    id="client_email"
                    value=${formData.client_email}
                    onChange=${(e) => setFormData({...formData, client_email: e.target.value})}
                    placeholder=${window.t?.('booking.emailPlaceholder') || 'your@email.com'}
                    class=${errors.client_email ? 'error' : ''}
                />
                ${errors.client_email && html`<span class="error-message">${errors.client_email}</span>`}
            </div>

            <div class="form-group">
                <label for="notes">${window.t?.('booking.notes') || 'Notes for the Coach'}</label>
                <textarea
                    id="notes"
                    value=${formData.notes}
                    onChange=${(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder=${window.t?.('booking.notesPlaceholder') || 'What would you like to discuss? (optional)'}
                    rows="3"
                ></textarea>
            </div>

            ${isFirstSession && html`
                <div class="satisfaction-guarantee">
                    <div class="guarantee-badge">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            <path d="M9 12l2 2 4-4"/>
                        </svg>
                    </div>
                    <div class="guarantee-text">
                        <strong>${window.t?.('booking.satisfactionGuarantee') || 'Satisfaction Guarantee'}</strong>
                        <p>${window.t?.('booking.guaranteeText') || "Not satisfied after your first session? Get a full refund within 48 hours."}</p>
                    </div>
                </div>
            `}

            <button type="submit" class="btn btn-primary btn-lg">
                ${window.t?.('booking.continue') || 'Continue to Payment'}
            </button>
        </form>
    `;
}

// ============================================
// PaymentForm Component (Stripe Elements)
// ============================================

function PaymentForm({ clientSecret, amount, currency, onSuccess, onError }) {
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [cardElement, setCardElement] = useState(null);
    const [stripe, setStripe] = useState(null);

    useEffect(() => {
        // Initialize Stripe
        if (window.Stripe && window.CONFIG?.STRIPE_PUBLIC_KEY) {
            const stripeInstance = window.Stripe(window.CONFIG.STRIPE_PUBLIC_KEY);
            setStripe(stripeInstance);

            const elements = stripeInstance.elements({
                clientSecret,
                appearance: {
                    theme: 'stripe',
                    variables: {
                        colorPrimary: '#006266',
                        colorBackground: '#ffffff',
                        colorText: '#1a1a2e',
                        fontFamily: 'DM Sans, system-ui, sans-serif'
                    }
                }
            });

            const card = elements.create('payment');
            card.mount('#card-element');
            setCardElement(card);

            return () => card.destroy();
        }
    }, [clientSecret]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!stripe || !cardElement) return;

        setProcessing(true);
        setError(null);

        try {
            const { error: submitError, paymentIntent } = await stripe.confirmPayment({
                elements: cardElement._elements,
                confirmParams: {
                    return_url: window.location.origin + '/booking/confirmation'
                },
                redirect: 'if_required'
            });

            if (submitError) {
                setError(submitError.message);
                onError?.(submitError);
            } else if (paymentIntent.status === 'succeeded') {
                onSuccess(paymentIntent);
            }
        } catch (err) {
            setError(err.message);
            onError?.(err);
        }

        setProcessing(false);
    };

    return html`
        <form class="payment-form" onSubmit=${handleSubmit}>
            <div class="payment-summary">
                <span class="payment-label">${window.t?.('booking.total') || 'Total'}</span>
                <span class="payment-amount">${formatCurrency(amount, currency)}</span>
            </div>

            <div class="form-group">
                <label>${window.t?.('booking.paymentMethod') || 'Payment Method'}</label>
                <div id="card-element" class="stripe-element"></div>
            </div>

            ${error && html`
                <div class="payment-error">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"/>
                    </svg>
                    ${error}
                </div>
            `}

            <button type="submit" class="btn btn-primary btn-lg" disabled=${processing || !stripe}>
                ${processing ? html`
                    <span class="loading-spinner small"></span>
                    ${window.t?.('booking.processing') || 'Processing...'}
                ` : html`
                    ${window.t?.('booking.payNow') || 'Pay Now'}
                `}
            </button>

            <div class="payment-security">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"/>
                </svg>
                ${window.t?.('booking.securePayment') || 'Secure payment powered by Stripe'}
            </div>
        </form>
    `;
}

// ============================================
// BookingConfirmation Component
// ============================================

function BookingConfirmation({ booking, coach }) {
    const startTime = new Date(booking.start_time);

    return html`
        <div class="booking-confirmation">
            <div class="confirmation-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M9 12l2 2 4-4"/>
                </svg>
            </div>

            <h2>${window.t?.('booking.confirmed') || 'Booking Confirmed!'}</h2>
            <p class="confirmation-message">
                ${window.t?.('booking.confirmationSent') || 'A confirmation email has been sent to'} <strong>${booking.client_email}</strong>
            </p>

            <div class="booking-details-card">
                <div class="coach-info">
                    ${coach.profile_image_url && html`
                        <img src=${coach.profile_image_url} alt=${coach.display_name} class="coach-avatar" />
                    `}
                    <div>
                        <h4>${coach.display_name}</h4>
                        <span class="session-type">
                            ${booking.session_type === 'discovery'
                                ? (window.t?.('booking.discoveryCall') || 'Discovery Call')
                                : (window.t?.('booking.coachingSession') || 'Coaching Session')}
                        </span>
                    </div>
                </div>

                <div class="booking-meta">
                    <div class="meta-item">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"/>
                        </svg>
                        <span>${formatDate(startTime)}</span>
                    </div>
                    <div class="meta-item">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"/>
                        </svg>
                        <span>${formatTime(startTime)} (${booking.duration_minutes} min)</span>
                    </div>
                    ${booking.video_link && html`
                        <div class="meta-item">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
                            </svg>
                            <a href=${booking.video_link} target="_blank" rel="noopener">
                                ${window.t?.('booking.joinVideoCall') || 'Join Video Call'}
                            </a>
                        </div>
                    `}
                </div>
            </div>

            <div class="confirmation-actions">
                <button class="btn btn-secondary" onClick=${() => {
                    // Add to calendar logic
                    const event = {
                        title: `Coaching with ${coach.display_name}`,
                        start: startTime.toISOString(),
                        end: new Date(startTime.getTime() + booking.duration_minutes * 60000).toISOString(),
                        url: booking.video_link
                    };
                    // Generate Google Calendar URL
                    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${event.start.replace(/[-:]/g, '').split('.')[0]}Z/${event.end.replace(/[-:]/g, '').split('.')[0]}Z`;
                    window.open(gcalUrl, '_blank');
                }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"/>
                    </svg>
                    ${window.t?.('booking.addToCalendar') || 'Add to Calendar'}
                </button>
                <a href="/dashboard/bookings" class="btn btn-primary">
                    ${window.t?.('booking.viewBookings') || 'View My Bookings'}
                </a>
            </div>
        </div>
    `;
}

// ============================================
// BookingModal Component (Main Booking Flow)
// ============================================

function BookingModal({ coach, isOpen, onClose, sessionType = 'paid', user = null }) {
    const [step, setStep] = useState(1);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedDuration, setSelectedDuration] = useState(sessionType === 'discovery' ? 30 : 60);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [clientInfo, setClientInfo] = useState(null);
    const [bookingIntent, setBookingIntent] = useState(null);
    const [confirmedBooking, setConfirmedBooking] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Check if this is the user's first session with this coach
    const [isFirstSession, setIsFirstSession] = useState(true);

    useEffect(() => {
        if (user && coach) {
            // Check booking history
            fetch(`${API_BASE}/bookings/client?client_id=${user.id}&coach_id=${coach.id}`)
                .then(res => res.json())
                .then(data => {
                    setIsFirstSession(!data.bookings || data.bookings.length === 0);
                })
                .catch(() => setIsFirstSession(true));
        }
    }, [user, coach]);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setSelectedDate(null);
            setSelectedSlot(null);
            setClientInfo(null);
            setBookingIntent(null);
            setConfirmedBooking(null);
            setError(null);
        }
    }, [isOpen]);

    const handleDateSelect = (date) => {
        setSelectedDate(date);
        setSelectedSlot(null);
    };

    const handleSlotSelect = (slot) => {
        setSelectedSlot(slot);
    };

    const handleClientInfoSubmit = async (data) => {
        setClientInfo(data);
        setLoading(true);
        setError(null);

        try {
            if (sessionType === 'discovery') {
                // Book discovery call directly (no payment)
                const response = await fetch(`${API_BASE}/bookings/discovery-call`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        coach_id: coach.id,
                        start_time: selectedSlot.start_time,
                        client_id: user?.id,
                        client_name: data.client_name,
                        client_email: data.client_email,
                        client_timezone: data.client_timezone,
                        notes: data.notes
                    })
                });

                const result = await response.json();
                if (result.success) {
                    setConfirmedBooking(result.booking);
                    setStep(4); // Skip to confirmation
                } else {
                    setError(result.error || 'Failed to book discovery call');
                }
            } else {
                // Create booking intent for paid session
                const response = await fetch(`${API_BASE}/bookings/create-intent`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        coach_id: coach.id,
                        start_time: selectedSlot.start_time,
                        duration_minutes: selectedDuration,
                        client_id: user?.id,
                        client_name: data.client_name,
                        client_email: data.client_email,
                        client_timezone: data.client_timezone,
                        notes: data.notes,
                        is_first_session: isFirstSession
                    })
                });

                const result = await response.json();
                if (result.success) {
                    setBookingIntent(result);
                    setStep(3); // Go to payment
                } else {
                    setError(result.error || 'Failed to create booking');
                }
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        }

        setLoading(false);
    };

    const handlePaymentSuccess = async (paymentIntent) => {
        setLoading(true);

        try {
            // Confirm the booking
            const response = await fetch(`${API_BASE}/bookings/${bookingIntent.booking_id}/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    payment_intent_id: paymentIntent.id
                })
            });

            const result = await response.json();
            if (result.success) {
                setConfirmedBooking(result.booking);
                setStep(4);
            } else {
                setError(result.error || 'Failed to confirm booking');
            }
        } catch (err) {
            setError('Failed to confirm booking');
        }

        setLoading(false);
    };

    if (!isOpen) return null;

    const steps = [
        { num: 1, label: window.t?.('booking.stepDate') || 'Date & Time' },
        { num: 2, label: window.t?.('booking.stepDetails') || 'Your Details' },
        ...(sessionType !== 'discovery' ? [{ num: 3, label: window.t?.('booking.stepPayment') || 'Payment' }] : []),
        { num: sessionType === 'discovery' ? 3 : 4, label: window.t?.('booking.stepConfirm') || 'Confirmation' }
    ];

    return html`
        <div class="modal-overlay" onClick=${(e) => e.target === e.currentTarget && onClose()}>
            <div class="booking-modal">
                <button class="modal-close" onClick=${onClose}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>

                <div class="modal-header">
                    <h2>
                        ${sessionType === 'discovery'
                            ? (window.t?.('booking.bookDiscovery') || 'Book a Discovery Call')
                            : (window.t?.('booking.bookSession') || 'Book a Session')}
                    </h2>
                    <div class="coach-preview">
                        ${coach.profile_image_url && html`
                            <img src=${coach.profile_image_url} alt=${coach.display_name} />
                        `}
                        <span>${window.t?.('booking.with') || 'with'} ${coach.display_name}</span>
                    </div>
                </div>

                ${step < (sessionType === 'discovery' ? 3 : 4) && html`
                    <div class="booking-steps">
                        ${steps.filter(s => s.num <= (sessionType === 'discovery' ? 3 : 4)).map(s => html`
                            <div class="step ${step === s.num ? 'active' : ''} ${step > s.num ? 'completed' : ''}">
                                <span class="step-number">${s.num}</span>
                                <span class="step-label">${s.label}</span>
                            </div>
                        `)}
                    </div>
                `}

                <div class="modal-content">
                    ${error && html`
                        <div class="booking-error">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"/>
                            </svg>
                            ${error}
                        </div>
                    `}

                    ${step === 1 && html`
                        <div class="booking-step-content">
                            ${sessionType !== 'discovery' && html`
                                <${DurationSelector}
                                    hourlyRate=${coach.hourly_rate}
                                    currency=${coach.currency || 'eur'}
                                    onDurationSelect=${setSelectedDuration}
                                    selectedDuration=${selectedDuration}
                                    sessionType=${sessionType}
                                />
                            `}

                            <div class="date-time-picker">
                                <div class="calendar-section">
                                    <${AvailabilityCalendar}
                                        coachId=${coach.id}
                                        onDateSelect=${handleDateSelect}
                                        selectedDate=${selectedDate}
                                    />
                                </div>
                                <div class="slots-section">
                                    <${TimeSlotPicker}
                                        coachId=${coach.id}
                                        selectedDate=${selectedDate}
                                        duration=${selectedDuration}
                                        onSlotSelect=${handleSlotSelect}
                                        selectedSlot=${selectedSlot}
                                    />
                                </div>
                            </div>

                            <button
                                class="btn btn-primary btn-lg"
                                disabled=${!selectedSlot}
                                onClick=${() => setStep(2)}
                            >
                                ${window.t?.('booking.continue') || 'Continue'}
                            </button>
                        </div>
                    `}

                    ${step === 2 && html`
                        <div class="booking-step-content">
                            <div class="selected-summary">
                                <div class="summary-item">
                                    <strong>${formatDate(selectedDate)}</strong>
                                    <span>${formatTime(new Date(selectedSlot.start_time))} - ${selectedDuration} min</span>
                                </div>
                                ${sessionType !== 'discovery' && html`
                                    <div class="summary-price">
                                        ${formatCurrency(Math.round((coach.hourly_rate / 60) * selectedDuration * 100), coach.currency || 'eur')}
                                    </div>
                                `}
                            </div>

                            <${BookingForm}
                                onSubmit=${handleClientInfoSubmit}
                                initialData=${{ name: user?.name, email: user?.email }}
                                isFirstSession=${isFirstSession && sessionType !== 'discovery'}
                            />

                            ${loading && html`
                                <div class="loading-overlay">
                                    <div class="loading-spinner"></div>
                                </div>
                            `}
                        </div>
                    `}

                    ${step === 3 && sessionType !== 'discovery' && html`
                        <div class="booking-step-content">
                            <${PaymentForm}
                                clientSecret=${bookingIntent.client_secret}
                                amount=${bookingIntent.amount.total_cents}
                                currency=${bookingIntent.amount.currency}
                                onSuccess=${handlePaymentSuccess}
                                onError=${(err) => setError(err.message)}
                            />

                            ${loading && html`
                                <div class="loading-overlay">
                                    <div class="loading-spinner"></div>
                                </div>
                            `}
                        </div>
                    `}

                    ${((step === 4 && sessionType !== 'discovery') || (step === 3 && sessionType === 'discovery')) && confirmedBooking && html`
                        <${BookingConfirmation}
                            booking=${confirmedBooking}
                            coach=${coach}
                        />
                    `}
                </div>
            </div>
        </div>
    `;
}

// ============================================
// Package Purchase Modal
// ============================================

function PackagePurchaseModal({ coach, isOpen, onClose, user = null }) {
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [selectedDuration, setSelectedDuration] = useState(60);
    const [step, setStep] = useState(1);
    const [clientInfo, setClientInfo] = useState(null);
    const [paymentIntent, setPaymentIntent] = useState(null);
    const [confirmedPackage, setConfirmedPackage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const packages = [
        { sessions: 4, discount: 5 },
        { sessions: 6, discount: 10 },
        { sessions: 8, discount: 12 },
        { sessions: 10, discount: 15 },
        { sessions: 12, discount: 18 }
    ];

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setSelectedPackage(null);
            setClientInfo(null);
            setPaymentIntent(null);
            setConfirmedPackage(null);
            setError(null);
        }
    }, [isOpen]);

    const calculatePackagePrice = (sessions, duration) => {
        const perSession = (coach.hourly_rate / 60) * duration;
        const discount = packages.find(p => p.sessions === sessions)?.discount || 0;
        const discountedPerSession = perSession * (1 - discount / 100);
        return {
            original: Math.round(perSession * sessions * 100),
            discounted: Math.round(discountedPerSession * sessions * 100),
            perSession: Math.round(discountedPerSession * 100),
            savings: Math.round((perSession - discountedPerSession) * sessions * 100)
        };
    };

    const handlePackageSelect = (pkg) => {
        setSelectedPackage(pkg);
    };

    const handleClientInfoSubmit = async (data) => {
        setClientInfo(data);
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE}/stripe/packages/create-intent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    coach_id: coach.id,
                    total_sessions: selectedPackage,
                    session_duration_minutes: selectedDuration,
                    client_id: user?.id,
                    client_name: data.client_name,
                    client_email: data.client_email,
                    client_timezone: data.client_timezone
                })
            });

            const result = await response.json();
            if (result.success) {
                setPaymentIntent(result);
                setStep(3);
            } else {
                setError(result.error || 'Failed to create package');
            }
        } catch (err) {
            setError('Connection error');
        }

        setLoading(false);
    };

    const handlePaymentSuccess = async (intent) => {
        setConfirmedPackage({
            sessions: selectedPackage,
            duration: selectedDuration,
            expires_at: paymentIntent.package.expires_at
        });
        setStep(4);
    };

    if (!isOpen) return null;

    return html`
        <div class="modal-overlay" onClick=${(e) => e.target === e.currentTarget && onClose()}>
            <div class="booking-modal package-modal">
                <button class="modal-close" onClick=${onClose}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>

                <div class="modal-header">
                    <h2>${window.t?.('booking.buyPackage') || 'Buy a Session Package'}</h2>
                    <p class="package-subtitle">${window.t?.('booking.packageSavings') || 'Save up to 18% with package deals'}</p>
                </div>

                <div class="modal-content">
                    ${error && html`
                        <div class="booking-error">${error}</div>
                    `}

                    ${step === 1 && html`
                        <div class="package-selection">
                            <${DurationSelector}
                                hourlyRate=${coach.hourly_rate}
                                currency=${coach.currency || 'eur'}
                                onDurationSelect=${setSelectedDuration}
                                selectedDuration=${selectedDuration}
                            />

                            <h4>${window.t?.('booking.selectPackage') || 'Select Package Size'}</h4>
                            <div class="package-options">
                                ${packages.map(pkg => {
                                    const prices = calculatePackagePrice(pkg.sessions, selectedDuration);
                                    return html`
                                        <button
                                            class="package-option ${selectedPackage === pkg.sessions ? 'selected' : ''}"
                                            onClick=${() => handlePackageSelect(pkg.sessions)}
                                        >
                                            <div class="package-sessions">${pkg.sessions} ${window.t?.('booking.sessions') || 'sessions'}</div>
                                            <div class="package-discount">${pkg.discount}% ${window.t?.('booking.off') || 'off'}</div>
                                            <div class="package-price">${formatCurrency(prices.discounted, coach.currency || 'eur')}</div>
                                            <div class="package-savings">
                                                ${window.t?.('booking.save') || 'Save'} ${formatCurrency(prices.savings, coach.currency || 'eur')}
                                            </div>
                                        </button>
                                    `;
                                })}
                            </div>

                            <button
                                class="btn btn-primary btn-lg"
                                disabled=${!selectedPackage}
                                onClick=${() => setStep(2)}
                            >
                                ${window.t?.('booking.continue') || 'Continue'}
                            </button>
                        </div>
                    `}

                    ${step === 2 && html`
                        <div class="booking-step-content">
                            <div class="package-summary">
                                <div>${selectedPackage} sessions x ${selectedDuration} min</div>
                                <div class="summary-price">
                                    ${formatCurrency(calculatePackagePrice(selectedPackage, selectedDuration).discounted, coach.currency || 'eur')}
                                </div>
                            </div>

                            <${BookingForm}
                                onSubmit=${handleClientInfoSubmit}
                                initialData=${{ name: user?.name, email: user?.email }}
                            />

                            ${loading && html`<div class="loading-overlay"><div class="loading-spinner"></div></div>`}
                        </div>
                    `}

                    ${step === 3 && html`
                        <div class="booking-step-content">
                            <${PaymentForm}
                                clientSecret=${paymentIntent.client_secret}
                                amount=${paymentIntent.amount.total_cents}
                                currency=${paymentIntent.amount.currency}
                                onSuccess=${handlePaymentSuccess}
                                onError=${(err) => setError(err.message)}
                            />
                        </div>
                    `}

                    ${step === 4 && html`
                        <div class="package-confirmation">
                            <div class="confirmation-icon">
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <path d="M9 12l2 2 4-4"/>
                                </svg>
                            </div>
                            <h2>${window.t?.('booking.packagePurchased') || 'Package Purchased!'}</h2>
                            <p>${confirmedPackage.sessions} sessions ready to book</p>
                            <p class="expires-note">
                                ${window.t?.('booking.expiresOn') || 'Expires on'} ${new Date(confirmedPackage.expires_at).toLocaleDateString()}
                            </p>
                            <a href="/dashboard/packages" class="btn btn-primary">
                                ${window.t?.('booking.bookFirstSession') || 'Book Your First Session'}
                            </a>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
}

// Export components
window.BookingComponents = {
    AvailabilityCalendar,
    TimeSlotPicker,
    DurationSelector,
    BookingForm,
    PaymentForm,
    BookingConfirmation,
    BookingModal,
    PackagePurchaseModal
};
