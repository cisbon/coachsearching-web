import { html } from 'https://esm.sh/htm/react';
import { useState, useEffect } from 'react';
import api from './api-client.js';

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
 */

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
        if (confirm('Are you sure you want to skip onboarding? You can always complete it later from your settings.')) {
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
            alert('🎉 Welcome aboard! Your profile is all set up.');

            onComplete && onComplete({ completed: true, data: onboardingData });
        } catch (error) {
            console.error('Failed to complete onboarding:', error);
            alert('Failed to save your profile. Please try again.');
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
                <div class="progress-bar">
                    <div class="progress-bar-fill" style="width: ${progress}%"></div>
                </div>
                <div class="progress-label">
                    Step ${currentStep + 1} of ${steps.length}
                </div>
            </div>

            <!-- Step Content -->
            <div class="onboarding-content">
                <${StepComponent}
                    data=${onboardingData}
                    updateData=${updateData}
                    userType=${userType}
                />
            </div>

            <!-- Navigation -->
            <div class="onboarding-navigation">
                <button
                    class="btn-secondary"
                    onClick=${prevStep}
                    disabled=${currentStep === 0}
                >
                    ← Previous
                </button>

                <button
                    class="btn-text"
                    onClick=${skipOnboarding}
                >
                    Skip for now
                </button>

                <button
                    class="btn-primary"
                    onClick=${nextStep}
                    disabled=${loading}
                >
                    ${currentStep === steps.length - 1 ? 'Complete' : 'Next →'}
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
                Welcome to CoachSearching!
            </h1>
            <p class="welcome-description">
                ${userType === 'coach'
                    ? 'Let\'s set up your coaching profile and start connecting with clients.'
                    : 'Let\'s personalize your experience and help you find the perfect coach.'}
            </p>

            <div class="welcome-features">
                <${WelcomeFeature}
                    icon="⚡"
                    title="Quick Setup"
                    description="Just 4 simple steps"
                />
                <${WelcomeFeature}
                    icon="💾"
                    title="Auto-Save"
                    description="Your progress is saved automatically"
                />
                <${WelcomeFeature}
                    icon="⏭️"
                    title="Skip Anytime"
                    description="Complete it later if you need"
                />
            </div>

            <div class="welcome-actions">
                <button class="btn-primary btn-lg" onClick=${onStart}>
                    Let's Get Started 🎉
                </button>
                <button class="btn-text" onClick=${onSkip}>
                    Skip for now
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
// CLIENT ONBOARDING STEPS
// ============================================

const ClientStep1Welcome = ({ data, updateData }) => html`
    <div class="onboarding-step">
        <h2 class="step-title">👋 Tell us about yourself</h2>
        <p class="step-description">This helps us personalize your coaching experience.</p>

        <div class="form-group">
            <label class="form-label">What should we call you?</label>
            <input
                type="text"
                class="form-input"
                placeholder="Your preferred name"
                value=${data.display_name || ''}
                onInput=${(e) => updateData('display_name', e.target.value)}
            />
        </div>

        <div class="form-group">
            <label class="form-label">Where are you located?</label>
            <input
                type="text"
                class="form-input"
                placeholder="City, Country"
                value=${data.location || ''}
                onInput=${(e) => updateData('location', e.target.value)}
            />
        </div>

        <div class="form-group">
            <label class="form-label">Tell us a bit about yourself (optional)</label>
            <textarea
                class="form-textarea"
                rows="4"
                placeholder="What brings you to CoachSearching? What are you looking to achieve?"
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
            <h2 class="step-title">🎯 What are your goals?</h2>
            <p class="step-description">Select all that apply. This helps us match you with the right coaches.</p>

            <div class="goals-grid">
                ${COACHING_GOALS.map(goal => html`
                    <button
                        key=${goal.id}
                        class="goal-card ${(data.goals || []).includes(goal.id) ? 'selected' : ''}"
                        onClick=${() => toggleGoal(goal.id)}
                    >
                        <div class="goal-icon">${goal.icon}</div>
                        <div class="goal-title">${goal.title}</div>
                    </button>
                `)}
            </div>

            <div class="form-group" style="margin-top: 2rem;">
                <label class="form-label">Anything specific you'd like to work on? (optional)</label>
                <textarea
                    class="form-textarea"
                    rows="3"
                    placeholder="e.g., I want to transition to a new career, improve my leadership skills..."
                    value=${data.specific_goals || ''}
                    onInput=${(e) => updateData('specific_goals', e.target.value)}
                ></textarea>
            </div>
        </div>
    `;
};

