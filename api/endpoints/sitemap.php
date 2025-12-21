<?php
/**
 * CoachSearching - Dynamic Sitemap Generator
 *
 * Generates XML sitemap with all public pages, coach profiles, and city-specialty pages
 * GET /sitemap.xml
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../Database.php';

/**
 * City definitions for city-specialty landing pages
 */
$COACHING_CITIES = [
    // Tier 1 - DACH + Netherlands (18 cities)
    'berlin' => ['name' => 'Berlin', 'country' => 'Germany'],
    'munich' => ['name' => 'Munich', 'country' => 'Germany'],
    'hamburg' => ['name' => 'Hamburg', 'country' => 'Germany'],
    'frankfurt' => ['name' => 'Frankfurt', 'country' => 'Germany'],
    'dusseldorf' => ['name' => 'Düsseldorf', 'country' => 'Germany'],
    'cologne' => ['name' => 'Cologne', 'country' => 'Germany'],
    'stuttgart' => ['name' => 'Stuttgart', 'country' => 'Germany'],
    'hanover' => ['name' => 'Hanover', 'country' => 'Germany'],
    'nuremberg' => ['name' => 'Nuremberg', 'country' => 'Germany'],
    'leipzig' => ['name' => 'Leipzig', 'country' => 'Germany'],
    'vienna' => ['name' => 'Vienna', 'country' => 'Austria'],
    'zurich' => ['name' => 'Zurich', 'country' => 'Switzerland'],
    'geneva' => ['name' => 'Geneva', 'country' => 'Switzerland'],
    'basel' => ['name' => 'Basel', 'country' => 'Switzerland'],
    'amsterdam' => ['name' => 'Amsterdam', 'country' => 'Netherlands'],
    'rotterdam' => ['name' => 'Rotterdam', 'country' => 'Netherlands'],
    'the-hague' => ['name' => 'The Hague', 'country' => 'Netherlands'],
    'brussels' => ['name' => 'Brussels', 'country' => 'Belgium'],

    // Tier 2 - UK, Ireland, Nordics, Belgium (12 cities)
    'london' => ['name' => 'London', 'country' => 'United Kingdom'],
    'manchester' => ['name' => 'Manchester', 'country' => 'United Kingdom'],
    'birmingham' => ['name' => 'Birmingham', 'country' => 'United Kingdom'],
    'edinburgh' => ['name' => 'Edinburgh', 'country' => 'United Kingdom'],
    'dublin' => ['name' => 'Dublin', 'country' => 'Ireland'],
    'stockholm' => ['name' => 'Stockholm', 'country' => 'Sweden'],
    'copenhagen' => ['name' => 'Copenhagen', 'country' => 'Denmark'],
    'oslo' => ['name' => 'Oslo', 'country' => 'Norway'],
    'helsinki' => ['name' => 'Helsinki', 'country' => 'Finland'],
    'antwerp' => ['name' => 'Antwerp', 'country' => 'Belgium'],
    'gothenburg' => ['name' => 'Gothenburg', 'country' => 'Sweden'],
    'malmo' => ['name' => 'Malmö', 'country' => 'Sweden'],

    // Tier 3 - Southern & Eastern Europe (18 cities)
    'paris' => ['name' => 'Paris', 'country' => 'France'],
    'lyon' => ['name' => 'Lyon', 'country' => 'France'],
    'madrid' => ['name' => 'Madrid', 'country' => 'Spain'],
    'barcelona' => ['name' => 'Barcelona', 'country' => 'Spain'],
    'valencia' => ['name' => 'Valencia', 'country' => 'Spain'],
    'milan' => ['name' => 'Milan', 'country' => 'Italy'],
    'rome' => ['name' => 'Rome', 'country' => 'Italy'],
    'warsaw' => ['name' => 'Warsaw', 'country' => 'Poland'],
    'krakow' => ['name' => 'Krakow', 'country' => 'Poland'],
    'wroclaw' => ['name' => 'Wrocław', 'country' => 'Poland'],
    'prague' => ['name' => 'Prague', 'country' => 'Czech Republic'],
    'lisbon' => ['name' => 'Lisbon', 'country' => 'Portugal'],
    'porto' => ['name' => 'Porto', 'country' => 'Portugal'],
    'budapest' => ['name' => 'Budapest', 'country' => 'Hungary'],
    'bucharest' => ['name' => 'Bucharest', 'country' => 'Romania'],
    'athens' => ['name' => 'Athens', 'country' => 'Greece'],
    'luxembourg' => ['name' => 'Luxembourg', 'country' => 'Luxembourg'],
    'tallinn' => ['name' => 'Tallinn', 'country' => 'Estonia'],

    // Tier 4 - German secondary (12 cities)
    'dresden' => ['name' => 'Dresden', 'country' => 'Germany'],
    'bonn' => ['name' => 'Bonn', 'country' => 'Germany'],
    'essen' => ['name' => 'Essen', 'country' => 'Germany'],
    'dortmund' => ['name' => 'Dortmund', 'country' => 'Germany'],
    'bremen' => ['name' => 'Bremen', 'country' => 'Germany'],
    'duisburg' => ['name' => 'Duisburg', 'country' => 'Germany'],
    'munster' => ['name' => 'Münster', 'country' => 'Germany'],
    'karlsruhe' => ['name' => 'Karlsruhe', 'country' => 'Germany'],
    'mannheim' => ['name' => 'Mannheim', 'country' => 'Germany'],
    'augsburg' => ['name' => 'Augsburg', 'country' => 'Germany'],
    'wiesbaden' => ['name' => 'Wiesbaden', 'country' => 'Germany'],
    'freiburg' => ['name' => 'Freiburg', 'country' => 'Germany'],
];

