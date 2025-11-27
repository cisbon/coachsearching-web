/**
 * Footer Component
 * Site footer with legal links
 */

import htm from '../../vendor/htm.js';

const React = window.React;
const html = htm.bind(React.createElement);

/**
 * Footer Component
 * @param {Object} props
 * @param {function} props.onOpenLegal - Handler for opening legal modals
 */
export function Footer({ onOpenLegal }) {
    const handleLegalClick = (e, type) => {
        e.preventDefault();
        if (onOpenLegal) {
            onOpenLegal(type);
        }
    };

    return html`
        <footer>
            <div class="container footer-content">
                <div>
                    <div class="logo" style=${{ fontSize: '1.2rem' }}>
                        coach<span>searching</span>.com
                    </div>
                    <div style=${{ color: '#888', fontSize: '0.85rem', marginTop: '8px' }}>
                        © 2025 coachsearching.com
                    </div>
                </div>
                <div class="footer-links">
                    <a
                        href="#"
                        class="footer-link"
                        onClick=${(e) => handleLegalClick(e, 'imprint')}
                        role="button"
                    >
                        Imprint
                    </a>
                    <a
                        href="#"
                        class="footer-link"
                        onClick=${(e) => handleLegalClick(e, 'privacy')}
                        role="button"
                    >
                        Privacy
                    </a>
                    <a
                        href="#"
                        class="footer-link"
                        onClick=${(e) => handleLegalClick(e, 'terms')}
                        role="button"
                    >
                        Terms
                    </a>
                </div>
            </div>
        </footer>
    `;
}

export default Footer;
