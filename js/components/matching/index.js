/**
 * Matching/Quiz Components Barrel Export
 * Coach matching quiz and AI-powered matching
 */

import htm from '../../vendor/htm.js';
import { t } from '../../i18n.js';

const React = window.React;
const { useState } = React;
const html = htm.bind(React.createElement);

// Use global formatPrice from app.js
const formatPrice = (price) => {
    if (window.formatPrice) {
        return window.formatPrice(price);
    }
    return '€' + (price || 0).toFixed(0);
};

// Mock coaches for fallback
const mockCoaches = [
    { id: 1, full_name: 'Sample Coach', title: 'Life Coach', hourly_rate: 100 }
];

/**
 * Get quiz questions with current language translations
 */
export const getQuizQuestions = () => [
    {
        id: 'goal',
        question: t('quiz.q.goal'),
        type: 'single',
        options: [
            { value: 'career', label: `🚀 ${t('quiz.q.goal.career')}`, desc: t('quiz.q.goal.careerDesc') },
            { value: 'leadership', label: `👔 ${t('quiz.q.goal.leadership')}`, desc: t('quiz.q.goal.leadershipDesc') },
            { value: 'life', label: `🌟 ${t('quiz.q.goal.life')}`, desc: t('quiz.q.goal.lifeDesc') },
            { value: 'business', label: `💼 ${t('quiz.q.goal.business')}`, desc: t('quiz.q.goal.businessDesc') }
        ]
    },
    {
        id: 'style',
        question: t('quiz.q.style'),
        type: 'single',
        options: [
            { value: 'supportive', label: `🤗 ${t('quiz.q.style.supportive')}`, desc: t('quiz.q.style.supportiveDesc') },
            { value: 'direct', label: `🎯 ${t('quiz.q.style.direct')}`, desc: t('quiz.q.style.directDesc') },
            { value: 'analytical', label: `📊 ${t('quiz.q.style.analytical')}`, desc: t('quiz.q.style.analyticalDesc') },
            { value: 'creative', label: `🎨 ${t('quiz.q.style.creative')}`, desc: t('quiz.q.style.creativeDesc') }
        ]
    },
    {
        id: 'session_type',
        question: t('quiz.q.session'),
        type: 'single',
        options: [
            { value: 'online', label: `💻 ${t('quiz.q.session.online')}`, desc: t('quiz.q.session.onlineDesc') },
            { value: 'in_person', label: `🤝 ${t('quiz.q.session.inPerson')}`, desc: t('quiz.q.session.inPersonDesc') },
            { value: 'hybrid', label: `🔄 ${t('quiz.q.session.hybrid')}`, desc: t('quiz.q.session.hybridDesc') }
        ]
    },
    {
        id: 'budget',
        question: t('quiz.q.budget'),
        type: 'single',
        options: [
            { value: 'budget', label: `💰 ${t('quiz.q.budget.low')}`, desc: t('quiz.q.budget.lowDesc') },
            { value: 'mid', label: `💎 ${t('quiz.q.budget.mid')}`, desc: t('quiz.q.budget.midDesc') },
            { value: 'premium', label: `👑 ${t('quiz.q.budget.premium')}`, desc: t('quiz.q.budget.premiumDesc') }
        ]
    }
];

/**
 * MatchingQuiz Component
 * Multi-step quiz for matching users with coaches
 */
