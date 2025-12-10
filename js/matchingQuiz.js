// js/matchingQuiz.js - Coach Matching Quiz Components
import htm from './vendor/htm.js';
import { t, getCurrentLang } from './i18n.js';
import { setPageMeta } from './utils/seo.js';
import { CoachCardFeatured, TrustScore } from './coachProfile.js';
import { CoachProfileModal } from './coachProfileModal.js';

const React = window.React;
const { useState, useEffect, useCallback, useMemo, useRef } = React;
const html = htm.bind(React.createElement);

// =============================================
// QUIZ PROGRESS BAR
// =============================================

export const QuizProgress = ({ current, total, onBack }) => {
    const progress = ((current) / total) * 100;

    return html`
        <div class="quiz-progress">
            <button
                class="quiz-back-btn"
                onClick=${onBack}
                disabled=${current === 0}
            >
                ← ${t('quiz.back') || 'Back'}
            </button>

            <div class="progress-bar-container">
                <div class="progress-bar">
                    <div class="progress-fill" style=${{ width: `${progress}%` }}></div>
                </div>
                <span class="progress-text">
                    ${current + 1} / ${total}
                </span>
            </div>

            <div class="progress-spacer"></div>
        </div>
    `;
};

// =============================================
// QUIZ QUESTION COMPONENT
// =============================================

export const QuizQuestion = ({
    question,
    value,
    onChange,
    onNext,
    isLast
}) => {
    const lang = getCurrentLang();
    const questionText = question.question_text?.[lang] || question.question_text?.en || question.question_text;
    const options = question.options || [];

    const handleOptionClick = (optionValue) => {
        if (question.question_type === 'multiple') {
            // Toggle selection for multiple choice
            const currentValues = Array.isArray(value) ? value : [];
            const newValues = currentValues.includes(optionValue)
                ? currentValues.filter(v => v !== optionValue)
                : [...currentValues, optionValue];
            onChange(newValues);
        } else {
            // Single selection - set and auto-advance
            onChange(optionValue);
            // Small delay for visual feedback before advancing
            setTimeout(() => onNext(), 300);
        }
    };

    const isSelected = (optionValue) => {
        if (question.question_type === 'multiple') {
            return Array.isArray(value) && value.includes(optionValue);
        }
        return value === optionValue;
    };

    const canProceed = () => {
        if (!question.is_required) return true;
        if (question.question_type === 'multiple') {
            return Array.isArray(value) && value.length > 0;
        }
        if (question.question_type === 'text') {
            return value && value.trim().length > 0;
        }
        return value !== null && value !== undefined;
    };

    return html`
        <div class="quiz-question">
            <h2 class="question-text">${questionText}</h2>

            ${question.question_type === 'text' ? html`
                <div class="question-text-input">
                    <input
                        type="text"
                        class="quiz-text-input"
                        placeholder=${t('quiz.typeHere') || 'Type your answer...'}
                        value=${value || ''}
                        onChange=${(e) => onChange(e.target.value)}
                        onKeyPress=${(e) => {
                            if (e.key === 'Enter' && canProceed()) {
                                onNext();
                            }
                        }}
                    />
                </div>
            ` : html`
                <div class="question-options ${question.question_type === 'multiple' ? 'multiple' : 'single'}">
                    ${options.map(option => {
                        const optionLabel = option.label?.[lang] || option.label?.en || option.label;
                        return html`
                            <button
                                key=${option.value}
                                class="question-option ${isSelected(option.value) ? 'selected' : ''}"
                                onClick=${() => handleOptionClick(option.value)}
                            >
                                ${option.icon && html`<span class="option-icon">${option.icon}</span>`}
                                <span class="option-label">${optionLabel}</span>
                                ${question.question_type === 'multiple' && html`
                                    <span class="option-checkbox">
                                        ${isSelected(option.value) ? '✓' : ''}
                                    </span>
                                `}
                            </button>
                        `;
                    })}
                </div>
            `}

            ${question.question_type === 'multiple' && html`
                <p class="question-hint">${t('quiz.selectMultiple') || 'Select all that apply'}</p>
            `}

            ${(question.question_type === 'multiple' || question.question_type === 'text') && html`
                <button
                    class="quiz-next-btn"
                    onClick=${onNext}
                    disabled=${!canProceed()}
                >
                    ${isLast
                        ? (t('quiz.seeResults') || 'See My Matches')
                        : (t('quiz.next') || 'Next')
                    }
                </button>
            `}
        </div>
    `;
};

