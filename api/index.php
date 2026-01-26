<?php
/**
 * CoachSearching PHP API
 * Main entry point and router
 *
 * @version 2.0.0
 * @description RESTful API for the CoachSearching platform
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';

// Load utility classes
require_once __DIR__ . '/lib/Response.php';
require_once __DIR__ . '/lib/Validator.php';
require_once __DIR__ . '/lib/RateLimiter.php';
require_once __DIR__ . '/lib/Auth.php';
require_once __DIR__ . '/lib/Sanitizer.php';

use CoachSearching\Api\Response;
use CoachSearching\Api\RateLimiter;

// Set JSON response header
header('Content-Type: application/json; charset=utf-8');

// Apply rate limiting
$rateLimiter = new RateLimiter(
    (int)(RATE_LIMIT_REQUESTS ?? 60),
    (int)(RATE_LIMIT_WINDOW ?? 60)
);
$rateLimiter->check();

// Get request method and path
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = preg_replace('#^.*/api#', '', $path);
$path = trim($path, '/');

// Parse path segments
$segments = array_filter(explode('/', $path));
$segments = array_values($segments); // Reindex
$resource = $segments[0] ?? '';
$id = $segments[1] ?? null;
$action = $segments[2] ?? null;

// Get request body for POST/PUT/PATCH
$input = [];
if (in_array($method, ['POST', 'PUT', 'PATCH'])) {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true) ?? [];

    // Check for JSON parse errors
    if (json_last_error() !== JSON_ERROR_NONE && !empty($rawInput)) {
        Response::error('Invalid JSON in request body', 400, 'INVALID_JSON');
    }
}

// Route to appropriate handler
try {
    switch ($resource) {
        case 'analytics':
            require_once __DIR__ . '/endpoints/analytics.php';
            handleAnalytics($method, $id, $action, $input);
            break;

        case 'coaches':
            require_once __DIR__ . '/endpoints/coaches.php';
            handleCoaches($method, $id, $action, $input);
            break;

        case 'search':
            require_once __DIR__ . '/endpoints/search.php';
            handleSearch($method, $id, $action, $input);
            break;

        case 'discovery':
            require_once __DIR__ . '/endpoints/discovery.php';
            handleDiscovery($method, $id, $action, $input);
            break;

        case 'bookings':
            require_once __DIR__ . '/endpoints/bookings.php';
            handleBookings($method, $id, $action, $input);
            break;

        case 'discovery-requests':
            require_once __DIR__ . '/endpoints/discovery-requests.php';
            handleDiscoveryRequests($method, $id, $input);
            break;

        case 'availability':
            require_once __DIR__ . '/endpoints/availability.php';
            handleAvailability($method, $id, $action, $input);
            break;

        case 'progress':
            require_once __DIR__ . '/endpoints/progress.php';
            handleProgress($method, $id, $action, $input);
            break;

        case 'referrals':
            require_once __DIR__ . '/endpoints/referrals.php';
            handleReferrals($method, $id, $action, $input);
            break;

        case 'favorites':
            require_once __DIR__ . '/endpoints/favorites.php';
            handleFavorites($method, $id, $action, $input);
            break;

        case 'conversations':
        case 'messages':
            require_once __DIR__ . '/endpoints/messaging.php';
            handleMessaging($method, $resource, $id, $action, $input);
            break;

        case 'promo-codes':
            require_once __DIR__ . '/endpoints/promo-codes.php';
            handlePromoCodes($method, $id, $action, $input);
            break;

        case 'stripe':
            require_once __DIR__ . '/endpoints/stripe.php';
            handleStripe($method, $id, $action, $input);
            break;

        case 'auth':
            require_once __DIR__ . '/endpoints/auth.php';
            handleAuth($method, $id, $action, $input);
            break;

        case 'sitemap.xml':
        case 'sitemap':
            require_once __DIR__ . '/endpoints/sitemap.php';
            generateSitemap();
            exit;

        case 'health':
            Response::success([
                'status' => 'healthy',
                'version' => '2.0.0',
                'environment' => getenv('APP_ENV') ?: 'production',
                'services' => [
                    'database' => 'connected',
                    'cache' => 'available',
                ],
            ]);
            break;

        case 'lookup':
            require_once __DIR__ . '/endpoints/lookup.php';
            handleLookup($method, $id, $action, $input);
            break;

        case 'ai-council':
            require_once __DIR__ . '/endpoints/ai-council.php';
            handleAICouncil($method, $id, $action, $input);
            break;

        case '':
            Response::success([
                'name' => 'CoachSearching API',
                'version' => '2.0.0',
                'documentation' => 'https://coachsearching.com/api-docs',
                'endpoints' => [
                    'coaches' => '/api/coaches',
                    'search' => '/api/search',
                    'bookings' => '/api/bookings',
                    'lookup' => '/api/lookup',
                    'health' => '/api/health',
                ],
            ]);
            break;

        default:
            Response::notFound('Endpoint');
            break;
    }
} catch (\Exception $e) {
    error_log("API Error: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    Response::serverError('An unexpected error occurred', $e);
}
