<?php
/**
 * Coaches Endpoints - Trust-Building Profile System
 *
 * GET /coaches - Get all coaches (video priority sorting)
 * GET /coaches/featured - Get featured coaches with videos
 * GET /coaches/{id} - Get specific coach with full profile
 * PUT /coaches/{id} - Update coach profile
 * GET /coaches/{id}/credentials - Get coach credentials
 * POST /coaches/{id}/credentials - Add credential
 * GET /coaches/{id}/services - Get coach services/pricing
 * POST /coaches/{id}/services - Add service
 * GET /coaches/{id}/reviews - Get coach reviews
 * GET /coaches/{id}/portfolio - Get coach portfolio
 * PUT /coaches/{id}/portfolio - Update coach portfolio
 * GET /coaches/{id}/availability - Get coach availability
 * POST /coaches/{id}/availability - Set coach availability
 */

function handleCoaches($method, $id, $action, $input) {
    // Handle featured coaches route
    if ($id === 'featured') {
        if ($method === 'GET') {
            getFeaturedCoaches();
        } else {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
        }
        return;
    }

    // Handle credentials
    if ($id && $action === 'credentials') {
        if ($method === 'GET') {
            getCoachCredentials($id);
        } elseif ($method === 'POST') {
            addCoachCredential($id, $input);
        } elseif ($method === 'DELETE') {
            deleteCoachCredential($id, $input);
        } else {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
        }
        return;
    }

    // Handle services
    if ($id && $action === 'services') {
        if ($method === 'GET') {
            getCoachServices($id);
        } elseif ($method === 'POST') {
            addCoachService($id, $input);
        } elseif ($method === 'PUT') {
            updateCoachService($id, $input);
        } elseif ($method === 'DELETE') {
            deleteCoachService($id, $input);
        } else {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
        }
        return;
    }

    // Handle reviews
    if ($id && $action === 'reviews') {
        if ($method === 'GET') {
            getCoachReviews($id);
        } else {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
        }
        return;
    }

    if ($id && $action === 'portfolio') {
        if ($method === 'GET') {
            getCoachPortfolio($id);
        } elseif ($method === 'PUT') {
            updateCoachPortfolio($id, $input);
        } else {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
        }
        return;
    }

    if ($id && $action === 'availability') {
        if ($method === 'GET') {
            getCoachAvailability($id);
        } elseif ($method === 'POST') {
            setCoachAvailability($id, $input);
        } else {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
        }
        return;
    }

    if ($method === 'GET') {
        if ($id) {
            getCoach($id);
        } else {
            getCoaches();
        }
    } elseif ($method === 'PUT' && $id) {
        updateCoach($id, $input);
    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
    }
}

