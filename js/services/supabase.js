/**
 * Supabase Service
 * Manages Supabase client initialization and authentication
 */

import { CONFIG } from '../config.js';

let supabaseClient = null;
let configLoaded = false;
let loadingPromise = null;

/**
 * Initialize Supabase client from remote config
 */
export async function initSupabase() {
    if (supabaseClient) return supabaseClient;
    if (loadingPromise) return loadingPromise;

    loadingPromise = fetch(CONFIG.ENV_URL)
        .then(res => res.json())
        .then(config => {
            if (config.SUPABASE_URL && config.SUPABASE_ANON_KEY) {
                const { createClient } = window.supabase;
                supabaseClient = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
                window.supabaseClient = supabaseClient;
                configLoaded = true;
                console.log('Supabase client initialized');
                return supabaseClient;
            } else {
                throw new Error('Missing Supabase config');
            }
        });

    return loadingPromise;
}

/**
 * Get the Supabase client instance
 */
export function getSupabase() {
    return supabaseClient;
}

/**
 * Check if config is loaded
 */
export function isConfigLoaded() {
    return configLoaded;
}

/**
 * Auth helpers
 */
export const auth = {
    async getSession() {
        const client = await initSupabase();
        const { data: { session }, error } = await client.auth.getSession();
        if (error) throw error;
        return session;
    },

    async signInWithEmail(email, password) {
        const client = await initSupabase();
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    },

    async signUpWithEmail(email, password, metadata = {}) {
        const client = await initSupabase();
        const { data, error } = await client.auth.signUp({
            email,
            password,
            options: { data: metadata }
        });
        if (error) throw error;
        return data;
    },

    async signInWithGoogle() {
        const client = await initSupabase();
        const { data, error } = await client.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin }
        });
        if (error) throw error;
        return data;
    },

    async signOut() {
        const client = await initSupabase();
        const { error } = await client.auth.signOut();
        if (error) throw error;
    },

    async resetPassword(email) {
        const client = await initSupabase();
        const { error } = await client.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/#reset-password`
        });
        if (error) throw error;
    },

    async updateUser(updates) {
        const client = await initSupabase();
        const { data, error } = await client.auth.updateUser(updates);
        if (error) throw error;
        return data;
    },

    onAuthStateChange(callback) {
        if (!supabaseClient) {
            console.warn('Supabase not initialized, deferring auth listener');
            initSupabase().then(client => {
                client.auth.onAuthStateChange(callback);
            });
            return { data: { subscription: { unsubscribe: () => {} } } };
        }
        return supabaseClient.auth.onAuthStateChange(callback);
    }
};

/**
 * Database helpers
 */
export const db = {
    from(table) {
        if (!supabaseClient) {
            throw new Error('Supabase not initialized');
        }
        return supabaseClient.from(table);
    },

    async query(table, options = {}) {
        const client = await initSupabase();
        let query = client.from(table).select(options.select || '*');

        if (options.eq) {
            Object.entries(options.eq).forEach(([key, value]) => {
                query = query.eq(key, value);
            });
        }

        if (options.order) {
            query = query.order(options.order.column, {
                ascending: options.order.ascending ?? true
            });
        }

        if (options.limit) {
            query = query.limit(options.limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async insert(table, data) {
        const client = await initSupabase();
        const { data: result, error } = await client.from(table).insert(data).select();
        if (error) throw error;
        return result;
    },

    async update(table, id, data) {
        const client = await initSupabase();
        const { data: result, error } = await client.from(table).update(data).eq('id', id).select();
        if (error) throw error;
        return result;
    },

    async delete(table, id) {
        const client = await initSupabase();
        const { error } = await client.from(table).delete().eq('id', id);
        if (error) throw error;
    }
};

/**
 * Storage helpers
 */
export const storage = {
    async upload(bucket, path, file) {
        const client = await initSupabase();
        const { data, error } = await client.storage.from(bucket).upload(path, file);
        if (error) throw error;
        return data;
    },

    getPublicUrl(bucket, path) {
        if (!supabaseClient) return null;
        const { data } = supabaseClient.storage.from(bucket).getPublicUrl(path);
        return data.publicUrl;
    },

    async delete(bucket, paths) {
        const client = await initSupabase();
        const { error } = await client.storage.from(bucket).remove(paths);
        if (error) throw error;
    }
};

export default { initSupabase, getSupabase, isConfigLoaded, auth, db, storage };
