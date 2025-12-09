<?php
/**
 * CoachSearching - Stripe Webhook Handler
 *
 * Handles Stripe webhook events with proper signature verification.
 * Endpoint: POST /webhook.php
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/Database.php';

/**
 * Verify Stripe webhook signature
 * Based on Stripe's signature verification algorithm
 *
 * @param string $payload Raw request body
 * @param string $sigHeader Stripe-Signature header value
 * @param string $secret Webhook signing secret
 * @param int $tolerance Maximum timestamp difference in seconds
 * @return bool True if signature is valid
 * @throws Exception If signature verification fails
 */
function verifyStripeSignature($payload, $sigHeader, $secret, $tolerance = 300) {
    if (empty($sigHeader)) {
        throw new Exception('Missing Stripe-Signature header');
    }

    // Parse the signature header
    $parts = explode(',', $sigHeader);
    $timestamp = null;
    $signatures = [];

    foreach ($parts as $part) {
        $kv = explode('=', trim($part), 2);
        if (count($kv) === 2) {
            if ($kv[0] === 't') {
                $timestamp = (int)$kv[1];
            } elseif ($kv[0] === 'v1') {
                $signatures[] = $kv[1];
            }
        }
    }

    if ($timestamp === null) {
        throw new Exception('Unable to extract timestamp from signature header');
    }

    if (empty($signatures)) {
        throw new Exception('No valid signatures found in header');
    }

    // Check timestamp tolerance (prevent replay attacks)
    $currentTime = time();
    if ($timestamp < ($currentTime - $tolerance)) {
        throw new Exception('Timestamp outside tolerance window');
    }

    // Compute expected signature
    $signedPayload = $timestamp . '.' . $payload;
    $expectedSignature = hash_hmac('sha256', $signedPayload, $secret);

    // Compare signatures (timing-safe)
    $valid = false;
    foreach ($signatures as $sig) {
        if (hash_equals($expectedSignature, $sig)) {
            $valid = true;
            break;
        }
    }

    if (!$valid) {
        throw new Exception('Signature verification failed');
    }

    return true;
}

// Get raw POST body
$payload = @file_get_contents('php://input');
$sigHeader = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';

header('Content-Type: application/json');

// Verify webhook signature
try {
    // Only verify signature in production (skip if secret is placeholder)
    if (STRIPE_WEBHOOK_SECRET && STRIPE_WEBHOOK_SECRET !== 'whsec_...') {
        verifyStripeSignature($payload, $sigHeader, STRIPE_WEBHOOK_SECRET);
    } else {
        // Log warning in development
        error_log("WARNING: Stripe webhook signature verification skipped - set STRIPE_WEBHOOK_SECRET");
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => 'Webhook signature verification failed: ' . $e->getMessage()]);
    error_log("Stripe webhook signature error: " . $e->getMessage());
    exit;
}

// Parse the event
$event = json_decode($payload, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON payload']);
    exit;
}

$eventType = $event['type'] ?? '';
$eventData = $event['data']['object'] ?? [];

// Log the event for debugging
error_log("Stripe webhook received: " . $eventType);

try {
    $db = new Database();

    switch ($eventType) {
        case 'checkout.session.completed':
            // Payment successful - confirm booking
            $paymentIntentId = $eventData['payment_intent'] ?? null;

            if ($paymentIntentId) {
                $response = $db->request('POST', '/rpc/confirm_booking_by_intent', [
                    'intent_id' => $paymentIntentId
                ]);

                if ($response['status'] < 200 || $response['status'] >= 300) {
                    error_log("Failed to confirm booking for intent: $paymentIntentId");
                    http_response_code(500);
                    echo json_encode(['error' => 'Failed to confirm booking']);
                    exit;
                }

                error_log("Booking confirmed for payment intent: $paymentIntentId");
            }
            break;

        case 'payment_intent.succeeded':
            // Payment intent succeeded - update booking status
            $paymentIntentId = $eventData['id'] ?? null;
            $metadata = $eventData['metadata'] ?? [];

            if (!empty($metadata['booking_id'])) {
                $db->from('cs_bookings')
                    ->update([
                        'payment_status' => 'paid',
                        'stripe_payment_intent_id' => $paymentIntentId
                    ])
                    ->eq('id', $metadata['booking_id'])
                    ->execute();

                error_log("Booking payment confirmed: " . $metadata['booking_id']);
            }

            if (!empty($metadata['package_id'])) {
                $db->from('cs_booking_packages')
                    ->update([
                        'status' => 'active',
                        'payment_status' => 'paid',
                        'purchased_at' => date('c')
                    ])
                    ->eq('id', $metadata['package_id'])
                    ->execute();

                error_log("Package activated: " . $metadata['package_id']);
            }
            break;

        case 'payment_intent.payment_failed':
            // Handle failed payment
            $paymentIntentId = $eventData['id'] ?? null;
            $errorMessage = $eventData['last_payment_error']['message'] ?? 'Payment failed';
            $metadata = $eventData['metadata'] ?? [];

            if (!empty($metadata['booking_id'])) {
                $db->from('cs_bookings')
                    ->update([
                        'payment_status' => 'failed',
                        'payment_error' => $errorMessage
                    ])
                    ->eq('id', $metadata['booking_id'])
                    ->execute();
            }

            error_log("Payment failed for intent $paymentIntentId: $errorMessage");
            break;

        case 'account.updated':
            // Stripe Connect account updated
            $accountId = $eventData['id'] ?? null;
            $chargesEnabled = $eventData['charges_enabled'] ?? false;
            $payoutsEnabled = $eventData['payouts_enabled'] ?? false;
            $detailsSubmitted = $eventData['details_submitted'] ?? false;

            if ($accountId) {
                $db->from('cs_coach_stripe_accounts')
                    ->update([
                        'charges_enabled' => $chargesEnabled,
                        'payouts_enabled' => $payoutsEnabled,
                        'details_submitted' => $detailsSubmitted,
                        'requirements' => json_encode([
                            'currently_due' => $eventData['requirements']['currently_due'] ?? [],
                            'eventually_due' => $eventData['requirements']['eventually_due'] ?? [],
                            'disabled_reason' => $eventData['requirements']['disabled_reason'] ?? null
                        ])
                    ])
                    ->eq('stripe_account_id', $accountId)
                    ->execute();

                error_log("Stripe account updated: $accountId (charges: $chargesEnabled, payouts: $payoutsEnabled)");
            }
            break;

        case 'charge.refunded':
            // Handle refund
            $paymentIntentId = $eventData['payment_intent'] ?? null;

            if ($paymentIntentId) {
                $db->from('cs_bookings')
                    ->update(['payment_status' => 'refunded'])
                    ->eq('stripe_payment_intent_id', $paymentIntentId)
                    ->execute();

                error_log("Charge refunded for payment intent: $paymentIntentId");
            }
            break;

        case 'charge.dispute.created':
            // Handle dispute - requires attention
            $chargeId = $eventData['charge'] ?? null;
            error_log("ALERT: Charge dispute created for charge: $chargeId");
            // TODO: Send admin notification
            break;

        default:
            // Log unhandled event types for future implementation
            error_log("Unhandled Stripe webhook event: $eventType");
    }

    echo json_encode(['received' => true]);

} catch (Exception $e) {
    error_log("Stripe webhook processing error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}
