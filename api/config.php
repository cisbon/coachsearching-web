// api/config.php

// Allow from any origin for now to fix CORS issues during development
// In production, you should restrict this.
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 86400");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE, PATCH");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// API Keys - Only using URL and Anon Key as requested
define('SUPABASE_URL', getenv('SUPABASE_URL') ?: 'https://your-project.supabase.co');
define('SUPABASE_ANON_KEY', getenv('SUPABASE_ANON_KEY') ?: 'your-anon-key');
define('STRIPE_SECRET_KEY', getenv('STRIPE_SECRET_KEY') ?: 'sk_test_...');
define('STRIPE_CONNECT_CLIENT_ID', getenv('STRIPE_CONNECT_CLIENT_ID') ?: 'ca_...');

// Rate Limiting
define('RATE_LIMIT_REQUESTS', 60);
define('RATE_LIMIT_WINDOW', 60); // seconds