// =============================================
// QUIZ INTRO SCREEN
// =============================================

export const QuizIntro = ({ onStart, onSkip }) => {
    return html`
        <div class="quiz-intro">
            <div class="quiz-intro-content">
                <span class="quiz-intro-icon">🎯</span>
                <h1 class="quiz-intro-title">${t('quiz.intro.title') || 'Find Your Perfect Coach'}</h1>
                <p class="quiz-intro-subtitle">
                    ${t('quiz.intro.subtitle') || 'Answer a few quick questions and we\'ll match you with coaches who fit your needs'}
                </p>

                <div class="quiz-intro-features">
                    <div class="intro-feature">
                        <span class="feature-icon">⏱️</span>
                        <span>${t('quiz.intro.feature1') || '2 minutes to complete'}</span>
                    </div>
                    <div class="intro-feature">
                        <span class="feature-icon">🎯</span>
                        <span>${t('quiz.intro.feature2') || 'Personalized matches'}</span>
                    </div>
                    <div class="intro-feature">
                        <span class="feature-icon">🔒</span>
                        <span>${t('quiz.intro.feature3') || 'No commitment required'}</span>
                    </div>
                </div>

                <button class="quiz-start-btn" onClick=${onStart}>
                    ${t('quiz.intro.start') || 'Start the Quiz'}
                </button>

                <button class="quiz-skip-btn" onClick=${onSkip}>
                    ${t('quiz.intro.skip') || 'Skip and browse all coaches'}
                </button>
            </div>
        </div>
    `;
};

// =============================================
// QUIZ LOADING/PROCESSING SCREEN
// =============================================

export const QuizProcessing = ({ useAI = true }) => {
    const [step, setStep] = useState(0);
    const steps = useAI ? [
        t('quiz.processing.step1') || 'Analyzing your preferences...',
        t('quiz.processing.aiStep1') || 'AI is reviewing coach profiles...',
        t('quiz.processing.aiStep2') || 'Evaluating compatibility factors...',
        t('quiz.processing.aiStep3') || 'Generating personalized insights...',
        t('quiz.processing.step4') || 'Preparing your results...'
    ] : [
        t('quiz.processing.step1') || 'Analyzing your preferences...',
        t('quiz.processing.step2') || 'Finding matching coaches...',
        t('quiz.processing.step3') || 'Calculating match scores...',
        t('quiz.processing.step4') || 'Preparing your results...'
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setStep(prev => (prev + 1) % steps.length);
        }, 1500);
        return () => clearInterval(interval);
    }, [steps.length]);

    return html`
        <div class="quiz-processing">
            <div class="processing-animation">
                <div class="processing-spinner"></div>
                <div class="processing-pulse"></div>
            </div>
            <h2 class="processing-title">${t('quiz.processing.title') || 'Finding Your Matches'}</h2>
            ${useAI && html`
                <span class="ai-badge">
                    <span class="ai-icon">✨</span>
                    ${t('quiz.processing.aiPowered') || 'AI-Powered Matching'}
                </span>
            `}
            <p class="processing-step">${steps[step]}</p>
        </div>
    `;
};

// =============================================
// MATCH CARD COMPONENT
// =============================================

