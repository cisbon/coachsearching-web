/**
 * AICouncilPage Component
 * Multi-domain questioning system with 8 expert perspectives
 */

import htm from '../vendor/htm.js';
import { t } from '../i18n.js';

const React = window.React;
const { useState, useEffect, useRef } = React;
const html = htm.bind(React.createElement);

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
    const [conversation, setConversation] = useState([]);
    const [currentQuestions, setCurrentQuestions] = useState([]);
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [answerText, setAnswerText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const answerInputRef = useRef(null);
    const lang = window.getCurrentLang ? window.getCurrentLang() : 'en';

    // Require authentication
    if (!session?.user) {
        return html`
            <div class="ai-council-page">
                <div class="container">
                    <div class="ai-council-auth-required">
                        <div class="auth-icon">🔒</div>
                        <h2>${t('aiCouncil.authRequired') || 'Authentication Required'}</h2>
                        <p>${t('aiCouncil.authMessage') || 'Please sign in to access the AI Council feature.'}</p>
                        <button class="btn-primary" onClick=${() => window.navigateTo('/login')}>
                            ${t('nav.login') || 'Sign In'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate questions from API
     */
    const generateQuestions = async (isInitial = false) => {
        setLoading(true);
        setError('');
        setPhase('loading');

        try {
            const token = session?.access_token;
            const requestPayload = {
                initialUserMessage: initialMessage,
                conversation: conversation,
                language: lang
            };

            console.log('[AI Council] REQUEST payload:', JSON.stringify(requestPayload, null, 2));
            console.log('[AI Council] Token present:', !!token);

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

            // API wraps response in 'data' property via Response::success()
            const data = result.data || result;
            console.log('[AI Council] Unwrapped data:', JSON.stringify(data, null, 2));
            console.log('[AI Council] newQuestions:', data.newQuestions);
            console.log('[AI Council] newQuestions length:', data.newQuestions?.length);

            setCurrentQuestions(data.newQuestions || []);
            setPhase('questions');
        } catch (err) {
            console.error('[AI Council] ERROR:', err);
            console.error('[AI Council] Error message:', err.message);
            setError(err.message || 'An error occurred. Please try again.');
            setPhase(conversation.length > 0 ? 'questions' : 'input');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handle initial topic submission
     */
    const handleInitialSubmit = (e) => {
        e.preventDefault();
        if (!initialMessage.trim()) return;
        generateQuestions(true);
    };

    /**
     * Handle question selection
     */
    const handleSelectQuestion = (question) => {
        setSelectedQuestion(question);
        setAnswerText('');
        setPhase('answer');
        // Focus on answer input after a short delay
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

        // Add to conversation
        const newExchange = {
            q: {
                domain: selectedQuestion.domain,
                q: selectedQuestion.q
            },
            a: answerText.trim()
        };

        setConversation([...conversation, newExchange]);
        setSelectedQuestion(null);
        setAnswerText('');

        // Generate new questions
        generateQuestions(false);
    };

    /**
     * Start new session
     */
    const handleStartNew = () => {
        setPhase('input');
        setInitialMessage('');
        setConversation([]);
        setCurrentQuestions([]);
        setSelectedQuestion(null);
        setAnswerText('');
        setError('');
    };

    /**
     * Go back to questions
     */
    const handleBackToQuestions = () => {
        setSelectedQuestion(null);
        setAnswerText('');
        setPhase('questions');
    };

    return html`
        <div class="ai-council-page">
            <div class="container">
                <!-- Header -->
                <div class="ai-council-header">
                    <h1>🎯 ${t('aiCouncil.title') || 'AI Council'}</h1>
                    <p class="subtitle">${t('aiCouncil.subtitle') || 'Get perspectives from 8 different life domains'}</p>
                </div>

                ${error && html`
                    <div class="ai-council-error">
                        <span>⚠️</span> ${error}
                    </div>
                `}

                <!-- Initial Input Phase -->
                ${phase === 'input' && html`
                    <div class="ai-council-intro">
                        <div class="intro-card">
                            <h2>${t('aiCouncil.welcomeTitle') || 'Welcome to the AI Council'}</h2>
                            <p>${t('aiCouncil.welcomeDesc') || 'Share a topic, problem, or goal you want to explore. Our council of 8 experts will ask you thought-provoking questions from different perspectives to help you gain deeper insights.'}</p>

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
                                    placeholder=${t('aiCouncil.placeholder') || 'e.g., "I want to become an entrepreneur" or "I\'m considering a career change" or "I want to improve my work-life balance"'}
                                    value=${initialMessage}
                                    onInput=${(e) => setInitialMessage(e.target.value)}
                                    rows="4"
                                ></textarea>
                                <button type="submit" class="btn-council-primary" disabled=${!initialMessage.trim()}>
                                    ${t('aiCouncil.startBtn') || 'Start Council Session'} →
                                </button>
                            </form>
                        </div>
                    </div>
                `}

                <!-- Loading Phase -->
                ${phase === 'loading' && html`
                    <div class="ai-council-loading">
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
                        <h2>${t('aiCouncil.thinking') || 'The Council is deliberating...'}</h2>
                        <p>${t('aiCouncil.thinkingDesc') || 'Our 8 experts are crafting thoughtful questions for you'}</p>
                    </div>
                `}

                <!-- Questions Phase -->
                ${phase === 'questions' && html`
                    <div class="ai-council-session">
                        <!-- Topic Summary -->
                        <div class="topic-summary">
                            <div class="topic-label">${t('aiCouncil.yourTopic') || 'Your Topic'}:</div>
                            <div class="topic-text">"${initialMessage}"</div>
                            ${conversation.length > 0 && html`
                                <div class="conversation-count">
                                    ${conversation.length} ${conversation.length === 1
                                        ? (t('aiCouncil.questionAnswered') || 'question answered')
                                        : (t('aiCouncil.questionsAnswered') || 'questions answered')}
                                </div>
                            `}
                        </div>

                        <!-- Conversation History -->
                        ${conversation.length > 0 && html`
                            <div class="conversation-history">
                                <h3>${t('aiCouncil.conversationHistory') || 'Conversation History'}</h3>
                                <div class="history-timeline">
                                    ${conversation.map((exchange, index) => {
                                        const domain = DOMAINS[exchange.q.domain];
                                        return html`
                                            <div key=${index} class="history-item">
                                                <div class="history-question" style=${{ borderLeftColor: domain?.color || '#666' }}>
                                                    <span class="history-domain">
                                                        ${domain?.icon || '❓'} ${getDomainName(exchange.q.domain, lang)}
                                                    </span>
                                                    <p>${exchange.q.q}</p>
                                                </div>
                                                <div class="history-answer">
                                                    <span class="answer-label">${t('aiCouncil.yourAnswer') || 'Your answer'}:</span>
                                                    <p>${exchange.a}</p>
                                                </div>
                                            </div>
                                        `;
                                    })}
                                </div>
                            </div>
                        `}

                        <!-- Questions Grid -->
                        <div class="questions-section">
                            <h3>${t('aiCouncil.selectQuestion') || 'Select a question to answer'}:</h3>
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

                        <!-- Actions -->
                        <div class="session-actions">
                            <button class="btn-secondary" onClick=${handleStartNew}>
                                ${t('aiCouncil.startNew') || 'Start New Session'}
                            </button>
                        </div>
                    </div>
                `}

                <!-- Answer Phase -->
                ${phase === 'answer' && selectedQuestion && html`
                    <div class="ai-council-answer">
                        <button class="back-btn" onClick=${handleBackToQuestions}>
                            ← ${t('aiCouncil.backToQuestions') || 'Back to Questions'}
                        </button>

                        <div class="selected-question-card" style=${{
                            borderColor: DOMAINS[selectedQuestion.domain]?.color || '#666'
                        }}>
                            <div class="question-header">
                                <span class="question-icon" style=${{
                                    backgroundColor: DOMAINS[selectedQuestion.domain]?.color || '#666'
                                }}>
                                    ${DOMAINS[selectedQuestion.domain]?.icon || '❓'}
                                </span>
                                <span class="question-domain">${getDomainName(selectedQuestion.domain, lang)}</span>
                            </div>
                            <p class="question-text">${selectedQuestion.q}</p>
                        </div>

                        <form class="answer-form" onSubmit=${handleAnswerSubmit}>
                            <label>${t('aiCouncil.yourReflection') || 'Your reflection'}:</label>
                            <textarea
                                ref=${answerInputRef}
                                class="answer-input"
                                placeholder=${t('aiCouncil.answerPlaceholder') || 'Take your time to reflect and share your thoughts...'}
                                value=${answerText}
                                onInput=${(e) => setAnswerText(e.target.value)}
                                rows="6"
                            ></textarea>
                            <div class="answer-actions">
                                <button type="button" class="btn-secondary" onClick=${handleBackToQuestions}>
                                    ${t('common.cancel') || 'Cancel'}
                                </button>
                                <button type="submit" class="btn-council-primary" disabled=${!answerText.trim()}>
                                    ${t('aiCouncil.submitAnswer') || 'Submit & Get New Questions'} →
                                </button>
                            </div>
                        </form>
                    </div>
                `}
            </div>
        </div>
    `;
}

export default AICouncilPage;
