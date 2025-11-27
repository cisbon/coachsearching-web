/**
 * Auth Context
 * Manages authentication state across the application
 */

import htm from '../vendor/htm.js';
import { initSupabase, auth as authService } from '../services/supabase.js';

const React = window.React;
const { createContext, useContext, useState, useEffect, useCallback } = React;
const html = htm.bind(React.createElement);

// Create context
const AuthContext = createContext(null);

/**
 * Auth Provider Component
 */
export function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Initialize auth
    useEffect(() => {
        let mounted = true;

        async function initAuth() {
            try {
                const client = await initSupabase();

                // Get initial session
                const { data: { session: initialSession } } = await client.auth.getSession();
                if (mounted) {
                    setSession(initialSession);
                    setUser(initialSession?.user || null);
                    setLoading(false);
                }

                // Listen for auth changes
                const { data: { subscription } } = client.auth.onAuthStateChange(
                    (event, newSession) => {
                        console.log('Auth state changed:', event);
                        if (mounted) {
                            setSession(newSession);
                            setUser(newSession?.user || null);
                        }
                    }
                );

                return () => {
                    subscription?.unsubscribe();
                };
            } catch (err) {
                console.error('Auth init error:', err);
                if (mounted) {
                    setError(err.message);
                    setLoading(false);
                }
            }
        }

        initAuth();

        return () => {
            mounted = false;
        };
    }, []);

    // Auth methods
    const signIn = useCallback(async (email, password) => {
        setError(null);
        try {
            const result = await authService.signInWithEmail(email, password);
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const signUp = useCallback(async (email, password, metadata = {}) => {
        setError(null);
        try {
            const result = await authService.signUpWithEmail(email, password, metadata);
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const signInWithGoogle = useCallback(async () => {
        setError(null);
        try {
            const result = await authService.signInWithGoogle();
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const signOut = useCallback(async () => {
        setError(null);
        try {
            await authService.signOut();
            setSession(null);
            setUser(null);
            window.location.hash = '#home';
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const resetPassword = useCallback(async (email) => {
        setError(null);
        try {
            await authService.resetPassword(email);
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const updateProfile = useCallback(async (updates) => {
        setError(null);
        try {
            const result = await authService.updateUser(updates);
            setUser(result.user);
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const value = {
        // State
        session,
        user,
        loading,
        error,
        isAuthenticated: !!session,

        // Methods
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        resetPassword,
        updateProfile,
        clearError: () => setError(null)
    };

    return html`
        <${AuthContext.Provider} value=${value}>
            ${children}
        </${AuthContext.Provider}>
    `;
}

/**
 * Hook to use auth context
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