export const MatchCard = ({ coach, matchScore, rank, onViewDetails, formatPrice, matchReasons, compatibilitySummary }) => {
    const matchPercentage = Math.round(matchScore);
    const [showReasons, setShowReasons] = useState(false);

    return html`
        <div class="match-card rank-${rank}">
            ${rank <= 3 && html`
                <div class="match-rank-badge">
                    ${rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                    ${t('quiz.match') || 'Match'} #${rank}
                </div>
            `}

            <div class="match-header">
                <div class="match-avatar-section">
                    <img
                        src=${coach.avatar_url || 'https://via.placeholder.com/80'}
                        alt=${coach.full_name}
                        class="match-avatar"
                    />
                    ${coach.is_verified && html`<span class="verified-badge">✓</span>`}
                </div>

                <div class="match-score-section">
                    <div class="match-score-circle">
                        <svg viewBox="0 0 100 100">
                            <circle class="score-bg" cx="50" cy="50" r="45" />
                            <circle
                                class="score-fill"
                                cx="50" cy="50" r="45"
                                style=${{
                                    strokeDasharray: `${matchPercentage * 2.83} 283`,
                                    stroke: matchPercentage >= 80 ? '#22C55E' :
                                            matchPercentage >= 60 ? '#F59E0B' : '#EF4444'
                                }}
                            />
                        </svg>
                        <span class="score-value">${matchPercentage}%</span>
                    </div>
                    <span class="score-label">${t('quiz.matchScore') || 'Match'}</span>
                </div>
            </div>

            <div class="match-info">
                <h3 class="match-name">${coach.full_name}</h3>
                <p class="match-title">${coach.title}</p>

                <!-- AI Compatibility Summary -->
                ${compatibilitySummary && html`
                    <p class="ai-compatibility-summary">
                        <span class="ai-icon">✨</span>
                        ${compatibilitySummary}
                    </p>
                `}

                <!-- AI Match Reasons (expandable) -->
                ${matchReasons && matchReasons.length > 0 && html`
                    <div class="match-reasons-section">
                        <button
                            class="toggle-reasons-btn"
                            onClick=${() => setShowReasons(!showReasons)}
                        >
                            ${showReasons
                                ? (t('quiz.hideReasons') || 'Hide reasons')
                                : (t('quiz.whyMatch') || 'Why this match?')}
                            <span class="toggle-icon">${showReasons ? '▲' : '▼'}</span>
                        </button>
                        ${showReasons && html`
                            <ul class="match-reasons-list">
                                ${matchReasons.map((reason, i) => html`
                                    <li key=${i} class="match-reason">
                                        <span class="reason-icon">✓</span>
                                        ${reason}
                                    </li>
                                `)}
                            </ul>
                        `}
                    </div>
                `}

                <div class="match-meta">
                    ${coach.location || coach.city ? html`
                        <span class="meta-item">📍 ${coach.location || coach.city}</span>
                    ` : null}
                    ${coach.years_experience > 0 && html`
                        <span class="meta-item">📅 ${coach.years_experience}+ ${t('coach.years') || 'years'}</span>
                    `}
                </div>

                ${coach.rating_average > 0 && html`
                    <div class="match-rating">
                        <span class="stars">★</span>
                        <span class="rating-value">${coach.rating_average.toFixed(1)}</span>
                        <span class="rating-count">(${coach.rating_count || 0})</span>
                    </div>
                `}

                ${coach.specialties?.length > 0 && html`
                    <div class="match-specialties">
                        ${coach.specialties.slice(0, 3).map(spec => html`
                            <span class="specialty-tag" key=${spec}>${spec}</span>
                        `)}
                    </div>
                `}

                <div class="match-price">
                    <span class="price-label">${t('coach.from') || 'From'}</span>
                    <span class="price-value">${formatPrice ? formatPrice(coach.hourly_rate) : `€${coach.hourly_rate}`}</span>
                    <span class="price-per">/${t('coach.session') || 'session'}</span>
                </div>
            </div>

            <div class="match-actions">
                ${coach.video_intro_url && html`
                    <span class="has-video-badge">🎥 ${t('quiz.hasVideo') || 'Video intro'}</span>
                `}
                <button class="btn-view-profile" onClick=${() => onViewDetails(coach)}>
                    ${t('quiz.viewProfile') || 'View Profile'}
                </button>
            </div>
        </div>
    `;
};

// =============================================
// QUIZ RESULTS PAGE
// =============================================

export const QuizResults = ({
    matches,
    answers,
    onViewDetails,
    onRetake,
    onBrowseAll,
    formatPrice,
    session,
    aiPowered = false,
    aiInsights = null
}) => {
    const [selectedCoach, setSelectedCoach] = useState(null);
    const [showEmailCapture, setShowEmailCapture] = useState(false);
    const [email, setEmail] = useState('');
    const [emailSaved, setEmailSaved] = useState(false);

    const handleSaveResults = async () => {
        if (!email) return;

        try {
            const supabase = window.supabaseClient;
            if (!supabase) return;

            const sessionId = sessionStorage.getItem('quiz_session_id');

            // Update quiz response with email
            await supabase
                .from('cs_quiz_responses')
                .update({
                    email: email,
                    results_viewed_at: new Date().toISOString()
                })
                .eq('session_id', sessionId);

            setEmailSaved(true);
            setShowEmailCapture(false);
        } catch (error) {
            console.error('Error saving email:', error);
        }
    };

    const topMatches = matches.slice(0, 5);
    const otherMatches = matches.slice(5);

    return html`
        <div class="quiz-results">
            <div class="results-header">
                <h1 class="results-title">${t('quiz.results.title') || 'Your Coach Matches'}</h1>
                <p class="results-subtitle">
                    ${t('quiz.results.subtitle') || 'Based on your preferences, here are your best matches'}
                </p>
                ${aiPowered && html`
                    <div class="ai-powered-badge">
                        <span class="ai-icon">✨</span>
                        ${t('quiz.results.aiPowered') || 'AI-Powered Recommendations'}
                    </div>
                `}
            </div>

            <!-- AI Insights Section -->
            ${aiInsights && html`
                <div class="ai-insights-section">
                    <div class="ai-insights-header">
                        <span class="ai-icon">🤖</span>
                        <h3>${t('quiz.results.aiInsights') || 'AI Analysis'}</h3>
                    </div>
                    <p class="ai-insights-text">${aiInsights}</p>
                </div>
            `}

            <!-- Top Matches -->
            <div class="top-matches">
                <h2 class="matches-section-title">
                    <span class="section-icon">🏆</span>
                    ${t('quiz.results.topMatches') || 'Top Matches'}
                </h2>
                <div class="matches-grid">
                    ${topMatches.map((match, index) => html`
                        <${MatchCard}
                            key=${match.coach_id}
                            coach=${match.coach_data}
                            matchScore=${match.match_score}
                            rank=${index + 1}
                            onViewDetails=${(coach) => setSelectedCoach(coach)}
                            formatPrice=${formatPrice}
                            matchReasons=${match.match_reasons}
                            compatibilitySummary=${match.compatibility_summary}
                        />
                    `)}
                </div>
            </div>

            <!-- Other Matches -->
            ${otherMatches.length > 0 && html`
                <div class="other-matches">
                    <h2 class="matches-section-title">
                        <span class="section-icon">👨‍🏫</span>
                        ${t('quiz.results.otherMatches') || 'More Matches'}
                    </h2>
                    <div class="matches-list">
                        ${otherMatches.map((match, index) => html`
                            <${MatchCard}
                                key=${match.coach_id}
                                coach=${match.coach_data}
                                matchScore=${match.match_score}
                                rank=${topMatches.length + index + 1}
                                onViewDetails=${(coach) => setSelectedCoach(coach)}
                                formatPrice=${formatPrice}
                            />
                        `)}
                    </div>
                </div>
            `}

            <!-- Save Results CTA -->
            ${!session && !emailSaved && html`
                <div class="save-results-section">
                    ${showEmailCapture ? html`
                        <div class="email-capture">
                            <h3>${t('quiz.results.saveTitle') || 'Save Your Results'}</h3>
                            <p>${t('quiz.results.saveDesc') || 'Enter your email to save these matches and receive updates'}</p>
                            <div class="email-form">
                                <input
                                    type="email"
                                    placeholder=${t('quiz.results.emailPlaceholder') || 'your@email.com'}
                                    value=${email}
                                    onChange=${(e) => setEmail(e.target.value)}
                                />
                                <button onClick=${handleSaveResults}>
                                    ${t('quiz.results.save') || 'Save'}
                                </button>
                            </div>
                            <button class="cancel-btn" onClick=${() => setShowEmailCapture(false)}>
                                ${t('common.cancel') || 'Cancel'}
                            </button>
                        </div>
                    ` : html`
                        <button class="save-results-btn" onClick=${() => setShowEmailCapture(true)}>
                            📧 ${t('quiz.results.saveResults') || 'Save My Results'}
                        </button>
                    `}
                </div>
            `}

            ${emailSaved && html`
                <div class="results-saved-notice">
                    ✓ ${t('quiz.results.saved') || 'Results saved! Check your email.'}
                </div>
            `}

            <!-- Actions -->
            <div class="results-actions">
                <button class="btn-retake" onClick=${onRetake}>
                    🔄 ${t('quiz.results.retake') || 'Retake Quiz'}
                </button>
                <button class="btn-browse" onClick=${onBrowseAll}>
                    ${t('quiz.results.browseAll') || 'Browse All Coaches'}
                </button>
            </div>

            <!-- Need Help Section -->
            <div class="need-help-section">
                <h3>${t('quiz.results.needHelp') || 'Need help choosing?'}</h3>
                <p>${t('quiz.results.conciergeDesc') || 'Our team can provide personalized recommendations based on your specific needs.'}</p>
                <button class="btn-concierge">
                    ${t('quiz.results.talkToUs') || 'Talk to Our Team'}
                </button>
            </div>

            <!-- Profile Modal -->
            ${selectedCoach && html`
                <${CoachProfileModal}
                    coach=${selectedCoach}
                    onClose=${() => setSelectedCoach(null)}
                    formatPrice=${formatPrice}
                    session=${session}
                />
            `}
        </div>
    `;
};

// =============================================
// MAIN QUIZ CONTAINER
// =============================================

// API configuration
const API_BASE = window.CONFIG?.API_URL || 'https://clouedo.com/coachsearching/api';

export const MatchingQuiz = ({
    onComplete,
    onSkip,
    session,
    formatPrice,
    enableAI = true // Enable AI matching by default
}) => {
    const [stage, setStage] = useState('intro'); // intro, questions, processing, results
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [matches, setMatches] = useState([]);
    const [quizSessionId, setQuizSessionId] = useState(null);
    const [aiPowered, setAiPowered] = useState(false);
    const [aiInsights, setAiInsights] = useState(null);

    // Set SEO meta tags for quiz page
    useEffect(() => {
        setPageMeta({
            title: t('seo.quiz.title') || 'Find Your Perfect Coach - Matching Quiz',
            description: t('seo.quiz.description') || 'Take our free coaching match quiz to discover the perfect coach for your goals. Answer a few questions and get personalized recommendations.',
            url: 'https://coachsearching.com/#quiz',
            type: 'website',
        });
    }, []);

    // Load quiz questions
    useEffect(() => {
        const loadQuestions = async () => {
            const supabase = window.supabaseClient;
            if (!supabase) return;

            try {
                const { data, error } = await supabase
                    .from('cs_quiz_questions')
                    .select('*')
                    .eq('is_active', true)
                    .order('sort_order');

                if (error) {
                    console.error('Error loading questions:', error);
                    // Use fallback questions
                    setQuestions(getDefaultQuestions());
                } else {
                    setQuestions(data || getDefaultQuestions());
                }
            } catch (error) {
                console.error('Error:', error);
                setQuestions(getDefaultQuestions());
            }
        };

        loadQuestions();
    }, []);

    // Initialize quiz session
    useEffect(() => {
        if (stage === 'questions' && !quizSessionId) {
            const sessionId = crypto.randomUUID();
            setQuizSessionId(sessionId);
            sessionStorage.setItem('quiz_session_id', sessionId);

            // Create quiz response record
            createQuizResponse(sessionId);
        }
    }, [stage, quizSessionId]);

    const createQuizResponse = async (sessionId) => {
        try {
            const supabase = window.supabaseClient;
            if (!supabase) return;

            await supabase.from('cs_quiz_responses').insert({
                session_id: sessionId,
                user_id: session?.user?.id || null,
                started_at: new Date().toISOString(),
                utm_source: new URLSearchParams(window.location.search).get('utm_source'),
                utm_medium: new URLSearchParams(window.location.search).get('utm_medium'),
                utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign'),
                referrer: document.referrer,
                landing_page: window.location.pathname,
                device_type: getDeviceType()
            });
        } catch (error) {
            console.error('Error creating quiz response:', error);
        }
    };

    const handleStart = () => {
        setStage('questions');
    };

    const handleAnswer = (questionKey, value) => {
        setAnswers(prev => ({ ...prev, [questionKey]: value }));
    };

    const handleNext = async () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // Quiz complete - process results
            setStage('processing');
            await processQuizResults();
        }
    };

    const handleBack = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        } else {
            setStage('intro');
        }
    };

    const processQuizResults = async () => {
        try {
            // Try AI-powered matching first if enabled
            if (enableAI) {
                try {
                    const aiResponse = await fetch(`${API_BASE}/index.php?path=quiz/ai-matches`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            answers: answers,
                            limit: 10
                        })
                    });

                    const aiResult = await aiResponse.json();

                    if (aiResult.ai_powered && aiResult.matches?.length > 0) {
                        console.log('AI matching successful:', aiResult);
                        setMatches(aiResult.matches);
                        setAiPowered(true);
                        setAiInsights(aiResult.ai_insights || null);

                        // Save quiz results
                        await saveQuizResults(aiResult.matches);

                        // Small delay for visual effect
                        setTimeout(() => {
                            setStage('results');
                        }, 2000);
                        return;
                    }

                    // AI returned but didn't work - log and continue to fallback
                    if (aiResult.fallback_reason) {
                        console.log('AI matching fallback:', aiResult.fallback_reason);
                    }

                    // Use the matches from the fallback if available
                    if (aiResult.matches?.length > 0) {
                        setMatches(aiResult.matches);
                        setAiPowered(false);

                        await saveQuizResults(aiResult.matches);

                        setTimeout(() => {
                            setStage('results');
                        }, 2000);
                        return;
                    }
                } catch (aiError) {
                    console.error('AI matching request failed:', aiError);
                    // Continue to fallback methods
                }
            }

            // Fallback: Try standard API matching
            try {
                const response = await fetch(`${API_BASE}/index.php?path=quiz/matches`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        answers: answers,
                        limit: 10
                    })
                });

                const result = await response.json();

                if (result.matches?.length > 0) {
                    setMatches(result.matches);
                    setAiPowered(false);

                    await saveQuizResults(result.matches);

                    setTimeout(() => {
                        setStage('results');
                    }, 2000);
                    return;
                }
            } catch (apiError) {
                console.error('API matching failed:', apiError);
            }

            // Final fallback: Direct Supabase query
            const supabase = window.supabaseClient;
            if (supabase) {
                const { data: coaches } = await supabase
                    .from('cs_coaches')
                    .select('*')
                    .eq('onboarding_completed', true)
                    .order('video_intro_url', { ascending: false, nullsLast: true })
                    .order('trust_score', { ascending: false })
                    .limit(10);

                const fallbackMatches = (coaches || []).map((coach, i) => ({
                    coach_id: coach.id,
                    match_score: 90 - (i * 5),
                    coach_data: coach
                }));

                setMatches(fallbackMatches);
                setAiPowered(false);
            }

            setTimeout(() => {
                setStage('results');
            }, 2000);
        } catch (error) {
            console.error('Error processing quiz:', error);
            setStage('results');
        }
    };

    const saveQuizResults = async (matchResults) => {
        try {
            const supabase = window.supabaseClient;
            if (!supabase || !quizSessionId) return;

            await supabase
                .from('cs_quiz_responses')
                .update({
                    answers: answers,
                    matched_coach_ids: matchResults?.map(m => m.coach_id) || [],
                    match_scores: matchResults?.reduce((acc, m) => {
                        acc[m.coach_id] = m.match_score;
                        return acc;
                    }, {}) || {},
                    completed_at: new Date().toISOString()
                })
                .eq('session_id', quizSessionId);
        } catch (error) {
            console.error('Error saving quiz results:', error);
        }
    };

    const handleRetake = () => {
        setAnswers({});
        setCurrentIndex(0);
        setMatches([]);
        setQuizSessionId(null);
        setAiPowered(false);
        setAiInsights(null);
        setStage('intro');
    };

    const currentQuestion = questions[currentIndex];

    return html`
        <div class="matching-quiz">
            ${stage === 'intro' && html`
                <${QuizIntro} onStart=${handleStart} onSkip=${onSkip} />
            `}

            ${stage === 'questions' && currentQuestion && html`
                <div class="quiz-container">
                    <${QuizProgress}
                        current=${currentIndex}
                        total=${questions.length}
                        onBack=${handleBack}
                    />
                    <${QuizQuestion}
                        question=${currentQuestion}
                        value=${answers[currentQuestion.question_key]}
                        onChange=${(value) => handleAnswer(currentQuestion.question_key, value)}
                        onNext=${handleNext}
                        isLast=${currentIndex === questions.length - 1}
                    />
                </div>
            `}

            ${stage === 'processing' && html`
                <${QuizProcessing} useAI=${enableAI} />
            `}

            ${stage === 'results' && html`
                <${QuizResults}
                    matches=${matches}
                    answers=${answers}
                    onViewDetails=${(coach) => onComplete && onComplete(coach)}
                    onRetake=${handleRetake}
                    onBrowseAll=${onSkip}
                    formatPrice=${formatPrice}
                    session=${session}
                    aiPowered=${aiPowered}
                    aiInsights=${aiInsights}
                />
            `}
        </div>
    `;
};

