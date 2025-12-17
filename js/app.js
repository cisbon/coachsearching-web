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
    SPECIALTY_OPTIONS,
    LANGUAGE_OPTIONS
} from './components/coach/index.js';

// Layout & UI Components (modular)
import { Navbar, Footer } from './components/layout/index.js';
import { LegalModal, CurrencySelector, LanguageSelector } from './components/ui/index.js';

// Auth Components (modular)
import { SignOut } from './components/auth/index.js';

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

// legalContent now in components/ui/Modal.js (LegalModal)

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
// Layout components (LegalModal, Footer, CurrencySelector, LanguageSelector, Navbar)
// are now imported from components/layout/ and components/ui/

const Auth = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [userType, setUserType] = useState('client');
    const [isLogin, setIsLogin] = useState(true);
    const [message, setMessage] = useState('');

    // Referral code state (for coach registration)
    const [referralCode, setReferralCode] = useState('');
    const [referralStatus, setReferralStatus] = useState(null); // null, 'checking', 'valid', 'invalid'
    const [referralMessage, setReferralMessage] = useState('');
    const [referrerId, setReferrerId] = useState(null);
    const referralDebounceRef = useRef(null);

    // Validate referral code against Supabase
    const validateReferralCode = useCallback(async (code) => {
        if (!code || code.trim().length < 3) {
            setReferralStatus(null);
            setReferralMessage('');
            setReferrerId(null);
            return;
        }

        setReferralStatus('checking');
        try {
            const supabase = window.supabaseClient;
            const { data: codeData, error } = await supabase
                .from('cs_referral_codes')
                .select('code, user_id')
                .eq('code', code.trim().toUpperCase())
                .eq('is_active', true)
                .single();

            if (error || !codeData) {
                setReferralStatus('invalid');
                setReferralMessage(t('onboard.referralInvalid') || 'Invalid referral code');
                setReferrerId(null);
            } else {
                setReferralStatus('valid');
                setReferralMessage(t('onboard.referralValid') || 'Valid code! You get your first year of Premium free!');
                setReferrerId(codeData.user_id);
            }
        } catch (err) {
            console.error('Error validating referral code:', err);
            setReferralStatus('invalid');
            setReferralMessage(t('onboard.referralError') || 'Could not validate code');
            setReferrerId(null);
        }
    }, []);

    // Handle referral code input change with debounce
    const handleReferralCodeChange = useCallback((e) => {
        const code = e.target.value;
        setReferralCode(code);

        if (referralDebounceRef.current) {
            clearTimeout(referralDebounceRef.current);
        }

        referralDebounceRef.current = setTimeout(() => {
            validateReferralCode(code);
        }, 500);
    }, [validateReferralCode]);

    // Reset referral when switching user types or modes
    useEffect(() => {
        if (userType !== 'coach' || isLogin) {
            setReferralCode('');
            setReferralStatus(null);
            setReferralMessage('');
            setReferrerId(null);
        }
    }, [userType, isLogin]);

    // Check URL for mode=register parameter and listen for changes
    useEffect(() => {
        const checkMode = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const pathname = window.location.pathname;
            if (urlParams.get('mode') === 'register' || pathname.includes('register')) {
                setIsLogin(false);
            } else {
                setIsLogin(true);
            }
        };

        // Check on mount
        checkMode();

        // Listen for URL changes
        window.addEventListener('popstate', checkMode);
        return () => window.removeEventListener('popstate', checkMode);
    }, []);

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
                // Build metadata, include referral info for coaches
                const metadata = {
                    user_type: userType,
                    full_name: email.split('@')[0]
                };

                // Add referral code data if valid
                if (userType === 'coach' && referralStatus === 'valid' && referralCode) {
                    metadata.referral_code = referralCode.trim().toUpperCase();
                    metadata.referral_code_valid = true;
                    metadata.referrer_id = referrerId;
                }

                console.log('Attempting sign up as:', userType);
                console.log('Sign up params:', {
                    email,
                    options: { data: metadata }
                });
                result = await window.supabaseClient.auth.signUp({
                    email,
                    password,
                    options: { data: metadata }
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
                        window.navigateTo('/onboarding');
                    }, 500);
                } else {
                    setMessage('Registration successful! You can browse coaches. Please verify your email to book sessions.');
                    console.log('Client registration, redirecting to coaches...');
                    setTimeout(() => {
                        window.navigateTo('/coaches');
                    }, 500);
                }
            } else {
                console.log('Login successful, waiting for session state update...');
                setMessage('Login successful! Loading dashboard...');
                setTimeout(() => {
                    console.log('Delayed redirect to dashboard after login');
                    window.navigateTo('/dashboard');
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

                    ${!isLogin && userType === 'coach' && html`
                        <div class="referral-input-wrapper">
                            <input
                                type="text"
                                class="auth-input referral-input ${referralStatus ? 'referral-' + referralStatus : ''}"
                                placeholder="Referral code (optional)"
                                value=${referralCode}
                                onInput=${handleReferralCodeChange}
                                disabled=${loading}
                                maxLength="50"
                                aria-label="Referral Code"
                            />
                            ${referralStatus === 'checking' && html`
                                <span class="referral-status-icon checking">
                                    <span class="spinner-small"></span>
                                </span>
                            `}
                            ${referralStatus === 'valid' && html`
                                <span class="referral-status-icon valid">✓</span>
                            `}
                            ${referralStatus === 'invalid' && html`
                                <span class="referral-status-icon invalid">✗</span>
                            `}
                        </div>
                        ${referralMessage && html`
                            <div class="referral-message ${referralStatus}">
                                ${referralMessage}
                            </div>
                        `}
                        ${referralStatus === 'valid' && html`
                            <div class="referral-success-banner">
                                <span class="success-icon">🎉</span>
                                <div class="success-content">
                                    <strong>${t('onboard.referralSuccessTitle') || 'Free First Year of Premium!'}</strong>
                                    <p>${t('onboard.referralSuccessDesc') || 'Your referral code has been applied. Enjoy all Premium features free for your first year.'}</p>
                                </div>
                            </div>
                        `}
                    `}

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
        location_city: '',
        location_country: '',
        hourly_rate: '',
        currency: 'EUR',
        specialties: '',
        languages: '',
        years_experience: '',
        session_types_online: true,
        session_types_onsite: false,
        avatar_url: '',
        intro_video_url: ''
    });

    // Image upload state
    const [uploading, setUploading] = useState(false);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Handle profile picture upload
    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setMessage(t('onboard.invalidImageType') || 'Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setMessage(t('onboard.imageTooLarge') || 'Image must be less than 5MB');
            return;
        }

        setUploading(true);
        setMessage('');

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await window.supabaseClient.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = window.supabaseClient.storage
                .from('avatars')
                .getPublicUrl(filePath);

            handleChange('avatar_url', publicUrl);
        } catch (err) {
            console.error('Error uploading image:', err);
            setMessage(t('onboard.uploadFailed') || 'Failed to upload image');
        } finally {
            setUploading(false);
        }
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
            const sessionFormatsArray = [];
            if (formData.session_types_online) sessionFormatsArray.push('online');
            if (formData.session_types_onsite) sessionFormatsArray.push('in-person');

            // Check if user has referral code for free year (from registration metadata)
            const hasReferralCode = session?.user?.user_metadata?.referral_code_valid === true;
            const trialDays = hasReferralCode ? 365 : 14; // 1 year if referral, otherwise 14 days

            // Set trial end date
            const trialEndsAt = new Date();
            trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

            const coachProfile = {
                user_id: session.user.id,
                full_name: formData.full_name,
                title: formData.title,
                bio: formData.bio,
                location_city: formData.location_city,
                location_country: formData.location_country,
                hourly_rate: parseFloat(formData.hourly_rate) || 0,
                currency: formData.currency || 'EUR',
                specialties: specialtiesArray,
                languages: languagesArray,
                years_experience: parseInt(formData.years_experience) || 0,
                session_formats: sessionFormatsArray,
                offers_online: formData.session_types_online,
                offers_in_person: formData.session_types_onsite,
                avatar_url: formData.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.email}`,
                intro_video_url: formData.intro_video_url || '',
                onboarding_completed: true,
                subscription_status: 'trial',
                trial_ends_at: trialEndsAt.toISOString()
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

            const successMsg = hasReferralCode
                ? t('onboard.successWithReferral') || '✓ Profile completed! You have 1 year of Premium free! Redirecting...'
                : t('onboard.successDefault') || '✓ Profile completed successfully! Redirecting to dashboard...';

            setMessage(successMsg);
            setTimeout(() => {
                window.navigateTo('/dashboard');
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
                        ${step === 1 ? (t('onboard.welcomeCoach') || '👋 Welcome, Coach!') : (t('onboard.almostThere') || '✨ Almost There!')}
                    </h1>
                    <p style=${{ fontSize: '16px', color: '#6B7280' }}>
                        ${step === 1 ? (t('onboard.step1Subtitle') || 'Set up your profile to attract clients') : (t('onboard.step2Subtitle') || 'Tell us about your expertise and availability')}
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
                        ${t('onboard.stepOf') || 'Step'} ${step} ${t('onboard.of') || 'of'} 2
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
                            <!-- Profile Picture Upload -->
                            <div>
                                <label style=${labelStyle}>${t('onboard.profilePicture') || 'Profile Picture'}</label>
                                <div style=${{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px'
                                }}>
                                    <div style=${{
                                        width: '80px',
                                        height: '80px',
                                        borderRadius: '50%',
                                        overflow: 'hidden',
                                        border: '3px solid #E5E7EB',
                                        background: '#F3F4F6',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        ${formData.avatar_url
                                            ? html`<img src=${formData.avatar_url} alt="Profile" style=${{ width: '100%', height: '100%', objectFit: 'cover' }} />`
                                            : html`<span style=${{ fontSize: '32px', color: '#9CA3AF' }}>👤</span>`
                                        }
                                    </div>
                                    <div style=${{ flex: 1 }}>
                                        <label style=${{
                                            display: 'inline-block',
                                            padding: '10px 20px',
                                            background: uploading ? '#9CA3AF' : '#006266',
                                            color: 'white',
                                            borderRadius: '8px',
                                            cursor: uploading ? 'not-allowed' : 'pointer',
                                            fontSize: '14px',
                                            fontWeight: '500'
                                        }}>
                                            ${uploading ? (t('onboard.uploading') || 'Uploading...') : (t('onboard.uploadPhoto') || 'Upload Photo')}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange=${handleImageUpload}
                                                disabled=${uploading}
                                                style=${{ display: 'none' }}
                                            />
                                        </label>
                                        <div style=${{ fontSize: '12px', color: '#9CA3AF', marginTop: '6px' }}>
                                            ${t('onboard.uploadHint') || 'JPG, PNG up to 5MB'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label style=${labelStyle}>${t('onboard.fullName') || 'Full Name'} *</label>
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
                                <label style=${labelStyle}>${t('onboard.jobTitle') || 'Professional Title'} *</label>
                                <input
                                    type="text"
                                    style=${inputStyle}
                                    placeholder=${t('onboard.jobTitlePlaceholder') || 'e.g., Life Coach, Business Consultant'}
                                    value=${formData.title}
                                    onChange=${(e) => handleChange('title', e.target.value)}
                                    onFocus=${(e) => e.target.style.borderColor = '#006266'}
                                    onBlur=${(e) => e.target.style.borderColor = '#E5E7EB'}
                                    required
                                />
                            </div>

                            <div>
                                <label style=${labelStyle}>${t('onboard.bio') || 'About You'} *</label>
                                <textarea
                                    style=${{...inputStyle, minHeight: '120px', resize: 'vertical'}}
                                    placeholder=${t('onboard.bioPlaceholder') || 'Share your coaching philosophy, experience, and approach...'}
                                    value=${formData.bio}
                                    onChange=${(e) => handleChange('bio', e.target.value)}
                                    onFocus=${(e) => e.target.style.borderColor = '#006266'}
                                    onBlur=${(e) => e.target.style.borderColor = '#E5E7EB'}
                                    required
                                ></textarea>
                            </div>

                            <div style=${{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style=${labelStyle}>${t('onboard.city') || 'City'}</label>
                                    <input
                                        type="text"
                                        style=${inputStyle}
                                        placeholder=${t('onboard.cityPlaceholder') || 'e.g., Zurich'}
                                        value=${formData.location_city}
                                        onChange=${(e) => handleChange('location_city', e.target.value)}
                                        onFocus=${(e) => e.target.style.borderColor = '#006266'}
                                        onBlur=${(e) => e.target.style.borderColor = '#E5E7EB'}
                                    />
                                </div>
                                <div>
                                    <label style=${labelStyle}>${t('onboard.country') || 'Country'}</label>
                                    <select
                                        style=${inputStyle}
                                        value=${formData.location_country}
                                        onChange=${(e) => handleChange('location_country', e.target.value)}
                                    >
                                        <option value="">${t('onboard.selectCountry') || 'Select country...'}</option>
                                        <option value="Austria">Austria</option>
                                        <option value="Belgium">Belgium</option>
                                        <option value="Denmark">Denmark</option>
                                        <option value="Finland">Finland</option>
                                        <option value="France">France</option>
                                        <option value="Germany">Germany</option>
                                        <option value="Ireland">Ireland</option>
                                        <option value="Italy">Italy</option>
                                        <option value="Luxembourg">Luxembourg</option>
                                        <option value="Netherlands">Netherlands</option>
                                        <option value="Norway">Norway</option>
                                        <option value="Poland">Poland</option>
                                        <option value="Portugal">Portugal</option>
                                        <option value="Spain">Spain</option>
                                        <option value="Sweden">Sweden</option>
                                        <option value="Switzerland">Switzerland</option>
                                        <option value="United Kingdom">United Kingdom</option>
                                    </select>
                                </div>
                            </div>

                            <div style=${{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style=${labelStyle}>${t('onboard.hourlyRate') || 'Hourly Rate'} *</label>
                                    <input
                                        type="number"
                                        style=${inputStyle}
                                        placeholder=${t('onboard.hourlyRatePlaceholder') || '150'}
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
                                    <label style=${labelStyle}>${t('onboard.currency') || 'Currency'}</label>
                                    <select
                                        style=${inputStyle}
                                        value=${formData.currency}
                                        onChange=${(e) => handleChange('currency', e.target.value)}
                                    >
                                        <option value="EUR">EUR €</option>
                                        <option value="USD">USD $</option>
                                        <option value="GBP">GBP £</option>
                                        <option value="CHF">CHF</option>
                                    </select>
                                </div>
                                <div>
                                    <label style=${labelStyle}>${t('onboard.yearsExperience') || 'Years Experience'}</label>
                                    <input
                                        type="number"
                                        style=${inputStyle}
                                        placeholder="0"
                                        min="0"
                                        max="50"
                                        value=${formData.years_experience}
                                        onChange=${(e) => handleChange('years_experience', e.target.value)}
                                        onFocus=${(e) => e.target.style.borderColor = '#006266'}
                                        onBlur=${(e) => e.target.style.borderColor = '#E5E7EB'}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style=${{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
                            <button
                                type="button"
                                onClick=${() => window.navigateTo('/coaches')}
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
                                ${t('onboard.skipForNow') || 'Skip for Now'}
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
                                ${t('onboard.next') || 'Next Step →'}
                            </button>
                        </div>
                    `}

                    <!-- Step 2: Expertise & Settings -->
                    ${step === 2 && html`
                        <div style=${{ display: 'grid', gap: '22px' }}>
                            <div>
                                <label style=${labelStyle}>${t('onboard.specialties') || 'Specialties'} *</label>
                                <div style=${{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    ${[
                                        'Leadership', 'Career', 'Executive', 'Life Coaching', 'Business',
                                        'Health & Wellness', 'Relationships', 'Mindfulness', 'Performance',
                                        'Communication', 'Stress Management', 'Work-Life Balance'
                                    ].map(specialty => {
                                        const isSelected = formData.specialties.split(',').map(s => s.trim()).includes(specialty);
                                        return html`
                                            <button
                                                type="button"
                                                key=${specialty}
                                                onClick=${() => {
                                                    const current = formData.specialties.split(',').map(s => s.trim()).filter(Boolean);
                                                    if (isSelected) {
                                                        handleChange('specialties', current.filter(s => s !== specialty).join(', '));
                                                    } else {
                                                        handleChange('specialties', [...current, specialty].join(', '));
                                                    }
                                                }}
                                                style=${{
                                                    padding: '8px 14px',
                                                    border: isSelected ? '2px solid #006266' : '2px solid #E5E7EB',
                                                    borderRadius: '20px',
                                                    background: isSelected ? '#f0fafa' : 'white',
                                                    cursor: 'pointer',
                                                    fontSize: '14px',
                                                    fontWeight: '500',
                                                    color: isSelected ? '#006266' : '#374151',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                ${specialty} ${isSelected ? '✓' : ''}
                                            </button>
                                        `;
                                    })}
                                </div>
                                <div style=${{ fontSize: '13px', color: '#9CA3AF', marginTop: '8px' }}>
                                    ${t('onboard.selectSpecialtiesHint') || 'Select all that apply'}
                                </div>
                            </div>

                            <div>
                                <label style=${labelStyle}>${t('onboard.sessionLanguages') || 'Languages'} *</label>
                                <div style=${{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    ${[
                                        { flagCode: 'gb', name: 'English' },
                                        { flagCode: 'de', name: 'German' },
                                        { flagCode: 'es', name: 'Spanish' },
                                        { flagCode: 'fr', name: 'French' },
                                        { flagCode: 'it', name: 'Italian' },
                                        { flagCode: 'nl', name: 'Dutch' },
                                        { flagCode: 'pt', name: 'Portuguese' }
                                    ].map(lang => {
                                        const isSelected = formData.languages.split(',').map(l => l.trim()).includes(lang.name);
                                        return html`
                                            <button
                                                type="button"
                                                key=${lang.name}
                                                onClick=${() => {
                                                    const current = formData.languages.split(',').map(l => l.trim()).filter(Boolean);
                                                    if (isSelected) {
                                                        handleChange('languages', current.filter(l => l !== lang.name).join(', '));
                                                    } else {
                                                        handleChange('languages', [...current, lang.name].join(', '));
                                                    }
                                                }}
                                                style=${{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    padding: '10px 16px',
                                                    border: isSelected ? '2px solid #006266' : '2px solid #E5E7EB',
                                                    borderRadius: '8px',
                                                    background: isSelected ? '#f0fafa' : 'white',
                                                    cursor: 'pointer',
                                                    fontSize: '14px',
                                                    fontWeight: '500',
                                                    color: isSelected ? '#006266' : '#374151',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <img
                                                    src="https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${lang.flagCode}.svg"
                                                    alt=${lang.name}
                                                    style=${{ width: '24px', height: '18px', borderRadius: '2px', objectFit: 'cover' }}
                                                />
                                                <span>${lang.name}</span>
                                                ${isSelected && html`<span style=${{ color: '#006266', fontWeight: 'bold' }}>✓</span>`}
                                            </button>
                                        `;
                                    })}
                                </div>
                                <div style=${{ fontSize: '13px', color: '#9CA3AF', marginTop: '8px' }}>
                                    ${t('onboard.selectLanguagesHint') || 'Select all languages you offer coaching in'}
                                </div>
                            </div>

                            <div>
                                <label style=${{...labelStyle, marginBottom: '12px'}}>${t('onboard.sessionFormats') || 'Session Types'} *</label>
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
                                        <span style=${{ fontSize: '15px', fontWeight: '500' }}>💻 ${t('onboard.videoCallDesc') || 'Online Sessions'}</span>
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
                                        <span style=${{ fontSize: '15px', fontWeight: '500' }}>📍 ${t('onboard.inPersonDesc') || 'On-Site Sessions'}</span>
                                    </label>
                                </div>
                            </div>

                            <!-- Video Introduction -->
                            <div style=${{
                                background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
                                border: '2px dashed #f59e0b',
                                borderRadius: '12px',
                                padding: '20px'
                            }}>
                                <div style=${{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                    <span style=${{ fontSize: '24px' }}>🎬</span>
                                    <div>
                                        <strong style=${{ color: '#92400e', fontSize: '15px' }}>${t('onboard.videoIntroTitle') || 'Video Introduction (Recommended)'}</strong>
                                        <p style=${{ fontSize: '13px', color: '#78716c', margin: '4px 0 0 0' }}>
                                            ${t('onboard.videoIntroHint') || 'Coaches with video intros get 3x more bookings and appear at the top of search results!'}
                                        </p>
                                    </div>
                                </div>
                                <input
                                    type="url"
                                    style=${{...inputStyle, background: 'white'}}
                                    placeholder=${t('onboard.videoUrlPlaceholder') || 'https://youtube.com/watch?v=... or https://vimeo.com/...'}
                                    value=${formData.intro_video_url}
                                    onChange=${(e) => handleChange('intro_video_url', e.target.value)}
                                    onFocus=${(e) => e.target.style.borderColor = '#f59e0b'}
                                    onBlur=${(e) => e.target.style.borderColor = '#E5E7EB'}
                                />
                                <p style=${{ fontSize: '12px', color: '#78716c', marginTop: '6px' }}>
                                    ${t('onboard.videoUrlHint') || 'Paste a link to your YouTube or Vimeo video (1-3 minutes recommended)'}
                                </p>
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
                                ← ${t('onboard.previous') || 'Back'}
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
                                ${loading ? (t('onboard.uploading') || '💾 Creating Profile...') : ('✅ ' + (t('onboard.complete') || 'Complete Setup'))}
                            </button>
                        </div>
                    `}
                </form>
            </div>
        </div>
    `;
};

// SignOut now imported from components/auth/index.js

const Hero = () => {
    return html`
        <section class="hero">
            <div class="container">
                <h1>${t('hero.title')}</h1>
                <p>${t('hero.subtitle')}</p>

                <!-- Discovery Options -->
                <div class="discovery-options">
                    <button class="discovery-option quiz-option" onClick=${() => window.navigateTo('/quiz')}>
                        <span class="discovery-icon">🎯</span>
                        <span class="discovery-label">${t('discovery.takeQuiz')}</span>
                        <span class="discovery-desc">${t('discovery.takeQuizDesc')}</span>
                    </button>
                    <button class="discovery-option browse-option" onClick=${() => window.navigateTo('/coaches')}>
                        <span class="discovery-icon">🔍</span>
                        <span class="discovery-label">${t('discovery.browse')}</span>
                        <span class="discovery-desc">${t('discovery.browseDesc')}</span>
                    </button>
                    <button class="discovery-option ai-option" onClick=${() => window.navigateTo('/ai-match')}>
                        <span class="discovery-icon">✨</span>
                        <span class="discovery-label">${t('discovery.aiMatch')}</span>
                        <span class="discovery-desc">${t('discovery.aiMatchDesc')}</span>
                    </button>
                </div>
            </div>
        </section>
    `;
};

// Coach components now imported from components/coach/index.js:
// LanguageFlags, TrustBadges, VideoPopup, ReviewsPopup, DiscoveryCallModal,
// CoachCard, CoachCardSkeleton, FilterSidebar, SPECIALTY_OPTIONS, LANGUAGE_OPTIONS

const CoachList = ({ searchFilters, session }) => {
    const [coaches, setCoaches] = useState(mockCoaches);
    const [selectedCoach, setSelectedCoach] = useState(null);
    const [loading, setLoading] = useState(false);
    const [, forceUpdate] = useState({});
    const [showFilters, setShowFilters] = useState(true);
    const [filters, setFilters] = useState({
        sortBy: 'relevance',
        minPrice: '',
        maxPrice: '',
        specialties: [],
        languages: [],
        hasVideo: false,
        freeIntro: false,
        verified: false,
        topRated: false,
        minRating: null,
        onlineOnly: false,
        inPersonOnly: false,
        experience: ''
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
            verified: false,
            topRated: false,
            minRating: null,
            onlineOnly: false,
            inPersonOnly: false,
            experience: ''
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
            result = result.filter(coach => coach.intro_video_url || coach.video_url || coach.video_intro_url);
        }
        if (filters.freeIntro) {
            result = result.filter(coach => coach.offers_free_intro || coach.free_discovery_call);
        }
        if (filters.verified) {
            result = result.filter(coach => coach.is_verified || coach.verified);
        }
        if (filters.topRated) {
            result = result.filter(coach => (coach.rating_average || coach.rating || 0) >= 4.5);
        }

        // Rating filter
        if (filters.minRating) {
            result = result.filter(coach => (coach.rating_average || coach.rating || 0) >= filters.minRating);
        }

        // Session format filters
        if (filters.onlineOnly) {
            result = result.filter(coach =>
                coach.session_formats?.includes('online') ||
                coach.offers_online ||
                !coach.session_formats // Assume online if not specified
            );
        }
        if (filters.inPersonOnly) {
            result = result.filter(coach =>
                coach.session_formats?.includes('in-person') ||
                coach.offers_in_person ||
                coach.location
            );
        }

        // Experience filter
        if (filters.experience) {
            const minYears = Number(filters.experience);
            result = result.filter(coach => (coach.years_experience || 0) >= minYears);
        }

        // Helper to check if coach has video
        const hasVideo = (coach) => !!(coach.intro_video_url || coach.video_url || coach.video_intro_url);

        // Sorting - always prioritize coaches with videos first, then apply selected sort
        switch (filters.sortBy) {
            case 'rating':
                result.sort((a, b) => {
                    // Videos first
                    const aVideo = hasVideo(a) ? 1 : 0;
                    const bVideo = hasVideo(b) ? 1 : 0;
                    if (bVideo !== aVideo) return bVideo - aVideo;
                    // Then by rating
                    return (b.rating_average || b.rating || 0) - (a.rating_average || a.rating || 0);
                });
                break;
            case 'price_low':
                result.sort((a, b) => {
                    const aVideo = hasVideo(a) ? 1 : 0;
                    const bVideo = hasVideo(b) ? 1 : 0;
                    if (bVideo !== aVideo) return bVideo - aVideo;
                    return (a.hourly_rate || 0) - (b.hourly_rate || 0);
                });
                break;
            case 'price_high':
                result.sort((a, b) => {
                    const aVideo = hasVideo(a) ? 1 : 0;
                    const bVideo = hasVideo(b) ? 1 : 0;
                    if (bVideo !== aVideo) return bVideo - aVideo;
                    return (b.hourly_rate || 0) - (a.hourly_rate || 0);
                });
                break;
            case 'reviews':
                result.sort((a, b) => {
                    const aVideo = hasVideo(a) ? 1 : 0;
                    const bVideo = hasVideo(b) ? 1 : 0;
                    if (bVideo !== aVideo) return bVideo - aVideo;
                    return (b.rating_count || b.reviews_count || 0) - (a.rating_count || a.reviews_count || 0);
                });
                break;
            default:
                // relevance - prioritize coaches with videos, then by rating
                result.sort((a, b) => {
                    const aVideo = hasVideo(a) ? 1 : 0;
                    const bVideo = hasVideo(b) ? 1 : 0;
                    if (bVideo !== aVideo) return bVideo - aVideo;
                    // Then by rating as secondary
                    return (b.rating_average || b.rating || 0) - (a.rating_average || a.rating || 0);
                });
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
        filters.verified,
        filters.topRated,
        filters.minRating,
        filters.onlineOnly,
        filters.inPersonOnly,
        filters.experience
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
                            ${filteredCoaches.map(coach => html`<${CoachCard} key=${coach.id} coach=${coach} session=${session} onViewDetails=${setSelectedCoach} />`)}
                        </div>
                    `}
                </div>
            </div>
        </div>
        ${selectedCoach && html`<${CoachDetailModal} coach=${selectedCoach} session=${session} onClose=${() => setSelectedCoach(null)} />`}
    </div>
    `;
};

// BookingModal removed - MVP uses Discovery Calls only
// Session booking will be handled outside the platform

const CoachDetailModal = ({ coach, onClose, session }) => {
    console.log('Opening coach detail modal for', coach.full_name);
    const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
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
                        <button class="btn-book-prominent" onClick=${() => setShowDiscoveryModal(true)}>
                            📞 ${t('discovery.bookFreeCall')}
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

            ${showDiscoveryModal && html`
                <${DiscoveryCallModal}
                    coach=${coach}
                    onClose=${() => setShowDiscoveryModal(false)}
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
                ${userType === 'coach' && html`
                    <button class="tab-btn ${activeTab === 'discovery_requests' ? 'active' : ''}" onClick=${() => setActiveTab('discovery_requests')}>
                        📞 ${t('dashboard.discoveryRequests') || 'Discovery Requests'}
                    </button>
                    <button class="tab-btn ${activeTab === 'subscription' ? 'active' : ''}" onClick=${() => setActiveTab('subscription')}>
                        💳 ${t('dashboard.subscription') || 'Subscription'}
                    </button>
                    <button class="tab-btn ${activeTab === 'articles' ? 'active' : ''}" onClick=${() => setActiveTab('articles')}>
                        ${t('dashboard.articles')}
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
            ${activeTab === 'discovery_requests' && userType === 'coach' && html`<${DiscoveryRequestsDashboard} session=${session} />`}
            ${activeTab === 'subscription' && userType === 'coach' && html`<${DashboardSubscription} session=${session} />`}
            ${activeTab === 'articles' && userType === 'coach' && html`<${DashboardArticles} session=${session} />`}
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
                        <button class="quick-action-card" onClick=${() => window.navigateTo('/coaches')}>
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
                    <button class="btn-primary" onClick=${() => window.navigateTo('/coaches')}>
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
                        <button class="btn-primary" style=${{ marginTop: '16px' }} onClick=${() => window.navigateTo('/coaches')}>
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

// Discovery Requests Dashboard Component
const DiscoveryRequestsDashboard = ({ session }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all'); // all, pending, contacted, completed

    useEffect(() => {
        loadRequests();
    }, [session]);

    const loadRequests = async () => {
        setLoading(true);
        setError('');
        try {
            // Get coach ID first
            const { data: coachData } = await window.supabaseClient
                .from('cs_coaches')
                .select('id')
                .eq('user_id', session.user.id)
                .single();

            if (!coachData) {
                setError('Coach profile not found');
                setLoading(false);
                return;
            }

            // Fetch discovery requests via API
            const response = await fetch(`/api/discovery-requests?coach_id=${coachData.id}`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            const result = await response.json();

            if (result.success) {
                setRequests(result.data || []);
            } else {
                setError(result.error?.message || 'Failed to load requests');
            }
        } catch (err) {
            console.error('Error loading discovery requests:', err);
            setError('Failed to load discovery requests');
        }
        setLoading(false);
    };

    const updateRequestStatus = async (requestId, newStatus, notes = null) => {
        try {
            const response = await fetch(`/api/discovery-requests/${requestId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ status: newStatus, coach_notes: notes })
            });
            const result = await response.json();

            if (result.success) {
                // Refresh list
                loadRequests();
            } else {
                setError(result.error?.message || 'Failed to update request');
            }
        } catch (err) {
            console.error('Error updating request:', err);
            setError('Failed to update request');
        }
    };

    const formatTimePreference = (pref) => {
        const labels = {
            'flexible': t('discovery.timeFlexible'),
            'weekday_morning': t('discovery.timeWeekdayMorning'),
            'weekday_afternoon': t('discovery.timeWeekdayAfternoon'),
            'weekday_evening': t('discovery.timeWeekdayEvening'),
            'weekend_morning': t('discovery.timeWeekendMorning'),
            'weekend_afternoon': t('discovery.timeWeekendAfternoon')
        };
        return labels[pref] || pref;
    };

    const getStatusBadge = (status) => {
        const badges = {
            'pending': { class: 'badge-warning', label: t('discovery.dashboard.pending') },
            'contacted': { class: 'badge-info', label: t('discovery.dashboard.contacted') },
            'scheduled': { class: 'badge-petrol', label: t('discovery.dashboard.scheduled') },
            'completed': { class: 'badge-success', label: t('discovery.dashboard.completed') },
            'cancelled': { class: 'badge-danger', label: t('discovery.dashboard.cancelled') }
        };
        return badges[status] || { class: 'badge-secondary', label: status };
    };

    const filteredRequests = filter === 'all'
        ? requests
        : requests.filter(r => r.status === filter);

    if (loading) {
        return html`
            <div class="dashboard-section">
                <div class="loading-spinner"></div>
                <p style=${{ textAlign: 'center', marginTop: '16px' }}>Loading discovery requests...</p>
            </div>
        `;
    }

    return html`
        <div class="dashboard-section discovery-requests-section">
            <div class="section-header">
                <h3>📞 ${t('discovery.dashboard.title')}</h3>
                <p class="section-description">${t('discovery.dashboard.description')}</p>
            </div>

            ${error && html`<div class="alert alert-error">${error}</div>`}

            <div class="filter-tabs" style=${{ marginBottom: '20px' }}>
                <button class="filter-btn ${filter === 'all' ? 'active' : ''}" onClick=${() => setFilter('all')}>
                    ${t('discovery.dashboard.all')} (${requests.length})
                </button>
                <button class="filter-btn ${filter === 'pending' ? 'active' : ''}" onClick=${() => setFilter('pending')}>
                    ${t('discovery.dashboard.pending')} (${requests.filter(r => r.status === 'pending').length})
                </button>
                <button class="filter-btn ${filter === 'contacted' ? 'active' : ''}" onClick=${() => setFilter('contacted')}>
                    ${t('discovery.dashboard.contacted')} (${requests.filter(r => r.status === 'contacted').length})
                </button>
                <button class="filter-btn ${filter === 'completed' ? 'active' : ''}" onClick=${() => setFilter('completed')}>
                    ${t('discovery.dashboard.completed')} (${requests.filter(r => r.status === 'completed').length})
                </button>
            </div>

            ${filteredRequests.length === 0 ? html`
                <div class="empty-state">
                    <div class="empty-icon">📞</div>
                    <h4>${t('discovery.dashboard.noRequests')}</h4>
                    <p>${t('discovery.dashboard.noRequestsDesc')}</p>
                </div>
            ` : html`
                <div class="discovery-requests-list">
                    ${filteredRequests.map(request => {
                        const badge = getStatusBadge(request.status);
                        return html`
                            <div key=${request.id} class="discovery-request-card">
                                <div class="request-header">
                                    <div class="client-info">
                                        <span class="client-name">${request.client_name}</span>
                                        <span class="badge ${badge.class}">${badge.label}</span>
                                    </div>
                                    <span class="request-date">${new Date(request.created_at).toLocaleDateString()}</span>
                                </div>

                                <div class="request-details">
                                    <div class="detail-row">
                                        <span class="detail-icon">📱</span>
                                        <a href="tel:${request.client_phone}" class="phone-link">${request.client_phone}</a>
                                    </div>
                                    ${request.client_email && html`
                                        <div class="detail-row">
                                            <span class="detail-icon">📧</span>
                                            <a href="mailto:${request.client_email}" class="email-link">${request.client_email}</a>
                                        </div>
                                    `}
                                    <div class="detail-row">
                                        <span class="detail-icon">🕐</span>
                                        <span>${t('discovery.dashboard.preferredTime')}: ${formatTimePreference(request.time_preference)}</span>
                                    </div>
                                    ${request.client_message && html`
                                        <div class="client-message">
                                            <strong>${t('discovery.dashboard.message')}:</strong>
                                            <p>${request.client_message}</p>
                                        </div>
                                    `}
                                </div>

                                <div class="request-actions">
                                    ${request.status === 'pending' && html`
                                        <button class="btn-sm btn-petrol" onClick=${() => updateRequestStatus(request.id, 'contacted')}>
                                            ✓ ${t('discovery.dashboard.markContacted')}
                                        </button>
                                    `}
                                    ${request.status === 'contacted' && html`
                                        <button class="btn-sm btn-petrol" onClick=${() => updateRequestStatus(request.id, 'scheduled')}>
                                            📅 ${t('discovery.dashboard.markScheduled')}
                                        </button>
                                    `}
                                    ${request.status === 'scheduled' && html`
                                        <button class="btn-sm btn-success" onClick=${() => updateRequestStatus(request.id, 'completed')}>
                                            ✓ ${t('discovery.dashboard.markCompleted')}
                                        </button>
                                    `}
                                    ${['pending', 'contacted', 'scheduled'].includes(request.status) && html`
                                        <button class="btn-sm btn-outline" onClick=${() => updateRequestStatus(request.id, 'cancelled')}>
                                            ${t('discovery.dashboard.cancelRequest')}
                                        </button>
                                    `}
                                </div>
                            </div>
                        `;
                    })}
                </div>
            `}
        </div>
    `;
};

