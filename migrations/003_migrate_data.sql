-- =============================================================================
-- Migration 003: Migrate data into new shadow tables
-- =============================================================================
-- Depends on: 002_create_new_schema_tables.sql
-- Run inside a single transaction so the migration is atomic.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- STEP 1: Copy core user rows into cs_users_new
--         profile_data starts as empty object; populated per role below.
-- ---------------------------------------------------------------------------
insert into public.cs_users_new (
    id,
    email,
    full_name,
    avatar_url,
    user_type,
    slug,                 -- populated for coaches from cs_coaches.slug
    language_preference,
    timezone,
    currency,
    phone,
    is_verified,
    is_active,
    is_email_verified,
    onboarding_completed,
    gdpr_consent_at,
    terms_accepted_at,
    marketing_consent,
    signup_source,
    referral_code,
    referred_by,
    last_seen_at,
    created_at,
    updated_at,
    profile_data
)
select
    u.id,
    u.email,
    coalesce(co.full_name, cl.full_name, u.full_name) as full_name,
    coalesce(co.avatar_url, cl.avatar_url, u.avatar_url) as avatar_url,
    u.user_type,
    -- Coaches have a slug in cs_coaches; clients may have one in cs_clients
    coalesce(co.slug, cl.slug)         as slug,
    u.language_preference,
    coalesce(cl.timezone, u.timezone)  as timezone,
    coalesce(co.currency, cl.currency, u.currency) as currency,
    coalesce(cl.phone, u.phone)        as phone,
    coalesce(co.is_verified, u.is_verified) as is_verified,
    coalesce(co.is_active, u.is_active, true) as is_active,
    u.is_email_verified,
    coalesce(co.onboarding_completed, u.onboarding_completed) as onboarding_completed,
    u.gdpr_consent_at,
    u.terms_accepted_at,
    u.marketing_consent,
    u.signup_source,
    u.referral_code,
    u.referred_by,
    u.last_seen_at,
    u.created_at,
    u.updated_at,
    '{}'::jsonb                        as profile_data
from public.cs_users u
left join public.cs_coaches co on co.user_id = u.id
left join public.cs_clients cl on cl.user_id = u.id
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- STEP 2: Populate profile_data for COACHES
-- ---------------------------------------------------------------------------
update public.cs_users_new u
set profile_data = jsonb_build_object(
    -- display / search fields migrated from cs_coaches
    'title',                       co.title,
    'bio',                         co.bio,
    'specialties',                 coalesce(co.specialties, '{}'),
    'years_experience',            co.years_experience,
    'languages',                   coalesce(co.languages, '{}'),
    'session_types',               coalesce(co.session_types, '{}'),
    'hourly_rate',                 co.hourly_rate,
    'currency',                    co.currency,
    'is_verified',                 coalesce(co.is_verified, false),
    'is_featured',                 coalesce(co.is_featured, false),
    'profile_completion_percentage', coalesce(co.profile_completion_percentage, 0),
    'total_sessions_completed',    coalesce(co.total_sessions_completed, 0),
    'profile_views',               coalesce(co.profile_views, 0),
    'city_id',                     co.city_id,
    'banner_url',                  co.banner_url,
    'title_en',                    co.title_en,
    'bio_en',                      co.bio_en,
    'primary_profile_language',    co.primary_profile_language,
    'instagram_url',               co.instagram_url,
    'linkedin_url',                co.linkedin_url,
    'intro_video_url',             co.intro_video_url,
    'website_url',                 co.website_url,
    'offers_free_discovery',       coalesce(co.offers_free_discovery, true)
)
from public.cs_coaches co
where co.user_id = u.id;

