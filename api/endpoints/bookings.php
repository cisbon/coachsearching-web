<?php
/**
 * CoachSearching - Bookings API Endpoint
 *
 * Handles all booking operations including:
 * - Discovery calls (free)
 * - Paid sessions
 * - Package session bookings
 * - Cancellations and reschedules
 *
 * Endpoints:
 * POST /bookings/discovery-call - Book free discovery call
 * POST /bookings/create-intent - Create booking + payment intent
 * POST /bookings/{id}/confirm - Confirm after payment
 * GET /bookings/{id} - Get booking details
 * GET /bookings/coach - Get coach's bookings
 * GET /bookings/client - Get client's bookings
 * POST /bookings/{id}/cancel - Cancel booking
 * POST /bookings/{id}/reschedule - Reschedule booking
 * POST /bookings/package-session - Book session from package
 * POST /bookings/{id}/complete - Mark as completed
 * POST /bookings/{id}/no-show - Mark as no-show
 */

require_once __DIR__ . '/../config.php';

/**
 * Main handler for booking operations
 */
function handleBookings($method, $bookingId, $action, $input) {
    // Route based on method and action
    switch ($method) {
        case 'GET':
            if ($bookingId) {
                return getBooking($bookingId);
            } elseif ($action === 'coach') {
                return getCoachBookings();
            } elseif ($action === 'client') {
                return getClientBookings();
            }
            return ['error' => 'Invalid request', 'status' => 400];

        case 'POST':
            if ($action === 'discovery-call') {
                return bookDiscoveryCall($input);
            } elseif ($action === 'create-intent') {
                return createBookingIntent($input);
            } elseif ($action === 'package-session') {
                return bookPackageSession($input);
            } elseif ($bookingId && $action === 'confirm') {
                return confirmBooking($bookingId, $input);
            } elseif ($bookingId && $action === 'cancel') {
                return cancelBooking($bookingId, $input);
            } elseif ($bookingId && $action === 'reschedule') {
                return rescheduleBooking($bookingId, $input);
            } elseif ($bookingId && $action === 'complete') {
                return completeBooking($bookingId);
            } elseif ($bookingId && $action === 'no-show') {
                return markNoShow($bookingId);
            }
            return ['error' => 'Invalid action', 'status' => 400];

        default:
            return ['error' => 'Method not allowed', 'status' => 405];
    }
}

/**
 * Book a free discovery call
 */
function bookDiscoveryCall($input) {
    global $supabase;

    $required = ['coach_id', 'start_time', 'client_name', 'client_email'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            return ['error' => "Missing required field: $field", 'status' => 400];
        }
    }

    $coachId = $input['coach_id'];
    $startTime = $input['start_time'];
    $clientId = $input['client_id'] ?? null;
    $clientName = sanitizeInput($input['client_name']);
    $clientEmail = sanitizeInput($input['client_email']);
    $clientTimezone = $input['client_timezone'] ?? 'Europe/Amsterdam';
    $notes = sanitizeInput($input['notes'] ?? '');

    // Validate email
    if (!filter_var($clientEmail, FILTER_VALIDATE_EMAIL)) {
        return ['error' => 'Invalid email address', 'status' => 400];
    }

    // Parse and validate time
    $startDateTime = new DateTime($startTime, new DateTimeZone('UTC'));
    $now = new DateTime('now', new DateTimeZone('UTC'));

    if ($startDateTime <= $now) {
        return ['error' => 'Cannot book in the past', 'status' => 400];
    }

    // Discovery calls are 30 minutes
    $endDateTime = clone $startDateTime;
    $endDateTime->modify('+30 minutes');

    // Check if slot is still available
    if (!isSlotAvailable($coachId, $startDateTime, $endDateTime)) {
        return ['error' => 'This time slot is no longer available', 'status' => 409];
    }

    // Check if client already has a pending discovery call with this coach
    $existingCall = $supabase->from('cs_bookings')
        ->select('id')
        ->eq('coach_id', $coachId)
        ->eq('client_email', $clientEmail)
        ->eq('session_type', 'discovery')
        ->in('status', ['pending', 'confirmed'])
        ->single()
        ->execute();

    if ($existingCall && !isset($existingCall['error'])) {
        return ['error' => 'You already have a pending discovery call with this coach', 'status' => 409];
    }

    // Get coach info for notification
    $coach = $supabase->from('cs_coaches')
        ->select('user_id, display_name, email')
        ->eq('id', $coachId)
        ->single()
        ->execute();

    if (!$coach || isset($coach['error'])) {
        return ['error' => 'Coach not found', 'status' => 404];
    }

    // Create the booking
    $bookingData = [
        'coach_id' => $coachId,
        'client_id' => $clientId,
        'client_name' => $clientName,
        'client_email' => $clientEmail,
        'client_timezone' => $clientTimezone,
        'session_type' => 'discovery',
        'start_time' => $startDateTime->format('c'),
        'end_time' => $endDateTime->format('c'),
        'duration_minutes' => 30,
        'amount_cents' => 0,
        'currency' => 'eur',
        'platform_fee_cents' => 0,
        'coach_payout_cents' => 0,
        'status' => 'confirmed', // Discovery calls are auto-confirmed
        'payment_status' => 'not_required',
        'client_notes' => $notes,
        'confirmation_sent_at' => date('c')
    ];

    $booking = $supabase->from('cs_bookings')
        ->insert($bookingData)
        ->execute();

    if (!$booking || isset($booking['error'])) {
        return ['error' => 'Failed to create booking', 'status' => 500];
    }

    $bookingRecord = $booking[0];

    // Queue notifications
    queueNotification($coachId, 'new_booking', [
        'booking_id' => $bookingRecord['id'],
        'client_name' => $clientName,
        'session_type' => 'discovery',
        'start_time' => $startDateTime->format('c')
    ], $coach['email']);

    queueNotification(null, 'booking_confirmation', [
        'booking_id' => $bookingRecord['id'],
        'coach_name' => $coach['display_name'],
        'session_type' => 'discovery',
        'start_time' => $startDateTime->format('c')
    ], $clientEmail);

    return [
        'success' => true,
        'booking' => formatBookingResponse($bookingRecord),
        'message' => 'Discovery call booked successfully'
    ];
}

