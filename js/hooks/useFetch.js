/**
 * useFetch Hook
 * Declarative data fetching with loading and error states
 */

const React = window.React;
const { useState, useEffect, useCallback, useRef } = React;

/**
 * Hook for fetching data
 * @param {string|function} url - URL to fetch or function returning URL
 * @param {Object} options - Fetch options
 * @returns {Object} - { data, loading, error, refetch }
 */
export function useFetch(url, options = {}) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const abortControllerRef = useRef(null);

    const {
        immediate = true,
        transform = (data) => data,
        onSuccess,
        onError,
        ...fetchOptions
    } = options;

    const fetchData = useCallback(async (fetchUrl = url) => {
        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();

        setLoading(true);
        setError(null);

        try {
            const resolvedUrl = typeof fetchUrl === 'function' ? fetchUrl() : fetchUrl;

            if (!resolvedUrl) {
                setData(null);
                setLoading(false);
                return;
            }

            const response = await fetch(resolvedUrl, {
                ...fetchOptions,
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const json = await response.json();
            const transformedData = transform(json);

            setData(transformedData);
            setLoading(false);

            if (onSuccess) onSuccess(transformedData);
        } catch (err) {
            if (err.name === 'AbortError') {
                return; // Ignore abort errors
            }

            console.error('Fetch error:', err);
            setError(err.message);
            setLoading(false);

            if (onError) onError(err);
        }
    }, [url, JSON.stringify(fetchOptions), transform, onSuccess, onError]);

    useEffect(() => {
        if (immediate && url) {
            fetchData();
        }

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [url, immediate]);

    return {
        data,
        loading,
        error,
        refetch: fetchData
    };
}

/**
 * Hook for lazy fetching (manual trigger)
 */
export function useLazyFetch(options = {}) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const execute = useCallback(async (url, fetchOptions = {}) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(url, {
                ...options,
                ...fetchOptions
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const json = await response.json();
            setData(json);
            setLoading(false);
            return json;
        } catch (err) {
            console.error('Fetch error:', err);
            setError(err.message);
            setLoading(false);
            throw err;
        }
    }, [options]);

    return {
        data,
        loading,
        error,
        execute,
        reset: () => { setData(null); setError(null); }
    };
}

export default useFetch;
