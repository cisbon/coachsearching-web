/**
 * VideoPopup Component
 * Modal for playing coach intro videos (YouTube, Vimeo, or direct video URLs)
 */

import htm from '../../vendor/htm.js';

const React = window.React;
const { useEffect } = React;
const html = htm.bind(React.createElement);

/**
 * Convert video URL to embeddable format
 * @param {string} url - Original video URL
 * @returns {string|null} - Embeddable URL or null
 */
function getEmbedUrl(url) {
    if (!url) return null;

    // YouTube formats: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
    const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (youtubeMatch) {
        return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1&rel=0`;
    }

    // Vimeo formats: vimeo.com/ID, player.vimeo.com/video/ID
    const vimeoMatch = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
    if (vimeoMatch) {
        return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
    }

    // Direct video URL (mp4, webm, etc.)
    if (url.match(/\.(mp4|webm|ogg)(\?|$)/i)) {
        return url;
    }

    // Return original URL as fallback
    return url;
}

/**
 * VideoPopup Component
 * @param {Object} props
 * @param {string} props.videoUrl - URL of the video to play
 * @param {string} props.coachName - Name of the coach for the header
 * @param {function} props.onClose - Close handler
 */
export function VideoPopup({ videoUrl, coachName, onClose }) {
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
        if (e.target.classList.contains('video-popup-overlay')) {
            onClose();
        }
    };

    const embedUrl = getEmbedUrl(videoUrl);
    const isDirectVideo = videoUrl && videoUrl.match(/\.(mp4|webm|ogg)(\?|$)/i);
    const isYouTubeOrVimeo = embedUrl && (embedUrl.includes('youtube.com/embed') || embedUrl.includes('player.vimeo.com'));

    return html`
        <div class="video-popup-overlay" onClick=${handleBackdropClick}>
            <div class="video-popup-container">
                <div class="video-popup-header">
                    <h3>Meet ${coachName}</h3>
                    <button class="video-popup-close" onClick=${onClose}>✕</button>
                </div>
                <div class="video-popup-content">
                    ${isYouTubeOrVimeo ? html`
                        <iframe
                            src=${embedUrl}
                            class="video-iframe"
                            frameborder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen
                        ></iframe>
                    ` : isDirectVideo ? html`
                        <video
                            src=${videoUrl}
                            controls
                            autoplay
                            class="video-player"
                        >
                            Your browser does not support video playback.
                        </video>
                    ` : html`
                        <div class="video-error">
                            <p>Unable to play this video format.</p>
                            <a href=${videoUrl} target="_blank" class="video-external-link">Open video in new tab →</a>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
}

export default VideoPopup;
