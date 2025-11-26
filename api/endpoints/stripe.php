<?php
/**
 * CoachSearching - Stripe Connect API Endpoint
 *
 * Handles Stripe Connect integration for coach payouts:
 * - Onboarding coaches to Stripe Express accounts
 * - Managing connected accounts
 * - Processing webhooks
 * - Dashboard links
 *
 * Endpoints:
 * POST /stripe/connect/create - Create Connect account for coach
 * GET /stripe/connect/onboard - Get onboarding link
 * GET /stripe/connect/status - Check account status
 * GET /stripe/connect/dashboard - Get dashboard link
 * POST /stripe/webhooks - Handle Stripe webhooks
 * POST /stripe/packages/create-intent - Create payment intent for package
 */

require_once __DIR__ . '/../config.php';

// Platform commission rates
define('PLATFORM_FEE_PERCENT', 0.15); // 15% for regular coaches
define('FOUNDING_COACH_FEE_PERCENT', 0.10); // 10% for founding coaches

/**
 * Main handler for Stripe operations
 */
function handleStripe($method, $action, $subAction, $input) {
    switch ($method) {
        case 'GET':
            if ($action === 'connect') {
                if ($subAction === 'onboard') {
                    return getOnboardingLink();
                } elseif ($subAction === 'status') {
                    return getAccountStatus();
                } elseif ($subAction === 'dashboard') {
                    return getDashboardLink();
                }
            }
            return ['error' => 'Invalid request', 'status' => 400];

        case 'POST':
            if ($action === 'connect' && $subAction === 'create') {
                return createConnectAccount($input);
            } elseif ($action === 'webhooks') {
                return handleWebhooks();
            } elseif ($action === 'packages' && $subAction === 'create-intent') {
                return createPackagePaymentIntent($input);
            } elseif ($action === 'refund' && $subAction === 'satisfaction') {
                return processSatisfactionRefund($input);
            }
            return ['error' => 'Invalid action', 'status' => 400];

        default:
            return ['error' => 'Method not allowed', 'status' => 405];
    }
}

/**
 * Create a new Stripe Connect Express account for a coach
 */
function createConnectAccount($input) {
    global $supabase;

    if (empty($input['coach_id'])) {
        return ['error' => 'Coach ID is required', 'status' => 400];
    }

    $coachId = $input['coach_id'];

    // Get coach details
    $coach = $supabase->from('cs_coaches')
        ->select('id, user_id, display_name, email, country')
        ->eq('id', $coachId)
        ->single()
        ->execute();

    if (!$coach || isset($coach['error'])) {
        return ['error' => 'Coach not found', 'status' => 404];
    }

    // Check if already has a Stripe account
    $existingAccount = $supabase->from('cs_coach_stripe_accounts')
        ->select('id, stripe_account_id')
        ->eq('coach_id', $coachId)
        ->single()
        ->execute();

    if ($existingAccount && !isset($existingAccount['error'])) {
        return ['error' => 'Coach already has a Stripe account', 'status' => 409];
    }

    // Determine country code (default to Netherlands for EU)
    $countryCode = mapCountryToCode($coach['country'] ?? 'Netherlands');

    try {
        $stripe = new \Stripe\StripeClient(STRIPE_SECRET_KEY);

        // Create Express account
        $account = $stripe->accounts->create([
            'type' => 'express',
            'country' => $countryCode,
            'email' => $coach['email'],
            'capabilities' => [
                'card_payments' => ['requested' => true],
                'transfers' => ['requested' => true],
                'ideal_payments' => ['requested' => true], // Popular in NL/BE
                'bancontact_payments' => ['requested' => true], // Popular in BE
                'sepa_debit_payments' => ['requested' => true]
            ],
            'business_type' => 'individual',
            'business_profile' => [
                'mcc' => '8299', // Educational Services
                'name' => $coach['display_name'],
                'product_description' => 'Professional coaching services',
                'url' => SITE_URL . '/coaches/' . $coachId
            ],
            'metadata' => [
                'coach_id' => $coachId,
                'platform' => 'coachsearching'
            ]
        ]);

        // Check if this is a founding coach (promo code applied)
        $isFoundingCoach = !empty($input['founding_coach']) ||
            checkFoundingCoachStatus($coachId);

        // Store the account in our database
        $supabase->from('cs_coach_stripe_accounts')
            ->insert([
                'coach_id' => $coachId,
                'stripe_account_id' => $account->id,
                'account_type' => 'express',
                'country' => $countryCode,
                'charges_enabled' => false,
                'payouts_enabled' => false,
                'details_submitted' => false,
                'founding_coach' => $isFoundingCoach,
                'platform_fee_percent' => $isFoundingCoach ? FOUNDING_COACH_FEE_PERCENT : PLATFORM_FEE_PERCENT
            ])
            ->execute();

        // Generate onboarding link
        $accountLink = $stripe->accountLinks->create([
            'account' => $account->id,
            'refresh_url' => SITE_URL . '/dashboard/payments?refresh=true',
            'return_url' => SITE_URL . '/dashboard/payments?onboarding=complete',
            'type' => 'account_onboarding'
        ]);

        return [
            'success' => true,
            'account_id' => $account->id,
            'onboarding_url' => $accountLink->url,
            'expires_at' => date('c', $accountLink->expires_at)
        ];

    } catch (\Stripe\Exception\ApiErrorException $e) {
        error_log("Stripe Connect error: " . $e->getMessage());
        return ['error' => 'Failed to create payment account: ' . $e->getMessage(), 'status' => 500];
    }
}

