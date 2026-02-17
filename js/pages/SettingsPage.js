/**
 * Settings & Privacy Page
 * Accessible to signed-in users via /settings
 * Allows changing email, password, notification preferences, and privacy settings.
 */

import htm from '../vendor/htm.js';
import { t } from '../i18n.js';

const React = window.React;
const { useState, useEffect, useCallback } = React;
const html = htm.bind(React.createElement);

// Privacy visibility options
const VISIBILITY_OPTIONS = [
    { value: 'all', label: () => t('settings.visibilityAll') || 'Everyone' },
    { value: 'members', label: () => t('settings.visibilityMembers') || 'Members only' },
    { value: 'connections', label: () => t('settings.visibilityConnections') || 'Connections only' },
];

// Coach profile sections for privacy settings
const COACH_PRIVACY_SECTIONS = [
    { key: 'visibility_main_info', label: () => t('settings.mainInfo') || 'Main Info', desc: () => t('settings.mainInfoDesc') || 'Name, title, location, languages' },
    { key: 'visibility_avatar_banner', label: () => t('settings.avatarBanner') || 'Avatar & Banner Images', desc: () => t('settings.avatarBannerDesc') || 'Profile photo and cover image' },
    { key: 'visibility_activities', label: () => t('settings.activities') || 'Activities', desc: () => t('settings.activitiesDesc') || 'Posts, comments, and shares' },
    { key: 'visibility_highlights', label: () => t('settings.highlights') || 'Highlights', desc: () => t('settings.highlightsDesc') || 'Featured and pinned content' },
    { key: 'visibility_recommendations', label: () => t('settings.recommendations') || 'Recommendations', desc: () => t('settings.recommendationsDesc') || 'Reviews and ratings' },
    { key: 'visibility_experience', label: () => t('settings.experience') || 'Experience', desc: () => t('settings.experienceDesc') || 'Work and coaching experience' },
    { key: 'visibility_education', label: () => t('settings.education') || 'Education', desc: () => t('settings.educationDesc') || 'Education and qualifications' },
    { key: 'visibility_certifications', label: () => t('settings.certifications') || 'Certifications', desc: () => t('settings.certificationsDesc') || 'Professional certifications' },
    { key: 'visibility_skills', label: () => t('settings.skills') || 'Skills', desc: () => t('settings.skillsDesc') || 'Competencies and endorsements' },
    { key: 'visibility_volunteering', label: () => t('settings.volunteering') || 'Volunteering', desc: () => t('settings.volunteeringDesc') || 'Volunteer experience' },
    { key: 'visibility_publications', label: () => t('settings.publications') || 'Publications', desc: () => t('settings.publicationsDesc') || 'Articles and publications' },
];

// Client profile sections (subset relevant to clients)
const CLIENT_PRIVACY_SECTIONS = [
    { key: 'visibility_avatar_banner', label: () => t('settings.avatarBanner') || 'Avatar & Banner Images', desc: () => t('settings.avatarBannerDesc') || 'Profile photo and cover image' },
    { key: 'visibility_activities', label: () => t('settings.activities') || 'Activities', desc: () => t('settings.activitiesDesc') || 'Posts, comments, and shares' },
];

