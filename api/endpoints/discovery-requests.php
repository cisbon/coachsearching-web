<?php
/**
 * CoachSearching - Discovery Call Requests API Endpoint
 *
 * Simple discovery call request system where users provide:
 * - Name
 * - Phone number
 * - General time preference (not a specific slot)
 * - Optional message
 *
 * The coach receives an email and can see requests in their dashboard.
 *
 * Endpoints:
 * POST /discovery-requests - Create a new discovery request (no auth required)
 * GET /discovery-requests - Get coach's discovery requests (auth required)
 * PUT /discovery-requests/{id} - Update request status/notes (auth required)
 */

require_once __DIR__ . '/../config.php';

/**
 * Main handler for discovery request operations
 */
function handleDiscoveryRequests($method, $requestId, $input) {
    switch ($method) {
        case 'GET':
            return getDiscoveryRequests();

        case 'POST':
            if ($requestId) {
                return ['error' => 'Invalid endpoint', 'status' => 400];
            }
            return createDiscoveryRequest($input);

        case 'PUT':
            if (!$requestId) {
                return ['error' => 'Request ID required', 'status' => 400];
            }
            return updateDiscoveryRequest($requestId, $input);

        default:
            return ['error' => 'Method not allowed', 'status' => 405];
    }
}

/**
 * Create a new discovery call request
 * No authentication required - anyone can request a discovery call
 */
function createDiscoveryRequest($input) {
    global $supabase;

    // Validate required fields
    $required = ['coach_id', 'client_name', 'client_phone', 'time_preference'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            return ['error' => "Missing required field: $field", 'status' => 400];
        }
    }

    $coachId = $input['coach_id'];
    $clientName = sanitizeInput($input['client_name']);
    $clientPhone = sanitizeInput($input['client_phone']);
    $clientEmail = isset($input['client_email']) ? sanitizeInput($input['client_email']) : null;
    $clientMessage = isset($input['client_message']) ? sanitizeInput($input['client_message']) : null;
    $timePreference = $input['time_preference'];

    // Validate time preference
    $validPreferences = [
        'weekday_morning',
        'weekday_afternoon',
        'weekday_evening',
        'weekend_morning',
        'weekend_afternoon',
        'flexible'
    ];

    if (!in_array($timePreference, $validPreferences)) {
        return ['error' => 'Invalid time preference', 'status' => 400];
    }

    // Validate phone (basic validation)
    $cleanPhone = preg_replace('/[^0-9+]/', '', $clientPhone);
    if (strlen($cleanPhone) < 8) {
        return ['error' => 'Invalid phone number', 'status' => 400];
    }

    // Validate email if provided
    if ($clientEmail && !filter_var($clientEmail, FILTER_VALIDATE_EMAIL)) {
        return ['error' => 'Invalid email address', 'status' => 400];
    }

    // Get coach info for notification
    $coach = $supabase->from('cs_coaches')
        ->select('id, user_id, full_name, display_name, email')
        ->eq('id', $coachId)
        ->single()
        ->execute();

    if (!$coach || isset($coach['error'])) {
        return ['error' => 'Coach not found', 'status' => 404];
    }

    // Create the discovery request
    $requestData = [
        'coach_id' => $coachId,
        'client_name' => $clientName,
        'client_phone' => $clientPhone,
        'client_email' => $clientEmail,
        'client_message' => $clientMessage,
        'time_preference' => $timePreference,
        'status' => 'pending'
    ];

    $result = $supabase->from('cs_discovery_requests')
        ->insert($requestData)
        ->execute();

    if (!$result || isset($result['error'])) {
        error_log("Failed to create discovery request: " . json_encode($result));
        return ['error' => 'Failed to create request', 'status' => 500];
    }

    $request = $result[0];

    // Queue email notification to coach
    $coachName = $coach['full_name'] ?? $coach['display_name'] ?? 'Coach';
    $coachEmail = $coach['email'];

    if ($coachEmail) {
        queueDiscoveryNotification($coachId, $coachEmail, [
            'request_id' => $request['id'],
            'client_name' => $clientName,
            'client_phone' => $clientPhone,
            'client_email' => $clientEmail,
            'client_message' => $clientMessage,
            'time_preference' => formatTimePreference($timePreference),
            'coach_name' => $coachName
        ]);

        // Update request to mark email as sent
        $supabase->from('cs_discovery_requests')
            ->update(['email_sent_at' => date('c')])
            ->eq('id', $request['id'])
            ->execute();
    }

    return [
        'success' => true,
        'message' => 'Discovery call request submitted successfully! The coach will contact you soon.',
        'request_id' => $request['id']
    ];
}

