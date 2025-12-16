# Database Schema Refactoring Plan

## Overview

This document outlines the plan to simplify and optimize the CoachSearching database schema. The current schema has grown organically and contains many unused tables, redundant columns, and duplicate systems.

**Goal:** Reduce from ~40 tables to ~15 essential tables, remove redundant columns, and simplify the data model.

---

## Phase 1: Database Migration

### 1.1 Tables to DROP (Unused in MVP)

| Table | Reason | Data Loss Risk |
|-------|--------|----------------|
| `cs_agreements` | No coaching agreements feature | None (empty) |
| `cs_audit_log` | Audit logging not implemented | None (empty) |
| `cs_coach_availability` | Discovery calls only, no booking calendar | None/Low |
| `cs_coach_availability_overrides` | Same as above | None/Low |
| `cs_conversations` | No messaging system | None (empty) |
| `cs_messages` | No messaging system | None (empty) |
| `cs_services` | Just using hourly_rate on coach | None/Low |
| `cs_invoices` | No invoice generation | None (empty) |
| `cs_payouts` | No automated payouts | None (empty) |
| `cs_pro_bono_bookings` | Pro bono feature not active | None (empty) |
| `cs_pro_bono_slots` | Pro bono feature not active | None (empty) |
| `cs_refunds` | No automated refunds | None (empty) |
| `cs_reports` | No moderation system | None (empty) |
| `cs_search_history` | Search analytics not implemented | None (empty) |
| `cs_terms_acceptance` | Terms tracking not implemented | None (empty) |
| `cs_data_export_requests` | GDPR exports not implemented | None (empty) |
| `cs_account_deletion_requests` | Account deletion not implemented | None (empty) |
| `cs_email_captures` | Email capture not used | None/Low |
| `cs_referrals` | Duplicate - using cs_referral_codes instead | Check data first |
| `cs_credentials` | Not used in current UI | Check data first |
| `coachsearching_coaches` | Legacy table | Check data first |
| `coachsearching_invite_codes` | Legacy table | Check data first |

### 1.2 Columns to DROP from `cs_coaches`

| Column | Reason | Migration Action |
|--------|--------|------------------|
| `location` | Redundant with location_city + location_country | Migrate data first if needed |
| `location_coordinates` | Geo search not implemented | Just drop |
| `offers_virtual` | Redundant with session_types | Ensure session_types has data |
| `offers_onsite` | Redundant with session_types | Ensure session_types has data |
| `total_reviews` | Duplicate of rating_count | Just drop |
| `total_sessions` | Confusing, keep only total_sessions_completed | Just drop |
| `banner_url` | Not used in UI | Just drop |
| `verification_badge_type` | Not used | Just drop |
| `auto_accept_bookings` | No booking system | Just drop |
| `buffer_time_minutes` | No booking system | Just drop |
| `max_advance_booking_days` | No booking system | Just drop |
| `cancellation_policy` | No booking system | Just drop |

### 1.3 Columns to DROP from `cs_users`

| Column | Reason | Migration Action |
|--------|--------|------------------|
| `role` (enum) | Duplicate of user_type | Ensure user_type has data |

### 1.4 Columns to DROP from `cs_clients`

| Column | Reason | Migration Action |
|--------|--------|------------------|
| `total_bookings` | Can compute from bookings | Just drop (or keep for perf) |
| `total_completed_sessions` | Can compute | Just drop (or keep for perf) |
| `total_amount_spent` | Can compute | Just drop (or keep for perf) |
| `last_booking_at` | Can compute | Just drop (or keep for perf) |

### 1.5 Tables to RENAME (Optional cleanup)

Consider renaming for consistency:
- `cs_coach_views` → keep as is (used for analytics)

---

## Phase 2: Frontend Changes (js/app.js)

### 2.1 Coach Queries - Update Field References

**Files to update:**
- `js/app.js` - Main application
- `js/pages/CoachProfilePage.js` - Coach profile page
- `js/coachProfile.js` - Coach profile components

**Changes needed:**

```javascript
// BEFORE: Using offers_virtual/offers_onsite
coach.offers_virtual
coach.offers_onsite

// AFTER: Using session_types array
coach.session_types?.includes('online')
coach.session_types?.includes('in-person')
```

```javascript
// BEFORE: Using location field
coach.location

// AFTER: Construct from city + country
const location = [coach.location_city, coach.location_country].filter(Boolean).join(', ') || 'Remote';
```

```javascript
// BEFORE: Using total_reviews
coach.total_reviews

// AFTER: Using rating_count only
coach.rating_count
```

### 2.2 Search/Filter in CoachList Component

**Location:** `js/app.js` - CoachList component (~line 2000-2600)

Update any queries that reference dropped columns:
- Remove references to `offers_virtual`, `offers_onsite`
- Update location filtering to use `location_city`, `location_country`

### 2.3 Onboarding Component

**Location:** `js/app.js` - CoachOnboarding component (~line 1200-1800)

Ensure onboarding saves:
- `session_types` array (not offers_virtual/offers_onsite)
- `location_city` and `location_country` (not location)

### 2.4 Dashboard Profile Editor

**Location:** `js/app.js` - DashboardProfile component (~line 3500-4500)

Same changes as onboarding - use new field names.

---

## Phase 3: Backend PHP API Changes

### 3.1 Files to Update

```
api/
├── controllers/
│   ├── CoachController.php      # Coach CRUD operations
│   ├── BookingController.php    # May reference dropped tables
│   ├── ReviewController.php     # Should be fine
│   └── DiscoveryController.php  # Should be fine
├── models/
│   ├── Coach.php                # Update field mappings
│   ├── Booking.php              # Check references
│   └── User.php                 # Remove role field
└── routes/
    └── api.php                  # Check endpoints
```

