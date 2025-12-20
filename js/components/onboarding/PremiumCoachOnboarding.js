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

// Flag CDN for SVG flag images
const FLAG_CDN = 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3';

// Language code to flag country code mapping
const LANGUAGE_TO_FLAG = {
    'en': 'gb', 'de': 'de', 'es': 'es', 'fr': 'fr', 'it': 'it',
    'nl': 'nl', 'pt': 'pt', 'ru': 'ru', 'zh': 'cn', 'ja': 'jp',
    'ko': 'kr', 'ar': 'sa', 'hi': 'in', 'pl': 'pl', 'sv': 'se',
    'no': 'no', 'da': 'dk', 'fi': 'fi', 'el': 'gr', 'tr': 'tr',
    'cs': 'cz', 'ro': 'ro', 'hu': 'hu', 'uk': 'ua'
};

// Session durations (kept hardcoded as they rarely change)
const SESSION_DURATIONS = [
    { value: 30, label: '30 min' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' }
];

// Countries list for dropdown
const COUNTRIES = [
    { code: 'AT', name: 'Austria' },
    { code: 'AU', name: 'Australia' },
    { code: 'BE', name: 'Belgium' },
    { code: 'BR', name: 'Brazil' },
    { code: 'CA', name: 'Canada' },
    { code: 'CH', name: 'Switzerland' },
    { code: 'DE', name: 'Germany' },
    { code: 'DK', name: 'Denmark' },
    { code: 'ES', name: 'Spain' },
    { code: 'FI', name: 'Finland' },
    { code: 'FR', name: 'France' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'IE', name: 'Ireland' },
    { code: 'IN', name: 'India' },
    { code: 'IT', name: 'Italy' },
    { code: 'JP', name: 'Japan' },
    { code: 'LU', name: 'Luxembourg' },
    { code: 'MX', name: 'Mexico' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'NO', name: 'Norway' },
    { code: 'NZ', name: 'New Zealand' },
    { code: 'PL', name: 'Poland' },
    { code: 'PT', name: 'Portugal' },
    { code: 'SE', name: 'Sweden' },
    { code: 'SG', name: 'Singapore' },
    { code: 'US', name: 'United States' },
    { code: 'ZA', name: 'South Africa' },
    { code: 'OTHER', name: 'Other' }
];

// Default data structure
const DEFAULT_DATA = {
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
    plan_type: 'free',
    referral_code: '',
    referral_code_valid: false,
    referrer_id: null
};

// Helper to load saved progress from localStorage
const loadSavedProgress = (userId) => {
    if (!userId) return null;
    try {
        const saved = localStorage.getItem(`premium_onboarding_${userId}`);
        if (!saved) return null;

        const parsed = JSON.parse(saved);
        if (!parsed.data) return null;

        const sanitizedData = { ...DEFAULT_DATA };
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
        if (typeof parsed.data.referral_code_valid === 'boolean') {
            sanitizedData.referral_code_valid = parsed.data.referral_code_valid;
        }

        return {
            data: sanitizedData,
            step: parsed.step || 0,
            showWelcome: parsed.showWelcome !== undefined ? parsed.showWelcome : (parsed.step <= 0)
        };
    } catch (e) {
        console.error('Failed to load saved onboarding data:', e);
        return null;
    }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PremiumCoachOnboarding = ({ session, onComplete }) => {
    // Load saved state immediately on initialization
    const savedProgress = loadSavedProgress(session?.user?.id);

    const [showWelcome, setShowWelcome] = useState(savedProgress ? savedProgress.showWelcome : true);
    const [currentStep, setCurrentStep] = useState(savedProgress ? savedProgress.step : 0);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(savedProgress ? savedProgress.data : DEFAULT_DATA);

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

    // Pre-fill name from session if not already set
    useEffect(() => {
        const fullName = session?.user?.user_metadata?.full_name;
        if (fullName && typeof fullName === 'string' && !data.full_name) {
            setData(prev => prev.full_name ? prev : { ...prev, full_name: fullName });
        }
    }, [session?.user?.user_metadata?.full_name]);

    // Auto-save progress
    const saveProgress = useCallback((stepIndex, formData, isWelcomeVisible = false) => {
        if (session?.user?.id) {
            localStorage.setItem(`premium_onboarding_${session.user.id}`, JSON.stringify({
                step: stepIndex,
                data: formData,
                showWelcome: isWelcomeVisible,
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
        saveProgress(step, data, false);
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
        saveProgress(0, data, false);
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
                    onBack=${prevStep}
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
                                ← ${t('onboard.premium.back')}
                            </button>

                            <button class="btn-primary" onClick=${nextStep}>
                                ${t('onboard.premium.continue')} →
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
                        ${t('onboard.premium.welcomeTitle')} <span class="brand-name">coach<span class="brand-highlight">searching</span>.com</span>
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
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    const handleFileSelect = async (file) => {
        if (!file || !file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be less than 5MB');
            return;
        }

        setUploading(true);
        try {
            const reader = new FileReader();
            reader.onload = (e) => updateData('avatar_url', e.target.result);
            reader.readAsDataURL(file);

            const supabase = window.supabaseClient;
            if (supabase) {
                const fileName = `coach_${session.user.id}_${Date.now()}`;
                const { data: uploadData, error } = await supabase.storage
                    .from('avatars')
                    .upload(fileName, file, { upsert: true });

                if (!error && uploadData) {
                    const { data: publicData } = supabase.storage
                        .from('avatars')
                        .getPublicUrl(fileName);
                    if (publicData?.publicUrl) {
                        updateData('avatar_url', publicData.publicUrl);
                    }
                }
            }
        } catch (e) {
            console.log('Upload fallback to base64');
        } finally {
            setUploading(false);
        }
    };

    // Pre-compute values to avoid interpolation issues
    const bioLength = String(data.bio || '').length;
    const avatarClass = 'avatar-upload-zone' + (dragOver ? ' dragging' : '') + (data.avatar_url ? ' has-image' : '');
    const charCounterClass = 'char-counter' + (bioLength > 450 ? ' warning' : '') + (bioLength > 480 ? ' danger' : '');

    return html`
        <div class="slide-up">
            <div class="step-header">
                <h2 class="step-title">${t('onboard.premium.step1Title')}</h2>
                <p class="step-description">
                    ${t('onboard.premium.step1Desc')}
                </p>
            </div>

            <div class="avatar-upload-section">
                <div
                    class=${avatarClass}
                    onClick=${() => fileInputRef.current?.click()}
                    onDrop=${(e) => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files[0]); }}
                    onDragOver=${(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave=${() => setDragOver(false)}
                >
                    ${data.avatar_url ? html`
                        <img src=${data.avatar_url} alt="Profile" class="avatar-preview" />
                        <div class="avatar-overlay">
                            <span class="avatar-overlay-text">${t('onboard.premium.changePhoto')}</span>
                        </div>
                    ` : html`
                        <div class="avatar-placeholder">
                            <div class="avatar-placeholder-icon">📷</div>
                            <div class="avatar-placeholder-text">${t('onboard.premium.uploadPhoto')}</div>
                        </div>
                    `}
                    ${uploading ? html`
                        <div class="avatar-overlay" style=${{ opacity: 1 }}>
                            <span class="avatar-overlay-text">...</span>
                        </div>
                    ` : null}
                </div>
                <input
                    ref=${fileInputRef}
                    type="file"
                    accept="image/*"
                    style=${{ display: 'none' }}
                    onChange=${(e) => handleFileSelect(e.target.files[0])}
                />

                <div class="avatar-tips">
                    <div class="avatar-tips-title">${t('onboard.premium.photoTips')}</div>
                    <ul class="avatar-tips-list">
                        <li>${t('onboard.premium.photoTip1')}</li>
                        <li>${t('onboard.premium.photoTip2')}</li>
                        <li>${t('onboard.premium.photoTip3')}</li>
                        <li>${t('onboard.premium.photoTip4')}</li>
                    </ul>
                </div>
            </div>

            <div class="form-section">
                <div class="form-group">
                    <label class="form-label">
                        ${t('onboard.premium.fullName')} <span class="required">*</span>
                    </label>
                    <input
                        type="text"
                        class="premium-input"
                        placeholder="e.g., Sarah Johnson"
                        value=${String(data.full_name || '')}
                        onInput=${(e) => updateData('full_name', e.target.value)}
                    />
                </div>

                <div class="form-group">
                    <label class="form-label">
                        ${t('onboard.premium.professionalTitle')} <span class="required">*</span>
                    </label>
                    <input
                        type="text"
                        class="premium-input"
                        placeholder="e.g., Certified Life Coach"
                        value=${String(data.professional_title || '')}
                        onInput=${(e) => updateData('professional_title', e.target.value)}
                    />
                </div>
            </div>

            <div class="form-section">
                <div class="form-group">
                    <label class="form-label">${t('onboard.premium.aboutYou')}</label>
                    <div class="form-hint">
                        ${t('onboard.premium.aboutYouHint')}
                    </div>
                    <textarea
                        class="premium-input premium-textarea"
                        value=${String(data.bio || '')}
                        onInput=${(e) => updateData('bio', e.target.value)}
                        maxLength="500"
                    ></textarea>
                    <div class=${charCounterClass}>
                        ${String(bioLength)} / 500
                    </div>
                </div>
            </div>

            <div class="form-section">
                <div style=${{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div class="form-group">
                        <label class="form-label">${t('onboard.premium.city')}</label>
                        <input
                            type="text"
                            class="premium-input"
                            placeholder="e.g., Berlin"
                            value=${String(data.location_city || '')}
                            onInput=${(e) => updateData('location_city', e.target.value)}
                        />
                    </div>
                    <div class="form-group">
                        <label class="form-label">${t('onboard.premium.country')}</label>
                        <select
                            class="premium-input"
                            value=${String(data.location_country || '')}
                            onChange=${(e) => updateData('location_country', e.target.value)}
                        >
                            <option value="">...</option>
                            ${COUNTRIES.map(country => html`
                                <option key=${country.code} value=${country.name}>${country.name}</option>
                            `)}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    `;
};

// ============================================================================
// STEP 2: EXPERTISE
// ============================================================================

const StepExpertise = ({ data, updateData, specialties = [], languages = [], getLocalizedName }) => {
    const toggleSpecialty = (code) => {
        const current = data.specialties || [];
        const newSpecialties = current.includes(code)
            ? current.filter(s => s !== code)
            : current.length < 10 ? [...current, code] : current;
        updateData('specialties', newSpecialties);
    };

    const toggleLanguage = (code) => {
        const langs = data.languages || [];
        const newLangs = langs.includes(code)
            ? langs.filter(l => l !== code)
            : [...langs, code];
        updateData('languages', newLangs);
    };

    const getSpecialtyDisplayName = (code) => {
        const specialty = specialties.find(s => s.code === code);
        return specialty ? String(getLocalizedName(specialty)) : String(code);
    };

    const selectedCount = (data.specialties || []).length;

    return html`
        <div class="slide-up">
            <div class="step-header">
                <h2 class="step-title">${t('onboard.premium.step2Title')}</h2>
                <p class="step-description">
                    ${t('onboard.premium.step2Desc')}
                </p>
            </div>

            <div class="form-section">
                <div class="form-group">
                    <label class="form-label">${t('onboard.premium.yearsExperience')}</label>
                    <div style=${{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', maxWidth: '280px' }}>
                        <button
                            type="button"
                            class="btn-stepper"
                            style=${{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                border: '2px solid var(--petrol)',
                                background: 'white',
                                color: 'var(--petrol)',
                                fontSize: '1.5rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease'
                            }}
                            onClick=${() => {
                                const current = parseInt(data.years_experience) || 0;
                                if (current > 0) updateData('years_experience', String(current - 1));
                            }}
                        >−</button>
                        <input
                            type="number"
                            class="premium-input"
                            placeholder="0"
                            min="0"
                            style=${{
                                width: '80px',
                                textAlign: 'center',
                                fontSize: '1.25rem',
                                fontWeight: '600',
                                padding: '0.75rem'
                            }}
                            value=${String(data.years_experience || '')}
                            onInput=${(e) => updateData('years_experience', e.target.value)}
                        />
                        <button
                            type="button"
                            class="btn-stepper"
                            style=${{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                border: '2px solid var(--petrol)',
                                background: 'white',
                                color: 'var(--petrol)',
                                fontSize: '1.5rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease'
                            }}
                            onClick=${() => {
                                const current = parseInt(data.years_experience) || 0;
                                updateData('years_experience', String(current + 1));
                            }}
                        >+</button>
                    </div>
                </div>
            </div>

            <div class="form-section">
                <div class="form-section-title">🎯 ${t('onboard.premium.specialties')}</div>
                <div class="form-hint">
                    ${t('onboard.premium.specialtiesHint')}
                </div>

                ${selectedCount > 0 ? html`
                    <div class="selected-specialties" style=${{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        ${(data.specialties || []).map((code, index) => html`
                            <span key=${index} class="specialty-pill">
                                ${getSpecialtyDisplayName(code)}
                                <button
                                    class="specialty-pill-remove"
                                    onClick=${() => toggleSpecialty(code)}
                                >×</button>
                            </span>
                        `)}
                    </div>
                ` : null}

                <div class="specialty-grid" style=${{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                    ${specialties.map(specialty => {
                        const isSelected = (data.specialties || []).includes(specialty.code);
                        const isDisabled = !isSelected && selectedCount >= 10;
                        const btnClass = 'specialty-option' + (isSelected ? ' selected' : '');
                        return html`
                            <button
                                key=${specialty.code}
                                type="button"
                                class=${btnClass}
                                onClick=${() => toggleSpecialty(specialty.code)}
                                disabled=${isDisabled}
                                style=${{
                                    padding: '0.75rem 1rem',
                                    borderRadius: '8px',
                                    border: isSelected ? '2px solid var(--petrol)' : '1px solid #e0e0e0',
                                    background: isSelected ? 'var(--petrol-50)' : '#fff',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.9rem',
                                    transition: 'all 0.2s ease',
                                    opacity: isDisabled ? 0.5 : 1
                                }}
                            >
                                <span>${String(specialty.icon || '🎯')}</span>
                                <span>${String(getLocalizedName(specialty))}</span>
                            </button>
                        `;
                    })}
                </div>

                ${selectedCount > 0 ? html`
                    <div style=${{ marginTop: '0.75rem', fontSize: '0.875rem', color: '#666' }}>
                        ${String(selectedCount)}/10 selected
                    </div>
                ` : null}
            </div>

            <div class="form-section">
                <div class="form-section-title">🌍 ${t('onboard.premium.languages')}</div>
                <div class="form-hint">
                    ${t('onboard.premium.languagesHint')}
                </div>

                <div class="language-grid">
                    ${languages.map(lang => {
                        const isSelected = (data.languages || []).includes(lang.code);
                        const langClass = 'language-option' + (isSelected ? ' selected' : '');
                        const flagCode = LANGUAGE_TO_FLAG[lang.code];
                        return html`
                            <button
                                key=${lang.code}
                                type="button"
                                class=${langClass}
                                onClick=${() => toggleLanguage(lang.code)}
                            >
                                ${flagCode ? html`
                                    <img
                                        src="${FLAG_CDN}/${flagCode}.svg"
                                        alt=${getLocalizedName(lang)}
                                        class="language-flag-img"
                                        style=${{ width: '24px', height: '18px', borderRadius: '2px', objectFit: 'cover' }}
                                        loading="lazy"
                                    />
                                ` : html`<span class="language-flag" style=${{ fontSize: '14px', lineHeight: '18px' }}>🌐</span>`}
                                <span class="language-name">${String(getLocalizedName(lang))}</span>
                            </button>
                        `;
                    })}
                </div>
            </div>
        </div>
    `;
};

// ============================================================================
// STEP 3: SERVICES & PRICING
// ============================================================================

const StepServices = ({ data, updateData, sessionFormats = [], getLocalizedName, getLocalizedDescription }) => {
    const toggleFormat = (formatCode) => {
        const formats = data.session_formats || [];
        const newFormats = formats.includes(formatCode)
            ? formats.filter(f => f !== formatCode)
            : [...formats, formatCode];
        updateData('session_formats', newFormats);
    };

    const toggleDuration = (duration) => {
        const durations = data.session_durations || [];
        const newDurations = durations.includes(duration)
            ? durations.filter(d => d !== duration)
            : [...durations, duration];
        updateData('session_durations', newDurations);
    };

    const hourlyRate = parseFloat(data.hourly_rate) || 0;
    const platformFee = (hourlyRate * 0.15).toFixed(2);
    const netEarnings = (hourlyRate * 0.85).toFixed(2);

    return html`
        <div class="slide-up">
            <div class="step-header">
                <h2 class="step-title">${t('onboard.premium.step3Title')}</h2>
                <p class="step-description">
                    ${t('onboard.premium.step3Desc')}
                </p>
            </div>

            <div class="form-section">
                <div class="form-section-title">💬 ${t('onboard.premium.sessionFormats')}</div>
                <div class="form-hint">
                    ${t('onboard.premium.sessionFormatsHint')}
                </div>

                <div class="format-grid">
                    ${sessionFormats.map(format => {
                        const isSelected = (data.session_formats || []).includes(format.code);
                        const formatClass = 'format-card' + (isSelected ? ' selected' : '');
                        return html`
                            <div
                                key=${format.code}
                                class=${formatClass}
                                onClick=${() => toggleFormat(format.code)}
                            >
                                <div class="format-icon">${String(format.icon || '💬')}</div>
                                <div class="format-title">${String(getLocalizedName(format))}</div>
                                <div class="format-desc">${String(getLocalizedDescription(format))}</div>
                            </div>
                        `;
                    })}
                </div>
            </div>

            <div class="form-section">
                <div class="form-section-title">⏱️ ${t('onboard.premium.sessionDurations')}</div>
                <div class="form-hint">
                    ${t('onboard.premium.sessionDurationsHint')}
                </div>

                <div class="language-grid">
                    ${SESSION_DURATIONS.map(dur => {
                        const isSelected = (data.session_durations || []).includes(dur.value);
                        const durClass = 'language-option' + (isSelected ? ' selected' : '');
                        return html`
                            <button
                                key=${dur.value}
                                type="button"
                                class=${durClass}
                                onClick=${() => toggleDuration(dur.value)}
                            >
                                <span class="language-flag">⏰</span>
                                <span class="language-name">${String(dur.label)}</span>
                            </button>
                        `;
                    })}
                </div>
            </div>

            <div class="form-section">
                <div class="form-section-title">💰 ${t('onboard.premium.hourlyRate')}</div>
                <div class="form-hint">
                    ${t('onboard.premium.hourlyRateHint')}
                </div>

                <div class="pricing-input-group">
                    <span class="currency-prefix">€</span>
                    <input
                        type="number"
                        class="premium-input pricing-input"
                        placeholder="75"
                        min="0"
                        value=${String(data.hourly_rate || '')}
                        onInput=${(e) => updateData('hourly_rate', e.target.value)}
                    />
                    <span class="pricing-suffix">${t('onboard.premium.perHour')}</span>
                </div>

                ${hourlyRate > 0 ? html`
                    <div class="pricing-breakdown">
                        <div class="pricing-breakdown-title">${t('onboard.premium.earningsBreakdown')}</div>
                        <div class="pricing-row">
                            <span>${t('onboard.premium.clientPays')}</span>
                            <span>€${String(hourlyRate.toFixed(2))}</span>
                        </div>
                        <div class="pricing-row">
                            <span>${t('onboard.premium.platformFee')}</span>
                            <span>-€${String(platformFee)}</span>
                        </div>
                        <div class="pricing-row total">
                            <span>${t('onboard.premium.youReceive')}</span>
                            <span>€${String(netEarnings)}</span>
                        </div>
                    </div>
                ` : null}
            </div>
        </div>
    `;
};

// ============================================================================
// STEP 4: LAUNCH
// ============================================================================

const StepLaunch = ({ data, updateData, loading, onComplete, onBack, onReferralChange, languages = [], getLocalizedName }) => {
    const FREE_FEATURES = [
        'Basic profile listing',
        'Up to 5 client connections/month',
        'Standard search visibility',
        'Email support'
    ];

    const PREMIUM_FEATURES = [
        'Featured profile listing',
        'Unlimited client connections',
        'Priority search visibility',
        'Verified badge',
        'Analytics dashboard',
        'Priority support'
    ];

    const isFreeSelected = data.plan_type === 'free';
    const isPremiumSelected = data.plan_type === 'premium';
    const freeCardClass = 'plan-card' + (isFreeSelected ? ' selected' : '');
    const premiumCardClass = 'plan-card' + (isPremiumSelected ? ' selected' : '');

    const referralInputStyle = {
        flex: 1,
        textTransform: 'uppercase',
        borderColor: data.referral_code_valid ? '#10b981' : (data.referral_code && !data.referral_code_valid ? '#ef4444' : '#e0e0e0')
    };

    const launchButtonText = loading
        ? '...'
        : (isPremiumSelected && !data.referral_code_valid ? '🚀 ' + t('onboard.premium.launchPremium') : '🚀 ' + t('onboard.premium.launchProfile'));

    return html`
        <div class="slide-up">
            <div class="completion-screen">
                <div class="step-header" style=${{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h2 class="step-title">${t('onboard.premium.step4Title')}</h2>
                    <p class="step-description">
                        ${t('onboard.premium.step4Desc')}
                    </p>
                </div>

                <div class="plan-selection" style=${{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div
                        class=${freeCardClass}
                        onClick=${() => updateData('plan_type', 'free')}
                        style=${{
                            padding: '1.5rem',
                            borderRadius: '12px',
                            border: isFreeSelected ? '2px solid var(--petrol)' : '2px solid #e0e0e0',
                            cursor: 'pointer',
                            background: isFreeSelected ? 'var(--petrol-50)' : '#fff',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div style=${{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <span style=${{ fontSize: '1.5rem' }}>🆓</span>
                            <h3 style=${{ margin: 0, fontSize: '1.25rem' }}>${t('onboard.premium.freePlan')}</h3>
                        </div>
                        <div style=${{ fontSize: '2rem', fontWeight: 700, color: 'var(--petrol)', marginBottom: '1rem' }}>
                            €0<span style=${{ fontSize: '1rem', fontWeight: 400 }}>/month</span>
                        </div>
                        <ul style=${{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem' }}>
                            ${FREE_FEATURES.map(feature => html`
                                <li key=${feature} style=${{ padding: '0.25rem 0', color: '#666' }}>
                                    ✓ ${String(feature)}
                                </li>
                            `)}
                        </ul>
                    </div>

                    <div
                        class=${premiumCardClass}
                        onClick=${() => updateData('plan_type', 'premium')}
                        style=${{
                            padding: '1.5rem',
                            borderRadius: '12px',
                            border: isPremiumSelected ? '2px solid var(--petrol)' : '2px solid #e0e0e0',
                            cursor: 'pointer',
                            background: isPremiumSelected ? 'var(--petrol-50)' : '#fff',
                            transition: 'all 0.2s ease',
                            position: 'relative'
                        }}
                    >
                        <div style=${{ position: 'absolute', top: '-10px', right: '10px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>
                            ${t('onboard.premium.recommended')}
                        </div>
                        <div style=${{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <span style=${{ fontSize: '1.5rem' }}>⭐</span>
                            <h3 style=${{ margin: 0, fontSize: '1.25rem' }}>${t('onboard.premium.premiumPlan')}</h3>
                        </div>
                        <div style=${{ fontSize: '2rem', fontWeight: 700, color: 'var(--petrol)', marginBottom: '1rem' }}>
                            ${data.referral_code_valid ? html`
                                <span style=${{ textDecoration: 'line-through', color: '#999', fontSize: '1.5rem' }}>€29</span>
                                <span style=${{ color: '#10b981' }}> €0</span>
                                <span style=${{ fontSize: '1rem', fontWeight: 400 }}>/year</span>
                            ` : html`
                                €29<span style=${{ fontSize: '1rem', fontWeight: 400 }}>/month</span>
                            `}
                        </div>
                        <ul style=${{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem' }}>
                            ${PREMIUM_FEATURES.map(feature => html`
                                <li key=${feature} style=${{ padding: '0.25rem 0', color: '#666' }}>
                                    ✓ ${String(feature)}
                                </li>
                            `)}
                        </ul>
                    </div>
                </div>

                <div class="referral-section" style=${{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
                    <div style=${{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <span style=${{ fontSize: '1.25rem' }}>🎁</span>
                        <span style=${{ fontWeight: 600, color: 'var(--petrol)' }}>${t('onboard.premium.referralCode')}</span>
                    </div>
                    <p style=${{ fontSize: '0.875rem', color: '#666', marginBottom: '1rem' }}>
                        ${t('onboard.premium.referralCodeHint')}
                    </p>
                    <div style=${{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <input
                            type="text"
                            class="premium-input"
                            placeholder="Enter referral code"
                            value=${String(data.referral_code || '')}
                            onInput=${(e) => onReferralChange(e.target.value)}
                            style=${referralInputStyle}
                        />
                        ${data.referral_code ? html`
                            <span style=${{ fontSize: '1.5rem' }}>
                                ${data.referral_code_valid ? '✅' : '❌'}
                            </span>
                        ` : null}
                    </div>
                    ${data.referral_code_valid ? html`
                        <div style=${{ marginTop: '1rem', padding: '1rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style=${{ fontSize: '1.5rem' }}>🎉</span>
                            <div>
                                <div style=${{ fontWeight: 600 }}>${t('onboard.premium.referralApplied')}</div>
                                <div style=${{ fontSize: '0.875rem', opacity: 0.9 }}>${t('onboard.premium.referralAppliedDesc')}</div>
                            </div>
                        </div>
                    ` : null}
                    ${data.referral_code && !data.referral_code_valid && String(data.referral_code).length >= 3 ? html`
                        <div style=${{ marginTop: '0.5rem', color: '#ef4444', fontSize: '0.875rem' }}>
                            ${t('onboard.premium.referralInvalid')}
                        </div>
                    ` : null}
                </div>

                <div style=${{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button
                        class="btn-secondary"
                        style=${{ fontSize: '1rem', padding: '1.25rem 1.5rem' }}
                        onClick=${onBack}
                        disabled=${loading}
                    >
                        ← ${t('onboard.premium.back')}
                    </button>
                    <button
                        class="btn-primary btn-success"
                        style=${{ fontSize: '1.25rem', padding: '1.25rem 3rem', flex: 1 }}
                        onClick=${onComplete}
                        disabled=${loading}
                    >
                        ${launchButtonText}
                    </button>
                </div>

                ${isPremiumSelected && !data.referral_code_valid ? html`
                    <p style=${{ textAlign: 'center', fontSize: '0.875rem', color: '#666', marginTop: '1rem' }}>
                        ${t('onboard.premium.premiumRedirect')}
                    </p>
                ` : null}
            </div>
        </div>
    `;
};

export default PremiumCoachOnboarding;