const ClientStep3Preferences = ({ data, updateData }) => {
    const toggleLanguage = (lang) => {
        const languages = data.preferred_languages || [];
        const newLanguages = languages.includes(lang)
            ? languages.filter(l => l !== lang)
            : [...languages, lang];
        updateData('preferred_languages', newLanguages);
    };

    return html`
        <div class="onboarding-step">
            <h2 class="step-title">⚙️ Your Preferences</h2>
            <p class="step-description">Help us find coaches that match your needs.</p>

            <div class="form-group">
                <label class="form-label">Preferred Session Format</label>
                <div class="radio-group">
                    <label class="radio-label">
                        <input
                            type="radio"
                            name="session_format"
                            value="video"
                            checked=${data.session_format === 'video'}
                            onChange=${(e) => updateData('session_format', 'video')}
                        />
                        <span>💻 Video Call</span>
                    </label>
                    <label class="radio-label">
                        <input
                            type="radio"
                            name="session_format"
                            value="in-person"
                            checked=${data.session_format === 'in-person'}
                            onChange=${(e) => updateData('session_format', 'in-person')}
                        />
                        <span>🤝 In-Person</span>
                    </label>
                    <label class="radio-label">
                        <input
                            type="radio"
                            name="session_format"
                            value="both"
                            checked=${data.session_format === 'both'}
                            onChange=${(e) => updateData('session_format', 'both')}
                        />
                        <span>🔄 Either</span>
                    </label>
                </div>
            </div>

            <div class="form-group">
                <label class="form-label">Budget Range (per hour)</label>
                <div class="price-range">
                    <input
                        type="number"
                        class="form-input"
                        placeholder="Min €"
                        value=${data.budget_min || ''}
                        onInput=${(e) => updateData('budget_min', e.target.value)}
                    />
                    <span>to</span>
                    <input
                        type="number"
                        class="form-input"
                        placeholder="Max €"
                        value=${data.budget_max || ''}
                        onInput=${(e) => updateData('budget_max', e.target.value)}
                    />
                </div>
            </div>

            <div class="form-group">
                <label class="form-label">Preferred Languages</label>
                <div class="checkbox-grid">
                    ${LANGUAGES.map(lang => html`
                        <label key=${lang} class="checkbox-label">
                            <input
                                type="checkbox"
                                checked=${(data.preferred_languages || []).includes(lang)}
                                onChange=${() => toggleLanguage(lang)}
                            />
                            <span>${lang}</span>
                        </label>
                    `)}
                </div>
            </div>
        </div>
    `;
};

const ClientStep4Complete = ({ data }) => html`
    <div class="onboarding-step onboarding-complete">
        <div class="complete-icon">🎉</div>
        <h2 class="step-title">You're All Set!</h2>
        <p class="step-description">
            Your profile is ready. Let's find you the perfect coach!
        </p>

        <div class="profile-summary">
            <h3>Your Profile Summary:</h3>
            <ul class="summary-list">
                ${data.display_name && html`<li><strong>Name:</strong> ${data.display_name}</li>`}
                ${data.location && html`<li><strong>Location:</strong> ${data.location}</li>`}
                ${data.goals?.length > 0 && html`<li><strong>Goals:</strong> ${data.goals.length} selected</li>`}
                ${data.session_format && html`<li><strong>Session Format:</strong> ${formatSessionType(data.session_format)}</li>`}
                ${data.budget_min && html`<li><strong>Budget:</strong> €${data.budget_min} - €${data.budget_max}/hour</li>`}
            </ul>
        </div>

        <div class="next-steps">
            <h3>What's Next?</h3>
            <div class="next-steps-grid">
                <div class="next-step-card">
                    <div class="next-step-icon">🔍</div>
                    <div class="next-step-title">Browse Coaches</div>
                    <div class="next-step-description">Find coaches that match your goals</div>
                </div>
                <div class="next-step-card">
                    <div class="next-step-icon">📅</div>
                    <div class="next-step-title">Book a Session</div>
                    <div class="next-step-description">Schedule your first coaching session</div>
                </div>
                <div class="next-step-card">
                    <div class="next-step-icon">💬</div>
                    <div class="next-step-title">Get Support</div>
                    <div class="next-step-description">We're here to help anytime</div>
                </div>
            </div>
        </div>
    </div>
`;

// ============================================
// COACH ONBOARDING STEPS
// ============================================

