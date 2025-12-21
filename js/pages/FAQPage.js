/**
 * FAQ Page Component
 * @fileoverview Comprehensive FAQ page with SEO-optimized structured data
 */

import htm from '../vendor/htm.js';
import { t, getCurrentLang } from '../i18n.js';
import {
    setPageMeta,
    setStructuredData,
    generateFAQSchema,
    generateBreadcrumbSchema,
} from '../utils/seo.js';

const React = window.React;
const { useState, useEffect, useMemo, useCallback } = React;
const html = htm.bind(React.createElement);

// ============================================================================
// FAQ Data - Using translation keys
// ============================================================================

const getFAQCategories = () => ({
    general: {
        title: t('faqPage.general.title'),
        icon: '❓',
        faqs: [
            {
                question: t('faqPage.general.q1'),
                answer: t('faqPage.general.a1'),
            },
            {
                question: t('faqPage.general.q2'),
                answer: t('faqPage.general.a2'),
            },
            {
                question: t('faqPage.general.q3'),
                answer: t('faqPage.general.a3'),
            },
            {
                question: t('faqPage.general.q4'),
                answer: t('faqPage.general.a4'),
            },
            {
                question: t('faqPage.general.q5'),
                answer: t('faqPage.general.a5'),
            },
        ],
    },
    booking: {
        title: t('faqPage.booking.title'),
        icon: '📅',
        faqs: [
            {
                question: t('faqPage.booking.q1'),
                answer: t('faqPage.booking.a1'),
            },
            {
                question: t('faqPage.booking.q2'),
                answer: t('faqPage.booking.a2'),
            },
            {
                question: t('faqPage.booking.q3'),
                answer: t('faqPage.booking.a3'),
            },
            {
                question: t('faqPage.booking.q4'),
                answer: t('faqPage.booking.a4'),
            },
            {
                question: t('faqPage.booking.q5'),
                answer: t('faqPage.booking.a5'),
            },
            {
                question: t('faqPage.booking.q6'),
                answer: t('faqPage.booking.a6'),
            },
        ],
    },
    payment: {
        title: t('faqPage.payment.title'),
        icon: '💳',
        faqs: [
            {
                question: t('faqPage.payment.q1'),
                answer: t('faqPage.payment.a1'),
            },
            {
                question: t('faqPage.payment.q2'),
                answer: t('faqPage.payment.a2'),
            },
            {
                question: t('faqPage.payment.q3'),
                answer: t('faqPage.payment.a3'),
            },
            {
                question: t('faqPage.payment.q4'),
                answer: t('faqPage.payment.a4'),
            },
            {
                question: t('faqPage.payment.q5'),
                answer: t('faqPage.payment.a5'),
            },
            {
                question: t('faqPage.payment.q6'),
                answer: t('faqPage.payment.a6'),
            },
        ],
    },
    coaches: {
        title: t('faqPage.coaches.title'),
        icon: '👨‍🏫',
        faqs: [
            {
                question: t('faqPage.coaches.q1'),
                answer: t('faqPage.coaches.a1'),
            },
            {
                question: t('faqPage.coaches.q2'),
                answer: t('faqPage.coaches.a2'),
            },
            {
                question: t('faqPage.coaches.q3'),
                answer: t('faqPage.coaches.a3'),
            },
            {
                question: t('faqPage.coaches.q4'),
                answer: t('faqPage.coaches.a4'),
            },
            {
                question: t('faqPage.coaches.q5'),
                answer: t('faqPage.coaches.a5'),
            },
            {
                question: t('faqPage.coaches.q6'),
                answer: t('faqPage.coaches.a6'),
            },
        ],
    },
    trust: {
        title: t('faqPage.trust.title'),
        icon: '🔒',
        faqs: [
            {
                question: t('faqPage.trust.q1'),
                answer: t('faqPage.trust.a1'),
            },
            {
                question: t('faqPage.trust.q2'),
                answer: t('faqPage.trust.a2'),
            },
            {
                question: t('faqPage.trust.q3'),
                answer: t('faqPage.trust.a3'),
            },
            {
                question: t('faqPage.trust.q4'),
                answer: t('faqPage.trust.a4'),
            },
            {
                question: t('faqPage.trust.q5'),
                answer: t('faqPage.trust.a5'),
            },
        ],
    },
    technical: {
        title: t('faqPage.technical.title'),
        icon: '⚙️',
        faqs: [
            {
                question: t('faqPage.technical.q1'),
                answer: t('faqPage.technical.a1'),
            },
            {
                question: t('faqPage.technical.q2'),
                answer: t('faqPage.technical.a2'),
            },
            {
                question: t('faqPage.technical.q3'),
                answer: t('faqPage.technical.a3'),
            },
            {
                question: t('faqPage.technical.q4'),
                answer: t('faqPage.technical.a4'),
            },
        ],
    },
});

// ============================================================================
// FAQ Components
// ============================================================================

/**
 * Single FAQ Item with collapsible answer
 */
