/**
 * PostEditor - Smart post creation modal.
 * Supports text, image attachments, video URL embeds, and auto link preview.
 *
 * Props:
 *   session        - Supabase session
 *   userProfile    - { full_name, avatar_url, title, slug }
 *   onPostCreated  - (newPost) => void
 *   onClose        - () => void
 *   initialImage   - { blob, previewUrl } | null  (from ImageEditor)
 *   initialVideoUrl - string | null               (from Video flow)
 */
import htm from '../../vendor/htm.js';
import { t } from '../../i18n.js';
import { ImageEditor } from './ImageEditor.js';
import { queryClient } from '../../config/queryClient.js';

const React = window.React;
const { useState, useEffect, useRef, useCallback } = React;
const html = htm.bind(React.createElement);

// ── Video URL parsing ────────────────────────────────────────────────
function parseVideoUrl(url) {
    if (!url) return null;
    let m;
    // YouTube
    m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    if (m) return { provider: 'youtube', id: m[1], embedUrl: `https://www.youtube.com/embed/${m[1]}` };
    // Vimeo
    m = url.match(/vimeo\.com\/(\d+)/);
    if (m) return { provider: 'vimeo', id: m[1], embedUrl: `https://player.vimeo.com/video/${m[1]}` };
    // Dailymotion
    m = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
    if (m) return { provider: 'dailymotion', id: m[1], embedUrl: `https://www.dailymotion.com/embed/video/${m[1]}` };
    return null;
}

// ── URL detection in text ────────────────────────────────────────────
const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/g;

function extractFirstUrl(text) {
    const matches = text.match(URL_REGEX);
    return matches ? matches[0] : null;
}

// ── VideoPlayer sub-component ────────────────────────────────────────
function VideoPlayer({ embedData }) {
    if (!embedData) return null;
    return html`
        <div class="post-editor-video-preview">
            <iframe
                src=${embedData.embedUrl}
                class="post-editor-video-iframe"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            ></iframe>
        </div>
    `;
}

// ── LinkPreview sub-component ────────────────────────────────────────
function LinkPreviewCard({ url }) {
    if (!url) return null;
    let domain = '';
    try { domain = new URL(url).hostname.replace('www.', ''); } catch { domain = url; }

    return html`
        <div class="post-editor-link-preview" onClick=${() => window.open(url, '_blank')}>
            <div class="link-preview-icon">🔗</div>
            <div class="link-preview-info">
                <div class="link-preview-domain">${domain}</div>
                <div class="link-preview-url">${url.length > 80 ? url.slice(0, 80) + '...' : url}</div>
            </div>
            <button class="link-preview-open">↗</button>
        </div>
    `;
}

