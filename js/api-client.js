/**
 * API Client for PHP Backend Integration
 *
 * Provides a clean interface for making API calls to the PHP backend
 * at https://clouedo.com/coachsearching/api
 */

const API_BASE_URL = 'https://clouedo.com/coachsearching/api';

/**
 * Make API request with automatic retry and error handling
 */
async function apiRequest(endpoint, options = {}) {
    const {
        method = 'GET',
        body = null,
        headers = {},
        retries = 3,
        timeout = 30000
    } = options;

    // Get auth token from localStorage (Supabase session)
    const session = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
    const token = session?.currentSession?.access_token;

    // Build headers
    const requestHeaders = {
        'Content-Type': 'application/json',
        ...headers
    };

    if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    // Build request config
    const config = {
        method,
        headers: requestHeaders,
        ...(body && { body: JSON.stringify(body) })
    };

    // Retry logic
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...config,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Handle non-2xx responses
            if (!response.ok) {
                const error = await response.json().catch(() => ({
                    error: 'RequestError',
                    message: `HTTP ${response.status}: ${response.statusText}`
                }));

                throw {
                    status: response.status,
                    ...error
                };
            }

            // Parse response
            const data = await response.json();
            return data;

        } catch (error) {
            // If this is the last attempt, throw the error
            if (attempt === retries) {
                console.error(`API request failed after ${retries} attempts:`, error);
                throw error;
            }

            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

/**
 * API Client Object
 * Provides convenient methods for all API endpoints
 */
export const api = {
    // ============================================
    // AUTHENTICATION
    // ============================================
    auth: {
        me: () => apiRequest('/auth/me'),
        updateProfile: (data) => apiRequest('/auth/me', { method: 'PATCH', body: data }),
        changePassword: (currentPassword, newPassword) => apiRequest('/auth/change-password', {
            method: 'POST',
            body: { currentPassword, newPassword }
        }),
        deleteAccount: (reason) => apiRequest('/auth/me', {
            method: 'DELETE',
            body: { reason }
        }),
        exportData: () => apiRequest('/auth/export-data', { method: 'POST' }),
    },

    // ============================================
    // COACHES
    // ============================================
    coaches: {
        search: (params) => apiRequest('/search/coaches', { method: 'GET', body: params }),
        get: (id) => apiRequest(`/coaches/${id}`),
        update: (id, data) => apiRequest(`/coaches/${id}`, { method: 'PATCH', body: data }),
        getAvailability: (id) => apiRequest(`/coaches/${id}/availability`),
        setAvailability: (id, slots) => apiRequest(`/coaches/${id}/availability`, {
            method: 'POST',
            body: { slots }
        }),
        getServices: (id) => apiRequest(`/coaches/${id}/services`),
        createService: (id, service) => apiRequest(`/coaches/${id}/services`, {
            method: 'POST',
            body: service
        }),
        getReviews: (id, page = 1) => apiRequest(`/coaches/${id}/reviews?page=${page}`),
    },

    // ============================================
    // BOOKINGS
    // ============================================
    bookings: {
        list: (params) => apiRequest('/bookings', { method: 'GET', body: params }),
        get: (id) => apiRequest(`/bookings/${id}`),
        create: (data) => apiRequest('/bookings/create', { method: 'POST', body: data }),
        cancel: (id, reason) => apiRequest(`/bookings/${id}/cancel`, {
            method: 'POST',
            body: { reason }
        }),
        complete: (id) => apiRequest(`/bookings/${id}/complete`, { method: 'POST' }),
        reschedule: (id, newDate) => apiRequest(`/bookings/${id}/reschedule`, {
            method: 'POST',
            body: { scheduled_at: newDate }
        }),
    },

    // ============================================
    // REVIEWS
    // ============================================
    reviews: {
        create: (data) => apiRequest('/reviews/create', { method: 'POST', body: data }),
        list: (params) => apiRequest('/reviews', { method: 'GET', body: params }),
    },

    // ============================================
    // MESSAGES
    // ============================================
    messages: {
        conversations: () => apiRequest('/messages/conversations'),
        get: (conversationId) => apiRequest(`/messages/${conversationId}`),
        send: (conversationId, message) => apiRequest('/messages/send', {
            method: 'POST',
            body: { conversation_id: conversationId, message }
        }),
    },

    // ============================================
    // REFERRALS
    // ============================================
    referrals: {
        getCode: () => apiRequest('/referrals/code'),
        getStats: () => apiRequest('/referrals/stats'),
        list: (page = 1) => apiRequest(`/referrals/list?page=${page}`),
        apply: (code) => apiRequest('/referrals/apply', { method: 'POST', body: { referral_code: code } }),
        validate: (code) => apiRequest('/referrals/validate', { method: 'POST', body: { code } }),
    },

    // ============================================
    // PROMO CODES
    // ============================================
    promoCodes: {
        getActive: () => apiRequest('/promo-codes/active'),
        validate: (code, amount) => apiRequest('/promo-codes/validate', {
            method: 'POST',
            body: { code, booking_amount: amount }
        }),
        apply: (code, bookingId, amount) => apiRequest('/promo-codes/apply', {
            method: 'POST',
            body: { code, booking_id: bookingId, booking_amount: amount }
        }),
    },

    // ============================================
    // SESSION NOTES
    // ============================================
    sessionNotes: {
        list: (clientId) => apiRequest(`/session-notes?client_id=${clientId}`),
        get: (id) => apiRequest(`/session-notes/${id}`),
        create: (data) => apiRequest('/session-notes/create', { method: 'POST', body: data }),
        update: (id, data) => apiRequest(`/session-notes/${id}`, { method: 'PATCH', body: data }),
    },

    // ============================================
    // ADMIN
    // ============================================
    admin: {
        users: {
            list: (params) => apiRequest('/admin/users', { method: 'GET', body: params }),
            update: (id, data) => apiRequest(`/admin/users/${id}`, { method: 'PATCH', body: data }),
            suspend: (id) => apiRequest(`/admin/users/${id}/suspend`, { method: 'POST' }),
            unsuspend: (id) => apiRequest(`/admin/users/${id}/unsuspend`, { method: 'POST' }),
        },
        coaches: {
            pending: () => apiRequest('/admin/coaches/pending'),
            verify: (id) => apiRequest(`/admin/coaches/${id}/verify`, { method: 'POST' }),
            reject: (id, reason) => apiRequest(`/admin/coaches/${id}/reject`, {
                method: 'POST',
                body: { reason }
            }),
        },
        settings: {
            get: () => apiRequest('/admin/settings'),
            update: (data) => apiRequest('/admin/settings', { method: 'PUT', body: data }),
        },
        promoCodes: {
            list: () => apiRequest('/admin/promo-codes'),
            create: (data) => apiRequest('/admin/promo-codes', { method: 'POST', body: data }),
            update: (id, data) => apiRequest(`/admin/promo-codes/${id}`, { method: 'PATCH', body: data }),
            delete: (id) => apiRequest(`/admin/promo-codes/${id}`, { method: 'DELETE' }),
            usage: (id) => apiRequest(`/admin/promo-codes/${id}/usage`),
        },
    },

    // ============================================
    // ANALYTICS
    // ============================================
    analytics: {
        overview: () => apiRequest('/analytics/overview'),
        users: (period = '30d') => apiRequest(`/analytics/users?period=${period}`),
        revenue: (period = '30d') => apiRequest(`/analytics/revenue?period=${period}`),
        bookings: (period = '30d') => apiRequest(`/analytics/bookings?period=${period}`),
        coaches: (period = '30d') => apiRequest(`/analytics/coaches?period=${period}`),
    },

    // ============================================
    // PAYMENTS
    // ============================================
    payments: {
        createIntent: (bookingId, amount) => apiRequest('/payments/create-intent', {
            method: 'POST',
            body: { booking_id: bookingId, amount }
        }),
        confirm: (paymentIntentId) => apiRequest('/payments/confirm', {
            method: 'POST',
            body: { payment_intent_id: paymentIntentId }
        }),
        getStatus: (paymentId) => apiRequest(`/payments/${paymentId}/status`),
    },

    // ============================================
    // SEARCH
    // ============================================
    search: {
        coaches: (query, filters = {}) => apiRequest('/search/coaches', {
            method: 'POST',
            body: { query, ...filters }
        }),
        suggestions: (query) => apiRequest(`/search/suggestions?q=${encodeURIComponent(query)}`),
    },
};

/**
 * Usage Examples:
 *
 * // Get current user
 * const user = await api.auth.me();
 *
 * // Search coaches
 * const coaches = await api.search.coaches('life coaching', {
 *   min_price: 50,
 *   max_price: 150,
 *   rating: 4
 * });
 *
 * // Create booking
 * const booking = await api.bookings.create({
 *   coach_id: 'uuid',
 *   service_id: 'uuid',
 *   scheduled_at: '2025-12-01T10:00:00Z'
 * });
 *
 * // Get analytics
 * const stats = await api.analytics.overview();
 */

export default api;