function FAQItem({ question, answer, isOpen, onToggle }) {
    if (!question || !answer) return null;

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
            <div class="faq-answer" style=${{ display: isOpen ? 'block' : 'none' }}>
                <p>${answer}</p>
            </div>
        </div>
    `;
}

/**
 * FAQ Category Section
 */
function FAQCategory({ id, title, icon, faqs, openItems, onToggle }) {
    const validFaqs = faqs.filter(faq => faq.question && faq.answer);
    if (validFaqs.length === 0) return null;

    return html`
        <section class="faq-category" id=${id}>
            <h2 class="faq-category-title">
                <span class="faq-category-icon">${icon}</span>
                ${title}
            </h2>
            <div class="faq-list">
                ${validFaqs.map((faq, index) => html`
                    <${FAQItem}
                        key=${index}
                        question=${faq.question}
                        answer=${faq.answer}
                        isOpen=${openItems.has(`${id}-${index}`)}
                        onToggle=${() => onToggle(`${id}-${index}`)}
                    />
                `)}
            </div>
        </section>
    `;
}

/**
 * FAQ Navigation Sidebar
 */
function FAQNav({ categories, activeCategory, onSelect }) {
    return html`
        <nav class="faq-nav" aria-label=${t('faqPage.categories')}>
            <h3>${t('faqPage.categories')}</h3>
            <ul>
                ${Object.entries(categories).map(([id, cat]) => html`
                    <li key=${id}>
                        <a
                            href="#${id}"
                            class=${activeCategory === id ? 'active' : ''}
                            onClick=${(e) => { e.preventDefault(); onSelect(id); }}
                        >
                            <span class="nav-icon">${cat.icon}</span>
                            ${cat.title}
                        </a>
                    </li>
                `)}
            </ul>
        </nav>
    `;
}

/**
 * FAQ Search Box
 */
function FAQSearch({ value, onChange }) {
    return html`
        <div class="faq-search">
            <input
                type="search"
                placeholder=${t('faqPage.searchPlaceholder')}
                value=${value}
                onInput=${(e) => onChange(e.target.value)}
                aria-label=${t('faqPage.searchLabel')}
            />
            <span class="search-icon">🔍</span>
        </div>
    `;
}

// ============================================================================
// Main FAQ Page Component
// ============================================================================

export function FAQPage() {
    const [openItems, setOpenItems] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('general');

    const FAQ_CATEGORIES = getFAQCategories();

    // Set SEO meta tags
    useEffect(() => {
        setPageMeta({
            title: t('faqPage.pageTitle'),
            description: t('faqPage.pageDescription'),
            url: 'https://coachsearching.com/#faq',
        });

        // Generate FAQ schema for all FAQs
        const allFaqs = Object.values(FAQ_CATEGORIES).flatMap(cat =>
            cat.faqs.filter(faq => faq.question && faq.answer)
        );
        setStructuredData('faq-schema', generateFAQSchema(allFaqs));

        // Breadcrumb schema
        setStructuredData('breadcrumb-schema', generateBreadcrumbSchema([
            { name: t('nav.home'), url: 'https://coachsearching.com' },
            { name: t('faqPage.title'), url: 'https://coachsearching.com/#faq' },
        ]));

        return () => {
            // Cleanup schemas when leaving page
        };
    }, []);

    // Filter FAQs based on search query
    const filteredCategories = useMemo(() => {
        if (!searchQuery.trim()) return FAQ_CATEGORIES;

        const query = searchQuery.toLowerCase();
        const filtered = {};

        Object.entries(FAQ_CATEGORIES).forEach(([id, category]) => {
            const matchingFaqs = category.faqs.filter(
                faq =>
                    faq.question && faq.answer &&
                    (faq.question.toLowerCase().includes(query) ||
                    faq.answer.toLowerCase().includes(query))
            );

            if (matchingFaqs.length > 0) {
                filtered[id] = { ...category, faqs: matchingFaqs };
            }
        });

        return filtered;
    }, [searchQuery, FAQ_CATEGORIES]);

    const handleToggle = useCallback((itemId) => {
        setOpenItems(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) {
                next.delete(itemId);
            } else {
                next.add(itemId);
            }
            return next;
        });
    }, []);

    const handleCategorySelect = useCallback((categoryId) => {
        setActiveCategory(categoryId);
        const element = document.getElementById(categoryId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, []);

    const hasResults = Object.keys(filteredCategories).length > 0;

    return html`
        <div class="faq-page">
            <div class="container">
                <!-- Header -->
                <header class="faq-header">
                    <h1>${t('faqPage.title')}</h1>
                    <p>${t('faqPage.subtitle')}</p>
                    <${FAQSearch} value=${searchQuery} onChange=${setSearchQuery} />
                </header>

                <!-- Main Content -->
                <div class="faq-content">
                    <!-- Sidebar Navigation (desktop) -->
                    <aside class="faq-sidebar">
                        <${FAQNav}
                            categories=${FAQ_CATEGORIES}
                            activeCategory=${activeCategory}
                            onSelect=${handleCategorySelect}
                        />
                    </aside>

                    <!-- FAQ Categories -->
                    <main class="faq-main">
                        ${hasResults ? html`
                            ${Object.entries(filteredCategories).map(([id, category]) => html`
                                <${FAQCategory}
                                    key=${id}
                                    id=${id}
                                    title=${category.title}
                                    icon=${category.icon}
                                    faqs=${category.faqs}
                                    openItems=${openItems}
                                    onToggle=${handleToggle}
                                />
                            `)}
                        ` : html`
                            <div class="faq-no-results">
                                <p>${t('faqPage.noResults')} "${searchQuery}"</p>
                                <button class="btn btn-secondary" onClick=${() => setSearchQuery('')}>
                                    ${t('faqPage.clearSearch')}
                                </button>
                            </div>
                        `}
                    </main>
                </div>

                <!-- CTA Section -->
                <section class="faq-cta">
                    <h2>${t('faqPage.readyToFind')}</h2>
                    <p>${t('faqPage.browseCoachesText')}</p>
                    <div class="cta-buttons">
                        <a href="#coaches" class="btn btn-primary btn-lg">${t('faqPage.findCoach')}</a>
                        <a href="#quiz" class="btn btn-secondary btn-lg">${t('faqPage.takeQuiz')}</a>
                    </div>
                </section>
            </div>
        </div>
    `;
}

export default FAQPage;
