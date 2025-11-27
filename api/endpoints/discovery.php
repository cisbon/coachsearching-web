<?php
/**
 * api/endpoints/discovery.php
 * Coach Discovery System API Endpoints
 * Handles search, quiz, and concierge matching functionality
 * Includes AI-powered matching via OpenRouter
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../lib/OpenRouter.php';

// Route handling
$method = $_SERVER['REQUEST_METHOD'];
$path = trim($_GET['path'] ?? '', '/');
$pathParts = explode('/', $path);

// Parse route
$resource = $pathParts[0] ?? '';
$action = $pathParts[1] ?? '';
$id = $pathParts[2] ?? null;

try {
    switch ($resource) {
        case 'search':
            handleSearch($method);
            break;

        case 'quiz':
            handleQuiz($method, $action, $id);
            break;

        case 'concierge':
            handleConcierge($method, $action, $id);
            break;

        case 'specialties':
            handleSpecialties($method);
            break;

        case 'locations':
            handleLocations($method);
            break;

        case 'suggestions':
            handleSuggestions($method);
            break;

        default:
            jsonResponse(['error' => 'Invalid endpoint'], 404);
    }
} catch (Exception $e) {
    error_log("Discovery API Error: " . $e->getMessage());
    jsonResponse(['error' => 'Server error', 'message' => $e->getMessage()], 500);
}

// =============================================
// SEARCH ENDPOINTS
// =============================================

function handleSearch($method) {
    if ($method !== 'GET' && $method !== 'POST') {
        jsonResponse(['error' => 'Method not allowed'], 405);
        return;
    }

    // Get search parameters
    $params = $method === 'POST' ? json_decode(file_get_contents('php://input'), true) : $_GET;

    $query = $params['q'] ?? '';
    $filters = $params['filters'] ?? [];
    $sort = $params['sort'] ?? 'recommended';
    $page = max(1, intval($params['page'] ?? 1));
    $limit = min(50, max(1, intval($params['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;

    // Build Supabase query
    $url = SUPABASE_URL . '/rest/v1/cs_coaches?select=*';

    // Base filter: only completed onboarding
    $url .= '&onboarding_completed=eq.true';

    // Text search (across multiple fields)
    if (!empty($query)) {
        $searchTerm = urlencode($query);
        $url .= "&or=(full_name.ilike.%{$searchTerm}%,title.ilike.%{$searchTerm}%,bio.ilike.%{$searchTerm}%,city.ilike.%{$searchTerm}%)";
    }

    // Apply filters
    if (is_string($filters)) {
        $filters = json_decode($filters, true) ?? [];
    }

    if (!empty($filters['location'])) {
        $location = urlencode($filters['location']);
        $url .= "&city=ilike.%{$location}%";
    }

    if (!empty($filters['priceMin'])) {
        $url .= "&hourly_rate=gte.{$filters['priceMin']}";
    }

    if (!empty($filters['priceMax'])) {
        $url .= "&hourly_rate=lte.{$filters['priceMax']}";
    }

    if (!empty($filters['hasVideo'])) {
        $url .= "&video_intro_url=not.is.null";
    }

    if (!empty($filters['verified'])) {
        $url .= "&is_verified=eq.true";
    }

    if (!empty($filters['minRating'])) {
        $url .= "&rating_average=gte.{$filters['minRating']}";
    }

    // Sorting
    switch ($sort) {
        case 'rating':
            $url .= '&order=rating_average.desc.nullslast';
            break;
        case 'price_low':
            $url .= '&order=hourly_rate.asc.nullslast';
            break;
        case 'price_high':
            $url .= '&order=hourly_rate.desc.nullslast';
            break;
        case 'experience':
            $url .= '&order=years_experience.desc.nullslast';
            break;
        case 'newest':
            $url .= '&order=created_at.desc';
            break;
        default: // recommended
            $url .= '&order=video_intro_url.desc.nullslast,trust_score.desc.nullslast,rating_average.desc.nullslast';
    }

    // Pagination
    $url .= "&offset={$offset}&limit={$limit}";

    // Execute request
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => getSupabaseHeaders(true) // Include count header
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        jsonResponse(['error' => 'Failed to fetch coaches', 'details' => $response], $httpCode);
        return;
    }

    $coaches = json_decode($response, true) ?? [];

    // Apply client-side filters for array fields
    if (!empty($filters['specialties']) && is_array($filters['specialties'])) {
        $coaches = array_filter($coaches, function($coach) use ($filters) {
            $coachSpecs = $coach['specialties'] ?? [];
            foreach ($filters['specialties'] as $filterSpec) {
                foreach ($coachSpecs as $spec) {
                    if (stripos($spec, $filterSpec) !== false) {
                        return true;
                    }
                }
            }
            return false;
        });
    }

    if (!empty($filters['languages']) && is_array($filters['languages'])) {
        $coaches = array_filter($coaches, function($coach) use ($filters) {
            $coachLangs = $coach['languages'] ?? [];
            return !empty(array_intersect($coachLangs, $filters['languages']));
        });
    }

    if (!empty($filters['sessionType'])) {
        $coaches = array_filter($coaches, function($coach) use ($filters) {
            $sessionTypes = $coach['session_types'] ?? [];
            return in_array($filters['sessionType'], $sessionTypes);
        });
    }

    $coaches = array_values($coaches); // Re-index array

    // Track search event
    trackSearchEvent($query, $filters, count($coaches));

    // Separate featured and regular coaches
    $featured = array_filter($coaches, fn($c) => !empty($c['video_intro_url']));
    $regular = array_filter($coaches, fn($c) => empty($c['video_intro_url']));

    jsonResponse([
        'coaches' => $coaches,
        'featured' => array_values($featured),
        'regular' => array_values($regular),
        'total' => count($coaches),
        'page' => $page,
        'limit' => $limit,
        'filters_applied' => $filters
    ]);
}

function trackSearchEvent($query, $filters, $resultsCount) {
    try {
        $sessionId = $_SERVER['HTTP_X_SESSION_ID'] ?? session_id() ?: uniqid('search_');

        $data = [
            'session_id' => $sessionId,
            'search_query' => $query ?: null,
            'filters' => json_encode($filters),
            'results_count' => $resultsCount,
            'page_url' => $_SERVER['HTTP_REFERER'] ?? null,
            'device_type' => detectDeviceType()
        ];

        $url = SUPABASE_URL . '/rest/v1/cs_search_events';
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_HTTPHEADER => getSupabaseHeaders()
        ]);
        curl_exec($ch);
        curl_close($ch);
    } catch (Exception $e) {
        error_log("Search tracking error: " . $e->getMessage());
    }
}

// =============================================
// QUIZ ENDPOINTS
// =============================================

function handleQuiz($method, $action, $id) {
    switch ($action) {
        case 'questions':
            getQuizQuestions();
            break;

        case 'start':
            if ($method !== 'POST') {
                jsonResponse(['error' => 'Method not allowed'], 405);
                return;
            }
            startQuiz();
            break;

        case 'submit':
            if ($method !== 'POST') {
                jsonResponse(['error' => 'Method not allowed'], 405);
                return;
            }
            submitQuiz();
            break;

        case 'matches':
            if ($method !== 'POST') {
                jsonResponse(['error' => 'Method not allowed'], 405);
                return;
            }
            getQuizMatches();
            break;

        case 'ai-matches':
            if ($method !== 'POST') {
                jsonResponse(['error' => 'Method not allowed'], 405);
                return;
            }
            getAIQuizMatches();
            break;

        case 'response':
            if ($id) {
                getQuizResponse($id);
            } else {
                jsonResponse(['error' => 'Response ID required'], 400);
            }
            break;

        default:
            jsonResponse(['error' => 'Invalid quiz action'], 404);
    }
}

function getQuizQuestions() {
    $url = SUPABASE_URL . '/rest/v1/cs_quiz_questions?is_active=eq.true&order=sort_order';

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => getSupabaseHeaders()
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        jsonResponse(['error' => 'Failed to fetch questions'], $httpCode);
        return;
    }

    $questions = json_decode($response, true) ?? [];
    jsonResponse(['questions' => $questions]);
}

function startQuiz() {
    $data = json_decode(file_get_contents('php://input'), true);

    $sessionId = $data['session_id'] ?? uniqid('quiz_');

    $quizData = [
        'session_id' => $sessionId,
        'user_id' => $data['user_id'] ?? null,
        'started_at' => date('c'),
        'utm_source' => $data['utm_source'] ?? null,
        'utm_medium' => $data['utm_medium'] ?? null,
        'utm_campaign' => $data['utm_campaign'] ?? null,
        'referrer' => $data['referrer'] ?? null,
        'landing_page' => $data['landing_page'] ?? null,
        'device_type' => $data['device_type'] ?? detectDeviceType()
    ];

    $url = SUPABASE_URL . '/rest/v1/cs_quiz_responses';
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($quizData),
        CURLOPT_HTTPHEADER => array_merge(getSupabaseHeaders(), ['Prefer: return=representation'])
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 201) {
        jsonResponse(['error' => 'Failed to start quiz', 'details' => $response], $httpCode);
        return;
    }

    $quizResponse = json_decode($response, true);
    jsonResponse([
        'success' => true,
        'session_id' => $sessionId,
        'quiz_response' => $quizResponse[0] ?? null
    ]);
}

function submitQuiz() {
    $data = json_decode(file_get_contents('php://input'), true);

    $sessionId = $data['session_id'] ?? null;
    $answers = $data['answers'] ?? [];

    if (!$sessionId) {
        jsonResponse(['error' => 'Session ID required'], 400);
        return;
    }

    // Get matched coaches using the matching algorithm
    $matches = calculateMatches($answers);

    // Update quiz response
    $updateData = [
        'answers' => json_encode($answers),
        'matched_coach_ids' => array_column($matches, 'coach_id'),
        'match_scores' => json_encode(array_combine(
            array_column($matches, 'coach_id'),
            array_column($matches, 'match_score')
        )),
        'completed_at' => date('c')
    ];

    $url = SUPABASE_URL . "/rest/v1/cs_quiz_responses?session_id=eq.{$sessionId}";
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => 'PATCH',
        CURLOPT_POSTFIELDS => json_encode($updateData),
        CURLOPT_HTTPHEADER => getSupabaseHeaders()
    ]);

    curl_exec($ch);
    curl_close($ch);

    jsonResponse([
        'success' => true,
        'matches' => $matches,
        'total_matches' => count($matches)
    ]);
}

function getQuizMatches() {
    $data = json_decode(file_get_contents('php://input'), true);
    $answers = $data['answers'] ?? [];
    $limit = $data['limit'] ?? 10;
    $useAI = $data['use_ai'] ?? false;
    $language = $data['language'] ?? 'en'; // Support language parameter

    // Try AI matching if requested and configured
    if ($useAI) {
        $aiResult = getAIQuizMatchesInternal($answers, $limit, $language);
        if ($aiResult['success']) {
            jsonResponse([
                'matches' => $aiResult['matches'],
                'total' => count($aiResult['matches']),
                'ai_powered' => true,
                'ai_insights' => $aiResult['ai_insights'] ?? null
            ]);
            return;
        }
        // Fall back to rule-based if AI fails
        error_log("AI matching failed, falling back to rules: " . ($aiResult['error'] ?? 'Unknown'));
    }

    // Rule-based matching
    $matches = calculateMatches($answers, $limit);

    jsonResponse([
        'matches' => $matches,
        'total' => count($matches),
        'ai_powered' => false
    ]);
}

/**
 * AI-Powered Quiz Matches Endpoint
 * POST /quiz/ai-matches
 */
