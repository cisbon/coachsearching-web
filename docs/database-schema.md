# CoachSearching Database Schema

**Last Updated:** 2024-12-16
**Database:** Supabase (PostgreSQL)
**Table Prefix:** `cs_`

---

## Overview

The CoachSearching database uses a simplified schema optimized for the MVP. All tables are prefixed with `cs_` to distinguish them from other applications sharing the same Supabase project.

### Table Summary

| Table | Purpose | Records |
|-------|---------|---------|
| `cs_users` | User accounts (clients, coaches, admins) | Core |
| `cs_coaches` | Coach profiles and settings | Core |
| `cs_clients` | Client profiles and preferences | Core |
| `cs_bookings` | Session bookings (future use) | Core |
| `cs_reviews` | Coach reviews and ratings | Core |
| `cs_discovery_requests` | Discovery call requests | Core |
| `cs_favorites` | Saved/favorited coaches | Core |
| `cs_articles` | Coach blog posts/articles | Content |
| `cs_notifications` | User notifications | System |
| `cs_promo_codes` | Promotional codes | Marketing |
| `cs_promo_code_usage` | Promo code redemptions | Marketing |
| `cs_referral_codes` | Referral system codes | Marketing |
| `cs_referral_code_usage` | Referral tracking | Marketing |
| `cs_feature_flags` | Feature toggles | System |
| `cs_coach_views` | Profile view analytics | Analytics |

---

## Core Tables

### cs_users

User accounts linked to Supabase Auth.

```sql
CREATE TABLE cs_users (
  id uuid PRIMARY KEY,                              -- References auth.users(id)
  email text NOT NULL UNIQUE,
  full_name text,
  avatar_url text,
  user_type text DEFAULT 'client',                  -- 'client', 'coach', 'admin'
  language_preference text DEFAULT 'en',
  timezone text DEFAULT 'UTC',
  currency text DEFAULT 'EUR',
  phone text,

  -- GDPR & Legal
  gdpr_consent_at timestamptz,
  terms_accepted_at timestamptz,
  marketing_consent boolean DEFAULT false,

  -- Status
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  is_email_verified boolean DEFAULT false,
  onboarding_completed boolean DEFAULT false,

  -- Referral
  signup_source text,
  referral_code text,
  referred_by uuid REFERENCES cs_users(id),

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_seen_at timestamptz,

  CONSTRAINT cs_users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
```

**Indexes:**
- Primary key on `id`
- Unique index on `email`

---

### cs_coaches

Coach profiles with professional information.

```sql
CREATE TABLE cs_coaches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE REFERENCES cs_users(id),

  -- Profile
  full_name text,
  title text,                                       -- e.g., "Certified Life Coach"
  bio text,
  avatar_url text,
  slug text NOT NULL UNIQUE,                        -- SEO-friendly URL slug

  -- Professional Info
  specialties text[] DEFAULT '{}',                  -- e.g., ['Life Coaching', 'Career']
  years_experience integer,
  certifications jsonb DEFAULT '[]',
  languages text[] DEFAULT '{}',                    -- e.g., ['English', 'German']

  -- Location
  location_city text,
  location_country text,

  -- Session Info
  session_types text[] DEFAULT '{}',                -- ['online', 'in-person', 'phone']
  hourly_rate numeric,
  currency text DEFAULT 'EUR',

  -- Stripe Integration
  stripe_account_id text UNIQUE,
  stripe_onboarding_complete boolean DEFAULT false,
  stripe_charges_enabled boolean DEFAULT false,
  stripe_payouts_enabled boolean DEFAULT false,

  -- Status Flags
  is_verified boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  is_active boolean DEFAULT true,
  onboarding_completed boolean DEFAULT false,
  profile_completion_percentage integer DEFAULT 0,

  -- Statistics (denormalized for performance)
  rating_count integer DEFAULT 0,
  rating_average numeric DEFAULT 0,
  total_sessions_completed integer DEFAULT 0,
  profile_views integer DEFAULT 0,

  -- Subscription
  subscription_status text DEFAULT 'trial',         -- 'trial', 'active', 'expired', 'cancelled'
  trial_ends_at timestamptz DEFAULT (now() + interval '14 days'),
  subscription_ends_at timestamptz,
  stripe_subscription_id text,

  -- External Links
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

**Indexes:**
- Primary key on `id`
- Unique index on `user_id`
- Unique index on `slug`
- Index on `is_active`
- GIN index on `specialties`
- GIN index on `languages`
- Index on `location_country`
- Index on `rating_average DESC`
- Index on `hourly_rate`

**Triggers:**
- `trigger_auto_coach_slug` - Auto-generates slug on INSERT

---

### cs_clients

Client profiles with preferences.

```sql
CREATE TABLE cs_clients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE REFERENCES cs_users(id),

  -- Profile
  full_name text,
  email text,
  phone text,
  avatar_url text,

  -- Preferences
  preferred_coach_types text[] DEFAULT '{}',
  preferred_specialties text[] DEFAULT '{}',
  preferred_languages text[] DEFAULT '{}',
  budget_range_min numeric,
  budget_range_max numeric,
  currency text DEFAULT 'EUR',
  timezone text,
  preferred_meeting_type text,

  -- Status
  is_active boolean DEFAULT true,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

