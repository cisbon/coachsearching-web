<?php
/**
 * CoachSearching - Dynamic Sitemap Generator
 *
 * Generates XML sitemap with all public pages and coach profiles
 * GET /sitemap.xml
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../Database.php';

/**
 * Generate and output the sitemap
 */
function generateSitemap() {
    $db = new Database();
    $baseUrl = 'https://coachsearching.com';
    $today = date('Y-m-d');

    header('Content-Type: application/xml; charset=utf-8');

    $xml = '<?xml version="1.0" encoding="UTF-8"?>';
    $xml .= "\n" . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
    $xml .= "\n" . '        xmlns:xhtml="http://www.w3.org/1999/xhtml">' . "\n";

    // Static pages with hreflang
    $staticPages = [
        ['loc' => '/', 'priority' => '1.0', 'changefreq' => 'daily', 'hreflang' => true],
        ['loc' => '/#coaches', 'priority' => '0.9', 'changefreq' => 'daily', 'hreflang' => true],
        ['loc' => '/#quiz', 'priority' => '0.8', 'changefreq' => 'monthly', 'hreflang' => true],
        ['loc' => '/#about', 'priority' => '0.7', 'changefreq' => 'monthly', 'hreflang' => true],
        ['loc' => '/#faq', 'priority' => '0.7', 'changefreq' => 'monthly', 'hreflang' => true],
        ['loc' => '/#how-it-works', 'priority' => '0.7', 'changefreq' => 'monthly', 'hreflang' => true],
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

    // Category landing pages
    $categories = [
        'executive-coaching',
        'life-coaching',
        'career-coaching',
        'business-coaching',
        'leadership',
        'health-wellness',
        'mindfulness',
        'relationship-coaching',
        'personal-development',
        'performance-coaching'
    ];

    foreach ($categories as $category) {
        $xml .= "    <url>\n";
        $xml .= "        <loc>" . htmlspecialchars($baseUrl . '/#coaching/' . $category) . "</loc>\n";
        $xml .= "        <lastmod>" . $today . "</lastmod>\n";
        $xml .= "        <changefreq>weekly</changefreq>\n";
        $xml .= "        <priority>0.8</priority>\n";
        $xml .= "    </url>\n";
    }

    // Legal pages
    $legalPages = ['privacy', 'terms', 'imprint'];
    foreach ($legalPages as $legal) {
        $xml .= "    <url>\n";
        $xml .= "        <loc>" . htmlspecialchars($baseUrl . '/#' . $legal) . "</loc>\n";
        $xml .= "        <lastmod>" . $today . "</lastmod>\n";
        $xml .= "        <changefreq>yearly</changefreq>\n";
        $xml .= "        <priority>0.3</priority>\n";
        $xml .= "    </url>\n";
    }

    // Dynamic coach profiles
    try {
        $coaches = $db->from('cs_coaches')
            ->select('id, display_name, updated_at')
            ->eq('is_visible', true)
            ->order('rating', ['ascending' => false])
            ->execute();

        if (is_array($coaches)) {
            foreach ($coaches as $coach) {
                // Generate SEO-friendly slug
                $slug = strtolower(trim($coach['display_name'] ?? 'coach'));
                $slug = preg_replace('/[^a-z0-9]+/', '-', $slug);
                $slug = trim($slug, '-');

                // Get last modified date
                $lastMod = $today;
                if (!empty($coach['updated_at'])) {
                    $lastMod = substr($coach['updated_at'], 0, 10);
                }

                $xml .= "    <url>\n";
                $xml .= "        <loc>" . htmlspecialchars($baseUrl . '/#coach/' . $coach['id'] . '/' . $slug) . "</loc>\n";
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
