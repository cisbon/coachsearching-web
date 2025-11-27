/**
 * Hooks Barrel Export
 * @fileoverview Central export for all custom React hooks
 */

// Storage hooks
export { useLocalStorage } from './useLocalStorage.js';

// Fetch hooks
export { useFetch, useLazyFetch } from './useFetch.js';

// Debounce hooks
export { useDebounce, useDebouncedCallback } from './useDebounce.js';

// Async hooks
export { useAsync, useAsyncEffect, useMutation } from './useAsync.js';

// Form hooks
export { useForm } from './useForm.js';

// Event hooks
export {
  useEventListener,
  useKeyboardShortcut,
  useClickOutside,
  useEscapeKey,
  useWindowResize,
  useScroll,
} from './useEventListener.js';

// Media query hooks
export {
  useMediaQuery,
  useBreakpoint,
  usePrefersReducedMotion,
  usePrefersColorScheme,
  useIsTouchDevice,
  useWindowSize,
  usePageVisibility,
  useOnlineStatus,
} from './useMediaQuery.js';
