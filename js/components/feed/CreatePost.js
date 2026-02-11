/**
 * CreatePost - Entry point card with Photo / Video / Text buttons.
 * Manages the creation flow and delegates to PostEditor for the actual editing.
 *
 * Flows:
 *   Text  → PostEditor (no media)
 *   Photo → file picker → ImageEditor → PostEditor (with image)
 *   Video → URL input step → PostEditor (with video URL)
 */
import htm from '../../vendor/htm.js';
import { t } from '../../i18n.js';
import { PostEditor } from './PostEditor.js';
import { ImageEditor } from './ImageEditor.js';

const React = window.React;
const { useState, useRef } = React;
const html = htm.bind(React.createElement);

// Flow states
const FLOW_IDLE = 'idle';
const FLOW_IMAGE_EDIT = 'image-edit';
const FLOW_VIDEO_INPUT = 'video-input';
const FLOW_EDITOR = 'editor';

// Video URL parser (duplicated from PostEditor for the preview in video input step)
function parseVideoUrl(url) {
    if (!url) return null;
    let m;
    m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    if (m) return { provider: 'youtube', id: m[1], embedUrl: `https://www.youtube.com/embed/${m[1]}` };
    m = url.match(/vimeo\.com\/(\d+)/);
    if (m) return { provider: 'vimeo', id: m[1], embedUrl: `https://player.vimeo.com/video/${m[1]}` };
    m = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
    if (m) return { provider: 'dailymotion', id: m[1], embedUrl: `https://www.dailymotion.com/embed/video/${m[1]}` };
    return null;
}

