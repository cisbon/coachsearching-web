/**
 * Language Selector Component
 * Dropdown to select display language with flag icons
 * Mobile-friendly: shows inline options in mobile menu
 */

import htm from '../../vendor/htm.js';
import { setLanguage, getCurrentLang } from '../../i18n.js';

const React = window.React;
const { useState, useEffect, useRef } = React;
const html = htm.bind(React.createElement);

const LANGUAGES = [
    { code: 'en', flagCode: 'gb', label: 'English' },
    { code: 'de', flagCode: 'de', label: 'Deutsch' },
    { code: 'es', flagCode: 'es', label: 'Español' },
    { code: 'fr', flagCode: 'fr', label: 'Français' },
    { code: 'it', flagCode: 'it', label: 'Italiano' }
];

const FLAG_CDN = 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3';

export function LanguageSelector() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentLang, setCurrentLang] = useState(getCurrentLang());
    const [isMobile, setIsMobile] = useState(false);
    const dropdownRef = useRef(null);

    // Detect mobile viewport
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 1190);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Listen for language changes from elsewhere
    useEffect(() => {
        const handleLangChange = () => {
            setCurrentLang(getCurrentLang());
        };
        window.addEventListener('langChange', handleLangChange);
        return () => window.removeEventListener('langChange', handleLangChange);
    }, []);

    // Close dropdown when clicking outside (desktop only)
    useEffect(() => {
        if (isMobile) return; // Don't use click-outside on mobile

        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMobile]);

    const handleSelect = (langCode) => {
        setLanguage(langCode);
        setCurrentLang(langCode);
        setIsOpen(false);
    };

    const current = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0];

    // Mobile: inline expandable list
    if (isMobile) {
        return html`
            <div class="lang-selector mobile-selector" ref=${dropdownRef}>
                <button
                    class="lang-btn mobile-selector-btn"
                    onClick=${() => setIsOpen(!isOpen)}
                    aria-label="Select language"
                    aria-expanded=${isOpen}
                >
                    <span class="selector-label">
                        <img
                            src="${FLAG_CDN}/${current.flagCode}.svg"
                            alt=${current.label}
                            class="flag-icon"
                            loading="lazy"
                        />
                        <span>${current.code.toUpperCase()}</span>
                    </span>
                    <span class="selector-arrow ${isOpen ? 'open' : ''}">▼</span>
                </button>
                ${isOpen && html`
                    <div class="mobile-selector-options">
                        ${LANGUAGES.map(lang => html`
                            <div
                                key=${lang.code}
                                class="mobile-selector-option ${lang.code === currentLang ? 'active' : ''}"
                                onClick=${() => handleSelect(lang.code)}
                            >
                                <img
                                    src="${FLAG_CDN}/${lang.flagCode}.svg"
                                    alt=${lang.label}
                                    class="flag-icon"
                                    loading="lazy"
                                />
                                <span>${lang.label}</span>
                                ${lang.code === currentLang && html`<span class="checkmark">✓</span>`}
                            </div>
                        `)}
                    </div>
                `}
            </div>
        `;
    }

    // Desktop: traditional dropdown
    return html`
        <div class="lang-selector" ref=${dropdownRef}>
            <button
                class="lang-btn"
                onClick=${() => setIsOpen(!isOpen)}
                aria-label="Select language"
                aria-expanded=${isOpen}
                aria-haspopup="menu"
            >
                <img
                    src="${FLAG_CDN}/${current.flagCode}.svg"
                    alt=${current.label}
                    class="flag-icon"
                    loading="lazy"
                />
                <span>${current.code.toUpperCase()}</span>
            </button>
            <div class="lang-dropdown ${isOpen ? 'show' : ''}" role="menu">
                ${LANGUAGES.map(lang => html`
                    <div
                        key=${lang.code}
                        class="lang-option ${lang.code === currentLang ? 'active' : ''}"
                        onClick=${() => handleSelect(lang.code)}
                        role="menuitem"
                        tabIndex="0"
                    >
                        <img
                            src="${FLAG_CDN}/${lang.flagCode}.svg"
                            alt=${lang.label}
                            class="flag-icon"
                            loading="lazy"
                        />
                        <span>${lang.label}</span>
                    </div>
                `)}
            </div>
        </div>
    `;
}

export default LanguageSelector;