// =============================================
// UTILITY FUNCTIONS
// =============================================

const getDeviceType = () => {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
};

// Default questions if database fails
const getDefaultQuestions = () => [
    {
        question_key: 'goal',
        question_text: { en: "What's your primary coaching goal?" },
        question_type: 'single',
        options: [
            { value: 'career', label: { en: 'Career Growth' }, icon: '💼' },
            { value: 'leadership', label: { en: 'Leadership Development' }, icon: '👔' },
            { value: 'life', label: { en: 'Life Balance' }, icon: '⚖️' },
            { value: 'health', label: { en: 'Health & Wellness' }, icon: '🏃' },
            { value: 'business', label: { en: 'Business Strategy' }, icon: '📈' }
        ],
        is_required: true
    },
    {
        question_key: 'experience',
        question_text: { en: 'Have you worked with a coach before?' },
        question_type: 'single',
        options: [
            { value: 'first_time', label: { en: 'This is my first time' }, icon: '🌟' },
            { value: 'some', label: { en: "I've had a few sessions" }, icon: '📝' },
            { value: 'experienced', label: { en: "I'm experienced with coaching" }, icon: '🎯' }
        ],
        is_required: true
    },
    {
        question_key: 'session_type',
        question_text: { en: 'How would you prefer to meet?' },
        question_type: 'single',
        options: [
            { value: 'online', label: { en: 'Online (Video call)' }, icon: '💻' },
            { value: 'onsite', label: { en: 'In-person' }, icon: '🏢' },
            { value: 'both', label: { en: 'Both work for me' }, icon: '✨' }
        ],
        is_required: true
    },
    {
        question_key: 'budget',
        question_text: { en: "What's your budget per session?" },
        question_type: 'single',
        options: [
            { value: 'under_50', label: { en: 'Under €50' }, icon: '💰' },
            { value: '50_100', label: { en: '€50 - €100' }, icon: '💰💰' },
            { value: '100_200', label: { en: '€100 - €200' }, icon: '💰💰💰' },
            { value: '200_plus', label: { en: '€200+' }, icon: '💎' }
        ],
        is_required: true
    },
    {
        question_key: 'language',
        question_text: { en: 'What language do you prefer?' },
        question_type: 'multiple',
        options: [
            { value: 'en', label: { en: 'English' }, icon: '🇬🇧' },
            { value: 'de', label: { en: 'German' }, icon: '🇩🇪' },
            { value: 'es', label: { en: 'Spanish' }, icon: '🇪🇸' },
            { value: 'fr', label: { en: 'French' }, icon: '🇫🇷' },
            { value: 'it', label: { en: 'Italian' }, icon: '🇮🇹' }
        ],
        is_required: true
    }
];

