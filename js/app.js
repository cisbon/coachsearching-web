
// js/app.js
console.log('App.js: Loading...');

// UMD Globals
const React = window.React;
const ReactDOM = window.ReactDOM;
const { useState, useEffect } = React;
const { createClient } = window.supabase;

// Supabase will be initialized in App component after fetching config

console.log('App.js: React global', React);
console.log('App.js: ReactDOM global', ReactDOM);

import htm from './vendor/htm.js';
console.log('App.js: htm imported');
import { initLanguage, t, setLanguage } from './i18n.js';
import { useStore, actions } from './store.js';
import { mockCoaches } from './mockData.js';

console.log('App.js: Imports complete');

const html = htm.bind(React.createElement);

// Initialize
initLanguage();

// --- Legal Content ---
const legalContent = {
    imprint: {
        title: 'Imprint',
        content: html`
            <h3>coachsearching.com</h3>
            <p><strong>Represented by:</strong><br/>Michael Gross</p>
            <p><strong>Contact:</strong><br/>Email: info[at]coachsearching.com</p>
        `
    },
    privacy: {
        title: 'Privacy Policy',
        content: html`
            <h3>1. Data Protection Overview</h3>
            <p>General information about what happens to your personal data when you visit our website.</p>
            <h3>2. Hosting</h3>
            <p>We host our content via GitHub Pages and use Supabase for our database.</p>
            <h3>3. Data Collection</h3>
            <p>We collect data when you register, book a coach, or contact us. This includes name, email, and payment info.</p>
            <h3>4. Analytics</h3>
            <p>We use cookies to analyze website traffic and improve user experience.</p>
        `
    },
    terms: {
        title: 'Terms of Service',
        content: html`
            <h3>1. Scope</h3>
            <p>These terms apply to all business relations between the customer and coachsearching.com.</p>
            <h3>2. Services</h3>
            <p>coachsearching.com provides a platform to connect clients with professional coaches.</p>
            <h3>3. Booking & Payment</h3>
            <p>Bookings are binding. Payments are processed via Stripe.</p>
            <h3>4. Liability</h3>
            <p>coachsearching.com not liable for the content or quality of the coaching sessions provided by independent coaches.</p>
        `
    }
};

// --- Components ---

const LegalModal = ({ isOpen, onClose, type }) => {
    if (!isOpen || !type) return null;
    const { title, content } = legalContent[type];

    return html`
        <div class="modal-overlay" onClick=${onClose}>
            <div class="modal-content" onClick=${(e) => e.stopPropagation()}>
                <div class="modal-header">
                    <h2 class="modal-title">${title}</h2>
                    <button class="modal-close" onClick=${onClose}>X</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        </div>
    `;
};

const Footer = ({ onOpenLegal }) => {
    return html`
        <footer>
            <div class="container footer-content">
                <div>
                    <div class="logo" style=${{ fontSize: '1.2rem' }}>coach<span>searching</span>.com</div>
                    <div style=${{ color: '#888', fontSize: '0.85rem', marginTop: '8px' }}>© 2028 coachsearching.com</div>
                </div>
                <div class="footer-links">
                    <a href="#" class="footer-link" onClick=${(e) => { e.preventDefault(); onOpenLegal('imprint'); }}>Imprint</a>
                    <a href="#" class="footer-link" onClick=${(e) => { e.preventDefault(); onOpenLegal('privacy'); }}>Privacy</a>
                    <a href="#" class="footer-link" onClick=${(e) => { e.preventDefault(); onOpenLegal('terms'); }}>Terms</a>
                </div>
            </div>
        </footer>
    `;
};

const LanguageSelector = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentLang, setCurrentLang] = useState('en');

    const languages = [
        { code: 'en', flag: '🇬🇧', label: 'English' },
        { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
        { code: 'es', flag: '🇪🇸', label: 'Español' },
        { code: 'fr', flag: '🇫🇷', label: 'Français' },
        { code: 'it', flag: '🇮🇹', label: 'Italiano' }
    ];

    const handleSelect = (langCode) => {
        setLanguage(langCode);
        setCurrentLang(langCode);
        setIsOpen(false);
        window.dispatchEvent(new Event('langChange'));
    };

    const current = languages.find(l => l.code === currentLang) || languages[0];

    return html`
        <div class="lang-selector">
            <button class="lang-btn" onClick=${() => setIsOpen(!isOpen)}>
                <span>${current.flag}</span>
                <span>${current.code.toUpperCase()}</span>
            </button>
            <div class="lang-dropdown ${isOpen ? 'show' : ''}">
                ${languages.map(lang => html`
                    <div class="lang-option" onClick=${() => handleSelect(lang.code)}>
                        <span>${lang.flag}</span>
                        <span>${lang.label}</span>
                    </div>
                `)}
            </div>
        </div>
    `;
};

