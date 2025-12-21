/**
 * Category Landing Page Component
 * @fileoverview SEO-optimized landing pages for coaching specialties
 */

import htm from '../vendor/htm.js';
import { t } from '../i18n.js';
import {
    setPageMeta,
    setStructuredData,
    generateBreadcrumbSchema,
    generateFAQSchema,
    slugify,
} from '../utils/seo.js';
import { CoachList } from '../components/coach/CoachList.js';
import { CoachDetailModal } from '../components/coach/CoachDetailModal.js';

const React = window.React;
const { useEffect, useState, useMemo, useCallback } = React;
const html = htm.bind(React.createElement);

// Map category slugs to specialty search terms
const CATEGORY_TO_SPECIALTY = {
    'executive-coaching': ['executive', 'leadership', 'c-suite'],
    'life-coaching': ['life', 'personal development', 'transformation'],
    'career-coaching': ['career', 'job search', 'professional development'],
    'business-coaching': ['business', 'entrepreneur', 'startup'],
    'leadership': ['leadership', 'management', 'team'],
    'health-wellness': ['health', 'wellness', 'nutrition', 'fitness'],
    'mindfulness': ['mindfulness', 'meditation', 'stress', 'anxiety'],
    'relationship-coaching': ['relationship', 'dating', 'couples', 'marriage'],
};

// ============================================================================
// Category Definitions - Comprehensive coaching specialty data
// ============================================================================

