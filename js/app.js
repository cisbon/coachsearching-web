// js/app.js - Complete Production Application
console.log('App.js: Loading...');

// UMD Globals
const React = window.React;
const ReactDOM = window.ReactDOM;
const { useState, useEffect, useRef, useCallback } = React;
const { createClient } = window.supabase;

import htm from './vendor/htm.js';
import { initLanguage, t, setLanguage, getCurrentLang } from './i18n.js';
import { initDebugConsole } from './debugConsole.js';
import { SessionNotesWizard, SessionNotesDashboard } from './sessionNotes.js';
import { ReferralDashboard, ReferralWidget } from './referrals.js';
import { PromoCodeWidget, PromoCodeBanner, PromoCodeManager } from './promoCode.js';

// SEO Content Pages
import { FAQPage } from './pages/FAQPage.js';
import { CategoryPage, CategoriesIndexPage, COACHING_CATEGORIES } from './pages/CategoryPage.js';
import { CoachProfilePage } from './pages/CoachProfilePage.js';
import { PricingPage } from './pages/PricingPage.js';
import { Hero, CoachingCategoriesSection, HowItWorksSection, TrustBadgesSection } from './pages/HomePage.js';

// Conversion Optimization Components
import {
    TestimonialCarousel,
    SuccessStats,
    ExitIntentPopup,
} from './components/conversion/SocialProof.js';

// Coach Components (modular)
import {
    LanguageFlags,
    TrustBadges,
    VideoPopup,
    ReviewsPopup,
    DiscoveryCallModal,
    CoachCard,
    CoachCardSkeleton,
    FilterSidebar,
    SPECIALTY_OPTIONS,
    LANGUAGE_OPTIONS,
    CoachList,
    CoachDetailModal
} from './components/coach/index.js';

// Layout & UI Components (modular)
import { Navbar, Footer } from './components/layout/index.js';
import { LegalModal, CurrencySelector, LanguageSelector } from './components/ui/index.js';

// Auth Components (modular)
import { SignOut, Auth, CoachOnboarding } from './components/auth/index.js';

// Account Components (modular)
import { DataExportRequest, AccountDeletion } from './components/account/index.js';

// Dashboard Components (modular)
import { DashboardOverview, DiscoveryRequestsDashboard, DashboardSubscription, DashboardProfile } from './components/dashboard/index.js';

// Review Components (modular)
import { StarRating, ReviewCard, WriteReviewModal } from './components/reviews/index.js';

// Messaging Components (modular)
import { MessagingInbox, ConversationView } from './components/messaging/index.js';

// Matching Components (modular)
import { MatchingQuiz, AIMatchPage, getQuizQuestions } from './components/matching/index.js';

console.log('App.js: React global', React);
console.log('App.js: ReactDOM global', ReactDOM);
console.log('App.js: htm imported');

const html = htm.bind(React.createElement);

// Initialize
initLanguage();
const debugConsole = initDebugConsole();

const API_BASE = 'https://clouedo.com/coachsearching/api';

// Performance Utilities
const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
};

// Currency Management
const CURRENCY_SYMBOLS = {
    'EUR': '€',
    'USD': '$',
    'GBP': '£'
};

const CURRENCY_RATES = {
    'EUR': 1,
    'USD': 1.09,
    'GBP': 0.86
};

let currentCurrency = localStorage.getItem('currency') || 'EUR';

function setCurrency(code) {
    currentCurrency = code;
    localStorage.setItem('currency', code);
    window.dispatchEvent(new Event('currencyChange'));
    console.log('Currency changed to:', code);
}

function getCurrentCurrency() {
    return currentCurrency;
}

function formatPrice(eurPrice) {
    const rate = CURRENCY_RATES[currentCurrency];
    const convertedPrice = (eurPrice * rate).toFixed(0);
    const symbol = CURRENCY_SYMBOLS[currentCurrency];
    return symbol + convertedPrice;
}


// Utility: Enhanced Markdown to HTML
function markdownToHTML(md) {
    if (!md) return '';

    let html = md;

    // Convert headings (must be done line by line)
    html = html.replace(/^### (.*)$/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*)$/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*)$/gim, '<h1>$1</h1>');

    // Convert links [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Convert bold and italic
    html = html.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^\*]+)\*/g, '<em>$1</em>');

    // Convert bullet lists
    const bulletRegex = /^- (.*)$/gm;
    if (bulletRegex.test(html)) {
        html = html.replace(/(^- .*$(\n|$))+/gm, function(match) {
            const items = match.trim().split('\n').map(line =>
                '<li>' + line.replace(/^- /, '') + '</li>'
            ).join('');
            return '<ul>' + items + '</ul>';
        });
    }

    // Convert numbered lists
    const numberRegex = /^\d+\. (.*)$/gm;
    if (numberRegex.test(md)) {
        html = html.replace(/(^\d+\. .*$(\n|$))+/gm, function(match) {
            const items = match.trim().split('\n').map(line =>
                '<li>' + line.replace(/^\d+\. /, '') + '</li>'
            ).join('');
            return '<ol>' + items + '</ol>';
        });
    }

    // Convert line breaks to paragraphs
    html = html.split('\n\n').map(para => {
        // Don't wrap headings, lists in p tags
        if (para.match(/^<(h[123]|ul|ol)/)) {
            return para;
        }
        return '<p>' + para.replace(/\n/g, '<br>') + '</p>';
    }).join('');

    return html;
}

// legalContent now in components/ui/Modal.js (LegalModal)

// Mock data for coaches (will be replaced with API data)
const mockCoaches = [
    {
        id: '1',
        full_name: 'Sarah Johnson',
        avatar_url: 'https://i.pravatar.cc/200?img=1',
        title: 'Executive Leadership Coach',
        bio: 'Helping executives and entrepreneurs achieve their full potential through strategic coaching and mentorship.',
        location: 'New York, USA',
        languages: ['English', 'Spanish'],
        specialties: ['Leadership', 'Career Transition', 'Executive Coaching'],
        hourly_rate: 150,
        rating: 4.9,
        reviews_count: 127
    },
    {
        id: '2',
        full_name: 'Michael Chen',
        avatar_url: 'https://i.pravatar.cc/200?img=12',
        title: 'Career Development Coach',
        bio: 'Specializing in career transitions and professional development for mid-career professionals.',
        location: 'San Francisco, USA',
        languages: ['English', 'Mandarin'],
        specialties: ['Career Change', 'Interview Prep', 'Salary Negotiation'],
        hourly_rate: 120,
        rating: 4.8,
        reviews_count: 89
    },
    {
        id: '3',
        full_name: 'Emma Schmidt',
        avatar_url: 'https://i.pravatar.cc/200?img=5',
        title: 'Life & Wellness Coach',
        bio: 'Empowering individuals to create balanced, fulfilling lives through holistic coaching approaches.',
        location: 'Berlin, Germany',
        languages: ['German', 'English'],
        specialties: ['Work-Life Balance', 'Stress Management', 'Personal Growth'],
        hourly_rate: 100,
        rating: 5.0,
        reviews_count: 64
    }
];

// --- Components ---
// Layout components (LegalModal, Footer, CurrencySelector, LanguageSelector, Navbar)
// are now imported from components/layout/ and components/ui/

// Auth component now imported from ./components/auth/Auth.js

// CoachOnboarding now imported from ./components/auth/CoachOnboarding.js
// Removed ~735 lines of inline CoachOnboarding component

// SignOut now imported from components/auth/index.js
// Hero now imported from pages/HomePage.js

// Coach components now imported from components/coach/index.js:
// LanguageFlags, TrustBadges, VideoPopup, ReviewsPopup, DiscoveryCallModal,
// CoachCard, CoachCardSkeleton, FilterSidebar, SPECIALTY_OPTIONS, LANGUAGE_OPTIONS, CoachList

// CoachList now imported from components/coach/CoachList.js
// Note: The imported CoachList accepts CoachDetailModal as a prop

// Wrapper to use imported CoachList with inline CoachDetailModal
const CoachListWithModal = ({ searchFilters, session }) => {
    return html`<${CoachList} searchFilters=${searchFilters} session=${session} CoachDetailModal=${CoachDetailModal} />`;
};

// BookingModal removed - MVP uses Discovery Calls only
// Session booking will be handled outside the platform

// CoachDetailModal now imported from ./components/coach/CoachDetailModal.js

