# CoachSearching.com - Codebase Audit Report

**Audit Date:** December 9, 2025
**Version:** 2.0.0
**Auditor:** AI Technical Architect

---

## Executive Summary

CoachSearching.com is a European coaching marketplace built with a modern but unconventional architecture: vanilla JavaScript with React (via UMD globals), PHP 8.4 API, and Supabase database. The codebase is approximately **80% production-ready** with strong foundations in SEO utilities, security primitives, and database design, but has several incomplete features and security concerns that need addressing before launch.

### Key Findings
- **Strengths:** Comprehensive database schema, good SEO utility library, rate limiting, input sanitization
- **Critical Issues:** CORS wildcard, incomplete auth endpoints, hash-based routing hurting SEO
- **Missing:** Pre-rendering for SPA, dynamic sitemap, complete auth implementation, webhook signature verification

---

## 1. File Structure Overview

```
coachsearching-web/
├── index.html              # Main SPA entry point
├── styles.css              # Main stylesheet (imports all CSS modules)
├── manifest.json           # PWA manifest
├── robots.txt              # Search engine directives
├── sitemap.xml             # Static sitemap
├── sw.js                   # Service Worker for PWA
├── schema.sql              # Complete Supabase schema
│
├── api/                    # PHP 8.4 Backend API
│   ├── index.php           # Main router ✅
│   ├── config.php          # Configuration & CORS
│   ├── Database.php        # Supabase REST client
│   ├── webhook.php         # Stripe webhooks ⚠️
│   ├── .htaccess           # Apache rewrite rules
│   ├── .env                # Environment variables
│   │
│   ├── lib/                # Utility classes
│   │   ├── Auth.php        # JWT authentication ✅
│   │   ├── Sanitizer.php   # Input sanitization ✅
│   │   ├── Validator.php   # Input validation ✅
│   │   ├── Response.php    # Standardized responses ✅
│   │   ├── RateLimiter.php # Rate limiting ✅
│   │   └── OpenRouter.php  # AI integration
│   │
│   ├── endpoints/          # API endpoints
│   │   ├── coaches.php     # Coach CRUD ✅
│   │   ├── bookings.php    # Booking system 🔶
│   │   ├── stripe.php      # Stripe Connect 🔶
│   │   ├── auth.php        # Authentication ❌
│   │   ├── search.php      # Search (mock data) ❌
│   │   ├── discovery.php   # Discovery calls
│   │   ├── availability.php
│   │   ├── progress.php
│   │   ├── referrals.php
│   │   ├── promo-codes.php
│   │   ├── analytics.php
│   │   └── payments.php
│   │
│   └── controllers/        # Business logic (blocked via .htaccess)
│       ├── CoachController.php
│       ├── BookingController.php
│       ├── PaymentController.php
│       ├── AdminController.php
│       ├── ArticleController.php
│       └── ProBonoController.php
│
├── js/                     # Frontend JavaScript (ES Modules)
│   ├── app.js              # Main application (349KB!) ⚠️
│   ├── config.js           # App configuration
│   ├── i18n.js             # Internationalization
│   ├── main.js             # Entry point utilities
│   │
│   ├── vendor/             # Third-party libraries
│   │   ├── react.js        # React UMD build
│   │   ├── react-dom.js    # ReactDOM UMD build
│   │   └── htm.js          # JSX alternative
│   │
│   ├── components/         # React components
│   │   ├── Router.js
│   │   ├── ErrorBoundary.js
│   │   ├── common/         # Shared UI components
│   │   ├── layout/         # Layout components
│   │   ├── ui/             # UI widgets
│   │   └── conversion/     # CRO components
│   │
│   ├── pages/              # Page components
│   │   ├── HomePage.js
│   │   ├── CoachProfilePage.js
│   │   ├── CategoryPage.js
│   │   ├── FAQPage.js
│   │   ├── AboutPage.js
│   │   ├── HowItWorksPage.js
│   │   └── AuthPage.js
│   │
│   ├── context/            # React Context providers
│   │   ├── AppContext.js
│   │   └── AuthContext.js
│   │
│   ├── hooks/              # Custom React hooks
│   │   ├── useFetch.js
│   │   ├── useForm.js
│   │   ├── useLocalStorage.js
│   │   └── useDebounce.js
│   │
│   ├── utils/              # Utility functions
│   │   ├── seo.js          # SEO utilities ✅
│   │   ├── security.js     # Client-side security
│   │   ├── validation.js
│   │   ├── formatting.js
│   │   └── api.js
│   │
│   ├── services/           # API service layer
│   │   ├── supabase.js
│   │   ├── api.js
│   │   └── index.js
│   │
│   └── data/               # Static data
│       └── legalContent.js
│
├── css/                    # CSS modules
│   ├── variables.css       # CSS custom properties
│   ├── coach-profile.css
│   ├── booking.css
│   ├── quiz.css
│   ├── onboarding.css
│   ├── admin.css
│   └── [20+ more CSS files]
│
├── email-templates/        # HTML email templates
│   ├── welcome.html
│   ├── booking-confirmation.html
│   ├── payment-confirmation.html
│   └── [5 more templates]
│
└── docs/                   # Documentation (created by this audit)
```

