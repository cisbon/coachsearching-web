/**
 * React JSX Runtime ES Module Shim
 * Bridges window.React to the `react/jsx-runtime` import that TanStack Query v5 uses.
 * In production React 18, jsx() is essentially createElement with a different signature.
 */
const React = window.React;

export const Fragment = React.Fragment;

export function jsx(type, config, maybeKey) {
    const { children, ...props } = config || {};
    if (maybeKey !== undefined) props.key = '' + maybeKey;
    if (children !== undefined) {
        if (Array.isArray(children)) {
            return React.createElement(type, props, ...children);
        }
        return React.createElement(type, props, children);
    }
    return React.createElement(type, props);
}

export const jsxs = jsx;
export const jsxDEV = jsx;
