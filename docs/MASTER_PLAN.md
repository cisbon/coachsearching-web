# CoachSearching.com Production MVP Master Plan

## Executive Summary

CoachSearching.com is approximately **80% production-ready**. The codebase has strong foundations (SEO utilities, security primitives, comprehensive database schema) but has critical issues blocking production launch: CORS misconfiguration, incomplete authentication, webhook vulnerabilities, and SEO-breaking hash-based routing.

**Path to Production:** 15-20 discrete tasks organized into 5 phases, prioritized by business impact. Critical security and functionality fixes first, then SEO optimization, followed by code quality improvements.

---

## Priority Matrix

| Task | Priority | Impact | Effort | Dependencies |
|------|----------|--------|--------|--------------|
| Fix CORS configuration | P0 | Critical | Low | None |
| Enable webhook signature verification | P0 | Critical | Low | None |
| Fix $supabase global in bookings.php | P0 | Critical | Low | None |
| Implement real auth endpoints | P0 | Critical | Medium | None |
| Fix search endpoint (real data) | P1 | High | Low | None |
| Add CSP and security headers | P1 | High | Low | None |
| Generate dynamic sitemap | P1 | High | Medium | None |
| Pre-rendering for coach profiles | P1 | Critical | High | Dynamic sitemap |
| History API routing (optional) | P2 | High | High | Pre-rendering |
| Code splitting for app.js | P2 | Medium | High | None |
| Complete admin dashboard backend | P2 | Medium | High | Auth endpoints |
| GDPR compliance (export/delete) | P1 | High | Medium | Auth endpoints |
| Performance optimization | P3 | Medium | Medium | None |
| Test coverage | P3 | Medium | High | None |

---

## Phase A: Critical Security Fixes

**Goal:** Eliminate security vulnerabilities that could expose user data or enable attacks.

### A1. Fix CORS Configuration
**File:** `api/config.php`
**Status:** [ ] Not Started

**Current (vulnerable):**
```php
header("Access-Control-Allow-Origin: *");
```

**Fix:**
```php
$allowedOrigins = [
    'https://coachsearching.com',
    'https://www.coachsearching.com'
];

// Add localhost for development
if ($_SERVER['SERVER_NAME'] === 'localhost') {
    $allowedOrigins[] = 'http://localhost:3000';
    $allowedOrigins[] = 'http://localhost:8080';
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
    header("Vary: Origin");
}
```

**Verification:**
1. Deploy fix
2. Test from allowed origin - should work
3. Test from different origin - should fail CORS

---

### A2. Enable Webhook Signature Verification
**File:** `api/webhook.php`
**Status:** [ ] Not Started

**Current (vulnerable):**
```php
// Verify webhook signature (in production, use actual secret)
// $event = \Stripe\Webhook::constructEvent($payload, $sig_header, STRIPE_WEBHOOK_SECRET);

// For now, parse directly
$event = json_decode($payload, true);
```

**Fix:**
```php
require_once __DIR__ . '/vendor/autoload.php'; // Ensure Stripe SDK loaded

$payload = @file_get_contents('php://input');
$sig_header = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';

if (empty($sig_header)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing signature']);
    exit;
}

try {
    $event = \Stripe\Webhook::constructEvent(
        $payload,
        $sig_header,
        STRIPE_WEBHOOK_SECRET
    );
} catch(\UnexpectedValueException $e) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid payload']);
    exit;
} catch(\Stripe\Exception\SignatureVerificationException $e) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid signature']);
    exit;
}

// Process event...
```

**Verification:**
1. Ensure STRIPE_WEBHOOK_SECRET is set in .env
2. Test with Stripe CLI: `stripe listen --forward-to localhost:8080/webhook.php`
3. Trigger test event
4. Verify signature validation works

---

### A3. Add Security Headers
**File:** `api/config.php` (add after CORS)
**Status:** [ ] Not Started

**Add:**
```php
// Security headers
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("X-XSS-Protection: 1; mode=block");
header("Referrer-Policy: strict-origin-when-cross-origin");
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.stripe.com;");

// HSTS (only enable after confirming HTTPS works)
// header("Strict-Transport-Security: max-age=31536000; includeSubDomains");
```

