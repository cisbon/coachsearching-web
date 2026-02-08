/**
 * Home Page Component
 * Landing page with hero, categories, how it works, and trust badges
 */

import htm from '../vendor/htm.js';
import { t } from '../i18n.js';

const React = window.React;
const html = htm.bind(React.createElement);

/**
 * Hero Section - Main landing area with discovery options and coach image
 */
export function Hero() {
    const [searchQuery, setSearchQuery] = React.useState('');

    const handleNavigate = (path) => {
        if (window.navigateTo) {
            window.navigateTo(path);
        } else {
            window.location.hash = path.replace('/', '#');
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            handleNavigate(`/coaches?search=${encodeURIComponent(searchQuery.trim())}`);
        } else {
            handleNavigate('/coaches');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch(e);
        }
    };

    return html`
        <section class="hero hero-split">
            <div class="container">
                <div class="hero-content-wrapper">
                    <!-- Left Side: Text, Search Bar, and Discovery Options -->
                    <div class="hero-left">
                        <h1>${t('hero.title')}</h1>
                        <p class="hero-subtitle">${t('hero.subtitle')}</p>

                        <!-- Google-style Search Bar -->
                        <div class="hero-search-container">
                            <form class="hero-search-bar" onSubmit=${handleSearch}>
                                <div class="hero-search-input-wrapper">
                                    <span class="hero-search-icon">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <circle cx="11" cy="11" r="8"></circle>
                                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                        </svg>
                                    </span>
                                    <input
                                        type="text"
                                        class="hero-search-input"
                                        placeholder=${t('hero.searchPlaceholder') || 'Karriere oder Entrepreneurship'}
                                        value=${searchQuery}
                                        onInput=${(e) => setSearchQuery(e.target.value)}
                                        onKeyPress=${handleKeyPress}
                                    />
                                </div>
                                <button type="submit" class="hero-search-btn">
                                    ${t('hero.searchBtn') || 'Suchen'}
                                </button>
                            </form>
                        </div>

                        <!-- Discovery Options -->
                        <div class="discovery-options">
                            <button class="discovery-option quiz-option" onClick=${() => handleNavigate('/quiz')}>
                                <span class="discovery-icon">🎯</span>
                                <span class="discovery-label">${t('discovery.takeQuiz')}</span>
                                <span class="discovery-desc">${t('discovery.takeQuizDesc')}</span>
                            </button>
                            <button class="discovery-option browse-option" onClick=${() => handleNavigate('/coaches')}>
                                <span class="discovery-icon">🔍</span>
                                <span class="discovery-label">${t('discovery.browse')}</span>
                                <span class="discovery-desc">${t('discovery.browseDesc')}</span>
                            </button>
                            <button class="discovery-option ai-option" onClick=${() => handleNavigate('/ai-match')}>
                                <span class="discovery-icon">✨</span>
                                <span class="discovery-label">${t('discovery.aiMatch')}</span>
                                <span class="discovery-desc">${t('discovery.aiMatchDesc')}</span>
                            </button>
                        </div>
                    </div>

                    <!-- Right Side: Coach Image -->
                    <div class="hero-right">
                        <div class="hero-image-container">
                            <img
                                src="https://coachsearching.com/hero.png"
                                alt="${t('hero.coachImageAlt') || 'Professional female coach'}"
                                class="hero-coach-image"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;
}

/**
 * Coaching Categories Section
 */
export function CoachingCategoriesSection() {
    const categories = [
        { slug: 'life-coaching', titleKey: 'category.life.title', icon: '🌟', descKey: 'category.life.desc' },
        { slug: 'career-coaching', titleKey: 'category.career.title', icon: '💼', descKey: 'category.career.desc' },
        { slug: 'business-coaching', titleKey: 'category.business.title', icon: '📊', descKey: 'category.business.desc' },
        { slug: 'executive-coaching', titleKey: 'category.executive.title', icon: '👔', descKey: 'category.executive.desc' },
        { slug: 'leadership', titleKey: 'category.leadership.title', icon: '👑', descKey: 'category.leadership.desc' },
        { slug: 'health-wellness', titleKey: 'category.health.title', icon: '💪', descKey: 'category.health.desc' },
        { slug: 'mindfulness', titleKey: 'category.mindfulness.title', icon: '🧘', descKey: 'category.mindfulness.desc' },
        { slug: 'relationship-coaching', titleKey: 'category.relationship.title', icon: '💑', descKey: 'category.relationship.desc' },
    ];

    return html`
        <section class="coaching-categories-section">
            <div class="container">
                <div class="section-header">
                    <h2>${t('home.categories.title') || 'Find Your Perfect Coach'}</h2>
                    <p>${t('home.categories.subtitle') || 'Explore our coaching specialties and discover how we can help you grow'}</p>
                </div>
                <div class="categories-grid-home">
                    ${categories.map(cat => html`
                        <a href="/coaching/${cat.slug}" class="category-card-home" key=${cat.slug}>
                            <div class="category-icon-home">${cat.icon}</div>
                            <h3>${t(cat.titleKey)}</h3>
                            <p>${t(cat.descKey)}</p>
                        </a>
                    `)}
                </div>
                <div class="categories-cta-home">
                    <a href="/categories" class="btn-secondary">${t('category.browseAll') || 'View All Categories'}</a>
                    <a href="/quiz" class="btn-primary">${t('category.findMatch') || 'Find Your Match'}</a>
                </div>
            </div>
        </section>
    `;
}

/**
 * How It Works Section
 */
export function HowItWorksSection() {
    const steps = [
        { number: '1', title: t('home.howItWorks.step1.title') || 'Find Your Coach', description: t('home.howItWorks.step1.desc') || 'Browse verified coaches or take our matching quiz', icon: '🔍' },
        { number: '2', title: t('home.howItWorks.step2.title') || 'Book a Free Discovery Call', description: t('home.howItWorks.step2.desc') || 'Connect with your coach for a free intro session', icon: '📅' },
        { number: '3', title: t('home.howItWorks.step3.title') || 'Transform', description: t('home.howItWorks.step3.desc') || 'Work with your coach to achieve your goals', icon: '🚀' },
    ];

    return html`
        <section class="how-it-works-section-home">
            <div class="container">
                <div class="section-header">
                    <h2>${t('home.howItWorks.title') || 'How It Works'}</h2>
                    <p>${t('home.howItWorks.subtitle') || 'Start your transformation in three simple steps'}</p>
                </div>
                <div class="steps-grid-home">
                    ${steps.map(step => html`
                        <div class="step-card-home" key=${step.number}>
                            <div class="step-icon-home">${step.icon}</div>
                            <div class="step-number-home">${step.number}</div>
                            <h3>${step.title}</h3>
                            <p>${step.description}</p>
                        </div>
                    `)}
                </div>
            </div>
        </section>
    `;
}

/**
 * Trust Badges Section
 */
export function TrustBadgesSection() {
    return html`
        <section class="trust-section-home">
            <div class="container">
                <div class="trust-badges-home">
                    <div class="trust-badge-home">
                        <span class="trust-icon">✓</span>
                        <span class="trust-text">${t('trust.verifiedCoaches') || '500+ Verified Coaches'}</span>
                    </div>
                    <div class="trust-badge-home">
                        <span class="trust-icon">⭐</span>
                        <span class="trust-text">${t('trust.avgRating') || '4.9 Average Rating'}</span>
                    </div>
                    <div class="trust-badge-home">
                        <span class="trust-icon">🔒</span>
                        <span class="trust-text">${t('trust.securePayments') || 'Secure Payments'}</span>
                    </div>
                    <div class="trust-badge-home">
                        <span class="trust-icon">💯</span>
                        <span class="trust-text">${t('trust.satisfaction') || 'Satisfaction Guaranteed'}</span>
                    </div>
                </div>
            </div>
        </section>
    `;
}

/**
 * Home Page - Combines all sections
 * @param {Object} props
 * @param {Object} props.session - User session (optional)
 * @param {React.Component} props.CoachList - CoachList component to render
 */
export function HomePage({ session, CoachList }) {
    return html`
        <div class="home-page">
            <${Hero} />
            <${CoachingCategoriesSection} />
            <${HowItWorksSection} />
            ${CoachList && html`<${CoachList} session=${session} />`}
        </div>
    `;
}

export default HomePage;
