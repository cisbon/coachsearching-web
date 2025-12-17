// js/app.js - Complete Production Application
console.log('App.js: Loading...');

// UMD Globals
const React = window.React;
const ReactDOM = window.ReactDOM;
const { useState, useEffect, useRef, useCallback } = React;
const { createClient } = window.supabase;

import htm from './vendor/htm.js';
import { initLanguage, t, setLanguage, getCurrentLang } from './i18n.js';
import { initDebugConsole } from './debugConsole.js';
import { SessionNotesWizard, SessionNotesDashboard } from './sessionNotes.js';
import { ReferralDashboard, ReferralWidget } from './referrals.js';
import { PromoCodeWidget, PromoCodeBanner, PromoCodeManager } from './promoCode.js';

// SEO Content Pages
import { FAQPage } from './pages/FAQPage.js';
import { CategoryPage, CategoriesIndexPage, COACHING_CATEGORIES } from './pages/CategoryPage.js';
import { CoachProfilePage } from './pages/CoachProfilePage.js';
import { PricingPage } from './pages/PricingPage.js';
import { Hero, CoachingCategoriesSection, HowItWorksSection, TrustBadgesSection } from './pages/HomePage.js';

// Conversion Optimization Components
import {
    TestimonialCarousel,
    SuccessStats,
    ExitIntentPopup,
} from './components/conversion/SocialProof.js';

// Coach Components (modular)
import {
    LanguageFlags,
    TrustBadges,
    VideoPopup,
    ReviewsPopup,
    DiscoveryCallModal,
    CoachCard,
    CoachCardSkeleton,
    FilterSidebar,
    CoachList,
    CoachDetailModal,
    FavoriteButton
} from './components/coach/index.js';

// Layout & UI Components (modular)
import { Navbar, Footer } from './components/layout/index.js';
import { LegalModal, CurrencySelector, LanguageSelector, NotificationBell, TimezoneSelector, EmailVerificationBanner, ErrorBoundary } from './components/ui/index.js';

// Auth Components (modular)
import { SignOut, Auth, CoachOnboarding } from './components/auth/index.js';

// Account Components (modular)
import { DataExportRequest, AccountDeletion } from './components/account/index.js';

// Dashboard Components (modular)
import { Dashboard, DashboardOverview, DiscoveryRequestsDashboard, DashboardSubscription, DashboardProfile, DashboardBookings, DashboardAvailability, DashboardArticles, CoachEarningsDashboard } from './components/dashboard/index.js';

// Review Components (modular)
import { StarRating, ReviewCard, WriteReviewModal } from './components/reviews/index.js';

// Messaging Components (modular)
import { MessagingInbox, ConversationView } from './components/messaging/index.js';

// Matching Components (modular)
import { MatchingQuiz, AIMatchPage, getQuizQuestions } from './components/matching/index.js';

console.log('App.js: React global', React);
console.log('App.js: ReactDOM global', ReactDOM);
console.log('App.js: htm imported');

const html = htm.bind(React.createElement);

// Initialize
initLanguage();
const debugConsole = initDebugConsole();

const API_BASE = 'https://clouedo.com/coachsearching/api';

// Performance Utilities
const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
};

// Currency Management
const CURRENCY_SYMBOLS = {
    'EUR': '€',
    'USD': '$',
    'GBP': '£'
};

const CURRENCY_RATES = {
    'EUR': 1,
    'USD': 1.09,
    'GBP': 0.86
};

let currentCurrency = localStorage.getItem('currency') || 'EUR';

function setCurrency(code) {
    currentCurrency = code;
    localStorage.setItem('currency', code);
    window.dispatchEvent(new Event('currencyChange'));
    console.log('Currency changed to:', code);
}

function getCurrentCurrency() {
    return currentCurrency;
}

function formatPrice(eurPrice) {
    const rate = CURRENCY_RATES[currentCurrency];
    const convertedPrice = (eurPrice * rate).toFixed(0);
    const symbol = CURRENCY_SYMBOLS[currentCurrency];
    return symbol + convertedPrice;
}


// Utility: Enhanced Markdown to HTML
function markdownToHTML(md) {
    if (!md) return '';

    let html = md;

    // Convert headings (must be done line by line)
    html = html.replace(/^### (.*)$/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*)$/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*)$/gim, '<h1>$1</h1>');

    // Convert links [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Convert bold and italic
    html = html.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^\*]+)\*/g, '<em>$1</em>');

    // Convert bullet lists
    const bulletRegex = /^- (.*)$/gm;
    if (bulletRegex.test(html)) {
        html = html.replace(/(^- .*$(\n|$))+/gm, function(match) {
            const items = match.trim().split('\n').map(line =>
                '<li>' + line.replace(/^- /, '') + '</li>'
            ).join('');
            return '<ul>' + items + '</ul>';
        });
    }

    // Convert numbered lists
    const numberRegex = /^\d+\. (.*)$/gm;
    if (numberRegex.test(md)) {
        html = html.replace(/(^\d+\. .*$(\n|$))+/gm, function(match) {
            const items = match.trim().split('\n').map(line =>
                '<li>' + line.replace(/^\d+\. /, '') + '</li>'
            ).join('');
            return '<ol>' + items + '</ol>';
        });
    }

    // Convert line breaks to paragraphs
    html = html.split('\n\n').map(para => {
        // Don't wrap headings, lists in p tags
        if (para.match(/^<(h[123]|ul|ol)/)) {
            return para;
        }
        return '<p>' + para.replace(/\n/g, '<br>') + '</p>';
    }).join('');

    return html;
}

