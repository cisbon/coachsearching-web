<?php
/**
 * api/endpoints/availability.php
 * Coach Availability Management API
 *
 * GET /availability/{coach_id} - Get weekly availability
 * PUT /availability/{coach_id} - Update weekly availability
 * GET /availability/{coach_id}/slots - Get available booking slots
 * GET /availability/{coach_id}/blocked - Get blocked dates
 * POST /availability/{coach_id}/blocked - Block dates
 * DELETE /availability/{coach_id}/blocked - Unblock dates
 * GET /availability/{coach_id}/settings - Get booking settings
 * PUT /availability/{coach_id}/settings - Update booking settings
 */

require_once __DIR__ . '/../config.php';

function handleAvailability($method, $coachId, $action, $input) {
    if (!$coachId) {
        jsonResponse(['error' => 'Coach ID required'], 400);
        return;
    }

    // Handle slots endpoint
    if ($action === 'slots') {
        if ($method === 'GET') {
            getAvailableSlots($coachId);
        } else {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }
        return;
    }

    // Handle blocked dates
    if ($action === 'blocked') {
        if ($method === 'GET') {
            getBlockedDates($coachId);
        } elseif ($method === 'POST') {
            blockDates($coachId, $input);
        } elseif ($method === 'DELETE') {
            unblockDates($coachId, $input);
        } else {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }
        return;
    }

    // Handle settings
    if ($action === 'settings') {
        if ($method === 'GET') {
            getBookingSettings($coachId);
        } elseif ($method === 'PUT') {
            updateBookingSettings($coachId, $input);
        } else {
            jsonResponse(['error' => 'Method not allowed'], 405);
        }
        return;
    }

    // Handle main availability
    if ($method === 'GET') {
        getAvailability($coachId);
    } elseif ($method === 'PUT') {
        updateAvailability($coachId, $input);
    } else {
        jsonResponse(['error' => 'Method not allowed'], 405);
    }
}

// =============================================
// GET WEEKLY AVAILABILITY
// =============================================
function getAvailability($coachId) {
    $url = SUPABASE_URL . '/rest/v1/cs_coach_availability'
        . '?coach_id=eq.' . $coachId
        . '&is_active=eq.true'
        . '&order=day_of_week,start_time';

    $response = supabaseRequest($url, 'GET');

    if ($response['code'] === 200) {
        $slots = $response['data'] ?? [];

        // Group by day of week
        $byDay = [];
        foreach ($slots as $slot) {
            $day = $slot['day_of_week'];
            if (!isset($byDay[$day])) {
                $byDay[$day] = [];
            }
            $byDay[$day][] = [
                'id' => $slot['id'],
                'start_time' => $slot['start_time'],
                'end_time' => $slot['end_time'],
                'allows_discovery_calls' => $slot['allows_discovery_calls'],
                'allows_sessions' => $slot['allows_sessions']
            ];
        }

        // Calculate weekly hours
        $totalMinutes = 0;
        foreach ($slots as $slot) {
            $start = strtotime($slot['start_time']);
            $end = strtotime($slot['end_time']);
            $totalMinutes += ($end - $start) / 60;
        }

        jsonResponse([
            'availability' => $slots,
            'by_day' => $byDay,
            'weekly_hours' => round($totalMinutes / 60, 1),
            'slots_count' => count($slots)
        ]);
    } else {
        jsonResponse(['error' => 'Failed to fetch availability'], $response['code']);
    }
}

