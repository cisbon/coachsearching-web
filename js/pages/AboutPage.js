/**
 * About Page Component
 * @fileoverview Comprehensive About Us page with organization schema
 */

import htm from '../vendor/htm.js';
import { t } from '../i18n.js';
import {
    setPageMeta,
    setStructuredData,
    generateOrganizationSchema,
    generateBreadcrumbSchema,
} from '../utils/seo.js';

const React = window.React;
const { useEffect } = React;
const html = htm.bind(React.createElement);

// ============================================================================
// Team Data (using translation keys)
// ============================================================================

const getTeamMembers = () => [
    {
        name: 'Michael Gross',
        role: t('about.team.role1'),
        image: 'https://i.pravatar.cc/200?img=11',
        bio: t('about.team.bio1'),
        linkedin: '#',
    },
    {
        name: 'Sarah Miller',
        role: t('about.team.role2'),
        image: 'https://i.pravatar.cc/200?img=5',
        bio: t('about.team.bio2'),
        linkedin: '#',
    },
    {
        name: 'Thomas Weber',
        role: t('about.team.role3'),
        image: 'https://i.pravatar.cc/200?img=12',
        bio: t('about.team.bio3'),
        linkedin: '#',
    },
];

// ============================================================================
// Stats Data (using translation keys)
// ============================================================================

const getStats = () => [
    { value: '500+', label: t('about.stats.verifiedCoaches') },
    { value: '10,000+', label: t('about.stats.sessionsCompleted') },
    { value: '50+', label: t('about.stats.specialties') },
    { value: '25+', label: t('about.stats.countries') },
    { value: '4.9', label: t('about.stats.avgRating') },
    { value: '98%', label: t('about.stats.satisfaction') },
];

// ============================================================================
// Values Data (using translation keys)
// ============================================================================

const getValues = () => [
    {
        icon: '✓',
        title: t('about.values.quality'),
        description: t('about.values.qualityDesc'),
    },
    {
        icon: '🤝',
        title: t('about.values.matches'),
        description: t('about.values.matchesDesc'),
    },
    {
        icon: '🔒',
        title: t('about.values.trust'),
        description: t('about.values.trustDesc'),
    },
    {
        icon: '🌍',
        title: t('about.values.global'),
        description: t('about.values.globalDesc'),
    },
    {
        icon: '💬',
        title: t('about.values.transparent'),
        description: t('about.values.transparentDesc'),
    },
    {
        icon: '⭐',
        title: t('about.values.reviews'),
        description: t('about.values.reviewsDesc'),
    },
];

// ============================================================================
// Timeline Data (using translation keys)
// ============================================================================

const getTimeline = () => [
    {
        year: '2023',
        title: t('about.timeline.vision'),
        description: t('about.timeline.visionDesc'),
    },
    {
        year: '2024 Q1',
        title: t('about.timeline.launch'),
        description: t('about.timeline.launchDesc'),
    },
    {
        year: '2024 Q2',
        title: t('about.timeline.ai'),
        description: t('about.timeline.aiDesc'),
    },
    {
        year: '2024 Q3',
        title: t('about.timeline.expansion'),
        description: t('about.timeline.expansionDesc'),
    },
    {
        year: t('about.timeline.today'),
        title: t('about.timeline.community'),
        description: t('about.timeline.communityDesc'),
    },
];

// ============================================================================
// Verification Steps (using translation keys)
// ============================================================================

const getVerificationSteps = () => [
    {
        number: 1,
        title: t('about.verify.step1'),
        description: t('about.verify.step1Desc'),
    },
    {
        number: 2,
        title: t('about.verify.step2'),
        description: t('about.verify.step2Desc'),
    },
    {
        number: 3,
        title: t('about.verify.step3'),
        description: t('about.verify.step3Desc'),
    },
    {
        number: 4,
        title: t('about.verify.step4'),
        description: t('about.verify.step4Desc'),
    },
];

// ============================================================================
// Components
// ============================================================================

function StatCard({ value, label }) {
    return html`
        <div class="stat-card">
            <div class="stat-value">${value}</div>
            <div class="stat-label">${label}</div>
        </div>
    `;
}

function ValueCard({ icon, title, description }) {
    return html`
        <div class="value-card">
            <div class="value-icon">${icon}</div>
            <h3 class="value-title">${title}</h3>
            <p class="value-description">${description}</p>
        </div>
    `;
}

function TeamMember({ name, role, image, bio, linkedin }) {
    return html`
        <div class="team-member">
            <img src=${image} alt=${name} class="team-photo" loading="lazy" />
            <h3 class="team-name">${name}</h3>
            <div class="team-role">${role}</div>
            <p class="team-bio">${bio}</p>
            <a href=${linkedin} class="team-linkedin" aria-label="LinkedIn profile">
                LinkedIn →
            </a>
        </div>
    `;
}

function TimelineItem({ year, title, description, isLast }) {
    return html`
        <div class="timeline-item">
            <div class="timeline-marker">
                <span class="timeline-year">${year}</span>
            </div>
            <div class="timeline-content">
                <h3>${title}</h3>
                <p>${description}</p>
            </div>
        </div>
    `;
}

// ============================================================================
// Main About Page Component
// ============================================================================