export const COACHING_CATEGORIES = {
    'executive-coaching': {
        title: 'Executive Coaching',
        metaTitle: 'Executive Coaches | Leadership & C-Suite Coaching',
        description: 'Transform your leadership with expert executive coaches. Develop strategic thinking, enhance decision-making, and lead with confidence.',
        longDescription: `Executive coaching is designed for C-suite leaders, senior managers, and high-potential executives who want to maximize their leadership impact. Our verified executive coaches bring decades of corporate experience and proven methodologies to help you navigate complex business challenges, build high-performing teams, and achieve breakthrough results.`,
        keywords: ['executive coach', 'leadership coaching', 'c-suite coach', 'ceo coach', 'senior leadership development'],
        icon: '👔',
        benefits: [
            'Enhanced strategic decision-making',
            'Improved executive presence',
            'Better stakeholder management',
            'Increased team performance',
            'Accelerated career advancement',
        ],
        idealFor: [
            'C-suite executives (CEO, CFO, COO, etc.)',
            'Senior vice presidents and directors',
            'High-potential leaders preparing for promotion',
            'Entrepreneurs scaling their companies',
            'Leaders navigating organizational change',
        ],
        faqs: [
            {
                question: 'What is executive coaching?',
                answer: 'Executive coaching is a personalized development process that helps senior leaders enhance their leadership capabilities, navigate complex challenges, and achieve strategic goals through one-on-one guidance from an experienced coach.',
            },
            {
                question: 'How is executive coaching different from leadership training?',
                answer: 'Executive coaching is highly personalized and focused on your specific challenges and goals, whereas leadership training is typically group-based and follows a standardized curriculum. Coaching provides ongoing support and accountability.',
            },
            {
                question: 'What ROI can I expect from executive coaching?',
                answer: 'Studies show executive coaching delivers ROI of 5-7x the investment through improved performance, better decision-making, reduced turnover, and enhanced team productivity. Many executives see measurable improvements within 3-6 months.',
            },
        ],
        relatedCategories: ['leadership', 'business-coaching', 'career-development'],
    },
    'life-coaching': {
        title: 'Life Coaching',
        metaTitle: 'Life Coaches | Personal Development & Transformation',
        description: 'Find your purpose and create a fulfilling life with certified life coaches. Overcome challenges, set meaningful goals, and unlock your full potential.',
        longDescription: `Life coaching empowers you to create positive, lasting change in all areas of your life. Whether you're seeking clarity on your purpose, navigating a life transition, or wanting to improve your relationships and well-being, our certified life coaches provide the support and accountability you need to transform your life.`,
        keywords: ['life coach', 'personal development', 'life transformation', 'purpose coaching', 'personal growth'],
        icon: '🌟',
        benefits: [
            'Discover your true purpose and values',
            'Overcome limiting beliefs and fears',
            'Create work-life balance',
            'Improve relationships and communication',
            'Build lasting habits for success',
        ],
        idealFor: [
            'Anyone feeling stuck or unfulfilled',
            'People navigating major life transitions',
            'Those seeking better work-life balance',
            'Individuals wanting to improve relationships',
            'Anyone ready to invest in personal growth',
        ],
        faqs: [
            {
                question: 'What does a life coach do?',
                answer: 'A life coach helps you identify your goals, overcome obstacles, and take action toward creating the life you want. They provide support, accountability, and tools to help you make lasting positive changes.',
            },
            {
                question: 'Is life coaching the same as therapy?',
                answer: 'No, life coaching is distinct from therapy. While therapy often addresses past trauma and mental health issues, life coaching is future-focused, helping you set and achieve goals. Coaches work with mentally healthy individuals seeking growth.',
            },
            {
                question: 'How long does life coaching take to see results?',
                answer: 'Many clients report feeling more clarity and motivation after just a few sessions. Significant life changes typically occur over 3-6 months of consistent coaching, though the timeline varies based on your goals.',
            },
        ],
        relatedCategories: ['wellness-coaching', 'mindfulness', 'career-development'],
    },
    'career-coaching': {
        title: 'Career Coaching',
        metaTitle: 'Career Coaches | Job Search & Career Development',
        description: 'Advance your career with expert career coaches. Get help with job search, career transitions, salary negotiation, and professional development.',
        longDescription: `Career coaching helps professionals at all stages navigate their career journey with confidence. Whether you're seeking a promotion, changing industries, returning to work, or launching a new career entirely, our career coaches provide expert guidance on resume optimization, interview preparation, salary negotiation, and strategic career planning.`,
        keywords: ['career coach', 'job search help', 'career transition', 'salary negotiation', 'interview coaching'],
        icon: '💼',
        benefits: [
            'Clarity on career direction and goals',
            'Optimized resume and LinkedIn profile',
            'Improved interview performance',
            'Successful salary negotiation',
            'Strategic career advancement planning',
        ],
        idealFor: [
            'Professionals seeking career advancement',
            'Those planning a career change',
            'Recent graduates entering the workforce',
            'Professionals returning after a break',
            'Anyone preparing for job interviews',
        ],
        faqs: [
            {
                question: 'What can a career coach help me with?',
                answer: 'Career coaches help with job search strategy, resume and cover letter optimization, interview preparation, salary negotiation, career transition planning, networking strategies, and long-term career development.',
            },
            {
                question: 'Is career coaching worth the investment?',
                answer: 'Absolutely. Career coaching can significantly shorten your job search, help you land higher-paying positions, and accelerate your career progression. The return on investment often exceeds the coaching cost within your first year.',
            },
            {
                question: 'How many sessions do I need for a job search?',
                answer: 'Most clients work with a career coach for 4-8 sessions during an active job search. This typically covers strategy development, resume optimization, interview prep, and negotiation coaching.',
            },
        ],
        relatedCategories: ['executive-coaching', 'leadership', 'interview-coaching'],
    },
    'business-coaching': {
        title: 'Business Coaching',
        metaTitle: 'Business Coaches | Entrepreneurship & Growth Strategy',
        description: 'Grow your business with expert business coaches. Get guidance on strategy, operations, marketing, and scaling your company.',
        longDescription: `Business coaching provides entrepreneurs and business owners with the strategic guidance, accountability, and expertise needed to build and scale successful companies. Our business coaches have real-world experience growing businesses and can help you overcome challenges, optimize operations, increase revenue, and achieve your business goals faster.`,
        keywords: ['business coach', 'entrepreneur coach', 'startup coaching', 'business growth', 'business strategy'],
        icon: '📊',
        benefits: [
            'Clear business strategy and vision',
            'Increased revenue and profitability',
            'Better operational efficiency',
            'Effective marketing strategies',
            'Sustainable business growth',
        ],
        idealFor: [
            'Startup founders and entrepreneurs',
            'Small business owners',
            'Solopreneurs and freelancers',
            'Business owners scaling their company',
            'Leaders launching new ventures',
        ],
        faqs: [
            {
                question: 'What does a business coach do?',
                answer: 'A business coach helps you develop and execute strategies for business growth, overcome operational challenges, improve leadership skills, and hold you accountable to your business goals.',
            },
            {
                question: 'When should I hire a business coach?',
                answer: 'Consider hiring a business coach when you\'re starting a business, hitting a growth plateau, facing difficult decisions, feeling overwhelmed, or wanting to scale your operations.',
            },
            {
                question: 'What\'s the difference between a business coach and consultant?',
                answer: 'A business coach helps you develop your own solutions through questioning and guidance, while a consultant typically provides direct advice and may implement solutions for you. Coaching builds your long-term capabilities.',
            },
        ],
        relatedCategories: ['executive-coaching', 'leadership', 'sales-coaching'],
    },
    'leadership': {
        title: 'Leadership Coaching',
        metaTitle: 'Leadership Coaches | Develop Your Leadership Skills',
        description: 'Become a more effective leader with leadership coaching. Develop influence, communication, and team management skills.',
        longDescription: `Leadership coaching develops the essential skills needed to inspire and guide teams effectively. Whether you're a new manager or experienced leader, our leadership coaches help you build self-awareness, improve communication, resolve conflicts, motivate teams, and create a positive organizational culture.`,
        keywords: ['leadership coach', 'management coaching', 'leadership development', 'team leadership', 'leadership skills'],
        icon: '👑',
        benefits: [
            'Stronger leadership presence',
            'Better team communication',
            'Improved conflict resolution',
            'Higher team engagement',
            'More effective delegation',
        ],
        idealFor: [
            'New managers and team leads',
            'Mid-level managers moving up',
            'Technical experts becoming leaders',
            'Leaders of growing teams',
            'Anyone developing leadership skills',
        ],
        faqs: [
            {
                question: 'What skills does leadership coaching develop?',
                answer: 'Leadership coaching develops skills like strategic thinking, emotional intelligence, communication, delegation, conflict resolution, team motivation, decision-making, and change management.',
            },
            {
                question: 'Is leadership coaching only for executives?',
                answer: 'No, leadership coaching benefits anyone in a leadership role, from first-time supervisors to C-suite executives. The focus areas are tailored to your specific level and challenges.',
            },
            {
                question: 'How is progress measured in leadership coaching?',
                answer: 'Progress is measured through 360-degree feedback, achievement of specific goals, improvements in team performance metrics, and enhanced self-awareness through assessments.',
            },
        ],
        relatedCategories: ['executive-coaching', 'business-coaching', 'communication'],
    },
    'health-wellness': {
        title: 'Health & Wellness Coaching',
        metaTitle: 'Health Coaches | Wellness & Lifestyle Coaching',
        description: 'Achieve optimal health with wellness coaches. Get support for nutrition, fitness, stress management, and healthy lifestyle changes.',
        longDescription: `Health and wellness coaching takes a holistic approach to help you achieve your health goals. Our certified wellness coaches work with you on nutrition, exercise, stress management, sleep, and lifestyle habits to create sustainable changes that improve your overall well-being and quality of life.`,
        keywords: ['health coach', 'wellness coaching', 'nutrition coach', 'lifestyle coach', 'holistic health'],
        icon: '💪',
        benefits: [
            'Sustainable healthy habits',
            'Improved nutrition and diet',
            'Effective stress management',
            'Better sleep quality',
            'Increased energy and vitality',
        ],
        idealFor: [
            'Anyone wanting to improve their health',
            'Those struggling with weight management',
            'People dealing with chronic stress',
            'Anyone seeking lifestyle changes',
            'Those recovering from health challenges',
        ],
        faqs: [
            {
                question: 'What does a wellness coach do?',
                answer: 'A wellness coach helps you set health goals, create actionable plans, overcome obstacles, and build sustainable habits for nutrition, fitness, stress management, sleep, and overall well-being.',
            },
            {
                question: 'Is a wellness coach the same as a nutritionist?',
                answer: 'No, while wellness coaches may discuss nutrition, they take a broader approach covering all aspects of health. For specific dietary needs or medical conditions, you may also need a registered dietitian.',
            },
            {
                question: 'How often should I meet with a wellness coach?',
                answer: 'Most clients meet weekly or bi-weekly. Consistent sessions help maintain accountability and allow for regular adjustments to your wellness plan.',
            },
        ],
        relatedCategories: ['life-coaching', 'mindfulness', 'fitness-coaching'],
    },
    'mindfulness': {
        title: 'Mindfulness & Stress Coaching',
        metaTitle: 'Mindfulness Coaches | Stress Management & Mental Clarity',
        description: 'Find inner peace with mindfulness coaches. Learn meditation, stress reduction, and mental clarity techniques.',
        longDescription: `Mindfulness coaching helps you develop greater awareness, reduce stress, and cultivate inner peace in your daily life. Our mindfulness coaches teach meditation techniques, stress management strategies, and mindful living practices that enhance your mental clarity, emotional regulation, and overall well-being.`,
        keywords: ['mindfulness coach', 'meditation coaching', 'stress coaching', 'anxiety coaching', 'mental clarity'],
        icon: '🧘',
        benefits: [
            'Reduced stress and anxiety',
            'Greater mental clarity',
            'Improved emotional regulation',
            'Better focus and concentration',
            'Enhanced self-awareness',
        ],
        idealFor: [
            'High-stress professionals',
            'Anyone dealing with anxiety',
            'Those seeking inner peace',
            'People wanting to start meditation',
            'Anyone seeking better emotional balance',
        ],
        faqs: [
            {
                question: 'What is mindfulness coaching?',
                answer: 'Mindfulness coaching teaches you practical techniques for present-moment awareness, stress reduction, and mental clarity. It combines meditation instruction with coaching to integrate mindfulness into your daily life.',
            },
            {
                question: 'Do I need meditation experience?',
                answer: 'No prior experience is needed. Mindfulness coaches work with complete beginners as well as experienced meditators, tailoring practices to your level and goals.',
            },
            {
                question: 'How quickly can mindfulness reduce stress?',
                answer: 'Many people notice reduced stress after just a few sessions. With regular practice, significant improvements in stress management typically occur within 4-8 weeks.',
            },
        ],
        relatedCategories: ['health-wellness', 'life-coaching', 'executive-coaching'],
    },
    'relationship-coaching': {
        title: 'Relationship Coaching',
        metaTitle: 'Relationship Coaches | Dating, Marriage & Communication',
        description: 'Improve your relationships with expert relationship coaches. Get help with dating, communication, conflict resolution, and connection.',
        longDescription: `Relationship coaching helps individuals and couples build stronger, more fulfilling connections. Whether you're navigating dating, improving communication with your partner, resolving conflicts, or seeking to deepen intimacy, our relationship coaches provide guidance and tools for healthier, happier relationships.`,
        keywords: ['relationship coach', 'dating coach', 'couples coaching', 'marriage coach', 'communication coaching'],
        icon: '💑',
        benefits: [
            'Improved communication skills',
            'Stronger emotional connection',
            'Effective conflict resolution',
            'Clearer relationship goals',
            'Healthier dating experiences',
        ],
        idealFor: [
            'Singles seeking relationship success',
            'Couples wanting to strengthen bonds',
            'Those recovering from breakups',
            'People improving communication',
            'Anyone seeking healthier relationships',
        ],
        faqs: [
            {
                question: 'What\'s the difference between relationship coaching and couples therapy?',
                answer: 'Relationship coaching is future-focused and goal-oriented, while therapy often addresses past issues and mental health. Coaching works with individuals or couples seeking improvement, not crisis intervention.',
            },
            {
                question: 'Can I work with a relationship coach as a single person?',
                answer: 'Absolutely! Many people work with relationship coaches to improve their dating approach, understand relationship patterns, and prepare for healthy partnerships.',
            },
            {
                question: 'How can relationship coaching help my marriage?',
                answer: 'Relationship coaching helps couples improve communication, reignite connection, navigate transitions, align on goals, and develop tools for ongoing relationship success.',
            },
        ],
        relatedCategories: ['life-coaching', 'communication', 'dating-coaching'],
    },
};

