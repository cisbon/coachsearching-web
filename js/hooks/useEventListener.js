/**
 * useEventListener Hook
 * @fileoverview Safely add and remove event listeners
 */

const React = window.React;
const { useEffect, useRef } = React;

/**
 * Hook to attach event listeners
 * @param {string} eventName - Event name
 * @param {EventListener} handler - Event handler
 * @param {EventTarget} [element=window] - Target element
 * @param {boolean|AddEventListenerOptions} [options] - Event options
 */
export function useEventListener(eventName, handler, element = window, options) {
  const savedHandler = useRef(handler);

  // Update ref.current if handler changes
  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const targetElement = element?.current || element;

    if (!targetElement?.addEventListener) {
      return;
    }

    const eventListener = event => savedHandler.current(event);

    targetElement.addEventListener(eventName, eventListener, options);

    return () => {
      targetElement.removeEventListener(eventName, eventListener, options);
    };
  }, [eventName, element, options]);
}

/**
 * Hook to listen for keyboard shortcuts
 * @param {Object} shortcuts - Map of key combos to handlers
 * @param {Object} [options] - Options
 * @param {boolean} [options.preventDefault=true] - Prevent default behavior
 * @param {Element} [options.element=window] - Target element
 */
export function useKeyboardShortcut(shortcuts, options = {}) {
  const { preventDefault = true, element = window } = options;

  useEventListener(
    'keydown',
    event => {
      const combo = getKeyCombo(event);

      if (shortcuts[combo]) {
        if (preventDefault) {
          event.preventDefault();
        }
        shortcuts[combo](event);
      }
    },
    element
  );
}

/**
 * Get key combo string from keyboard event
 * @param {KeyboardEvent} event
 * @returns {string}
 */
function getKeyCombo(event) {
  const parts = [];

  if (event.ctrlKey || event.metaKey) parts.push('ctrl');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey) parts.push('shift');

  const key = event.key.toLowerCase();
  if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
    parts.push(key);
  }

  return parts.join('+');
}

/**
 * Hook to detect clicks outside an element
 * @param {React.RefObject} ref - Ref to the element
 * @param {() => void} handler - Handler to call on outside click
 * @param {Object} [options] - Options
 * @param {boolean} [options.enabled=true] - Whether listener is enabled
 */
export function useClickOutside(ref, handler, options = {}) {
  const { enabled = true } = options;

  useEventListener(
    'mousedown',
    event => {
      if (!enabled) return;

      const el = ref?.current;
      if (!el || el.contains(event.target)) {
        return;
      }

      handler(event);
    },
    document
  );

  // Also handle touch events for mobile
  useEventListener(
    'touchstart',
    event => {
      if (!enabled) return;

      const el = ref?.current;
      if (!el || el.contains(event.target)) {
        return;
      }

      handler(event);
    },
    document
  );
}

/**
 * Hook to detect escape key press
 * @param {() => void} handler - Handler to call on escape
 * @param {Object} [options] - Options
 * @param {boolean} [options.enabled=true] - Whether listener is enabled
 */
export function useEscapeKey(handler, options = {}) {
  const { enabled = true } = options;

  useEventListener('keydown', event => {
    if (!enabled) return;

    if (event.key === 'Escape') {
      handler(event);
    }
  });
}

/**
 * Hook to detect window resize
 * @param {(size: { width: number, height: number }) => void} handler - Resize handler
 * @param {Object} [options] - Options
 * @param {number} [options.debounce=100] - Debounce delay
 */
export function useWindowResize(handler, options = {}) {
  const { debounce: debounceMs = 100 } = options;

  const timeoutRef = useRef(null);

  useEventListener('resize', () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      handler({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }, debounceMs);
  });
}

/**
 * Hook to detect scroll position
 * @param {(position: { x: number, y: number }) => void} handler - Scroll handler
 * @param {Object} [options] - Options
 * @param {Element} [options.element=window] - Element to listen on
 * @param {number} [options.throttle=16] - Throttle delay (roughly 60fps)
 */
export function useScroll(handler, options = {}) {
  const { element = window, throttle: throttleMs = 16 } = options;

  const lastCallRef = useRef(0);

  useEventListener(
    'scroll',
    () => {
      const now = Date.now();
      if (now - lastCallRef.current < throttleMs) {
        return;
      }
      lastCallRef.current = now;

      handler({
        x: window.scrollX || window.pageXOffset,
        y: window.scrollY || window.pageYOffset,
      });
    },
    element,
    { passive: true }
  );
}

export default useEventListener;