/**
 * Get a new onboarding link for an existing account
 */
function getOnboardingLink() {
    global $supabase;

    $coachId = $_GET['coach_id'] ?? null;
    if (!$coachId) {
        return ['error' => 'Coach ID is required', 'status' => 400];
    }

    // Get Stripe account
    $stripeAccount = $supabase->from('cs_coach_stripe_accounts')
        ->select('stripe_account_id, details_submitted')
        ->eq('coach_id', $coachId)
        ->single()
        ->execute();

    if (!$stripeAccount || isset($stripeAccount['error'])) {
        return ['error' => 'No payment account found. Please create one first.', 'status' => 404];
    }

    try {
        $stripe = new \Stripe\StripeClient(STRIPE_SECRET_KEY);

        $linkType = $stripeAccount['details_submitted'] ? 'account_update' : 'account_onboarding';

        $accountLink = $stripe->accountLinks->create([
            'account' => $stripeAccount['stripe_account_id'],
            'refresh_url' => SITE_URL . '/dashboard/payments?refresh=true',
            'return_url' => SITE_URL . '/dashboard/payments?onboarding=complete',
            'type' => $linkType
        ]);

        return [
            'success' => true,
            'onboarding_url' => $accountLink->url,
            'expires_at' => date('c', $accountLink->expires_at)
        ];

    } catch (\Stripe\Exception\ApiErrorException $e) {
        error_log("Stripe onboarding link error: " . $e->getMessage());
        return ['error' => 'Failed to generate onboarding link', 'status' => 500];
    }
}

/**
 * Get the current status of a coach's Stripe account
 */