export const MatchingQuiz = ({ session }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState({});
    const [showResults, setShowResults] = useState(false);
    const [matchedCoaches, setMatchedCoaches] = useState([]);
    const [loading, setLoading] = useState(false);

    // Get questions with current language translations
    const quizQuestions = getQuizQuestions();
    const currentQuestion = quizQuestions[currentStep];
    const progress = ((currentStep) / quizQuestions.length) * 100;

    const handleAnswer = (value) => {
        setAnswers({ ...answers, [currentQuestion.id]: value });

        // Auto-advance after short delay
        setTimeout(() => {
            if (currentStep < quizQuestions.length - 1) {
                setCurrentStep(currentStep + 1);
            } else {
                findMatches();
            }
        }, 300);
    };

    const findMatches = async () => {
        setLoading(true);

        // Simulate matching algorithm (in production, this would call an API)
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Load coaches and filter based on answers
        if (window.supabaseClient) {
            try {
                const { data: coaches } = await window.supabaseClient
                    .from('cs_coaches')
                    .select('*')
                    .limit(10);

                if (coaches) {
                    // Simple matching - in production this would be more sophisticated
                    const scored = coaches.map(coach => {
                        let score = Math.random() * 30 + 70; // Base score 70-100

                        // Boost for matching criteria
                        if (answers.session_type === 'online' && coach.offers_online) score += 5;
                        if (answers.session_type === 'in_person' && coach.offers_in_person) score += 5;

                        if (answers.budget === 'budget' && coach.hourly_rate < 75) score += 10;
                        if (answers.budget === 'mid' && coach.hourly_rate >= 75 && coach.hourly_rate < 150) score += 10;
                        if (answers.budget === 'premium' && coach.hourly_rate >= 150) score += 10;

                        return { ...coach, matchScore: Math.min(99, Math.round(score)) };
                    });

                    scored.sort((a, b) => b.matchScore - a.matchScore);
                    setMatchedCoaches(scored.slice(0, 5));
                }
            } catch (error) {
                console.error('Error finding matches:', error);
                setMatchedCoaches(mockCoaches.map(c => ({ ...c, matchScore: Math.round(Math.random() * 20 + 80) })));
            }
        } else {
            setMatchedCoaches(mockCoaches.map(c => ({ ...c, matchScore: Math.round(Math.random() * 20 + 80) })));
        }

        setLoading(false);
        setShowResults(true);
    };

    const goBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const startOver = () => {
        setCurrentStep(0);
        setAnswers({});
        setShowResults(false);
        setMatchedCoaches([]);
    };

    if (loading) {
        return html`
            <div class="quiz-loading">
                <div class="loading-animation">
                    <div class="spinner-large"></div>
                </div>
                <h2>${t('quiz.processing.title')}</h2>
                <p>${t('quiz.processing.step1')}</p>
            </div>
        `;
    }

    if (showResults) {
        return html`
            <div class="quiz-results">
                <div class="container">
                    <div class="results-header">
                        <h1>🎯 ${t('quiz.results.title')}</h1>
                        <p>${t('quiz.results.subtitle')}</p>
                    </div>

                    <div class="matched-coaches">
                        ${matchedCoaches.map((coach, index) => html`
                            <div key=${coach.id} class="matched-coach-card">
                                <div class="match-rank">#${index + 1}</div>
                                <div class="match-score">
                                    <span class="score-value">${coach.matchScore}%</span>
                                    <span class="score-label">${t('quiz.match')}</span>
                                </div>
                                <img src=${coach.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(coach.full_name)}`} alt=${coach.full_name} class="coach-avatar" />
                                <div class="coach-info">
                                    <h3>${coach.full_name}</h3>
                                    <p class="coach-title">${coach.title}</p>
                                    <div class="coach-meta">
                                        <span>📍 ${coach.location || 'Remote'}</span>
                                        <span>💰 ${formatPrice(coach.hourly_rate)}/hr</span>
                                    </div>
                                </div>
                                <button class="btn-primary" onClick=${() => window.navigateTo('/coaches')}>
                                    ${t('quiz.viewProfile')}
                                </button>
                            </div>
                        `)}
                    </div>

                    <div class="results-actions">
                        <button class="btn-secondary" onClick=${startOver}>
                            ← ${t('quiz.results.retake')}
                        </button>
                        <button class="btn-primary" onClick=${() => window.navigateTo('/coaches')}>
                            ${t('quiz.results.browseAll')} →
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    return html`
        <div class="quiz-page">
            <div class="quiz-container">
                <!-- Progress Bar -->
                <div class="quiz-progress-bar">
                    <div class="progress-track">
                        <div class="progress-fill" style=${{ width: `${progress}%` }}></div>
                    </div>
                    <span class="progress-text">${currentStep + 1} / ${quizQuestions.length}</span>
                </div>

                <!-- Question -->
                <div class="quiz-question-container">
                    <h2 class="quiz-question">${currentQuestion.question}</h2>

                    <div class="quiz-options">
                        ${currentQuestion.options.map(option => html`
                            <button
                                key=${option.value}
                                class="quiz-option ${answers[currentQuestion.id] === option.value ? 'selected' : ''}"
                                onClick=${() => handleAnswer(option.value)}
                            >
                                <span class="option-label">${option.label}</span>
                                <span class="option-desc">${option.desc}</span>
                            </button>
                        `)}
                    </div>
                </div>

                <!-- Navigation -->
                <div class="quiz-nav">
                    ${currentStep > 0 && html`
                        <button class="btn-secondary" onClick=${goBack}>
                            ← ${t('quiz.back')}
                        </button>
                    `}
                    <button class="btn-ghost" onClick=${() => window.navigateTo('/home')}>
                        ${t('quiz.intro.skip')}
                    </button>
                </div>
            </div>
        </div>
    `;
};