/**
 * Create a booking intent (paid session)
 * Returns a Stripe PaymentIntent client_secret for frontend payment
 */
function createBookingIntent($input) {
    global $supabase;

    $required = ['coach_id', 'start_time', 'duration_minutes', 'client_name', 'client_email'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            return ['error' => "Missing required field: $field", 'status' => 400];
        }
    }

    $coachId = $input['coach_id'];
    $startTime = $input['start_time'];
    $durationMinutes = (int)$input['duration_minutes'];
    $clientId = $input['client_id'] ?? null;
    $clientName = sanitizeInput($input['client_name']);
    $clientEmail = sanitizeInput($input['client_email']);
    $clientTimezone = $input['client_timezone'] ?? 'Europe/Amsterdam';
    $notes = sanitizeInput($input['notes'] ?? '');
    $isFirstSession = (bool)($input['is_first_session'] ?? false);

    // Validate duration
    if (!in_array($durationMinutes, [60, 90, 120])) {
        return ['error' => 'Invalid session duration', 'status' => 400];
    }

    // Validate email
    if (!filter_var($clientEmail, FILTER_VALIDATE_EMAIL)) {
        return ['error' => 'Invalid email address', 'status' => 400];
    }

    // Parse and validate time
    $startDateTime = new DateTime($startTime, new DateTimeZone('UTC'));
    $now = new DateTime('now', new DateTimeZone('UTC'));

    if ($startDateTime <= $now) {
        return ['error' => 'Cannot book in the past', 'status' => 400];
    }

    $endDateTime = clone $startDateTime;
    $endDateTime->modify("+{$durationMinutes} minutes");

    // Check if slot is available
    if (!isSlotAvailable($coachId, $startDateTime, $endDateTime)) {
        return ['error' => 'This time slot is no longer available', 'status' => 409];
    }

    // Get coach pricing and Stripe account
    $coach = $supabase->from('cs_coaches')
        ->select('id, user_id, display_name, email, hourly_rate, currency')
        ->eq('id', $coachId)
        ->single()
        ->execute();

    if (!$coach || isset($coach['error'])) {
        return ['error' => 'Coach not found', 'status' => 404];
    }

    // Get coach's Stripe account
    $stripeAccount = $supabase->from('cs_coach_stripe_accounts')
        ->select('stripe_account_id, charges_enabled, founding_coach')
        ->eq('coach_id', $coachId)
        ->single()
        ->execute();

    if (!$stripeAccount || isset($stripeAccount['error']) || !$stripeAccount['charges_enabled']) {
        return ['error' => 'Coach has not completed payment setup', 'status' => 400];
    }

    // Calculate pricing
    $hourlyRate = (float)$coach['hourly_rate'];
    $currency = strtolower($coach['currency'] ?? 'eur');
    $sessionRate = ($hourlyRate / 60) * $durationMinutes;
    $amountCents = (int)round($sessionRate * 100);

    // Platform fee: 10% for founding coaches, 15% for others
    $feePercent = $stripeAccount['founding_coach'] ? 0.10 : 0.15;
    $platformFeeCents = (int)round($amountCents * $feePercent);
    $coachPayoutCents = $amountCents - $platformFeeCents;

    // Create pending booking
    $bookingData = [
        'coach_id' => $coachId,
        'client_id' => $clientId,
        'client_name' => $clientName,
        'client_email' => $clientEmail,
        'client_timezone' => $clientTimezone,
        'session_type' => 'paid',
        'start_time' => $startDateTime->format('c'),
        'end_time' => $endDateTime->format('c'),
        'duration_minutes' => $durationMinutes,
        'amount_cents' => $amountCents,
        'currency' => $currency,
        'platform_fee_cents' => $platformFeeCents,
        'coach_payout_cents' => $coachPayoutCents,
        'status' => 'pending',
        'payment_status' => 'pending',
        'client_notes' => $notes,
        'is_first_session' => $isFirstSession,
        'satisfaction_guarantee' => $isFirstSession // First session gets guarantee
    ];

    $booking = $supabase->from('cs_bookings')
        ->insert($bookingData)
        ->execute();

    if (!$booking || isset($booking['error'])) {
        return ['error' => 'Failed to create booking', 'status' => 500];
    }

    $bookingRecord = $booking[0];

    // Create Stripe PaymentIntent with destination charge
    try {
        $stripe = new \Stripe\StripeClient(STRIPE_SECRET_KEY);

        $paymentIntent = $stripe->paymentIntents->create([
            'amount' => $amountCents,
            'currency' => $currency,
            'payment_method_types' => ['card', 'ideal', 'bancontact', 'sepa_debit'],
            'metadata' => [
                'booking_id' => $bookingRecord['id'],
                'coach_id' => $coachId,
                'client_email' => $clientEmail,
                'session_type' => 'paid',
                'duration_minutes' => $durationMinutes
            ],
            'transfer_data' => [
                'destination' => $stripeAccount['stripe_account_id'],
                'amount' => $coachPayoutCents // Coach receives this amount
            ],
            'description' => "Coaching session with {$coach['display_name']} ({$durationMinutes} min)"
        ]);

        // Update booking with payment intent
        $supabase->from('cs_bookings')
            ->update([
                'stripe_payment_intent_id' => $paymentIntent->id
            ])
            ->eq('id', $bookingRecord['id'])
            ->execute();

        return [
            'success' => true,
            'booking_id' => $bookingRecord['id'],
            'client_secret' => $paymentIntent->client_secret,
            'amount' => [
                'total_cents' => $amountCents,
                'currency' => $currency,
                'formatted' => formatCurrency($amountCents, $currency)
            ],
            'session' => [
                'coach_name' => $coach['display_name'],
                'duration_minutes' => $durationMinutes,
                'start_time' => $startDateTime->format('c'),
                'end_time' => $endDateTime->format('c')
            ]
        ];

    } catch (\Stripe\Exception\ApiErrorException $e) {
        // Clean up the pending booking
        $supabase->from('cs_bookings')
            ->delete()
            ->eq('id', $bookingRecord['id'])
            ->execute();

        error_log("Stripe error: " . $e->getMessage());
        return ['error' => 'Payment system error. Please try again.', 'status' => 500];
    }
}

