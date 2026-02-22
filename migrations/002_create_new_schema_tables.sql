-- =============================================================================
-- Migration 002: Create new optimised schema tables
-- =============================================================================
-- Strategy: create _new shadow tables first, migrate data in 003, rename in 004.
-- Run this file once against your Supabase project via the SQL editor or CLI.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. cs_users_new
--    Adds: slug (unique), profile_data JSONB
--    Removes: (nothing from current cs_users; only columns moved here as well)
-- ---------------------------------------------------------------------------
create table if not exists public.cs_users_new (
    id                    uuid        not null primary key references auth.users(id) on delete cascade,
    email                 text        not null unique,
    full_name             text,
    avatar_url            text,
    user_type             text        not null default 'client'::text,
    slug                  text        unique,
    language_preference   text        default 'en',
    timezone              text        default 'UTC',
    currency              text        default 'EUR',
    phone                 text,
    is_verified           boolean     default false,
    is_active             boolean     default true,
    is_email_verified     boolean     default false,
    onboarding_completed  boolean     default false,
    gdpr_consent_at       timestamptz,
    terms_accepted_at     timestamptz,
    marketing_consent     boolean     default false,
    signup_source         text,
    referral_code         text,
    referred_by           uuid        references cs_users_new(id),
    last_seen_at          timestamptz,
    created_at            timestamptz default now(),
    updated_at            timestamptz default now(),
    -- JSONB blob that stores all role-specific display data
    profile_data          jsonb       not null default '{}'::jsonb
);

-- Indexes for cs_users_new
create index if not exists idx_cs_users_new_email         on public.cs_users_new(email);
create index if not exists idx_cs_users_new_user_type     on public.cs_users_new(user_type);
create index if not exists idx_cs_users_new_slug          on public.cs_users_new(slug);
create index if not exists idx_cs_users_new_referral_code on public.cs_users_new(referral_code);
create index if not exists idx_cs_users_new_created_at    on public.cs_users_new(created_at desc);
-- GIN index for JSONB filtering / containment queries
create index if not exists idx_cs_users_new_profile_data  on public.cs_users_new using gin (profile_data);

-- Expression indexes for frequently-filtered JSONB coach fields
create index if not exists idx_cs_users_new_pd_is_featured
    on public.cs_users_new ((profile_data->>'is_featured'))
    where user_type = 'coach';

create index if not exists idx_cs_users_new_pd_is_verified
    on public.cs_users_new ((profile_data->>'is_verified'))
    where user_type = 'coach';

create index if not exists idx_cs_users_new_pd_hourly_rate
    on public.cs_users_new (((profile_data->>'hourly_rate')::numeric))
    where user_type = 'coach';

create index if not exists idx_cs_users_new_pd_city_id
    on public.cs_users_new ((profile_data->>'city_id'))
    where user_type = 'coach';

-- ---------------------------------------------------------------------------
-- 2. cs_coaches_new  (operational / billing / subscription data only)
-- ---------------------------------------------------------------------------
create table if not exists public.cs_coaches_new (
    -- Keep surrogate id with UNIQUE so existing FK references from other tables
    -- (cs_bookings.coach_id, cs_reviews.coach_id, etc.) continue to work.
    id                          uuid        not null default extensions.uuid_generate_v4() unique,
    -- user_id is now the PRIMARY KEY (no separate surrogate PK needed for new code)
    user_id                     uuid        not null primary key references public.cs_users_new(id) on delete cascade,
    stripe_account_id           text        unique,
    stripe_onboarding_complete  boolean     default false,
    stripe_charges_enabled      boolean     default false,
    stripe_payouts_enabled      boolean     default false,
    subscription_status         text        default 'trial'::text
                                    check (subscription_status in ('trial', 'active', 'expired', 'cancelled')),
    trial_ends_at               timestamptz default now() + interval '14 days',
    subscription_ends_at        timestamptz,
    stripe_subscription_id      text,
    subscription_price_yearly   integer     default 5000,
    onboarding_completed        boolean     default false,
    verified_at                 timestamptz,
    last_booking_at             timestamptz,
    total_sessions_completed    integer     default 0,
    profile_views               integer     default 0,
    created_at                  timestamptz default now(),
    updated_at                  timestamptz default now()
);

create index if not exists idx_cs_coaches_new_subscription_status
    on public.cs_coaches_new(subscription_status);
create index if not exists idx_cs_coaches_new_trial_ends_at
    on public.cs_coaches_new(trial_ends_at);
create index if not exists idx_cs_coaches_new_stripe_account_id
    on public.cs_coaches_new(stripe_account_id);

-- ---------------------------------------------------------------------------
-- 3. cs_clients_new  (operational / billing data only)
-- ---------------------------------------------------------------------------
create table if not exists public.cs_clients_new (
    -- Keep surrogate id with UNIQUE for backward FK compatibility
    id                          uuid        not null default extensions.uuid_generate_v4() unique,
    user_id                     uuid        not null primary key references public.cs_users_new(id) on delete cascade,
    stripe_customer_id          text,
    total_bookings              integer     default 0,
    total_completed_sessions    integer     default 0,
    total_amount_spent          numeric(10,2) default 0,
    last_booking_at             timestamptz,
    created_at                  timestamptz default now(),
    updated_at                  timestamptz default now()
);

create index if not exists idx_cs_clients_new_user_id
    on public.cs_clients_new(user_id);

-- ---------------------------------------------------------------------------
-- 4. cs_posts_new  (simplified — no denormalised author columns)
-- ---------------------------------------------------------------------------
create table if not exists public.cs_posts_new (
    id             uuid        primary key default extensions.uuid_generate_v4(),
    user_id        uuid        not null references public.cs_users_new(id) on delete cascade,
    content        text        not null,
    image_url      text,
    video_url      text,
    likes_count    integer     not null default 0,
    comments_count integer     not null default 0,
    created_at     timestamptz default now(),
    updated_at     timestamptz default now()
);

create index if not exists idx_cs_posts_new_user_id
    on public.cs_posts_new(user_id);
create index if not exists idx_cs_posts_new_created_at
    on public.cs_posts_new(created_at desc);