// ============================================================================
// Helper Components
// ============================================================================

function CategoryHero({ category, categorySlug }) {
    const title = t(`categoryPage.${categorySlug}.title`) || category.title;
    const description = t(`categoryPage.${categorySlug}.description`) || category.description;

    return html`
        <section class="category-hero">
            <div class="container">
                <div class="category-icon-large">${category.icon}</div>
                <h1>${title}</h1>
                <p class="hero-description">${description}</p>
                <div class="hero-cta">
                    <a href="/coaches?specialty=${encodeURIComponent(category.title)}" class="btn btn-primary btn-lg">
                        ${t('categoryPage.findCoaches') || 'Find Coaches'}
                    </a>
                    <a href="/quiz" class="btn btn-secondary btn-lg">${t('category.takeQuiz') || 'Take the Quiz'}</a>
                </div>
            </div>
        </section>
    `;
}

function BenefitsList({ benefits, categorySlug }) {
    return html`
        <section class="category-benefits">
            <div class="container">
                <h2>${t('category.benefits') || 'Benefits'}</h2>
                <div class="benefits-grid">
                    ${benefits.items.map((benefit, i) => html`
                        <div class="benefit-card" key=${i}>
                            <div class="benefit-icon">✓</div>
                            <p>${t(`categoryPage.${categorySlug}.benefit${i+1}`) || benefit}</p>
                        </div>
                    `)}
                </div>
            </div>
        </section>
    `;
}

