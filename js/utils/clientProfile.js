/**
 * Client Profile Utilities
 * Helper to ensure a cs_clients record exists for the current user.
 * Auto-creates with a unique slug if missing.
 */

/**
 * Generate a slug from a name + random suffix.
 * e.g. "John Doe" → "john-doe-x7k3m"
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
 * If not, creates one with a generated slug.
 * Returns the client record.
 */
export async function ensureClientProfile(session) {
    const supabase = window.supabaseClient;
    if (!supabase || !session?.user?.id) return null;

    const userId = session.user.id;

    // Try to fetch existing client record
    const { data: existing, error: fetchError } = await supabase
        .from('cs_clients')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (existing) {
        // If no slug yet, generate one
        if (!existing.slug) {
            const slug = generateSlug(existing.full_name || session.user.user_metadata?.full_name);
            const { data: updated } = await supabase
                .from('cs_clients')
                .update({ slug })
                .eq('id', existing.id)
                .select()
                .single();
            return updated || { ...existing, slug };
        }
        return existing;
    }

    // No record found — create one
    const fullName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User';
    const slug = generateSlug(fullName);

    const { data: created, error: createError } = await supabase
        .from('cs_clients')
        .insert({
            user_id: userId,
            full_name: fullName,
            email: session.user.email,
            avatar_url: session.user.user_metadata?.avatar_url || null,
            slug,
        })
        .select()
        .single();

    if (createError) {
        console.error('[ensureClientProfile] Failed to create client profile:', createError);
        return null;
    }

    return created;
}
