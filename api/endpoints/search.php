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

    // Select visible coaches with required fields
    $selectFields = 'id, display_name, professional_title, bio, specialties, languages, hourly_rate, currency, rating, review_count, is_verified, profile_image_url, video_url, session_formats, location, created_at';

    // Build query
    $dbQuery = $db->from('cs_coaches')
        ->select($selectFields)
        ->eq('is_visible', true);

    // Apply text search if provided
    // Note: Supabase text search uses ilike for simple matching
    if (!empty($query)) {
        // Search in name, title, bio, and specialties
        // For now, use simple ilike - production might use full-text search
        $dbQuery = $dbQuery->or(
            'display_name.ilike.%' . $query . '%,' .
            'professional_title.ilike.%' . $query . '%,' .
            'bio.ilike.%' . $query . '%'
        );
    }

    // Apply price filters
    if ($minPrice !== null) {
        $dbQuery = $dbQuery->gte('hourly_rate', $minPrice);
    }
    if ($maxPrice !== null) {
        $dbQuery = $dbQuery->lte('hourly_rate', $maxPrice);
    }

    // Apply rating filter
    if ($minRating !== null) {
        $dbQuery = $dbQuery->gte('rating', $minRating);
    }

    // Apply verification filter
    if ($isVerified === true) {
        $dbQuery = $dbQuery->eq('is_verified', true);
    }

    // Apply sorting
    // Video priority: coaches with video shown first, then by rating
    switch ($sort) {
        case 'video_priority':
            // Coaches with video_url first, then by rating
            $dbQuery = $dbQuery
                ->order('video_url', ['ascending' => false, 'nullsFirst' => false])
                ->order('rating', ['ascending' => false, 'nullsFirst' => false]);
            break;

        case 'rating':
        case 'rating_desc':
            $dbQuery = $dbQuery->order('rating', ['ascending' => false, 'nullsFirst' => false]);
            break;

        case 'rating_asc':
            $dbQuery = $dbQuery->order('rating', ['ascending' => true]);
            break;

        case 'price_low':
        case 'price_asc':
            $dbQuery = $dbQuery->order('hourly_rate', ['ascending' => true, 'nullsFirst' => false]);
            break;

        case 'price_high':
        case 'price_desc':
            $dbQuery = $dbQuery->order('hourly_rate', ['ascending' => false]);
            break;

        case 'reviews':
        case 'reviews_desc':
            $dbQuery = $dbQuery->order('review_count', ['ascending' => false, 'nullsFirst' => false]);
            break;

        case 'newest':
            $dbQuery = $dbQuery->order('created_at', ['ascending' => false]);
            break;

        default:
            $dbQuery = $dbQuery->order('rating', ['ascending' => false, 'nullsFirst' => false]);
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
        $results = array_filter($results, function($coach) use ($sessionFormat) {
            $formats = $coach['session_formats'] ?? [];
            if (!is_array($formats)) {
                return false;
            }
            return in_array($sessionFormat, $formats);
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

    // Search for matching coach names and specialties
    $results = $db->from('cs_coaches')
        ->select('display_name, professional_title, specialties')
        ->eq('is_visible', true)
        ->or(
            'display_name.ilike.%' . $query . '%,' .
            'professional_title.ilike.%' . $query . '%'
        )
        ->limit(10)
        ->execute();

    $suggestions = [];

    // Collect unique suggestions
    if (is_array($results)) {
        foreach ($results as $coach) {
            // Add coach name as suggestion
            if (!empty($coach['display_name'])) {
                $suggestions[] = [
                    'text' => $coach['display_name'],
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