function getAccountStatus() {
    global $supabase;

    $coachId = $_GET['coach_id'] ?? null;
    if (!$coachId) {
        return ['error' => 'Coach ID is required', 'status' => 400];
    }

    // Get our stored account info
    $stripeAccount = $supabase->from('cs_coach_stripe_accounts')
        ->select('*')
        ->eq('coach_id', $coachId)
        ->single()
        ->execute();

    if (!$stripeAccount || isset($stripeAccount['error'])) {
        return [
            'has_account' => false,
            'message' => 'No payment account found'
        ];
    }

    try {
        $stripe = new \Stripe\StripeClient(STRIPE_SECRET_KEY);

        // Get fresh status from Stripe
        $account = $stripe->accounts->retrieve($stripeAccount['stripe_account_id']);

        // Update our database with latest status
        $updateData = [
            'charges_enabled' => $account->charges_enabled,
            'payouts_enabled' => $account->payouts_enabled,
            'details_submitted' => $account->details_submitted
        ];

        if ($account->requirements) {
            $updateData['requirements'] = json_encode([
                'currently_due' => $account->requirements->currently_due ?? [],
                'eventually_due' => $account->requirements->eventually_due ?? [],
                'disabled_reason' => $account->requirements->disabled_reason
            ]);
        }

        $supabase->from('cs_coach_stripe_accounts')
            ->update($updateData)
            ->eq('coach_id', $coachId)
            ->execute();

        // Determine overall status
        $status = 'incomplete';
        if ($account->charges_enabled && $account->payouts_enabled) {
            $status = 'active';
        } elseif ($account->details_submitted) {
            $status = 'pending_verification';
        }

        return [
            'has_account' => true,
            'account_id' => $stripeAccount['stripe_account_id'],
            'status' => $status,
            'charges_enabled' => $account->charges_enabled,
            'payouts_enabled' => $account->payouts_enabled,
            'details_submitted' => $account->details_submitted,
            'founding_coach' => $stripeAccount['founding_coach'],
            'platform_fee_percent' => (float)$stripeAccount['platform_fee_percent'] * 100,
            'requirements' => [
                'currently_due' => $account->requirements->currently_due ?? [],
                'eventually_due' => $account->requirements->eventually_due ?? [],
                'disabled_reason' => $account->requirements->disabled_reason
            ],
            'country' => $account->country,
            'default_currency' => $account->default_currency
        ];

    } catch (\Stripe\Exception\ApiErrorException $e) {
        error_log("Stripe status check error: " . $e->getMessage());
        return ['error' => 'Failed to check account status', 'status' => 500];
    }
}

/**
 * Get Stripe Express dashboard link for coach
 */
function getDashboardLink() {
    global $supabase;

    $coachId = $_GET['coach_id'] ?? null;
    if (!$coachId) {
        return ['error' => 'Coach ID is required', 'status' => 400];
    }

    // Get Stripe account
    $stripeAccount = $supabase->from('cs_coach_stripe_accounts')
        ->select('stripe_account_id, charges_enabled')
        ->eq('coach_id', $coachId)
        ->single()
        ->execute();

    if (!$stripeAccount || isset($stripeAccount['error'])) {
        return ['error' => 'No payment account found', 'status' => 404];
    }

    if (!$stripeAccount['charges_enabled']) {
        return ['error' => 'Account setup not complete', 'status' => 400];
    }

    try {
        $stripe = new \Stripe\StripeClient(STRIPE_SECRET_KEY);

        $loginLink = $stripe->accounts->createLoginLink(
            $stripeAccount['stripe_account_id']
        );

        return [
            'success' => true,
            'dashboard_url' => $loginLink->url
        ];

    } catch (\Stripe\Exception\ApiErrorException $e) {
        error_log("Stripe dashboard link error: " . $e->getMessage());
        return ['error' => 'Failed to generate dashboard link', 'status' => 500];
    }
}

/**
 * Create payment intent for session package purchase
 */
