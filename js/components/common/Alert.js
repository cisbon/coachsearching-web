/**
 * Alert Component
 * Display messages, notifications, and alerts
 */

import htm from '../../vendor/htm.js';

const React = window.React;
const { useState } = React;
const html = htm.bind(React.createElement);

/**
 * Alert Component
 * @param {Object} props
 * @param {string} [props.type='info'] - Alert type (info, success, warning, error)
 * @param {string} props.message - Alert message
 * @param {boolean} [props.dismissible=false] - Can be dismissed
 * @param {function} [props.onDismiss] - Dismiss handler
 * @param {React.ReactNode} [props.children] - Additional content
 */
export function Alert({
    type = 'info',
    message,
    dismissible = false,
    onDismiss,
    children,
    className = ''
}) {
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    const icons = {
        info: 'ℹ️',
        success: '✓',
        warning: '⚠️',
        error: '✕'
    };

    const handleDismiss = () => {
        setDismissed(true);
        if (onDismiss) onDismiss();
    };

    return html`
        <div class="alert alert-${type} ${className}" role="alert">
            <span class="alert-icon">${icons[type]}</span>
            <div class="alert-content">
                ${message && html`<p class="alert-message">${message}</p>`}
                ${children}
            </div>
            ${dismissible && html`
                <button
                    type="button"
                    class="alert-dismiss"
                    onClick=${handleDismiss}
                    aria-label="Dismiss"
                >
                    ×
                </button>
            `}
        </div>
    `;
}

/**
 * Email Verification Banner
 */
export function EmailVerificationBanner({ user }) {
    const [dismissed, setDismissed] = useState(false);

    if (!user || user.email_confirmed_at || dismissed) return null;

    return html`
        <${Alert}
            type="warning"
            message="Please verify your email address to access all features."
            dismissible
            onDismiss=${() => setDismissed(true)}
        >
            <a href="#" class="alert-link" onClick=${(e) => { e.preventDefault(); /* resend verification */ }}>
                Resend verification email
            </a>
        </${Alert}>
    `;
}

export default Alert;
