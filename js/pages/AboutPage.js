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
// Team Data
// ============================================================================

const TEAM_MEMBERS = [
    {
        name: 'Michael Gross',
        role: 'Founder & CEO',
        image: 'https://i.pravatar.cc/200?img=11',
        bio: 'Former executive coach with 15+ years experience helping leaders unlock their potential.',
        linkedin: '#',
    },
    {
        name: 'Sarah Miller',
        role: 'Head of Coach Relations',
        image: 'https://i.pravatar.cc/200?img=5',
        bio: 'Certified ICF coach passionate about connecting clients with the right coaches.',
        linkedin: '#',
    },
    {
        name: 'Thomas Weber',
        role: 'Head of Technology',
        image: 'https://i.pravatar.cc/200?img=12',
        bio: 'Tech entrepreneur focused on building platforms that create meaningful connections.',
        linkedin: '#',
    },
];

// ============================================================================
// Stats Data
// ============================================================================

const STATS = [
    { value: '500+', label: 'Verified Coaches' },
    { value: '10,000+', label: 'Sessions Completed' },
    { value: '50+', label: 'Specialties' },
    { value: '25+', label: 'Countries' },
    { value: '4.9', label: 'Average Rating' },
    { value: '98%', label: 'Client Satisfaction' },
];

// ============================================================================
// Values Data
// ============================================================================

const VALUES = [
    {
        icon: '✓',
        title: 'Quality First',
        description: 'Every coach on our platform is thoroughly vetted for credentials, experience, and professionalism.',
    },
    {
        icon: '🤝',
        title: 'Perfect Matches',
        description: 'Our AI-powered matching system helps you find coaches who truly understand your goals and challenges.',
    },
    {
        icon: '🔒',
        title: 'Trust & Safety',
        description: 'Your privacy and security are paramount. We use enterprise-grade protection for all data.',
    },
    {
        icon: '🌍',
        title: 'Global Access',
        description: 'Connect with coaches worldwide. Online sessions break down geographical barriers.',
    },
    {
        icon: '💬',
        title: 'Transparent Pricing',
        description: 'No hidden fees. See exactly what you\'ll pay before booking any session.',
    },
    {
        icon: '⭐',
        title: 'Verified Reviews',
        description: 'Real reviews from real clients help you make informed decisions about your coach.',
    },
];

// ============================================================================
// Timeline Data
// ============================================================================

