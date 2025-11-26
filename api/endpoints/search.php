<?php
/**
 * Search Endpoints
 * POST /search/coaches - Search coaches with filters
 * GET /search/suggestions?q={query} - Get search suggestions
 */

function handleSearch($method, $id, $action, $input) {
    if ($id === 'coaches' && $method === 'POST') {
        searchCoaches($input);
    } elseif ($id === 'suggestions' && $method === 'GET') {
        getSearchSuggestions($_GET['q'] ?? '');
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Search endpoint not found']);
    }
}

function searchCoaches($filters) {
    // TODO: Replace with actual Supabase query with filters
    // Filters: query, specialties, min_price, max_price, min_rating, languages, is_verified, availability_day, sort, page, limit
    
    $query = $filters['query'] ?? '';
    $specialties = $filters['specialties'] ?? [];
    $min_price = $filters['min_price'] ?? null;
    $max_price = $filters['max_price'] ?? null;
    $min_rating = $filters['min_rating'] ?? null;
    $languages = $filters['languages'] ?? [];
    $is_verified = $filters['is_verified'] ?? null;
    $availability_day = $filters['availability_day'] ?? null;
    $sort = $filters['sort'] ?? 'rating';
    $page = $filters['page'] ?? 1;
    $limit = $filters['limit'] ?? 20;
    
    // Mock data - replace with actual query
    $all_coaches = [
        [
            'id' => '1',
            'name' => 'Sarah Johnson',
            'professional_title' => 'Certified Life Coach',
            'bio' => 'Helping professionals find clarity and purpose',
            'specialties' => ['Life Coaching', 'Career Coaching'],
            'languages' => ['English', 'Spanish'],
            'hourly_rate' => 75.00,
            'rating' => 4.9,
            'review_count' => 87,
            'is_verified' => true,
            'avatar_url' => null
        ],
        [
            'id' => '2',
            'name' => 'Michael Chen',
            'professional_title' => 'Executive Coach',
            'bio' => 'Leadership development and executive coaching',
            'specialties' => ['Executive Coaching', 'Leadership', 'Business Coaching'],
            'languages' => ['English', 'Mandarin'],
            'hourly_rate' => 125.00,
            'rating' => 4.8,
            'review_count' => 64,
            'is_verified' => true,
            'avatar_url' => null
        ],
        [
            'id' => '3',
            'name' => 'Emma Wilson',
            'professional_title' => 'Health & Wellness Coach',
            'bio' => 'Holistic approach to health and wellness',
            'specialties' => ['Health & Wellness', 'Mindset'],
            'languages' => ['English'],
            'hourly_rate' => 65.00,
            'rating' => 4.9,
            'review_count' => 92,
            'is_verified' => true,
            'avatar_url' => null
        ]
    ];
    
    // Apply filters (simplified - replace with actual DB query)
    $results = array_filter($all_coaches, function($coach) use ($specialties, $min_price, $max_price, $min_rating, $is_verified) {
        if (!empty($specialties)) {
            $match = false;
            foreach ($specialties as $specialty) {
                if (in_array($specialty, $coach['specialties'])) {
                    $match = true;
                    break;
                }
            }
            if (!$match) return false;
        }
        
        if ($min_price !== null && $coach['hourly_rate'] < $min_price) return false;
        if ($max_price !== null && $coach['hourly_rate'] > $max_price) return false;
        if ($min_rating !== null && $coach['rating'] < $min_rating) return false;
        if ($is_verified !== null && $coach['is_verified'] !== $is_verified) return false;
        
        return true;
    });
    
    echo json_encode([
        'results' => array_values($results),
        'total' => count($results),
        'page' => $page,
        'limit' => $limit
    ]);
}

function getSearchSuggestions($query) {
    // TODO: Replace with actual Supabase query
    if (strlen($query) < 2) {
        echo json_encode(['suggestions' => []]);
        return;
    }
    
    $suggestions = [
        'Life Coaching',
        'Career Coaching',
        'Leadership Development',
        'Executive Coaching',
        'Health & Wellness',
        'Relationship Coaching'
    ];
    
    // Filter suggestions based on query
    $filtered = array_filter($suggestions, function($suggestion) use ($query) {
        return stripos($suggestion, $query) !== false;
    });
    
    echo json_encode(['suggestions' => array_values($filtered)]);
}
