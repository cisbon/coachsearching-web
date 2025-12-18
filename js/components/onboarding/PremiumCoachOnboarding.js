/**
 * Premium Coach Onboarding
 * A stunning, premium first-impression experience for new coaches
 *
 * Features:
 * - Animated welcome screen with social proof
 * - Multi-step wizard with progress tracking
 * - Auto-save to localStorage
 * - Real-time profile preview
 * - Smooth animations and transitions
 */

import htm from '../../vendor/htm.js';
import { t, getCurrentLang } from '../../i18n.js';
import { useLookupOptions } from '../../context/AppContext.js';

const React = window.React;
const { useState, useEffect, useRef, useCallback } = React;
const html = htm.bind(React.createElement);

// ============================================================================
// CONSTANTS
// ============================================================================

const STEPS = [
    { id: 'profile', label: 'Profile', icon: '1' },
    { id: 'expertise', label: 'Expertise', icon: '2' },
    { id: 'services', label: 'Services', icon: '3' },
    { id: 'launch', label: 'Launch', icon: '4' }
];

// Session durations (kept hardcoded as they rarely change)
const SESSION_DURATIONS = [
    { value: 30, label: '30 min' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PremiumCoachOnboarding = ({ session, onComplete }) => {
    const [showWelcome, setShowWelcome] = useState(true);
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({
        full_name: '',
        professional_title: '',
        bio: '',
        avatar_url: '',
        location_city: '',
        location_country: '',
        years_experience: '',
        specialties: [],
        languages: ['en'],
        session_formats: ['video'],
        session_durations: [60],
        hourly_rate: '',
        plan_type: 'free', // 'free' or 'premium'
        referral_code: '',
        referral_code_valid: false,
        referrer_id: null
    });

    // Get lookup options from global context (cached)
    const { lookupOptions, getLocalizedName, getLocalizedDescription } = useLookupOptions();

    // Referral code validation
    const referralDebounceRef = useRef(null);

    const validateReferralCode = useCallback(async (code) => {
        if (!code || code.trim().length < 3) {
            setData(prev => ({
                ...prev,
                referral_code_valid: false,
                referrer_id: null
            }));
            return;
        }

        try {
            const supabase = window.supabaseClient;
            const { data: codeData, error } = await supabase
                .from('cs_referral_codes')
                .select('code, user_id')
                .eq('code', code.trim().toUpperCase())
                .eq('is_active', true)
                .single();

            if (error || !codeData) {
                setData(prev => ({
                    ...prev,
                    referral_code_valid: false,
                    referrer_id: null
                }));
            } else {
                setData(prev => ({
                    ...prev,
                    referral_code_valid: true,
                    referrer_id: codeData.user_id,
                    plan_type: 'premium' // Auto-select premium when valid code entered
                }));
            }
        } catch (err) {
            console.error('Error validating referral code:', err);
            setData(prev => ({
                ...prev,
                referral_code_valid: false,
                referrer_id: null
            }));
        }
    }, []);

    const handleReferralCodeChange = useCallback((code) => {
        setData(prev => ({ ...prev, referral_code: code }));

        if (referralDebounceRef.current) {
            clearTimeout(referralDebounceRef.current);
        }

        referralDebounceRef.current = setTimeout(() => {
            validateReferralCode(code);
        }, 500);
    }, [validateReferralCode]);

    // Load saved progress
    useEffect(() => {
        const savedData = localStorage.getItem(`premium_onboarding_${session?.user?.id}`);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                // Sanitize loaded data to ensure string fields are strings
                const sanitizedData = {};
                if (parsed.data) {
                    const stringFields = ['full_name', 'professional_title', 'bio', 'avatar_url', 'location_city', 'location_country', 'years_experience', 'hourly_rate', 'referral_code', 'plan_type'];
                    const arrayFields = ['specialties', 'languages', 'session_formats', 'session_durations'];

                    stringFields.forEach(field => {
                        if (parsed.data[field] !== undefined) {
                            sanitizedData[field] = typeof parsed.data[field] === 'string' ? parsed.data[field] : String(parsed.data[field] || '');
                        }
                    });
                    arrayFields.forEach(field => {
                        if (Array.isArray(parsed.data[field])) {
                            sanitizedData[field] = parsed.data[field];
                        }
                    });
                    // Boolean fields
                    if (typeof parsed.data.referral_code_valid === 'boolean') {
                        sanitizedData.referral_code_valid = parsed.data.referral_code_valid;
                    }
                }
                setData(prev => ({ ...prev, ...sanitizedData }));
                if (parsed.step > 0) {
                    setCurrentStep(parsed.step);
                    setShowWelcome(false);
                }
            } catch (e) {
                console.error('Failed to load saved onboarding data:', e);
                // Clear corrupted data
                localStorage.removeItem(`premium_onboarding_${session?.user?.id}`);
            }
        }

        // Pre-fill name from session if available
        const fullName = session?.user?.user_metadata?.full_name;
        if (fullName && typeof fullName === 'string') {
            setData(prev => ({ ...prev, full_name: fullName }));
        }
    }, [session]);

    // Auto-save progress
    const saveProgress = useCallback((stepIndex, formData) => {
        if (session?.user?.id) {
            localStorage.setItem(`premium_onboarding_${session.user.id}`, JSON.stringify({
                step: stepIndex,
                data: formData,
                timestamp: Date.now()
            }));
        }
    }, [session]);

    // Update data helper
    const updateData = useCallback((key, value) => {
        setData(prev => {
            const newData = { ...prev, [key]: value };
            saveProgress(currentStep, newData);
            return newData;
        });
    }, [currentStep, saveProgress]);

    // Navigation
    const goToStep = (step) => {
        setCurrentStep(step);
        saveProgress(step, data);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const nextStep = () => {
        if (currentStep < STEPS.length - 1) {
            goToStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            goToStep(currentStep - 1);
        }
    };

    const startOnboarding = () => {
        setShowWelcome(false);
    };

    // Complete onboarding
    const completeOnboarding = async () => {
        setLoading(true);
        try {
            const supabase = window.supabaseClient;
            const userId = session.user.id;

            // Determine premium status
            const isPremium = data.plan_type === 'premium';
            const hasValidReferral = data.referral_code_valid && data.referral_code;

            // Calculate premium expiry (1 year from now if valid referral)
            let premiumExpiresAt = null;
            if (isPremium && hasValidReferral) {
                const oneYearFromNow = new Date();
                oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
                premiumExpiresAt = oneYearFromNow.toISOString();
            }

            // Prepare coach profile data
            const coachData = {
                user_id: userId,
                full_name: data.full_name || session.user.email.split('@')[0],
                title: data.professional_title,
                bio: data.bio,
                avatar_url: data.avatar_url,
                location_city: data.location_city,
                location_country: data.location_country,
                years_experience: parseInt(data.years_experience) || 0,
                specialties: data.specialties,
                languages: data.languages,
                session_formats: data.session_formats,
                hourly_rate: parseFloat(data.hourly_rate) || 0,
                currency: 'EUR',
                is_active: true,
                is_premium: isPremium,
                premium_expires_at: premiumExpiresAt,
                referral_code_used: hasValidReferral ? data.referral_code.trim().toUpperCase() : null,
                onboarding_completed: true,
                onboarding_completed_at: new Date().toISOString()
            };

            // Check if coach profile exists
            const { data: existingCoach } = await supabase
                .from('cs_coaches')
                .select('id')
                .eq('user_id', userId)
                .single();

            if (existingCoach) {
                // Update existing
                const { error } = await supabase
                    .from('cs_coaches')
                    .update(coachData)
                    .eq('user_id', userId);
                if (error) throw error;
            } else {
                // Insert new
                const { error } = await supabase
                    .from('cs_coaches')
                    .insert(coachData);
                if (error) throw error;
            }

            // Handle referral code if valid
            if (data.referral_code_valid && data.referral_code) {
                try {
                    await supabase.from('cs_referral_uses').insert({
                        code: data.referral_code,
                        used_by_user_id: userId,
                        used_at: new Date().toISOString()
                    });
                } catch (e) {
                    console.log('Referral tracking skipped:', e.message);
                }
            }

            // Clear saved progress
            localStorage.removeItem(`premium_onboarding_${userId}`);

            // Callback
            if (onComplete) {
                onComplete({ completed: true, data: coachData });
            }

            // Navigate to dashboard
            setTimeout(() => {
                window.navigateTo('/dashboard');
            }, 2000);

        } catch (error) {
            console.error('Onboarding completion error:', error);
            alert('Failed to save your profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Skip onboarding
    const skipOnboarding = () => {
        if (confirm('Are you sure? You can complete your profile later from the dashboard.')) {
            localStorage.removeItem(`premium_onboarding_${session?.user?.id}`);
            window.navigateTo('/dashboard');
        }
    };

    // Render welcome screen
    if (showWelcome) {
        return html`<${WelcomeScreen} onStart=${startOnboarding} onSkip=${skipOnboarding} />`;
    }

    // Render step content
    const renderStep = () => {
        switch (currentStep) {
            case 0:
                return html`<${StepProfile} data=${data} updateData=${updateData} session=${session} />`;
            case 1:
                return html`<${StepExpertise}
                    data=${data}
                    updateData=${updateData}
                    specialties=${lookupOptions.specialties}
                    languages=${lookupOptions.languages}
                    getLocalizedName=${getLocalizedName}
                />`;
            case 2:
                return html`<${StepServices}
                    data=${data}
                    updateData=${updateData}
                    sessionFormats=${lookupOptions.sessionFormats}
                    getLocalizedName=${getLocalizedName}
                    getLocalizedDescription=${getLocalizedDescription}
                />`;
            case 3:
                return html`<${StepLaunch}
                    data=${data}
                    updateData=${updateData}
                    loading=${loading}
                    onComplete=${completeOnboarding}
                    onReferralChange=${handleReferralCodeChange}
                    languages=${lookupOptions.languages}
                    getLocalizedName=${getLocalizedName}
                />`;
            default:
                return null;
        }
    };

    return html`
        <div class="premium-onboarding">
            <div class="onboarding-wrapper">
                <header class="onboarding-header">
                    <div class="progress-container">
                        ${STEPS.map((step, index) => html`
                            <div
                                key=${step.id}
                                class=${`progress-step-indicator ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
                            >
                                <div class="step-dot">
                                    ${index < currentStep ? '✓' : step.icon}
                                </div>
                                <span class="step-dot-label">${step.label}</span>
                            </div>
                        `)}
                    </div>
                </header>

                <div class="onboarding-card">
                    <div class="card-content step-transition" key=${currentStep}>
                        ${renderStep()}
                    </div>

                    ${currentStep < 3 && html`
                        <footer class="card-footer">
                            <button
                                class="btn-secondary"
                                onClick=${prevStep}
                                disabled=${currentStep === 0}
                            >
                                ← Back
                            </button>

                            <button class="btn-text" onClick=${skipOnboarding}>
                                Skip for now
                            </button>

                            <button class="btn-primary" onClick=${nextStep}>
                                Continue →
                            </button>
                        </footer>
                    `}
                </div>
            </div>
        </div>
    `;
};

// ============================================================================
// WELCOME SCREEN
// ============================================================================

const WelcomeScreen = ({ onStart, onSkip }) => {
    return html`
        <div class="premium-onboarding">
            <div class="welcome-fullscreen">
                <div class="welcome-content">
                    <div class="welcome-badge">
                        ✨ ${t('onboard.premium.welcomeBadge')}
                    </div>

                    <div class="welcome-icon-container">
                        <span class="welcome-icon">🎓</span>
                    </div>

                    <h1 class="welcome-title">
                        ${t('onboard.premium.welcomeTitle')} <span>CoachSearching</span>
                    </h1>

                    <p class="welcome-subtitle">
                        ${t('onboard.premium.welcomeSubtitle')}
                    </p>

                    <div class="welcome-features">
                        <div class="welcome-feature">
                            <div class="feature-icon">⚡</div>
                            <div class="feature-title" style=${{ color: 'white' }}>${t('onboard.premium.feature1Title')}</div>
                            <div class="feature-desc">${t('onboard.premium.feature1Desc')}</div>
                        </div>
                        <div class="welcome-feature">
                            <div class="feature-icon">💾</div>
                            <div class="feature-title" style=${{ color: 'white' }}>${t('onboard.premium.feature2Title')}</div>
                            <div class="feature-desc">${t('onboard.premium.feature2Desc')}</div>
                        </div>
                        <div class="welcome-feature">
                            <div class="feature-icon">🚀</div>
                            <div class="feature-title" style=${{ color: 'white' }}>${t('onboard.premium.feature3Title')}</div>
                            <div class="feature-desc">${t('onboard.premium.feature3Desc')}</div>
                        </div>
                    </div>

                    <div class="welcome-cta">
                        <button class="btn-start" onClick=${onStart}>
                            ${t('onboard.premium.createProfile')}
                            <span class="arrow">→</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
};

// ============================================================================
// STEP 1: PROFILE
// ============================================================================

const StepProfile = ({ data, updateData, session }) => {
    console.log('StepProfile: MINIMAL VERSION - Testing basic render');

    // Minimal test: just static divs, no interpolation
    return html`
        <div class="slide-up">
            <div class="step-header">
                <div class="step-number">Step 1 of 4</div>
                <h2 class="step-title">Profile Setup</h2>
                <p class="step-description">Testing basic rendering...</p>
            </div>
            <div class="form-section">
                <p>If you see this message, basic htm rendering works!</p>
            </div>
        </div>
    `;
};

// ============================================================================
// STEP 2: EXPERTISE
// ============================================================================

const StepExpertise = ({ data, updateData, specialties = [], languages = [], getLocalizedName }) => {
    console.log('StepExpertise: MINIMAL VERSION - Testing basic render');
    console.log('StepExpertise: specialties count:', specialties.length);
    console.log('StepExpertise: languages count:', languages.length);

    return html`
        <div class="slide-up">
            <div class="step-header">
                <div class="step-number">Step 2 of 4</div>
                <h2 class="step-title">Your Expertise</h2>
                <p class="step-description">Testing StepExpertise...</p>
            </div>
            <div class="form-section">
                <p>If you see this, StepExpertise basic rendering works!</p>
                <p>Specialties available: ${String(specialties.length)}</p>
                <p>Languages available: ${String(languages.length)}</p>
            </div>
        </div>
    `;
};

// ============================================================================
// STEP 3: SERVICES & PRICING
// ============================================================================

const StepServices = ({ data, updateData, sessionFormats = [], getLocalizedName, getLocalizedDescription }) => {
    console.log('StepServices: MINIMAL VERSION - Testing basic render');

    return html`
        <div class="slide-up">
            <div class="step-header">
                <div class="step-number">Step 3 of 4</div>
                <h2 class="step-title">Services and Pricing</h2>
                <p class="step-description">Testing StepServices...</p>
            </div>
            <div class="form-section">
                <p>If you see this, StepServices basic rendering works!</p>
            </div>
        </div>
    `;
};

// ============================================================================
// STEP 4: LAUNCH
// ============================================================================

const StepLaunch = ({ data, updateData, loading, onComplete, onReferralChange, languages = [], getLocalizedName }) => {
    console.log('StepLaunch: MINIMAL VERSION - Testing basic render');

    return html`
        <div class="slide-up">
            <div class="completion-screen">
                <div class="step-header">
                    <div class="step-number">Step 4 of 4</div>
                    <h2 class="step-title">Launch Your Profile</h2>
                    <p class="step-description">Testing StepLaunch...</p>
                </div>
                <div class="form-section">
                    <p>If you see this, StepLaunch basic rendering works!</p>
                    <button
                        class="btn-primary btn-success"
                        onClick=${onComplete}
                        disabled=${loading}
                    >
                        ${loading ? 'Launching...' : 'Launch My Profile'}
                    </button>
                </div>
            </div>
        </div>
    `;
};

export default PremiumCoachOnboarding;
