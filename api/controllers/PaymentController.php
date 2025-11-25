<?php
// api/controllers/PaymentController.php

class PaymentController {
    private $db;

    public function __construct() {
        $this->db = new Database();
    }

    // Create Stripe Checkout Session
    public function createCheckoutSession($userId) {
        if (!$userId) {
            http_response_code(401);
            echo json_encode(["error" => "Unauthorized"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data['coach_id']) || !isset($data['amount'])) {
            http_response_code(400);
            echo json_encode(["error" => "Missing required fields"]);
            return;
        }

        // This would normally call Stripe API
        // For now, return a mock session
        // In production:
        // \Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);
        // $session = \Stripe\Checkout\Session::create([...]);

        echo json_encode([
            "sessionId" => "mock_session_" . uniqid(),
            "url" => "https://checkout.stripe.com/pay/mock"
        ]);
    }

    // Initiate Stripe Connect OAuth
    public function connectOAuth($userId) {
        if (!$userId) {
            http_response_code(401);
            echo json_encode(["error" => "Unauthorized"]);
            return;
        }

        $state = base64_encode(json_encode(['user_id' => $userId]));
        $connectUrl = "https://connect.stripe.com/oauth/authorize?" . http_build_query([
            'response_type' => 'code',
            'client_id' => STRIPE_CONNECT_CLIENT_ID,
            'scope' => 'read_write',
            'state' => $state
        ]);

        echo json_encode(["url" => $connectUrl]);
    }

    // Handle Stripe Connect OAuth Callback
    public function connectCallback() {
        $code = $_GET['code'] ?? null;
        $state = $_GET['state'] ?? null;

        if (!$code) {
            http_response_code(400);
            echo json_encode(["error" => "Missing authorization code"]);
            return;
        }

        // Exchange code for access token
        // \Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);
        // $resp = \Stripe\OAuth::token(['grant_type' => 'authorization_code', 'code' => $code]);
        // $stripe_account_id = $resp->stripe_user_id;

        // Update coach profile
        $stateData = json_decode(base64_decode($state), true);
        $userId = $stateData['user_id'] ?? null;

        // Mock response for now
        echo json_encode(["message" => "Connected successfully", "stripe_account_id" => "acct_mock_" . uniqid()]);
    }
}
