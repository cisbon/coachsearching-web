import { html } from 'https://esm.sh/htm/react';
import { useState, useEffect, useRef } from 'react';
import api from './api-client.js';
import { t, getCurrentLang } from './i18n.js';

/**
 * Onboarding Flow System
 *
 * Features:
 * - Multi-step wizard with progress tracking
 * - Role-based onboarding (client vs coach)
 * - Skip & resume capability
 * - Data validation & auto-save
 * - Welcome tour & tooltips
 * - Completion rewards
 * - Profile picture upload
 * - Flag-based language selection
 * - Pill-based specialties input
 * - On-site address requirement
 */

// Language data with flag emojis
const LANGUAGE_FLAGS = [
    { code: 'en', name: 'English', flag: '🇬🇧', nameKey: 'lang.english' },
    { code: 'de', name: 'German', flag: '🇩🇪', nameKey: 'lang.german' },
    { code: 'fr', name: 'French', flag: '🇫🇷', nameKey: 'lang.french' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸', nameKey: 'lang.spanish' },
    { code: 'it', name: 'Italian', flag: '🇮🇹', nameKey: 'lang.italian' },
    { code: 'nl', name: 'Dutch', flag: '🇳🇱', nameKey: 'lang.dutch' },
    { code: 'pt', name: 'Portuguese', flag: '🇵🇹', nameKey: 'lang.portuguese' },
    { code: 'pl', name: 'Polish', flag: '🇵🇱', nameKey: 'lang.polish' },
    { code: 'ru', name: 'Russian', flag: '🇷🇺', nameKey: 'lang.russian' }
];

export const OnboardingFlow = ({ session, userType, onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [onboardingData, setOnboardingData] = useState({});
    const [loading, setLoading] = useState(false);
    const [showWelcome, setShowWelcome] = useState(true);

    // Load saved onboarding progress
    useEffect(() => {
        loadProgress();
    }, []);

    const loadProgress = async () => {
        try {
            const saved = localStorage.getItem(`onboarding_${session.user.id}`);
            if (saved) {
                const data = JSON.parse(saved);
                setOnboardingData(data.data || {});
                setCurrentStep(data.step || 0);
                setShowWelcome(false);
            }
        } catch (error) {
            console.error('Failed to load onboarding progress:', error);
        }
    };

    const saveProgress = (step, data) => {
        try {
            localStorage.setItem(`onboarding_${session.user.id}`, JSON.stringify({
                step,
                data,
                timestamp: new Date().toISOString()
            }));
        } catch (error) {
            console.error('Failed to save onboarding progress:', error);
        }
    };

    const updateData = (key, value) => {
        const newData = { ...onboardingData, [key]: value };
        setOnboardingData(newData);
        saveProgress(currentStep, newData);
    };

    const nextStep = () => {
        const totalSteps = userType === 'coach' ? COACH_STEPS.length : CLIENT_STEPS.length;
        if (currentStep < totalSteps - 1) {
            const nextStepNum = currentStep + 1;
            setCurrentStep(nextStepNum);
            saveProgress(nextStepNum, onboardingData);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            completeOnboarding();
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            const prevStepNum = currentStep - 1;
            setCurrentStep(prevStepNum);
            saveProgress(prevStepNum, onboardingData);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const skipOnboarding = () => {
        if (confirm(t('onboard.skipConfirm') || 'Are you sure you want to skip onboarding? You can always complete it later from your settings.')) {
            localStorage.removeItem(`onboarding_${session.user.id}`);
            onComplete && onComplete({ skipped: true });
        }
    };

    const completeOnboarding = async () => {
        try {
            setLoading(true);

            // Save onboarding data to profile
            await api.auth.updateProfile({
                onboarding_completed: true,
                onboarding_data: onboardingData,
                ...onboardingData
            });

            // Clear saved progress
            localStorage.removeItem(`onboarding_${session.user.id}`);

            // Show completion message
            alert(t('onboard.welcomeComplete') || 'Welcome aboard! Your profile is all set up.');

            onComplete && onComplete({ completed: true, data: onboardingData });
        } catch (error) {
            console.error('Failed to complete onboarding:', error);
            alert(t('onboard.saveFailed') || 'Failed to save your profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (showWelcome) {
        return html`<${WelcomeScreen}
            userType=${userType}
            onStart=${() => setShowWelcome(false)}
            onSkip=${skipOnboarding}
        />`;
    }

    const steps = userType === 'coach' ? COACH_STEPS : CLIENT_STEPS;
    const StepComponent = steps[currentStep].component;
    const progress = ((currentStep + 1) / steps.length) * 100;

    return html`
        <div class="onboarding-container">
            <!-- Progress Bar -->
            <div class="onboarding-progress">
                <div class="progress-steps">
                    ${steps.map((step, index) => html`
                        <div key=${step.id} class="progress-step ${index <= currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}">
                            <div class="step-indicator">${index < currentStep ? '✓' : index + 1}</div>
                            <span class="step-name">${t(step.titleKey) || step.title}</span>
                        </div>
                    `)}
                </div>
                <div class="progress-bar">
                    <div class="progress-bar-fill" style="width: ${progress}%"></div>
                </div>
            </div>

            <!-- Step Content -->
            <div class="onboarding-content">
                <${StepComponent}
                    data=${onboardingData}
                    updateData=${updateData}
                    userType=${userType}
                    session=${session}
                />
            </div>

            <!-- Navigation -->
            <div class="onboarding-navigation">
                <button
                    class="btn-secondary"
                    onClick=${prevStep}
                    disabled=${currentStep === 0}
                >
                    ← ${t('onboard.previous') || 'Previous'}
                </button>

                <button
                    class="btn-text"
                    onClick=${skipOnboarding}
                >
                    ${t('onboard.skipForNow') || 'Skip for now'}
                </button>

                <button
                    class="btn-primary"
                    onClick=${nextStep}
                    disabled=${loading}
                >
                    ${currentStep === steps.length - 1 ? (t('onboard.complete') || 'Complete') : (t('onboard.next') || 'Next →')}
                </button>
            </div>
        </div>
    `;
};

// ============================================
// WELCOME SCREEN
// ============================================

const WelcomeScreen = ({ userType, onStart, onSkip }) => html`
    <div class="welcome-screen">
        <div class="welcome-content">
            <div class="welcome-icon">
                ${userType === 'coach' ? '🎓' : '🚀'}
            </div>
            <h1 class="welcome-title">
                ${t('onboard.welcomeTitle') || 'Welcome to CoachSearching!'}
            </h1>
            <p class="welcome-description">
                ${userType === 'coach'
                    ? (t('onboard.welcomeDescCoach') || 'Let\'s set up your coaching profile and start connecting with clients.')
                    : (t('onboard.welcomeDescClient') || 'Let\'s personalize your experience and help you find the perfect coach.')}
            </p>

            <div class="welcome-features">
                <${WelcomeFeature}
                    icon="⚡"
                    title=${t('onboard.quickSetup') || 'Quick Setup'}
                    description=${t('onboard.quickSetupDesc') || 'Just 4 simple steps'}
                />
                <${WelcomeFeature}
                    icon="💾"
                    title=${t('onboard.autoSave') || 'Auto-Save'}
                    description=${t('onboard.autoSaveDesc') || 'Your progress is saved automatically'}
                />
                <${WelcomeFeature}
                    icon="⏭️"
                    title=${t('onboard.skipAnytime') || 'Skip Anytime'}
                    description=${t('onboard.skipAnytimeDesc') || 'Complete it later if you need'}
                />
            </div>

            <div class="welcome-actions">
                <button class="btn-primary btn-lg" onClick=${onStart}>
                    ${t('onboard.letsStart') || 'Let\'s Get Started'}
                </button>
                <button class="btn-text" onClick=${onSkip}>
                    ${t('onboard.skipForNow') || 'Skip for now'}
                </button>
            </div>
        </div>
    </div>
`;

const WelcomeFeature = ({ icon, title, description }) => html`
    <div class="welcome-feature">
        <div class="welcome-feature-icon">${icon}</div>
        <h3 class="welcome-feature-title">${title}</h3>
        <p class="welcome-feature-description">${description}</p>
    </div>
`;

// ============================================
// PROFILE PICTURE UPLOAD COMPONENT
// ============================================

const ProfilePictureUpload = ({ currentUrl, onUpload }) => {
    const [preview, setPreview] = useState(currentUrl || null);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileSelect = async (file) => {
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert(t('onboard.invalidImageType') || 'Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert(t('onboard.imageTooLarge') || 'Image must be less than 5MB');
            return;
        }

        setUploading(true);

        try {
            // Create preview immediately
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreview(e.target.result);
            };
            reader.readAsDataURL(file);

            // Upload to Supabase storage
            const supabase = window.supabaseClient;
            const fileName = `avatar_${Date.now()}_${file.name}`;
            const { data, error } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            // Get public URL
            const { data: publicData } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            onUpload(publicData.publicUrl);
        } catch (error) {
            console.error('Upload error:', error);
            // Still keep the preview for now
            // Convert to base64 for local storage
            const reader = new FileReader();
            reader.onload = (e) => {
                onUpload(e.target.result);
            };
            reader.readAsDataURL(file);
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        handleFileSelect(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => {
        setDragOver(false);
    };

    return html`
        <div class="profile-picture-upload">
            <div
                class="upload-zone ${dragOver ? 'drag-over' : ''} ${preview ? 'has-preview' : ''}"
                onClick=${() => fileInputRef.current?.click()}
                onDrop=${handleDrop}
                onDragOver=${handleDragOver}
                onDragLeave=${handleDragLeave}
            >
                ${preview ? html`
                    <img src=${preview} alt="Profile preview" class="preview-image" />
                    <div class="preview-overlay">
                        <span>${t('onboard.changePhoto') || 'Change photo'}</span>
                    </div>
                ` : html`
                    <div class="upload-placeholder">
                        <div class="upload-icon">📷</div>
                        <p class="upload-text">${t('onboard.uploadPhoto') || 'Click or drag to upload'}</p>
                        <p class="upload-hint">${t('onboard.uploadHint') || 'JPG, PNG up to 5MB'}</p>
                    </div>
                `}
                ${uploading && html`
                    <div class="upload-loading">
                        <div class="spinner"></div>
                    </div>
                `}
            </div>
            <input
                ref=${fileInputRef}
                type="file"
                accept="image/*"
                style="display: none"
                onChange=${(e) => handleFileSelect(e.target.files[0])}
            />
        </div>
    `;
};

// ============================================
// LANGUAGE FLAG SELECTOR
// ============================================

const LanguageFlagSelector = ({ selected = [], onChange }) => {
    const toggleLanguage = (code) => {
        const newSelected = selected.includes(code)
            ? selected.filter(l => l !== code)
            : [...selected, code];
        onChange(newSelected);
    };

    return html`
        <div class="language-flags-container">
            ${LANGUAGE_FLAGS.map(lang => html`
                <button
                    key=${lang.code}
                    type="button"
                    class="language-flag-btn ${selected.includes(lang.code) ? 'selected' : ''}"
                    onClick=${() => toggleLanguage(lang.code)}
                    title=${lang.name}
                >
                    <span class="flag-emoji">${lang.flag}</span>
                    <span class="flag-label">${lang.name}</span>
                </button>
            `)}
        </div>
    `;
};

// ============================================
// PILL INPUT FOR SPECIALTIES
// ============================================

const PillInput = ({ pills = [], onChange, placeholder, maxPills = 10 }) => {
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef(null);

    const addPill = (value) => {
        const trimmed = value.trim();
        if (trimmed && !pills.includes(trimmed) && pills.length < maxPills) {
            onChange([...pills, trimmed]);
        }
    };

    const removePill = (index) => {
        const newPills = pills.filter((_, i) => i !== index);
        onChange(newPills);
    };

    const handleKeyDown = (e) => {
        if (e.key === ',' || e.key === 'Enter') {
            e.preventDefault();
            if (inputValue.trim()) {
                addPill(inputValue);
                setInputValue('');
            }
        } else if (e.key === 'Backspace' && !inputValue && pills.length > 0) {
            removePill(pills.length - 1);
        }
    };

    const handleBlur = () => {
        if (inputValue.trim()) {
            addPill(inputValue);
            setInputValue('');
        }
    };

    return html`
        <div class="pill-input-container" onClick=${() => inputRef.current?.focus()}>
            <div class="pills-wrapper">
                ${pills.map((pill, index) => html`
                    <span key=${index} class="pill">
                        ${pill}
                        <button
                            type="button"
                            class="pill-remove"
                            onClick=${(e) => { e.stopPropagation(); removePill(index); }}
                        >×</button>
                    </span>
                `)}
                <input
                    ref=${inputRef}
                    type="text"
                    class="pill-input"
                    value=${inputValue}
                    placeholder=${pills.length === 0 ? placeholder : ''}
                    onInput=${(e) => setInputValue(e.target.value)}
                    onKeyDown=${handleKeyDown}
                    onBlur=${handleBlur}
                />
            </div>
            ${pills.length > 0 && html`
                <span class="pill-count">${pills.length}/${maxPills}</span>
            `}
        </div>
        <p class="pill-hint">${t('onboard.pillHint') || 'Press comma or Enter to add'}</p>
    `;
};

// ============================================
// CLIENT ONBOARDING STEPS
// ============================================

const ClientStep1Welcome = ({ data, updateData }) => html`
    <div class="onboarding-step">
        <h2 class="step-title">${t('onboard.client.step1Title') || 'Tell us about yourself'}</h2>
        <p class="step-description">${t('onboard.client.step1Desc') || 'This helps us personalize your coaching experience.'}</p>

        <div class="form-group">
            <label class="form-label">${t('onboard.displayName') || 'What should we call you?'}</label>
            <input
                type="text"
                class="form-input"
                placeholder=${t('onboard.displayNamePlaceholder') || 'Your preferred name'}
                value=${data.display_name || ''}
                onInput=${(e) => updateData('display_name', e.target.value)}
            />
        </div>

        <div class="form-group">
            <label class="form-label">${t('onboard.location') || 'Where are you located?'}</label>
            <input
                type="text"
                class="form-input"
                placeholder=${t('onboard.locationPlaceholder') || 'City, Country'}
                value=${data.location || ''}
                onInput=${(e) => updateData('location', e.target.value)}
            />
        </div>

        <div class="form-group">
            <label class="form-label">${t('onboard.aboutYou') || 'Tell us a bit about yourself (optional)'}</label>
            <textarea
                class="form-textarea"
                rows="4"
                placeholder=${t('onboard.aboutYouPlaceholder') || 'What brings you to CoachSearching? What are you looking to achieve?'}
                value=${data.bio || ''}
                onInput=${(e) => updateData('bio', e.target.value)}
            ></textarea>
        </div>
    </div>
`;

const ClientStep2Goals = ({ data, updateData }) => {
    const toggleGoal = (goal) => {
        const goals = data.goals || [];
        const newGoals = goals.includes(goal)
            ? goals.filter(g => g !== goal)
            : [...goals, goal];
        updateData('goals', newGoals);
    };

    return html`
        <div class="onboarding-step">
            <h2 class="step-title">${t('onboard.client.step2Title') || 'What are your goals?'}</h2>
            <p class="step-description">${t('onboard.client.step2Desc') || 'Select all that apply. This helps us match you with the right coaches.'}</p>

            <div class="goals-grid">
                ${COACHING_GOALS.map(goal => html`
                    <button
                        key=${goal.id}
                        type="button"
                        class="goal-card ${(data.goals || []).includes(goal.id) ? 'selected' : ''}"
                        onClick=${() => toggleGoal(goal.id)}
                    >
                        <div class="goal-icon">${goal.icon}</div>
                        <div class="goal-title">${t(goal.titleKey) || goal.title}</div>
                    </button>
                `)}
            </div>

            <div class="form-group" style="margin-top: 2rem;">
                <label class="form-label">${t('onboard.specificGoals') || 'Anything specific you\'d like to work on? (optional)'}</label>
                <textarea
                    class="form-textarea"
                    rows="3"
                    placeholder=${t('onboard.specificGoalsPlaceholder') || 'e.g., I want to transition to a new career, improve my leadership skills...'}
                    value=${data.specific_goals || ''}
                    onInput=${(e) => updateData('specific_goals', e.target.value)}
                ></textarea>
            </div>
        </div>
    `;
};

const ClientStep3Preferences = ({ data, updateData }) => {
    return html`
        <div class="onboarding-step">
            <h2 class="step-title">${t('onboard.client.step3Title') || 'Your Preferences'}</h2>
            <p class="step-description">${t('onboard.client.step3Desc') || 'Help us find coaches that match your needs.'}</p>

            <div class="form-group">
                <label class="form-label">${t('onboard.sessionFormat') || 'Preferred Session Format'}</label>
                <div class="radio-group">
                    <label class="radio-label">
                        <input
                            type="radio"
                            name="session_format"
                            value="video"
                            checked=${data.session_format === 'video'}
                            onChange=${(e) => updateData('session_format', 'video')}
                        />
                        <span>💻 ${t('onboard.videoCall') || 'Video Call'}</span>
                    </label>
                    <label class="radio-label">
                        <input
                            type="radio"
                            name="session_format"
                            value="in-person"
                            checked=${data.session_format === 'in-person'}
                            onChange=${(e) => updateData('session_format', 'in-person')}
                        />
                        <span>🤝 ${t('onboard.inPerson') || 'In-Person'}</span>
                    </label>
                    <label class="radio-label">
                        <input
                            type="radio"
                            name="session_format"
                            value="both"
                            checked=${data.session_format === 'both'}
                            onChange=${(e) => updateData('session_format', 'both')}
                        />
                        <span>🔄 ${t('onboard.either') || 'Either'}</span>
                    </label>
                </div>
            </div>

            <div class="form-group">
                <label class="form-label">${t('onboard.budget') || 'Budget Range (per hour)'}</label>
                <div class="price-range">
                    <input
                        type="number"
                        class="form-input"
                        placeholder=${t('onboard.minPrice') || 'Min €'}
                        value=${data.budget_min || ''}
                        onInput=${(e) => updateData('budget_min', e.target.value)}
                    />
                    <span>${t('onboard.to') || 'to'}</span>
                    <input
                        type="number"
                        class="form-input"
                        placeholder=${t('onboard.maxPrice') || 'Max €'}
                        value=${data.budget_max || ''}
                        onInput=${(e) => updateData('budget_max', e.target.value)}
                    />
                </div>
            </div>

            <div class="form-group">
                <label class="form-label">${t('onboard.preferredLanguages') || 'Preferred Languages'}</label>
                <${LanguageFlagSelector}
                    selected=${data.preferred_languages || []}
                    onChange=${(langs) => updateData('preferred_languages', langs)}
                />
            </div>
        </div>
    `;
};

const ClientStep4Complete = ({ data }) => html`
    <div class="onboarding-step onboarding-complete">
        <div class="complete-icon">🎉</div>
        <h2 class="step-title">${t('onboard.client.completeTitle') || 'You\'re All Set!'}</h2>
        <p class="step-description">
            ${t('onboard.client.completeDesc') || 'Your profile is ready. Let\'s find you the perfect coach!'}
        </p>

        <div class="profile-summary">
            <h3>${t('onboard.profileSummary') || 'Your Profile Summary'}:</h3>
            <ul class="summary-list">
                ${data.display_name && html`<li><strong>${t('onboard.name') || 'Name'}:</strong> ${data.display_name}</li>`}
                ${data.location && html`<li><strong>${t('onboard.location') || 'Location'}:</strong> ${data.location}</li>`}
                ${data.goals?.length > 0 && html`<li><strong>${t('onboard.goals') || 'Goals'}:</strong> ${data.goals.length} ${t('onboard.selected') || 'selected'}</li>`}
                ${data.session_format && html`<li><strong>${t('onboard.sessionFormat') || 'Session Format'}:</strong> ${formatSessionType(data.session_format)}</li>`}
                ${data.budget_min && html`<li><strong>${t('onboard.budget') || 'Budget'}:</strong> €${data.budget_min} - €${data.budget_max}/${t('onboard.hour') || 'hour'}</li>`}
            </ul>
        </div>

        <div class="next-steps">
            <h3>${t('onboard.whatNext') || 'What\'s Next?'}</h3>
            <div class="next-steps-grid">
                <div class="next-step-card">
                    <div class="next-step-icon">🔍</div>
                    <div class="next-step-title">${t('onboard.browseCoaches') || 'Browse Coaches'}</div>
                    <div class="next-step-description">${t('onboard.browseCoachesDesc') || 'Find coaches that match your goals'}</div>
                </div>
                <div class="next-step-card">
                    <div class="next-step-icon">📅</div>
                    <div class="next-step-title">${t('onboard.bookSession') || 'Book a Session'}</div>
                    <div class="next-step-description">${t('onboard.bookSessionDesc') || 'Schedule your first coaching session'}</div>
                </div>
                <div class="next-step-card">
                    <div class="next-step-icon">💬</div>
                    <div class="next-step-title">${t('onboard.getSupport') || 'Get Support'}</div>
                    <div class="next-step-description">${t('onboard.getSupportDesc') || 'We\'re here to help anytime'}</div>
                </div>
            </div>
        </div>
    </div>
`;

// ============================================
// COACH ONBOARDING STEPS
// ============================================

const CoachStep1Profile = ({ data, updateData, session }) => {
    const [referralCode, setReferralCode] = useState(data.referral_code || '');
    const [referralStatus, setReferralStatus] = useState(null); // null, 'checking', 'valid', 'invalid'
    const [referralMessage, setReferralMessage] = useState('');

    // Validate referral code against Supabase
    const validateReferralCode = async (code) => {
        if (!code || code.trim().length < 3) {
            setReferralStatus(null);
            setReferralMessage('');
            updateData('referral_code', '');
            updateData('referral_code_valid', false);
            return;
        }

        setReferralStatus('checking');
        try {
            const supabase = window.supabaseClient;
            const { data: codeData, error } = await supabase
                .from('referral_codes')
                .select('code, user_id')
                .eq('code', code.trim().toUpperCase())
                .single();

            if (error || !codeData) {
                setReferralStatus('invalid');
                setReferralMessage(t('onboard.referralInvalid') || 'Invalid referral code');
                updateData('referral_code', code);
                updateData('referral_code_valid', false);
            } else {
                setReferralStatus('valid');
                setReferralMessage(t('onboard.referralValid') || '🎉 Valid code! You get your first year of Premium free!');
                updateData('referral_code', code.trim().toUpperCase());
                updateData('referral_code_valid', true);
                updateData('referrer_id', codeData.user_id);
            }
        } catch (err) {
            console.error('Error validating referral code:', err);
            setReferralStatus('invalid');
            setReferralMessage(t('onboard.referralError') || 'Could not validate code');
            updateData('referral_code_valid', false);
        }
    };

    // Debounced validation
    useEffect(() => {
        const timer = setTimeout(() => {
            if (referralCode) {
                validateReferralCode(referralCode);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [referralCode]);

    return html`
    <div class="onboarding-step">
        <h2 class="step-title">${t('onboard.coach.step1Title') || 'Create Your Coach Profile'}</h2>
        <p class="step-description">${t('onboard.coach.step1Desc') || 'This is how clients will discover you.'}</p>

        <!-- Profile Picture Upload -->
        <div class="form-group">
            <label class="form-label">${t('onboard.profilePicture') || 'Profile Picture'}</label>
            <${ProfilePictureUpload}
                currentUrl=${data.avatar_url}
                onUpload=${(url) => updateData('avatar_url', url)}
            />
        </div>

        <div class="form-group">
            <label class="form-label">${t('onboard.jobTitle') || 'Professional Title'}</label>
            <input
                type="text"
                class="form-input"
                placeholder=${t('onboard.jobTitlePlaceholder') || 'e.g., Certified Life Coach, Business Strategist'}
                value=${data.professional_title || ''}
                onInput=${(e) => updateData('professional_title', e.target.value)}
            />
        </div>

        <div class="form-group">
            <label class="form-label">${t('onboard.yearsExperience') || 'Years of Experience'}</label>
            <input
                type="number"
                class="form-input"
                placeholder="0"
                min="0"
                value=${data.years_experience || ''}
                onInput=${(e) => updateData('years_experience', e.target.value)}
            />
        </div>

        <div class="form-group">
            <label class="form-label">${t('onboard.bio') || 'Professional Bio'}</label>
            <p class="form-help">${t('onboard.bioHelp') || 'Tell clients about your background, approach, and what makes you unique.'}</p>
            <textarea
                class="form-textarea"
                rows="6"
                placeholder=${t('onboard.bioPlaceholder') || 'I\'m a certified life coach with 5 years of experience helping professionals transition careers and find fulfillment...'}
                value=${data.bio || ''}
                onInput=${(e) => updateData('bio', e.target.value)}
                maxlength="500"
            ></textarea>
            <div class="char-count">${(data.bio || '').length} / 500 ${t('onboard.characters') || 'characters'}</div>
        </div>

        <div class="form-group">
            <label class="form-label">${t('onboard.location') || 'Location'}</label>
            <input
                type="text"
                class="form-input"
                placeholder=${t('onboard.locationPlaceholder') || 'City, Country'}
                value=${data.location || ''}
                onInput=${(e) => updateData('location', e.target.value)}
            />
        </div>

        <!-- Referral Code Field -->
        <div class="form-group referral-code-group">
            <label class="form-label">
                ${t('onboard.referralCode') || 'Referral Code'}
                <span class="optional-label">${t('onboard.optional') || '(optional)'}</span>
            </label>
            <div class="referral-input-wrapper">
                <input
                    type="text"
                    class="form-input referral-input ${referralStatus === 'valid' ? 'valid' : ''} ${referralStatus === 'invalid' ? 'invalid' : ''}"
                    placeholder=${t('onboard.referralPlaceholder') || 'Enter code'}
                    value=${referralCode}
                    onInput=${(e) => setReferralCode(e.target.value.toUpperCase())}
                    maxlength="20"
                />
                ${referralStatus === 'checking' && html`
                    <span class="referral-status checking">⏳</span>
                `}
                ${referralStatus === 'valid' && html`
                    <span class="referral-status valid">✓</span>
                `}
                ${referralStatus === 'invalid' && html`
                    <span class="referral-status invalid">✗</span>
                `}
            </div>
            ${referralStatus === 'valid' && html`
                <div class="referral-success-banner">
                    <span class="success-icon">🎁</span>
                    <div class="success-text">
                        <strong>${t('onboard.referralSuccessTitle') || 'Free First Year of Premium!'}</strong>
                        <span>${t('onboard.referralSuccessDesc') || 'Your referral code has been applied. Enjoy all Premium features free for your first year.'}</span>
                    </div>
                </div>
            `}
            ${referralStatus === 'invalid' && html`
                <p class="form-error">${referralMessage}</p>
            `}
        </div>
    </div>
`};


const CoachStep2Specialties = ({ data, updateData }) => {
    return html`
        <div class="onboarding-step">
            <h2 class="step-title">${t('onboard.coach.step2Title') || 'Your Specialties'}</h2>
            <p class="step-description">${t('onboard.coach.step2Desc') || 'Add your coaching specialties and languages.'}</p>

            <div class="form-group">
                <label class="form-label">${t('onboard.specialties') || 'Your Specialties'}</label>
                <p class="form-help">${t('onboard.specialtiesHelp') || 'Type a specialty and press comma or Enter to add it'}</p>
                <${PillInput}
                    pills=${data.specialties || []}
                    onChange=${(pills) => updateData('specialties', pills)}
                    placeholder=${t('onboard.specialtiesPlaceholder') || 'e.g., Life Coaching, Career Development, Executive Coaching...'}
                    maxPills=${10}
                />
            </div>

            <div class="specialty-suggestions">
                <p class="suggestions-label">${t('onboard.popularSpecialties') || 'Popular specialties'}:</p>
                <div class="suggestions-list">
                    ${SPECIALTY_SUGGESTIONS.map(specialty => html`
                        <button
                            key=${specialty}
                            type="button"
                            class="suggestion-chip ${(data.specialties || []).includes(specialty) ? 'selected' : ''}"
                            onClick=${() => {
                                const specialties = data.specialties || [];
                                if (!specialties.includes(specialty)) {
                                    updateData('specialties', [...specialties, specialty]);
                                }
                            }}
                            disabled=${(data.specialties || []).includes(specialty)}
                        >
                            + ${specialty}
                        </button>
                    `)}
                </div>
            </div>

            <div class="form-group" style="margin-top: 2rem;">
                <label class="form-label">${t('onboard.sessionLanguages') || 'Languages You Offer Sessions In'}</label>
                <${LanguageFlagSelector}
                    selected=${data.languages || []}
                    onChange=${(langs) => updateData('languages', langs)}
                />
            </div>
        </div>
    `;
};

const CoachStep3Pricing = ({ data, updateData }) => {
    const hasInPerson = (data.session_formats || []).includes('in-person');

    return html`
        <div class="onboarding-step">
            <h2 class="step-title">${t('onboard.coach.step3Title') || 'Set Your Rates'}</h2>
            <p class="step-description">${t('onboard.coach.step3Desc') || 'You can always adjust these later.'}</p>

            <div class="form-group">
                <label class="form-label">${t('onboard.hourlyRate') || 'Hourly Rate'} (€)</label>
                <input
                    type="number"
                    class="form-input"
                    placeholder=${t('onboard.hourlyRatePlaceholder') || 'e.g., 75'}
                    min="0"
                    value=${data.hourly_rate || ''}
                    onInput=${(e) => updateData('hourly_rate', e.target.value)}
                />
                <p class="form-help">${t('onboard.platformFee') || 'Platform fee'}: 15% • ${t('onboard.youReceive') || 'You\'ll receive'} €${calculateNetRate(data.hourly_rate)}/${t('onboard.hour') || 'hour'}</p>
            </div>

            <div class="form-group">
                <label class="form-label">${t('onboard.sessionDurations') || 'Session Duration Options'}</label>
                <div class="checkbox-group-inline">
                    ${SESSION_DURATIONS.map(duration => html`
                        <label key=${duration.value} class="checkbox-label">
                            <input
                                type="checkbox"
                                checked=${(data.session_durations || []).includes(duration.value)}
                                onChange=${() => {
                                    const durations = data.session_durations || [];
                                    const newDurations = durations.includes(duration.value)
                                        ? durations.filter(d => d !== duration.value)
                                        : [...durations, duration.value];
                                    updateData('session_durations', newDurations);
                                }}
                            />
                            <span>${duration.label}</span>
                        </label>
                    `)}
                </div>
            </div>

            <div class="form-group">
                <label class="form-label">${t('onboard.sessionFormats') || 'Session Formats You Offer'}</label>
                <div class="session-formats-grid">
                    <label class="format-card ${(data.session_formats || []).includes('video') ? 'selected' : ''}">
                        <input
                            type="checkbox"
                            checked=${(data.session_formats || []).includes('video')}
                            onChange=${() => {
                                const formats = data.session_formats || [];
                                const newFormats = formats.includes('video')
                                    ? formats.filter(f => f !== 'video')
                                    : [...formats, 'video'];
                                updateData('session_formats', newFormats);
                            }}
                        />
                        <div class="format-icon">💻</div>
                        <div class="format-title">${t('onboard.videoCall') || 'Video Call'}</div>
                        <div class="format-desc">${t('onboard.videoCallDesc') || 'Online sessions via video'}</div>
                    </label>
                    <label class="format-card ${(data.session_formats || []).includes('in-person') ? 'selected' : ''}">
                        <input
                            type="checkbox"
                            checked=${(data.session_formats || []).includes('in-person')}
                            onChange=${() => {
                                const formats = data.session_formats || [];
                                const newFormats = formats.includes('in-person')
                                    ? formats.filter(f => f !== 'in-person')
                                    : [...formats, 'in-person'];
                                updateData('session_formats', newFormats);
                            }}
                        />
                        <div class="format-icon">🤝</div>
                        <div class="format-title">${t('onboard.inPerson') || 'In-Person'}</div>
                        <div class="format-desc">${t('onboard.inPersonDesc') || 'Face-to-face sessions'}</div>
                    </label>
                    <label class="format-card ${(data.session_formats || []).includes('phone') ? 'selected' : ''}">
                        <input
                            type="checkbox"
                            checked=${(data.session_formats || []).includes('phone')}
                            onChange=${() => {
                                const formats = data.session_formats || [];
                                const newFormats = formats.includes('phone')
                                    ? formats.filter(f => f !== 'phone')
                                    : [...formats, 'phone'];
                                updateData('session_formats', newFormats);
                            }}
                        />
                        <div class="format-icon">📞</div>
                        <div class="format-title">${t('onboard.phoneCall') || 'Phone Call'}</div>
                        <div class="format-desc">${t('onboard.phoneCallDesc') || 'Audio-only sessions'}</div>
                    </label>
                </div>
            </div>

            ${hasInPerson && html`
                <div class="form-group address-section animate-in">
                    <label class="form-label">
                        <span class="required-badge">*</span>
                        ${t('onboard.onsiteAddress') || 'On-Site Session Address'}
                    </label>
                    <p class="form-help">${t('onboard.onsiteAddressHelp') || 'Where will you meet clients for in-person sessions?'}</p>
                    <input
                        type="text"
                        class="form-input"
                        placeholder=${t('onboard.streetAddress') || 'Street address'}
                        value=${data.onsite_address_street || ''}
                        onInput=${(e) => updateData('onsite_address_street', e.target.value)}
                    />
                    <div class="address-row">
                        <input
                            type="text"
                            class="form-input"
                            placeholder=${t('onboard.city') || 'City'}
                            value=${data.onsite_address_city || ''}
                            onInput=${(e) => updateData('onsite_address_city', e.target.value)}
                        />
                        <input
                            type="text"
                            class="form-input"
                            placeholder=${t('onboard.postalCode') || 'Postal code'}
                            value=${data.onsite_address_postal || ''}
                            onInput=${(e) => updateData('onsite_address_postal', e.target.value)}
                        />
                    </div>
                    <input
                        type="text"
                        class="form-input"
                        placeholder=${t('onboard.country') || 'Country'}
                        value=${data.onsite_address_country || ''}
                        onInput=${(e) => updateData('onsite_address_country', e.target.value)}
                    />
                </div>
            `}

            <div class="pricing-preview">
                <h3>${t('onboard.pricingPreview') || 'Pricing Preview'}:</h3>
                <div class="pricing-breakdown">
                    <div class="pricing-row">
                        <span>${t('onboard.sessionPrice') || '1-hour session price'}:</span>
                        <strong>€${data.hourly_rate || 0}</strong>
                    </div>
                    <div class="pricing-row">
                        <span>${t('onboard.platformFee') || 'Platform fee'} (15%):</span>
                        <span>-€${calculatePlatformFee(data.hourly_rate)}</span>
                    </div>
                    <div class="pricing-row total">
                        <span>${t('onboard.youReceive') || 'You receive'}:</span>
                        <strong>€${calculateNetRate(data.hourly_rate)}</strong>
                    </div>
                </div>
            </div>
        </div>
    `;
};

const CoachStep4Complete = ({ data }) => {
    const languageNames = (data.languages || []).map(code => {
        const lang = LANGUAGE_FLAGS.find(l => l.code === code);
        return lang ? `${lang.flag} ${lang.name}` : code;
    });

    return html`
        <div class="onboarding-step onboarding-complete">
            <div class="complete-icon">🎓</div>
            <h2 class="step-title">${t('onboard.coach.completeTitle') || 'Welcome to CoachSearching!'}</h2>
            <p class="step-description">
                ${t('onboard.coach.completeDesc') || 'Your coach profile is ready. Let\'s get you verified and start connecting with clients!'}
            </p>

            <div class="profile-summary">
                ${data.avatar_url && html`
                    <div class="summary-avatar">
                        <img src=${data.avatar_url} alt="Profile" />
                    </div>
                `}
                <h3>${t('onboard.coachProfile') || 'Your Coach Profile'}:</h3>
                <ul class="summary-list">
                    ${data.professional_title && html`<li><strong>${t('onboard.title') || 'Title'}:</strong> ${data.professional_title}</li>`}
                    ${data.years_experience && html`<li><strong>${t('onboard.experience') || 'Experience'}:</strong> ${data.years_experience} ${t('onboard.years') || 'years'}</li>`}
                    ${data.specialties?.length > 0 && html`<li><strong>${t('onboard.specialties') || 'Specialties'}:</strong> ${data.specialties.join(', ')}</li>`}
                    ${data.hourly_rate && html`<li><strong>${t('onboard.hourlyRate') || 'Hourly Rate'}:</strong> €${data.hourly_rate}/${t('onboard.hour') || 'hour'}</li>`}
                    ${languageNames.length > 0 && html`<li><strong>${t('onboard.languages') || 'Languages'}:</strong> ${languageNames.join(', ')}</li>`}
                </ul>
            </div>

            <div class="next-steps">
                <h3>${t('onboard.nextSteps') || 'Next Steps'}:</h3>
                <div class="next-steps-grid">
                    <div class="next-step-card">
                        <div class="next-step-icon">✅</div>
                        <div class="next-step-title">${t('onboard.getVerified') || 'Get Verified'}</div>
                        <div class="next-step-description">${t('onboard.getVerifiedDesc') || 'Submit your credentials for verification'}</div>
                    </div>
                    <div class="next-step-card">
                        <div class="next-step-icon">📅</div>
                        <div class="next-step-title">${t('onboard.setAvailability') || 'Set Availability'}</div>
                        <div class="next-step-description">${t('onboard.setAvailabilityDesc') || 'Add your available time slots'}</div>
                    </div>
                    <div class="next-step-card">
                        <div class="next-step-icon">💼</div>
                        <div class="next-step-title">${t('onboard.completeProfile') || 'Complete Profile'}</div>
                        <div class="next-step-description">${t('onboard.completeProfileDesc') || 'Add portfolio items and certifications'}</div>
                    </div>
                </div>
            </div>

            <div class="verification-prompt">
                <h3>${t('onboard.verifiedBadge') || 'Get Verified to Stand Out!'}</h3>
                <p>${t('onboard.verifiedBadgeDesc') || 'Verified coaches get 3x more bookings. Upload your credentials to get your verified badge.'}</p>
            </div>
        </div>
    `;
};

// ============================================
// CONSTANTS
// ============================================

const CLIENT_STEPS = [
    { id: 'welcome', title: 'Welcome', titleKey: 'onboard.step.welcome', component: ClientStep1Welcome },
    { id: 'goals', title: 'Goals', titleKey: 'onboard.step.goals', component: ClientStep2Goals },
    { id: 'preferences', title: 'Preferences', titleKey: 'onboard.step.preferences', component: ClientStep3Preferences },
    { id: 'complete', title: 'Complete', titleKey: 'onboard.step.complete', component: ClientStep4Complete }
];

const COACH_STEPS = [
    { id: 'profile', title: 'Profile', titleKey: 'onboard.step.profile', component: CoachStep1Profile },
    { id: 'specialties', title: 'Specialties', titleKey: 'onboard.step.specialties', component: CoachStep2Specialties },
    { id: 'pricing', title: 'Pricing', titleKey: 'onboard.step.pricing', component: CoachStep3Pricing },
    { id: 'complete', title: 'Complete', titleKey: 'onboard.step.complete', component: CoachStep4Complete }
];

const COACHING_GOALS = [
    { id: 'career', title: 'Career Development', titleKey: 'goal.career', icon: '💼' },
    { id: 'leadership', title: 'Leadership Skills', titleKey: 'goal.leadership', icon: '👑' },
    { id: 'life', title: 'Life Balance', titleKey: 'goal.life', icon: '⚖️' },
    { id: 'health', title: 'Health & Wellness', titleKey: 'goal.health', icon: '🏃' },
    { id: 'relationships', title: 'Relationships', titleKey: 'goal.relationships', icon: '❤️' },
    { id: 'business', title: 'Business Growth', titleKey: 'goal.business', icon: '📈' },
    { id: 'mindset', title: 'Mindset & Confidence', titleKey: 'goal.mindset', icon: '🧠' },
    { id: 'financial', title: 'Financial Goals', titleKey: 'goal.financial', icon: '💰' }
];

const SPECIALTY_SUGGESTIONS = [
    'Life Coaching',
    'Career Coaching',
    'Executive Coaching',
    'Leadership Development',
    'Business Coaching',
    'Health & Wellness',
    'Relationship Coaching',
    'Performance Coaching',
    'Mindset Coaching',
    'Financial Coaching'
];

const SESSION_DURATIONS = [
    { value: 30, label: '30 min' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' }
];

// ============================================
// HELPER FUNCTIONS
// ============================================

const calculatePlatformFee = (rate) => {
    const amount = parseFloat(rate) || 0;
    return (amount * 0.15).toFixed(2);
};

const calculateNetRate = (rate) => {
    const amount = parseFloat(rate) || 0;
    return (amount * 0.85).toFixed(2);
};

const formatSessionType = (type) => {
    const types = {
        'video': t('onboard.videoCall') || 'Video Call',
        'in-person': t('onboard.inPerson') || 'In-Person',
        'phone': t('onboard.phoneCall') || 'Phone Call',
        'both': t('onboard.either') || 'Video or In-Person'
    };
    return types[type] || type;
};

export default OnboardingFlow;
