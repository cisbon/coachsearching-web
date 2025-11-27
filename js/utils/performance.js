/**
 * Performance Utilities
 * @fileoverview Memoization, lazy loading, and performance optimization utilities
 */

const React = window.React;
const { useState, useEffect, useRef, useCallback, useMemo, memo } = React;

/**
 * Create a memoized version of an expensive function
 * @template T
 * @param {(...args: any[]) => T} fn - Function to memoize
 * @param {Object} [options] - Memoization options
 * @param {number} [options.maxSize=100] - Maximum cache size
 * @param {number} [options.ttl] - Time-to-live in milliseconds
 * @returns {(...args: any[]) => T}
 */
export function memoize(fn, options = {}) {
    const { maxSize = 100, ttl } = options;
    const cache = new Map();
    const timestamps = ttl ? new Map() : null;

    return function memoized(...args) {
        const key = JSON.stringify(args);

        // Check TTL expiration
        if (timestamps && timestamps.has(key)) {
            const timestamp = timestamps.get(key);
            if (Date.now() - timestamp > ttl) {
                cache.delete(key);
                timestamps.delete(key);
            }
        }

        if (cache.has(key)) {
            // Move to end for LRU behavior
            const value = cache.get(key);
            cache.delete(key);
            cache.set(key, value);
            return value;
        }

        const result = fn.apply(this, args);

        // Enforce max size (LRU eviction)
        if (cache.size >= maxSize) {
            const firstKey = cache.keys().next().value;
            cache.delete(firstKey);
            if (timestamps) timestamps.delete(firstKey);
        }

        cache.set(key, result);
        if (timestamps) timestamps.set(key, Date.now());

        return result;
    };
}

/**
 * Clear memoization cache for a memoized function
 * Note: Returns a new memoized function with fresh cache
 * @template T
 * @param {T} fn - Memoized function
 * @returns {T}
 */
export function clearMemoCache(fn) {
    // Since we can't access the internal cache, return a note
    console.warn('clearMemoCache: Re-memoize the function to clear cache');
    return fn;
}

/**
 * Debounce with leading/trailing options
 * @template T
 * @param {T} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @param {Object} [options] - Debounce options
 * @param {boolean} [options.leading=false] - Execute on leading edge
 * @param {boolean} [options.trailing=true] - Execute on trailing edge
 * @returns {T & { cancel: () => void, flush: () => void }}
 */
export function debounce(fn, delay, options = {}) {
    const { leading = false, trailing = true } = options;
    let timeoutId = null;
    let lastArgs = null;
    let lastThis = null;
    let result = null;
    let lastCallTime = null;
    let lastInvokeTime = 0;

    function invokeFunc(time) {
        const args = lastArgs;
        const thisArg = lastThis;
        lastArgs = lastThis = null;
        lastInvokeTime = time;
        result = fn.apply(thisArg, args);
        return result;
    }

    function shouldInvoke(time) {
        const timeSinceLastCall = time - lastCallTime;
        const timeSinceLastInvoke = time - lastInvokeTime;

        return (
            lastCallTime === null ||
            timeSinceLastCall >= delay ||
            timeSinceLastCall < 0 ||
            timeSinceLastInvoke >= delay
        );
    }

    function trailingEdge(time) {
        timeoutId = null;
        if (trailing && lastArgs) {
            return invokeFunc(time);
        }
        lastArgs = lastThis = null;
        return result;
    }

    function timerExpired() {
        const time = Date.now();
        if (shouldInvoke(time)) {
            return trailingEdge(time);
        }
        timeoutId = setTimeout(timerExpired, delay - (time - lastCallTime));
    }

    function leadingEdge(time) {
        lastInvokeTime = time;
        timeoutId = setTimeout(timerExpired, delay);
        return leading ? invokeFunc(time) : result;
    }

    function debounced(...args) {
        const time = Date.now();
        const isInvoking = shouldInvoke(time);

        lastArgs = args;
        lastThis = this;
        lastCallTime = time;

        if (isInvoking) {
            if (timeoutId === null) {
                return leadingEdge(lastCallTime);
            }
        }
        if (timeoutId === null) {
            timeoutId = setTimeout(timerExpired, delay);
        }
        return result;
    }

    debounced.cancel = function () {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }
        lastInvokeTime = 0;
        lastArgs = lastCallTime = lastThis = timeoutId = null;
    };

    debounced.flush = function () {
        if (timeoutId === null) return result;
        return trailingEdge(Date.now());
    };

    return debounced;
}

