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
// FAQ Data - Comprehensive Q&A organized by category
// ============================================================================

const FAQ_CATEGORIES = {
    general: {
        title: 'General Questions',
        icon: '❓',
        faqs: [
            {
                question: 'What is CoachSearching?',
                answer: 'CoachSearching is a professional platform that connects clients with certified coaches for business, life, career, and personal development coaching. We verify all coaches on our platform to ensure they have the proper qualifications and experience to help you achieve your goals.',
            },
            {
                question: 'How does CoachSearching work?',
                answer: 'It\'s simple: 1) Search for coaches by specialty, location, or language. 2) Review coach profiles, certifications, and client reviews. 3) Book a session directly through our secure platform. 4) Meet with your coach online or in-person. 5) Leave a review to help others find great coaches.',
            },
            {
                question: 'Is CoachSearching free to use?',
                answer: 'Yes, browsing coaches and creating an account is completely free. You only pay when you book a coaching session. Each coach sets their own rates, which are clearly displayed on their profile.',
            },
            {
                question: 'What types of coaching are available?',
                answer: 'We offer a wide range of coaching specialties including: Executive & Leadership Coaching, Career Development, Life Coaching, Business Coaching, Health & Wellness, Relationship Coaching, Financial Coaching, Mindfulness & Stress Management, and many more specialized areas.',
            },
            {
                question: 'How is CoachSearching different from other platforms?',
                answer: 'CoachSearching stands out through our rigorous coach verification process, transparent pricing, multi-language support (English, German, Spanish, French, Italian), and our focus on matching you with the right coach through our AI-powered quiz. We also offer both online and in-person session options.',
            },
        ],
    },
    booking: {
        title: 'Booking & Sessions',
        icon: '📅',
        faqs: [
            {
                question: 'How do I book a coaching session?',
                answer: 'Find a coach you like, view their available time slots, select a date and time that works for you, choose your session format (online or in-person), and complete the booking. You\'ll receive a confirmation email with all the details.',
            },
            {
                question: 'What session formats are available?',
                answer: 'Coaches offer various formats: Online sessions via video call (Zoom, Google Meet, etc.), phone sessions, and in-person meetings at the coach\'s location or a mutually agreed place. Each coach specifies which formats they offer on their profile.',
            },
            {
                question: 'How long are coaching sessions?',
                answer: 'Session lengths vary by coach, but common options include 30-minute, 60-minute, 90-minute, and 120-minute sessions. The duration and pricing are clearly shown on each coach\'s profile.',
            },
            {
                question: 'Can I reschedule or cancel a booking?',
                answer: 'Yes, you can reschedule or cancel bookings according to the coach\'s cancellation policy. Most coaches allow free cancellation up to 24-48 hours before the session. Check the specific coach\'s policy before booking.',
            },
            {
                question: 'What if I need to cancel last minute?',
                answer: 'Last-minute cancellations may be subject to the coach\'s cancellation policy, which could include partial or full session fees. We recommend contacting your coach directly if you have an emergency.',
            },
            {
                question: 'Can I book multiple sessions at once?',
                answer: 'Yes, many coaches offer session packages at discounted rates. You can also book recurring sessions with the same coach for ongoing support. Check individual coach profiles for package options.',
            },
        ],
    },
    payment: {
        title: 'Payment & Pricing',
        icon: '💳',
        faqs: [
            {
                question: 'What payment methods are accepted?',
                answer: 'We accept all major credit and debit cards (Visa, Mastercard, American Express), as well as Apple Pay and Google Pay. All payments are processed securely through Stripe.',
            },
            {
                question: 'When am I charged for a session?',
                answer: 'You\'re charged immediately when you book a session. The payment is held securely and released to the coach after the session is completed.',
            },
            {
                question: 'Are there any hidden fees?',
                answer: 'No hidden fees. The price you see on a coach\'s profile is the price you pay. A small platform fee is included in the displayed price to cover our services.',
            },
            {
                question: 'What currency are prices shown in?',
                answer: 'Prices are shown in EUR by default, but you can switch to USD or GBP using the currency selector. Actual charges will be in the currency you select.',
            },
            {
                question: 'Can I get a refund?',
                answer: 'Refund policies vary by coach and situation. If a coach cancels, you receive a full refund. For client cancellations, refer to the coach\'s cancellation policy. Contact support for any payment issues.',
            },
            {
                question: 'Do coaches offer free consultations?',
                answer: 'Many coaches offer a free 15-30 minute discovery call to discuss your needs before you commit to paid sessions. Look for "Free Consultation" badges on coach profiles.',
            },
        ],
    },
    coaches: {
        title: 'For Coaches',
        icon: '👨‍🏫',
        faqs: [
            {
                question: 'How can I become a coach on CoachSearching?',
                answer: 'Click "Become a Coach" and complete your profile with your qualifications, certifications, experience, and coaching specialties. Our team will review your application, usually within 2-3 business days.',
            },
            {
                question: 'What are the requirements to join as a coach?',
                answer: 'We require: Relevant coaching certifications (ICF, EMCC, or equivalent), professional experience in your coaching area, professional liability insurance, and a commitment to our code of ethics.',
            },
            {
                question: 'How much does it cost to list as a coach?',
                answer: 'Listing your profile is free. We charge a small platform fee (15%) on completed sessions to cover payment processing, marketing, and platform maintenance.',
            },
            {
                question: 'How do I get paid?',
                answer: 'Payments are processed through Stripe Connect. After completing a session, funds are transferred to your connected bank account within 2-7 business days, depending on your country.',
            },
            {
                question: 'Can I set my own rates and availability?',
                answer: 'Absolutely! You have full control over your hourly rates, session durations, availability schedule, and cancellation policy. You can update these at any time from your dashboard.',
            },
            {
                question: 'How do I get more clients?',
                answer: 'Tips for attracting clients: Complete your profile fully, add a professional photo, request reviews from clients, write a compelling bio, list all your certifications, respond quickly to inquiries, and maintain high ratings.',
            },
        ],
    },
    trust: {
        title: 'Trust & Safety',
        icon: '🔒',
        faqs: [
            {
                question: 'Are coaches verified?',
                answer: 'Yes, all coaches go through our verification process which includes: Identity verification, credential checking, certification validation, and review of professional experience. Look for the "Verified" badge on coach profiles.',
            },
            {
                question: 'How is my personal information protected?',
                answer: 'We use bank-level encryption (SSL/TLS) to protect your data. We never share your personal information with third parties without consent. Read our Privacy Policy for complete details.',
            },
            {
                question: 'What if I have a problem with a coach?',
                answer: 'Contact our support team immediately. We take all concerns seriously and have processes to mediate disputes, issue refunds when appropriate, and remove coaches who violate our terms.',
            },
            {
                question: 'How are reviews handled?',
                answer: 'Only clients who have completed a session can leave reviews. All reviews are moderated to ensure they\'re genuine and appropriate. Coaches cannot remove negative reviews unless they violate our guidelines.',
            },
            {
                question: 'Is my payment information secure?',
                answer: 'Yes, all payments are processed through Stripe, a PCI-DSS Level 1 certified payment processor. We never store your full credit card details on our servers.',
            },
        ],
    },
    technical: {
        title: 'Technical Questions',
        icon: '⚙️',
        faqs: [
            {
                question: 'What do I need for online sessions?',
                answer: 'You\'ll need: A stable internet connection, a device with a camera and microphone (computer, tablet, or smartphone), a quiet, private space, and any video conferencing software your coach uses (usually Zoom or Google Meet).',
            },
            {
                question: 'Is there a mobile app?',
                answer: 'CoachSearching works as a progressive web app (PWA). You can add it to your home screen on iOS or Android for an app-like experience. A dedicated mobile app is coming soon!',
            },
            {
                question: 'What browsers are supported?',
                answer: 'We support all modern browsers including Chrome, Firefox, Safari, and Edge. For the best experience, we recommend keeping your browser updated to the latest version.',
            },
            {
                question: 'I\'m having technical issues. What should I do?',
                answer: 'Try: Refreshing the page, clearing your browser cache, trying a different browser, checking your internet connection. If problems persist, contact our support team with details about the issue.',
            },
        ],
    },
};

