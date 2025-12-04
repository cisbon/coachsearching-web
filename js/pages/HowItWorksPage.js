/**
 * How It Works Page Component
 * @fileoverview Step-by-step guide with HowTo schema for SEO
 */

import htm from '../vendor/htm.js';
import { t } from '../i18n.js';
import {
    setPageMeta,
    setStructuredData,
    generateHowToSchema,
    generateBreadcrumbSchema,
} from '../utils/seo.js';

const React = window.React;
const { useEffect, useState } = React;
const html = htm.bind(React.createElement);

// ============================================================================
// Steps Data - For Clients (using translation keys)
// ============================================================================

const getClientSteps = () => [
    {
        number: 1,
        title: t('hiw.client.step1.title'),
        description: t('hiw.client.step1.desc'),
        icon: '👤',
        tips: [
            t('hiw.client.step1.tip1'),
            t('hiw.client.step1.tip2'),
        ],
    },
    {
        number: 2,
        title: t('hiw.client.step2.title'),
        description: t('hiw.client.step2.desc'),
        icon: '🔍',
        tips: [
            t('hiw.client.step2.tip1'),
            t('hiw.client.step2.tip2'),
            t('hiw.client.step2.tip3'),
        ],
    },
    {
        number: 3,
        title: t('hiw.client.step3.title'),
        description: t('hiw.client.step3.desc'),
        icon: '📅',
        tips: [
            t('hiw.client.step3.tip1'),
            t('hiw.client.step3.tip2'),
            t('hiw.client.step3.tip3'),
        ],
    },
    {
        number: 4,
        title: t('hiw.client.step4.title'),
        description: t('hiw.client.step4.desc'),
        icon: '💬',
        tips: [
            t('hiw.client.step4.tip1'),
            t('hiw.client.step4.tip2'),
            t('hiw.client.step4.tip3'),
        ],
    },
    {
        number: 5,
        title: t('hiw.client.step5.title'),
        description: t('hiw.client.step5.desc'),
        icon: '📈',
        tips: [
            t('hiw.client.step5.tip1'),
            t('hiw.client.step5.tip2'),
            t('hiw.client.step5.tip3'),
        ],
    },
    {
        number: 6,
        title: t('hiw.client.step6.title'),
        description: t('hiw.client.step6.desc'),
        icon: '⭐',
        tips: [
            t('hiw.client.step6.tip1'),
            t('hiw.client.step6.tip2'),
            t('hiw.client.step6.tip3'),
        ],
    },
];

// ============================================================================
// Steps Data - For Coaches (using translation keys)
// ============================================================================

const getCoachSteps = () => [
    {
        number: 1,
        title: t('hiw.coach.step1.title'),
        description: t('hiw.coach.step1.desc'),
        icon: '📝',
        requirements: [
            t('hiw.coach.step1.req1'),
            t('hiw.coach.step1.req2'),
            t('hiw.coach.step1.req3'),
        ],
    },
    {
        number: 2,
        title: t('hiw.coach.step2.title'),
        description: t('hiw.coach.step2.desc'),
        icon: '✅',
        requirements: [
            t('hiw.coach.step2.req1'),
            t('hiw.coach.step2.req2'),
            t('hiw.coach.step2.req3'),
        ],
    },
    {
        number: 3,
        title: t('hiw.coach.step3.title'),
        description: t('hiw.coach.step3.desc'),
        icon: '🎨',
        tips: [
            t('hiw.coach.step3.tip1'),
            t('hiw.coach.step3.tip2'),
            t('hiw.coach.step3.tip3'),
            t('hiw.coach.step3.tip4'),
        ],
    },
    {
        number: 4,
        title: t('hiw.coach.step4.title'),
        description: t('hiw.coach.step4.desc'),
        icon: '⏰',
        tips: [
            t('hiw.coach.step4.tip1'),
            t('hiw.coach.step4.tip2'),
            t('hiw.coach.step4.tip3'),
        ],
    },
    {
        number: 5,
        title: t('hiw.coach.step5.title'),
        description: t('hiw.coach.step5.desc'),
        icon: '🤝',
        tips: [
            t('hiw.coach.step5.tip1'),
            t('hiw.coach.step5.tip2'),
            t('hiw.coach.step5.tip3'),
        ],
    },
    {
        number: 6,
        title: t('hiw.coach.step6.title'),
        description: t('hiw.coach.step6.desc'),
        icon: '🚀',
        tips: [
            t('hiw.coach.step6.tip1'),
            t('hiw.coach.step6.tip2'),
            t('hiw.coach.step6.tip3'),
        ],
    },
];

// ============================================================================
// FAQ Data for How It Works (using translation keys)
// ============================================================================

const getHowItWorksFAQ = () => [
    {
        question: t('hiw.faq.q1'),
        answer: t('hiw.faq.a1'),
    },
    {
        question: t('hiw.faq.q2'),
        answer: t('hiw.faq.a2'),
    },
    {
        question: t('hiw.faq.q3'),
        answer: t('hiw.faq.a3'),
    },
    {
        question: t('hiw.faq.q4'),
        answer: t('hiw.faq.a4'),
    },
];