const Navbar = ({ session }) => {
    return html`
        <header>
            <div class="container nav-flex">
                <a href="#" class="logo">CoachSearching</a>
                <nav class="nav-links">
                    <a href="#home">${t('nav.home')}</a>
                    <a href="#coaches">${t('nav.coaches')}</a>
                    ${session ? html`
                        <a href="#dashboard">${t('nav.dashboard')}</a>
                        <button class="nav-auth-btn" onClick=${() => window.supabaseClient.auth.signOut()}>Sign Out</button>
                    ` : html`
                        <a href="#login" class="nav-auth-btn">Sign In / Register</a>
                    `}
                    <${LanguageSelector} />
                </nav>
            </div>
        </header>
    `;
};

const Auth = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('person'); // person, business, coach
    const [isLogin, setIsLogin] = useState(true);
    const [message, setMessage] = useState('');

    const handleAuth = async (e) => {
        e.preventDefault();

        if (!window.supabaseClient) {
            setMessage('Error: Supabase not initialized.');
            return;
        }

        setLoading(true);
        setMessage('');

        console.log('Auth Attempt:', { isLogin, email, role });

        try {
            let result;
            if (isLogin) {
                result = await window.supabaseClient.auth.signInWithPassword({ email, password });
            } else {
                // Register with Metadata
                result = await window.supabaseClient.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            role: role,
                            full_name: email.split('@')[0] // Default name
                        }
                    }
                });
            }

            const { data, error } = result;
            console.log('Supabase Response:', result);

            if (error) throw error;

            if (!isLogin) {
                if (data.user && !data.session) {
                    setMessage('Success! Please check your email to confirm your account.');
                } else if (data.user && data.session) {
                    setMessage('Registration successful! Redirecting...');
                    setTimeout(() => window.location.hash = '#dashboard', 1000);
                } else {
                    setMessage('Registration request sent. Please check logs if no user appears.');
                }
            } else {
                window.location.hash = '#dashboard';
            }
        } catch (error) {
            console.error('Auth Error:', error);
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    return html`
        <div class="auth-container">
            <div class="auth-card">
                <h2 class="section-title text-center">${isLogin ? 'Sign In' : 'Create Account'}</h2>
                
                ${message && html`
                    <div class="alert" style=${{
                color: message.includes('Error') ? '#721c24' : '#155724',
                backgroundColor: message.includes('Error') ? '#f8d7da' : '#d4edda',
                borderColor: message.includes('Error') ? '#f5c6cb' : '#c3e6cb',
                padding: '12px',
                borderRadius: '4px',
                textAlign: 'center',
                fontSize: '14px'
            }}>
                        ${message}
                    </div>
                `}

                <form onSubmit=${handleAuth} style=${{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    ${!isLogin && html`
                        <div class="role-group">
                            <div class="role-option ${role === 'person' ? 'selected' : ''}" onClick=${() => setRole('person')}>
                                👤 Person
                            </div>
                            <div class="role-option ${role === 'business' ? 'selected' : ''}" onClick=${() => setRole('business')}>
                                🏢 Business
                            </div>
                            <div class="role-option ${role === 'coach' ? 'selected' : ''}" onClick=${() => setRole('coach')}>
                                🎓 Coach
                            </div>
                        </div>
                    `}

                    <input 
                        type="email" 
                        placeholder="Email Address" 
                        class="auth-input" 
                        value=${email}
                        onChange=${(e) => setEmail(e.target.value)}
                        required
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        class="auth-input" 
                        value=${password}
                        onChange=${(e) => setPassword(e.target.value)}
                        required
                    />
                    
                    <button class="auth-btn" disabled=${loading}>
                        ${loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Register')}
                    </button>
                </form>
                
                <div class="text-center">
                    <button 
                        class="auth-switch-btn"
                        onClick=${() => { setIsLogin(!isLogin); setMessage(''); }}
                    >
                        ${isLogin ? 'New here? Create an account' : 'Already have an account? Sign In'}
                    </button>
                </div>
            </div>
        </div>
    `;
};

const Hero = () => {
    return html`
        <section class="hero">
            <div class="container">
                <h1>Find your perfect coach</h1>
                <p>From career transitions to executive leadership, find the guidance you need.</p>
            </div>
            <div class="container">
                 <div class="search-container">
                    <form class="search-form" onSubmit=${(e) => e.preventDefault()}>
                        <div class="search-input-group">
                            <span class="search-icon">🔍</span>
                            <input type="text" class="search-input" placeholder="What do you want to achieve?" />
                        </div>
                        <div class="search-input-group">
                            <span class="search-icon">📅</span>
                            <input type="text" class="search-input" placeholder="Check-in Date" onFocus=${(e) => e.target.type = 'date'} onBlur=${(e) => e.target.type = 'text'} />
                        </div>
                         <div class="search-input-group">
                            <span class="search-icon">👥</span>
                            <input type="text" class="search-input" placeholder="1 person" />
                        </div>
                        <button class="search-btn">Search</button>
                    </form>
                </div>
            </div>
        </section>
    `;
};