### 3.2 CoachController.php Changes

```php
// BEFORE
$coach->offers_virtual = $data['offers_virtual'];
$coach->offers_onsite = $data['offers_onsite'];
$coach->location = $data['location'];

// AFTER
$coach->session_types = $data['session_types']; // array
$coach->location_city = $data['location_city'];
$coach->location_country = $data['location_country'];
```

### 3.3 Remove Unused Endpoints

If any endpoints exist for dropped tables, remove them:
- `/api/agreements/*`
- `/api/messages/*`
- `/api/conversations/*`
- `/api/services/*`
- `/api/availability/*`
- `/api/invoices/*`
- `/api/payouts/*`

---

## Phase 4: Migration Strategy

### Step 1: Backup
```bash
# Export full database backup before any changes
pg_dump -h <host> -U <user> -d <database> > backup_before_refactor.sql
```

### Step 2: Run Migration
```sql
-- Run the migration file
\i supabase/migrations/20241216_schema_cleanup.sql
```

### Step 3: Update Frontend
1. Update all JavaScript files per Phase 2
2. Test locally with new schema

### Step 4: Update Backend
1. Update PHP API files per Phase 3
2. Test API endpoints

### Step 5: Deploy
1. Deploy database migration first
2. Deploy frontend + backend together
3. Monitor for errors

---

## Phase 5: Final Schema (After Cleanup)

### Essential Tables (14 tables)

```
cs_users                  # Core user accounts
cs_coaches                # Coach profiles (simplified)
cs_clients                # Client profiles (simplified)
cs_bookings               # Session bookings (keep for future)
cs_reviews                # Coach reviews
cs_discovery_requests     # Discovery call requests
cs_favorites              # Saved coaches
cs_articles               # Coach articles/blog posts
cs_notifications          # User notifications
cs_promo_codes            # Promotional codes
cs_promo_code_usage       # Promo code redemption tracking
cs_referral_codes         # Referral system
cs_referral_code_usage    # Referral tracking
cs_feature_flags          # Feature toggles
cs_coach_views            # Profile view analytics (optional)
```

### Simplified cs_coaches Table

```sql
CREATE TABLE cs_coaches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE REFERENCES cs_users(id),

  -- Profile
  full_name text,
  title text,
  bio text,
  avatar_url text,
  slug text NOT NULL UNIQUE,

  -- Professional
  specialties text[] DEFAULT '{}',
  years_experience integer,
  certifications jsonb DEFAULT '[]',
  languages text[] DEFAULT '{}',

  -- Location
  location_city text,
  location_country text,

  -- Session Info
  session_types text[] DEFAULT '{}',  -- ['online', 'in-person', 'phone']
  hourly_rate numeric,
  currency text DEFAULT 'EUR',

  -- Stripe
  stripe_account_id text UNIQUE,
  stripe_onboarding_complete boolean DEFAULT false,
  stripe_charges_enabled boolean DEFAULT false,
  stripe_payouts_enabled boolean DEFAULT false,

  -- Status
  is_verified boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  is_active boolean DEFAULT true,
  onboarding_completed boolean DEFAULT false,
  profile_completion_percentage integer DEFAULT 0,

  -- Stats
  rating_count integer DEFAULT 0,
  rating_average numeric DEFAULT 0,
  total_sessions_completed integer DEFAULT 0,
  profile_views integer DEFAULT 0,

  -- Subscription
  subscription_status text DEFAULT 'trial',
  trial_ends_at timestamptz DEFAULT (now() + interval '14 days'),
  subscription_ends_at timestamptz,
  stripe_subscription_id text,

  -- URLs
  linkedin_url text,
  intro_video_url text,
  website_url text,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  verified_at timestamptz,
  last_booking_at timestamptz
);
```

---

## Checklist

### Pre-Migration
- [ ] Backup database
- [ ] Document current table row counts
- [ ] Verify which tables are actually empty
- [ ] Test migration on staging/local first

### Database Migration
- [ ] Run schema cleanup migration
- [ ] Verify no errors
- [ ] Check data integrity

### Frontend Updates
- [ ] Update js/app.js - CoachList queries
- [ ] Update js/app.js - CoachOnboarding
- [ ] Update js/app.js - DashboardProfile
- [ ] Update js/pages/CoachProfilePage.js
- [ ] Update js/coachProfile.js
- [ ] Search for any other references to dropped columns

### Backend Updates
- [ ] Update api/controllers/CoachController.php
- [ ] Update any model files
- [ ] Remove unused controller files/endpoints
- [ ] Test all API endpoints

### Testing
- [ ] Test coach registration/onboarding
- [ ] Test coach profile editing
- [ ] Test coach search/filtering
- [ ] Test coach profile page display
- [ ] Test discovery call submission
- [ ] Test reviews display

### Deployment
- [ ] Deploy to staging
- [ ] Full QA on staging
- [ ] Deploy to production
- [ ] Monitor error logs

---

## Rollback Plan

If issues occur:

1. **Database:** Restore from backup
   ```bash
   psql -h <host> -U <user> -d <database> < backup_before_refactor.sql
   ```

2. **Code:** Revert to previous commit
   ```bash
   git revert HEAD
   ```

---

## Notes

- The `cs_bookings` table is kept even though not actively used - it will be needed when paid sessions are implemented
- `cs_coach_views` is kept for analytics even though profile_views exists on cs_coaches (denormalized for performance)
- Some denormalized fields on cs_clients are kept for query performance - can be dropped if not needed
