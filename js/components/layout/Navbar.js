/**
 * Navbar Component
 * Main navigation header for the application
 */

import htm from '../../vendor/htm.js';
import { useAuth } from '../../context/index.js';
import { t } from '../../i18n.js';
import { CurrencySelector } from '../ui/CurrencySelector.js';
import { LanguageSelector } from '../ui/LanguageSelector.js';

const React = window.React;
const { useState, useCallback } = React;
const html = htm.bind(React.createElement);

export function Navbar() {
    const { session, signOut } = useAuth();
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleNavClick = useCallback((hash) => {
        window.location.hash = hash;
        setMobileMenuOpen(false);
    }, []);

    const handleSignOut = useCallback(async () => {
        await signOut();
        window.location.hash = '#home';
    }, [signOut]);

    return html`
        <header role="banner">
            <div class="container nav-flex">
                <a
                    href="#"
                    class="logo"
                    onClick=${(e) => { e.preventDefault(); handleNavClick('#home'); }}
                >
                    coach<span>searching</span>.com
                </a>

                <!-- Mobile menu button -->
                <button
                    class="mobile-menu-btn ${isMobileMenuOpen ? 'open' : ''}"
                    onClick=${() => setMobileMenuOpen(!isMobileMenuOpen)}
                    aria-label="Toggle menu"
                    aria-expanded=${isMobileMenuOpen}
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>

                <nav class="nav-links ${isMobileMenuOpen ? 'open' : ''}" role="navigation">
                    <a href="#home" onClick=${() => setMobileMenuOpen(false)}>
                        ${t('nav.home')}
                    </a>
                    <a href="#coaches" onClick=${() => setMobileMenuOpen(false)}>
                        ${t('nav.coaches')}
                    </a>
                    ${session ? html`
                        <a href="#dashboard" onClick=${() => setMobileMenuOpen(false)}>
                            ${t('nav.dashboard')}
                        </a>
                        <a
                            href="#"
                            class="nav-auth-btn"
                            onClick=${(e) => { e.preventDefault(); handleSignOut(); }}
                        >
                            ${t('nav.signOut')}
                        </a>
                    ` : html`
                        <a
                            href="#coaches"
                            class="nav-browse-coaches"
                            onClick=${() => setMobileMenuOpen(false)}
                        >
                            ${t('nav.browseCoaches')}
                        </a>
                        <a
                            href="#login?mode=register"
                            class="nav-auth-btn nav-register-btn"
                            onClick=${() => setMobileMenuOpen(false)}
                        >
                            ${t('nav.register')}
                        </a>
                        <a
                            href="#login"
                            class="nav-auth-btn nav-signin-btn"
                            onClick=${() => setMobileMenuOpen(false)}
                        >
                            ${t('nav.signIn')}
                        </a>
                    `}
                    <${CurrencySelector} />
                    <${LanguageSelector} />
                </nav>
            </div>
        </header>
    `;
}

export default Navbar;
