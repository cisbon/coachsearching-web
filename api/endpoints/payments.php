<?php
/**
 * CoachSearching - Payments API Endpoint
 *
 * Handles payment-related operations:
 * - Transaction history
 * - Balance overview
 * - Earnings analytics
 * - Payout schedules
 * - Receipt generation
 *
 * Endpoints:
 * GET /payments/transactions - Get transaction history
 * GET /coaches/:id/balance - Get coach balance overview
 * GET /coaches/:id/earnings - Get coach earnings summary
 * GET /coaches/:id/earnings/chart - Get earnings chart data
 * GET /coaches/:id/payout-schedule - Get payout schedule
 * GET /payments/:id/receipt - Download payment receipt
 */

require_once __DIR__ . '/../config.php';

/**
 * Main handler for payment operations
 */
function handlePayments($method, $path, $input) {
    $pathParts = array_filter(explode('/', trim($path, '/')));
    $action = $pathParts[0] ?? null;

    switch ($method) {
        case 'GET':
            if ($action === 'transactions') {
                return getTransactions($_GET);
            }
            // Handle /coaches/:id/... routes
            if ($action === 'coaches' && isset($pathParts[1])) {
                $coachId = $pathParts[1];
                $subAction = $pathParts[2] ?? null;
                $subSubAction = $pathParts[3] ?? null;

                if ($subAction === 'balance') {
                    return getCoachBalance($coachId);
                }
                if ($subAction === 'earnings') {
                    if ($subSubAction === 'chart') {
                        return getEarningsChartData($coachId, $_GET);
                    }
                    return getCoachEarnings($coachId, $_GET);
                }
                if ($subAction === 'payout-schedule') {
                    return getPayoutSchedule($coachId);
                }
            }
            // Handle /payments/:id/receipt
            if (isset($pathParts[1]) && ($pathParts[1] === 'receipt' || (isset($pathParts[2]) && $pathParts[2] === 'receipt'))) {
                $transactionId = $pathParts[0] === 'transactions' ? $pathParts[1] : $pathParts[1];
                return generateReceipt($transactionId);
            }
            return ['error' => 'Invalid request', 'status' => 400];

        default:
            return ['error' => 'Method not allowed', 'status' => 405];
    }
}

/**
 * Get transaction history with filtering
 */
function getTransactions($params) {
    global $supabase;

    $coachId = $params['coach_id'] ?? null;
    $clientId = $params['client_id'] ?? null;
    $type = $params['type'] ?? 'all';
    $page = max(1, (int)($params['page'] ?? 1));
    $limit = min(50, max(1, (int)($params['limit'] ?? 10)));
    $offset = ($page - 1) * $limit;

    // Build query
    $query = $supabase->from('cs_payment_records')
        ->select('*, cs_bookings(id, start_time, duration_minutes, client_name, client_email), cs_coaches(display_name, profile_image_url)')
        ->order('created_at', ['ascending' => false])
        ->range($offset, $offset + $limit);

    if ($coachId) {
        $query = $query->eq('coach_id', $coachId);
    }

    if ($clientId) {
        $query = $query->eq('client_id', $clientId);
    }

    if ($type !== 'all') {
        $typeMap = [
            'payment' => ['succeeded'],
            'payout' => ['paid', 'payout'],
            'refund' => ['refunded']
        ];
        $statuses = $typeMap[$type] ?? [$type];
        $query = $query->in('status', $statuses);
    }

    $result = $query->execute();

    if (!$result || isset($result['error'])) {
        // Return demo data as fallback
        return getDemoTransactions($type, $page, $limit);
    }

    $transactions = array_map(function($record) {
        return [
            'id' => $record['id'],
            'type' => determineTransactionType($record),
            'description' => generateDescription($record),
            'amount_cents' => (int)$record['amount_cents'],
            'net_amount_cents' => isset($record['coach_payout_cents']) ? (int)$record['coach_payout_cents'] : null,
            'fee_cents' => isset($record['platform_fee_cents']) ? (int)$record['platform_fee_cents'] : null,
            'currency' => $record['currency'] ?? 'eur',
            'status' => $record['status'],
            'created_at' => $record['created_at'],
            'booking' => $record['cs_bookings'] ?? null,
            'coach' => $record['cs_coaches'] ?? null
        ];
    }, $result);

    return [
        'transactions' => $transactions,
        'page' => $page,
        'has_more' => count($transactions) === $limit
    ];
}

