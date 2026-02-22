<?php
/**
 * CoachSearching - Search Endpoints
 *
 * POST /search/coaches - Search coaches with filters
 * GET /search/suggestions?q={query} - Get search suggestions
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../Database.php';
require_once __DIR__ . '/../lib/Sanitizer.php';

/**
 * Main handler for search operations
 */
function handleSearch($method, $id, $action, $input) {
    if ($id === 'coaches' && $method === 'POST') {
        return searchCoaches($input);
    } elseif ($id === 'suggestions' && $method === 'GET') {
        return getSearchSuggestions($_GET['q'] ?? '');
    } else {
        return ['error' => 'Search endpoint not found', 'status' => 404];
    }
}

/**
 * Search coaches with filters
 * Supports: query, specialties, price range, rating, languages, verification, sort, pagination
 */
function searchCoaches($filters) {
    $db = new Database();

    // Extract and sanitize filter values
    $query = Sanitizer::clean($filters['query'] ?? '');
    $specialties = $filters['specialties'] ?? [];
    $minPrice = isset($filters['min_price']) ? (float)$filters['min_price'] : null;
    $maxPrice = isset($filters['max_price']) ? (float)$filters['max_price'] : null;
    $minRating = isset($filters['min_rating']) ? (float)$filters['min_rating'] : null;
    $languages = $filters['languages'] ?? [];
    $isVerified = isset($filters['is_verified']) ? (bool)$filters['is_verified'] : null;
    $sessionFormat = $filters['session_format'] ?? null;
    $sort = $filters['sort'] ?? 'video_priority';
    $page = max(1, (int)($filters['page'] ?? 1));
    $limit = min(50, max(1, (int)($filters['limit'] ?? 20)));

    // Use the coach_profiles view which flattens cs_users + cs_coaches + profile_data JSONB.
    // Columns available: id, full_name, avatar_url, slug, email, title, bio, specialties,
    // languages, session_types, hourly_rate, is_verified, is_featured, profile_views,
    // intro_video_url, onboarding_completed, subscription_status, …
    $selectFields = 'id,full_name,avatar_url,slug,title,bio,specialties,languages,session_types,'
                  . 'hourly_rate,currency,is_verified,is_featured,profile_views,intro_video_url,'
                  . 'city_id,offers_free_discovery,years_experience,banner_url,created_at';

    // Build query against the view
    $dbQuery = $db->from('coach_profiles')
        ->select($selectFields)
        ->eq('onboarding_completed', true);

    if (!empty($query)) {
        $dbQuery = $dbQuery->or(
            'full_name.ilike.%' . $query . '%,' .
            'title.ilike.%'     . $query . '%,' .
            'bio.ilike.%'       . $query . '%'
        );
    }

    // Price filters (hourly_rate is a real numeric column in the view)
    if ($minPrice !== null) {
        $dbQuery = $dbQuery->gte('hourly_rate', $minPrice);
    }
    if ($maxPrice !== null) {
        $dbQuery = $dbQuery->lte('hourly_rate', $maxPrice);
    }

    // Verification filter (is_verified is a boolean column in the view)
    if ($isVerified === true) {
        $dbQuery = $dbQuery->eq('is_verified', true);
    }

    // Apply sorting
    switch ($sort) {
        case 'video_priority':
            $dbQuery = $dbQuery
                ->order('is_featured',    ['ascending' => false, 'nullsFirst' => false])
                ->order('intro_video_url', ['ascending' => false, 'nullsFirst' => false])
                ->order('profile_views',   ['ascending' => false, 'nullsFirst' => false]);
            break;

        case 'price_low':
        case 'price_asc':
            $dbQuery = $dbQuery->order('hourly_rate', ['ascending' => true,  'nullsFirst' => false]);
            break;

        case 'price_high':
        case 'price_desc':
            $dbQuery = $dbQuery->order('hourly_rate', ['ascending' => false]);
            break;

        case 'newest':
            $dbQuery = $dbQuery->order('created_at', ['ascending' => false]);
            break;

        default:
            $dbQuery = $dbQuery
                ->order('is_featured',  ['ascending' => false, 'nullsFirst' => false])
                ->order('profile_views', ['ascending' => false, 'nullsFirst' => false]);
    }

    // Apply pagination
    $offset = ($page - 1) * $limit;
    $dbQuery = $dbQuery->range($offset, $offset + $limit - 1);

    // Execute query
    $results = $dbQuery->execute();

    // Handle errors
    if (!is_array($results)) {
        $results = [];
    }

    // Post-filter for specialty and language (array contains)
    // Note: Supabase REST API array filtering is limited, so we filter in PHP
    if (!empty($specialties) && is_array($specialties)) {
        $results = array_filter($results, function($coach) use ($specialties) {
            $coachSpecialties = $coach['specialties'] ?? [];
            if (!is_array($coachSpecialties)) {
                return false;
            }
            foreach ($specialties as $specialty) {
                if (in_array($specialty, $coachSpecialties)) {
                    return true;
                }
            }
            return false;
        });
    }

    if (!empty($languages) && is_array($languages)) {
        $results = array_filter($results, function($coach) use ($languages) {
            $coachLanguages = $coach['languages'] ?? [];
            if (!is_array($coachLanguages)) {
                return false;
            }
            foreach ($languages as $language) {
                if (in_array($language, $coachLanguages)) {
                    return true;
                }
            }
            return false;
        });
    }

    if (!empty($sessionFormat)) {
        $results = array_filter($results, function ($coach) use ($sessionFormat) {
            $types = $coach['session_types'] ?? [];
            if (!is_array($types)) return false;
            return in_array($sessionFormat, $types);
        });
    }

    // Re-index array after filtering
    $results = array_values($results);

    return [
        'results' => $results,
        'total' => count($results),
        'page' => $page,
        'limit' => $limit,
        'has_more' => count($results) >= $limit
    ];
}