function IdealForSection({ items, categorySlug }) {
    return html`
        <section class="category-ideal-for">
            <div class="container">
                <h2>${t('category.whoIsFor') || 'Who is it for?'}</h2>
                <ul class="ideal-for-list">
                    ${items.map((item, i) => html`
                        <li key=${i}>${t(`categoryPage.${categorySlug}.idealFor${i+1}`) || item}</li>
                    `)}
                </ul>
            </div>
        </section>
    `;
}

function CategoryFAQ({ faqs, categoryTitle, categorySlug }) {
    return html`
        <section class="category-faq">
            <div class="container">
                <h2>${t('seo.faq') || 'Frequently Asked Questions'}</h2>
                <div class="faq-list">
                    ${faqs.map((faq, i) => html`
                        <div class="faq-item" key=${i}>
                            <h3>${t(`categoryPage.${categorySlug}.faq${i+1}Q`) || faq.question}</h3>
                            <p>${t(`categoryPage.${categorySlug}.faq${i+1}A`) || faq.answer}</p>
                        </div>
                    `)}
                </div>
            </div>
        </section>
    `;
}

function RelatedCategories({ categories, currentSlug }) {
    const related = categories
        .filter(slug => slug !== currentSlug && COACHING_CATEGORIES[slug])
        .slice(0, 4);

    if (related.length === 0) return null;

    return html`
        <section class="related-categories">
            <div class="container">
                <h2>${t('category.relatedCategories') || 'Related Categories'}</h2>
                <div class="related-grid">
                    ${related.map(slug => {
                        const cat = COACHING_CATEGORIES[slug];
                        const title = t(`categoryPage.${slug}.title`) || cat.title;
                        return html`
                            <a href="/coaching/${slug}" class="related-card" key=${slug}>
                                <span class="related-icon">${cat.icon}</span>
                                <span class="related-title">${title}</span>
                            </a>
                        `;
                    })}
                </div>
            </div>
        </section>
    `;
}

function CoachPreview({ categorySlug, category }) {
    // Get specialty terms for preselected filter
    const specialtyTerms = CATEGORY_TO_SPECIALTY[categorySlug] || [categorySlug.replace(/-/g, ' ')];
    // Use the first specialty term as the preselected filter
    const initialSpecialties = [specialtyTerms[0]];

    return html`
        <section class="category-coaches-preview">
            <${CoachList}
                initialSpecialties=${initialSpecialties}
                CoachDetailModal=${CoachDetailModal}
            />
        </section>
    `;
}

// ============================================================================
// Main Category Page Component
// ============================================================================

