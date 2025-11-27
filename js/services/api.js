/**
 * API Service
 * Centralized API client for all HTTP requests
 */

import { CONFIG } from '../config.js';

const API_BASE = CONFIG.API_BASE;

/**
 * Base fetch wrapper with error handling
 */
async function request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    if (options.body && typeof options.body === 'object') {
        config.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(url, config);

        // Handle non-JSON responses
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return { success: true };
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.message || `HTTP ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error);
        throw error;
    }
}

/**
 * API methods organized by resource
 */
export const api = {
    // Coaches
    coaches: {
        list(params = {}) {
            const query = new URLSearchParams(params).toString();
            return request(`/coaches${query ? `?${query}` : ''}`);
        },

        get(id) {
            return request(`/coaches/${id}`);
        },

        search(filters) {
            return request('/coaches/search', {
                method: 'POST',
                body: filters
            });
        },

        getByUser(userId) {
            return request(`/coaches?user_id=${userId}`);
        },

        create(data) {
            return request('/coaches', {
                method: 'POST',
                body: data
            });
        },

        update(id, data) {
            return request(`/coaches/${id}`, {
                method: 'PUT',
                body: data
            });
        }
    },

    // Bookings
    bookings: {
        list(params = {}) {
            const query = new URLSearchParams(params).toString();
            return request(`/bookings${query ? `?${query}` : ''}`);
        },

        get(id) {
            return request(`/bookings/${id}`);
        },

        getForCoach(coachId, params = {}) {
            return request(`/bookings/coach?coach_id=${coachId}&${new URLSearchParams(params)}`);
        },

        getForClient(clientId, params = {}) {
            return request(`/bookings/client?client_id=${clientId}&${new URLSearchParams(params)}`);
        },

        createDiscoveryCall(data) {
            return request('/bookings/discovery-call', {
                method: 'POST',
                body: data
            });
        },

        createIntent(data) {
            return request('/bookings/create-intent', {
                method: 'POST',
                body: data
            });
        },

        confirm(id, paymentIntentId) {
            return request(`/bookings/${id}/confirm`, {
                method: 'POST',
                body: { payment_intent_id: paymentIntentId }
            });
        },

        cancel(id, data) {
            return request(`/bookings/${id}/cancel`, {
                method: 'POST',
                body: data
            });
        },

        reschedule(id, data) {
            return request(`/bookings/${id}/reschedule`, {
                method: 'POST',
                body: data
            });
        },

        complete(id) {
            return request(`/bookings/${id}/complete`, { method: 'POST' });
        },

        markNoShow(id) {
            return request(`/bookings/${id}/no-show`, { method: 'POST' });
        },

        bookPackageSession(data) {
            return request('/bookings/package-session', {
                method: 'POST',
                body: data
            });
        }
    },

    // Availability
    availability: {
        get(coachId) {
            return request(`/availability?coach_id=${coachId}`);
        },

        update(coachId, data) {
            return request(`/availability?coach_id=${coachId}`, {
                method: 'PUT',
                body: data
            });
        },

        getSlots(coachId, params = {}) {
            const query = new URLSearchParams({ coach_id: coachId, ...params }).toString();
            return request(`/availability/slots?${query}`);
        },

        getBlocked(coachId) {
            return request(`/availability/blocked?coach_id=${coachId}`);
        },

        blockDates(coachId, data) {
            return request(`/availability/blocked?coach_id=${coachId}`, {
                method: 'POST',
                body: data
            });
        },

        unblockDates(coachId, blockId) {
            return request(`/availability/blocked?coach_id=${coachId}`, {
                method: 'DELETE',
                body: { block_id: blockId }
            });
        },

        getSettings(coachId) {
            return request(`/availability/settings?coach_id=${coachId}`);
        },

        updateSettings(coachId, data) {
            return request(`/availability/settings?coach_id=${coachId}`, {
                method: 'PUT',
                body: data
            });
        }
    },

    // Stripe
    stripe: {
        createAccount(coachId, data = {}) {
            return request('/stripe/connect/create', {
                method: 'POST',
                body: { coach_id: coachId, ...data }
            });
        },

        getOnboardingLink(coachId) {
            return request(`/stripe/connect/onboard?coach_id=${coachId}`);
        },

        getAccountStatus(coachId) {
            return request(`/stripe/connect/status?coach_id=${coachId}`);
        },

        getDashboardLink(coachId) {
            return request(`/stripe/connect/dashboard?coach_id=${coachId}`);
        },

        createPackageIntent(data) {
            return request('/stripe/packages/create-intent', {
                method: 'POST',
                body: data
            });
        },

        requestSatisfactionRefund(bookingId, reason) {
            return request('/stripe/refund/satisfaction', {
                method: 'POST',
                body: { booking_id: bookingId, reason }
            });
        }
    },

    // Discovery & Search
    discovery: {
        search(params) {
            return request('/discovery/search', {
                method: 'POST',
                body: params
            });
        },

        getQuizQuestions() {
            return request('/discovery/quiz/questions');
        },

        startQuiz() {
            return request('/discovery/quiz/start', { method: 'POST' });
        },

        submitQuiz(sessionId, answers) {
            return request('/discovery/quiz/submit', {
                method: 'POST',
                body: { session_id: sessionId, answers }
            });
        },

        getMatches(sessionId) {
            return request(`/discovery/quiz/matches?session_id=${sessionId}`);
        },

        submitConcierge(data) {
            return request('/discovery/concierge', {
                method: 'POST',
                body: data
            });
        },

        getSpecialties() {
            return request('/discovery/specialties');
        },

        getLocations() {
            return request('/discovery/locations');
        },

        getSuggestions(query) {
            return request(`/discovery/suggestions?q=${encodeURIComponent(query)}`);
        }
    },

    // Reviews
    reviews: {
        list(coachId, params = {}) {
            return request(`/reviews?coach_id=${coachId}&${new URLSearchParams(params)}`);
        },

        create(data) {
            return request('/reviews', {
                method: 'POST',
                body: data
            });
        }
    },

    // Packages
    packages: {
        getForClient(clientId) {
            return request(`/packages/client?client_id=${clientId}`);
        },

        getForCoach(coachId) {
            return request(`/packages/coach?coach_id=${coachId}`);
        }
    },

    // Promo Codes
    promoCodes: {
        validate(code) {
            return request(`/promo-codes/validate?code=${encodeURIComponent(code)}`);
        },

        apply(code, data) {
            return request('/promo-codes/apply', {
                method: 'POST',
                body: { code, ...data }
            });
        }
    }
};

export default api;