// =============================================
// CONCIERGE REQUEST FORM
// =============================================

export const ConciergeRequestForm = ({ onSubmit, onCancel, quizAnswers }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        preferred_contact: 'email',
        coaching_goals: '',
        budget_range: '',
        timeline: '',
        additional_notes: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const supabase = window.supabaseClient;
            if (!supabase) {
                throw new Error('Database not available');
            }

            const sessionId = sessionStorage.getItem('quiz_session_id');

            // Get quiz response ID if exists
            let quizResponseId = null;
            if (sessionId) {
                const { data } = await supabase
                    .from('cs_quiz_responses')
                    .select('id')
                    .eq('session_id', sessionId)
                    .single();
                quizResponseId = data?.id;
            }

            await supabase.from('cs_concierge_requests').insert({
                ...formData,
                quiz_response_id: quizResponseId,
                status: 'pending'
            });

            setSubmitted(true);
            onSubmit && onSubmit(formData);
        } catch (error) {
            console.error('Error submitting concierge request:', error);
            alert(t('concierge.error') || 'Error submitting request. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return html`
            <div class="concierge-success">
                <span class="success-icon">✓</span>
                <h2>${t('concierge.success.title') || 'Request Submitted!'}</h2>
                <p>${t('concierge.success.message') || 'Our team will contact you within 24 hours with personalized coach recommendations.'}</p>
                <button class="btn-close" onClick=${onCancel}>
                    ${t('common.close') || 'Close'}
                </button>
            </div>
        `;
    }

    return html`
        <div class="concierge-form-container">
            <div class="concierge-header">
                <h2>${t('concierge.title') || 'Get Personalized Help'}</h2>
                <p>${t('concierge.subtitle') || 'Tell us about your needs and our team will find the perfect coach for you.'}</p>
            </div>

            <form class="concierge-form" onSubmit=${handleSubmit}>
                <div class="form-row">
                    <div class="form-group">
                        <label>${t('concierge.name') || 'Name'} *</label>
                        <input
                            type="text"
                            required
                            value=${formData.name}
                            onChange=${(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div class="form-group">
                        <label>${t('concierge.email') || 'Email'} *</label>
                        <input
                            type="email"
                            required
                            value=${formData.email}
                            onChange=${(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>${t('concierge.phone') || 'Phone'}</label>
                        <input
                            type="tel"
                            value=${formData.phone}
                            onChange=${(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>
                    <div class="form-group">
                        <label>${t('concierge.preferredContact') || 'Preferred Contact Method'}</label>
                        <select
                            value=${formData.preferred_contact}
                            onChange=${(e) => setFormData({ ...formData, preferred_contact: e.target.value })}
                        >
                            <option value="email">${t('concierge.email') || 'Email'}</option>
                            <option value="phone">${t('concierge.phone') || 'Phone'}</option>
                            <option value="whatsapp">WhatsApp</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label>${t('concierge.goals') || 'What are your coaching goals?'} *</label>
                    <textarea
                        required
                        rows="3"
                        value=${formData.coaching_goals}
                        onChange=${(e) => setFormData({ ...formData, coaching_goals: e.target.value })}
                        placeholder=${t('concierge.goalsPlaceholder') || 'Describe what you hope to achieve...'}
                    ></textarea>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>${t('concierge.budget') || 'Budget Range'}</label>
                        <select
                            value=${formData.budget_range}
                            onChange=${(e) => setFormData({ ...formData, budget_range: e.target.value })}
                        >
                            <option value="">${t('concierge.selectBudget') || 'Select budget...'}</option>
                            <option value="under_100">${t('concierge.under100') || 'Under €100/session'}</option>
                            <option value="100_200">€100 - €200/${t('coach.session') || 'session'}</option>
                            <option value="200_plus">€200+/${t('coach.session') || 'session'}</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>${t('concierge.timeline') || 'When do you want to start?'}</label>
                        <select
                            value=${formData.timeline}
                            onChange=${(e) => setFormData({ ...formData, timeline: e.target.value })}
                        >
                            <option value="">${t('concierge.selectTimeline') || 'Select timeline...'}</option>
                            <option value="asap">${t('concierge.asap') || 'As soon as possible'}</option>
                            <option value="within_week">${t('concierge.withinWeek') || 'Within a week'}</option>
                            <option value="within_month">${t('concierge.withinMonth') || 'Within a month'}</option>
                            <option value="exploring">${t('concierge.exploring') || 'Just exploring'}</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label>${t('concierge.notes') || 'Additional Notes'}</label>
                    <textarea
                        rows="2"
                        value=${formData.additional_notes}
                        onChange=${(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                        placeholder=${t('concierge.notesPlaceholder') || 'Any other preferences or requirements...'}
                    ></textarea>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn-cancel" onClick=${onCancel}>
                        ${t('common.cancel') || 'Cancel'}
                    </button>
                    <button type="submit" class="btn-submit" disabled=${submitting}>
                        ${submitting
                            ? (t('common.submitting') || 'Submitting...')
                            : (t('concierge.submit') || 'Submit Request')
                        }
                    </button>
                </div>
            </form>
        </div>
    `;
};

// =============================================
// EXPORTS
// =============================================

export default {
    QuizProgress,
    QuizQuestion,
    QuizIntro,
    QuizProcessing,
    MatchCard,
    QuizResults,
    MatchingQuiz,
    ConciergeRequestForm
};
