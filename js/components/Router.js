/**
 * Hash-based Router
 * Simple client-side routing using hash URLs
 */

import htm from '../vendor/htm.js';

const React = window.React;
const { createContext, useContext, useState, useEffect, useCallback, useMemo } = React;
const html = htm.bind(React.createElement);

// Router Context
const RouterContext = createContext(null);

/**
 * Parse hash URL into path and params
 * @param {string} hash - The hash string (e.g., "#coach/123?tab=reviews")
 * @returns {Object} - { path, segments, params, id }
 */
function parseHash(hash) {
    const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash;
    const [pathPart, queryPart] = cleanHash.split('?');

    // Parse path segments
    const segments = pathPart.split('/').filter(Boolean);
    const basePath = segments[0] || 'home';
    const id = segments[1] || null;

    // Parse query params
    const params = {};
    if (queryPart) {
        const searchParams = new URLSearchParams(queryPart);
        for (const [key, value] of searchParams) {
            params[key] = value;
        }
    }

    return {
        path: basePath,
        fullPath: pathPart || 'home',
        segments,
        id,
        params,
        hash: cleanHash
    };
}

/**
 * Router Provider Component
 * Provides routing context to the app
 */
export function RouterProvider({ children }) {
    const [route, setRoute] = useState(() => parseHash(window.location.hash));

    useEffect(() => {
        const handleHashChange = () => {
            setRoute(parseHash(window.location.hash));
        };

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const navigate = useCallback((path) => {
        window.location.hash = path.startsWith('#') ? path : `#${path}`;
    }, []);

    const goBack = useCallback(() => {
        window.history.back();
    }, []);

    const value = useMemo(() => ({
        route,
        navigate,
        goBack,
        currentPath: route.path,
        params: route.params,
        id: route.id
    }), [route, navigate, goBack]);

    return html`
        <${RouterContext.Provider} value=${value}>
            ${children}
        </${RouterContext.Provider}>
    `;
}

/**
 * Hook to access router context
 */
export function useRouter() {
    const context = useContext(RouterContext);
    if (!context) {
        throw new Error('useRouter must be used within a RouterProvider');
    }
    return context;
}

/**
 * Hook for just navigation
 */
export function useNavigate() {
    const { navigate } = useRouter();
    return navigate;
}

/**
 * Hook for route params
 */
export function useParams() {
    const { params, id } = useRouter();
    return { ...params, id };
}

/**
 * Route Component
 * Renders children only if path matches
 * @param {Object} props
 * @param {string} props.path - Route path to match (e.g., "home", "coach")
 * @param {React.ReactNode} props.children - Content to render
 * @param {boolean} [props.exact=false] - Require exact match
 */
export function Route({ path, children, exact = false }) {
    const { route } = useRouter();

    const isMatch = exact
        ? route.path === path
        : route.path === path || route.fullPath.startsWith(path);

    if (!isMatch) return null;

    return children;
}

/**
 * Switch Component
 * Renders only the first matching Route
 * @param {Object} props
 * @param {React.ReactNode} props.children - Route components
 */
export function Switch({ children }) {
    const { route } = useRouter();

    // Convert children to array and find first match
    const childArray = React.Children.toArray(children);

    for (const child of childArray) {
        if (!child || !child.props) continue;

        const { path, exact } = child.props;

        // Default route (no path) matches everything
        if (!path) return child;

        const isMatch = exact
            ? route.path === path
            : route.path === path || route.fullPath.startsWith(path);

        if (isMatch) return child;
    }

    return null;
}

/**
 * Link Component
 * Navigation link using hash routing
 * @param {Object} props
 * @param {string} props.to - Target hash path
 * @param {string} [props.className] - CSS classes
 * @param {React.ReactNode} props.children - Link content
 */
export function Link({ to, className, children, ...rest }) {
    const { navigate, currentPath } = useRouter();

    const href = to.startsWith('#') ? to : `#${to}`;
    const isActive = currentPath === to.replace('#', '');

    const handleClick = (e) => {
        e.preventDefault();
        navigate(to);
    };

    return html`
        <a
            href=${href}
            class="${className || ''} ${isActive ? 'active' : ''}"
            onClick=${handleClick}
            ...${rest}
        >
            ${children}
        </a>
    `;
}

/**
 * Redirect Component
 * Immediately redirects to a different route
 * @param {Object} props
 * @param {string} props.to - Target hash path
 */
export function Redirect({ to }) {
    const { navigate } = useRouter();

    useEffect(() => {
        navigate(to);
    }, [to, navigate]);

    return null;
}

export default {
    RouterProvider,
    useRouter,
    useNavigate,
    useParams,
    Route,
    Switch,
    Link,
    Redirect
};