export function CategoryPage({ categorySlug }) {
    const category = COACHING_CATEGORIES[categorySlug];

    // If category doesn't exist, show 404-like message
    if (!category) {
        return html`
            <div class="category-not-found">
                <div class="container">
                    <h1>${t('categoryPage.notFound') || 'Category Not Found'}</h1>
                    <p>${t('categoryPage.notFoundDesc') || "Sorry, we couldn't find this coaching category."}</p>
                    <a href="/coaches" class="btn btn-primary">${t('seo.browseAll') || 'Browse All Coaches'}</a>
                </div>
            </div>
        `;
    }

    // Set SEO meta tags
    useEffect(() => {
        setPageMeta({
            title: category.metaTitle,
            description: category.description,
            url: `https://coachsearching.com/#coaching/${categorySlug}`,
            type: 'website',
        });

        // FAQ Schema
        if (category.faqs) {
            setStructuredData('faq-schema', generateFAQSchema(category.faqs));
        }

        // Breadcrumb schema
        setStructuredData('breadcrumb-schema', generateBreadcrumbSchema([
            { name: 'Home', url: 'https://coachsearching.com' },
            { name: 'Coaching Categories', url: 'https://coachsearching.com/#categories' },
            { name: category.title, url: `https://coachsearching.com/#coaching/${categorySlug}` },
        ]));

        // Service schema
        setStructuredData('service-schema', {
            '@context': 'https://schema.org',
            '@type': 'Service',
            'name': category.title,
            'description': category.longDescription,
            'provider': {
                '@type': 'Organization',
                'name': 'CoachSearching',
                'url': 'https://coachsearching.com',
            },
            'serviceType': category.title,
            'areaServed': 'Worldwide',
        });
    }, [categorySlug, category]);

    const title = t(`categoryPage.${categorySlug}.title`) || category.title;
    const longDescription = t(`categoryPage.${categorySlug}.longDescription`) || category.longDescription;

    return html`
        <div class="category-page">
            <!-- Hero -->
            <${CategoryHero} category=${category} categorySlug=${categorySlug} />

            <!-- Long Description -->
            <section class="category-description">
                <div class="container">
                    <div class="description-content">
                        <p>${longDescription}</p>
                    </div>
                </div>
            </section>

            <!-- Benefits -->
            <${BenefitsList} benefits=${{ items: category.benefits, title: title }} categorySlug=${categorySlug} />

            <!-- Who Is This For -->
            <${IdealForSection} items=${category.idealFor} categorySlug=${categorySlug} />

            <!-- Featured Coaches -->
            <${CoachPreview} categorySlug=${categorySlug} category=${category} />

            <!-- FAQ -->
            <${CategoryFAQ} faqs=${category.faqs} categoryTitle=${title} categorySlug=${categorySlug} />

            <!-- Related Categories -->
            <${RelatedCategories}
                categories=${category.relatedCategories}
                currentSlug=${categorySlug}
            />

            <!-- CTA -->
            <section class="category-cta">
                <div class="container">
                    <h2>${t('categoryPage.readyToStart') || 'Ready to Start Your Journey?'}</h2>
                    <p>${t('categoryPage.findPerfectCoach') || 'Find your perfect coach and take the first step toward transformation.'}</p>
                    <div class="cta-buttons">
                        <a href="/coaches?specialty=${encodeURIComponent(category.title)}" class="btn btn-primary btn-lg">
                            ${t('category.findCoach') || 'Find a Coach'}
                        </a>
                        <a href="/quiz" class="btn btn-secondary btn-lg">
                            ${t('categoryPage.getMatched') || 'Get Matched'}
                        </a>
                    </div>
                </div>
            </section>
        </div>
    `;
}

/**
 * Categories Index Page - Lists all coaching categories
 */
export function CategoriesIndexPage() {
    useEffect(() => {
        setPageMeta({
            title: t('categoryPage.indexTitle') || 'Coaching Categories | Find Your Specialty',
            description: t('categoryPage.indexDescription') || 'Explore all coaching categories on CoachSearching. From executive coaching to life coaching, find the right type of coach for your needs.',
            url: 'https://coachsearching.com/#categories',
        });

        setStructuredData('breadcrumb-schema', generateBreadcrumbSchema([
            { name: t('nav.home') || 'Home', url: 'https://coachsearching.com' },
            { name: t('categoryPage.categories') || 'Categories', url: 'https://coachsearching.com/#categories' },
        ]));
    }, []);

    return html`
        <div class="categories-index-page">
            <div class="container">
                <div class="categories-grid">
                    ${Object.entries(COACHING_CATEGORIES).map(([slug, category]) => html`
                        <a href="/coaching/${slug}" class="category-card" key=${slug}>
                            <div class="category-icon">${category.icon}</div>
                            <h2 class="category-title">${t(`categoryPage.${slug}.title`) || category.title}</h2>
                            <p class="category-description">${t(`categoryPage.${slug}.description`) || category.description}</p>
                            <span class="category-link">${t('categoryPage.learnMore') || 'Learn More'} →</span>
                        </a>
                    `)}
                </div>

                <section class="categories-cta">
                    <h2>${t('categoryPage.notSureTitle') || 'Not Sure Which Type You Need?'}</h2>
                    <p>${t('categoryPage.notSureDesc') || 'Take our quick quiz to get personalized coach recommendations.'}</p>
                    <a href="/quiz" class="btn btn-primary btn-lg">${t('category.takeQuiz') || 'Take the Quiz'}</a>
                </section>
            </div>
        </div>
    `;
}

// ============================================================================
// City Definitions for City-Specialty Landing Pages
// ============================================================================