function createPackagePaymentIntent($input) {
    global $supabase;

    $required = ['coach_id', 'total_sessions', 'session_duration_minutes',
                 'client_name', 'client_email'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            return ['error' => "Missing required field: $field", 'status' => 400];
        }
    }

    $coachId = $input['coach_id'];
    $totalSessions = (int)$input['total_sessions'];
    $durationMinutes = (int)$input['session_duration_minutes'];
    $clientId = $input['client_id'] ?? null;
    $clientName = htmlspecialchars(trim($input['client_name']), ENT_QUOTES, 'UTF-8');
    $clientEmail = htmlspecialchars(trim($input['client_email']), ENT_QUOTES, 'UTF-8');
    $clientTimezone = $input['client_timezone'] ?? 'Europe/Amsterdam';

    // Validate
    if (!in_array($totalSessions, [4, 6, 8, 10, 12])) {
        return ['error' => 'Invalid package size', 'status' => 400];
    }

    if (!in_array($durationMinutes, [60, 90, 120])) {
        return ['error' => 'Invalid session duration', 'status' => 400];
    }

    // Get coach pricing
    $coach = $supabase->from('cs_coaches')
        ->select('id, display_name, hourly_rate, currency')
        ->eq('id', $coachId)
        ->single()
        ->execute();

    if (!$coach || isset($coach['error'])) {
        return ['error' => 'Coach not found', 'status' => 404];
    }

    // Get coach's Stripe account
    $stripeAccount = $supabase->from('cs_coach_stripe_accounts')
        ->select('stripe_account_id, charges_enabled, founding_coach, platform_fee_percent')
        ->eq('coach_id', $coachId)
        ->single()
        ->execute();

    if (!$stripeAccount || !$stripeAccount['charges_enabled']) {
        return ['error' => 'Coach has not completed payment setup', 'status' => 400];
    }

    // Calculate pricing with package discount
    $hourlyRate = (float)$coach['hourly_rate'];
    $currency = strtolower($coach['currency'] ?? 'eur');
    $perSessionRate = ($hourlyRate / 60) * $durationMinutes;

    // Package discount based on size
    $discountPercent = getPackageDiscount($totalSessions);
    $discountedPerSession = $perSessionRate * (1 - $discountPercent);
    $totalAmount = $discountedPerSession * $totalSessions;
    $amountCents = (int)round($totalAmount * 100);

    // Platform fee
    $feePercent = (float)$stripeAccount['platform_fee_percent'];
    $platformFeeCents = (int)round($amountCents * $feePercent);
    $coachPayoutCents = $amountCents - $platformFeeCents;

    // Package expiration (6 months from purchase)
    $expiresAt = new DateTime('+6 months');

    // Create pending package record
    $packageData = [
        'coach_id' => $coachId,
        'client_id' => $clientId,
        'client_name' => $clientName,
        'client_email' => $clientEmail,
        'client_timezone' => $clientTimezone,
        'total_sessions' => $totalSessions,
        'sessions_remaining' => $totalSessions,
        'sessions_used' => 0,
        'session_duration_minutes' => $durationMinutes,
        'amount_cents' => $amountCents,
        'currency' => $currency,
        'platform_fee_cents' => $platformFeeCents,
        'coach_payout_cents' => $coachPayoutCents,
        'discount_percent' => (int)($discountPercent * 100),
        'status' => 'pending',
        'expires_at' => $expiresAt->format('c')
    ];

    $package = $supabase->from('cs_booking_packages')
        ->insert($packageData)
        ->execute();

    if (!$package || isset($package['error'])) {
        return ['error' => 'Failed to create package', 'status' => 500];
    }

    $packageRecord = $package[0];

    // Create Stripe PaymentIntent
    try {
        $stripe = new \Stripe\StripeClient(STRIPE_SECRET_KEY);

        $paymentIntent = $stripe->paymentIntents->create([
            'amount' => $amountCents,
            'currency' => $currency,
            'payment_method_types' => ['card', 'ideal', 'bancontact', 'sepa_debit'],
            'metadata' => [
                'package_id' => $packageRecord['id'],
                'coach_id' => $coachId,
                'client_email' => $clientEmail,
                'type' => 'package',
                'total_sessions' => $totalSessions
            ],
            'transfer_data' => [
                'destination' => $stripeAccount['stripe_account_id'],
                'amount' => $coachPayoutCents
            ],
            'description' => "Coaching package: {$totalSessions} sessions with {$coach['display_name']}"
        ]);

        // Update package with payment intent
        $supabase->from('cs_booking_packages')
            ->update(['stripe_payment_intent_id' => $paymentIntent->id])
            ->eq('id', $packageRecord['id'])
            ->execute();

        return [
            'success' => true,
            'package_id' => $packageRecord['id'],
            'client_secret' => $paymentIntent->client_secret,
            'amount' => [
                'total_cents' => $amountCents,
                'per_session_cents' => (int)round($discountedPerSession * 100),
                'original_per_session_cents' => (int)round($perSessionRate * 100),
                'discount_percent' => (int)($discountPercent * 100),
                'savings_cents' => (int)round(($perSessionRate - $discountedPerSession) * $totalSessions * 100),
                'currency' => $currency,
                'formatted' => formatMoney($amountCents, $currency)
            ],
            'package' => [
                'total_sessions' => $totalSessions,
                'duration_minutes' => $durationMinutes,
                'expires_at' => $expiresAt->format('c')
            ]
        ];

    } catch (\Stripe\Exception\ApiErrorException $e) {
        // Clean up pending package
        $supabase->from('cs_booking_packages')
            ->delete()
            ->eq('id', $packageRecord['id'])
            ->execute();

        error_log("Stripe package error: " . $e->getMessage());
        return ['error' => 'Payment system error', 'status' => 500];
    }
}