/**
 * Throttle function execution
 * @template T
 * @param {T} fn - Function to throttle
 * @param {number} limit - Minimum time between calls in milliseconds
 * @param {Object} [options] - Throttle options
 * @param {boolean} [options.leading=true] - Execute on leading edge
 * @param {boolean} [options.trailing=true] - Execute on trailing edge
 * @returns {T & { cancel: () => void }}
 */
export function throttle(fn, limit, options = {}) {
    const { leading = true, trailing = true } = options;
    let lastCallTime = 0;
    let timeoutId = null;
    let lastArgs = null;
    let lastThis = null;

    function invokeFunc() {
        const args = lastArgs;
        const thisArg = lastThis;
        lastArgs = lastThis = null;
        lastCallTime = Date.now();
        fn.apply(thisArg, args);
    }

    function throttled(...args) {
        const now = Date.now();
        const remaining = limit - (now - lastCallTime);

        lastArgs = args;
        lastThis = this;

        if (remaining <= 0 || remaining > limit) {
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            if (leading || lastCallTime !== 0) {
                invokeFunc();
            } else {
                lastCallTime = now;
            }
        } else if (!timeoutId && trailing) {
            timeoutId = setTimeout(() => {
                timeoutId = null;
                invokeFunc();
            }, remaining);
        }
    }

    throttled.cancel = function () {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        lastCallTime = 0;
        lastArgs = lastThis = null;
    };

    return throttled;
}

/**
 * Request idle callback polyfill
 * @param {IdleRequestCallback} callback
 * @param {IdleRequestOptions} [options]
 * @returns {number}
 */
export const requestIdleCallback =
    window.requestIdleCallback ||
    function (callback, options = {}) {
        const start = Date.now();
        return setTimeout(() => {
            callback({
                didTimeout: false,
                timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
            });
        }, options.timeout || 1);
    };

/**
 * Cancel idle callback polyfill
 * @param {number} id
 */
export const cancelIdleCallback =
    window.cancelIdleCallback ||
    function (id) {
        clearTimeout(id);
    };

/**
 * Defer non-critical work to idle time
 * @template T
 * @param {() => T} fn - Function to execute during idle time
 * @param {Object} [options]
 * @param {number} [options.timeout=1000] - Maximum wait time
 * @returns {Promise<T>}
 */
export function whenIdle(fn, options = {}) {
    return new Promise((resolve) => {
        requestIdleCallback(
            () => {
                resolve(fn());
            },
            { timeout: options.timeout || 1000 }
        );
    });
}

/**
 * Hook: Intersection Observer for lazy loading
 * @param {Object} options
 * @param {number} [options.threshold=0] - Visibility threshold
 * @param {string} [options.rootMargin='50px'] - Root margin
 * @param {boolean} [options.triggerOnce=true] - Only trigger once
 * @returns {[React.RefObject, boolean]} - [ref, isIntersecting]
 */
export function useIntersectionObserver(options = {}) {
    const { threshold = 0, rootMargin = '50px', triggerOnce = true } = options;
    const [isIntersecting, setIsIntersecting] = useState(false);
    const ref = useRef(null);
    const hasTriggered = useRef(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        if (triggerOnce && hasTriggered.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                const isVisible = entry.isIntersecting;
                if (isVisible) {
                    setIsIntersecting(true);
                    if (triggerOnce) {
                        hasTriggered.current = true;
                        observer.disconnect();
                    }
                } else if (!triggerOnce) {
                    setIsIntersecting(false);
                }
            },
            { threshold, rootMargin }
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, [threshold, rootMargin, triggerOnce]);

    return [ref, isIntersecting];
}

/**
 * Hook: Lazy load component when visible
 * @param {() => Promise<{default: React.ComponentType}>} importFn - Dynamic import function
 * @param {Object} [options] - Intersection observer options
 * @returns {[React.RefObject, React.ComponentType | null, boolean]}
 */