function getAIQuizMatches() {
    $data = json_decode(file_get_contents('php://input'), true);
    $answers = $data['answers'] ?? [];
    $limit = $data['limit'] ?? 10;
    $language = $data['language'] ?? 'en'; // Support language parameter

    $result = getAIQuizMatchesInternal($answers, $limit, $language);

    if (!$result['success']) {
        // Fall back to rule-based matching
        error_log("AI matching failed: " . ($result['error'] ?? 'Unknown error'));

        $fallbackMatches = calculateMatches($answers, $limit);
        jsonResponse([
            'matches' => $fallbackMatches,
            'total' => count($fallbackMatches),
            'ai_powered' => false,
            'fallback_reason' => $result['error'] ?? 'AI matching unavailable'
        ]);
        return;
    }

    jsonResponse([
        'matches' => $result['matches'],
        'total' => count($result['matches']),
        'ai_powered' => true,
        'ai_insights' => $result['ai_insights'] ?? null,
        'model_used' => $result['model_used'] ?? null
    ]);
}

/**
 * Internal AI matching function
 */
function getAIQuizMatchesInternal($answers, $limit = 10, $language = 'en') {
    $openRouter = new OpenRouter();

    // Check if AI is configured
    if (!$openRouter->isConfigured()) {
        return [
            'success' => false,
            'error' => 'OpenRouter API not configured'
        ];
    }

    // Fetch all active coaches
    $coaches = fetchActiveCoaches();
    if (empty($coaches)) {
        return [
            'success' => false,
            'error' => 'No coaches available'
        ];
    }

    // Use OpenRouter to get AI-powered matches with language support
    $result = $openRouter->matchCoaches($answers, $coaches, $limit, $language);

    if (!$result['success']) {
        return $result;
    }

    return [
        'success' => true,
        'matches' => $result['matches'],
        'ai_insights' => $result['ai_insights'] ?? null,
        'model_used' => $result['model_used'] ?? null
    ];
}

