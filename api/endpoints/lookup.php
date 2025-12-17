<?php
/**
 * Lookup Options Endpoints
 *
 * GET /lookup - Get all active lookup options
 * GET /lookup/{type} - Get options by type (specialty, language, session_format)
 * GET /lookup/specialties - Alias for GET /lookup/specialty
 * GET /lookup/languages - Alias for GET /lookup/language
 * GET /lookup/session-formats - Alias for GET /lookup/session_format
 */

use CoachSearching\Api\Response;

function handleLookup($method, $type, $action, $input) {
    if ($method !== 'GET') {
        Response::error('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
        return;
    }

    // Handle plural aliases
    $typeMap = [
        'specialties' => 'specialty',
        'languages' => 'language',
        'session-formats' => 'session_format',
        'session_formats' => 'session_format',
        'formats' => 'session_format'
    ];

    if ($type && isset($typeMap[$type])) {
        $type = $typeMap[$type];
    }

    try {
        $db = getSupabaseClient();

        // Build query
        $query = [
            'select' => '*',
            'is_active' => 'eq.true',
            'order' => 'sort_order.asc'
        ];

        // Filter by type if specified
        if ($type && in_array($type, ['specialty', 'language', 'session_format'])) {
            $query['type'] = 'eq.' . $type;
        }

        // Build URL
        $url = SUPABASE_URL . '/rest/v1/cs_lookup_options?' . http_build_query($query);

        // Make request
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'apikey: ' . SUPABASE_ANON_KEY,
                'Authorization: Bearer ' . SUPABASE_ANON_KEY,
                'Content-Type: application/json',
                'Prefer: return=representation'
            ]
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            Response::error('Failed to fetch lookup options', 500, 'DATABASE_ERROR');
            return;
        }

        $options = json_decode($response, true);

        // Get language preference from header or query
        $lang = $_GET['lang'] ?? $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? 'en';
        $lang = substr($lang, 0, 2); // Get first 2 chars (e.g., 'en' from 'en-US')

        // Supported languages
        $supportedLangs = ['en', 'de', 'fr', 'es', 'it'];
        if (!in_array($lang, $supportedLangs)) {
            $lang = 'en';
        }

        // Transform options to include localized name
        $transformedOptions = array_map(function ($option) use ($lang) {
            return [
                'id' => $option['id'],
                'type' => $option['type'],
                'code' => $option['code'],
                'name' => $option['name_' . $lang] ?? $option['name_en'] ?? $option['code'],
                'name_en' => $option['name_en'],
                'name_de' => $option['name_de'],
                'name_fr' => $option['name_fr'],
                'name_es' => $option['name_es'],
                'name_it' => $option['name_it'],
                'icon' => $option['icon'],
                'description' => $option['description_' . $lang] ?? $option['description_en'] ?? null,
                'description_en' => $option['description_en'],
                'description_de' => $option['description_de'],
                'sort_order' => $option['sort_order']
            ];
        }, $options);

        // Group by type if no specific type requested
        if (!$type) {
            $grouped = [
                'specialties' => array_values(array_filter($transformedOptions, fn($o) => $o['type'] === 'specialty')),
                'languages' => array_values(array_filter($transformedOptions, fn($o) => $o['type'] === 'language')),
                'session_formats' => array_values(array_filter($transformedOptions, fn($o) => $o['type'] === 'session_format'))
            ];
            Response::success($grouped);
        } else {
            Response::success($transformedOptions);
        }

    } catch (Exception $e) {
        Response::error('Failed to fetch lookup options: ' . $e->getMessage(), 500, 'SERVER_ERROR');
    }
}

/**
 * Get Supabase client configuration
 */
function getSupabaseClient() {
    return [
        'url' => SUPABASE_URL,
        'key' => SUPABASE_ANON_KEY
    ];
}
