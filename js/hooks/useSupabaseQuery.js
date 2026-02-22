/**
 * Supabase Query Hooks
 * Wrapper hooks that combine TanStack Query with Supabase for easy caching.
 * All stale times are pulled from the centralized queryConfig.
 */
import { useQuery, useQueryClient } from '../config/queryClient.js';
import { QUERY_KEYS, STALE_TIMES } from '../config/queryConfig.js';

/**
 * Wait for supabaseClient to be available (it's initialized async in app.js)
 */
const getSupabase = () => window.supabaseClient;

// ─── LOOKUP HOOKS ───────────────────────────────────────────────────

/**
 * Fetch all active lookup options (specialties, languages, session formats)
 */
export function useLookupOptionsQuery() {
    return useQuery({
        queryKey: QUERY_KEYS.lookupOptions,
        queryFn: async () => {
            const supabase = getSupabase();
            if (!supabase) throw new Error('Supabase not ready');
            const { data, error } = await supabase
                .from('cs_lookup_options')
                .select('*')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });
            if (error) throw error;
            const options = data || [];
            return {
                specialties: options.filter(o => o.type === 'specialty'),
                languages: options.filter(o => o.type === 'language'),
                sessionFormats: options.filter(o => o.type === 'session_format'),
                isLoaded: true,
            };
        },
        staleTime: STALE_TIMES.lookupOptions,
        enabled: !!getSupabase(),
    });
}

/**
 * Fetch all active cities
 */
export function useCitiesQuery() {
    return useQuery({
        queryKey: QUERY_KEYS.cities,
        queryFn: async () => {
            const supabase = getSupabase();
            if (!supabase) throw new Error('Supabase not ready');
            const { data, error } = await supabase
                .from('cs_cities')
                .select('*')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });
            if (error) throw error;
            return { list: data || [], isLoaded: true };
        },
        staleTime: STALE_TIMES.cities,
        enabled: !!getSupabase(),
    });
}

/**
 * Fetch all active certifications
 */
export function useCertificationsQuery() {
    return useQuery({
        queryKey: QUERY_KEYS.certifications,
        queryFn: async () => {
            const supabase = getSupabase();
            if (!supabase) throw new Error('Supabase not ready');
            const { data, error } = await supabase
                .from('cs_certifications')
                .select('*')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });
            if (error) throw error;
            return { list: data || [], isLoaded: true };
        },
        staleTime: STALE_TIMES.certifications,
        enabled: !!getSupabase(),
    });
}

// ─── COACH HOOKS ────────────────────────────────────────────────────

/**
 * Fetch a coach profile by user ID.
 * New schema: display data comes from the coach_profiles VIEW which flattens
 * cs_users + cs_coaches + profile_data JSONB.
 */
export function useCoachByIdQuery(coachId) {
    return useQuery({
        queryKey: QUERY_KEYS.coachById(coachId),
        queryFn: async () => {
            const supabase = getSupabase();
            if (!supabase) throw new Error('Supabase not ready');
            // coach_profiles view exposes flat columns from cs_users + cs_coaches + profile_data
            const { data, error } = await supabase
                .from('coach_profiles')
                .select('*')
                .eq('id', coachId)
                .single();
            if (error) throw error;
            return data;
        },
        staleTime: STALE_TIMES.coachProfile,
        enabled: !!coachId && !!getSupabase(),
    });
}

/**
 * Fetch a coach profile by slug.
 * New schema: slug is now a column on cs_users (promoted to the view).
 */
export function useCoachBySlugQuery(slug) {
    return useQuery({
        queryKey: QUERY_KEYS.coachBySlug(slug),
        queryFn: async () => {
            const supabase = getSupabase();
            if (!supabase) throw new Error('Supabase not ready');
            const { data, error } = await supabase
                .from('coach_profiles')
                .select('*')
                .eq('slug', slug)
                .single();
            if (error) throw error;
            return data;
        },
        staleTime: STALE_TIMES.coachProfile,
        enabled: !!slug && !!getSupabase(),
    });
}

