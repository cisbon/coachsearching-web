/**
 * Auth Component
 * Login and registration form with user type selection
 */

import htm from '../../vendor/htm.js';
import { t } from '../../i18n.js';

const React = window.React;
const { useState, useEffect, useRef, useCallback } = React;
const html = htm.bind(React.createElement);

/**
 * Auth Component
 * Handles login and registration with referral code support
 */
export function Auth() {
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
                console.log('SIGNUP DIAGNOSTIC:');
                console.log('  User created:', !!data.user);
                console.log('  Session created:', !!data.session);
                console.log('  Email confirmed:', !!data.user?.email_confirmed_at);

                if (data.user && !data.session) {
                    console.error('CRITICAL: User created but NO SESSION!');
                    console.error('This means "Enable email confirmations" is ENABLED in Supabase.');
                    console.error('FIX: Supabase Dashboard → Authentication → Settings');
                    console.error('ACTION: UNCHECK "Enable email confirmations" and Save');

                    setMessage('Account created! However, email confirmation is required before login. Please check your inbox, then try logging in again. (Or ask admin to disable email confirmation requirement in Supabase settings)');
                    setLoading(false);
                    return;
                }

                console.log('Session created successfully! User is now logged in.');
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
}

export default Auth;
