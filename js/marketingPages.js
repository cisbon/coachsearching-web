// js/marketingPages.js - Marketing Pages (About, For Coaches, Pricing, FAQ)
import htm from './vendor/htm.js';
import { t } from './i18n.js';

const React = window.React;
const { useState, useEffect } = React;
const html = htm.bind(React.createElement);

// =============================================
// ABOUT PAGE
// =============================================

export const AboutPage = () => {
    return html`
        <div class="marketing-page about-page">
            <!-- Hero Section -->
            <section class="page-hero">
                <div class="container">
                    <h1>${t('about.hero.title') || 'About CoachSearching'}</h1>
                    <p class="hero-subtitle">${t('about.hero.subtitle') || 'Connecting people with the right coaches to achieve their goals'}</p>
                </div>
            </section>

            <!-- Mission Section -->
            <section class="about-section">
                <div class="container">
                    <div class="about-content">
                        <div class="about-text">
                            <h2>${t('about.mission.title') || 'Our Mission'}</h2>
                            <p>${t('about.mission.text1') || 'We believe everyone deserves access to quality coaching. Our platform connects you with verified, professional coaches across Europe who can help you achieve your personal and professional goals.'}</p>
                            <p>${t('about.mission.text2') || 'Whether you\'re looking to advance your career, improve your health, build leadership skills, or transform your life, we\'re here to help you find the perfect match.'}</p>
                        </div>
                        <div class="about-image">
                            <div class="mission-visual">
                                <div class="mission-icon">🎯</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Values Section -->
            <section class="values-section">
                <div class="container">
                    <h2 class="section-title">${t('about.values.title') || 'Our Values'}</h2>
                    <div class="values-grid">
                        <div class="value-card">
                            <div class="value-icon">🔒</div>
                            <h3>${t('about.values.trust.title') || 'Trust & Safety'}</h3>
                            <p>${t('about.values.trust.desc') || 'All coaches go through identity verification and credential checks. Your data is protected with enterprise-grade security.'}</p>
                        </div>
                        <div class="value-card">
                            <div class="value-icon">🌍</div>
                            <h3>${t('about.values.access.title') || 'Accessibility'}</h3>
                            <p>${t('about.values.access.desc') || 'We support multiple languages and offer coaches at various price points to make coaching accessible to everyone.'}</p>
                        </div>
                        <div class="value-card">
                            <div class="value-icon">✨</div>
                            <h3>${t('about.values.quality.title') || 'Quality'}</h3>
                            <p>${t('about.values.quality.desc') || 'Our AI-powered matching system and verified reviews help you find coaches who truly fit your needs.'}</p>
                        </div>
                        <div class="value-card">
                            <div class="value-icon">🤝</div>
                            <h3>${t('about.values.community.title') || 'Community'}</h3>
                            <p>${t('about.values.community.desc') || 'We\'re building a community of growth-minded individuals and dedicated coaches supporting each other.'}</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Stats Section -->
            <section class="stats-section-marketing">
                <div class="container">
                    <div class="stats-grid-marketing">
                        <div class="stat-item">
                            <div class="stat-number">500+</div>
                            <div class="stat-desc">${t('about.stats.coaches') || 'Verified Coaches'}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">15+</div>
                            <div class="stat-desc">${t('about.stats.countries') || 'European Countries'}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">10K+</div>
                            <div class="stat-desc">${t('about.stats.sessions') || 'Sessions Completed'}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">4.8</div>
                            <div class="stat-desc">${t('about.stats.rating') || 'Average Rating'}</div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Team Section -->
            <section class="team-section">
                <div class="container">
                    <h2 class="section-title">${t('about.team.title') || 'Founded in Europe'}</h2>
                    <p class="section-subtitle">${t('about.team.subtitle') || 'CoachSearching was founded with a simple vision: make professional coaching accessible to everyone. Based in Europe, we\'re building the future of coaching one connection at a time.'}</p>
                </div>
            </section>
        </div>
    `;
};

// =============================================
// FOR COACHES PAGE
// =============================================

