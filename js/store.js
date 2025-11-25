// js/store.js
const { useState, useEffect } = window.React;

// Simple global state using a custom hook + event listener pattern
// In a larger app, we'd use Context or Redux, but this is sufficient for "no build tools" simplicity.

const store = {
    user: null,
    coaches: [],
    loading: false,
    error: null
};

const listeners = new Set();

function emit() {
    listeners.forEach(l => l({ ...store }));
}

export const useStore = () => {
    const [state, setState] = useState(store);

    useEffect(() => {
        listeners.add(setState);
        return () => listeners.delete(setState);
    }, []);

    return state;
};

export const actions = {
    setUser: (user) => {
        store.user = user;
        emit();
    },
    setCoaches: (coaches) => {
        store.coaches = coaches;
        emit();
    },
    setLoading: (loading) => {
        store.loading = loading;
        emit();
    },
    setError: (error) => {
        store.error = error;
        emit();
    },

    // Async Actions
    fetchCoaches: async (filters = {}) => {
        actions.setLoading(true);
        try {
            const query = new URLSearchParams(filters).toString();
            const res = await fetch(`https://clouedo.com/coachsearching/api/coaches?${query}`);
            const data = await res.json();
            if (data.data) {
                actions.setCoaches(data.data);
            } else {
                actions.setCoaches([]); // Handle empty or error
            }
        } catch (e) {
            actions.setError(e.message);
        } finally {
            actions.setLoading(false);
        }
    }
};