// =============================================
// UPDATE WEEKLY AVAILABILITY
// =============================================
function updateAvailability($coachId, $input) {
    // Verify authorization
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (empty($authHeader)) {
        jsonResponse(['error' => 'Unauthorized'], 401);
        return;
    }

    $newSlots = $input['availability'] ?? [];

    // Validate slots
    foreach ($newSlots as $slot) {
        if (!isset($slot['day_of_week']) || !isset($slot['start_time']) || !isset($slot['end_time'])) {
            jsonResponse(['error' => 'Each slot must have day_of_week, start_time, and end_time'], 400);
            return;
        }
        if ($slot['day_of_week'] < 0 || $slot['day_of_week'] > 6) {
            jsonResponse(['error' => 'day_of_week must be 0-6'], 400);
            return;
        }
        if (strtotime($slot['end_time']) <= strtotime($slot['start_time'])) {
            jsonResponse(['error' => 'end_time must be after start_time'], 400);
            return;
        }
    }

    // Delete existing slots
    $deleteUrl = SUPABASE_URL . '/rest/v1/cs_coach_availability?coach_id=eq.' . $coachId;
    supabaseRequest($deleteUrl, 'DELETE', null, $authHeader);

    // Insert new slots
    if (count($newSlots) > 0) {
        $slotsToInsert = array_map(function($slot) use ($coachId) {
            return [
                'coach_id' => $coachId,
                'day_of_week' => $slot['day_of_week'],
                'start_time' => $slot['start_time'],
                'end_time' => $slot['end_time'],
                'allows_discovery_calls' => $slot['allows_discovery_calls'] ?? true,
                'allows_sessions' => $slot['allows_sessions'] ?? true,
                'is_active' => true
            ];
        }, $newSlots);

        $insertUrl = SUPABASE_URL . '/rest/v1/cs_coach_availability';
        $response = supabaseRequest($insertUrl, 'POST', $slotsToInsert, $authHeader, ['Prefer: return=representation']);

        if ($response['code'] !== 201) {
            jsonResponse(['error' => 'Failed to update availability', 'details' => $response['data']], $response['code']);
            return;
        }
    }

    // Calculate weekly hours
    $totalMinutes = 0;
    foreach ($newSlots as $slot) {
        $start = strtotime($slot['start_time']);
        $end = strtotime($slot['end_time']);
        $totalMinutes += ($end - $start) / 60;
    }

    jsonResponse([
        'success' => true,
        'slots_count' => count($newSlots),
        'weekly_hours' => round($totalMinutes / 60, 1)
    ]);
}

