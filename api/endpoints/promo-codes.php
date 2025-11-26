<?php
/**
 * Promo Codes Endpoints
 * GET /promo-codes/active - Get active promo codes (public)
 * POST /promo-codes/validate - Validate promo code
 * POST /promo-codes/apply - Apply promo code to booking
 * GET /promo-codes - Get all promo codes (admin)
 * POST /promo-codes - Create promo code (admin)
 * PATCH /promo-codes/{id} - Update promo code (admin)
 * DELETE /promo-codes/{id} - Deactivate promo code (admin)
 */

function handlePromoCodes($method, $id, $action, $input) {
    if ($id === 'active' && $method === 'GET') {
        getActivePromoCodes();
    } elseif ($id === 'validate' && $method === 'POST') {
        validatePromoCode($input);
    } elseif ($id === 'apply' && $method === 'POST') {
        applyPromoCode($input);
    } elseif ($method === 'GET' && !$id) {
        getAllPromoCodes();
    } elseif ($method === 'POST' && !$id) {
        createPromoCode($input);
    } elseif ($method === 'PATCH' && $id) {
        updatePromoCode($id, $input);
    } elseif ($method === 'DELETE' && $id) {
        deactivatePromoCode($id);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Promo code endpoint not found']);
    }
}

function getActivePromoCodes() {
    // TODO: Replace with actual Supabase query
    echo json_encode([
        'promo_codes' => [
            [
                'id' => '1',
                'code' => 'WELCOME20',
                'description' => 'Get 20% off your first session',
                'discount_type' => 'percentage',
                'discount_value' => 20,
                'valid_until' => '2025-12-31'
            ],
            [
                'id' => '2',
                'code' => 'HOLIDAY50',
                'description' => '€50 off any session',
                'discount_type' => 'fixed',
                'discount_value' => 50,
                'valid_until' => '2025-12-25'
            ]
        ]
    ]);
}

function validatePromoCode($input) {
    // TODO: Implement actual Supabase query
    $code = strtoupper($input['code'] ?? '');
    $booking_amount = $input['booking_amount'] ?? 0;
    
    if (empty($code)) {
        http_response_code(400);
        echo json_encode(['error' => 'Promo code is required']);
        return;
    }
    
    // Mock validation - replace with actual DB check
    $valid_codes = ['WELCOME20', 'HOLIDAY50', 'SAVE10'];
    
    if (!in_array($code, $valid_codes)) {
        echo json_encode([
            'valid' => false,
            'error' => 'Invalid promo code'
        ]);
        return;
    }
    
    // Mock discount calculation
    $discount = 0;
    if ($code === 'WELCOME20') {
        $discount = $booking_amount * 0.20;
    } elseif ($code === 'HOLIDAY50') {
        $discount = min(50, $booking_amount);
    } elseif ($code === 'SAVE10') {
        $discount = min(10, $booking_amount);
    }
    
    echo json_encode([
        'valid' => true,
        'code' => $code,
        'discount_amount' => $discount,
        'final_amount' => $booking_amount - $discount
    ]);
}

function applyPromoCode($input) {
    // TODO: Implement actual Supabase insert/update
    echo json_encode([
        'success' => true,
        'message' => 'Promo code applied',
        'discount_amount' => $input['discount_amount'] ?? 0
    ]);
}

function getAllPromoCodes() {
    // TODO: Replace with actual Supabase query (admin only)
    echo json_encode([
        'promo_codes' => [
            [
                'id' => '1',
                'code' => 'WELCOME20',
                'description' => 'Welcome discount',
                'discount_type' => 'percentage',
                'discount_value' => 20,
                'usage_limit' => 1000,
                'times_used' => 234,
                'active' => true
            ]
        ]
    ]);
}

function createPromoCode($input) {
    // TODO: Implement actual Supabase insert (admin only)
    echo json_encode([
        'success' => true,
        'message' => 'Promo code created',
        'promo_code_id' => uniqid('promo_')
    ]);
}

function updatePromoCode($id, $input) {
    // TODO: Implement actual Supabase update (admin only)
    echo json_encode([
        'success' => true,
        'message' => 'Promo code updated',
        'promo_code_id' => $id
    ]);
}

function deactivatePromoCode($id) {
    // TODO: Implement actual Supabase update (admin only)
    echo json_encode([
        'success' => true,
        'message' => 'Promo code deactivated',
        'promo_code_id' => $id
    ]);
}
