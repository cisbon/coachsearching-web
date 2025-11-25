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

console.log('App.js: React global', React);
console.log('App.js: ReactDOM global', ReactDOM);
console.log('App.js: htm imported');

const html = htm.bind(React.createElement);

// Initialize
initLanguage();
const debugConsole = initDebugConsole();

const API_BASE = 'https://clouedo.com/coachsearching/api';

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


// Utility: Simple Markdown to HTML
function markdownToHTML(md) {
    if (!md) return '';
    return md
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*)\*/gim, '<em>$1</em>')
        .replace(/\n/gim, '<br>');
}

// --- Legal Content ---
const legalContent = {
    imprint: {
        title: 'Imprint',
        content: html`
            <h3>coachsearching.com</h3>
            <h2>Information according to § 5 TMG</h2>
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

// Mock data for coaches (will be replaced with API data)
const mockCoaches = [
    {
        id: '1',
        full_name: 'Sarah Johnson',
        avatar_url: 'https://i.pravatar.cc/200?img=1',
        title: 'Executive Leadership Coach',
        bio: 'Helping executives and entrepreneurs achieve their full potential through strategic coaching and mentorship.',
        location: 'New York, USA',
        languages: ['English', 'Spanish'],
        specialties: ['Leadership', 'Career Transition', 'Executive Coaching'],
        hourly_rate: 150,
        rating: 4.9,
        reviews_count: 127
    },
    {
        id: '2',
        full_name: 'Michael Chen',
        avatar_url: 'https://i.pravatar.cc/200?img=12',
        title: 'Career Development Coach',
        bio: 'Specializing in career transitions and professional development for mid-career professionals.',
        location: 'San Francisco, USA',
        languages: ['English', 'Mandarin'],
        specialties: ['Career Change', 'Interview Prep', 'Salary Negotiation'],
        hourly_rate: 120,
        rating: 4.8,
        reviews_count: 89
    },
    {
        id: '3',
        full_name: 'Emma Schmidt',
        avatar_url: 'https://i.pravatar.cc/200?img=5',
        title: 'Life & Wellness Coach',
        bio: 'Empowering individuals to create balanced, fulfilling lives through holistic coaching approaches.',
        location: 'Berlin, Germany',
        languages: ['German', 'English'],
        specialties: ['Work-Life Balance', 'Stress Management', 'Personal Growth'],
        hourly_rate: 100,
        rating: 5.0,
        reviews_count: 64
    }
];

// --- Components ---

const LegalModal = ({ isOpen, onClose, type }) => {
    if (!isOpen || !type) return null;
    const { title, content } = legalContent[type];

    return html`
        <div class="modal-overlay" onClick=${onClose} role="dialog" aria-modal="true" aria-labelledby="legal-modal-title">
            <div class="modal-content" onClick=${(e) => e.stopPropagation()}>
                <div class="modal-header">
                    <h2 id="legal-modal-title" class="modal-title">${title}</h2>
                    <button class="modal-close" onClick=${onClose} aria-label="Close modal">×</button>
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
                    <div style=${{ color: '#888', fontSize: '0.85rem', marginTop: '8px' }}>© 2025 coachsearching.com</div>
                </div>
                <div class="footer-links">
                    <a href="#" class="footer-link" onClick=${(e) => { e.preventDefault(); onOpenLegal('imprint'); }} role="button">Imprint</a>
                    <a href="#" class="footer-link" onClick=${(e) => { e.preventDefault(); onOpenLegal('privacy'); }} role="button">Privacy</a>
                    <a href="#" class="footer-link" onClick=${(e) => { e.preventDefault(); onOpenLegal('terms'); }} role="button">Terms</a>
                </div>
            </div>
        </footer>
    `;
};


const CurrencySelector = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [currency, setCurrencyState] = useState(getCurrentCurrency());

    useEffect(() => {
        const handleCurrencyChange = () => {
            console.log('Currency changed event received');
            setCurrencyState(getCurrentCurrency());
        };
        window.addEventListener('currencyChange', handleCurrencyChange);
        return () => window.removeEventListener('currencyChange', handleCurrencyChange);
    }, []);

    const handleSelect = (code) => {
        console.log('Currency selected:', code);
        setCurrency(code);
        setIsOpen(false);
    };

    const currencies = [
        { code: 'EUR', symbol: '€', label: 'Euro' },
        { code: 'USD', symbol: '$', label: 'US Dollar' },
        { code: 'GBP', symbol: '£', label: 'Pound' }
    ];

    const current = currencies.find(c => c.code === currency) || currencies[0];

    return html`
        <div class="currency-selector">
            <button class="currency-btn" onClick=${() => setIsOpen(!isOpen)} aria-label="Select currency">
                <span>${current.symbol}</span>
                <span>${current.code}</span>
            </button>
            <div class="currency-dropdown ${isOpen ? 'show' : ''}" role="menu">
                ${currencies.map(curr => html`
                    <div 
                        key=${curr.code} 
                        class="currency-option ${curr.code === currency ? 'active' : ''}" 
                        onClick=${() => handleSelect(curr.code)} 
                        role="menuitem"
                    >
                        <span>${curr.symbol}</span>
                        <span>${curr.label}</span>
                    </div>
                `)}
            </div>
        </div>
    `;
};

const LanguageSelector = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentLang, setCurrentLang] = useState(getCurrentLang());

    const languages = [
        { code: 'en', flag: '🇬🇧', label: 'English' },
        { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
        { code: 'es', flag: '🇪🇸', label: 'Español' },
        { code: 'fr', flag: '🇫🇷', label: 'Français' },
        { code: 'it', flag: '🇮🇹', label: 'Italiano' }
    ];

    useEffect(() => {
        const handleLangChange = () => {
            const newLang = getCurrentLang();
            console.log('LANG: LanguageSelector received event, updating to:', newLang);
            setCurrentLang(newLang);
        };
        window.addEventListener('langChange', handleLangChange);
        return () => window.removeEventListener('langChange', handleLangChange);
    }, []);

    const handleSelect = (langCode) => {
        console.log('LANG: User selected language:', langCode);
        setLanguage(langCode);
        setCurrentLang(langCode);
        setIsOpen(false);
    };

    const current = languages.find(l => l.code === currentLang) || languages[0];

    return html`
        <div class="lang-selector">
            <button class="lang-btn" onClick=${() => setIsOpen(!isOpen)} aria-label="Select language" aria-expanded=${isOpen}>
                <span role="img" aria-label=${current.label}>${current.flag}</span>
                <span>${current.code.toUpperCase()}</span>
            </button>
            <div class="lang-dropdown ${isOpen ? 'show' : ''}" role="menu">
                ${languages.map(lang => html`
                    <div key=${lang.code} class="lang-option" onClick=${() => handleSelect(lang.code)} role="menuitem">
                        <span role="img" aria-label=${lang.label}>${lang.flag}</span>
                        <span>${lang.label}</span>
                    </div>
                `)}
            </div>
        </div>
    `;
};

const Navbar = ({ session }) => {
    return html`
        <header role="banner">
            <div class="container nav-flex">
                <a href="#" class="logo" onClick=${() => window.location.hash = '#home'}>coach<span>searching</span>.com</a>
                <nav class="nav-links" role="navigation">
                    <a href="#home">${t('nav.home')}</a>
                    <a href="#coaches">${t('nav.coaches')}</a>
                    ${session ? html`
                        <a href="#dashboard">${t('nav.dashboard')}</a>
                        <a href="#signout" class="nav-auth-btn">Sign Out</a>
                    ` : html`
                        <a href="#login" class="nav-auth-btn">Sign In / Register</a>
                    `}
                    <${CurrencySelector} />
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
    const [role, setRole] = useState('person');
    const [isLogin, setIsLogin] = useState(true);
    const [message, setMessage] = useState('');

    const handleAuth = async (e) => {
        e.preventDefault();

        console.log('Auth attempt started', { isLogin, email, role });

        if (!window.supabaseClient) {
            const error = 'Error: Supabase not initialized.';
            console.error(error);
            setMessage(error);
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            let result;
            if (isLogin) {
                console.log('Attempting sign in with password...');
                result = await window.supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });
                console.log('Sign in result:', result);
            } else {
                console.log('Attempting sign up...');
                result = await window.supabaseClient.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            role,
                            full_name: email.split('@')[0]
                        }
                    }
                });
                console.log('Sign up result:', result);
            }

            const { data, error } = result;

            if (error) {
                console.error('Auth error:', error);
                throw error;
            }

            console.log('Auth successful, data:', data);

            if (!isLogin) {
                if (data.user && !data.session) {
                    setMessage('Success! Please check your email to confirm your account.');
                    console.log('Email confirmation required');
                } else if (data.user && data.session) {
                    setMessage('Registration successful! Redirecting...');
                    console.log('Registration complete with session, redirecting...');
                    setTimeout(() => {
                        console.log('Delayed redirect to dashboard after registration');
                        window.location.hash = '#dashboard';
                    }, 500);
                }
            } else {
                console.log('Login successful, waiting for session state update...');
                // Don't redirect - the auth state change will update session and trigger re-render
                setMessage('Login successful! Loading dashboard...');
                // Small delay to let React update the session state
                setTimeout(() => {
                    console.log('Delayed redirect to dashboard after login');
                    window.location.hash = '#dashboard';
                }, 500);
            }
        } catch (error) {
            console.error('Auth Error:', error);
            setMessage(error.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };


    return html`
        <div class="auth-container">
            <div class="auth-card">
                <h2 class="section-title text-center">${isLogin ? 'Sign In' : 'Create Account'}</h2>

                ${message && html`
                    <div class="alert ${message.includes('Error') || message.includes('error') || message.includes('failed') ? 'alert-error' : 'alert-success'}">
                        ${message}
                    </div>
                `}

                <form onSubmit=${handleAuth} style=${{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    ${!isLogin && html`
                        <div class="role-group" role="radiogroup" aria-label="Select your role">
                            <div class="role-option ${role === 'person' ? 'selected' : ''}"
                                 onClick=${() => setRole('person')}
                                 role="radio"
                                 aria-checked=${role === 'person'}
                                 tabIndex="0">
                                👤 Person
                            </div>
                            <div class="role-option ${role === 'business' ? 'selected' : ''}"
                                 onClick=${() => setRole('business')}
                                 role="radio"
                                 aria-checked=${role === 'business'}
                                 tabIndex="0">
                                🏢 Business
                            </div>
                            <div class="role-option ${role === 'coach' ? 'selected' : ''}"
                                 onClick=${() => setRole('coach')}
                                 role="radio"
                                 aria-checked=${role === 'coach'}
                                 tabIndex="0">
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
                        aria-label="Email address"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        class="auth-input"
                        value=${password}
                        onChange=${(e) => setPassword(e.target.value)}
                        required
                        minLength="6"
                        aria-label="Password"
                    />

                    <button class="auth-btn" disabled=${loading} type="submit">
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

// Continue in next part...


const SignOut = () => {
    const [confirming, setConfirming] = useState(false);

    const handleSignOut = async () => {
        console.log('LOGOUT: Starting sign out process...');
        setConfirming(true);
        
        if (!window.supabaseClient) {
            console.error('LOGOUT: Supabase client not found!');
            alert('Cannot sign out - please refresh and try again');
            return;
        }
        
        try {
            console.log('LOGOUT: Calling supabaseClient.auth.signOut()...');
            const { error } = await window.supabaseClient.auth.signOut();
            
            if (error) {
                console.error('LOGOUT: Sign out returned error:', error);
                throw error;
            }
            
            console.log('LOGOUT: Sign out API call successful');
            console.log('LOGOUT: Redirecting to home...');
            window.location.hash = '#home';
            
            console.log('LOGOUT: Reloading page to clear session...');
            setTimeout(() => {
                window.location.reload();
            }, 200);
        } catch (error) {
            console.error('LOGOUT: Exception during sign out:', error);
            alert('Failed to sign out: ' + error.message);
            setConfirming(false);
        }
    };

    return html`
        <div class="signout-container">
            <div class="signout-card">
                <div class="signout-icon">👋</div>
                <h2>Sign Out</h2>
                <p>Are you sure you want to sign out? You'll need to log in again to access your dashboard.</p>
                <div class="signout-actions">
                    <button class="btn-secondary" onClick=${() => window.location.hash = '#dashboard'} disabled=${confirming}>
                        Cancel
                    </button>
                    <button class="btn-primary" onClick=${handleSignOut} disabled=${confirming}>
                        ${confirming ? 'Signing Out...' : 'Yes, Sign Out'}
                    </button>
                </div>
            </div>
        </div>
    `;
};

const Hero = ({ onSearch }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sessionType, setSessionType] = useState('online');
    const [location, setLocation] = useState('');
    const [radius, setRadius] = useState('25');
    const [date, setDate] = useState('');
    const [gettingLocation, setGettingLocation] = useState(false);

    const handleSearch = (e) => {
        e.preventDefault();
        console.log('Search:', { searchTerm, sessionType, location, radius, date });
        if (onSearch) {
            onSearch({ searchTerm, sessionType, location, radius, date });
        }
    };

    const handleUseMyLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        setGettingLocation(true);
        console.log('Getting user location...');

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                console.log('Location received:', { latitude, longitude });

                // Reverse geocode to get city name
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
                        { headers: { 'User-Agent': 'CoachSearching/1.0' } }
                    );
                    const data = await response.json();
                    console.log('Geocoding response:', data);
                    const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county;
                    const country = data.address?.country;
                    const locationString = city ? `${city}, ${country}` : `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;

                    console.log('Location set to:', locationString);
                    setLocation(locationString);
                } catch (error) {
                    console.error('Geocoding error:', error);
                    setLocation(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
                }

                setGettingLocation(false);
            },
            (error) => {
                console.error('Geolocation error code:', error.code);
                console.error('Geolocation error message:', error.message);
                console.error('Geolocation error:', error);

                let errorMessage = 'Unable to get your location. ';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage += 'Location permission denied. Please enable location access in your browser settings.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage += 'Location information unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMessage += 'Location request timed out.';
                        break;
                    default:
                        errorMessage += 'Please enter it manually.';
                }

                alert(errorMessage);
                setGettingLocation(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    return html`
        <section class="hero">
            <div class="container">
                <h1>${t('hero.title')}</h1>
                <p>${t('hero.subtitle')}</p>
            </div>
            <div class="container">
                 <div class="search-container">
                    <form class="search-form" onSubmit=${handleSearch}>
                        <div class="search-row">
                            <div class="search-input-group">
                                <span class="search-icon">🔍</span>
                                <input
                                    type="text"
                                    class="search-input"
                                    placeholder=${t('search.placeholder')}
                                    value=${searchTerm}
                                    onChange=${(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div class="search-input-group">
                                <span class="search-icon">📅</span>
                                <input
                                    type="date"
                                    class="search-input"
                                    placeholder="Date"
                                    value=${date}
                                    onChange=${(e) => setDate(e.target.value)}
                                />
                            </div>
                            <div class="filter-toggle">
                                <button
                                    type="button"
                                    class="filter-toggle-btn ${sessionType === 'online' ? 'active' : ''}"
                                    onClick=${() => {
                                        setSessionType('online');
                                        console.log('Session type: Online');
                                    }}
                                >
                                    💻 ${t('search.online')}
                                </button>
                                <button
                                    type="button"
                                    class="filter-toggle-btn ${sessionType === 'onsite' ? 'active' : ''}"
                                    onClick=${() => {
                                        setSessionType('onsite');
                                        console.log('Session type: On-Site');
                                    }}
                                >
                                    📍 ${t('search.onsite')}
                                </button>
                            </div>
                            <button type="submit" class="search-btn">${t('search.btn')}</button>
                        </div>
                        ${sessionType === 'onsite' ? html`
                            <div class="location-row">
                                <div class="location-input-wrapper">
                                    <span class="search-icon">📍</span>
                                    <input
                                        type="text"
                                        class="location-input"
                                        placeholder=${t('search.locationPlaceholder')}
                                        value=${location}
                                        onChange=${(e) => setLocation(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        class="use-location-btn"
                                        onClick=${handleUseMyLocation}
                                        disabled=${gettingLocation}
                                        title="Use my current location"
                                    >
                                        ${gettingLocation ? '⌛' : '📍'}
                                    </button>
                                </div>
                                <select class="radius-select" value=${radius} onChange=${(e) => setRadius(e.target.value)}>
                                    <option value="10">${t('search.within')} 10 km</option>
                                    <option value="25">${t('search.within')} 25 km</option>
                                    <option value="50">${t('search.within')} 50 km</option>
                                    <option value="100">${t('search.within')} 100 km</option>
                                    <option value="200">${t('search.within')} 200 km</option>
                                </select>
                            </div>
                        ` : ''}
                    </form>
                </div>
            </div>
        </section>
    `;
};

const CoachCard = ({ coach, onViewDetails }) => {
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
                        <div class="rating-text">${coach.reviews_count} ${t('coach.reviews')}</div>
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
                    <div class="price-label">${t('coach.hourly_rate')}</div>
                    <div class="price-value">${formatPrice(coach.hourly_rate)}</div>
                    <div class="price-label">Includes taxes</div>
                </div>
                <button class="btn-book" onClick=${() => onViewDetails(coach)}>${t('coach.view_profile')} ></button>
            </div>
        </div>
    `;
};

const CoachList = ({ searchFilters }) => {
    const [coaches, setCoaches] = useState(mockCoaches);
    const [selectedCoach, setSelectedCoach] = useState(null);
    const [filteredCoaches, setFilteredCoaches] = useState(mockCoaches);
    const [loading, setLoading] = useState(false);
    const [, forceUpdate] = useState({});

    console.log('CoachList rendering with', coaches.length, 'coaches');

    // Load coaches from API
    useEffect(() => {
        const loadCoaches = async () => {
            console.log('Loading coaches from API...');
            setLoading(true);
            try {
                const response = await fetch(API_BASE + '/coaches');
                const data = await response.json();
                console.log('API response:', data);
                
                if (data.data && data.data.length > 0) {
                    console.log('Loaded', data.data.length, 'coaches from API');
                    setCoaches(data.data);
                    setFilteredCoaches(data.data);
                } else {
                    console.log('No coaches from API, using mock data');
                    if (data.disclaimer) {
                        console.log('API disclaimer:', data.disclaimer);
                    }
                }
            } catch (error) {
                console.error('Failed to load coaches from API:', error);
                console.log('Falling back to mock data');
            } finally {
                setLoading(false);
            }
        };
        
        loadCoaches();
    }, []);

    useEffect(() => {
        const handleCurrencyChange = () => {
            console.log('CoachList: Currency changed, re-rendering');
            forceUpdate({});
        };
        window.addEventListener('currencyChange', handleCurrencyChange);
        return () => window.removeEventListener('currencyChange', handleCurrencyChange);
    }, []);

    useEffect(() => {
        if (searchFilters && searchFilters.searchTerm) {
            console.log('Filtering coaches with:', searchFilters);
            const term = searchFilters.searchTerm.toLowerCase();
            const filtered = coaches.filter(coach => 
                coach.full_name.toLowerCase().includes(term) ||
                coach.title.toLowerCase().includes(term) ||
                coach.bio.toLowerCase().includes(term) ||
                coach.specialties.some(s => s.toLowerCase().includes(term)) ||
                coach.location.toLowerCase().includes(term)
            );
            setFilteredCoaches(filtered);
            console.log('Filtered results:', filtered.length, 'coaches');
        } else {
            setFilteredCoaches(coaches);
        }
    }, [searchFilters, coaches]);

    return html`
    <div class="container" style=${{ marginTop: '60px', paddingBottom: '40px' }}>
            <h2 class="section-title">
                ${searchFilters?.searchTerm ? `Search Results (${filteredCoaches.length})` : 'Top Rated Coaches'}
            </h2>
            ${loading && html`
                <div class="loader">
                    <div class="spinner"></div>
                    <p>Loading coaches...</p>
                </div>
            `}
            ${filteredCoaches.length === 0 && html`
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <div class="empty-state-text">No coaches found</div>
                    <div class="empty-state-subtext">Try adjusting your search criteria</div>
                </div>
            `}
            <div class="coach-list">
                ${filteredCoaches.map(coach => html`<${CoachCard} key=${coach.id} coach=${coach} onViewDetails=${setSelectedCoach} />`)}
            </div>
            ${selectedCoach && html`<${CoachDetailModal} coach=${selectedCoach} onClose=${() => setSelectedCoach(null)} />`}
        </div>
    `;
};

const CoachDetailModal = ({ coach, onClose }) => {
    console.log('Opening coach detail modal for', coach.full_name);

    return html`
        <div class="coach-detail-modal" onClick=${onClose}>
            <div class="coach-detail-content" onClick=${(e) => e.stopPropagation()}>
                <div class="coach-detail-hero">
                    <img src=${coach.avatar_url} alt=${coach.full_name} class="coach-detail-avatar" />
                    <button class="modal-close-btn" onClick=${onClose} aria-label="Close">×</button>
                </div>
                <div class="coach-detail-body">
                    <div class="coach-detail-header">
                        <div>
                            <h2 class="coach-detail-name">${coach.full_name}</h2>
                            <p class="coach-detail-title">${coach.title}</p>
                        </div>
                        <button class="btn-book-prominent" onClick=${() => {
                            console.log('Book now clicked for', coach.full_name);
                            alert('Booking feature coming soon! Check the debug console for details.');
                        }}>
                            ${t('coach.book')}
                        </button>
                    </div>

                    <div class="coach-detail-stats">
                        <div class="coach-detail-stat">
                            <div class="coach-detail-stat-value">${coach.rating}</div>
                            <div class="coach-detail-stat-label">Rating</div>
                        </div>
                        <div class="coach-detail-stat">
                            <div class="coach-detail-stat-value">${coach.reviews_count}</div>
                            <div class="coach-detail-stat-label">Reviews</div>
                        </div>
                        <div class="coach-detail-stat">
                            <div class="coach-detail-stat-value">${formatPrice(coach.hourly_rate)}</div>
                            <div class="coach-detail-stat-label">Per Hour</div>
                        </div>
                    </div>

                    <div class="coach-detail-section">
                        <h3 class="coach-detail-section-title">About</h3>
                        <p>${coach.bio}</p>
                    </div>

                    <div class="coach-detail-section">
                        <h3 class="coach-detail-section-title">Specialties</h3>
                        ${coach.specialties.map(s => html`<span key=${s} class="badge badge-petrol">${s}</span>`)}
                    </div>

                    <div class="coach-detail-section">
                        <h3 class="coach-detail-section-title">Languages</h3>
                        ${coach.languages.map(l => html`<span key=${l} class="badge badge-petrol">${l}</span>`)}
                    </div>
                </div>
            </div>
        </div>
    `;
};

const Dashboard = ({ session }) => {
    const [activeTab, setActiveTab] = useState('overview');

    console.log('Dashboard component rendering, session:', !!session);

    if (!session) {
        console.log('No session in Dashboard, waiting for auth state...');
        // Show loading state instead of redirecting immediately
        return html`
            <div class="container" style=${{ marginTop: '100px', textAlign: 'center' }}>
                <div class="spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        `;
    }

    const userRole = session.user?.user_metadata?.role || 'person';
    console.log('Dashboard loaded successfully for user:', session.user.email, 'Role:', userRole);

    return html`
    <div class="dashboard-container">
            <div class="dashboard-header">
                <h2 class="section-title">${t('dashboard.welcome')}, ${session.user.email}</h2>
                <div class="badge badge-petrol">${userRole}</div>
            </div>

            <div class="dashboard-tabs">
                <button class="tab-btn ${activeTab === 'overview' ? 'active' : ''}" onClick=${() => setActiveTab('overview')}>
                    ${t('dashboard.overview')}
                </button>
                <button class="tab-btn ${activeTab === 'bookings' ? 'active' : ''}" onClick=${() => setActiveTab('bookings')}>
                    ${t('dashboard.bookings')}
                </button>
                ${userRole === 'coach' && html`
                    <button class="tab-btn ${activeTab === 'articles' ? 'active' : ''}" onClick=${() => setActiveTab('articles')}>
                        ${t('dashboard.articles')}
                    </button>
                    <button class="tab-btn ${activeTab === 'probono' ? 'active' : ''}" onClick=${() => setActiveTab('probono')}>
                        ${t('dashboard.probono')}
                    </button>
                `}
                <button class="tab-btn ${activeTab === 'profile' ? 'active' : ''}" onClick=${() => setActiveTab('profile')}>
                    ${t('dashboard.profile')}
                </button>
            </div>

            ${activeTab === 'overview' && html`<${DashboardOverview} userRole=${userRole} />`}
            ${activeTab === 'bookings' && html`<${DashboardBookings} session=${session} />`}
            ${activeTab === 'articles' && userRole === 'coach' && html`<${DashboardArticles} session=${session} />`}
            ${activeTab === 'probono' && userRole === 'coach' && html`<${DashboardProBono} session=${session} />`}
            ${activeTab === 'profile' && html`<${DashboardProfile} session=${session} />`}
        </div>
    `;
};

const DashboardOverview = ({ userRole }) => {
    console.log('Dashboard overview for role:', userRole);

    return html`
        <div>
            <div class="dashboard-grid">
                <div class="stat-card">
                    <div class="stat-label">Total Bookings</div>
                    <div class="stat-value">0</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Upcoming Sessions</div>
                    <div class="stat-value">0</div>
                </div>
                ${userRole === 'coach' && html`
                    <div class="stat-card">
                        <div class="stat-label">Pro-bono Hours</div>
                        <div class="stat-value">0</div>
                    </div>
                `}
            </div>

            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <div class="empty-state-text">Your dashboard is ready!</div>
                <div class="empty-state-subtext">Start exploring features using the tabs above.</div>
            </div>
        </div>
    `;
};

const DashboardBookings = ({ session }) => {
    console.log('Loading bookings dashboard');

    return html`
        <div>
            <div class="empty-state">
                <div class="empty-state-icon">📅</div>
                <div class="empty-state-text">No bookings yet</div>
                <div class="empty-state-subtext">
                    ${session.user.user_metadata?.role === 'coach'
                        ? 'Bookings from clients will appear here.'
                        : 'Browse coaches and book your first session!'}
                </div>
            </div>
        </div>
    `;
};

const DashboardArticles = ({ session }) => {
    const [articles, setArticles] = useState([]);
    const [showEditor, setShowEditor] = useState(false);

    console.log('Loading articles dashboard');

    return html`
        <div>
            <div style=${{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3>${t('dashboard.articles')}</h3>
                <button class="btn-primary" onClick=${() => {
                    console.log('New article clicked');
                    setShowEditor(!showEditor);
                }}>
                    ${showEditor ? 'Close Editor' : t('article.new')}
                </button>
            </div>

            ${showEditor && html`<${ArticleEditor} session=${session} />`}

            ${articles.length === 0 && !showEditor && html`
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <div class="empty-state-text">No articles yet</div>
                    <div class="empty-state-subtext">Create your first article to share your expertise!</div>
                </div>
            `}
        </div>
    `;
};

const ArticleEditor = ({ session }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [preview, setPreview] = useState('');
    const [showPreview, setShowPreview] = useState(false);

    console.log('Article editor loaded');

    const handlePreview = () => {
        const html = markdownToHTML(content);
        setPreview(html);
        setShowPreview(!showPreview);
        console.log('Preview toggled');
    };

    const shareLinkedIn = () => {
        const url = encodeURIComponent(window.location.href);
        const text = encodeURIComponent(title);
        const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${text}`;
        console.log('Opening LinkedIn share:', linkedInUrl);
        window.open(linkedInUrl, '_blank');
    };

    const shareTwitter = () => {
        const url = encodeURIComponent(window.location.href);
        const text = encodeURIComponent(title);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
        console.log('Opening Twitter share:', twitterUrl);
        window.open(twitterUrl, '_blank');
    };

    return html`
        <div class="article-editor">
            <input
                type="text"
                placeholder=${t('article.title')}
                value=${title}
                onChange=${(e) => setTitle(e.target.value)}
                style=${{ width: '100%', padding: '12px', fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
            />
            <textarea
                placeholder="${t('article.content')} (Markdown supported)"
                value=${content}
                onChange=${(e) => setContent(e.target.value)}
            />

            <div class="editor-toolbar">
                <button class="btn-secondary" onClick=${handlePreview}>
                    ${showPreview ? 'Hide Preview' : t('article.preview')}
                </button>
                <button class="btn-primary" onClick=${() => {
                    console.log('Publish clicked', { title, content });
                    alert('Article publishing will be connected to API soon!');
                }}>
                    ${t('article.publish')}
                </button>
                <button class="btn-secondary" onClick=${shareLinkedIn}>
                    ${t('article.share_linkedin')}
                </button>
                <button class="btn-secondary" onClick=${shareTwitter}>
                    ${t('article.share_twitter')}
                </button>
            </div>

            ${showPreview && html`
                <div class="article-preview">
                    <h3>Preview</h3>
                    <div dangerouslySetInnerHTML=${{ __html: preview }} />
                </div>
            `}
        </div>
    `;
};

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

const DashboardProfile = ({ session }) => {
    const [fullName, setFullName] = useState(session.user.user_metadata?.full_name || '');
    const [bio, setBio] = useState('');

    console.log('Loading profile dashboard');

    return html`
        <div>
            <h3>${t('profile.update')}</h3>

            <div style=${{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px', marginTop: '20px' }}>
                <div>
                    <label class="filter-label">Full Name</label>
                    <input
                        type="text"
                        class="filter-input"
                        value=${fullName}
                        onChange=${(e) => setFullName(e.target.value)}
                    />
                </div>

                <div>
                    <label class="filter-label">Email</label>
                    <input
                        type="email"
                        class="filter-input"
                        value=${session.user.email}
                        disabled
                        style=${{ background: '#f5f5f5', cursor: 'not-allowed' }}
                    />
                </div>

                ${session.user.user_metadata?.role === 'coach' && html`
                    <div>
                        <label class="filter-label">Bio</label>
                        <textarea
                            class="filter-input"
                            value=${bio}
                            onChange=${(e) => setBio(e.target.value)}
                            style=${{ minHeight: '100px', resize: 'vertical' }}
                        />
                    </div>
                `}

                <button class="btn-primary" onClick=${() => {
                    console.log('Profile update clicked', { fullName, bio });
                    alert('Profile updates will be connected to API soon!');
                }}>
                    Save Changes
                </button>
            </div>
        </div>
    `;
};

const Home = () => {
    const [searchFilters, setSearchFilters] = useState(null);

    const handleSearch = (filters) => {
        console.log('Home: Search filters received:', filters);
        setSearchFilters(filters);
    };

    return html`
    <div>
            <${Hero} onSearch=${handleSearch} />
            <${CoachList} searchFilters=${searchFilters} />
        </div>
    `;
};

const App = () => {
    const [route, setRoute] = useState(window.location.hash || '#home');
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

        const handleHashChange = () => {
            const newRoute = window.location.hash || '#home';
            console.log('Route changed to:', newRoute);
            setRoute(newRoute);
        };

        const handleLangChange = () => {
            console.log('LANG: Language changed event received in App');
            setLanguageVersion(v => v + 1);
        };

        window.addEventListener('hashchange', handleHashChange);
        window.addEventListener('langChange', handleLangChange);

        return () => {
            window.removeEventListener('hashchange', handleHashChange);
            window.removeEventListener('langChange', handleLangChange);
        };
    }, []);

    const openLegal = (type) => {
        console.log('Opening legal modal:', type);
        setLegalModal({ isOpen: true, type });
    };

    const closeLegal = () => {
        console.log('Closing legal modal');
        setLegalModal({ isOpen: false, type: null });
    };

    if (!configLoaded) {
        return html`<div class="container" style=${{ marginTop: '100px', textAlign: 'center' }}>Loading configuration...</div>`;
    }

    let Component;
    switch (route) {
        case '#home': Component = Home; break;
        case '#coaches': Component = CoachList; break;
        case '#login': Component = Auth; break;
        case '#dashboard': Component = () => html`<${Dashboard} session=${session} />`; break;
        case '#signout': Component = SignOut; break;
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

console.log('App.js: Rendering app...');
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(html`<${App} />`);
console.log('App.js: App rendered successfully');