/**
 * Confirm a booking after successful payment
 */
function confirmBooking($bookingId, $input) {
    global $supabase;

    $paymentIntentId = $input['payment_intent_id'] ?? null;

    // Get the booking
    $booking = $supabase->from('cs_bookings')
        ->select('*, cs_coaches(display_name, email)')
        ->eq('id', $bookingId)
        ->single()
        ->execute();

    if (!$booking || isset($booking['error'])) {
        return ['error' => 'Booking not found', 'status' => 404];
    }

    if ($booking['status'] !== 'pending') {
        return ['error' => 'Booking is not in pending state', 'status' => 400];
    }

    // Verify payment with Stripe
    if ($booking['session_type'] === 'paid' && $paymentIntentId) {
        try {
            $stripe = new \Stripe\StripeClient(STRIPE_SECRET_KEY);
            $paymentIntent = $stripe->paymentIntents->retrieve($paymentIntentId);

            if ($paymentIntent->status !== 'succeeded') {
                return ['error' => 'Payment not completed', 'status' => 400];
            }

            if ($paymentIntent->metadata->booking_id !== $bookingId) {
                return ['error' => 'Payment mismatch', 'status' => 400];
            }

        } catch (\Stripe\Exception\ApiErrorException $e) {
            return ['error' => 'Payment verification failed', 'status' => 400];
        }
    }

    // Verify slot is still available (double-check)
    $startDateTime = new DateTime($booking['start_time']);
    $endDateTime = new DateTime($booking['end_time']);

    // Check for conflicting confirmed bookings (excluding this one)
    $conflicts = $supabase->from('cs_bookings')
        ->select('id')
        ->eq('coach_id', $booking['coach_id'])
        ->eq('status', 'confirmed')
        ->neq('id', $bookingId)
        ->lt('start_time', $endDateTime->format('c'))
        ->gt('end_time', $startDateTime->format('c'))
        ->execute();

    if ($conflicts && count($conflicts) > 0) {
        // Refund the payment if there's a conflict
        if ($paymentIntentId) {
            try {
                $stripe = new \Stripe\StripeClient(STRIPE_SECRET_KEY);
                $stripe->refunds->create([
                    'payment_intent' => $paymentIntentId,
                    'reason' => 'requested_by_customer'
                ]);
            } catch (\Exception $e) {
                error_log("Refund error: " . $e->getMessage());
            }
        }

        $supabase->from('cs_bookings')
            ->update(['status' => 'cancelled', 'cancelled_reason' => 'slot_conflict'])
            ->eq('id', $bookingId)
            ->execute();

        return ['error' => 'Time slot is no longer available. Payment has been refunded.', 'status' => 409];
    }

    // Get coach's video link
    $settings = $supabase->from('cs_coach_booking_settings')
        ->select('video_link')
        ->eq('coach_id', $booking['coach_id'])
        ->single()
        ->execute();

    $videoLink = $settings['video_link'] ?? null;

    // Confirm the booking
    $updateData = [
        'status' => 'confirmed',
        'payment_status' => $booking['session_type'] === 'paid' ? 'paid' : 'not_required',
        'confirmation_sent_at' => date('c'),
        'video_link' => $videoLink
    ];

    $supabase->from('cs_bookings')
        ->update($updateData)
        ->eq('id', $bookingId)
        ->execute();

    // Create payment record
    if ($booking['session_type'] === 'paid' && $paymentIntentId) {
        $supabase->from('cs_payment_records')
            ->insert([
                'booking_id' => $bookingId,
                'coach_id' => $booking['coach_id'],
                'stripe_payment_intent_id' => $paymentIntentId,
                'amount_cents' => $booking['amount_cents'],
                'platform_fee_cents' => $booking['platform_fee_cents'],
                'coach_payout_cents' => $booking['coach_payout_cents'],
                'currency' => $booking['currency'],
                'status' => 'succeeded',
                'payment_method' => 'card'
            ])
            ->execute();
    }

    // Queue notifications
    $coachEmail = $booking['cs_coaches']['email'];
    $coachName = $booking['cs_coaches']['display_name'];

    queueNotification($booking['coach_id'], 'new_booking', [
        'booking_id' => $bookingId,
        'client_name' => $booking['client_name'],
        'session_type' => $booking['session_type'],
        'start_time' => $booking['start_time'],
        'duration_minutes' => $booking['duration_minutes']
    ], $coachEmail);

    queueNotification(null, 'booking_confirmation', [
        'booking_id' => $bookingId,
        'coach_name' => $coachName,
        'session_type' => $booking['session_type'],
        'start_time' => $booking['start_time'],
        'duration_minutes' => $booking['duration_minutes'],
        'video_link' => $videoLink
    ], $booking['client_email']);

    return [
        'success' => true,
        'booking' => formatBookingResponse(array_merge($booking, $updateData)),
        'message' => 'Booking confirmed successfully'
    ];
}