**Verification:**
1. Check headers with browser DevTools or `curl -I`
2. Run security scanner (e.g., securityheaders.com)

---

## Phase B: Critical Functionality Fixes

**Goal:** Make broken features functional.

### B1. Fix $supabase Global in bookings.php
**File:** `api/endpoints/bookings.php`
**Status:** [ ] Not Started

**Problem:** File uses `global $supabase` but it's never defined.

**Option 1 - Use Database class (Recommended):**
Replace all occurrences of:
```php
global $supabase;
$result = $supabase->from('cs_bookings')...
```

With:
```php
$db = new Database();
$result = $db->from('cs_bookings')...
```

**Changes needed:**
1. Add `require_once __DIR__ . '/../Database.php';` at top
2. Replace `global $supabase;` with `$db = new Database();`
3. Update all `$supabase->` to `$db->`

**Verification:**
1. Test POST /bookings/discovery-call
2. Test POST /bookings/create-intent
3. Test all booking endpoints with real requests

---

### B2. Implement Real Auth Endpoints
**File:** `api/endpoints/auth.php`
**Status:** [ ] Not Started

**Current Problem:** Returns hardcoded mock data.

**Implementation:**

```php
<?php
/**
 * Auth Endpoints - REAL IMPLEMENTATION
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../Database.php';
require_once __DIR__ . '/../lib/Auth.php';
require_once __DIR__ . '/../lib/Sanitizer.php';
require_once __DIR__ . '/../lib/Response.php';

function handleAuth($method, $id, $action, $input) {
    if ($id === 'me' && $method === 'GET') {
        return getCurrentUser();
    } elseif ($id === 'me' && $method === 'PATCH') {
        return updateCurrentUser($input);
    } elseif ($id === 'me' && $method === 'DELETE') {
        return requestAccountDeletion();
    } elseif ($id === 'export-data' && $method === 'POST') {
        return exportUserData();
    } else {
        return Response::error('Auth endpoint not found', 404);
    }
}

function getCurrentUser() {
    $user = Auth::getUser();
    if (!$user) {
        return Response::error('Not authenticated', 401);
    }

    $db = new Database();

    // Get user profile from appropriate table based on role
    if ($user['role'] === 'coach') {
        $profile = $db->from('cs_coaches')
            ->select('*')
            ->eq('user_id', $user['id'])
            ->single()
            ->execute();
    } else {
        $profile = $db->from('cs_clients')
            ->select('*')
            ->eq('user_id', $user['id'])
            ->single()
            ->execute();
    }

    return Response::success([
        'id' => $user['id'],
        'email' => $user['email'],
        'role' => $user['role'],
        'profile' => $profile,
        'created_at' => $user['created_at']
    ]);
}

function updateCurrentUser($input) {
    $user = Auth::requireAuth();
    $db = new Database();

    $allowedFields = ['name', 'avatar_url', 'phone', 'timezone'];
    $updates = [];

    foreach ($allowedFields as $field) {
        if (isset($input[$field])) {
            $updates[$field] = Sanitizer::clean($input[$field]);
        }
    }

    if (empty($updates)) {
        return Response::error('No valid fields to update', 400);
    }

    $table = $user['role'] === 'coach' ? 'cs_coaches' : 'cs_clients';

    $result = $db->from($table)
        ->update($updates)
        ->eq('user_id', $user['id'])
        ->execute();

    return Response::success([
        'message' => 'Profile updated',
        'updated_fields' => array_keys($updates)
    ]);
}

function requestAccountDeletion() {
    $user = Auth::requireAuth();
    $db = new Database();

    // Create deletion request (30-day grace period)
    $db->from('cs_account_deletion_requests')
        ->insert([
            'user_id' => $user['id'],
            'requested_at' => date('c'),
            'scheduled_deletion_at' => date('c', strtotime('+30 days')),
            'status' => 'pending'
        ])
        ->execute();

    return Response::success([
        'message' => 'Account deletion requested. Your account will be deleted in 30 days.',
        'scheduled_deletion_at' => date('c', strtotime('+30 days'))
    ]);
}

function exportUserData() {
    $user = Auth::requireAuth();
    $db = new Database();

    // Gather all user data
    $data = [
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role']
        ]
    ];

    // Get profile
    $table = $user['role'] === 'coach' ? 'cs_coaches' : 'cs_clients';
    $data['profile'] = $db->from($table)
        ->select('*')
        ->eq('user_id', $user['id'])
        ->single()
        ->execute();

    // Get bookings
    if ($user['role'] === 'coach') {
        $coachId = $data['profile']['id'] ?? null;
        if ($coachId) {
            $data['bookings'] = $db->from('cs_bookings')
                ->select('*')
                ->eq('coach_id', $coachId)
                ->execute();
        }
    } else {
        $data['bookings'] = $db->from('cs_bookings')
            ->select('*')
            ->eq('client_id', $user['id'])
            ->execute();
    }

    // Get reviews
    $data['reviews'] = $db->from('cs_reviews')
        ->select('*')
        ->eq('author_id', $user['id'])
        ->execute();

    return Response::success([
        'message' => 'Data export prepared',
        'data' => $data,
        'exported_at' => date('c')
    ]);
}
```