// ============================================================================
// Comparison Table Data (using translation keys)
// ============================================================================

const getComparisonData = () => [
    {
        feature: t('hiw.compare.verifiedCoaches'),
        us: t('hiw.compare.allVerified'),
        them: t('hiw.compare.noVerification'),
    },
    {
        feature: t('hiw.compare.reviews'),
        us: t('hiw.compare.verifiedReviews'),
        them: t('hiw.compare.unverifiedTestimonials'),
    },
    {
        feature: t('hiw.compare.securePayments'),
        us: t('hiw.compare.protectedTransactions'),
        them: t('hiw.compare.directPayments'),
    },
    {
        feature: t('hiw.compare.easyBooking'),
        us: t('hiw.compare.onlineScheduling'),
        them: t('hiw.compare.backAndForth'),
    },
    {
        feature: t('hiw.compare.priceTransparency'),
        us: t('hiw.compare.clearPricing'),
        them: t('hiw.compare.hiddenCosts'),
    },
    {
        feature: t('hiw.compare.support'),
        us: t('hiw.compare.platformSupport'),
        them: t('hiw.compare.noSupport'),
    },
];

// ============================================================================
// Components
// ============================================================================

function StepCard({ number, title, description, icon, tips, requirements, isActive, onClick }) {
    return html`
        <div
            class="step-card ${isActive ? 'active' : ''}"
            onClick=${onClick}
            role="button"
            tabIndex="0"
        >
            <div class="step-header">
                <div class="step-number">${number}</div>
                <div class="step-icon">${icon}</div>
            </div>
            <h3 class="step-title">${title}</h3>
            <p class="step-description">${description}</p>
            ${tips && tips.length > 0 && tips[0] && html`
                <div class="step-tips">
                    <strong>${t('hiw.tips')}:</strong>
                    <ul>
                        ${tips.filter(tip => tip).map(tip => html`<li key=${tip}>${tip}</li>`)}
                    </ul>
                </div>
            `}
            ${requirements && requirements.length > 0 && requirements[0] && html`
                <div class="step-requirements">
                    <strong>${t('hiw.requirements')}:</strong>
                    <ul>
                        ${requirements.filter(req => req).map(req => html`<li key=${req}>${req}</li>`)}
                    </ul>
                </div>
            `}
        </div>
    `;
}

function ProcessTimeline({ steps, activeStep, onStepClick }) {
    return html`
        <div class="process-timeline">
            ${steps.map((step, index) => html`
                <div
                    key=${step.number}
                    class="timeline-step ${activeStep === index ? 'active' : ''} ${index < activeStep ? 'completed' : ''}"
                    onClick=${() => onStepClick(index)}
                >
                    <div class="timeline-marker">
                        <span class="timeline-icon">${step.icon}</span>
                    </div>
                    <div class="timeline-label">${step.title}</div>
                    ${index < steps.length - 1 && html`<div class="timeline-connector"></div>`}
                </div>
            `)}
        </div>
    `;
}

function ComparisonTable() {
    const comparisonData = getComparisonData();
    return html`
        <div class="comparison-table-wrapper">
            <table class="comparison-table">
                <thead>
                    <tr>
                        <th>${t('hiw.compare.feature')}</th>
                        <th>CoachSearching</th>
                        <th>${t('hiw.compare.traditional')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${comparisonData.map(row => html`
                        <tr key=${row.feature}>
                            <td>${row.feature}</td>
                            <td class="yes">✓ ${row.us}</td>
                            <td class="no">✗ ${row.them}</td>
                        </tr>
                    `)}
                </tbody>
            </table>
        </div>
    `;
}

// ============================================================================
// Main How It Works Page Component
// ============================================================================