/**
 * Fetch active coaches from database
 */
function fetchActiveCoaches() {
    $url = SUPABASE_URL . '/rest/v1/cs_coaches?select=*&onboarding_completed=eq.true';

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => getSupabaseHeaders()
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        error_log("Failed to fetch coaches: HTTP $httpCode");
        return [];
    }

    return json_decode($response, true) ?? [];
}

function calculateMatches($answers, $limit = 10) {
    // Fetch all active coaches
    $url = SUPABASE_URL . '/rest/v1/cs_coaches?select=*&onboarding_completed=eq.true';

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => getSupabaseHeaders()
    ]);

    $response = curl_exec($ch);
    curl_close($ch);

    $coaches = json_decode($response, true) ?? [];

    // Calculate match score for each coach
    $matches = [];
    foreach ($coaches as $coach) {
        $score = calculateCoachMatchScore($coach, $answers);
        $matches[] = [
            'coach_id' => $coach['id'],
            'match_score' => $score,
            'coach_data' => $coach
        ];
    }

    // Sort by match score descending
    usort($matches, fn($a, $b) => $b['match_score'] <=> $a['match_score']);

    // Return top matches
    return array_slice($matches, 0, $limit);
}

function calculateCoachMatchScore($coach, $answers) {
    $score = 0;

    // Goal/Specialty Match (25 points)
    if (!empty($answers['goal'])) {
        $goalMapping = [
            'career' => ['Career', 'Career Coaching', 'Professional Development'],
            'leadership' => ['Leadership', 'Executive', 'Management'],
            'life' => ['Life', 'Life Coaching', 'Personal Development'],
            'health' => ['Health', 'Wellness', 'Fitness'],
            'business' => ['Business', 'Entrepreneurship', 'Strategy'],
            'relationships' => ['Relationship', 'Relationships', 'Communication']
        ];

        $targetSpecs = $goalMapping[$answers['goal']] ?? [$answers['goal']];
        $coachSpecs = $coach['specialties'] ?? [];

        foreach ($targetSpecs as $target) {
            foreach ($coachSpecs as $spec) {
                if (stripos($spec, $target) !== false) {
                    $score += 25;
                    break 2;
                }
            }
        }
    }

    // Budget Match (20 points)
    if (!empty($answers['budget'])) {
        $rate = $coach['hourly_rate'] ?? 0;
        $budgetMatch = false;

        switch ($answers['budget']) {
            case 'under_50':
                $budgetMatch = $rate <= 50;
                break;
            case '50_100':
                $budgetMatch = $rate >= 50 && $rate <= 100;
                break;
            case '100_200':
                $budgetMatch = $rate >= 100 && $rate <= 200;
                break;
            case '200_plus':
                $budgetMatch = $rate >= 200;
                break;
        }

        if ($budgetMatch) {
            $score += 20;
        }
    }

    // Session Type Match (15 points)
    if (!empty($answers['session_type'])) {
        $sessionTypes = $coach['session_types'] ?? [];
        if ($answers['session_type'] === 'both' || in_array($answers['session_type'], $sessionTypes)) {
            $score += 15;
        }
    }

    // Language Match (15 points)
    if (!empty($answers['language'])) {
        $coachLangs = $coach['languages'] ?? [];
        $requestedLangs = is_array($answers['language']) ? $answers['language'] : [$answers['language']];
        if (!empty(array_intersect($coachLangs, $requestedLangs))) {
            $score += 15;
        }
    }

    // Trust Score Bonus (up to 15 points)
    $trustScore = $coach['trust_score'] ?? 0;
    $score += ($trustScore / 100) * 15;

    // Video Introduction Bonus (5 points)
    if (!empty($coach['video_intro_url'])) {
        $score += 5;
    }

    // Rating Bonus (up to 5 points)
    $rating = $coach['rating_average'] ?? 0;
    if ($rating > 0) {
        $score += ($rating / 5) * 5;
    }

    // Apply importance weights
    if (!empty($answers['importance']) && is_array($answers['importance'])) {
        if (in_array('credentials', $answers['importance']) && $trustScore >= 60) {
            $score *= 1.1;
        }
        if (in_array('experience', $answers['importance']) && ($coach['years_experience'] ?? 0) >= 5) {
            $score *= 1.1;
        }
        if (in_array('reviews', $answers['importance']) && ($coach['rating_count'] ?? 0) >= 5) {
            $score *= 1.1;
        }
        if (in_array('video', $answers['importance']) && !empty($coach['video_intro_url'])) {
            $score *= 1.15;
        }
    }

    return min(100, round($score, 1));
}