/**
 * Fetch the current user's own profile (coach or client).
 * New schema: all display data is in cs_users + profile_data JSONB.
 */
export function useMyCoachProfileQuery(userId) {
    return useQuery({
        queryKey: QUERY_KEYS.myCoachProfile(userId),
        queryFn: async () => {
            const supabase = getSupabase();
            if (!supabase) throw new Error('Supabase not ready');
            // Join cs_coaches for operational/subscription fields
            const { data, error } = await supabase
                .from('cs_users')
                .select('*, cs_coaches(subscription_status, trial_ends_at, onboarding_completed, stripe_charges_enabled, stripe_account_id)')
                .eq('id', userId)
                .single();
            if (error) throw error;
            return data;
        },
        staleTime: STALE_TIMES.myCoachProfile,
        enabled: !!userId && !!getSupabase(),
    });
}

/**
 * Fetch suggested coaches for the client feed sidebar.
 * New schema: use coach_profiles view for flat column access.
 */
export function useSuggestedCoachesQuery() {
    return useQuery({
        queryKey: QUERY_KEYS.suggestedCoaches,
        queryFn: async () => {
            const supabase = getSupabase();
            if (!supabase) throw new Error('Supabase not ready');
            const { data, error } = await supabase
                .from('coach_profiles')
                .select('id, full_name, slug, title, avatar_url, profile_views, is_featured')
                .eq('onboarding_completed', true)
                .order('profile_views', { ascending: false })
                .limit(5);
            if (error) throw error;
            return data || [];
        },
        staleTime: STALE_TIMES.suggestedCoaches,
        enabled: !!getSupabase(),
    });
}

// ─── COACH DETAIL SECTION HOOKS ─────────────────────────────────────

