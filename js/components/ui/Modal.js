/**
 * Modal Component
 * Reusable modal dialog with overlay
 */

import htm from '../../vendor/htm.js';

const React = window.React;
const { useEffect, useCallback } = React;
const html = htm.bind(React.createElement);

/**
 * Modal Component
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {function} props.onClose - Close handler
 * @param {string} props.title - Modal title
 * @param {React.ReactNode} props.children - Modal content
 * @param {string} [props.size='medium'] - Modal size (small, medium, large)
 */
export function Modal({ isOpen, onClose, title, children, size = 'medium' }) {
    // Handle escape key
    const handleEscape = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleEscape]);

    if (!isOpen) return null;

    const sizeClass = {
        small: 'modal-sm',
        medium: '',
        large: 'modal-lg'
    }[size] || '';

    return html`
        <div
            class="modal-overlay"
            onClick=${onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div
                class="modal-content ${sizeClass}"
                onClick=${(e) => e.stopPropagation()}
            >
                <div class="modal-header">
                    <h2 id="modal-title" class="modal-title">${title}</h2>
                    <button
                        class="modal-close"
                        onClick=${onClose}
                        aria-label="Close modal"
                    >
                        ×
                    </button>
                </div>
                <div class="modal-body">
                    ${children}
                </div>
            </div>
        </div>
    `;
}

/**
 * LegalModal - Specialized modal for legal content
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {function} props.onClose - Close handler
 * @param {string} props.type - Type of legal content (imprint, privacy, terms)
 * @param {Object} [props.legalContent] - Optional custom legal content
 */
export function LegalModal({ isOpen, onClose, type, legalContent: customContent }) {
    // Default legal content
    const defaultContent = {
        imprint: {
            title: 'Imprint',
            content: html`
                <h3>coachsearching.com</h3>
                <h2>Information according to § 5 TMG</h2>
                <p><strong>Represented by:</strong><br/>Michael Gross</p>
                <p><strong>Contact:</strong><br/>Email: legal[at]coachsearching.com</p>
            `
        },
        privacy: {
            title: 'Privacy Policy',
            content: html`
                <h3>1. Data Protection Overview</h3>
                <p>General information about what happens to your personal data when you visit our website.</p>
                <h3>2. Hosting</h3>
                <p>We host our content via GitHub Pages and use Supabase for our database.</p>
                <h3>3. Data Collection</h3>
                <p>We collect data when you register, book a coach, or contact us. This includes name, email, and payment info.</p>
                <h3>4. Analytics</h3>
                <p>We use cookies to analyze website traffic and improve user experience.</p>
            `
        },
        terms: {
            title: 'Terms of Service',
            content: html`
                <h3>1. Scope</h3>
                <p>These terms apply to all business relations between the customer and coachsearching.com.</p>
                <h3>2. Services</h3>
                <p>coachsearching.com provides a platform to connect clients with professional coaches.</p>
                <h3>3. Booking & Payment</h3>
                <p>Bookings are binding. Payments are processed via Stripe.</p>
                <h3>4. Liability</h3>
                <p>coachsearching.com not liable for the content or quality of the coaching sessions provided by independent coaches.</p>
            `
        }
    };

    const content = customContent || defaultContent;
    if (!isOpen || !type || !content[type]) return null;

    const { title, content: bodyContent } = content[type];

    return html`
        <${Modal} isOpen=${isOpen} onClose=${onClose} title=${title}>
            ${bodyContent}
        </${Modal}>
    `;
}

export default Modal;