function getCoaches() {
    error_log('[COACH DEBUG] getCoaches() called with video priority');

    // Get query parameters for filtering
    $search = $_GET['search'] ?? null;
    $specialty = $_GET['specialty'] ?? null;
    $language = $_GET['language'] ?? null;
    $maxPrice = $_GET['max_price'] ?? null;
    $hasVideo = $_GET['has_video'] ?? null;

    try {
        $supabaseUrl = SUPABASE_URL;
        $supabaseKey = SUPABASE_ANON_KEY;

        // Build query with video priority sorting
        // Coaches with videos appear first, then sorted by trust_score, then rating
        $url = $supabaseUrl . '/rest/v1/cs_coaches?select=*&onboarding_completed=eq.true';

        // Add filters
        if ($hasVideo === 'true') {
            $url .= '&video_intro_url=not.is.null';
        }
        if ($maxPrice) {
            $url .= '&hourly_rate=lte.' . floatval($maxPrice);
        }

        // Sort by video presence (nulls last), then trust_score, then rating
        $url .= '&order=video_intro_url.desc.nullslast,trust_score.desc,rating_average.desc';

        $headers = [
            'apikey: ' . $supabaseKey,
            'Authorization: Bearer ' . $supabaseKey,
            'Content-Type: application/json'
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            error_log('[COACH DEBUG] CURL error: ' . $curlError);
        }

        if ($httpCode === 200 && $response) {
            $coaches = json_decode($response, true);

            // Apply text search filter (specialty, name, location)
            if ($search) {
                $searchLower = strtolower($search);
                $coaches = array_filter($coaches, function($coach) use ($searchLower) {
                    $fullName = strtolower($coach['full_name'] ?? '');
                    $title = strtolower($coach['title'] ?? '');
                    $bio = strtolower($coach['bio'] ?? '');
                    $location = strtolower($coach['location'] ?? '');
                    $specialties = array_map('strtolower', $coach['specialties'] ?? []);

                    return strpos($fullName, $searchLower) !== false
                        || strpos($title, $searchLower) !== false
                        || strpos($bio, $searchLower) !== false
                        || strpos($location, $searchLower) !== false
                        || in_array($searchLower, $specialties)
                        || array_filter($specialties, fn($s) => strpos($s, $searchLower) !== false);
                });
                $coaches = array_values($coaches);
            }

            // Filter by specific specialty
            if ($specialty) {
                $specialtyLower = strtolower($specialty);
                $coaches = array_filter($coaches, function($coach) use ($specialtyLower) {
                    $specialties = array_map('strtolower', $coach['specialties'] ?? []);
                    return in_array($specialtyLower, $specialties);
                });
                $coaches = array_values($coaches);
            }

            // Filter by language
            if ($language) {
                $languageLower = strtolower($language);
                $coaches = array_filter($coaches, function($coach) use ($languageLower) {
                    $languages = array_map('strtolower', $coach['languages'] ?? []);
                    return in_array($languageLower, $languages);
                });
                $coaches = array_values($coaches);
            }

            error_log('[COACH DEBUG] Successfully loaded ' . count($coaches) . ' coaches (video priority)');

            // Separate featured (with video) and regular coaches
            $featured = array_filter($coaches, fn($c) => !empty($c['video_intro_url']));
            $regular = array_filter($coaches, fn($c) => empty($c['video_intro_url']));

            echo json_encode([
                'coaches' => array_values($coaches),
                'featured' => array_values($featured),
                'regular' => array_values($regular),
                'total' => count($coaches),
                'source' => 'supabase'
            ]);
            return;
        } else {
            error_log('[COACH DEBUG] Failed to load from Supabase, HTTP code: ' . $httpCode);
        }
    } catch (Exception $e) {
        error_log('[COACH DEBUG] Exception: ' . $e->getMessage());
    }

    // Fallback to mock data
    error_log('[COACH DEBUG] Using mock data');
    $coaches = getMockCoaches();
    echo json_encode(['coaches' => $coaches, 'featured' => [], 'regular' => $coaches, 'source' => 'mock']);
}

/**
 * Get featured coaches (with video introductions)
 */
function getFeaturedCoaches() {
    try {
        $supabaseUrl = SUPABASE_URL;
        $supabaseKey = SUPABASE_ANON_KEY;

        // Only get coaches with video intro, sorted by trust score
        $url = $supabaseUrl . '/rest/v1/cs_coaches?select=*'
            . '&onboarding_completed=eq.true'
            . '&video_intro_url=not.is.null'
            . '&order=trust_score.desc,rating_average.desc'
            . '&limit=6';

        $headers = [
            'apikey: ' . $supabaseKey,
            'Authorization: Bearer ' . $supabaseKey,
            'Content-Type: application/json'
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200 && $response) {
            $coaches = json_decode($response, true);
            echo json_encode(['featured_coaches' => $coaches, 'count' => count($coaches)]);
            return;
        }
    } catch (Exception $e) {
        error_log('[COACH DEBUG] Exception in getFeaturedCoaches: ' . $e->getMessage());
    }

    echo json_encode(['featured_coaches' => [], 'count' => 0]);
}

/**
 * Get mock coaches for fallback
 */
function getMockCoaches() {
    return [
        [
            'id' => '1',
            'full_name' => 'Sarah Johnson',
            'email' => 'sarah@example.com',
            'title' => 'Certified Life Coach',
            'bio' => 'Helping professionals find clarity and purpose',
            'specialties' => ['Life Coaching', 'Career Coaching'],
            'languages' => ['English', 'Spanish'],
            'hourly_rate' => 75.00,
            'rating_average' => 4.9,
            'rating_count' => 87,
            'trust_score' => 75,
            'is_verified' => true,
            'avatar_url' => null,
            'location' => 'Remote',
            'video_intro_url' => null
        ]
    ];
}

function getCoach($id) {
    // TODO: Replace with actual Supabase query
    $coach = [
        'id' => $id,
        'name' => 'Sarah Johnson',
        'email' => 'sarah@example.com',
        'professional_title' => 'Certified Life Coach',
        'bio' => 'Helping professionals find clarity and purpose for over 8 years',
        'specialties' => ['Life Coaching', 'Career Coaching', 'Leadership'],
        'languages' => ['English', 'Spanish'],
        'hourly_rate' => 75.00,
        'rating' => 4.9,
        'review_count' => 87,
        'is_verified' => true,
        'avatar_url' => null,
        'years_experience' => 8,
        'location' => 'San Francisco, CA'
    ];
    
    echo json_encode($coach);
}