export function useCoachCertificationsQuery(coachId) {
    return useQuery({
        queryKey: QUERY_KEYS.coachCertifications(coachId),
        queryFn: async () => {
            const supabase = getSupabase();
            if (!supabase) throw new Error('Supabase not ready');
            const { data, error } = await supabase
                .from('v_coach_certifications')
                .select('*')
                .eq('coach_id', coachId)
                .order('is_verified', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        staleTime: STALE_TIMES.coachCertifications,
        enabled: !!coachId && !!getSupabase(),
    });
}

export function useCoachExperiencesQuery(coachId) {
    return useQuery({
        queryKey: QUERY_KEYS.coachExperiences(coachId),
        queryFn: async () => {
            const supabase = getSupabase();
            if (!supabase) throw new Error('Supabase not ready');
            const { data, error } = await supabase
                .from('cs_coach_experiences')
                .select('*')
                .eq('coach_id', coachId)
                .order('start_date', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        staleTime: STALE_TIMES.coachExperiences,
        enabled: !!coachId && !!getSupabase(),
    });
}

export function useCoachEducationsQuery(coachId) {
    return useQuery({
        queryKey: QUERY_KEYS.coachEducations(coachId),
        queryFn: async () => {
            const supabase = getSupabase();
            if (!supabase) throw new Error('Supabase not ready');
            const { data, error } = await supabase
                .from('cs_coach_educations')
                .select('*')
                .eq('coach_id', coachId)
                .order('start_date', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        staleTime: STALE_TIMES.coachEducations,
        enabled: !!coachId && !!getSupabase(),
    });
}

export function useCoachSkillsQuery(coachId) {
    return useQuery({
        queryKey: QUERY_KEYS.coachSkills(coachId),
        queryFn: async () => {
            const supabase = getSupabase();
            if (!supabase) throw new Error('Supabase not ready');
            const { data, error } = await supabase
                .from('cs_coach_skills')
                .select('*, cs_coach_skills_commendations(id, commendation_user_id)')
                .eq('coach_id', coachId)
                .order('created_at', { ascending: true });
            if (error) throw error;
            return data || [];
        },
        staleTime: STALE_TIMES.coachSkills,
        enabled: !!coachId && !!getSupabase(),
    });
}

export function useCoachVolunteeringQuery(coachId) {
    return useQuery({
        queryKey: QUERY_KEYS.coachVolunteering(coachId),
        queryFn: async () => {
            const supabase = getSupabase();
            if (!supabase) throw new Error('Supabase not ready');
            const { data, error } = await supabase
                .from('cs_coach_volunteering')
                .select('*')
                .eq('coach_id', coachId)
                .order('start_date', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        staleTime: STALE_TIMES.coachVolunteering,
        enabled: !!coachId && !!getSupabase(),
    });
}

export function useCoachPublicationsQuery(coachId) {
    return useQuery({
        queryKey: QUERY_KEYS.coachPublications(coachId),
        queryFn: async () => {
            const supabase = getSupabase();
            if (!supabase) throw new Error('Supabase not ready');
            const { data, error } = await supabase
                .from('cs_coach_publications')
                .select('*')
                .eq('coach_id', coachId)
                .order('publication_date', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        staleTime: STALE_TIMES.coachPublications,
        enabled: !!coachId && !!getSupabase(),
    });
}

export function useCoachServicesQuery(coachId) {
    return useQuery({
        queryKey: QUERY_KEYS.coachServices(coachId),
        queryFn: async () => {
            const supabase = getSupabase();
            if (!supabase) throw new Error('Supabase not ready');
            const { data, error } = await supabase
                .from('cs_coach_services')
                .select('*')
                .eq('coach_id', coachId);
            if (error) throw error;
            return data || [];
        },
        staleTime: STALE_TIMES.coachServices,
        enabled: !!coachId && !!getSupabase(),
    });
}

// ─── REVIEWS HOOK ───────────────────────────────────────────────────

export function useCoachReviewsQuery(coachId) {
    return useQuery({
        queryKey: QUERY_KEYS.coachReviews(coachId),
        queryFn: async () => {
            const supabase = getSupabase();
            if (!supabase) throw new Error('Supabase not ready');
            const { data, error } = await supabase
                .from('cs_reviews')
                .select('*')
                .eq('coach_id', coachId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        staleTime: STALE_TIMES.coachReviews,
        enabled: !!coachId && !!getSupabase(),
    });
}

// ─── ARTICLES HOOK ──────────────────────────────────────────────────

export function useCoachArticlesQuery(coachId) {
    return useQuery({
        queryKey: QUERY_KEYS.coachArticles(coachId),
        queryFn: async () => {
            const supabase = getSupabase();
            if (!supabase) throw new Error('Supabase not ready');
            const { data, error } = await supabase
                .from('cs_articles')
                .select('*')
                .eq('coach_id', coachId)
                .eq('status', 'published')
                .order('created_at', { ascending: false })
                .limit(10);
            if (error) throw error;
            return data || [];
        },
        staleTime: STALE_TIMES.coachArticles,
        enabled: !!coachId && !!getSupabase(),
    });
}

// ─── FEED HOOKS ─────────────────────────────────────────────────────

export function useFeedPostsQuery(offset = 0) {
    return useQuery({
        queryKey: QUERY_KEYS.feedPosts(offset),
        queryFn: async () => {
            const supabase = getSupabase();
            if (!supabase) throw new Error('Supabase not ready');
            const PAGE_SIZE = 10;
            const { data, error } = await supabase
                .from('cs_posts')
                .select('*')
                .order('created_at', { ascending: false })
                .range(offset, offset + PAGE_SIZE - 1);
            if (error) throw error;
            return data || [];
        },
        staleTime: STALE_TIMES.feedPosts,
        enabled: !!getSupabase(),
    });
}

export function useHighlightedPostsQuery(userId) {
    return useQuery({
        queryKey: QUERY_KEYS.highlightedPosts(userId),
        queryFn: async () => {
            const supabase = getSupabase();
            if (!supabase) throw new Error('Supabase not ready');
            // Get highlighted post IDs
            const { data: highlights, error: hError } = await supabase
                .from('cs_post_highlights')
                .select('post_id')
                .eq('user_id', userId);
            if (hError) throw hError;
            if (!highlights || highlights.length === 0) return [];

            const postIds = highlights.map(h => h.post_id);
            const { data: posts, error: pError } = await supabase
                .from('cs_posts')
                .select('*')
                .in('id', postIds);
            if (pError) throw pError;

            // Preserve highlight order
            const postMap = new Map((posts || []).map(p => [p.id, p]));
            return postIds.map(id => postMap.get(id)).filter(Boolean);
        },
        staleTime: STALE_TIMES.highlightedPosts,
        enabled: !!userId && !!getSupabase(),
    });
}

export function useActivityPostsQuery(userId, page = 0) {
    const PAGE_SIZE = 3;
    return useQuery({
        queryKey: QUERY_KEYS.activityPosts(userId, page),
        queryFn: async () => {
            const supabase = getSupabase();
            if (!supabase) throw new Error('Supabase not ready');
            const offset = page * PAGE_SIZE;
            const { data, error } = await supabase
                .from('cs_posts')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .range(offset, offset + PAGE_SIZE - 1);
            if (error) throw error;
            return data || [];
        },
        staleTime: STALE_TIMES.activityPosts,
        enabled: !!userId && !!getSupabase(),
    });
}

// ─── USER HOOKS ─────────────────────────────────────────────────────

export function useUserProfileQuery(userId) {
    return useQuery({
        queryKey: QUERY_KEYS.userProfile(userId),
        queryFn: async () => {
            const supabase = getSupabase();
            if (!supabase) throw new Error('Supabase not ready');
            const { data, error } = await supabase
                .from('cs_users')
                .select('*')
                .eq('id', userId)
                .single();
            if (error) throw error;
            return data;
        },
        staleTime: STALE_TIMES.userProfile,
        enabled: !!userId && !!getSupabase(),
    });
}

// ─── CLIENT PROFILE HOOKS ───────────────────────────────────────────

export function useClientProfileQuery(userId) {
    return useQuery({
        queryKey: QUERY_KEYS.clientByUserId(userId),
        queryFn: async () => {
            const supabase = getSupabase();
            if (!supabase) throw new Error('Supabase not ready');
            // New schema: display/preference data in cs_users.profile_data JSONB,
            // operational stats in cs_clients (total_bookings, etc.).
            const { data, error } = await supabase
                .from('cs_users')
                .select('*, cs_clients(total_bookings, total_completed_sessions, total_amount_spent, last_booking_at)')
                .eq('id', userId)
                .single();
            if (error) throw error;
            return data;
        },
        staleTime: STALE_TIMES.clientProfile,
        enabled: !!userId && !!getSupabase(),
    });
}

// ─── DASHBOARD HOOKS ────────────────────────────────────────────────

export function useCoachAnalyticsQuery(coachId) {
    return useQuery({
        queryKey: QUERY_KEYS.coachAnalytics(coachId),
        queryFn: async () => {
            const supabase = getSupabase();
            if (!supabase) throw new Error('Supabase not ready');

            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const [viewsRes, discoveryRes] = await Promise.all([
                supabase.from('cs_profile_views')
                    .select('id', { count: 'exact', head: true })
                    .eq('coach_id', coachId)
                    .gte('created_at', thirtyDaysAgo.toISOString()),
                supabase.from('cs_discovery_requests')
                    .select('id', { count: 'exact', head: true })
                    .eq('coach_id', coachId)
                    .gte('created_at', thirtyDaysAgo.toISOString()),
            ]);

            return {
                views: viewsRes.count || 0,
                searches: 0,
                discoveryRequests: discoveryRes.count || 0,
            };
        },
        staleTime: STALE_TIMES.coachAnalytics,
        enabled: !!coachId && !!getSupabase(),
    });
}

// ─── NOTIFICATION HOOKS ─────────────────────────────────────────────

/**
 * Get the "last seen" timestamp from localStorage.
 * Returns null if not set (means count everything).
 */
function getNotificationsSeenAt() {
    try {
        return window.localStorage.getItem('cs_notifications_seen_at') || null;
    } catch (e) {
        return null;
    }
}

/**
 * Count unread notifications (pending connections + likes + comments + reposts on my posts)
 * Only counts items newer than the last time the user visited /notifications.
 */
export function useNotificationCountQuery(userId) {
    return useQuery({
        queryKey: QUERY_KEYS.notificationCount(userId),
        queryFn: async () => {
            const supabase = getSupabase();
            if (!supabase) throw new Error('Supabase not ready');

            // Cutoff: only count activity from last 30 days
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 30);
            const cutoff = cutoffDate.toISOString();

            // "Last seen" timestamp - only count items newer than this
            const lastSeenAt = getNotificationsSeenAt();

            // First, get my post IDs for activity counting
            const { data: myPosts } = await supabase
                .from('cs_posts')
                .select('id')
                .eq('user_id', userId);
            const myPostIds = (myPosts || []).map(p => p.id);

            // Count all notification sources in parallel
            // For connections and chemistry calls, use lastSeenAt if available
            let connectionsQuery = supabase
                .from('cs_connections')
                .select('*', { count: 'exact', head: true })
                .eq('coach_id', userId)
                .eq('status', 'pending');
            if (lastSeenAt) connectionsQuery = connectionsQuery.gt('connected_at', lastSeenAt);

            let chemistryQuery = supabase
                .from('cs_chemistry_call_requests')
                .select('*', { count: 'exact', head: true })
                .eq('coach_id', userId)
                .eq('status', 'pending');
            if (lastSeenAt) chemistryQuery = chemistryQuery.gt('created_at', lastSeenAt);

            const queries = [connectionsQuery, chemistryQuery];

            // Use the more restrictive cutoff (lastSeenAt or 30-day cutoff)
            const activityCutoff = lastSeenAt && lastSeenAt > cutoff ? lastSeenAt : cutoff;

            if (myPostIds.length > 0) {
                queries.push(
                    // Likes on my posts
                    supabase
                        .from('cs_post_likes')
                        .select('*', { count: 'exact', head: true })
                        .in('post_id', myPostIds)
                        .neq('user_id', userId)
                        .gte('created_at', activityCutoff),
                    // Comments on my posts
                    supabase
                        .from('cs_post_comments')
                        .select('*', { count: 'exact', head: true })
                        .in('post_id', myPostIds)
                        .neq('user_id', userId)
                        .gte('created_at', activityCutoff),
                    // Reposts of my posts
                    supabase
                        .from('cs_post_reposts')
                        .select('*', { count: 'exact', head: true })
                        .in('post_id', myPostIds)
                        .neq('user_id', userId)
                        .gte('reposted_at', activityCutoff),
                );
            }

            const results = await Promise.all(queries);

            let total = 0;
            for (const res of results) {
                if (res.error) throw res.error;
                total += (res.count || 0);
            }
            const chemistryCallCount = results[1]?.count || 0;
            return { total, hasChemistryCall: chemistryCallCount > 0 };
        },
        staleTime: STALE_TIMES.notificationCount,
        enabled: !!userId && !!getSupabase(),
        refetchInterval: 30000,
    });
}

export function useOnboardingStatusQuery(userId) {
    return useQuery({
        queryKey: QUERY_KEYS.onboardingStatus(userId),
        queryFn: async () => {
            const supabase = getSupabase();
            if (!supabase) throw new Error('Supabase not ready');
            // New schema: onboarding_completed lives in cs_users (top-level column)
            const { data, error } = await supabase
                .from('cs_users')
                .select('onboarding_completed, user_type')
                .eq('id', userId)
                .single();
            if (error) throw error;
            return data;
        },
        staleTime: STALE_TIMES.onboardingStatus,
        enabled: !!userId && !!getSupabase(),
    });
}
