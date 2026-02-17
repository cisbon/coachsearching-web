/**
 * Query Configuration - Centralized TanStack Query Keys & Stale Times
 * ====================================================================
 * ALL query keys and stale times are defined here in ONE place.
 * To adjust caching behavior, just change the STALE_TIMES values below.
 *
 * STALE_TIMES are in milliseconds:
 *   1_000       = 1 second
 *   60_000      = 1 minute
 *   300_000     = 5 minutes
 *   3_600_000   = 1 hour
 *   86_400_000  = 24 hours
 */

// ─── STALE TIMES ────────────────────────────────────────────────────
// Change these values to control how long data stays fresh before refetching.
export const STALE_TIMES = {
    // Lookup tables (rarely change)
    lookupOptions:      24 * 60 * 60 * 1000,   // 24 hours
    cities:             24 * 60 * 60 * 1000,   // 24 hours
    certifications:     24 * 60 * 60 * 1000,   // 24 hours

    // Coach profiles
    coachProfile:       10 * 60 * 1000,        // 10 minutes
    coachList:          5 * 60 * 1000,          // 5 minutes
    suggestedCoaches:   10 * 60 * 1000,        // 10 minutes

    // Coach detail sections (loaded per profile page)
    coachCertifications: 30 * 60 * 1000,       // 30 minutes
    coachExperiences:   30 * 60 * 1000,        // 30 minutes
    coachEducations:    30 * 60 * 1000,        // 30 minutes
    coachSkills:        30 * 60 * 1000,        // 30 minutes
    coachVolunteering:  30 * 60 * 1000,        // 30 minutes
    coachPublications:  30 * 60 * 1000,        // 30 minutes
    coachServices:      30 * 60 * 1000,        // 30 minutes

    // Reviews
    coachReviews:       10 * 60 * 1000,        // 10 minutes

    // Articles & Blog
    coachArticles:      10 * 60 * 1000,        // 10 minutes
    blogPosts:          5 * 60 * 1000,          // 5 minutes
    blogPost:           10 * 60 * 1000,        // 10 minutes

    // Comments
    postComments:       2 * 60 * 1000,          // 2 minutes

    // Feed & Posts
    feedPosts:          2 * 60 * 1000,          // 2 minutes
    userPostLikes:      5 * 60 * 1000,          // 5 minutes
    userPostHighlights: 5 * 60 * 1000,          // 5 minutes
    userPostReposts:    5 * 60 * 1000,          // 5 minutes
    highlightedPosts:   5 * 60 * 1000,          // 5 minutes
    activityPosts:      2 * 60 * 1000,          // 2 minutes

    // User profiles
    userProfile:        5 * 60 * 1000,          // 5 minutes
    myCoachProfile:     5 * 60 * 1000,          // 5 minutes
    clientProfile:      5 * 60 * 1000,          // 5 minutes
    clientPosts:        2 * 60 * 1000,          // 2 minutes

    // Dashboard data
    coachAnalytics:     5 * 60 * 1000,          // 5 minutes
    dashboardBookings:  2 * 60 * 1000,          // 2 minutes
    dashboardOverview:  5 * 60 * 1000,          // 5 minutes
    unreadMessages:     1 * 60 * 1000,          // 1 minute

    // Onboarding check
    onboardingStatus:   10 * 60 * 1000,        // 10 minutes

    // Notifications
    notifications:      30 * 1000,              // 30 seconds
    notificationCount:  30 * 1000,              // 30 seconds
};

// ─── QUERY KEYS ─────────────────────────────────────────────────────
// Structured query keys for cache management and invalidation.
// Keys are arrays — TanStack Query matches by prefix for invalidation.
export const QUERY_KEYS = {
    // Lookups
    lookupOptions:      ['lookups', 'options'],
    cities:             ['lookups', 'cities'],
    certifications:     ['lookups', 'certifications'],

    // Coach profiles
    coachById:          (id) => ['coach', 'profile', id],
    coachBySlug:        (slug) => ['coach', 'profile', 'slug', slug],
    coachList:          (filters) => ['coaches', 'list', filters || {}],
    suggestedCoaches:   ['coaches', 'suggested'],

    // Coach detail sections
    coachCertifications:(coachId) => ['coach', coachId, 'certifications'],
    coachExperiences:   (coachId) => ['coach', coachId, 'experiences'],
    coachEducations:    (coachId) => ['coach', coachId, 'educations'],
    coachSkills:        (coachId) => ['coach', coachId, 'skills'],
    coachVolunteering:  (coachId) => ['coach', coachId, 'volunteering'],
    coachPublications:  (coachId) => ['coach', coachId, 'publications'],
    coachServices:      (coachId) => ['coach', coachId, 'services'],

    // Reviews
    coachReviews:       (coachId) => ['coach', coachId, 'reviews'],

    // Articles & Blog
    coachArticles:      (coachId) => ['coach', coachId, 'articles'],
    blogPosts:          (lang) => ['blog', 'posts', lang || 'all'],
    blogPost:           (lang, slug) => ['blog', 'post', lang, slug],

    // Comments
    postComments:       (postId) => ['post', postId, 'comments'],

    // Feed & Posts
    feedPosts:          (offset) => ['feed', 'posts', offset || 0],
    userPostLikes:      (userId, postIds) => ['feed', 'likes', userId, postIds],
    userPostHighlights: (userId, postIds) => ['feed', 'highlights', userId, postIds],
    userPostReposts:    (userId, postIds) => ['feed', 'reposts', userId, postIds],
    highlightedPosts:   (userId) => ['posts', 'highlighted', userId],
    activityPosts:      (userId, page) => ['posts', 'activity', userId, page || 0],

    // User profiles
    userProfile:        (userId) => ['user', 'profile', userId],
    myCoachProfile:     (userId) => ['user', 'coachProfile', userId],
    clientBySlug:       (slug) => ['client', 'profile', 'slug', slug],
    clientByUserId:     (userId) => ['client', 'profile', userId],
    clientPosts:        (userId, page) => ['client', 'posts', userId, page || 0],

    // Dashboard
    coachAnalytics:     (coachId) => ['dashboard', 'analytics', coachId],
    dashboardBookings:  (userId) => ['dashboard', 'bookings', userId],
    dashboardOverview:  (userId) => ['dashboard', 'overview', userId],
    unreadMessages:     (userId) => ['dashboard', 'unread', userId],

    // Onboarding
    onboardingStatus:   (userId) => ['onboarding', 'status', userId],

    // Notifications
    notifications:      (userId) => ['notifications', 'list', userId],
    notificationCount:  (userId) => ['notifications', 'count', userId],
};

// ─── DEFAULT QUERY OPTIONS ──────────────────────────────────────────
// Global defaults for all queries.
export const DEFAULT_QUERY_OPTIONS = {
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 1,
    retryDelay: 1000,
};

export default { STALE_TIMES, QUERY_KEYS, DEFAULT_QUERY_OPTIONS };