/**
 * Cancel a booking
 */
function cancelBooking($bookingId, $input) {
    global $supabase;

    $cancelledBy = $input['cancelled_by'] ?? 'client'; // 'client' or 'coach'
    $reason = sanitizeInput($input['reason'] ?? '');

    // Get the booking
    $booking = $supabase->from('cs_bookings')
        ->select('*, cs_coaches(display_name, email)')
        ->eq('id', $bookingId)
        ->single()
        ->execute();

    if (!$booking || isset($booking['error'])) {
        return ['error' => 'Booking not found', 'status' => 404];
    }

    if (!in_array($booking['status'], ['pending', 'confirmed'])) {
        return ['error' => 'Booking cannot be cancelled', 'status' => 400];
    }

    $startDateTime = new DateTime($booking['start_time']);
    $now = new DateTime('now', new DateTimeZone('UTC'));
    $hoursUntilSession = ($startDateTime->getTimestamp() - $now->getTimestamp()) / 3600;

    // Determine refund policy
    $refundAmount = 0;
    $refundReason = '';

    if ($booking['session_type'] === 'paid' && $booking['payment_status'] === 'paid') {
        if ($cancelledBy === 'coach') {
            // Coach cancels = full refund
            $refundAmount = $booking['amount_cents'];
            $refundReason = 'Coach cancelled';
        } elseif ($hoursUntilSession >= 24) {
            // Client cancels 24+ hours ahead = full refund
            $refundAmount = $booking['amount_cents'];
            $refundReason = 'Cancelled with 24+ hours notice';
        } elseif ($hoursUntilSession >= 12) {
            // Client cancels 12-24 hours ahead = 50% refund
            $refundAmount = (int)($booking['amount_cents'] * 0.5);
            $refundReason = 'Cancelled with 12-24 hours notice (50% refund)';
        } else {
            // Client cancels <12 hours = no refund
            $refundAmount = 0;
            $refundReason = 'Cancelled with less than 12 hours notice (no refund)';
        }
    }

    // Process refund if applicable
    if ($refundAmount > 0 && $booking['stripe_payment_intent_id']) {
        try {
            $stripe = new \Stripe\StripeClient(STRIPE_SECRET_KEY);

            $refundData = [
                'payment_intent' => $booking['stripe_payment_intent_id'],
                'reason' => 'requested_by_customer'
            ];

            // Partial refund
            if ($refundAmount < $booking['amount_cents']) {
                $refundData['amount'] = $refundAmount;
            }

            $refund = $stripe->refunds->create($refundData);

            // Record the refund
            $supabase->from('cs_payment_records')
                ->insert([
                    'booking_id' => $bookingId,
                    'coach_id' => $booking['coach_id'],
                    'stripe_refund_id' => $refund->id,
                    'amount_cents' => -$refundAmount,
                    'currency' => $booking['currency'],
                    'status' => 'refunded',
                    'refund_reason' => $refundReason
                ])
                ->execute();

        } catch (\Stripe\Exception\ApiErrorException $e) {
            error_log("Refund error: " . $e->getMessage());
            return ['error' => 'Failed to process refund', 'status' => 500];
        }
    }

    // Update booking status
    $supabase->from('cs_bookings')
        ->update([
            'status' => 'cancelled',
            'payment_status' => $refundAmount > 0 ? 'refunded' : $booking['payment_status'],
            'cancelled_at' => date('c'),
            'cancelled_by' => $cancelledBy,
            'cancelled_reason' => $reason ?: $refundReason,
            'refund_amount_cents' => $refundAmount
        ])
        ->eq('id', $bookingId)
        ->execute();

    // Queue notifications
    $coachEmail = $booking['cs_coaches']['email'];
    $coachName = $booking['cs_coaches']['display_name'];

    if ($cancelledBy === 'client') {
        queueNotification($booking['coach_id'], 'booking_cancelled', [
            'booking_id' => $bookingId,
            'client_name' => $booking['client_name'],
            'start_time' => $booking['start_time'],
            'reason' => $reason
        ], $coachEmail);
    } else {
        queueNotification(null, 'booking_cancelled', [
            'booking_id' => $bookingId,
            'coach_name' => $coachName,
            'start_time' => $booking['start_time'],
            'reason' => $reason,
            'refund_amount' => $refundAmount > 0 ? formatCurrency($refundAmount, $booking['currency']) : null
        ], $booking['client_email']);
    }

    return [
        'success' => true,
        'message' => 'Booking cancelled',
        'refund' => $refundAmount > 0 ? [
            'amount_cents' => $refundAmount,
            'formatted' => formatCurrency($refundAmount, $booking['currency']),
            'reason' => $refundReason
        ] : null
    ];
}