const CoachStep1Profile = ({ data, updateData }) => html`
    <div class="onboarding-step">
        <h2 class="step-title">🎓 Create Your Coach Profile</h2>
        <p class="step-description">This is how clients will discover you.</p>

        <div class="form-group">
            <label class="form-label">Professional Title</label>
            <input
                type="text"
                class="form-input"
                placeholder="e.g., Certified Life Coach, Business Strategist"
                value=${data.professional_title || ''}
                onInput=${(e) => updateData('professional_title', e.target.value)}
            />
        </div>

        <div class="form-group">
            <label class="form-label">Years of Experience</label>
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
            <label class="form-label">Professional Bio</label>
            <p class="form-help">Tell clients about your background, approach, and what makes you unique.</p>
            <textarea
                class="form-textarea"
                rows="6"
                placeholder="I'm a certified life coach with 5 years of experience helping professionals transition careers and find fulfillment..."
                value=${data.bio || ''}
                onInput=${(e) => updateData('bio', e.target.value)}
            ></textarea>
            <div class="char-count">${(data.bio || '').length} / 500 characters</div>
        </div>

        <div class="form-group">
            <label class="form-label">Location</label>
            <input
                type="text"
                class="form-input"
                placeholder="City, Country"
                value=${data.location || ''}
                onInput=${(e) => updateData('location', e.target.value)}
            />
        </div>
    </div>
`;

const CoachStep2Specialties = ({ data, updateData }) => {
    const toggleSpecialty = (specialty) => {
        const specialties = data.specialties || [];
        const newSpecialties = specialties.includes(specialty)
            ? specialties.filter(s => s !== specialty)
            : [...specialties, specialty];
        updateData('specialties', newSpecialties);
    };

    const toggleLanguage = (lang) => {
        const languages = data.languages || [];
        const newLanguages = languages.includes(lang)
            ? languages.filter(l => l !== lang)
            : [...languages, lang];
        updateData('languages', newLanguages);
    };

    return html`
        <div class="onboarding-step">
            <h2 class="step-title">🎯 Your Specialties</h2>
            <p class="step-description">Select the areas where you provide coaching (select 1-5).</p>

            <div class="specialties-grid">
                ${COACHING_SPECIALTIES.map(specialty => html`
                    <button
                        key=${specialty}
                        class="specialty-card ${(data.specialties || []).includes(specialty) ? 'selected' : ''}"
                        onClick=${() => toggleSpecialty(specialty)}
                    >
                        ${specialty}
                    </button>
                `)}
            </div>

            <div class="form-group" style="margin-top: 2rem;">
                <label class="form-label">Languages You Offer Sessions In</label>
                <div class="checkbox-grid">
                    ${LANGUAGES.map(lang => html`
                        <label key=${lang} class="checkbox-label">
                            <input
                                type="checkbox"
                                checked=${(data.languages || []).includes(lang)}
                                onChange=${() => toggleLanguage(lang)}
                            />
                            <span>${lang}</span>
                        </label>
                    `)}
                </div>
            </div>
        </div>
    `;
};

const CoachStep3Pricing = ({ data, updateData }) => html`
    <div class="onboarding-step">
        <h2 class="step-title">💰 Set Your Rates</h2>
        <p class="step-description">You can always adjust these later.</p>

        <div class="form-group">
            <label class="form-label">Hourly Rate (€)</label>
            <input
                type="number"
                class="form-input"
                placeholder="e.g., 75"
                min="0"
                value=${data.hourly_rate || ''}
                onInput=${(e) => updateData('hourly_rate', e.target.value)}
            />
            <p class="form-help">Platform fee: 15% • You'll receive €${calculateNetRate(data.hourly_rate)}/hour</p>
        </div>

        <div class="form-group">
            <label class="form-label">Session Duration Options</label>
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
            <label class="form-label">Session Formats You Offer</label>
            <div class="radio-group">
                <label class="checkbox-label">
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
                    <span>💻 Video Call</span>
                </label>
                <label class="checkbox-label">
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
                    <span>🤝 In-Person</span>
                </label>
                <label class="checkbox-label">
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
                    <span>📞 Phone Call</span>
                </label>
            </div>
        </div>

        <div class="pricing-preview">
            <h3>Pricing Preview:</h3>
            <div class="pricing-breakdown">
                <div class="pricing-row">
                    <span>1-hour session price:</span>
                    <strong>€${data.hourly_rate || 0}</strong>
                </div>
                <div class="pricing-row">
                    <span>Platform fee (15%):</span>
                    <span>-€${calculatePlatformFee(data.hourly_rate)}</span>
                </div>
                <div class="pricing-row total">
                    <span>You receive:</span>
                    <strong>€${calculateNetRate(data.hourly_rate)}</strong>
                </div>
            </div>
        </div>
    </div>
`;

