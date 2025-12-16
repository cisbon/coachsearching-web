/**
 * Pricing Page Component
 * @fileoverview Pricing page with Free vs Premium tier comparison for coaches
 */

import htm from '../vendor/htm.js';
import { t } from '../i18n.js';
import {
    setPageMeta,
    setStructuredData,
    generateBreadcrumbSchema,
} from '../utils/seo.js';

const React = window.React;
const { useState, useEffect } = React;
const html = htm.bind(React.createElement);

// ============================================================================
// Pricing Data
// ============================================================================

const PRICING = {
    free: {
        name: 'Free',
        monthlyPrice: 0,
        yearlyPrice: 0,
        description: 'Perfect for coaches just getting started',
        cta: 'Get Started Free',
        ctaLink: '#onboarding',
        highlight: false,
    },
    premium: {
        name: 'Premium',
        monthlyPrice: 39,
        yearlyPrice: 349,
        description: 'For established coaches who want to grow',
        cta: 'Upgrade to Premium',
        ctaLink: '#dashboard',
        highlight: true,
        savings: '25%',
    },
};

// Data-driven feature list with tier flags
const FEATURES = [
    {
        name: 'Profile Listing',
        description: 'Get discovered by potential clients',
        free: 'Basic profile',
        premium: 'Enhanced profile with video intro',
        category: 'visibility',
    },
    {
        name: 'Search Ranking',
        description: 'How you appear in search results',
        free: 'Standard ranking',
        premium: 'Priority placement + "Featured" badge',
        category: 'visibility',
    },
    {
        name: 'Discovery Call Slots',
        description: 'Free intro calls with potential clients',
        free: 'Max 4 per week',
        premium: 'Unlimited',
        category: 'booking',
    },
    {
        name: 'Client Reviews',
        description: 'Collect and display testimonials',
        free: true,
        premium: true,
        category: 'social',
    },
    {
        name: 'Calendar Integration',
        description: 'Manage your availability',
        free: 'Basic calendar',
        premium: 'Google & Outlook sync',
        category: 'booking',
    },
    {
        name: 'Coach Notes CRM',
        description: 'Track client progress and session notes',
        free: false,
        premium: true,
        category: 'crm',
    },
    {
        name: 'Client Analytics',
        description: 'Profile views, booking rates, engagement',
        free: false,
        premium: true,
        category: 'analytics',
    },
    {
        name: 'Video Introduction',
        description: 'Add a personal video to your profile',
        free: false,
        premium: true,
        category: 'visibility',
    },
    {
        name: 'Marketing Toolkit',
        description: 'Social media templates & badges',
        free: false,
        premium: true,
        category: 'marketing',
    },
    {
        name: 'Priority Support',
        description: 'Get help when you need it',
        free: 'Email support',
        premium: 'Priority email & chat support',
        category: 'support',
    },
];

// FAQ data for pricing page
const PRICING_FAQ = [
    {
        question: 'Can I switch from Free to Premium anytime?',
        answer: 'Yes! You can upgrade to Premium at any time from your dashboard. Your profile enhancements will be activated immediately.',
    },
    {
        question: 'Is there a trial period for Premium?',
        answer: 'We offer a 14-day free trial of Premium features. No credit card required to start.',
    },
    {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and SEPA direct debit for European customers.',
    },
    {
        question: 'Can I cancel anytime?',
        answer: 'Absolutely. You can cancel your Premium subscription at any time. Your premium features will remain active until the end of your billing period.',
    },
    {
        question: 'What happens to my data if I downgrade?',
        answer: 'Your data is safe. Session notes and client information are preserved. You\'ll retain read access but some editing features will be limited.',
    },
    {
        question: 'Do you offer discounts for annual billing?',
        answer: 'Yes! Save 25% when you choose annual billing (€349/year instead of €468/year).',
    },
];

// ============================================================================
// Components
// ============================================================================

function PricingToggle({ isYearly, onToggle }) {
    return html`
        <div class="pricing-toggle">
            <span class="toggle-label ${!isYearly ? 'active' : ''}">Monthly</span>
            <button
                class="toggle-switch ${isYearly ? 'yearly' : ''}"
                onClick=${onToggle}
                aria-label="Toggle between monthly and yearly pricing"
            >
                <span class="toggle-slider"></span>
            </button>
            <span class="toggle-label ${isYearly ? 'active' : ''}">
                Yearly
                <span class="save-badge">Save 25%</span>
            </span>
        </div>
    `;
}

function PriceDisplay({ price, isYearly, highlight }) {
    const period = isYearly ? '/year' : '/month';

    if (price === 0) {
        return html`
            <div class="price-display">
                <span class="price-amount">€0</span>
                <span class="price-period">/forever</span>
            </div>
        `;
    }

    return html`
        <div class="price-display ${highlight ? 'highlighted' : ''}">
            <span class="price-amount">€${price}</span>
            <span class="price-period">${period}</span>
            ${isYearly && html`
                <div class="price-monthly-equiv">
                    (€${Math.round(price / 12)}/month)
                </div>
            `}
        </div>
    `;
}

function FeatureValue({ value }) {
    if (value === true) {
        return html`<span class="feature-check">✓</span>`;
    }
    if (value === false) {
        return html`<span class="feature-dash">—</span>`;
    }
    return html`<span class="feature-text">${value}</span>`;
}