/**
 * Reschedule a booking
 */
function rescheduleBooking($bookingId, $input) {
    global $supabase;

    if (empty($input['new_start_time'])) {
        return ['error' => 'New start time is required', 'status' => 400];
    }

    $rescheduledBy = $input['rescheduled_by'] ?? 'client';
    $newStartTime = $input['new_start_time'];

    // Get the booking
    $booking = $supabase->from('cs_bookings')
        ->select('*, cs_coaches(display_name, email)')
        ->eq('id', $bookingId)
        ->single()
        ->execute();

    if (!$booking || isset($booking['error'])) {
        return ['error' => 'Booking not found', 'status' => 404];
    }

    if ($booking['status'] !== 'confirmed') {
        return ['error' => 'Only confirmed bookings can be rescheduled', 'status' => 400];
    }

    // Check reschedule limit
    $rescheduleCount = (int)($booking['reschedule_count'] ?? 0);
    if ($rescheduleCount >= 2) {
        return ['error' => 'Maximum reschedule limit reached (2)', 'status' => 400];
    }

    // Parse new time
    $newStartDateTime = new DateTime($newStartTime, new DateTimeZone('UTC'));
    $now = new DateTime('now', new DateTimeZone('UTC'));

    if ($newStartDateTime <= $now) {
        return ['error' => 'Cannot reschedule to a past time', 'status' => 400];
    }

    // Calculate new end time
    $durationMinutes = $booking['duration_minutes'];
    $newEndDateTime = clone $newStartDateTime;
    $newEndDateTime->modify("+{$durationMinutes} minutes");

    // Check if new slot is available
    if (!isSlotAvailable($booking['coach_id'], $newStartDateTime, $newEndDateTime, $bookingId)) {
        return ['error' => 'The requested time slot is not available', 'status' => 409];
    }

    $oldStartTime = $booking['start_time'];

    // Update booking
    $supabase->from('cs_bookings')
        ->update([
            'start_time' => $newStartDateTime->format('c'),
            'end_time' => $newEndDateTime->format('c'),
            'reschedule_count' => $rescheduleCount + 1,
            'rescheduled_at' => date('c'),
            'rescheduled_by' => $rescheduledBy
        ])
        ->eq('id', $bookingId)
        ->execute();

    // Queue notifications
    $coachEmail = $booking['cs_coaches']['email'];
    $coachName = $booking['cs_coaches']['display_name'];

    if ($rescheduledBy === 'client') {
        queueNotification($booking['coach_id'], 'booking_rescheduled', [
            'booking_id' => $bookingId,
            'client_name' => $booking['client_name'],
            'old_time' => $oldStartTime,
            'new_time' => $newStartDateTime->format('c')
        ], $coachEmail);
    }

    queueNotification(null, 'booking_rescheduled', [
        'booking_id' => $bookingId,
        'coach_name' => $coachName,
        'old_time' => $oldStartTime,
        'new_time' => $newStartDateTime->format('c'),
        'reschedules_remaining' => 2 - ($rescheduleCount + 1)
    ], $booking['client_email']);

    return [
        'success' => true,
        'message' => 'Booking rescheduled successfully',
        'new_start_time' => $newStartDateTime->format('c'),
        'new_end_time' => $newEndDateTime->format('c'),
        'reschedules_remaining' => 2 - ($rescheduleCount + 1)
    ];
}

