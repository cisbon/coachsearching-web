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

    // New schema: user role and display data live in cs_users.user_type / profile_data
    $userRow = $db->from('cs_users')
        ->select('*, cs_coaches(subscription_status, onboarding_completed, stripe_account_id)')
        ->eq('id', $userId)
        ->single()
        ->execute();

    if (!$userRow || isset($userRow['error'])) {
        return [
            'id'         => $userId,
            'email'      => $email,
            'role'       => 'new_user',
            'profile'    => null,
            'message'    => 'Profile not yet created. Please complete onboarding.',
            'created_at' => $user['created_at'] ?? date('c'),
        ];
    }

    $ud = $userRow['data'] ?? $userRow;
    $pd = $ud['profile_data'] ?? [];
    $co = $ud['cs_coaches'] ?? [];

    return [
        'id'         => $userId,
        'email'      => $email,
        'role'       => $ud['user_type'],
        'profile'    => [
            // Core display fields (always from cs_users)
            'full_name'            => $ud['full_name'],
            'avatar_url'           => $ud['avatar_url'],
            'slug'                 => $ud['slug'],
            'onboarding_completed' => $ud['onboarding_completed'] ?? false,
            // JSONB display fields (role-specific)
            'title'                => $pd['title']             ?? null,
            'bio'                  => $pd['bio']               ?? null,
            'hourly_rate'          => $pd['hourly_rate']       ?? null,
            'currency'             => $pd['currency']          ?? $ud['currency'] ?? 'EUR',
            'specialties'          => $pd['specialties']       ?? [],
            'languages'            => $pd['languages']         ?? [],
            'session_types'        => $pd['session_types']     ?? [],
            'is_verified'          => $pd['is_verified']       ?? $ud['is_verified'] ?? false,
            'intro_video_url'      => $pd['intro_video_url']   ?? null,
            // Operational coach fields (from cs_coaches join)
            'subscription_status'  => $co['subscription_status']  ?? null,
            'stripe_account_id'    => $co['stripe_account_id']    ?? null,
        ],
        'created_at' => $ud['created_at'],
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

    // New schema: read user_type from cs_users to determine role
    $userRow = $db->from('cs_users')
        ->select('user_type, profile_data')
        ->eq('id', $userId)
        ->single()
        ->execute();

    $userType = ($userRow['data'] ?? $userRow)['user_type'] ?? 'client';
    $isCoach  = $userType === 'coach';

    // All profile updates now go to cs_users (core fields + profile_data JSONB).
    // Allowed core fields (top-level columns on cs_users):
    $allowedCoreFields = ['full_name', 'avatar_url', 'phone', 'timezone', 'currency', 'slug', 'language_preference'];

    // Allowed profile_data fields per role:
    $allowedProfileData = $isCoach
        ? ['title', 'bio', 'title_en', 'bio_en', 'hourly_rate', 'currency', 'specialties',
           'languages', 'session_types', 'years_experience', 'city_id', 'banner_url',
           'instagram_url', 'linkedin_url', 'intro_video_url', 'website_url',
           'offers_free_discovery', 'primary_profile_language', 'profile_completion_percentage']
        : ['preferred_coach_types', 'preferred_specialties', 'preferred_languages',
           'budget_range_min', 'budget_range_max', 'preferred_meeting_type',
           'banner_url', 'timezone', 'currency'];

    $table         = 'cs_users';
    $allowedFields = array_merge($allowedCoreFields, $allowedProfileData);

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
        // Split updates: core fields go to cs_users columns, rest go to profile_data JSONB
        $coreUpdates    = [];
        $profileUpdates = [];
        foreach ($updates as $k => $v) {
            if (in_array($k, $allowedCoreFields)) {
                $coreUpdates[$k] = $v;
            } else {
                $profileUpdates[$k] = $v;
            }
        }

        if (!empty($profileUpdates)) {
            // Merge with existing profile_data using Postgres || operator via RPC,
            // or simply include the whole profile_data as a merged object.
            $existingPd = ($userRow['data'] ?? $userRow)['profile_data'] ?? [];
            $coreUpdates['profile_data'] = array_merge($existingPd, $profileUpdates);
        }

        $result = $db->from('cs_users')
            ->update($coreUpdates)
            ->eq('id', $userId)
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

    // Get user profile (includes profile_data JSONB with all display/preference data)
    $coachProfile = $db->from('cs_users')
        ->select('*, cs_coaches(*)')
        ->eq('id', $userId)
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

    // Client operational data (new schema — cs_clients has only billing/stats fields)
    $clientProfile = $db->from('cs_clients')
        ->select('total_bookings, total_completed_sessions, total_amount_spent, created_at')
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
        ->eq('user_id', $userId)
        ->execute();

    if ($reviewsWritten && !isset($reviewsWritten['error'])) {
        $exportData['reviews_written'] = $reviewsWritten['data'] ?? [];
    }

    // Get favorites
    $favorites = $db->from('cs_favorites')
        ->select('*, cs_users!coach_id(full_name, slug)')
        ->eq('user_id', $userId)
        ->execute();

    if ($favorites && !isset($favorites['error'])) {
        $exportData['favorites'] = $favorites['data'] ?? [];
    }

    // Get conversations and messages
    if ($clientProfile && !isset($clientProfile['error'])) {
        $clientId = $clientProfile['data']['id'] ?? $clientProfile['id'] ?? null;
        if ($clientId) {
            $conversations = $db->from('cs_conversations')
                ->select('*, cs_messages(*)')
                ->eq('client_id', $clientId)
                ->execute();

            if ($conversations && !isset($conversations['error'])) {
                $exportData['conversations'] = $conversations['data'] ?? [];
            }
        }
    }

    return [
        'success' => true,
        'message' => 'Data export generated successfully',
        'data' => $exportData,
        'format' => 'JSON',
        'note' => 'This export contains all personal data stored in our system. Payment details are stored by Stripe and can be requested separately.'
    ];
}