// =============================================
// GET AVAILABLE BOOKING SLOTS
// =============================================
function getAvailableSlots($coachId) {
    $serviceType = $_GET['service_type'] ?? 'single_session';
    $serviceId = $_GET['service_id'] ?? null;
    $startDate = $_GET['start_date'] ?? date('Y-m-d');
    $endDate = $_GET['end_date'] ?? date('Y-m-d', strtotime('+14 days'));
    $clientTimezone = $_GET['timezone'] ?? 'Europe/Berlin';

    // Get service duration
    $duration = 60; // Default
    if ($serviceType === 'discovery_call') {
        // Get from coach settings
        $settingsUrl = SUPABASE_URL . '/rest/v1/cs_coach_booking_settings?coach_id=eq.' . $coachId;
        $settingsResponse = supabaseRequest($settingsUrl, 'GET');
        if ($settingsResponse['code'] === 200 && !empty($settingsResponse['data'])) {
            $duration = $settingsResponse['data'][0]['discovery_call_duration_minutes'] ?? 20;
        } else {
            $duration = 20;
        }
    } elseif ($serviceId) {
        // Get from service
        $serviceUrl = SUPABASE_URL . '/rest/v1/cs_coach_services?id=eq.' . $serviceId;
        $serviceResponse = supabaseRequest($serviceUrl, 'GET');
        if ($serviceResponse['code'] === 200 && !empty($serviceResponse['data'])) {
            $duration = $serviceResponse['data'][0]['duration_minutes'] ?? 60;
        }
    }

    // Get coach settings
    $settingsUrl = SUPABASE_URL . '/rest/v1/cs_coach_booking_settings?coach_id=eq.' . $coachId;
    $settingsResponse = supabaseRequest($settingsUrl, 'GET');
    $settings = $settingsResponse['data'][0] ?? [
        'timezone' => 'Europe/Berlin',
        'buffer_before_minutes' => 15,
        'buffer_after_minutes' => 15,
        'min_notice_hours' => 24,
        'max_advance_days' => 60,
        'discovery_calls_enabled' => true
    ];

    // Check if discovery calls are enabled
    if ($serviceType === 'discovery_call' && !($settings['discovery_calls_enabled'] ?? true)) {
        jsonResponse([
            'slots' => [],
            'message' => 'Discovery calls are not enabled for this coach'
        ]);
        return;
    }

    // Get availability slots
    $availabilityUrl = SUPABASE_URL . '/rest/v1/cs_coach_availability'
        . '?coach_id=eq.' . $coachId
        . '&is_active=eq.true'
        . '&order=day_of_week,start_time';
    $availabilityResponse = supabaseRequest($availabilityUrl, 'GET');
    $availability = $availabilityResponse['data'] ?? [];

    // Get blocked dates
    $blockedUrl = SUPABASE_URL . '/rest/v1/cs_coach_blocked_dates'
        . '?coach_id=eq.' . $coachId
        . '&blocked_date=gte.' . $startDate
        . '&blocked_date=lte.' . $endDate;
    $blockedResponse = supabaseRequest($blockedUrl, 'GET');
    $blockedDates = array_column($blockedResponse['data'] ?? [], 'blocked_date');

    // Get existing bookings
    $bookingsUrl = SUPABASE_URL . '/rest/v1/cs_bookings'
        . '?coach_id=eq.' . $coachId
        . '&status=in.(confirmed,pending)'
        . '&scheduled_at=gte.' . $startDate . 'T00:00:00Z'
        . '&scheduled_at=lte.' . $endDate . 'T23:59:59Z';
    $bookingsResponse = supabaseRequest($bookingsUrl, 'GET');
    $existingBookings = $bookingsResponse['data'] ?? [];

    // Generate available slots
    $slots = [];
    $coachTz = $settings['timezone'] ?? 'Europe/Berlin';
    $bufferBefore = ($settings['buffer_before_minutes'] ?? 15) * 60;
    $bufferAfter = ($settings['buffer_after_minutes'] ?? 15) * 60;
    $minNotice = ($settings['min_notice_hours'] ?? 24) * 3600;
    $durationSeconds = $duration * 60;

    $currentDate = new DateTime($startDate);
    $endDateObj = new DateTime($endDate);

    while ($currentDate <= $endDateObj) {
        $dateStr = $currentDate->format('Y-m-d');

        // Skip blocked dates
        if (in_array($dateStr, $blockedDates)) {
            $currentDate->modify('+1 day');
            continue;
        }

        $dayOfWeek = (int)$currentDate->format('w'); // 0 = Sunday

        // Get availability for this day
        $dayAvailability = array_filter($availability, function($slot) use ($dayOfWeek, $serviceType) {
            if ($slot['day_of_week'] != $dayOfWeek) return false;
            if ($serviceType === 'discovery_call' && !$slot['allows_discovery_calls']) return false;
            if ($serviceType !== 'discovery_call' && !$slot['allows_sessions']) return false;
            return true;
        });

        $daySlots = [];

        foreach ($dayAvailability as $avail) {
            // Generate time slots within this availability window
            $slotStart = strtotime($dateStr . ' ' . $avail['start_time']);
            $slotEnd = strtotime($dateStr . ' ' . $avail['end_time']);

            while ($slotStart + $durationSeconds <= $slotEnd) {
                $slotEndTime = $slotStart + $durationSeconds;

                // Check minimum notice
                if ($slotStart > time() + $minNotice) {
                    // Check for conflicts
                    $hasConflict = false;
                    foreach ($existingBookings as $booking) {
                        $bookingStart = strtotime($booking['scheduled_at']);
                        $bookingEnd = $bookingStart + ($booking['duration_minutes'] * 60);

                        // Add buffers
                        $bookingStartWithBuffer = $bookingStart - $bufferBefore;
                        $bookingEndWithBuffer = $bookingEnd + $bufferAfter;

                        // Check overlap
                        if ($slotStart < $bookingEndWithBuffer && $slotEndTime > $bookingStartWithBuffer) {
                            $hasConflict = true;
                            break;
                        }
                    }

                    if (!$hasConflict) {
                        $daySlots[] = [
                            'start' => date('H:i', $slotStart),
                            'end' => date('H:i', $slotEndTime),
                            'start_utc' => gmdate('Y-m-d\TH:i:s\Z', $slotStart),
                            'available' => true
                        ];
                    }
                }

                // Move to next slot (30-minute intervals)
                $slotStart += 1800;
            }
        }

        if (!empty($daySlots)) {
            $slots[] = [
                'date' => $dateStr,
                'day_name' => $currentDate->format('l'),
                'times' => $daySlots
            ];
        }

        $currentDate->modify('+1 day');
    }

    // Find next available slot
    $nextAvailable = null;
    foreach ($slots as $day) {
        if (!empty($day['times'])) {
            $nextAvailable = $day['times'][0]['start_utc'];
            break;
        }
    }

    jsonResponse([
        'coach_timezone' => $coachTz,
        'client_timezone' => $clientTimezone,
        'service_type' => $serviceType,
        'duration_minutes' => $duration,
        'slots' => $slots,
        'next_available' => $nextAvailable,
        'total_available_slots' => array_sum(array_map(fn($d) => count($d['times']), $slots))
    ]);
}

