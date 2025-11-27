/**
 * Language Selector Component
 * Dropdown to select display language with flag icons
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
    const dropdownRef = useRef(null);

    // Listen for language changes from elsewhere
    useEffect(() => {
        const handleLangChange = () => {
            setCurrentLang(getCurrentLang());
        };
        window.addEventListener('langChange', handleLangChange);
        return () => window.removeEventListener('langChange', handleLangChange);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (langCode) => {
        setLanguage(langCode);
        setCurrentLang(langCode);
        setIsOpen(false);
    };

    const current = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0];

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
