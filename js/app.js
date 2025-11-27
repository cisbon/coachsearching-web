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
import { AboutPage } from './pages/AboutPage.js';
import { HowItWorksPage } from './pages/HowItWorksPage.js';
import { CategoryPage, CategoriesIndexPage, COACHING_CATEGORIES } from './pages/CategoryPage.js';
import { CoachProfilePage } from './pages/CoachProfilePage.js';

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

// --- Legal Content ---
const legalContent = {
    imprint: {
        title: 'Imprint',
        content: html`
            <h3>coachsearching.com</h3>
            <h2>Information according to § 5 TMG</h2>
            <p><strong>Represented by:</strong><br/>Michael Gross</p>
            <p><strong>Contact:</strong><br/>Email: legal[at]coachsearching.com</p>
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
        <footer class="site-footer">
            <div class="container">
                <div class="footer-grid">
                    <!-- Brand Column -->
                    <div class="footer-brand">
                        <div class="logo" style=${{ fontSize: '1.4rem', marginBottom: '12px' }}>coach<span>searching</span>.com</div>
                        <p style=${{ color: '#9ca3af', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '16px' }}>
                            Find your perfect coach and start your transformation journey today.
                        </p>
                        <div style=${{ color: '#6b7280', fontSize: '0.85rem' }}>© 2025 coachsearching.com</div>
                    </div>

                    <!-- Coaching Types Column -->
                    <div class="footer-column">
                        <h4>Coaching Types</h4>
                        <ul>
                            <li><a href="#coaching/executive-coaching">Executive Coaching</a></li>
                            <li><a href="#coaching/life-coaching">Life Coaching</a></li>
                            <li><a href="#coaching/career-coaching">Career Coaching</a></li>
                            <li><a href="#coaching/business-coaching">Business Coaching</a></li>
                            <li><a href="#categories">View All Categories</a></li>
                        </ul>
                    </div>

                    <!-- More Coaching Column -->
                    <div class="footer-column">
                        <h4>More Coaching</h4>
                        <ul>
                            <li><a href="#coaching/leadership">Leadership Coaching</a></li>
                            <li><a href="#coaching/health-wellness">Health & Wellness</a></li>
                            <li><a href="#coaching/mindfulness">Mindfulness Coaching</a></li>
                            <li><a href="#coaching/relationship-coaching">Relationship Coaching</a></li>
                        </ul>
                    </div>

                    <!-- Company Column -->
                    <div class="footer-column">
                        <h4>Company</h4>
                        <ul>
                            <li><a href="#about">About Us</a></li>
                            <li><a href="#how-it-works">How It Works</a></li>
                            <li><a href="#faq">FAQ</a></li>
                            <li><a href="#coaches">Find a Coach</a></li>
                            <li><a href="#quiz">Take the Quiz</a></li>
                        </ul>
                    </div>

                    <!-- Legal Column -->
                    <div class="footer-column">
                        <h4>Legal</h4>
                        <ul>
                            <li><a href="#" onClick=${(e) => { e.preventDefault(); onOpenLegal('imprint'); }}>Imprint</a></li>
                            <li><a href="#" onClick=${(e) => { e.preventDefault(); onOpenLegal('privacy'); }}>Privacy Policy</a></li>
                            <li><a href="#" onClick=${(e) => { e.preventDefault(); onOpenLegal('terms'); }}>Terms of Service</a></li>
                        </ul>
                    </div>
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

    // Using SVG flags from circle-flags CDN for Windows compatibility
    const languages = [
        { code: 'en', flagCode: 'gb', label: 'English' },
        { code: 'de', flagCode: 'de', label: 'Deutsch' },
        { code: 'es', flagCode: 'es', label: 'Español' },
        { code: 'fr', flagCode: 'fr', label: 'Français' },
        { code: 'it', flagCode: 'it', label: 'Italiano' }
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
                <img
                    src="https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${current.flagCode}.svg"
                    alt=${current.label}
                    class="flag-icon"
                    loading="lazy"
                />
                <span>${current.code.toUpperCase()}</span>
            </button>
            <div class="lang-dropdown ${isOpen ? 'show' : ''}" role="menu">
                ${languages.map(lang => html`
                    <div key=${lang.code} class="lang-option" onClick=${() => handleSelect(lang.code)} role="menuitem">
                        <img
                            src="https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${lang.flagCode}.svg"
                            alt=${lang.label}
                            class="flag-icon"
                            loading="lazy"
                        />
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
                console.log('Sign up params:', {
                    email,
                    options: {
                        data: {
                            user_type: userType,
                            full_name: email.split('@')[0]
                        }
                    }
                });
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
                console.log('Sign up error details:', {
                    error: result.error,
                    errorMessage: result.error?.message,
                    errorStatus: result.error?.status,
                    errorCode: result.error?.code
                });
            }

            const { data, error } = result;

            if (error) {
                console.error('Auth error:', error);
                throw error;
            }

            console.log('Auth successful, data:', data);

            // Check if we got a session (critical for signup)
            if (!isLogin) {
                console.log('📊 SIGNUP DIAGNOSTIC:');
                console.log('  ✓ User created:', !!data.user);
                console.log('  ✓ Session created:', !!data.session);
                console.log('  ✓ Email confirmed:', !!data.user?.email_confirmed_at);

                if (data.user && !data.session) {
                    console.error('❌ CRITICAL: User created but NO SESSION!');
                    console.error('❌ This means "Enable email confirmations" is ENABLED in Supabase.');
                    console.error('❌ FIX: Supabase Dashboard → Authentication → Settings');
                    console.error('❌ ACTION: UNCHECK "Enable email confirmations" and Save');

                    setMessage('Account created! However, email confirmation is required before login. Please check your inbox, then try logging in again. (Or ask admin to disable email confirmation requirement in Supabase settings)');
                    setLoading(false);
                    return;
                }

                console.log('✅ Session created successfully! User is now logged in.');
            }

            if (!isLogin) {
                // For signup, always redirect to appropriate page
                const needsOnboarding = userType === 'coach';
                if (needsOnboarding) {
                    setMessage('Registration successful! Complete your coach profile...');
                    console.log('Coach registration, redirecting to onboarding...');
                    setTimeout(() => {
                        window.location.hash = '#onboarding';
                    }, 500);
                } else {
                    setMessage('Registration successful! You can browse coaches. Please verify your email to book sessions.');
                    console.log('Client registration, redirecting to coaches...');
                    setTimeout(() => {
                        window.location.hash = '#coaches';
                    }, 500);
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
                    <div class="alert ${message.includes('Error') || message.includes('error') || message.includes('failed') || message.includes('not confirmed') ? 'alert-error' : 'alert-success'}">
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
    const [step, setStep] = useState(1);
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
        avatar_url: '',
        promo_code: ''
    });

    // Promo code validation state
    const [promoStatus, setPromoStatus] = useState('idle'); // idle, validating, valid, invalid, expired
    const [promoDetails, setPromoDetails] = useState(null);
    const [promoValidating, setPromoValidating] = useState(false);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Validate promo code
    const validatePromoCode = async (code) => {
        if (!code || code.length < 3) {
            setPromoStatus('idle');
            setPromoDetails(null);
            return;
        }

        setPromoValidating(true);
        setPromoStatus('validating');

        try {
            if (!window.supabaseClient) {
                throw new Error('Database not available');
            }

            // Query the promo_codes table for coach registration codes
            const { data, error } = await window.supabaseClient
                .from('cs_promo_codes')
                .select('*')
                .eq('code', code.toUpperCase())
                .eq('is_active', true)
                .or('target_type.eq.coach,target_type.eq.all')
                .maybeSingle();

            if (error) {
                console.error('Promo code validation error:', error);
                setPromoStatus('invalid');
                setPromoDetails(null);
                return;
            }

            if (!data) {
                setPromoStatus('invalid');
                setPromoDetails(null);
                return;
            }

            // Check expiry
            if (data.expires_at && new Date(data.expires_at) < new Date()) {
                setPromoStatus('expired');
                setPromoDetails(null);
                return;
            }

            // Check usage limit
            if (data.max_uses && data.current_uses >= data.max_uses) {
                setPromoStatus('invalid');
                setPromoDetails(null);
                return;
            }

            // Valid promo code!
            setPromoStatus('valid');
            setPromoDetails({
                id: data.id,
                code: data.code,
                discount_type: data.discount_type, // 'percentage', 'fixed', 'free_trial'
                discount_value: data.discount_value,
                free_days: data.free_days || 30,
                description: data.description
            });
        } catch (err) {
            console.error('Error validating promo code:', err);
            setPromoStatus('invalid');
            setPromoDetails(null);
        } finally {
            setPromoValidating(false);
        }
    };

    // Debounced promo code validation
    const handlePromoCodeChange = (value) => {
        handleChange('promo_code', value);
        // Clear timeout if exists
        if (window.promoCodeTimeout) {
            clearTimeout(window.promoCodeTimeout);
        }
        // Debounce validation
        window.promoCodeTimeout = setTimeout(() => {
            validatePromoCode(value);
        }, 500);
    };

    const handleNext = () => {
        if (step === 1) {
            // Validate step 1 fields
            if (!formData.full_name || !formData.title || !formData.bio || !formData.hourly_rate) {
                setMessage('Please fill in all required fields');
                return;
            }
            setMessage('');
            setStep(2);
        }
    };

    const handleBack = () => {
        setStep(1);
        setMessage('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            if (!window.supabaseClient) {
                throw new Error('Database connection not available');
            }

            // CRITICAL: Ensure cs_users record exists first (same fix as for cs_clients)
            console.log('🔍 Checking if cs_users record exists for:', session.user.id);

            const { data: existingUser, error: userCheckError } = await window.supabaseClient
                .from('cs_users')
                .select('id')
                .eq('id', session.user.id)
                .maybeSingle();

            if (!existingUser) {
                console.log('⚠️ cs_users record missing, creating it now...');

                // Create cs_users record if missing
                const { error: userCreateError } = await window.supabaseClient
                    .from('cs_users')
                    .insert([{
                        id: session.user.id,
                        email: session.user.email,
                        full_name: formData.full_name,
                        role: 'coach',
                        user_type: 'coach',
                        avatar_url: formData.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.email}`,
                        is_email_verified: !!session.user.email_confirmed_at,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }]);

                if (userCreateError) {
                    console.error('❌ Failed to create cs_users record:', userCreateError);
                    throw new Error('Failed to create user profile. Please contact support.');
                }

                console.log('✅ cs_users record created successfully');
            } else {
                console.log('✅ cs_users record already exists');
            }

            // Parse comma-separated values into arrays
            const specialtiesArray = formData.specialties.split(',').map(s => s.trim()).filter(Boolean);
            const languagesArray = formData.languages.split(',').map(s => s.trim()).filter(Boolean);
            const sessionTypesArray = [];
            if (formData.session_types_online) sessionTypesArray.push('online');
            if (formData.session_types_onsite) sessionTypesArray.push('onsite');

            // Calculate trial end date if promo code gives free trial
            let trialEndsAt = null;
            let subscriptionDiscount = null;
            if (promoStatus === 'valid' && promoDetails) {
                if (promoDetails.discount_type === 'free_trial') {
                    const trialDays = promoDetails.free_days || 30;
                    trialEndsAt = new Date();
                    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);
                } else if (promoDetails.discount_type === 'percentage') {
                    subscriptionDiscount = {
                        type: 'percentage',
                        value: promoDetails.discount_value,
                        promo_code: promoDetails.code
                    };
                }
            }

            const coachProfile = {
                user_id: session.user.id,
                full_name: formData.full_name,
                title: formData.title,
                bio: formData.bio,
                location: formData.location,
                hourly_rate: parseFloat(formData.hourly_rate) || 0,
                currency: 'EUR',
                specialties: specialtiesArray,
                languages: languagesArray,
                session_types: sessionTypesArray,
                offers_virtual: formData.session_types_online,
                offers_onsite: formData.session_types_onsite,
                avatar_url: formData.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.email}`,
                onboarding_completed: true,
                trial_ends_at: trialEndsAt ? trialEndsAt.toISOString() : null,
                promo_code_used: promoStatus === 'valid' ? promoDetails?.code : null,
                subscription_discount: subscriptionDiscount
            };

            console.log('💾 Saving coach profile to Supabase:', coachProfile);

            // Save directly to Supabase
            const { data, error } = await window.supabaseClient
                .from('cs_coaches')
                .insert([coachProfile])
                .select()
                .single();

            if (error) {
                console.error('❌ Supabase error:', error);
                throw new Error(error.message || 'Failed to save profile');
            }

            console.log('✅ Coach profile saved successfully:', data);

            // Update promo code usage count if a valid code was used
            if (promoStatus === 'valid' && promoDetails?.id) {
                try {
                    await window.supabaseClient
                        .from('cs_promo_codes')
                        .update({ current_uses: promoDetails.current_uses ? promoDetails.current_uses + 1 : 1 })
                        .eq('id', promoDetails.id);

                    // Record the promo code usage
                    await window.supabaseClient
                        .from('cs_promo_code_uses')
                        .insert([{
                            promo_code_id: promoDetails.id,
                            user_id: session.user.id,
                            used_at: new Date().toISOString(),
                            context: 'coach_registration'
                        }]);

                    console.log('✅ Promo code usage recorded');
                } catch (promoErr) {
                    console.warn('Failed to update promo code usage:', promoErr);
                    // Don't fail the registration if promo tracking fails
                }
            }

            const successMsg = promoStatus === 'valid' && promoDetails
                ? `✓ Profile completed! ${promoDetails.discount_type === 'free_trial' ? `You have ${promoDetails.free_days} days free!` : `${promoDetails.discount_value}% discount applied!`} Redirecting...`
                : '✓ Profile completed successfully! Redirecting to dashboard...';

            setMessage(successMsg);
            setTimeout(() => {
                window.location.hash = '#dashboard';
            }, 1500);
        } catch (error) {
            console.error('❌ Onboarding error:', error);
            setMessage('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '14px 16px',
        fontSize: '15px',
        border: '2px solid #E5E7EB',
        borderRadius: '10px',
        outline: 'none',
        transition: 'all 0.2s',
        fontFamily: 'inherit'
    };

    const labelStyle = {
        display: 'block',
        fontSize: '14px',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '8px'
    };

    return html`
        <div style=${{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #006266 0%, #004A4D 100%)',
            padding: '40px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div style=${{
                maxWidth: '700px',
                width: '100%',
                background: 'white',
                borderRadius: '20px',
                padding: '50px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
            }}>
                <!-- Header -->
                <div style=${{ textAlign: 'center', marginBottom: '40px' }}>
                    <h1 style=${{
                        fontSize: '32px',
                        fontWeight: '700',
                        color: '#1F2937',
                        marginBottom: '12px'
                    }}>
                        ${step === 1 ? '👋 Welcome, Coach!' : '✨ Almost There!'}
                    </h1>
                    <p style=${{ fontSize: '16px', color: '#6B7280' }}>
                        ${step === 1 ? 'Set up your profile to attract clients' : 'Tell us about your expertise and availability'}
                    </p>

                    <!-- Progress Bar -->
                    <div style=${{
                        marginTop: '30px',
                        display: 'flex',
                        gap: '8px',
                        justifyContent: 'center'
                    }}>
                        <div style=${{
                            width: '40px',
                            height: '4px',
                            borderRadius: '2px',
                            background: step >= 1 ? '#006266' : '#E5E7EB',
                            transition: 'all 0.3s'
                        }}></div>
                        <div style=${{
                            width: '40px',
                            height: '4px',
                            borderRadius: '2px',
                            background: step >= 2 ? '#006266' : '#E5E7EB',
                            transition: 'all 0.3s'
                        }}></div>
                    </div>
                    <div style=${{ marginTop: '8px', fontSize: '13px', color: '#9CA3AF', fontWeight: '500' }}>
                        Step ${step} of 2
                    </div>
                </div>

                ${message && html`
                    <div style=${{
                        padding: '14px 18px',
                        borderRadius: '10px',
                        marginBottom: '24px',
                        background: message.includes('Error') ? '#FEE2E2' : '#D1FAE5',
                        color: message.includes('Error') ? '#991B1B' : '#065F46',
                        fontSize: '14px',
                        fontWeight: '500'
                    }}>
                        ${message}
                    </div>
                `}

                <form onSubmit=${step === 2 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
                    <!-- Step 1: Basic Info & Pricing -->
                    ${step === 1 && html`
                        <div style=${{ display: 'grid', gap: '22px' }}>
                            <div>
                                <label style=${labelStyle}>Full Name *</label>
                                <input
                                    type="text"
                                    style=${inputStyle}
                                    value=${formData.full_name}
                                    onChange=${(e) => handleChange('full_name', e.target.value)}
                                    onFocus=${(e) => e.target.style.borderColor = '#006266'}
                                    onBlur=${(e) => e.target.style.borderColor = '#E5E7EB'}
                                    required
                                />
                            </div>

                            <div>
                                <label style=${labelStyle}>Professional Title *</label>
                                <input
                                    type="text"
                                    style=${inputStyle}
                                    placeholder="e.g., Life Coach, Business Consultant"
                                    value=${formData.title}
                                    onChange=${(e) => handleChange('title', e.target.value)}
                                    onFocus=${(e) => e.target.style.borderColor = '#006266'}
                                    onBlur=${(e) => e.target.style.borderColor = '#E5E7EB'}
                                    required
                                />
                            </div>

                            <div>
                                <label style=${labelStyle}>About You *</label>
                                <textarea
                                    style=${{...inputStyle, minHeight: '120px', resize: 'vertical'}}
                                    placeholder="Share your coaching philosophy, experience, and approach..."
                                    value=${formData.bio}
                                    onChange=${(e) => handleChange('bio', e.target.value)}
                                    onFocus=${(e) => e.target.style.borderColor = '#006266'}
                                    onBlur=${(e) => e.target.style.borderColor = '#E5E7EB'}
                                    required
                                ></textarea>
                            </div>

                            <div style=${{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style=${labelStyle}>Hourly Rate (EUR) *</label>
                                    <input
                                        type="number"
                                        style=${inputStyle}
                                        placeholder="150"
                                        min="0"
                                        step="1"
                                        value=${formData.hourly_rate}
                                        onChange=${(e) => handleChange('hourly_rate', e.target.value)}
                                        onFocus=${(e) => e.target.style.borderColor = '#006266'}
                                        onBlur=${(e) => e.target.style.borderColor = '#E5E7EB'}
                                        required
                                    />
                                </div>

                                <div>
                                    <label style=${labelStyle}>Location</label>
                                    <input
                                        type="text"
                                        style=${inputStyle}
                                        placeholder="e.g., Zurich"
                                        value=${formData.location}
                                        onChange=${(e) => handleChange('location', e.target.value)}
                                        onFocus=${(e) => e.target.style.borderColor = '#006266'}
                                        onBlur=${(e) => e.target.style.borderColor = '#E5E7EB'}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style=${{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
                            <button
                                type="button"
                                onClick=${() => window.location.hash = '#coaches'}
                                style=${{
                                    padding: '14px 24px',
                                    background: 'transparent',
                                    color: '#6B7280',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                Skip for Now
                            </button>
                            <button
                                type="submit"
                                style=${{
                                    padding: '14px 32px',
                                    background: 'linear-gradient(135deg, #006266 0%, #004A4D 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(0, 98, 102, 0.4)'
                                }}
                            >
                                Next Step →
                            </button>
                        </div>
                    `}

                    <!-- Step 2: Expertise & Settings -->
                    ${step === 2 && html`
                        <div style=${{ display: 'grid', gap: '22px' }}>
                            <div>
                                <label style=${labelStyle}>Specialties *</label>
                                <input
                                    type="text"
                                    style=${inputStyle}
                                    placeholder="Life Coaching, Business Strategy, Leadership"
                                    value=${formData.specialties}
                                    onChange=${(e) => handleChange('specialties', e.target.value)}
                                    onFocus=${(e) => e.target.style.borderColor = '#006266'}
                                    onBlur=${(e) => e.target.style.borderColor = '#E5E7EB'}
                                    required
                                />
                                <div style=${{ fontSize: '13px', color: '#9CA3AF', marginTop: '6px' }}>
                                    Separate with commas
                                </div>
                            </div>

                            <div>
                                <label style=${labelStyle}>Languages *</label>
                                <input
                                    type="text"
                                    style=${inputStyle}
                                    placeholder="en, de, es"
                                    value=${formData.languages}
                                    onChange=${(e) => handleChange('languages', e.target.value)}
                                    onFocus=${(e) => e.target.style.borderColor = '#006266'}
                                    onBlur=${(e) => e.target.style.borderColor = '#E5E7EB'}
                                    required
                                />
                                <div style=${{ fontSize: '13px', color: '#9CA3AF', marginTop: '6px' }}>
                                    Use codes: en, de, es, fr, it
                                </div>
                            </div>

                            <div>
                                <label style=${{...labelStyle, marginBottom: '12px'}}>Session Types *</label>
                                <div style=${{ display: 'grid', gap: '12px' }}>
                                    <label style=${{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '14px',
                                        border: '2px solid #E5E7EB',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked=${formData.session_types_online}
                                            onChange=${(e) => handleChange('session_types_online', e.target.checked)}
                                            style=${{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                        <span style=${{ fontSize: '15px', fontWeight: '500' }}>💻 Online Sessions</span>
                                    </label>
                                    <label style=${{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '14px',
                                        border: '2px solid #E5E7EB',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked=${formData.session_types_onsite}
                                            onChange=${(e) => handleChange('session_types_onsite', e.target.checked)}
                                            style=${{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                        <span style=${{ fontSize: '15px', fontWeight: '500' }}>📍 On-Site Sessions</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label style=${labelStyle}>Profile Picture URL (Optional)</label>
                                <input
                                    type="url"
                                    style=${inputStyle}
                                    placeholder="https://example.com/photo.jpg"
                                    value=${formData.avatar_url}
                                    onChange=${(e) => handleChange('avatar_url', e.target.value)}
                                    onFocus=${(e) => e.target.style.borderColor = '#006266'}
                                    onBlur=${(e) => e.target.style.borderColor = '#E5E7EB'}
                                />
                                <div style=${{ fontSize: '13px', color: '#9CA3AF', marginTop: '6px' }}>
                                    Leave blank for auto-generated avatar
                                </div>
                            </div>

                            <!-- Promo Code Section -->
                            <div style=${{
                                marginTop: '8px',
                                padding: '20px',
                                background: 'linear-gradient(135deg, #f0fafa 0%, #ffffff 100%)',
                                borderRadius: '12px',
                                border: '2px dashed #006266'
                            }}>
                                <label style=${{...labelStyle, display: 'flex', alignItems: 'center', gap: '8px'}}>
                                    <span style=${{ fontSize: '18px' }}>🎁</span>
                                    ${t('onboard.promoCode') || 'Have a Promo Code?'}
                                </label>
                                <div style=${{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                    <div style=${{ flex: 1 }}>
                                        <input
                                            type="text"
                                            style=${{
                                                ...inputStyle,
                                                textTransform: 'uppercase',
                                                letterSpacing: '2px',
                                                fontWeight: '600',
                                                borderColor: promoStatus === 'valid' ? '#10B981' : promoStatus === 'invalid' || promoStatus === 'expired' ? '#EF4444' : '#E5E7EB'
                                            }}
                                            placeholder="WELCOME30"
                                            value=${formData.promo_code}
                                            onChange=${(e) => handlePromoCodeChange(e.target.value)}
                                            onFocus=${(e) => e.target.style.borderColor = '#006266'}
                                            onBlur=${(e) => {
                                                if (promoStatus === 'valid') e.target.style.borderColor = '#10B981';
                                                else if (promoStatus === 'invalid' || promoStatus === 'expired') e.target.style.borderColor = '#EF4444';
                                                else e.target.style.borderColor = '#E5E7EB';
                                            }}
                                        />

                                        ${/* Validation feedback */ ''}
                                        ${promoStatus === 'validating' && html`
                                            <div style=${{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6B7280' }}>
                                                <span style=${{ animation: 'spin 1s linear infinite' }}>⏳</span>
                                                ${t('onboard.promoValidating') || 'Checking code...'}
                                            </div>
                                        `}

                                        ${promoStatus === 'valid' && promoDetails && html`
                                            <div style=${{
                                                marginTop: '12px',
                                                padding: '14px',
                                                background: 'linear-gradient(135deg, #D1FAE5 0%, #ECFDF5 100%)',
                                                borderRadius: '10px',
                                                border: '1px solid #10B981'
                                            }}>
                                                <div style=${{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                    <span style=${{ fontSize: '20px' }}>✅</span>
                                                    <span style=${{ fontWeight: '700', color: '#065F46', fontSize: '15px' }}>
                                                        ${t('onboard.promoApplied') || 'Promo Code Applied!'}
                                                    </span>
                                                </div>
                                                <div style=${{ fontSize: '14px', color: '#047857', fontWeight: '500' }}>
                                                    ${promoDetails.discount_type === 'free_trial'
                                                        ? `🎉 ${promoDetails.free_days} ${t('onboard.promoDaysFree') || 'days FREE access!'}`
                                                        : promoDetails.discount_type === 'percentage'
                                                        ? `💰 ${promoDetails.discount_value}% ${t('onboard.promoDiscountOff') || 'off your subscription!'}`
                                                        : promoDetails.description || 'Special discount applied!'
                                                    }
                                                </div>
                                            </div>
                                        `}

                                        ${promoStatus === 'invalid' && formData.promo_code.length >= 3 && html`
                                            <div style=${{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#DC2626' }}>
                                                <span>❌</span>
                                                ${t('onboard.promoInvalid') || 'Invalid promo code'}
                                            </div>
                                        `}

                                        ${promoStatus === 'expired' && html`
                                            <div style=${{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#DC2626' }}>
                                                <span>⏰</span>
                                                ${t('onboard.promoExpired') || 'This promo code has expired'}
                                            </div>
                                        `}

                                        ${promoStatus === 'idle' && html`
                                            <div style=${{ marginTop: '8px', fontSize: '13px', color: '#9CA3AF' }}>
                                                ${t('onboard.promoHint') || 'Enter your code to get a special discount or free trial'}
                                            </div>
                                        `}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style=${{ marginTop: '32px', display: 'flex', gap: '12px' }}>
                            <button
                                type="button"
                                onClick=${handleBack}
                                disabled=${loading}
                                style=${{
                                    padding: '14px 24px',
                                    background: '#F3F4F6',
                                    color: '#374151',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    flex: 1
                                }}
                            >
                                ← Back
                            </button>
                            <button
                                type="submit"
                                disabled=${loading}
                                style=${{
                                    padding: '14px 32px',
                                    background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #006266 0%, #004A4D 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    boxShadow: loading ? 'none' : '0 4px 12px rgba(0, 98, 102, 0.4)',
                                    flex: 2
                                }}
                            >
                                ${loading ? '💾 Creating Profile...' : '✅ Complete Setup'}
                            </button>
                        </div>
                    `}
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
    const [maxRate, setMaxRate] = useState('');
    const [gettingLocation, setGettingLocation] = useState(false);

    const handleSearch = (e) => {
        e.preventDefault();
        console.log('Search:', { searchTerm, sessionType, location, radius, date, maxRate });
        if (onSearch) {
            onSearch({ searchTerm, sessionType, location, radius, date, maxRate });
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

                <!-- Discovery Options -->
                <div class="discovery-options">
                    <button class="discovery-option quiz-option" onClick=${() => window.location.hash = '#quiz'}>
                        <span class="discovery-icon">🎯</span>
                        <span class="discovery-label">${t('discovery.takeQuiz')}</span>
                        <span class="discovery-desc">${t('discovery.takeQuizDesc')}</span>
                    </button>
                    <button class="discovery-option browse-option" onClick=${() => document.querySelector('.coach-list')?.scrollIntoView({ behavior: 'smooth' })}>
                        <span class="discovery-icon">🔍</span>
                        <span class="discovery-label">${t('discovery.browse')}</span>
                        <span class="discovery-desc">${t('discovery.browseDesc')}</span>
                    </button>
                    <button class="discovery-option ai-option" onClick=${() => window.location.hash = '#ai-match'}>
                        <span class="discovery-icon">✨</span>
                        <span class="discovery-label">${t('discovery.aiMatch')}</span>
                        <span class="discovery-desc">${t('discovery.aiMatchDesc')}</span>
                    </button>
                </div>
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
                            <div class="search-input-group">
                                <span class="search-icon">💰</span>
                                <select
                                    class="search-input rate-select"
                                    value=${maxRate}
                                    onChange=${(e) => setMaxRate(e.target.value)}
                                >
                                    <option value="">Max ${CURRENCY_SYMBOLS[currentCurrency]}/hr</option>
                                    <option value="50">${formatPrice(50)}/hr</option>
                                    <option value="75">${formatPrice(75)}/hr</option>
                                    <option value="100">${formatPrice(100)}/hr</option>
                                    <option value="150">${formatPrice(150)}/hr</option>
                                    <option value="200">${formatPrice(200)}/hr</option>
                                    <option value="300">${formatPrice(300)}/hr</option>
                                </select>
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

// Skeleton loader for coach cards (memoized for performance)
const CoachCardSkeleton = React.memo(() => {
    return html`
        <div class="skeleton-card">
            <div class="skeleton-header">
                <div class="skeleton skeleton-avatar"></div>
                <div class="skeleton-info">
                    <div class="skeleton skeleton-title"></div>
                    <div class="skeleton skeleton-subtitle"></div>
                    <div class="skeleton skeleton-meta"></div>
                </div>
            </div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text short"></div>
            <div class="skeleton-badges">
                <div class="skeleton skeleton-badge"></div>
                <div class="skeleton skeleton-badge"></div>
                <div class="skeleton skeleton-badge"></div>
            </div>
            <div class="skeleton-footer">
                <div class="skeleton skeleton-price"></div>
                <div class="skeleton skeleton-button"></div>
            </div>
        </div>
    `;
});

// Memoized coach card to prevent unnecessary re-renders
// Trust Score Component
const TrustScore = ({ coach }) => {
    // Calculate trust score based on various factors
    const hasVideo = coach.intro_video_url || coach.video_url;
    const hasCredentials = coach.credentials?.length > 0 || coach.certifications?.length > 0;
    const hasReviews = (coach.rating_count || coach.reviews_count || 0) > 0;
    const isVerified = coach.is_verified || coach.verified;
    const hasDetailedBio = (coach.bio?.length || 0) > 200;

    let score = 0;
    if (hasVideo) score += 25;
    if (hasCredentials) score += 20;
    if (hasReviews) score += 20;
    if (isVerified) score += 20;
    if (hasDetailedBio) score += 15;

    const getScoreColor = () => {
        if (score >= 80) return '#22c55e';
        if (score >= 60) return '#84cc16';
        if (score >= 40) return '#eab308';
        return '#9ca3af';
    };

    return html`
        <div class="trust-score" title="Trust Score: ${score}%">
            <svg width="36" height="36" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" stroke-width="3"/>
                <circle cx="18" cy="18" r="15" fill="none" stroke=${getScoreColor()} stroke-width="3"
                    stroke-dasharray="${score * 0.94} 100"
                    transform="rotate(-90 18 18)"
                    stroke-linecap="round"/>
            </svg>
            <span class="trust-score-value">${score}</span>
        </div>
    `;
};

// Trust Badges Component
const TrustBadges = ({ coach }) => {
    const badges = [];

    if (coach.is_verified || coach.verified) {
        badges.push({ icon: '✓', label: 'Verified', class: 'badge-verified' });
    }
    if (coach.intro_video_url || coach.video_url) {
        badges.push({ icon: '🎬', label: 'Video', class: 'badge-video' });
    }
    if (coach.offers_free_intro || coach.free_discovery_call) {
        badges.push({ icon: '🎁', label: 'Free Intro', class: 'badge-free' });
    }
    if (coach.certifications?.length > 0 || coach.credentials?.length > 0) {
        badges.push({ icon: '🎓', label: 'Certified', class: 'badge-certified' });
    }
    if ((coach.rating_count || coach.reviews_count || 0) >= 10) {
        badges.push({ icon: '⭐', label: 'Popular', class: 'badge-popular' });
    }
    if (coach.is_founding_coach || coach.founding_member) {
        badges.push({ icon: '🏆', label: 'Founding', class: 'badge-founding' });
    }

    if (badges.length === 0) return null;

    return html`
        <div class="trust-badges">
            ${badges.slice(0, 4).map(badge => html`
                <span key=${badge.label} class="trust-badge ${badge.class}" title=${badge.label}>
                    ${badge.icon}
                </span>
            `)}
        </div>
    `;
};

const CoachCard = React.memo(({ coach, onViewDetails }) => {
    // Map database fields to component fields
    const rating = coach.rating_average || coach.rating || 0;
    const reviewsCount = coach.rating_count || coach.reviews_count || 0;
    const location = coach.location || 'Remote';
    const languages = coach.languages || [];
    const specialties = coach.specialties || [];
    const bio = coach.bio || '';
    const hasVideo = coach.intro_video_url || coach.video_url;
    const offersFreeIntro = coach.offers_free_intro || coach.free_discovery_call;

    return html`
    <div class="coach-card ${hasVideo ? 'has-video' : ''}">
            ${hasVideo && html`
                <div class="video-indicator" title="Watch intro video">
                    <span>▶</span>
                </div>
            `}
            <img src=${coach.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(coach.full_name)} alt=${coach.full_name} class="coach-img" loading="lazy" />

            <!-- Trust Badges Overlay -->
            <${TrustBadges} coach=${coach} />

            <div class="coach-info">
                <div class="coach-header">
                    <div>
                        <h3 class="coach-name">
                            ${coach.full_name}
                            ${(coach.is_verified || coach.verified) && html`<span class="verified-check" title="Verified Coach">✓</span>`}
                        </h3>
                        <div class="coach-title">${coach.title}</div>
                        <div class="coach-meta">
                            <span>📍 ${location}</span>
                            ${languages.length > 0 ? html`<span>💬 ${languages.slice(0, 2).join(', ')}${languages.length > 2 ? ' +' + (languages.length - 2) : ''}</span>` : ''}
                        </div>
                    </div>
                    <div class="coach-score-rating">
                        <${TrustScore} coach=${coach} />
                        ${rating > 0 ? html`
                            <div class="coach-rating">
                                <div class="rating-stars">
                                    ${[1,2,3,4,5].map(star => html`
                                        <span key=${star} class="star ${star <= Math.round(rating) ? 'filled' : ''}">★</span>
                                    `)}
                                </div>
                                <div class="rating-text">${rating.toFixed(1)} (${reviewsCount})</div>
                            </div>
                        ` : html`
                            <div class="coach-rating new-coach">
                                <span class="new-badge">NEW</span>
                            </div>
                        `}
                    </div>
                </div>
                <div class="coach-details">
                    <p>${bio.length > 150 ? bio.substring(0, 150) + '...' : bio}</p>
                    ${specialties.length > 0 ? html`
                        <div class="specialty-tags">
                            ${specialties.slice(0, 3).map(s => html`
                                <span key=${s} class="specialty-tag">${s}</span>
                            `)}
                            ${specialties.length > 3 ? html`<span class="specialty-tag more">+${specialties.length - 3}</span>` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="coach-price-section">
                <div>
                    ${offersFreeIntro && html`
                        <div class="free-intro-badge">🎁 Free Discovery Call</div>
                    `}
                    <div class="price-label">${t('coach.hourly_rate')}</div>
                    <div class="price-value">${formatPrice(coach.hourly_rate)}</div>
                </div>
                <a href="#coach/${coach.id}" class="btn-book">
                    ${t('coach.view_profile')} →
                </a>
            </div>
        </div>
    `;
});

// Available filter options
const SPECIALTY_OPTIONS = [
    'Leadership', 'Career', 'Executive', 'Life Coaching', 'Business',
    'Health & Wellness', 'Relationships', 'Mindfulness', 'Performance',
    'Communication', 'Stress Management', 'Work-Life Balance'
];

const LANGUAGE_OPTIONS = ['English', 'German', 'Spanish', 'French', 'Italian', 'Dutch', 'Portuguese'];

// Filter Sidebar Component
const FilterSidebar = ({ filters, onChange, onReset }) => {
    return html`
        <div class="filter-sidebar">
            <div class="filter-header">
                <h3>Filters</h3>
                <button class="filter-reset-btn" onClick=${onReset}>Reset</button>
            </div>

            <!-- Sort By -->
            <div class="filter-section">
                <h4>Sort By</h4>
                <select class="filter-select" value=${filters.sortBy} onChange=${(e) => onChange({ ...filters, sortBy: e.target.value })}>
                    <option value="relevance">Relevance</option>
                    <option value="rating">Highest Rated</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                    <option value="reviews">Most Reviews</option>
                </select>
            </div>

            <!-- Price Range -->
            <div class="filter-section">
                <h4>Price Range</h4>
                <div class="price-range-inputs">
                    <input
                        type="number"
                        placeholder="Min"
                        class="filter-input"
                        value=${filters.minPrice || ''}
                        onChange=${(e) => onChange({ ...filters, minPrice: e.target.value })}
                    />
                    <span>-</span>
                    <input
                        type="number"
                        placeholder="Max"
                        class="filter-input"
                        value=${filters.maxPrice || ''}
                        onChange=${(e) => onChange({ ...filters, maxPrice: e.target.value })}
                    />
                </div>
            </div>

            <!-- Specialties -->
            <div class="filter-section">
                <h4>Specialties</h4>
                <div class="filter-checkboxes">
                    ${SPECIALTY_OPTIONS.map(specialty => html`
                        <label key=${specialty} class="filter-checkbox">
                            <input
                                type="checkbox"
                                checked=${filters.specialties?.includes(specialty)}
                                onChange=${(e) => {
                                    const current = filters.specialties || [];
                                    const updated = e.target.checked
                                        ? [...current, specialty]
                                        : current.filter(s => s !== specialty);
                                    onChange({ ...filters, specialties: updated });
                                }}
                            />
                            <span>${specialty}</span>
                        </label>
                    `)}
                </div>
            </div>

            <!-- Languages -->
            <div class="filter-section">
                <h4>Languages</h4>
                <div class="filter-checkboxes">
                    ${LANGUAGE_OPTIONS.map(lang => html`
                        <label key=${lang} class="filter-checkbox">
                            <input
                                type="checkbox"
                                checked=${filters.languages?.includes(lang)}
                                onChange=${(e) => {
                                    const current = filters.languages || [];
                                    const updated = e.target.checked
                                        ? [...current, lang]
                                        : current.filter(l => l !== lang);
                                    onChange({ ...filters, languages: updated });
                                }}
                            />
                            <span>${lang}</span>
                        </label>
                    `)}
                </div>
            </div>

            <!-- Trust Features -->
            <div class="filter-section">
                <h4>Features</h4>
                <div class="filter-checkboxes">
                    <label class="filter-checkbox">
                        <input
                            type="checkbox"
                            checked=${filters.hasVideo}
                            onChange=${(e) => onChange({ ...filters, hasVideo: e.target.checked })}
                        />
                        <span>🎬 Has Video Intro</span>
                    </label>
                    <label class="filter-checkbox">
                        <input
                            type="checkbox"
                            checked=${filters.freeIntro}
                            onChange=${(e) => onChange({ ...filters, freeIntro: e.target.checked })}
                        />
                        <span>🎁 Free Discovery Call</span>
                    </label>
                    <label class="filter-checkbox">
                        <input
                            type="checkbox"
                            checked=${filters.verified}
                            onChange=${(e) => onChange({ ...filters, verified: e.target.checked })}
                        />
                        <span>✓ Verified Only</span>
                    </label>
                </div>
            </div>
        </div>
    `;
};

const CoachList = ({ searchFilters, session }) => {
    const [coaches, setCoaches] = useState(mockCoaches);
    const [selectedCoach, setSelectedCoach] = useState(null);
    const [loading, setLoading] = useState(false);
    const [, forceUpdate] = useState({});
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        sortBy: 'relevance',
        minPrice: '',
        maxPrice: '',
        specialties: [],
        languages: [],
        hasVideo: false,
        freeIntro: false,
        verified: false
    });

    const resetFilters = () => {
        setFilters({
            sortBy: 'relevance',
            minPrice: '',
            maxPrice: '',
            specialties: [],
            languages: [],
            hasVideo: false,
            freeIntro: false,
            verified: false
        });
    };

    console.log('CoachList rendering with', coaches.length, 'coaches');

    // Memoized filtered and sorted coaches
    const filteredCoaches = React.useMemo(() => {
        let result = [...coaches];

        // Text search filter
        if (searchFilters && searchFilters.searchTerm) {
            const term = searchFilters.searchTerm.toLowerCase();
            result = result.filter(coach =>
                coach.full_name?.toLowerCase().includes(term) ||
                coach.title?.toLowerCase().includes(term) ||
                coach.bio?.toLowerCase().includes(term) ||
                coach.specialties?.some(s => s.toLowerCase().includes(term)) ||
                coach.location?.toLowerCase().includes(term)
            );
        }

        // Price filters
        if (filters.minPrice) {
            result = result.filter(coach => coach.hourly_rate >= Number(filters.minPrice));
        }
        if (filters.maxPrice) {
            result = result.filter(coach => coach.hourly_rate <= Number(filters.maxPrice));
        }

        // Specialty filter
        if (filters.specialties?.length > 0) {
            result = result.filter(coach =>
                filters.specialties.some(s =>
                    coach.specialties?.some(cs => cs.toLowerCase().includes(s.toLowerCase()))
                )
            );
        }

        // Language filter
        if (filters.languages?.length > 0) {
            result = result.filter(coach =>
                filters.languages.some(l =>
                    coach.languages?.some(cl => cl.toLowerCase().includes(l.toLowerCase()))
                )
            );
        }

        // Feature filters
        if (filters.hasVideo) {
            result = result.filter(coach => coach.intro_video_url || coach.video_url);
        }
        if (filters.freeIntro) {
            result = result.filter(coach => coach.offers_free_intro || coach.free_discovery_call);
        }
        if (filters.verified) {
            result = result.filter(coach => coach.is_verified || coach.verified);
        }

        // Sorting
        switch (filters.sortBy) {
            case 'rating':
                result.sort((a, b) => (b.rating_average || b.rating || 0) - (a.rating_average || a.rating || 0));
                break;
            case 'price_low':
                result.sort((a, b) => (a.hourly_rate || 0) - (b.hourly_rate || 0));
                break;
            case 'price_high':
                result.sort((a, b) => (b.hourly_rate || 0) - (a.hourly_rate || 0));
                break;
            case 'reviews':
                result.sort((a, b) => (b.rating_count || b.reviews_count || 0) - (a.rating_count || a.reviews_count || 0));
                break;
            default:
                // relevance - keep original order or sort by a combination
                break;
        }

        return result;
    }, [searchFilters, coaches, filters]);

    // Load coaches from Supabase directly
    const loadCoaches = useCallback(async () => {
            console.log('🔍 Loading coaches from database...');
            setLoading(true);

            let loadedSuccessfully = false;

            // Load directly from Supabase
            if (window.supabaseClient) {
                try {
                    const { data: supabaseCoaches, error } = await window.supabaseClient
                        .from('cs_coaches')
                        .select('*')
                        .order('created_at', { ascending: false });

                    if (error) {
                        console.error('❌ Error loading coaches:', error);
                    } else if (supabaseCoaches && supabaseCoaches.length > 0) {
                        console.log('✅ Loaded', supabaseCoaches.length, 'coaches');
                        setCoaches(supabaseCoaches);
                        loadedSuccessfully = true;
                    } else {
                        console.log('ℹ️ No coaches found in database');
                    }
                } catch (error) {
                    console.error('❌ Failed to load coaches:', error);
                }
            }

            // Fall back to mock data if needed
            if (!loadedSuccessfully) {
                console.log('ℹ️ Using mock data');
                setCoaches(mockCoaches);
            }

            setLoading(false);
    }, []);

    useEffect(() => {
        loadCoaches();
    }, [loadCoaches]);

    useEffect(() => {
        const handleCurrencyChange = () => {
            console.log('CoachList: Currency changed, re-rendering');
            forceUpdate({});
        };
        window.addEventListener('currencyChange', handleCurrencyChange);
        return () => window.removeEventListener('currencyChange', handleCurrencyChange);
    }, []);

    const activeFilterCount = [
        filters.minPrice,
        filters.maxPrice,
        ...(filters.specialties || []),
        ...(filters.languages || []),
        filters.hasVideo,
        filters.freeIntro,
        filters.verified
    ].filter(Boolean).length;

    return html`
    <div class="coaches-section">
        <div class="container" style=${{ marginTop: '40px', paddingBottom: '40px' }}>
            <!-- Header with title and filter toggle -->
            <div class="coaches-header">
                <h2 class="section-title">
                    ${searchFilters?.searchTerm ? `Search Results (${filteredCoaches.length})` : 'Top Rated Coaches'}
                </h2>
                <div class="header-actions">
                    <button
                        class="filter-toggle-btn ${showFilters ? 'active' : ''}"
                        onClick=${() => setShowFilters(!showFilters)}
                    >
                        <span>⚙️ Filters</span>
                        ${activeFilterCount > 0 && html`<span class="filter-count">${activeFilterCount}</span>`}
                    </button>
                    <select
                        class="sort-select-mobile"
                        value=${filters.sortBy}
                        onChange=${(e) => setFilters({ ...filters, sortBy: e.target.value })}
                    >
                        <option value="relevance">Sort: Relevance</option>
                        <option value="rating">Sort: Highest Rated</option>
                        <option value="price_low">Sort: Price Low-High</option>
                        <option value="price_high">Sort: Price High-Low</option>
                    </select>
                </div>
            </div>

            <div class="coaches-layout ${showFilters ? 'with-filters' : ''}">
                <!-- Filter Sidebar -->
                ${showFilters && html`
                    <${FilterSidebar}
                        filters=${filters}
                        onChange=${setFilters}
                        onReset=${resetFilters}
                    />
                `}

                <!-- Coach List -->
                <div class="coaches-main">
                    ${loading && html`
                        <div class="coach-list">
                            ${[...Array(6)].map((_, i) => html`<${CoachCardSkeleton} key=${'skeleton-' + i} />`)}
                        </div>
                    `}
                    ${!loading && filteredCoaches.length === 0 && html`
                        <div class="empty-state">
                            <div class="empty-state-icon">🔍</div>
                            <div class="empty-state-text">No coaches found</div>
                            <div class="empty-state-subtext">Try adjusting your filters or search criteria</div>
                            ${activeFilterCount > 0 && html`
                                <button class="btn-secondary" onClick=${resetFilters} style=${{ marginTop: '16px' }}>
                                    Clear All Filters
                                </button>
                            `}
                        </div>
                    `}
                    ${!loading && filteredCoaches.length > 0 && html`
                        <div class="results-info">
                            Showing ${filteredCoaches.length} coach${filteredCoaches.length !== 1 ? 'es' : ''}
                        </div>
                        <div class="coach-list">
                            ${filteredCoaches.map(coach => html`<${CoachCard} key=${coach.id} coach=${coach} onViewDetails=${setSelectedCoach} />`)}
                        </div>
                    `}
                </div>
            </div>
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
            console.log('🕐 Loading available slots for:', { coach_id: coach.id, date: selectedDate, duration });

            // Get the day of week for the selected date
            const selectedDateTime = new Date(selectedDate);
            const dayOfWeek = selectedDateTime.getDay(); // 0 = Sunday, 1 = Monday, etc.

            // Load coach availability for this day
            const { data: availability, error: availError } = await window.supabaseClient
                .from('cs_coach_availability')
                .select('*')
                .eq('coach_id', coach.id)
                .eq('day_of_week', dayOfWeek)
                .eq('is_active', true)
                .order('start_time');

            if (availError) {
                console.error('❌ Error loading availability:', availError);
                setAvailableSlots([]);
                return;
            }

            console.log('✅ Found availability slots:', availability);

            // Load existing bookings for this date
            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);

            const { data: bookings, error: bookError } = await window.supabaseClient
                .from('cs_bookings')
                .select('start_time, end_time, status')
                .eq('coach_id', coach.id)
                .gte('start_time', startOfDay.toISOString())
                .lte('start_time', endOfDay.toISOString());

            if (bookError) {
                console.error('❌ Error loading bookings:', bookError);
            }

            console.log('✅ Existing bookings:', bookings);

            // Generate time slots from availability
            const slots = [];
            availability.forEach(avail => {
                const [startHour, startMinute] = avail.start_time.split(':').map(Number);
                const [endHour, endMinute] = avail.end_time.split(':').map(Number);

                const slotDate = new Date(selectedDate);
                slotDate.setHours(startHour, startMinute, 0, 0);

                const endDate = new Date(selectedDate);
                endDate.setHours(endHour, endMinute, 0, 0);

                // Generate slots every 30 minutes
                while (slotDate < endDate) {
                    const slotEnd = new Date(slotDate.getTime() + duration * 60000);

                    // Check if slot end time is within availability
                    if (slotEnd <= endDate) {
                        // Check if slot conflicts with existing bookings (only pending or confirmed)
                        const hasConflict = bookings?.some(booking => {
                            // Only check pending and confirmed bookings
                            if (booking.status !== 'pending' && booking.status !== 'confirmed') {
                                return false;
                            }
                            const bookingStart = new Date(booking.start_time);
                            const bookingEnd = new Date(booking.end_time);
                            return (
                                (slotDate >= bookingStart && slotDate < bookingEnd) ||
                                (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
                                (slotDate <= bookingStart && slotEnd >= bookingEnd)
                            );
                        });

                        if (!hasConflict) {
                            slots.push({
                                start_time: slotDate.toISOString()
                            });
                        }
                    }

                    slotDate.setMinutes(slotDate.getMinutes() + 30);
                }
            });

            console.log('✅ Generated slots:', slots.length);
            setAvailableSlots(slots);
        } catch (error) {
            console.error('❌ Failed to load available slots:', error);
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

        // Check if email is verified before allowing booking
        if (!session.user?.email_confirmed_at) {
            alert('⚠️ Please verify your email address before booking a session.\n\nCheck your inbox for the verification email or click "Resend Email" in the banner above.');
            return;
        }

        setLoading(true);
        try {
            console.log('💾 Starting booking creation...');

            // Get or create client_id using upsert to avoid RLS race conditions
            console.log('📋 Getting or creating client data for user:', session.user.id);
            let clientId = null;

            // First try to fetch existing client
            const { data: existingClient, error: clientFetchError } = await window.supabaseClient
                .from('cs_clients')
                .select('id')
                .eq('user_id', session.user.id)
                .maybeSingle();

            console.log('📋 Client fetch result:', { existingClient, clientFetchError });

            if (existingClient && !clientFetchError) {
                clientId = existingClient.id;
                console.log('✅ Existing client ID:', clientId);
            } else {
                // Use upsert to create or update client record
                // This handles the case where record exists but RLS prevented us from seeing it
                console.log('➕ Upserting client record...');

                const clientData = {
                    user_id: session.user.id,
                    full_name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
                    email: session.user.email,
                    phone: session.user.user_metadata?.phone || null,
                    updated_at: new Date().toISOString()
                };

                const { data: upsertedClient, error: upsertError } = await window.supabaseClient
                    .from('cs_clients')
                    .upsert(clientData, {
                        onConflict: 'user_id', // Use user_id as the conflict target
                        ignoreDuplicates: false // Update if exists
                    })
                    .select('id')
                    .single();

                if (upsertError) {
                    console.error('❌ Error upserting client:', upsertError);

                    // If upsert failed, try one more time to fetch
                    console.log('⚠️ Upsert failed, trying final fetch...');
                    const { data: finalClient, error: finalError } = await window.supabaseClient
                        .from('cs_clients')
                        .select('id')
                        .eq('user_id', session.user.id)
                        .maybeSingle();

                    if (finalClient) {
                        clientId = finalClient.id;
                        console.log('✅ Found client on final fetch:', clientId);
                    } else {
                        console.error('❌ Final fetch failed:', finalError);
                        throw new Error(`Cannot access or create client profile. Error: ${upsertError.message || 'Unknown error'}. Please check database setup.`);
                    }
                } else {
                    clientId = upsertedClient.id;
                    console.log('✅ Client ID from upsert:', clientId);
                }
            }

            // Check if coach has auto-accept enabled
            const { data: coachSettings, error: settingsError } = await window.supabaseClient
                .from('cs_coaches')
                .select('auto_accept_bookings')
                .eq('id', coach.id)
                .single();

            const autoAccept = coachSettings?.auto_accept_bookings || false;
            console.log('✅ Auto-accept setting:', autoAccept);

            // Calculate end time
            const endTime = new Date(new Date(selectedSlot.start_time).getTime() + duration * 60000);

            // Create booking
            const bookingData = {
                coach_id: coach.id,
                client_id: clientId,
                start_time: selectedSlot.start_time,
                end_time: endTime.toISOString(),
                duration_minutes: duration,
                meeting_type: 'online', // Default to online, can be updated later
                status: autoAccept ? 'confirmed' : 'pending',
                amount: parseFloat((coach.hourly_rate * duration / 60).toFixed(2)),
                currency: coach.currency || 'EUR',
                client_notes: notes || null,
                stripe_payment_intent_id: null // TODO: Integrate Stripe
            };

            console.log('📝 Booking data prepared:', bookingData);

            const { data: booking, error: bookingError } = await window.supabaseClient
                .from('cs_bookings')
                .insert([bookingData])
                .select()
                .single();

            if (bookingError) {
                console.error('❌ Booking error:', bookingError);
                throw bookingError;
            }

            console.log('✅ Booking created successfully!', booking);

            const message = autoAccept
                ? 'Booking confirmed! The coach will contact you with meeting details.'
                : 'Booking request sent! The coach will review and confirm your booking.';

            alert(message);
            onClose();
        } catch (error) {
            console.error('❌ Failed to create booking:', error);
            alert('Failed to create booking: ' + error.message);
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
    const [articles, setArticles] = useState([]);
    const [articlesLoading, setArticlesLoading] = useState(true);
    const [selectedArticle, setSelectedArticle] = useState(null);

    // Map database fields to component fields
    const rating = coach.rating_average || coach.rating || 0;
    const reviewsCount = coach.rating_count || coach.reviews_count || 0;
    const location = coach.location || 'Remote';
    const languages = coach.languages || [];
    const specialties = coach.specialties || [];
    const bio = coach.bio || '';

    // Load published articles
    useEffect(() => {
        loadArticles();
    }, [coach.id]);

    const loadArticles = async () => {
        setArticlesLoading(true);
        try {
            if (window.supabaseClient) {
                const { data, error } = await window.supabaseClient
                    .from('cs_articles')
                    .select('*')
                    .eq('coach_id', coach.id)
                    .eq('status', 'published')
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (!error && data) {
                    setArticles(data);
                }
            }
        } catch (error) {
            console.error('Failed to load coach articles:', error);
        } finally {
            setArticlesLoading(false);
        }
    };

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
                    <img src=${coach.avatar_url} alt=${coach.full_name} class="coach-detail-avatar" loading="lazy" />
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

                    ${/* Articles Section */ ''}
                    ${!articlesLoading && articles.length > 0 ? html`
                        <div class="coach-detail-section">
                            <h3 class="coach-detail-section-title">📝 Articles & Insights</h3>
                            <div class="coach-articles-list">
                                ${articles.map(article => html`
                                    <div
                                        key=${article.id}
                                        class="coach-article-preview"
                                        onClick=${() => setSelectedArticle(article)}
                                    >
                                        <h4 class="coach-article-title">${article.title}</h4>
                                        <p class="coach-article-excerpt">
                                            ${article.excerpt || (article.content_html ? article.content_html.replace(/<[^>]*>/g, '').substring(0, 120) + '...' : '')}
                                        </p>
                                        <div class="coach-article-meta">
                                            <span>📅 ${new Date(article.created_at).toLocaleDateString()}</span>
                                            ${article.view_count > 0 && html`<span>👁️ ${article.view_count}</span>`}
                                        </div>
                                    </div>
                                `)}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>

            ${/* Article Detail Modal */ ''}
            ${selectedArticle && html`
                <div class="article-detail-overlay" onClick=${() => setSelectedArticle(null)}>
                    <div class="article-detail-modal" onClick=${(e) => e.stopPropagation()}>
                        <button class="modal-close-btn" onClick=${() => setSelectedArticle(null)}>×</button>
                        <div class="article-detail-content">
                            <h2 class="article-detail-title">${selectedArticle.title}</h2>
                            <div class="article-detail-meta">
                                <span>By ${coach.full_name}</span>
                                <span>•</span>
                                <span>${new Date(selectedArticle.created_at).toLocaleDateString()}</span>
                            </div>
                            <div
                                class="article-detail-body"
                                dangerouslySetInnerHTML=${{ __html: selectedArticle.content_html || '' }}
                            />
                        </div>
                    </div>
                </div>
            `}

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

    // Listen for custom tab switching events from dashboard overview
    useEffect(() => {
        const handleTabSwitch = (event) => {
            setActiveTab(event.detail);
        };
        window.addEventListener('switchTab', handleTabSwitch);
        return () => window.removeEventListener('switchTab', handleTabSwitch);
    }, []);

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
                    <button class="tab-btn ${activeTab === 'session_notes' ? 'active' : ''}" onClick=${() => setActiveTab('session_notes')}>
                        ${t('dashboard.session_notes') || 'Session Notes'}
                    </button>
                    <button class="tab-btn ${activeTab === 'articles' ? 'active' : ''}" onClick=${() => setActiveTab('articles')}>
                        ${t('dashboard.articles')}
                    </button>
                    <button class="tab-btn ${activeTab === 'probono' ? 'active' : ''}" onClick=${() => setActiveTab('probono')}>
                        ${t('dashboard.probono')}
                    </button>
                `}
                <button class="tab-btn ${activeTab === 'referrals' ? 'active' : ''}" onClick=${() => setActiveTab('referrals')}>
                    ${t('dashboard.referrals') || 'Referrals'}
                </button>
                <button class="tab-btn ${activeTab === 'profile' ? 'active' : ''}" onClick=${() => setActiveTab('profile')}>
                    ${t('dashboard.profile')}
                </button>
            </div>

            ${activeTab === 'overview' && html`<${DashboardOverview} userType=${userType} session=${session} />`}
            ${activeTab === 'bookings' && html`<${DashboardBookings} session=${session} userType=${userType} />`}
            ${activeTab === 'availability' && userType === 'coach' && html`<${DashboardAvailability} session=${session} />`}
            ${activeTab === 'session_notes' && userType === 'coach' && html`<${SessionNotesDashboard} session=${session} />`}
            ${activeTab === 'articles' && userType === 'coach' && html`<${DashboardArticles} session=${session} />`}
            ${activeTab === 'probono' && userType === 'coach' && html`<${DashboardProBono} session=${session} />`}
            ${activeTab === 'referrals' && html`<${ReferralDashboard} session=${session} />`}
            ${activeTab === 'profile' && html`<${DashboardProfile} session=${session} userType=${userType} />`}
        </div>
    `;
};

const DashboardOverview = ({ userType, session }) => {
    const [stats, setStats] = useState({
        totalBookings: 0,
        upcomingSessions: 0,
        completedSessions: 0,
        totalEarnings: 0,
        proBonoHours: 0,
        averageRating: 0,
        totalReviews: 0,
        responseRate: 100,
        unreadMessages: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [upcomingBookings, setUpcomingBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, [userType]);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            if (!window.supabaseClient || !session) {
                console.warn('Supabase client or session not available');
                setLoading(false);
                return;
            }

            const userId = session.user.id;

            // Load bookings statistics
            const { data: bookings, error: bookingsError } = await window.supabaseClient
                .from('cs_bookings')
                .select('*')
                .or(`client_id.eq.${userId},coach_id.eq.${userId}`);

            if (!bookingsError && bookings) {
                const now = new Date();
                const upcoming = bookings.filter(b =>
                    new Date(b.start_time) > now &&
                    (b.status === 'confirmed' || b.status === 'pending')
                );
                const completed = bookings.filter(b => b.status === 'completed');

                setStats(prev => ({
                    ...prev,
                    totalBookings: bookings.length,
                    upcomingSessions: upcoming.length,
                    completedSessions: completed.length
                }));

                // Set upcoming bookings for quick view
                setUpcomingBookings(upcoming.slice(0, 3));
            }

            // If coach, load additional stats
            if (userType === 'coach') {
                // Load coach profile for rating
                const { data: coachData } = await window.supabaseClient
                    .from('cs_coaches')
                    .select('rating_average, total_reviews, total_sessions, total_earnings')
                    .eq('user_id', userId)
                    .single();

                if (coachData) {
                    setStats(prev => ({
                        ...prev,
                        averageRating: coachData.rating_average || 0,
                        totalReviews: coachData.total_reviews || 0,
                        totalEarnings: coachData.total_earnings || 0
                    }));
                }

                // Load pro bono hours
                const { data: proBonoData } = await window.supabaseClient
                    .from('cs_pro_bono_bookings')
                    .select('duration_minutes')
                    .eq('coach_id', userId)
                    .eq('status', 'completed');

                if (proBonoData) {
                    const totalMinutes = proBonoData.reduce((sum, b) => sum + (b.duration_minutes || 0), 0);
                    setStats(prev => ({
                        ...prev,
                        proBonoHours: (totalMinutes / 60).toFixed(1)
                    }));
                }

                // Load unread messages count
                const { data: messagesData } = await window.supabaseClient
                    .from('cs_messages')
                    .select('id', { count: 'exact' })
                    .eq('recipient_id', userId)
                    .eq('is_read', false);

                if (messagesData) {
                    setStats(prev => ({
                        ...prev,
                        unreadMessages: messagesData.length
                    }));
                }
            }

            // Load recent activity (last 5 bookings)
            if (bookings && bookings.length > 0) {
                const sorted = [...bookings].sort((a, b) =>
                    new Date(b.created_at) - new Date(a.created_at)
                ).slice(0, 5);
                setRecentActivity(sorted);
            }

        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDateTime = (dateStr) => {
        const date = new Date(dateStr);
        return {
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
    };

    if (loading) {
        return html`
            <div class="dashboard-overview-loading">
                <div class="dashboard-grid">
                    ${[1, 2, 3, 4].map(i => html`
                        <div key=${i} class="stat-card skeleton-card">
                            <div class="skeleton-line" style=${{ width: '60%', height: '14px', marginBottom: '12px' }}></div>
                            <div class="skeleton-line" style=${{ width: '40%', height: '32px' }}></div>
                        </div>
                    `)}
                </div>
            </div>
        `;
    }

    return html`
        <div class="dashboard-overview">
            <!-- Statistics Cards -->
            <div class="dashboard-grid">
                <div class="stat-card stat-card-blue">
                    <div class="stat-icon">📅</div>
                    <div class="stat-content">
                        <div class="stat-label">Total Bookings</div>
                        <div class="stat-value">${stats.totalBookings}</div>
                        <div class="stat-trend">
                            ${stats.completedSessions > 0 && html`
                                <span class="stat-subtext">${stats.completedSessions} completed</span>
                            `}
                        </div>
                    </div>
                </div>

                <div class="stat-card stat-card-petrol">
                    <div class="stat-icon">🕐</div>
                    <div class="stat-content">
                        <div class="stat-label">Upcoming Sessions</div>
                        <div class="stat-value">${stats.upcomingSessions}</div>
                        ${stats.upcomingSessions > 0 && html`
                            <div class="stat-subtext">Next session soon</div>
                        `}
                    </div>
                </div>

                ${userType === 'coach' && html`
                    <div class="stat-card stat-card-yellow">
                        <div class="stat-icon">⭐</div>
                        <div class="stat-content">
                            <div class="stat-label">Average Rating</div>
                            <div class="stat-value">${stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}</div>
                            ${stats.totalReviews > 0 && html`
                                <div class="stat-subtext">${stats.totalReviews} review${stats.totalReviews !== 1 ? 's' : ''}</div>
                            `}
                        </div>
                    </div>

                    <div class="stat-card stat-card-green">
                        <div class="stat-icon">💰</div>
                        <div class="stat-content">
                            <div class="stat-label">Total Earnings</div>
                            <div class="stat-value">${formatPrice(stats.totalEarnings)}</div>
                            ${stats.completedSessions > 0 && html`
                                <div class="stat-subtext">${stats.completedSessions} sessions</div>
                            `}
                        </div>
                    </div>

                    <div class="stat-card stat-card-purple">
                        <div class="stat-icon">🎁</div>
                        <div class="stat-content">
                            <div class="stat-label">Pro-bono Hours</div>
                            <div class="stat-value">${stats.proBonoHours}h</div>
                            <div class="stat-subtext">Community impact</div>
                        </div>
                    </div>

                    ${stats.unreadMessages > 0 && html`
                        <div class="stat-card stat-card-orange" style=${{ cursor: 'pointer' }} onClick=${() => {
                            const event = new CustomEvent('switchTab', { detail: 'messages' });
                            window.dispatchEvent(event);
                        }}>
                            <div class="stat-icon">💬</div>
                            <div class="stat-content">
                                <div class="stat-label">Unread Messages</div>
                                <div class="stat-value">${stats.unreadMessages}</div>
                                <div class="stat-subtext">Click to view</div>
                            </div>
                        </div>
                    `}
                `}
            </div>

            <!-- Quick Actions -->
            <div class="dashboard-section">
                <h3 class="section-subtitle">Quick Actions</h3>
                <div class="quick-actions-grid">
                    ${userType === 'coach' ? html`
                        <button class="quick-action-card" onClick=${() => {
                            const event = new CustomEvent('switchTab', { detail: 'availability' });
                            window.dispatchEvent(event);
                        }}>
                            <div class="quick-action-icon">📆</div>
                            <div class="quick-action-title">Set Availability</div>
                            <div class="quick-action-desc">Update your schedule</div>
                        </button>
                        <button class="quick-action-card" onClick=${() => {
                            const event = new CustomEvent('switchTab', { detail: 'articles' });
                            window.dispatchEvent(event);
                        }}>
                            <div class="quick-action-icon">✍️</div>
                            <div class="quick-action-title">Write Article</div>
                            <div class="quick-action-desc">Share your expertise</div>
                        </button>
                        <button class="quick-action-card" onClick=${() => {
                            const event = new CustomEvent('switchTab', { detail: 'probono' });
                            window.dispatchEvent(event);
                        }}>
                            <div class="quick-action-icon">🎁</div>
                            <div class="quick-action-title">Add Pro-bono Slot</div>
                            <div class="quick-action-desc">Give back to community</div>
                        </button>
                        <button class="quick-action-card" onClick=${() => {
                            const event = new CustomEvent('switchTab', { detail: 'profile' });
                            window.dispatchEvent(event);
                        }}>
                            <div class="quick-action-icon">👤</div>
                            <div class="quick-action-title">Edit Profile</div>
                            <div class="quick-action-desc">Update your info</div>
                        </button>
                    ` : html`
                        <button class="quick-action-card" onClick=${() => window.location.hash = '#coaches'}>
                            <div class="quick-action-icon">🔍</div>
                            <div class="quick-action-title">Find a Coach</div>
                            <div class="quick-action-desc">Browse coaches</div>
                        </button>
                        <button class="quick-action-card" onClick=${() => {
                            const event = new CustomEvent('switchTab', { detail: 'bookings' });
                            window.dispatchEvent(event);
                        }}>
                            <div class="quick-action-icon">📅</div>
                            <div class="quick-action-title">My Bookings</div>
                            <div class="quick-action-desc">View your sessions</div>
                        </button>
                        <button class="quick-action-card" onClick=${() => {
                            const event = new CustomEvent('switchTab', { detail: 'profile' });
                            window.dispatchEvent(event);
                        }}>
                            <div class="quick-action-icon">👤</div>
                            <div class="quick-action-title">Edit Profile</div>
                            <div class="quick-action-desc">Update your info</div>
                        </button>
                    `}
                </div>
            </div>

            <!-- Two Column Layout for Upcoming and Activity -->
            <div class="dashboard-columns">
                <!-- Upcoming Sessions -->
                <div class="dashboard-section">
                    <h3 class="section-subtitle">Upcoming Sessions</h3>
                    ${upcomingBookings.length === 0 ? html`
                        <div class="empty-state-mini">
                            <div class="empty-icon">📅</div>
                            <div class="empty-text">No upcoming sessions</div>
                        </div>
                    ` : html`
                        <div class="upcoming-sessions-list">
                            ${upcomingBookings.map(booking => {
                                const dt = formatDateTime(booking.start_time);
                                return html`
                                    <div key=${booking.id} class="upcoming-session-card">
                                        <div class="session-date-badge">
                                            <div class="session-date-day">${dt.date.split(' ')[1]}</div>
                                            <div class="session-date-month">${dt.date.split(' ')[0]}</div>
                                        </div>
                                        <div class="session-details">
                                            <div class="session-title">
                                                ${userType === 'coach' ? 'Session with Client' : 'Coaching Session'}
                                            </div>
                                            <div class="session-time">⏰ ${dt.time}</div>
                                            <div class="session-duration">${booking.duration_minutes} min • ${booking.meeting_type}</div>
                                        </div>
                                        <div class="session-status">
                                            <span class="status-badge status-${booking.status}">${booking.status}</span>
                                        </div>
                                    </div>
                                `;
                            })}
                        </div>
                        ${stats.upcomingSessions > 3 && html`
                            <button class="view-all-link" onClick=${() => {
                                const event = new CustomEvent('switchTab', { detail: 'bookings' });
                                window.dispatchEvent(event);
                            }}>
                                View all ${stats.upcomingSessions} upcoming sessions →
                            </button>
                        `}
                    `}
                </div>

                <!-- Recent Activity -->
                <div class="dashboard-section">
                    <h3 class="section-subtitle">Recent Activity</h3>
                    ${recentActivity.length === 0 ? html`
                        <div class="empty-state-mini">
                            <div class="empty-icon">📊</div>
                            <div class="empty-text">No recent activity</div>
                        </div>
                    ` : html`
                        <div class="activity-list">
                            ${recentActivity.map(activity => {
                                const dt = formatDateTime(activity.created_at);
                                return html`
                                    <div key=${activity.id} class="activity-item">
                                        <div class="activity-icon">
                                            ${activity.status === 'completed' ? '✅' :
                                              activity.status === 'confirmed' ? '📅' :
                                              activity.status === 'pending' ? '⏳' : '❌'}
                                        </div>
                                        <div class="activity-content">
                                            <div class="activity-title">
                                                ${activity.status === 'completed' ? 'Session completed' :
                                                  activity.status === 'confirmed' ? 'Booking confirmed' :
                                                  activity.status === 'pending' ? 'New booking request' :
                                                  'Booking cancelled'}
                                            </div>
                                            <div class="activity-time">${dt.date} at ${dt.time}</div>
                                        </div>
                                    </div>
                                `;
                            })}
                        </div>
                    `}
                </div>
            </div>

            ${(stats.totalBookings === 0 && userType === 'client') && html`
                <div class="welcome-card">
                    <h3>👋 Welcome to CoachSearching!</h3>
                    <p>You haven't booked any sessions yet. Start your coaching journey today!</p>
                    <button class="btn-primary" onClick=${() => window.location.hash = '#coaches'}>
                        Browse Coaches
                    </button>
                </div>
            `}

            ${(stats.totalBookings === 0 && userType === 'coach') && html`
                <div class="welcome-card">
                    <h3>👋 Welcome, Coach!</h3>
                    <p>Complete your profile and set your availability to start receiving bookings.</p>
                    <div style=${{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                        <button class="btn-primary" onClick=${() => {
                            const event = new CustomEvent('switchTab', { detail: 'profile' });
                            window.dispatchEvent(event);
                        }}>
                            Complete Profile
                        </button>
                        <button class="btn-secondary" onClick=${() => {
                            const event = new CustomEvent('switchTab', { detail: 'availability' });
                            window.dispatchEvent(event);
                        }}>
                            Set Availability
                        </button>
                    </div>
                </div>
            `}
        </div>
    `;
};

// Booking Acceptance Modal Component
const BookingAcceptModal = ({ booking, onClose, onAccept }) => {
    const [meetingType, setMeetingType] = useState(booking.meeting_type || 'online');
    const [meetingLink, setMeetingLink] = useState('');
    const [meetingAddress, setMeetingAddress] = useState('');
    const [coachNotes, setCoachNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAccept = async () => {
        if (meetingType === 'online' && !meetingLink.trim()) {
            alert('Please provide a meeting link');
            return;
        }
        if (meetingType === 'onsite' && !meetingAddress.trim()) {
            alert('Please provide a meeting address');
            return;
        }

        setLoading(true);
        try {
            await onAccept({
                meeting_type: meetingType,
                meeting_link: meetingType === 'online' ? meetingLink : null,
                meeting_address: meetingType === 'onsite' ? meetingAddress : null,
                coach_notes: coachNotes || null
            });
        } finally {
            setLoading(false);
        }
    };

    const formatDateTime = (dateTimeStr) => {
        const date = new Date(dateTimeStr);
        return {
            date: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
            time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
    };

    const dt = formatDateTime(booking.start_time);

    return html`
        <div class="booking-modal" onClick=${onClose}>
            <div class="booking-content" onClick=${(e) => e.stopPropagation()}>
                <div class="booking-header">
                    <h2>Accept Booking Request</h2>
                    <button class="modal-close-btn" onClick=${onClose}>×</button>
                </div>

                <div class="booking-details-summary">
                    <h3>Session Details</h3>
                    <div class="summary-row">
                        <span>Client:</span>
                        <span>${booking.client?.full_name || 'Client'}</span>
                    </div>
                    <div class="summary-row">
                        <span>Date:</span>
                        <span>${dt.date}</span>
                    </div>
                    <div class="summary-row">
                        <span>Time:</span>
                        <span>${dt.time}</span>
                    </div>
                    <div class="summary-row">
                        <span>Duration:</span>
                        <span>${booking.duration_minutes} minutes</span>
                    </div>
                    ${booking.client_notes && html`
                        <div class="summary-row" style=${{ flexDirection: 'column', alignItems: 'flex-start' }}>
                            <span style=${{ fontWeight: 600, marginBottom: '4px' }}>Client Notes:</span>
                            <span style=${{ color: '#666' }}>${booking.client_notes}</span>
                        </div>
                    `}
                </div>

                <div class="form-group" style=${{ marginTop: '20px' }}>
                    <label style=${{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>Meeting Type</label>
                    <div style=${{ display: 'flex', gap: '12px' }}>
                        <button
                            class="filter-toggle-btn ${meetingType === 'online' ? 'active' : ''}"
                            onClick=${() => setMeetingType('online')}
                            style=${{ flex: 1 }}
                        >
                            💻 Online
                        </button>
                        <button
                            class="filter-toggle-btn ${meetingType === 'onsite' ? 'active' : ''}"
                            onClick=${() => setMeetingType('onsite')}
                            style=${{ flex: 1 }}
                        >
                            📍 On-site
                        </button>
                    </div>
                </div>

                ${meetingType === 'online' ? html`
                    <div class="form-group">
                        <label style=${{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                            Meeting Link * (MS Teams, Zoom, Google Meet, etc.)
                        </label>
                        <input
                            type="url"
                            class="form-control"
                            placeholder="https://teams.microsoft.com/..."
                            value=${meetingLink}
                            onInput=${(e) => setMeetingLink(e.target.value)}
                        />
                    </div>
                ` : html`
                    <div class="form-group">
                        <label style=${{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                            Meeting Address *
                        </label>
                        <textarea
                            class="form-control"
                            rows="3"
                            placeholder="Enter the address where you'll meet the client..."
                            value=${meetingAddress}
                            onInput=${(e) => setMeetingAddress(e.target.value)}
                        ></textarea>
                    </div>
                `}

                <div class="form-group">
                    <label style=${{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                        Notes to Client (Optional)
                    </label>
                    <textarea
                        class="form-control"
                        rows="3"
                        placeholder="Any additional information for the client..."
                        value=${coachNotes}
                        onInput=${(e) => setCoachNotes(e.target.value)}
                    ></textarea>
                </div>

                <div style=${{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button
                        class="btn-secondary"
                        onClick=${onClose}
                        disabled=${loading}
                        style=${{ flex: 1 }}
                    >
                        Cancel
                    </button>
                    <button
                        class="btn-primary"
                        onClick=${handleAccept}
                        disabled=${loading}
                        style=${{ flex: 1 }}
                    >
                        ${loading ? 'Accepting...' : 'Accept & Confirm'}
                    </button>
                </div>
            </div>
        </div>
    `;
};

const DashboardBookings = ({ session, userType }) => {
    const [bookings, setBookings] = useState([]);
    const [filteredBookings, setFilteredBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
    const [acceptingBooking, setAcceptingBooking] = useState(null);

    useEffect(() => {
        loadBookings();
    }, []);

    useEffect(() => {
        filterBookings();
    }, [bookings, searchQuery, statusFilter]);

    const loadBookings = async () => {
        setLoading(true);
        try {
            if (window.supabaseClient && session) {
                console.log('📋 Loading bookings for user type:', userType);

                let bookingsData = [];

                if (userType === 'coach') {
                    // Get coach_id
                    const { data: coachData } = await window.supabaseClient
                        .from('cs_coaches')
                        .select('id')
                        .eq('user_id', session.user.id)
                        .single();

                    if (coachData) {
                        const { data, error } = await window.supabaseClient
                            .from('cs_bookings')
                            .select(`
                                *,
                                client:cs_clients!client_id(full_name, email, phone)
                            `)
                            .eq('coach_id', coachData.id)
                            .order('start_time', { ascending: false });

                        if (!error && data) {
                            bookingsData = data;
                        }
                    }
                } else {
                    // Client view
                    const { data: clientData } = await window.supabaseClient
                        .from('cs_clients')
                        .select('id')
                        .eq('user_id', session.user.id)
                        .single();

                    if (clientData) {
                        const { data, error } = await window.supabaseClient
                            .from('cs_bookings')
                            .select(`
                                *,
                                coach:cs_coaches!coach_id(full_name, title, avatar_url)
                            `)
                            .eq('client_id', clientData.id)
                            .order('start_time', { ascending: false });

                        if (!error && data) {
                            bookingsData = data;
                        }
                    }
                }

                console.log('✅ Loaded bookings:', bookingsData.length);
                setBookings(bookingsData);
            }
        } catch (error) {
            console.error('❌ Failed to load bookings:', error);
            setBookings([]);
        } finally {
            setLoading(false);
        }
    };

    const filterBookings = () => {
        let filtered = [...bookings];

        // Apply status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(b => b.status === statusFilter);
        }

        // Apply search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(b =>
                (b.client_notes && b.client_notes.toLowerCase().includes(query)) ||
                (b.coach_notes && b.coach_notes.toLowerCase().includes(query)) ||
                b.status.toLowerCase().includes(query) ||
                b.meeting_type.toLowerCase().includes(query)
            );
        }

        setFilteredBookings(filtered);
    };

    const handleAcceptBooking = async (bookingDetails) => {
        try {
            console.log('✅ Accepting booking:', acceptingBooking.id, bookingDetails);

            const { error } = await window.supabaseClient
                .from('cs_bookings')
                .update({
                    status: 'confirmed',
                    meeting_type: bookingDetails.meeting_type,
                    meeting_link: bookingDetails.meeting_link,
                    meeting_address: bookingDetails.meeting_address,
                    coach_notes: bookingDetails.coach_notes
                })
                .eq('id', acceptingBooking.id);

            if (error) {
                console.error('❌ Error accepting booking:', error);
                throw error;
            }

            console.log('✅ Booking accepted successfully');
            setMessage('✓ Booking accepted and confirmed!');
            setAcceptingBooking(null);
            await loadBookings();
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('❌ Failed to accept booking:', error);
            alert('Failed to accept booking: ' + error.message);
        }
    };

    const handleCancelBooking = async (bookingId) => {
        if (!confirm('Are you sure you want to cancel this booking?')) {
            return;
        }

        const reason = prompt('Please provide a reason for cancellation (optional):');

        try {
            const { error } = await window.supabaseClient
                .from('cs_bookings')
                .update({
                    status: 'cancelled',
                    cancellation_reason: reason || 'No reason provided'
                })
                .eq('id', bookingId);

            if (error) {
                throw error;
            }

            setMessage('✓ Booking cancelled successfully');
            await loadBookings();
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('❌ Cancel booking error:', error);
            alert('Failed to cancel booking: ' + error.message);
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
            <div class="bookings-loading">
                ${[1, 2, 3].map(i => html`
                    <div key=${i} class="booking-card skeleton-card">
                        <div class="skeleton-line" style=${{ width: '60%', height: '20px', marginBottom: '12px' }}></div>
                        <div class="skeleton-line" style=${{ width: '100%', height: '14px', marginBottom: '8px' }}></div>
                        <div class="skeleton-line" style=${{ width: '80%', height: '14px' }}></div>
                    </div>
                `)}
            </div>
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
                    ${userType === 'client' && html`
                        <button class="btn-primary" style=${{ marginTop: '16px' }} onClick=${() => window.location.hash = '#coaches'}>
                            Browse Coaches
                        </button>
                    `}
                </div>
            </div>
        `;
    }

    const statusCounts = {
        all: bookings.length,
        pending: bookings.filter(b => b.status === 'pending').length,
        confirmed: bookings.filter(b => b.status === 'confirmed').length,
        completed: bookings.filter(b => b.status === 'completed').length,
        cancelled: bookings.filter(b => b.status === 'cancelled').length
    };

    return html`
        <div class="bookings-container">
            ${message && html`
                <div class="success-message" style=${{ marginBottom: '20px', padding: '12px', background: '#d4edda', color: '#155724', borderRadius: '4px' }}>
                    ${message}
                </div>
            `}

            <!-- Filters and Search Bar -->
            <div class="bookings-controls">
                <div class="search-bar-container">
                    <input
                        type="text"
                        class="search-input"
                        placeholder="🔍 Search bookings..."
                        value=${searchQuery}
                        onInput=${(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div class="filter-tabs">
                    <button
                        class="filter-tab ${statusFilter === 'all' ? 'active' : ''}"
                        onClick=${() => setStatusFilter('all')}
                    >
                        All (${statusCounts.all})
                    </button>
                    <button
                        class="filter-tab ${statusFilter === 'pending' ? 'active' : ''}"
                        onClick=${() => setStatusFilter('pending')}
                    >
                        Pending (${statusCounts.pending})
                    </button>
                    <button
                        class="filter-tab ${statusFilter === 'confirmed' ? 'active' : ''}"
                        onClick=${() => setStatusFilter('confirmed')}
                    >
                        Confirmed (${statusCounts.confirmed})
                    </button>
                    <button
                        class="filter-tab ${statusFilter === 'completed' ? 'active' : ''}"
                        onClick=${() => setStatusFilter('completed')}
                    >
                        Completed (${statusCounts.completed})
                    </button>
                    <button
                        class="filter-tab ${statusFilter === 'cancelled' ? 'active' : ''}"
                        onClick=${() => setStatusFilter('cancelled')}
                    >
                        Cancelled (${statusCounts.cancelled})
                    </button>
                </div>
            </div>

            <!-- Results count -->
            <div class="results-count">
                Showing ${filteredBookings.length} of ${bookings.length} booking${bookings.length !== 1 ? 's' : ''}
            </div>

            ${filteredBookings.length === 0 ? html`
                <div class="empty-state-mini">
                    <div class="empty-icon">🔍</div>
                    <div class="empty-text">No bookings match your filters</div>
                    <button class="btn-secondary" style=${{ marginTop: '12px' }} onClick=${() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                    }}>
                        Clear Filters
                    </button>
                </div>
            ` : html`
                <div class="bookings-list">
                    ${filteredBookings.map(booking => {
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
                                ${userType === 'coach' && booking.status === 'pending' && html`
                                    <button
                                        class="btn-small btn-primary"
                                        onClick=${() => setAcceptingBooking(booking)}
                                        style=${{ marginRight: '8px' }}
                                    >
                                        ✓ Accept Booking
                                    </button>
                                `}
                                ${canCancel && html`
                                    <button
                                        class="btn-small btn-secondary"
                                        onClick=${() => handleCancelBooking(booking.id)}
                                    >
                                        Cancel Booking
                                    </button>
                                `}
                                ${booking.status === 'cancelled' && booking.cancellation_reason && html`
                                    <div class="booking-detail-row" style=${{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
                                        <span>Cancellation reason: ${booking.cancellation_reason}</span>
                                    </div>
                                `}
                            </div>
                        </div>
                    `;
                    })}
                </div>
            `}

            ${acceptingBooking && html`
                <${BookingAcceptModal}
                    booking=${acceptingBooking}
                    onClose=${() => setAcceptingBooking(null)}
                    onAccept=${handleAcceptBooking}
                />
            `}
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
            console.log('🕐 Loading availability for user:', session.user.id);

            // First get coach_id from cs_coaches table
            const { data: coachData, error: coachError } = await window.supabaseClient
                .from('cs_coaches')
                .select('id')
                .eq('user_id', session.user.id)
                .single();

            if (coachError) {
                console.error('❌ Coach fetch error:', coachError);
                setWeeklySlots([]);
                return;
            }

            console.log('✅ Coach ID:', coachData.id);

            // Load availability slots for this coach
            const { data: slotsData, error: slotsError } = await window.supabaseClient
                .from('cs_coach_availability')
                .select('*')
                .eq('coach_id', coachData.id)
                .order('day_of_week', { ascending: true })
                .order('start_time', { ascending: true });

            if (slotsError) {
                console.error('❌ Slots fetch error:', slotsError);
                setWeeklySlots([]);
                return;
            }

            console.log('✅ Loaded availability slots:', slotsData?.length || 0);
            setWeeklySlots(slotsData || []);
        } catch (error) {
            console.error('❌ Failed to load availability:', error);
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
            console.log('💾 Starting availability save...');
            console.log('📋 Current slots:', weeklySlots);

            // Get coach_id from cs_coaches table
            console.log('📋 Fetching coach data for user:', session.user.id);
            const { data: coachData, error: coachError } = await window.supabaseClient
                .from('cs_coaches')
                .select('id')
                .eq('user_id', session.user.id)
                .single();

            if (coachError) {
                console.error('❌ Coach fetch error:', coachError);
                throw new Error('Coach profile not found. Please complete your profile first.');
            }

            console.log('✅ Coach ID:', coachData.id);

            // Delete all existing availability slots for this coach
            console.log('🗑️ Deleting existing availability slots...');
            const { error: deleteError } = await window.supabaseClient
                .from('cs_coach_availability')
                .delete()
                .eq('coach_id', coachData.id);

            if (deleteError) {
                console.error('❌ Delete error:', deleteError);
                throw deleteError;
            }

            console.log('✅ Existing slots deleted');

            // Insert new slots if there are any
            if (weeklySlots.length > 0) {
                const slotsToInsert = weeklySlots.map(slot => ({
                    coach_id: coachData.id,
                    day_of_week: slot.day_of_week,
                    start_time: slot.start_time,
                    end_time: slot.end_time,
                    is_active: slot.is_active !== false
                }));

                console.log('➕ Inserting new slots:', slotsToInsert);

                const { data: insertedData, error: insertError } = await window.supabaseClient
                    .from('cs_coach_availability')
                    .insert(slotsToInsert)
                    .select();

                if (insertError) {
                    console.error('❌ Insert error:', insertError);
                    throw insertError;
                }

                console.log('✅ Slots inserted successfully:', insertedData);
            } else {
                console.log('ℹ️ No slots to insert (all cleared)');
            }

            setMessage('✓ Availability updated successfully!');
            await loadAvailability(); // Reload to get IDs
            setTimeout(() => setMessage(''), 3000);

        } catch (error) {
            console.error('❌ Save error:', error);
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
    const [loading, setLoading] = useState(true);
    const [showEditor, setShowEditor] = useState(false);
    const [editingArticle, setEditingArticle] = useState(null);

    useEffect(() => {
        loadArticles();
    }, []);

    const loadArticles = async () => {
        setLoading(true);
        try {
            if (window.supabaseClient && session) {
                // First get coach_id from cs_coaches table
                const { data: coachData } = await window.supabaseClient
                    .from('cs_coaches')
                    .select('id')
                    .eq('user_id', session.user.id)
                    .single();

                if (coachData) {
                    const { data, error } = await window.supabaseClient
                        .from('cs_articles')
                        .select('*')
                        .eq('coach_id', coachData.id)
                        .order('created_at', { ascending: false });

                    if (!error && data) {
                        setArticles(data);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load articles:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (article) => {
        setEditingArticle(article);
        setShowEditor(true);
    };

    const handleDelete = async (articleId) => {
        if (!confirm('Are you sure you want to delete this article?')) {
            return;
        }

        try {
            const { error } = await window.supabaseClient
                .from('cs_articles')
                .delete()
                .eq('id', articleId);

            if (!error) {
                await loadArticles();
            }
        } catch (error) {
            console.error('Failed to delete article:', error);
            alert('Failed to delete article');
        }
    };

    const handleTogglePublish = async (article) => {
        try {
            const newStatus = article.status === 'published' ? 'draft' : 'published';
            const { error } = await window.supabaseClient
                .from('cs_articles')
                .update({ status: newStatus })
                .eq('id', article.id);

            if (!error) {
                await loadArticles();
            }
        } catch (error) {
            console.error('Failed to update article:', error);
        }
    };

    const handleCloseEditor = () => {
        setShowEditor(false);
        setEditingArticle(null);
        loadArticles();
    };

    if (loading) {
        return html`
            <div class="articles-loading">
                ${[1, 2].map(i => html`
                    <div key=${i} class="article-card skeleton-card">
                        <div class="skeleton-line" style=${{ width: '70%', height: '24px', marginBottom: '12px' }}></div>
                        <div class="skeleton-line" style=${{ width: '100%', height: '14px', marginBottom: '8px' }}></div>
                        <div class="skeleton-line" style=${{ width: '90%', height: '14px' }}></div>
                    </div>
                `)}
            </div>
        `;
    }

    return html`
        <div class="articles-container">
            <div class="articles-header">
                <h3 class="section-subtitle">${t('dashboard.articles')}</h3>
                <button class="btn-primary" onClick=${() => {
                    setEditingArticle(null);
                    setShowEditor(!showEditor);
                }}>
                    ${showEditor ? '✕ Close Editor' : '✍️ Write New Article'}
                </button>
            </div>

            ${showEditor && html`
                <${ArticleEditor}
                    session=${session}
                    article=${editingArticle}
                    onClose=${handleCloseEditor}
                />
            `}

            ${!showEditor && articles.length === 0 && html`
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <div class="empty-state-text">No articles yet</div>
                    <div class="empty-state-subtext">Create your first article to share your expertise!</div>
                    <button class="btn-primary" style=${{ marginTop: '16px' }} onClick=${() => setShowEditor(true)}>
                        ✍️ Write Your First Article
                    </button>
                </div>
            `}

            ${!showEditor && articles.length > 0 && html`
                <div class="articles-list">
                    ${articles.map(article => html`
                        <div key=${article.id} class="article-card">
                            <div class="article-card-header">
                                <div class="article-card-title">
                                    <h4>${article.title}</h4>
                                    <span class="status-badge ${article.status === 'published' ? 'status-confirmed' : 'status-pending'}">
                                        ${article.status === 'published' ? '✓ Published' : '📝 Draft'}
                                    </span>
                                </div>
                                <div class="article-card-meta">
                                    <span>📅 ${new Date(article.created_at).toLocaleDateString()}</span>
                                    ${article.view_count > 0 && html`
                                        <span>👁️ ${article.view_count} views</span>
                                    `}
                                </div>
                            </div>

                            <div class="article-card-excerpt">
                                ${article.excerpt || (article.content_html ? article.content_html.replace(/<[^>]*>/g, '').substring(0, 150) + '...' : '')}
                            </div>

                            <div class="article-card-actions">
                                <button class="btn-small btn-secondary" onClick=${() => handleEdit(article)}>
                                    ✏️ Edit
                                </button>
                                <button
                                    class="btn-small ${article.status === 'published' ? 'btn-secondary' : 'btn-primary'}"
                                    onClick=${() => handleTogglePublish(article)}
                                >
                                    ${article.status === 'published' ? '📥 Unpublish' : '🚀 Publish'}
                                </button>
                                <button class="btn-small btn-danger" onClick=${() => handleDelete(article.id)}>
                                    🗑️ Delete
                                </button>
                            </div>
                        </div>
                    `)}
                </div>
            `}
        </div>
    `;
};

const ArticleEditor = ({ session, article, onClose }) => {
    const [title, setTitle] = useState(article?.title || '');
    const [excerpt, setExcerpt] = useState(article?.excerpt || '');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const editorRef = useRef(null);

    // Initialize WYSIWYG editor content
    useEffect(() => {
        if (editorRef.current && article?.content_html) {
            editorRef.current.innerHTML = article.content_html;
        }
    }, [article]);

    // WYSIWYG formatting functions using contenteditable
    const formatBold = () => {
        document.execCommand('bold', false, null);
        editorRef.current?.focus();
    };

    const formatItalic = () => {
        document.execCommand('italic', false, null);
        editorRef.current?.focus();
    };

    const formatHeading2 = () => {
        document.execCommand('formatBlock', false, '<h2>');
        editorRef.current?.focus();
    };

    const formatHeading3 = () => {
        document.execCommand('formatBlock', false, '<h3>');
        editorRef.current?.focus();
    };

    const formatBulletList = () => {
        document.execCommand('insertUnorderedList', false, null);
        editorRef.current?.focus();
    };

    const formatNumberedList = () => {
        document.execCommand('insertOrderedList', false, null);
        editorRef.current?.focus();
    };

    const formatLink = () => {
        const url = prompt('Enter URL:');
        if (url) {
            document.execCommand('createLink', false, url);
            editorRef.current?.focus();
        }
    };

    const handleSave = async (publishNow = false) => {
        if (!title.trim()) {
            setMessage('Error: Please enter a title');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        const contentHTML = editorRef.current?.innerHTML || '';
        const plainText = editorRef.current?.innerText || '';

        if (!plainText.trim()) {
            setMessage('Error: Please enter content');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        setSaving(true);
        setMessage('');

        try {
            console.log('💾 Starting article save...');

            // Generate slug from title
            const slug = title.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');

            // Get coach_id from cs_coaches table
            console.log('📋 Fetching coach data for user:', session.user.id);
            const { data: coachData, error: coachError } = await window.supabaseClient
                .from('cs_coaches')
                .select('id')
                .eq('user_id', session.user.id)
                .single();

            if (coachError) {
                console.error('❌ Coach fetch error:', coachError);
                throw new Error('Coach profile not found. Please complete your profile first.');
            }

            console.log('✅ Coach ID:', coachData.id);

            const articleData = {
                coach_id: coachData.id,
                title: title.trim(),
                slug: slug || 'untitled',
                content_html: contentHTML,
                excerpt: excerpt.trim() || plainText.substring(0, 200),
                status: publishNow ? 'published' : 'draft',
            };

            console.log('📝 Article data prepared:', { ...articleData, content_html: contentHTML.substring(0, 100) + '...' });

            let result;
            if (article?.id) {
                // Update existing article
                console.log('🔄 Updating existing article:', article.id);
                result = await window.supabaseClient
                    .from('cs_articles')
                    .update(articleData)
                    .eq('id', article.id)
                    .select();
            } else {
                // Create new article
                console.log('➕ Creating new article');
                result = await window.supabaseClient
                    .from('cs_articles')
                    .insert([articleData])
                    .select();
            }

            if (result.error) {
                console.error('❌ Supabase error:', result.error);
                throw result.error;
            }

            console.log('✅ Article saved successfully!', result.data);
            setMessage(publishNow ? '✓ Article published successfully!' : '✓ Article saved as draft!');
            setTimeout(() => {
                setMessage('');
                if (onClose) onClose();
            }, 1500);

        } catch (error) {
            console.error('❌ Failed to save article:', error);
            setMessage('Error: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    return html`
        <div class="article-editor-modern">
            ${message && html`
                <div class="message ${message.includes('Error') ? 'message-error' : 'message-success'}">
                    ${message}
                </div>
            `}

            <div class="editor-container">
                <!-- Title Input -->
                <input
                    type="text"
                    class="editor-title-input"
                    placeholder="Article Title"
                    value=${title}
                    onChange=${(e) => setTitle(e.target.value)}
                />

                <!-- Excerpt Input -->
                <input
                    type="text"
                    class="editor-excerpt-input"
                    placeholder="Short excerpt (optional - will auto-generate from content)"
                    value=${excerpt}
                    onChange=${(e) => setExcerpt(e.target.value)}
                />

                <!-- Formatting Toolbar -->
                <div class="formatting-toolbar">
                    <div class="toolbar-group">
                        <button
                            class="toolbar-btn"
                            onClick=${formatBold}
                            title="Bold (Ctrl+B)"
                        >
                            <strong>B</strong>
                        </button>
                        <button
                            class="toolbar-btn"
                            onClick=${formatItalic}
                            title="Italic (Ctrl+I)"
                        >
                            <em>I</em>
                        </button>
                    </div>

                    <div class="toolbar-divider"></div>

                    <div class="toolbar-group">
                        <button
                            class="toolbar-btn"
                            onClick=${formatHeading2}
                            title="Heading 2"
                        >
                            H2
                        </button>
                        <button
                            class="toolbar-btn"
                            onClick=${formatHeading3}
                            title="Heading 3"
                        >
                            H3
                        </button>
                    </div>

                    <div class="toolbar-divider"></div>

                    <div class="toolbar-group">
                        <button
                            class="toolbar-btn"
                            onClick=${formatBulletList}
                            title="Bullet List"
                        >
                            • List
                        </button>
                        <button
                            class="toolbar-btn"
                            onClick=${formatNumberedList}
                            title="Numbered List"
                        >
                            1. List
                        </button>
                    </div>

                    <div class="toolbar-divider"></div>

                    <div class="toolbar-group">
                        <button
                            class="toolbar-btn"
                            onClick=${formatLink}
                            title="Insert Link"
                        >
                            🔗 Link
                        </button>
                    </div>

                </div>

                <!-- WYSIWYG Editor -->
                <div
                    ref=${editorRef}
                    class="wysiwyg-editor"
                    contenteditable="true"
                    placeholder="Start writing your article here... Use the toolbar above to format your text."
                ></div>

                <!-- Action Buttons -->
                <div class="editor-actions">
                    <button
                        class="btn-secondary"
                        onClick=${() => onClose && onClose()}
                        disabled=${saving}
                    >
                        ← Back to Articles
                    </button>

                    <div class="editor-actions-right">
                        <button
                            class="btn-secondary"
                            onClick=${() => handleSave(false)}
                            disabled=${saving}
                        >
                            ${saving ? 'Saving...' : '💾 Save as Draft'}
                        </button>
                        <button
                            class="btn-primary"
                            onClick=${() => handleSave(true)}
                            disabled=${saving}
                        >
                            ${saving ? 'Publishing...' : '🚀 Publish Article'}
                        </button>
                    </div>
                </div>
            </div>
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
        session_types_onsite: false,
        auto_accept_bookings: false
    });

    // Load coach profile if coach
    useEffect(() => {
        if (userType === 'coach') {
            loadCoachProfile();
        }
    }, [userType]);

    const loadCoachProfile = async () => {
        console.log('📋 [PROFILE DEBUG] Loading coach profile...');
        try {
            // Try API first
            const response = await fetch(`${API_BASE}/coaches/${session.user.id}`);
            console.log('📋 [PROFILE DEBUG] API response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('📋 [PROFILE DEBUG] API data received:', data);

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
                        session_types_onsite: coach.session_types?.includes('onsite') || false,
                        auto_accept_bookings: coach.auto_accept_bookings || false
                    });
                    console.log('✅ [PROFILE DEBUG] Profile loaded from API successfully');
                    return;
                }
            } else {
                console.warn('⚠️ [PROFILE DEBUG] API returned', response.status, '- trying Supabase');
            }
        } catch (error) {
            console.warn('⚠️ [PROFILE DEBUG] API failed:', error.message);
        }

        // Fallback to Supabase
        try {
            console.log('📋 [PROFILE DEBUG] Querying Supabase for coach profile...');
            const { data: coach, error } = await window.supabaseClient
                .from('cs_coaches')
                .select('*')
                .eq('user_id', session.user.id)
                .single();

            if (error) {
                console.error('❌ [PROFILE DEBUG] Supabase error:', error);
                // If no row found, that's okay - it means this is a new profile
                if (error.code === 'PGRST116') {
                    console.log('📋 [PROFILE DEBUG] No existing profile found - user can create one');
                }
            } else if (coach) {
                console.log('✅ [PROFILE DEBUG] Profile loaded from Supabase:', coach);
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
                    session_types_onsite: coach.session_types?.includes('onsite') || false,
                    auto_accept_bookings: coach.auto_accept_bookings || false
                });
            }
        } catch (error) {
            console.error('❌ [PROFILE DEBUG] Failed to load from Supabase:', error);
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
        console.log('💾 [SAVE DEBUG] Starting profile save...');
        setLoading(true);
        setMessage('');

        try {
            const sessionTypesArray = [];
            if (formData.session_types_online) sessionTypesArray.push('online');
            if (formData.session_types_onsite) sessionTypesArray.push('onsite');

            const profileData = {
                user_id: session.user.id,
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
                    session_types: sessionTypesArray,
                    auto_accept_bookings: formData.auto_accept_bookings
                });
            }

            console.log('💾 [SAVE DEBUG] Profile data prepared:', profileData);

            let savedSuccessfully = false;

            // Try API first
            try {
                console.log('💾 [SAVE DEBUG] Trying to save via API...');
                const response = await fetch(`${API_BASE}/coaches`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify(profileData)
                });

                console.log('💾 [SAVE DEBUG] API response status:', response.status);

                if (response.ok) {
                    console.log('✅ [SAVE DEBUG] Saved successfully via API');
                    setMessage('Profile updated successfully!');
                    setTimeout(() => setMessage(''), 3000);
                    savedSuccessfully = true;
                } else {
                    const error = await response.json();
                    console.warn('⚠️ [SAVE DEBUG] API returned error:', error);
                }
            } catch (error) {
                console.warn('⚠️ [SAVE DEBUG] API save failed:', error.message);
            }

            // Fallback to Supabase
            if (!savedSuccessfully) {
                console.log('💾 [SAVE DEBUG] Trying to save via Supabase...');
                const { data, error } = await window.supabaseClient
                    .from('cs_coaches')
                    .upsert(profileData, {
                        onConflict: 'user_id'
                    })
                    .select();

                if (error) {
                    console.error('❌ [SAVE DEBUG] Supabase save failed:', error);
                    setMessage('Error: ' + error.message);
                } else {
                    console.log('✅ [SAVE DEBUG] Saved successfully via Supabase:', data);
                    setMessage('Profile updated successfully!');
                    setTimeout(() => setMessage(''), 3000);
                }
            }
        } catch (error) {
            console.error('❌ [SAVE DEBUG] Save error:', error);
            setMessage('Error: ' + error.message);
        } finally {
            setLoading(false);
            console.log('💾 [SAVE DEBUG] Save process complete');
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
                            <img src=${formData.avatar_url} alt="Avatar" loading="lazy" style=${{
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
                                <img src=${formData.banner_url} alt="Banner" loading="lazy" style=${{
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

                    <div>
                        <label class="filter-label">Booking Settings</label>
                        <div class="checkbox-group">
                            <label class="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked=${formData.auto_accept_bookings}
                                    onChange=${(e) => setFormData({ ...formData, auto_accept_bookings: e.target.checked })}
                                />
                                <span>✓ Auto-accept booking requests</span>
                            </label>
                        </div>
                        <div class="form-hint">
                            When enabled, booking requests will be automatically confirmed.
                            When disabled, you'll need to manually accept each booking and provide meeting details.
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

// Coaching Categories Section for Home Page
const CoachingCategoriesSection = () => {
    const categories = [
        { slug: 'executive-coaching', title: 'Executive Coaching', icon: '👔', description: 'Leadership development for C-suite and senior managers' },
        { slug: 'life-coaching', title: 'Life Coaching', icon: '🌟', description: 'Find purpose and create lasting positive change' },
        { slug: 'career-coaching', title: 'Career Coaching', icon: '💼', description: 'Navigate transitions and advance your career' },
        { slug: 'business-coaching', title: 'Business Coaching', icon: '📊', description: 'Grow your business with expert guidance' },
        { slug: 'leadership', title: 'Leadership Coaching', icon: '👑', description: 'Build influence and inspire your team' },
        { slug: 'health-wellness', title: 'Health & Wellness', icon: '💪', description: 'Achieve optimal health and wellbeing' },
        { slug: 'mindfulness', title: 'Mindfulness Coaching', icon: '🧘', description: 'Reduce stress and find inner peace' },
        { slug: 'relationship-coaching', title: 'Relationship Coaching', icon: '💑', description: 'Build stronger, healthier relationships' },
    ];

    return html`
        <section class="coaching-categories-section">
            <div class="container">
                <div class="section-header">
                    <h2>${t('home.categories.title') || 'Find Your Perfect Coach'}</h2>
                    <p>${t('home.categories.subtitle') || 'Explore our coaching specialties and discover how we can help you grow'}</p>
                </div>
                <div class="categories-grid-home">
                    ${categories.map(cat => html`
                        <a href="#coaching/${cat.slug}" class="category-card-home" key=${cat.slug}>
                            <div class="category-icon-home">${cat.icon}</div>
                            <h3>${cat.title}</h3>
                            <p>${cat.description}</p>
                        </a>
                    `)}
                </div>
                <div class="categories-cta-home">
                    <a href="#categories" class="btn-secondary">View All Categories</a>
                    <a href="#quiz" class="btn-primary">Find Your Match</a>
                </div>
            </div>
        </section>
    `;
};

// How It Works Section for Home Page
const HowItWorksSection = () => {
    const steps = [
        { number: '1', title: t('home.howItWorks.step1.title') || 'Find Your Coach', description: t('home.howItWorks.step1.desc') || 'Browse verified coaches or take our matching quiz', icon: '🔍' },
        { number: '2', title: t('home.howItWorks.step2.title') || 'Book a Session', description: t('home.howItWorks.step2.desc') || 'Choose a time and format that works for you', icon: '📅' },
        { number: '3', title: t('home.howItWorks.step3.title') || 'Transform', description: t('home.howItWorks.step3.desc') || 'Work with your coach to achieve your goals', icon: '🚀' },
    ];

    return html`
        <section class="how-it-works-section-home">
            <div class="container">
                <div class="section-header">
                    <h2>${t('home.howItWorks.title') || 'How It Works'}</h2>
                    <p>${t('home.howItWorks.subtitle') || 'Start your transformation in three simple steps'}</p>
                </div>
                <div class="steps-grid-home">
                    ${steps.map(step => html`
                        <div class="step-card-home" key=${step.number}>
                            <div class="step-icon-home">${step.icon}</div>
                            <div class="step-number-home">${step.number}</div>
                            <h3>${step.title}</h3>
                            <p>${step.description}</p>
                        </div>
                    `)}
                </div>
                <div class="hiw-cta-home">
                    <a href="#how-it-works" class="btn-link">Learn more about how it works →</a>
                </div>
            </div>
        </section>
    `;
};

// Trust Badges Section
const TrustBadgesSection = () => {
    return html`
        <section class="trust-section-home">
            <div class="container">
                <div class="trust-badges-home">
                    <div class="trust-badge-home">
                        <span class="trust-icon">✓</span>
                        <span class="trust-text">500+ Verified Coaches</span>
                    </div>
                    <div class="trust-badge-home">
                        <span class="trust-icon">⭐</span>
                        <span class="trust-text">4.9 Average Rating</span>
                    </div>
                    <div class="trust-badge-home">
                        <span class="trust-icon">🔒</span>
                        <span class="trust-text">Secure Payments</span>
                    </div>
                    <div class="trust-badge-home">
                        <span class="trust-icon">💯</span>
                        <span class="trust-text">Satisfaction Guaranteed</span>
                    </div>
                </div>
            </div>
        </section>
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
            <${TrustBadgesSection} />
            <${CoachingCategoriesSection} />
            <${HowItWorksSection} />
            <div class="featured-coaches-section">
                <div class="container">
                    <div class="section-header">
                        <h2>${t('home.featuredCoaches.title') || 'Featured Coaches'}</h2>
                        <p>${t('home.featuredCoaches.subtitle') || 'Connect with our top-rated verified professionals'}</p>
                    </div>
                </div>
            </div>
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

// =====================================================
// EMAIL VERIFICATION BANNER
// =====================================================

const EmailVerificationBanner = ({ session }) => {
    const [dismissed, setDismissed] = useState(false);
    const [resending, setResending] = useState(false);
    const [resent, setResent] = useState(false);

    // Don't show if no session, email is verified, or user dismissed it
    if (!session || session.user?.email_confirmed_at || dismissed) {
        return null;
    }

    // Mask email for privacy (e.g., m*****@c****.com)
    const maskEmail = (email) => {
        if (!email) return '';
        const [localPart, domain] = email.split('@');
        if (!localPart || !domain) return email;

        const maskedLocal = localPart.charAt(0) + '*****';
        const [domainName, tld] = domain.split('.');
        const maskedDomain = domainName.charAt(0) + '****' + (tld ? '.' + tld : '');

        return `${maskedLocal}@${maskedDomain}`;
    };

    const handleResendVerification = async () => {
        if (!window.supabaseClient) return;

        setResending(true);
        try {
            const { error } = await window.supabaseClient.auth.resend({
                type: 'signup',
                email: session.user.email
            });

            if (error) {
                console.error('Failed to resend verification email:', error);
                alert('Failed to resend verification email. Please try again later.');
            } else {
                setResent(true);
                setTimeout(() => setResent(false), 5000);
            }
        } catch (error) {
            console.error('Error resending verification email:', error);
        } finally {
            setResending(false);
        }
    };

    return html`
        <div style=${{
            background: 'linear-gradient(90deg, #FEF3C7 0%, #FDE68A 100%)',
            borderBottom: '1px solid #F59E0B',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            fontSize: '14px',
            color: '#92400E'
        }}>
            <span style=${{ fontSize: '18px' }}>⚠️</span>
            <span>
                Please verify your email address: <strong>${maskEmail(session.user.email)}</strong>
            </span>
            <button
                onClick=${handleResendVerification}
                disabled=${resending || resent}
                style=${{
                    background: resent ? '#10B981' : '#F59E0B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '13px',
                    cursor: resending || resent ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    opacity: resending ? 0.7 : 1
                }}
            >
                ${resent ? '✓ Sent!' : resending ? 'Sending...' : 'Resend Email'}
            </button>
            <button
                onClick=${() => setDismissed(true)}
                style=${{
                    background: 'transparent',
                    border: 'none',
                    color: '#92400E',
                    fontSize: '20px',
                    cursor: 'pointer',
                    padding: '0 8px',
                    lineHeight: 1
                }}
                title="Dismiss"
            >
                ×
            </button>
        </div>
    `;
};

// =====================================================
// ERROR BOUNDARY
// =====================================================

// Error Boundary Component (must be a class component)
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('React Error Boundary caught an error:', error, errorInfo);
        this.setState({ error, errorInfo });

        // Log to debug console if available
        if (window.debugConsole) {
            window.debugConsole.addLog('error', [
                'React Error:',
                error.toString(),
                errorInfo.componentStack
            ]);
        }
    }

    handleReset() {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.hash = '#home';
        window.location.reload();
    }

    render() {
        if (this.state.hasError) {
            return React.createElement('div', {
                style: {
                    padding: '40px',
                    textAlign: 'center',
                    maxWidth: '600px',
                    margin: '100px auto',
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }
            },
                React.createElement('div', {
                    style: { fontSize: '64px', marginBottom: '20px' }
                }, '⚠️'),
                React.createElement('h2', {
                    style: { color: '#dc2626', marginBottom: '16px' }
                }, 'Oops! Something went wrong'),
                React.createElement('p', {
                    style: { color: '#6b7280', marginBottom: '24px' }
                }, 'We encountered an unexpected error. Our team has been notified.'),
                this.state.error && React.createElement('details', {
                    style: {
                        textAlign: 'left',
                        background: '#f3f4f6',
                        padding: '16px',
                        borderRadius: '8px',
                        marginBottom: '24px',
                        fontSize: '14px',
                        fontFamily: 'monospace'
                    }
                },
                    React.createElement('summary', {
                        style: { cursor: 'pointer', marginBottom: '8px', fontWeight: 'bold' }
                    }, 'Error Details'),
                    React.createElement('pre', {
                        style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word' }
                    }, this.state.error.toString()),
                    this.state.errorInfo && React.createElement('pre', {
                        style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: '8px' }
                    }, this.state.errorInfo.componentStack)
                ),
                React.createElement('button', {
                    onClick: () => this.handleReset(),
                    style: {
                        background: '#006266',
                        color: 'white',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer'
                    }
                }, '🔄 Reload Application')
            );
        }

        return this.props.children;
    }
}

// =====================================================
// MATCHING QUIZ COMPONENT
// =====================================================

const getQuizQuestions = () => [
    {
        id: 'goal',
        question: t('quiz.q.goal'),
        type: 'single',
        options: [
            { value: 'career', label: `🚀 ${t('quiz.q.goal.career')}`, desc: t('quiz.q.goal.careerDesc') },
            { value: 'leadership', label: `👔 ${t('quiz.q.goal.leadership')}`, desc: t('quiz.q.goal.leadershipDesc') },
            { value: 'life', label: `🌟 ${t('quiz.q.goal.life')}`, desc: t('quiz.q.goal.lifeDesc') },
            { value: 'business', label: `💼 ${t('quiz.q.goal.business')}`, desc: t('quiz.q.goal.businessDesc') }
        ]
    },
    {
        id: 'style',
        question: t('quiz.q.style'),
        type: 'single',
        options: [
            { value: 'supportive', label: `🤗 ${t('quiz.q.style.supportive')}`, desc: t('quiz.q.style.supportiveDesc') },
            { value: 'direct', label: `🎯 ${t('quiz.q.style.direct')}`, desc: t('quiz.q.style.directDesc') },
            { value: 'analytical', label: `📊 ${t('quiz.q.style.analytical')}`, desc: t('quiz.q.style.analyticalDesc') },
            { value: 'creative', label: `🎨 ${t('quiz.q.style.creative')}`, desc: t('quiz.q.style.creativeDesc') }
        ]
    },
    {
        id: 'session_type',
        question: t('quiz.q.session'),
        type: 'single',
        options: [
            { value: 'online', label: `💻 ${t('quiz.q.session.online')}`, desc: t('quiz.q.session.onlineDesc') },
            { value: 'in_person', label: `🤝 ${t('quiz.q.session.inPerson')}`, desc: t('quiz.q.session.inPersonDesc') },
            { value: 'hybrid', label: `🔄 ${t('quiz.q.session.hybrid')}`, desc: t('quiz.q.session.hybridDesc') }
        ]
    },
    {
        id: 'budget',
        question: t('quiz.q.budget'),
        type: 'single',
        options: [
            { value: 'budget', label: `💰 ${t('quiz.q.budget.low')}`, desc: t('quiz.q.budget.lowDesc') },
            { value: 'mid', label: `💎 ${t('quiz.q.budget.mid')}`, desc: t('quiz.q.budget.midDesc') },
            { value: 'premium', label: `👑 ${t('quiz.q.budget.premium')}`, desc: t('quiz.q.budget.premiumDesc') }
        ]
    }
];

const MatchingQuiz = ({ session }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState({});
    const [showResults, setShowResults] = useState(false);
    const [matchedCoaches, setMatchedCoaches] = useState([]);
    const [loading, setLoading] = useState(false);

    // Get questions with current language translations
    const quizQuestions = getQuizQuestions();
    const currentQuestion = quizQuestions[currentStep];
    const progress = ((currentStep) / quizQuestions.length) * 100;

    const handleAnswer = (value) => {
        setAnswers({ ...answers, [currentQuestion.id]: value });

        // Auto-advance after short delay
        setTimeout(() => {
            if (currentStep < quizQuestions.length - 1) {
                setCurrentStep(currentStep + 1);
            } else {
                findMatches();
            }
        }, 300);
    };

    const findMatches = async () => {
        setLoading(true);

        // Simulate matching algorithm (in production, this would call an API)
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Load coaches and filter based on answers
        if (window.supabaseClient) {
            try {
                const { data: coaches } = await window.supabaseClient
                    .from('cs_coaches')
                    .select('*')
                    .limit(10);

                if (coaches) {
                    // Simple matching - in production this would be more sophisticated
                    const scored = coaches.map(coach => {
                        let score = Math.random() * 30 + 70; // Base score 70-100

                        // Boost for matching criteria
                        if (answers.session_type === 'online' && coach.offers_online) score += 5;
                        if (answers.session_type === 'in_person' && coach.offers_in_person) score += 5;

                        if (answers.budget === 'budget' && coach.hourly_rate < 75) score += 10;
                        if (answers.budget === 'mid' && coach.hourly_rate >= 75 && coach.hourly_rate < 150) score += 10;
                        if (answers.budget === 'premium' && coach.hourly_rate >= 150) score += 10;

                        return { ...coach, matchScore: Math.min(99, Math.round(score)) };
                    });

                    scored.sort((a, b) => b.matchScore - a.matchScore);
                    setMatchedCoaches(scored.slice(0, 5));
                }
            } catch (error) {
                console.error('Error finding matches:', error);
                setMatchedCoaches(mockCoaches.map(c => ({ ...c, matchScore: Math.round(Math.random() * 20 + 80) })));
            }
        } else {
            setMatchedCoaches(mockCoaches.map(c => ({ ...c, matchScore: Math.round(Math.random() * 20 + 80) })));
        }

        setLoading(false);
        setShowResults(true);
    };

    const goBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const startOver = () => {
        setCurrentStep(0);
        setAnswers({});
        setShowResults(false);
        setMatchedCoaches([]);
    };

    if (loading) {
        return html`
            <div class="quiz-loading">
                <div class="loading-animation">
                    <div class="spinner-large"></div>
                </div>
                <h2>${t('quiz.processing.title')}</h2>
                <p>${t('quiz.processing.step1')}</p>
            </div>
        `;
    }

    if (showResults) {
        return html`
            <div class="quiz-results">
                <div class="container">
                    <div class="results-header">
                        <h1>🎯 ${t('quiz.results.title')}</h1>
                        <p>${t('quiz.results.subtitle')}</p>
                    </div>

                    <div class="matched-coaches">
                        ${matchedCoaches.map((coach, index) => html`
                            <div key=${coach.id} class="matched-coach-card">
                                <div class="match-rank">#${index + 1}</div>
                                <div class="match-score">
                                    <span class="score-value">${coach.matchScore}%</span>
                                    <span class="score-label">${t('quiz.match')}</span>
                                </div>
                                <img src=${coach.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(coach.full_name)}`} alt=${coach.full_name} class="coach-avatar" />
                                <div class="coach-info">
                                    <h3>${coach.full_name}</h3>
                                    <p class="coach-title">${coach.title}</p>
                                    <div class="coach-meta">
                                        <span>📍 ${coach.location || 'Remote'}</span>
                                        <span>💰 ${formatPrice(coach.hourly_rate)}/hr</span>
                                    </div>
                                </div>
                                <button class="btn-primary" onClick=${() => window.location.hash = '#coaches'}>
                                    ${t('quiz.viewProfile')}
                                </button>
                            </div>
                        `)}
                    </div>

                    <div class="results-actions">
                        <button class="btn-secondary" onClick=${startOver}>
                            ← ${t('quiz.results.retake')}
                        </button>
                        <button class="btn-primary" onClick=${() => window.location.hash = '#coaches'}>
                            ${t('quiz.results.browseAll')} →
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    return html`
        <div class="quiz-page">
            <div class="quiz-container">
                <!-- Progress Bar -->
                <div class="quiz-progress-bar">
                    <div class="progress-track">
                        <div class="progress-fill" style=${{ width: `${progress}%` }}></div>
                    </div>
                    <span class="progress-text">${currentStep + 1} / ${quizQuestions.length}</span>
                </div>

                <!-- Question -->
                <div class="quiz-question-container">
                    <h2 class="quiz-question">${currentQuestion.question}</h2>

                    <div class="quiz-options">
                        ${currentQuestion.options.map(option => html`
                            <button
                                key=${option.value}
                                class="quiz-option ${answers[currentQuestion.id] === option.value ? 'selected' : ''}"
                                onClick=${() => handleAnswer(option.value)}
                            >
                                <span class="option-label">${option.label}</span>
                                <span class="option-desc">${option.desc}</span>
                            </button>
                        `)}
                    </div>
                </div>

                <!-- Navigation -->
                <div class="quiz-nav">
                    ${currentStep > 0 && html`
                        <button class="btn-secondary" onClick=${goBack}>
                            ← ${t('quiz.back')}
                        </button>
                    `}
                    <button class="btn-ghost" onClick=${() => window.location.hash = '#home'}>
                        ${t('quiz.intro.skip')}
                    </button>
                </div>
            </div>
        </div>
    `;
};

// =====================================================
// AI MATCH PAGE
// =====================================================

const AIMatchPage = ({ session }) => {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [recommendations, setRecommendations] = useState([]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        setLoading(true);

        // Simulate AI processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // In production, this would call an AI API
        if (window.supabaseClient) {
            const { data: coaches } = await window.supabaseClient
                .from('cs_coaches')
                .select('*')
                .limit(5);

            if (coaches) {
                setRecommendations(coaches.map(c => ({
                    ...c,
                    matchScore: Math.round(Math.random() * 20 + 75),
                    aiReason: 'Based on your goals and preferences, this coach specializes in areas that align with your needs.'
                })));
            }
        } else {
            setRecommendations(mockCoaches.map(c => ({
                ...c,
                matchScore: Math.round(Math.random() * 20 + 75),
                aiReason: 'Based on your goals and preferences, this coach specializes in areas that align with your needs.'
            })));
        }

        setLoading(false);
    };

    return html`
        <div class="ai-match-page">
            <div class="container">
                <div class="ai-header">
                    <h1>✨ ${t('aiMatch.title')}</h1>
                    <p>${t('aiMatch.subtitle')}</p>
                </div>

                <form class="ai-form" onSubmit=${handleSubmit}>
                    <textarea
                        class="ai-input"
                        placeholder=${t('aiMatch.placeholder')}
                        value=${input}
                        onInput=${(e) => setInput(e.target.value)}
                        rows="5"
                    ></textarea>
                    <button type="submit" class="btn-primary btn-large" disabled=${loading || !input.trim()}>
                        ${loading ? t('aiMatch.finding') : `✨ ${t('aiMatch.findBtn')}`}
                    </button>
                </form>

                ${loading && html`
                    <div class="ai-loading">
                        <div class="spinner-large"></div>
                        <p>${t('aiMatch.analyzing')}</p>
                    </div>
                `}

                ${recommendations.length > 0 && html`
                    <div class="ai-results">
                        <h2>${t('aiMatch.resultsTitle')}</h2>
                        <div class="recommendation-list">
                            ${recommendations.map(coach => html`
                                <div key=${coach.id} class="recommendation-card">
                                    <div class="match-badge">${coach.matchScore}% ${t('aiMatch.match')}</div>
                                    <img src=${coach.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(coach.full_name)}`} alt=${coach.full_name} />
                                    <div class="rec-info">
                                        <h3>${coach.full_name}</h3>
                                        <p class="rec-title">${coach.title}</p>
                                        <p class="rec-reason">${coach.aiReason}</p>
                                        <div class="rec-meta">
                                            <span>${formatPrice(coach.hourly_rate)}/hr</span>
                                            <button class="btn-primary btn-sm" onClick=${() => window.location.hash = '#coaches'}>
                                                ${t('aiMatch.viewProfile')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `)}
                        </div>
                    </div>
                `}

                <div class="ai-alternative">
                    <p>${t('aiMatch.alternative')}</p>
                    <a href="#quiz" class="btn-secondary">${t('aiMatch.alternativeBtn')} →</a>
                </div>
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

    // Parse route for dynamic routing
    const routePath = route.split('?')[0]; // Remove query params
    const routeParts = routePath.replace('#', '').split('/');
    const baseRoute = routeParts[0];
    const routeParam = routeParts[1] || null;

    // Handle dynamic routes first
    if (routePath.startsWith('#coaching/') && routeParam) {
        // Category pages like #coaching/executive-coaching
        Component = () => html`<${CategoryPage} categorySlug=${routeParam} />`;
    } else if (routePath.startsWith('#coach/') && routeParam) {
        // Coach profile pages - SEO-optimized full page
        Component = () => html`<${CoachProfilePage} coachId=${routeParam} session=${session} />`;
    } else {
        // Static routes
        switch (route) {
            case '#home': Component = () => html`<${Home} session=${session} />`; break;
            case '#coaches': Component = () => html`<${CoachList} session=${session} />`; break;
            case '#login': Component = Auth; break;
            case '#onboarding': Component = () => html`<${CoachOnboarding} session=${session} />`; break;
            case '#dashboard': Component = () => html`<${Dashboard} session=${session} />`; break;
            case '#quiz': Component = () => html`<${MatchingQuiz} session=${session} />`; break;
            case '#ai-match': Component = () => html`<${AIMatchPage} session=${session} />`; break;
            case '#signout': Component = SignOut; break;
            // New content pages
            case '#faq': Component = () => html`<${FAQPage} />`; break;
            case '#about': Component = () => html`<${AboutPage} />`; break;
            case '#how-it-works': Component = () => html`<${HowItWorksPage} />`; break;
            case '#categories': Component = () => html`<${CategoriesIndexPage} />`; break;
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
