/**
 * Premium Auth Component
 * Modern login and registration with premium UX
 */

import htm from '../../vendor/htm.js';
import { t } from '../../i18n.js';

const React = window.React;
const { useState, useEffect, useRef, useCallback } = React;
const html = htm.bind(React.createElement);

// Role options for registration
const ROLES = [
    { id: 'client', icon: '👤', name: 'Client', desc: 'Find a coach' },
    { id: 'coach', icon: '🎓', name: 'Coach', desc: 'Offer coaching' },
    { id: 'business', icon: '🏢', name: 'Business', desc: 'Team coaching' }
];

/**
 * Auth Component
 * Premium authentication experience
 */
export function Auth() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [userType, setUserType] = useState('client');
    const [isLogin, setIsLogin] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Referral code state (for coach registration)
    const [referralCode, setReferralCode] = useState('');
    const [referralStatus, setReferralStatus] = useState(null);
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
                setReferralMessage(t('auth.referralInvalid') || 'Invalid referral code');
                setReferrerId(null);
            } else {
                setReferralStatus('valid');
                setReferralMessage(t('auth.referralValid') || 'Code applied!');
                setReferrerId(codeData.user_id);
            }
        } catch (err) {
            console.error('Error validating referral code:', err);
            setReferralStatus('invalid');
            setReferralMessage(t('auth.referralError') || 'Could not validate code');
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

    // Check URL for mode=register parameter
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

        checkMode();
        window.addEventListener('popstate', checkMode);
        return () => window.removeEventListener('popstate', checkMode);
    }, []);

    const handleAuth = async (e) => {
        e.preventDefault();

        if (!window.supabaseClient) {
            setMessage({ type: 'error', text: 'Connection error. Please refresh the page.' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            let result;
            if (isLogin) {
                result = await window.supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });
            } else {
                const metadata = {
                    user_type: userType,
                    full_name: email.split('@')[0]
                };

                if (userType === 'coach' && referralStatus === 'valid' && referralCode) {
                    metadata.referral_code = referralCode.trim().toUpperCase();
                    metadata.referral_code_valid = true;
                    metadata.referrer_id = referrerId;
                }

                result = await window.supabaseClient.auth.signUp({
                    email,
                    password,
                    options: { data: metadata }
                });
            }

            const { data, error } = result;

            if (error) throw error;

            if (!isLogin) {
                if (data.user && !data.session) {
                    setMessage({
                        type: 'success',
                        text: 'Account created! Please check your email to confirm, then sign in.'
                    });
                    setLoading(false);
                    return;
                }

                const needsOnboarding = userType === 'coach';
                if (needsOnboarding) {
                    setMessage({ type: 'success', text: 'Welcome! Setting up your profile...' });
                    setTimeout(() => window.navigateTo('/onboarding'), 500);
                } else {
                    setMessage({ type: 'success', text: 'Welcome! Redirecting...' });
                    setTimeout(() => window.navigateTo('/coaches'), 500);
                }
            } else {
                setMessage({ type: 'success', text: 'Welcome back! Loading...' });
                setTimeout(() => window.navigateTo('/dashboard'), 500);
            }
        } catch (error) {
            console.error('Auth Error:', error);
            setMessage({ type: 'error', text: error.message || 'Authentication failed' });
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setMessage({ type: '', text: '' });
    };

    return html`
        <div class="premium-auth">
            <div class="premium-auth-card">
                <!-- Header -->
                <div class="premium-auth-header">
                    <div class="auth-logo">
                        <div class="auth-logo-icon">🎯</div>
                        <div class="auth-logo-text">Coach<span>Searching</span></div>
                    </div>
                    <h1 class="premium-auth-title">
                        ${isLogin ? (t('auth.welcomeBack') || 'Welcome Back') : (t('auth.createAccount') || 'Create Account')}
                    </h1>
                    <p class="premium-auth-subtitle">
                        ${isLogin
                            ? (t('auth.signInSubtitle') || 'Sign in to continue your journey')
                            : (t('auth.signUpSubtitle') || 'Join thousands of coaches and clients')}
                    </p>
                </div>

                <!-- Body -->
                <div class="premium-auth-body">
                    <!-- Mode Tabs -->
                    <div class="auth-mode-tabs">
                        <button
                            type="button"
                            class="auth-mode-tab ${isLogin ? 'active' : ''}"
                            onClick=${() => { setIsLogin(true); setMessage({ type: '', text: '' }); }}
                        >
                            ${t('auth.signIn') || 'Sign In'}
                        </button>
                        <button
                            type="button"
                            class="auth-mode-tab ${!isLogin ? 'active' : ''}"
                            onClick=${() => { setIsLogin(false); setMessage({ type: '', text: '' }); }}
                        >
                            ${t('auth.signUp') || 'Sign Up'}
                        </button>
                    </div>

                    <!-- Message -->
                    ${message.text && html`
                        <div class="auth-message ${message.type}">
                            <span class="auth-message-icon">
                                ${message.type === 'success' ? '✓' : '⚠'}
                            </span>
                            <span>${message.text}</span>
                        </div>
                    `}

                    <form onSubmit=${handleAuth}>
                        <!-- Role Selection (Register only) -->
                        ${!isLogin && html`
                            <div class="auth-role-section">
                                <label class="auth-role-label">
                                    ${t('auth.iAmA') || "I'm a..."}
                                </label>
                                <div class="auth-role-grid">
                                    ${ROLES.map(role => html`
                                        <div
                                            key=${role.id}
                                            class="auth-role-card ${userType === role.id ? 'selected' : ''}"
                                            onClick=${() => setUserType(role.id)}
                                            role="radio"
                                            aria-checked=${userType === role.id}
                                            tabIndex="0"
                                            onKeyDown=${(e) => e.key === 'Enter' && setUserType(role.id)}
                                        >
                                            <div class="auth-role-icon">${role.icon}</div>
                                            <div class="auth-role-name">${t(`auth.${role.id}`) || role.name}</div>
                                            <div class="auth-role-desc">${t(`auth.${role.id}Desc`) || role.desc}</div>
                                        </div>
                                    `)}
                                </div>
                            </div>
                        `}

                        <!-- Email -->
                        <div class="auth-form-group">
                            <label class="auth-form-label">${t('auth.email') || 'Email'}</label>
                            <div class="auth-input-wrapper">
                                <input
                                    type="email"
                                    class="premium-auth-input"
                                    placeholder=${t('auth.emailPlaceholder') || 'you@example.com'}
                                    value=${email}
                                    onInput=${(e) => setEmail(e.target.value)}
                                    required
                                    autocomplete="email"
                                />
                                <span class="auth-input-icon">✉</span>
                            </div>
                        </div>

                        <!-- Password -->
                        <div class="auth-form-group">
                            <label class="auth-form-label">${t('auth.password') || 'Password'}</label>
                            <div class="auth-input-wrapper">
                                <input
                                    type=${showPassword ? 'text' : 'password'}
                                    class="premium-auth-input"
                                    placeholder=${isLogin ? '••••••••' : (t('auth.passwordPlaceholder') || 'Min. 6 characters')}
                                    value=${password}
                                    onInput=${(e) => setPassword(e.target.value)}
                                    required
                                    minLength="6"
                                    autocomplete=${isLogin ? 'current-password' : 'new-password'}
                                />
                                <span class="auth-input-icon">🔒</span>
                                <button
                                    type="button"
                                    class="auth-password-toggle"
                                    onClick=${() => setShowPassword(!showPassword)}
                                    aria-label=${showPassword ? 'Hide password' : 'Show password'}
                                >
                                    ${showPassword ? '🙈' : '👁'}
                                </button>
                            </div>
                        </div>

                        <!-- Referral Code (Coach registration only) -->
                        ${!isLogin && userType === 'coach' && html`
                            <div class="auth-referral-section">
                                <div class="auth-referral-header">
                                    <span class="auth-referral-label">
                                        ${t('auth.referralCode') || 'Referral Code'}
                                    </span>
                                    <span class="auth-referral-optional">
                                        ${t('auth.optional') || '(optional)'}
                                    </span>
                                </div>
                                <div class="auth-referral-input-wrapper">
                                    <div class="auth-input-wrapper">
                                        <input
                                            type="text"
                                            class="premium-auth-input ${referralStatus ? `referral-${referralStatus}` : ''}"
                                            placeholder=${t('auth.referralPlaceholder') || 'Enter code'}
                                            value=${referralCode}
                                            onInput=${handleReferralCodeChange}
                                            disabled=${loading}
                                            maxLength="20"
                                            style="padding-left: 1rem; padding-right: 3rem;"
                                        />
                                        ${referralStatus === 'checking' && html`
                                            <span class="auth-referral-status checking">⏳</span>
                                        `}
                                        ${referralStatus === 'valid' && html`
                                            <span class="auth-referral-status valid">✓</span>
                                        `}
                                        ${referralStatus === 'invalid' && html`
                                            <span class="auth-referral-status invalid">✗</span>
                                        `}
                                    </div>
                                </div>

                                ${referralStatus === 'valid' && html`
                                    <div class="auth-referral-success">
                                        <span class="auth-referral-success-icon">🎁</span>
                                        <div class="auth-referral-success-text">
                                            <strong>${t('auth.referralSuccessTitle') || 'Free Premium Year!'}</strong>
                                            <span>${t('auth.referralSuccessDesc') || 'Enjoy all Premium features free for your first year.'}</span>
                                        </div>
                                    </div>
                                `}

                                ${referralStatus === 'invalid' && html`
                                    <div class="auth-referral-error">${referralMessage}</div>
                                `}
                            </div>
                        `}

                        <!-- Submit -->
                        <button
                            type="submit"
                            class="premium-auth-submit"
                            disabled=${loading}
                        >
                            ${loading && html`<span class="btn-spinner"></span>`}
                            ${loading
                                ? (t('auth.processing') || 'Processing...')
                                : (isLogin
                                    ? (t('auth.signInBtn') || 'Sign In')
                                    : (t('auth.createAccountBtn') || 'Create Account'))}
                        </button>

                        <!-- Social Proof (Register only) -->
                        ${!isLogin && html`
                            <div class="auth-social-proof">
                                <div class="auth-proof-item">
                                    <div class="auth-proof-number">2,500+</div>
                                    <div class="auth-proof-label">Coaches</div>
                                </div>
                                <div class="auth-proof-item">
                                    <div class="auth-proof-number">50,000+</div>
                                    <div class="auth-proof-label">Sessions</div>
                                </div>
                                <div class="auth-proof-item">
                                    <div class="auth-proof-number">4.9★</div>
                                    <div class="auth-proof-label">Rating</div>
                                </div>
                            </div>
                        `}
                    </form>
                </div>

                <!-- Footer -->
                <div class="premium-auth-footer">
                    <span class="auth-switch-text">
                        ${isLogin
                            ? (t('auth.noAccount') || "Don't have an account?")
                            : (t('auth.hasAccount') || 'Already have an account?')}
                        ${' '}
                        <button type="button" class="auth-switch-link" onClick=${toggleMode}>
                            ${isLogin
                                ? (t('auth.signUpLink') || 'Sign up')
                                : (t('auth.signInLink') || 'Sign in')}
                        </button>
                    </span>
                </div>
            </div>
        </div>
    `;
}

export default Auth;