const CoachCard = ({ coach }) => {
    return html`
    <div class="coach-card">
            <img src=${coach.avatar_url} alt=${coach.full_name} class="coach-img" />
            <div class="coach-info">
                <div class="coach-header">
                    <div>
                        <h3 class="coach-name">${coach.full_name}</h3>
                        <div class="coach-title">${coach.title}</div>
                        <div class="coach-meta">
                            <span>📍 ${coach.location}</span>
                            <span>💬 ${coach.languages.join(', ')}</span>
                        </div>
                    </div>
                    <div class="coach-rating">
                        <div class="rating-badge">${coach.rating}</div>
                        <div class="rating-text">${coach.reviews_count} reviews</div>
                    </div>
                </div>
                <div class="coach-details">
                    <p>${coach.bio}</p>
                    <div style=${{ marginTop: '8px' }}>
                        <strong>Specialties: </strong>
                        ${coach.specialties.join(', ')}
                    </div>
                </div>
            </div>
            <div class="coach-price-section">
                <div>
                    <div class="price-label">Hourly Rate</div>
                    <div class="price-value">$${coach.hourly_rate}</div>
                    <div class="price-label">Includes taxes</div>
                </div>
                <button class="btn-book">See availability ></button>
            </div>
        </div>
    `;
};

const CoachList = () => {
    // Use mock data for now
    const coaches = mockCoaches;

    return html`
    <div class="container" style=${{ marginTop: '60px', paddingBottom: '40px' }}>
            <h2 class="section-title">Top Rated Coaches</h2>
            <div class="coach-list">
                ${coaches.map(coach => html`<${CoachCard} key=${coach.id} coach=${coach} />`)}
            </div>
        </div>
    `;
};

const Dashboard = ({ session }) => {
    if (!session) {
        window.location.hash = '#login';
        return null;
    }

    return html`
    <div class="container" style=${{ marginTop: '100px' }}>
            <h2 class="section-title">Dashboard</h2>
            <div class="coach-card">
                <div class="coach-info">
                    <h3>Welcome, ${session.user.email}</h3>
                    <p>This is your dashboard. You can manage your bookings and profile here.</p>
                </div>
            </div>
        </div>
    `;
};

const Home = () => {
    return html`
    <div>
            <${Hero} />
            <${CoachList} />
        </div>
    `;
};

const App = () => {
    // Simple Hash Router
    const [route, setRoute] = useState(window.location.hash || '#home');
    const [session, setSession] = useState(null);
    const [legalModal, setLegalModal] = useState({ isOpen: false, type: null });
    const [configLoaded, setConfigLoaded] = useState(false);

    useEffect(() => {
        // Fetch config from backend
        fetch('https://clouedo.com/coachsearching/api/env.php')
            .then(res => res.json())
            .then(config => {
                if (config.SUPABASE_URL && config.SUPABASE_ANON_KEY) {
                    window.supabaseClient = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

                    // Init session check
                    window.supabaseClient.auth.getSession().then(({ data: { session } }) => {
                        setSession(session);
                    });

                    const { data: { subscription } } = window.supabaseClient.auth.onAuthStateChange((_event, session) => {
                        setSession(session);
                    });

                    setConfigLoaded(true);
                } else {
                    console.error('Missing Supabase config');
                }
            })
            .catch(err => console.error('Failed to load config:', err));

        const handleHashChange = () => setRoute(window.location.hash || '#home');
        window.addEventListener('hashchange', handleHashChange);
        window.addEventListener('langChange', () => setRoute(r => r)); // Force re-render on lang change
        return () => {
            window.removeEventListener('hashchange', handleHashChange);
            window.removeEventListener('langChange', () => { });
        };
    }, []);

    const openLegal = (type) => setLegalModal({ isOpen: true, type });
    const closeLegal = () => setLegalModal({ isOpen: false, type: null });

    if (!configLoaded) {
        return html`<div class="container" style=${{ marginTop: '100px', textAlign: 'center' }}>Loading configuration...</div>`;
    }

    let Component;
    switch (route) {
        case '#home': Component = Home; break;
        case '#coaches': Component = CoachList; break;
        case '#login': Component = Auth; break;
        case '#dashboard': Component = () => html`<${Dashboard} session=${session} />`; break;
        default: Component = Home;
    }

    return html`
        <div style=${{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <${Navbar} session=${session} />
            <div style=${{ flex: 1 }}>
                <${Component} />
            </div>
            <${Footer} onOpenLegal=${openLegal} />
            <${LegalModal} isOpen=${legalModal.isOpen} onClose=${closeLegal} type=${legalModal.type} />
        </div>
    `;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(html`<${App} />`);