/**
 * Process satisfaction guarantee refund
 */
function processSatisfactionRefund($input) {
    global $supabase;

    if (empty($input['booking_id'])) {
        return ['error' => 'Booking ID is required', 'status' => 400];
    }

    $bookingId = $input['booking_id'];
    $reason = htmlspecialchars(trim($input['reason'] ?? ''), ENT_QUOTES, 'UTF-8');

    // Get the booking
    $booking = $supabase->from('cs_bookings')
        ->select('*')
        ->eq('id', $bookingId)
        ->single()
        ->execute();

    if (!$booking || isset($booking['error'])) {
        return ['error' => 'Booking not found', 'status' => 404];
    }

    // Verify this is eligible for satisfaction guarantee
    if (!$booking['satisfaction_guarantee']) {
        return ['error' => 'This booking is not eligible for satisfaction guarantee', 'status' => 400];
    }

    if (!$booking['is_first_session']) {
        return ['error' => 'Satisfaction guarantee only applies to first sessions', 'status' => 400];
    }

    if ($booking['status'] !== 'completed') {
        return ['error' => 'Session must be completed to request refund', 'status' => 400];
    }

    if ($booking['payment_status'] !== 'paid') {
        return ['error' => 'No payment to refund', 'status' => 400];
    }

    // Check if already refunded
    if ($booking['payment_status'] === 'refunded') {
        return ['error' => 'Already refunded', 'status' => 400];
    }

    // Check time limit (within 48 hours of session completion)
    $completedAt = new DateTime($booking['completed_at']);
    $now = new DateTime();
    $hoursSinceCompletion = ($now->getTimestamp() - $completedAt->getTimestamp()) / 3600;

    if ($hoursSinceCompletion > 48) {
        return ['error' => 'Refund request must be made within 48 hours of session completion', 'status' => 400];
    }

    // Process refund
    try {
        $stripe = new \Stripe\StripeClient(STRIPE_SECRET_KEY);

        $refund = $stripe->refunds->create([
            'payment_intent' => $booking['stripe_payment_intent_id'],
            'reason' => 'requested_by_customer',
            'metadata' => [
                'type' => 'satisfaction_guarantee',
                'booking_id' => $bookingId,
                'reason' => $reason
            ]
        ]);

        // Update booking
        $supabase->from('cs_bookings')
            ->update([
                'payment_status' => 'refunded',
                'refund_amount_cents' => $booking['amount_cents'],
                'satisfaction_refund_reason' => $reason,
                'satisfaction_refund_at' => date('c')
            ])
            ->eq('id', $bookingId)
            ->execute();

        // Record the refund
        $supabase->from('cs_payment_records')
            ->insert([
                'booking_id' => $bookingId,
                'coach_id' => $booking['coach_id'],
                'stripe_refund_id' => $refund->id,
                'amount_cents' => -$booking['amount_cents'],
                'currency' => $booking['currency'],
                'status' => 'refunded',
                'refund_reason' => 'Satisfaction guarantee: ' . $reason
            ])
            ->execute();

        return [
            'success' => true,
            'message' => 'Refund processed successfully',
            'refund' => [
                'amount_cents' => $booking['amount_cents'],
                'formatted' => formatMoney($booking['amount_cents'], $booking['currency'])
            ]
        ];

    } catch (\Stripe\Exception\ApiErrorException $e) {
        error_log("Satisfaction refund error: " . $e->getMessage());
        return ['error' => 'Failed to process refund', 'status' => 500];
    }
}

/**
 * Handle Stripe webhooks
 */
