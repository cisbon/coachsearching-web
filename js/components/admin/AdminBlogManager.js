/**
 * AdminBlogManager Component
 * Admin dashboard for managing blog posts
 */

import htm from '../../vendor/htm.js';
import { t, getCurrentLang } from '../../i18n.js';
import { AdminBlogEditor } from './AdminBlogEditor.js';

const React = window.React;
const { useState, useEffect } = React;
const html = htm.bind(React.createElement);

// Supported languages
const BLOG_LANGUAGES = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' }
];

const getLanguageInfo = (code) => {
    return BLOG_LANGUAGES.find(l => l.code === code) || { code, name: code, flag: '🌐' };
};

/**
 * Blog Post Card Component
 */
const BlogPostCard = ({ post, onEdit, onDelete, onAddTranslation, existingLanguages }) => {
    const langInfo = getLanguageInfo(post.language);
    const missingLangs = BLOG_LANGUAGES.filter(l => !existingLanguages.includes(l.code));

    return html`
        <div style=${{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex',
            gap: '20px'
        }}>
            <!-- Thumbnail -->
            ${post.featured_image_url ? html`
                <img
                    src=${post.featured_image_url}
                    alt=${post.title}
                    style=${{
                        width: '120px',
                        height: '80px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        flexShrink: 0
                    }}
                />
            ` : html`
                <div style=${{
                    width: '120px',
                    height: '80px',
                    background: '#f1f5f9',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    flexShrink: 0
                }}>📝</div>
            `}

            <!-- Content -->
            <div style=${{ flex: 1, minWidth: 0 }}>
                <div style=${{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <h3 style=${{
                        margin: 0,
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        color: '#1e293b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}>
                        ${post.title}
                    </h3>
                    <span style=${{
                        padding: '2px 8px',
                        background: '#e0f2fe',
                        color: '#0369a1',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600
                    }}>
                        ${langInfo.flag} ${langInfo.code.toUpperCase()}
                    </span>
                    <span style=${{
                        padding: '2px 8px',
                        background: post.status === 'published' ? '#dcfce7' : '#fef3c7',
                        color: post.status === 'published' ? '#166534' : '#92400e',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600
                    }}>
                        ${post.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                    ${existingLanguages.length > 1 && html`
                        <span style=${{
                            padding: '2px 8px',
                            background: '#f0fdf4',
                            color: '#166534',
                            borderRadius: '4px',
                            fontSize: '0.75rem'
                        }}>
                            ${existingLanguages.length} languages
                        </span>
                    `}
                </div>

                <p style=${{
                    margin: '0 0 8px',
                    fontSize: '0.9rem',
                    color: '#64748b',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                }}>
                    ${post.description || 'No description'}
                </p>

                <!-- Tags -->
                ${post.tags && post.tags.length > 0 && html`
                    <div style=${{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        ${post.tags.slice(0, 4).map(tag => html`
                            <span key=${tag} style=${{
                                padding: '2px 8px',
                                background: '#f1f5f9',
                                color: '#475569',
                                borderRadius: '12px',
                                fontSize: '0.75rem'
                            }}>
                                #${tag}
                            </span>
                        `)}
                        ${post.tags.length > 4 && html`
                            <span style=${{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                +${post.tags.length - 4} more
                            </span>
                        `}
                    </div>
                `}

                <!-- Meta -->
                <div style=${{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: '#94a3b8' }}>
                    <span>${new Date(post.created_at).toLocaleDateString()}</span>
                    ${post.view_count > 0 && html`<span>${post.view_count} views</span>`}
                    <span style=${{ fontFamily: 'monospace' }}>/blog/${post.language}/${post.slug}</span>
                </div>
            </div>

            <!-- Actions -->
            <div style=${{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                <button
                    onClick=${() => onEdit(post)}
                    class="btn-small btn-secondary"
                >
                    Edit
                </button>
                ${missingLangs.length > 0 && html`
                    <button
                        onClick=${() => onAddTranslation(post)}
                        class="btn-small"
                        style=${{
                            background: '#f0f9ff',
                            color: '#0369a1',
                            border: '1px solid #bae6fd'
                        }}
                    >
                        + Translation
                    </button>
                `}
                <button
                    onClick=${() => onDelete(post)}
                    class="btn-small btn-danger"
                >
                    Delete
                </button>
            </div>
        </div>
    `;
};

/**
 * Main Admin Blog Manager Component
 */
export const AdminBlogManager = ({ session }) => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showEditor, setShowEditor] = useState(false);
    const [editingPost, setEditingPost] = useState(null);
    const [translationGroupId, setTranslationGroupId] = useState(null);
    const [filter, setFilter] = useState('all'); // all, published, draft
    const [languageFilter, setLanguageFilter] = useState('all');

    useEffect(() => {
        loadPosts();
    }, []);

    const loadPosts = async () => {
        setLoading(true);
        try {
            const { data, error } = await window.supabaseClient
                .from('cs_blog_posts')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && data) {
                setPosts(data);
            }
        } catch (error) {
            console.error('Failed to load posts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (post) => {
        setEditingPost(post);
        setTranslationGroupId(null);
        setShowEditor(true);
    };

    const handleAddTranslation = (post) => {
        setEditingPost(null);
        setTranslationGroupId(post.post_group_id);
        setShowEditor(true);
    };

    const handleDelete = async (post) => {
        if (!confirm(`Are you sure you want to delete "${post.title}"?`)) {
            return;
        }

        try {
            const { error } = await window.supabaseClient
                .from('cs_blog_posts')
                .delete()
                .eq('id', post.id);

            if (!error) {
                await loadPosts();
            } else {
                alert('Failed to delete post: ' + error.message);
            }
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Failed to delete post');
        }
    };

    const handleSave = async () => {
        setShowEditor(false);
        setEditingPost(null);
        setTranslationGroupId(null);
        await loadPosts();
    };

    const handleCancel = () => {
        setShowEditor(false);
        setEditingPost(null);
        setTranslationGroupId(null);
    };

    // Get existing languages for each post group
    const getExistingLanguages = (groupId) => {
        return posts
            .filter(p => p.post_group_id === groupId)
            .map(p => p.language);
    };

    // Filter posts
    const filteredPosts = posts.filter(post => {
        if (filter !== 'all' && post.status !== filter) return false;
        if (languageFilter !== 'all' && post.language !== languageFilter) return false;
        return true;
    });

    if (loading) {
        return html`
            <div style=${{ padding: '40px', textAlign: 'center' }}>
                <div style=${{ fontSize: '1.5rem', color: '#64748b' }}>Loading posts...</div>
            </div>
        `;
    }

    if (showEditor) {
        return html`
            <${AdminBlogEditor}
                session=${session}
                post=${editingPost}
                onSave=${handleSave}
                onCancel=${handleCancel}
            />
        `;
    }

    return html`
        <div class="admin-blog-manager">
            <!-- Header -->
            <div style=${{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px'
            }}>
                <div>
                    <h2 style=${{ margin: '0 0 4px', fontSize: '1.5rem', color: '#1e293b' }}>
                        Blog Posts
                    </h2>
                    <p style=${{ margin: 0, color: '#64748b' }}>
                        Manage your marketing and SEO blog content
                    </p>
                </div>
                <button
                    onClick=${() => {
                        setEditingPost(null);
                        setTranslationGroupId(null);
                        setShowEditor(true);
                    }}
                    class="btn-primary"
                >
                    + New Post
                </button>
            </div>

            <!-- Filters -->
            <div style=${{
                display: 'flex',
                gap: '16px',
                marginBottom: '24px',
                flexWrap: 'wrap'
            }}>
                <div style=${{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick=${() => setFilter('all')}
                        style=${{
                            padding: '8px 16px',
                            border: 'none',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            background: filter === 'all' ? 'var(--petrol)' : '#f1f5f9',
                            color: filter === 'all' ? 'white' : '#475569'
                        }}
                    >
                        All (${posts.length})
                    </button>
                    <button
                        onClick=${() => setFilter('published')}
                        style=${{
                            padding: '8px 16px',
                            border: 'none',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            background: filter === 'published' ? 'var(--petrol)' : '#f1f5f9',
                            color: filter === 'published' ? 'white' : '#475569'
                        }}
                    >
                        Published (${posts.filter(p => p.status === 'published').length})
                    </button>
                    <button
                        onClick=${() => setFilter('draft')}
                        style=${{
                            padding: '8px 16px',
                            border: 'none',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            background: filter === 'draft' ? 'var(--petrol)' : '#f1f5f9',
                            color: filter === 'draft' ? 'white' : '#475569'
                        }}
                    >
                        Drafts (${posts.filter(p => p.status === 'draft').length})
                    </button>
                </div>

                <select
                    value=${languageFilter}
                    onChange=${(e) => setLanguageFilter(e.target.value)}
                    style=${{
                        padding: '8px 16px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        cursor: 'pointer'
                    }}
                >
                    <option value="all">All Languages</option>
                    ${BLOG_LANGUAGES.map(lang => html`
                        <option key=${lang.code} value=${lang.code}>
                            ${lang.flag} ${lang.name}
                        </option>
                    `)}
                </select>
            </div>

            <!-- Posts List -->
            ${filteredPosts.length === 0 ? html`
                <div style=${{
                    textAlign: 'center',
                    padding: '64px 0',
                    background: 'white',
                    borderRadius: '16px'
                }}>
                    <div style=${{ fontSize: '3rem', marginBottom: '16px' }}>📝</div>
                    <h3 style=${{ color: '#475569', marginBottom: '8px' }}>No posts yet</h3>
                    <p style=${{ color: '#94a3b8', marginBottom: '24px' }}>
                        Create your first blog post to start building your content library
                    </p>
                    <button
                        onClick=${() => setShowEditor(true)}
                        class="btn-primary"
                    >
                        Create First Post
                    </button>
                </div>
            ` : html`
                <div style=${{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    ${filteredPosts.map(post => html`
                        <${BlogPostCard}
                            key=${post.id}
                            post=${post}
                            onEdit=${handleEdit}
                            onDelete=${handleDelete}
                            onAddTranslation=${handleAddTranslation}
                            existingLanguages=${getExistingLanguages(post.post_group_id)}
                        />
                    `)}
                </div>
            `}
        </div>
    `;
};

export default AdminBlogManager;
