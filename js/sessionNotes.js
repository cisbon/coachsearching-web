// sessionNotes.js - Session Notes & Progress Tracking Components
// Import in app.js with: import { SessionNotesWizard, SessionNotesDashboard } from './sessionNotes.js';

import htm from './vendor/htm.js';

const React = window.React;
const { useState, useEffect, useRef } = React;
const html = htm.bind(React.createElement);

const API_BASE = 'https://clouedo.com/coachsearching/api';

// =====================================================
// CONSTANTS & DATA
// =====================================================

const MOOD_OPTIONS = [
    { value: 'energized', label: 'Energized', emoji: '⚡', color: '#10B981' },
    { value: 'positive', label: 'Positive', emoji: '😊', color: '#06B6D4' },
    { value: 'neutral', label: 'Neutral', emoji: '😐', color: '#6B7280' },
    { value: 'stressed', label: 'Stressed', emoji: '😰', color: '#F59E0B' },
    { value: 'low', label: 'Low Energy', emoji: '😔', color: '#EF4444' }
];

const FOCUS_AREAS = [
    { value: 'career', label: 'Career Development', icon: '💼' },
    { value: 'leadership', label: 'Leadership', icon: '👥' },
    { value: 'relationships', label: 'Relationships', icon: '❤️' },
    { value: 'health', label: 'Health & Wellness', icon: '🏃' },
    { value: 'mindset', label: 'Mindset & Beliefs', icon: '🧠' },
    { value: 'goals', label: 'Goal Setting', icon: '🎯' },
    { value: 'confidence', label: 'Confidence', icon: '💪' },
    { value: 'work_life', label: 'Work-Life Balance', icon: '⚖️' },
    { value: 'communication', label: 'Communication', icon: '💬' },
    { value: 'financial', label: 'Financial', icon: '💰' },
    { value: 'other', label: 'Other', icon: '✨' }
];

const TOPICS_COVERED = [
    'Goal Setting', 'Obstacle Analysis', 'Action Planning', 'Mindset Work',
    'Skill Development', 'Reflection', 'Accountability Check', 'Decision Making',
    'Problem Solving', 'Strategy Session', 'Performance Review', 'Vision Clarity'
];

const COMMON_CHALLENGES = [
    'Time Management', 'Procrastination', 'Self-Doubt', 'Lack of Clarity',
    'Fear of Failure', 'Overwhelm', 'Difficult Conversations', 'Burnout',
    'Imposter Syndrome', 'Conflicting Priorities', 'Lack of Support',
    'Financial Constraints', 'Motivation Issues'
];

const FOLLOW_UP_TYPES = [
    { value: 'email', label: 'Send Email Resources', icon: '📧' },
    { value: 'resources', label: 'Share Materials', icon: '📚' },
    { value: 'homework_check', label: 'Check Homework', icon: '✅' },
    { value: 'accountability', label: 'Accountability Call', icon: '📞' },
    { value: 'none', label: 'No Follow-up Needed', icon: '✓' }
];

// =====================================================
// SESSION NOTES WIZARD - Main Component
// =====================================================