/**
 * Get discovery requests for the authenticated coach
 */
function getDiscoveryRequests() {
    global $supabase;

    // Get coach_id from query params
    $coachId = $_GET['coach_id'] ?? null;
    $status = $_GET['status'] ?? null;
    $limit = min((int)($_GET['limit'] ?? 50), 100);
    $offset = (int)($_GET['offset'] ?? 0);

    if (!$coachId) {
        return ['error' => 'Coach ID is required', 'status' => 400];
    }

    $query = $supabase->from('cs_discovery_requests')
        ->select('*')
        ->eq('coach_id', $coachId)
        ->order('created_at', ['ascending' => false]);

    if ($status) {
        $query = $query->eq('status', $status);
    }

    $query = $query->range($offset, $offset + $limit - 1);

    $requests = $query->execute();

    if (!$requests) {
        $requests = [];
    }

    // Format the requests
    $formattedRequests = array_map(function($req) {
        return [
            'id' => $req['id'],
            'client_name' => $req['client_name'],
            'client_phone' => $req['client_phone'],
            'client_email' => $req['client_email'],
            'client_message' => $req['client_message'],
            'time_preference' => $req['time_preference'],
            'time_preference_label' => formatTimePreference($req['time_preference']),
            'status' => $req['status'],
            'coach_notes' => $req['coach_notes'],
            'created_at' => $req['created_at'],
            'updated_at' => $req['updated_at']
        ];
    }, $requests);

    return [
        'requests' => $formattedRequests,
        'count' => count($requests),
        'offset' => $offset,
        'limit' => $limit
    ];
}

/**
 * Update a discovery request (status, notes)
 */
function updateDiscoveryRequest($requestId, $input) {
    global $supabase;

    // Get the request first
    $request = $supabase->from('cs_discovery_requests')
        ->select('*')
        ->eq('id', $requestId)
        ->single()
        ->execute();

    if (!$request || isset($request['error'])) {
        return ['error' => 'Request not found', 'status' => 404];
    }

    // Build update data
    $updateData = [];

    if (isset($input['status'])) {
        $validStatuses = ['pending', 'contacted', 'scheduled', 'completed', 'cancelled'];
        if (!in_array($input['status'], $validStatuses)) {
            return ['error' => 'Invalid status', 'status' => 400];
        }
        $updateData['status'] = $input['status'];
    }

    if (isset($input['coach_notes'])) {
        $updateData['coach_notes'] = sanitizeInput($input['coach_notes']);
    }

    if (empty($updateData)) {
        return ['error' => 'No fields to update', 'status' => 400];
    }

    $result = $supabase->from('cs_discovery_requests')
        ->update($updateData)
        ->eq('id', $requestId)
        ->execute();

    if (!$result || isset($result['error'])) {
        return ['error' => 'Failed to update request', 'status' => 500];
    }

    return [
        'success' => true,
        'message' => 'Request updated successfully'
    ];
}

/**
 * Format time preference for display
 */
function formatTimePreference($preference) {
    $labels = [
        'weekday_morning' => 'Weekday mornings (9:00 - 12:00)',
        'weekday_afternoon' => 'Weekday afternoons (12:00 - 17:00)',
        'weekday_evening' => 'Weekday evenings (17:00 - 20:00)',
        'weekend_morning' => 'Weekend mornings',
        'weekend_afternoon' => 'Weekend afternoons',
        'flexible' => 'Flexible / Any time'
    ];

    return $labels[$preference] ?? $preference;
}

/**
 * Queue email notification for discovery request
 */
function queueDiscoveryNotification($coachId, $email, $data) {
    global $supabase;

    $supabase->from('cs_notifications')
        ->insert([
            'user_id' => $coachId,
            'type' => 'discovery_request',
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
$path = preg_replace('#^.*/api/discovery-requests#', '', $path);
$path = trim($path, '/');

$requestId = $path ?: null;

// Get input for POST/PUT
$input = [];
if (in_array($method, ['POST', 'PUT'])) {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true) ?? [];
}

// Handle the request
$response = handleDiscoveryRequests($method, $requestId, $input);

// Send response
$statusCode = $response['status'] ?? 200;
unset($response['status']);

http_response_code($statusCode);
header('Content-Type: application/json');
echo json_encode($response);
