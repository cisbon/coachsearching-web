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
    const [userType, setUserType] = useState('client');
    const [isLogin, setIsLogin] = useState(true);
    const [message, setMessage] = useState('');

    const handleAuth = async (e) => {
        e.preventDefault();

        console.log('Auth attempt started', { isLogin, email, userType });

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
                console.log('Attempting sign up as:', userType);
                result = await window.supabaseClient.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            user_type: userType,
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
                    const needsOnboarding = userType === 'coach' && data.session;
                    if (needsOnboarding) {
                        setMessage('Registration successful! Complete your coach profile...');
                        console.log('Coach registration complete, redirecting to onboarding...');
                        setTimeout(() => {
                            window.location.hash = '#onboarding';
                        }, 500);
                    } else {
                        setMessage('Registration successful! Redirecting...');
                        console.log('Registration complete with session, redirecting...');
                        setTimeout(() => {
                            window.location.hash = '#dashboard';
                        }, 500);
                    }
                }
            } else {
                console.log('Login successful, waiting for session state update...');
                setMessage('Login successful! Loading dashboard...');
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
                <h2 class="section-title text-center">${isLogin ? t('auth.signin') : t('auth.signup')}</h2>

                ${message && html`
                    <div class="alert ${message.includes('Error') || message.includes('error') || message.includes('failed') ? 'alert-error' : 'alert-success'}">
                        ${message}
                    </div>
                `}

                <form onSubmit=${handleAuth} style=${{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    ${!isLogin && html`
                        <div class="user-type-label">${t('auth.selectType')}</div>
                        <div class="role-group" role="radiogroup" aria-label="Select user type">
                            <div class="role-option ${userType === 'client' ? 'selected' : ''}"
                                 onClick=${() => setUserType('client')}
                                 role="radio"
                                 aria-checked=${userType === 'client'}
                                 tabIndex="0">
                                <div class="role-icon">👤</div>
                                <div class="role-text">
                                    <div class="role-name">${t('auth.client')}</div>
                                    <div class="role-desc">${t('auth.clientDesc')}</div>
                                </div>
                            </div>
                            <div class="role-option ${userType === 'coach' ? 'selected' : ''}"
                                 onClick=${() => setUserType('coach')}
                                 role="radio"
                                 aria-checked=${userType === 'coach'}
                                 tabIndex="0">
                                <div class="role-icon">🎓</div>
                                <div class="role-text">
                                    <div class="role-name">${t('auth.coach')}</div>
                                    <div class="role-desc">${t('auth.coachDesc')}</div>
                                </div>
                            </div>
                            <div class="role-option ${userType === 'business' ? 'selected' : ''}"
                                 onClick=${() => setUserType('business')}
                                 role="radio"
                                 aria-checked=${userType === 'business'}
                                 tabIndex="0">
                                <div class="role-icon">🏢</div>
                                <div class="role-text">
                                    <div class="role-name">${t('auth.business')}</div>
                                    <div class="role-desc">${t('auth.businessDesc')}</div>
                                </div>
                            </div>
                        </div>
                    `}

                    <input
                        type="email"
                        placeholder=${t('auth.email')}
                        class="auth-input"
                        value=${email}
                        onChange=${(e) => setEmail(e.target.value)}
                        required
                        aria-label="Email address"
                    />
                    <input
                        type="password"
                        placeholder=${t('auth.password')}
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

// Coach Onboarding Component
const CoachOnboarding = ({ session }) => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [formData, setFormData] = useState({
        full_name: session?.user?.user_metadata?.full_name || '',
        title: '',
        bio: '',
        location: '',
        hourly_rate: '',
        specialties: '',
        languages: 'en',
        session_types_online: true,
        session_types_onsite: false,
        avatar_url: ''
    });

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            // Parse comma-separated values into arrays
            const specialtiesArray = formData.specialties.split(',').map(s => s.trim()).filter(Boolean);
            const languagesArray = formData.languages.split(',').map(s => s.trim()).filter(Boolean);
            const sessionTypesArray = [];
            if (formData.session_types_online) sessionTypesArray.push('online');
            if (formData.session_types_onsite) sessionTypesArray.push('onsite');

            const coachProfile = {
                id: session.user.id,
                full_name: formData.full_name,
                title: formData.title,
                bio: formData.bio,
                location: formData.location,
                hourly_rate: parseFloat(formData.hourly_rate) || 0,
                currency: 'EUR',
                specialties: specialtiesArray,
                languages: languagesArray,
                session_types: sessionTypesArray,
                avatar_url: formData.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.email}`,
                onboarding_completed: true
            };

            console.log('Submitting coach profile:', coachProfile);

            // Save to database via API
            const response = await fetch(API_BASE + '/coaches', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + session.access_token
                },
                body: JSON.stringify(coachProfile)
            });

            const result = await response.json();
            console.log('Coach profile save result:', result);

            if (!response.ok) {
                throw new Error(result.error || 'Failed to save profile');
            }

            setMessage('Profile completed successfully! Redirecting...');
            setTimeout(() => {
                window.location.hash = '#dashboard';
            }, 1000);
        } catch (error) {
            console.error('Onboarding error:', error);
            setMessage('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return html`
        <div class="auth-container">
            <div class="onboarding-card">
                <h2 class="section-title text-center">${t('onboard.title')}</h2>
                <p class="text-center" style=${{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                    Complete your profile to start offering coaching services
                </p>

                ${message && html`
                    <div class="alert ${message.includes('Error') ? 'alert-error' : 'alert-success'}">
                        ${message}
                    </div>
                `}

                <form onSubmit=${handleSubmit} style=${{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div class="form-group">
                        <label class="form-label">${t('onboard.fullName')} *</label>
                        <input
                            type="text"
                            class="auth-input"
                            value=${formData.full_name}
                            onChange=${(e) => handleChange('full_name', e.target.value)}
                            required
                        />
                    </div>

                    <div class="form-group">
                        <label class="form-label">${t('onboard.jobTitle')} *</label>
                        <input
                            type="text"
                            class="auth-input"
                            placeholder="e.g., Life Coach, Business Consultant, Executive Coach"
                            value=${formData.title}
                            onChange=${(e) => handleChange('title', e.target.value)}
                            required
                        />
                    </div>

                    <div class="form-group">
                        <label class="form-label">${t('onboard.bio')} *</label>
                        <textarea
                            class="auth-textarea"
                            rows="5"
                            placeholder="Tell potential clients about your experience, approach, and what makes you unique..."
                            value=${formData.bio}
                            onChange=${(e) => handleChange('bio', e.target.value)}
                            required
                        ></textarea>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">${t('onboard.location')}</label>
                            <input
                                type="text"
                                class="auth-input"
                                placeholder="e.g., Zurich, Switzerland"
                                value=${formData.location}
                                onChange=${(e) => handleChange('location', e.target.value)}
                            />
                        </div>

                        <div class="form-group">
                            <label class="form-label">${t('onboard.hourlyRate')} *</label>
                            <input
                                type="number"
                                class="auth-input"
                                placeholder="150"
                                min="0"
                                step="1"
                                value=${formData.hourly_rate}
                                onChange=${(e) => handleChange('hourly_rate', e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">${t('onboard.specialties')} *</label>
                        <input
                            type="text"
                            class="auth-input"
                            placeholder="Life Coaching, Business Strategy, Leadership Development"
                            value=${formData.specialties}
                            onChange=${(e) => handleChange('specialties', e.target.value)}
                            required
                        />
                        <small class="form-hint">Separate multiple specialties with commas</small>
                    </div>

                    <div class="form-group">
                        <label class="form-label">${t('onboard.languages')} *</label>
                        <input
                            type="text"
                            class="auth-input"
                            placeholder="en, de, es"
                            value=${formData.languages}
                            onChange=${(e) => handleChange('languages', e.target.value)}
                            required
                        />
                        <small class="form-hint">Use language codes: en, de, es, fr, it</small>
                    </div>

                    <div class="form-group">
                        <label class="form-label">${t('onboard.sessionTypes')} *</label>
                        <div class="checkbox-group">
                            <label class="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked=${formData.session_types_online}
                                    onChange=${(e) => handleChange('session_types_online', e.target.checked)}
                                />
                                <span>💻 Online Sessions</span>
                            </label>
                            <label class="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked=${formData.session_types_onsite}
                                    onChange=${(e) => handleChange('session_types_onsite', e.target.checked)}
                                />
                                <span>📍 On-Site Sessions</span>
                            </label>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">${t('onboard.avatar')}</label>
                        <input
                            type="url"
                            class="auth-input"
                            placeholder="https://example.com/your-photo.jpg"
                            value=${formData.avatar_url}
                            onChange=${(e) => handleChange('avatar_url', e.target.value)}
                        />
                        <small class="form-hint">Leave blank to use a generated avatar</small>
                    </div>

                    <button class="auth-btn" type="submit" disabled=${loading}>
                        ${loading ? t('onboard.uploading') : t('onboard.submit')}
                    </button>
                </form>
            </div>
        </div>
    `;
};

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

                let errorMessage = '';
                const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

                switch(error.code) {
                    case 1: // PERMISSION_DENIED
                        if (isIOS || isSafari) {
                            errorMessage = 'Location access is blocked.\n\n';
                            errorMessage += 'To enable on iPad/iPhone:\n';
                            errorMessage += '1. Open Settings app\n';
                            errorMessage += '2. Go to Privacy & Security → Location Services\n';
                            errorMessage += '3. Enable Location Services\n';
                            errorMessage += '4. Scroll down to Safari → Allow "While Using"\n';
                            errorMessage += '5. Return here and try again\n\n';
                            errorMessage += 'Or just type your location manually!';
                        } else {
                            errorMessage = 'Location access was denied.\n\n';
                            errorMessage += 'To enable:\n';
                            errorMessage += '• Click the location icon in your browser address bar\n';
                            errorMessage += '• Select "Allow" for location access\n';
                            errorMessage += '• Try again\n\n';
                            errorMessage += 'Or just type your location manually!';
                        }
                        break;
                    case 2: // POSITION_UNAVAILABLE
                        errorMessage = 'Location information is unavailable. Please enter your location manually.';
                        break;
                    case 3: // TIMEOUT
                        errorMessage = 'Location request timed out. Please try again or enter your location manually.';
                        break;
                    default:
                        errorMessage = 'Unable to get your location. Please enter it manually.';
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
    // Map database fields to component fields
    const rating = coach.rating_average || coach.rating || 0;
    const reviewsCount = coach.rating_count || coach.reviews_count || 0;
    const location = coach.location || 'Remote';
    const languages = coach.languages || [];
    const specialties = coach.specialties || [];
    const bio = coach.bio || '';

    return html`
    <div class="coach-card">
            <img src=${coach.avatar_url} alt=${coach.full_name} class="coach-img" />
            <div class="coach-info">
                <div class="coach-header">
                    <div>
                        <h3 class="coach-name">${coach.full_name}</h3>
                        <div class="coach-title">${coach.title}</div>
                        <div class="coach-meta">
                            <span>📍 ${location}</span>
                            ${languages.length > 0 ? html`<span>💬 ${languages.join(', ')}</span>` : ''}
                        </div>
                    </div>
                    ${rating > 0 ? html`
                        <div class="coach-rating">
                            <div class="rating-badge">${rating.toFixed(1)}</div>
                            <div class="rating-text">${reviewsCount} ${t('coach.reviews')}</div>
                        </div>
                    ` : html`
                        <div class="coach-rating">
                            <div class="rating-badge">New</div>
                            <div class="rating-text">No reviews yet</div>
                        </div>
                    `}
                </div>
                <div class="coach-details">
                    <p>${bio}</p>
                    ${specialties.length > 0 ? html`
                        <div style=${{ marginTop: '8px' }}>
                            <strong>Specialties: </strong>
                            ${specialties.join(', ')}
                        </div>
                    ` : ''}
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

const CoachList = ({ searchFilters, session }) => {
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
            ${selectedCoach && html`<${CoachDetailModal} coach=${selectedCoach} session=${session} onClose=${() => setSelectedCoach(null)} />`}
        </div>
    `;
};

const BookingModal = ({ coach, session, onClose }) => {
    const [step, setStep] = useState(1); // 1: date/time, 2: confirm
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [duration, setDuration] = useState(60);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [loading, setLoading] = useState(false);
    const [notes, setNotes] = useState('');

    // Generate next 14 days
    const getNextDays = () => {
        const days = [];
        for (let i = 0; i < 14; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            days.push({
                value: date.toISOString().split('T')[0],
                label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
            });
        }
        return days;
    };

    const nextDays = getNextDays();

    useEffect(() => {
        if (selectedDate) {
            loadAvailableSlots();
        }
    }, [selectedDate, duration]);

    const loadAvailableSlots = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/coaches/${coach.id}/available-slots?date=${selectedDate}&duration=${duration}`);
            const data = await response.json();
            setAvailableSlots(data.data || []);
        } catch (error) {
            console.error('Failed to load available slots:', error);
            setAvailableSlots([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSlotSelect = (slot) => {
        setSelectedSlot(slot);
    };

    const handleConfirmBooking = async () => {
        if (!selectedSlot) return;

        setLoading(true);
        try {
            const bookingData = {
                coach_id: coach.id,
                start_time: selectedSlot.start_time,
                duration_minutes: duration,
                meeting_type: 'online',
                amount: (coach.hourly_rate * duration / 60).toFixed(2),
                currency: coach.currency || 'EUR',
                client_notes: notes,
                stripe_payment_intent_id: null // TODO: Integrate Stripe
            };

            const response = await fetch(`${API_BASE}/bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(bookingData)
            });

            const data = await response.json();

            if (response.ok) {
                alert('Booking created successfully! Payment integration coming soon.');
                onClose();
            } else {
                alert('Failed to create booking: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Booking error:', error);
            alert('Failed to create booking');
        } finally {
            setLoading(false);
        }
    };

    const totalPrice = (coach.hourly_rate * duration / 60).toFixed(2);

    return html`
        <div class="booking-modal" onClick=${onClose}>
            <div class="booking-content" onClick=${(e) => e.stopPropagation()}>
                <div class="booking-header">
                    <h2>Book a Session with ${coach.full_name}</h2>
                    <button class="modal-close-btn" onClick=${onClose}>×</button>
                </div>

                ${step === 1 && html`
                    <div class="booking-step">
                        <div class="form-group">
                            <label>Duration</label>
                            <select class="form-control" value=${duration} onChange=${(e) => setDuration(Number(e.target.value))}>
                                <option value="30">30 minutes - ${formatPrice((coach.hourly_rate * 0.5))}</option>
                                <option value="60">60 minutes - ${formatPrice(coach.hourly_rate)}</option>
                                <option value="90">90 minutes - ${formatPrice((coach.hourly_rate * 1.5))}</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>Select Date</label>
                            <div class="date-selector">
                                ${nextDays.map(day => html`
                                    <button
                                        key=${day.value}
                                        class="date-btn ${selectedDate === day.value ? 'selected' : ''}"
                                        onClick=${() => setSelectedDate(day.value)}
                                    >
                                        ${day.label}
                                    </button>
                                `)}
                            </div>
                        </div>

                        ${selectedDate && html`
                            <div class="form-group">
                                <label>Available Time Slots</label>
                                ${loading && html`<div class="spinner"></div>`}
                                ${!loading && availableSlots.length === 0 && html`
                                    <div class="empty-state-subtext">No available slots for this date</div>
                                `}
                                ${!loading && availableSlots.length > 0 && html`
                                    <div class="time-slot-grid">
                                        ${availableSlots.map(slot => {
                                            const time = new Date(slot.start_time).toLocaleTimeString('en-US', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: false
                                            });
                                            return html`
                                                <button
                                                    key=${slot.start_time}
                                                    class="time-slot-btn ${selectedSlot?.start_time === slot.start_time ? 'selected' : ''}"
                                                    onClick=${() => handleSlotSelect(slot)}
                                                >
                                                    ${time}
                                                </button>
                                            `;
                                        })}
                                    </div>
                                `}
                            </div>
                        `}

                        ${selectedSlot && html`
                            <div class="form-group">
                                <label>Notes (Optional)</label>
                                <textarea
                                    class="form-control"
                                    rows="3"
                                    placeholder="Any specific topics or questions you'd like to discuss?"
                                    value=${notes}
                                    onInput=${(e) => setNotes(e.target.value)}
                                ></textarea>
                            </div>

                            <div class="booking-summary">
                                <h3>Booking Summary</h3>
                                <div class="summary-row">
                                    <span>Coach:</span>
                                    <span>${coach.full_name}</span>
                                </div>
                                <div class="summary-row">
                                    <span>Date:</span>
                                    <span>${new Date(selectedSlot.start_time).toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}</span>
                                </div>
                                <div class="summary-row">
                                    <span>Time:</span>
                                    <span>${new Date(selectedSlot.start_time).toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}</span>
                                </div>
                                <div class="summary-row">
                                    <span>Duration:</span>
                                    <span>${duration} minutes</span>
                                </div>
                                <div class="summary-row summary-total">
                                    <span>Total:</span>
                                    <span>${formatPrice(totalPrice)}</span>
                                </div>
                            </div>

                            <div style=${{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                                <button class="btn-secondary" onClick=${onClose} style=${{ flex: 1 }}>Cancel</button>
                                <button
                                    class="btn-primary"
                                    onClick=${handleConfirmBooking}
                                    disabled=${loading}
                                    style=${{ flex: 1 }}
                                >
                                    ${loading ? 'Processing...' : 'Confirm Booking'}
                                </button>
                            </div>
                        `}
                    </div>
                `}
            </div>
        </div>
    `;
};

const CoachDetailModal = ({ coach, onClose, session }) => {
    console.log('Opening coach detail modal for', coach.full_name);
    const [showBooking, setShowBooking] = useState(false);

    // Map database fields to component fields
    const rating = coach.rating_average || coach.rating || 0;
    const reviewsCount = coach.rating_count || coach.reviews_count || 0;
    const location = coach.location || 'Remote';
    const languages = coach.languages || [];
    const specialties = coach.specialties || [];
    const bio = coach.bio || '';

    const handleBookClick = () => {
        if (!session) {
            alert('Please sign in to book a session');
            window.location.hash = '#login';
            return;
        }
        setShowBooking(true);
    };

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
                            <p class="coach-detail-location">📍 ${location}</p>
                        </div>
                        <button class="btn-book-prominent" onClick=${handleBookClick}>
                            ${t('coach.book')}
                        </button>
                    </div>

                    <div class="coach-detail-stats">
                        <div class="coach-detail-stat">
                            <div class="coach-detail-stat-value">${rating > 0 ? rating.toFixed(1) : 'New'}</div>
                            <div class="coach-detail-stat-label">Rating</div>
                        </div>
                        <div class="coach-detail-stat">
                            <div class="coach-detail-stat-value">${reviewsCount}</div>
                            <div class="coach-detail-stat-label">Reviews</div>
                        </div>
                        <div class="coach-detail-stat">
                            <div class="coach-detail-stat-value">${formatPrice(coach.hourly_rate)}</div>
                            <div class="coach-detail-stat-label">Per Hour</div>
                        </div>
                    </div>

                    <div class="coach-detail-section">
                        <h3 class="coach-detail-section-title">About</h3>
                        <p>${bio || 'No bio available.'}</p>
                    </div>

                    ${specialties.length > 0 ? html`
                        <div class="coach-detail-section">
                            <h3 class="coach-detail-section-title">Specialties</h3>
                            ${specialties.map(s => html`<span key=${s} class="badge badge-petrol">${s}</span>`)}
                        </div>
                    ` : ''}

                    ${languages.length > 0 ? html`
                        <div class="coach-detail-section">
                            <h3 class="coach-detail-section-title">Languages</h3>
                            ${languages.map(l => html`<span key=${l} class="badge badge-petrol">${l}</span>`)}
                        </div>
                    ` : ''}
                </div>
            </div>
            ${showBooking && html`
                <${BookingModal}
                    coach=${coach}
                    session=${session}
                    onClose=${() => setShowBooking(false)}
                />
            `}
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

    const userType = session.user?.user_metadata?.user_type || 'client';
    console.log('Dashboard loaded successfully for user:', session.user.email, 'User Type:', userType);

    return html`
    <div class="dashboard-container">
            <div class="dashboard-header">
                <h2 class="section-title">${t('dashboard.welcome')}, ${session.user.email}</h2>
                <div class="badge badge-petrol">${userType === 'client' ? 'Client' : userType === 'coach' ? 'Coach' : 'Business'}</div>
            </div>

            <div class="dashboard-tabs">
                <button class="tab-btn ${activeTab === 'overview' ? 'active' : ''}" onClick=${() => setActiveTab('overview')}>
                    ${t('dashboard.overview')}
                </button>
                <button class="tab-btn ${activeTab === 'bookings' ? 'active' : ''}" onClick=${() => setActiveTab('bookings')}>
                    ${t('dashboard.bookings')}
                </button>
                ${userType === 'coach' && html`
                    <button class="tab-btn ${activeTab === 'availability' ? 'active' : ''}" onClick=${() => setActiveTab('availability')}>
                        Availability
                    </button>
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

            ${activeTab === 'overview' && html`<${DashboardOverview} userType=${userType} />`}
            ${activeTab === 'bookings' && html`<${DashboardBookings} session=${session} userType=${userType} />`}
            ${activeTab === 'availability' && userType === 'coach' && html`<${DashboardAvailability} session=${session} />`}
            ${activeTab === 'articles' && userType === 'coach' && html`<${DashboardArticles} session=${session} />`}
            ${activeTab === 'probono' && userType === 'coach' && html`<${DashboardProBono} session=${session} />`}
            ${activeTab === 'profile' && html`<${DashboardProfile} session=${session} userType=${userType} />`}
        </div>
    `;
};

const DashboardOverview = ({ userType }) => {
    console.log('Dashboard overview for user type:', userType);

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
                ${userType === 'coach' && html`
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

const DashboardBookings = ({ session, userType }) => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    useEffect(() => {
        loadBookings();
    }, []);

    const loadBookings = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/bookings`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            const data = await response.json();
            setBookings(data.data || []);
        } catch (error) {
            console.error('Failed to load bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelBooking = async (bookingId) => {
        if (!confirm('Are you sure you want to cancel this booking?')) {
            return;
        }

        const reason = prompt('Please provide a reason for cancellation (optional):');

        try {
            const response = await fetch(`${API_BASE}/bookings/${bookingId}/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ cancellation_reason: reason || 'No reason provided' })
            });

            if (response.ok) {
                setMessage('Booking cancelled successfully');
                loadBookings();
                setTimeout(() => setMessage(''), 3000);
            } else {
                const data = await response.json();
                alert('Failed to cancel booking: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Cancel booking error:', error);
            alert('Failed to cancel booking');
        }
    };

    const getStatusClass = (status) => {
        const classes = {
            'pending': 'booking-status pending',
            'confirmed': 'booking-status confirmed',
            'completed': 'booking-status completed',
            'cancelled': 'booking-status cancelled'
        };
        return classes[status] || 'booking-status';
    };

    const formatDateTime = (dateTimeStr) => {
        const date = new Date(dateTimeStr);
        return {
            date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
            time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
    };

    if (loading) {
        return html`
            <div class="spinner"></div>
        `;
    }

    if (bookings.length === 0) {
        return html`
            <div>
                <div class="empty-state">
                    <div class="empty-state-icon">📅</div>
                    <div class="empty-state-text">No bookings yet</div>
                    <div class="empty-state-subtext">
                        ${userType === 'coach'
                            ? 'Bookings from clients will appear here.'
                            : 'Browse coaches and book your first session!'}
                    </div>
                </div>
            </div>
        `;
    }

    return html`
        <div>
            ${message && html`
                <div class="success-message" style=${{ marginBottom: '20px', padding: '12px', background: '#d4edda', color: '#155724', borderRadius: '4px' }}>
                    ${message}
                </div>
            `}

            <div class="bookings-list">
                ${bookings.map(booking => {
                    const dt = formatDateTime(booking.start_time);
                    const canCancel = booking.status === 'pending' || booking.status === 'confirmed';

                    return html`
                        <div key=${booking.id} class="booking-card">
                            <div class="booking-card-header">
                                <div>
                                    <h3>${userType === 'coach' ? 'Client Booking' : `Session with Coach`}</h3>
                                    <div class=${getStatusClass(booking.status)}>
                                        ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                    </div>
                                </div>
                                <div class="booking-card-price">
                                    ${formatPrice(booking.amount)}
                                </div>
                            </div>

                            <div class="booking-card-body">
                                <div class="booking-detail-row">
                                    <span class="booking-detail-label">📅 Date:</span>
                                    <span>${dt.date}</span>
                                </div>
                                <div class="booking-detail-row">
                                    <span class="booking-detail-label">🕐 Time:</span>
                                    <span>${dt.time}</span>
                                </div>
                                <div class="booking-detail-row">
                                    <span class="booking-detail-label">⏱️ Duration:</span>
                                    <span>${booking.duration_minutes} minutes</span>
                                </div>
                                <div class="booking-detail-row">
                                    <span class="booking-detail-label">📍 Type:</span>
                                    <span>${booking.meeting_type === 'online' ? 'Online' : 'On-site'}</span>
                                </div>

                                ${booking.meeting_link && html`
                                    <div class="booking-detail-row">
                                        <span class="booking-detail-label">🔗 Meeting Link:</span>
                                        <a href=${booking.meeting_link} target="_blank" class="btn-small btn-secondary">
                                            Join Meeting
                                        </a>
                                    </div>
                                `}

                                ${booking.client_notes && userType === 'coach' && html`
                                    <div class="booking-detail-row">
                                        <span class="booking-detail-label">📝 Client Notes:</span>
                                        <span>${booking.client_notes}</span>
                                    </div>
                                `}

                                ${booking.coach_notes && userType === 'client' && html`
                                    <div class="booking-detail-row">
                                        <span class="booking-detail-label">📝 Coach Notes:</span>
                                        <span>${booking.coach_notes}</span>
                                    </div>
                                `}
                            </div>

                            <div class="booking-card-actions">
                                ${canCancel && html`
                                    <button
                                        class="btn-small btn-secondary"
                                        onClick=${() => handleCancelBooking(booking.id)}
                                    >
                                        Cancel Booking
                                    </button>
                                `}
                                ${booking.status === 'cancelled' && booking.cancellation_reason && html`
                                    <div class="booking-detail-row" style=${{ fontSize: '14px', color: '#666' }}>
                                        <span>Cancellation reason: ${booking.cancellation_reason}</span>
                                    </div>
                                `}
                            </div>
                        </div>
                    `;
                })}
            </div>
        </div>
    `;
};

const DashboardAvailability = ({ session }) => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [weeklySlots, setWeeklySlots] = useState([]);

    const daysOfWeek = [
        { id: 0, name: 'Sunday', short: 'Sun' },
        { id: 1, name: 'Monday', short: 'Mon' },
        { id: 2, name: 'Tuesday', short: 'Tue' },
        { id: 3, name: 'Wednesday', short: 'Wed' },
        { id: 4, name: 'Thursday', short: 'Thu' },
        { id: 5, name: 'Friday', short: 'Fri' },
        { id: 6, name: 'Saturday', short: 'Sat' }
    ];

    useEffect(() => {
        loadAvailability();
    }, []);

    const loadAvailability = async () => {
        try {
            const response = await fetch(`${API_BASE}/coaches/${session.user.id}/availability`);
            const data = await response.json();

            console.log('Availability API response:', data);

            // Ensure we always set an array
            if (data.data && Array.isArray(data.data)) {
                setWeeklySlots(data.data);
            } else {
                setWeeklySlots([]);
            }
        } catch (error) {
            console.error('Failed to load availability:', error);
            setWeeklySlots([]); // Ensure it's an array even on error
        }
    };

    const getSlotsForDay = (dayId) => {
        // Safety check to ensure weeklySlots is an array
        if (!Array.isArray(weeklySlots)) {
            console.error('weeklySlots is not an array:', weeklySlots);
            return [];
        }
        return weeklySlots.filter(slot => slot.day_of_week === dayId);
    };

    const addSlot = (dayId) => {
        const newSlot = {
            day_of_week: dayId,
            start_time: '09:00',
            end_time: '17:00',
            is_active: true,
            temp_id: Date.now() // Temporary ID for local state
        };
        setWeeklySlots([...weeklySlots, newSlot]);
    };

    const removeSlot = (tempId, slotId) => {
        setWeeklySlots(weeklySlots.filter(slot =>
            tempId ? slot.temp_id !== tempId : slot.id !== slotId
        ));
    };

    const updateSlot = (tempId, slotId, field, value) => {
        setWeeklySlots(weeklySlots.map(slot => {
            if ((tempId && slot.temp_id === tempId) || (!tempId && slot.id === slotId)) {
                return { ...slot, [field]: value };
            }
            return slot;
        }));
    };

    const saveAvailability = async () => {
        setLoading(true);
        setMessage('');

        try {
            const slots = weeklySlots.map(slot => ({
                day_of_week: slot.day_of_week,
                start_time: slot.start_time,
                end_time: slot.end_time,
                is_active: slot.is_active !== false
            }));

            const response = await fetch(`${API_BASE}/coaches/me/availability`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ slots })
            });

            if (response.ok) {
                setMessage('Availability updated successfully!');
                await loadAvailability(); // Reload to get IDs
                setTimeout(() => setMessage(''), 3000);
            } else {
                const error = await response.json();
                setMessage('Error: ' + (error.error || 'Failed to update availability'));
            }
        } catch (error) {
            console.error('Save error:', error);
            setMessage('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return html`
        <div>
            <div style=${{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3>Weekly Availability</h3>
                <button class="btn-primary" onClick=${saveAvailability} disabled=${loading}>
                    ${loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            ${message && html`
                <div class="message" style=${{
                    padding: '12px',
                    borderRadius: '4px',
                    marginBottom: '20px',
                    background: message.includes('Error') ? '#fee' : '#efe',
                    color: message.includes('Error') ? '#c00' : '#060'
                }}>
                    ${message}
                </div>
            `}

            <div class="availability-calendar">
                ${daysOfWeek.map(day => html`
                    <div key=${day.id} class="availability-day">
                        <div class="availability-day-header">
                            <strong>${day.name}</strong>
                            <button
                                class="btn-small btn-secondary"
                                onClick=${() => addSlot(day.id)}
                                style=${{ fontSize: '12px', padding: '4px 8px' }}
                            >
                                + Add Time
                            </button>
                        </div>

                        <div class="availability-slots">
                            ${getSlotsForDay(day.id).length === 0 && html`
                                <div class="availability-empty">No availability set</div>
                            `}

                            ${getSlotsForDay(day.id).map(slot => html`
                                <div key=${slot.id || slot.temp_id} class="availability-slot">
                                    <input
                                        type="time"
                                        class="time-input"
                                        value=${slot.start_time}
                                        onChange=${(e) => updateSlot(slot.temp_id, slot.id, 'start_time', e.target.value)}
                                    />
                                    <span>to</span>
                                    <input
                                        type="time"
                                        class="time-input"
                                        value=${slot.end_time}
                                        onChange=${(e) => updateSlot(slot.temp_id, slot.id, 'end_time', e.target.value)}
                                    />
                                    <button
                                        class="btn-remove"
                                        onClick=${() => removeSlot(slot.temp_id, slot.id)}
                                        style=${{
                                            background: '#fee',
                                            color: '#c00',
                                            border: '1px solid #fcc',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            fontSize: '12px'
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            `)}
                        </div>
                    </div>
                `)}
            </div>

            <div class="form-hint" style=${{ marginTop: '20px', padding: '12px', background: '#f0f8ff', borderRadius: '4px' }}>
                💡 <strong>Tip:</strong> Set your regular weekly schedule here. You can add multiple time slots for each day.
                Clients will see available booking slots based on this schedule.
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

const DashboardProfile = ({ session, userType }) => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [uploading, setUploading] = useState(false);
    const [formData, setFormData] = useState({
        full_name: session.user.user_metadata?.full_name || '',
        avatar_url: '',
        banner_url: '',
        title: '',
        bio: '',
        location: '',
        hourly_rate: '',
        currency: 'EUR',
        specialties: '',
        languages: '',
        session_types_online: true,
        session_types_onsite: false
    });

    // Load coach profile if coach
    useEffect(() => {
        if (userType === 'coach') {
            loadCoachProfile();
        }
    }, [userType]);

    const loadCoachProfile = async () => {
        try {
            const response = await fetch(`${API_BASE}/coaches/${session.user.id}`);
            const data = await response.json();

            if (data.data) {
                const coach = data.data;
                setFormData({
                    full_name: coach.full_name || '',
                    avatar_url: coach.avatar_url || '',
                    banner_url: coach.banner_url || '',
                    title: coach.title || '',
                    bio: coach.bio || '',
                    location: coach.location || '',
                    hourly_rate: coach.hourly_rate || '',
                    currency: coach.currency || 'EUR',
                    specialties: coach.specialties?.join(', ') || '',
                    languages: coach.languages?.join(', ') || '',
                    session_types_online: coach.session_types?.includes('online') || true,
                    session_types_onsite: coach.session_types?.includes('onsite') || false
                });
            }
        } catch (error) {
            console.error('Failed to load coach profile:', error);
        }
    };

    const handleImageUpload = async (event, fieldName = 'avatar_url') => {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setMessage('Error: Please select an image file');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setMessage('Error: Image must be less than 5MB');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        setUploading(true);
        setMessage('Uploading image...');

        try {
            // Create unique file name
            const fileExt = file.name.split('.').pop();
            const fileName = `${session.user.id}-${fieldName}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            console.log('Uploading to Supabase Storage:', filePath);

            // Upload to Supabase Storage
            const { data, error } = await supabaseClient.storage
                .from('profile-images')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error('Upload error:', error);

                // Check if it's a bucket not found error
                if (error.message && error.message.includes('Bucket not found')) {
                    throw new Error('Storage bucket "profile-images" does not exist. Please create it in Supabase Dashboard → Storage → New Bucket. See SUPABASE_SETUP_GUIDE.md for instructions.');
                }

                throw error;
            }

            console.log('Upload successful:', data);

            // Get public URL
            const { data: { publicUrl } } = supabaseClient.storage
                .from('profile-images')
                .getPublicUrl(filePath);

            console.log('Public URL:', publicUrl);

            // Update form data
            setFormData({ ...formData, [fieldName]: publicUrl });
            setMessage('Image uploaded successfully!');
            setTimeout(() => setMessage(''), 3000);

        } catch (error) {
            console.error('Failed to upload image:', error);
            setMessage('Error: ' + (error.message || 'Failed to upload image'));
            setTimeout(() => setMessage(''), 5000);
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setMessage('');

        try {
            const sessionTypesArray = [];
            if (formData.session_types_online) sessionTypesArray.push('online');
            if (formData.session_types_onsite) sessionTypesArray.push('onsite');

            const profileData = {
                full_name: formData.full_name,
                avatar_url: formData.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.email}`,
                onboarding_completed: true
            };

            // Add coach-specific fields if coach
            if (userType === 'coach') {
                Object.assign(profileData, {
                    title: formData.title,
                    bio: formData.bio,
                    banner_url: formData.banner_url || '',
                    location: formData.location,
                    hourly_rate: parseFloat(formData.hourly_rate) || 0,
                    currency: formData.currency,
                    specialties: formData.specialties.split(',').map(s => s.trim()).filter(Boolean),
                    languages: formData.languages.split(',').map(s => s.trim()).filter(Boolean),
                    session_types: sessionTypesArray
                });
            }

            const response = await fetch(`${API_BASE}/coaches`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(profileData)
            });

            if (response.ok) {
                setMessage('Profile updated successfully!');
                setTimeout(() => setMessage(''), 3000);
            } else {
                const error = await response.json();
                setMessage('Error: ' + (error.error || 'Failed to update profile'));
            }
        } catch (error) {
            console.error('Save error:', error);
            setMessage('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return html`
        <div>
            <h3>${t('dashboard.profile')}</h3>

            ${message && html`
                <div class="message ${message.includes('Error') ? 'error' : 'success'}" style=${{
                    padding: '12px',
                    borderRadius: '4px',
                    marginBottom: '20px',
                    background: message.includes('Error') ? '#fee' : '#efe',
                    color: message.includes('Error') ? '#c00' : '#060'
                }}>
                    ${message}
                </div>
            `}

            <div style=${{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', marginTop: '20px' }}>

                <!-- Avatar Upload -->
                <div>
                    <label class="filter-label">Profile Picture</label>
                    <div style=${{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        ${formData.avatar_url && html`
                            <img src=${formData.avatar_url} alt="Avatar" style=${{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '2px solid var(--border-color)'
                            }} />
                        `}
                        <div style=${{ flex: 1 }}>
                            <div style=${{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                <label class="btn-secondary" style=${{ cursor: 'pointer', padding: '8px 16px', margin: 0 }}>
                                    ${uploading ? 'Uploading...' : '📤 Upload Image'}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        style=${{ display: 'none' }}
                                        onChange=${(e) => handleImageUpload(e, 'avatar_url')}
                                        disabled=${uploading}
                                    />
                                </label>
                            </div>
                            <input
                                type="url"
                                class="filter-input"
                                placeholder="Or enter image URL: https://example.com/avatar.jpg"
                                value=${formData.avatar_url}
                                onChange=${(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                            />
                            <div class="form-hint">Upload an image or enter a URL. Leave empty for auto-generated avatar. Max 5MB.</div>
                        </div>
                    </div>
                </div>

                <!-- Banner Upload (Coach Only) -->
                ${userType === 'coach' && html`
                    <div>
                        <label class="filter-label">Profile Banner</label>
                        <div style=${{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            ${formData.banner_url && html`
                                <img src=${formData.banner_url} alt="Banner" style=${{
                                    width: '100%',
                                    height: '200px',
                                    objectFit: 'cover',
                                    borderRadius: '8px',
                                    border: '2px solid var(--border-color)'
                                }} />
                            `}
                            <div style=${{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                <label class="btn-secondary" style=${{ cursor: 'pointer', padding: '8px 16px', margin: 0 }}>
                                    ${uploading ? 'Uploading...' : '📤 Upload Banner'}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        style=${{ display: 'none' }}
                                        onChange=${(e) => handleImageUpload(e, 'banner_url')}
                                        disabled=${uploading}
                                    />
                                </label>
                                ${formData.banner_url && html`
                                    <button
                                        class="btn-secondary"
                                        onClick=${() => setFormData({ ...formData, banner_url: '' })}
                                        style=${{ padding: '8px 16px' }}
                                    >
                                        🗑️ Remove Banner
                                    </button>
                                `}
                            </div>
                            <input
                                type="url"
                                class="filter-input"
                                placeholder="Or enter banner image URL"
                                value=${formData.banner_url}
                                onChange=${(e) => setFormData({ ...formData, banner_url: e.target.value })}
                            />
                            <div class="form-hint">Recommended size: 1200x300px. Max 5MB.</div>
                        </div>
                    </div>
                `}

                <!-- Basic Info -->
                <div>
                    <label class="filter-label">Full Name *</label>
                    <input
                        type="text"
                        class="filter-input"
                        value=${formData.full_name}
                        onChange=${(e) => setFormData({ ...formData, full_name: e.target.value })}
                        required
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

                <!-- Coach-specific fields -->
                ${userType === 'coach' && html`
                    <div>
                        <label class="filter-label">Professional Title *</label>
                        <input
                            type="text"
                            class="filter-input"
                            placeholder="e.g., Executive Leadership Coach"
                            value=${formData.title}
                            onChange=${(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label class="filter-label">Bio</label>
                        <textarea
                            class="filter-input"
                            placeholder="Tell clients about your expertise and coaching approach..."
                            value=${formData.bio}
                            onChange=${(e) => setFormData({ ...formData, bio: e.target.value })}
                            style=${{ minHeight: '120px', resize: 'vertical' }}
                        />
                    </div>

                    <div class="form-row">
                        <div style=${{ flex: 1 }}>
                            <label class="filter-label">Location</label>
                            <input
                                type="text"
                                class="filter-input"
                                placeholder="City, Country"
                                value=${formData.location}
                                onChange=${(e) => setFormData({ ...formData, location: e.target.value })}
                            />
                        </div>
                        <div style=${{ width: '200px' }}>
                            <label class="filter-label">Hourly Rate (€)</label>
                            <input
                                type="number"
                                class="filter-input"
                                placeholder="100"
                                value=${formData.hourly_rate}
                                onChange=${(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label class="filter-label">Specialties</label>
                        <input
                            type="text"
                            class="filter-input"
                            placeholder="Leadership, Career Transition, Executive Coaching"
                            value=${formData.specialties}
                            onChange=${(e) => setFormData({ ...formData, specialties: e.target.value })}
                        />
                        <div class="form-hint">Separate with commas</div>
                    </div>

                    <div>
                        <label class="filter-label">Languages</label>
                        <input
                            type="text"
                            class="filter-input"
                            placeholder="en, de, es"
                            value=${formData.languages}
                            onChange=${(e) => setFormData({ ...formData, languages: e.target.value })}
                        />
                        <div class="form-hint">Use language codes: en, de, es, fr, it</div>
                    </div>

                    <div>
                        <label class="filter-label">Session Types</label>
                        <div class="checkbox-group">
                            <label class="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked=${formData.session_types_online}
                                    onChange=${(e) => setFormData({ ...formData, session_types_online: e.target.checked })}
                                />
                                <span>💻 Online Sessions</span>
                            </label>
                            <label class="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked=${formData.session_types_onsite}
                                    onChange=${(e) => setFormData({ ...formData, session_types_onsite: e.target.checked })}
                                />
                                <span>📍 On-site Sessions</span>
                            </label>
                        </div>
                    </div>
                `}

                <button
                    class="btn-primary"
                    onClick=${handleSave}
                    disabled=${loading}
                    style=${{ marginTop: '10px' }}
                >
                    ${loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    `;
};

const Home = ({ session }) => {
    const [searchFilters, setSearchFilters] = useState(null);

    const handleSearch = (filters) => {
        console.log('Home: Search filters received:', filters);
        setSearchFilters(filters);
    };

    return html`
    <div>
            <${Hero} onSearch=${handleSearch} />
            <${CoachList} searchFilters=${searchFilters} session=${session} />
        </div>
    `;
};

// =====================================================
// REVIEW & RATING SYSTEM
// =====================================================

const StarRating = ({ rating, size = 'medium', interactive = false, onChange }) => {
    const [hoverRating, setHoverRating] = useState(0);
    const [selectedRating, setSelectedRating] = useState(rating || 0);

    const sizes = {
        small: '16px',
        medium: '20px',
        large: '24px'
    };

    const handleClick = (value) => {
        if (interactive) {
            setSelectedRating(value);
            if (onChange) onChange(value);
        }
    };

    const displayRating = interactive ? (hoverRating || selectedRating) : rating;

    return html`
        <div style=${{ display: 'flex', gap: '4px' }}>
            ${[1, 2, 3, 4, 5].map(star => html`
                <span
                    key=${star}
                    onClick=${() => handleClick(star)}
                    onMouseEnter=${() => interactive && setHoverRating(star)}
                    onMouseLeave=${() => interactive && setHoverRating(0)}
                    style=${{
                        fontSize: sizes[size],
                        color: star <= displayRating ? '#FFB800' : '#E0E0E0',
                        cursor: interactive ? 'pointer' : 'default',
                        transition: 'color 0.2s'
                    }}
                >
                    ★
                </span>
            `)}
        </div>
    `;
};

const ReviewCard = ({ review, isCoach = false, onRespond }) => {
    const [showResponseForm, setShowResponseForm] = useState(false);
    const [response, setResponse] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmitResponse = async () => {
        if (!response.trim()) return;

        setSubmitting(true);
        if (onRespond) {
            await onRespond(review.id, response);
        }
        setSubmitting(false);
        setShowResponseForm(false);
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return html`
        <div class="review-card" style=${{
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '16px',
            background: 'white'
        }}>
            <div style=${{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div>
                    <div style=${{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <${StarRating} rating=${review.rating} size="medium" />
                        ${review.is_verified_booking && html`
                            <span style=${{
                                background: '#E8F5E9',
                                color: '#2E7D32',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '600'
                            }}>
                                ✓ Verified Booking
                            </span>
                        `}
                    </div>
                    ${review.title && html`
                        <h4 style=${{ margin: '0 0 8px 0', fontSize: '16px' }}>${review.title}</h4>
                    `}
                </div>
                <span style=${{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    ${formatDate(review.created_at)}
                </span>
            </div>

            <p style=${{ margin: '0 0 16px 0', lineHeight: '1.6' }}>
                ${review.content}
            </p>

            ${review.coach_response && html`
                <div style=${{
                    background: '#F5F5F5',
                    padding: '12px 16px',
                    borderRadius: '6px',
                    borderLeft: '3px solid var(--primary-petrol)',
                    marginTop: '12px'
                }}>
                    <div style=${{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <strong style=${{ fontSize: '14px' }}>Coach Response</strong>
                        <span style=${{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            ${formatDate(review.coach_responded_at)}
                        </span>
                    </div>
                    <p style=${{ margin: 0, fontSize: '14px', lineHeight: '1.6' }}>
                        ${review.coach_response}
                    </p>
                </div>
            `}

            ${isCoach && !review.coach_response && html`
                <div>
                    ${!showResponseForm ? html`
                        <button
                            class="btn-secondary"
                            onClick=${() => setShowResponseForm(true)}
                            style=${{ padding: '6px 12px', fontSize: '14px' }}
                        >
                            Respond to Review
                        </button>
                    ` : html`
                        <div style=${{ marginTop: '12px' }}>
                            <textarea
                                class="form-control"
                                rows="3"
                                placeholder="Write your response..."
                                value=${response}
                                onInput=${(e) => setResponse(e.target.value)}
                                style=${{ marginBottom: '8px' }}
                            ></textarea>
                            <div style=${{ display: 'flex', gap: '8px' }}>
                                <button
                                    class="btn-primary"
                                    onClick=${handleSubmitResponse}
                                    disabled=${submitting || !response.trim()}
                                >
                                    ${submitting ? 'Submitting...' : 'Submit Response'}
                                </button>
                                <button
                                    class="btn-secondary"
                                    onClick=${() => setShowResponseForm(false)}
                                    disabled=${submitting}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    `}
                </div>
            `}
        </div>
    `;
};

const WriteReviewModal = ({ booking, onClose, onSubmit }) => {
    const [rating, setRating] = useState(5);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!content.trim()) {
            alert('Please write your review');
            return;
        }

        setSubmitting(true);
        if (onSubmit) {
            await onSubmit({ rating, title, content });
        }
        setSubmitting(false);
    };

    return html`
        <div class="booking-modal" onClick=${onClose}>
            <div class="booking-content" onClick=${(e) => e.stopPropagation()} style=${{ maxWidth: '600px' }}>
                <div class="booking-header">
                    <h2>Write a Review</h2>
                    <button class="modal-close-btn" onClick=${onClose}>×</button>
                </div>

                <div style=${{ padding: '20px' }}>
                    <div class="form-group">
                        <label>Your Rating *</label>
                        <${StarRating} rating=${rating} size="large" interactive=${true} onChange=${setRating} />
                    </div>

                    <div class="form-group">
                        <label>Review Title (Optional)</label>
                        <input
                            type="text"
                            class="form-control"
                            placeholder="e.g., Great coaching session!"
                            value=${title}
                            onInput=${(e) => setTitle(e.target.value)}
                            maxLength="100"
                        />
                    </div>

                    <div class="form-group">
                        <label>Your Review *</label>
                        <textarea
                            class="form-control"
                            rows="6"
                            placeholder="Share your experience with this coach..."
                            value=${content}
                            onInput=${(e) => setContent(e.target.value)}
                            required
                        ></textarea>
                        <div class="form-hint">${content.length}/1000 characters</div>
                    </div>

                    <div style=${{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                        <button
                            class="btn-primary"
                            onClick=${handleSubmit}
                            disabled=${submitting || !content.trim()}
                            style=${{ flex: 1 }}
                        >
                            ${submitting ? 'Submitting...' : 'Submit Review'}
                        </button>
                        <button
                            class="btn-secondary"
                            onClick=${onClose}
                            disabled=${submitting}
                            style=${{ flex: 1 }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
};

// =====================================================
// MESSAGING SYSTEM
// =====================================================

const MessagingInbox = ({ session }) => {
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadConversations();
    }, []);

    const loadConversations = async () => {
        try {
            const response = await fetch(`${API_BASE}/conversations`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            const data = await response.json();
            setConversations(data.data || []);
        } catch (error) {
            console.error('Failed to load conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return html`<div class="spinner"></div>`;
    }

    if (selectedConversation) {
        return html`
            <${ConversationView}
                conversation=${selectedConversation}
                session=${session}
                onBack=${() => setSelectedConversation(null)}
            />
        `;
    }

    return html`
        <div>
            <h3 style=${{ marginBottom: '20px' }}>Messages</h3>

            ${conversations.length === 0 ? html`
                <div class="empty-state">
                    <div class="empty-state-icon">💬</div>
                    <div class="empty-state-text">No messages yet</div>
                    <div class="empty-state-subtext">Start a conversation with a coach!</div>
                </div>
            ` : html`
                <div class="conversations-list">
                    ${conversations.map(conv => html`
                        <div
                            key=${conv.id}
                            class="conversation-item"
                            onClick=${() => setSelectedConversation(conv)}
                            style=${{
                                padding: '16px',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                marginBottom: '12px',
                                cursor: 'pointer',
                                background: conv.unread_count > 0 ? '#F0F9FA' : 'white',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style=${{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <strong>${conv.other_participant_name}</strong>
                                <span style=${{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    ${new Date(conv.last_message_at).toLocaleDateString()}
                                </span>
                            </div>
                            <div style=${{ fontSize: '14px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                ${conv.last_message_preview}
                            </div>
                            ${conv.unread_count > 0 && html`
                                <span style=${{
                                    display: 'inline-block',
                                    background: 'var(--primary-petrol)',
                                    color: 'white',
                                    borderRadius: '12px',
                                    padding: '2px 8px',
                                    fontSize: '12px',
                                    marginTop: '8px'
                                }}>
                                    ${conv.unread_count} new
                                </span>
                            `}
                        </div>
                    `)}
                </div>
            `}
        </div>
    `;
};

const ConversationView = ({ conversation, session, onBack }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        loadMessages();
        const interval = setInterval(loadMessages, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, [conversation.id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadMessages = async () => {
        try {
            const response = await fetch(`${API_BASE}/conversations/${conversation.id}/messages`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            const data = await response.json();
            setMessages(data.data || []);
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    };

    const handleSend = async () => {
        if (!newMessage.trim()) return;

        setSending(true);
        try {
            const response = await fetch(`${API_BASE}/conversations/${conversation.id}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ content: newMessage })
            });

            if (response.ok) {
                setNewMessage('');
                await loadMessages();
            }
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setSending(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return html`
        <div style=${{ display: 'flex', flexDirection: 'column', height: '600px' }}>
            <div style=${{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                borderBottom: '1px solid var(--border-color)',
                background: 'white'
            }}>
                <button class="btn-secondary" onClick=${onBack} style=${{ padding: '6px 12px' }}>
                    ← Back
                </button>
                <strong>${conversation.other_participant_name}</strong>
            </div>

            <div style=${{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                background: '#F5F5F5'
            }}>
                ${messages.map(msg => {
                    const isOwn = msg.sender_id === session.user.id;
                    return html`
                        <div
                            key=${msg.id}
                            style=${{
                                display: 'flex',
                                justifyContent: isOwn ? 'flex-end' : 'flex-start',
                                marginBottom: '12px'
                            }}
                        >
                            <div style=${{
                                maxWidth: '70%',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                background: isOwn ? 'var(--primary-petrol)' : 'white',
                                color: isOwn ? 'white' : 'var(--text-main)',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                            }}>
                                <div style=${{ fontSize: '14px', lineHeight: '1.5' }}>${msg.content}</div>
                                <div style=${{
                                    fontSize: '11px',
                                    marginTop: '4px',
                                    opacity: 0.7
                                }}>
                                    ${new Date(msg.created_at).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            </div>
                        </div>
                    `;
                })}
                <div ref=${messagesEndRef} />
            </div>

            <div style=${{
                padding: '16px',
                borderTop: '1px solid var(--border-color)',
                background: 'white'
            }}>
                <div style=${{ display: 'flex', gap: '12px' }}>
                    <textarea
                        class="form-control"
                        rows="2"
                        placeholder="Type your message..."
                        value=${newMessage}
                        onInput=${(e) => setNewMessage(e.target.value)}
                        onKeyPress=${handleKeyPress}
                        disabled=${sending}
                        style=${{ flex: 1, resize: 'none' }}
                    ></textarea>
                    <button
                        class="btn-primary"
                        onClick=${handleSend}
                        disabled=${sending || !newMessage.trim()}
                        style=${{ alignSelf: 'flex-end' }}
                    >
                        ${sending ? 'Sending...' : 'Send'}
                    </button>
                </div>
                <div class="form-hint" style=${{ marginTop: '4px' }}>Press Enter to send, Shift+Enter for new line</div>
            </div>
        </div>
    `;
};

// =====================================================
// NOTIFICATIONS
// =====================================================

const NotificationBell = ({ session }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        if (session) {
            loadNotifications();
            const interval = setInterval(loadNotifications, 30000); // Poll every 30 seconds
            return () => clearInterval(interval);
        }
    }, [session]);

    const loadNotifications = async () => {
        try {
            const response = await fetch(`${API_BASE}/notifications`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            const data = await response.json();
            const notifs = data.data || [];
            setNotifications(notifs.slice(0, 5)); // Show last 5
            setUnreadCount(notifs.filter(n => !n.is_read).length);
        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            loadNotifications();
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    return html`
        <div style=${{ position: 'relative' }}>
            <button
                class="btn-secondary"
                onClick=${() => setShowDropdown(!showDropdown)}
                style=${{
                    position: 'relative',
                    padding: '8px 12px',
                    background: unreadCount > 0 ? 'var(--petrol-light)' : 'transparent',
                    color: unreadCount > 0 ? 'white' : 'inherit'
                }}
            >
                🔔
                ${unreadCount > 0 && html`
                    <span style=${{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: 'red',
                        color: 'white',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        fontSize: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold'
                    }}>
                        ${unreadCount}
                    </span>
                `}
            </button>

            ${showDropdown && html`
                <div style=${{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    width: '320px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    background: 'white',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 1000
                }}>
                    <div style=${{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border-color)',
                        fontWeight: '600'
                    }}>
                        Notifications
                    </div>

                    ${notifications.length === 0 ? html`
                        <div style=${{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No notifications
                        </div>
                    ` : html`
                        <div>
                            ${notifications.map(notif => html`
                                <div
                                    key=${notif.id}
                                    onClick=${() => {
                                        markAsRead(notif.id);
                                        if (notif.action_url) window.location.hash = notif.action_url;
                                    }}
                                    style=${{
                                        padding: '12px 16px',
                                        borderBottom: '1px solid var(--border-color)',
                                        cursor: 'pointer',
                                        background: notif.is_read ? 'white' : '#F0F9FA',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    <div style=${{ fontWeight: notif.is_read ? 'normal' : '600', fontSize: '14px', marginBottom: '4px' }}>
                                        ${notif.title}
                                    </div>
                                    <div style=${{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                        ${notif.body}
                                    </div>
                                    <div style=${{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        ${new Date(notif.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            `)}
                        </div>
                    `}

                    ${notifications.length > 0 && html`
                        <div style=${{ padding: '8px 16px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
                            <a href="#notifications" style=${{ fontSize: '13px', color: 'var(--primary-petrol)' }}>
                                View All Notifications
                            </a>
                        </div>
                    `}
                </div>
            `}
        </div>
    `;
};

// =====================================================
// FAVORITES MANAGEMENT
// =====================================================

const FavoriteButton = ({ coachId, session, isFavorited, onToggle }) => {
    const [loading, setLoading] = useState(false);

    const handleToggle = async () => {
        if (!session) {
            alert('Please sign in to save favorites');
            window.location.hash = '#login';
            return;
        }

        setLoading(true);
        try {
            const endpoint = isFavorited
                ? `${API_BASE}/favorites/${coachId}`
                : `${API_BASE}/favorites/${coachId}`;

            const response = await fetch(endpoint, {
                method: isFavorited ? 'DELETE' : 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            if (response.ok && onToggle) {
                onToggle(!isFavorited);
            }
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
        } finally {
            setLoading(false);
        }
    };

    return html`
        <button
            class="btn-secondary"
            onClick=${handleToggle}
            disabled=${loading}
            style=${{
                padding: '6px 12px',
                background: isFavorited ? 'var(--petrol-light)' : 'white',
                color: isFavorited ? 'white' : 'inherit',
                border: `1px solid ${isFavorited ? 'var(--petrol-light)' : 'var(--border-color)'}`
            }}
            title=${isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
            ${isFavorited ? '❤️' : '🤍'} ${isFavorited ? 'Saved' : 'Save'}
        </button>
    `;
};

// =====================================================
// TIMEZONE HANDLING
// =====================================================

const TimezoneSelector = ({ value, onChange }) => {
    const commonTimezones = [
        { value: 'Europe/London', label: 'London (GMT)' },
        { value: 'Europe/Paris', label: 'Paris (CET)' },
        { value: 'Europe/Berlin', label: 'Berlin (CET)' },
        { value: 'Europe/Madrid', label: 'Madrid (CET)' },
        { value: 'Europe/Rome', label: 'Rome (CET)' },
        { value: 'Europe/Amsterdam', label: 'Amsterdam (CET)' },
        { value: 'America/New_York', label: 'New York (EST)' },
        { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
        { value: 'Asia/Dubai', label: 'Dubai (GST)' },
        { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
        { value: 'UTC', label: 'UTC' }
    ];

    return html`
        <select class="form-control" value=${value} onChange=${(e) => onChange(e.target.value)}>
            <option value="">Select timezone...</option>
            ${commonTimezones.map(tz => html`
                <option key=${tz.value} value=${tz.value}>${tz.label}</option>
            `)}
        </select>
    `;
};

// =====================================================
// GDPR COMPLIANCE COMPONENTS
// =====================================================

const DataExportRequest = ({ session }) => {
    const [requesting, setRequesting] = useState(false);
    const [message, setMessage] = useState('');

    const requestDataExport = async () => {
        setRequesting(true);
        try {
            const response = await fetch(`${API_BASE}/gdpr/data-export`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            if (response.ok) {
                setMessage('Data export requested. You will receive an email with download link within 24 hours.');
            } else {
                setMessage('Error: Failed to request data export');
            }
        } catch (error) {
            setMessage('Error: Failed to submit request');
        } finally {
            setRequesting(false);
        }
    };

    return html`
        <div style=${{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
            <h3 style=${{ marginBottom: '12px' }}>Export Your Data</h3>
            <p style=${{ marginBottom: '16px', color: 'var(--text-muted)' }}>
                Download a complete copy of all your data including profile, bookings, messages, and reviews.
            </p>
            ${message && html`
                <div style=${{ padding: '12px', borderRadius: '4px', marginBottom: '16px', background: message.includes('Error') ? '#fee' : '#efe' }}>
                    ${message}
                </div>
            `}
            <button class="btn-primary" onClick=${requestDataExport} disabled=${requesting}>
                ${requesting ? 'Processing...' : 'Request Data Export'}
            </button>
        </div>
    `;
};

const AccountDeletion = ({ session }) => {
    const [showConfirm, setShowConfirm] = useState(false);
    const [reason, setReason] = useState('');
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm('This action cannot be undone. All your data will be permanently deleted.')) return;

        setDeleting(true);
        try {
            const response = await fetch(`${API_BASE}/gdpr/delete-account`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ reason })
            });

            if (response.ok) {
                alert('Account deletion scheduled. You will be logged out.');
                window.location.hash = '#signout';
            }
        } catch (error) {
            alert('Failed to delete account');
        } finally {
            setDeleting(false);
        }
    };

    return html`
        <div style=${{ border: '2px solid #DC2626', borderRadius: '8px', padding: '20px', background: '#FEF2F2' }}>
            <h3 style=${{ marginBottom: '12px', color: '#DC2626' }}>⚠️ Danger Zone</h3>
            <p style=${{ marginBottom: '16px' }}>
                Once you delete your account, there is no going back. All data will be permanently deleted.
            </p>
            ${!showConfirm ? html`
                <button
                    class="btn-secondary"
                    onClick=${() => setShowConfirm(true)}
                    style=${{ background: '#DC2626', color: 'white', border: 'none' }}
                >
                    Delete Account
                </button>
            ` : html`
                <div>
                    <textarea
                        class="form-control"
                        rows="3"
                        placeholder="Why are you leaving? (optional)"
                        value=${reason}
                        onInput=${(e) => setReason(e.target.value)}
                        style=${{ marginBottom: '12px' }}
                    ></textarea>
                    <div style=${{ display: 'flex', gap: '12px' }}>
                        <button class="btn-secondary" onClick=${() => setShowConfirm(false)}>Cancel</button>
                        <button
                            onClick=${handleDelete}
                            disabled=${deleting}
                            style=${{ padding: '8px 16px', background: '#DC2626', color: 'white', border: 'none', borderRadius: '4px' }}
                        >
                            ${deleting ? 'Deleting...' : 'Permanently Delete'}
                        </button>
                    </div>
                </div>
            `}
        </div>
    `;
};

// =====================================================
// COACH EARNINGS DASHBOARD
// =====================================================

const CoachEarningsDashboard = ({ session }) => {
    const [earnings, setEarnings] = useState(null);
    const [payouts, setPayouts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [earningsRes, payoutsRes] = await Promise.all([
                fetch(`${API_BASE}/coaches/me/earnings`, {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                }),
                fetch(`${API_BASE}/coaches/me/payouts`, {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                })
            ]);

            const earningsData = await earningsRes.json();
            const payoutsData = await payoutsRes.json();

            setEarnings(earningsData.data);
            setPayouts(payoutsData.data || []);
        } catch (error) {
            console.error('Failed to load earnings:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return html`<div class="spinner"></div>`;

    return html`
        <div>
            <h3 style=${{ marginBottom: '20px' }}>Earnings Dashboard</h3>

            <div class="dashboard-grid" style=${{ marginBottom: '30px' }}>
                <div class="stat-card">
                    <div class="stat-label">Total Earned</div>
                    <div class="stat-value">${formatPrice(earnings?.total_earned || 0)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Available</div>
                    <div class="stat-value">${formatPrice(earnings?.available_balance || 0)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Pending</div>
                    <div class="stat-value">${formatPrice(earnings?.pending || 0)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Sessions</div>
                    <div class="stat-value">${earnings?.total_sessions || 0}</div>
                </div>
            </div>

            <h4 style=${{ marginBottom: '16px' }}>Payout History</h4>
            ${payouts.length === 0 ? html`
                <div class="empty-state">
                    <div class="empty-state-icon">💸</div>
                    <div class="empty-state-text">No payouts yet</div>
                    <div class="empty-state-subtext">Payouts processed weekly on Mondays</div>
                </div>
            ` : html`
                <div style=${{ overflowX: 'auto' }}>
                    <table style=${{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style=${{ borderBottom: '2px solid var(--border-color)' }}>
                                <th style=${{ padding: '12px', textAlign: 'left' }}>Period</th>
                                <th style=${{ padding: '12px', textAlign: 'left' }}>Amount</th>
                                <th style=${{ padding: '12px', textAlign: 'left' }}>Status</th>
                                <th style=${{ padding: '12px', textAlign: 'left' }}>Arrival</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${payouts.map(p => html`
                                <tr key=${p.id} style=${{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style=${{ padding: '12px' }}>
                                        ${new Date(p.period_start).toLocaleDateString()} -
                                        ${new Date(p.period_end).toLocaleDateString()}
                                    </td>
                                    <td style=${{ padding: '12px', fontWeight: '600' }}>${formatPrice(p.amount)}</td>
                                    <td style=${{ padding: '12px' }}>
                                        <span class=${'booking-status ' + p.status}>${p.status}</span>
                                    </td>
                                    <td style=${{ padding: '12px' }}>
                                        ${p.arrival_date ? new Date(p.arrival_date).toLocaleDateString() : 'Pending'}
                                    </td>
                                </tr>
                            `)}
                        </tbody>
                    </table>
                </div>
            `}

            <div style=${{ marginTop: '30px', padding: '16px', background: '#F0F9FA', borderRadius: '8px' }}>
                <h4>💡 Payout Info</h4>
                <ul style=${{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
                    <li>Payouts every Monday</li>
                    <li>Commission: 15% (Founding Coaches: 10%)</li>
                    <li>SEPA: 1-2 business days</li>
                </ul>
            </div>
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
        case '#home': Component = () => html`<${Home} session=${session} />`; break;
        case '#coaches': Component = () => html`<${CoachList} session=${session} />`; break;
        case '#login': Component = Auth; break;
        case '#onboarding': Component = () => html`<${CoachOnboarding} session=${session} />`; break;
        case '#dashboard': Component = () => html`<${Dashboard} session=${session} />`; break;
        case '#signout': Component = SignOut; break;
        default: Component = () => html`<${Home} session=${session} />`;
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
