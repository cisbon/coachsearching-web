/**
 * LazyImage Component
 * @fileoverview Optimized image component with lazy loading, blur placeholder, and error handling
 */

import htm from '../../vendor/htm.js';
import { useIntersectionObserver } from '../../utils/performance.js';

const React = window.React;
const { useState, useEffect, useCallback, memo } = React;
const html = htm.bind(React.createElement);

/**
 * Generate a tiny placeholder color based on image URL
 * @param {string} src - Image source
 * @returns {string} - CSS background color
 */
function getPlaceholderColor(src) {
    if (!src) return '#e5e7eb';

    // Simple hash to generate consistent color
    let hash = 0;
    for (let i = 0; i < src.length; i++) {
        hash = src.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hue = hash % 360;
    return `hsl(${hue}, 20%, 90%)`;
}

/**
 * LazyImage Component
 * Loads images only when they enter the viewport
 *
 * @param {Object} props
 * @param {string} props.src - Image source URL
 * @param {string} props.alt - Alt text
 * @param {string} [props.className] - CSS class
 * @param {Object} [props.style] - Inline styles
 * @param {string} [props.placeholder] - Placeholder image URL
 * @param {string} [props.fallback] - Fallback image URL on error
 * @param {number} [props.width] - Width in pixels
 * @param {number} [props.height] - Height in pixels
 * @param {'lazy'|'eager'} [props.loading='lazy'] - Loading strategy
 * @param {'async'|'sync'|'auto'} [props.decoding='async'] - Decoding strategy
 * @param {Function} [props.onLoad] - Load callback
 * @param {Function} [props.onError] - Error callback
 * @param {string} [props.objectFit='cover'] - Object-fit CSS value
 * @param {number} [props.threshold=0.1] - Intersection threshold
 * @param {string} [props.rootMargin='100px'] - Intersection root margin
 */
function LazyImageComponent({
    src,
    alt = '',
    className = '',
    style = {},
    placeholder,
    fallback = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect fill="%23e5e7eb" width="200" height="200"/%3E%3Ctext x="100" y="100" text-anchor="middle" fill="%239ca3af" font-size="14"%3ENo Image%3C/text%3E%3C/svg%3E',
    width,
    height,
    loading = 'lazy',
    decoding = 'async',
    onLoad,
    onError,
    objectFit = 'cover',
    threshold = 0.1,
    rootMargin = '100px',
    ...rest
}) {
    const [ref, isVisible] = useIntersectionObserver({ threshold, rootMargin });
    const [imageSrc, setImageSrc] = useState(placeholder || null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    // Load image when visible
    useEffect(() => {
        if (!isVisible || isLoaded || hasError || !src) return;

        const img = new Image();

        img.onload = () => {
            setImageSrc(src);
            setIsLoaded(true);
            if (onLoad) onLoad();
        };

        img.onerror = () => {
            setImageSrc(fallback);
            setHasError(true);
            if (onError) onError();
        };

        img.src = src;

        return () => {
            img.onload = null;
            img.onerror = null;
        };
    }, [src, isVisible, isLoaded, hasError, fallback, onLoad, onError]);

    const placeholderBg = getPlaceholderColor(src);

    const containerStyle = {
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: isLoaded ? 'transparent' : placeholderBg,
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : 'auto',
        ...style,
    };

    const imageStyle = {
        width: '100%',
        height: '100%',
        objectFit,
        opacity: isLoaded ? 1 : 0,
        transition: 'opacity 0.3s ease-in-out',
    };

    // Show shimmer while loading
    const shimmerStyle = {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
        backgroundSize: '200% 100%',
        animation: isLoaded ? 'none' : 'shimmer 1.5s infinite',
        pointerEvents: 'none',
    };

    return html`
        <div
            ref=${ref}
            class="lazy-image-container ${className}"
            style=${containerStyle}
            ...${rest}
        >
            ${imageSrc && html`
                <img
                    src=${imageSrc}
                    alt=${alt}
                    width=${width}
                    height=${height}
                    loading=${loading}
                    decoding=${decoding}
                    style=${imageStyle}
                />
            `}
            ${!isLoaded && html`<div class="lazy-image-shimmer" style=${shimmerStyle}></div>`}
        </div>
    `;
}

/**
 * Avatar variant with circular shape
 */
function AvatarImageComponent({
    src,
    alt = '',
    size = 48,
    className = '',
    fallbackInitials = '',
    ...rest
}) {
    const [hasError, setHasError] = useState(false);

    const handleError = useCallback(() => {
        setHasError(true);
    }, []);

    // Show initials if no image or error
    if (!src || hasError) {
        const initials = fallbackInitials || alt.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

        return html`
            <div
                class="avatar-fallback ${className}"
                style=${{
                    width: `${size}px`,
                    height: `${size}px`,
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-primary-100, #cce7e8)',
                    color: 'var(--color-primary-600, #004a4d)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: `${size / 2.5}px`,
                    fontWeight: 600,
                }}
            >
                ${initials}
            </div>
        `;
    }

    return html`
        <${LazyImageComponent}
            src=${src}
            alt=${alt}
            width=${size}
            height=${size}
            className="avatar-image ${className}"
            style=${{
                borderRadius: '50%',
            }}
            objectFit="cover"
            onError=${handleError}
            ...${rest}
        />
    `;
}

/**
 * Background image variant
 */
function BackgroundImageComponent({
    src,
    alt = '',
    children,
    className = '',
    style = {},
    overlay = false,
    overlayColor = 'rgba(0, 0, 0, 0.4)',
    ...rest
}) {
    const [ref, isVisible] = useIntersectionObserver({ rootMargin: '200px' });
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (!isVisible || isLoaded || !src) return;

        const img = new Image();
        img.onload = () => setIsLoaded(true);
        img.src = src;
    }, [src, isVisible, isLoaded]);

    const containerStyle = {
        position: 'relative',
        backgroundImage: isLoaded ? `url(${src})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: isLoaded ? 'transparent' : getPlaceholderColor(src),
        transition: 'background-image 0.3s ease-in-out',
        ...style,
    };

    const overlayStyle = overlay ? {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: overlayColor,
    } : null;

    return html`
        <div
            ref=${ref}
            class="bg-image-container ${className}"
            style=${containerStyle}
            role="img"
            aria-label=${alt}
            ...${rest}
        >
            ${overlay && html`<div class="bg-image-overlay" style=${overlayStyle}></div>`}
            <div style=${{ position: 'relative', zIndex: 1 }}>
                ${children}
            </div>
        </div>
    `;
}

// Memoize for performance
export const LazyImage = memo(LazyImageComponent);
export const AvatarImage = memo(AvatarImageComponent);
export const BackgroundImage = memo(BackgroundImageComponent);

export default LazyImage;
