<?php
/**
 * Favorites API Endpoint
 * Handles user favorites (saved coaches)
 *
 * Endpoints:
 *   GET    /api/favorites           - Get user's favorites
 *   POST   /api/favorites/:coachId  - Add coach to favorites
 *   DELETE /api/favorites/:coachId  - Remove coach from favorites
 */

declare(strict_types=1);

use CoachSearching\Api\Response;
use CoachSearching\Api\Auth;

/**
 * Handle favorites requests
 */
function handleFavorites(string $method, ?string $coachId, ?string $action, array $input): void
{
    // All favorites endpoints require authentication
    $auth = new Auth();
    $user = $auth->requireAuth();
    $userId = $user['id'];

    $db = getSupabaseClient();

    switch ($method) {
        case 'GET':
            if ($coachId) {
                // Check if specific coach is favorited
                checkFavorite($db, $userId, $coachId);
            } else {
                // Get all favorites
                getFavorites($db, $userId);
            }
            break;

        case 'POST':
            if (!$coachId) {
                Response::error('Coach ID is required', 400, 'MISSING_COACH_ID');
            }
            addFavorite($db, $userId, $coachId);
            break;

        case 'DELETE':
            if (!$coachId) {
                Response::error('Coach ID is required', 400, 'MISSING_COACH_ID');
            }
            removeFavorite($db, $userId, $coachId);
            break;

        default:
            Response::error('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
    }
}

/**
 * Get all favorites for a user
 */
function getFavorites($db, string $userId): void
{
    try {
        // Get favorites with coach details
        $favorites = $db->from('cs_favorites')
            ->select('
                id,
                coach_id,
                created_at,
                cs_coaches (
                    id,
                    full_name,
                    title,
                    avatar_url,
                    slug,
                    specialties,
                    hourly_rate,
                    currency,
                    rating_average,
                    rating_count,
                    location_city,
                    location_country,
                    is_verified
                )
            ')
            ->eq('user_id', $userId)
            ->order('created_at', ['ascending' => false])
            ->execute();

        if (isset($favorites['error'])) {
            throw new Exception($favorites['error']['message'] ?? 'Failed to fetch favorites');
        }

        Response::success([
            'favorites' => $favorites['data'] ?? [],
            'count' => count($favorites['data'] ?? [])
        ]);
    } catch (Exception $e) {
        error_log("Get favorites error: " . $e->getMessage());
        Response::serverError('Failed to fetch favorites');
    }
}

/**
 * Check if a coach is favorited
 */
function checkFavorite($db, string $userId, string $coachId): void
{
    try {
        $favorite = $db->from('cs_favorites')
            ->select('id')
            ->eq('user_id', $userId)
            ->eq('coach_id', $coachId)
            ->single()
            ->execute();

        $isFavorited = !isset($favorite['error']) && !empty($favorite['data']);

        Response::success([
            'is_favorited' => $isFavorited,
            'coach_id' => $coachId
        ]);
    } catch (Exception $e) {
        Response::success([
            'is_favorited' => false,
            'coach_id' => $coachId
        ]);
    }
}

/**
 * Add a coach to favorites
 */
function addFavorite($db, string $userId, string $coachId): void
{
    try {
        // Check if coach exists
        $coach = $db->from('cs_coaches')
            ->select('id, full_name')
            ->eq('id', $coachId)
            ->single()
            ->execute();

        if (isset($coach['error']) || empty($coach['data'])) {
            Response::notFound('Coach');
            return;
        }

        // Check if already favorited
        $existing = $db->from('cs_favorites')
            ->select('id')
            ->eq('user_id', $userId)
            ->eq('coach_id', $coachId)
            ->single()
            ->execute();

        if (!isset($existing['error']) && !empty($existing['data'])) {
            // Already favorited, return success
            Response::success([
                'message' => 'Coach is already in favorites',
                'favorite_id' => $existing['data']['id'],
                'coach_id' => $coachId
            ]);
            return;
        }

        // Add to favorites
        $result = $db->from('cs_favorites')
            ->insert([
                'user_id' => $userId,
                'coach_id' => $coachId
            ])
            ->execute();

        if (isset($result['error'])) {
            throw new Exception($result['error']['message'] ?? 'Failed to add favorite');
        }

        Response::created([
            'message' => 'Coach added to favorites',
            'favorite_id' => $result['data'][0]['id'] ?? null,
            'coach_id' => $coachId,
            'coach_name' => $coach['data']['full_name']
        ]);
    } catch (Exception $e) {
        error_log("Add favorite error: " . $e->getMessage());
        Response::serverError('Failed to add favorite');
    }
}

/**
 * Remove a coach from favorites
 */
function removeFavorite($db, string $userId, string $coachId): void
{
    try {
        $result = $db->from('cs_favorites')
            ->delete()
            ->eq('user_id', $userId)
            ->eq('coach_id', $coachId)
            ->execute();

        if (isset($result['error'])) {
            throw new Exception($result['error']['message'] ?? 'Failed to remove favorite');
        }

        Response::success([
            'message' => 'Coach removed from favorites',
            'coach_id' => $coachId
        ]);
    } catch (Exception $e) {
        error_log("Remove favorite error: " . $e->getMessage());
        Response::serverError('Failed to remove favorite');
    }
}