// =============================================
// GET BLOCKED DATES
// =============================================
function getBlockedDates($coachId) {
    $startDate = $_GET['start_date'] ?? date('Y-m-d');
    $endDate = $_GET['end_date'] ?? date('Y-m-d', strtotime('+6 months'));

    $url = SUPABASE_URL . '/rest/v1/cs_coach_blocked_dates'
        . '?coach_id=eq.' . $coachId
        . '&blocked_date=gte.' . $startDate
        . '&blocked_date=lte.' . $endDate
        . '&order=blocked_date';

    $response = supabaseRequest($url, 'GET');

    if ($response['code'] === 200) {
        jsonResponse([
            'blocked_dates' => $response['data'] ?? [],
            'count' => count($response['data'] ?? [])
        ]);
    } else {
        jsonResponse(['error' => 'Failed to fetch blocked dates'], $response['code']);
    }
}

// =============================================
// BLOCK DATES
// =============================================
function blockDates($coachId, $input) {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (empty($authHeader)) {
        jsonResponse(['error' => 'Unauthorized'], 401);
        return;
    }

    $dates = $input['dates'] ?? [];
    $reason = $input['reason'] ?? null;

    if (empty($dates)) {
        jsonResponse(['error' => 'No dates provided'], 400);
        return;
    }

    // Validate dates
    foreach ($dates as $date) {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            jsonResponse(['error' => 'Invalid date format: ' . $date], 400);
            return;
        }
    }

    // Insert blocked dates (ignore duplicates)
    $insertData = array_map(function($date) use ($coachId, $reason) {
        return [
            'coach_id' => $coachId,
            'blocked_date' => $date,
            'reason' => $reason
        ];
    }, $dates);

    $url = SUPABASE_URL . '/rest/v1/cs_coach_blocked_dates';
    $response = supabaseRequest($url, 'POST', $insertData, $authHeader, [
        'Prefer: return=representation',
        'Prefer: resolution=ignore-duplicates'
    ]);

    if ($response['code'] === 201 || $response['code'] === 200) {
        jsonResponse([
            'success' => true,
            'blocked_count' => count($dates),
            'blocked_dates' => $response['data'] ?? []
        ]);
    } else {
        jsonResponse(['error' => 'Failed to block dates', 'details' => $response['data']], $response['code']);
    }
}

