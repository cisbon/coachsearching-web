/**
 * Currency Selector Component
 * Dropdown to select display currency
 * Mobile-friendly: shows inline options in mobile menu
 */

import htm from '../../vendor/htm.js';

const React = window.React;
const { useState, useEffect, useRef } = React;
const html = htm.bind(React.createElement);

const CURRENCIES = [
    { code: 'EUR', symbol: '€', label: 'Euro' },
    { code: 'USD', symbol: '$', label: 'US Dollar' },
    { code: 'GBP', symbol: '£', label: 'Pound' }
];

// Currency management functions (can also be imported from utils)
function getCurrentCurrency() {
    return localStorage.getItem('currency') || 'EUR';
}

function setCurrencyValue(code) {
    localStorage.setItem('currency', code);
    window.dispatchEvent(new Event('currencyChange'));
}

export function CurrencySelector() {
    const [isOpen, setIsOpen] = useState(false);
    const [currency, setCurrencyState] = useState(getCurrentCurrency());
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

    // Listen for currency changes
    useEffect(() => {
        const handleCurrencyChange = () => {
            setCurrencyState(getCurrentCurrency());
        };
        window.addEventListener('currencyChange', handleCurrencyChange);
        return () => window.removeEventListener('currencyChange', handleCurrencyChange);
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

    const handleSelect = (code) => {
        setCurrencyValue(code);
        setIsOpen(false);
    };

    const current = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];

    // Mobile: inline expandable list
    if (isMobile) {
        return html`
            <div class="currency-selector mobile-selector" ref=${dropdownRef}>
                <button
                    class="currency-btn mobile-selector-btn"
                    onClick=${() => setIsOpen(!isOpen)}
                    aria-label="Select currency"
                    aria-expanded=${isOpen}
                >
                    <span class="selector-label">
                        <span>${current.symbol}</span>
                        <span>${current.code}</span>
                    </span>
                    <span class="selector-arrow ${isOpen ? 'open' : ''}">▼</span>
                </button>
                ${isOpen && html`
                    <div class="mobile-selector-options">
                        ${CURRENCIES.map(curr => html`
                            <div
                                key=${curr.code}
                                class="mobile-selector-option ${curr.code === currency ? 'active' : ''}"
                                onClick=${() => handleSelect(curr.code)}
                            >
                                <span>${curr.symbol}</span>
                                <span>${curr.label}</span>
                                ${curr.code === currency && html`<span class="checkmark">✓</span>`}
                            </div>
                        `)}
                    </div>
                `}
            </div>
        `;
    }

    // Desktop: traditional dropdown
    return html`
        <div class="currency-selector" ref=${dropdownRef}>
            <button
                class="currency-btn"
                onClick=${() => setIsOpen(!isOpen)}
                aria-label="Select currency"
                aria-expanded=${isOpen}
                aria-haspopup="menu"
            >
                <span>${current.symbol}</span>
                <span>${current.code}</span>
            </button>
            <div class="currency-dropdown ${isOpen ? 'show' : ''}" role="menu">
                ${CURRENCIES.map(curr => html`
                    <div
                        key=${curr.code}
                        class="currency-option ${curr.code === currency ? 'active' : ''}"
                        onClick=${() => handleSelect(curr.code)}
                        role="menuitem"
                        tabIndex="0"
                    >
                        <span>${curr.symbol}</span>
                        <span>${curr.label}</span>
                    </div>
                `)}
            </div>
        </div>
    `;
}

export default CurrencySelector;
