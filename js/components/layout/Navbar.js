/**
 * Navbar Component
 * Responsive navigation bar with mobile menu support
 */

import htm from '../../vendor/htm.js';
import { t } from '../../i18n.js';
import { CurrencySelector } from '../ui/CurrencySelector.js';
import { LanguageSelector } from '../ui/LanguageSelector.js';

const React = window.React;
const { useState, useEffect } = React;
const html = htm.bind(React.createElement);

/**
 * Navbar Component
 * @param {Object} props
 * @param {Object|null} props.session - Current user session
 */
export function Navbar({ session }) {
    const [menuOpen, setMenuOpen] = useState(false);

    const handleLinkClick = (e, path) => {
        e.preventDefault();
        setMenuOpen(false);
        if (window.navigateTo) {
            window.navigateTo(path);
        } else {
            window.location.hash = path.replace('/', '#');
        }
    };

    // Inject responsive navbar CSS
    useEffect(() => {
        const existingStyle = document.getElementById('responsive-navbar-css');
        if (existingStyle) existingStyle.remove();

        const style = document.createElement('style');
        style.id = 'responsive-navbar-css';
        style.textContent = `
            /* Desktop navbar - 10px consistent spacing, petrol background matching hero */
            header[role="banner"] { background: #006266; position: sticky; top: 0; z-index: 1000; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            header[role="banner"] .nav-flex { display: flex; justify-content: space-between; align-items: center; height: 60px; padding: 0 20px; }
            header[role="banner"] .nav-links { display: flex; align-items: center; gap: 10px; }
            header[role="banner"] .nav-links > * { margin: 0; }
            header[role="banner"] .logo { color: white !important; }
            header[role="banner"] .logo span { color: #a7d5d2 !important; }
            header[role="banner"] .nav-browse-link { color: white !important; text-decoration: none; }
            header[role="banner"] .nav-auth-btn { background: white !important; color: #006266 !important; border: none !important; padding: 8px 16px !important; border-radius: 6px !important; font-weight: 500 !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; text-decoration: none !important; line-height: 1 !important; }
            header[role="banner"] .nav-auth-btn:hover { background: #f0f0f0 !important; }
            .nav-browse-link { color: white !important; font-weight: 500; text-decoration: none; padding: 8px 14px; border-radius: 6px; transition: background 0.2s; white-space: nowrap; }
            .nav-browse-link:hover { background: rgba(255,255,255,0.15); }

            /* Hamburger button - hidden on desktop */
            .hamburger-btn {
                display: none;
                background: none;
                border: none;
                cursor: pointer;
                padding: 10px;
                flex-direction: column;
                justify-content: center;
                gap: 5px;
                z-index: 1001;
            }
            .hamburger-btn span {
                display: block;
                width: 24px;
                height: 3px;
                background: white;
                border-radius: 2px;
                transition: all 0.3s ease;
            }
            .hamburger-btn.open span:nth-child(1) { transform: rotate(45deg) translate(6px, 6px); }
            .hamburger-btn.open span:nth-child(2) { opacity: 0; }
            .hamburger-btn.open span:nth-child(3) { transform: rotate(-45deg) translate(6px, -6px); }

            /* Mobile styles */
            @media (max-width: 768px) {
                .hamburger-btn { display: flex !important; }

                header[role="banner"] .nav-links {
                    position: fixed;
                    top: 60px;
                    left: 0;
                    right: 0;
                    background: #006266;
                    flex-direction: column;
                    padding: 16px 20px;
                    gap: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    max-height: 0;
                    overflow: hidden;
                    opacity: 0;
                    transition: all 0.3s ease;
                    z-index: 999;
                }

                header[role="banner"] .nav-links.open {
                    max-height: 400px;
                    opacity: 1;
                    padding: 16px 20px;
                }

                header[role="banner"] .nav-links > a,
                header[role="banner"] .nav-links > .nav-auth-btn {
                    display: block;
                    width: 100%;
                    text-align: center;
                    padding: 14px 16px;
                    border-radius: 8px;
                    box-sizing: border-box;
                }

                .nav-browse-link { background: rgba(255,255,255,0.1) !important; color: white !important; }
                .nav-register-btn { background: white !important; color: #006266 !important; }
                .nav-signin-btn { background: rgba(255,255,255,0.2) !important; color: white !important; }

                header[role="banner"] .nav-links .currency-selector,
                header[role="banner"] .nav-links .lang-selector {
                    width: 100%;
                    justify-content: center;
                    margin-top: 8px;
                }
            }
        `;
        document.head.appendChild(style);
    }, []);

    return html`
        <header role="banner">
            <div class="container nav-flex">
                <a href="/" class="logo" onClick=${(e) => { e.preventDefault(); handleLinkClick(e, '/home'); }}>coach<span>searching</span>.com</a>

                <button class="hamburger-btn ${menuOpen ? 'open' : ''}" onClick=${() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>

                <nav class="nav-links ${menuOpen ? 'open' : ''}" role="navigation">
                    <a href="/coaches" class="nav-browse-link" onClick=${(e) => handleLinkClick(e, '/coaches')}>${t('nav.browseCoaches')}</a>
                    ${session ? html`
                        <a href="/dashboard" onClick=${(e) => handleLinkClick(e, '/dashboard')}>${t('nav.dashboard')}</a>
                        <a href="/signout" class="nav-auth-btn" onClick=${(e) => handleLinkClick(e, '/signout')}>${t('nav.signOut')}</a>
                    ` : html`
                        <a href="/login?mode=register" class="nav-auth-btn nav-register-btn" onClick=${(e) => handleLinkClick(e, '/login?mode=register')}>${t('nav.register')}</a>
                        <a href="/login" class="nav-auth-btn nav-signin-btn" onClick=${(e) => handleLinkClick(e, '/login')}>${t('nav.signIn')}</a>
                    `}
                    <${CurrencySelector} />
                    <${LanguageSelector} />
                </nav>
            </div>
        </header>
    `;
}

export default Navbar;