/**
 * Book a session from a package
 */
function bookPackageSession($input) {
    global $supabase;

    $required = ['package_id', 'start_time'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            return ['error' => "Missing required field: $field", 'status' => 400];
        }
    }

    $packageId = $input['package_id'];
    $startTime = $input['start_time'];
    $notes = sanitizeInput($input['notes'] ?? '');

    // Get the package
    $package = $supabase->from('cs_booking_packages')
        ->select('*, cs_coaches(display_name, email)')
        ->eq('id', $packageId)
        ->single()
        ->execute();

    if (!$package || isset($package['error'])) {
        return ['error' => 'Package not found', 'status' => 404];
    }

    if ($package['status'] !== 'active') {
        return ['error' => 'Package is not active', 'status' => 400];
    }

    if ($package['sessions_remaining'] <= 0) {
        return ['error' => 'No sessions remaining in package', 'status' => 400];
    }

    // Check expiration
    if ($package['expires_at']) {
        $expiresAt = new DateTime($package['expires_at']);
        $now = new DateTime('now', new DateTimeZone('UTC'));
        if ($now > $expiresAt) {
            return ['error' => 'Package has expired', 'status' => 400];
        }
    }

    // Parse time
    $startDateTime = new DateTime($startTime, new DateTimeZone('UTC'));
    $now = new DateTime('now', new DateTimeZone('UTC'));

    if ($startDateTime <= $now) {
        return ['error' => 'Cannot book in the past', 'status' => 400];
    }

    $durationMinutes = $package['session_duration_minutes'];
    $endDateTime = clone $startDateTime;
    $endDateTime->modify("+{$durationMinutes} minutes");

    // Check availability
    if (!isSlotAvailable($package['coach_id'], $startDateTime, $endDateTime)) {
        return ['error' => 'This time slot is not available', 'status' => 409];
    }

    // Get coach video link
    $settings = $supabase->from('cs_coach_booking_settings')
        ->select('video_link')
        ->eq('coach_id', $package['coach_id'])
        ->single()
        ->execute();

    // Calculate per-session value (for tracking)
    $perSessionCents = (int)($package['amount_cents'] / $package['total_sessions']);

    // Create the booking
    $bookingData = [
        'coach_id' => $package['coach_id'],
        'client_id' => $package['client_id'],
        'client_name' => $package['client_name'],
        'client_email' => $package['client_email'],
        'client_timezone' => $package['client_timezone'] ?? 'Europe/Amsterdam',
        'package_id' => $packageId,
        'session_type' => 'package',
        'start_time' => $startDateTime->format('c'),
        'end_time' => $endDateTime->format('c'),
        'duration_minutes' => $durationMinutes,
        'amount_cents' => $perSessionCents,
        'currency' => $package['currency'],
        'platform_fee_cents' => 0, // Already charged on package purchase
        'coach_payout_cents' => 0,
        'status' => 'confirmed',
        'payment_status' => 'prepaid',
        'client_notes' => $notes,
        'video_link' => $settings['video_link'] ?? null,
        'confirmation_sent_at' => date('c')
    ];

    $booking = $supabase->from('cs_bookings')
        ->insert($bookingData)
        ->execute();

    if (!$booking || isset($booking['error'])) {
        return ['error' => 'Failed to create booking', 'status' => 500];
    }

    $bookingRecord = $booking[0];

    // Decrement package sessions
    $supabase->from('cs_booking_packages')
        ->update([
            'sessions_remaining' => $package['sessions_remaining'] - 1,
            'sessions_used' => ($package['sessions_used'] ?? 0) + 1
        ])
        ->eq('id', $packageId)
        ->execute();

    // Queue notifications
    $coachEmail = $package['cs_coaches']['email'];
    $coachName = $package['cs_coaches']['display_name'];

    queueNotification($package['coach_id'], 'new_booking', [
        'booking_id' => $bookingRecord['id'],
        'client_name' => $package['client_name'],
        'session_type' => 'package',
        'start_time' => $startDateTime->format('c'),
        'sessions_remaining' => $package['sessions_remaining'] - 1
    ], $coachEmail);

    queueNotification(null, 'booking_confirmation', [
        'booking_id' => $bookingRecord['id'],
        'coach_name' => $coachName,
        'session_type' => 'package',
        'start_time' => $startDateTime->format('c'),
        'video_link' => $settings['video_link'] ?? null,
        'sessions_remaining' => $package['sessions_remaining'] - 1
    ], $package['client_email']);

    return [
        'success' => true,
        'booking' => formatBookingResponse($bookingRecord),
        'package' => [
            'sessions_remaining' => $package['sessions_remaining'] - 1,
            'total_sessions' => $package['total_sessions']
        ],
        'message' => 'Session booked from package'
    ];
}