export const ForCoachesPage = ({ onSignUp }) => {
    return html`
        <div class="marketing-page for-coaches-page">
            <!-- Hero Section -->
            <section class="page-hero coaches-hero">
                <div class="container">
                    <h1>${t('forCoaches.hero.title') || 'Grow Your Coaching Practice'}</h1>
                    <p class="hero-subtitle">${t('forCoaches.hero.subtitle') || 'Join Europe\'s fastest-growing coaching marketplace and reach thousands of clients'}</p>
                    <button class="cta-button primary" onClick=${onSignUp}>
                        ${t('forCoaches.hero.cta') || 'Start Free Trial'}
                    </button>
                </div>
            </section>

            <!-- Benefits Section -->
            <section class="benefits-section">
                <div class="container">
                    <h2 class="section-title">${t('forCoaches.benefits.title') || 'Why Join CoachSearching?'}</h2>
                    <div class="benefits-grid">
                        <div class="benefit-card">
                            <div class="benefit-icon">📈</div>
                            <h3>${t('forCoaches.benefits.grow.title') || 'Grow Your Client Base'}</h3>
                            <p>${t('forCoaches.benefits.grow.desc') || 'Reach thousands of potential clients actively searching for coaches like you. Our AI matching connects you with clients who are the perfect fit.'}</p>
                        </div>
                        <div class="benefit-card">
                            <div class="benefit-icon">💳</div>
                            <h3>${t('forCoaches.benefits.payments.title') || 'Hassle-Free Payments'}</h3>
                            <p>${t('forCoaches.benefits.payments.desc') || 'We handle all payments securely through Stripe. Get paid directly to your bank account with automatic transfers.'}</p>
                        </div>
                        <div class="benefit-card">
                            <div class="benefit-icon">📅</div>
                            <h3>${t('forCoaches.benefits.scheduling.title') || 'Easy Scheduling'}</h3>
                            <p>${t('forCoaches.benefits.scheduling.desc') || 'Set your availability and let clients book directly. Automatic reminders reduce no-shows.'}</p>
                        </div>
                        <div class="benefit-card">
                            <div class="benefit-icon">⭐</div>
                            <h3>${t('forCoaches.benefits.reputation.title') || 'Build Your Reputation'}</h3>
                            <p>${t('forCoaches.benefits.reputation.desc') || 'Collect verified reviews from clients. Showcase your expertise with a professional profile.'}</p>
                        </div>
                        <div class="benefit-card">
                            <div class="benefit-icon">🎥</div>
                            <h3>${t('forCoaches.benefits.video.title') || 'Video Introductions'}</h3>
                            <p>${t('forCoaches.benefits.video.desc') || 'Stand out with a video intro that lets clients see the real you before booking.'}</p>
                        </div>
                        <div class="benefit-card">
                            <div class="benefit-icon">🛡️</div>
                            <h3>${t('forCoaches.benefits.verification.title') || 'Verified Badge'}</h3>
                            <p>${t('forCoaches.benefits.verification.desc') || 'Get verified to build trust and appear higher in search results.'}</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- How It Works -->
            <section class="how-it-works-coaches">
                <div class="container">
                    <h2 class="section-title">${t('forCoaches.howItWorks.title') || 'How It Works'}</h2>
                    <div class="steps-timeline">
                        <div class="step-item">
                            <div class="step-number">1</div>
                            <div class="step-content">
                                <h3>${t('forCoaches.howItWorks.step1.title') || 'Create Your Profile'}</h3>
                                <p>${t('forCoaches.howItWorks.step1.desc') || 'Sign up and build your professional profile. Add your bio, specialties, credentials, and upload a video introduction.'}</p>
                            </div>
                        </div>
                        <div class="step-item">
                            <div class="step-number">2</div>
                            <div class="step-content">
                                <h3>${t('forCoaches.howItWorks.step2.title') || 'Get Verified'}</h3>
                                <p>${t('forCoaches.howItWorks.step2.desc') || 'Complete our verification process to get the verified badge and build trust with potential clients.'}</p>
                            </div>
                        </div>
                        <div class="step-item">
                            <div class="step-number">3</div>
                            <div class="step-content">
                                <h3>${t('forCoaches.howItWorks.step3.title') || 'Set Your Services'}</h3>
                                <p>${t('forCoaches.howItWorks.step3.desc') || 'Define your coaching packages, set your rates, and configure your availability.'}</p>
                            </div>
                        </div>
                        <div class="step-item">
                            <div class="step-number">4</div>
                            <div class="step-content">
                                <h3>${t('forCoaches.howItWorks.step4.title') || 'Start Coaching'}</h3>
                                <p>${t('forCoaches.howItWorks.step4.desc') || 'Receive bookings, conduct sessions, and get paid automatically. Focus on what you do best.'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Pricing Preview -->
            <section class="coaches-pricing-preview">
                <div class="container">
                    <h2 class="section-title">${t('forCoaches.pricing.title') || 'Simple, Transparent Pricing'}</h2>
                    <div class="pricing-highlight">
                        <div class="pricing-card-large">
                            <div class="founding-badge">${t('forCoaches.pricing.founding') || 'Founding Coach Rate'}</div>
                            <div class="price-display">
                                <span class="price-value">10%</span>
                                <span class="price-label">${t('forCoaches.pricing.commission') || 'commission per booking'}</span>
                            </div>
                            <ul class="pricing-features">
                                <li>${t('forCoaches.pricing.feature1') || 'No monthly fees'}</li>
                                <li>${t('forCoaches.pricing.feature2') || 'Unlimited client bookings'}</li>
                                <li>${t('forCoaches.pricing.feature3') || 'Video profile hosting'}</li>
                                <li>${t('forCoaches.pricing.feature4') || 'AI-powered client matching'}</li>
                                <li>${t('forCoaches.pricing.feature5') || 'Secure payment processing'}</li>
                                <li>${t('forCoaches.pricing.feature6') || 'Review & rating system'}</li>
                            </ul>
                            <p class="pricing-note">${t('forCoaches.pricing.note') || 'Standard rate: 15%. Lock in the founding rate by joining now!'}</p>
                            <button class="cta-button primary" onClick=${onSignUp}>
                                ${t('forCoaches.pricing.cta') || 'Become a Coach'}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Testimonials -->
            <section class="testimonials-section">
                <div class="container">
                    <h2 class="section-title">${t('forCoaches.testimonials.title') || 'What Coaches Say'}</h2>
                    <div class="testimonials-grid">
                        <div class="testimonial-card">
                            <p class="testimonial-text">"CoachSearching helped me grow my practice by 40% in just 3 months. The client matching is incredibly accurate."</p>
                            <div class="testimonial-author">
                                <div class="author-avatar">MK</div>
                                <div>
                                    <div class="author-name">Maria K.</div>
                                    <div class="author-title">Leadership Coach, Berlin</div>
                                </div>
                            </div>
                        </div>
                        <div class="testimonial-card">
                            <p class="testimonial-text">"The platform handles all the admin so I can focus on coaching. Payments are always on time."</p>
                            <div class="testimonial-author">
                                <div class="author-avatar">JM</div>
                                <div>
                                    <div class="author-name">Jean M.</div>
                                    <div class="author-title">Career Coach, Paris</div>
                                </div>
                            </div>
                        </div>
                        <div class="testimonial-card">
                            <p class="testimonial-text">"Video intros were a game changer. Clients feel like they know me before we even meet."</p>
                            <div class="testimonial-author">
                                <div class="author-avatar">SR</div>
                                <div>
                                    <div class="author-name">Sofia R.</div>
                                    <div class="author-title">Life Coach, Milan</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Final CTA -->
            <section class="final-cta-section">
                <div class="container">
                    <h2>${t('forCoaches.finalCta.title') || 'Ready to Grow Your Practice?'}</h2>
                    <p>${t('forCoaches.finalCta.subtitle') || 'Join hundreds of coaches who are building successful practices on CoachSearching'}</p>
                    <button class="cta-button primary large" onClick=${onSignUp}>
                        ${t('forCoaches.finalCta.cta') || 'Get Started Free'}
                    </button>
                </div>
            </section>
        </div>
    `;
};

