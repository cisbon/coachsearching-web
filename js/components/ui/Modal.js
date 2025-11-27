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
 */
export function LegalModal({ isOpen, onClose, type, legalContent }) {
    if (!isOpen || !type || !legalContent[type]) return null;

    const { title, content } = legalContent[type];

    return html`
        <${Modal} isOpen=${isOpen} onClose=${onClose} title=${title}>
            ${content}
        </${Modal}>
    `;
}

export default Modal;