// =============================================
// UNBLOCK DATES
// =============================================
function unblockDates($coachId, $input) {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (empty($authHeader)) {
        jsonResponse(['error' => 'Unauthorized'], 401);
        return;
    }

    $dates = $input['dates'] ?? $_GET['dates'] ?? [];

    if (is_string($dates)) {
        $dates = explode(',', $dates);
    }

    if (empty($dates)) {
        jsonResponse(['error' => 'No dates provided'], 400);
        return;
    }

    // Delete blocked dates
    $dateList = implode(',', array_map(fn($d) => '"' . $d . '"', $dates));
    $url = SUPABASE_URL . '/rest/v1/cs_coach_blocked_dates'
        . '?coach_id=eq.' . $coachId
        . '&blocked_date=in.(' . implode(',', $dates) . ')';

    $response = supabaseRequest($url, 'DELETE', null, $authHeader);

    if ($response['code'] === 204 || $response['code'] === 200) {
        jsonResponse([
            'success' => true,
            'unblocked_count' => count($dates)
        ]);
    } else {
        jsonResponse(['error' => 'Failed to unblock dates'], $response['code']);
    }
}

// =============================================
// GET BOOKING SETTINGS
// =============================================
function getBookingSettings($coachId) {
    $url = SUPABASE_URL . '/rest/v1/cs_coach_booking_settings?coach_id=eq.' . $coachId;
    $response = supabaseRequest($url, 'GET');

    if ($response['code'] === 200) {
        $settings = $response['data'][0] ?? null;

        if (!$settings) {
            // Return defaults
            $settings = [
                'coach_id' => $coachId,
                'timezone' => 'Europe/Berlin',
                'buffer_before_minutes' => 15,
                'buffer_after_minutes' => 15,
                'min_notice_hours' => 24,
                'max_advance_days' => 60,
                'discovery_call_duration_minutes' => 20,
                'discovery_calls_enabled' => true,
                'default_session_duration_minutes' => 60,
                'video_link' => null,
                'video_platform' => 'zoom',
                'cancellation_hours' => 24
            ];
        }

        jsonResponse(['settings' => $settings]);
    } else {
        jsonResponse(['error' => 'Failed to fetch settings'], $response['code']);
    }
}

// =============================================
// UPDATE BOOKING SETTINGS
// =============================================
function updateBookingSettings($coachId, $input) {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (empty($authHeader)) {
        jsonResponse(['error' => 'Unauthorized'], 401);
        return;
    }

    // Allowed fields
    $allowedFields = [
        'timezone', 'buffer_before_minutes', 'buffer_after_minutes',
        'min_notice_hours', 'max_advance_days', 'discovery_call_duration_minutes',
        'discovery_calls_enabled', 'default_session_duration_minutes',
        'video_link', 'video_platform', 'cancellation_hours'
    ];

    $updateData = ['coach_id' => $coachId];
    foreach ($allowedFields as $field) {
        if (isset($input[$field])) {
            $updateData[$field] = $input[$field];
        }
    }
    $updateData['updated_at'] = date('c');

    // Upsert settings
    $url = SUPABASE_URL . '/rest/v1/cs_coach_booking_settings';
    $response = supabaseRequest($url, 'POST', $updateData, $authHeader, [
        'Prefer: return=representation',
        'Prefer: resolution=merge-duplicates'
    ]);

    if ($response['code'] === 201 || $response['code'] === 200) {
        jsonResponse([
            'success' => true,
            'settings' => $response['data'][0] ?? $updateData
        ]);
    } else {
        jsonResponse(['error' => 'Failed to update settings', 'details' => $response['data']], $response['code']);
    }
}

// =============================================
// HELPER FUNCTIONS
// =============================================

function supabaseRequest($url, $method, $data = null, $authHeader = null, $extraHeaders = []) {
    $headers = [
        'apikey: ' . SUPABASE_ANON_KEY,
        'Authorization: ' . ($authHeader ?: 'Bearer ' . SUPABASE_ANON_KEY),
        'Content-Type: application/json'
    ];

    $headers = array_merge($headers, $extraHeaders);

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if ($data) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
    } elseif ($method === 'PUT' || $method === 'PATCH') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        if ($data) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
    } elseif ($method === 'DELETE') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return [
        'code' => $httpCode,
        'data' => json_decode($response, true)
    ];
}

function jsonResponse($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}