// =============================================
// PRICING PAGE
// =============================================

export const PricingPage = ({ onClientSignUp, onCoachSignUp }) => {
    const [billingCycle, setBillingCycle] = useState('monthly');

    return html`
        <div class="marketing-page pricing-page">
            <!-- Hero Section -->
            <section class="page-hero">
                <div class="container">
                    <h1>${t('pricing.hero.title') || 'Simple, Transparent Pricing'}</h1>
                    <p class="hero-subtitle">${t('pricing.hero.subtitle') || 'No hidden fees. Pay only for what you use.'}</p>
                </div>
            </section>

            <!-- Pricing Cards -->
            <section class="pricing-section">
                <div class="container">
                    <div class="pricing-grid">
                        <!-- For Clients -->
                        <div class="pricing-card">
                            <div class="pricing-header">
                                <h3>${t('pricing.clients.title') || 'For Clients'}</h3>
                                <p class="pricing-subtitle">${t('pricing.clients.subtitle') || 'Find and book your perfect coach'}</p>
                            </div>
                            <div class="pricing-body">
                                <div class="price-display">
                                    <span class="price-value">${t('pricing.clients.price') || 'Free'}</span>
                                </div>
                                <p class="price-description">${t('pricing.clients.description') || 'to browse and discover coaches'}</p>
                                <ul class="pricing-features-list">
                                    <li>
                                        <span class="check-icon">✓</span>
                                        ${t('pricing.clients.feature1') || 'Browse unlimited coach profiles'}
                                    </li>
                                    <li>
                                        <span class="check-icon">✓</span>
                                        ${t('pricing.clients.feature2') || 'Watch video introductions'}
                                    </li>
                                    <li>
                                        <span class="check-icon">✓</span>
                                        ${t('pricing.clients.feature3') || 'AI-powered coach matching'}
                                    </li>
                                    <li>
                                        <span class="check-icon">✓</span>
                                        ${t('pricing.clients.feature4') || 'Read verified reviews'}
                                    </li>
                                    <li>
                                        <span class="check-icon">✓</span>
                                        ${t('pricing.clients.feature5') || 'Secure payment processing'}
                                    </li>
                                    <li>
                                        <span class="check-icon">✓</span>
                                        ${t('pricing.clients.feature6') || 'Message coaches directly'}
                                    </li>
                                </ul>
                                <button class="cta-button outline" onClick=${onClientSignUp}>
                                    ${t('pricing.clients.cta') || 'Find a Coach'}
                                </button>
                            </div>
                        </div>

                        <!-- For Coaches -->
                        <div class="pricing-card featured">
                            <div class="featured-badge">${t('pricing.coaches.badge') || 'Most Popular'}</div>
                            <div class="pricing-header">
                                <h3>${t('pricing.coaches.title') || 'For Coaches'}</h3>
                                <p class="pricing-subtitle">${t('pricing.coaches.subtitle') || 'Grow your coaching practice'}</p>
                            </div>
                            <div class="pricing-body">
                                <div class="price-display">
                                    <span class="price-value">10%</span>
                                    <span class="price-period">${t('pricing.coaches.period') || 'per booking'}</span>
                                </div>
                                <p class="price-description">${t('pricing.coaches.description') || 'Founding coach rate (normally 15%)'}</p>
                                <ul class="pricing-features-list">
                                    <li>
                                        <span class="check-icon">✓</span>
                                        ${t('pricing.coaches.feature1') || 'No monthly subscription'}
                                    </li>
                                    <li>
                                        <span class="check-icon">✓</span>
                                        ${t('pricing.coaches.feature2') || 'Professional profile page'}
                                    </li>
                                    <li>
                                        <span class="check-icon">✓</span>
                                        ${t('pricing.coaches.feature3') || 'Video introduction hosting'}
                                    </li>
                                    <li>
                                        <span class="check-icon">✓</span>
                                        ${t('pricing.coaches.feature4') || 'Client booking management'}
                                    </li>
                                    <li>
                                        <span class="check-icon">✓</span>
                                        ${t('pricing.coaches.feature5') || 'Automated payments to your bank'}
                                    </li>
                                    <li>
                                        <span class="check-icon">✓</span>
                                        ${t('pricing.coaches.feature6') || 'Review & rating collection'}
                                    </li>
                                    <li>
                                        <span class="check-icon">✓</span>
                                        ${t('pricing.coaches.feature7') || 'Calendar integration'}
                                    </li>
                                    <li>
                                        <span class="check-icon">✓</span>
                                        ${t('pricing.coaches.feature8') || 'AI client matching'}
                                    </li>
                                </ul>
                                <button class="cta-button primary" onClick=${onCoachSignUp}>
                                    ${t('pricing.coaches.cta') || 'Become a Coach'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- FAQ Preview -->
            <section class="pricing-faq">
                <div class="container">
                    <h2 class="section-title">${t('pricing.faq.title') || 'Common Questions'}</h2>
                    <div class="faq-grid">
                        <div class="faq-item">
                            <h4>${t('pricing.faq.q1') || 'When do coaches pay the commission?'}</h4>
                            <p>${t('pricing.faq.a1') || 'The commission is automatically deducted when a client makes a payment. You receive the rest directly to your connected bank account.'}</p>
                        </div>
                        <div class="faq-item">
                            <h4>${t('pricing.faq.q2') || 'Are there any hidden fees?'}</h4>
                            <p>${t('pricing.faq.a2') || 'No hidden fees. Coaches pay only the commission per booking. Clients pay the coach\'s listed rates with no additional platform fees.'}</p>
                        </div>
                        <div class="faq-item">
                            <h4>${t('pricing.faq.q3') || 'What payment methods are accepted?'}</h4>
                            <p>${t('pricing.faq.a3') || 'We accept all major credit cards, debit cards, and popular European payment methods through Stripe.'}</p>
                        </div>
                        <div class="faq-item">
                            <h4>${t('pricing.faq.q4') || 'How long does the founding rate last?'}</h4>
                            <p>${t('pricing.faq.a4') || 'Coaches who join during our launch period lock in the 10% rate permanently for their account.'}</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    `;
};