**Verification:**
1. Test GET /auth/me with valid JWT
2. Test PATCH /auth/me with profile updates
3. Test POST /auth/export-data
4. Test DELETE /auth/me

---

### B3. Fix Search Endpoint
**File:** `api/endpoints/search.php`
**Status:** [ ] Not Started

**Replace mock data with real Supabase query:**

```php
function searchCoaches($filters) {
    $db = new Database();

    $query = $db->from('cs_coaches')
        ->select('id, display_name, professional_title, bio, specialties, languages, hourly_rate, rating, review_count, is_verified, profile_image_url, video_url')
        ->eq('is_visible', true);

    // Apply filters
    if (!empty($filters['specialties'])) {
        // Array contains any
        $specialtiesJson = json_encode($filters['specialties']);
        $query = $query->contains('specialties', $filters['specialties']);
    }

    if (!empty($filters['min_price'])) {
        $query = $query->gte('hourly_rate', (float)$filters['min_price']);
    }

    if (!empty($filters['max_price'])) {
        $query = $query->lte('hourly_rate', (float)$filters['max_price']);
    }

    if (!empty($filters['min_rating'])) {
        $query = $query->gte('rating', (float)$filters['min_rating']);
    }

    if (!empty($filters['languages'])) {
        $query = $query->contains('languages', $filters['languages']);
    }

    if (isset($filters['is_verified']) && $filters['is_verified']) {
        $query = $query->eq('is_verified', true);
    }

    // Sorting - video priority
    $sort = $filters['sort'] ?? 'video_priority';
    if ($sort === 'video_priority') {
        $query = $query->order('video_url', ['ascending' => false, 'nullsFirst' => false])
                       ->order('rating', ['ascending' => false]);
    } elseif ($sort === 'rating') {
        $query = $query->order('rating', ['ascending' => false]);
    } elseif ($sort === 'price_low') {
        $query = $query->order('hourly_rate', ['ascending' => true]);
    } elseif ($sort === 'price_high') {
        $query = $query->order('hourly_rate', ['ascending' => false]);
    }

    // Pagination
    $page = max(1, (int)($filters['page'] ?? 1));
    $limit = min(50, (int)($filters['limit'] ?? 20));
    $offset = ($page - 1) * $limit;

    $query = $query->range($offset, $offset + $limit - 1);

    $results = $query->execute();

    // Get total count (separate query)
    $countQuery = $db->from('cs_coaches')
        ->select('id', ['count' => 'exact'])
        ->eq('is_visible', true)
        ->execute();

    echo json_encode([
        'results' => $results ?: [],
        'total' => count($results), // Simplified - ideally get exact count
        'page' => $page,
        'limit' => $limit
    ]);
}
```

**Verification:**
1. Test POST /search/coaches with various filters
2. Verify results match database data
3. Test pagination

---

## Phase C: SEO Optimization

**Goal:** Make the site properly indexable by search engines.

### C1. Generate Dynamic Sitemap
**File:** Create `api/endpoints/sitemap.php`
**Status:** [ ] Not Started

