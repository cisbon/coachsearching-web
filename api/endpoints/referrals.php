<?php
/**
 * Referrals Endpoints
 * GET /referrals/code - Get user's referral code
 * GET /referrals/stats - Get referral statistics
 * GET /referrals/list - Get list of referred users
 * POST /referrals/apply - Apply referral code
 * POST /referrals/validate - Validate referral code
 */

function handleReferrals($method, $id, $action, $input) {
    if ($method !== 'GET' && $method !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        return;
    }
    
    switch ($id) {
        case 'code':
            if ($method === 'GET') getReferralCode();
            break;
        case 'stats':
            if ($method === 'GET') getReferralStats();
            break;
        case 'list':
            if ($method === 'GET') getReferralList();
            break;
        case 'apply':
            if ($method === 'POST') applyReferralCode($input);
            break;
        case 'validate':
            if ($method === 'POST') validateReferralCode($input);
            break;
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Referral endpoint not found']);
    }
}

function getReferralCode() {
    // TODO: Replace with actual Supabase query
    echo json_encode([
        'code' => 'COACH' . strtoupper(substr(md5(uniqid()), 0, 6)),
        'share_url' => 'https://coachsearching.com?ref=COACH123ABC'
    ]);
}

function getReferralStats() {
    // TODO: Replace with actual Supabase query
    echo json_encode([
        'total_referrals' => 12,
        'successful_referrals' => 8,
        'pending_referrals' => 4,
        'total_rewards' => 80.00,
        'available_balance' => 50.00,
        'lifetime_earnings' => 120.00
    ]);
}

function getReferralList() {
    // TODO: Replace with actual Supabase query
    echo json_encode([
        'referrals' => [
            [
                'id' => '1',
                'referred_user' => 'John D.',
                'status' => 'completed',
                'reward_amount' => 10.00,
                'date' => '2025-11-15'
            ],
            [
                'id' => '2',
                'referred_user' => 'Emma S.',
                'status' => 'completed',
                'reward_amount' => 10.00,
                'date' => '2025-11-18'
            ],
            [
                'id' => '3',
                'referred_user' => 'Michael K.',
                'status' => 'pending',
                'reward_amount' => 0.00,
                'date' => '2025-11-22'
            ]
        ]
    ]);
}

function applyReferralCode($input) {
    // TODO: Implement actual Supabase insert/update
    $code = $input['code'] ?? '';
    
    if (empty($code)) {
        http_response_code(400);
        echo json_encode(['error' => 'Referral code is required']);
        return;
    }
    
    // Mock validation
    echo json_encode([
        'success' => true,
        'message' => 'Referral code applied',
        'discount' => 10.00
    ]);
}

function validateReferralCode($input) {
    // TODO: Implement actual Supabase query
    $code = $input['code'] ?? '';
    
    if (empty($code)) {
        http_response_code(400);
        echo json_encode(['error' => 'Referral code is required']);
        return;
    }
    
    // Mock validation
    echo json_encode([
        'valid' => true,
        'discount_amount' => 10.00,
        'discount_type' => 'fixed'
    ]);
}