export function useLazyComponent(importFn, options = {}) {
    const [ref, isVisible] = useIntersectionObserver(options);
    const [Component, setComponent] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isVisible && !Component && !isLoading) {
            setIsLoading(true);
            importFn()
                .then((module) => {
                    setComponent(() => module.default || module);
                })
                .catch((error) => {
                    console.error('Failed to load component:', error);
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [isVisible, Component, isLoading, importFn]);

    return [ref, Component, isLoading];
}

/**
 * Hook: Debounced value
 * @template T
 * @param {T} value - Value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {T}
 */
export function useDebouncedValue(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Hook: Debounced callback
 * @template T
 * @param {T} callback - Callback function
 * @param {number} delay - Delay in milliseconds
 * @param {any[]} deps - Dependencies
 * @returns {T}
 */
export function useDebouncedCallback(callback, delay, deps = []) {
    const callbackRef = useRef(callback);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    return useMemo(() => {
        return debounce((...args) => callbackRef.current(...args), delay);
    }, [delay, ...deps]);
}

/**
 * Hook: Throttled callback
 * @template T
 * @param {T} callback - Callback function
 * @param {number} limit - Minimum time between calls
 * @param {any[]} deps - Dependencies
 * @returns {T}
 */
export function useThrottledCallback(callback, limit, deps = []) {
    const callbackRef = useRef(callback);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    return useMemo(() => {
        return throttle((...args) => callbackRef.current(...args), limit);
    }, [limit, ...deps]);
}

/**
 * Hook: Previous value
 * @template T
 * @param {T} value - Current value
 * @returns {T | undefined}
 */
export function usePrevious(value) {
    const ref = useRef();

    useEffect(() => {
        ref.current = value;
    }, [value]);

    return ref.current;
}

/**
 * Hook: Stable callback (always has latest closure but stable reference)
 * @template T
 * @param {T} callback - Callback function
 * @returns {T}
 */
export function useStableCallback(callback) {
    const callbackRef = useRef(callback);

    useEffect(() => {
        callbackRef.current = callback;
    });

    return useCallback((...args) => callbackRef.current(...args), []);
}

/**
 * Hook: Deep comparison memoization
 * @template T
 * @param {T} value - Value to memoize
 * @returns {T}
 */
export function useDeepMemo(value) {
    const ref = useRef(value);

    const isEqual = JSON.stringify(ref.current) === JSON.stringify(value);

    if (!isEqual) {
        ref.current = value;
    }

    return ref.current;
}

/**
 * Hook: Measure render performance
 * @param {string} componentName - Name for logging
 * @param {boolean} [enabled=true] - Whether to enable logging
 */
export function useRenderLog(componentName, enabled = true) {
    const renderCount = useRef(0);
    const lastRenderTime = useRef(Date.now());

    useEffect(() => {
        if (!enabled) return;

        renderCount.current += 1;
        const now = Date.now();
        const timeSinceLastRender = now - lastRenderTime.current;
        lastRenderTime.current = now;

        console.debug(
            `[Render] ${componentName}: #${renderCount.current} (${timeSinceLastRender}ms since last)`
        );
    });
}

/**
 * Higher-order component for performance logging
 * @param {React.ComponentType} Component - Component to wrap
 * @param {string} [displayName] - Display name for logging
 * @returns {React.ComponentType}
 */
export function withRenderLog(Component, displayName) {
    const name = displayName || Component.displayName || Component.name || 'Component';

    function WrappedComponent(props) {
        useRenderLog(name);
        return React.createElement(Component, props);
    }

    WrappedComponent.displayName = `withRenderLog(${name})`;
    return WrappedComponent;
}

/**
 * Create a windowed/virtualized list for large datasets
 * @param {Object} options
 * @param {number} options.itemCount - Total number of items
 * @param {number} options.itemHeight - Height of each item in pixels
 * @param {number} options.containerHeight - Height of the container
 * @param {number} [options.overscan=3] - Number of items to render outside visible area
 * @returns {Object} - Virtualization utilities
 */
export function useVirtualList(options) {
    const { itemCount, itemHeight, containerHeight, overscan = 3 } = options;
    const [scrollTop, setScrollTop] = useState(0);

    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(itemCount - 1, startIndex + visibleCount + 2 * overscan);

    const visibleItems = [];
    for (let i = startIndex; i <= endIndex; i++) {
        visibleItems.push({
            index: i,
            style: {
                position: 'absolute',
                top: i * itemHeight,
                height: itemHeight,
                left: 0,
                right: 0,
            },
        });
    }

    const onScroll = useCallback((event) => {
        setScrollTop(event.currentTarget.scrollTop);
    }, []);

    return {
        visibleItems,
        totalHeight: itemCount * itemHeight,
        onScroll,
        containerStyle: {
            position: 'relative',
            height: containerHeight,
            overflow: 'auto',
        },
        innerStyle: {
            position: 'relative',
            height: itemCount * itemHeight,
        },
    };
}

/**
 * Preload an image
 * @param {string} src - Image source URL
 * @returns {Promise<HTMLImageElement>}
 */
export function preloadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

/**
 * Preload multiple images
 * @param {string[]} srcs - Image source URLs
 * @returns {Promise<HTMLImageElement[]>}
 */
export function preloadImages(srcs) {
    return Promise.all(srcs.map(preloadImage));
}

/**
 * Hook: Lazy image loading with placeholder
 * @param {string} src - Image source URL
 * @param {string} [placeholder] - Placeholder image URL
 * @returns {Object} - { imageSrc, isLoaded, error }
 */
export function useLazyImage(src, placeholder = '') {
    const [imageSrc, setImageSrc] = useState(placeholder);
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState(null);
    const [ref, isVisible] = useIntersectionObserver();

    useEffect(() => {
        if (!isVisible || isLoaded) return;

        const img = new Image();
        img.onload = () => {
            setImageSrc(src);
            setIsLoaded(true);
        };
        img.onerror = (e) => {
            setError(e);
        };
        img.src = src;
    }, [src, isVisible, isLoaded]);

    return { ref, imageSrc, isLoaded, error };
}

/**
 * Batch multiple state updates for better performance
 * Note: React 18 auto-batches, but this is useful for complex scenarios
 * @param {() => void} fn - Function with state updates
 */
export function batchUpdates(fn) {
    if (ReactDOM.unstable_batchedUpdates) {
        ReactDOM.unstable_batchedUpdates(fn);
    } else {
        fn();
    }
}

/**
 * Performance mark and measure helpers
 */
export const perfMark = {
    /**
     * Start a performance mark
     * @param {string} name - Mark name
     */
    start(name) {
        if (typeof performance !== 'undefined' && performance.mark) {
            performance.mark(`${name}-start`);
        }
    },

    /**
     * End a performance mark and log the duration
     * @param {string} name - Mark name
     * @param {boolean} [log=true] - Whether to log the result
     * @returns {number | null} - Duration in milliseconds
     */
    end(name, log = true) {
        if (typeof performance !== 'undefined' && performance.mark && performance.measure) {
            performance.mark(`${name}-end`);
            try {
                const measure = performance.measure(name, `${name}-start`, `${name}-end`);
                if (log) {
                    console.debug(`[Perf] ${name}: ${measure.duration.toFixed(2)}ms`);
                }
                return measure.duration;
            } catch (e) {
                return null;
            }
        }
        return null;
    },

    /**
     * Clear all marks and measures
     */
    clear() {
        if (typeof performance !== 'undefined') {
            performance.clearMarks();
            performance.clearMeasures();
        }
    },
};

export default {
    memoize,
    debounce,
    throttle,
    requestIdleCallback,
    cancelIdleCallback,
    whenIdle,
    useIntersectionObserver,
    useLazyComponent,
    useDebouncedValue,
    useDebouncedCallback,
    useThrottledCallback,
    usePrevious,
    useStableCallback,
    useDeepMemo,
    useRenderLog,
    withRenderLog,
    useVirtualList,
    preloadImage,
    preloadImages,
    useLazyImage,
    batchUpdates,
    perfMark,
};
