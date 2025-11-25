<?php
// api/webhook.php - Stripe Webhook Handler

require_once 'config.php';
require_once 'Database.php';

// Get raw POST body
$payload = @file_get_contents('php://input');
$sig_header = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';

// Verify webhook signature (in production, use actual secret)
// $event = \Stripe\Webhook::constructEvent($payload, $sig_header, STRIPE_WEBHOOK_SECRET);

// For now, parse directly
$event = json_decode($payload, true);

header('Content-Type: application/json');

try {
    $db = new Database();

    switch ($event['type'] ?? '') {
        case 'checkout.session.completed':
            // Payment successful - confirm booking
            $session = $event['data']['object'];
            $paymentIntentId = $session['payment_intent'] ?? null;

            if ($paymentIntentId) {
                // Call RPC to confirm booking
                $response = $db->request('POST', '/rpc/confirm_booking_by_intent', [
                    'intent_id' => $paymentIntentId
                ]);

                if ($response['status'] < 200 || $response['status'] >= 300) {
                    http_response_code(500);
                    echo json_encode(["error" => "Failed to confirm booking"]);
                    exit;
                }
            }
            break;

        case 'payment_intent.payment_failed':
            // Handle failed payment
            $intent = $event['data']['object'];
            error_log("Payment failed: " . $intent['id']);
            break;

        case 'account.updated':
            // Stripe Connect account updated
            $account = $event['data']['object'];
            error_log("Account updated: " . $account['id']);
            break;

        default:
            // Unexpected event type
            error_log("Unhandled event type: " . ($event['type'] ?? 'unknown'));
    }

    echo json_encode(["received" => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
