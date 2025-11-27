/**
 * DOM Utilities
 * @fileoverview DOM manipulation helpers and event utilities
 */

// ============================================================================
// Class Utilities
// ============================================================================

/**
 * Combine class names (like clsx/classnames)
 * @param {...(string|Object|Array)} classes - Class names or conditions
 * @returns {string}
 */
export function cn(...classes) {
  return classes
    .flatMap(c => {
      if (!c) return [];
      if (typeof c === 'string') return [c];
      if (Array.isArray(c)) return cn(...c);
      if (typeof c === 'object') {
        return Object.entries(c)
          .filter(([, v]) => Boolean(v))
          .map(([k]) => k);
      }
      return [];
    })
    .filter(Boolean)
    .join(' ');
}

// ============================================================================
// Event Utilities
// ============================================================================

/**
 * Create a debounced function
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function}
 */
export function debounce(func, delay) {
  let timeoutId;
  const debounced = (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
  debounced.cancel = () => clearTimeout(timeoutId);
  return debounced;
}

/**
 * Create a throttled function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Minimum time between calls in ms
 * @returns {Function}
 */
export function throttle(func, limit) {
  let inThrottle;
  let lastResult;

  const throttled = (...args) => {
    if (!inThrottle) {
      lastResult = func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
    return lastResult;
  };

  throttled.cancel = () => {
    inThrottle = false;
  };

  return throttled;
}

/**
 * Create a function that only runs once
 * @param {Function} func - Function to wrap
 * @returns {Function}
 */
export function once(func) {
  let called = false;
  let result;

  return (...args) => {
    if (called) return result;
    called = true;
    result = func(...args);
    return result;
  };
}

// ============================================================================
// Focus Management
// ============================================================================

/** @type {WeakMap<Element, HTMLElement>} */
const previousFocusMap = new WeakMap();

/**
 * Trap focus within an element
 * @param {HTMLElement} element - Container element
 * @returns {{ release: () => void }}
 */
export function trapFocus(element) {
  const focusableSelector =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  const focusableElements = element.querySelectorAll(focusableSelector);
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  // Save current focus
  const previousFocus = document.activeElement;
  previousFocusMap.set(element, previousFocus);

  // Focus first element
  if (firstFocusable) {
    firstFocusable.focus();
  }

  const handleKeyDown = e => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    }
  };

  element.addEventListener('keydown', handleKeyDown);

  return {
    release: () => {
      element.removeEventListener('keydown', handleKeyDown);
      const prev = previousFocusMap.get(element);
      if (prev && prev.focus) {
        prev.focus();
      }
      previousFocusMap.delete(element);
    },
  };
}

/**
 * Focus the first focusable element in a container
 * @param {HTMLElement} container - Container element
 */
export function focusFirst(container) {
  const focusable = container.querySelector(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (focusable) {
    focusable.focus();
  }
}

// ============================================================================
// Scroll Utilities
// ============================================================================

/**
 * Scroll to element smoothly
 * @param {HTMLElement|string} target - Element or selector
 * @param {Object} [options] - Scroll options
 * @param {number} [options.offset=0] - Offset from top
 * @param {ScrollBehavior} [options.behavior='smooth'] - Scroll behavior
 */
export function scrollTo(target, options = {}) {
  const { offset = 0, behavior = 'smooth' } = options;

  const element = typeof target === 'string' ? document.querySelector(target) : target;

  if (!element) return;

  const top = element.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior });
}

/**
 * Check if element is in viewport
 * @param {HTMLElement} element - Element to check
 * @param {number} [threshold=0] - Visibility threshold (0-1)
 * @returns {boolean}
 */
export function isInViewport(element, threshold = 0) {
  const rect = element.getBoundingClientRect();
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;
  const windowWidth = window.innerWidth || document.documentElement.clientWidth;

  const vertInView = rect.top <= windowHeight * (1 - threshold) && rect.bottom >= windowHeight * threshold;
  const horInView = rect.left <= windowWidth * (1 - threshold) && rect.right >= windowWidth * threshold;

  return vertInView && horInView;
}

/**
 * Lock body scroll
 * @returns {{ unlock: () => void }}
 */
export function lockScroll() {
  const scrollY = window.scrollY;
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = '100%';
  document.body.style.paddingRight = `${scrollbarWidth}px`;
  document.body.style.overflow = 'hidden';

  return {
    unlock: () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.paddingRight = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
    },
  };
}

// ============================================================================
// Clipboard
// ============================================================================

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Media Queries
// ============================================================================

/**
 * Check if media query matches
 * @param {string} query - Media query string
 * @returns {boolean}
 */
export function matchesMedia(query) {
  return window.matchMedia(query).matches;
}

/**
 * Subscribe to media query changes
 * @param {string} query - Media query string
 * @param {(matches: boolean) => void} callback - Callback
 * @returns {{ unsubscribe: () => void }}
 */
export function onMediaChange(query, callback) {
  const mql = window.matchMedia(query);

  const handler = e => callback(e.matches);
  mql.addEventListener('change', handler);

  // Call immediately with current value
  callback(mql.matches);

  return {
    unsubscribe: () => mql.removeEventListener('change', handler),
  };
}

/**
 * Breakpoint definitions
 * @type {Record<string, string>}
 */
export const breakpoints = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
  prefersReducedMotion: '(prefers-reduced-motion: reduce)',
  prefersDark: '(prefers-color-scheme: dark)',
};

// ============================================================================
// Element Measurement
// ============================================================================

/**
 * Get element dimensions
 * @param {HTMLElement} element
 * @returns {{ width: number, height: number, top: number, left: number }}
 */
export function getRect(element) {
  const rect = element.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height,
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
  };
}

// ============================================================================
// Animation Utilities
// ============================================================================

/**
 * Request animation frame with cancel support
 * @param {FrameRequestCallback} callback
 * @returns {{ cancel: () => void }}
 */
export function raf(callback) {
  const id = requestAnimationFrame(callback);
  return { cancel: () => cancelAnimationFrame(id) };
}

/**
 * Wait for element to be added to DOM
 * @param {string} selector
 * @param {number} [timeout=5000]
 * @returns {Promise<Element>}
 */
export function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver((_, obs) => {
      const el = document.querySelector(selector);
      if (el) {
        obs.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found`));
    }, timeout);
  });
}

export default {
  cn,
  debounce,
  throttle,
  once,
  trapFocus,
  focusFirst,
  scrollTo,
  isInViewport,
  lockScroll,
  copyToClipboard,
  matchesMedia,
  onMediaChange,
  breakpoints,
  getRect,
  raf,
  waitForElement,
};