const TIMELINE = [
    {
        year: '2023',
        title: 'The Vision',
        description: 'CoachSearching was born from a simple idea: make quality coaching accessible to everyone.',
    },
    {
        year: '2024 Q1',
        title: 'Platform Launch',
        description: 'We launched with 100 verified coaches across 10 countries.',
    },
    {
        year: '2024 Q2',
        title: 'AI Matching',
        description: 'Introduced our AI-powered coach matching quiz for personalized recommendations.',
    },
    {
        year: '2024 Q3',
        title: 'Global Expansion',
        description: 'Expanded to 25+ countries with multi-language support.',
    },
    {
        year: 'Today',
        title: 'Growing Community',
        description: '500+ coaches helping thousands of clients achieve their goals.',
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
            title: 'About CoachSearching',
            description: 'Learn about CoachSearching, the professional coaching platform connecting clients with verified coaches worldwide. Our mission, values, and the team behind the platform.',
            url: 'https://coachsearching.com/#about',
        });

        // Organization schema
        setStructuredData('organization-schema', generateOrganizationSchema());

        // Breadcrumb schema
        setStructuredData('breadcrumb-schema', generateBreadcrumbSchema([
            { name: 'Home', url: 'https://coachsearching.com' },
            { name: 'About', url: 'https://coachsearching.com/#about' },
        ]));
    }, []);

    return html`
        <div class="about-page">
            <!-- Hero Section -->
            <section class="about-hero">
                <div class="container">
                    <h1>Connecting You With the Perfect Coach</h1>
                    <p class="hero-subtitle">
                        CoachSearching is the trusted platform for finding verified professional coaches
                        who can help you achieve your personal and professional goals.
                    </p>
                </div>
            </section>

            <!-- Mission Section -->
            <section class="about-mission">
                <div class="container">
                    <div class="mission-content">
                        <div class="mission-text">
                            <h2>Our Mission</h2>
                            <p>
                                We believe that everyone deserves access to quality coaching.
                                Our mission is to democratize professional development by connecting
                                individuals with verified, experienced coaches who can guide them
                                toward their goals.
                            </p>
                            <p>
                                Whether you're an executive seeking leadership guidance, a professional
                                navigating a career change, or someone looking to improve their personal
                                life, we're here to help you find the right coach for your journey.
                            </p>
                        </div>
                        <div class="mission-image">
                            <img
                                src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=600"
                                alt="Coaching session"
                                loading="lazy"
                            />
                        </div>
                    </div>
                </div>
            </section>

            <!-- Stats Section -->
            <section class="about-stats">
                <div class="container">
                    <h2>CoachSearching by the Numbers</h2>
                    <div class="stats-grid">
                        ${STATS.map(stat => html`
                            <${StatCard} key=${stat.label} ...${stat} />
                        `)}
                    </div>
                </div>
            </section>

            <!-- Values Section -->
            <section class="about-values">
                <div class="container">
                    <h2>Our Values</h2>
                    <p class="section-subtitle">
                        These core principles guide everything we do at CoachSearching.
                    </p>
                    <div class="values-grid">
                        ${VALUES.map(value => html`
                            <${ValueCard} key=${value.title} ...${value} />
                        `)}
                    </div>
                </div>
            </section>

            <!-- How We Verify Coaches -->
            <section class="about-verification">
                <div class="container">
                    <h2>How We Verify Coaches</h2>
                    <div class="verification-steps">
                        <div class="verification-step">
                            <div class="step-number">1</div>
                            <h3>Application Review</h3>
                            <p>Coaches submit detailed applications with their qualifications, experience, and coaching philosophy.</p>
                        </div>
                        <div class="verification-step">
                            <div class="step-number">2</div>
                            <h3>Credential Verification</h3>
                            <p>We verify all certifications, degrees, and professional credentials claimed by each coach.</p>
                        </div>
                        <div class="verification-step">
                            <div class="step-number">3</div>
                            <h3>Background Check</h3>
                            <p>All coaches undergo identity verification and professional background screening.</p>
                        </div>
                        <div class="verification-step">
                            <div class="step-number">4</div>
                            <h3>Ongoing Monitoring</h3>
                            <p>We continuously monitor reviews and feedback to ensure quality standards are maintained.</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Timeline Section -->
            <section class="about-timeline">
                <div class="container">
                    <h2>Our Journey</h2>
                    <div class="timeline">
                        ${TIMELINE.map((item, index) => html`
                            <${TimelineItem}
                                key=${item.year}
                                ...${item}
                                isLast=${index === TIMELINE.length - 1}
                            />
                        `)}
                    </div>
                </div>
            </section>

            <!-- Team Section -->
            <section class="about-team">
                <div class="container">
                    <h2>Meet the Team</h2>
                    <p class="section-subtitle">
                        The passionate people behind CoachSearching.
                    </p>
                    <div class="team-grid">
                        ${TEAM_MEMBERS.map(member => html`
                            <${TeamMember} key=${member.name} ...${member} />
                        `)}
                    </div>
                </div>
            </section>

            <!-- Press & Recognition -->
            <section class="about-press">
                <div class="container">
                    <h2>As Featured In</h2>
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
                    <h2>Ready to Start Your Journey?</h2>
                    <p>Join thousands of clients who have found their perfect coach through CoachSearching.</p>
                    <div class="cta-buttons">
                        <a href="#coaches" class="btn btn-primary btn-lg">Find a Coach</a>
                        <a href="#become-coach" class="btn btn-secondary btn-lg">Become a Coach</a>
                    </div>
                </div>
            </section>

            <!-- Contact Info -->
            <section class="about-contact">
                <div class="container">
                    <h2>Get in Touch</h2>
                    <div class="contact-grid">
                        <div class="contact-item">
                            <h3>General Inquiries</h3>
                            <p>info@coachsearching.com</p>
                        </div>
                        <div class="contact-item">
                            <h3>Coach Support</h3>
                            <p>coaches@coachsearching.com</p>
                        </div>
                        <div class="contact-item">
                            <h3>Press</h3>
                            <p>press@coachsearching.com</p>
                        </div>
                        <div class="contact-item">
                            <h3>Partnerships</h3>
                            <p>partners@coachsearching.com</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    `;
}

export default AboutPage;