function handleWebhooks() {
    global $supabase;

    $payload = file_get_contents('php://input');
    $sigHeader = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';

    try {
        $event = \Stripe\Webhook::constructEvent(
            $payload,
            $sigHeader,
            STRIPE_WEBHOOK_SECRET
        );
    } catch (\UnexpectedValueException $e) {
        return ['error' => 'Invalid payload', 'status' => 400];
    } catch (\Stripe\Exception\SignatureVerificationException $e) {
        return ['error' => 'Invalid signature', 'status' => 400];
    }

    // Handle the event
    switch ($event->type) {
        case 'account.updated':
            handleAccountUpdated($event->data->object);
            break;

        case 'payment_intent.succeeded':
            handlePaymentSucceeded($event->data->object);
            break;

        case 'payment_intent.payment_failed':
            handlePaymentFailed($event->data->object);
            break;

        case 'charge.refunded':
            handleChargeRefunded($event->data->object);
            break;

        default:
            // Log unhandled events for debugging
            error_log("Unhandled Stripe webhook: " . $event->type);
    }

    return ['received' => true];
}

/**
 * Handle account.updated webhook
 */
function handleAccountUpdated($account) {
    global $supabase;

    $supabase->from('cs_coach_stripe_accounts')
        ->update([
            'charges_enabled' => $account->charges_enabled,
            'payouts_enabled' => $account->payouts_enabled,
            'details_submitted' => $account->details_submitted,
            'requirements' => json_encode([
                'currently_due' => $account->requirements->currently_due ?? [],
                'eventually_due' => $account->requirements->eventually_due ?? [],
                'disabled_reason' => $account->requirements->disabled_reason
            ])
        ])
        ->eq('stripe_account_id', $account->id)
        ->execute();

    // If account is now fully active, notify the coach
    if ($account->charges_enabled && $account->payouts_enabled) {
        $stripeAccount = $supabase->from('cs_coach_stripe_accounts')
            ->select('coach_id, cs_coaches(email)')
            ->eq('stripe_account_id', $account->id)
            ->single()
            ->execute();

        if ($stripeAccount && isset($stripeAccount['cs_coaches'])) {
            $supabase->from('cs_notifications')
                ->insert([
                    'user_id' => $stripeAccount['coach_id'],
                    'type' => 'stripe_account_ready',
                    'data' => json_encode(['message' => 'Your payment account is now active!']),
                    'email' => $stripeAccount['cs_coaches']['email'],
                    'status' => 'pending'
                ])
                ->execute();
        }
    }
}

/**
 * Handle payment_intent.succeeded webhook
 */
function handlePaymentSucceeded($paymentIntent) {
    global $supabase;

    $metadata = $paymentIntent->metadata;

    // Check if this is a booking payment
    if (!empty($metadata->booking_id)) {
        $supabase->from('cs_bookings')
            ->update([
                'payment_status' => 'paid',
                'stripe_payment_intent_id' => $paymentIntent->id
            ])
            ->eq('id', $metadata->booking_id)
            ->execute();
    }

    // Check if this is a package payment
    if (!empty($metadata->package_id)) {
        $supabase->from('cs_booking_packages')
            ->update([
                'status' => 'active',
                'payment_status' => 'paid',
                'stripe_payment_intent_id' => $paymentIntent->id,
                'purchased_at' => date('c')
            ])
            ->eq('id', $metadata->package_id)
            ->execute();

        // Create payment record
        $package = $supabase->from('cs_booking_packages')
            ->select('*')
            ->eq('id', $metadata->package_id)
            ->single()
            ->execute();

        if ($package) {
            $supabase->from('cs_payment_records')
                ->insert([
                    'coach_id' => $package['coach_id'],
                    'package_id' => $package['id'],
                    'stripe_payment_intent_id' => $paymentIntent->id,
                    'amount_cents' => $package['amount_cents'],
                    'platform_fee_cents' => $package['platform_fee_cents'],
                    'coach_payout_cents' => $package['coach_payout_cents'],
                    'currency' => $package['currency'],
                    'status' => 'succeeded',
                    'payment_method' => $paymentIntent->payment_method_types[0] ?? 'card'
                ])
                ->execute();
        }
    }
}

/**
 * Handle payment_intent.payment_failed webhook
 */