export const COACHING_CITIES = {
    // Tier 1 - DACH + Netherlands (18 cities)
    'berlin': { name: 'Berlin', country: 'Germany', countryCode: 'DE' },
    'munich': { name: 'Munich', country: 'Germany', countryCode: 'DE' },
    'hamburg': { name: 'Hamburg', country: 'Germany', countryCode: 'DE' },
    'frankfurt': { name: 'Frankfurt', country: 'Germany', countryCode: 'DE' },
    'dusseldorf': { name: 'Düsseldorf', country: 'Germany', countryCode: 'DE' },
    'cologne': { name: 'Cologne', country: 'Germany', countryCode: 'DE' },
    'stuttgart': { name: 'Stuttgart', country: 'Germany', countryCode: 'DE' },
    'hanover': { name: 'Hanover', country: 'Germany', countryCode: 'DE' },
    'nuremberg': { name: 'Nuremberg', country: 'Germany', countryCode: 'DE' },
    'leipzig': { name: 'Leipzig', country: 'Germany', countryCode: 'DE' },
    'vienna': { name: 'Vienna', country: 'Austria', countryCode: 'AT' },
    'zurich': { name: 'Zurich', country: 'Switzerland', countryCode: 'CH' },
    'geneva': { name: 'Geneva', country: 'Switzerland', countryCode: 'CH' },
    'basel': { name: 'Basel', country: 'Switzerland', countryCode: 'CH' },
    'amsterdam': { name: 'Amsterdam', country: 'Netherlands', countryCode: 'NL' },
    'rotterdam': { name: 'Rotterdam', country: 'Netherlands', countryCode: 'NL' },
    'the-hague': { name: 'The Hague', country: 'Netherlands', countryCode: 'NL' },
    'brussels': { name: 'Brussels', country: 'Belgium', countryCode: 'BE' },

    // Tier 2 - UK, Ireland, Nordics, Belgium (12 cities)
    'london': { name: 'London', country: 'United Kingdom', countryCode: 'GB' },
    'manchester': { name: 'Manchester', country: 'United Kingdom', countryCode: 'GB' },
    'birmingham': { name: 'Birmingham', country: 'United Kingdom', countryCode: 'GB' },
    'edinburgh': { name: 'Edinburgh', country: 'United Kingdom', countryCode: 'GB' },
    'dublin': { name: 'Dublin', country: 'Ireland', countryCode: 'IE' },
    'stockholm': { name: 'Stockholm', country: 'Sweden', countryCode: 'SE' },
    'copenhagen': { name: 'Copenhagen', country: 'Denmark', countryCode: 'DK' },
    'oslo': { name: 'Oslo', country: 'Norway', countryCode: 'NO' },
    'helsinki': { name: 'Helsinki', country: 'Finland', countryCode: 'FI' },
    'antwerp': { name: 'Antwerp', country: 'Belgium', countryCode: 'BE' },
    'gothenburg': { name: 'Gothenburg', country: 'Sweden', countryCode: 'SE' },
    'malmo': { name: 'Malmö', country: 'Sweden', countryCode: 'SE' },

    // Tier 3 - Southern & Eastern Europe (18 cities)
    'paris': { name: 'Paris', country: 'France', countryCode: 'FR' },
    'lyon': { name: 'Lyon', country: 'France', countryCode: 'FR' },
    'madrid': { name: 'Madrid', country: 'Spain', countryCode: 'ES' },
    'barcelona': { name: 'Barcelona', country: 'Spain', countryCode: 'ES' },
    'valencia': { name: 'Valencia', country: 'Spain', countryCode: 'ES' },
    'milan': { name: 'Milan', country: 'Italy', countryCode: 'IT' },
    'rome': { name: 'Rome', country: 'Italy', countryCode: 'IT' },
    'warsaw': { name: 'Warsaw', country: 'Poland', countryCode: 'PL' },
    'krakow': { name: 'Krakow', country: 'Poland', countryCode: 'PL' },
    'wroclaw': { name: 'Wrocław', country: 'Poland', countryCode: 'PL' },
    'prague': { name: 'Prague', country: 'Czech Republic', countryCode: 'CZ' },
    'lisbon': { name: 'Lisbon', country: 'Portugal', countryCode: 'PT' },
    'porto': { name: 'Porto', country: 'Portugal', countryCode: 'PT' },
    'budapest': { name: 'Budapest', country: 'Hungary', countryCode: 'HU' },
    'bucharest': { name: 'Bucharest', country: 'Romania', countryCode: 'RO' },
    'athens': { name: 'Athens', country: 'Greece', countryCode: 'GR' },
    'luxembourg': { name: 'Luxembourg', country: 'Luxembourg', countryCode: 'LU' },
    'tallinn': { name: 'Tallinn', country: 'Estonia', countryCode: 'EE' },

    // Tier 4 - German secondary (12 cities)
    'dresden': { name: 'Dresden', country: 'Germany', countryCode: 'DE' },
    'bonn': { name: 'Bonn', country: 'Germany', countryCode: 'DE' },
    'essen': { name: 'Essen', country: 'Germany', countryCode: 'DE' },
    'dortmund': { name: 'Dortmund', country: 'Germany', countryCode: 'DE' },
    'bremen': { name: 'Bremen', country: 'Germany', countryCode: 'DE' },
    'duisburg': { name: 'Duisburg', country: 'Germany', countryCode: 'DE' },
    'munster': { name: 'Münster', country: 'Germany', countryCode: 'DE' },
    'karlsruhe': { name: 'Karlsruhe', country: 'Germany', countryCode: 'DE' },
    'mannheim': { name: 'Mannheim', country: 'Germany', countryCode: 'DE' },
    'augsburg': { name: 'Augsburg', country: 'Germany', countryCode: 'DE' },
    'wiesbaden': { name: 'Wiesbaden', country: 'Germany', countryCode: 'DE' },
    'freiburg': { name: 'Freiburg', country: 'Germany', countryCode: 'DE' },
};

