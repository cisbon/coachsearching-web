/**
 * ReactDOM ES Module Shim
 * Bridges window.ReactDOM (UMD global) to ES module imports.
 */
const ReactDOM = window.ReactDOM;

export default ReactDOM;
export const {
    createPortal,
    flushSync,
    createRoot,
    hydrateRoot,
} = ReactDOM;