```php
<?php
/**
 * Dynamic Sitemap Generator
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../Database.php';

function generateSitemap() {
    $db = new Database();

    header('Content-Type: application/xml');

    $xml = '<?xml version="1.0" encoding="UTF-8"?>';
    $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

    // Static pages
    $staticPages = [
        ['loc' => '/', 'priority' => '1.0', 'changefreq' => 'daily'],
        ['loc' => '/#coaches', 'priority' => '0.9', 'changefreq' => 'daily'],
        ['loc' => '/#quiz', 'priority' => '0.8', 'changefreq' => 'monthly'],
        ['loc' => '/#about', 'priority' => '0.7', 'changefreq' => 'monthly'],
        ['loc' => '/#faq', 'priority' => '0.7', 'changefreq' => 'monthly'],
        ['loc' => '/#how-it-works', 'priority' => '0.7', 'changefreq' => 'monthly'],
    ];

    foreach ($staticPages as $page) {
        $xml .= '<url>';
        $xml .= '<loc>https://coachsearching.com' . htmlspecialchars($page['loc']) . '</loc>';
        $xml .= '<lastmod>' . date('Y-m-d') . '</lastmod>';
        $xml .= '<changefreq>' . $page['changefreq'] . '</changefreq>';
        $xml .= '<priority>' . $page['priority'] . '</priority>';
        $xml .= '</url>';
    }

    // Category pages
    $categories = [
        'executive-coaching', 'life-coaching', 'career-coaching',
        'business-coaching', 'leadership', 'health-wellness',
        'mindfulness', 'relationship-coaching'
    ];

    foreach ($categories as $category) {
        $xml .= '<url>';
        $xml .= '<loc>https://coachsearching.com/#coaching/' . $category . '</loc>';
        $xml .= '<lastmod>' . date('Y-m-d') . '</lastmod>';
        $xml .= '<changefreq>weekly</changefreq>';
        $xml .= '<priority>0.8</priority>';
        $xml .= '</url>';
    }

    // Coach profiles
    $coaches = $db->from('cs_coaches')
        ->select('id, display_name, updated_at')
        ->eq('is_visible', true)
        ->execute();

    if ($coaches) {
        foreach ($coaches as $coach) {
            $slug = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $coach['display_name']));
            $lastMod = substr($coach['updated_at'] ?? date('c'), 0, 10);

            $xml .= '<url>';
            $xml .= '<loc>https://coachsearching.com/#coach/' . $coach['id'] . '/' . $slug . '</loc>';
            $xml .= '<lastmod>' . $lastMod . '</lastmod>';
            $xml .= '<changefreq>weekly</changefreq>';
            $xml .= '<priority>0.7</priority>';
            $xml .= '</url>';
        }
    }

    $xml .= '</urlset>';

    echo $xml;
}

generateSitemap();
```

**Add route in index.php:**
```php
case 'sitemap.xml':
    require_once 'endpoints/sitemap.php';
    exit;
```

**Verification:**
1. Access /api/sitemap.xml
2. Validate with XML validator
3. Submit to Google Search Console

---

### C2. Pre-rendering Solution
**Status:** [ ] Not Started

**Recommended Approach:** Build-time static generation for coach profiles.

**Implementation Plan:**

