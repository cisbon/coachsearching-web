/**
 * useAsync Hook
 * @fileoverview Handle async operations with loading, error, and success states
 */

const React = window.React;
const { useState, useCallback, useRef, useEffect } = React;

/**
 * @typedef {'idle' | 'pending' | 'success' | 'error'} AsyncStatus
 */

/**
 * @typedef {Object} AsyncState
 * @property {AsyncStatus} status - Current status
 * @property {*} data - Resolved data
 * @property {Error|null} error - Error if failed
 * @property {boolean} isIdle - Status is idle
 * @property {boolean} isPending - Status is pending
 * @property {boolean} isSuccess - Status is success
 * @property {boolean} isError - Status is error
 */

/**
 * Hook for handling async operations
 * @template T
 * @param {(...args: any[]) => Promise<T>} asyncFunction - Async function to execute
 * @param {Object} [options] - Options
 * @param {boolean} [options.immediate=false] - Execute immediately
 * @param {*[]} [options.immediateArgs=[]] - Arguments for immediate execution
 * @param {(data: T) => void} [options.onSuccess] - Success callback
 * @param {(error: Error) => void} [options.onError] - Error callback
 * @returns {[AsyncState<T>, (...args: any[]) => Promise<T>, () => void]}
 */
export function useAsync(asyncFunction, options = {}) {
  const { immediate = false, immediateArgs = [], onSuccess, onError } = options;

  const [status, setStatus] = useState('idle');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);
  const lastCallIdRef = useRef(0);

  /**
   * Execute the async function
   * @param {...*} args - Arguments for the async function
   * @returns {Promise<T>}
   */
  const execute = useCallback(
    async (...args) => {
      const callId = ++lastCallIdRef.current;

      setStatus('pending');
      setError(null);

      try {
        const result = await asyncFunction(...args);

        // Only update if this is the latest call and component is mounted
        if (callId === lastCallIdRef.current && mountedRef.current) {
          setData(result);
          setStatus('success');
          onSuccess?.(result);
        }

        return result;
      } catch (err) {
        if (callId === lastCallIdRef.current && mountedRef.current) {
          setError(err);
          setStatus('error');
          onError?.(err);
        }
        throw err;
      }
    },
    [asyncFunction, onSuccess, onError]
  );

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    setStatus('idle');
    setData(null);
    setError(null);
  }, []);

  // Handle immediate execution
  useEffect(() => {
    if (immediate) {
      execute(...immediateArgs);
    }
  }, [immediate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const state = {
    status,
    data,
    error,
    isIdle: status === 'idle',
    isPending: status === 'pending',
    isSuccess: status === 'success',
    isError: status === 'error',
  };

  return [state, execute, reset];
}

/**
 * Hook for async operations that should run on mount or when dependencies change
 * @template T
 * @param {() => Promise<T>} asyncFunction - Async function to execute
 * @param {*[]} [deps=[]] - Dependencies array
 * @returns {AsyncState<T> & { refetch: () => Promise<T> }}
 */
export function useAsyncEffect(asyncFunction, deps = []) {
  const [state, execute] = useAsync(asyncFunction, { immediate: true });

  useEffect(() => {
    execute();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return { ...state, refetch: execute };
}

/**
 * Hook for mutations (POST, PUT, DELETE operations)
 * @template T, Args
 * @param {(...args: Args) => Promise<T>} mutationFn - Mutation function
 * @param {Object} [options] - Options
 * @returns {{ mutate: (...args: Args) => Promise<T>, ...AsyncState<T>, reset: () => void }}
 */
export function useMutation(mutationFn, options = {}) {
  const [state, execute, reset] = useAsync(mutationFn, options);

  return {
    ...state,
    mutate: execute,
    mutateAsync: execute,
    reset,
  };
}

export default useAsync;
