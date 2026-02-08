/**
 * AuthModal Component
 * Modal wrapper for Auth component, used when auth is needed in a flow
 */

import htm from '../../vendor/htm.js';
import { t } from '../../i18n.js';
import { Auth } from './Auth.js';

const React = window.React;
const { useEffect } = React;
const html = htm.bind(React.createElement);

/**
 * AuthModal Component
 * @param {Object} props
 * @param {function} props.onClose - Close handler
 * @param {function} props.onSuccess - Success callback after auth
 * @param {string} [props.title] - Optional custom title
 * @param {string} [props.subtitle] - Optional subtitle text
 */
export function AuthModal({ onClose, onSuccess, title, subtitle }) {
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    const handleBackdropClick = (e) => {
        if (e.target.classList.contains('auth-modal-overlay')) {
            onClose();
        }
    };

    return html`
        <div class="auth-modal-overlay" onClick=${handleBackdropClick}>
            <div class="auth-modal-container">
                <div class="auth-modal-header">
                    <div class="auth-modal-title-section">
                        <h3>${title || t('auth.modalTitle') || 'Sign in to continue'}</h3>
                        ${subtitle && html`<p class="auth-modal-subtitle">${subtitle}</p>`}
                    </div>
                    <button class="auth-modal-close" onClick=${onClose}>✕</button>
                </div>
                <div class="auth-modal-content">
                    <${Auth}
                        onSuccess=${onSuccess}
                        skipNavigation=${true}
                    />
                </div>
            </div>
        </div>
    `;
}

export default AuthModal;