// --- Page Components ---

// CoachList wrapper that passes CoachDetailModal
const CoachListWithModal = ({ searchFilters, session }) => {
    return html`<${CoachList} searchFilters=${searchFilters} session=${session} CoachDetailModal=${CoachDetailModal} />`;
};

// Pro-bono dashboard stub (future feature)
const DashboardProBono = ({ session }) => {
    console.log('Loading pro-bono dashboard');

    return html`
        <div>
            <h3>${t('dashboard.probono')}</h3>
            <p style=${{ marginBottom: '20px', color: 'var(--text-muted)' }}>
                Offer free coaching sessions and track your pro-bono hours for certifications.
            </p>

            <div class="stat-card" style=${{ marginBottom: '20px' }}>
                <div class="stat-label">${t('probono.hours_tracked')}</div>
                <div class="stat-value">0.0 hrs</div>
            </div>
            <button class="btn-primary" onClick=${() => {
                console.log('Add pro-bono slot clicked');
                alert('Pro-bono scheduler will be connected to API soon!');
            }}>
                ${t('probono.add_slot')}
            </button>

            <div class="empty-state" style=${{ marginTop: '40px' }}>
                <div class="empty-state-icon">🎁</div>
                <div class="empty-state-text">No pro-bono slots yet</div>
                <div class="empty-state-subtext">Create free coaching slots to help others and earn certification hours.</div>
            </div>
        </div>
    `;
};

// Home page component
const Home = ({ session }) => {
    return html`
        <div>
            <${Hero} />
            <${TrustBadgesSection} />
            <${CoachingCategoriesSection} />
            <${HowItWorksSection} />

            <${CoachListWithModal} session=${session} />
        </div>
    `;
};

// --- SPA Router Helpers ---

// Get current route from pathname
const getCurrentRoute = () => {
    const pathname = window.location.pathname;
    // Handle root path
    if (pathname === '/' || pathname === '') return '/home';
    return pathname;
};

// Helper function to handle GitHub Pages redirect (from 404.html)
const handleGitHubPagesRedirect = () => {
    const redirectPath = sessionStorage.getItem('gh-pages-redirect');
    if (redirectPath) {
        sessionStorage.removeItem('gh-pages-redirect');
        console.log('GitHub Pages redirect detected:', redirectPath);
        // Use replaceState so back button works correctly
        window.history.replaceState(null, '', redirectPath);
        return redirectPath;
    }
    return null;
};

// Helper function to convert old hash routes to new clean routes
const migrateHashRoute = () => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#')) {
        // Convert #coach/id to /coach/id, #coaches to /coaches, etc.
        const cleanPath = hash.replace('#', '/');
        console.log('Migrating hash route:', hash, '→', cleanPath);
        window.history.replaceState(null, '', cleanPath);
        return cleanPath;
    }
    return null;
};

// Global navigate function for programmatic navigation
window.navigateTo = (path) => {
    // Ensure path starts with /
    if (!path.startsWith('/')) {
        path = '/' + path;
    }
    console.log('Navigating to:', path);
    window.history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    // Scroll to top on navigation
    window.scrollTo(0, 0);
};

// Global click handler for all internal links (SPA navigation)
document.addEventListener('click', (e) => {
    // Find the closest anchor element
    const anchor = e.target.closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href) return;

    // Skip external links, hash-only links, and links with target="_blank"
    if (href.startsWith('http') || href.startsWith('//') || href === '#' || anchor.target === '_blank') {
        return;
    }

    // Skip mailto and tel links
    if (href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
    }

    // Handle internal links starting with /
    if (href.startsWith('/')) {
        e.preventDefault();
        window.navigateTo(href);
    }
});