export function CreatePost({ session, userProfile, onPostCreated }) {
    const [flow, setFlow] = useState(FLOW_IDLE);
    const [pendingImageFile, setPendingImageFile] = useState(null);
    const [editedImage, setEditedImage] = useState(null);      // { blob, previewUrl }
    const [videoUrl, setVideoUrl] = useState('');
    const [videoEmbed, setVideoEmbed] = useState(null);
    const fileInputRef = useRef(null);

    const avatarUrl = userProfile?.avatar_url || session?.user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.full_name || session?.user?.email?.split('@')[0] || 'U')}&background=006266&color=fff`;

    // ── Flow handlers ────────────────────────────────────────────────
    const handleTextClick = () => {
        setEditedImage(null);
        setVideoUrl('');
        setVideoEmbed(null);
        setFlow(FLOW_EDITOR);
    };

    const handlePhotoClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) return;
        if (file.size > 5 * 1024 * 1024) {
            alert(t('feed.imageTooLarge') || 'Image must be under 5MB');
            return;
        }
        setPendingImageFile(file);
        setFlow(FLOW_IMAGE_EDIT);
        e.target.value = '';
    };

    const handleImageEdited = (blob, previewUrl) => {
        setEditedImage({ blob, previewUrl });
        setPendingImageFile(null);
        setVideoUrl('');
        setVideoEmbed(null);
        setFlow(FLOW_EDITOR);
    };

    const handleVideoClick = () => {
        setVideoUrl('');
        setVideoEmbed(null);
        setFlow(FLOW_VIDEO_INPUT);
    };

    const handleVideoUrlChange = (e) => {
        const url = e.target.value;
        setVideoUrl(url);
        setVideoEmbed(parseVideoUrl(url));
    };

    const handleVideoNext = () => {
        if (videoEmbed) {
            setEditedImage(null);
            setFlow(FLOW_EDITOR);
        }
    };

    const handleClose = () => {
        if (editedImage?.previewUrl) URL.revokeObjectURL(editedImage.previewUrl);
        setFlow(FLOW_IDLE);
        setPendingImageFile(null);
        setEditedImage(null);
        setVideoUrl('');
        setVideoEmbed(null);
    };

    const handlePostCreated = (newPost) => {
        handleClose();
        if (onPostCreated) onPostCreated(newPost);
    };

    // ── Render: Image Editor step ────────────────────────────────────
    if (flow === FLOW_IMAGE_EDIT && pendingImageFile) {
        return html`
            <div class="feed-card create-post-card">
                <${CreatePostCard}
                    avatarUrl=${avatarUrl}
                    onText=${handleTextClick}
                    onPhoto=${handlePhotoClick}
                    onVideo=${handleVideoClick}
                />
                <input ref=${fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp"
                    style=${{ display: 'none' }} onChange=${handleFileChange} />
            </div>
            <${ImageEditor}
                imageFile=${pendingImageFile}
                onDone=${handleImageEdited}
                onClose=${() => { setFlow(FLOW_IDLE); setPendingImageFile(null); }}
            />
        `;
    }

    // ── Render: Video URL input step ─────────────────────────────────
    if (flow === FLOW_VIDEO_INPUT) {
        return html`
            <div class="feed-card create-post-card">
                <${CreatePostCard}
                    avatarUrl=${avatarUrl}
                    onText=${handleTextClick}
                    onPhoto=${handlePhotoClick}
                    onVideo=${handleVideoClick}
                />
                <input ref=${fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp"
                    style=${{ display: 'none' }} onChange=${handleFileChange} />
            </div>
            <div class="video-input-overlay" onClick=${(e) => { if (e.target.classList.contains('video-input-overlay')) setFlow(FLOW_IDLE); }}>
                <div class="video-input-modal">
                    <div class="video-input-header">
                        <h3>${t('feed.addVideo') || 'Add a video'}</h3>
                        <button class="video-input-close" onClick=${() => setFlow(FLOW_IDLE)}>✕</button>
                    </div>
                    <div class="video-input-body">
                        <p class="video-input-desc">
                            ${t('feed.videoUrlDesc') || 'Paste a link from YouTube, Vimeo, or Dailymotion'}
                        </p>
                        <input
                            type="url"
                            class="video-input-field"
                            placeholder="https://www.youtube.com/watch?v=..."
                            value=${videoUrl}
                            onInput=${handleVideoUrlChange}
                            autoFocus
                        />
                        ${videoEmbed && html`
                            <div class="video-input-preview">
                                <iframe
                                    src=${videoEmbed.embedUrl}
                                    class="video-input-iframe"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            </div>
                        `}
                    </div>
                    <div class="video-input-footer">
                        <button class="btn-editor-cancel" onClick=${() => setFlow(FLOW_IDLE)}>
                            ${t('feed.cancel') || 'Cancel'}
                        </button>
                        <button class="btn-editor-next" onClick=${handleVideoNext} disabled=${!videoEmbed}>
                            ${t('feed.next') || 'Next'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // ── Render: PostEditor step ──────────────────────────────────────
    if (flow === FLOW_EDITOR) {
        return html`
            <div class="feed-card create-post-card">
                <${CreatePostCard}
                    avatarUrl=${avatarUrl}
                    onText=${handleTextClick}
                    onPhoto=${handlePhotoClick}
                    onVideo=${handleVideoClick}
                />
                <input ref=${fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp"
                    style=${{ display: 'none' }} onChange=${handleFileChange} />
            </div>
            <${PostEditor}
                session=${session}
                userProfile=${userProfile}
                onPostCreated=${handlePostCreated}
                onClose=${handleClose}
                initialImage=${editedImage}
                initialVideoUrl=${videoEmbed ? videoUrl : null}
            />
        `;
    }

    // ── Render: Idle (default card) ──────────────────────────────────
    return html`
        <div class="feed-card create-post-card">
            <${CreatePostCard}
                avatarUrl=${avatarUrl}
                onText=${handleTextClick}
                onPhoto=${handlePhotoClick}
                onVideo=${handleVideoClick}
            />
            <input ref=${fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp"
                style=${{ display: 'none' }} onChange=${handleFileChange} />
        </div>
    `;
}

// ── The visual card (always rendered) ────────────────────────────────
function CreatePostCard({ avatarUrl, onText, onPhoto, onVideo }) {
    return html`
        <div>
            <div class="create-post-row">
                <img src=${avatarUrl} alt="" class="create-post-avatar" />
                <button class="create-post-input" onClick=${onText}>
                    ${t('feed.startPost') || 'Start a post...'}
                </button>
            </div>
            <div class="create-post-actions">
                <button class="create-post-action" onClick=${onPhoto}>
                    <span class="create-post-action-icon">📷</span>
                    <span>${t('feed.photo') || 'Photo'}</span>
                </button>
                <button class="create-post-action" onClick=${onVideo}>
                    <span class="create-post-action-icon">🎥</span>
                    <span>${t('feed.video') || 'Video'}</span>
                </button>
                <button class="create-post-action" onClick=${onText}>
                    <span class="create-post-action-icon">📝</span>
                    <span>${t('feed.article') || 'Text'}</span>
                </button>
            </div>
        </div>
    `;
}

export default CreatePost;