function getQuizResponse($sessionId) {
    $url = SUPABASE_URL . "/rest/v1/cs_quiz_responses?session_id=eq.{$sessionId}&limit=1";

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => getSupabaseHeaders()
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        jsonResponse(['error' => 'Failed to fetch quiz response'], $httpCode);
        return;
    }

    $data = json_decode($response, true);
    jsonResponse(['quiz_response' => $data[0] ?? null]);
}

// =============================================
// CONCIERGE ENDPOINTS
// =============================================

function handleConcierge($method, $action, $id) {
    switch ($action) {
        case 'request':
            if ($method === 'POST') {
                createConciergeRequest();
            } elseif ($method === 'GET' && $id) {
                getConciergeRequest($id);
            } else {
                jsonResponse(['error' => 'Invalid request'], 400);
            }
            break;

        default:
            if ($method === 'POST') {
                createConciergeRequest();
            } else {
                jsonResponse(['error' => 'Invalid concierge action'], 404);
            }
    }
}

function createConciergeRequest() {
    $data = json_decode(file_get_contents('php://input'), true);

    // Validate required fields
    if (empty($data['name']) || empty($data['email'])) {
        jsonResponse(['error' => 'Name and email are required'], 400);
        return;
    }

    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        jsonResponse(['error' => 'Invalid email address'], 400);
        return;
    }

    $requestData = [
        'name' => $data['name'],
        'email' => $data['email'],
        'phone' => $data['phone'] ?? null,
        'preferred_contact' => $data['preferred_contact'] ?? 'email',
        'coaching_goals' => $data['coaching_goals'] ?? null,
        'specialties_needed' => $data['specialties_needed'] ?? null,
        'budget_range' => $data['budget_range'] ?? null,
        'timeline' => $data['timeline'] ?? null,
        'session_preference' => $data['session_preference'] ?? null,
        'location' => $data['location'] ?? null,
        'language_preference' => $data['language_preference'] ?? null,
        'additional_notes' => $data['additional_notes'] ?? null,
        'quiz_response_id' => $data['quiz_response_id'] ?? null,
        'status' => 'pending'
    ];

    $url = SUPABASE_URL . '/rest/v1/cs_concierge_requests';
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($requestData),
        CURLOPT_HTTPHEADER => array_merge(getSupabaseHeaders(), ['Prefer: return=representation'])
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 201) {
        jsonResponse(['error' => 'Failed to create request', 'details' => $response], $httpCode);
        return;
    }

    $created = json_decode($response, true);

    // Send notification email (if configured)
    sendConciergeNotification($created[0] ?? $requestData);

    jsonResponse([
        'success' => true,
        'message' => 'Concierge request submitted successfully',
        'request' => $created[0] ?? null
    ], 201);
}

