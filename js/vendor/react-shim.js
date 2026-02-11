/**
 * React ES Module Shim
 * Bridges window.React (UMD global) to ES module imports.
 * Used by the import map so that CDN packages (e.g. @tanstack/react-query)
 * can `import React from 'react'` and get the same React instance.
 */
const React = window.React;

export default React;
export const {
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
    useContext,
    createContext,
    createElement,
    Fragment,
    memo,
    lazy,
    Suspense,
    forwardRef,
    Children,
    cloneElement,
    isValidElement,
    useReducer,
    useLayoutEffect,
    useImperativeHandle,
    useDebugValue,
    useDeferredValue,
    useTransition,
    useId,
    useSyncExternalStore,
    startTransition,
    Component,
    PureComponent,
    StrictMode,
    createRef,
    version,
} = React;