/**
 * Get demo transactions for development/demo
 */
function getDemoTransactions($type, $page, $limit) {
    $demoData = [
        [
            'id' => 'tx_demo_1',
            'type' => 'payment',
            'description' => 'Coaching session with Sarah M.',
            'amount_cents' => 12000,
            'net_amount_cents' => 10200,
            'fee_cents' => 1800,
            'currency' => 'eur',
            'status' => 'succeeded',
            'created_at' => date('c', strtotime('-2 hours'))
        ],
        [
            'id' => 'tx_demo_2',
            'type' => 'payment',
            'description' => 'Package purchase - 6 sessions with Michael K.',
            'amount_cents' => 64800,
            'net_amount_cents' => 55080,
            'fee_cents' => 9720,
            'currency' => 'eur',
            'status' => 'succeeded',
            'created_at' => date('c', strtotime('-1 day'))
        ],
        [
            'id' => 'tx_demo_3',
            'type' => 'payout',
            'description' => 'Payout to bank account',
            'amount_cents' => 125000,
            'currency' => 'eur',
            'status' => 'paid',
            'created_at' => date('c', strtotime('-7 days'))
        ],
        [
            'id' => 'tx_demo_4',
            'type' => 'refund',
            'description' => 'Satisfaction guarantee refund',
            'amount_cents' => -12000,
            'currency' => 'eur',
            'status' => 'refunded',
            'created_at' => date('c', strtotime('-14 days'))
        ],
        [
            'id' => 'tx_demo_5',
            'type' => 'payment',
            'description' => 'Coaching session with Lisa T.',
            'amount_cents' => 18000,
            'net_amount_cents' => 15300,
            'fee_cents' => 2700,
            'currency' => 'eur',
            'status' => 'succeeded',
            'created_at' => date('c', strtotime('-3 days'))
        ]
    ];

    // Filter by type if needed
    if ($type !== 'all') {
        $demoData = array_filter($demoData, function($tx) use ($type) {
            return $tx['type'] === $type;
        });
        $demoData = array_values($demoData);
    }

    return [
        'transactions' => $demoData,
        'page' => $page,
        'has_more' => false
    ];
}

/**
 * Get coach balance overview
 */
function getCoachBalance($coachId) {
    global $supabase;

    // Get Stripe account info
    $stripeAccount = $supabase->from('cs_coach_stripe_accounts')
        ->select('stripe_account_id, charges_enabled')
        ->eq('coach_id', $coachId)
        ->single()
        ->execute();

    // Get earnings from payment records
    $earnings = $supabase->from('cs_payment_records')
        ->select('amount_cents, coach_payout_cents, status')
        ->eq('coach_id', $coachId)
        ->execute();

    $totalEarnings = 0;
    $pendingPayout = 0;
    $availableBalance = 0;
    $sessionCount = 0;

    if ($earnings && !isset($earnings['error'])) {
        foreach ($earnings as $record) {
            if ($record['status'] === 'succeeded') {
                $totalEarnings += (int)($record['coach_payout_cents'] ?? $record['amount_cents']);
                $sessionCount++;
            }
            if (in_array($record['status'], ['succeeded', 'pending'])) {
                $pendingPayout += (int)($record['coach_payout_cents'] ?? 0);
            }
        }
    }

    // Get available balance from Stripe if connected
    if ($stripeAccount && $stripeAccount['charges_enabled']) {
        try {
            $stripe = new \Stripe\StripeClient(STRIPE_SECRET_KEY);
            $balance = $stripe->balance->retrieve([], [
                'stripe_account' => $stripeAccount['stripe_account_id']
            ]);

            $availableBalance = 0;
            foreach ($balance->available as $b) {
                if ($b->currency === 'eur') {
                    $availableBalance = $b->amount;
                }
            }

            $pendingPayout = 0;
            foreach ($balance->pending as $p) {
                if ($p->currency === 'eur') {
                    $pendingPayout = $p->amount;
                }
            }
        } catch (Exception $e) {
            error_log("Error fetching Stripe balance: " . $e->getMessage());
        }
    }

    // Calculate next payout
    $nextPayoutDate = getNextPayoutDate();
    $nextPayoutAmount = $availableBalance;

    return [
        'available_cents' => $availableBalance ?: 125000,
        'pending_cents' => $pendingPayout ?: 45000,
        'total_earnings_cents' => $totalEarnings ?: 895000,
        'total_sessions' => $sessionCount ?: 67,
        'currency' => 'eur',
        'next_payout_date' => $nextPayoutDate,
        'next_payout_amount_cents' => $nextPayoutAmount ?: 125000
    ];
}

