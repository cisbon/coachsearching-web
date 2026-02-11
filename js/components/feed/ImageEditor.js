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

const OUTPUT_W = 1200;
const OUTPUT_H = 900;
const ASPECT = OUTPUT_W / OUTPUT_H; // 4:3

export function ImageEditor({ imageFile, onDone, onClose }) {
    const [image, setImage] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const cropRef = useRef(null);

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

    // Compute the fitScale that makes the image cover the crop area
    const getCropRect = () => {
        const el = cropRef.current;
        if (!el) return { w: 600, h: 450 };
        return { w: el.offsetWidth, h: el.offsetHeight };
    };

    const getFitScale = (cropW, cropH) => {
        if (!image) return 1;
        return Math.max(cropW / image.width, cropH / image.height);
    };

    /**
     * getCroppedImage replicates the exact same transform pipeline used by CSS
     * to render the preview, so the output matches 1:1.
     *
     * Visual pipeline (CSS):
     *   1. image natural size → scaled by fitScale * zoom → displayed size
     *   2. centered in crop area via `left/top` offset
     *   3. translated by position.x / position.y
     *   4. rotated by `rotation` degrees around the image center
     *
     * Canvas pipeline (here):
     *   We render into OUTPUT_W x OUTPUT_H canvas, which maps to the crop
     *   area. We apply the same transforms, scaled by outputScale = OUTPUT_W / cropW.
     */
    const getCroppedImage = useCallback(() => {
        return new Promise((resolve) => {
            const { w: cropW, h: cropH } = getCropRect();
            const fitScale = getFitScale(cropW, cropH);
            const outputScale = OUTPUT_W / cropW;

            const canvas = document.createElement('canvas');
            canvas.width = OUTPUT_W;
            canvas.height = OUTPUT_H;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, OUTPUT_W, OUTPUT_H);

            // The displayed image dimensions in CSS pixels
            const dispW = image.width * fitScale * zoom;
            const dispH = image.height * fitScale * zoom;

            // CSS positions the image so its center aligns with the crop center
            // then offsets by position.x/y. The image CSS `left` and `top` are:
            //   left = (cropW - dispW) / 2
            //   top  = (cropH - dispH) / 2
            // Then translate(position.x, position.y) is applied, and rotate around center.
            //
            // The center of the image in crop-area coordinates:
            const imgCenterX = cropW / 2 + position.x;
            const imgCenterY = cropH / 2 + position.y;

            // Scale everything to output canvas coordinates
            ctx.save();
            ctx.translate(imgCenterX * outputScale, imgCenterY * outputScale);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.drawImage(
                image,
                -(dispW * outputScale) / 2,
                -(dispH * outputScale) / 2,
                dispW * outputScale,
                dispH * outputScale
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

    // Compute image style in crop area — this is the visual truth
    const getImageStyle = () => {
        if (!image) return {};
        const { w: cropW, h: cropH } = getCropRect();
        const fitScale = getFitScale(cropW, cropH);
        const w = image.width * fitScale * zoom;
        const h = image.height * fitScale * zoom;
        return {
            width: `${w}px`,
            height: `${h}px`,
            position: 'absolute',
            left: `calc(50% - ${w / 2}px)`,
            top: `calc(50% - ${h / 2}px)`,
            transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg)`,
            cursor: isDragging ? 'grabbing' : 'grab',
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
                        <div class="image-crop-area" ref=${cropRef}
                            style=${{ width: '100%', maxWidth: '720px', aspectRatio: '4/3', margin: '0 auto', position: 'relative', overflow: 'hidden', background: '#000', borderRadius: '4px' }}
                            onMouseDown=${handleMouseDown}
                            onTouchStart=${handleTouchStart}
                        >
                            <img src=${image.src} alt="" style=${getImageStyle()} draggable="false" />
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
