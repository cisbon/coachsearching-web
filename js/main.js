/**
 * Main Entry Point
 * Modern React architecture with modular components
 *
 * This is the new entry point that uses the modular architecture.
 * It can be used alongside the legacy app.js during migration.
 */

import htm from './vendor/htm.js';
import { CONFIG } from './config.js';
import { initSupabase } from './services/supabase.js';
import { initLanguage } from './i18n.js';

// Context Providers
import { AuthProvider } from './context/AuthContext.js';
import { AppProvider } from './context/AppContext.js';

// Router
import { RouterProvider, Route, Switch } from './components/Router.js';

// Layout
import { Layout } from './components/layout/Layout.js';

// Pages
import { HomePage } from './pages/HomePage.js';
import { AuthPage } from './pages/AuthPage.js';

// Common Components
import { PageLoading } from './components/common/Loading.js';

const React = window.React;
const ReactDOM = window.ReactDOM;
const { useState, useEffect } = React;
const html = htm.bind(React.createElement);

/**
 * Error Boundary Component
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Application error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return html`
                <div class="error-page">
                    <div class="container" style=${{ textAlign: 'center', padding: '100px 20px' }}>
                        <h1 style=${{ fontSize: '72px', marginBottom: '20px' }}>😵</h1>
                        <h2>Something went wrong</h2>
                        <p style=${{ color: 'var(--text-muted)', marginBottom: '20px' }}>
                            We're sorry, but something unexpected happened.
                        </p>
                        <button
                            class="btn-primary"
                            onClick=${() => window.location.reload()}
                        >
                            Reload Page
                        </button>
                        ${this.state.error && html`
                            <details style=${{ marginTop: '20px', textAlign: 'left', maxWidth: '600px', margin: '20px auto' }}>
                                <summary style=${{ cursor: 'pointer' }}>Error Details</summary>
                                <pre style=${{ background: '#f5f5f5', padding: '10px', overflow: 'auto', fontSize: '12px' }}>
                                    ${this.state.error.toString()}
                                </pre>
                            </details>
                        `}
                    </div>
                </div>
            `;
        }

        return this.props.children;
    }
}

/**
 * App Initializer Component
 * Handles Supabase initialization and initial loading state
 */
function AppInitializer({ children }) {
    const [initialized, setInitialized] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function init() {
            try {
                // Initialize language
                initLanguage();

                // Initialize Supabase
                await initSupabase();

                setInitialized(true);
            } catch (err) {
                console.error('Initialization error:', err);
                setError(err.message);
            }
        }

        init();
    }, []);

    if (error) {
        return html`
            <div class="init-error" style=${{ textAlign: 'center', padding: '100px 20px' }}>
                <h2>Configuration Error</h2>
                <p style=${{ color: 'var(--text-muted)' }}>${error}</p>
                <button class="btn-primary" onClick=${() => window.location.reload()}>
                    Retry
                </button>
            </div>
        `;
    }

    if (!initialized) {
        return html`<${PageLoading} message="Initializing..." />`;
    }

    return children;
}

/**
 * Routes Component
 * Defines all application routes
 */
function AppRoutes() {
    return html`
        <${Switch}>
            <${Route} path="home">
                <${HomePage} />
            </${Route}>

            <${Route} path="coaches">
                <!-- TODO: Migrate CoachList from app.js -->
                <div class="container" style=${{ padding: '40px 20px', textAlign: 'center' }}>
                    <h2>Find a Coach</h2>
                    <p>Coach browsing is coming soon in the new architecture.</p>
                    <p style=${{ color: 'var(--text-muted)', marginTop: '10px' }}>
                        For now, please use the <a href="index-legacy.html">legacy version</a>.
                    </p>
                </div>
            </${Route}>

            <${Route} path="login">
                <${AuthPage} />
            </${Route}>

            <${Route} path="dashboard">
                <!-- TODO: Migrate Dashboard from app.js -->
                <div class="container" style=${{ padding: '40px 20px', textAlign: 'center' }}>
                    <h2>Dashboard</h2>
                    <p>Dashboard is coming soon in the new architecture.</p>
                </div>
            </${Route}>

            <${Route} path="onboarding">
                <!-- TODO: Migrate CoachOnboarding from app.js -->
                <div class="container" style=${{ padding: '40px 20px', textAlign: 'center' }}>
                    <h2>Coach Onboarding</h2>
                    <p>Onboarding flow is coming soon in the new architecture.</p>
                </div>
            </${Route}>

            <${Route} path="signout">
                <${SignOutHandler} />
            </${Route}>

            <!-- Default route -->
            <${Route}>
                <${HomePage} />
            </${Route}>
        </${Switch}>
    `;
}

/**
 * Sign Out Handler Component
 */
function SignOutHandler() {
    useEffect(() => {
        async function handleSignOut() {
            try {
                if (window.supabaseClient) {
                    await window.supabaseClient.auth.signOut();
                }
                window.location.hash = '#home';
            } catch (err) {
                console.error('Sign out error:', err);
                window.location.hash = '#home';
            }
        }

        handleSignOut();
    }, []);

    return html`<${PageLoading} message="Signing out..." />`;
}

/**
 * Main App Component
 */
function App() {
    return html`
        <${ErrorBoundary}>
            <${AppInitializer}>
                <${AppProvider}>
                    <${AuthProvider}>
                        <${RouterProvider}>
                            <${Layout}>
                                <${AppRoutes} />
                            </${Layout}>
                        </${RouterProvider}>
                    </${AuthProvider}>
                </${AppProvider}>
            </${AppInitializer}>
        </${ErrorBoundary}>
    `;
}

/**
 * Render the application
 */
function render() {
    console.log('main.js: Rendering app with new architecture...');

    const container = document.getElementById('root');

    if (!container) {
        console.error('Root element not found');
        return;
    }

    const root = ReactDOM.createRoot(container);
    root.render(html`<${App} />`);

    console.log('main.js: App rendered successfully');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
} else {
    render();
}

export { App, render };