function PricingCard({ tier, isYearly }) {
    const price = isYearly ? tier.yearlyPrice : tier.monthlyPrice;

    return html`
        <div class="pricing-card ${tier.highlight ? 'highlighted' : ''}">
            ${tier.highlight && html`
                <div class="popular-badge">Most Popular</div>
            `}
            <div class="pricing-card-header">
                <h3 class="tier-name">${tier.name}</h3>
                <p class="tier-description">${tier.description}</p>
                <${PriceDisplay}
                    price=${price}
                    isYearly=${isYearly}
                    highlight=${tier.highlight}
                />
            </div>
            <div class="pricing-card-features">
                <ul class="feature-list">
                    ${FEATURES.map(feature => html`
                        <li key=${feature.name} class="feature-item">
                            <${FeatureValue} value=${tier.name === 'Free' ? feature.free : feature.premium} />
                            <span class="feature-name">${feature.name}</span>
                        </li>
                    `)}
                </ul>
            </div>
            <div class="pricing-card-footer">
                <a href=${tier.ctaLink} class="btn ${tier.highlight ? 'btn-primary' : 'btn-secondary'} btn-lg btn-block">
                    ${tier.cta}
                </a>
            </div>
        </div>
    `;
}

function FeatureComparisonTable({ isYearly }) {
    return html`
        <div class="feature-comparison">
            <h2>Feature Comparison</h2>
            <div class="comparison-table-wrapper">
                <table class="comparison-table">
                    <thead>
                        <tr>
                            <th>Feature</th>
                            <th>Free</th>
                            <th class="highlight-column">Premium</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${FEATURES.map(feature => html`
                            <tr key=${feature.name}>
                                <td class="feature-cell">
                                    <div class="feature-name">${feature.name}</div>
                                    <div class="feature-description">${feature.description}</div>
                                </td>
                                <td class="value-cell">
                                    <${FeatureValue} value=${feature.free} />
                                </td>
                                <td class="value-cell highlight-column">
                                    <${FeatureValue} value=${feature.premium} />
                                </td>
                            </tr>
                        `)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function FAQItem({ question, answer, isOpen, onToggle }) {
    return html`
        <div class="faq-item ${isOpen ? 'open' : ''}">
            <button class="faq-question" onClick=${onToggle}>
                <span>${question}</span>
                <span class="faq-icon">${isOpen ? '−' : '+'}</span>
            </button>
            ${isOpen && html`
                <div class="faq-answer">
                    <p>${answer}</p>
                </div>
            `}
        </div>
    `;
}

function PricingFAQ() {
    const [openIndex, setOpenIndex] = useState(null);

    const toggleFAQ = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return html`
        <section class="pricing-faq">
            <div class="container">
                <h2>Frequently Asked Questions</h2>
                <div class="faq-list">
                    ${PRICING_FAQ.map((item, index) => html`
                        <${FAQItem}
                            key=${index}
                            question=${item.question}
                            answer=${item.answer}
                            isOpen=${openIndex === index}
                            onToggle=${() => toggleFAQ(index)}
                        />
                    `)}
                </div>
            </div>
        </section>
    `;
}

// ============================================================================
// Main Pricing Page Component
// ============================================================================

export function PricingPage() {
    const [isYearly, setIsYearly] = useState(false);

    // Set SEO meta tags
    useEffect(() => {
        setPageMeta({
            title: 'Pricing - CoachSearching | Free & Premium Plans for Coaches',
            description: 'Compare CoachSearching pricing plans. Start free or upgrade to Premium for €39/month. Get more clients with enhanced visibility, CRM tools, and analytics.',
            url: 'https://coachsearching.com/#pricing',
        });

        // Breadcrumb schema
        setStructuredData('breadcrumb-schema', generateBreadcrumbSchema([
            { name: 'Home', url: 'https://coachsearching.com' },
            { name: 'Pricing', url: 'https://coachsearching.com/#pricing' },
        ]));
    }, []);

    const toggleBilling = () => setIsYearly(!isYearly);

    return html`
        <div class="pricing-page">
            <!-- Hero Section -->
            <section class="pricing-hero">
                <div class="container">
                    <h1>Simple, Transparent Pricing</h1>
                    <p class="hero-subtitle">
                        Start free and upgrade when you're ready to grow your coaching business
                    </p>
                    <${PricingToggle} isYearly=${isYearly} onToggle=${toggleBilling} />
                </div>
            </section>

            <!-- Pricing Cards -->
            <section class="pricing-cards-section">
                <div class="container">
                    <div class="pricing-cards">
                        <${PricingCard} tier=${PRICING.free} isYearly=${isYearly} />
                        <${PricingCard} tier=${PRICING.premium} isYearly=${isYearly} />
                    </div>
                </div>
            </section>

            <!-- Feature Comparison Table -->
            <section class="pricing-comparison-section">
                <div class="container">
                    <${FeatureComparisonTable} isYearly=${isYearly} />
                </div>
            </section>

            <!-- Testimonial -->
            <section class="pricing-testimonial">
                <div class="container">
                    <blockquote class="testimonial-quote">
                        <p>"Upgrading to Premium doubled my bookings within the first month. The CRM features alone are worth it."</p>
                        <footer>
                            <cite>— Sarah M., Executive Coach</cite>
                        </footer>
                    </blockquote>
                </div>
            </section>

            <!-- FAQ Section -->
            <${PricingFAQ} />

            <!-- CTA Section -->
            <section class="pricing-cta">
                <div class="container">
                    <h2>Ready to grow your coaching practice?</h2>
                    <p>Join hundreds of coaches who trust CoachSearching to connect with clients.</p>
                    <div class="cta-buttons">
                        <a href="#onboarding" class="btn btn-primary btn-lg">Start Free Today</a>
                        <a href="#about" class="btn btn-secondary btn-lg">Learn More</a>
                    </div>
                </div>
            </section>
        </div>
    `;
}

export default PricingPage;