export const SessionNotesWizard = ({ session, bookingId, clientId, clientName, onClose, onSave }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        // Step 1: Overview
        client_mood: '',
        client_energy_level: 3,
        session_focus_areas: [],

        // Step 2: What We Covered
        topics_covered: [],
        key_achievements: [],
        breakthroughs: [],

        // Step 3: Challenges & Insights
        challenges: [],
        insights: [],

        // Step 4: Next Steps
        action_items: [],
        next_session_focus: '',
        follow_up_needed: false,
        follow_up_type: '',

        // Step 5: Summary
        session_effectiveness: 3,
        progress_rating: 3,
        detailed_notes: '',
        private_notes: ''
    });

    const [newAchievement, setNewAchievement] = useState('');
    const [newBreakthrough, setNewBreakthrough] = useState('');
    const [newInsight, setNewInsight] = useState('');
    const [newAction, setNewAction] = useState('');
    const [saving, setSaving] = useState(false);

    const totalSteps = 5;

    const handleNext = () => {
        if (currentStep < totalSteps) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const toggleArrayItem = (field, value) => {
        const current = formData[field];
        if (current.includes(value)) {
            setFormData({ ...formData, [field]: current.filter(item => item !== value) });
        } else {
            setFormData({ ...formData, [field]: [...current, value] });
        }
    };

    const addToArray = (field, value, setterCallback) => {
        if (value.trim()) {
            setFormData({ ...formData, [field]: [...formData[field], value.trim()] });
            setterCallback('');
        }
    };

    const removeFromArray = (field, index) => {
        const newArray = [...formData[field]];
        newArray.splice(index, 1);
        setFormData({ ...formData, [field]: newArray });
    };

    const addActionItem = () => {
        if (newAction.trim()) {
            const newItem = {
                text: newAction.trim(),
                priority: 'medium',
                dueDate: null,
                completed: false
            };
            setFormData({
                ...formData,
                action_items: [...formData.action_items, newItem]
            });
            setNewAction('');
        }
    };

    const removeActionItem = (index) => {
        const newItems = [...formData.action_items];
        newItems.splice(index, 1);
        setFormData({ ...formData, action_items: newItems });
    };

    const handleSave = async (isDraft = false) => {
        setSaving(true);
        try {
            const payload = {
                ...formData,
                booking_id: bookingId,
                client_id: clientId,
                is_draft: isDraft,
                session_date: new Date().toISOString(),
                session_duration: 60 // You can make this dynamic
            };

            const response = await fetch(`${API_BASE}/session-notes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                if (onSave) onSave(data);
                if (!isDraft && onClose) onClose();
            } else {
                alert('Failed to save session notes');
            }
        } catch (error) {
            console.error('Error saving session notes:', error);
            alert('Error saving session notes');
        } finally {
            setSaving(false);
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return renderStep1();
            case 2:
                return renderStep2();
            case 3:
                return renderStep3();
            case 4:
                return renderStep4();
            case 5:
                return renderStep5();
            default:
                return renderStep1();
        }
    };

    // Step 1: Session Overview
    const renderStep1 = () => html`
        <div class="wizard-step">
            <h3 class="step-title">Session Overview</h3>
            <p class="step-subtitle">How was ${clientName} today?</p>

            <div class="form-section">
                <label class="section-label">Client's Mood</label>
                <div class="mood-buttons">
                    ${MOOD_OPTIONS.map(mood => html`
                        <button
                            key=${mood.value}
                            type="button"
                            class="mood-btn ${formData.client_mood === mood.value ? 'selected' : ''}"
                            style=${{ borderColor: formData.client_mood === mood.value ? mood.color : '#E5E7EB' }}
                            onClick=${() => setFormData({ ...formData, client_mood: mood.value })}
                        >
                            <span class="mood-emoji">${mood.emoji}</span>
                            <span class="mood-label">${mood.label}</span>
                        </button>
                    `)}
                </div>
            </div>

            <div class="form-section">
                <label class="section-label">
                    Energy Level: ${formData.client_energy_level}/5
                </label>
                <input
                    type="range"
                    min="1"
                    max="5"
                    value=${formData.client_energy_level}
                    onChange=${(e) => setFormData({ ...formData, client_energy_level: parseInt(e.target.value) })}
                    class="energy-slider"
                />
                <div class="energy-labels">
                    <span>Low</span>
                    <span>Medium</span>
                    <span>High</span>
                </div>
            </div>

            <div class="form-section">
                <label class="section-label">Session Focus Areas (select all that apply)</label>
                <div class="focus-chips">
                    ${FOCUS_AREAS.map(area => html`
                        <button
                            key=${area.value}
                            type="button"
                            class="chip ${formData.session_focus_areas.includes(area.value) ? 'selected' : ''}"
                            onClick=${() => toggleArrayItem('session_focus_areas', area.value)}
                        >
                            <span>${area.icon}</span>
                            <span>${area.label}</span>
                        </button>
                    `)}
                </div>
            </div>
        </div>
    `;

    // Step 2: What We Covered
    const renderStep2 = () => html`
        <div class="wizard-step">
            <h3 class="step-title">What We Covered</h3>
            <p class="step-subtitle">Quick capture of session topics and wins</p>

            <div class="form-section">
                <label class="section-label">Topics Covered</label>
                <div class="topics-grid">
                    ${TOPICS_COVERED.map(topic => html`
                        <button
                            key=${topic}
                            type="button"
                            class="topic-btn ${formData.topics_covered.includes(topic) ? 'selected' : ''}"
                            onClick=${() => toggleArrayItem('topics_covered', topic)}
                        >
                            ${topic}
                        </button>
                    `)}
                </div>
            </div>

            <div class="form-section">
                <label class="section-label">🎯 Key Achievements</label>
                <div class="input-with-add">
                    <input
                        type="text"
                        placeholder="What did they achieve today?"
                        value=${newAchievement}
                        onChange=${(e) => setNewAchievement(e.target.value)}
                        onKeyPress=${(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('key_achievements', newAchievement, setNewAchievement))}
                        class="form-input"
                    />
                    <button
                        type="button"
                        onClick=${() => addToArray('key_achievements', newAchievement, setNewAchievement)}
                        class="add-btn"
                    >
                        + Add
                    </button>
                </div>
                <div class="items-list">
                    ${formData.key_achievements.map((achievement, index) => html`
                        <div key=${index} class="item-tag">
                            <span>${achievement}</span>
                            <button
                                type="button"
                                onClick=${() => removeFromArray('key_achievements', index)}
                                class="remove-btn"
                            >
                                ×
                            </button>
                        </div>
                    `)}
                </div>
            </div>

            <div class="form-section">
                <label class="section-label">💡 Breakthroughs & Aha Moments</label>
                <div class="input-with-add">
                    <input
                        type="text"
                        placeholder="Any breakthroughs or insights?"
                        value=${newBreakthrough}
                        onChange=${(e) => setNewBreakthrough(e.target.value)}
                        onKeyPress=${(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('breakthroughs', newBreakthrough, setNewBreakthrough))}
                        class="form-input"
                    />
                    <button
                        type="button"
                        onClick=${() => addToArray('breakthroughs', newBreakthrough, setNewBreakthrough)}
                        class="add-btn"
                    >
                        + Add
                    </button>
                </div>
                <div class="items-list">
                    ${formData.breakthroughs.map((breakthrough, index) => html`
                        <div key=${index} class="item-tag breakthrough">
                            <span>${breakthrough}</span>
                            <button
                                type="button"
                                onClick=${() => removeFromArray('breakthroughs', index)}
                                class="remove-btn"
                            >
                                ×
                            </button>
                        </div>
                    `)}
                </div>
            </div>
        </div>
    `;

    // Step 3: Challenges & Insights
    const renderStep3 = () => html`
        <div class="wizard-step">
            <h3 class="step-title">Challenges & Insights</h3>
            <p class="step-subtitle">What obstacles came up?</p>

            <div class="form-section">
                <label class="section-label">Challenges Discussed</label>
                <div class="challenges-grid">
                    ${COMMON_CHALLENGES.map(challenge => html`
                        <button
                            key=${challenge}
                            type="button"
                            class="challenge-btn ${formData.challenges.includes(challenge) ? 'selected' : ''}"
                            onClick=${() => toggleArrayItem('challenges', challenge)}
                        >
                            ${challenge}
                        </button>
                    `)}
                </div>
            </div>

            <div class="form-section">
                <label class="section-label">✨ Key Insights</label>
                <p class="section-hint">What did you or the client discover?</p>
                <div class="input-with-add">
                    <input
                        type="text"
                        placeholder="Add an insight..."
                        value=${newInsight}
                        onChange=${(e) => setNewInsight(e.target.value)}
                        onKeyPress=${(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('insights', newInsight, setNewInsight))}
                        class="form-input"
                    />
                    <button
                        type="button"
                        onClick=${() => addToArray('insights', newInsight, setNewInsight)}
                        class="add-btn"
                    >
                        + Add
                    </button>
                </div>
                <div class="items-list">
                    ${formData.insights.map((insight, index) => html`
                        <div key=${index} class="item-tag insight">
                            <span>💭 ${insight}</span>
                            <button
                                type="button"
                                onClick=${() => removeFromArray('insights', index)}
                                class="remove-btn"
                            >
                                ×
                            </button>
                        </div>
                    `)}
                </div>
            </div>
        </div>
    `;

    // Step 4: Next Steps & Action Items
    const renderStep4 = () => html`
        <div class="wizard-step">
            <h3 class="step-title">Next Steps</h3>
            <p class="step-subtitle">Action items and follow-up</p>

            <div class="form-section">
                <label class="section-label">📋 Action Items for Client</label>
                <div class="input-with-add">
                    <input
                        type="text"
                        placeholder="What should they do before next session?"
                        value=${newAction}
                        onChange=${(e) => setNewAction(e.target.value)}
                        onKeyPress=${(e) => e.key === 'Enter' && (e.preventDefault(), addActionItem())}
                        class="form-input"
                    />
                    <button
                        type="button"
                        onClick=${addActionItem}
                        class="add-btn"
                    >
                        + Add
                    </button>
                </div>
                <div class="action-items-list">
                    ${formData.action_items.map((item, index) => html`
                        <div key=${index} class="action-item">
                            <span class="action-text">${item.text}</span>
                            <button
                                type="button"
                                onClick=${() => removeActionItem(index)}
                                class="remove-btn"
                            >
                                ×
                            </button>
                        </div>
                    `)}
                </div>
            </div>

            <div class="form-section">
                <label class="section-label">🎯 Focus for Next Session</label>
                <textarea
                    placeholder="What should we focus on next time?"
                    value=${formData.next_session_focus}
                    onChange=${(e) => setFormData({ ...formData, next_session_focus: e.target.value })}
                    class="form-textarea"
                    rows="3"
                />
            </div>

            <div class="form-section">
                <label class="section-label">Follow-up Needed?</label>
                <div class="followup-options">
                    ${FOLLOW_UP_TYPES.map(type => html`
                        <button
                            key=${type.value}
                            type="button"
                            class="followup-btn ${formData.follow_up_type === type.value ? 'selected' : ''}"
                            onClick=${() => {
                                setFormData({
                                    ...formData,
                                    follow_up_type: type.value,
                                    follow_up_needed: type.value !== 'none'
                                });
                            }}
                        >
                            <span class="followup-icon">${type.icon}</span>
                            <span class="followup-label">${type.label}</span>
                        </button>
                    `)}
                </div>
            </div>
        </div>
    `;

    // Step 5: Summary & Notes
    const renderStep5 = () => html`
        <div class="wizard-step">
            <h3 class="step-title">Session Summary</h3>
            <p class="step-subtitle">Final ratings and optional notes</p>

            <div class="form-section">
                <label class="section-label">
                    ⭐ Session Effectiveness: ${formData.session_effectiveness}/5
                </label>
                <p class="section-hint">How effective was this session?</p>
                <div class="rating-stars">
                    ${[1, 2, 3, 4, 5].map(star => html`
                        <button
                            key=${star}
                            type="button"
                            class="star-btn ${formData.session_effectiveness >= star ? 'active' : ''}"
                            onClick=${() => setFormData({ ...formData, session_effectiveness: star })}
                        >
                            ★
                        </button>
                    `)}
                </div>
            </div>

            <div class="form-section">
                <label class="section-label">
                    📈 Client Progress: ${formData.progress_rating}/5
                </label>
                <p class="section-hint">How much progress since last session?</p>
                <div class="rating-stars">
                    ${[1, 2, 3, 4, 5].map(star => html`
                        <button
                            key=${star}
                            type="button"
                            class="star-btn ${formData.progress_rating >= star ? 'active' : ''}"
                            onClick=${() => setFormData({ ...formData, progress_rating: star })}
                        >
                            ★
                        </button>
                    `)}
                </div>
            </div>

            <div class="form-section">
                <label class="section-label">📝 Additional Notes (Optional)</label>
                <p class="section-hint">Any other observations or context?</p>
                <textarea
                    placeholder="Optional free-form notes..."
                    value=${formData.detailed_notes}
                    onChange=${(e) => setFormData({ ...formData, detailed_notes: e.target.value })}
                    class="form-textarea"
                    rows="4"
                />
            </div>

            <div class="form-section">
                <label class="section-label">🔒 Private Notes (Only You Can See)</label>
                <p class="section-hint">Confidential observations for your reference only</p>
                <textarea
                    placeholder="Private coach notes..."
                    value=${formData.private_notes}
                    onChange=${(e) => setFormData({ ...formData, private_notes: e.target.value })}
                    class="form-textarea"
                    rows="3"
                />
            </div>

            <div class="summary-preview">
                <h4>Session Summary Preview</h4>
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-label">Mood:</span>
                        <span class="stat-value">{${formData.client_mood || 'Not set'}}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Focus Areas:</span>
                        <span class="stat-value">{${formData.session_focus_areas.length}}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Achievements:</span>
                        <span class="stat-value">{${formData.key_achievements.length}}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Action Items:</span>
                        <span class="stat-value">{${formData.action_items.length}}</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    return html`
        <div class="modal-overlay" onClick=${onClose}>
            <div class="session-wizard-modal" onClick=${(e) => e.stopPropagation()}>
                <div class="wizard-header">
                    <div>
                        <h2>Session Notes: ${clientName}</h2>
                        <p class="wizard-subtitle">Step ${currentStep} of ${totalSteps}</p>
                    </div>
                    <button onClick=${onClose} class="close-btn">×</button>
                </div>

                <div class="wizard-progress">
                    <div class="progress-bar" style=${{ width: `${(currentStep / totalSteps) * 100}%` }} />
                </div>

                <div class="wizard-steps">
                    ${[1, 2, 3, 4, 5].map(step => {
                        const stepLabels = ['Overview', 'Covered', 'Insights', 'Next Steps', 'Summary'];
                        return html`
                            <div
                                key=${step}
                                class="step-indicator ${currentStep === step ? 'active' : ''} ${currentStep > step ? 'completed' : ''}"
                            >
                                <div class="step-number">${step}</div>
                                <div class="step-label">${stepLabels[step - 1]}</div>
                            </div>
                        `;
                    })}
                </div>

                <div class="wizard-body">
                    ${renderStep()}
                </div>

                <div class="wizard-footer">
                    <div class="footer-left">
                        <button
                            onClick=${() => handleSave(true)}
                            class="btn-secondary-modern"
                            disabled=${saving}
                        >
                            💾 Save Draft
                        </button>
                    </div>
                    <div class="footer-right">
                        ${currentStep > 1 && html`
                            <button onClick=${handleBack} class="btn-ghost-modern">
                                ← Back
                            </button>
                        `}
                        ${currentStep < totalSteps ? html`
                            <button onClick=${handleNext} class="btn-primary-modern">
                                Next →
                            </button>
                        ` : html`
                            <button
                                onClick=${() => handleSave(false)}
                                class="btn-primary-modern"
                                disabled=${saving}
                            >
                                ${saving ? 'Saving...' : '✓ Complete & Save'}
                            </button>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `;
};

// =====================================================
// SESSION NOTES DASHBOARD
// =====================================================

export const SessionNotesDashboard = ({ session }) => {
    const [clients, setClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [sessionHistory, setSessionHistory] = useState([]);
    const [showWizard, setShowWizard] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadClients();
    }, []);

    useEffect(() => {
        if (selectedClient) {
            loadSessionHistory(selectedClient.id);
        }
    }, [selectedClient]);

    const loadClients = async () => {
        try {
            // Load all clients who have had bookings with this coach
            const response = await fetch(`${API_BASE}/coaches/me/clients`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            const data = await response.json();
            setClients(data.data || []);
        } catch (error) {
            console.error('Failed to load clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadSessionHistory = async (clientId) => {
        try {
            const response = await fetch(`${API_BASE}/session-notes?client_id=${clientId}`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            const data = await response.json();
            setSessionHistory(data.data || []);
        } catch (error) {
            console.error('Failed to load session history:', error);
        }
    };

    const filteredClients = clients.filter(client =>
        client.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return html`<div class="loading">Loading clients...</div>`;
    }

    if (!selectedClient) {
        return html`
            <div class="session-notes-dashboard">
                <div class="dashboard-header">
                    <h2>📝 Client Session Notes</h2>
                    <p>Select a client to view or add session notes</p>
                </div>

                <div class="client-search">
                    <input
                        type="text"
                        placeholder="🔍 Search clients..."
                        value=${searchQuery}
                        onChange=${(e) => setSearchQuery(e.target.value)}
                        class="search-input"
                    />
                </div>

                <div class="clients-grid">
                    ${filteredClients.length === 0 ? html`
                        <div class="empty-state">
                            <div class="empty-icon">👥</div>
                            <p>No clients found</p>
                            <small>Clients will appear here after their first booking</small>
                        </div>
                    ` : filteredClients.map(client => html`
                        <div
                            key=${client.id}
                            class="client-card"
                            onClick=${() => setSelectedClient(client)}
                        >
                            <div class="client-avatar">
                                ${client.avatar_url ? html`
                                    <img src=${client.avatar_url} alt=${client.full_name} />
                                ` : html`
                                    <div class="avatar-placeholder">
                                        ${(client.full_name || 'C')[0].toUpperCase()}
                                    </div>
                                `}
                            </div>
                            <div class="client-info">
                                <h3>${client.full_name || 'Unknown'}</h3>
                                <p>${client.total_sessions || 0} sessions</p>
                            </div>
                            <div class="client-arrow">→</div>
                        </div>
                    `)}
                </div>
            </div>
        `;
    }

    return html`
        <div class="session-notes-dashboard">
            <div class="dashboard-header">
                <button onClick=${() => setSelectedClient(null)} class="back-btn">
                    ← Back to Clients
                </button>
                <div class="client-header">
                    <h2>${selectedClient.full_name}</h2>
                    <button
                        onClick=${() => setShowWizard(true)}
                        class="btn-primary-modern"
                    >
                        + Add Session Note
                    </button>
                </div>
            </div>

            <div class="session-timeline">
                {${sessionHistory.length === 0 ? html`
                    <div class="empty-state">
                        <div class="empty-icon">📋</div>
                        <p>No session notes yet</p>
                        <button
                            onClick=${() => setShowWizard(true)}
                            class="btn-primary-modern"
                        >
                            Add First Session Note
                        </button>
                    </div>
                ` : sessionHistory.map(note => html`
                    <${SessionNoteCard} key=${note.id} note=${note} />
                `)}}
            </div>

            ${showWizard && html`
                <${SessionNotesWizard}
                    session=${session}
                    clientId=${selectedClient.id}
                    clientName=${selectedClient.full_name}
                    onClose=${() => setShowWizard(false)}
                    onSave=${() => {
                        setShowWizard(false);
                        loadSessionHistory(selectedClient.id);
                    }}
                />
            `}
        </div>
    `;
};

// =====================================================
// SESSION NOTE CARD (Timeline Item)
// =====================================================

const SessionNoteCard = ({ note }) => {
    const [expanded, setExpanded] = useState(false);

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getMoodEmoji = (mood) => {
        const option = MOOD_OPTIONS.find(m => m.value === mood);
        return option ? option.emoji : '😐';
    };

    return html`
        <div class="session-note-card ${expanded ? 'expanded' : ''}">
            <div class="note-header" onClick=${() => setExpanded(!expanded)}>
                <div class="note-date">
                    <span class="date-icon">📅</span>
                    <span>${formatDate(note.session_date)}</span>
                </div>
                <div class="note-meta">
                    <span class="mood">${getMoodEmoji(note.client_mood)}</span>
                    <span class="effectiveness">⭐ ${note.session_effectiveness}/5</span>
                    <span class="expand-icon">${expanded ? '▼' : '▶'}</span>
                </div>
            </div>

            ${expanded && html`
                <div class="note-body">
                    ${note.session_focus_areas?.length > 0 && html`
                        <div class="note-section">
                            <h4>Focus Areas</h4>
                            <div class="tags">
                                ${note.session_focus_areas.map(area => html`
                                    <span key=${area} class="tag">${area}</span>
                                `)}
                            </div>
                        </div>
                    `}

                    ${note.key_achievements?.length > 0 && html`
                        <div class="note-section">
                            <h4>🎯 Key Achievements</h4>
                            <ul>
                                ${note.key_achievements.map((achievement, i) => html`
                                    <li key=${i}>${achievement}</li>
                                `)}
                            </ul>
                        </div>
                    `}

                    ${note.breakthroughs?.length > 0 && html`
                        <div class="note-section">
                            <h4>💡 Breakthroughs</h4>
                            <ul>
                                ${note.breakthroughs.map((breakthrough, i) => html`
                                    <li key=${i}>${breakthrough}</li>
                                `)}
                            </ul>
                        </div>
                    `}

                    ${note.challenges?.length > 0 && html`
                        <div class="note-section">
                            <h4>Challenges</h4>
                            <div class="tags">
                                ${note.challenges.map(challenge => html`
                                    <span key=${challenge} class="tag challenge">${challenge}</span>
                                `)}
                            </div>
                        </div>
                    `}

                    ${note.action_items?.length > 0 && html`
                        <div class="note-section">
                            <h4>📋 Action Items</h4>
                            <ul class="action-list">
                                ${note.action_items.map((item, i) => html`
                                    <li key=${i} class=${item.completed ? 'completed' : ''}>
                                        ${item.text}
                                    </li>
                                `)}
                            </ul>
                        </div>
                    `}

                    ${note.next_session_focus && html`
                        <div class="note-section">
                            <h4>🎯 Next Session Focus</h4>
                            <p>${note.next_session_focus}</p>
                        </div>
                    `}

                    ${note.detailed_notes && html`
                        <div class="note-section">
                            <h4>📝 Additional Notes</h4>
                            <p class="detailed-notes">${note.detailed_notes}</p>
                        </div>
                    `}

                    <div class="note-footer">
                        <span>Progress: ⭐ ${note.progress_rating}/5</span>
                        <span>Effectiveness: ⭐ ${note.session_effectiveness}/5</span>
                    </div>
                </div>
            `}
        </div>
    `;
};

export default { SessionNotesWizard, SessionNotesDashboard };
