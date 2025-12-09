# Changelog

All notable changes to CoachSearching.com will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Pre-rendering solution for SEO
- Dynamic sitemap generation
- Complete admin dashboard backend
- Full GDPR compliance (data export, deletion)
- Code splitting for performance
- Complete auth endpoint implementation

---

## [2.0.0] - 2025-12-09

### Added - Comprehensive Documentation
- `docs/CODEBASE_AUDIT.md` - Full codebase analysis and security audit
- `docs/ARCHITECTURE.md` - System architecture documentation
- `docs/FEATURES.md` - Complete feature inventory with status
- `docs/AI_DEVELOPMENT_GUIDE.md` - Guide for AI-assisted development
- `docs/CHANGELOG.md` - This changelog file
- `README.md` - Project overview and quick start guide

### Identified Issues
- CORS wildcard security vulnerability in `api/config.php`
- Webhook signature verification commented out in `api/webhook.php`
- JWT decoded without signature verification in `api/lib/Auth.php`
- Undefined `$supabase` global in `api/endpoints/bookings.php`
- Auth endpoints return mock data instead of real implementation
- Search endpoint returns mock data
- Hash-based routing prevents proper SEO indexing

### Documented
- 25+ features with implementation status
- Complete file structure inventory
- Database schema with RLS policies
- Payment flow architecture
- Security layer analysis
- Performance bottlenecks

---

## [1.9.0] - 2025-12-08

### Added
- Video preview popup on coach profile page
- "View all reviews" popup modal
- "New Coach" badge translations
- Video priority sorting in coach search

### Changed
- Simplified client reviews to clickable overview
- Rearranged coach profile page layout

### Fixed
- Coach profile page styling improvements

---

## [1.8.0] - 2025-11-27

### Added
- 7 comprehensive email templates
  - Welcome email
  - Booking confirmation
  - Booking reminder
  - Review request
  - Payment confirmation
  - Payout notification
  - Password reset
- Email template documentation

### Changed
- Updated sitemap with hreflang support
- Improved robots.txt configuration

---

## [1.7.0] - 2025-11-20

### Added
- Session notes wizard for coaches
- Progress tracking dashboard
- Analytics dashboard with Chart.js
- Referral system foundation

### Changed
- Coach dashboard layout improvements

---

## [1.6.0] - 2025-11-15

### Added
- Stripe Connect Express integration
- Destination charge payment flow
- Package booking with discounts
- Satisfaction guarantee refund logic
- Founding coach program (10% commission)

### Security
- Added rate limiting (`lib/RateLimiter.php`)
- Added input sanitization (`lib/Sanitizer.php`)
- Added input validation (`lib/Validator.php`)

---

## [1.5.0] - 2025-11-10

### Added
- Coach onboarding wizard (9 steps)
- Profile picture upload
- Flag-based language selection
- Pill-based specialty input
- Progress saving to localStorage

### Changed
- Improved form validation UX

---

## [1.4.0] - 2025-11-05

### Added
- 8-question matching quiz
- AI-powered coach recommendations
- Quiz results page with match scores
- Quiz progress bar component

### Changed
- Homepage CTA to include quiz option

---

## [1.3.0] - 2025-11-01

### Added
- Coach credentials system
- Verification workflow structure
- Trust score calculation
- Verified badge display

### Security
- Added RLS policies for credentials table

---

## [1.2.0] - 2025-10-25

### Added
- Booking system foundation
- Discovery call booking (free)
- Paid session booking flow
- Availability calendar component
- Blocked dates management

### Changed
- Coach profile to include booking widget

---

## [1.1.0] - 2025-10-20

### Added
- Category landing pages (8 categories)
- SEO utility library (`js/utils/seo.js`)
- JSON-LD structured data generators
- Meta tag management
- Breadcrumb schema support

### SEO
- Added Organization schema
- Added WebSite schema with search
- Added FAQ schema for category pages

---

## [1.0.0] - 2025-10-15

### Added
- Initial coach search and browse
- Coach profile pages
- Reviews system
- Supabase integration
- React (UMD) + htm architecture
- PHP 8.4 REST API
- Multi-language support (EN, DE, ES, FR, IT)
- PWA support with service worker
- GitHub Pages deployment

### Database
- Complete PostgreSQL schema
- Row Level Security policies
- Core tables: coaches, bookings, reviews, clients

---

## Version History Summary

| Version | Date | Highlights |
|---------|------|------------|
| 2.0.0 | Dec 2025 | Comprehensive documentation |
| 1.9.0 | Dec 2025 | Video previews, profile improvements |
| 1.8.0 | Nov 2025 | Email templates |
| 1.7.0 | Nov 2025 | Session notes, analytics |
| 1.6.0 | Nov 2025 | Stripe Connect, packages |
| 1.5.0 | Nov 2025 | Onboarding wizard |
| 1.4.0 | Nov 2025 | Matching quiz |
| 1.3.0 | Nov 2025 | Credentials system |
| 1.2.0 | Oct 2025 | Booking system |
| 1.1.0 | Oct 2025 | SEO improvements |
| 1.0.0 | Oct 2025 | Initial release |

---

## Migration Notes

### Upgrading to 2.0.0

No code changes required - this release adds documentation only.

However, the audit identified critical issues that should be addressed:

1. **CORS Fix Required** (Security)
   - File: `api/config.php`
   - Change `Access-Control-Allow-Origin: *` to specific domains

2. **Webhook Signature Verification** (Security)
   - File: `api/webhook.php`
   - Uncomment and configure signature verification

3. **Auth Endpoint Implementation** (Functionality)
   - File: `api/endpoints/auth.php`
   - Replace mock data with real Supabase auth

4. **Bookings $supabase Fix** (Bug)
   - File: `api/endpoints/bookings.php`
   - Initialize `$supabase` or use `Database` class

---

*For detailed information about any change, see the commit history or documentation in `/docs/`.*