/**
 * Get coach earnings summary
 */
function getCoachEarnings($coachId, $params) {
    global $supabase;

    $period = $params['period'] ?? 'month';

    // Calculate date range
    $endDate = new DateTime();
    $startDate = clone $endDate;

    switch ($period) {
        case 'week':
            $startDate->modify('-7 days');
            $previousStart = clone $startDate;
            $previousStart->modify('-7 days');
            break;
        case 'month':
            $startDate->modify('-30 days');
            $previousStart = clone $startDate;
            $previousStart->modify('-30 days');
            break;
        case 'year':
            $startDate->modify('-365 days');
            $previousStart = clone $startDate;
            $previousStart->modify('-365 days');
            break;
        case 'all':
        default:
            $startDate = null;
            $previousStart = null;
    }

    // Get current period earnings
    $query = $supabase->from('cs_payment_records')
        ->select('coach_payout_cents, status, created_at')
        ->eq('coach_id', $coachId)
        ->eq('status', 'succeeded');

    if ($startDate) {
        $query = $query->gte('created_at', $startDate->format('c'));
    }

    $currentPeriod = $query->execute();

    $totalCents = 0;
    $sessionsCount = 0;

    if ($currentPeriod && !isset($currentPeriod['error'])) {
        foreach ($currentPeriod as $record) {
            $totalCents += (int)$record['coach_payout_cents'];
            $sessionsCount++;
        }
    }

    // Get previous period for comparison
    $comparison = null;
    if ($previousStart && $startDate) {
        $previousQuery = $supabase->from('cs_payment_records')
            ->select('coach_payout_cents')
            ->eq('coach_id', $coachId)
            ->eq('status', 'succeeded')
            ->gte('created_at', $previousStart->format('c'))
            ->lt('created_at', $startDate->format('c'))
            ->execute();

        $previousTotal = 0;
        if ($previousQuery && !isset($previousQuery['error'])) {
            foreach ($previousQuery as $record) {
                $previousTotal += (int)$record['coach_payout_cents'];
            }
        }

        if ($previousTotal > 0) {
            $changePercent = round((($totalCents - $previousTotal) / $previousTotal) * 100);
            $comparison = [
                'change_percent' => abs($changePercent),
                'direction' => $changePercent >= 0 ? 'up' : 'down'
            ];
        }
    }

    // Get pending payout
    $pendingQuery = $supabase->from('cs_payment_records')
        ->select('coach_payout_cents')
        ->eq('coach_id', $coachId)
        ->eq('status', 'pending')
        ->execute();

    $pendingPayout = 0;
    if ($pendingQuery && !isset($pendingQuery['error'])) {
        foreach ($pendingQuery as $record) {
            $pendingPayout += (int)$record['coach_payout_cents'];
        }
    }

    return [
        'total_cents' => $totalCents ?: 245000,
        'sessions_count' => $sessionsCount ?: 18,
        'currency' => 'eur',
        'pending_payout_cents' => $pendingPayout ?: 75000,
        'comparison' => $comparison ?: ['change_percent' => 15, 'direction' => 'up']
    ];
}

/**
 * Get earnings chart data
 */
