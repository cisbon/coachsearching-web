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
// Steps Data - For Clients
// ============================================================================

const CLIENT_STEPS = [
    {
        number: 1,
        title: 'Create Your Free Account',
        description: 'Sign up in seconds with your email or social login. No credit card required to browse coaches.',
        icon: '👤',
        tips: ['Use a professional email for better communication', 'Complete your profile for personalized recommendations'],
    },
    {
        number: 2,
        title: 'Find Your Perfect Coach',
        description: 'Browse our verified coaches by specialty, location, language, and price. Use our AI-powered quiz for personalized matches.',
        icon: '🔍',
        tips: ['Take the matching quiz for best results', 'Read reviews from other clients', 'Check certifications and experience'],
    },
    {
        number: 3,
        title: 'Book a Session',
        description: 'Choose a time that works for you, select online or in-person format, and book securely through our platform.',
        icon: '📅',
        tips: ['Many coaches offer free discovery calls', 'Book multiple sessions for package discounts', 'Check cancellation policies'],
    },
    {
        number: 4,
        title: 'Meet Your Coach',
        description: 'Connect with your coach via video call, phone, or in-person. Share your goals and start your transformation.',
        icon: '💬',
        tips: ['Prepare topics to discuss beforehand', 'Find a quiet, private space for online sessions', 'Be open and honest with your coach'],
    },
    {
        number: 5,
        title: 'Track Your Progress',
        description: 'Use session notes to track insights, set goals, and measure your progress over time.',
        icon: '📈',
        tips: ['Review notes before each session', 'Celebrate small wins', 'Adjust goals as you grow'],
    },
    {
        number: 6,
        title: 'Leave a Review',
        description: 'Help others find great coaches by sharing your experience. Your feedback helps maintain quality.',
        icon: '⭐',
        tips: ['Be specific about what helped', 'Mention the coaching style', 'Your review helps the community'],
    },
];

// ============================================================================
// Steps Data - For Coaches
// ============================================================================

const COACH_STEPS = [
    {
        number: 1,
        title: 'Apply to Join',
        description: 'Submit your application with your qualifications, certifications, and coaching experience.',
        icon: '📝',
        requirements: ['Coaching certification (ICF, EMCC, or equivalent)', 'Professional liability insurance', 'At least 100 coaching hours'],
    },
    {
        number: 2,
        title: 'Get Verified',
        description: 'Our team reviews your credentials and verifies your certifications. Usually takes 2-3 business days.',
        icon: '✅',
        requirements: ['Identity verification', 'Credential validation', 'Background check'],
    },
    {
        number: 3,
        title: 'Create Your Profile',
        description: 'Build a compelling profile that showcases your expertise, approach, and what makes you unique.',
        icon: '🎨',
        tips: ['Add a professional photo', 'Write a compelling bio', 'List all your specialties', 'Add a YouTube intro video'],
    },
    {
        number: 4,
        title: 'Set Your Availability',
        description: 'Define your schedule, session types, rates, and cancellation policy.',
        icon: '⏰',
        tips: ['Offer flexible time slots', 'Consider different session lengths', 'Be competitive with pricing'],
    },
    {
        number: 5,
        title: 'Connect With Clients',
        description: 'Receive booking requests, conduct sessions, and build your client base on our platform.',
        icon: '🤝',
        tips: ['Respond quickly to inquiries', 'Provide excellent service', 'Request reviews after sessions'],
    },
    {
        number: 6,
        title: 'Grow Your Practice',
        description: 'Build your reputation, earn reviews, and expand your coaching business.',
        icon: '🚀',
        tips: ['Maintain high ratings', 'Offer package deals', 'Specialize in your niche'],
    },
];

// ============================================================================
// FAQ Data for How It Works
// ============================================================================

