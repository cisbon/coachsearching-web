/**
 * LanguageFlags Component
 * Displays language flags for a coach's spoken languages
 */

import htm from '../../vendor/htm.js';

const React = window.React;
const html = htm.bind(React.createElement);

// Language to Country Code Mapping (for flag images)
const LANGUAGE_TO_COUNTRY = {
    'English': 'gb', 'German': 'de', 'Spanish': 'es', 'French': 'fr',
    'Italian': 'it', 'Dutch': 'nl', 'Portuguese': 'pt', 'Russian': 'ru',
    'Chinese': 'cn', 'Japanese': 'jp', 'Korean': 'kr', 'Arabic': 'sa',
    'Hindi': 'in', 'Polish': 'pl', 'Swedish': 'se', 'Norwegian': 'no',
    'Danish': 'dk', 'Finnish': 'fi', 'Greek': 'gr', 'Turkish': 'tr',
    'Czech': 'cz', 'Romanian': 'ro', 'Hungarian': 'hu', 'Ukrainian': 'ua',
    'en': 'gb', 'de': 'de', 'es': 'es', 'fr': 'fr', 'it': 'it',
    'nl': 'nl', 'pt': 'pt', 'ru': 'ru', 'zh': 'cn', 'ja': 'jp',
    'ko': 'kr', 'ar': 'sa', 'hi': 'in', 'pl': 'pl', 'sv': 'se',
    'no': 'no', 'da': 'dk', 'fi': 'fi', 'el': 'gr', 'tr': 'tr',
    'cs': 'cz', 'ro': 'ro', 'hu': 'hu', 'uk': 'ua'
};

// Language code to name mapping for tooltips
const LANGUAGE_NAMES = {
    'en': 'English', 'de': 'German', 'es': 'Spanish', 'fr': 'French',
    'it': 'Italian', 'nl': 'Dutch', 'pt': 'Portuguese', 'ru': 'Russian',
    'zh': 'Chinese', 'ja': 'Japanese', 'ko': 'Korean', 'ar': 'Arabic',
    'hi': 'Hindi', 'pl': 'Polish', 'sv': 'Swedish', 'no': 'Norwegian',
    'da': 'Danish', 'fi': 'Finnish', 'el': 'Greek', 'tr': 'Turkish',
    'cs': 'Czech', 'ro': 'Romanian', 'hu': 'Hungarian', 'uk': 'Ukrainian'
};

/**
 * LanguageFlags Component
 * @param {Object} props
 * @param {string[]} props.languages - Array of language codes or names
 * @param {number} [props.maxDisplay=5] - Maximum flags to display before showing "+X"
 */
export function LanguageFlags({ languages, maxDisplay = 5 }) {
    if (!languages || languages.length === 0) return null;

    // Handle if languages is a string instead of array
    const langArray = Array.isArray(languages) ? languages : [languages];
    if (langArray.length === 0) return null;

    const getTooltip = (lang) => LANGUAGE_NAMES[lang] || lang;
    const getCountryCode = (lang) => LANGUAGE_TO_COUNTRY[lang] || null;

    return html`
        <div class="language-flags" title="${langArray.map(getTooltip).join(', ')}">
            ${langArray.slice(0, maxDisplay).map(lang => {
                const countryCode = getCountryCode(lang);
                return countryCode ? html`
                    <img
                        key=${lang}
                        class="flag-img"
                        src="https://flagcdn.com/24x18/${countryCode}.png"
                        srcset="https://flagcdn.com/48x36/${countryCode}.png 2x"
                        alt=${getTooltip(lang)}
                        title=${getTooltip(lang)}
                        width="24"
                        height="18"
                    />
                ` : html`<span key=${lang} class="flag-icon" title=${getTooltip(lang)}>🌐</span>`;
            })}
            ${langArray.length > maxDisplay ? html`<span class="more-langs">+${langArray.length - maxDisplay}</span>` : ''}
        </div>
    `;
}

export default LanguageFlags;
