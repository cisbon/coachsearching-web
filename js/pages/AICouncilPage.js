/**
 * AICouncilPage Component
 * Multi-domain questioning system with 8 expert perspectives
 * Two-column layout for larger screens after initial message
 */

import htm from '../vendor/htm.js';
import { t } from '../i18n.js';

const React = window.React;
const { useState, useRef, useEffect } = React;
const html = htm.bind(React.createElement);

const STORAGE_KEY = 'ai_council_session';

const API_BASE = 'https://clouedo.com/coachsearching/api';

// Domain configurations with icons and colors
const DOMAINS = {
    inner_peace: { icon: '🧘', color: '#8B5CF6', name: 'Inner Peace', nameDe: 'Innerer Frieden' },
    happiness: { icon: '😊', color: '#F59E0B', name: 'Happiness', nameDe: 'Glück' },
    family: { icon: '👨‍👩‍👧‍👦', color: '#EC4899', name: 'Family', nameDe: 'Familie' },
    friends: { icon: '👥', color: '#3B82F6', name: 'Friends', nameDe: 'Freunde' },
    fitness: { icon: '💪', color: '#10B981', name: 'Fitness', nameDe: 'Fitness' },
    finance: { icon: '💰', color: '#6366F1', name: 'Finance', nameDe: 'Finanzen' },
    business: { icon: '💼', color: '#0EA5E9', name: 'Business', nameDe: 'Business' },
    education: { icon: '📚', color: '#F97316', name: 'Education', nameDe: 'Bildung' }
};

/**
 * Get domain display name based on language
 */
function getDomainName(domainKey, lang = 'en') {
    const domain = DOMAINS[domainKey];
    if (!domain) return domainKey;
    return lang === 'de' ? domain.nameDe : domain.name;
}

/**
 * AI Council Page
 */