-- ---------------------------------------------------------------------------
-- STEP 3: Populate profile_data for CLIENTS
-- ---------------------------------------------------------------------------
update public.cs_users_new u
set profile_data = jsonb_build_object(
    -- display / preference fields migrated from cs_clients
    'preferred_coach_types',       coalesce(cl.preferred_coach_types, '{}'),
    'preferred_specialties',       coalesce(cl.preferred_specialties, '{}'),
    'preferred_languages',         coalesce(cl.preferred_languages, '{}'),
    'budget_range_min',            cl.budget_range_min,
    'budget_range_max',            cl.budget_range_max,
    'currency',                    cl.currency,
    'timezone',                    cl.timezone,
    'preferred_meeting_type',      cl.preferred_meeting_type,
    'total_bookings',              coalesce(cl.total_bookings, 0),
    'total_completed_sessions',    coalesce(cl.total_completed_sessions, 0),
    'total_amount_spent',          coalesce(cl.total_amount_spent, 0),
    'banner_url',                  cl.banner_url
)
from public.cs_clients cl
where cl.user_id = u.id;

-- ---------------------------------------------------------------------------
-- STEP 4: Insert operational coach rows into cs_coaches_new
-- ---------------------------------------------------------------------------
insert into public.cs_coaches_new (
    id,
    user_id,
    stripe_account_id,
    stripe_onboarding_complete,
    stripe_charges_enabled,
    stripe_payouts_enabled,
    subscription_status,
    trial_ends_at,
    subscription_ends_at,
    stripe_subscription_id,
    subscription_price_yearly,
    onboarding_completed,
    verified_at,
    last_booking_at,
    total_sessions_completed,
    profile_views,
    created_at,
    updated_at
)
select
    co.id,
    co.user_id,
    co.stripe_account_id,
    coalesce(co.stripe_onboarding_complete, false),
    coalesce(co.stripe_charges_enabled, false),
    coalesce(co.stripe_payouts_enabled, false),
    coalesce(co.subscription_status, 'trial'),
    co.trial_ends_at,
    co.subscription_ends_at,
    co.stripe_subscription_id,
    coalesce(co.subscription_price_yearly, 5000),
    coalesce(co.onboarding_completed, false),
    co.verified_at,
    co.last_booking_at,
    coalesce(co.total_sessions_completed, 0),
    coalesce(co.profile_views, 0),
    co.created_at,
    co.updated_at
from public.cs_coaches co
-- Only migrate coaches whose user_id exists in cs_users_new
where co.user_id in (select id from public.cs_users_new)
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- STEP 5: Insert operational client rows into cs_clients_new
-- ---------------------------------------------------------------------------
insert into public.cs_clients_new (
    id,
    user_id,
    stripe_customer_id,
    total_bookings,
    total_completed_sessions,
    total_amount_spent,
    last_booking_at,
    created_at,
    updated_at
)
select
    cl.id,
    cl.user_id,
    null::text               as stripe_customer_id, -- not present in old schema
    coalesce(cl.total_bookings, 0),
    coalesce(cl.total_completed_sessions, 0),
    coalesce(cl.total_amount_spent, 0),
    cl.last_booking_at,
    cl.created_at,
    cl.updated_at
from public.cs_clients cl
where cl.user_id in (select id from public.cs_users_new)
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- STEP 6: Migrate posts — drop denormalised author columns
-- ---------------------------------------------------------------------------
insert into public.cs_posts_new (
    id,
    user_id,
    content,
    image_url,
    video_url,
    likes_count,
    comments_count,
    created_at,
    updated_at
)
select
    p.id,
    p.user_id,
    p.content,
    p.image_url,
    p.video_url,
    coalesce(p.likes_count, 0),
    coalesce(p.comments_count, 0),
    p.created_at,
    p.updated_at
from public.cs_posts p
-- Only migrate posts whose user_id exists in cs_users_new
where p.user_id in (select id from public.cs_users_new)
on conflict (id) do nothing;

commit;

-- =============================================================================
-- VERIFICATION QUERIES  (run manually to check row counts match)
-- =============================================================================
-- select count(*) from public.cs_users         as old_users;
-- select count(*) from public.cs_users_new     as new_users;
-- select count(*) from public.cs_coaches       as old_coaches;
-- select count(*) from public.cs_coaches_new   as new_coaches;
-- select count(*) from public.cs_clients       as old_clients;
-- select count(*) from public.cs_clients_new   as new_clients;
-- select count(*) from public.cs_posts         as old_posts;
-- select count(*) from public.cs_posts_new     as new_posts;
--
-- Spot-check a coach profile_data:
-- select id, full_name, profile_data from public.cs_users_new
-- where user_type = 'coach' limit 3;