---

## 2. Feature Inventory

### Legend
- ✅ **Complete** - Functional and production-ready
- 🔶 **Partial** - Works but needs refinement
- ❌ **Incomplete** - Stub/placeholder/broken
- ⚠️ **Needs Fix** - Has issues that must be addressed

### Core Features

| Feature | Status | Files | Notes |
|---------|--------|-------|-------|
| **Coach Search/Browse** | ✅ | `coaches.php`, `app.js` | Real Supabase queries, video priority sorting |
| **Coach Profile Page** | ✅ | `CoachProfilePage.js`, `coachProfile.js` | Video previews, credentials, reviews, services |
| **Coach Onboarding Wizard** | ✅ | `onboarding.js` | Multi-step, progress saving, profile picture upload |
| **8-Question Matching Quiz** | ✅ | `matchingQuiz.js` | AI-powered matching, multi-language |
| **Category Landing Pages** | ✅ | `CategoryPage.js`, `seoLandingPages.js` | Executive, Life, Career, Business coaching etc. |
| **Client Dashboard** | 🔶 | `clientDashboard.js` | Basic structure, needs booking integration |
| **Coach Dashboard** | 🔶 | `coachDashboard.js` | Needs real-time data |
| **Discovery Call Booking** | 🔶 | `bookings.php` | Logic exists but uses undefined `$supabase` global |
| **Paid Session Booking** | 🔶 | `bookings.php`, `bookingFlow.js` | Payment intent creation works, confirmation needs testing |
| **Package Booking** | 🔶 | `stripe.php` | Logic complete, needs integration testing |
| **Stripe Connect Integration** | 🔶 | `stripe.php` | Express accounts, destination charges |
| **Admin Dashboard** | ❌ | `admin.js` | Frontend exists, most backend endpoints return mock data |
| **Authentication System** | ❌ | `auth.php`, `Auth.php` | Returns mock data, needs real implementation |
| **Reviews System** | ✅ | `coaches.php` (getCoachReviews) | Works with Supabase |
| **Referral System** | 🔶 | `referrals.js`, `referrals.php` | Basic structure |
| **Promo Codes** | 🔶 | `promoCode.js`, `promo-codes.php` | Needs testing |
| **Session Notes** | ✅ | `sessionNotes.js` | Wizard and dashboard |
| **Progress Tracking** | 🔶 | `progress-dashboard.js` | Basic structure |
| **Analytics Dashboard** | 🔶 | `analytics-dashboard.js` | Chart.js integration |
| **Email Templates** | ✅ | `email-templates/` | 7 HTML templates |
| **PWA Support** | ✅ | `sw.js`, `manifest.json` | Service worker, offline support |
| **Internationalization** | ✅ | `i18n.js` | EN, DE, ES, FR, IT |

### Trust-Building Features

| Feature | Status | Notes |
|---------|--------|-------|
| Coach Credentials Verification | ✅ | CRUD endpoints, verification workflow |
| Video Introductions | ✅ | Upload, preview popup on profile |
| Trust Score Display | ✅ | Calculated from credentials, reviews, video |
| Reviews with Distribution | ✅ | Rating histogram, client info |
| Satisfaction Guarantee | 🔶 | Refund logic exists in stripe.php |
| "New Coach" Badge | ✅ | Automatic for recently joined coaches |

---

## 3. Data Flow Analysis

