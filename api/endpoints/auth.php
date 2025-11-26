<?php
/**
 * Auth Endpoints
 * GET /auth/me - Get current user profile
 * PATCH /auth/me - Update current user profile
 * POST /auth/change-password - Change password
 * DELETE /auth/me - Request account deletion
 * POST /auth/export-data - Export user data (GDPR)
 */

function handleAuth($method, $id, $action, $input) {
    if ($id === 'me' && $method === 'GET') {
        getCurrentUser();
    } elseif ($id === 'me' && $method === 'PATCH') {
        updateCurrentUser($input);
    } elseif ($id === 'me' && $method === 'DELETE') {
        requestAccountDeletion();
    } elseif ($id === 'change-password' && $method === 'POST') {
        changePassword($input);
    } elseif ($id === 'export-data' && $method === 'POST') {
        exportUserData();
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Auth endpoint not found']);
    }
}

function getCurrentUser() {
    // TODO: Get user from JWT token and query Supabase
    $user = [
        'id' => 'user123',
        'email' => 'john@example.com',
        'name' => 'John Doe',
        'role' => 'client',
        'avatar_url' => null,
        'created_at' => '2025-09-01T10:00:00Z',
        'onboarding_completed' => true
    ];
    
    echo json_encode($user);
}

function updateCurrentUser($input) {
    // TODO: Implement actual Supabase update
    echo json_encode([
        'success' => true,
        'message' => 'Profile updated',
        'user' => [
            'id' => 'user123',
            'name' => $input['name'] ?? 'John Doe',
            'email' => $input['email'] ?? 'john@example.com'
        ]
    ]);
}

function changePassword($input) {
    // TODO: Implement actual password change with Supabase Auth
    $old_password = $input['old_password'] ?? '';
    $new_password = $input['new_password'] ?? '';
    
    if (empty($old_password) || empty($new_password)) {
        http_response_code(400);
        echo json_encode(['error' => 'Old and new passwords are required']);
        return;
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Password changed successfully'
    ]);
}

function requestAccountDeletion() {
    // TODO: Implement actual account deletion request
    echo json_encode([
        'success' => true,
        'message' => 'Account deletion requested. Your account will be deleted in 30 days.'
    ]);
}

function exportUserData() {
    // TODO: Implement actual data export (GDPR compliance)
    $data = [
        'user' => [
            'id' => 'user123',
            'email' => 'john@example.com',
            'name' => 'John Doe',
            'created_at' => '2025-09-01T10:00:00Z'
        ],
        'bookings' => [],
        'reviews' => [],
        'payments' => []
    ];
    
    echo json_encode([
        'success' => true,
        'message' => 'Data export prepared',
        'data' => $data
    ]);
}