function getConciergeRequest($id) {
    $url = SUPABASE_URL . "/rest/v1/cs_concierge_requests?id=eq.{$id}";

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => getSupabaseHeaders()
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        jsonResponse(['error' => 'Failed to fetch request'], $httpCode);
        return;
    }

    $data = json_decode($response, true);
    jsonResponse(['request' => $data[0] ?? null]);
}

function sendConciergeNotification($request) {
    // TODO: Implement email notification
    // This would send an email to the admin team about the new concierge request
    error_log("New concierge request from: " . $request['email']);
}

// =============================================
// SPECIALTY CATEGORIES ENDPOINT
// =============================================

function handleSpecialties($method) {
    if ($method !== 'GET') {
        jsonResponse(['error' => 'Method not allowed'], 405);
        return;
    }

    $url = SUPABASE_URL . '/rest/v1/cs_specialty_categories?is_active=eq.true&order=sort_order';

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => getSupabaseHeaders()
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        jsonResponse(['error' => 'Failed to fetch specialties'], $httpCode);
        return;
    }

    $specialties = json_decode($response, true) ?? [];
    jsonResponse(['specialties' => $specialties]);
}

// =============================================
// LOCATIONS ENDPOINT
// =============================================

function handleLocations($method) {
    if ($method !== 'GET') {
        jsonResponse(['error' => 'Method not allowed'], 405);
        return;
    }

    $limit = min(50, max(1, intval($_GET['limit'] ?? 20)));
    $withCoaches = isset($_GET['with_coaches']) && $_GET['with_coaches'] === 'true';

    $url = SUPABASE_URL . "/rest/v1/cs_locations?order=coach_count.desc&limit={$limit}";

    if ($withCoaches) {
        $url .= '&coach_count=gt.0';
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => getSupabaseHeaders()
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        jsonResponse(['error' => 'Failed to fetch locations'], $httpCode);
        return;
    }

    $locations = json_decode($response, true) ?? [];
    jsonResponse(['locations' => $locations]);
}