### Authentication Flow
```
Browser                     API (PHP)                    Supabase
   │                            │                            │
   │──── Login (Supabase JS) ──────────────────────────────▶│
   │◀─────── JWT Token ─────────────────────────────────────│
   │                            │                            │
   │──── API Request + JWT ────▶│                            │
   │                            │──── Decode JWT ───────────▶│ (no sig verify!)
   │                            │◀─── User ID ──────────────│
   │                            │                            │
   │                            │──── REST Query ───────────▶│
   │                            │◀─── Data ─────────────────│
   │◀─── Response ─────────────│                            │
```

**Issue:** JWT is decoded without signature verification in `Auth.php:172-186`. This relies on Supabase RLS for security, which is generally fine, but the PHP API should verify the JWT signature using the Supabase JWT secret for defense-in-depth.

### Booking Payment Flow
```
Client                      API                         Stripe                    Supabase
  │                          │                            │                          │
  │── createBookingIntent ──▶│                            │                          │
  │                          │──── Create booking (pending) ─────────────────────────▶│
  │                          │                            │                          │
  │                          │──── Get coach Stripe acct ─────────────────────────────▶│
  │                          │                            │                          │
  │                          │──── PaymentIntent (destination charge) ──▶│            │
  │                          │◀─── client_secret ─────────│                          │
  │◀── client_secret ───────│                            │                          │
  │                          │                            │                          │
  │──────────────────────── Stripe.js Payment ───────────▶│                          │
  │◀─────────────────────── Success ─────────────────────│                          │
  │                          │                            │                          │
  │── confirmBooking ───────▶│                            │                          │
  │                          │──── Verify PaymentIntent ──▶│                          │
  │                          │──── Update booking (confirmed) ──────────────────────▶│
  │◀── Confirmed ───────────│                            │                          │
```

---

## 4. Dependency Audit

### Frontend Dependencies (npm)

