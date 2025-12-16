/**
 * Pricing Page Component
 * @fileoverview Premium pricing page with Free vs Premium tier comparison for coaches
 * Freemium model - no commission on sessions, just subscription for premium features
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
// Pricing Configuration
// ============================================================================

const PRICING = {
    monthly: 19,
    yearly: 108,
    yearlyPerMonth: 9,
    launchOffer: 15,
    launchOfferLimit: 100,
    yearlySavingsPercent: 53,
};

// ============================================================================
// Feature Data Structure
// ============================================================================

const FEATURES = [
    {
        category: 'pricing.features.profileVisibility',
        categoryKey: 'profileVisibility',
        items: [
            { key: 'profileListing', name: 'pricing.features.profileListing', free: true, premium: true },
            { key: 'searchResults', name: 'pricing.features.searchResults', free: true, premium: true },
            { key: 'specializations', name: 'pricing.features.specializations', free: '3', premium: '8' },
            { key: 'clientReviews', name: 'pricing.features.clientReviews', free: true, premium: true },
            { key: 'shareableLink', name: 'pricing.features.shareableLink', free: true, premium: true },
        ],
    },
    {
        category: 'pricing.features.discoveryCalls',
        categoryKey: 'discoveryCalls',
        items: [
            { key: 'discoverySlots', name: 'pricing.features.discoverySlots', free: 'pricing.features.onePerWeek', premium: 'pricing.features.unlimited' },
            { key: 'searchPlacement', name: 'pricing.features.searchPlacement', free: 'pricing.features.standard', premium: 'pricing.features.priorityBadge' },
        ],
    },
    {
        category: 'pricing.features.profileContent',
        categoryKey: 'profileContent',
        items: [
            { key: 'bioLength', name: 'pricing.features.bioLength', free: 'pricing.features.chars300', premium: 'pricing.features.chars1000' },
            { key: 'profilePhotos', name: 'pricing.features.profilePhotos', free: '1', premium: '5' },
            { key: 'videoIntro', name: 'pricing.features.videoIntro', free: false, premium: true },
            { key: 'myApproach', name: 'pricing.features.myApproach', free: false, premium: true },
            { key: 'customFaq', name: 'pricing.features.customFaq', free: false, premium: 'pricing.features.threeQAs' },
        ],
    },
    {
        category: 'pricing.features.practiceManagement',
        categoryKey: 'practiceManagement',
        items: [
            { key: 'coachNotes', name: 'pricing.features.coachNotes', free: false, premium: true },
            { key: 'profileAnalytics', name: 'pricing.features.profileAnalytics', free: false, premium: true },
        ],
    },
];

// ============================================================================
// FAQ Data
// ============================================================================

const FAQ_ITEMS = [
    {
        questionKey: 'pricing.faq.commissionQ',
        answerKey: 'pricing.faq.commissionA',
    },
    {
        questionKey: 'pricing.faq.discoverySlotQ',
        answerKey: 'pricing.faq.discoverySlotA',
    },
    {
        questionKey: 'pricing.faq.coachNotesQ',
        answerKey: 'pricing.faq.coachNotesA',
    },
    {
        questionKey: 'pricing.faq.prioritySearchQ',
        answerKey: 'pricing.faq.prioritySearchA',
    },
    {
        questionKey: 'pricing.faq.cancelNotesQ',
        answerKey: 'pricing.faq.cancelNotesA',
    },
    {
        questionKey: 'pricing.faq.upgradeDowngradeQ',
        answerKey: 'pricing.faq.upgradeDowngradeA',
    },
    {
        questionKey: 'pricing.faq.launchOfferQ',
        answerKey: 'pricing.faq.launchOfferA',
    },
];

// ============================================================================
// Helper Components
// ============================================================================

function BillingToggle({ isYearly, onToggle }) {
    return html`
        <div class="billing-toggle">
            <button
                class="toggle-option ${!isYearly ? 'active' : ''}"
                onClick=${() => onToggle(false)}
            >
                ${t('pricing.monthly') || 'Monthly'}
            </button>
            <button
                class="toggle-option ${isYearly ? 'active' : ''}"
                onClick=${() => onToggle(true)}
            >
                ${t('pricing.yearly') || 'Yearly'}
                <span class="save-badge">${t('pricing.save53') || 'Save 53%'}</span>
            </button>
        </div>
    `;
}

function LaunchOfferBanner() {
    return html`
        <div class="launch-offer-banner">
            <div class="launch-offer-content">
                <span class="launch-emoji">🚀</span>
                <div class="launch-text">
                    <strong>${t('pricing.launchOffer') || 'Launch Offer'}</strong>
                    <span class="launch-price">
                        ${t('pricing.lockIn') || 'Lock in'} <strong>€${PRICING.launchOffer}/${t('pricing.month') || 'month'}</strong> ${t('pricing.firstYear') || 'for your entire first year'}
                    </span>
                </div>
                <span class="launch-scarcity">${t('pricing.limitedTo') || 'Limited to first'} ${PRICING.launchOfferLimit} ${t('pricing.coaches') || 'coaches'}</span>
            </div>
        </div>
    `;
}

function FeatureValue({ value }) {
    // Handle translation keys
    const displayValue = typeof value === 'string' && value.startsWith('pricing.')
        ? t(value) || value
        : value;

    if (displayValue === true) {
        return html`<span class="feature-check" aria-label="Included">✓</span>`;
    }
    if (displayValue === false) {
        return html`<span class="feature-dash" aria-label="Not included">—</span>`;
    }
    return html`<span class="feature-text">${displayValue}</span>`;
}

function FeatureRow({ name, free, premium }) {
    const displayName = name.startsWith('pricing.') ? t(name) || name : name;

    return html`
        <div class="feature-row">
            <span class="feature-name">${displayName}</span>
            <span class="feature-value free-value">
                <${FeatureValue} value=${free} />
            </span>
            <span class="feature-value premium-value">
                <${FeatureValue} value=${premium} />
            </span>
        </div>
    `;
}

function PricingCard({ tier, isYearly, isHighlighted }) {
    const isFree = tier === 'free';

    let priceDisplay, priceSubtext;

    if (isFree) {
        priceDisplay = '€0';
        priceSubtext = t('pricing.forever') || 'forever';
    } else if (isYearly) {
        priceDisplay = `€${PRICING.yearlyPerMonth}`;
        priceSubtext = `/${t('pricing.month') || 'month'}, ${t('pricing.billedYearly') || 'billed yearly'}`;
    } else {
        priceDisplay = `€${PRICING.monthly}`;
        priceSubtext = `/${t('pricing.month') || 'month'}`;
    }

    // Feature items for cards (simplified view)
    const freeFeatures = [
        t('pricing.card.profileListing') || 'Profile listing (photo, bio, credentials)',
        t('pricing.card.appearSearch') || 'Appear in search results',
        t('pricing.card.upTo3Specs') || 'Up to 3 specializations',
        t('pricing.card.clientReviews') || 'Client reviews displayed',
        t('pricing.card.shareableLink') || 'Shareable profile link',
        t('pricing.card.oneSlotWeek') || '1 discovery call slot per week',
    ];

    const freeLimits = [
        t('pricing.card.bio300') || 'Bio: 300 characters',
        t('pricing.card.photos1') || 'Photos: 1',
        t('pricing.card.noVideo') || 'No video introduction',
    ];

    const premiumFeatures = [
        t('pricing.card.everythingFree') || 'Everything in Free, plus:',
        t('pricing.card.unlimitedSlots') || 'Unlimited discovery call slots',
        t('pricing.card.prioritySearch') || 'Priority placement in search results',
        t('pricing.card.featuredBadge') || '"Featured Coach" badge',
        t('pricing.card.extendedBio') || 'Extended bio (1000 characters)',
        t('pricing.card.photos5') || 'Up to 5 photos',
        t('pricing.card.videoIntro') || 'Video introduction',
        t('pricing.card.specs8') || 'Up to 8 specializations',
        t('pricing.card.myApproach') || '"My Approach" section',
        t('pricing.card.customFaq') || 'Custom FAQ (3 questions)',
        t('pricing.card.coachNotes') || 'Coach Notes – track client journeys',
        t('pricing.card.analytics') || 'Profile analytics',
    ];

    return html`
        <div class="pricing-card ${isHighlighted ? 'highlighted' : ''}">
            <div class="card-header">
                <h3 class="tier-name">${isFree ? t('pricing.free') || 'Free' : t('pricing.premium') || 'Premium'}</h3>

                ${isFree ? html`
                    <div class="price-display">
                        <span class="price-amount">€0</span>
                        <span class="price-period">${t('pricing.forever') || 'forever'}</span>
                    </div>
                ` : html`
                    <div class="price-display with-launch">
                        <div class="price-strike">
                            <span class="price-original">€${isYearly ? PRICING.yearly : PRICING.monthly}</span>
                        </div>
                        <span class="price-amount launch">€${isYearly ? PRICING.yearlyPerMonth : PRICING.launchOffer}</span>
                        <span class="price-period">/${t('pricing.month') || 'month'}${isYearly ? `, ${t('pricing.billedYearly') || 'billed yearly'}` : ''}</span>
                    </div>
                    <div class="launch-badge-inline">
                        🚀 ${t('pricing.launchOffer') || 'Launch Offer'}
                    </div>
                `}

                <p class="tier-tagline">
                    ${isFree
                        ? t('pricing.freeTagline') || 'Get discovered by clients'
                        : t('pricing.premiumTagline') || 'Grow your coaching practice'
                    }
                </p>
            </div>

            <div class="card-features">
                ${isFree ? html`
                    <div class="features-section">
                        <h4>${t('pricing.profileVisibility') || 'Profile & Visibility'}</h4>
                        <ul class="feature-list">
                            ${freeFeatures.map((f, i) => html`
                                <li key=${i}><span class="check">✓</span> ${f}</li>
                            `)}
                        </ul>
                    </div>
                    <div class="features-section limits">
                        <h4>${t('pricing.profileLimits') || 'Profile Limits'}</h4>
                        <ul class="feature-list muted">
                            ${freeLimits.map((f, i) => html`
                                <li key=${i}><span class="bullet">•</span> ${f}</li>
                            `)}
                        </ul>
                    </div>
                ` : html`
                    <ul class="feature-list premium-list">
                        ${premiumFeatures.map((f, i) => html`
                            <li key=${i} class=${i === 0 ? 'highlight-intro' : ''}>
                                ${i === 0 ? '' : html`<span class="check">✓</span>`} ${f}
                            </li>
                        `)}
                    </ul>
                `}
            </div>

            <div class="card-footer">
                <a
                    href=${isFree ? '#onboarding' : '#onboarding?plan=premium'}
                    class="cta-button ${isFree ? 'secondary' : 'primary'}"
                >
                    ${isFree
                        ? t('pricing.getStartedFree') || 'Get Started Free'
                        : t('pricing.getPremium') || 'Get Premium'
                    }
                </a>
            </div>
        </div>
    `;
}

function FeatureComparisonTable() {
    return html`
        <div class="feature-comparison">
            <h2>${t('pricing.featureComparison') || 'Feature Comparison'}</h2>
            <div class="comparison-table-wrapper">
                <div class="comparison-table">
                    <div class="table-header">
                        <span class="header-feature">${t('pricing.feature') || 'Feature'}</span>
                        <span class="header-free">${t('pricing.free') || 'Free'}</span>
                        <span class="header-premium">${t('pricing.premium') || 'Premium'}</span>
                    </div>

                    ${FEATURES.map(category => html`
                        <div key=${category.categoryKey} class="feature-category">
                            <div class="category-header">
                                ${t(category.category) || category.category}
                            </div>
                            ${category.items.map(item => html`
                                <${FeatureRow}
                                    key=${item.key}
                                    name=${item.name}
                                    free=${item.free}
                                    premium=${item.premium}
                                />
                            `)}
                        </div>
                    `)}
                </div>
            </div>
        </div>
    `;
}

function FAQItem({ questionKey, answerKey, isOpen, onToggle }) {
    const question = t(questionKey) || questionKey;
    const answer = t(answerKey) || answerKey;

    return html`
        <div class="faq-item ${isOpen ? 'open' : ''}">
            <button
                class="faq-question"
                onClick=${onToggle}
                aria-expanded=${isOpen}
            >
                <span>${question}</span>
                <span class="faq-icon">${isOpen ? '−' : '+'}</span>
            </button>
            <div class="faq-answer" aria-hidden=${!isOpen}>
                <p>${answer}</p>
            </div>
        </div>
    `;
}

function PricingFAQ() {
    const [openIndex, setOpenIndex] = useState(null);

    const toggleFAQ = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return html`
        <section class="pricing-faq-section">
            <div class="container">
                <h2>${t('pricing.faqTitle') || 'Frequently Asked Questions'}</h2>
                <div class="faq-list">
                    ${FAQ_ITEMS.map((item, index) => html`
                        <${FAQItem}
                            key=${index}
                            questionKey=${item.questionKey}
                            answerKey=${item.answerKey}
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
            title: t('pricing.pageTitle') || 'Pricing - CoachSearching | Free & Premium Plans for Coaches',
            description: t('pricing.pageDescription') || 'Simple, transparent pricing for coaches. Start free or upgrade to Premium. No commission on your sessions, ever.',
            url: 'https://coachsearching.com/pricing',
        });

        setStructuredData('breadcrumb-schema', generateBreadcrumbSchema([
            { name: t('nav.home') || 'Home', url: 'https://coachsearching.com' },
            { name: t('pricing.title') || 'Pricing', url: 'https://coachsearching.com/pricing' },
        ]));
    }, []);

    return html`
        <div class="pricing-page">
            <!-- Hero Section -->
            <section class="pricing-hero">
                <div class="container">
                    <div class="hero-badge">${t('pricing.forCoaches') || 'For Coaches'}</div>
                    <h1>${t('pricing.heroTitle') || 'Simple, Transparent Pricing'}</h1>
                    <p class="hero-subtitle">
                        ${t('pricing.heroSubtitle') || 'No commission on your sessions. No hidden fees. Just the tools you need to grow your coaching practice.'}
                    </p>
                </div>
            </section>

            <!-- Client Notice -->
            <div class="client-notice">
                <div class="container">
                    <div class="notice-content">
                        <span class="notice-icon">👋</span>
                        <p>
                            <strong>${t('pricing.lookingForCoach') || 'Looking for a coach?'}</strong> ${t('pricing.clientsFree') || 'Clients and businesses can browse coaches, book discovery calls, and find their perfect match – completely free, forever.'}
                            <a href="#coaches" class="notice-link">${t('pricing.findCoach') || 'Find a Coach'} →</a>
                        </p>
                    </div>
                </div>
            </div>

            <!-- Launch Offer Banner -->
            <${LaunchOfferBanner} />

            <!-- Billing Toggle -->
            <section class="billing-section">
                <div class="container">
                    <${BillingToggle} isYearly=${isYearly} onToggle=${setIsYearly} />
                </div>
            </section>

            <!-- Pricing Cards -->
            <section class="pricing-cards-section">
                <div class="container">
                    <div class="pricing-cards">
                        <${PricingCard} tier="free" isYearly=${isYearly} isHighlighted=${false} />
                        <${PricingCard} tier="premium" isYearly=${isYearly} isHighlighted=${true} />
                    </div>
                </div>
            </section>

            <!-- Feature Comparison Table -->
            <section class="pricing-comparison-section">
                <div class="container">
                    <${FeatureComparisonTable} />
                </div>
            </section>

            <!-- FAQ Section -->
            <${PricingFAQ} />

            <!-- Bottom CTA Section -->
            <section class="pricing-bottom-cta">
                <div class="container">
                    <h2>${t('pricing.ctaTitle') || 'Ready to grow your coaching practice?'}</h2>
                    <p>${t('pricing.ctaSubtitle') || 'Join coaches across Europe already on CoachSearching.com'}</p>
                    <div class="cta-buttons">
                        <a href="#onboarding" class="cta-button secondary">
                            ${t('pricing.getStartedFree') || 'Get Started Free'}
                        </a>
                        <a href="#onboarding?plan=premium" class="cta-button primary">
                            ${t('pricing.getPremium') || 'Get Premium'}
                        </a>
                    </div>
                </div>
            </section>
        </div>
    `;
}

export default PricingPage;