/**
 * Mark a booking as completed
 */
function completeBooking($bookingId) {
    global $supabase;

    $booking = $supabase->from('cs_bookings')
        ->select('*')
        ->eq('id', $bookingId)
        ->single()
        ->execute();

    if (!$booking || isset($booking['error'])) {
        return ['error' => 'Booking not found', 'status' => 404];
    }

    if ($booking['status'] !== 'confirmed') {
        return ['error' => 'Booking must be confirmed to complete', 'status' => 400];
    }

    $supabase->from('cs_bookings')
        ->update([
            'status' => 'completed',
            'completed_at' => date('c')
        ])
        ->eq('id', $bookingId)
        ->execute();

    // Queue feedback request to client
    queueNotification(null, 'feedback_request', [
        'booking_id' => $bookingId
    ], $booking['client_email']);

    return [
        'success' => true,
        'message' => 'Booking marked as completed'
    ];
}

/**
 * Mark booking as no-show
 */
function markNoShow($bookingId) {
    global $supabase;

    $booking = $supabase->from('cs_bookings')
        ->select('*')
        ->eq('id', $bookingId)
        ->single()
        ->execute();

    if (!$booking || isset($booking['error'])) {
        return ['error' => 'Booking not found', 'status' => 404];
    }

    if ($booking['status'] !== 'confirmed') {
        return ['error' => 'Booking must be confirmed to mark as no-show', 'status' => 400];
    }

    $supabase->from('cs_bookings')
        ->update([
            'status' => 'no_show',
            'completed_at' => date('c')
        ])
        ->eq('id', $bookingId)
        ->execute();

    return [
        'success' => true,
        'message' => 'Booking marked as no-show'
    ];
}

/**
 * Get a single booking
 */
function getBooking($bookingId) {
    global $supabase;

    $booking = $supabase->from('cs_bookings')
        ->select('*, cs_coaches(id, display_name, profile_image_url, specialties)')
        ->eq('id', $bookingId)
        ->single()
        ->execute();

    if (!$booking || isset($booking['error'])) {
        return ['error' => 'Booking not found', 'status' => 404];
    }

    return ['booking' => formatBookingResponse($booking)];
}

/**
 * Get coach's bookings
 */
function getCoachBookings() {
    global $supabase;

    $coachId = $_GET['coach_id'] ?? null;
    $status = $_GET['status'] ?? null;
    $from = $_GET['from'] ?? null;
    $to = $_GET['to'] ?? null;
    $limit = min((int)($_GET['limit'] ?? 50), 100);
    $offset = (int)($_GET['offset'] ?? 0);

    if (!$coachId) {
        return ['error' => 'Coach ID is required', 'status' => 400];
    }

    $query = $supabase->from('cs_bookings')
        ->select('*')
        ->eq('coach_id', $coachId)
        ->order('start_time', ['ascending' => true]);

    if ($status) {
        if ($status === 'upcoming') {
            $query = $query->in('status', ['pending', 'confirmed'])
                ->gte('start_time', date('c'));
        } else {
            $query = $query->eq('status', $status);
        }
    }

    if ($from) {
        $query = $query->gte('start_time', $from);
    }

    if ($to) {
        $query = $query->lte('start_time', $to);
    }

    $query = $query->range($offset, $offset + $limit - 1);

    $bookings = $query->execute();

    if (!$bookings) {
        $bookings = [];
    }

    return [
        'bookings' => array_map('formatBookingResponse', $bookings),
        'count' => count($bookings),
        'offset' => $offset,
        'limit' => $limit
    ];
}

/**
 * Get client's bookings
 */
function getClientBookings() {
    global $supabase;

    $clientId = $_GET['client_id'] ?? null;
    $clientEmail = $_GET['client_email'] ?? null;
    $status = $_GET['status'] ?? null;
    $limit = min((int)($_GET['limit'] ?? 50), 100);
    $offset = (int)($_GET['offset'] ?? 0);

    if (!$clientId && !$clientEmail) {
        return ['error' => 'Client ID or email is required', 'status' => 400];
    }

    $query = $supabase->from('cs_bookings')
        ->select('*, cs_coaches(id, display_name, profile_image_url, specialties)')
        ->order('start_time', ['ascending' => false]);

    if ($clientId) {
        $query = $query->eq('client_id', $clientId);
    } else {
        $query = $query->eq('client_email', $clientEmail);
    }

    if ($status) {
        if ($status === 'upcoming') {
            $query = $query->in('status', ['pending', 'confirmed'])
                ->gte('start_time', date('c'));
        } else {
            $query = $query->eq('status', $status);
        }
    }

    $query = $query->range($offset, $offset + $limit - 1);

    $bookings = $query->execute();

    if (!$bookings) {
        $bookings = [];
    }

    return [
        'bookings' => array_map('formatBookingResponse', $bookings),
        'count' => count($bookings),
        'offset' => $offset,
        'limit' => $limit
    ];
}

