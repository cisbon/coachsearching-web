/**
 * Currency Selector Component
 * Dropdown to select display currency
 */

import htm from '../../vendor/htm.js';
import { useCurrency } from '../../context/index.js';

const React = window.React;
const { useState, useEffect, useRef } = React;
const html = htm.bind(React.createElement);

const CURRENCIES = [
    { code: 'EUR', symbol: '€', label: 'Euro' },
    { code: 'USD', symbol: '$', label: 'US Dollar' },
    { code: 'GBP', symbol: '£', label: 'Pound' },
    { code: 'CHF', symbol: 'CHF', label: 'Swiss Franc' }
];

export function CurrencySelector() {
    const { currency, setCurrency } = useCurrency();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

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

    const handleSelect = (code) => {
        setCurrency(code);
        setIsOpen(false);
    };

    const current = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];

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
