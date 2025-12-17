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
                setReferralMessage('Invalid referral code');
                setReferrerId(null);
            } else {
                setReferralStatus('valid');
                setReferralMessage('Code applied!');
                setReferrerId(codeData.user_id);
            }
        } catch (err) {
            console.error('Error validating referral code:', err);
            setReferralStatus('invalid');
            setReferralMessage('Could not validate code');
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

    // Get role display info
    const getRoleName = (roleId) => {
        const translations = {
            client: t('auth.client') || 'Client',
            coach: t('auth.coach') || 'Coach',
            business: t('auth.business') || 'Business'
        };
        return translations[roleId] || roleId;
    };

    const getRoleDesc = (roleId) => {
        const translations = {
            client: t('auth.clientDesc') || 'Find a coach',
            coach: t('auth.coachDesc') || 'Offer coaching',
            business: t('auth.businessDesc') || 'Team coaching'
        };
        return translations[roleId] || '';
    };

    return html`
        <div class="premium-auth">
            <div class="premium-auth-card">
                <!-- Body -->
                <div class="premium-auth-body">
                    <!-- Mode Tabs -->
                    <div class="auth-mode-tabs">
                        <button
                            type="button"
                            class=${'auth-mode-tab ' + (isLogin ? 'active' : '')}
                            onClick=${() => { setIsLogin(true); setMessage({ type: '', text: '' }); }}
                        >
                            ${t('auth.signin') || 'Sign In'}
                        </button>
                        <button
                            type="button"
                            class=${'auth-mode-tab ' + (!isLogin ? 'active' : '')}
                            onClick=${() => { setIsLogin(false); setMessage({ type: '', text: '' }); }}
                        >
                            ${t('auth.signup') || 'Sign Up'}
                        </button>
                    </div>

                    <!-- Message -->
                    ${message.text && html`
                        <div class=${'auth-message ' + message.type}>
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
                                    ${t('auth.selectType') || "I'm a..."}
                                </label>
                                <div class="auth-role-grid">
                                    ${ROLES.map(role => html`
                                        <div
                                            key=${role.id}
                                            class=${'auth-role-card ' + (userType === role.id ? 'selected' : '')}
                                            onClick=${() => setUserType(role.id)}
                                            role="radio"
                                            aria-checked=${String(userType === role.id)}
                                            tabIndex="0"
                                            onKeyDown=${(e) => e.key === 'Enter' && setUserType(role.id)}
                                        >
                                            <div class="auth-role-icon">${role.icon}</div>
                                            <div class="auth-role-name">${getRoleName(role.id)}</div>
                                            <div class="auth-role-desc">${getRoleDesc(role.id)}</div>
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
                                    placeholder="you@example.com"
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
                                    placeholder=${isLogin ? '••••••••' : 'Min. 6 characters'}
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
                                    <span class="auth-referral-label">Referral Code</span>
                                    <span class="auth-referral-optional">(optional)</span>
                                </div>
                                <div class="auth-referral-input-wrapper">
                                    <div class="auth-input-wrapper">
                                        <input
                                            type="text"
                                            class=${'premium-auth-input' + (referralStatus ? ' referral-' + referralStatus : '')}
                                            placeholder="Enter code"
                                            value=${referralCode}
                                            onInput=${handleReferralCodeChange}
                                            disabled=${loading ? true : false}
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
                                            <strong>Free Premium Year!</strong>
                                            <span>Enjoy all Premium features free for your first year.</span>
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
                            disabled=${loading ? true : false}
                        >
                            ${loading && html`<span class="btn-spinner"></span>`}
                            ${loading
                                ? 'Processing...'
                                : (isLogin ? (t('auth.signin') || 'Sign In') : (t('auth.signup') || 'Create Account'))}
                        </button>
                    </form>
                </div>

                <!-- Footer -->
                <div class="premium-auth-footer">
                    <span class="auth-switch-text">
                        ${isLogin ? "Don't have an account?" : 'Already have an account?'}
                        ${' '}
                        <button type="button" class="auth-switch-link" onClick=${toggleMode}>
                            ${isLogin ? 'Sign up' : 'Sign in'}
                        </button>
                    </span>
                </div>
            </div>
        </div>
    `;
}

export default Auth;