const Dashboard = ({ session }) => {
    const [activeTab, setActiveTab] = useState('overview');

    console.log('Dashboard component rendering, session:', !!session);

    // Listen for custom tab switching events from dashboard overview
    useEffect(() => {
        const handleTabSwitch = (event) => {
            setActiveTab(event.detail);
        };
        window.addEventListener('switchTab', handleTabSwitch);
        return () => window.removeEventListener('switchTab', handleTabSwitch);
    }, []);

    if (!session) {
        console.log('No session in Dashboard, waiting for auth state...');
        // Show loading state instead of redirecting immediately
        return html`
            <div class="container" style=${{ marginTop: '100px', textAlign: 'center' }}>
                <div class="spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        `;
    }

    const userType = session.user?.user_metadata?.user_type || 'client';
    console.log('Dashboard loaded successfully for user:', session.user.email, 'User Type:', userType);

    return html`
    <div class="dashboard-container">
            <div class="dashboard-header">
                <h2 class="section-title">${t('dashboard.welcome')}, ${session.user.email}</h2>
                <div class="badge badge-petrol">${userType === 'client' ? 'Client' : userType === 'coach' ? 'Coach' : 'Business'}</div>
            </div>

            <div class="dashboard-tabs">
                <button class="tab-btn ${activeTab === 'overview' ? 'active' : ''}" onClick=${() => setActiveTab('overview')}>
                    ${t('dashboard.overview')}
                </button>
                ${userType === 'coach' && html`
                    <button class="tab-btn ${activeTab === 'discovery_requests' ? 'active' : ''}" onClick=${() => setActiveTab('discovery_requests')}>
                        📞 ${t('dashboard.discoveryRequests') || 'Discovery Requests'}
                    </button>
                    <button class="tab-btn ${activeTab === 'subscription' ? 'active' : ''}" onClick=${() => setActiveTab('subscription')}>
                        💳 ${t('dashboard.subscription') || 'Subscription'}
                    </button>
                    <button class="tab-btn ${activeTab === 'articles' ? 'active' : ''}" onClick=${() => setActiveTab('articles')}>
                        ${t('dashboard.articles')}
                    </button>
                `}
                <button class="tab-btn ${activeTab === 'referrals' ? 'active' : ''}" onClick=${() => setActiveTab('referrals')}>
                    ${t('dashboard.referrals') || 'Referrals'}
                </button>
                <button class="tab-btn ${activeTab === 'profile' ? 'active' : ''}" onClick=${() => setActiveTab('profile')}>
                    ${t('dashboard.profile')}
                </button>
            </div>

            ${activeTab === 'overview' && html`<${DashboardOverview} userType=${userType} session=${session} />`}
            ${activeTab === 'discovery_requests' && userType === 'coach' && html`<${DiscoveryRequestsDashboard} session=${session} />`}
            ${activeTab === 'subscription' && userType === 'coach' && html`<${DashboardSubscription} session=${session} />`}
            ${activeTab === 'articles' && userType === 'coach' && html`<${DashboardArticles} session=${session} />`}
            ${activeTab === 'referrals' && html`<${ReferralDashboard} session=${session} />`}
            ${activeTab === 'profile' && html`<${DashboardProfile} session=${session} userType=${userType} />`}
        </div>
    `;
};

