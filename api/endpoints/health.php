<?php
/**
 * api/endpoints/health.php
 * Health Check Endpoint for System Monitoring
 */

require_once __DIR__ . '/../config.php';

header('Content-Type: application/json');

// Simple health check
$health = [
    'status' => 'ok',
    'timestamp' => date('c'),
    'version' => '1.0.0',
    'services' => []
];

// Check database connectivity (via Supabase)
try {
    $ch = curl_init(SUPABASE_URL . '/rest/v1/');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'apikey: ' . SUPABASE_ANON_KEY,
            'Authorization: Bearer ' . SUPABASE_ANON_KEY
        ],
        CURLOPT_TIMEOUT => 5
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $health['services']['database'] = [
        'status' => ($httpCode >= 200 && $httpCode < 400) ? 'healthy' : 'error',
        'message' => ($httpCode >= 200 && $httpCode < 400) ? 'Connected' : 'Connection failed'
    ];
} catch (Exception $e) {
    $health['services']['database'] = [
        'status' => 'error',
        'message' => $e->getMessage()
    ];
}

// Check Stripe connectivity
try {
    $stripeConfigured = !empty(STRIPE_SECRET_KEY) && STRIPE_SECRET_KEY !== 'sk_test_...';
    $health['services']['stripe'] = [
        'status' => $stripeConfigured ? 'healthy' : 'warning',
        'message' => $stripeConfigured ? 'Configured' : 'Not configured'
    ];
} catch (Exception $e) {
    $health['services']['stripe'] = [
        'status' => 'error',
        'message' => $e->getMessage()
    ];
}

// Check OpenRouter connectivity
try {
    $openrouterConfigured = !empty(OPENROUTER_API_KEY) && OPENROUTER_API_KEY !== 'your-openrouter-api-key';
    $health['services']['openrouter'] = [
        'status' => $openrouterConfigured ? 'healthy' : 'warning',
        'message' => $openrouterConfigured ? 'Configured' : 'Not configured'
    ];
} catch (Exception $e) {
    $health['services']['openrouter'] = [
        'status' => 'error',
        'message' => $e->getMessage()
    ];
}

// PHP info
$health['php'] = [
    'version' => PHP_VERSION,
    'memory_limit' => ini_get('memory_limit'),
    'max_execution_time' => ini_get('max_execution_time')
];

// Overall status
$hasErrors = false;
foreach ($health['services'] as $service) {
    if ($service['status'] === 'error') {
        $hasErrors = true;
        break;
    }
}

$health['status'] = $hasErrors ? 'degraded' : 'ok';

echo json_encode($health, JSON_PRETTY_PRINT);