1. Create `scripts/prerender.php`:
```php
<?php
/**
 * Pre-render coach profile pages for SEO
 * Run: php scripts/prerender.php
 */

require_once __DIR__ . '/../api/config.php';
require_once __DIR__ . '/../api/Database.php';

$db = new Database();

// Get all visible coaches
$coaches = $db->from('cs_coaches')
    ->select('*')
    ->eq('is_visible', true)
    ->execute();

$outputDir = __DIR__ . '/../coach';
if (!is_dir($outputDir)) {
    mkdir($outputDir, 0755, true);
}

$template = file_get_contents(__DIR__ . '/../coach-template.html');

foreach ($coaches as $coach) {
    $slug = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $coach['display_name']));

    // Generate meta tags
    $title = $coach['display_name'] . ' - ' . ($coach['professional_title'] ?? 'Coach') . ' | CoachSearching';
    $description = substr($coach['bio'] ?? 'Professional coach', 0, 155);

    // Generate JSON-LD
    $jsonLd = json_encode([
        '@context' => 'https://schema.org',
        '@type' => 'Person',
        'name' => $coach['display_name'],
        'jobTitle' => $coach['professional_title'] ?? 'Professional Coach',
        'description' => $coach['bio'],
        'image' => $coach['profile_image_url'],
        'makesOffer' => [
            '@type' => 'Offer',
            'itemOffered' => [
                '@type' => 'Service',
                'name' => 'Coaching Session'
            ],
            'price' => $coach['hourly_rate'],
            'priceCurrency' => 'EUR'
        ]
    ]);

    // Replace placeholders
    $html = str_replace([
        '{{TITLE}}',
        '{{DESCRIPTION}}',
        '{{OG_IMAGE}}',
        '{{CANONICAL_URL}}',
        '{{JSON_LD}}',
        '{{COACH_NAME}}',
        '{{COACH_TITLE}}',
        '{{COACH_BIO}}'
    ], [
        htmlspecialchars($title),
        htmlspecialchars($description),
        $coach['profile_image_url'] ?? 'https://coachsearching.com/og-image.jpg',
        'https://coachsearching.com/coach/' . $coach['id'] . '/' . $slug,
        $jsonLd,
        htmlspecialchars($coach['display_name']),
        htmlspecialchars($coach['professional_title'] ?? ''),
        htmlspecialchars(substr($coach['bio'] ?? '', 0, 300))
    ], $template);

    // Create directory for this coach
    $coachDir = $outputDir . '/' . $coach['id'];
    if (!is_dir($coachDir)) {
        mkdir($coachDir, 0755, true);
    }

    // Write HTML file
    file_put_contents($coachDir . '/index.html', $html);
    echo "Generated: /coach/{$coach['id']}/\n";
}

echo "\nPre-rendering complete!\n";
```

2. Create `coach-template.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{TITLE}}</title>
    <meta name="description" content="{{DESCRIPTION}}">
    <link rel="canonical" href="{{CANONICAL_URL}}">

    <!-- Open Graph -->
    <meta property="og:title" content="{{TITLE}}">
    <meta property="og:description" content="{{DESCRIPTION}}">
    <meta property="og:image" content="{{OG_IMAGE}}">
    <meta property="og:url" content="{{CANONICAL_URL}}">
    <meta property="og:type" content="profile">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">

    <!-- JSON-LD -->
    <script type="application/ld+json">{{JSON_LD}}</script>

    <link rel="stylesheet" href="/styles.css">
</head>
<body>
    <!-- Initial content for crawlers -->
    <main id="prerender-content">
        <h1>{{COACH_NAME}}</h1>
        <p>{{COACH_TITLE}}</p>
        <p>{{COACH_BIO}}</p>
    </main>

    <!-- React app will hydrate -->
    <div id="root"></div>

    <script>
        // Hide prerender content when JS loads
        document.getElementById('prerender-content').style.display = 'none';
    </script>

    <script src="/js/vendor/react.js"></script>
    <script src="/js/vendor/react-dom.js"></script>
    <script src="/js/app.js" type="module"></script>
</body>
</html>
```

3. Run pre-rendering as part of build/deploy

**Verification:**
1. Check generated HTML has proper meta tags
2. Test with Google Rich Results Test
3. Verify React hydrates without errors

---

## Phase D: Code Quality & Performance

### D1. Code Splitting (Optional for MVP)
**Status:** [ ] Not Started

**Approach:** Manual dynamic imports

```javascript
// Lazy load dashboard components
const loadDashboard = async () => {
    const module = await import('./js/dashboard.js');
    return module.Dashboard;
};

// In Router
if (route === 'dashboard') {
    const Dashboard = await loadDashboard();
    return html`<${Dashboard} />`;
}
```

---

### D2. CSS Bundling
**Status:** [ ] Not Started

Combine the 28 CSS imports into a single bundled file to reduce HTTP requests.

---

## Phase E: Production Deployment Checklist

### Pre-Launch Checklist

**Security:**
- [ ] CORS restricted to production domain
- [ ] Webhook signature verification enabled
- [ ] Security headers configured
- [ ] No secrets in git history
- [ ] API rate limiting verified

**Functionality:**
- [ ] Auth endpoints working
- [ ] Booking flow tested end-to-end
- [ ] Payment flow tested with Stripe test mode
- [ ] Email notifications sending
- [ ] All forms validated