---

### cs_bookings

Session bookings between clients and coaches.

```sql
CREATE TABLE cs_bookings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL REFERENCES cs_clients(id),
  coach_id uuid NOT NULL REFERENCES cs_coaches(id),

  -- Schedule
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),

  -- Status
  status text NOT NULL DEFAULT 'pending',           -- 'pending', 'confirmed', 'completed', 'cancelled'

  -- Meeting Details
  meeting_type text DEFAULT 'online',               -- 'online', 'in-person', 'phone'
  meeting_link text,
  meeting_address text,

  -- Notes
  client_notes text,
  coach_notes text,

  -- Payment
  amount numeric NOT NULL CHECK (amount >= 0),
  currency text DEFAULT 'EUR',
  stripe_payment_intent_id text,

  -- Cancellation
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES cs_users(id),
  cancellation_reason text,

  -- Completion
  completed_at timestamptz,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

---

### cs_reviews

Coach reviews from clients.

```sql
CREATE TABLE cs_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES cs_coaches(id),

  -- Review Content
  reviewer_name text DEFAULT 'Anonymous',
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text text,

  -- Timestamps
  created_at timestamptz DEFAULT now()
);
```

**Indexes:**
- Index on `coach_id`
- Index on `created_at DESC`

---

### cs_discovery_requests

Discovery call requests from potential clients.

```sql
CREATE TABLE cs_discovery_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES cs_coaches(id),

  -- Client Info
  client_name varchar NOT NULL,
  client_phone varchar NOT NULL,
  client_email varchar,
  client_message text,
  time_preference varchar NOT NULL,

  -- Status
  status varchar DEFAULT 'pending',                 -- 'pending', 'contacted', 'scheduled', 'completed', 'cancelled'
  coach_notes text,
  email_sent_at timestamptz,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Indexes:**
- Index on `coach_id`
- Index on `status`
- Index on `created_at DESC`

---

### cs_favorites

Saved/favorited coaches by users.

```sql
CREATE TABLE cs_favorites (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL REFERENCES cs_users(id),
  coach_id uuid NOT NULL REFERENCES cs_coaches(id),
  created_at timestamptz DEFAULT now(),

  UNIQUE(client_id, coach_id)
);
```

**Indexes:**
- Index on `client_id`
- Index on `coach_id`

---

## Content Tables

### cs_articles

Coach blog posts and articles.

```sql
CREATE TABLE cs_articles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id uuid NOT NULL REFERENCES cs_coaches(id),

  -- Content
  title text NOT NULL,
  slug text NOT NULL,
  content_markdown text,
  content_html text,
  excerpt text,
  featured_image_url text,

  -- Status
  status cs_article_status DEFAULT 'draft',         -- 'draft', 'published', 'archived'

  -- SEO
  meta_title text,
  meta_description text,

  -- Stats
  view_count integer DEFAULT 0,

  -- Timestamps
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Indexes:**
- Index on `coach_id`
- Index on `status`
- Index on `published_at DESC`

---

## System Tables

### cs_notifications

User notifications.

```sql
CREATE TABLE cs_notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES cs_users(id),

  -- Content
  type cs_notification_type NOT NULL,
  title text NOT NULL,
  body text,
  data jsonb DEFAULT '{}',
  action_url text,

  -- Status
  is_read boolean DEFAULT false,
  read_at timestamptz,

  -- Timestamps
  created_at timestamptz DEFAULT now()
);
```

**Indexes:**
- Index on `user_id`
- Index on `is_read`
- Index on `created_at DESC`

---

### cs_feature_flags

Feature toggles for gradual rollouts.

```sql
CREATE TABLE cs_feature_flags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  description text,
  enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

---

## Marketing Tables

### cs_promo_codes

Promotional discount codes.

```sql
CREATE TABLE cs_promo_codes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  discount_type cs_discount_type NOT NULL,          -- 'percentage', 'fixed'
  discount_value numeric NOT NULL,

  -- Validity
  valid_from timestamptz NOT NULL,
  valid_until timestamptz,
  max_uses integer,
  current_uses integer DEFAULT 0,
  is_active boolean DEFAULT true,

  -- Admin
  created_by uuid REFERENCES cs_users(id),
  created_at timestamptz DEFAULT now()
);
```