// =============================================
// FAQ PAGE
// =============================================

export const FAQPage = () => {
    const [activeCategory, setActiveCategory] = useState('general');
    const [openItems, setOpenItems] = useState({});

    const toggleItem = (id) => {
        setOpenItems(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const faqCategories = [
        { id: 'general', label: t('faq.categories.general') || 'General', icon: '❓' },
        { id: 'clients', label: t('faq.categories.clients') || 'For Clients', icon: '👤' },
        { id: 'coaches', label: t('faq.categories.coaches') || 'For Coaches', icon: '🎓' },
        { id: 'payments', label: t('faq.categories.payments') || 'Payments', icon: '💳' },
        { id: 'technical', label: t('faq.categories.technical') || 'Technical', icon: '🔧' }
    ];

    const faqs = {
        general: [
            {
                id: 'g1',
                q: t('faq.general.q1') || 'What is CoachSearching?',
                a: t('faq.general.a1') || 'CoachSearching is a European coaching marketplace that connects clients with verified professional coaches. We use AI-powered matching to help you find coaches who best fit your needs and goals.'
            },
            {
                id: 'g2',
                q: t('faq.general.q2') || 'What types of coaching are available?',
                a: t('faq.general.a2') || 'We offer a wide range of coaching specialties including life coaching, career coaching, executive/leadership coaching, health & wellness coaching, business coaching, and relationship coaching.'
            },
            {
                id: 'g3',
                q: t('faq.general.q3') || 'Is CoachSearching available in my country?',
                a: t('faq.general.a3') || 'We currently serve clients and coaches across Europe. Coaching sessions can be conducted online (video call) or in-person depending on the coach\'s offerings and your location.'
            },
            {
                id: 'g4',
                q: t('faq.general.q4') || 'What languages are supported?',
                a: t('faq.general.a4') || 'Our platform is available in English, German, French, Spanish, and Italian. Coaches list the languages they speak, so you can find a coach in your preferred language.'
            }
        ],
        clients: [
            {
                id: 'c1',
                q: t('faq.clients.q1') || 'How do I find the right coach?',
                a: t('faq.clients.a1') || 'You can browse coaches by specialty, watch their video introductions, read reviews, and take our AI-powered matching quiz to get personalized recommendations based on your goals and preferences.'
            },
            {
                id: 'c2',
                q: t('faq.clients.q2') || 'Is it free to browse coaches?',
                a: t('faq.clients.a2') || 'Yes! Browsing profiles, watching videos, reading reviews, and using our matching quiz is completely free. You only pay when you book a session.'
            },
            {
                id: 'c3',
                q: t('faq.clients.q3') || 'Can I try a session before committing?',
                a: t('faq.clients.a3') || 'Many coaches offer free discovery calls or introductory sessions at a reduced rate. Look for these options on individual coach profiles.'
            },
            {
                id: 'c4',
                q: t('faq.clients.q4') || 'What if I\'m not satisfied with a session?',
                a: t('faq.clients.a4') || 'We have a satisfaction guarantee policy. If you\'re not satisfied with your first session with a coach, contact our support team within 48 hours to discuss options.'
            },
            {
                id: 'c5',
                q: t('faq.clients.q5') || 'Are online sessions as effective as in-person?',
                a: t('faq.clients.a5') || 'Research shows that online coaching is just as effective as in-person coaching. It offers additional benefits like convenience, flexibility, and access to coaches regardless of location.'
            }
        ],
        coaches: [
            {
                id: 'co1',
                q: t('faq.coaches.q1') || 'How do I become a coach on the platform?',
                a: t('faq.coaches.a1') || 'Sign up, create your profile, and submit for verification. Our team will review your credentials and approve your profile, typically within 2-3 business days.'
            },
            {
                id: 'co2',
                q: t('faq.coaches.q2') || 'What are the requirements to join?',
                a: t('faq.coaches.a2') || 'We look for coaches with relevant training, certifications, or demonstrable experience in their coaching specialty. You\'ll need to complete identity verification and provide credential documentation.'
            },
            {
                id: 'co3',
                q: t('faq.coaches.q3') || 'How do I set my rates?',
                a: t('faq.coaches.a3') || 'You have full control over your pricing. Set your hourly rate and create different packages for various session lengths or coaching programs.'
            },
            {
                id: 'co4',
                q: t('faq.coaches.q4') || 'What is the commission structure?',
                a: t('faq.coaches.a4') || 'Our standard commission is 15% per booking. Founding coaches who join during our launch period get a permanent 10% rate. There are no monthly fees or hidden charges.'
            },
            {
                id: 'co5',
                q: t('faq.coaches.q5') || 'How do video introductions help?',
                a: t('faq.coaches.a5') || 'Coaches with video introductions get significantly more bookings. Videos let clients see your personality and coaching style before booking, building trust and leading to better matches.'
            }
        ],
        payments: [
            {
                id: 'p1',
                q: t('faq.payments.q1') || 'What payment methods are accepted?',
                a: t('faq.payments.a1') || 'We accept Visa, Mastercard, American Express, and popular European payment methods like SEPA, iDEAL, and Bancontact through our secure Stripe integration.'
            },
            {
                id: 'p2',
                q: t('faq.payments.q2') || 'When do coaches receive payment?',
                a: t('faq.payments.a2') || 'Coaches receive automatic transfers to their connected bank account. Standard payouts happen within 2-7 business days after the session, depending on your country.'
            },
            {
                id: 'p3',
                q: t('faq.payments.q3') || 'Is my payment information secure?',
                a: t('faq.payments.a3') || 'Yes. All payments are processed through Stripe, a PCI-DSS Level 1 certified payment provider. We never store your full card details on our servers.'
            },
            {
                id: 'p4',
                q: t('faq.payments.q4') || 'What is the cancellation policy?',
                a: t('faq.payments.a4') || 'Each coach sets their own cancellation policy. Generally, cancellations made 24+ hours before a session are fully refundable. Check the specific coach\'s policy before booking.'
            },
            {
                id: 'p5',
                q: t('faq.payments.q5') || 'Can I get a refund?',
                a: t('faq.payments.a5') || 'Refunds are handled according to each coach\'s cancellation policy. For disputes or issues, contact our support team and we\'ll help mediate.'
            }
        ],
        technical: [
            {
                id: 't1',
                q: t('faq.technical.q1') || 'What do I need for online sessions?',
                a: t('faq.technical.a1') || 'You\'ll need a stable internet connection, a device with a camera and microphone (computer, tablet, or smartphone), and a quiet space. Most coaches use Zoom, Google Meet, or similar platforms.'
            },
            {
                id: 't2',
                q: t('faq.technical.q2') || 'Is my data secure?',
                a: t('faq.technical.a2') || 'Yes. We use enterprise-grade encryption, secure hosting, and follow GDPR guidelines. Your personal data and coaching session information is protected.'
            },
            {
                id: 't3',
                q: t('faq.technical.q3') || 'Can I use the platform on mobile?',
                a: t('faq.technical.a3') || 'Yes! Our platform is fully responsive and works great on smartphones and tablets. Browse coaches, book sessions, and manage your appointments from any device.'
            },
            {
                id: 't4',
                q: t('faq.technical.q4') || 'How do I reset my password?',
                a: t('faq.technical.a4') || 'Click "Forgot Password" on the login page, enter your email, and follow the link sent to your inbox to create a new password.'
            }
        ]
    };

    return html`
        <div class="marketing-page faq-page">
            <!-- Hero Section -->
            <section class="page-hero">
                <div class="container">
                    <h1>${t('faq.hero.title') || 'Frequently Asked Questions'}</h1>
                    <p class="hero-subtitle">${t('faq.hero.subtitle') || 'Find answers to common questions about CoachSearching'}</p>
                </div>
            </section>

            <!-- FAQ Content -->
            <section class="faq-section">
                <div class="container">
                    <div class="faq-layout">
                        <!-- Category Tabs -->
                        <div class="faq-categories">
                            ${faqCategories.map(cat => html`
                                <button
                                    key=${cat.id}
                                    class="faq-category-btn ${activeCategory === cat.id ? 'active' : ''}"
                                    onClick=${() => setActiveCategory(cat.id)}
                                >
                                    <span class="category-icon">${cat.icon}</span>
                                    <span>${cat.label}</span>
                                </button>
                            `)}
                        </div>

                        <!-- FAQ Items -->
                        <div class="faq-items">
                            ${(faqs[activeCategory] || []).map(item => html`
                                <div class="faq-item-card ${openItems[item.id] ? 'open' : ''}" key=${item.id}>
                                    <button
                                        class="faq-question"
                                        onClick=${() => toggleItem(item.id)}
                                    >
                                        <span>${item.q}</span>
                                        <span class="faq-toggle">${openItems[item.id] ? '−' : '+'}</span>
                                    </button>
                                    ${openItems[item.id] && html`
                                        <div class="faq-answer">
                                            <p>${item.a}</p>
                                        </div>
                                    `}
                                </div>
                            `)}
                        </div>
                    </div>
                </div>
            </section>

            <!-- Contact Section -->
            <section class="faq-contact">
                <div class="container">
                    <div class="contact-card">
                        <h3>${t('faq.contact.title') || 'Still have questions?'}</h3>
                        <p>${t('faq.contact.text') || 'Our support team is here to help. Reach out and we\'ll get back to you as soon as possible.'}</p>
                        <a href="mailto:support@coachsearching.com" class="cta-button outline">
                            ${t('faq.contact.cta') || 'Contact Support'}
                        </a>
                    </div>
                </div>
            </section>
        </div>
    `;
};

// =============================================
// CONTACT PAGE
// =============================================

export const ContactPage = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: 'general',
        message: ''
    });
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        // In production, this would send to backend
        console.log('Contact form submitted:', formData);
        setSubmitted(true);
    };

    return html`
        <div class="marketing-page contact-page">
            <!-- Hero Section -->
            <section class="page-hero">
                <div class="container">
                    <h1>${t('contact.hero.title') || 'Get in Touch'}</h1>
                    <p class="hero-subtitle">${t('contact.hero.subtitle') || 'We\'d love to hear from you'}</p>
                </div>
            </section>

            <!-- Contact Content -->
            <section class="contact-section">
                <div class="container">
                    <div class="contact-grid">
                        <!-- Contact Info -->
                        <div class="contact-info">
                            <h2>${t('contact.info.title') || 'Contact Information'}</h2>
                            <div class="contact-methods">
                                <div class="contact-method">
                                    <div class="method-icon">📧</div>
                                    <div>
                                        <h4>${t('contact.info.email') || 'Email'}</h4>
                                        <p>support@coachsearching.com</p>
                                    </div>
                                </div>
                                <div class="contact-method">
                                    <div class="method-icon">💬</div>
                                    <div>
                                        <h4>${t('contact.info.chat') || 'Live Chat'}</h4>
                                        <p>${t('contact.info.chatHours') || 'Mon-Fri, 9am-6pm CET'}</p>
                                    </div>
                                </div>
                                <div class="contact-method">
                                    <div class="method-icon">📍</div>
                                    <div>
                                        <h4>${t('contact.info.address') || 'Address'}</h4>
                                        <p>Europe</p>
                                    </div>
                                </div>
                            </div>

                            <div class="response-time">
                                <h4>${t('contact.info.response') || 'Response Time'}</h4>
                                <p>${t('contact.info.responseText') || 'We typically respond within 24 hours on business days.'}</p>
                            </div>
                        </div>

                        <!-- Contact Form -->
                        <div class="contact-form-container">
                            ${submitted ? html`
                                <div class="form-success">
                                    <div class="success-icon">✓</div>
                                    <h3>${t('contact.success.title') || 'Message Sent!'}</h3>
                                    <p>${t('contact.success.text') || 'Thank you for reaching out. We\'ll get back to you soon.'}</p>
                                </div>
                            ` : html`
                                <form class="contact-form" onSubmit=${handleSubmit}>
                                    <div class="form-field">
                                        <label>${t('contact.form.name') || 'Name'}</label>
                                        <input
                                            type="text"
                                            value=${formData.name}
                                            onInput=${(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div class="form-field">
                                        <label>${t('contact.form.email') || 'Email'}</label>
                                        <input
                                            type="email"
                                            value=${formData.email}
                                            onInput=${(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div class="form-field">
                                        <label>${t('contact.form.subject') || 'Subject'}</label>
                                        <select
                                            value=${formData.subject}
                                            onChange=${(e) => setFormData({ ...formData, subject: e.target.value })}
                                        >
                                            <option value="general">${t('contact.form.subjects.general') || 'General Inquiry'}</option>
                                            <option value="support">${t('contact.form.subjects.support') || 'Technical Support'}</option>
                                            <option value="billing">${t('contact.form.subjects.billing') || 'Billing Question'}</option>
                                            <option value="partnership">${t('contact.form.subjects.partnership') || 'Partnership Opportunity'}</option>
                                            <option value="press">${t('contact.form.subjects.press') || 'Press & Media'}</option>
                                        </select>
                                    </div>
                                    <div class="form-field">
                                        <label>${t('contact.form.message') || 'Message'}</label>
                                        <textarea
                                            value=${formData.message}
                                            onInput=${(e) => setFormData({ ...formData, message: e.target.value })}
                                            rows="5"
                                            required
                                        ></textarea>
                                    </div>
                                    <button type="submit" class="cta-button primary">
                                        ${t('contact.form.submit') || 'Send Message'}
                                    </button>
                                </form>
                            `}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    `;
};

// =============================================
// EXPORT
// =============================================

export default {
    AboutPage,
    ForCoachesPage,
    PricingPage,
    FAQPage,
    ContactPage
};
