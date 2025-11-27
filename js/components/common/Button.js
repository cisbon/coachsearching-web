/**
 * Button Components
 * Reusable button styles
 */

import htm from '../../vendor/htm.js';

const React = window.React;
const html = htm.bind(React.createElement);

/**
 * Button Component
 * @param {Object} props
 * @param {string} [props.variant='primary'] - Button variant (primary, secondary, outline, ghost, danger)
 * @param {string} [props.size='medium'] - Button size (small, medium, large)
 * @param {boolean} [props.fullWidth=false] - Full width button
 * @param {boolean} [props.loading=false] - Show loading state
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {string} [props.type='button'] - Button type
 * @param {function} [props.onClick] - Click handler
 * @param {React.ReactNode} props.children - Button content
 */
export function Button({
    variant = 'primary',
    size = 'medium',
    fullWidth = false,
    loading = false,
    disabled = false,
    type = 'button',
    onClick,
    children,
    className = '',
    ...rest
}) {
    const baseClass = {
        primary: 'btn-primary',
        secondary: 'btn-secondary',
        outline: 'btn-outline',
        ghost: 'btn-ghost',
        danger: 'btn-danger'
    }[variant] || 'btn-primary';

    const sizeClass = {
        small: 'btn-sm',
        medium: '',
        large: 'btn-lg'
    }[size] || '';

    const classes = [
        baseClass,
        sizeClass,
        fullWidth ? 'btn-full' : '',
        loading ? 'btn-loading' : '',
        className
    ].filter(Boolean).join(' ');

    return html`
        <button
            type=${type}
            class=${classes}
            onClick=${onClick}
            disabled=${disabled || loading}
            ...${rest}
        >
            ${loading ? html`
                <span class="btn-spinner"></span>
                <span>Loading...</span>
            ` : children}
        </button>
    `;
}

/**
 * Icon Button Component
 */
export function IconButton({
    icon,
    label,
    variant = 'ghost',
    size = 'medium',
    onClick,
    disabled = false,
    ...rest
}) {
    const sizes = {
        small: '32px',
        medium: '40px',
        large: '48px'
    };

    return html`
        <button
            type="button"
            class="icon-btn ${variant}"
            onClick=${onClick}
            disabled=${disabled}
            aria-label=${label}
            style=${{
                width: sizes[size],
                height: sizes[size],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                border: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1
            }}
            ...${rest}
        >
            ${icon}
        </button>
    `;
}

export default Button;
