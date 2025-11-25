// api/config.php

// CORS Headers - MUST be first
header("Access-Control-Allow-Origin: *");
header("Access-Control-Max-Age: 86400");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE, PATCH");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Load .env file
if (file_exists(__DIR__ . '/.env')) {
    $lines = file(__DIR__ . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
            putenv(sprintf('%s=%s', $name, $value));
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
}

// API Keys - Only using URL and Anon Key as requested
define('SUPABASE_URL', getenv('SUPABASE_URL') ?: 'https://your-project.supabase.co');
define('SUPABASE_ANON_KEY', getenv('SUPABASE_ANON_KEY') ?: 'your-anon-key');
define('STRIPE_SECRET_KEY', getenv('STRIPE_SECRET_KEY') ?: 'sk_test_...');
define('STRIPE_CONNECT_CLIENT_ID', getenv('STRIPE_CONNECT_CLIENT_ID') ?: 'ca_...');

// Rate Limiting
define('RATE_LIMIT_REQUESTS', 60);
define('RATE_LIMIT_WINDOW', 60); // seconds