**SEO:**
- [ ] Dynamic sitemap deployed
- [ ] Pre-rendered pages deployed
- [ ] Meta tags verified on all pages
- [ ] JSON-LD structured data validated
- [ ] robots.txt verified
- [ ] Google Search Console configured

**Performance:**
- [ ] Images optimized
- [ ] Caching configured
- [ ] GZIP enabled on server
- [ ] Lighthouse score > 80

**Legal:**
- [ ] Privacy policy up to date
- [ ] Terms of service reviewed
- [ ] Cookie consent working
- [ ] GDPR export/delete working

**Monitoring:**
- [ ] Error logging configured
- [ ] Uptime monitoring set up
- [ ] Stripe dashboard alerts configured

### Go-Live Steps

1. **Final testing on staging**
2. **Switch Stripe to live mode**
3. **Update environment variables**
4. **Deploy API updates via FTP**
5. **Push frontend to GitHub (auto-deploys)**
6. **Verify all endpoints working**
7. **Submit sitemap to Google**
8. **Monitor for errors (24 hours)**

---

## Implementation Notes

### Stripe SDK Loading Issue

The bookings.php and stripe.php files reference `\Stripe\...` classes but there's no evidence of Composer autoload.

**Fix options:**
1. Add Composer and `require 'vendor/autoload.php'`
2. Use Stripe's PHP SDK single-file loader
3. Download SDK files manually to `/api/lib/stripe/`

**Recommended:** Add Composer

```bash
cd api
composer require stripe/stripe-php
```

Add to config.php:
```php
require_once __DIR__ . '/vendor/autoload.php';
\Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);
```

---

## Risk Register

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Stripe webhook failures | Payment issues | Medium | Enable signature verification, add retry logic |
| SEO not improving | Low traffic | High | Implement pre-rendering ASAP |
| Auth bypass | Security breach | Low | RLS policies are backup, fix PHP auth |
| Database connection failures | Site down | Low | Add connection pooling, retry logic |
| GitHub Pages outage | Frontend down | Very Low | Use Cloudflare CDN as fallback |

---

## Success Criteria

**MVP Ready When:**
1. All P0 tasks completed
2. Core user flows work: Search → Profile → Book → Pay
3. Security scan shows no critical issues
4. Coach profiles indexable by Google
5. Payment flow tested with real transactions

**Production Launch When:**
1. All P0 and P1 tasks completed
2. At least 5 real coaches onboarded
3. End-to-end testing passed
4. Legal review completed
5. Monitoring in place

---

## Progress Tracking

### Phase A: Security [x] 3/3 COMPLETE
- [x] A1. Fix CORS - Restricted to allowed origins, added Vary header
- [x] A2. Enable webhook signature - Implemented manual HMAC-SHA256 verification
- [x] A3. Add security headers - X-Frame-Options, X-XSS-Protection, Referrer-Policy

### Phase B: Functionality [x] 3/3 COMPLETE
- [x] B1. Fix $supabase global - Replaced with Database class throughout bookings.php
- [x] B2. Implement auth endpoints - Real Supabase queries, GDPR export/delete
- [x] B3. Fix search endpoint - Real queries with filters, sorting, pagination

### Phase C: SEO [ ] 1/2
- [x] C1. Dynamic sitemap - API endpoint /api/sitemap.xml with coach profiles
- [ ] C2. Pre-rendering - Planned, requires build-time generation

### Phase D: Quality [ ] 0/2
- [ ] D1. Code splitting
- [ ] D2. CSS bundling

### Phase E: Deployment [ ] 0/1
- [ ] E1. Production checklist complete

---

**Plan Created:** December 9, 2025
**Plan Status:** In Progress - Phase A & B Complete
**Last Updated:** December 9, 2025

### Implementation Notes (December 9, 2025)
- CORS now allows only coachsearching.com, www.coachsearching.com, and cisbon.github.io
- Webhook signature verification uses native PHP HMAC instead of Stripe SDK
- Auth endpoints return real user data from cs_coaches and cs_clients tables
- Search endpoint filters by specialty, price, rating, language with video priority sort
- Dynamic sitemap includes all visible coaches with SEO-friendly slugs

---

*This plan should be updated as tasks are completed. Check off items and add notes about implementation details.*