/**
 * AIMatchPage Component
 * AI-powered coach matching with natural language input
 */
export const AIMatchPage = ({ session }) => {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [recommendations, setRecommendations] = useState([]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        setLoading(true);

        // Simulate AI processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // In production, this would call an AI API
        if (window.supabaseClient) {
            const { data: coaches } = await window.supabaseClient
                .from('cs_coaches')
                .select('*')
                .limit(5);

            if (coaches) {
                setRecommendations(coaches.map(c => ({
                    ...c,
                    matchScore: Math.round(Math.random() * 20 + 75),
                    aiReason: 'Based on your goals and preferences, this coach specializes in areas that align with your needs.'
                })));
            }
        } else {
            setRecommendations(mockCoaches.map(c => ({
                ...c,
                matchScore: Math.round(Math.random() * 20 + 75),
                aiReason: 'Based on your goals and preferences, this coach specializes in areas that align with your needs.'
            })));
        }

        setLoading(false);
    };

    return html`
        <div class="ai-match-page">
            <div class="container">
                <div class="ai-header">
                    <h1>✨ ${t('aiMatch.title')}</h1>
                    <p>${t('aiMatch.subtitle')}</p>
                </div>

                <form class="ai-form" onSubmit=${handleSubmit}>
                    <textarea
                        class="ai-input"
                        placeholder=${t('aiMatch.placeholder')}
                        value=${input}
                        onInput=${(e) => setInput(e.target.value)}
                        rows="5"
                    ></textarea>
                    <button type="submit" class="btn-primary btn-large" disabled=${loading || !input.trim()}>
                        ${loading ? t('aiMatch.finding') : `✨ ${t('aiMatch.findBtn')}`}
                    </button>
                </form>

                ${loading && html`
                    <div class="ai-loading">
                        <div class="spinner-large"></div>
                        <p>${t('aiMatch.analyzing')}</p>
                    </div>
                `}

                ${recommendations.length > 0 && html`
                    <div class="ai-results">
                        <h2>${t('aiMatch.resultsTitle')}</h2>
                        <div class="recommendation-list">
                            ${recommendations.map(coach => html`
                                <div key=${coach.id} class="recommendation-card">
                                    <div class="match-badge">${coach.matchScore}% ${t('aiMatch.match')}</div>
                                    <img src=${coach.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(coach.full_name)}`} alt=${coach.full_name} />
                                    <div class="rec-info">
                                        <h3>${coach.full_name}</h3>
                                        <p class="rec-title">${coach.title}</p>
                                        <p class="rec-reason">${coach.aiReason}</p>
                                        <div class="rec-meta">
                                            <span>${formatPrice(coach.hourly_rate)}/hr</span>
                                            <button class="btn-primary btn-sm" onClick=${() => window.navigateTo('/coaches')}>
                                                ${t('aiMatch.viewProfile')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `)}
                        </div>
                    </div>
                `}

                <div class="ai-alternative">
                    <p>${t('aiMatch.alternative')}</p>
                    <a href="/quiz" class="btn-secondary">${t('aiMatch.alternativeBtn')} →</a>
                </div>
            </div>
        </div>
    `;
};
