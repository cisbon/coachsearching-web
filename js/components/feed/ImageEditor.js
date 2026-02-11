/**
 * ImageEditor - Photo crop/zoom/pan editor for feed posts.
 * Similar to the BannerEditorModal but with a 4:3 aspect ratio for feed images.
 *
 * Props:
 *   imageFile   - File object selected by user
 *   onDone      - (blob, previewUrl) => void — called with cropped JPEG
 *   onClose     - () => void
 */
import htm from '../../vendor/htm.js';
import { t } from '../../i18n.js';

const React = window.React;
const { useState, useEffect, useRef, useCallback } = React;
const html = htm.bind(React.createElement);

const CROP_W = 720;
const CROP_H = 540; // 4:3
const OUTPUT_W = 1200;
const OUTPUT_H = 900;

export function ImageEditor({ imageFile, onDone, onClose }) {
    const [image, setImage] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const canvasRef = useRef(null);

    // Load the image file
    useEffect(() => {
        if (!imageFile) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => setImage(img);
            img.src = e.target.result;
        };
        reader.readAsDataURL(imageFile);
    }, [imageFile]);

    // Lock body scroll
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const getCroppedImage = useCallback(() => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = OUTPUT_W;
            canvas.height = OUTPUT_H;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, OUTPUT_W, OUTPUT_H);

            const scale = OUTPUT_W / CROP_W;
            ctx.save();
            ctx.translate(OUTPUT_W / 2, OUTPUT_H / 2);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.scale(zoom * scale, zoom * scale);

            const drawW = image.width;
            const drawH = image.height;
            const fitScale = Math.max(CROP_W / drawW, CROP_H / drawH);

            ctx.drawImage(
                image,
                position.x / (zoom * fitScale) - drawW / 2,
                position.y / (zoom * fitScale) - drawH / 2,
                drawW,
                drawH
            );
            ctx.restore();

            canvas.toBlob(resolve, 'image/jpeg', 0.85);
        });
    }, [image, zoom, rotation, position]);

    const handleDone = async () => {
        if (!image) return;
        setSaving(true);
        setError('');
        try {
            const blob = await getCroppedImage();
            const previewUrl = URL.createObjectURL(blob);
            onDone(blob, previewUrl);
        } catch (err) {
            setError(err.message || 'Failed to process image');
        } finally {
            setSaving(false);
        }
    };

    // Mouse drag handlers
    const handleMouseDown = (e) => {
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = useCallback((e) => {
        if (!isDragging) return;
        setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }, [isDragging, dragStart]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Touch drag handlers
    const handleTouchStart = (e) => {
        const touch = e.touches[0];
        setIsDragging(true);
        setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    };

    const handleTouchMove = useCallback((e) => {
        if (!isDragging) return;
        e.preventDefault();
        const touch = e.touches[0];
        setPosition({ x: touch.clientX - dragStart.x, y: touch.clientY - dragStart.y });
    }, [isDragging, dragStart]);

    const handleTouchEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

    // Compute image style in crop area
    const getImageStyle = () => {
        if (!image) return {};
        const fitScale = Math.max(CROP_W / image.width, CROP_H / image.height);
        const w = image.width * fitScale * zoom;
        const h = image.height * fitScale * zoom;
        return {
            width: `${w}px`,
            height: `${h}px`,
            transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg)`,
            cursor: isDragging ? 'grabbing' : 'grab',
            position: 'absolute',
            left: `${(CROP_W - w) / 2}px`,
            top: `${(CROP_H - h) / 2}px`,
            userSelect: 'none',
            pointerEvents: 'auto',
        };
    };

    const handleBackdropClick = (e) => {
        if (e.target.classList.contains('image-editor-overlay')) onClose();
    };

    return html`
        <div class="image-editor-overlay" onClick=${handleBackdropClick}>
            <div class="image-editor-container">
                <div class="image-editor-header">
                    <h3>${t('feed.editPhoto') || 'Edit photo'}</h3>
                    <button class="image-editor-close" onClick=${onClose}>✕</button>
                </div>

                <div class="image-editor-body">
                    ${image ? html`
                        <div class="image-crop-area"
                            style=${{ width: '100%', maxWidth: `${CROP_W}px`, aspectRatio: '4/3', margin: '0 auto' }}
                            onMouseDown=${handleMouseDown}
                            onTouchStart=${handleTouchStart}
                        >
                            <div class="image-crop-frame" style=${{ width: '100%', height: '100%' }}>
                                <img src=${image.src} alt="" style=${getImageStyle()} draggable="false" />
                            </div>
                        </div>

                        <div class="image-editor-controls">
                            <div class="image-editor-slider-row">
                                <span class="image-editor-slider-label">${t('feed.zoom') || 'Zoom'}</span>
                                <input type="range" class="image-editor-slider" min="1" max="3" step="0.01"
                                    value=${zoom} onInput=${(e) => setZoom(parseFloat(e.target.value))} />
                            </div>
                            <div class="image-editor-slider-row">
                                <span class="image-editor-slider-label">${t('feed.straighten') || 'Straighten'}</span>
                                <input type="range" class="image-editor-slider" min="-45" max="45" step="1"
                                    value=${rotation} onInput=${(e) => setRotation(parseInt(e.target.value))} />
                            </div>
                            <div class="image-editor-rotate-btns">
                                <button class="btn-rotate" onClick=${() => setRotation(r => r - 90)}>↶ 90°</button>
                                <button class="btn-rotate" onClick=${() => setRotation(r => r + 90)}>↷ 90°</button>
                            </div>
                        </div>
                    ` : html`
                        <div class="image-editor-loading">
                            <div class="feed-loading-spinner"></div>
                            <p>${t('feed.loadingImage') || 'Loading image...'}</p>
                        </div>
                    `}
                </div>

                ${error && html`<div class="image-editor-error">${error}</div>`}

                <div class="image-editor-footer">
                    <button class="btn-editor-cancel" onClick=${onClose}>
                        ${t('feed.cancel') || 'Cancel'}
                    </button>
                    <button class="btn-editor-next" onClick=${handleDone} disabled=${!image || saving}>
                        ${saving ? (t('feed.processing') || 'Processing...') : (t('feed.next') || 'Next')}
                    </button>
                </div>
            </div>
        </div>
    `;
}

export default ImageEditor;