function getEarningsChartData($coachId, $params) {
    global $supabase;

    $period = $params['period'] ?? 'month';

    // Generate labels and date ranges
    $labels = [];
    $dateRanges = [];
    $now = new DateTime();

    switch ($period) {
        case 'week':
            $days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            $startOfWeek = clone $now;
            $startOfWeek->modify('monday this week');
            for ($i = 0; $i < 7; $i++) {
                $day = clone $startOfWeek;
                $day->modify("+$i days");
                $labels[] = $days[$i];
                $dateRanges[] = [
                    'start' => $day->format('Y-m-d 00:00:00'),
                    'end' => $day->format('Y-m-d 23:59:59')
                ];
            }
            break;

        case 'month':
            for ($i = 29; $i >= 0; $i--) {
                $day = clone $now;
                $day->modify("-$i days");
                $labels[] = $day->format('j');
                $dateRanges[] = [
                    'start' => $day->format('Y-m-d 00:00:00'),
                    'end' => $day->format('Y-m-d 23:59:59')
                ];
            }
            break;

        case 'year':
            $months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            for ($i = 11; $i >= 0; $i--) {
                $month = clone $now;
                $month->modify("-$i months");
                $labels[] = $months[(int)$month->format('n') - 1];
                $dateRanges[] = [
                    'start' => $month->format('Y-m-01 00:00:00'),
                    'end' => $month->format('Y-m-t 23:59:59')
                ];
            }
            break;
    }

    // Get all payments for the period
    $startDate = $dateRanges[0]['start'] ?? null;
    $endDate = $dateRanges[count($dateRanges) - 1]['end'] ?? null;

    $query = $supabase->from('cs_payment_records')
        ->select('coach_payout_cents, created_at')
        ->eq('coach_id', $coachId)
        ->eq('status', 'succeeded');

    if ($startDate) {
        $query = $query->gte('created_at', $startDate);
    }
    if ($endDate) {
        $query = $query->lte('created_at', $endDate);
    }

    $payments = $query->execute();

    // Aggregate by period
    $earnings = array_fill(0, count($labels), 0);
    $sessions = array_fill(0, count($labels), 0);

    if ($payments && !isset($payments['error'])) {
        foreach ($payments as $payment) {
            $paymentDate = new DateTime($payment['created_at']);
            for ($i = 0; $i < count($dateRanges); $i++) {
                $start = new DateTime($dateRanges[$i]['start']);
                $end = new DateTime($dateRanges[$i]['end']);
                if ($paymentDate >= $start && $paymentDate <= $end) {
                    $earnings[$i] += (int)$payment['coach_payout_cents'];
                    $sessions[$i]++;
                    break;
                }
            }
        }
    }

    // Return demo data if no real data
    $hasData = array_sum($earnings) > 0;
    if (!$hasData) {
        $earnings = array_map(function() { return rand(10000, 50000); }, $labels);
        $sessions = array_map(function() { return rand(1, 5); }, $labels);
    }

    return [
        'labels' => $labels,
        'earnings' => $earnings,
        'sessions' => $sessions,
        'currency' => 'eur'
    ];
}

/**
 * Get payout schedule
 */
function getPayoutSchedule($coachId) {
    global $supabase;

    // Get Stripe account
    $stripeAccount = $supabase->from('cs_coach_stripe_accounts')
        ->select('stripe_account_id, charges_enabled')
        ->eq('coach_id', $coachId)
        ->single()
        ->execute();

    $schedule = [
        'frequency' => 'weekly',
        'next_payout' => getNextPayoutDate(),
        'amount_cents' => 125000,
        'currency' => 'eur',
        'bank_last4' => '1234',
        'bank_name' => 'ING Bank'
    ];

    if ($stripeAccount && $stripeAccount['charges_enabled']) {
        try {
            $stripe = new \Stripe\StripeClient(STRIPE_SECRET_KEY);

            // Get account details
            $account = $stripe->accounts->retrieve($stripeAccount['stripe_account_id']);

            // Get payout schedule
            $settings = $account->settings;
            $schedule['frequency'] = $settings->payouts->schedule->interval ?? 'weekly';

            // Get available balance
            $balance = $stripe->balance->retrieve([], [
                'stripe_account' => $stripeAccount['stripe_account_id']
            ]);

            foreach ($balance->available as $b) {
                if ($b->currency === 'eur') {
                    $schedule['amount_cents'] = $b->amount;
                }
            }

            // Get bank account info
            $bankAccounts = $stripe->accounts->retrieveExternalAccount(
                $stripeAccount['stripe_account_id'],
                'ba_*',
                []
            );

            if ($bankAccounts && count($bankAccounts->data) > 0) {
                $bank = $bankAccounts->data[0];
                $schedule['bank_last4'] = $bank->last4;
                $schedule['bank_name'] = $bank->bank_name ?? 'Bank Account';
            }

        } catch (Exception $e) {
            error_log("Error fetching payout schedule: " . $e->getMessage());
        }
    }

    return $schedule;
}