const HOW_IT_WORKS_FAQ = [
    {
        question: 'Do I need to pay to browse coaches?',
        answer: 'No, browsing coaches and creating an account is completely free. You only pay when you book a session.',
    },
    {
        question: 'How long does it take to get matched with a coach?',
        answer: 'Our AI quiz takes about 5 minutes and provides instant recommendations. You can book a session immediately after.',
    },
    {
        question: 'What if I\'m not satisfied with my coach?',
        answer: 'We want you to find the perfect match. If you\'re not satisfied, contact support and we\'ll help you find a better fit.',
    },
    {
        question: 'Can I switch coaches?',
        answer: 'Absolutely! You\'re free to try different coaches until you find the one that\'s right for you.',
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
            ${tips && tips.length > 0 && html`
                <div class="step-tips">
                    <strong>Tips:</strong>
                    <ul>
                        ${tips.map(tip => html`<li key=${tip}>${tip}</li>`)}
                    </ul>
                </div>
            `}
            ${requirements && requirements.length > 0 && html`
                <div class="step-requirements">
                    <strong>Requirements:</strong>
                    <ul>
                        ${requirements.map(req => html`<li key=${req}>${req}</li>`)}
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
    return html`
        <div class="comparison-table-wrapper">
            <table class="comparison-table">
                <thead>
                    <tr>
                        <th>Feature</th>
                        <th>CoachSearching</th>
                        <th>Traditional Search</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Verified Coaches</td>
                        <td class="yes">✓ All coaches verified</td>
                        <td class="no">✗ No verification</td>
                    </tr>
                    <tr>
                        <td>Reviews</td>
                        <td class="yes">✓ Verified client reviews</td>
                        <td class="no">✗ Unverified testimonials</td>
                    </tr>
                    <tr>
                        <td>Secure Payments</td>
                        <td class="yes">✓ Protected transactions</td>
                        <td class="no">✗ Direct payments</td>
                    </tr>
                    <tr>
                        <td>Easy Booking</td>
                        <td class="yes">✓ Online scheduling</td>
                        <td class="no">✗ Back-and-forth emails</td>
                    </tr>
                    <tr>
                        <td>Price Transparency</td>
                        <td class="yes">✓ Clear upfront pricing</td>
                        <td class="no">✗ Hidden costs</td>
                    </tr>
                    <tr>
                        <td>Support</td>
                        <td class="yes">✓ 24/7 platform support</td>
                        <td class="no">✗ No support</td>
                    </tr>
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

    const steps = activeTab === 'clients' ? CLIENT_STEPS : COACH_STEPS;

    // Set SEO meta tags
    useEffect(() => {
        setPageMeta({
            title: 'How CoachSearching Works',
            description: 'Learn how to find and book coaching sessions on CoachSearching. Simple steps to connect with verified professional coaches for your personal and career development.',
            url: 'https://coachsearching.com/#how-it-works',
        });

        // HowTo schema for clients
        setStructuredData('howto-schema', generateHowToSchema({
            name: 'How to Find and Book a Coach on CoachSearching',
            description: 'A step-by-step guide to finding your perfect coach and booking your first session.',
            totalTime: 'PT10M',
            steps: CLIENT_STEPS.map(step => ({
                name: step.title,
                text: step.description,
            })),
        }));

        // Breadcrumb schema
        setStructuredData('breadcrumb-schema', generateBreadcrumbSchema([
            { name: 'Home', url: 'https://coachsearching.com' },
            { name: 'How It Works', url: 'https://coachsearching.com/#how-it-works' },
        ]));
    }, []);

    return html`
        <div class="how-it-works-page">
            <!-- Hero Section -->
            <section class="hiw-hero">
                <div class="container">
                    <h1>How CoachSearching Works</h1>
                    <p class="hero-subtitle">
                        Finding your perfect coach and booking sessions is simple.
                        Here's everything you need to know.
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
                            For Clients
                        </button>
                        <button
                            class="tab-btn ${activeTab === 'coaches' ? 'active' : ''}"
                            onClick=${() => { setActiveTab('coaches'); setActiveStep(0); }}
                        >
                            For Coaches
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
                    <h2>${activeTab === 'clients' ? 'Your Journey to Growth' : 'Build Your Coaching Practice'}</h2>
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
                    <h2>See It in Action</h2>
                    <div class="video-wrapper">
                        <div class="video-placeholder">
                            <div class="play-button">▶</div>
                            <p>Watch: How to Find Your Perfect Coach (2 min)</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Comparison Section -->
            <section class="hiw-comparison">
                <div class="container">
                    <h2>Why Choose CoachSearching?</h2>
                    <p class="section-subtitle">
                        See how we compare to traditional coach searching methods.
                    </p>
                    <${ComparisonTable} />
                </div>
            </section>

            <!-- Quick Start Guide -->
            <section class="hiw-quickstart">
                <div class="container">
                    <h2>Quick Start Guide</h2>
                    <div class="quickstart-cards">
                        <div class="quickstart-card">
                            <div class="qs-icon">⚡</div>
                            <h3>In a Hurry?</h3>
                            <p>Take our 5-minute quiz and get instant coach recommendations.</p>
                            <a href="#quiz" class="btn btn-primary">Take the Quiz</a>
                        </div>
                        <div class="quickstart-card">
                            <div class="qs-icon">🔍</div>
                            <h3>Know What You Want?</h3>
                            <p>Browse coaches directly by specialty, location, or price.</p>
                            <a href="#coaches" class="btn btn-secondary">Browse Coaches</a>
                        </div>
                        <div class="quickstart-card">
                            <div class="qs-icon">❓</div>
                            <h3>Have Questions?</h3>
                            <p>Check our FAQ or contact support for help.</p>
                            <a href="#faq" class="btn btn-secondary">View FAQ</a>
                        </div>
                    </div>
                </div>
            </section>

            <!-- FAQ Section -->
            <section class="hiw-faq">
                <div class="container">
                    <h2>Common Questions</h2>
                    <div class="faq-list">
                        ${HOW_IT_WORKS_FAQ.map(faq => html`
                            <div class="faq-item" key=${faq.question}>
                                <h3>${faq.question}</h3>
                                <p>${faq.answer}</p>
                            </div>
                        `)}
                    </div>
                    <div class="faq-more">
                        <a href="#faq" class="btn btn-link">View All FAQs →</a>
                    </div>
                </div>
            </section>

            <!-- CTA Section -->
            <section class="hiw-cta">
                <div class="container">
                    <h2>Ready to Get Started?</h2>
                    <p>Your transformation journey begins with a single step.</p>
                    <div class="cta-buttons">
                        ${activeTab === 'clients' ? html`
                            <a href="#coaches" class="btn btn-primary btn-lg">Find Your Coach</a>
                            <a href="#quiz" class="btn btn-secondary btn-lg">Take the Quiz</a>
                        ` : html`
                            <a href="#become-coach" class="btn btn-primary btn-lg">Apply Now</a>
                            <a href="#coach-resources" class="btn btn-secondary btn-lg">Learn More</a>
                        `}
                    </div>
                </div>
            </section>
        </div>
    `;
}

export default HowItWorksPage;
