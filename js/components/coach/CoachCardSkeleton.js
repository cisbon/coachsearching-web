/**
 * CoachCardSkeleton Component
 * Loading placeholder for coach cards
 */

import htm from '../../vendor/htm.js';

const React = window.React;
const { memo } = React;
const html = htm.bind(React.createElement);

/**
 * CoachCardSkeleton Component - Loading state placeholder
 */
export const CoachCardSkeleton = memo(function CoachCardSkeleton() {
    return html`
        <div class="skeleton-card">
            <div class="skeleton-header">
                <div class="skeleton skeleton-avatar"></div>
                <div class="skeleton-info">
                    <div class="skeleton skeleton-title"></div>
                    <div class="skeleton skeleton-subtitle"></div>
                    <div class="skeleton skeleton-meta"></div>
                </div>
            </div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text short"></div>
            <div class="skeleton-badges">
                <div class="skeleton skeleton-badge"></div>
                <div class="skeleton skeleton-badge"></div>
                <div class="skeleton skeleton-badge"></div>
            </div>
            <div class="skeleton-footer">
                <div class="skeleton skeleton-price"></div>
                <div class="skeleton skeleton-button"></div>
            </div>
        </div>
    `;
});

export default CoachCardSkeleton;