export function AICouncilPage({ session }) {
    const [phase, setPhase] = useState('input'); // 'input', 'loading', 'questions', 'answer'
    const [initialMessage, setInitialMessage] = useState('');
    const [submittedInitialMessage, setSubmittedInitialMessage] = useState('');
    const [conversation, setConversation] = useState([]);
    const [currentQuestions, setCurrentQuestions] = useState([]);
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [answerText, setAnswerText] = useState('');
    const [error, setError] = useState('');
    const answerInputRef = useRef(null);
    const lang = window.getCurrentLang ? window.getCurrentLang() : 'en';

    // Restore state from sessionStorage on mount
    useEffect(() => {
        try {
            const saved = sessionStorage.getItem(STORAGE_KEY);
            if (saved) {
                const state = JSON.parse(saved);
                console.log('[AI Council] Restoring saved session:', state);
                if (state.submittedInitialMessage) {
                    setSubmittedInitialMessage(state.submittedInitialMessage);
                    setInitialMessage(state.submittedInitialMessage);
                }
                if (state.conversation) setConversation(state.conversation);
                if (state.currentQuestions) setCurrentQuestions(state.currentQuestions);
                if (state.selectedQuestion) setSelectedQuestion(state.selectedQuestion);
                if (state.answerText) setAnswerText(state.answerText);
                // Only restore to these phases, not loading
                if (state.phase && ['questions', 'answer'].includes(state.phase)) {
                    setPhase(state.phase);
                } else if (state.submittedInitialMessage && state.currentQuestions?.length > 0) {
                    setPhase('questions');
                }
            }
        } catch (e) {
            console.error('[AI Council] Failed to restore session:', e);
        }
    }, []);

    // Save state to sessionStorage whenever it changes
    useEffect(() => {
        // Only save if we have an active session
        if (submittedInitialMessage) {
            const stateToSave = {
                phase,
                submittedInitialMessage,
                conversation,
                currentQuestions,
                selectedQuestion,
                answerText
            };
            console.log('[AI Council] Saving session state:', stateToSave);
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        }
    }, [phase, submittedInitialMessage, conversation, currentQuestions, selectedQuestion, answerText]);

    // Require authentication
    if (!session?.user) {
        return html`
            <div class="ai-council-page">
                <div class="container">
                    <div class="ai-council-auth-required">
                        <div class="auth-icon">🔒</div>
                        <h2>${t('aiCouncil.authRequired')}</h2>
                        <p>${t('aiCouncil.authMessage')}</p>
                        <button class="btn-primary" onClick=${() => window.navigateTo('/login')}>
                            ${t('nav.login')}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate questions from API
     */
    const generateQuestions = async (currentConversation) => {
        setError('');
        setPhase('loading');

        try {
            const token = session?.access_token;
            const messageToSend = submittedInitialMessage || initialMessage;
            const requestPayload = {
                initialUserMessage: messageToSend,
                conversation: currentConversation,
                language: lang
            };

            console.log('[AI Council] REQUEST payload:', JSON.stringify(requestPayload, null, 2));

            const response = await fetch(`${API_BASE}/ai-council/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(requestPayload)
            });

            console.log('[AI Council] Response status:', response.status, response.statusText);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.log('[AI Council] Error response:', errorData);
                throw new Error(errorData.message || errorData.error?.message || 'Failed to generate questions');
            }

            const result = await response.json();
            console.log('[AI Council] RAW response:', JSON.stringify(result, null, 2));

            const data = result.data || result;
            console.log('[AI Council] newQuestions:', data.newQuestions);

            setCurrentQuestions(data.newQuestions || []);
            setPhase('questions');
        } catch (err) {
            console.error('[AI Council] ERROR:', err);
            setError(err.message || 'An error occurred. Please try again.');
            setPhase(conversation.length > 0 ? 'questions' : 'input');
        }
    };

    /**
     * Handle initial topic submission
     */
    const handleInitialSubmit = (e) => {
        e.preventDefault();
        if (!initialMessage.trim()) return;
        setSubmittedInitialMessage(initialMessage.trim());
        generateQuestions([]);
    };

    /**
     * Handle question selection
     */
    const handleSelectQuestion = (question) => {
        setSelectedQuestion(question);
        setAnswerText('');
        setPhase('answer');
        setTimeout(() => {
            answerInputRef.current?.focus();
        }, 100);
    };

    /**
     * Handle answer submission
     */
    const handleAnswerSubmit = (e) => {
        e.preventDefault();
        if (!answerText.trim() || !selectedQuestion) return;

        const newExchange = {
            q: {
                domain: selectedQuestion.domain,
                q: selectedQuestion.q
            },
            a: answerText.trim()
        };

        const newConversation = [...conversation, newExchange];
        setConversation(newConversation);
        setSelectedQuestion(null);
        setAnswerText('');
        generateQuestions(newConversation);
    };

    /**
     * Start new session
     */
    const handleStartNew = () => {
        // Clear saved session
        sessionStorage.removeItem(STORAGE_KEY);
        console.log('[AI Council] Session cleared');

        setPhase('input');
        setInitialMessage('');
        setSubmittedInitialMessage('');
        setConversation([]);
        setCurrentQuestions([]);
        setSelectedQuestion(null);
        setAnswerText('');
        setError('');
    };

    /**
     * Go back to questions from answer phase
     */
    const handleBackToQuestions = () => {
        setSelectedQuestion(null);
        setAnswerText('');
        setPhase('questions');
    };

    // ============================================
    // RENDER: Initial Input Phase (single column)
    // ============================================
    if (phase === 'input') {
        return html`
            <div class="ai-council-page">
                <div class="container">
                    ${error && html`
                        <div class="ai-council-error">
                            <span>⚠️</span> ${error}
                        </div>
                    `}

                    <div class="ai-council-intro">
                        <div class="intro-card">
                            <h2>${t('aiCouncil.welcomeTitle')}</h2>
                            <p>${t('aiCouncil.welcomeDesc')}</p>

                            <div class="domains-preview">
                                ${Object.entries(DOMAINS).map(([key, domain]) => html`
                                    <div key=${key} class="domain-badge" style=${{ backgroundColor: domain.color + '20', borderColor: domain.color }}>
                                        <span class="domain-icon">${domain.icon}</span>
                                        <span class="domain-name">${getDomainName(key, lang)}</span>
                                    </div>
                                `)}
                            </div>

                            <form class="initial-form" onSubmit=${handleInitialSubmit}>
                                <textarea
                                    class="council-input"
                                    placeholder=${t('aiCouncil.placeholder')}
                                    value=${initialMessage}
                                    onInput=${(e) => setInitialMessage(e.target.value)}
                                    rows="4"
                                ></textarea>
                                <button type="submit" class="btn-council-primary" disabled=${!initialMessage.trim()}>
                                    ${t('aiCouncil.startBtn')} →
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ============================================
    // RENDER: Two-column layout (loading, questions, answer phases)
    // ============================================
    const renderLeftColumn = () => {
        // Loading state
        if (phase === 'loading') {
            return html`
                <div class="council-left-loading">
                    <div class="loading-animation">
                        <div class="council-spinner">
                            ${Object.values(DOMAINS).map((domain, i) => html`
                                <div key=${i} class="spinner-dot" style=${{
                                    backgroundColor: domain.color,
                                    animationDelay: `${i * 0.1}s`
                                }}></div>
                            `)}
                        </div>
                    </div>
                    <h2>${t('aiCouncil.thinking')}</h2>
                    <p>${t('aiCouncil.thinkingDesc')}</p>
                </div>
            `;
        }

        // Answer input state
        if (phase === 'answer' && selectedQuestion) {
            const domain = DOMAINS[selectedQuestion.domain];
            return html`
                <div class="council-left-answer">
                    <button class="back-btn" onClick=${handleBackToQuestions}>
                        ← ${t('aiCouncil.backToQuestions')}
                    </button>

                    <div class="selected-question-card" style=${{ borderColor: domain?.color || '#666' }}>
                        <div class="question-header">
                            <span class="question-icon" style=${{ backgroundColor: domain?.color || '#666' }}>
                                ${domain?.icon || '❓'}
                            </span>
                            <span class="question-domain">${getDomainName(selectedQuestion.domain, lang)}</span>
                        </div>
                        <p class="question-text">${selectedQuestion.q}</p>
                    </div>

                    <form class="answer-form" onSubmit=${handleAnswerSubmit}>
                        <label>${t('aiCouncil.yourReflection')}:</label>
                        <textarea
                            ref=${answerInputRef}
                            class="answer-input"
                            placeholder=${t('aiCouncil.answerPlaceholder')}
                            value=${answerText}
                            onInput=${(e) => setAnswerText(e.target.value)}
                            rows="6"
                        ></textarea>
                        <div class="answer-actions">
                            <button type="button" class="btn-secondary" onClick=${handleBackToQuestions}>
                                ${t('common.cancel')}
                            </button>
                            <button type="submit" class="btn-council-primary" disabled=${!answerText.trim()}>
                                ${t('aiCouncil.submitAnswer')} →
                            </button>
                        </div>
                    </form>
                </div>
            `;
        }

        // Questions state
        if (phase === 'questions') {
            return html`
                <div class="council-left-questions">
                    <h3 class="questions-prompt">${t('aiCouncil.selectQuestion')}:</h3>
                    <div class="questions-grid">
                        ${currentQuestions.map(question => {
                            const domain = DOMAINS[question.domain];
                            return html`
                                <button
                                    key=${question.id}
                                    class="question-card"
                                    style=${{
                                        '--domain-color': domain?.color || '#666',
                                        borderColor: domain?.color || '#666'
                                    }}
                                    onClick=${() => handleSelectQuestion(question)}
                                >
                                    <div class="question-header">
                                        <span class="question-icon" style=${{ backgroundColor: domain?.color || '#666' }}>
                                            ${domain?.icon || '❓'}
                                        </span>
                                        <span class="question-domain">${getDomainName(question.domain, lang)}</span>
                                    </div>
                                    <p class="question-text">${question.q}</p>
                                </button>
                            `;
                        })}
                    </div>
                </div>
            `;
        }

        return null;
    };

    const renderRightColumn = () => {
        return html`
            <div class="council-right-history">
                <div class="history-header">
                    <h3>${t('aiCouncil.yourJourney')}</h3>
                    <button class="btn-new-session" onClick=${handleStartNew}>
                        ${t('aiCouncil.startNew')}
                    </button>
                </div>

                <!-- Initial Topic -->
                <div class="history-topic">
                    <div class="history-topic-label">${t('aiCouncil.yourTopic')}:</div>
                    <div class="history-topic-text">"${submittedInitialMessage}"</div>
                </div>

                <!-- Conversation History -->
                ${conversation.length > 0 && html`
                    <div class="history-conversation">
                        ${conversation.map((exchange, index) => {
                            const domain = DOMAINS[exchange.q.domain];
                            return html`
                                <div key=${index} class="history-exchange">
                                    <div class="history-question" style=${{ borderLeftColor: domain?.color || '#666' }}>
                                        <span class="history-domain-badge" style=${{ backgroundColor: domain?.color || '#666' }}>
                                            ${domain?.icon || '❓'} ${getDomainName(exchange.q.domain, lang)}
                                        </span>
                                        <p class="history-q-text">${exchange.q.q}</p>
                                    </div>
                                    <div class="history-answer">
                                        <span class="history-answer-label">${t('aiCouncil.yourAnswer')}:</span>
                                        <p class="history-a-text">${exchange.a}</p>
                                    </div>
                                </div>
                            `;
                        })}
                    </div>
                `}

                ${conversation.length === 0 && phase !== 'loading' && html`
                    <div class="history-empty">
                        <p>${t('aiCouncil.historyEmpty')}</p>
                    </div>
                `}
            </div>
        `;
    };

    return html`
        <div class="ai-council-page">
            <div class="container">
                ${error && html`
                    <div class="ai-council-error">
                        <span>⚠️</span> ${error}
                    </div>
                `}

                <div class="ai-council-two-column">
                    <div class="council-column council-column-left">
                        ${renderLeftColumn()}
                    </div>
                    <div class="council-column council-column-right">
                        ${renderRightColumn()}
                    </div>
                </div>
            </div>
        </div>
    `;
}

export default AICouncilPage;
