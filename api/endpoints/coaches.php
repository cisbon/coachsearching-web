<?php
/**
 * Coaches Endpoints
 * GET /coaches - Get all coaches
 * GET /coaches/{id} - Get specific coach
 * PUT /coaches/{id} - Update coach profile
 * GET /coaches/{id}/portfolio - Get coach portfolio
 * PUT /coaches/{id}/portfolio - Update coach portfolio
 * GET /coaches/{id}/availability - Get coach availability
 * POST /coaches/{id}/availability - Set coach availability
 */

function handleCoaches($method, $id, $action, $input) {
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
    error_log('[COACH DEBUG] getCoaches() called');

    // Try to get from Supabase
    try {
        $supabaseUrl = SUPABASE_URL;
        $supabaseKey = SUPABASE_ANON_KEY;

        error_log('[COACH DEBUG] Supabase URL: ' . $supabaseUrl);
        error_log('[COACH DEBUG] Fetching from coaches table...');

        $url = $supabaseUrl . '/rest/v1/coaches?select=*';
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

        error_log('[COACH DEBUG] Supabase HTTP code: ' . $httpCode);

        if ($curlError) {
            error_log('[COACH DEBUG] CURL error: ' . $curlError);
        }

        if ($httpCode === 200 && $response) {
            $coaches = json_decode($response, true);
            error_log('[COACH DEBUG] Successfully loaded ' . count($coaches) . ' coaches from Supabase');
            error_log('[COACH DEBUG] Coach names: ' . json_encode(array_column($coaches, 'full_name')));
            echo json_encode(['coaches' => $coaches, 'source' => 'supabase']);
            return;
        } else {
            error_log('[COACH DEBUG] Failed to load from Supabase, HTTP code: ' . $httpCode);
            error_log('[COACH DEBUG] Response: ' . substr($response, 0, 200));
        }
    } catch (Exception $e) {
        error_log('[COACH DEBUG] Exception: ' . $e->getMessage());
    }

    // Fallback to mock data
    error_log('[COACH DEBUG] Using mock data');
    $coaches = [
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
            'is_verified' => true,
            'avatar_url' => null,
            'location' => 'Remote'
        ]
    ];

    echo json_encode(['coaches' => $coaches, 'source' => 'mock']);
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
