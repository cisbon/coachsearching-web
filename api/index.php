<?php
/**
 * CoachSearching PHP API
 * Main entry point and router
 */

require_once __DIR__ . '/config.php';

// Set JSON response header
header('Content-Type: application/json');

// Get request method and path
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = str_replace('/api', '', $path);
$path = trim($path, '/');

// Parse path segments
$segments = explode('/', $path);
$resource = $segments[0] ?? '';
$id = $segments[1] ?? null;
$action = $segments[2] ?? null;

// Get request body for POST/PUT/PATCH
$input = json_decode(file_get_contents('php://input'), true);

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
            
        case 'bookings':
            require_once __DIR__ . '/endpoints/bookings.php';
            handleBookings($method, $id, $action, $input);
            break;
            
        case 'progress':
            require_once __DIR__ . '/endpoints/progress.php';
            handleProgress($method, $id, $action, $input);
            break;
            
        case 'referrals':
            require_once __DIR__ . '/endpoints/referrals.php';
            handleReferrals($method, $id, $action, $input);
            break;
            
        case 'promo-codes':
            require_once __DIR__ . '/endpoints/promo-codes.php';
            handlePromoCodes($method, $id, $action, $input);
            break;
            
        case 'auth':
            require_once __DIR__ . '/endpoints/auth.php';
            handleAuth($method, $id, $action, $input);
            break;
            
        case 'health':
            echo json_encode([
                'status' => 'ok',
                'timestamp' => time(),
                'version' => '1.0.0'
            ]);
            break;
            
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Resource not found']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal server error',
        'message' => $e->getMessage()
    ]);
}