// =============================================
// SEARCH SUGGESTIONS ENDPOINT
// =============================================

function handleSuggestions($method) {
    if ($method !== 'GET') {
        jsonResponse(['error' => 'Method not allowed'], 405);
        return;
    }

    $query = $_GET['q'] ?? '';
    $limit = min(10, max(1, intval($_GET['limit'] ?? 5)));

    if (strlen($query) < 2) {
        jsonResponse(['suggestions' => []]);
        return;
    }

    $searchTerm = urlencode($query);
    $url = SUPABASE_URL . "/rest/v1/cs_search_suggestions?term=ilike.%{$searchTerm}%&order=weight.desc&limit={$limit}";

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => getSupabaseHeaders()
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        // Return empty array on error
        jsonResponse(['suggestions' => []]);
        return;
    }

    $suggestions = json_decode($response, true) ?? [];
    jsonResponse(['suggestions' => $suggestions]);
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

function detectDeviceType() {
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';

    if (preg_match('/mobile/i', $userAgent)) {
        return 'mobile';
    } elseif (preg_match('/tablet/i', $userAgent)) {
        return 'tablet';
    }
    return 'desktop';
}

function getSupabaseHeaders($withCount = false) {
    $headers = [
        'apikey: ' . SUPABASE_KEY,
        'Authorization: Bearer ' . SUPABASE_KEY,
        'Content-Type: application/json'
    ];

    if ($withCount) {
        $headers[] = 'Prefer: count=exact';
    }

    return $headers;
}

function jsonResponse($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}