export function SettingsPage({ session }) {
    const [activeTab, setActiveTab] = useState('account');
    const [loading, setLoading] = useState(true);

    // Account settings state
    const [newEmail, setNewEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [emailMessage, setEmailMessage] = useState(null);
    const [passwordMessage, setPasswordMessage] = useState(null);
    const [emailSaving, setEmailSaving] = useState(false);
    const [passwordSaving, setPasswordSaving] = useState(false);

    // Notification settings state
    const [notifications, setNotifications] = useState({
        notify_connection_requests: true,
        notify_messages: true,
        notify_recommendations: true,
        notify_discovery_calls: true,
        notify_platform_updates: true,
        notify_marketing: false,
    });
    const [notifSaving, setNotifSaving] = useState(false);
    const [notifMessage, setNotifMessage] = useState(null);

    // Privacy settings state
    const [privacy, setPrivacy] = useState({
        visibility_main_info: 'all',
        visibility_avatar_banner: 'all',
        visibility_activities: 'all',
        visibility_highlights: 'all',
        visibility_recommendations: 'all',
        visibility_experience: 'all',
        visibility_education: 'all',
        visibility_certifications: 'all',
        visibility_skills: 'all',
        visibility_volunteering: 'all',
        visibility_publications: 'all',
    });
    const [privacySaving, setPrivacySaving] = useState(false);
    const [privacyMessage, setPrivacyMessage] = useState(null);

    const userType = session?.user?.user_metadata?.user_type || 'client';
    const currentEmail = session?.user?.email || '';

    // Load existing settings and privacy on mount
    useEffect(() => {
        if (!session?.user?.id) return;
        const loadData = async () => {
            const supabase = window.supabaseClient;
            if (!supabase) return;

            try {
                // Load settings
                const { data: settingsData } = await supabase
                    .from('cs_settings')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .single();

                if (settingsData) {
                    setNotifications({
                        notify_connection_requests: settingsData.notify_connection_requests,
                        notify_messages: settingsData.notify_messages,
                        notify_recommendations: settingsData.notify_recommendations,
                        notify_discovery_calls: settingsData.notify_discovery_calls,
                        notify_platform_updates: settingsData.notify_platform_updates,
                        notify_marketing: settingsData.notify_marketing,
                    });
                }

                // Load privacy
                const { data: privacyData } = await supabase
                    .from('cs_privacy')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .single();

                if (privacyData) {
                    setPrivacy({
                        visibility_main_info: privacyData.visibility_main_info || 'all',
                        visibility_avatar_banner: privacyData.visibility_avatar_banner || 'all',
                        visibility_activities: privacyData.visibility_activities || 'all',
                        visibility_highlights: privacyData.visibility_highlights || 'all',
                        visibility_recommendations: privacyData.visibility_recommendations || 'all',
                        visibility_experience: privacyData.visibility_experience || 'all',
                        visibility_education: privacyData.visibility_education || 'all',
                        visibility_certifications: privacyData.visibility_certifications || 'all',
                        visibility_skills: privacyData.visibility_skills || 'all',
                        visibility_volunteering: privacyData.visibility_volunteering || 'all',
                        visibility_publications: privacyData.visibility_publications || 'all',
                    });
                }
            } catch {
                // Tables may not exist yet, use defaults
            }
            setLoading(false);
        };
        loadData();
    }, [session?.user?.id]);

    // Handle email change
    const handleEmailChange = async (e) => {
        e.preventDefault();
        if (!newEmail || newEmail === currentEmail) return;
        setEmailSaving(true);
        setEmailMessage(null);
        try {
            const supabase = window.supabaseClient;
            const { error } = await supabase.auth.updateUser({ email: newEmail });
            if (error) {
                setEmailMessage({ type: 'error', text: error.message });
            } else {
                setEmailMessage({ type: 'success', text: t('settings.emailChangeSuccess') || 'Confirmation email sent. Please check your inbox to verify the new email address.' });
                setNewEmail('');
            }
        } catch (err) {
            setEmailMessage({ type: 'error', text: err.message });
        }
        setEmailSaving(false);
    };

    // Handle password change
    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (!newPassword) return;
        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: t('settings.passwordMismatch') || 'Passwords do not match.' });
            return;
        }
        if (newPassword.length < 6) {
            setPasswordMessage({ type: 'error', text: t('settings.passwordTooShort') || 'Password must be at least 6 characters.' });
            return;
        }
        setPasswordSaving(true);
        setPasswordMessage(null);
        try {
            const supabase = window.supabaseClient;
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) {
                setPasswordMessage({ type: 'error', text: error.message });
            } else {
                setPasswordMessage({ type: 'success', text: t('settings.passwordChangeSuccess') || 'Password updated successfully.' });
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            }
        } catch (err) {
            setPasswordMessage({ type: 'error', text: err.message });
        }
        setPasswordSaving(false);
    };

    // Save notification settings
    const handleSaveNotifications = async () => {
        setNotifSaving(true);
        setNotifMessage(null);
        try {
            const supabase = window.supabaseClient;
            const { error } = await supabase
                .from('cs_settings')
                .upsert({
                    user_id: session.user.id,
                    ...notifications,
                }, { onConflict: 'user_id' });
            if (error) {
                setNotifMessage({ type: 'error', text: error.message });
            } else {
                setNotifMessage({ type: 'success', text: t('settings.notifSaved') || 'Notification preferences saved.' });
            }
        } catch (err) {
            setNotifMessage({ type: 'error', text: err.message });
        }
        setNotifSaving(false);
    };

    // Save privacy settings
    const handleSavePrivacy = async () => {
        setPrivacySaving(true);
        setPrivacyMessage(null);
        try {
            const supabase = window.supabaseClient;
            const { error } = await supabase
                .from('cs_privacy')
                .upsert({
                    user_id: session.user.id,
                    ...privacy,
                }, { onConflict: 'user_id' });
            if (error) {
                setPrivacyMessage({ type: 'error', text: error.message });
            } else {
                setPrivacyMessage({ type: 'success', text: t('settings.privacySaved') || 'Privacy settings saved.' });
            }
        } catch (err) {
            setPrivacyMessage({ type: 'error', text: err.message });
        }
        setPrivacySaving(false);
    };

    // Toggle a notification setting
    const toggleNotif = (key) => {
        setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Update a privacy setting
    const updatePrivacy = (key, value) => {
        setPrivacy(prev => ({ ...prev, [key]: value }));
    };

    // Redirect if not signed in
    if (!session?.user) {
        return html`
            <div class="settings-page">
                <div class="settings-container">
                    <div class="settings-not-signed-in">
                        <h2>${t('settings.signInRequired') || 'Sign In Required'}</h2>
                        <p>${t('settings.signInRequiredDesc') || 'Please sign in to access your settings.'}</p>
                        <button class="settings-btn-primary" onClick=${() => window.navigateTo('/login')}>
                            ${t('settings.signIn') || 'Sign In'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    if (loading) {
        return html`
            <div class="settings-page">
                <div class="settings-container">
                    <div class="settings-loading">
                        <div class="settings-loading-spinner"></div>
                    </div>
                </div>
            </div>
        `;
    }

    const privacySections = (userType === 'coach' || userType === 'business')
        ? COACH_PRIVACY_SECTIONS
        : CLIENT_PRIVACY_SECTIONS;

    return html`
        <div class="settings-page">
            <div class="settings-container">
                <h1 class="settings-page-title">${t('settings.title') || 'Settings & Privacy'}</h1>

                <!-- Tab Navigation -->
                <div class="settings-tabs">
                    <button
                        class="settings-tab ${activeTab === 'account' ? 'active' : ''}"
                        onClick=${() => setActiveTab('account')}
                    >
                        ${t('settings.account') || 'Account'}
                    </button>
                    <button
                        class="settings-tab ${activeTab === 'notifications' ? 'active' : ''}"
                        onClick=${() => setActiveTab('notifications')}
                    >
                        ${t('settings.notifications') || 'Notifications'}
                    </button>
                    <button
                        class="settings-tab ${activeTab === 'privacy' ? 'active' : ''}"
                        onClick=${() => setActiveTab('privacy')}
                    >
                        ${t('settings.privacy') || 'Privacy'}
                    </button>
                </div>

                <!-- Account Tab -->
                ${activeTab === 'account' && html`
                    <div class="settings-section">
                        <!-- Change Email -->
                        <div class="settings-card">
                            <h3 class="settings-card-title">${t('settings.changeEmail') || 'Change Email'}</h3>
                            <p class="settings-card-desc">${t('settings.currentEmail') || 'Current email'}: <strong>${currentEmail}</strong></p>
                            <form onSubmit=${handleEmailChange} class="settings-form">
                                <div class="settings-field">
                                    <label>${t('settings.newEmail') || 'New Email Address'}</label>
                                    <input
                                        type="email"
                                        value=${newEmail}
                                        onInput=${(e) => setNewEmail(e.target.value)}
                                        placeholder=${t('settings.newEmailPlaceholder') || 'Enter new email address'}
                                        required
                                    />
                                </div>
                                ${emailMessage && html`
                                    <div class="settings-message ${emailMessage.type}">${emailMessage.text}</div>
                                `}
                                <button type="submit" class="settings-btn-primary" disabled=${emailSaving || !newEmail}>
                                    ${emailSaving ? (t('settings.saving') || 'Saving...') : (t('settings.updateEmail') || 'Update Email')}
                                </button>
                            </form>
                        </div>

                        <!-- Change Password -->
                        <div class="settings-card">
                            <h3 class="settings-card-title">${t('settings.changePassword') || 'Change Password'}</h3>
                            <form onSubmit=${handlePasswordChange} class="settings-form">
                                <div class="settings-field">
                                    <label>${t('settings.newPassword') || 'New Password'}</label>
                                    <input
                                        type="password"
                                        value=${newPassword}
                                        onInput=${(e) => setNewPassword(e.target.value)}
                                        placeholder=${t('settings.newPasswordPlaceholder') || 'Enter new password'}
                                        required
                                        minLength="6"
                                    />
                                </div>
                                <div class="settings-field">
                                    <label>${t('settings.confirmPassword') || 'Confirm New Password'}</label>
                                    <input
                                        type="password"
                                        value=${confirmPassword}
                                        onInput=${(e) => setConfirmPassword(e.target.value)}
                                        placeholder=${t('settings.confirmPasswordPlaceholder') || 'Confirm new password'}
                                        required
                                        minLength="6"
                                    />
                                </div>
                                ${passwordMessage && html`
                                    <div class="settings-message ${passwordMessage.type}">${passwordMessage.text}</div>
                                `}
                                <button type="submit" class="settings-btn-primary" disabled=${passwordSaving || !newPassword || !confirmPassword}>
                                    ${passwordSaving ? (t('settings.saving') || 'Saving...') : (t('settings.updatePassword') || 'Update Password')}
                                </button>
                            </form>
                        </div>
                    </div>
                `}

                <!-- Notifications Tab -->
                ${activeTab === 'notifications' && html`
                    <div class="settings-section">
                        <div class="settings-card">
                            <h3 class="settings-card-title">${t('settings.emailNotifications') || 'Email Notifications'}</h3>
                            <p class="settings-card-desc">${t('settings.emailNotificationsDesc') || 'Choose which emails you receive from CoachSearching.'}</p>

                            <div class="settings-toggle-list">
                                <div class="settings-toggle-item">
                                    <div class="settings-toggle-info">
                                        <div class="settings-toggle-label">${t('settings.notifConnections') || 'Connection Requests'}</div>
                                        <div class="settings-toggle-desc">${t('settings.notifConnectionsDesc') || 'When someone sends you a connection request'}</div>
                                    </div>
                                    <button
                                        class="settings-toggle ${notifications.notify_connection_requests ? 'on' : ''}"
                                        onClick=${() => toggleNotif('notify_connection_requests')}
                                        role="switch"
                                        aria-checked=${notifications.notify_connection_requests}
                                    >
                                        <span class="settings-toggle-knob"></span>
                                    </button>
                                </div>

                                <div class="settings-toggle-item">
                                    <div class="settings-toggle-info">
                                        <div class="settings-toggle-label">${t('settings.notifMessages') || 'Messages'}</div>
                                        <div class="settings-toggle-desc">${t('settings.notifMessagesDesc') || 'When you receive a new message'}</div>
                                    </div>
                                    <button
                                        class="settings-toggle ${notifications.notify_messages ? 'on' : ''}"
                                        onClick=${() => toggleNotif('notify_messages')}
                                        role="switch"
                                        aria-checked=${notifications.notify_messages}
                                    >
                                        <span class="settings-toggle-knob"></span>
                                    </button>
                                </div>

                                <div class="settings-toggle-item">
                                    <div class="settings-toggle-info">
                                        <div class="settings-toggle-label">${t('settings.notifRecommendations') || 'Recommendations'}</div>
                                        <div class="settings-toggle-desc">${t('settings.notifRecommendationsDesc') || 'When someone writes you a recommendation'}</div>
                                    </div>
                                    <button
                                        class="settings-toggle ${notifications.notify_recommendations ? 'on' : ''}"
                                        onClick=${() => toggleNotif('notify_recommendations')}
                                        role="switch"
                                        aria-checked=${notifications.notify_recommendations}
                                    >
                                        <span class="settings-toggle-knob"></span>
                                    </button>
                                </div>

                                <div class="settings-toggle-item">
                                    <div class="settings-toggle-info">
                                        <div class="settings-toggle-label">${t('settings.notifDiscoveryCalls') || 'Discovery Calls'}</div>
                                        <div class="settings-toggle-desc">${t('settings.notifDiscoveryCallsDesc') || 'When someone books a discovery call with you'}</div>
                                    </div>
                                    <button
                                        class="settings-toggle ${notifications.notify_discovery_calls ? 'on' : ''}"
                                        onClick=${() => toggleNotif('notify_discovery_calls')}
                                        role="switch"
                                        aria-checked=${notifications.notify_discovery_calls}
                                    >
                                        <span class="settings-toggle-knob"></span>
                                    </button>
                                </div>

                                <div class="settings-toggle-item">
                                    <div class="settings-toggle-info">
                                        <div class="settings-toggle-label">${t('settings.notifPlatformUpdates') || 'Platform Updates'}</div>
                                        <div class="settings-toggle-desc">${t('settings.notifPlatformUpdatesDesc') || 'News and updates about CoachSearching'}</div>
                                    </div>
                                    <button
                                        class="settings-toggle ${notifications.notify_platform_updates ? 'on' : ''}"
                                        onClick=${() => toggleNotif('notify_platform_updates')}
                                        role="switch"
                                        aria-checked=${notifications.notify_platform_updates}
                                    >
                                        <span class="settings-toggle-knob"></span>
                                    </button>
                                </div>

                                <div class="settings-toggle-item">
                                    <div class="settings-toggle-info">
                                        <div class="settings-toggle-label">${t('settings.notifMarketing') || 'Marketing Emails'}</div>
                                        <div class="settings-toggle-desc">${t('settings.notifMarketingDesc') || 'Promotional content and special offers'}</div>
                                    </div>
                                    <button
                                        class="settings-toggle ${notifications.notify_marketing ? 'on' : ''}"
                                        onClick=${() => toggleNotif('notify_marketing')}
                                        role="switch"
                                        aria-checked=${notifications.notify_marketing}
                                    >
                                        <span class="settings-toggle-knob"></span>
                                    </button>
                                </div>
                            </div>

                            ${notifMessage && html`
                                <div class="settings-message ${notifMessage.type}">${notifMessage.text}</div>
                            `}
                            <button class="settings-btn-primary" onClick=${handleSaveNotifications} disabled=${notifSaving}>
                                ${notifSaving ? (t('settings.saving') || 'Saving...') : (t('settings.saveNotifications') || 'Save Preferences')}
                            </button>
                        </div>
                    </div>
                `}

                <!-- Privacy Tab -->
                ${activeTab === 'privacy' && html`
                    <div class="settings-section">
                        <div class="settings-card">
                            <h3 class="settings-card-title">${t('settings.profileVisibility') || 'Profile Visibility'}</h3>
                            <p class="settings-card-desc">${t('settings.profileVisibilityDesc') || 'Control who can see each section of your profile.'}</p>

                            <div class="settings-privacy-list">
                                ${privacySections.map(section => html`
                                    <div class="settings-privacy-item" key=${section.key}>
                                        <div class="settings-privacy-info">
                                            <div class="settings-privacy-label">${section.label()}</div>
                                            <div class="settings-privacy-desc">${section.desc()}</div>
                                        </div>
                                        <select
                                            class="settings-privacy-select"
                                            value=${privacy[section.key]}
                                            onChange=${(e) => updatePrivacy(section.key, e.target.value)}
                                        >
                                            ${VISIBILITY_OPTIONS.map(opt => html`
                                                <option key=${opt.value} value=${opt.value}>${opt.label()}</option>
                                            `)}
                                        </select>
                                    </div>
                                `)}
                            </div>

                            ${privacyMessage && html`
                                <div class="settings-message ${privacyMessage.type}">${privacyMessage.text}</div>
                            `}
                            <button class="settings-btn-primary" onClick=${handleSavePrivacy} disabled=${privacySaving}>
                                ${privacySaving ? (t('settings.saving') || 'Saving...') : (t('settings.savePrivacy') || 'Save Privacy Settings')}
                            </button>
                        </div>
                    </div>
                `}
            </div>
        </div>
    `;
}

export default SettingsPage;
