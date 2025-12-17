/**
 * Footer Component
 * Site footer with navigation links, legal information, and branding
 */

import htm from '../../vendor/htm.js';
import { t } from '../../i18n.js';

const React = window.React;
const html = htm.bind(React.createElement);

/**
 * Footer Component
 * @param {Object} props
 * @param {function} props.onOpenLegal - Handler for opening legal modals
 */
export function Footer({ onOpenLegal }) {
    return html`
        <footer class="site-footer">
            <div class="container">
                <div class="footer-grid">
                    <!-- Brand Column -->
                    <div class="footer-brand">
                        <div class="logo" style=${{ fontSize: '1.4rem', marginBottom: '12px' }}>coach<span>searching</span>.com</div>
                        <p style=${{ color: '#9ca3af', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '16px' }}>
                            ${t('footer.tagline') || 'Find your perfect coach and start your transformation journey today.'}
                        </p>
                        <div style=${{ color: '#6b7280', fontSize: '0.85rem' }}>${t('footer.copyright')}</div>
                        <div style=${{ color: '#4b5563', fontSize: '0.75rem', marginTop: '8px' }}>v1.16.0</div>
                    </div>

                    <!-- Coaching Types Column -->
                    <div class="footer-column">
                        <h4>${t('footer.coachingTypes') || 'Coaching Types'}</h4>
                        <ul>
                            <li><a href="/coaching/executive-coaching">${t('category.executive.title')}</a></li>
                            <li><a href="/coaching/life-coaching">${t('category.life.title')}</a></li>
                            <li><a href="/coaching/career-coaching">${t('category.career.title')}</a></li>
                            <li><a href="/coaching/business-coaching">${t('category.business.title')}</a></li>
                            <li><a href="/categories">${t('category.browseAll')}</a></li>
                        </ul>
                    </div>

                    <!-- More Coaching Column -->
                    <div class="footer-column">
                        <h4>${t('footer.moreCoaching') || 'More Coaching'}</h4>
                        <ul>
                            <li><a href="/coaching/leadership">${t('category.leadership.title')}</a></li>
                            <li><a href="/coaching/health-wellness">${t('category.health.title')}</a></li>
                            <li><a href="/coaching/mindfulness">${t('category.mindfulness.title')}</a></li>
                            <li><a href="/coaching/relationship-coaching">${t('category.relationship.title')}</a></li>
                        </ul>
                    </div>

                    <!-- Info Column -->
                    <div class="footer-column">
                        <h4>${t('footer.info') || 'Info'}</h4>
                        <ul>
                            <li><a href="/faq">${t('footer.faq') || 'FAQ'}</a></li>
                            <li><a href="/coaches">${t('nav.coaches') || 'Find a Coach'}</a></li>
                            <li><a href="/quiz">${t('category.takeQuiz') || 'Take the Quiz'}</a></li>
                            <li><a href="/pricing">${t('nav.pricing') || 'Pricing'}</a></li>
                        </ul>
                    </div>

                    <!-- Legal Column -->
                    <div class="footer-column">
                        <h4>${t('footer.legal') || 'Legal'}</h4>
                        <ul>
                            <li><a href="#" onClick=${(e) => { e.preventDefault(); onOpenLegal('imprint'); }}>${t('footer.imprint') || 'Imprint'}</a></li>
                            <li><a href="#" onClick=${(e) => { e.preventDefault(); onOpenLegal('privacy'); }}>${t('footer.privacy') || 'Privacy Policy'}</a></li>
                            <li><a href="#" onClick=${(e) => { e.preventDefault(); onOpenLegal('terms'); }}>${t('footer.terms') || 'Terms of Service'}</a></li>
                        </ul>
                    </div>
                </div>
            </div>
        </footer>
    `;
}

export default Footer;
