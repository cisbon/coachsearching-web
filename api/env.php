<?php
require 'config.php';
header('Content-Type: application/json');
echo json_encode([
    'SUPABASE_URL' => SUPABASE_URL,
    'SUPABASE_ANON_KEY' => SUPABASE_ANON_KEY
]);