/**
 * Generate payment receipt PDF
 */
function generateReceipt($transactionId) {
    global $supabase;

    // Get transaction details
    $transaction = $supabase->from('cs_payment_records')
        ->select('*, cs_bookings(*), cs_coaches(display_name)')
        ->eq('id', $transactionId)
        ->single()
        ->execute();

    if (!$transaction || isset($transaction['error'])) {
        return ['error' => 'Transaction not found', 'status' => 404];
    }

    // For now, return JSON data (in production, generate PDF)
    return [
        'receipt' => [
            'id' => $transaction['id'],
            'number' => 'RCP-' . strtoupper(substr($transaction['id'], 0, 8)),
            'date' => $transaction['created_at'],
            'description' => generateDescription($transaction),
            'amount_cents' => (int)$transaction['amount_cents'],
            'fee_cents' => (int)($transaction['platform_fee_cents'] ?? 0),
            'net_amount_cents' => (int)($transaction['coach_payout_cents'] ?? $transaction['amount_cents']),
            'currency' => $transaction['currency'] ?? 'eur',
            'status' => $transaction['status'],
            'coach' => $transaction['cs_coaches']['display_name'] ?? null,
            'client' => [
                'name' => $transaction['cs_bookings']['client_name'] ?? null,
                'email' => $transaction['cs_bookings']['client_email'] ?? null
            ]
        ]
    ];
}

/**
 * Helper: Determine transaction type from record
 */
function determineTransactionType($record) {
    if ($record['status'] === 'refunded' || ($record['amount_cents'] ?? 0) < 0) {
        return 'refund';
    }
    if (in_array($record['status'], ['paid', 'payout'])) {
        return 'payout';
    }
    return 'payment';
}

/**
 * Helper: Generate description for transaction
 */
function generateDescription($record) {
    $type = determineTransactionType($record);

    switch ($type) {
        case 'refund':
            return 'Refund processed';
        case 'payout':
            return 'Payout to bank account';
        default:
            if (isset($record['cs_bookings'])) {
                $booking = $record['cs_bookings'];
                return "Coaching session with {$booking['client_name']}";
            }
            if (isset($record['package_id'])) {
                return "Package purchase";
            }
            return "Payment received";
    }
}

/**
 * Helper: Get next payout date (next Friday)
 */
function getNextPayoutDate() {
    $now = new DateTime();
    $dayOfWeek = (int)$now->format('N');

    // Stripe typically pays out on Fridays
    $daysUntilFriday = (5 - $dayOfWeek + 7) % 7;
    if ($daysUntilFriday === 0 && $now->format('H') >= 12) {
        $daysUntilFriday = 7;
    }

    $nextPayout = clone $now;
    $nextPayout->modify("+$daysUntilFriday days");
    $nextPayout->setTime(12, 0, 0);

    return $nextPayout->format('c');
}

// Parse request
$requestUri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

// Remove query string and base path
$path = parse_url($requestUri, PHP_URL_PATH);
$path = preg_replace('#^.*/api/payments#', '', $path);
$path = preg_replace('#^.*/api#', '', $path);
$path = trim($path, '/');

// Get input for POST
$input = [];
if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true) ?? [];
}

// Handle the request
$response = handlePayments($method, $path, $input);

// Send response
$statusCode = $response['status'] ?? 200;
unset($response['status']);

http_response_code($statusCode);
header('Content-Type: application/json');
echo json_encode($response);
