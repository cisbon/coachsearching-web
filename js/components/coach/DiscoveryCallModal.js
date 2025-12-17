/**
 * DiscoveryCallModal Component
 * Modal for booking free discovery calls with coaches
 */

import htm from '../../vendor/htm.js';
import { t } from '../../i18n.js';

const React = window.React;
const { useState, useEffect } = React;
const html = htm.bind(React.createElement);

/**
 * DiscoveryCallModal Component
 * @param {Object} props
 * @param {Object} props.coach - Coach object
 * @param {function} props.onClose - Close handler
 */
export function DiscoveryCallModal({ coach, onClose }) {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        message: '',
        timePreference: 'flexible'
    });
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

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

    const timePreferenceOptions = [
        { value: 'flexible', label: t('discovery.timeFlexible') || 'Flexible' },
        { value: 'weekday_morning', label: t('discovery.timeWeekdayMorning') || 'Weekday Morning' },
        { value: 'weekday_afternoon', label: t('discovery.timeWeekdayAfternoon') || 'Weekday Afternoon' },
        { value: 'weekday_evening', label: t('discovery.timeWeekdayEvening') || 'Weekday Evening' },
        { value: 'weekend_morning', label: t('discovery.timeWeekendMorning') || 'Weekend Morning' },
        { value: 'weekend_afternoon', label: t('discovery.timeWeekendAfternoon') || 'Weekend Afternoon' }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            setError(t('discovery.errorName') || 'Please enter your name');
            return;
        }
        if (!formData.phone.trim()) {
            setError(t('discovery.errorPhone') || 'Please enter your phone number');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const response = await fetch('/api/discovery-requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    coach_id: coach.id,
                    client_name: formData.name.trim(),
                    client_phone: formData.phone.trim(),
                    client_email: formData.email.trim() || null,
                    client_message: formData.message.trim() || null,
                    time_preference: formData.timePreference
                })
            });

            const result = await response.json();

            if (result.success) {
                setSuccess(true);
            } else {
                setError(result.error?.message || t('discovery.errorGeneric') || 'Something went wrong');
            }
        } catch (err) {
            console.error('Discovery call request error:', err);
            setError(t('discovery.errorNetwork') || 'Network error. Please try again.');
        }

        setSubmitting(false);
    };

    const coachName = coach.full_name || coach.display_name;

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
                        <p>${(t('discovery.successMessage') || '{coachName} will contact you soon!').replace('{coachName}', coachName)}</p>
                        <p>${t('discovery.successFollowUp') || 'Check your phone for their call.'}</p>
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
                        ${(t('discovery.modalIntro') || 'Get a free 15-minute call with {coachName} to discuss your goals.').replace('{coachName}', coachName)}
                    </p>

                    ${error && html`<div class="discovery-error">${error}</div>`}

                    <form onSubmit=${handleSubmit}>
                        <div class="form-group">
                            <label>${t('discovery.yourName') || 'Your Name'} *</label>
                            <input
                                type="text"
                                placeholder=${t('discovery.yourNamePlaceholder') || 'Enter your name'}
                                value=${formData.name}
                                onChange=${(e) => setFormData({...formData, name: e.target.value})}
                                required
                            />
                        </div>

                        <div class="form-group">
                            <label>${t('discovery.phoneNumber') || 'Phone Number'} *</label>
                            <input
                                type="tel"
                                placeholder=${t('discovery.phonePlaceholder') || '+1 234 567 890'}
                                value=${formData.phone}
                                onChange=${(e) => setFormData({...formData, phone: e.target.value})}
                                required
                            />
                        </div>

                        <div class="form-group">
                            <label>${t('discovery.email') || 'Email (optional)'}</label>
                            <input
                                type="email"
                                placeholder=${t('discovery.emailPlaceholder') || 'your@email.com'}
                                value=${formData.email}
                                onChange=${(e) => setFormData({...formData, email: e.target.value})}
                            />
                        </div>

                        <div class="form-group">
                            <label>${t('discovery.preferredTime') || 'Preferred Time'}</label>
                            <select
                                value=${formData.timePreference}
                                onChange=${(e) => setFormData({...formData, timePreference: e.target.value})}
                            >
                                ${timePreferenceOptions.map(opt => html`
                                    <option key=${opt.value} value=${opt.value}>${opt.label}</option>
                                `)}
                            </select>
                        </div>

                        <div class="form-group">
                            <label>${t('discovery.message') || 'Message (optional)'}</label>
                            <textarea
                                placeholder=${t('discovery.messagePlaceholder') || 'Tell the coach about your goals...'}
                                rows="3"
                                value=${formData.message}
                                onChange=${(e) => setFormData({...formData, message: e.target.value})}
                            ></textarea>
                        </div>

                        <div class="discovery-form-actions">
                            <button type="button" class="btn-cancel" onClick=${onClose}>${t('discovery.cancel') || 'Cancel'}</button>
                            <button type="submit" class="btn-primary" disabled=${submitting}>
                                ${submitting ? (t('discovery.submitting') || 'Sending...') : (t('discovery.submit') || 'Request Call')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
}

export default DiscoveryCallModal;