const App = () => {
    // Check for GitHub Pages redirect first, then hash migration, then current route
    const initialRoute = handleGitHubPagesRedirect() || migrateHashRoute() || getCurrentRoute();
    const [route, setRoute] = useState(initialRoute);
    const [session, setSession] = useState(null);
    const [legalModal, setLegalModal] = useState({ isOpen: false, type: null });
    const [configLoaded, setConfigLoaded] = useState(false);
    const [languageVersion, setLanguageVersion] = useState(0);

    useEffect(() => {
        console.log('App useEffect: Fetching config...');

        fetch('https://clouedo.com/coachsearching/api/env.php')
            .then(res => {
                console.log('Config response status:', res.status);
                return res.json();
            })
            .then(config => {
                console.log('Config loaded:', config);

                if (config.SUPABASE_URL && config.SUPABASE_ANON_KEY) {
                    console.log('Initializing Supabase client...');
                    window.supabaseClient = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
                    console.log('Supabase client initialized:', window.supabaseClient);

                    window.supabaseClient.auth.getSession().then(({ data: { session } }) => {
                        console.log('Initial session:', session);
                        setSession(session);
                    });

                    const { data: { subscription } } = window.supabaseClient.auth.onAuthStateChange((_event, session) => {
                        console.log('Auth state changed:', _event, session);
                        setSession(session);
                    });

                    setConfigLoaded(true);
                } else {
                    console.error('Missing Supabase config in response:', config);
                }
            })
            .catch(err => {
                console.error('Failed to load config:', err);
            });

        // Handle browser back/forward buttons
        const handlePopState = () => {
            const newRoute = getCurrentRoute();
            console.log('Route changed to:', newRoute);
            setRoute(newRoute);
        };

        // Handle hash changes for backward compatibility
        const handleHashChange = () => {
            const migratedRoute = migrateHashRoute();
            if (migratedRoute) {
                setRoute(migratedRoute);
            }
        };

        const handleLangChange = () => {
            console.log('LANG: Language changed event received in App');
            setLanguageVersion(v => v + 1);
        };

        window.addEventListener('popstate', handlePopState);
        window.addEventListener('hashchange', handleHashChange);
        window.addEventListener('langChange', handleLangChange);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('hashchange', handleHashChange);
            window.removeEventListener('langChange', handleLangChange);
        };
    }, []);

    // Show/hide debug console based on login state
    useEffect(() => {
        if (window.debugConsole) {
            window.debugConsole.setUIEnabled(!!session);
        }
    }, [session]);

    const openLegal = (type) => {
        console.log('Opening legal modal:', type);
        setLegalModal({ isOpen: true, type });
    };

    const closeLegal = () => {
        console.log('Closing legal modal');
        setLegalModal({ isOpen: false, type: null });
    };

    if (!configLoaded) {
        return html`
            <div style=${{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                width: '100%',
                background: '#fff'
            }}>
                <style>
                    @keyframes pulse-loader {
                        0%, 100% { transform: scale(1); opacity: 1; }
                        50% { transform: scale(1.15); opacity: 0.7; }
                    }
                </style>
                <img
                    src="/favicon.ico"
                    alt="Loading..."
                    style=${{
                        width: '64px',
                        height: '64px',
                        animation: 'pulse-loader 1.2s ease-in-out infinite'
                    }}
                />
            </div>
        `;
    }

    let Component;

    // Parse route for dynamic routing (clean URLs without #)
    const routePath = route.split('?')[0]; // Remove query params
    // Remove leading slash and split
    const cleanPath = routePath.replace(/^\//, '');
    const routeParts = cleanPath.split('/');
    const baseRoute = routeParts[0] || 'home';
    const routeParam = routeParts[1] || null;

    // Handle dynamic routes first
    if (baseRoute === 'coaching' && routeParam) {
        // Category pages like /coaching/executive-coaching
        Component = () => html`<${CategoryPage} categorySlug=${routeParam} />`;
    } else if (baseRoute === 'coach' && routeParam) {
        // Coach profile pages - supports both UUID and slug
        // Example: /coach/john-smith-life-coach or /coach/277530d3-627d-4057-b115-985719a1f59c
        Component = () => html`<${CoachProfilePage} coachIdOrSlug=${routeParam} session=${session} />`;
    } else {
        // Static routes
        switch (baseRoute) {
            case 'home':
            case '':
                Component = () => html`<${Home} session=${session} />`; break;
            case 'coaches': Component = () => html`<${CoachListWithModal} session=${session} />`; break;
            case 'login': Component = Auth; break;
            case 'onboarding': Component = () => html`<${CoachOnboarding} session=${session} />`; break;
            case 'dashboard': Component = () => html`<${Dashboard} session=${session} />`; break;
            case 'quiz': Component = () => html`<${MatchingQuiz} session=${session} />`; break;
            case 'ai-match': Component = () => html`<${AIMatchPage} session=${session} />`; break;
            case 'signout': Component = SignOut; break;
            // Content pages
            case 'faq': Component = () => html`<${FAQPage} />`; break;
            case 'categories': Component = () => html`<${CategoriesIndexPage} />`; break;
            case 'pricing': Component = () => html`<${PricingPage} />`; break;
            default: Component = () => html`<${Home} session=${session} />`;
        }
    }

    return html`
        <div style=${{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <${Navbar} session=${session} />
            <${EmailVerificationBanner} session=${session} />
            <div style=${{ flex: 1 }}>
                <${Component} />
            </div>
            <${Footer} onOpenLegal=${openLegal} />
            <${LegalModal} isOpen=${legalModal.isOpen} onClose=${closeLegal} type=${legalModal.type} />
        </div>
    `;
};

console.log('App.js: Rendering app...');
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    React.createElement(ErrorBoundary, null, html`<${App} />`)
);
console.log('App.js: App rendered successfully');
