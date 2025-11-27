/**
 * Loading Components
 * Various loading indicators and skeletons
 */

import htm from '../../vendor/htm.js';

const React = window.React;
const html = htm.bind(React.createElement);

/**
 * Spinner Component
 */
export function Spinner({ size = 'medium', color = 'primary' }) {
    const sizes = {
        small: '16px',
        medium: '32px',
        large: '48px'
    };

    const colors = {
        primary: 'var(--primary-petrol)',
        secondary: 'var(--text-muted)',
        white: '#ffffff'
    };

    return html`
        <div
            class="spinner"
            style=${{
                width: sizes[size],
                height: sizes[size],
                border: `3px solid ${colors[color]}20`,
                borderTopColor: colors[color],
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
            }}
        ></div>
    `;
}

/**
 * Full Page Loading Component
 */
export function PageLoading({ message = 'Loading...' }) {
    return html`
        <div class="page-loading">
            <${Spinner} size="large" />
            <p style=${{ marginTop: '16px', color: 'var(--text-muted)' }}>${message}</p>
        </div>
    `;
}

/**
 * Skeleton Loading Component
 */
export function Skeleton({ width = '100%', height = '20px', borderRadius = '4px' }) {
    return html`
        <div
            class="skeleton"
            style=${{
                width,
                height,
                borderRadius,
                background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite'
            }}
        ></div>
    `;
}

/**
 * Card Skeleton for coach cards
 */
export function CardSkeleton() {
    return html`
        <div class="card-skeleton" style=${{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            <${Skeleton} height="150px" borderRadius="8px" />
            <div style=${{ marginTop: '12px' }}>
                <${Skeleton} width="60%" height="24px" />
            </div>
            <div style=${{ marginTop: '8px' }}>
                <${Skeleton} width="80%" height="16px" />
            </div>
            <div style=${{ marginTop: '8px' }}>
                <${Skeleton} width="40%" height="16px" />
            </div>
        </div>
    `;
}

export default { Spinner, PageLoading, Skeleton, CardSkeleton };
