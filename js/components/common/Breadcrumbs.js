/**
 * Breadcrumbs Component
 * @fileoverview SEO-friendly breadcrumb navigation with structured data
 */

import htm from '../../vendor/htm.js';
import { setStructuredData, generateBreadcrumbSchema } from '../../utils/seo.js';

const React = window.React;
const { useEffect, memo } = React;
const html = htm.bind(React.createElement);

/**
 * Breadcrumb item type
 * @typedef {Object} BreadcrumbItem
 * @property {string} name - Display name
 * @property {string} [url] - Link URL (optional for current page)
 * @property {string} [icon] - Optional icon
 */

/**
 * Breadcrumbs Component
 * Renders navigation breadcrumbs with Schema.org structured data
 *
 * @param {Object} props
 * @param {BreadcrumbItem[]} props.items - Breadcrumb items
 * @param {string} [props.className] - Additional CSS class
 * @param {string} [props.separator='/'] - Separator character
 * @param {boolean} [props.showHome=true] - Whether to show home link
 * @param {string} [props.homeLabel='Home'] - Label for home link
 * @param {string} [props.homeUrl='#home'] - URL for home link
 */
function BreadcrumbsComponent({
    items = [],
    className = '',
    separator = '/',
    showHome = true,
    homeLabel = 'Home',
    homeUrl = '#home',
}) {
    // Build full breadcrumb list with home
    const fullItems = showHome
        ? [{ name: homeLabel, url: homeUrl }, ...items]
        : items;

    // Generate and inject structured data
    useEffect(() => {
        if (fullItems.length > 0) {
            const schemaItems = fullItems.map(item => ({
                name: item.name,
                url: item.url
                    ? item.url.startsWith('http')
                        ? item.url
                        : `https://coachsearching.com/${item.url.replace(/^#/, '')}`
                    : undefined,
            })).filter(item => item.url);

            if (schemaItems.length > 0) {
                setStructuredData('breadcrumb-schema', generateBreadcrumbSchema(schemaItems));
            }
        }

        return () => {
            // Cleanup handled by page components
        };
    }, [fullItems]);

    if (fullItems.length === 0) return null;

    return html`
        <nav class="breadcrumbs ${className}" aria-label="Breadcrumb">
            <ol class="breadcrumb-list" itemscope itemtype="https://schema.org/BreadcrumbList">
                ${fullItems.map((item, index) => {
                    const isLast = index === fullItems.length - 1;
                    const position = index + 1;

                    return html`
                        <li
                            key=${index}
                            class="breadcrumb-item ${isLast ? 'current' : ''}"
                            itemprop="itemListElement"
                            itemscope
                            itemtype="https://schema.org/ListItem"
                        >
                            ${!isLast && item.url ? html`
                                <a
                                    href=${item.url}
                                    itemprop="item"
                                    class="breadcrumb-link"
                                >
                                    ${item.icon && html`<span class="breadcrumb-icon">${item.icon}</span>`}
                                    <span itemprop="name">${item.name}</span>
                                </a>
                            ` : html`
                                <span itemprop="item" class="breadcrumb-current" aria-current="page">
                                    ${item.icon && html`<span class="breadcrumb-icon">${item.icon}</span>`}
                                    <span itemprop="name">${item.name}</span>
                                </span>
                            `}
                            <meta itemprop="position" content=${String(position)} />
                            ${!isLast && html`
                                <span class="breadcrumb-separator" aria-hidden="true">
                                    ${separator}
                                </span>
                            `}
                        </li>
                    `;
                })}
            </ol>
        </nav>
    `;
}

/**
 * Coach Profile Breadcrumbs
 * Specialized breadcrumbs for coach profile pages
 */
export function CoachBreadcrumbs({ coach, specialty }) {
    const items = [
        { name: 'Coaches', url: '#coaches' },
    ];

    if (specialty) {
        items.push({ name: specialty, url: `#coaches?specialty=${encodeURIComponent(specialty)}` });
    }

    if (coach) {
        items.push({ name: coach.full_name });
    }

    return html`<${Breadcrumbs} items=${items} />`;
}

/**
 * Category Breadcrumbs
 * Specialized breadcrumbs for category pages
 */
export function CategoryBreadcrumbs({ categoryName, categorySlug }) {
    const items = [
        { name: 'Categories', url: '#categories' },
        { name: categoryName },
    ];

    return html`<${Breadcrumbs} items=${items} />`;
}

/**
 * Simple page breadcrumbs
 */
export function PageBreadcrumbs({ pageName }) {
    return html`<${Breadcrumbs} items=${[{ name: pageName }]} />`;
}

export const Breadcrumbs = memo(BreadcrumbsComponent);
export default Breadcrumbs;