// ============================================================================
// City-Specialty Landing Page Component
// ============================================================================

function CityCategoryHero({ category, city, categorySlug, citySlug }) {
    const categoryTitle = t(`categoryPage.${categorySlug}.title`) || category.title;
    const cityName = city.name;

    return html`
        <section class="category-hero city-category-hero">
            <div class="container">
                <div class="category-icon-large">${category.icon}</div>
                <h1>${categoryTitle} ${t('cityPage.in') || 'in'} ${cityName}</h1>
                <p class="hero-description">
                    ${t('cityPage.heroDesc', { category: categoryTitle, city: cityName }) ||
                      `Find the best ${categoryTitle.toLowerCase()} professionals in ${cityName}. Connect with experienced coaches who understand the local business culture and can meet you in person or online.`}
                </p>
                <div class="hero-cta">
                    <a href="#city-coaches" class="btn btn-primary btn-lg">
                        ${t('cityPage.viewCoaches') || 'View Coaches'} →
                    </a>
                    <a href="/quiz" class="btn btn-secondary btn-lg">${t('category.takeQuiz') || 'Take the Quiz'}</a>
                </div>
            </div>
        </section>
    `;
}

function CityBenefits({ category, city, categorySlug }) {
    const categoryTitle = t(`categoryPage.${categorySlug}.title`) || category.title;

    const benefits = [
        {
            icon: '📍',
            title: t('cityPage.benefit1Title') || 'Local Expertise',
            desc: t('cityPage.benefit1Desc', { city: city.name }) ||
                  `Coaches who understand ${city.name}'s business culture and professional landscape.`
        },
        {
            icon: '🤝',
            title: t('cityPage.benefit2Title') || 'In-Person Sessions',
            desc: t('cityPage.benefit2Desc', { city: city.name }) ||
                  `Meet your coach face-to-face in ${city.name} for more impactful sessions.`
        },
        {
            icon: '🌐',
            title: t('cityPage.benefit3Title') || 'Flexible Options',
            desc: t('cityPage.benefit3Desc') ||
                  'Choose between in-person meetings, video calls, or a hybrid approach.'
        },
        {
            icon: '⭐',
            title: t('cityPage.benefit4Title') || 'Verified Coaches',
            desc: t('cityPage.benefit4Desc') ||
                  'All coaches are vetted for credentials, experience, and client satisfaction.'
        }
    ];

    return html`
        <section class="city-benefits">
            <div class="container">
                <h2>${t('cityPage.whyChoose', { category: categoryTitle, city: city.name }) ||
                      `Why Choose ${categoryTitle} in ${city.name}?`}</h2>
                <div class="benefits-grid city-benefits-grid">
                    ${benefits.map((benefit, i) => html`
                        <div class="benefit-card" key=${i}>
                            <div class="benefit-icon">${benefit.icon}</div>
                            <h3>${benefit.title}</h3>
                            <p>${benefit.desc}</p>
                        </div>
                    `)}
                </div>
            </div>
        </section>
    `;
}

function CityCoachPreview({ categorySlug, category, city, citySlug }) {
    // Get specialty terms for preselected filter
    const specialtyTerms = CATEGORY_TO_SPECIALTY[categorySlug] || [categorySlug.replace(/-/g, ' ')];
    const initialSpecialties = [specialtyTerms[0]];

    return html`
        <section class="category-coaches-preview city-coaches-preview" id="city-coaches">
            <div class="container">
                <h2 style=${{ marginBottom: '1.5rem', textAlign: 'center' }}>
                    ${t('cityPage.coachesTitle', { category: category.title, city: city.name }) ||
                      `${category.title} Coaches in ${city.name}`}
                </h2>
            </div>
            <${CoachList}
                initialSpecialties=${initialSpecialties}
                initialCity=${city.name}
                CoachDetailModal=${CoachDetailModal}
            />
        </section>
    `;
}

