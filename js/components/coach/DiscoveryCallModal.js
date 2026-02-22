/**
 * DiscoveryCallModal Component
 * Modal for booking free chemistry/discovery calls with coaches.
 * Supports both signed-in users and guests (auto-creates account for guests).
 * Persists form data to localStorage so users don't re-enter info across coaches.
 */

import htm from '../../vendor/htm.js';
import { t, getCurrentLang } from '../../i18n.js';
import { useLookupOptions } from '../../context/AppContext.js';

const React = window.React;
const { useState, useEffect, useMemo, useCallback, useRef } = React;
const html = htm.bind(React.createElement);

const STORAGE_KEY = 'cs_chemistry_call_form';

/**
 * Load saved form data from localStorage
 */
function loadSavedFormData() {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {
        // ignore
    }
    return null;
}

/**
 * Save form data to localStorage (excludes passwords)
 */
function saveFormData(data) {
    try {
        const toSave = {
            name: data.name || '',
            phone: data.phone || '',
            email: data.email || '',
            specialties: data.specialties || [],
            goal: data.goal || '',
        };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
        // ignore
    }
}

/**
 * Show a DOM-based toast notification (used after redirect)
 */
function showGlobalToast(message) {
    let container = document.getElementById('feed-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'feed-toast-container';
        container.className = 'feed-toast-container';
        document.body.appendChild(container);
    }
    container.textContent = message;
    container.classList.add('visible');
    setTimeout(() => {
        container.classList.remove('visible');
    }, 5000);
}

/**
 * DiscoveryCallModal Component
 * @param {Object} props
 * @param {Object} props.coach - Coach object
 * @param {Object} props.session - User session (null if guest)
 * @param {function} props.onClose - Close handler
 */