function updateCoach($id, $input) {
    // TODO: Implement actual Supabase update
    echo json_encode([
        'success' => true,
        'message' => 'Coach profile updated',
        'coach_id' => $id
    ]);
}

function getCoachPortfolio($id) {
    // TODO: Replace with actual Supabase query
    $portfolio = [
        'overview' => [
            'summary' => 'Professional life coach with 8 years of experience',
            'years_experience' => 8,
            'clients_coached' => 150,
            'success_rate' => 92,
            'education' => 'ICF Certified Coach (PCC)',
            'philosophy' => 'Holistic approach combining CBT and mindfulness'
        ],
        'certifications' => [
            [
                'id' => '1',
                'name' => 'ICF Professional Certified Coach',
                'issuer' => 'International Coaching Federation',
                'date' => '2019-06',
                'credential_id' => 'PCC123456',
                'image_url' => null
            ]
        ],
        'case_studies' => [
            [
                'id' => '1',
                'title' => 'Career Transition Success',
                'client_type' => 'Executive',
                'challenge' => 'Wanted to transition from finance to tech',
                'approach' => 'Identified transferable skills and built action plan',
                'results' => 'Successfully transitioned to Product Manager role',
                'duration' => '6 months',
                'image_url' => null
            ]
        ],
        'media' => [
            'video_intro' => '',
            'images' => [],
            'documents' => []
        ]
    ];
    
    echo json_encode($portfolio);
}

function updateCoachPortfolio($id, $input) {
    // TODO: Implement actual Supabase update
    echo json_encode([
        'success' => true,
        'message' => 'Portfolio updated',
        'coach_id' => $id
    ]);
}

function getCoachAvailability($id) {
    // TODO: Replace with actual Supabase query
    $availability = [
        'monday' => [
            ['start' => '09:00', 'end' => '12:00'],
            ['start' => '14:00', 'end' => '17:00']
        ],
        'tuesday' => [
            ['start' => '09:00', 'end' => '17:00']
        ],
        'wednesday' => [],
        'thursday' => [
            ['start' => '09:00', 'end' => '17:00']
        ],
        'friday' => [
            ['start' => '09:00', 'end' => '15:00']
        ],
        'saturday' => [],
        'sunday' => []
    ];
    
    echo json_encode($availability);
}

function setCoachAvailability($id, $input) {
    // TODO: Implement actual Supabase update
    echo json_encode([
        'success' => true,
        'message' => 'Availability updated',
        'coach_id' => $id
    ]);
}

// =============================================
// CREDENTIALS ENDPOINTS
// =============================================

/**
 * Get coach credentials
 */
function getCoachCredentials($coachId) {
    try {
        $supabaseUrl = SUPABASE_URL;
        $supabaseKey = SUPABASE_ANON_KEY;

        $url = $supabaseUrl . '/rest/v1/cs_coach_credentials?coach_id=eq.' . $coachId
            . '&order=is_verified.desc,created_at.desc';

        $headers = [
            'apikey: ' . $supabaseKey,
            'Authorization: Bearer ' . $supabaseKey,
            'Content-Type: application/json'
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200 && $response) {
            $credentials = json_decode($response, true);
            $verifiedCount = count(array_filter($credentials, fn($c) => $c['is_verified']));
            echo json_encode([
                'credentials' => $credentials,
                'total' => count($credentials),
                'verified_count' => $verifiedCount
            ]);
            return;
        }
    } catch (Exception $e) {
        error_log('[CREDENTIALS] Exception: ' . $e->getMessage());
    }

    echo json_encode(['credentials' => [], 'total' => 0, 'verified_count' => 0]);
}

/**
 * Add coach credential
 */
