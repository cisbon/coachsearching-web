/**
 * Client Profile Utilities
 * Helper to ensure a cs_clients record exists for the current user.
 * User-level fields (full_name, email, avatar_url, banner_url, slug) live in cs_users.
 * Auto-creates with a unique slug in cs_users if missing.
 */

/**
 * Generate a random slug with a random suffix for uniqueness.
 * e.g. "john-doe-x7k3m"
 */
function generateSlug(fullName) {
    const base = (fullName || 'user')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 40);
    const rand = Math.random().toString(36).substring(2, 7);
    return `${base}-${rand}`;
}

/**
 * Ensures a cs_clients record exists for the given user session.
 * Also ensures cs_users has a slug (used for the client public URL /u/:slug).
 * Returns the client record enriched with cs_users fields.
 */
export async function ensureClientProfile(session) {
    const supabase = window.supabaseClient;
    if (!supabase || !session?.user?.id) return null;

    const userId = session.user.id;

    // Fetch cs_users record for user-level fields
    const { data: userRecord } = await supabase
        .from('cs_users')
        .select('id, full_name, email, avatar_url, banner_url, slug')
        .eq('id', userId)
        .single();

    // If cs_users has no slug yet, generate one and save it
    if (userRecord && !userRecord.slug) {
        const slug = generateSlug(userRecord.full_name || session.user.user_metadata?.full_name);
        await supabase
            .from('cs_users')
            .update({ slug })
            .eq('id', userId);
        userRecord.slug = slug;
    }

    // Try to fetch existing client record
    const { data: existing } = await supabase
        .from('cs_clients')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (existing) {
        // Return client enriched with cs_users fields (cs_users is authoritative for these)
        return {
            ...existing,
            full_name: userRecord?.full_name || existing.full_name,
            email: userRecord?.email || existing.email,
            avatar_url: userRecord?.avatar_url || existing.avatar_url,
            banner_url: userRecord?.banner_url || existing.banner_url,
            slug: userRecord?.slug || existing.slug,
        };
    }

    // No client record found — create one (user-level fields live in cs_users, not duplicated here)
    const { data: created, error: createError } = await supabase
        .from('cs_clients')
        .insert({ user_id: userId })
        .select()
        .single();

    if (createError) {
        console.error('[ensureClientProfile] Failed to create client profile:', createError);
        return null;
    }

    // Also ensure cs_users has a slug
    if (!userRecord?.slug) {
        const fullName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User';
        const slug = generateSlug(fullName);
        await supabase.from('cs_users').update({ slug }).eq('id', userId);
        if (userRecord) userRecord.slug = slug;
    }

    // Return client enriched with cs_users fields
    return {
        ...created,
        full_name: userRecord?.full_name || session.user.user_metadata?.full_name || '',
        email: userRecord?.email || session.user.email || '',
        avatar_url: userRecord?.avatar_url || null,
        banner_url: userRecord?.banner_url || null,
        slug: userRecord?.slug || null,
    };
}