export function AboutPage() {
    // Set SEO meta tags
    useEffect(() => {
        setPageMeta({
            title: t('about.pageTitle'),
            description: t('about.pageDescription'),
            url: 'https://coachsearching.com/#about',
        });

        // Organization schema
        setStructuredData('organization-schema', generateOrganizationSchema());

        // Breadcrumb schema
        setStructuredData('breadcrumb-schema', generateBreadcrumbSchema([
            { name: t('nav.home'), url: 'https://coachsearching.com' },
            { name: t('about.title'), url: 'https://coachsearching.com/#about' },
        ]));
    }, []);

    const teamMembers = getTeamMembers();
    const stats = getStats();
    const values = getValues();
    const timeline = getTimeline();
    const verificationSteps = getVerificationSteps();

    return html`
        <div class="about-page">
            <!-- Hero Section -->
            <section class="about-hero">
                <div class="container">
                    <h1>${t('about.heroTitle')}</h1>
                    <p class="hero-subtitle">
                        ${t('about.heroSubtitle')}
                    </p>
                </div>
            </section>

            <!-- Mission Section -->
            <section class="about-mission">
                <div class="container">
                    <div class="mission-content">
                        <div class="mission-text">
                            <h2>${t('about.mission.title')}</h2>
                            <p>${t('about.mission.text1')}</p>
                            <p>${t('about.mission.text2')}</p>
                        </div>
                        <div class="mission-image">
                            <img
                                src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=600"
                                alt=${t('about.mission.imageAlt')}
                                loading="lazy"
                            />
                        </div>
                    </div>
                </div>
            </section>

            <!-- Stats Section -->
            <section class="about-stats">
                <div class="container">
                    <h2>${t('about.stats.title')}</h2>
                    <div class="stats-grid">
                        ${stats.map(stat => html`
                            <${StatCard} key=${stat.label} ...${stat} />
                        `)}
                    </div>
                </div>
            </section>

            <!-- Values Section -->
            <section class="about-values">
                <div class="container">
                    <h2>${t('about.values.title')}</h2>
                    <p class="section-subtitle">
                        ${t('about.values.subtitle')}
                    </p>
                    <div class="values-grid">
                        ${values.map(value => html`
                            <${ValueCard} key=${value.title} ...${value} />
                        `)}
                    </div>
                </div>
            </section>

            <!-- How We Verify Coaches -->
            <section class="about-verification">
                <div class="container">
                    <h2>${t('about.verify.title')}</h2>
                    <div class="verification-steps">
                        ${verificationSteps.map(step => html`
                            <div class="verification-step" key=${step.number}>
                                <div class="step-number">${step.number}</div>
                                <h3>${step.title}</h3>
                                <p>${step.description}</p>
                            </div>
                        `)}
                    </div>
                </div>
            </section>

            <!-- Timeline Section -->
            <section class="about-timeline">
                <div class="container">
                    <h2>${t('about.timeline.title')}</h2>
                    <div class="timeline">
                        ${timeline.map((item, index) => html`
                            <${TimelineItem}
                                key=${item.year}
                                ...${item}
                                isLast=${index === timeline.length - 1}
                            />
                        `)}
                    </div>
                </div>
            </section>

            <!-- Team Section -->
            <section class="about-team">
                <div class="container">
                    <h2>${t('about.team.title')}</h2>
                    <p class="section-subtitle">
                        ${t('about.team.subtitle')}
                    </p>
                    <div class="team-grid">
                        ${teamMembers.map(member => html`
                            <${TeamMember} key=${member.name} ...${member} />
                        `)}
                    </div>
                </div>
            </section>

            <!-- Press & Recognition -->
            <section class="about-press">
                <div class="container">
                    <h2>${t('about.press.title')}</h2>
                    <div class="press-logos">
                        <div class="press-logo">Forbes</div>
                        <div class="press-logo">TechCrunch</div>
                        <div class="press-logo">HR Magazine</div>
                        <div class="press-logo">Coaching World</div>
                    </div>
                </div>
            </section>

            <!-- CTA Section -->
            <section class="about-cta">
                <div class="container">
                    <h2>${t('about.cta.title')}</h2>
                    <p>${t('about.cta.subtitle')}</p>
                    <div class="cta-buttons">
                        <a href="#coaches" class="btn btn-primary btn-lg">${t('about.join.client')}</a>
                        <a href="#become-coach" class="btn btn-secondary btn-lg">${t('about.join.coach')}</a>
                    </div>
                </div>
            </section>

            <!-- Contact Info -->
            <section class="about-contact">
                <div class="container">
                    <h2>${t('about.contact.title')}</h2>
                    <div class="contact-grid">
                        <div class="contact-item">
                            <h3>${t('about.contact.general')}</h3>
                            <p>info@coachsearching.com</p>
                        </div>
                        <div class="contact-item">
                            <h3>${t('about.contact.coaches')}</h3>
                            <p>coaches@coachsearching.com</p>
                        </div>
                        <div class="contact-item">
                            <h3>${t('about.contact.press')}</h3>
                            <p>press@coachsearching.com</p>
                        </div>
                        <div class="contact-item">
                            <h3>${t('about.contact.partnerships')}</h3>
                            <p>partners@coachsearching.com</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    `;
}

export default AboutPage;
