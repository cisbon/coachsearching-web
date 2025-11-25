<?php
// api/config.php

// Load environment variables (in production these should be set in the server environment or a secure .env file outside web root)
// For this shared hosting setup, we'll try to read from getenv or fallback to defaults (which should be replaced by real secrets)

$origins = [
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'https://coachsearching.com',
    'https://neo.github.io' // Assuming GitHub Pages URL structure
];

if (isset($_SERVER['HTTP_ORIGIN']) && in_array($_SERVER['HTTP_ORIGIN'], $origins)) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');    // cache for 1 day
}

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD']))
        header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");         

    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']))
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");

    exit(0);
}

// Database Config
define('DB_HOST', getenv('SUPABASE_DB_HOST') ?: 'aws-0-eu-central-1.pooler.supabase.com');
define('DB_NAME', getenv('SUPABASE_DB_NAME') ?: 'postgres');
define('DB_USER', getenv('SUPABASE_DB_USER') ?: 'postgres');
define('DB_PASS', getenv('SUPABASE_DB_PASS') ?: 'your-db-password');
define('DB_PORT', getenv('SUPABASE_DB_PORT') ?: '6543');

// API Keys
define('SUPABASE_URL', getenv('SUPABASE_URL') ?: 'https://your-project.supabase.co');
define('SUPABASE_ANON_KEY', getenv('SUPABASE_ANON_KEY') ?: 'your-anon-key');
define('STRIPE_SECRET_KEY', getenv('STRIPE_SECRET_KEY') ?: 'sk_test_...');
define('STRIPE_CONNECT_CLIENT_ID', getenv('STRIPE_CONNECT_CLIENT_ID') ?: 'ca_...');

// Rate Limiting
define('RATE_LIMIT_REQUESTS', 60);
define('RATE_LIMIT_WINDOW', 60); // seconds