// Booking Acceptance Modal Component
const BookingAcceptModal = ({ booking, onClose, onAccept }) => {
    const [meetingType, setMeetingType] = useState(booking.meeting_type || 'online');
    const [meetingLink, setMeetingLink] = useState('');
    const [meetingAddress, setMeetingAddress] = useState('');
    const [coachNotes, setCoachNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAccept = async () => {
        if (meetingType === 'online' && !meetingLink.trim()) {
            alert('Please provide a meeting link');
            return;
        }
        if (meetingType === 'onsite' && !meetingAddress.trim()) {
            alert('Please provide a meeting address');
            return;
        }

        setLoading(true);
        try {
            await onAccept({
                meeting_type: meetingType,
                meeting_link: meetingType === 'online' ? meetingLink : null,
                meeting_address: meetingType === 'onsite' ? meetingAddress : null,
                coach_notes: coachNotes || null
            });
        } finally {
            setLoading(false);
        }
    };

    const formatDateTime = (dateTimeStr) => {
        const date = new Date(dateTimeStr);
        return {
            date: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
            time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
    };

    const dt = formatDateTime(booking.start_time);

    return html`
        <div class="booking-modal" onClick=${onClose}>
            <div class="booking-content" onClick=${(e) => e.stopPropagation()}>
                <div class="booking-header">
                    <h2>Accept Booking Request</h2>
                    <button class="modal-close-btn" onClick=${onClose}>×</button>
                </div>

                <div class="booking-details-summary">
                    <h3>Session Details</h3>
                    <div class="summary-row">
                        <span>Client:</span>
                        <span>${booking.client?.full_name || 'Client'}</span>
                    </div>
                    <div class="summary-row">
                        <span>Date:</span>
                        <span>${dt.date}</span>
                    </div>
                    <div class="summary-row">
                        <span>Time:</span>
                        <span>${dt.time}</span>
                    </div>
                    <div class="summary-row">
                        <span>Duration:</span>
                        <span>${booking.duration_minutes} minutes</span>
                    </div>
                    ${booking.client_notes && html`
                        <div class="summary-row" style=${{ flexDirection: 'column', alignItems: 'flex-start' }}>
                            <span style=${{ fontWeight: 600, marginBottom: '4px' }}>Client Notes:</span>
                            <span style=${{ color: '#666' }}>${booking.client_notes}</span>
                        </div>
                    `}
                </div>

                <div class="form-group" style=${{ marginTop: '20px' }}>
                    <label style=${{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>Meeting Type</label>
                    <div style=${{ display: 'flex', gap: '12px' }}>
                        <button
                            class="filter-toggle-btn ${meetingType === 'online' ? 'active' : ''}"
                            onClick=${() => setMeetingType('online')}
                            style=${{ flex: 1 }}
                        >
                            💻 Online
                        </button>
                        <button
                            class="filter-toggle-btn ${meetingType === 'onsite' ? 'active' : ''}"
                            onClick=${() => setMeetingType('onsite')}
                            style=${{ flex: 1 }}
                        >
                            📍 On-site
                        </button>
                    </div>
                </div>

                ${meetingType === 'online' ? html`
                    <div class="form-group">
                        <label style=${{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                            Meeting Link * (MS Teams, Zoom, Google Meet, etc.)
                        </label>
                        <input
                            type="url"
                            class="form-control"
                            placeholder="https://teams.microsoft.com/..."
                            value=${meetingLink}
                            onInput=${(e) => setMeetingLink(e.target.value)}
                        />
                    </div>
                ` : html`
                    <div class="form-group">
                        <label style=${{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                            Meeting Address *
                        </label>
                        <textarea
                            class="form-control"
                            rows="3"
                            placeholder="Enter the address where you'll meet the client..."
                            value=${meetingAddress}
                            onInput=${(e) => setMeetingAddress(e.target.value)}
                        ></textarea>
                    </div>
                `}

                <div class="form-group">
                    <label style=${{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                        Notes to Client (Optional)
                    </label>
                    <textarea
                        class="form-control"
                        rows="3"
                        placeholder="Any additional information for the client..."
                        value=${coachNotes}
                        onInput=${(e) => setCoachNotes(e.target.value)}
                    ></textarea>
                </div>

                <div style=${{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button
                        class="btn-secondary"
                        onClick=${onClose}
                        disabled=${loading}
                        style=${{ flex: 1 }}
                    >
                        Cancel
                    </button>
                    <button
                        class="btn-primary"
                        onClick=${handleAccept}
                        disabled=${loading}
                        style=${{ flex: 1 }}
                    >
                        ${loading ? 'Accepting...' : 'Accept & Confirm'}
                    </button>
                </div>
            </div>
        </div>
    `;
};

const DashboardBookings = ({ session, userType }) => {
    const [bookings, setBookings] = useState([]);
    const [filteredBookings, setFilteredBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
    const [acceptingBooking, setAcceptingBooking] = useState(null);

    useEffect(() => {
        loadBookings();
    }, []);

    useEffect(() => {
        filterBookings();
    }, [bookings, searchQuery, statusFilter]);

    const loadBookings = async () => {
        setLoading(true);
        try {
            if (window.supabaseClient && session) {
                console.log('📋 Loading bookings for user type:', userType);

                let bookingsData = [];

                if (userType === 'coach') {
                    // Get coach_id
                    const { data: coachData } = await window.supabaseClient
                        .from('cs_coaches')
                        .select('id')
                        .eq('user_id', session.user.id)
                        .single();

                    if (coachData) {
                        const { data, error } = await window.supabaseClient
                            .from('cs_bookings')
                            .select(`
                                *,
                                client:cs_clients!client_id(full_name, email, phone)
                            `)
                            .eq('coach_id', coachData.id)
                            .order('start_time', { ascending: false });

                        if (!error && data) {
                            bookingsData = data;
                        }
                    }
                } else {
                    // Client view
                    const { data: clientData } = await window.supabaseClient
                        .from('cs_clients')
                        .select('id')
                        .eq('user_id', session.user.id)
                        .single();

                    if (clientData) {
                        const { data, error } = await window.supabaseClient
                            .from('cs_bookings')
                            .select(`
                                *,
                                coach:cs_coaches!coach_id(full_name, title, avatar_url)
                            `)
                            .eq('client_id', clientData.id)
                            .order('start_time', { ascending: false });

                        if (!error && data) {
                            bookingsData = data;
                        }
                    }
                }

                console.log('✅ Loaded bookings:', bookingsData.length);
                setBookings(bookingsData);
            }
        } catch (error) {
            console.error('❌ Failed to load bookings:', error);
            setBookings([]);
        } finally {
            setLoading(false);
        }
    };

    const filterBookings = () => {
        let filtered = [...bookings];

        // Apply status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(b => b.status === statusFilter);
        }

        // Apply search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(b =>
                (b.client_notes && b.client_notes.toLowerCase().includes(query)) ||
                (b.coach_notes && b.coach_notes.toLowerCase().includes(query)) ||
                b.status.toLowerCase().includes(query) ||
                b.meeting_type.toLowerCase().includes(query)
            );
        }

        setFilteredBookings(filtered);
    };

    const handleAcceptBooking = async (bookingDetails) => {
        try {
            console.log('✅ Accepting booking:', acceptingBooking.id, bookingDetails);

            const { error } = await window.supabaseClient
                .from('cs_bookings')
                .update({
                    status: 'confirmed',
                    meeting_type: bookingDetails.meeting_type,
                    meeting_link: bookingDetails.meeting_link,
                    meeting_address: bookingDetails.meeting_address,
                    coach_notes: bookingDetails.coach_notes
                })
                .eq('id', acceptingBooking.id);

            if (error) {
                console.error('❌ Error accepting booking:', error);
                throw error;
            }

            console.log('✅ Booking accepted successfully');
            setMessage('✓ Booking accepted and confirmed!');
            setAcceptingBooking(null);
            await loadBookings();
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('❌ Failed to accept booking:', error);
            alert('Failed to accept booking: ' + error.message);
        }
    };

    const handleCancelBooking = async (bookingId) => {
        if (!confirm('Are you sure you want to cancel this booking?')) {
            return;
        }

        const reason = prompt('Please provide a reason for cancellation (optional):');

        try {
            const { error } = await window.supabaseClient
                .from('cs_bookings')
                .update({
                    status: 'cancelled',
                    cancellation_reason: reason || 'No reason provided'
                })
                .eq('id', bookingId);

            if (error) {
                throw error;
            }

            setMessage('✓ Booking cancelled successfully');
            await loadBookings();
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('❌ Cancel booking error:', error);
            alert('Failed to cancel booking: ' + error.message);
        }
    };

    const getStatusClass = (status) => {
        const classes = {
            'pending': 'booking-status pending',
            'confirmed': 'booking-status confirmed',
            'completed': 'booking-status completed',
            'cancelled': 'booking-status cancelled'
        };
        return classes[status] || 'booking-status';
    };

    const formatDateTime = (dateTimeStr) => {
        const date = new Date(dateTimeStr);
        return {
            date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
            time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
    };

    if (loading) {
        return html`
            <div class="bookings-loading">
                ${[1, 2, 3].map(i => html`
                    <div key=${i} class="booking-card skeleton-card">
                        <div class="skeleton-line" style=${{ width: '60%', height: '20px', marginBottom: '12px' }}></div>
                        <div class="skeleton-line" style=${{ width: '100%', height: '14px', marginBottom: '8px' }}></div>
                        <div class="skeleton-line" style=${{ width: '80%', height: '14px' }}></div>
                    </div>
                `)}
            </div>
        `;
    }

    if (bookings.length === 0) {
        return html`
            <div>
                <div class="empty-state">
                    <div class="empty-state-icon">📅</div>
                    <div class="empty-state-text">No bookings yet</div>
                    <div class="empty-state-subtext">
                        ${userType === 'coach'
                            ? 'Bookings from clients will appear here.'
                            : 'Browse coaches and book your first session!'}
                    </div>
                    ${userType === 'client' && html`
                        <button class="btn-primary" style=${{ marginTop: '16px' }} onClick=${() => window.navigateTo('/coaches')}>
                            Browse Coaches
                        </button>
                    `}
                </div>
            </div>
        `;
    }

    const statusCounts = {
        all: bookings.length,
        pending: bookings.filter(b => b.status === 'pending').length,
        confirmed: bookings.filter(b => b.status === 'confirmed').length,
        completed: bookings.filter(b => b.status === 'completed').length,
        cancelled: bookings.filter(b => b.status === 'cancelled').length
    };

    return html`
        <div class="bookings-container">
            ${message && html`
                <div class="success-message" style=${{ marginBottom: '20px', padding: '12px', background: '#d4edda', color: '#155724', borderRadius: '4px' }}>
                    ${message}
                </div>
            `}

            <!-- Filters and Search Bar -->
            <div class="bookings-controls">
                <div class="search-bar-container">
                    <input
                        type="text"
                        class="search-input"
                        placeholder="🔍 Search bookings..."
                        value=${searchQuery}
                        onInput=${(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div class="filter-tabs">
                    <button
                        class="filter-tab ${statusFilter === 'all' ? 'active' : ''}"
                        onClick=${() => setStatusFilter('all')}
                    >
                        All (${statusCounts.all})
                    </button>
                    <button
                        class="filter-tab ${statusFilter === 'pending' ? 'active' : ''}"
                        onClick=${() => setStatusFilter('pending')}
                    >
                        Pending (${statusCounts.pending})
                    </button>
                    <button
                        class="filter-tab ${statusFilter === 'confirmed' ? 'active' : ''}"
                        onClick=${() => setStatusFilter('confirmed')}
                    >
                        Confirmed (${statusCounts.confirmed})
                    </button>
                    <button
                        class="filter-tab ${statusFilter === 'completed' ? 'active' : ''}"
                        onClick=${() => setStatusFilter('completed')}
                    >
                        Completed (${statusCounts.completed})
                    </button>
                    <button
                        class="filter-tab ${statusFilter === 'cancelled' ? 'active' : ''}"
                        onClick=${() => setStatusFilter('cancelled')}
                    >
                        Cancelled (${statusCounts.cancelled})
                    </button>
                </div>
            </div>

            <!-- Results count -->
            <div class="results-count">
                Showing ${filteredBookings.length} of ${bookings.length} booking${bookings.length !== 1 ? 's' : ''}
            </div>

            ${filteredBookings.length === 0 ? html`
                <div class="empty-state-mini">
                    <div class="empty-icon">🔍</div>
                    <div class="empty-text">No bookings match your filters</div>
                    <button class="btn-secondary" style=${{ marginTop: '12px' }} onClick=${() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                    }}>
                        Clear Filters
                    </button>
                </div>
            ` : html`
                <div class="bookings-list">
                    ${filteredBookings.map(booking => {
                    const dt = formatDateTime(booking.start_time);
                    const canCancel = booking.status === 'pending' || booking.status === 'confirmed';

                    return html`
                        <div key=${booking.id} class="booking-card">
                            <div class="booking-card-header">
                                <div>
                                    <h3>${userType === 'coach' ? 'Client Booking' : `Session with Coach`}</h3>
                                    <div class=${getStatusClass(booking.status)}>
                                        ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                    </div>
                                </div>
                                <div class="booking-card-price">
                                    ${formatPrice(booking.amount)}
                                </div>
                            </div>

                            <div class="booking-card-body">
                                <div class="booking-detail-row">
                                    <span class="booking-detail-label">📅 Date:</span>
                                    <span>${dt.date}</span>
                                </div>
                                <div class="booking-detail-row">
                                    <span class="booking-detail-label">🕐 Time:</span>
                                    <span>${dt.time}</span>
                                </div>
                                <div class="booking-detail-row">
                                    <span class="booking-detail-label">⏱️ Duration:</span>
                                    <span>${booking.duration_minutes} minutes</span>
                                </div>
                                <div class="booking-detail-row">
                                    <span class="booking-detail-label">📍 Type:</span>
                                    <span>${booking.meeting_type === 'online' ? 'Online' : 'On-site'}</span>
                                </div>

                                ${booking.meeting_link && html`
                                    <div class="booking-detail-row">
                                        <span class="booking-detail-label">🔗 Meeting Link:</span>
                                        <a href=${booking.meeting_link} target="_blank" class="btn-small btn-secondary">
                                            Join Meeting
                                        </a>
                                    </div>
                                `}

                                ${booking.client_notes && userType === 'coach' && html`
                                    <div class="booking-detail-row">
                                        <span class="booking-detail-label">📝 Client Notes:</span>
                                        <span>${booking.client_notes}</span>
                                    </div>
                                `}

                                ${booking.coach_notes && userType === 'client' && html`
                                    <div class="booking-detail-row">
                                        <span class="booking-detail-label">📝 Coach Notes:</span>
                                        <span>${booking.coach_notes}</span>
                                    </div>
                                `}
                            </div>

                            <div class="booking-card-actions">
                                ${userType === 'coach' && booking.status === 'pending' && html`
                                    <button
                                        class="btn-small btn-primary"
                                        onClick=${() => setAcceptingBooking(booking)}
                                        style=${{ marginRight: '8px' }}
                                    >
                                        ✓ Accept Booking
                                    </button>
                                `}
                                ${canCancel && html`
                                    <button
                                        class="btn-small btn-secondary"
                                        onClick=${() => handleCancelBooking(booking.id)}
                                    >
                                        Cancel Booking
                                    </button>
                                `}
                                ${booking.status === 'cancelled' && booking.cancellation_reason && html`
                                    <div class="booking-detail-row" style=${{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
                                        <span>Cancellation reason: ${booking.cancellation_reason}</span>
                                    </div>
                                `}
                            </div>
                        </div>
                    `;
                    })}
                </div>
            `}

            ${acceptingBooking && html`
                <${BookingAcceptModal}
                    booking=${acceptingBooking}
                    onClose=${() => setAcceptingBooking(null)}
                    onAccept=${handleAcceptBooking}
                />
            `}
        </div>
    `;
};

// Discovery Requests Dashboard Component - imported from ./components/dashboard/DiscoveryRequestsDashboard.js

// Subscription Dashboard Component - imported from ./components/dashboard/DashboardSubscription.js

// DashboardOverview - imported from ./components/dashboard/DashboardOverview.js

// TODO: Extract remaining dashboard components below (DashboardAvailability, DashboardArticles, DashboardProfile)

const DashboardAvailability = ({ session }) => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [weeklySlots, setWeeklySlots] = useState([]);

    const daysOfWeek = [
        { id: 0, name: 'Sunday', short: 'Sun' },
        { id: 1, name: 'Monday', short: 'Mon' },
        { id: 2, name: 'Tuesday', short: 'Tue' },
        { id: 3, name: 'Wednesday', short: 'Wed' },
        { id: 4, name: 'Thursday', short: 'Thu' },
        { id: 5, name: 'Friday', short: 'Fri' },
        { id: 6, name: 'Saturday', short: 'Sat' }
    ];

    useEffect(() => {
        loadAvailability();
    }, []);

    const loadAvailability = async () => {
        try {
            console.log('🕐 Loading availability for user:', session.user.id);

            // First get coach_id from cs_coaches table
            const { data: coachData, error: coachError } = await window.supabaseClient
                .from('cs_coaches')
                .select('id')
                .eq('user_id', session.user.id)
                .single();

            if (coachError) {
                console.error('❌ Coach fetch error:', coachError);
                setWeeklySlots([]);
                return;
            }

            console.log('✅ Coach ID:', coachData.id);

            // Load availability slots for this coach
            const { data: slotsData, error: slotsError } = await window.supabaseClient
                .from('cs_coach_availability')
                .select('*')
                .eq('coach_id', coachData.id)
                .order('day_of_week', { ascending: true })
                .order('start_time', { ascending: true });

            if (slotsError) {
                console.error('❌ Slots fetch error:', slotsError);
                setWeeklySlots([]);
                return;
            }

            console.log('✅ Loaded availability slots:', slotsData?.length || 0);
            setWeeklySlots(slotsData || []);
        } catch (error) {
            console.error('❌ Failed to load availability:', error);
            setWeeklySlots([]); // Ensure it's an array even on error
        }
    };

    const getSlotsForDay = (dayId) => {
        // Safety check to ensure weeklySlots is an array
        if (!Array.isArray(weeklySlots)) {
            console.error('weeklySlots is not an array:', weeklySlots);
            return [];
        }
        return weeklySlots.filter(slot => slot.day_of_week === dayId);
    };

    const addSlot = (dayId) => {
        const newSlot = {
            day_of_week: dayId,
            start_time: '09:00',
            end_time: '17:00',
            is_active: true,
            temp_id: Date.now() // Temporary ID for local state
        };
        setWeeklySlots([...weeklySlots, newSlot]);
    };

    const removeSlot = (tempId, slotId) => {
        setWeeklySlots(weeklySlots.filter(slot =>
            tempId ? slot.temp_id !== tempId : slot.id !== slotId
        ));
    };

    const updateSlot = (tempId, slotId, field, value) => {
        setWeeklySlots(weeklySlots.map(slot => {
            if ((tempId && slot.temp_id === tempId) || (!tempId && slot.id === slotId)) {
                return { ...slot, [field]: value };
            }
            return slot;
        }));
    };

    const saveAvailability = async () => {
        setLoading(true);
        setMessage('');

        try {
            console.log('💾 Starting availability save...');
            console.log('📋 Current slots:', weeklySlots);

            // Get coach_id from cs_coaches table
            console.log('📋 Fetching coach data for user:', session.user.id);
            const { data: coachData, error: coachError } = await window.supabaseClient
                .from('cs_coaches')
                .select('id')
                .eq('user_id', session.user.id)
                .single();

            if (coachError) {
                console.error('❌ Coach fetch error:', coachError);
                throw new Error('Coach profile not found. Please complete your profile first.');
            }

            console.log('✅ Coach ID:', coachData.id);

            // Delete all existing availability slots for this coach
            console.log('🗑️ Deleting existing availability slots...');
            const { error: deleteError } = await window.supabaseClient
                .from('cs_coach_availability')
                .delete()
                .eq('coach_id', coachData.id);

            if (deleteError) {
                console.error('❌ Delete error:', deleteError);
                throw deleteError;
            }

            console.log('✅ Existing slots deleted');

            // Insert new slots if there are any
            if (weeklySlots.length > 0) {
                const slotsToInsert = weeklySlots.map(slot => ({
                    coach_id: coachData.id,
                    day_of_week: slot.day_of_week,
                    start_time: slot.start_time,
                    end_time: slot.end_time,
                    is_active: slot.is_active !== false
                }));

                console.log('➕ Inserting new slots:', slotsToInsert);

                const { data: insertedData, error: insertError } = await window.supabaseClient
                    .from('cs_coach_availability')
                    .insert(slotsToInsert)
                    .select();

                if (insertError) {
                    console.error('❌ Insert error:', insertError);
                    throw insertError;
                }

                console.log('✅ Slots inserted successfully:', insertedData);
            } else {
                console.log('ℹ️ No slots to insert (all cleared)');
            }

            setMessage('✓ Availability updated successfully!');
            await loadAvailability(); // Reload to get IDs
            setTimeout(() => setMessage(''), 3000);

        } catch (error) {
            console.error('❌ Save error:', error);
            setMessage('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return html`
        <div>
            <div style=${{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3>Weekly Availability</h3>
                <button class="btn-primary" onClick=${saveAvailability} disabled=${loading}>
                    ${loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            ${message && html`
                <div class="message" style=${{
                    padding: '12px',
                    borderRadius: '4px',
                    marginBottom: '20px',
                    background: message.includes('Error') ? '#fee' : '#efe',
                    color: message.includes('Error') ? '#c00' : '#060'
                }}>
                    ${message}
                </div>
            `}

            <div class="availability-calendar">
                ${daysOfWeek.map(day => html`
                    <div key=${day.id} class="availability-day">
                        <div class="availability-day-header">
                            <strong>${day.name}</strong>
                            <button
                                class="btn-small btn-secondary"
                                onClick=${() => addSlot(day.id)}
                                style=${{ fontSize: '12px', padding: '4px 8px' }}
                            >
                                + Add Time
                            </button>
                        </div>

                        <div class="availability-slots">
                            ${getSlotsForDay(day.id).length === 0 && html`
                                <div class="availability-empty">No availability set</div>
                            `}

                            ${getSlotsForDay(day.id).map(slot => html`
                                <div key=${slot.id || slot.temp_id} class="availability-slot">
                                    <input
                                        type="time"
                                        class="time-input"
                                        value=${slot.start_time}
                                        onChange=${(e) => updateSlot(slot.temp_id, slot.id, 'start_time', e.target.value)}
                                    />
                                    <span>to</span>
                                    <input
                                        type="time"
                                        class="time-input"
                                        value=${slot.end_time}
                                        onChange=${(e) => updateSlot(slot.temp_id, slot.id, 'end_time', e.target.value)}
                                    />
                                    <button
                                        class="btn-remove"
                                        onClick=${() => removeSlot(slot.temp_id, slot.id)}
                                        style=${{
                                            background: '#fee',
                                            color: '#c00',
                                            border: '1px solid #fcc',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            fontSize: '12px'
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            `)}
                        </div>
                    </div>
                `)}
            </div>

            <div class="form-hint" style=${{ marginTop: '20px', padding: '12px', background: '#f0f8ff', borderRadius: '4px' }}>
                💡 <strong>Tip:</strong> Set your regular weekly schedule here. You can add multiple time slots for each day.
                Clients will see available booking slots based on this schedule.
            </div>
        </div>
    `;
};

const DashboardArticles = ({ session }) => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showEditor, setShowEditor] = useState(false);
    const [editingArticle, setEditingArticle] = useState(null);

    useEffect(() => {
        loadArticles();
    }, []);

    const loadArticles = async () => {
        setLoading(true);
        try {
            if (window.supabaseClient && session) {
                // First get coach_id from cs_coaches table
                const { data: coachData } = await window.supabaseClient
                    .from('cs_coaches')
                    .select('id')
                    .eq('user_id', session.user.id)
                    .single();

                if (coachData) {
                    const { data, error } = await window.supabaseClient
                        .from('cs_articles')
                        .select('*')
                        .eq('coach_id', coachData.id)
                        .order('created_at', { ascending: false });

                    if (!error && data) {
                        setArticles(data);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load articles:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (article) => {
        setEditingArticle(article);
        setShowEditor(true);
    };

    const handleDelete = async (articleId) => {
        if (!confirm('Are you sure you want to delete this article?')) {
            return;
        }

        try {
            const { error } = await window.supabaseClient
                .from('cs_articles')
                .delete()
                .eq('id', articleId);

            if (!error) {
                await loadArticles();
            }
        } catch (error) {
            console.error('Failed to delete article:', error);
            alert('Failed to delete article');
        }
    };

    const handleTogglePublish = async (article) => {
        try {
            const newStatus = article.status === 'published' ? 'draft' : 'published';
            const { error } = await window.supabaseClient
                .from('cs_articles')
                .update({ status: newStatus })
                .eq('id', article.id);

            if (!error) {
                await loadArticles();
            }
        } catch (error) {
            console.error('Failed to update article:', error);
        }
    };

    const handleCloseEditor = () => {
        setShowEditor(false);
        setEditingArticle(null);
        loadArticles();
    };

    if (loading) {
        return html`
            <div class="articles-loading">
                ${[1, 2].map(i => html`
                    <div key=${i} class="article-card skeleton-card">
                        <div class="skeleton-line" style=${{ width: '70%', height: '24px', marginBottom: '12px' }}></div>
                        <div class="skeleton-line" style=${{ width: '100%', height: '14px', marginBottom: '8px' }}></div>
                        <div class="skeleton-line" style=${{ width: '90%', height: '14px' }}></div>
                    </div>
                `)}
            </div>
        `;
    }

    return html`
        <div class="articles-container">
            <div class="articles-header">
                <h3 class="section-subtitle">${t('dashboard.articles')}</h3>
                <button class="btn-primary" onClick=${() => {
                    setEditingArticle(null);
                    setShowEditor(!showEditor);
                }}>
                    ${showEditor ? '✕ Close Editor' : '✍️ Write New Article'}
                </button>
            </div>

            ${showEditor && html`
                <${ArticleEditor}
                    session=${session}
                    article=${editingArticle}
                    onClose=${handleCloseEditor}
                />
            `}

            ${!showEditor && articles.length === 0 && html`
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <div class="empty-state-text">No articles yet</div>
                    <div class="empty-state-subtext">Create your first article to share your expertise!</div>
                    <button class="btn-primary" style=${{ marginTop: '16px' }} onClick=${() => setShowEditor(true)}>
                        ✍️ Write Your First Article
                    </button>
                </div>
            `}

            ${!showEditor && articles.length > 0 && html`
                <div class="articles-list">
                    ${articles.map(article => html`
                        <div key=${article.id} class="article-card">
                            <div class="article-card-header">
                                <div class="article-card-title">
                                    <h4>${article.title}</h4>
                                    <span class="status-badge ${article.status === 'published' ? 'status-confirmed' : 'status-pending'}">
                                        ${article.status === 'published' ? '✓ Published' : '📝 Draft'}
                                    </span>
                                </div>
                                <div class="article-card-meta">
                                    <span>📅 ${new Date(article.created_at).toLocaleDateString()}</span>
                                    ${article.view_count > 0 && html`
                                        <span>👁️ ${article.view_count} views</span>
                                    `}
                                </div>
                            </div>

                            <div class="article-card-excerpt">
                                ${article.excerpt || (article.content_html ? article.content_html.replace(/<[^>]*>/g, '').substring(0, 150) + '...' : '')}
                            </div>

                            <div class="article-card-actions">
                                <button class="btn-small btn-secondary" onClick=${() => handleEdit(article)}>
                                    ✏️ Edit
                                </button>
                                <button
                                    class="btn-small ${article.status === 'published' ? 'btn-secondary' : 'btn-primary'}"
                                    onClick=${() => handleTogglePublish(article)}
                                >
                                    ${article.status === 'published' ? '📥 Unpublish' : '🚀 Publish'}
                                </button>
                                <button class="btn-small btn-danger" onClick=${() => handleDelete(article.id)}>
                                    🗑️ Delete
                                </button>
                            </div>
                        </div>
                    `)}
                </div>
            `}
        </div>
    `;
};

const ArticleEditor = ({ session, article, onClose }) => {
    const [title, setTitle] = useState(article?.title || '');
    const [excerpt, setExcerpt] = useState(article?.excerpt || '');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const editorRef = useRef(null);

    // Initialize WYSIWYG editor content
    useEffect(() => {
        if (editorRef.current && article?.content_html) {
            editorRef.current.innerHTML = article.content_html;
        }
    }, [article]);

    // WYSIWYG formatting functions using contenteditable
    const formatBold = () => {
        document.execCommand('bold', false, null);
        editorRef.current?.focus();
    };

    const formatItalic = () => {
        document.execCommand('italic', false, null);
        editorRef.current?.focus();
    };

    const formatHeading2 = () => {
        document.execCommand('formatBlock', false, '<h2>');
        editorRef.current?.focus();
    };

    const formatHeading3 = () => {
        document.execCommand('formatBlock', false, '<h3>');
        editorRef.current?.focus();
    };

    const formatBulletList = () => {
        document.execCommand('insertUnorderedList', false, null);
        editorRef.current?.focus();
    };

    const formatNumberedList = () => {
        document.execCommand('insertOrderedList', false, null);
        editorRef.current?.focus();
    };

    const formatLink = () => {
        const url = prompt('Enter URL:');
        if (url) {
            document.execCommand('createLink', false, url);
            editorRef.current?.focus();
        }
    };

    const handleSave = async (publishNow = false) => {
        if (!title.trim()) {
            setMessage('Error: Please enter a title');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        const contentHTML = editorRef.current?.innerHTML || '';
        const plainText = editorRef.current?.innerText || '';

        if (!plainText.trim()) {
            setMessage('Error: Please enter content');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        setSaving(true);
        setMessage('');

        try {
            console.log('💾 Starting article save...');

            // Generate slug from title
            const slug = title.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');

            // Get coach_id from cs_coaches table
            console.log('📋 Fetching coach data for user:', session.user.id);
            const { data: coachData, error: coachError } = await window.supabaseClient
                .from('cs_coaches')
                .select('id')
                .eq('user_id', session.user.id)
                .single();

            if (coachError) {
                console.error('❌ Coach fetch error:', coachError);
                throw new Error('Coach profile not found. Please complete your profile first.');
            }

            console.log('✅ Coach ID:', coachData.id);

            const articleData = {
                coach_id: coachData.id,
                title: title.trim(),
                slug: slug || 'untitled',
                content_html: contentHTML,
                excerpt: excerpt.trim() || plainText.substring(0, 200),
                status: publishNow ? 'published' : 'draft',
            };

            console.log('📝 Article data prepared:', { ...articleData, content_html: contentHTML.substring(0, 100) + '...' });

            let result;
            if (article?.id) {
                // Update existing article
                console.log('🔄 Updating existing article:', article.id);
                result = await window.supabaseClient
                    .from('cs_articles')
                    .update(articleData)
                    .eq('id', article.id)
                    .select();
            } else {
                // Create new article
                console.log('➕ Creating new article');
                result = await window.supabaseClient
                    .from('cs_articles')
                    .insert([articleData])
                    .select();
            }

            if (result.error) {
                console.error('❌ Supabase error:', result.error);
                throw result.error;
            }

            console.log('✅ Article saved successfully!', result.data);
            setMessage(publishNow ? '✓ Article published successfully!' : '✓ Article saved as draft!');
            setTimeout(() => {
                setMessage('');
                if (onClose) onClose();
            }, 1500);

        } catch (error) {
            console.error('❌ Failed to save article:', error);
            setMessage('Error: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    return html`
        <div class="article-editor-modern">
            ${message && html`
                <div class="message ${message.includes('Error') ? 'message-error' : 'message-success'}">
                    ${message}
                </div>
            `}

            <div class="editor-container">
                <!-- Title Input -->
                <input
                    type="text"
                    class="editor-title-input"
                    placeholder="Article Title"
                    value=${title}
                    onChange=${(e) => setTitle(e.target.value)}
                />

                <!-- Excerpt Input -->
                <input
                    type="text"
                    class="editor-excerpt-input"
                    placeholder="Short excerpt (optional - will auto-generate from content)"
                    value=${excerpt}
                    onChange=${(e) => setExcerpt(e.target.value)}
                />

                <!-- Formatting Toolbar -->
                <div class="formatting-toolbar">
                    <div class="toolbar-group">
                        <button
                            class="toolbar-btn"
                            onClick=${formatBold}
                            title="Bold (Ctrl+B)"
                        >
                            <strong>B</strong>
                        </button>
                        <button
                            class="toolbar-btn"
                            onClick=${formatItalic}
                            title="Italic (Ctrl+I)"
                        >
                            <em>I</em>
                        </button>
                    </div>

                    <div class="toolbar-divider"></div>

                    <div class="toolbar-group">
                        <button
                            class="toolbar-btn"
                            onClick=${formatHeading2}
                            title="Heading 2"
                        >
                            H2
                        </button>
                        <button
                            class="toolbar-btn"
                            onClick=${formatHeading3}
                            title="Heading 3"
                        >
                            H3
                        </button>
                    </div>

                    <div class="toolbar-divider"></div>

                    <div class="toolbar-group">
                        <button
                            class="toolbar-btn"
                            onClick=${formatBulletList}
                            title="Bullet List"
                        >
                            • List
                        </button>
                        <button
                            class="toolbar-btn"
                            onClick=${formatNumberedList}
                            title="Numbered List"
                        >
                            1. List
                        </button>
                    </div>

                    <div class="toolbar-divider"></div>

                    <div class="toolbar-group">
                        <button
                            class="toolbar-btn"
                            onClick=${formatLink}
                            title="Insert Link"
                        >
                            🔗 Link
                        </button>
                    </div>

                </div>

                <!-- WYSIWYG Editor -->
                <div
                    ref=${editorRef}
                    class="wysiwyg-editor"
                    contenteditable="true"
                    placeholder="Start writing your article here... Use the toolbar above to format your text."
                ></div>

                <!-- Action Buttons -->
                <div class="editor-actions">
                    <button
                        class="btn-secondary"
                        onClick=${() => onClose && onClose()}
                        disabled=${saving}
                    >
                        ← Back to Articles
                    </button>

                    <div class="editor-actions-right">
                        <button
                            class="btn-secondary"
                            onClick=${() => handleSave(false)}
                            disabled=${saving}
                        >
                            ${saving ? 'Saving...' : '💾 Save as Draft'}
                        </button>
                        <button
                            class="btn-primary"
                            onClick=${() => handleSave(true)}
                            disabled=${saving}
                        >
                            ${saving ? 'Publishing...' : '🚀 Publish Article'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
};

const DashboardProBono = ({ session }) => {
    console.log('Loading pro-bono dashboard');

    return html`
        <div>
            <h3>${t('dashboard.probono')}</h3>
            <p style=${{ marginBottom: '20px', color: 'var(--text-muted)' }}>
                Offer free coaching sessions and track your pro-bono hours for certifications.
            </p>

            <div class="stat-card" style=${{ marginBottom: '20px' }}>
                <div class="stat-label">${t('probono.hours_tracked')}</div>
                <div class="stat-value">0.0 hrs</div>
            </div>
            <button class="btn-primary" onClick=${() => {
                console.log('Add pro-bono slot clicked');
                alert('Pro-bono scheduler will be connected to API soon!');
            }}>
                ${t('probono.add_slot')}
            </button>

            <div class="empty-state" style=${{ marginTop: '40px' }}>
                <div class="empty-state-icon">🎁</div>
                <div class="empty-state-text">No pro-bono slots yet</div>
                <div class="empty-state-subtext">Create free coaching slots to help others and earn certification hours.</div>
            </div>
        </div>
    `;
};

// Home page sections (Hero, CoachingCategoriesSection, HowItWorksSection, TrustBadgesSection)
// now imported from pages/HomePage.js

const Home = ({ session }) => {
    return html`
        <div>
            <${Hero} />
            <${TrustBadgesSection} />
            <${CoachingCategoriesSection} />
            <${HowItWorksSection} />

            <${CoachListWithModal} session=${session} />
        </div>
    `;
};

// Review components (StarRating, ReviewCard, WriteReviewModal) now imported from ./components/reviews/index.js

// Messaging components (MessagingInbox, ConversationView) now imported from ./components/messaging/index.js

// =====================================================
// NOTIFICATIONS
// =====================================================

const NotificationBell = ({ session }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        if (session) {
            loadNotifications();
            const interval = setInterval(loadNotifications, 30000); // Poll every 30 seconds
            return () => clearInterval(interval);
        }
    }, [session]);

    const loadNotifications = async () => {
        try {
            const response = await fetch(`${API_BASE}/notifications`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            const data = await response.json();
            const notifs = data.data || [];
            setNotifications(notifs.slice(0, 5)); // Show last 5
            setUnreadCount(notifs.filter(n => !n.is_read).length);
        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            loadNotifications();
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    return html`
        <div style=${{ position: 'relative' }}>
            <button
                class="btn-secondary"
                onClick=${() => setShowDropdown(!showDropdown)}
                style=${{
                    position: 'relative',
                    padding: '8px 12px',
                    background: unreadCount > 0 ? 'var(--petrol-light)' : 'transparent',
                    color: unreadCount > 0 ? 'white' : 'inherit'
                }}
            >
                🔔
                ${unreadCount > 0 && html`
                    <span style=${{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: 'red',
                        color: 'white',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        fontSize: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold'
                    }}>
                        ${unreadCount}
                    </span>
                `}
            </button>

            ${showDropdown && html`
                <div style=${{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    width: '320px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    background: 'white',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 1000
                }}>
                    <div style=${{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border-color)',
                        fontWeight: '600'
                    }}>
                        Notifications
                    </div>

                    ${notifications.length === 0 ? html`
                        <div style=${{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No notifications
                        </div>
                    ` : html`
                        <div>
                            ${notifications.map(notif => html`
                                <div
                                    key=${notif.id}
                                    onClick=${() => {
                                        markAsRead(notif.id);
                                        if (notif.action_url) window.location.hash = notif.action_url;
                                    }}
                                    style=${{
                                        padding: '12px 16px',
                                        borderBottom: '1px solid var(--border-color)',
                                        cursor: 'pointer',
                                        background: notif.is_read ? 'white' : '#F0F9FA',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    <div style=${{ fontWeight: notif.is_read ? 'normal' : '600', fontSize: '14px', marginBottom: '4px' }}>
                                        ${notif.title}
                                    </div>
                                    <div style=${{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                        ${notif.body}
                                    </div>
                                    <div style=${{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        ${new Date(notif.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            `)}
                        </div>
                    `}

                    ${notifications.length > 0 && html`
                        <div style=${{ padding: '8px 16px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
                            <a href="/notifications" style=${{ fontSize: '13px', color: 'var(--primary-petrol)' }}>
                                View All Notifications
                            </a>
                        </div>
                    `}
                </div>
            `}
        </div>
    `;
};

// =====================================================
// FAVORITES MANAGEMENT
// =====================================================

const FavoriteButton = ({ coachId, session, isFavorited, onToggle }) => {
    const [loading, setLoading] = useState(false);

    const handleToggle = async () => {
        if (!session) {
            alert('Please sign in to save favorites');
            window.navigateTo('/login');
            return;
        }

        setLoading(true);
        try {
            const endpoint = isFavorited
                ? `${API_BASE}/favorites/${coachId}`
                : `${API_BASE}/favorites/${coachId}`;

            const response = await fetch(endpoint, {
                method: isFavorited ? 'DELETE' : 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            if (response.ok && onToggle) {
                onToggle(!isFavorited);
            }
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
        } finally {
            setLoading(false);
        }
    };

    return html`
        <button
            class="btn-secondary"
            onClick=${handleToggle}
            disabled=${loading}
            style=${{
                padding: '6px 12px',
                background: isFavorited ? 'var(--petrol-light)' : 'white',
                color: isFavorited ? 'white' : 'inherit',
                border: `1px solid ${isFavorited ? 'var(--petrol-light)' : 'var(--border-color)'}`
            }}
            title=${isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
            ${isFavorited ? '❤️' : '🤍'} ${isFavorited ? 'Saved' : 'Save'}
        </button>
    `;
};

// =====================================================
// TIMEZONE HANDLING
// =====================================================

const TimezoneSelector = ({ value, onChange }) => {
    const commonTimezones = [
        { value: 'Europe/London', label: 'London (GMT)' },
        { value: 'Europe/Paris', label: 'Paris (CET)' },
        { value: 'Europe/Berlin', label: 'Berlin (CET)' },
        { value: 'Europe/Madrid', label: 'Madrid (CET)' },
        { value: 'Europe/Rome', label: 'Rome (CET)' },
        { value: 'Europe/Amsterdam', label: 'Amsterdam (CET)' },
        { value: 'America/New_York', label: 'New York (EST)' },
        { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
        { value: 'Asia/Dubai', label: 'Dubai (GST)' },
        { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
        { value: 'UTC', label: 'UTC' }
    ];

    return html`
        <select class="form-control" value=${value} onChange=${(e) => onChange(e.target.value)}>
            <option value="">Select timezone...</option>
            ${commonTimezones.map(tz => html`
                <option key=${tz.value} value=${tz.value}>${tz.label}</option>
            `)}
        </select>
    `;
};

// GDPR components (DataExportRequest, AccountDeletion) now imported from components/account/

// =====================================================
// COACH EARNINGS DASHBOARD
// =====================================================

const CoachEarningsDashboard = ({ session }) => {
    const [earnings, setEarnings] = useState(null);
    const [payouts, setPayouts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [earningsRes, payoutsRes] = await Promise.all([
                fetch(`${API_BASE}/coaches/me/earnings`, {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                }),
                fetch(`${API_BASE}/coaches/me/payouts`, {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                })
            ]);

            const earningsData = await earningsRes.json();
            const payoutsData = await payoutsRes.json();

            setEarnings(earningsData.data);
            setPayouts(payoutsData.data || []);
        } catch (error) {
            console.error('Failed to load earnings:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return html`<div class="spinner"></div>`;

    return html`
        <div>
            <h3 style=${{ marginBottom: '20px' }}>Earnings Dashboard</h3>

            <div class="dashboard-grid" style=${{ marginBottom: '30px' }}>
                <div class="stat-card">
                    <div class="stat-label">Total Earned</div>
                    <div class="stat-value">${formatPrice(earnings?.total_earned || 0)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Available</div>
                    <div class="stat-value">${formatPrice(earnings?.available_balance || 0)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Pending</div>
                    <div class="stat-value">${formatPrice(earnings?.pending || 0)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Sessions</div>
                    <div class="stat-value">${earnings?.total_sessions || 0}</div>
                </div>
            </div>

            <h4 style=${{ marginBottom: '16px' }}>Payout History</h4>
            ${payouts.length === 0 ? html`
                <div class="empty-state">
                    <div class="empty-state-icon">💸</div>
                    <div class="empty-state-text">No payouts yet</div>
                    <div class="empty-state-subtext">Payouts processed weekly on Mondays</div>
                </div>
            ` : html`
                <div style=${{ overflowX: 'auto' }}>
                    <table style=${{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style=${{ borderBottom: '2px solid var(--border-color)' }}>
                                <th style=${{ padding: '12px', textAlign: 'left' }}>Period</th>
                                <th style=${{ padding: '12px', textAlign: 'left' }}>Amount</th>
                                <th style=${{ padding: '12px', textAlign: 'left' }}>Status</th>
                                <th style=${{ padding: '12px', textAlign: 'left' }}>Arrival</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${payouts.map(p => html`
                                <tr key=${p.id} style=${{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style=${{ padding: '12px' }}>
                                        ${new Date(p.period_start).toLocaleDateString()} -
                                        ${new Date(p.period_end).toLocaleDateString()}
                                    </td>
                                    <td style=${{ padding: '12px', fontWeight: '600' }}>${formatPrice(p.amount)}</td>
                                    <td style=${{ padding: '12px' }}>
                                        <span class=${'booking-status ' + p.status}>${p.status}</span>
                                    </td>
                                    <td style=${{ padding: '12px' }}>
                                        ${p.arrival_date ? new Date(p.arrival_date).toLocaleDateString() : 'Pending'}
                                    </td>
                                </tr>
                            `)}
                        </tbody>
                    </table>
                </div>
            `}

            <div style=${{ marginTop: '30px', padding: '16px', background: '#F0F9FA', borderRadius: '8px' }}>
                <h4>💡 Payout Info</h4>
                <ul style=${{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
                    <li>Payouts every Monday</li>
                    <li>Commission: 15% (Founding Coaches: 10%)</li>
                    <li>SEPA: 1-2 business days</li>
                </ul>
            </div>
        </div>
    `;
};

// =====================================================
// EMAIL VERIFICATION BANNER
// =====================================================

const EmailVerificationBanner = ({ session }) => {
    const [dismissed, setDismissed] = useState(false);
    const [resending, setResending] = useState(false);
    const [resent, setResent] = useState(false);

    // Don't show if no session, email is verified, or user dismissed it
    if (!session || session.user?.email_confirmed_at || dismissed) {
        return null;
    }

    // Mask email for privacy (e.g., m*****@c****.com)
    const maskEmail = (email) => {
        if (!email) return '';
        const [localPart, domain] = email.split('@');
        if (!localPart || !domain) return email;

        const maskedLocal = localPart.charAt(0) + '*****';
        const [domainName, tld] = domain.split('.');
        const maskedDomain = domainName.charAt(0) + '****' + (tld ? '.' + tld : '');

        return `${maskedLocal}@${maskedDomain}`;
    };

    const handleResendVerification = async () => {
        if (!window.supabaseClient) return;

        setResending(true);
        try {
            const { error } = await window.supabaseClient.auth.resend({
                type: 'signup',
                email: session.user.email
            });

            if (error) {
                console.error('Failed to resend verification email:', error);
                alert('Failed to resend verification email. Please try again later.');
            } else {
                setResent(true);
                setTimeout(() => setResent(false), 5000);
            }
        } catch (error) {
            console.error('Error resending verification email:', error);
        } finally {
            setResending(false);
        }
    };

    return html`
        <div style=${{
            background: 'linear-gradient(90deg, #FEF3C7 0%, #FDE68A 100%)',
            borderBottom: '1px solid #F59E0B',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            fontSize: '14px',
            color: '#92400E'
        }}>
            <span style=${{ fontSize: '18px' }}>⚠️</span>
            <span>
                Please verify your email address: <strong>${maskEmail(session.user.email)}</strong>
            </span>
            <button
                onClick=${handleResendVerification}
                disabled=${resending || resent}
                style=${{
                    background: resent ? '#10B981' : '#F59E0B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '13px',
                    cursor: resending || resent ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    opacity: resending ? 0.7 : 1
                }}
            >
                ${resent ? '✓ Sent!' : resending ? 'Sending...' : 'Resend Email'}
            </button>
            <button
                onClick=${() => setDismissed(true)}
                style=${{
                    background: 'transparent',
                    border: 'none',
                    color: '#92400E',
                    fontSize: '20px',
                    cursor: 'pointer',
                    padding: '0 8px',
                    lineHeight: 1
                }}
                title="Dismiss"
            >
                ×
            </button>
        </div>
    `;
};

// =====================================================
// ERROR BOUNDARY
// =====================================================

// Error Boundary Component (must be a class component)
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('React Error Boundary caught an error:', error, errorInfo);
        this.setState({ error, errorInfo });

        // Log to debug console if available
        if (window.debugConsole) {
            window.debugConsole.addLog('error', [
                'React Error:',
                error.toString(),
                errorInfo.componentStack
            ]);
        }
    }

    handleReset() {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.navigateTo('/home');
        window.location.reload();
    }

    render() {
        if (this.state.hasError) {
            return React.createElement('div', {
                style: {
                    padding: '40px',
                    textAlign: 'center',
                    maxWidth: '600px',
                    margin: '100px auto',
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }
            },
                React.createElement('div', {
                    style: { fontSize: '64px', marginBottom: '20px' }
                }, '⚠️'),
                React.createElement('h2', {
                    style: { color: '#dc2626', marginBottom: '16px' }
                }, 'Oops! Something went wrong'),
                React.createElement('p', {
                    style: { color: '#6b7280', marginBottom: '24px' }
                }, 'We encountered an unexpected error. Our team has been notified.'),
                this.state.error && React.createElement('details', {
                    style: {
                        textAlign: 'left',
                        background: '#f3f4f6',
                        padding: '16px',
                        borderRadius: '8px',
                        marginBottom: '24px',
                        fontSize: '14px',
                        fontFamily: 'monospace'
                    }
                },
                    React.createElement('summary', {
                        style: { cursor: 'pointer', marginBottom: '8px', fontWeight: 'bold' }
                    }, 'Error Details'),
                    React.createElement('pre', {
                        style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word' }
                    }, this.state.error.toString()),
                    this.state.errorInfo && React.createElement('pre', {
                        style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: '8px' }
                    }, this.state.errorInfo.componentStack)
                ),
                React.createElement('button', {
                    onClick: () => this.handleReset(),
                    style: {
                        background: '#006266',
                        color: 'white',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer'
                    }
                }, '🔄 Reload Application')
            );
        }

        return this.props.children;
    }
}

// Matching components (MatchingQuiz, AIMatchPage, getQuizQuestions) now imported from ./components/matching/index.js

// Helper function to get current route from pathname
const getCurrentRoute = () => {
    const pathname = window.location.pathname;
    // Handle root path
    if (pathname === '/' || pathname === '') return '/home';
    return pathname;
};

// Helper function to handle GitHub Pages redirect (from 404.html)
const handleGitHubPagesRedirect = () => {
    const redirectPath = sessionStorage.getItem('gh-pages-redirect');
    if (redirectPath) {
        sessionStorage.removeItem('gh-pages-redirect');
        console.log('GitHub Pages redirect detected:', redirectPath);
        // Use replaceState so back button works correctly
        window.history.replaceState(null, '', redirectPath);
        return redirectPath;
    }
    return null;
};

// Helper function to convert old hash routes to new clean routes
const migrateHashRoute = () => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#')) {
        // Convert #coach/id to /coach/id, #coaches to /coaches, etc.
        const cleanPath = hash.replace('#', '/');
        console.log('Migrating hash route:', hash, '→', cleanPath);
        window.history.replaceState(null, '', cleanPath);
        return cleanPath;
    }
    return null;
};

// Global navigate function for programmatic navigation
window.navigateTo = (path) => {
    // Ensure path starts with /
    if (!path.startsWith('/')) {
        path = '/' + path;
    }
    console.log('Navigating to:', path);
    window.history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
};

// Global click handler for all internal links (SPA navigation)
document.addEventListener('click', (e) => {
    // Find the closest anchor element
    const anchor = e.target.closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href) return;

    // Skip external links, hash-only links, and links with target="_blank"
    if (href.startsWith('http') || href.startsWith('//') || href === '#' || anchor.target === '_blank') {
        return;
    }

    // Skip mailto and tel links
    if (href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
    }

    // Handle internal links starting with /
    if (href.startsWith('/')) {
        e.preventDefault();
        window.navigateTo(href);
    }
});

const App = () => {
    // Check for GitHub Pages redirect first, then hash migration, then current route
    const initialRoute = handleGitHubPagesRedirect() || migrateHashRoute() || getCurrentRoute();
    const [route, setRoute] = useState(initialRoute);
    const [session, setSession] = useState(null);
    const [legalModal, setLegalModal] = useState({ isOpen: false, type: null });
    const [configLoaded, setConfigLoaded] = useState(false);
    const [languageVersion, setLanguageVersion] = useState(0);

    useEffect(() => {
        console.log('App useEffect: Fetching config...');

        fetch('https://clouedo.com/coachsearching/api/env.php')
            .then(res => {
                console.log('Config response status:', res.status);
                return res.json();
            })
            .then(config => {
                console.log('Config loaded:', config);

                if (config.SUPABASE_URL && config.SUPABASE_ANON_KEY) {
                    console.log('Initializing Supabase client...');
                    window.supabaseClient = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
                    console.log('Supabase client initialized:', window.supabaseClient);

                    window.supabaseClient.auth.getSession().then(({ data: { session } }) => {
                        console.log('Initial session:', session);
                        setSession(session);
                    });

                    const { data: { subscription } } = window.supabaseClient.auth.onAuthStateChange((_event, session) => {
                        console.log('Auth state changed:', _event, session);
                        setSession(session);
                    });

                    setConfigLoaded(true);
                } else {
                    console.error('Missing Supabase config in response:', config);
                }
            })
            .catch(err => {
                console.error('Failed to load config:', err);
            });

        // Handle browser back/forward buttons
        const handlePopState = () => {
            const newRoute = getCurrentRoute();
            console.log('Route changed to:', newRoute);
            setRoute(newRoute);
        };

        // Handle hash changes for backward compatibility
        const handleHashChange = () => {
            const migratedRoute = migrateHashRoute();
            if (migratedRoute) {
                setRoute(migratedRoute);
            }
        };

        const handleLangChange = () => {
            console.log('LANG: Language changed event received in App');
            setLanguageVersion(v => v + 1);
        };

        window.addEventListener('popstate', handlePopState);
        window.addEventListener('hashchange', handleHashChange);
        window.addEventListener('langChange', handleLangChange);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('hashchange', handleHashChange);
            window.removeEventListener('langChange', handleLangChange);
        };
    }, []);

    // Show/hide debug console based on login state
    useEffect(() => {
        if (window.debugConsole) {
            window.debugConsole.setUIEnabled(!!session);
        }
    }, [session]);

    const openLegal = (type) => {
        console.log('Opening legal modal:', type);
        setLegalModal({ isOpen: true, type });
    };

    const closeLegal = () => {
        console.log('Closing legal modal');
        setLegalModal({ isOpen: false, type: null });
    };

    if (!configLoaded) {
        return html`
            <div style=${{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                width: '100%',
                background: '#fff'
            }}>
                <style>
                    @keyframes pulse-loader {
                        0%, 100% { transform: scale(1); opacity: 1; }
                        50% { transform: scale(1.15); opacity: 0.7; }
                    }
                </style>
                <img
                    src="/favicon.ico"
                    alt="Loading..."
                    style=${{
                        width: '64px',
                        height: '64px',
                        animation: 'pulse-loader 1.2s ease-in-out infinite'
                    }}
                />
            </div>
        `;
    }

    let Component;

    // Parse route for dynamic routing (clean URLs without #)
    const routePath = route.split('?')[0]; // Remove query params
    // Remove leading slash and split
    const cleanPath = routePath.replace(/^\//, '');
    const routeParts = cleanPath.split('/');
    const baseRoute = routeParts[0] || 'home';
    const routeParam = routeParts[1] || null;

    // Handle dynamic routes first
    if (baseRoute === 'coaching' && routeParam) {
        // Category pages like /coaching/executive-coaching
        Component = () => html`<${CategoryPage} categorySlug=${routeParam} />`;
    } else if (baseRoute === 'coach' && routeParam) {
        // Coach profile pages - supports both UUID and slug
        // Example: /coach/john-smith-life-coach or /coach/277530d3-627d-4057-b115-985719a1f59c
        Component = () => html`<${CoachProfilePage} coachIdOrSlug=${routeParam} session=${session} />`;
    } else {
        // Static routes
        switch (baseRoute) {
            case 'home':
            case '':
                Component = () => html`<${Home} session=${session} />`; break;
            case 'coaches': Component = () => html`<${CoachListWithModal} session=${session} />`; break;
            case 'login': Component = Auth; break;
            case 'onboarding': Component = () => html`<${CoachOnboarding} session=${session} />`; break;
            case 'dashboard': Component = () => html`<${Dashboard} session=${session} />`; break;
            case 'quiz': Component = () => html`<${MatchingQuiz} session=${session} />`; break;
            case 'ai-match': Component = () => html`<${AIMatchPage} session=${session} />`; break;
            case 'signout': Component = SignOut; break;
            // Content pages
            case 'faq': Component = () => html`<${FAQPage} />`; break;
            case 'categories': Component = () => html`<${CategoriesIndexPage} />`; break;
            case 'pricing': Component = () => html`<${PricingPage} />`; break;
            default: Component = () => html`<${Home} session=${session} />`;
        }
    }

    return html`
        <div style=${{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <${Navbar} session=${session} />
            <${EmailVerificationBanner} session=${session} />
            <div style=${{ flex: 1 }}>
                <${Component} />
            </div>
            <${Footer} onOpenLegal=${openLegal} />
            <${LegalModal} isOpen=${legalModal.isOpen} onClose=${closeLegal} type=${legalModal.type} />
        </div>
    `;
};

console.log('App.js: Rendering app...');
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    React.createElement(ErrorBoundary, null, html`<${App} />`)
);
console.log('App.js: App rendered successfully');