/**
 * Generate and output the sitemap
 */
function generateSitemap() {
    global $COACHING_CITIES;

    $db = new Database();
    $baseUrl = 'https://coachsearching.com';
    $today = date('Y-m-d');

    header('Content-Type: application/xml; charset=utf-8');

    $xml = '<?xml version="1.0" encoding="UTF-8"?>';
    $xml .= "\n" . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
    $xml .= "\n" . '        xmlns:xhtml="http://www.w3.org/1999/xhtml">' . "\n";

    // Static pages with hreflang (using clean URLs)
    $staticPages = [
        ['loc' => '/', 'priority' => '1.0', 'changefreq' => 'daily', 'hreflang' => true],
        ['loc' => '/coaches', 'priority' => '0.9', 'changefreq' => 'daily', 'hreflang' => true],
        ['loc' => '/quiz', 'priority' => '0.8', 'changefreq' => 'monthly', 'hreflang' => true],
        ['loc' => '/categories', 'priority' => '0.8', 'changefreq' => 'weekly', 'hreflang' => true],
        ['loc' => '/faq', 'priority' => '0.7', 'changefreq' => 'monthly', 'hreflang' => true],
        ['loc' => '/pricing', 'priority' => '0.7', 'changefreq' => 'monthly', 'hreflang' => true],
    ];

    $languages = ['en', 'de', 'es', 'fr', 'it'];

    foreach ($staticPages as $page) {
        $xml .= "    <url>\n";
        $xml .= "        <loc>" . htmlspecialchars($baseUrl . $page['loc']) . "</loc>\n";
        $xml .= "        <lastmod>" . $today . "</lastmod>\n";
        $xml .= "        <changefreq>" . $page['changefreq'] . "</changefreq>\n";
        $xml .= "        <priority>" . $page['priority'] . "</priority>\n";

        // Add hreflang for multi-language pages
        if (!empty($page['hreflang'])) {
            foreach ($languages as $lang) {
                $xml .= '        <xhtml:link rel="alternate" hreflang="' . $lang . '" href="' . htmlspecialchars($baseUrl . $page['loc'] . '?lang=' . $lang) . '"/>' . "\n";
            }
        }

        $xml .= "    </url>\n";
    }

    // Coaching category landing pages
    $categories = [
        'executive-coaching',
        'life-coaching',
        'career-coaching',
        'business-coaching',
        'leadership',
        'health-wellness',
        'mindfulness',
        'relationship-coaching',
    ];

    foreach ($categories as $category) {
        $xml .= "    <url>\n";
        $xml .= "        <loc>" . htmlspecialchars($baseUrl . '/coaching/' . $category) . "</loc>\n";
        $xml .= "        <lastmod>" . $today . "</lastmod>\n";
        $xml .= "        <changefreq>weekly</changefreq>\n";
        $xml .= "        <priority>0.8</priority>\n";
        $xml .= "    </url>\n";
    }

    // City-Specialty landing pages (categories × cities)
    foreach ($categories as $category) {
        foreach ($COACHING_CITIES as $citySlug => $cityData) {
            $xml .= "    <url>\n";
            $xml .= "        <loc>" . htmlspecialchars($baseUrl . '/coaching/' . $category . '/' . $citySlug) . "</loc>\n";
            $xml .= "        <lastmod>" . $today . "</lastmod>\n";
            $xml .= "        <changefreq>weekly</changefreq>\n";
            $xml .= "        <priority>0.7</priority>\n";
            $xml .= "    </url>\n";
        }
    }

    // Legal pages
    $legalPages = ['privacy', 'terms', 'imprint'];
    foreach ($legalPages as $legal) {
        $xml .= "    <url>\n";
        $xml .= "        <loc>" . htmlspecialchars($baseUrl . '/' . $legal) . "</loc>\n";
        $xml .= "        <lastmod>" . $today . "</lastmod>\n";
        $xml .= "        <changefreq>yearly</changefreq>\n";
        $xml .= "        <priority>0.3</priority>\n";
        $xml .= "    </url>\n";
    }

    // Dynamic coach profiles
    try {
        $coaches = $db->from('cs_coaches')
            ->select('id, slug, full_name, updated_at')
            ->eq('is_active', true)
            ->order('rating_average', ['ascending' => false])
            ->execute();

        if (is_array($coaches)) {
            foreach ($coaches as $coach) {
                // Use slug if available, otherwise generate from name
                $slug = $coach['slug'] ?? null;
                if (!$slug && !empty($coach['full_name'])) {
                    $slug = strtolower(trim($coach['full_name']));
                    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug);
                    $slug = trim($slug, '-');
                }

                // Get last modified date
                $lastMod = $today;
                if (!empty($coach['updated_at'])) {
                    $lastMod = substr($coach['updated_at'], 0, 10);
                }

                // Use slug-based URL if available, otherwise use ID
                $coachUrl = $slug ? '/coach/' . $slug : '/coach/' . $coach['id'];

                $xml .= "    <url>\n";
                $xml .= "        <loc>" . htmlspecialchars($baseUrl . $coachUrl) . "</loc>\n";
                $xml .= "        <lastmod>" . $lastMod . "</lastmod>\n";
                $xml .= "        <changefreq>weekly</changefreq>\n";
                $xml .= "        <priority>0.7</priority>\n";
                $xml .= "    </url>\n";
            }
        }
    } catch (Exception $e) {
        error_log("Sitemap generation error: " . $e->getMessage());
    }

    $xml .= "</urlset>\n";

    echo $xml;
}

// Execute if called directly
if (basename($_SERVER['SCRIPT_FILENAME']) === 'sitemap.php') {
    generateSitemap();
}
