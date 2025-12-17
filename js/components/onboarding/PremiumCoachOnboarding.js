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
import { t } from '../../i18n.js';

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

const LANGUAGE_FLAGS = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'it', name: 'Italian', flag: '🇮🇹' },
    { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
    { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
    { code: 'pl', name: 'Polish', flag: '🇵🇱' }
];

const SPECIALTY_SUGGESTIONS = [
    'Life Coaching', 'Career Coaching', 'Executive Coaching',
    'Leadership Development', 'Business Coaching', 'Health & Wellness',
    'Relationship Coaching', 'Performance Coaching', 'Mindset Coaching',
    'Financial Coaching', 'Stress Management', 'Work-Life Balance'
];

const SESSION_FORMATS = [
    { id: 'video', icon: '💻', title: 'Video Call', desc: 'Online via Zoom/Meet' },
    { id: 'in-person', icon: '🤝', title: 'In-Person', desc: 'Face-to-face meetings' },
    { id: 'phone', icon: '📞', title: 'Phone Call', desc: 'Audio-only sessions' }
];

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
        referral_code: '',
        referral_code_valid: false
    });

    // Load saved progress
    useEffect(() => {
        const savedData = localStorage.getItem(`premium_onboarding_${session?.user?.id}`);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                setData(prev => ({ ...prev, ...parsed.data }));
                if (parsed.step > 0) {
                    setCurrentStep(parsed.step);
                    setShowWelcome(false);
                }
            } catch (e) {
                console.error('Failed to load saved onboarding data');
            }
        }

        // Pre-fill name from session if available
        if (session?.user?.user_metadata?.full_name) {
            setData(prev => ({ ...prev, full_name: session.user.user_metadata.full_name }));
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
                return html`<${StepExpertise} data=${data} updateData=${updateData} />`;
            case 2:
                return html`<${StepServices} data=${data} updateData=${updateData} />`;
            case 3:
                return html`<${StepLaunch} data=${data} loading=${loading} onComplete=${completeOnboarding} />`;
            default:
                return null;
        }
    };

    return html`
        <div class="premium-onboarding">
            <div class="onboarding-wrapper">
                <!-- Progress Header -->
                <header class="onboarding-header">
                    <div class="progress-container">
                        ${STEPS.map((step, index) => html`
                            <div
                                key=${step.id}
                                class="progress-step-indicator ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}"
                            >
                                <div class="step-dot">
                                    ${index < currentStep ? '✓' : step.icon}
                                </div>
                                <span class="step-dot-label">${step.label}</span>
                            </div>
                        `)}
                    </div>
                </header>

                <!-- Main Card -->
                <div class="onboarding-card">
                    <div class="card-content step-transition" key=${currentStep}>
                        ${renderStep()}
                    </div>

                    <!-- Footer with navigation -->
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
                        ✨ Join 2,500+ coaches worldwide
                    </div>

                    <div class="welcome-icon-container">
                        <span class="welcome-icon">🎓</span>
                    </div>

                    <h1 class="welcome-title">
                        Welcome to <span>CoachSearching</span>
                    </h1>

                    <p class="welcome-subtitle">
                        Let's set up your professional coaching profile in just a few minutes.
                        Connect with clients who are looking for exactly what you offer.
                    </p>

                    <div class="welcome-features">
                        <div class="welcome-feature">
                            <div class="feature-icon">⚡</div>
                            <div class="feature-title">5 Minutes</div>
                            <div class="feature-desc">Quick & easy setup</div>
                        </div>
                        <div class="welcome-feature">
                            <div class="feature-icon">💾</div>
                            <div class="feature-title">Auto-Save</div>
                            <div class="feature-desc">Continue anytime</div>
                        </div>
                        <div class="welcome-feature">
                            <div class="feature-icon">🚀</div>
                            <div class="feature-title">Go Live</div>
                            <div class="feature-desc">Start getting bookings</div>
                        </div>
                    </div>

                    <div class="welcome-cta">
                        <button class="btn-start" onClick=${onStart}>
                            Create My Profile
                            <span class="arrow">→</span>
                        </button>
                    </div>

                    <div class="social-proof">
                        <div class="trust-logos">
                            <div class="trust-stat">
                                <div class="trust-number">2,500+</div>
                                <div class="trust-label">Active Coaches</div>
                            </div>
                            <div class="trust-stat">
                                <div class="trust-number">50,000+</div>
                                <div class="trust-label">Sessions Booked</div>
                            </div>
                            <div class="trust-stat">
                                <div class="trust-number">4.9★</div>
                                <div class="trust-label">Average Rating</div>
                            </div>
                        </div>
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
            // Create preview immediately
            const reader = new FileReader();
            reader.onload = (e) => updateData('avatar_url', e.target.result);
            reader.readAsDataURL(file);

            // Try to upload to storage
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

    return html`
        <div class="slide-up">
            <div class="step-header">
                <div class="step-number">Step 1 of 4</div>
                <h2 class="step-title">Let's build your profile</h2>
                <p class="step-description">
                    This is how clients will discover and connect with you.
                    Make a great first impression!
                </p>
            </div>

            <!-- Avatar Upload -->
            <div class="avatar-upload-section">
                <div
                    class="avatar-upload-zone ${dragOver ? 'dragging' : ''} ${data.avatar_url ? 'has-image' : ''}"
                    onClick=${() => fileInputRef.current?.click()}
                    onDrop=${(e) => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files[0]); }}
                    onDragOver=${(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave=${() => setDragOver(false)}
                >
                    ${data.avatar_url ? html`
                        <img src=${data.avatar_url} alt="Profile" class="avatar-preview" />
                        <div class="avatar-overlay">
                            <span class="avatar-overlay-text">Change photo</span>
                        </div>
                    ` : html`
                        <div class="avatar-placeholder">
                            <div class="avatar-placeholder-icon">📷</div>
                            <div class="avatar-placeholder-text">Upload Photo</div>
                        </div>
                    `}
                    ${uploading && html`
                        <div class="avatar-overlay" style="opacity: 1">
                            <span class="avatar-overlay-text">Uploading...</span>
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

                <div class="avatar-tips">
                    <div class="avatar-tips-title">Photo Tips</div>
                    <ul class="avatar-tips-list">
                        <li>Use a professional headshot</li>
                        <li>Good lighting, neutral background</li>
                        <li>Smile warmly - clients love it!</li>
                        <li>Square crop works best</li>
                    </ul>
                </div>
            </div>

            <!-- Name & Title -->
            <div class="form-section">
                <div class="form-group">
                    <label class="form-label">
                        Full Name <span class="required">*</span>
                    </label>
                    <input
                        type="text"
                        class="premium-input"
                        placeholder="e.g., Sarah Johnson"
                        value=${data.full_name}
                        onInput=${(e) => updateData('full_name', e.target.value)}
                    />
                </div>

                <div class="form-group">
                    <label class="form-label">
                        Professional Title <span class="required">*</span>
                    </label>
                    <div class="form-hint">
                        A clear title helps clients find you
                    </div>
                    <input
                        type="text"
                        class="premium-input"
                        placeholder="e.g., Certified Life Coach & Leadership Consultant"
                        value=${data.professional_title}
                        onInput=${(e) => updateData('professional_title', e.target.value)}
                    />
                </div>
            </div>

            <!-- Bio -->
            <div class="form-section">
                <div class="form-group">
                    <label class="form-label">About You</label>
                    <div class="form-hint">
                        Tell potential clients about your background, approach, and what makes you unique
                    </div>
                    <textarea
                        class="premium-input premium-textarea"
                        placeholder="I'm passionate about helping professionals unlock their potential. With over 10 years of experience in executive coaching, I specialize in..."
                        value=${data.bio}
                        onInput=${(e) => updateData('bio', e.target.value)}
                        maxLength="500"
                    ></textarea>
                    <div class="char-counter ${data.bio?.length > 450 ? 'warning' : ''} ${data.bio?.length > 480 ? 'danger' : ''}">
                        ${data.bio?.length || 0} / 500
                    </div>
                </div>
            </div>

            <!-- Location & Experience -->
            <div class="form-section">
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label class="form-label">City</label>
                        <input
                            type="text"
                            class="premium-input"
                            placeholder="e.g., Berlin"
                            value=${data.location_city}
                            onInput=${(e) => updateData('location_city', e.target.value)}
                        />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Country</label>
                        <input
                            type="text"
                            class="premium-input"
                            placeholder="e.g., Germany"
                            value=${data.location_country}
                            onInput=${(e) => updateData('location_country', e.target.value)}
                        />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Years of Experience</label>
                        <input
                            type="number"
                            class="premium-input"
                            placeholder="e.g., 5"
                            min="0"
                            value=${data.years_experience}
                            onInput=${(e) => updateData('years_experience', e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </div>
    `;
};

// ============================================================================
// STEP 2: EXPERTISE
// ============================================================================

const StepExpertise = ({ data, updateData }) => {
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef(null);

    const addSpecialty = (specialty) => {
        const trimmed = specialty.trim();
        if (trimmed && !data.specialties.includes(trimmed) && data.specialties.length < 10) {
            updateData('specialties', [...data.specialties, trimmed]);
        }
    };

    const removeSpecialty = (index) => {
        updateData('specialties', data.specialties.filter((_, i) => i !== index));
    };

    const handleKeyDown = (e) => {
        if ((e.key === ',' || e.key === 'Enter') && inputValue.trim()) {
            e.preventDefault();
            addSpecialty(inputValue);
            setInputValue('');
        } else if (e.key === 'Backspace' && !inputValue && data.specialties.length > 0) {
            removeSpecialty(data.specialties.length - 1);
        }
    };

    const toggleLanguage = (code) => {
        const langs = data.languages || [];
        const newLangs = langs.includes(code)
            ? langs.filter(l => l !== code)
            : [...langs, code];
        updateData('languages', newLangs);
    };

    return html`
        <div class="slide-up">
            <div class="step-header">
                <div class="step-number">Step 2 of 4</div>
                <h2 class="step-title">Your Expertise</h2>
                <p class="step-description">
                    Help clients understand what you specialize in and how they can work with you.
                </p>
            </div>

            <!-- Specialties -->
            <div class="form-section">
                <div class="form-section-title">🎯 Your Specialties</div>
                <div class="form-hint">
                    Add up to 10 areas you specialize in. Press comma or Enter to add.
                </div>

                <div class="specialty-input-container" onClick=${() => inputRef.current?.focus()}>
                    ${data.specialties.map((specialty, index) => html`
                        <span key=${index} class="specialty-pill">
                            ${specialty}
                            <button
                                class="specialty-pill-remove"
                                onClick=${(e) => { e.stopPropagation(); removeSpecialty(index); }}
                            >×</button>
                        </span>
                    `)}
                    <input
                        ref=${inputRef}
                        type="text"
                        class="specialty-input"
                        placeholder=${data.specialties.length === 0 ? 'Type a specialty...' : ''}
                        value=${inputValue}
                        onInput=${(e) => setInputValue(e.target.value)}
                        onKeyDown=${handleKeyDown}
                        onBlur=${() => { if (inputValue.trim()) { addSpecialty(inputValue); setInputValue(''); }}}
                    />
                </div>

                <div class="specialty-suggestions">
                    <div class="suggestions-title">Popular Specialties</div>
                    <div class="suggestion-chips">
                        ${SPECIALTY_SUGGESTIONS.map(specialty => html`
                            <button
                                key=${specialty}
                                class="suggestion-chip"
                                onClick=${() => addSpecialty(specialty)}
                                disabled=${data.specialties.includes(specialty) || data.specialties.length >= 10}
                            >
                                + ${specialty}
                            </button>
                        `)}
                    </div>
                </div>
            </div>

            <!-- Languages -->
            <div class="form-section">
                <div class="form-section-title">🌍 Languages You Coach In</div>
                <div class="form-hint">
                    Select all languages you can conduct coaching sessions in.
                </div>

                <div class="language-grid">
                    ${LANGUAGE_FLAGS.map(lang => html`
                        <button
                            key=${lang.code}
                            type="button"
                            class="language-option ${data.languages.includes(lang.code) ? 'selected' : ''}"
                            onClick=${() => toggleLanguage(lang.code)}
                        >
                            <span class="language-flag">${lang.flag}</span>
                            <span class="language-name">${lang.name}</span>
                        </button>
                    `)}
                </div>
            </div>
        </div>
    `;
};

// ============================================================================
// STEP 3: SERVICES & PRICING
// ============================================================================

const StepServices = ({ data, updateData }) => {
    const toggleFormat = (formatId) => {
        const formats = data.session_formats || [];
        const newFormats = formats.includes(formatId)
            ? formats.filter(f => f !== formatId)
            : [...formats, formatId];
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
                <div class="step-number">Step 3 of 4</div>
                <h2 class="step-title">Services & Pricing</h2>
                <p class="step-description">
                    Define how clients can book sessions with you and set your rates.
                </p>
            </div>

            <!-- Session Formats -->
            <div class="form-section">
                <div class="form-section-title">💬 Session Formats</div>
                <div class="form-hint">
                    Select all formats you offer. Most coaches offer video at minimum.
                </div>

                <div class="format-grid">
                    ${SESSION_FORMATS.map(format => html`
                        <div
                            key=${format.id}
                            class="format-card ${data.session_formats.includes(format.id) ? 'selected' : ''}"
                            onClick=${() => toggleFormat(format.id)}
                        >
                            <div class="format-icon">${format.icon}</div>
                            <div class="format-title">${format.title}</div>
                            <div class="format-desc">${format.desc}</div>
                        </div>
                    `)}
                </div>
            </div>

            <!-- Session Durations -->
            <div class="form-section">
                <div class="form-section-title">⏱️ Session Durations</div>
                <div class="form-hint">
                    Select all session lengths you want to offer.
                </div>

                <div class="language-grid">
                    ${SESSION_DURATIONS.map(dur => html`
                        <button
                            key=${dur.value}
                            type="button"
                            class="language-option ${data.session_durations.includes(dur.value) ? 'selected' : ''}"
                            onClick=${() => toggleDuration(dur.value)}
                        >
                            <span class="language-flag">⏰</span>
                            <span class="language-name">${dur.label}</span>
                        </button>
                    `)}
                </div>
            </div>

            <!-- Pricing -->
            <div class="form-section">
                <div class="form-section-title">💰 Your Hourly Rate</div>
                <div class="form-hint">
                    Set your base hourly rate. You can create packages later.
                </div>

                <div class="pricing-input-group">
                    <span class="currency-prefix">€</span>
                    <input
                        type="number"
                        class="premium-input pricing-input"
                        placeholder="75"
                        min="0"
                        value=${data.hourly_rate}
                        onInput=${(e) => updateData('hourly_rate', e.target.value)}
                    />
                    <span class="pricing-suffix">per hour</span>
                </div>

                ${hourlyRate > 0 && html`
                    <div class="pricing-breakdown">
                        <div class="pricing-breakdown-title">Earnings Breakdown</div>
                        <div class="pricing-row">
                            <span>Client pays</span>
                            <span>€${hourlyRate.toFixed(2)}</span>
                        </div>
                        <div class="pricing-row">
                            <span>Platform fee (15%)</span>
                            <span>-€${platformFee}</span>
                        </div>
                        <div class="pricing-row total">
                            <span>You receive</span>
                            <span>€${netEarnings}</span>
                        </div>
                    </div>
                `}
            </div>
        </div>
    `;
};

// ============================================================================
// STEP 4: LAUNCH
// ============================================================================

const StepLaunch = ({ data, loading, onComplete }) => {
    const languageNames = (data.languages || [])
        .map(code => LANGUAGE_FLAGS.find(l => l.code === code))
        .filter(Boolean)
        .map(l => `${l.flag} ${l.name}`);

    return html`
        <div class="slide-up">
            <div class="completion-screen">
                <div class="completion-icon">🎉</div>

                <h2 class="completion-title">You're Almost Live!</h2>
                <p class="completion-subtitle">
                    Review your profile below. Once you launch, clients will be able to discover
                    and book sessions with you.
                </p>

                <!-- Profile Preview -->
                <div class="profile-preview">
                    <div class="preview-header">
                        ${data.avatar_url ? html`
                            <img src=${data.avatar_url} alt="Profile" class="preview-avatar" />
                        ` : html`
                            <div class="preview-avatar-placeholder">👤</div>
                        `}
                        <div class="preview-info">
                            <h3 class="preview-name">${data.full_name || 'Your Name'}</h3>
                            <p class="preview-title">${data.professional_title || 'Your Title'}</p>
                            <div class="preview-meta">
                                ${data.location_city && html`<span>📍 ${data.location_city}${data.location_country ? `, ${data.location_country}` : ''}</span>`}
                                ${data.years_experience && html`<span>🏆 ${data.years_experience} years</span>`}
                            </div>
                        </div>
                    </div>

                    ${data.bio && html`
                        <p class="preview-bio">${data.bio}</p>
                    `}

                    ${data.specialties.length > 0 && html`
                        <div class="preview-tags">
                            ${data.specialties.map(s => html`
                                <span key=${s} class="preview-tag">${s}</span>
                            `)}
                        </div>
                    `}

                    ${languageNames.length > 0 && html`
                        <p style="font-size: 0.9rem; color: var(--petrol-600); margin-bottom: 1rem;">
                            <strong>Languages:</strong> ${languageNames.join(', ')}
                        </p>
                    `}

                    ${data.hourly_rate && html`
                        <p class="preview-price">€${data.hourly_rate}/hour</p>
                    `}
                </div>

                <!-- Next Steps Preview -->
                <div class="next-steps">
                    <div class="next-step-card">
                        <div class="next-step-icon">📅</div>
                        <div class="next-step-title">Set Availability</div>
                        <div class="next-step-desc">Add your available time slots</div>
                    </div>
                    <div class="next-step-card">
                        <div class="next-step-icon">✅</div>
                        <div class="next-step-title">Get Verified</div>
                        <div class="next-step-desc">Boost trust with a verified badge</div>
                    </div>
                    <div class="next-step-card">
                        <div class="next-step-icon">📣</div>
                        <div class="next-step-title">Share Profile</div>
                        <div class="next-step-desc">Spread the word on social media</div>
                    </div>
                </div>

                <button
                    class="btn-primary btn-success"
                    style="font-size: 1.25rem; padding: 1.25rem 3rem; margin-top: 1rem;"
                    onClick=${onComplete}
                    disabled=${loading}
                >
                    ${loading ? 'Launching...' : '🚀 Launch My Profile'}
                </button>
            </div>
        </div>
    `;
};

export default PremiumCoachOnboarding;
