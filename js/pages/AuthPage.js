/**
 * Auth Page Component
 * Login and Registration form
 */

import htm from '../vendor/htm.js';
import { useAuth } from '../context/index.js';
import { t } from '../i18n.js';

const React = window.React;
const { useState, useCallback, useEffect, useRef } = React;
const html = htm.bind(React.createElement);

/**
 * Auth Page Component
 */
export function AuthPage() {
    const { signIn, signUp, signInWithGoogle } = useAuth();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [userType, setUserType] = useState('client');
    const [isLogin, setIsLogin] = useState(() => {
        // Check URL for mode=register parameter
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
        const isRegisterMode = urlParams.get('mode') === 'register' || hashParams.get('mode') === 'register';
        console.log('[AuthPage] URL check:', {
            search: window.location.search,
            hash: window.location.hash,
            urlMode: urlParams.get('mode'),
            hashMode: hashParams.get('mode'),
            isRegisterMode,
            isLogin: !isRegisterMode
        });
        return !isRegisterMode;
    });
    const [message, setMessage] = useState('');

    // Debug: Log state changes
    useEffect(() => {
        console.log('[AuthPage] State:', { isLogin, userType, showReferralField: !isLogin && userType === 'coach' });
    }, [isLogin, userType]);

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

    // Debounced referral code validation
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

    const handleAuth = useCallback(async (e) => {
        e.preventDefault();

        if (!email || !password) {
            setMessage('Please enter email and password');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            if (isLogin) {
                await signIn(email, password);
                setMessage('Login successful! Loading dashboard...');
                setTimeout(() => {
                    window.location.hash = '#dashboard';
                }, 500);
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

                const result = await signUp(email, password, metadata);

                // Check if email confirmation is required
                if (result.user && !result.session) {
                    setMessage('Account created! Please check your email to verify your account.');
                    setLoading(false);
                    return;
                }

                // Redirect based on user type
                if (userType === 'coach') {
                    setMessage('Registration successful! Complete your coach profile...');
                    setTimeout(() => {
                        window.location.hash = '#onboarding';
                    }, 500);
                } else {
                    setMessage('Registration successful! You can browse coaches.');
                    setTimeout(() => {
                        window.location.hash = '#coaches';
                    }, 500);
                }
            }
        } catch (error) {
            console.error('Auth error:', error);
            setMessage(error.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    }, [email, password, userType, isLogin, signIn, signUp, referralCode, referralStatus, referrerId]);

    const handleGoogleSignIn = useCallback(async () => {
        try {
            setLoading(true);
            await signInWithGoogle();
        } catch (error) {
            console.error('Google sign in error:', error);
            setMessage(error.message || 'Google sign in failed');
        } finally {
            setLoading(false);
        }
    }, [signInWithGoogle]);

    return html`
        <div class="auth-container">
            <div class="auth-card">
                <h2 class="section-title text-center">
                    ${isLogin ? t('auth.signin') : t('auth.signup')}
                </h2>

                ${message && html`
                    <div class="alert ${message.includes('Error') || message.includes('error') || message.includes('failed') ? 'alert-error' : 'alert-success'}">
                        ${message}
                    </div>
                `}

                <form onSubmit=${handleAuth} class="auth-form">
                    ${!isLogin && html`
                        <div class="user-type-label">${t('auth.selectType')}</div>
                        <div class="role-group" role="radiogroup">
                            <div
                                class="role-option ${userType === 'client' ? 'selected' : ''}"
                                onClick=${() => setUserType('client')}
                                role="radio"
                                aria-checked=${userType === 'client'}
                                tabIndex="0"
                            >
                                <div class="role-icon">👤</div>
                                <div class="role-text">
                                    <div class="role-name">${t('auth.client')}</div>
                                    <div class="role-desc">${t('auth.clientDesc')}</div>
                                </div>
                            </div>
                            <div
                                class="role-option ${userType === 'coach' ? 'selected' : ''}"
                                onClick=${() => setUserType('coach')}
                                role="radio"
                                aria-checked=${userType === 'coach'}
                                tabIndex="0"
                            >
                                <div class="role-icon">🎓</div>
                                <div class="role-text">
                                    <div class="role-name">${t('auth.coach')}</div>
                                    <div class="role-desc">${t('auth.coachDesc')}</div>
                                </div>
                            </div>
                            <div
                                class="role-option ${userType === 'business' ? 'selected' : ''}"
                                onClick=${() => setUserType('business')}
                                role="radio"
                                aria-checked=${userType === 'business'}
                                tabIndex="0"
                            >
                                <div class="role-icon">🏢</div>
                                <div class="role-text">
                                    <div class="role-name">${t('auth.business')}</div>
                                    <div class="role-desc">${t('auth.businessDesc')}</div>
                                </div>
                            </div>
                        </div>
                    `}

                    <div class="form-group">
                        <label class="form-label">${t('auth.email')}</label>
                        <input
                            type="email"
                            class="form-control"
                            placeholder="you@example.com"
                            value=${email}
                            onInput=${(e) => setEmail(e.target.value)}
                            required
                            disabled=${loading}
                        />
                    </div>

                    <div class="form-group">
                        <label class="form-label">${t('auth.password')}</label>
                        <input
                            type="password"
                            class="form-control"
                            placeholder="••••••••"
                            value=${password}
                            onInput=${(e) => setPassword(e.target.value)}
                            required
                            disabled=${loading}
                            minLength="6"
                        />
                    </div>

                    ${/* DEBUG: Show state values */}
                    <div style="background: #fffbe6; border: 1px solid #ffe58f; padding: 8px; margin: 8px 0; font-size: 12px; border-radius: 4px;">
                        <strong>DEBUG:</strong> isLogin=${String(isLogin)}, userType=${userType}, showField=${String(!isLogin && userType === 'coach')}
                    </div>

                    ${!isLogin && userType === 'coach' && html`
                        <div class="form-group referral-code-group">
                            <label class="form-label">
                                ${t('onboard.referralCode') || 'Referral Code'}
                                <span class="optional-label">${t('onboard.optional') || '(optional)'}</span>
                            </label>
                            <div class="referral-input-wrapper">
                                <input
                                    type="text"
                                    class="form-control referral-input ${referralStatus ? `referral-${referralStatus}` : ''}"
                                    placeholder=${t('onboard.referralPlaceholder') || 'Enter code'}
                                    value=${referralCode}
                                    onInput=${handleReferralCodeChange}
                                    disabled=${loading}
                                    maxLength="50"
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
                        </div>
                    `}

                    <button
                        type="submit"
                        class="btn-primary btn-full"
                        disabled=${loading}
                    >
                        ${loading ? 'Please wait...' : (isLogin ? t('auth.signin') : t('auth.signup'))}
                    </button>

                    <div class="auth-divider">
                        <span>or</span>
                    </div>

                    <button
                        type="button"
                        class="btn-secondary btn-full btn-google"
                        onClick=${handleGoogleSignIn}
                        disabled=${loading}
                    >
                        <svg width="18" height="18" viewBox="0 0 18 18" style="margin-right: 8px;">
                            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                            <path fill="#34A853" d="M9.003 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9.003 18z"/>
                            <path fill="#FBBC05" d="M3.967 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.039l3.01-2.332z"/>
                            <path fill="#EA4335" d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.428 0 9.002 0 5.482 0 2.438 2.017.957 4.961l3.01 2.332c.708-2.127 2.692-3.712 5.036-3.712z"/>
                        </svg>
                        Continue with Google
                    </button>
                </form>

                <div class="auth-footer">
                    <p>
                        ${isLogin ? "Don't have an account? " : "Already have an account? "}
                        <a
                            href="#"
                            onClick=${(e) => { e.preventDefault(); setIsLogin(!isLogin); setMessage(''); }}
                        >
                            ${isLogin ? t('auth.signup') : t('auth.signin')}
                        </a>
                    </p>
                    ${isLogin && html`
                        <p>
                            <a href="#" onClick=${(e) => { e.preventDefault(); /* TODO: forgot password */ }}>
                                Forgot password?
                            </a>
                        </p>
                    `}
                </div>
            </div>
        </div>
    `;
}

export default AuthPage;