/**
 * Check if a time slot is available
 */
function isSlotAvailable($coachId, $startDateTime, $endDateTime, $excludeBookingId = null) {
    global $supabase;

    // Check for conflicting bookings
    $query = $supabase->from('cs_bookings')
        ->select('id')
        ->eq('coach_id', $coachId)
        ->in('status', ['pending', 'confirmed'])
        ->lt('start_time', $endDateTime->format('c'))
        ->gt('end_time', $startDateTime->format('c'));

    if ($excludeBookingId) {
        $query = $query->neq('id', $excludeBookingId);
    }

    $conflicts = $query->execute();

    if ($conflicts && count($conflicts) > 0) {
        return false;
    }

    // Check for blocked dates
    $dateStr = $startDateTime->format('Y-m-d');
    $blockedDates = $supabase->from('cs_coach_blocked_dates')
        ->select('id')
        ->eq('coach_id', $coachId)
        ->lte('start_date', $dateStr)
        ->gte('end_date', $dateStr)
        ->execute();

    if ($blockedDates && count($blockedDates) > 0) {
        return false;
    }

    return true;
}

/**
 * Format booking for API response
 */
function formatBookingResponse($booking) {
    $response = [
        'id' => $booking['id'],
        'coach_id' => $booking['coach_id'],
        'client_id' => $booking['client_id'],
        'client_name' => $booking['client_name'],
        'client_email' => $booking['client_email'],
        'session_type' => $booking['session_type'],
        'start_time' => $booking['start_time'],
        'end_time' => $booking['end_time'],
        'duration_minutes' => $booking['duration_minutes'],
        'status' => $booking['status'],
        'payment_status' => $booking['payment_status'],
        'amount' => [
            'cents' => $booking['amount_cents'],
            'currency' => $booking['currency'],
            'formatted' => formatCurrency($booking['amount_cents'], $booking['currency'])
        ],
        'video_link' => $booking['video_link'],
        'client_notes' => $booking['client_notes'],
        'coach_notes' => $booking['coach_notes'] ?? null,
        'created_at' => $booking['created_at']
    ];

    // Include coach info if joined
    if (isset($booking['cs_coaches'])) {
        $response['coach'] = [
            'id' => $booking['cs_coaches']['id'],
            'name' => $booking['cs_coaches']['display_name'],
            'image' => $booking['cs_coaches']['profile_image_url'],
            'specialties' => $booking['cs_coaches']['specialties'] ?? []
        ];
    }

    // Include package info if applicable
    if (!empty($booking['package_id'])) {
        $response['package_id'] = $booking['package_id'];
    }

    // Include satisfaction guarantee info
    if (!empty($booking['satisfaction_guarantee'])) {
        $response['satisfaction_guarantee'] = true;
    }

    return $response;
}

/**
 * Format currency amount
 */
function formatCurrency($cents, $currency = 'eur') {
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

/**
 * Queue a notification for sending
 */
function queueNotification($userId, $type, $data, $email) {
    global $supabase;

    $supabase->from('cs_notifications')
        ->insert([
            'user_id' => $userId,
            'type' => $type,
            'data' => json_encode($data),
            'email' => $email,
            'status' => 'pending'
        ])
        ->execute();
}

/**
 * Sanitize input string
 */
function sanitizeInput($input) {
    if (!is_string($input)) return $input;
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

// Parse request
$requestUri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

// Remove query string and base path
$path = parse_url($requestUri, PHP_URL_PATH);
$path = preg_replace('#^.*/api/bookings#', '', $path);
$path = trim($path, '/');

$pathParts = $path ? explode('/', $path) : [];

// Determine booking ID and action
$bookingId = null;
$action = null;

if (count($pathParts) >= 1) {
    // Check if first part is an action or a booking ID
    if (in_array($pathParts[0], ['discovery-call', 'create-intent', 'package-session', 'coach', 'client'])) {
        $action = $pathParts[0];
    } else {
        $bookingId = $pathParts[0];
        $action = $pathParts[1] ?? null;
    }
}

// Get input for POST/PUT
$input = [];
if (in_array($method, ['POST', 'PUT'])) {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true) ?? [];
}

// Handle the request
$response = handleBookings($method, $bookingId, $action, $input);

// Send response
$statusCode = $response['status'] ?? 200;
unset($response['status']);

http_response_code($statusCode);
header('Content-Type: application/json');
echo json_encode($response);