function CityRelatedLinks({ categorySlug, category, citySlug, city }) {
    // Get other cities in the same country
    const sameCityCities = Object.entries(COACHING_CITIES)
        .filter(([slug, c]) => c.countryCode === city.countryCode && slug !== citySlug)
        .slice(0, 4);

    // Get other categories for this city
    const otherCategories = Object.entries(COACHING_CATEGORIES)
        .filter(([slug]) => slug !== categorySlug)
        .slice(0, 4);

    return html`
        <section class="city-related-links">
            <div class="container">
                ${sameCityCities.length > 0 && html`
                    <div class="related-section">
                        <h3>${t('cityPage.otherCities', { category: category.title }) ||
                              `${category.title} in Other Cities`}</h3>
                        <div class="related-grid">
                            ${sameCityCities.map(([slug, c]) => html`
                                <a href="/coaching/${categorySlug}/${slug}" class="related-card" key=${slug}>
                                    <span class="related-icon">📍</span>
                                    <span class="related-title">${c.name}</span>
                                </a>
                            `)}
                        </div>
                    </div>
                `}

                <div class="related-section" style=${{ marginTop: '2rem' }}>
                    <h3>${t('cityPage.otherCategories', { city: city.name }) ||
                          `Other Coaching Types in ${city.name}`}</h3>
                    <div class="related-grid">
                        ${otherCategories.map(([slug, cat]) => html`
                            <a href="/coaching/${slug}/${citySlug}" class="related-card" key=${slug}>
                                <span class="related-icon">${cat.icon}</span>
                                <span class="related-title">${t(`categoryPage.${slug}.title`) || cat.title}</span>
                            </a>
                        `)}
                    </div>
                </div>
            </div>
        </section>
    `;
}

/**
 * City-Specialty Landing Page Component
 * @param {Object} props
 * @param {string} props.categorySlug - The coaching category slug (e.g., 'executive-coaching')
 * @param {string} props.citySlug - The city slug (e.g., 'munich')
 */
export function CityCategoryPage({ categorySlug, citySlug }) {
    const category = COACHING_CATEGORIES[categorySlug];
    const city = COACHING_CITIES[citySlug];

    // If category or city doesn't exist, show 404-like message
    if (!category || !city) {
        return html`
            <div class="category-not-found">
                <div class="container">
                    <h1>${t('cityPage.notFound') || 'Page Not Found'}</h1>
                    <p>${t('cityPage.notFoundDesc') || "Sorry, we couldn't find this coaching category or city."}</p>
                    <div style=${{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
                        <a href="/categories" class="btn btn-secondary">${t('categoryPage.categories') || 'Browse Categories'}</a>
                        <a href="/coaches" class="btn btn-primary">${t('seo.browseAll') || 'Browse All Coaches'}</a>
                    </div>
                </div>
            </div>
        `;
    }

    const categoryTitle = t(`categoryPage.${categorySlug}.title`) || category.title;

    // Set SEO meta tags
    useEffect(() => {
        setPageMeta({
            title: `${categoryTitle} in ${city.name} | Find Local Coaches`,
            description: `Find the best ${categoryTitle.toLowerCase()} professionals in ${city.name}, ${city.country}. Connect with experienced coaches for in-person or online sessions.`,
            url: `https://coachsearching.com/coaching/${categorySlug}/${citySlug}`,
            type: 'website',
        });

        // Breadcrumb schema
        setStructuredData('breadcrumb-schema', generateBreadcrumbSchema([
            { name: 'Home', url: 'https://coachsearching.com' },
            { name: 'Coaching Categories', url: 'https://coachsearching.com/categories' },
            { name: categoryTitle, url: `https://coachsearching.com/coaching/${categorySlug}` },
            { name: city.name, url: `https://coachsearching.com/coaching/${categorySlug}/${citySlug}` },
        ]));

        // LocalBusiness schema for SEO
        setStructuredData('local-business-schema', {
            '@context': 'https://schema.org',
            '@type': 'ProfessionalService',
            'name': `${categoryTitle} in ${city.name}`,
            'description': `Professional ${categoryTitle.toLowerCase()} services in ${city.name}, ${city.country}`,
            'areaServed': {
                '@type': 'City',
                'name': city.name,
                'containedInPlace': {
                    '@type': 'Country',
                    'name': city.country
                }
            },
            'provider': {
                '@type': 'Organization',
                'name': 'CoachSearching',
                'url': 'https://coachsearching.com'
            }
        });
    }, [categorySlug, citySlug, category, city, categoryTitle]);

    return html`
        <div class="category-page city-category-page">
            <!-- Hero -->
            <${CityCategoryHero}
                category=${category}
                city=${city}
                categorySlug=${categorySlug}
                citySlug=${citySlug}
            />

            <!-- Benefits -->
            <${CityBenefits}
                category=${category}
                city=${city}
                categorySlug=${categorySlug}
            />

            <!-- Coaches Preview with City Filter -->
            <${CityCoachPreview}
                categorySlug=${categorySlug}
                category=${category}
                city=${city}
                citySlug=${citySlug}
            />

            <!-- Related Links -->
            <${CityRelatedLinks}
                categorySlug=${categorySlug}
                category=${category}
                citySlug=${citySlug}
                city=${city}
            />

            <!-- CTA -->
            <section class="category-cta">
                <div class="container">
                    <h2>${t('cityPage.readyToStart', { city: city.name }) ||
                          `Ready to Start Your Coaching Journey in ${city.name}?`}</h2>
                    <p>${t('cityPage.findPerfectCoach') ||
                          'Connect with a local coach who understands your needs and can help you achieve your goals.'}</p>
                    <div class="cta-buttons">
                        <a href="#city-coaches" class="btn btn-primary btn-lg">
                            ${t('cityPage.findCoach') || 'Find a Coach'}
                        </a>
                        <a href="/quiz" class="btn btn-secondary btn-lg">
                            ${t('categoryPage.getMatched') || 'Get Matched'}
                        </a>
                    </div>
                </div>
            </section>
        </div>
    `;
}

export default CategoryPage;