function handlePaymentFailed($paymentIntent) {
    global $supabase;

    $metadata = $paymentIntent->metadata;

    if (!empty($metadata->booking_id)) {
        $supabase->from('cs_bookings')
            ->update([
                'payment_status' => 'failed',
                'payment_error' => $paymentIntent->last_payment_error->message ?? 'Payment failed'
            ])
            ->eq('id', $metadata->booking_id)
            ->execute();
    }

    if (!empty($metadata->package_id)) {
        $supabase->from('cs_booking_packages')
            ->update([
                'status' => 'payment_failed',
                'payment_error' => $paymentIntent->last_payment_error->message ?? 'Payment failed'
            ])
            ->eq('id', $metadata->package_id)
            ->execute();
    }
}

/**
 * Handle charge.refunded webhook
 */
function handleChargeRefunded($charge) {
    global $supabase;

    // The refund is usually already processed by our API
    // This is just for reconciliation
    $paymentIntentId = $charge->payment_intent;

    // Update any bookings with this payment intent
    $supabase->from('cs_bookings')
        ->update(['payment_status' => 'refunded'])
        ->eq('stripe_payment_intent_id', $paymentIntentId)
        ->eq('payment_status', 'paid')
        ->execute();
}

/**
 * Get package discount based on number of sessions
 */
function getPackageDiscount($totalSessions) {
    $discounts = [
        4 => 0.05,   // 5% off
        6 => 0.10,   // 10% off
        8 => 0.12,   // 12% off
        10 => 0.15,  // 15% off
        12 => 0.18   // 18% off
    ];
    return $discounts[$totalSessions] ?? 0;
}

/**
 * Check if coach has founding coach status
 */
function checkFoundingCoachStatus($coachId) {
    global $supabase;

    // Check if coach used a founding coach promo code during registration
    $coach = $supabase->from('cs_coaches')
        ->select('promo_code_used')
        ->eq('id', $coachId)
        ->single()
        ->execute();

    if ($coach && !empty($coach['promo_code_used'])) {
        // Check if the promo code grants founding coach status
        $promo = $supabase->from('cs_promo_codes')
            ->select('grants_founding_coach')
            ->eq('code', $coach['promo_code_used'])
            ->single()
            ->execute();

        return $promo && $promo['grants_founding_coach'];
    }

    return false;
}

/**
 * Map country name to ISO code
 */
function mapCountryToCode($country) {
    $countryMap = [
        'Netherlands' => 'NL',
        'Belgium' => 'BE',
        'Germany' => 'DE',
        'France' => 'FR',
        'United Kingdom' => 'GB',
        'Ireland' => 'IE',
        'Spain' => 'ES',
        'Italy' => 'IT',
        'Portugal' => 'PT',
        'Austria' => 'AT',
        'Switzerland' => 'CH',
        'Luxembourg' => 'LU',
        'Denmark' => 'DK',
        'Sweden' => 'SE',
        'Norway' => 'NO',
        'Finland' => 'FI',
        'Poland' => 'PL',
        'Czech Republic' => 'CZ',
        'Greece' => 'GR'
    ];
    return $countryMap[$country] ?? 'NL';
}

/**
 * Format money amount
 */
function formatMoney($cents, $currency = 'eur') {
    $amount = $cents / 100;
    $symbols = [
        'eur' => '€',
        'gbp' => '£',
        'usd' => '$',
        'chf' => 'CHF '
    ];
    $symbol = $symbols[strtolower($currency)] ?? '€';
    return $symbol . number_format($amount, 2);
}

// Parse request
$requestUri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

// Remove query string and base path
$path = parse_url($requestUri, PHP_URL_PATH);
$path = preg_replace('#^.*/api/stripe#', '', $path);
$path = trim($path, '/');

$pathParts = $path ? explode('/', $path) : [];

$action = $pathParts[0] ?? null;
$subAction = $pathParts[1] ?? null;

// Get input for POST
$input = [];
if ($method === 'POST' && $action !== 'webhooks') {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true) ?? [];
}

// Handle the request
$response = handleStripe($method, $action, $subAction, $input);

// Send response
$statusCode = $response['status'] ?? 200;
unset($response['status']);

http_response_code($statusCode);
header('Content-Type: application/json');
echo json_encode($response);
