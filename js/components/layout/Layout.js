/**
 * Layout Component
 * Main layout wrapper with Navbar, Footer, and legal modal
 */

import htm from '../../vendor/htm.js';
import { Navbar } from './Navbar.js';
import { Footer } from './Footer.js';
import { LegalModal } from '../ui/Modal.js';
import { legalContent } from '../../data/legalContent.js';
import { useNotification } from '../../context/index.js';

const React = window.React;
const { useState, useEffect } = React;
const html = htm.bind(React.createElement);

/**
 * Notification Toast Component
 */
function NotificationToast({ notification, onDismiss }) {
    if (!notification) return null;

    const typeClasses = {
        success: 'notification-success',
        error: 'notification-error',
        warning: 'notification-warning',
        info: 'notification-info'
    };

    return html`
        <div class="notification-toast ${typeClasses[notification.type] || 'notification-info'}">
            <span>${notification.message}</span>
            <button
                class="notification-dismiss"
                onClick=${onDismiss}
                aria-label="Dismiss notification"
            >
                ×
            </button>
        </div>
    `;
}

/**
 * Main Layout Component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Page content
 */
export function Layout({ children }) {
    const [legalModalType, setLegalModalType] = useState(null);
    const { notification, clearNotification } = useNotification();

    const handleOpenLegal = (type) => {
        setLegalModalType(type);
    };

    const handleCloseLegal = () => {
        setLegalModalType(null);
    };

    return html`
        <div class="app-layout">
            <${Navbar} />

            <main class="main-content" role="main">
                ${children}
            </main>

            <${Footer} onOpenLegal=${handleOpenLegal} />

            <${LegalModal}
                isOpen=${!!legalModalType}
                onClose=${handleCloseLegal}
                type=${legalModalType}
                legalContent=${legalContent}
            />

            <${NotificationToast}
                notification=${notification}
                onDismiss=${clearNotification}
            />
        </div>
    `;
}

export default Layout;