/**
 * Get search suggestions for autocomplete
 */
function getSearchSuggestions($query) {
    $query = Sanitizer::clean($query);

    if (strlen($query) < 2) {
        return ['suggestions' => []];
    }

    $db = new Database();

    // Search against the coach_profiles view
    $results = $db->from('coach_profiles')
        ->select('full_name,title,specialties')
        ->eq('onboarding_completed', true)
        ->or(
            'full_name.ilike.%' . $query . '%,' .
            'title.ilike.%'     . $query . '%'
        )
        ->limit(10)
        ->execute();

    $suggestions = [];

    if (is_array($results)) {
        foreach ($results as $coach) {
            if (!empty($coach['full_name'])) {
                $suggestions[] = [
                    'text' => $coach['full_name'],
                    'type' => 'coach'
                ];
            }

            // Add matching specialties
            if (!empty($coach['specialties']) && is_array($coach['specialties'])) {
                foreach ($coach['specialties'] as $specialty) {
                    if (stripos($specialty, $query) !== false) {
                        $suggestions[] = [
                            'text' => $specialty,
                            'type' => 'specialty'
                        ];
                    }
                }
            }
        }
    }

    // Add common search terms
    $commonTerms = [
        'Life Coaching', 'Career Coaching', 'Executive Coaching',
        'Business Coaching', 'Leadership', 'Health & Wellness',
        'Mindfulness', 'Relationship Coaching', 'Personal Development',
        'Performance Coaching', 'Stress Management', 'Work-Life Balance'
    ];

    foreach ($commonTerms as $term) {
        if (stripos($term, $query) !== false) {
            $suggestions[] = [
                'text' => $term,
                'type' => 'category'
            ];
        }
    }

    // Remove duplicates and limit
    $seen = [];
    $unique = [];
    foreach ($suggestions as $suggestion) {
        $key = strtolower($suggestion['text']);
        if (!isset($seen[$key])) {
            $seen[$key] = true;
            $unique[] = $suggestion;
        }
    }

    return [
        'suggestions' => array_slice($unique, 0, 10)
    ];
}