---

### cs_promo_code_usage

Tracks promo code redemptions.

```sql
CREATE TABLE cs_promo_code_usage (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  promo_code_id uuid NOT NULL REFERENCES cs_promo_codes(id),
  user_id uuid NOT NULL REFERENCES cs_users(id),
  booking_id uuid,
  discount_applied numeric NOT NULL,
  used_at timestamptz DEFAULT now()
);
```

---

### cs_referral_codes

Referral system codes.

```sql
CREATE TABLE cs_referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id),
  description text,

  -- Limits
  max_uses integer,
  current_uses integer DEFAULT 0,
  is_active boolean DEFAULT true,

  -- Validity
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,

  -- Benefit
  benefit_type varchar DEFAULT 'free_year_premium',
  benefit_value jsonb DEFAULT '{"months": 12}',

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

---

### cs_referral_code_usage

Tracks referral code usage.

```sql
CREATE TABLE cs_referral_code_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id uuid NOT NULL REFERENCES cs_referral_codes(id),
  used_by_user_id uuid NOT NULL REFERENCES auth.users(id),
  used_at timestamptz DEFAULT now(),
  benefit_applied boolean DEFAULT false,
  benefit_applied_at timestamptz,
  notes text
);
```

---

## Analytics Tables

### cs_coach_views

Tracks profile views for analytics.

```sql
CREATE TABLE cs_coach_views (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id uuid NOT NULL REFERENCES cs_coaches(id),
  viewer_id uuid REFERENCES cs_users(id),
  ip_address inet,
  user_agent text,
  viewed_at timestamptz DEFAULT now()
);
```

---

## Views

### cs_coaches_with_location

Helper view with computed location display.

```sql
CREATE VIEW cs_coaches_with_location AS
SELECT
  *,
  COALESCE(
    NULLIF(CONCAT_WS(', ', location_city, location_country), ''),
    'Remote'
  ) AS location_display
FROM cs_coaches;
```

---

### cs_active_coaches

View of active coaches who completed onboarding.

```sql
CREATE VIEW cs_active_coaches AS
SELECT
  c.*,
  COALESCE(
    NULLIF(CONCAT_WS(', ', c.location_city, c.location_country), ''),
    'Remote'
  ) AS location_display
FROM cs_coaches c
WHERE c.is_active = true
  AND c.onboarding_completed = true;
```

---

## Enum Types

```sql
-- Article status
CREATE TYPE cs_article_status AS ENUM ('draft', 'published', 'archived');

-- Notification types
CREATE TYPE cs_notification_type AS ENUM (
  'booking_confirmed',
  'booking_cancelled',
  'review_received',
  'message_received',
  'discovery_request',
  'system'
);

-- Discount types
CREATE TYPE cs_discount_type AS ENUM ('percentage', 'fixed');
```

---

## Functions

### generate_coach_slug

Auto-generates SEO-friendly slugs for coaches.

```sql
CREATE FUNCTION generate_coach_slug(full_name TEXT, title TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    base_slug := lower(full_name);

    IF title IS NOT NULL AND title != '' THEN
        base_slug := base_slug || ' ' || lower(left(title, 30));
    END IF;

    base_slug := regexp_replace(base_slug, '[^a-z0-9\s-]', '', 'g');
    base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
    base_slug := regexp_replace(base_slug, '-+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    base_slug := left(base_slug, 100);

    final_slug := base_slug;

    WHILE EXISTS (SELECT 1 FROM cs_coaches WHERE slug = final_slug) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;

    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;
```

---

## Row Level Security (RLS)

All tables have RLS enabled. Key policies:

### cs_coaches
- **SELECT:** Anyone can view active coaches
- **INSERT:** Authenticated users can create their own profile
- **UPDATE:** Users can only update their own profile
- **DELETE:** Users can only delete their own profile

### cs_users
- **SELECT:** Users can view their own data
- **UPDATE:** Users can update their own data

### cs_reviews
- **SELECT:** Anyone can view reviews
- **INSERT:** Authenticated users can create reviews
- **UPDATE/DELETE:** Users can only modify their own reviews

### cs_discovery_requests
- **SELECT:** Coaches can view requests for themselves
- **INSERT:** Anyone can submit discovery requests
- **UPDATE:** Coaches can update status of their requests

---

## Notes

1. **Timestamps:** All tables use `timestamptz` for timezone-aware timestamps
2. **UUIDs:** All primary keys use UUID v4 for security
3. **Soft Deletes:** Use `is_active` flags instead of hard deletes
4. **Denormalization:** Some stats (rating_average, profile_views) are denormalized for query performance
5. **Arrays:** PostgreSQL arrays used for multi-value fields (specialties, languages, session_types)
6. **JSONB:** Used for flexible structured data (certifications, benefit_value)