| Package | Version | Purpose | Risk |
|---------|---------|---------|------|
| eslint | ^8.57.0 | Linting | Dev only - Low |
| prettier | ^3.3.3 | Formatting | Dev only - Low |
| typescript | ^5.5.4 | Type checking | Dev only - Low |
| @typescript-eslint/* | ^7.17.0 | TS linting | Dev only - Low |
| serve | ^14.2.3 | Local dev server | Dev only - Low |

**Note:** React and ReactDOM are loaded via CDN/vendor files, not npm.

### CDN Dependencies (index.html)

| Library | Source | Version | Risk |
|---------|--------|---------|------|
| React | Local vendor file | 18.x | Low |
| ReactDOM | Local vendor file | 18.x | Low |
| Supabase JS | CDN jsdelivr | @2 | **Medium** - CDN dependency |
| Chart.js | CDN jsdelivr | @4.4.1 | **Medium** - CDN dependency |
| Stripe.js | js.stripe.com | v3 | Low - Official Stripe |
| Flag Icons | CDN jsdelivr | @7.2.3 | Low |

**Recommendation:** Consider bundling Supabase and Chart.js locally to eliminate CDN dependencies for production.

### PHP Dependencies

The API uses no external PHP dependencies (no Composer). It relies on:
- Built-in PHP functions
- cURL for HTTP requests
- Stripe SDK loading appears to be assumed but not shown

**Issue:** Stripe SDK (`\Stripe\...` classes) is referenced in `bookings.php` and `stripe.php` but there's no evidence of Composer autoload or manual require.

---

## 5. Security Audit

### Critical Issues (Must Fix)

| Issue | Location | Severity | Description |
|-------|----------|----------|-------------|
| **CORS Wildcard** | `api/config.php:5` | 🔴 High | `Access-Control-Allow-Origin: *` allows any origin |
| **Webhook No Signature** | `api/webhook.php:12` | 🔴 High | Stripe webhook signature verification commented out |
| **JWT No Signature Verify** | `api/lib/Auth.php:172` | 🟡 Medium | Decodes JWT without verifying signature |
| **Auth Returns Mock Data** | `api/endpoints/auth.php` | 🔴 High | Returns hardcoded user data instead of real auth |
| **Global $supabase Undefined** | `api/endpoints/bookings.php` | 🔴 High | Uses `global $supabase` that doesn't exist |

### Security Strengths

| Feature | Location | Notes |
|---------|----------|-------|
| Rate Limiting | `lib/RateLimiter.php` | File-based, 60 req/min default |
| Input Sanitization | `lib/Sanitizer.php` | Comprehensive XSS prevention |
| Input Validation | `lib/Validator.php` | Fluent validation API |
| SQL Injection | N/A | Uses Supabase REST API (parameterized) |
| Sensitive File Blocking | `api/.htaccess` | Blocks config.php, .env, Database.php |
| Security Headers | `api/.htaccess` | X-Content-Type-Options, X-XSS-Protection |
| RLS Policies | `schema.sql` | Comprehensive row-level security |

### Missing Security Features

| Feature | Priority | Notes |
|---------|----------|-------|
| CSP Headers | Medium | No Content-Security-Policy |
| HSTS | Medium | No Strict-Transport-Security |
| Frame Options | Low | No X-Frame-Options |
| API Key Rotation | Low | No mechanism for key rotation |
| Audit Logging | Medium | No request/action logging |

### CORS Fix Required

```php
// api/config.php - REPLACE:
header("Access-Control-Allow-Origin: *");

// WITH:
$allowedOrigins = [
    'https://coachsearching.com',
    'https://www.coachsearching.com',
    'http://localhost:3000'  // Dev only
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
}
```

---

## 6. SEO Audit

### Current Implementation

| Aspect | Status | Notes |
|--------|--------|-------|
| Meta tags | ✅ | Title, description, OG, Twitter |
| Canonical URLs | ✅ | Self-referencing canonicals |
| Hreflang | ✅ | 5 languages configured |
| Schema.org | ✅ | WebSite, Organization, FAQPage |
| robots.txt | ✅ | Properly configured |
| sitemap.xml | 🔶 | Static, needs dynamic generation |
| Mobile responsive | ✅ | Fully responsive CSS |
| PWA | ✅ | Service worker, manifest |

### Critical SEO Issues

| Issue | Impact | Solution |
|-------|--------|----------|
| **Hash-based routing** | 🔴 Critical | URLs like `/#coach/123` are not crawlable. Need History API or SSR |
| **No pre-rendering** | 🔴 Critical | SPA content not visible to crawlers without JS |
| **Static sitemap** | 🟡 Medium | Coach profiles not in sitemap |
| **No alt text system** | 🟡 Medium | Images lack systematic alt text |
| **app.js 349KB** | 🔴 Critical | Single massive file hurts load time |

### SEO Utility Library (js/utils/seo.js)

**Excellent foundation** with:
- `setPageMeta()` - Dynamic meta tag management
- `generateCoachSchema()` - Coach JSON-LD
- `generateServiceSchema()` - Service JSON-LD
- `generateFAQSchema()` - FAQ JSON-LD
- `generateBreadcrumbSchema()` - Breadcrumb JSON-LD
- `generateOrganizationSchema()` - Organization JSON-LD

**But** these are only applied client-side after JS loads - crawlers don't see them!

### Pre-rendering Solution Required

For coach profiles (key SEO pages), implement either:

1. **Static Site Generation** at build time (recommended)
   - Generate HTML files for each coach profile
   - Serve via GitHub Pages
   - Update nightly or on profile changes

2. **Server-Side Rendering** via PHP
   - Render coach profile HTML on first request
   - Include meta tags and structured data server-side

3. **Pre-rendering Service** (e.g., Prerender.io)
   - Intercept crawler requests
   - Return pre-rendered HTML

---

## 7. Technical Debt Inventory

### High Priority

| Issue | Location | Impact |
|-------|----------|--------|
| app.js 349KB monolith | `js/app.js` | Load time, maintainability |
| Mock data in endpoints | `auth.php`, `search.php` | Non-functional features |
| Undefined `$supabase` global | `bookings.php` | Runtime errors |
| Inconsistent API patterns | Various endpoints | Some use Database class, some use raw cURL |
| Missing Stripe SDK require | `bookings.php`, `stripe.php` | Potential runtime errors |

### Medium Priority

| Issue | Location | Impact |
|-------|----------|--------|
| Duplicate currency formatting | Multiple files | Maintainability |
| Inline CSS in app.js | `app.js:427-511` | Style organization |
| Console.log statements | Throughout | Production noise |
| TODO comments | 15+ locations | Incomplete work |

### Low Priority

| Issue | Location | Impact |
|-------|----------|--------|
| ESM import inconsistency | Some use CDN ESM, some use local | Minor confusion |
| Backup files | `app-backup.js` | Cleanup needed |
| Unused CSS | Potential in 28 CSS files | Bundle size |

---

## 8. Database Schema Summary

### Tables (Supabase PostgreSQL)

| Table | Purpose | RLS |
|-------|---------|-----|
| `cs_coaches` | Coach profiles | ✅ Public read, owner write |
| `cs_clients` | Client profiles | ✅ Owner only |
| `cs_businesses` | Business accounts | ✅ Owner only |
| `cs_bookings` | All bookings | ✅ Participants only |
| `cs_packages` | Session packages | ✅ Public read, coach write |
| `cs_reviews` | Coach reviews | ✅ Public read, client write |
| `cs_notifications` | In-app notifications | ✅ Owner only |
| `cs_coach_availability` | Weekly schedule | ✅ Public read, coach write |
| `cs_coach_availability_overrides` | Date exceptions | ✅ Public read, coach write |
| `cs_articles` | Coach articles | ✅ Published public, draft private |
| `cs_pro_bono_slots` | Free session slots | ✅ Public read, coach write |
| `cs_feature_flags` | Feature toggles | ✅ Public read |

### Key Indexes
```sql
idx_coach_availability_coach_day    -- Availability lookup
idx_bookings_coach_time             -- Coach calendar
idx_bookings_client                 -- Client history
idx_bookings_payment_intent         -- Webhook lookup
idx_notifications_user_read         -- Notification list
idx_reviews_coach                   -- Review aggregation
```

### Database Functions
- `update_coach_rating()` - Trigger to recalculate avg rating
- `confirm_booking_by_intent()` - RPC for webhook updates

---

## 9. Performance Concerns

| Issue | Metric | Impact | Solution |
|-------|--------|--------|----------|
| app.js size | 349KB | 2-3s parse time | Code splitting |
| 28 CSS imports | Waterfall loading | Render blocking | CSS bundling |
| No lazy loading | All coach images | Initial load | Intersection Observer |
| CDN dependencies | 3rd party latency | Variable | Self-host critical libs |
| No service worker caching strategy | Cache undefined | Inconsistent offline | Implement sw.js caching |

### Recommended Performance Budget

| Resource | Target | Current |
|----------|--------|---------|
| First Contentful Paint | < 1.5s | Unknown |
| Largest Contentful Paint | < 2.5s | Unknown |
| Total Blocking Time | < 300ms | Unknown |
| Cumulative Layout Shift | < 0.1 | Unknown |
| Total JS | < 200KB | ~400KB+ |
| Total CSS | < 50KB | Unknown |

---

## 10. Environment & Deployment

### Current Setup
- **Frontend:** GitHub Pages (static hosting)
- **API:** FTP deployment to `https://clouedo.com/coachsearching/api`
- **Database:** Supabase hosted PostgreSQL
- **Payments:** Stripe Connect (test mode assumed)

### Environment Variables (api/.env)
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
STRIPE_SECRET_KEY=
STRIPE_CONNECT_CLIENT_ID=
STRIPE_WEBHOOK_SECRET=
OPENROUTER_API_KEY=
OPENROUTER_MODEL=
```

### Missing Production Checklist
- [ ] Stripe live keys configured
- [ ] Webhook signature verification enabled
- [ ] CORS restricted to production domain
- [ ] Error logging configured
- [ ] Database backups scheduled
- [ ] SSL certificate verified
- [ ] Rate limiting tuned for production load

---

## 11. Conclusion & Recommendations

### Immediate Actions (Before Launch)

1. **Fix CORS** - Restrict to production domain
2. **Enable webhook signature verification** - Uncomment and configure
3. **Implement auth endpoints** - Replace mock data with real Supabase auth
4. **Fix $supabase global** - Initialize properly or use Database class
5. **Add Stripe SDK** - Ensure PHP Stripe library is loaded

### Short-term Improvements

1. **Pre-rendering for SEO** - Critical for coach profile indexing
2. **Split app.js** - Code splitting for better load times
3. **Dynamic sitemap** - Generate from database
4. **Security headers** - Add CSP, HSTS
5. **Error logging** - Centralized logging system

### Long-term Enhancements

1. **Build pipeline** - Webpack/Vite for JS bundling
2. **Testing** - Unit tests for critical paths
3. **CI/CD** - Automated deployment
4. **Monitoring** - Application performance monitoring
5. **CDN** - CloudFlare or similar for global performance

---

*This audit was generated on December 9, 2025. Re-audit recommended after implementing critical fixes.*