// Subscription Dashboard Component - MVP Coach Subscription Management
const DashboardSubscription = ({ session }) => {
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState('');

    const YEARLY_PRICE = 50; // €50/year
    const TRIAL_DAYS = 14;

    useEffect(() => {
        loadSubscription();
    }, []);

    const loadSubscription = async () => {
        setLoading(true);
        try {
            const { data, error } = await window.supabaseClient
                .from('cs_coaches')
                .select('subscription_status, trial_ends_at, subscription_ends_at, stripe_subscription_id')
                .eq('id', session.user.id)
                .single();

            if (error) throw error;
            setSubscription(data);
        } catch (err) {
            console.error('Error loading subscription:', err);
            setMessage('Failed to load subscription data');
        } finally {
            setLoading(false);
        }
    };

    const getSubscriptionStatus = () => {
        if (!subscription) return { status: 'unknown', label: 'Unknown', color: 'gray' };

        const now = new Date();

        if (subscription.subscription_status === 'active' && subscription.subscription_ends_at) {
            const endsAt = new Date(subscription.subscription_ends_at);
            if (endsAt > now) {
                return { status: 'active', label: t('subscription.active') || 'Active', color: 'green', endsAt };
            } else {
                return { status: 'expired', label: t('subscription.expired') || 'Expired', color: 'red' };
            }
        }

        if (subscription.subscription_status === 'trial' && subscription.trial_ends_at) {
            const trialEnds = new Date(subscription.trial_ends_at);
            const daysLeft = Math.ceil((trialEnds - now) / (1000 * 60 * 60 * 24));

            if (daysLeft > 0) {
                return { status: 'trial', label: t('subscription.trial') || 'Free Trial', color: 'blue', daysLeft, endsAt: trialEnds };
            } else {
                return { status: 'trial_expired', label: t('subscription.trialExpired') || 'Trial Expired', color: 'orange' };
            }
        }

        if (subscription.subscription_status === 'expired') {
            return { status: 'expired', label: t('subscription.expired') || 'Expired', color: 'red' };
        }

        if (subscription.subscription_status === 'cancelled') {
            return { status: 'cancelled', label: t('subscription.cancelled') || 'Cancelled', color: 'gray' };
        }

        return { status: 'unknown', label: 'Unknown', color: 'gray' };
    };

    const handleSubscribe = async () => {
        setProcessing(true);
        setMessage('');

        try {
            // Create Stripe checkout session
            const response = await fetch('/api/create-subscription-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    coach_id: session.user.id,
                    price_amount: YEARLY_PRICE * 100, // Convert to cents
                    success_url: window.location.origin + '/dashboard?subscription=success',
                    cancel_url: window.location.origin + '/dashboard?subscription=cancelled'
                })
            });

            const result = await response.json();

            if (result.url) {
                window.location.href = result.url;
            } else {
                throw new Error(result.error || 'Failed to create checkout session');
            }
        } catch (err) {
            console.error('Subscription error:', err);
            setMessage(t('subscription.errorGeneric') || 'Failed to start subscription. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    const statusInfo = getSubscriptionStatus();

    if (loading) {
        return html`<div class="dashboard-section"><div class="spinner"></div></div>`;
    }

    return html`
        <div class="dashboard-section subscription-dashboard">
            <h3 class="section-title">${t('subscription.title') || 'Your Subscription'}</h3>

            <!-- Current Status Card -->
            <div class="subscription-status-card status-${statusInfo.status}">
                <div class="status-header">
                    <span class="status-badge ${statusInfo.color}">${statusInfo.label}</span>
                    ${statusInfo.daysLeft !== undefined && html`
                        <span class="days-left">${statusInfo.daysLeft} ${t('subscription.daysLeft') || 'days left'}</span>
                    `}
                </div>

                ${statusInfo.status === 'trial' && html`
                    <div class="status-message">
                        <p>${t('subscription.trialMessage') || 'You are currently on a free trial. Your profile is visible to clients.'}</p>
                        <p class="trial-ends">${t('subscription.trialEnds') || 'Trial ends'}: ${new Date(statusInfo.endsAt).toLocaleDateString()}</p>
                    </div>
                `}

                ${statusInfo.status === 'active' && html`
                    <div class="status-message">
                        <p>${t('subscription.activeMessage') || 'Your subscription is active. Your profile is visible to clients.'}</p>
                        <p class="renewal-date">${t('subscription.renewsOn') || 'Renews on'}: ${new Date(statusInfo.endsAt).toLocaleDateString()}</p>
                    </div>
                `}

                ${(statusInfo.status === 'expired' || statusInfo.status === 'trial_expired') && html`
                    <div class="status-message warning">
                        <p>${t('subscription.expiredMessage') || 'Your subscription has expired. Your profile is hidden from clients.'}</p>
                        <p>${t('subscription.subscribeToReactivate') || 'Subscribe now to make your profile visible again.'}</p>
                    </div>
                `}
            </div>

            <!-- Pricing Card -->
            <div class="subscription-pricing-card">
                <h4>${t('subscription.yearlyPlan') || 'Yearly Subscription'}</h4>
                <div class="price-display">
                    <span class="price-amount">€${YEARLY_PRICE}</span>
                    <span class="price-period">/${t('subscription.year') || 'year'}</span>
                </div>
                <ul class="plan-features">
                    <li>✓ ${t('subscription.feature1') || 'Profile visible to all clients'}</li>
                    <li>✓ ${t('subscription.feature2') || 'Unlimited discovery call requests'}</li>
                    <li>✓ ${t('subscription.feature3') || 'Publish articles & insights'}</li>
                    <li>✓ ${t('subscription.feature4') || 'Client reviews & ratings'}</li>
                    <li>✓ ${t('subscription.feature5') || 'Priority support'}</li>
                </ul>

                ${(statusInfo.status === 'trial' || statusInfo.status === 'trial_expired' || statusInfo.status === 'expired') && html`
                    <button
                        class="btn-primary btn-subscribe"
                        onClick=${handleSubscribe}
                        disabled=${processing}
                    >
                        ${processing
                            ? (t('subscription.processing') || 'Processing...')
                            : (t('subscription.subscribeNow') || 'Subscribe Now - €' + YEARLY_PRICE + '/year')
                        }
                    </button>
                `}

                ${statusInfo.status === 'active' && html`
                    <button class="btn-secondary" disabled>
                        ${t('subscription.currentPlan') || 'Current Plan'}
                    </button>
                `}
            </div>

            ${message && html`
                <div class="message error">${message}</div>
            `}

            <!-- FAQ -->
            <div class="subscription-faq">
                <h4>${t('subscription.faq') || 'Frequently Asked Questions'}</h4>
                <details>
                    <summary>${t('subscription.faq1Question') || 'What happens after my trial ends?'}</summary>
                    <p>${t('subscription.faq1Answer') || 'After your 14-day trial, your profile will be hidden from clients until you subscribe. Your data will be preserved.'}</p>
                </details>
                <details>
                    <summary>${t('subscription.faq2Question') || 'Can I cancel anytime?'}</summary>
                    <p>${t('subscription.faq2Answer') || 'Yes, you can cancel your subscription anytime. Your profile will remain active until the end of your billing period.'}</p>
                </details>
                <details>
                    <summary>${t('subscription.faq3Question') || 'How do discovery calls work?'}</summary>
                    <p>${t('subscription.faq3Answer') || 'Clients can request a free discovery call through your profile. You will be notified and can contact them directly to schedule the call.'}</p>
                </details>
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
    const [editSection, setEditSection] = useState(null);
    const [coachId, setCoachId] = useState(null);
    const [formData, setFormData] = useState({
        full_name: session.user.user_metadata?.full_name || '',
        avatar_url: '',
        banner_url: '',
        title: '',
        bio: '',
        location_city: '',
        location_country: '',
        hourly_rate: '',
        currency: 'EUR',
        specialties: [],
        languages: [],
        years_experience: 0,
        offers_online: true,
        offers_in_person: false,
        website_url: '',
        linkedin_url: '',
        intro_video_url: ''
    });

    // Predefined options matching filters exactly - using SVG flags for Windows compatibility
    const languageOptions = [
        { name: 'English', flagCode: 'gb' },
        { name: 'German', flagCode: 'de' },
        { name: 'Spanish', flagCode: 'es' },
        { name: 'French', flagCode: 'fr' },
        { name: 'Italian', flagCode: 'it' },
        { name: 'Dutch', flagCode: 'nl' },
        { name: 'Portuguese', flagCode: 'pt' }
    ];

    const specialtyOptions = [
        'Leadership', 'Career', 'Executive', 'Life Coaching', 'Business',
        'Health & Wellness', 'Relationships', 'Mindfulness', 'Performance',
        'Communication', 'Stress Management', 'Work-Life Balance'
    ];

    useEffect(() => {
        if (userType === 'coach') {
            loadCoachProfile();
        }
    }, [userType]);

    const loadCoachProfile = async () => {
        try {
            const { data: coach, error } = await window.supabaseClient
                .from('cs_coaches')
                .select('*')
                .eq('user_id', session.user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Failed to load profile:', error);
                return;
            }

            if (coach) {
                setCoachId(coach.id);
                // Handle both old field names (offers_virtual/offers_onsite) and new (offers_online/offers_in_person)
                const offersOnline = coach.offers_online ?? coach.offers_virtual ?? true;
                const offersInPerson = coach.offers_in_person ?? coach.offers_onsite ?? false;
                // Handle location - support both single 'location' field and split city/country
                let locationCity = coach.location_city || '';
                let locationCountry = coach.location_country || '';
                if (!locationCity && !locationCountry && coach.location) {
                    // Parse legacy single location field
                    const parts = coach.location.split(',').map(p => p.trim());
                    if (parts.length >= 2) {
                        locationCity = parts[0];
                        locationCountry = parts[1];
                    } else {
                        locationCity = coach.location;
                    }
                }
                setFormData({
                    full_name: coach.full_name || '',
                    avatar_url: coach.avatar_url || '',
                    banner_url: coach.banner_url || '',
                    title: coach.title || '',
                    bio: coach.bio || '',
                    location_city: locationCity,
                    location_country: locationCountry,
                    hourly_rate: coach.hourly_rate || '',
                    currency: coach.currency || 'EUR',
                    specialties: Array.isArray(coach.specialties) ? coach.specialties : [],
                    languages: Array.isArray(coach.languages) ? coach.languages : [],
                    years_experience: coach.years_experience || 0,
                    offers_online: offersOnline,
                    offers_in_person: offersInPerson,
                    website_url: coach.website_url || '',
                    linkedin_url: coach.linkedin_url || '',
                    intro_video_url: coach.intro_video_url || ''
                });
            }
        } catch (err) {
            console.error('Failed to load profile:', err);
        }
    };

    const handleImageUpload = async (event, fieldName) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setMessage('Error: Please select an image file');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setMessage('Error: Image must be less than 5MB');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${session.user.id}-${fieldName}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await window.supabaseClient.storage
                .from('avatars')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = window.supabaseClient.storage
                .from('avatars')
                .getPublicUrl(fileName);

            setFormData(prev => ({ ...prev, [fieldName]: publicUrl }));
            await saveField(fieldName, publicUrl);
            setMessage('Image uploaded!');
            setTimeout(() => setMessage(''), 2000);
        } catch (err) {
            setMessage('Error: ' + (err.message || 'Upload failed'));
            setTimeout(() => setMessage(''), 3000);
        } finally {
            setUploading(false);
        }
    };

    const saveField = async (field, value) => {
        if (!coachId) return;
        try {
            await window.supabaseClient
                .from('cs_coaches')
                .update({ [field]: value, updated_at: new Date().toISOString() })
                .eq('id', coachId);
        } catch (err) {
            console.error('Save failed:', err);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // Build session_formats array for filter compatibility
            const sessionFormats = [];
            if (formData.offers_online) sessionFormats.push('online');
            if (formData.offers_in_person) sessionFormats.push('in-person');

            const profileData = {
                user_id: session.user.id,
                full_name: formData.full_name,
                avatar_url: formData.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.email}`,
                banner_url: formData.banner_url,
                title: formData.title,
                bio: formData.bio,
                location_city: formData.location_city,
                location_country: formData.location_country,
                hourly_rate: parseFloat(formData.hourly_rate) || 0,
                currency: formData.currency,
                specialties: formData.specialties,
                languages: formData.languages,
                years_experience: parseInt(formData.years_experience) || 0,
                offers_online: formData.offers_online,
                offers_in_person: formData.offers_in_person,
                session_formats: sessionFormats,
                website_url: formData.website_url,
                linkedin_url: formData.linkedin_url,
                intro_video_url: formData.intro_video_url,
                onboarding_completed: true,
                updated_at: new Date().toISOString()
            };

            const { error } = await window.supabaseClient
                .from('cs_coaches')
                .upsert(profileData, { onConflict: 'user_id' });

            if (error) throw error;

            setMessage('Profile saved!');
            setEditSection(null);
            setTimeout(() => setMessage(''), 2000);
        } catch (err) {
            setMessage('Error: ' + (err.message || 'Save failed'));
        } finally {
            setLoading(false);
        }
    };

    const formatPrice = (price) => {
        const symbols = { EUR: '€', USD: '$', GBP: '£', CHF: 'CHF ' };
        return (symbols[formData.currency] || '€') + (price || 0);
    };

    // Languages are now stored as full names (English, German, etc.)
    const getLanguageDisplay = (langName) => {
        const lang = languageOptions.find(l => l.name === langName);
        return lang ? `${lang.flag} ${lang.name}` : String(langName);
    };

    const locationText = formData.location_city
        ? formData.location_city + (formData.location_country ? ', ' + formData.location_country : '')
        : formData.location_country || 'Location not set';

    // Inject CSS once
    useEffect(() => {
        if (!document.getElementById('linkedin-profile-css')) {
            const style = document.createElement('style');
            style.id = 'linkedin-profile-css';
            style.textContent = `
                .linkedin-profile-editor { max-width: 900px; margin: 0 auto; }
                .profile-message { padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-weight: 500; }
                .profile-message.success { background: #d4edda; color: #155724; }
                .profile-message.error { background: #f8d7da; color: #721c24; }
                .profile-preview-banner { background: linear-gradient(135deg, #1a5f5a, #2d8a82); color: white; padding: 12px 20px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
                .linkedin-profile-card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; margin-bottom: 20px; }
                .banner-upload-btn { position: absolute; bottom: 12px; right: 12px; background: rgba(0,0,0,0.6); color: white; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 13px; }
                .banner-upload-btn:hover { background: rgba(0,0,0,0.8); }
                .profile-avatar-section { margin-top: -60px; padding: 0 24px; }
                .profile-avatar-wrapper { position: relative; width: 120px; height: 120px; }
                .profile-avatar { width: 120px; height: 120px; border-radius: 50%; border: 4px solid white; object-fit: cover; background: #f0f0f0; }
                .avatar-upload-btn { position: absolute; bottom: 4px; right: 4px; width: 32px; height: 32px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
                .profile-main-info { padding: 16px 24px 24px; }
                .profile-header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
                .profile-name { font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0 0 4px 0; }
                .profile-title { font-size: 16px; color: #666; margin: 0; }
                .profile-meta { display: flex; flex-wrap: wrap; gap: 16px; color: #666; font-size: 14px; margin-bottom: 16px; }
                .profile-pricing { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
                .price-badge { background: #1a5f5a; color: white; padding: 6px 14px; border-radius: 20px; font-weight: 600; }
                .format-badge { background: #f0f0f0; padding: 6px 12px; border-radius: 16px; font-size: 13px; }
                .linkedin-section { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 20px 24px; margin-bottom: 16px; }
                .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
                .section-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
                .edit-btn { background: none; border: 1px solid #ddd; border-radius: 20px; padding: 6px 14px; cursor: pointer; font-size: 13px; }
                .edit-btn:hover { background: #f5f5f5; border-color: #1a5f5a; }
                .bio-text { color: #333; line-height: 1.6; white-space: pre-wrap; }
                .placeholder-text { color: #999; font-style: italic; }
                .tags-display { display: flex; flex-wrap: wrap; gap: 8px; }
                .specialty-tag { background: #e8f5f3; color: #1a5f5a; padding: 6px 14px; border-radius: 16px; font-size: 14px; }
                .links-row { display: flex; gap: 12px; }
                .link-btn { padding: 8px 16px; border-radius: 8px; background: #f5f5f5; color: #333; text-decoration: none; font-size: 14px; }
                .link-btn:hover { background: #e8e8e8; }
                .edit-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
                .edit-modal { background: white; border-radius: 12px; width: 90%; max-width: 500px; max-height: 80vh; overflow-y: auto; }
                .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #eee; }
                .modal-header h3 { margin: 0; font-size: 18px; }
                .modal-header button { background: none; border: none; font-size: 24px; cursor: pointer; color: #666; }
                .modal-body { padding: 20px; }
                .modal-footer { padding: 16px 20px; border-top: 1px solid #eee; display: flex; justify-content: flex-end; gap: 12px; }
                .form-group { margin-bottom: 16px; }
                .form-group label { display: block; margin-bottom: 6px; font-weight: 500; color: #333; }
                .form-group input, .form-group textarea, .form-group select { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
                .form-group input:focus, .form-group textarea:focus { outline: none; border-color: #1a5f5a; }
                .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
                .checkbox-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
                .checkbox-row { display: flex; gap: 20px; }
                .checkbox-item { display: flex; align-items: center; gap: 8px; cursor: pointer; }
                .current-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
                .tag-chip { background: #e8f5f3; color: #1a5f5a; padding: 4px 10px; border-radius: 14px; display: flex; align-items: center; gap: 6px; }
                .tag-chip button { background: none; border: none; cursor: pointer; font-size: 16px; color: #1a5f5a; padding: 0; }
                .suggestions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
                .suggestion-btn { background: #f5f5f5; border: 1px dashed #ccc; border-radius: 14px; padding: 4px 12px; cursor: pointer; font-size: 13px; }
                .suggestion-btn:hover { background: #e8f5f3; border-color: #1a5f5a; }
                .btn-cancel { padding: 10px 20px; border: 1px solid #ddd; border-radius: 8px; background: white; cursor: pointer; }
                .btn-save { padding: 10px 20px; border: none; border-radius: 8px; background: #1a5f5a; color: white; cursor: pointer; font-weight: 500; }
                .btn-save:disabled { background: #ccc; cursor: not-allowed; }

                /* Video Introduction Section */
                .video-intro-section { position: relative; }
                .video-intro-section.no-video { background: linear-gradient(135deg, #fffbeb, #fef3c7); border: 2px dashed #f59e0b; }
                .video-intro-section.has-video { background: linear-gradient(135deg, #ecfdf5, #d1fae5); border: 2px solid #10b981; }

                .video-importance-banner { display: flex; gap: 16px; padding: 16px; background: white; border-radius: 10px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
                .importance-icon { font-size: 32px; }
                .importance-text strong { color: #b45309; font-size: 16px; display: block; margin-bottom: 6px; }
                .importance-text p { color: #78716c; font-size: 14px; line-height: 1.5; margin: 0; }

                .add-video-btn { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 16px 24px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
                .add-video-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4); }
                .add-video-btn span { font-size: 20px; }

                .video-added-badge { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: white; border-radius: 8px; margin-bottom: 12px; }
                .video-added-badge .badge-icon { width: 24px; height: 24px; background: #10b981; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; }
                .video-added-badge span:last-child { color: #065f46; font-weight: 500; }

                .video-link { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: white; border-radius: 8px; color: #1a5f5a; text-decoration: none; transition: background 0.2s; }
                .video-link:hover { background: #f0fdf4; }
                .video-link .play-icon { width: 32px; height: 32px; background: #1a5f5a; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; }

                /* Video Modal */
                .video-modal { max-width: 600px; }
                .video-info-box { display: flex; gap: 14px; padding: 16px; background: linear-gradient(135deg, #fffbeb, #fef3c7); border-radius: 10px; margin-bottom: 20px; border: 1px solid #fcd34d; }
                .video-info-box .info-icon { font-size: 28px; }
                .video-info-box .info-content strong { color: #92400e; display: block; margin-bottom: 8px; }
                .video-info-box .info-content ul { margin: 0; padding-left: 0; list-style: none; }
                .video-info-box .info-content li { color: #78716c; font-size: 14px; margin-bottom: 6px; }
                .video-info-box .info-content li strong { color: #1a5f5a; display: inline; }

                .form-hint { color: #6b7280; font-size: 13px; margin-top: 6px; }

                .video-tips { margin-top: 20px; padding: 16px; background: #f9fafb; border-radius: 8px; }
                .video-tips strong { color: #374151; font-size: 14px; display: block; margin-bottom: 10px; }
                .video-tips ul { margin: 0; padding-left: 20px; }
                .video-tips li { color: #6b7280; font-size: 13px; margin-bottom: 6px; }
            `;
            document.head.appendChild(style);
        }
    }, []);

    // Debug logging
    console.log('🎨 [PROFILE DEBUG] Rendering with formData:', {
        full_name: formData.full_name,
        specialties_type: typeof formData.specialties,
        specialties_isArray: Array.isArray(formData.specialties),
        languages_type: typeof formData.languages,
        languages_isArray: Array.isArray(formData.languages)
    });

    // Simple client profile
    if (userType !== 'coach') {
        return html`
            <div class="profile-simple">
                <h3>Your Profile</h3>
                <p><strong>Email:</strong> ${session.user.email}</p>
                <p><strong>Account Type:</strong> Client</p>
            </div>
        `;
    }

    return html`
        <div class="linkedin-profile-editor">
            ${message && html`
                <div class="profile-message ${message.includes('Error') ? 'error' : 'success'}">
                    ${message}
                </div>
            `}

            <div class="profile-preview-banner">
                ✨ This is how your profile appears to clients. Click any section to edit.
            </div>

            <!-- Profile Card -->
            <div class="linkedin-profile-card">
                <!-- Banner -->
                <div class="profile-banner" style=${{ backgroundImage: formData.banner_url ? `url('${formData.banner_url}')` : 'none', backgroundColor: formData.banner_url ? 'transparent' : '#1a5f5a', height: '180px', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                    <label class="banner-upload-btn">
                        <input type="file" accept="image/*" hidden onChange=${(e) => handleImageUpload(e, 'banner_url')} />
                        📷 ${formData.banner_url ? 'Change' : 'Add'} Cover
                    </label>
                </div>

                <!-- Avatar -->
                <div class="profile-avatar-section">
                    <div class="profile-avatar-wrapper">
                        <img
                            src=${formData.avatar_url || 'https://via.placeholder.com/150?text=' + (formData.full_name ? formData.full_name.charAt(0) : '?')}
                            alt="Profile"
                            class="profile-avatar"
                        />
                        <label class="avatar-upload-btn">
                            <input type="file" accept="image/*" hidden onChange=${(e) => handleImageUpload(e, 'avatar_url')} />
                            📷
                        </label>
                    </div>
                </div>

                <!-- Main Info -->
                <div class="profile-main-info">
                    <div class="profile-header-row">
                        <div>
                            <h1 class="profile-name">${formData.full_name || 'Your Name'}</h1>
                            <p class="profile-title">${formData.title || 'Professional Title'}</p>
                        </div>
                        <button class="edit-btn" onClick=${() => setEditSection('intro')}>✏️ Edit</button>
                    </div>

                    <div class="profile-meta">
                        <span>📍 ${locationText}</span>
                        ${formData.languages.length > 0 && html`
                            <span>💬 ${formData.languages.slice(0, 3).join(', ')}</span>
                        `}
                        ${formData.years_experience > 0 && html`
                            <span>🏆 ${String(formData.years_experience)}+ years</span>
                        `}
                    </div>

                    <div class="profile-pricing">
                        <span class="price-badge">${formatPrice(formData.hourly_rate)} / hour</span>
                        ${formData.offers_online && html`<span class="format-badge">💻 Online</span>`}
                        ${formData.offers_in_person && html`<span class="format-badge">🤝 In-Person</span>`}
                    </div>
                </div>
            </div>

            <!-- About Section -->
            <div class="linkedin-section">
                <div class="section-header">
                    <h2>About</h2>
                    <button class="edit-btn" onClick=${() => setEditSection('about')}>✏️</button>
                </div>
                <div class="section-content">
                    ${formData.bio
                        ? html`<p class="bio-text">${formData.bio}</p>`
                        : html`<p class="placeholder-text">Tell clients about yourself and your coaching approach...</p>`
                    }
                </div>
            </div>

            <!-- Specialties Section -->
            <div class="linkedin-section">
                <div class="section-header">
                    <h2>Specialties</h2>
                    <button class="edit-btn" onClick=${() => setEditSection('specialties')}>✏️</button>
                </div>
                <div class="section-content">
                    ${formData.specialties.length > 0
                        ? html`<div class="tags-display">${formData.specialties.map((s, i) => html`<span key=${i} class="specialty-tag">${String(s)}</span>`)}</div>`
                        : html`<p class="placeholder-text">Add your coaching specialties...</p>`
                    }
                </div>
            </div>

            <!-- Video Introduction Section - PROMINENT -->
            <div class="linkedin-section video-intro-section ${formData.intro_video_url ? 'has-video' : 'no-video'}">
                <div class="section-header">
                    <h2>🎬 Video Introduction</h2>
                    <button class="edit-btn" onClick=${() => setEditSection('video')}>✏️</button>
                </div>
                ${formData.intro_video_url ? html`
                    <div class="section-content video-preview">
                        <div class="video-added-badge">
                            <span class="badge-icon">✓</span>
                            <span>Video Added - Great for building trust!</span>
                        </div>
                        <a href=${formData.intro_video_url} target="_blank" class="video-link">
                            <span class="play-icon">▶</span>
                            <span>View your intro video</span>
                        </a>
                    </div>
                ` : html`
                    <div class="section-content video-cta">
                        <div class="video-importance-banner">
                            <div class="importance-icon">⭐</div>
                            <div class="importance-text">
                                <strong>Boost your visibility by 3x!</strong>
                                <p>Coaches with video introductions appear at the top of search results and get significantly more bookings. Let potential clients see and hear you before they book.</p>
                            </div>
                        </div>
                        <button class="add-video-btn" onClick=${() => setEditSection('video')}>
                            <span>🎥</span> Add Your Video Introduction
                        </button>
                    </div>
                `}
            </div>

            <!-- Links Section -->
            <div class="linkedin-section">
                <div class="section-header">
                    <h2>Links</h2>
                    <button class="edit-btn" onClick=${() => setEditSection('links')}>✏️</button>
                </div>
                <div class="section-content links-row">
                    ${formData.website_url && html`<a href=${formData.website_url} target="_blank" class="link-btn">🌐 Website</a>`}
                    ${formData.linkedin_url && html`<a href=${formData.linkedin_url} target="_blank" class="link-btn">💼 LinkedIn</a>`}
                    ${!formData.website_url && !formData.linkedin_url && html`<p class="placeholder-text">Add your website or LinkedIn profile...</p>`}
                </div>
            </div>

            <!-- Edit Modals -->
            ${editSection === 'intro' && html`
                <div class="edit-modal-overlay" onClick=${() => setEditSection(null)}>
                    <div class="edit-modal" onClick=${(e) => e.stopPropagation()}>
                        <div class="modal-header">
                            <h3>Edit Introduction</h3>
                            <button onClick=${() => setEditSection(null)}>×</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label>Full Name</label>
                                <input type="text" value=${formData.full_name} onChange=${(e) => setFormData({...formData, full_name: e.target.value})} />
                            </div>
                            <div class="form-group">
                                <label>Professional Title</label>
                                <input type="text" placeholder="e.g., Executive Coach" value=${formData.title} onChange=${(e) => setFormData({...formData, title: e.target.value})} />
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>City</label>
                                    <input type="text" value=${formData.location_city} onChange=${(e) => setFormData({...formData, location_city: e.target.value})} />
                                </div>
                                <div class="form-group">
                                    <label>Country</label>
                                    <input type="text" value=${formData.location_country} onChange=${(e) => setFormData({...formData, location_country: e.target.value})} />
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Years of Experience</label>
                                <input type="number" min="0" value=${formData.years_experience} onChange=${(e) => setFormData({...formData, years_experience: parseInt(e.target.value) || 0})} />
                            </div>
                            <div class="form-group">
                                <label>Languages</label>
                                <div class="checkbox-grid">
                                    ${languageOptions.map(lang => html`
                                        <label key=${lang.name} class="checkbox-item" style=${{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input type="checkbox"
                                                checked=${formData.languages.includes(lang.name)}
                                                onChange=${(e) => {
                                                    const langs = formData.languages;
                                                    if (e.target.checked) {
                                                        setFormData({...formData, languages: [...langs, lang.name]});
                                                    } else {
                                                        setFormData({...formData, languages: langs.filter(l => l !== lang.name)});
                                                    }
                                                }}
                                            />
                                            <img
                                                src="https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${lang.flagCode}.svg"
                                                alt=${lang.name}
                                                style=${{ width: '20px', height: '15px', borderRadius: '2px' }}
                                            />
                                            ${lang.name}
                                        </label>
                                    `)}
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Currency</label>
                                    <select value=${formData.currency} onChange=${(e) => setFormData({...formData, currency: e.target.value})}>
                                        <option value="EUR">EUR €</option>
                                        <option value="USD">USD $</option>
                                        <option value="GBP">GBP £</option>
                                        <option value="CHF">CHF</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Hourly Rate</label>
                                    <input type="number" min="0" value=${formData.hourly_rate} onChange=${(e) => setFormData({...formData, hourly_rate: e.target.value})} />
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Session Formats</label>
                                <div class="checkbox-row">
                                    <label class="checkbox-item">
                                        <input type="checkbox" checked=${formData.offers_online} onChange=${(e) => setFormData({...formData, offers_online: e.target.checked})} />
                                        💻 Video/Online
                                    </label>
                                    <label class="checkbox-item">
                                        <input type="checkbox" checked=${formData.offers_in_person} onChange=${(e) => setFormData({...formData, offers_in_person: e.target.checked})} />
                                        🤝 In-Person
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-cancel" onClick=${() => setEditSection(null)}>Cancel</button>
                            <button class="btn-save" onClick=${handleSave} disabled=${loading}>${loading ? 'Saving...' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            `}

            ${editSection === 'about' && html`
                <div class="edit-modal-overlay" onClick=${() => setEditSection(null)}>
                    <div class="edit-modal" onClick=${(e) => e.stopPropagation()}>
                        <div class="modal-header">
                            <h3>Edit About</h3>
                            <button onClick=${() => setEditSection(null)}>×</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label>About You</label>
                                <textarea rows="8" placeholder="Share your coaching philosophy, experience, and what makes you unique..." value=${formData.bio} onChange=${(e) => setFormData({...formData, bio: e.target.value})}></textarea>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-cancel" onClick=${() => setEditSection(null)}>Cancel</button>
                            <button class="btn-save" onClick=${handleSave} disabled=${loading}>${loading ? 'Saving...' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            `}

            ${editSection === 'specialties' && html`
                <div class="edit-modal-overlay" onClick=${() => setEditSection(null)}>
                    <div class="edit-modal" onClick=${(e) => e.stopPropagation()}>
                        <div class="modal-header">
                            <h3>Edit Specialties</h3>
                            <button onClick=${() => setEditSection(null)}>×</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label>Select Your Specialties</label>
                                <p style=${{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>Click to select or deselect specialties</p>
                                <div style=${{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    ${specialtyOptions.map(specialty => {
                                        const isSelected = formData.specialties.includes(specialty);
                                        return html`
                                            <button
                                                type="button"
                                                key=${specialty}
                                                onClick=${() => {
                                                    if (isSelected) {
                                                        setFormData({...formData, specialties: formData.specialties.filter(s => s !== specialty)});
                                                    } else {
                                                        setFormData({...formData, specialties: [...formData.specialties, specialty]});
                                                    }
                                                }}
                                                style=${{
                                                    padding: '8px 14px',
                                                    border: isSelected ? '2px solid #1a5f5a' : '2px solid #E5E7EB',
                                                    borderRadius: '20px',
                                                    background: isSelected ? '#e8f5f3' : 'white',
                                                    cursor: 'pointer',
                                                    fontSize: '14px',
                                                    fontWeight: '500',
                                                    color: isSelected ? '#1a5f5a' : '#374151',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                ${specialty} ${isSelected ? '✓' : ''}
                                            </button>
                                        `;
                                    })}
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-cancel" onClick=${() => setEditSection(null)}>Cancel</button>
                            <button class="btn-save" onClick=${handleSave} disabled=${loading}>${loading ? 'Saving...' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            `}

            ${editSection === 'video' && html`
                <div class="edit-modal-overlay" onClick=${() => setEditSection(null)}>
                    <div class="edit-modal video-modal" onClick=${(e) => e.stopPropagation()}>
                        <div class="modal-header">
                            <h3>🎬 Video Introduction</h3>
                            <button onClick=${() => setEditSection(null)}>×</button>
                        </div>
                        <div class="modal-body">
                            <div class="video-info-box">
                                <div class="info-icon">💡</div>
                                <div class="info-content">
                                    <strong>Why add a video?</strong>
                                    <ul>
                                        <li>📈 Appear at the <strong>top of search results</strong></li>
                                        <li>🤝 Build <strong>instant trust</strong> with potential clients</li>
                                        <li>📅 Get <strong>more bookings</strong> - clients prefer coaches they can see</li>
                                    </ul>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Video URL</label>
                                <input
                                    type="url"
                                    placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                                    value=${formData.intro_video_url}
                                    onChange=${(e) => setFormData({...formData, intro_video_url: e.target.value})}
                                />
                                <p class="form-hint">Paste a link to your YouTube, Vimeo, or other video hosting URL. We recommend a 1-3 minute introduction video.</p>
                            </div>
                            <div class="video-tips">
                                <strong>Tips for a great intro video:</strong>
                                <ul>
                                    <li>Introduce yourself and your coaching style</li>
                                    <li>Share your background and qualifications</li>
                                    <li>Explain what clients can expect</li>
                                    <li>Keep it authentic and personable</li>
                                </ul>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-cancel" onClick=${() => setEditSection(null)}>Cancel</button>
                            <button class="btn-save" onClick=${handleSave} disabled=${loading}>${loading ? 'Saving...' : 'Save Video'}</button>
                        </div>
                    </div>
                </div>
            `}

            ${editSection === 'links' && html`
                <div class="edit-modal-overlay" onClick=${() => setEditSection(null)}>
                    <div class="edit-modal" onClick=${(e) => e.stopPropagation()}>
                        <div class="modal-header">
                            <h3>Edit Links</h3>
                            <button onClick=${() => setEditSection(null)}>×</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label>Website</label>
                                <input type="url" placeholder="https://yourwebsite.com" value=${formData.website_url} onChange=${(e) => setFormData({...formData, website_url: e.target.value})} />
                            </div>
                            <div class="form-group">
                                <label>LinkedIn</label>
                                <input type="url" placeholder="https://linkedin.com/in/yourprofile" value=${formData.linkedin_url} onChange=${(e) => setFormData({...formData, linkedin_url: e.target.value})} />
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-cancel" onClick=${() => setEditSection(null)}>Cancel</button>
                            <button class="btn-save" onClick=${handleSave} disabled=${loading}>${loading ? 'Saving...' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            `}
        </div>
    `;
};

const CoachingCategoriesSection = () => {
    const categories = [
        { slug: 'executive-coaching', titleKey: 'category.executive.title', icon: '👔', descKey: 'category.executive.desc' },
        { slug: 'life-coaching', titleKey: 'category.life.title', icon: '🌟', descKey: 'category.life.desc' },
        { slug: 'career-coaching', titleKey: 'category.career.title', icon: '💼', descKey: 'category.career.desc' },
        { slug: 'business-coaching', titleKey: 'category.business.title', icon: '📊', descKey: 'category.business.desc' },
        { slug: 'leadership', titleKey: 'category.leadership.title', icon: '👑', descKey: 'category.leadership.desc' },
        { slug: 'health-wellness', titleKey: 'category.health.title', icon: '💪', descKey: 'category.health.desc' },
        { slug: 'mindfulness', titleKey: 'category.mindfulness.title', icon: '🧘', descKey: 'category.mindfulness.desc' },
        { slug: 'relationship-coaching', titleKey: 'category.relationship.title', icon: '💑', descKey: 'category.relationship.desc' },
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
                        <a href="/coaching/${cat.slug}" class="category-card-home" key=${cat.slug}>
                            <div class="category-icon-home">${cat.icon}</div>
                            <h3>${t(cat.titleKey)}</h3>
                            <p>${t(cat.descKey)}</p>
                        </a>
                    `)}
                </div>
                <div class="categories-cta-home">
                    <a href="/categories" class="btn-secondary">${t('category.browseAll') || 'View All Categories'}</a>
                    <a href="/quiz" class="btn-primary">${t('category.findMatch') || 'Find Your Match'}</a>
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
                        <span class="trust-text">${t('trust.verifiedCoaches') || '500+ Verified Coaches'}</span>
                    </div>
                    <div class="trust-badge-home">
                        <span class="trust-icon">⭐</span>
                        <span class="trust-text">${t('trust.avgRating') || '4.9 Average Rating'}</span>
                    </div>
                    <div class="trust-badge-home">
                        <span class="trust-icon">🔒</span>
                        <span class="trust-text">${t('trust.securePayments') || 'Secure Payments'}</span>
                    </div>
                    <div class="trust-badge-home">
                        <span class="trust-icon">💯</span>
                        <span class="trust-text">${t('trust.satisfaction') || 'Satisfaction Guaranteed'}</span>
                    </div>
                </div>
            </div>
        </section>
    `;
};

const Home = ({ session }) => {
    return html`
        <div>
            <${Hero} />
            <${TrustBadgesSection} />
            <${CoachingCategoriesSection} />
            <${HowItWorksSection} />

            <${CoachList} session=${session} />
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
                            <a href="/notifications" style=${{ fontSize: '13px', color: 'var(--primary-petrol)' }}>
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
            window.navigateTo('/login');
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
                window.navigateTo('/signout');
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
        window.navigateTo('/home');
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
                                <button class="btn-primary" onClick=${() => window.navigateTo('/coaches')}>
                                    ${t('quiz.viewProfile')}
                                </button>
                            </div>
                        `)}
                    </div>

                    <div class="results-actions">
                        <button class="btn-secondary" onClick=${startOver}>
                            ← ${t('quiz.results.retake')}
                        </button>
                        <button class="btn-primary" onClick=${() => window.navigateTo('/coaches')}>
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
                    <button class="btn-ghost" onClick=${() => window.navigateTo('/home')}>
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
                                            <button class="btn-primary btn-sm" onClick=${() => window.navigateTo('/coaches')}>
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
                    <a href="/quiz" class="btn-secondary">${t('aiMatch.alternativeBtn')} →</a>
                </div>
            </div>
        </div>
    `;
};

// Helper function to get current route from pathname
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
            case 'coaches': Component = () => html`<${CoachList} session=${session} />`; break;
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