export function HowItWorksPage() {
    const [activeTab, setActiveTab] = useState('clients');
    const [activeStep, setActiveStep] = useState(0);

    const steps = activeTab === 'clients' ? getClientSteps() : getCoachSteps();

    // Set SEO meta tags
    useEffect(() => {
        setPageMeta({
            title: t('hiw.pageTitle'),
            description: t('hiw.pageDescription'),
            url: 'https://coachsearching.com/#how-it-works',
        });

        // HowTo schema for clients
        const clientSteps = getClientSteps();
        setStructuredData('howto-schema', generateHowToSchema({
            name: t('hiw.schemaName'),
            description: t('hiw.schemaDescription'),
            totalTime: 'PT10M',
            steps: clientSteps.map(step => ({
                name: step.title,
                text: step.description,
            })),
        }));

        // Breadcrumb schema
        setStructuredData('breadcrumb-schema', generateBreadcrumbSchema([
            { name: t('nav.home'), url: 'https://coachsearching.com' },
            { name: t('hiw.title'), url: 'https://coachsearching.com/#how-it-works' },
        ]));
    }, []);

    const howItWorksFAQ = getHowItWorksFAQ();

    return html`
        <div class="how-it-works-page">
            <!-- Hero Section -->
            <section class="hiw-hero">
                <div class="container">
                    <h1>${t('hiw.heroTitle')}</h1>
                    <p class="hero-subtitle">
                        ${t('hiw.heroSubtitle')}
                    </p>
                </div>
            </section>

            <!-- Tab Selector -->
            <section class="hiw-tabs">
                <div class="container">
                    <div class="tab-buttons">
                        <button
                            class="tab-btn ${activeTab === 'clients' ? 'active' : ''}"
                            onClick=${() => { setActiveTab('clients'); setActiveStep(0); }}
                        >
                            ${t('hiw.forClients')}
                        </button>
                        <button
                            class="tab-btn ${activeTab === 'coaches' ? 'active' : ''}"
                            onClick=${() => { setActiveTab('coaches'); setActiveStep(0); }}
                        >
                            ${t('hiw.forCoaches')}
                        </button>
                    </div>
                </div>
            </section>

            <!-- Process Timeline -->
            <section class="hiw-timeline">
                <div class="container">
                    <${ProcessTimeline}
                        steps=${steps}
                        activeStep=${activeStep}
                        onStepClick=${setActiveStep}
                    />
                </div>
            </section>

            <!-- Step Details -->
            <section class="hiw-steps">
                <div class="container">
                    <h2>${activeTab === 'clients' ? t('hiw.journeyTitle') : t('hiw.buildPractice')}</h2>
                    <div class="steps-grid">
                        ${steps.map((step, index) => html`
                            <${StepCard}
                                key=${step.number}
                                ...${step}
                                isActive=${activeStep === index}
                                onClick=${() => setActiveStep(index)}
                            />
                        `)}
                    </div>
                </div>
            </section>

            <!-- Video Section -->
            <section class="hiw-video">
                <div class="container">
                    <h2>${t('hiw.videoTitle')}</h2>
                    <div class="video-wrapper">
                        <div class="video-placeholder">
                            <div class="play-button">▶</div>
                            <p>${t('hiw.videoCaption')}</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Comparison Section -->
            <section class="hiw-comparison">
                <div class="container">
                    <h2>${t('hiw.whyChoose')}</h2>
                    <p class="section-subtitle">
                        ${t('hiw.compareSubtitle')}
                    </p>
                    <${ComparisonTable} />
                </div>
            </section>

            <!-- Quick Start Guide -->
            <section class="hiw-quickstart">
                <div class="container">
                    <h2>${t('hiw.quickStartTitle')}</h2>
                    <div class="quickstart-cards">
                        <div class="quickstart-card">
                            <div class="qs-icon">⚡</div>
                            <h3>${t('hiw.inHurry')}</h3>
                            <p>${t('hiw.inHurryDesc')}</p>
                            <a href="#quiz" class="btn btn-primary">${t('hiw.takeQuiz')}</a>
                        </div>
                        <div class="quickstart-card">
                            <div class="qs-icon">🔍</div>
                            <h3>${t('hiw.knowWhatYouWant')}</h3>
                            <p>${t('hiw.knowWhatYouWantDesc')}</p>
                            <a href="#coaches" class="btn btn-secondary">${t('hiw.browseCoaches')}</a>
                        </div>
                        <div class="quickstart-card">
                            <div class="qs-icon">❓</div>
                            <h3>${t('hiw.haveQuestions')}</h3>
                            <p>${t('hiw.haveQuestionsDesc')}</p>
                            <a href="#faq" class="btn btn-secondary">${t('hiw.viewFaq')}</a>
                        </div>
                    </div>
                </div>
            </section>

            <!-- FAQ Section -->
            <section class="hiw-faq">
                <div class="container">
                    <h2>${t('hiw.commonQuestions')}</h2>
                    <div class="faq-list">
                        ${howItWorksFAQ.filter(faq => faq.question && faq.answer).map(faq => html`
                            <div class="faq-item" key=${faq.question}>
                                <h3>${faq.question}</h3>
                                <p>${faq.answer}</p>
                            </div>
                        `)}
                    </div>
                    <div class="faq-more">
                        <a href="#faq" class="btn btn-link">${t('hiw.viewAllFaqs')} →</a>
                    </div>
                </div>
            </section>

            <!-- CTA Section -->
            <section class="hiw-cta">
                <div class="container">
                    <h2>${t('hiw.readyToStart')}</h2>
                    <p>${t('hiw.transformationBegins')}</p>
                    <div class="cta-buttons">
                        ${activeTab === 'clients' ? html`
                            <a href="#coaches" class="btn btn-primary btn-lg">${t('hiw.findYourCoach')}</a>
                            <a href="#quiz" class="btn btn-secondary btn-lg">${t('hiw.takeQuiz')}</a>
                        ` : html`
                            <a href="#become-coach" class="btn btn-primary btn-lg">${t('hiw.applyNow')}</a>
                            <a href="#coach-resources" class="btn btn-secondary btn-lg">${t('hiw.learnMore')}</a>
                        `}
                    </div>
                </div>
            </section>
        </div>
    `;
}

export default HowItWorksPage;
