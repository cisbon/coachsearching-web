<?php
/**
 * PHP Backend API Configuration for CoachSearching
 *
 * This file configures the frontend to communicate with the PHP backend
 * hosted at https://clouedo.com/coachsearching/api
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// PHP Backend Configuration
$config = [
    // Base API URL
    'API_BASE_URL' => 'https://clouedo.com/coachsearching/api',

    // API Endpoints
    'ENDPOINTS' => [
        // Authentication
        'login' => '/auth/login',
        'register' => '/auth/register',
        'logout' => '/auth/logout',
        'verify_email' => '/auth/verify-email',
        'forgot_password' => '/auth/forgot-password',
        'reset_password' => '/auth/reset-password',
        'me' => '/auth/me',

        // Coaches
        'coaches' => '/coaches',
        'coach_detail' => '/coaches/{id}',
        'coach_availability' => '/coaches/{id}/availability',
        'coach_services' => '/coaches/{id}/services',
        'coach_reviews' => '/coaches/{id}/reviews',

        // Bookings
        'bookings' => '/bookings',
        'booking_detail' => '/bookings/{id}',
        'create_booking' => '/bookings/create',
        'cancel_booking' => '/bookings/{id}/cancel',
        'complete_booking' => '/bookings/{id}/complete',

        // Reviews
        'reviews' => '/reviews',
        'create_review' => '/reviews/create',

        // Messages
        'conversations' => '/messages/conversations',
        'messages' => '/messages/{conversation_id}',
        'send_message' => '/messages/send',

        // Referrals
        'referral_code' => '/referrals/code',
        'referral_stats' => '/referrals/stats',
        'referral_list' => '/referrals/list',
        'apply_referral' => '/referrals/apply',
        'validate_referral' => '/referrals/validate',

        // Promo Codes
        'promo_codes_active' => '/promo-codes/active',
        'validate_promo' => '/promo-codes/validate',
        'apply_promo' => '/promo-codes/apply',

        // Admin
        'admin_users' => '/admin/users',
        'admin_coaches' => '/admin/coaches',
        'admin_pending_verifications' => '/admin/coaches/pending',
        'admin_verify_coach' => '/admin/coaches/{id}/verify',
        'admin_settings' => '/admin/settings',

        // Analytics
        'analytics_overview' => '/analytics/overview',
        'analytics_users' => '/analytics/users',
        'analytics_revenue' => '/analytics/revenue',
        'analytics_bookings' => '/analytics/bookings',
        'analytics_coaches' => '/analytics/coaches',

        // Payments
        'create_payment_intent' => '/payments/create-intent',
        'confirm_payment' => '/payments/confirm',
        'payment_status' => '/payments/{id}/status',

        // Session Notes
        'session_notes' => '/session-notes',
        'session_note_detail' => '/session-notes/{id}',
        'create_session_note' => '/session-notes/create',

        // Search
        'search_coaches' => '/search/coaches',
        'search_suggestions' => '/search/suggestions',
    ],

    // API Configuration
    'TIMEOUT' => 30000, // 30 seconds
    'RETRY_ATTEMPTS' => 3,
    'RETRY_DELAY' => 1000, // 1 second
];

echo json_encode($config);
?>
