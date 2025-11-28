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

const React = window.React;
const { useEffect, useState, useMemo } = React;
const html = htm.bind(React.createElement);

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
                    <a href="#coaches?specialty=${encodeURIComponent(category.title)}" class="btn btn-primary btn-lg">
                        ${t('categoryPage.findCoaches') || 'Find Coaches'}
                    </a>
                    <a href="#quiz" class="btn btn-secondary btn-lg">${t('category.takeQuiz') || 'Take the Quiz'}</a>
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
                            <a href="#coaching/${slug}" class="related-card" key=${slug}>
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

function CoachPreview() {
    // This would normally load real coaches from the API
    return html`
        <section class="category-coaches-preview">
            <div class="container">
                <h2>${t('home.featuredCoaches.title') || 'Featured Coaches'}</h2>
                <p class="section-subtitle">${t('categoryPage.topRatedCoaches') || 'Top-rated coaches in this specialty'}</p>
                <div class="coaches-placeholder">
                    <p>${t('common.loading') || 'Loading...'}</p>
                </div>
                <div class="view-all-link">
                    <a href="#coaches" class="btn btn-link">${t('categoryPage.viewAllCoaches') || 'View All Coaches'} →</a>
                </div>
            </div>
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
                    <a href="#coaches" class="btn btn-primary">${t('seo.browseAll') || 'Browse All Coaches'}</a>
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
            <${CoachPreview} />

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
                        <a href="#coaches?specialty=${encodeURIComponent(category.title)}" class="btn btn-primary btn-lg">
                            ${t('category.findCoach') || 'Find a Coach'}
                        </a>
                        <a href="#quiz" class="btn btn-secondary btn-lg">
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
                <header class="categories-header">
                    <h1>${t('categoryPage.categories') || 'Coaching Categories'}</h1>
                    <p>${t('categoryPage.exploreSpecialties') || 'Explore our coaching specialties to find the perfect type of coach for your goals.'}</p>
                </header>

                <div class="categories-grid">
                    ${Object.entries(COACHING_CATEGORIES).map(([slug, category]) => html`
                        <a href="#coaching/${slug}" class="category-card" key=${slug}>
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
                    <a href="#quiz" class="btn btn-primary btn-lg">${t('category.takeQuiz') || 'Take the Quiz'}</a>
                </section>
            </div>
        </div>
    `;
}

export default CategoryPage;