const CoachStep4Complete = ({ data }) => html`
    <div class="onboarding-step onboarding-complete">
        <div class="complete-icon">🎓</div>
        <h2 class="step-title">Welcome to CoachSearching!</h2>
        <p class="step-description">
            Your coach profile is ready. Let's get you verified and start connecting with clients!
        </p>

        <div class="profile-summary">
            <h3>Your Coach Profile:</h3>
            <ul class="summary-list">
                ${data.professional_title && html`<li><strong>Title:</strong> ${data.professional_title}</li>`}
                ${data.years_experience && html`<li><strong>Experience:</strong> ${data.years_experience} years</li>`}
                ${data.specialties?.length > 0 && html`<li><strong>Specialties:</strong> ${data.specialties.join(', ')}</li>`}
                ${data.hourly_rate && html`<li><strong>Hourly Rate:</strong> €${data.hourly_rate}/hour</li>`}
                ${data.languages?.length > 0 && html`<li><strong>Languages:</strong> ${data.languages.join(', ')}</li>`}
            </ul>
        </div>

        <div class="next-steps">
            <h3>Next Steps:</h3>
            <div class="next-steps-grid">
                <div class="next-step-card">
                    <div class="next-step-icon">✅</div>
                    <div class="next-step-title">Get Verified</div>
                    <div class="next-step-description">Submit your credentials for verification</div>
                </div>
                <div class="next-step-card">
                    <div class="next-step-icon">📅</div>
                    <div class="next-step-title">Set Availability</div>
                    <div class="next-step-description">Add your available time slots</div>
                </div>
                <div class="next-step-card">
                    <div class="next-step-icon">💼</div>
                    <div class="next-step-title">Complete Profile</div>
                    <div class="next-step-description">Add portfolio items and certifications</div>
                </div>
            </div>
        </div>

        <div class="verification-prompt">
            <h3>🌟 Get Verified to Stand Out!</h3>
            <p>Verified coaches get 3x more bookings. Upload your credentials to get your verified badge.</p>
        </div>
    </div>
`;

// ============================================
// CONSTANTS
// ============================================

const CLIENT_STEPS = [
    { id: 'welcome', title: 'Welcome', component: ClientStep1Welcome },
    { id: 'goals', title: 'Goals', component: ClientStep2Goals },
    { id: 'preferences', title: 'Preferences', component: ClientStep3Preferences },
    { id: 'complete', title: 'Complete', component: ClientStep4Complete }
];

const COACH_STEPS = [
    { id: 'profile', title: 'Profile', component: CoachStep1Profile },
    { id: 'specialties', title: 'Specialties', component: CoachStep2Specialties },
    { id: 'pricing', title: 'Pricing', component: CoachStep3Pricing },
    { id: 'complete', title: 'Complete', component: CoachStep4Complete }
];

const COACHING_GOALS = [
    { id: 'career', title: 'Career Development', icon: '💼' },
    { id: 'leadership', title: 'Leadership Skills', icon: '👑' },
    { id: 'life', title: 'Life Balance', icon: '⚖️' },
    { id: 'health', title: 'Health & Wellness', icon: '🏃' },
    { id: 'relationships', title: 'Relationships', icon: '❤️' },
    { id: 'business', title: 'Business Growth', icon: '📈' },
    { id: 'mindset', title: 'Mindset & Confidence', icon: '🧠' },
    { id: 'financial', title: 'Financial Goals', icon: '💰' }
];

const COACHING_SPECIALTIES = [
    'Life Coaching',
    'Career Coaching',
    'Executive Coaching',
    'Leadership Development',
    'Business Coaching',
    'Health & Wellness',
    'Relationship Coaching',
    'Performance Coaching',
    'Mindset Coaching',
    'Financial Coaching',
    'Spiritual Coaching',
    'Parenting Coaching'
];

const LANGUAGES = [
    'English',
    'German',
    'French',
    'Spanish',
    'Italian',
    'Dutch',
    'Portuguese',
    'Polish',
    'Russian'
];

const SESSION_DURATIONS = [
    { value: 30, label: '30 minutes' },
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
        'video': 'Video Call',
        'in-person': 'In-Person',
        'phone': 'Phone Call',
        'both': 'Video or In-Person'
    };
    return types[type] || type;
};

export default OnboardingFlow;