// ── Main PostEditor ──────────────────────────────────────────────────
export function PostEditor({ session, userProfile, onPostCreated, onClose, initialImage, initialVideoUrl }) {
    const [content, setContent] = useState('');
    const [attachedImage, setAttachedImage] = useState(initialImage || null);  // { blob, previewUrl }
    const [videoUrl, setVideoUrl] = useState(initialVideoUrl || '');
    const [videoEmbed, setVideoEmbed] = useState(initialVideoUrl ? parseVideoUrl(initialVideoUrl) : null);
    const [detectedLink, setDetectedLink] = useState(null);
    const [posting, setPosting] = useState(false);
    const [showVideoInput, setShowVideoInput] = useState(false);
    const [showImageEditor, setShowImageEditor] = useState(false);
    const [pendingImageFile, setPendingImageFile] = useState(null);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);

    const avatarUrl = userProfile?.avatar_url || session?.user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.full_name || 'U')}&background=006266&color=fff`;
    const displayName = userProfile?.full_name || session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || '';

    // Auto-focus textarea
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        setTimeout(() => textareaRef.current?.focus(), 150);
        return () => { document.body.style.overflow = ''; };
    }, []);

    // Auto-detect links in text (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            const url = extractFirstUrl(content);
            if (url) {
                // If it's a video URL and no video is attached, auto-embed
                const vid = parseVideoUrl(url);
                if (vid && !videoEmbed && !attachedImage) {
                    setVideoUrl(url);
                    setVideoEmbed(vid);
                    setDetectedLink(null);
                } else if (!vid && !attachedImage && !videoEmbed) {
                    setDetectedLink(url);
                }
            } else {
                setDetectedLink(null);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [content]);

    // ── Image handling ───────────────────────────────────────────────
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
        setShowImageEditor(true);
        // Reset input so same file can be selected again
        e.target.value = '';
    };

    const handleImageEdited = (blob, previewUrl) => {
        setAttachedImage({ blob, previewUrl });
        setShowImageEditor(false);
        setPendingImageFile(null);
        // Remove video if adding image
        setVideoUrl('');
        setVideoEmbed(null);
    };

    const removeImage = () => {
        if (attachedImage?.previewUrl) URL.revokeObjectURL(attachedImage.previewUrl);
        setAttachedImage(null);
    };

    // ── Video handling ───────────────────────────────────────────────
    const handleVideoUrlChange = (e) => {
        const url = e.target.value;
        setVideoUrl(url);
        setVideoEmbed(parseVideoUrl(url));
    };

    const attachVideo = () => {
        if (videoEmbed) {
            setShowVideoInput(false);
            // Remove image if adding video
            removeImage();
        }
    };

    const removeVideo = () => {
        setVideoUrl('');
        setVideoEmbed(null);
    };

    // ── Submit ───────────────────────────────────────────────────────
    const canPost = content.trim() || attachedImage || videoEmbed;

    const handleSubmit = async () => {
        if (!canPost || !session?.user?.id) return;
        setPosting(true);

        try {
            const supabase = window.supabaseClient;
            if (!supabase) throw new Error('No connection');

            let imageUrl = null;

            // Upload image to feed-media bucket
            if (attachedImage?.blob) {
                const userId = session.user.id;
                const fileName = `${userId}/post-${Date.now()}.jpg`;

                const { error: uploadError } = await supabase.storage
                    .from('feed-media')
                    .upload(fileName, attachedImage.blob, {
                        upsert: true,
                        contentType: 'image/jpeg'
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('feed-media')
                    .getPublicUrl(fileName);

                imageUrl = publicUrl;
            }

            const { data, error } = await supabase.from('cs_posts').insert({
                user_id: session.user.id,
                content: content.trim(),
                image_url: imageUrl,
                video_url: videoEmbed ? videoUrl : null,
                author_name: displayName,
                author_avatar: avatarUrl,
                author_title: userProfile?.title || null,
                author_slug: userProfile?.slug || null,
            }).select().single();

            if (error) throw error;

            // Invalidate feed cache so the new post appears
            queryClient.invalidateQueries({ queryKey: ['feed'] });
            queryClient.invalidateQueries({ queryKey: ['posts'] });

            // Cleanup
            if (attachedImage?.previewUrl) URL.revokeObjectURL(attachedImage.previewUrl);
            setContent('');
            setAttachedImage(null);
            setVideoUrl('');
            setVideoEmbed(null);
            if (onPostCreated) onPostCreated(data);
            onClose();
        } catch (err) {
            console.error('Failed to create post:', err);
            alert(t('feed.postError') || 'Failed to create post. Please try again.');
        } finally {
            setPosting(false);
        }
    };

    const handleBackdropClick = (e) => {
        if (e.target.classList.contains('post-editor-overlay')) onClose();
    };

    // Auto-resize textarea
    const handleInput = (e) => {
        setContent(e.target.value);
        const ta = e.target;
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
    };

    // ── Image Editor sub-modal ───────────────────────────────────────
    if (showImageEditor && pendingImageFile) {
        return html`
            <${ImageEditor}
                imageFile=${pendingImageFile}
                onDone=${handleImageEdited}
                onClose=${() => { setShowImageEditor(false); setPendingImageFile(null); }}
            />
        `;
    }

    return html`
        <div class="post-editor-overlay" onClick=${handleBackdropClick}>
            <div class="post-editor-modal">
                <!-- Header -->
                <div class="post-editor-header">
                     <!-- Author info -->
                    <div class="post-editor-author">
                        <img src=${avatarUrl} alt="" />
                        <div>
                            <div class="post-editor-author-name">${displayName}</div>
                            ${userProfile?.title && html`<div class="post-editor-author-title">${userProfile.title}</div>`}
                        </div>
                    </div>
                    <button class="post-editor-close" onClick=${onClose}>✕</button>
                </div>

                <!-- Scrollable body -->
                <div class="post-editor-body">
                    <!-- Text area -->
                    <textarea
                        ref=${textareaRef}
                        class="post-editor-textarea"
                        placeholder=${t('feed.postPlaceholder') || 'What do you want to talk about?'}
                        value=${content}
                        onInput=${handleInput}
                    ></textarea>

                    <!-- Attached image preview -->
                    ${attachedImage && html`
                        <div class="post-editor-media-preview">
                            <img src=${attachedImage.previewUrl} alt="" class="post-editor-preview-image" />
                            <button class="post-editor-remove-media" onClick=${removeImage}>✕</button>
                        </div>
                    `}

                    <!-- Video embed preview -->
                    ${videoEmbed && !showVideoInput && html`
                        <div class="post-editor-media-preview">
                            <${VideoPlayer} embedData=${videoEmbed} />
                            <button class="post-editor-remove-media" onClick=${removeVideo}>✕</button>
                        </div>
                    `}

                    <!-- Auto-detected link preview -->
                    ${detectedLink && !attachedImage && !videoEmbed && html`
                        <${LinkPreviewCard} url=${detectedLink} />
                    `}

                    <!-- Video URL input (inline) -->
                    ${showVideoInput && html`
                        <div class="post-editor-video-input">
                            <input
                                type="url"
                                class="post-editor-video-url-input"
                                placeholder=${t('feed.videoUrlPlaceholder') || 'Paste video URL (YouTube, Vimeo, Dailymotion)'}
                                value=${videoUrl}
                                onInput=${handleVideoUrlChange}
                                autoFocus
                            />
                            ${videoEmbed && html`
                                <${VideoPlayer} embedData=${videoEmbed} />
                            `}
                            <div class="post-editor-video-input-actions">
                                <button class="btn-editor-cancel-sm" onClick=${() => { setShowVideoInput(false); if (!videoEmbed) { setVideoUrl(''); } }}>
                                    ${t('feed.cancel') || 'Cancel'}
                                </button>
                                <button class="btn-editor-attach" onClick=${attachVideo} disabled=${!videoEmbed}>
                                    ${t('feed.attachVideo') || 'Attach video'}
                                </button>
                            </div>
                        </div>
                    `}
                </div>

                <!-- Footer with toolbar + post button -->
                <div class="post-editor-footer">
                    <div class="post-editor-toolbar">
                        <button class="post-editor-tool-btn" onClick=${handlePhotoClick} title=${t('feed.addPhoto') || 'Add photo'}
                            disabled=${!!videoEmbed}>
                            <span>📷</span>
                        </button>
                        <button class="post-editor-tool-btn" onClick=${() => setShowVideoInput(true)} title=${t('feed.addVideo') || 'Add video'}
                            disabled=${!!attachedImage}>
                            <span>🎥</span>
                        </button>
                    </div>
                    <button class="btn-post" onClick=${handleSubmit} disabled=${!canPost || posting}>
                        ${posting ? (t('feed.posting') || 'Posting...') : (t('feed.post') || 'Post')}
                    </button>
                </div>

                <!-- Hidden file input for photos -->
                <input
                    ref=${fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    style=${{ display: 'none' }}
                    onChange=${handleFileChange}
                />
            </div>
        </div>
    `;
}

// Re-export helpers for use in FeedPost
export { parseVideoUrl };
export default PostEditor;
