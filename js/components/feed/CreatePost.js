/**
 * CreatePost Component
 * LinkedIn-style "Start a post" card with modal
 */
import htm from '../../vendor/htm.js';
import { t } from '../../i18n.js';

const React = window.React;
const { useState, useEffect, useRef } = React;
const html = htm.bind(React.createElement);

export function CreatePost({ session, userProfile, onPostCreated }) {
    const [showModal, setShowModal] = useState(false);
    const [content, setContent] = useState('');
    const [posting, setPosting] = useState(false);
    const textareaRef = useRef(null);

    const avatarUrl = userProfile?.avatar_url || session?.user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.full_name || session?.user?.email?.split('@')[0] || 'U')}&background=006266&color=fff`;
    const displayName = userProfile?.full_name || session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || '';

    useEffect(() => {
        if (showModal) {
            document.body.style.overflow = 'hidden';
            setTimeout(() => textareaRef.current?.focus(), 100);
        }
        return () => { document.body.style.overflow = ''; };
    }, [showModal]);

    const handleSubmit = async () => {
        if (!content.trim() || !session?.user?.id) return;

        setPosting(true);
        try {
            const supabase = window.supabaseClient;
            if (!supabase) throw new Error('No connection');

            const { data, error } = await supabase.from('cs_posts').insert({
                user_id: session.user.id,
                content: content.trim(),
                author_name: displayName,
                author_avatar: avatarUrl,
                author_title: userProfile?.title || null,
                author_slug: userProfile?.slug || null,
            }).select().single();

            if (error) throw error;

            setContent('');
            setShowModal(false);
            if (onPostCreated) onPostCreated(data);
        } catch (err) {
            console.error('Failed to create post:', err);
        } finally {
            setPosting(false);
        }
    };

    const handleBackdropClick = (e) => {
        if (e.target.classList.contains('create-post-modal-overlay')) {
            setShowModal(false);
        }
    };

    return html`
        <div class="feed-card create-post-card">
            <div class="create-post-row">
                <img src=${avatarUrl} alt="" class="create-post-avatar" />
                <button class="create-post-input" onClick=${() => setShowModal(true)}>
                    ${t('feed.startPost') || 'Start a post...'}
                </button>
            </div>
            <div class="create-post-actions">
                <button class="create-post-action" onClick=${() => setShowModal(true)}>
                    <span class="create-post-action-icon">📷</span>
                    <span>${t('feed.photo') || 'Photo'}</span>
                </button>
                <button class="create-post-action" onClick=${() => setShowModal(true)}>
                    <span class="create-post-action-icon">🎥</span>
                    <span>${t('feed.video') || 'Video'}</span>
                </button>
                <button class="create-post-action" onClick=${() => setShowModal(true)}>
                    <span class="create-post-action-icon">📝</span>
                    <span>${t('feed.article') || 'Article'}</span>
                </button>
            </div>
        </div>

        ${showModal && html`
            <div class="create-post-modal-overlay" onClick=${handleBackdropClick}>
                <div class="create-post-modal">
                    <div class="create-post-modal-header">
                        <div class="create-post-modal-author">
                            <img src=${avatarUrl} alt="" />
                            <div>
                                <div class="create-post-modal-author-name">${displayName}</div>
                            </div>
                        </div>
                        <button class="create-post-modal-close" onClick=${() => setShowModal(false)}>✕</button>
                    </div>
                    <div class="create-post-modal-body">
                        <textarea
                            ref=${textareaRef}
                            class="create-post-textarea"
                            placeholder=${t('feed.postPlaceholder') || 'What do you want to talk about?'}
                            value=${content}
                            onInput=${(e) => setContent(e.target.value)}
                        ></textarea>
                    </div>
                    <div class="create-post-modal-footer">
                        <button class="btn-post" onClick=${handleSubmit} disabled=${!content.trim() || posting}>
                            ${posting ? (t('feed.posting') || 'Posting...') : (t('feed.post') || 'Post')}
                        </button>
                    </div>
                </div>
            </div>
        `}
    `;
}

export default CreatePost;