// ============================================================================
// FAQ Components
// ============================================================================

/**
 * Single FAQ Item with collapsible answer
 */
function FAQItem({ question, answer, isOpen, onToggle }) {
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
    return html`
        <section class="faq-category" id=${id}>
            <h2 class="faq-category-title">
                <span class="faq-category-icon">${icon}</span>
                ${title}
            </h2>
            <div class="faq-list">
                ${faqs.map((faq, index) => html`
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
        <nav class="faq-nav" aria-label="FAQ Categories">
            <h3>Categories</h3>
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
                placeholder="Search FAQs..."
                value=${value}
                onInput=${(e) => onChange(e.target.value)}
                aria-label="Search frequently asked questions"
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

    // Set SEO meta tags
    useEffect(() => {
        setPageMeta({
            title: 'Frequently Asked Questions',
            description: 'Find answers to common questions about CoachSearching. Learn about booking coaching sessions, payment, coach verification, and more.',
            url: 'https://coachsearching.com/#faq',
        });

        // Generate FAQ schema for all FAQs
        const allFaqs = Object.values(FAQ_CATEGORIES).flatMap(cat => cat.faqs);
        setStructuredData('faq-schema', generateFAQSchema(allFaqs));

        // Breadcrumb schema
        setStructuredData('breadcrumb-schema', generateBreadcrumbSchema([
            { name: 'Home', url: 'https://coachsearching.com' },
            { name: 'FAQ', url: 'https://coachsearching.com/#faq' },
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
                    faq.question.toLowerCase().includes(query) ||
                    faq.answer.toLowerCase().includes(query)
            );

            if (matchingFaqs.length > 0) {
                filtered[id] = { ...category, faqs: matchingFaqs };
            }
        });

        return filtered;
    }, [searchQuery]);

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
                    <h1>Frequently Asked Questions</h1>
                    <p>Find answers to common questions about CoachSearching and how our platform works.</p>
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

                        <!-- Quick Contact -->
                        <div class="faq-contact">
                            <h3>Still have questions?</h3>
                            <p>Can't find what you're looking for? We're here to help.</p>
                            <a href="#contact" class="btn btn-primary">Contact Support</a>
                        </div>
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
                                <p>No FAQs found matching "${searchQuery}"</p>
                                <button class="btn btn-secondary" onClick=${() => setSearchQuery('')}>
                                    Clear Search
                                </button>
                            </div>
                        `}
                    </main>
                </div>

                <!-- CTA Section -->
                <section class="faq-cta">
                    <h2>Ready to Find Your Coach?</h2>
                    <p>Browse our verified coaches and start your transformation journey today.</p>
                    <div class="cta-buttons">
                        <a href="#coaches" class="btn btn-primary btn-lg">Find a Coach</a>
                        <a href="#quiz" class="btn btn-secondary btn-lg">Take the Quiz</a>
                    </div>
                </section>
            </div>
        </div>
    `;
}

export default FAQPage;