export function DiscoveryCallModal({ coach, session, onClose }) {
    const { lookupOptions, getLocalizedName } = useLookupOptions();
    const specialties = lookupOptions?.specialties || [];

    const isGuest = !session?.user;

    // Build initial form state: session data > localStorage > empty
    const [formData, setFormData] = useState(() => {
        const saved = loadSavedFormData();
        return {
            name: session?.user?.user_metadata?.full_name || saved?.name || '',
            phone: saved?.phone || '',
            email: session?.user?.email || saved?.email || '',
            specialties: saved?.specialties || [],
            goal: saved?.goal || '',
            password: '',
            confirmPassword: '',
        };
    });
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    // Save form data to localStorage whenever it changes (excludes passwords)
    const formDataRef = useRef(formData);
    formDataRef.current = formData;
    useEffect(() => {
        saveFormData(formDataRef.current);
    }, [formData.name, formData.phone, formData.email, formData.specialties, formData.goal]);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    const handleBackdropClick = (e) => {
        if (e.target.classList.contains('discovery-modal-overlay')) {
            onClose();
        }
    };

    const toggleSpecialty = useCallback((code) => {
        setFormData(prev => {
            const current = prev.specialties;
            const updated = current.includes(code)
                ? current.filter(s => s !== code)
                : [...current, code];
            return { ...prev, specialties: updated };
        });
    }, []);

    const getSpecialtyDisplayName = useCallback((code) => {
        const s = specialties.find(sp => sp.code === code);
        return s ? String(getLocalizedName(s)) : String(code);
    }, [specialties, getLocalizedName]);

    const getSpecialtyIcon = useCallback((code) => {
        const s = specialties.find(sp => sp.code === code);
        return s?.icon || '🎯';
    }, [specialties]);

    // Validate form
    const validate = () => {
        if (!formData.name.trim()) {
            setError(t('discovery.errorName') || 'Please enter your name');
            return false;
        }
        if (!formData.phone.trim()) {
            setError(t('discovery.errorPhone') || 'Please enter your phone number');
            return false;
        }
        if (!formData.email.trim()) {
            setError(t('discovery.errorEmail') || 'Please enter your email address');
            return false;
        }
        // Basic email format check
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
            setError(t('discovery.errorEmailInvalid') || 'Please enter a valid email address');
            return false;
        }
        if (formData.specialties.length === 0) {
            setError(t('discovery.errorSpecialties') || 'Please select at least one coaching type');
            return false;
        }
        if (!formData.goal.trim()) {
            setError(t('discovery.errorGoal') || 'Please describe your coaching goal');
            return false;
        }
        if (isGuest) {
            if (!formData.password) {
                setError(t('discovery.errorPassword') || 'Please enter a password');
                return false;
            }
            if (formData.password.length < 6) {
                setError(t('discovery.errorPasswordLength') || 'Password must be at least 6 characters');
                return false;
            }
            if (formData.password !== formData.confirmPassword) {
                setError(t('discovery.errorPasswordMatch') || 'Passwords do not match');
                return false;
            }
        }
        return true;
    };

    const coachName = coach.full_name || coach.display_name;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!validate()) return;

        setSubmitting(true);

        try {
            const supabase = window.supabaseClient;
            if (!supabase) throw new Error('Service unavailable');

            let userId;

            if (isGuest) {
                // Register new user account
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email: formData.email.trim(),
                    password: formData.password,
                    options: {
                        data: {
                            full_name: formData.name.trim(),
                            user_type: 'client',
                        }
                    }
                });

                if (signUpError) {
                    if (signUpError.message?.includes('already registered')) {
                        setError(t('discovery.errorEmailExists') || 'This email is already registered. Please sign in first.');
                    } else {
                        setError(signUpError.message || t('discovery.errorGeneric') || 'Something went wrong');
                    }
                    setSubmitting(false);
                    return;
                }

                userId = signUpData.user?.id;
                if (!userId) {
                    setError(t('discovery.errorGeneric') || 'Something went wrong');
                    setSubmitting(false);
                    return;
                }
            } else {
                userId = session.user.id;
            }

            // Insert chemistry call request
            const { error: insertError } = await supabase
                .from('cs_chemistry_call_requests')
                .insert({
                    user_id: userId,
                    coach_id: coach.user_id || coach.id,
                    name: formData.name.trim(),
                    phone: formData.phone.trim(),
                    email: formData.email.trim(),
                    specialties: formData.specialties,
                    goal: formData.goal.trim(),
                });

            if (insertError) {
                console.error('Chemistry call insert error:', insertError);
                setError(t('discovery.errorGeneric') || 'Something went wrong');
                setSubmitting(false);
                return;
            }

            // Send email notification to coach via PHP API
            try {
                await fetch('/api/chemistry-call-notify.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        coach_id: coach.user_id || coach.id,
                        client_name: formData.name.trim(),
                        client_phone: formData.phone.trim(),
                        client_email: formData.email.trim(),
                        specialties: formData.specialties,
                        goal: formData.goal.trim(),
                    })
                });
            } catch (emailErr) {
                // Email notification failure is non-blocking
                console.warn('Email notification failed:', emailErr);
            }

            // For guests: redirect to /feed with toast message
            if (isGuest) {
                const toastMsg = (t('discovery.successToast') || 'Successfully sent a chemistry call request to {coachName}').replace('{coachName}', coachName);
                onClose();
                window.navigateTo('/feed');
                // Small delay to let route render, then show toast
                setTimeout(() => showGlobalToast(toastMsg), 300);
                return;
            }

            setSuccess(true);
        } catch (err) {
            console.error('Discovery call request error:', err);
            setError(t('discovery.errorNetwork') || 'Network error. Please try again.');
        }

        setSubmitting(false);
    };

    if (success) {
        return html`
            <div class="discovery-modal-overlay" onClick=${handleBackdropClick}>
                <div class="discovery-modal-container">
                    <div class="discovery-modal-header">
                        <h3>${t('discovery.successTitle') || 'Request Sent!'}</h3>
                        <button class="discovery-modal-close" onClick=${onClose}>✕</button>
                    </div>
                    <div class="discovery-modal-content success-content">
                        <div class="success-icon">✓</div>
                        <p>${(t('discovery.successMessage') || 'Your discovery call request has been sent to {coachName}.').replace('{coachName}', coachName)}</p>
                        <p>${t('discovery.successFollowUp') || 'They will contact you soon at the phone number you provided.'}</p>
                        <button class="btn-primary" onClick=${onClose}>${t('discovery.close') || 'Close'}</button>
                    </div>
                </div>
            </div>
        `;
    }

    return html`
        <div class="discovery-modal-overlay" onClick=${handleBackdropClick}>
            <div class="discovery-modal-container">
                <div class="discovery-modal-header">
                    <h3>${t('discovery.modalTitle') || 'Book a Free Discovery Call'}</h3>
                    <button class="discovery-modal-close" onClick=${onClose}>✕</button>
                </div>
                <div class="discovery-modal-content">
                    <p class="discovery-intro">
                        ${(t('discovery.modalIntro') || 'Get to know {coachName} with a free discovery call. Share your contact info and preferred time, and they\'ll reach out to schedule.').replace('{coachName}', coachName)}
                    </p>

                    ${error && html`<div class="discovery-error">${error}</div>`}

                    <form onSubmit=${handleSubmit}>
                        <!-- Name -->
                        <div class="form-group">
                            <label>${t('discovery.yourName') || 'Your Name'} *</label>
                            <input
                                type="text"
                                placeholder=${t('discovery.yourNamePlaceholder') || 'Enter your full name'}
                                value=${formData.name}
                                onInput=${(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                                required
                            />
                        </div>

                        <!-- Phone -->
                        <div class="form-group">
                            <label>${t('discovery.phoneNumber') || 'Phone Number'} *</label>
                            <input
                                type="tel"
                                placeholder=${t('discovery.phonePlaceholder') || 'Your phone number'}
                                value=${formData.phone}
                                onInput=${(e) => setFormData(prev => ({...prev, phone: e.target.value}))}
                                required
                            />
                        </div>

                        <!-- Email (required) -->
                        <div class="form-group">
                            <label>${t('discovery.emailRequired') || 'Email'} *</label>
                            <input
                                type="email"
                                placeholder=${t('discovery.emailPlaceholder') || 'Your email address'}
                                value=${formData.email}
                                onInput=${(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                                required
                                disabled=${!isGuest && !!session?.user?.email}
                            />
                        </div>

                        <!-- Coaching Type / Specialties -->
                        <div class="form-group">
                            <label>${t('discovery.coachingType') || 'Coaching Type'} *</label>
                            ${formData.specialties.length > 0 && html`
                                <div class="selected-pills">
                                    ${formData.specialties.map(code => html`
                                        <span key=${code} class="specialty-pill-inline">
                                            ${getSpecialtyDisplayName(code)}
                                            <button type="button" class="pill-remove" onClick=${() => toggleSpecialty(code)}>×</button>
                                        </span>
                                    `)}
                                </div>
                            `}
                            <div class="specialty-grid-inline">
                                ${specialties.map(s => {
                                    const isSel = formData.specialties.includes(s.code);
                                    return html`
                                        <button key=${s.code} type="button" class="specialty-option-inline ${isSel ? 'selected' : ''}" onClick=${() => toggleSpecialty(s.code)}>
                                            <span>${String(s.icon || '🎯')}</span>
                                            <span>${String(getLocalizedName(s))}</span>
                                        </button>
                                    `;
                                })}
                            </div>
                        </div>

                        <!-- Goal Description -->
                        <div class="form-group">
                            <label>${t('discovery.goalDescription') || 'What do you want to achieve?'} *</label>
                            <textarea
                                placeholder=${t('discovery.goalPlaceholder') || 'Describe your coaching goals and what you hope to achieve...'}
                                rows="3"
                                value=${formData.goal}
                                onInput=${(e) => setFormData(prev => ({...prev, goal: e.target.value}))}
                                required
                            ></textarea>
                        </div>

                        <!-- Password fields (guests only) -->
                        ${isGuest && html`
                            <div class="discovery-account-note">
                                <p class="discovery-account-note-text">
                                    ${t('discovery.accountNote') || 'An account will be created for you so you can track your request.'}
                                </p>
                                <div class="form-group">
                                    <label>${t('discovery.password') || 'Password'} *</label>
                                    <input
                                        type="password"
                                        placeholder=${t('discovery.passwordPlaceholder') || 'Choose a password (min 6 characters)'}
                                        value=${formData.password}
                                        onInput=${(e) => setFormData(prev => ({...prev, password: e.target.value}))}
                                        required
                                        minLength="6"
                                    />
                                </div>
                                <div class="form-group">
                                    <label>${t('discovery.confirmPassword') || 'Confirm Password'} *</label>
                                    <input
                                        type="password"
                                        placeholder=${t('discovery.confirmPasswordPlaceholder') || 'Confirm your password'}
                                        value=${formData.confirmPassword}
                                        onInput=${(e) => setFormData(prev => ({...prev, confirmPassword: e.target.value}))}
                                        required
                                    />
                                </div>
                            </div>
                        `}

                        <div class="discovery-form-actions">
                            <button type="button" class="btn-cancel" onClick=${onClose}>${t('discovery.cancel') || 'Cancel'}</button>
                            <button type="submit" class="btn-primary" disabled=${submitting}>
                                ${submitting ? (t('discovery.submitting') || 'Sending...') : (t('discovery.submit') || 'Request Discovery Call')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
}

export default DiscoveryCallModal;
