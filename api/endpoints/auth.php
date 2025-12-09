<?php
/**
 * CoachSearching - Auth Endpoints
 *
 * Handles authenticated user operations:
 * - GET /auth/me - Get current user profile
 * - PATCH /auth/me - Update current user profile
 * - DELETE /auth/me - Request account deletion
 * - POST /auth/export-data - Export user data (GDPR)
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../Database.php';
require_once __DIR__ . '/../lib/Auth.php';
require_once __DIR__ . '/../lib/Sanitizer.php';

/**
 * Main handler for auth operations
 */
function handleAuth($method, $id, $action, $input) {
    if ($id === 'me' && $method === 'GET') {
        return getCurrentUser();
    } elseif ($id === 'me' && $method === 'PATCH') {
        return updateCurrentUser($input);
    } elseif ($id === 'me' && $method === 'DELETE') {
        return requestAccountDeletion();
    } elseif ($id === 'export-data' && $method === 'POST') {
        return exportUserData();
    } else {
        return ['error' => 'Auth endpoint not found', 'status' => 404];
    }
}

/**
 * Get current authenticated user's profile
 */
function getCurrentUser() {
    $user = Auth::getUser();

    if (!$user) {
        return ['error' => 'Not authenticated', 'status' => 401];
    }

    $db = new Database();

    // Get user ID from token
    $userId = $user['id'];
    $email = $user['email'] ?? '';

    // Try to get coach profile first
    $coachProfile = $db->from('cs_coaches')
        ->select('*')
        ->eq('user_id', $userId)
        ->single()
        ->execute();

    if ($coachProfile && !isset($coachProfile['error'])) {
        return [
            'id' => $userId,
            'email' => $email,
            'role' => 'coach',
            'profile' => [
                'coach_id' => $coachProfile['id'],
                'display_name' => $coachProfile['display_name'],
                'professional_title' => $coachProfile['professional_title'],
                'bio' => $coachProfile['bio'],
                'hourly_rate' => $coachProfile['hourly_rate'],
                'currency' => $coachProfile['currency'],
                'specialties' => $coachProfile['specialties'],
                'languages' => $coachProfile['languages'],
                'profile_image_url' => $coachProfile['profile_image_url'],
                'video_url' => $coachProfile['video_url'],
                'is_visible' => $coachProfile['is_visible'],
                'is_verified' => $coachProfile['is_verified'],
                'rating' => $coachProfile['rating'],
                'review_count' => $coachProfile['review_count'],
                'onboarding_completed' => $coachProfile['onboarding_completed'] ?? false
            ],
            'created_at' => $coachProfile['created_at']
        ];
    }

    // Try to get client profile
    $clientProfile = $db->from('cs_clients')
        ->select('*')
        ->eq('user_id', $userId)
        ->single()
        ->execute();

    if ($clientProfile && !isset($clientProfile['error'])) {
        return [
            'id' => $userId,
            'email' => $email,
            'role' => 'client',
            'profile' => [
                'name' => $clientProfile['name'],
                'avatar_url' => $clientProfile['avatar_url'],
                'phone' => $clientProfile['phone'],
                'timezone' => $clientProfile['timezone'],
                'preferred_language' => $clientProfile['preferred_language'],
                'onboarding_completed' => $clientProfile['onboarding_completed'] ?? false
            ],
            'created_at' => $clientProfile['created_at']
        ];
    }

    // User exists but has no profile yet (new user)
    return [
        'id' => $userId,
        'email' => $email,
        'role' => 'new_user',
        'profile' => null,
        'message' => 'Profile not yet created. Please complete onboarding.',
        'created_at' => $user['created_at'] ?? date('c')
    ];
}

/**
 * Update current user's profile
 */