function addCoachCredential($coachId, $input) {
    // Verify authorization
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (empty($authHeader)) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    try {
        $supabaseUrl = SUPABASE_URL;
        $supabaseKey = SUPABASE_ANON_KEY;

        $data = [
            'coach_id' => $coachId,
            'credential_type' => $input['credential_type'] ?? 'certification',
            'title' => $input['title'] ?? '',
            'issuing_organization' => $input['issuing_organization'] ?? '',
            'issue_date' => $input['issue_date'] ?? null,
            'expiry_date' => $input['expiry_date'] ?? null,
            'credential_url' => $input['credential_url'] ?? null,
            'document_url' => $input['document_url'] ?? null,
            'is_verified' => false
        ];

        $url = $supabaseUrl . '/rest/v1/cs_coach_credentials';

        $headers = [
            'apikey: ' . $supabaseKey,
            'Authorization: ' . $authHeader,
            'Content-Type: application/json',
            'Prefer: return=representation'
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 201 && $response) {
            $credential = json_decode($response, true);
            echo json_encode(['success' => true, 'credential' => $credential[0] ?? $credential]);
            return;
        } else {
            http_response_code($httpCode);
            echo json_encode(['error' => 'Failed to add credential', 'details' => $response]);
            return;
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

/**
 * Delete coach credential
 */
function deleteCoachCredential($coachId, $input) {
    $credentialId = $input['credential_id'] ?? $_GET['credential_id'] ?? null;

    if (!$credentialId) {
        http_response_code(400);
        echo json_encode(['error' => 'Credential ID required']);
        return;
    }

    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (empty($authHeader)) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    try {
        $supabaseUrl = SUPABASE_URL;
        $supabaseKey = SUPABASE_ANON_KEY;

        $url = $supabaseUrl . '/rest/v1/cs_coach_credentials?id=eq.' . $credentialId . '&coach_id=eq.' . $coachId;

        $headers = [
            'apikey: ' . $supabaseKey,
            'Authorization: ' . $authHeader,
            'Content-Type: application/json'
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 204 || $httpCode === 200) {
            echo json_encode(['success' => true, 'message' => 'Credential deleted']);
        } else {
            http_response_code($httpCode);
            echo json_encode(['error' => 'Failed to delete credential']);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

// =============================================
// SERVICES ENDPOINTS
// =============================================

/**
 * Get coach services/pricing
 */
function getCoachServices($coachId) {
    try {
        $supabaseUrl = SUPABASE_URL;
        $supabaseKey = SUPABASE_ANON_KEY;

        $url = $supabaseUrl . '/rest/v1/cs_coach_services?coach_id=eq.' . $coachId
            . '&is_active=eq.true&order=sort_order.asc,is_featured.desc';

        $headers = [
            'apikey: ' . $supabaseKey,
            'Authorization: Bearer ' . $supabaseKey,
            'Content-Type: application/json'
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200 && $response) {
            $services = json_decode($response, true);
            echo json_encode(['services' => $services, 'count' => count($services)]);
            return;
        }
    } catch (Exception $e) {
        error_log('[SERVICES] Exception: ' . $e->getMessage());
    }

    echo json_encode(['services' => [], 'count' => 0]);
}

/**
 * Add coach service
 */
function addCoachService($coachId, $input) {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (empty($authHeader)) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    try {
        $supabaseUrl = SUPABASE_URL;
        $supabaseKey = SUPABASE_ANON_KEY;

        $data = [
            'coach_id' => $coachId,
            'service_type' => $input['service_type'] ?? 'single_session',
            'name' => $input['name'] ?? '',
            'description' => $input['description'] ?? null,
            'duration_minutes' => $input['duration_minutes'] ?? 60,
            'session_count' => $input['session_count'] ?? 1,
            'price' => $input['price'] ?? 0,
            'currency' => $input['currency'] ?? 'EUR',
            'is_featured' => $input['is_featured'] ?? false,
            'is_active' => true,
            'sort_order' => $input['sort_order'] ?? 0
        ];

        $url = $supabaseUrl . '/rest/v1/cs_coach_services';

        $headers = [
            'apikey: ' . $supabaseKey,
            'Authorization: ' . $authHeader,
            'Content-Type: application/json',
            'Prefer: return=representation'
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 201 && $response) {
            $service = json_decode($response, true);
            echo json_encode(['success' => true, 'service' => $service[0] ?? $service]);
            return;
        } else {
            http_response_code($httpCode);
            echo json_encode(['error' => 'Failed to add service', 'details' => $response]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

/**
 * Update coach service
 */
function updateCoachService($coachId, $input) {
    $serviceId = $input['service_id'] ?? $input['id'] ?? null;

    if (!$serviceId) {
        http_response_code(400);
        echo json_encode(['error' => 'Service ID required']);
        return;
    }

    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (empty($authHeader)) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    try {
        $supabaseUrl = SUPABASE_URL;
        $supabaseKey = SUPABASE_ANON_KEY;

        // Only update fields that are provided
        $updateFields = [];
        $allowedFields = ['name', 'description', 'duration_minutes', 'session_count', 'price', 'currency', 'is_featured', 'is_active', 'sort_order'];

        foreach ($allowedFields as $field) {
            if (isset($input[$field])) {
                $updateFields[$field] = $input[$field];
            }
        }

        if (empty($updateFields)) {
            http_response_code(400);
            echo json_encode(['error' => 'No fields to update']);
            return;
        }

        $url = $supabaseUrl . '/rest/v1/cs_coach_services?id=eq.' . $serviceId . '&coach_id=eq.' . $coachId;

        $headers = [
            'apikey: ' . $supabaseKey,
            'Authorization: ' . $authHeader,
            'Content-Type: application/json',
            'Prefer: return=representation'
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($updateFields));
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200 && $response) {
            $service = json_decode($response, true);
            echo json_encode(['success' => true, 'service' => $service[0] ?? $service]);
        } else {
            http_response_code($httpCode);
            echo json_encode(['error' => 'Failed to update service']);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

/**
 * Delete coach service
 */
function deleteCoachService($coachId, $input) {
    $serviceId = $input['service_id'] ?? $_GET['service_id'] ?? null;

    if (!$serviceId) {
        http_response_code(400);
        echo json_encode(['error' => 'Service ID required']);
        return;
    }

    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (empty($authHeader)) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }

    try {
        $supabaseUrl = SUPABASE_URL;
        $supabaseKey = SUPABASE_ANON_KEY;

        $url = $supabaseUrl . '/rest/v1/cs_coach_services?id=eq.' . $serviceId . '&coach_id=eq.' . $coachId;

        $headers = [
            'apikey: ' . $supabaseKey,
            'Authorization: ' . $authHeader,
            'Content-Type: application/json'
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 204 || $httpCode === 200) {
            echo json_encode(['success' => true, 'message' => 'Service deleted']);
        } else {
            http_response_code($httpCode);
            echo json_encode(['error' => 'Failed to delete service']);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

// =============================================
// REVIEWS ENDPOINTS
// =============================================

/**
 * Get coach reviews
 */
function getCoachReviews($coachId) {
    $limit = $_GET['limit'] ?? 20;
    $offset = $_GET['offset'] ?? 0;

    try {
        $supabaseUrl = SUPABASE_URL;
        $supabaseKey = SUPABASE_ANON_KEY;

        // Get reviews with client info
        $url = $supabaseUrl . '/rest/v1/cs_reviews?coach_id=eq.' . $coachId
            . '&select=*,cs_clients(full_name,avatar_url)'
            . '&order=created_at.desc'
            . '&limit=' . intval($limit)
            . '&offset=' . intval($offset);

        $headers = [
            'apikey: ' . $supabaseKey,
            'Authorization: Bearer ' . $supabaseKey,
            'Content-Type: application/json',
            'Prefer: count=exact'
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_HEADER, true);

        $response = curl_exec($ch);
        $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $headers = substr($response, 0, $headerSize);
        $body = substr($response, $headerSize);

        // Extract total count from Content-Range header
        $totalCount = 0;
        if (preg_match('/content-range:\s*\d+-\d+\/(\d+)/i', $headers, $matches)) {
            $totalCount = intval($matches[1]);
        }

        if ($httpCode === 200 && $body) {
            $reviews = json_decode($body, true);

            // Map client data
            $reviews = array_map(function($review) {
                return [
                    'id' => $review['id'],
                    'rating' => $review['rating'],
                    'comment' => $review['comment'],
                    'created_at' => $review['created_at'],
                    'client_name' => $review['cs_clients']['full_name'] ?? 'Anonymous',
                    'client_avatar' => $review['cs_clients']['avatar_url'] ?? null
                ];
            }, $reviews);

            // Calculate rating distribution
            $distribution = [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0];
            foreach ($reviews as $review) {
                $rating = $review['rating'];
                if (isset($distribution[$rating])) {
                    $distribution[$rating]++;
                }
            }

            echo json_encode([
                'reviews' => $reviews,
                'total' => $totalCount ?: count($reviews),
                'rating_distribution' => $distribution,
                'limit' => intval($limit),
                'offset' => intval($offset)
            ]);
            return;
        }
    } catch (Exception $e) {
        error_log('[REVIEWS] Exception: ' . $e->getMessage());
    }

    echo json_encode(['reviews' => [], 'total' => 0, 'rating_distribution' => [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0]]);
}