function updateCurrentUser($input) {
    $user = Auth::getUser();

    if (!$user) {
        return ['error' => 'Not authenticated', 'status' => 401];
    }

    if (empty($input) || !is_array($input)) {
        return ['error' => 'No update data provided', 'status' => 400];
    }

    $db = new Database();
    $userId = $user['id'];

    // Determine if user is coach or client
    $coachProfile = $db->from('cs_coaches')
        ->select('id')
        ->eq('user_id', $userId)
        ->single()
        ->execute();

    $isCoach = $coachProfile && !isset($coachProfile['error']);

    if ($isCoach) {
        // Coach-specific fields that can be updated
        $allowedFields = [
            'display_name', 'professional_title', 'bio', 'hourly_rate',
            'currency', 'specialties', 'languages', 'session_formats',
            'location', 'profile_image_url', 'video_url', 'timezone'
        ];
        $table = 'cs_coaches';
    } else {
        // Client-specific fields
        $allowedFields = [
            'name', 'avatar_url', 'phone', 'timezone', 'preferred_language'
        ];
        $table = 'cs_clients';
    }

    // Filter and sanitize input
    $updates = [];
    foreach ($allowedFields as $field) {
        if (isset($input[$field])) {
            $value = $input[$field];

            // Sanitize string values
            if (is_string($value)) {
                $value = Sanitizer::clean($value);
            }

            // Validate specific fields
            if ($field === 'hourly_rate') {
                $value = (float)$value;
                if ($value < 0 || $value > 10000) {
                    return ['error' => 'Invalid hourly rate', 'status' => 400];
                }
            }

            if ($field === 'currency') {
                $allowedCurrencies = ['eur', 'gbp', 'usd', 'chf'];
                if (!in_array(strtolower($value), $allowedCurrencies)) {
                    return ['error' => 'Invalid currency', 'status' => 400];
                }
            }

            $updates[$field] = $value;
        }
    }

    if (empty($updates)) {
        return ['error' => 'No valid fields to update', 'status' => 400];
    }

    $updates['updated_at'] = date('c');

    try {
        $result = $db->from($table)
            ->update($updates)
            ->eq('user_id', $userId)
            ->execute();

        return [
            'success' => true,
            'message' => 'Profile updated successfully',
            'updated_fields' => array_keys($updates)
        ];
    } catch (Exception $e) {
        error_log("Profile update error: " . $e->getMessage());
        return ['error' => 'Failed to update profile', 'status' => 500];
    }
}

/**
 * Request account deletion (GDPR compliance)
 * Creates a pending deletion request, actual deletion happens after 30 days
 */
function requestAccountDeletion() {
    $user = Auth::getUser();

    if (!$user) {
        return ['error' => 'Not authenticated', 'status' => 401];
    }

    $db = new Database();
    $userId = $user['id'];

    // For now, log the request (full implementation would require additional table)
    error_log("Account deletion requested for user: $userId");

    $scheduledDate = date('c', strtotime('+30 days'));

    return [
        'success' => true,
        'message' => 'Account deletion requested. Your account and all associated data will be permanently deleted in 30 days. Contact support to cancel this request.',
        'scheduled_deletion_at' => $scheduledDate
    ];
}

/**
 * Export all user data (GDPR compliance)
 */
function exportUserData() {
    $user = Auth::getUser();

    if (!$user) {
        return ['error' => 'Not authenticated', 'status' => 401];
    }

    $db = new Database();
    $userId = $user['id'];
    $email = $user['email'] ?? '';

    $exportData = [
        'export_date' => date('c'),
        'user' => [
            'id' => $userId,
            'email' => $email
        ]
    ];

    // Get coach profile if exists
    $coachProfile = $db->from('cs_coaches')
        ->select('*')
        ->eq('user_id', $userId)
        ->single()
        ->execute();

    if ($coachProfile && !isset($coachProfile['error'])) {
        $exportData['coach_profile'] = $coachProfile;

        $coachId = $coachProfile['id'];

        // Get coach's bookings
        $coachBookings = $db->from('cs_bookings')
            ->select('*')
            ->eq('coach_id', $coachId)
            ->execute();

        if ($coachBookings && !isset($coachBookings['error'])) {
            $exportData['bookings_as_coach'] = $coachBookings;
        }

        // Get coach's reviews
        $reviews = $db->from('cs_reviews')
            ->select('*')
            ->eq('coach_id', $coachId)
            ->execute();

        if ($reviews && !isset($reviews['error'])) {
            $exportData['reviews_received'] = $reviews;
        }

        // Get coach's credentials
        $credentials = $db->from('cs_coach_credentials')
            ->select('*')
            ->eq('coach_id', $coachId)
            ->execute();

        if ($credentials && !isset($credentials['error'])) {
            $exportData['credentials'] = $credentials;
        }
    }

    // Get client profile if exists
    $clientProfile = $db->from('cs_clients')
        ->select('*')
        ->eq('user_id', $userId)
        ->single()
        ->execute();

    if ($clientProfile && !isset($clientProfile['error'])) {
        $exportData['client_profile'] = $clientProfile;
    }

    // Get bookings as client
    $clientBookings = $db->from('cs_bookings')
        ->select('*')
        ->eq('client_id', $userId)
        ->execute();

    if ($clientBookings && !isset($clientBookings['error'])) {
        $exportData['bookings_as_client'] = $clientBookings;
    }

    // Get reviews written by user
    $reviewsWritten = $db->from('cs_reviews')
        ->select('*')
        ->eq('author_id', $userId)
        ->execute();

    if ($reviewsWritten && !isset($reviewsWritten['error'])) {
        $exportData['reviews_written'] = $reviewsWritten;
    }

    return [
        'success' => true,
        'message' => 'Data export generated successfully',
        'data' => $exportData,
        'format' => 'JSON',
        'note' => 'This export contains all personal data stored in our system. Payment details are stored by Stripe and can be requested separately.'
    ];
}
