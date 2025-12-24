/**
 * AdminBlogEditor Component
 * Full-featured WYSIWYG blog editor for admin users
 * Supports rich text formatting, image uploads, tags, and multilingual posts
 */

import htm from '../../vendor/htm.js';
import { t, getCurrentLang } from '../../i18n.js';

const React = window.React;
const { useState, useEffect, useRef, useCallback } = React;
const html = htm.bind(React.createElement);

// Supported languages
const BLOG_LANGUAGES = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' }
];

// Predefined tag suggestions
const TAG_SUGGESTIONS = [
    'coaching', 'leadership', 'career', 'wellness', 'mindfulness',
    'executive', 'business', 'personal-development', 'motivation',
    'productivity', 'work-life-balance', 'communication', 'teamwork',
    'stress-management', 'goal-setting', 'success', 'growth'
];

/**
 * Rich Text Editor Toolbar
 */
const EditorToolbar = ({ editorRef }) => {
    const execCommand = (command, value = null) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
    };

    const insertLink = () => {
        const url = prompt('Enter URL:', 'https://');
        if (url) {
            execCommand('createLink', url);
        }
    };

    const insertImage = () => {
        const url = prompt('Enter image URL:', 'https://');
        if (url) {
            execCommand('insertImage', url);
        }
    };

    const formatBlock = (tag) => {
        execCommand('formatBlock', tag);
    };

    return html`
        <div class="editor-toolbar" style=${{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px',
            padding: '12px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            borderRadius: '8px 8px 0 0'
        }}>
            <!-- Text Formatting -->
            <div class="toolbar-group" style=${{ display: 'flex', gap: '2px' }}>
                <button type="button" onClick=${() => execCommand('bold')} class="toolbar-btn" title="Bold (Ctrl+B)">
                    <strong>B</strong>
                </button>
                <button type="button" onClick=${() => execCommand('italic')} class="toolbar-btn" title="Italic (Ctrl+I)">
                    <em>I</em>
                </button>
                <button type="button" onClick=${() => execCommand('underline')} class="toolbar-btn" title="Underline (Ctrl+U)">
                    <u>U</u>
                </button>
                <button type="button" onClick=${() => execCommand('strikeThrough')} class="toolbar-btn" title="Strikethrough">
                    <s>S</s>
                </button>
            </div>

            <div class="toolbar-divider" style=${{ width: '1px', background: '#e2e8f0', margin: '0 8px' }}></div>

            <!-- Headings -->
            <div class="toolbar-group" style=${{ display: 'flex', gap: '2px' }}>
                <button type="button" onClick=${() => formatBlock('<h2>')} class="toolbar-btn" title="Heading 2">
                    H2
                </button>
                <button type="button" onClick=${() => formatBlock('<h3>')} class="toolbar-btn" title="Heading 3">
                    H3
                </button>
                <button type="button" onClick=${() => formatBlock('<h4>')} class="toolbar-btn" title="Heading 4">
                    H4
                </button>
                <button type="button" onClick=${() => formatBlock('<p>')} class="toolbar-btn" title="Paragraph">
                    P
                </button>
            </div>

            <div class="toolbar-divider" style=${{ width: '1px', background: '#e2e8f0', margin: '0 8px' }}></div>

            <!-- Lists -->
            <div class="toolbar-group" style=${{ display: 'flex', gap: '2px' }}>
                <button type="button" onClick=${() => execCommand('insertUnorderedList')} class="toolbar-btn" title="Bullet List">
                    • List
                </button>
                <button type="button" onClick=${() => execCommand('insertOrderedList')} class="toolbar-btn" title="Numbered List">
                    1. List
                </button>
            </div>

            <div class="toolbar-divider" style=${{ width: '1px', background: '#e2e8f0', margin: '0 8px' }}></div>

            <!-- Alignment -->
            <div class="toolbar-group" style=${{ display: 'flex', gap: '2px' }}>
                <button type="button" onClick=${() => execCommand('justifyLeft')} class="toolbar-btn" title="Align Left">
                    ⬛
                </button>
                <button type="button" onClick=${() => execCommand('justifyCenter')} class="toolbar-btn" title="Align Center">
                    ⬛
                </button>
                <button type="button" onClick=${() => execCommand('justifyRight')} class="toolbar-btn" title="Align Right">
                    ⬛
                </button>
            </div>

            <div class="toolbar-divider" style=${{ width: '1px', background: '#e2e8f0', margin: '0 8px' }}></div>

            <!-- Insert -->
            <div class="toolbar-group" style=${{ display: 'flex', gap: '2px' }}>
                <button type="button" onClick=${insertLink} class="toolbar-btn" title="Insert Link">
                    🔗 Link
                </button>
                <button type="button" onClick=${insertImage} class="toolbar-btn" title="Insert Image">
                    🖼️ Image
                </button>
                <button type="button" onClick=${() => execCommand('insertHorizontalRule')} class="toolbar-btn" title="Horizontal Line">
                    ─
                </button>
            </div>

            <div class="toolbar-divider" style=${{ width: '1px', background: '#e2e8f0', margin: '0 8px' }}></div>

            <!-- Quote & Code -->
            <div class="toolbar-group" style=${{ display: 'flex', gap: '2px' }}>
                <button type="button" onClick=${() => formatBlock('<blockquote>')} class="toolbar-btn" title="Quote">
                    " Quote
                </button>
                <button type="button" onClick=${() => formatBlock('<pre>')} class="toolbar-btn" title="Code Block">
                    {'<>'} Code
                </button>
            </div>

            <div class="toolbar-divider" style=${{ width: '1px', background: '#e2e8f0', margin: '0 8px' }}></div>

            <!-- Clear -->
            <div class="toolbar-group" style=${{ display: 'flex', gap: '2px' }}>
                <button type="button" onClick=${() => execCommand('removeFormat')} class="toolbar-btn" title="Clear Formatting">
                    ✕ Clear
                </button>
            </div>
        </div>
    `;
};

/**
 * Tags Input Component
 */
const TagsInput = ({ tags, onChange }) => {
    const [inputValue, setInputValue] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    const addTag = (tag) => {
        const normalizedTag = tag.toLowerCase().trim().replace(/\s+/g, '-');
        if (normalizedTag && !tags.includes(normalizedTag)) {
            onChange([...tags, normalizedTag]);
        }
        setInputValue('');
        setShowSuggestions(false);
    };

    const removeTag = (tagToRemove) => {
        onChange(tags.filter(tag => tag !== tagToRemove));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(inputValue);
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
        }
    };

    const filteredSuggestions = TAG_SUGGESTIONS.filter(
        s => s.includes(inputValue.toLowerCase()) && !tags.includes(s)
    );

    return html`
        <div class="tags-input-container">
            <div style=${{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                background: 'white',
                minHeight: '50px'
            }}>
                ${tags.map(tag => html`
                    <span key=${tag} style=${{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        background: 'var(--petrol)',
                        color: 'white',
                        borderRadius: '20px',
                        fontSize: '0.85rem'
                    }}>
                        #${tag}
                        <button
                            type="button"
                            onClick=${() => removeTag(tag)}
                            style=${{
                                background: 'none',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                padding: 0,
                                fontSize: '1rem',
                                lineHeight: 1
                            }}
                        >×</button>
                    </span>
                `)}
                <input
                    type="text"
                    value=${inputValue}
                    onChange=${(e) => {
                        setInputValue(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onKeyDown=${handleKeyDown}
                    onFocus=${() => setShowSuggestions(true)}
                    onBlur=${() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder=${tags.length === 0 ? 'Add tags...' : ''}
                    style=${{
                        border: 'none',
                        outline: 'none',
                        flex: 1,
                        minWidth: '120px',
                        fontSize: '0.95rem'
                    }}
                />
            </div>
            ${showSuggestions && inputValue && filteredSuggestions.length > 0 && html`
                <div style=${{
                    position: 'absolute',
                    zIndex: 10,
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    marginTop: '4px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    maxHeight: '200px',
                    overflowY: 'auto'
                }}>
                    ${filteredSuggestions.slice(0, 8).map(suggestion => html`
                        <button
                            key=${suggestion}
                            type="button"
                            onClick=${() => addTag(suggestion)}
                            style=${{
                                display: 'block',
                                width: '100%',
                                padding: '10px 16px',
                                border: 'none',
                                background: 'none',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}
                            onMouseEnter=${(e) => e.target.style.background = '#f1f5f9'}
                            onMouseLeave=${(e) => e.target.style.background = 'none'}
                        >
                            #${suggestion}
                        </button>
                    `)}
                </div>
            `}
        </div>
    `;
};

/**
 * Featured Image Upload Component
 */
const FeaturedImageUpload = ({ imageUrl, onImageChange, session }) => {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileSelect = async (file) => {
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be less than 5MB');
            return;
        }

        setUploading(true);
        try {
            const supabase = window.supabaseClient;
            const fileExt = file.name.split('.').pop();
            const filePath = `blog/${Date.now()}.${fileExt}`;

            const { data, error } = await supabase.storage
                .from('public-assets')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            const { data: publicData } = supabase.storage
                .from('public-assets')
                .getPublicUrl(filePath);

            onImageChange(publicData.publicUrl);
        } catch (error) {
            console.error('Image upload failed:', error);
            alert('Failed to upload image. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return html`
        <div class="featured-image-upload">
            ${imageUrl ? html`
                <div style=${{
                    position: 'relative',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    marginBottom: '12px'
                }}>
                    <img
                        src=${imageUrl}
                        alt="Featured"
                        style=${{
                            width: '100%',
                            height: '200px',
                            objectFit: 'cover'
                        }}
                    />
                    <button
                        type="button"
                        onClick=${() => onImageChange('')}
                        style=${{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'rgba(0,0,0,0.7)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            cursor: 'pointer',
                            fontSize: '1.2rem'
                        }}
                    >×</button>
                </div>
            ` : html`
                <div
                    onClick=${() => fileInputRef.current?.click()}
                    style=${{
                        border: '2px dashed #cbd5e1',
                        borderRadius: '12px',
                        padding: '40px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: '#f8fafc',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter=${(e) => e.currentTarget.style.borderColor = 'var(--petrol)'}
                    onMouseLeave=${(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                >
                    ${uploading ? html`
                        <div style=${{ color: '#64748b' }}>Uploading...</div>
                    ` : html`
                        <div style=${{ fontSize: '2rem', marginBottom: '8px' }}>🖼️</div>
                        <div style=${{ color: '#64748b' }}>Click to upload featured image</div>
                        <div style=${{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '4px' }}>
                            Recommended: 1200x630px (max 5MB)
                        </div>
                    `}
                </div>
            `}
            <input
                ref=${fileInputRef}
                type="file"
                accept="image/*"
                onChange=${(e) => handleFileSelect(e.target.files[0])}
                style=${{ display: 'none' }}
            />
            <input
                type="text"
                placeholder="Or paste image URL..."
                value=${imageUrl || ''}
                onChange=${(e) => onImageChange(e.target.value)}
                style=${{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    marginTop: '8px',
                    fontSize: '0.9rem'
                }}
            />
        </div>
    `;
};

/**
 * Main Blog Editor Component
 */
export const AdminBlogEditor = ({ session, post = null, onSave, onCancel }) => {
    const [title, setTitle] = useState(post?.title || '');
    const [slug, setSlug] = useState(post?.slug || '');
    const [description, setDescription] = useState(post?.description || '');
    const [tags, setTags] = useState(post?.tags || []);
    const [featuredImage, setFeaturedImage] = useState(post?.featured_image_url || '');
    const [language, setLanguage] = useState(post?.language || getCurrentLang() || 'en');
    const [metaTitle, setMetaTitle] = useState(post?.meta_title || '');
    const [metaDescription, setMetaDescription] = useState(post?.meta_description || '');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [activeTab, setActiveTab] = useState('content'); // content, seo

    const editorRef = useRef(null);
    const existingGroupId = post?.post_group_id || null;

    // Initialize editor content
    useEffect(() => {
        if (editorRef.current && post?.body) {
            editorRef.current.innerHTML = post.body;
        }
    }, [post]);

    // Auto-generate slug from title
    useEffect(() => {
        if (!post?.id && title) {
            const generatedSlug = title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
            setSlug(generatedSlug);
        }
    }, [title, post?.id]);

    const handleSave = async (publish = false) => {
        if (!title.trim()) {
            setMessage('Error: Please enter a title');
            return;
        }

        const bodyContent = editorRef.current?.innerHTML || '';
        if (!bodyContent.trim() || bodyContent === '<br>') {
            setMessage('Error: Please enter content');
            return;
        }

        setSaving(true);
        setMessage('');

        try {
            const supabase = window.supabaseClient;

            const postData = {
                title: title.trim(),
                slug: slug || 'untitled',
                description: description.trim() || null,
                body: bodyContent,
                featured_image_url: featuredImage || null,
                tags: tags,
                language: language,
                meta_title: metaTitle.trim() || null,
                meta_description: metaDescription.trim() || null,
                status: publish ? 'published' : 'draft',
                author_id: session.user.id
            };

            if (publish && !post?.published_at) {
                postData.published_at = new Date().toISOString();
            }

            // If this is a translation, use existing group_id
            if (existingGroupId && !post?.id) {
                postData.post_group_id = existingGroupId;
            }

            let result;
            if (post?.id) {
                // Update existing post
                result = await supabase
                    .from('cs_blog_posts')
                    .update(postData)
                    .eq('id', post.id)
                    .select()
                    .single();
            } else {
                // Create new post
                result = await supabase
                    .from('cs_blog_posts')
                    .insert([postData])
                    .select()
                    .single();
            }

            if (result.error) throw result.error;

            setMessage(publish ? 'Post published successfully!' : 'Post saved as draft!');

            if (onSave) {
                setTimeout(() => onSave(result.data), 1000);
            }
        } catch (error) {
            console.error('Save failed:', error);
            setMessage('Error: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    return html`
        <div class="blog-editor" style=${{
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            overflow: 'hidden'
        }}>
            <!-- Header -->
            <div style=${{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 24px',
                borderBottom: '1px solid #e2e8f0'
            }}>
                <h2 style=${{ margin: 0, fontSize: '1.5rem', color: '#1e293b' }}>
                    ${post?.id ? 'Edit Blog Post' : 'New Blog Post'}
                </h2>
                <div style=${{ display: 'flex', gap: '12px' }}>
                    <button
                        type="button"
                        onClick=${onCancel}
                        disabled=${saving}
                        class="btn-secondary"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick=${() => handleSave(false)}
                        disabled=${saving}
                        class="btn-secondary"
                    >
                        ${saving ? 'Saving...' : 'Save Draft'}
                    </button>
                    <button
                        type="button"
                        onClick=${() => handleSave(true)}
                        disabled=${saving}
                        class="btn-primary"
                    >
                        ${saving ? 'Publishing...' : 'Publish'}
                    </button>
                </div>
            </div>

            <!-- Message -->
            ${message && html`
                <div style=${{
                    padding: '12px 24px',
                    background: message.includes('Error') ? '#fef2f2' : '#f0fdf4',
                    color: message.includes('Error') ? '#dc2626' : '#166534',
                    borderBottom: '1px solid #e2e8f0'
                }}>
                    ${message}
                </div>
            `}

            <!-- Tabs -->
            <div style=${{
                display: 'flex',
                borderBottom: '1px solid #e2e8f0',
                padding: '0 24px'
            }}>
                <button
                    type="button"
                    onClick=${() => setActiveTab('content')}
                    style=${{
                        padding: '16px 20px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        fontWeight: activeTab === 'content' ? 600 : 400,
                        color: activeTab === 'content' ? 'var(--petrol)' : '#64748b',
                        borderBottom: activeTab === 'content' ? '2px solid var(--petrol)' : '2px solid transparent',
                        marginBottom: '-1px'
                    }}
                >
                    Content
                </button>
                <button
                    type="button"
                    onClick=${() => setActiveTab('seo')}
                    style=${{
                        padding: '16px 20px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        fontWeight: activeTab === 'seo' ? 600 : 400,
                        color: activeTab === 'seo' ? 'var(--petrol)' : '#64748b',
                        borderBottom: activeTab === 'seo' ? '2px solid var(--petrol)' : '2px solid transparent',
                        marginBottom: '-1px'
                    }}
                >
                    SEO Settings
                </button>
            </div>

            <!-- Content -->
            <div style=${{ padding: '24px' }}>
                ${activeTab === 'content' ? html`
                    <div style=${{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                        <!-- Main Content Column -->
                        <div>
                            <!-- Title -->
                            <div style=${{ marginBottom: '20px' }}>
                                <label style=${{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                                    Title *
                                </label>
                                <input
                                    type="text"
                                    value=${title}
                                    onChange=${(e) => setTitle(e.target.value)}
                                    placeholder="Enter post title..."
                                    style=${{
                                        width: '100%',
                                        padding: '14px 16px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '1.25rem',
                                        fontWeight: 600
                                    }}
                                />
                            </div>

                            <!-- Description -->
                            <div style=${{ marginBottom: '20px' }}>
                                <label style=${{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                                    Description
                                </label>
                                <textarea
                                    value=${description}
                                    onChange=${(e) => setDescription(e.target.value)}
                                    placeholder="Brief description for previews..."
                                    rows="3"
                                    style=${{
                                        width: '100%',
                                        padding: '12px 16px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '0.95rem',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>

                            <!-- Body Editor -->
                            <div style=${{ marginBottom: '20px' }}>
                                <label style=${{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                                    Content *
                                </label>
                                <div style=${{
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    overflow: 'hidden'
                                }}>
                                    <${EditorToolbar} editorRef=${editorRef} />
                                    <div
                                        ref=${editorRef}
                                        contentEditable="true"
                                        style=${{
                                            minHeight: '400px',
                                            padding: '20px',
                                            outline: 'none',
                                            fontSize: '1rem',
                                            lineHeight: 1.7
                                        }}
                                        onPaste=${(e) => {
                                            // Clean up pasted content
                                            e.preventDefault();
                                            const text = e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain');
                                            document.execCommand('insertHTML', false, text);
                                        }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        <!-- Sidebar Column -->
                        <div>
                            <!-- Language -->
                            <div style=${{ marginBottom: '20px' }}>
                                <label style=${{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                                    Language
                                </label>
                                <select
                                    value=${language}
                                    onChange=${(e) => setLanguage(e.target.value)}
                                    disabled=${!!post?.id}
                                    style=${{
                                        width: '100%',
                                        padding: '12px 16px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '0.95rem',
                                        cursor: post?.id ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    ${BLOG_LANGUAGES.map(lang => html`
                                        <option key=${lang.code} value=${lang.code}>
                                            ${lang.flag} ${lang.name}
                                        </option>
                                    `)}
                                </select>
                            </div>

                            <!-- Slug -->
                            <div style=${{ marginBottom: '20px' }}>
                                <label style=${{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                                    URL Slug
                                </label>
                                <input
                                    type="text"
                                    value=${slug}
                                    onChange=${(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                    placeholder="url-friendly-slug"
                                    style=${{
                                        width: '100%',
                                        padding: '12px 16px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '0.95rem',
                                        fontFamily: 'monospace'
                                    }}
                                />
                                <div style=${{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                                    /blog/${language}/${slug || 'slug'}
                                </div>
                            </div>

                            <!-- Featured Image -->
                            <div style=${{ marginBottom: '20px' }}>
                                <label style=${{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                                    Featured Image
                                </label>
                                <${FeaturedImageUpload}
                                    imageUrl=${featuredImage}
                                    onImageChange=${setFeaturedImage}
                                    session=${session}
                                />
                            </div>

                            <!-- Tags -->
                            <div style=${{ marginBottom: '20px', position: 'relative' }}>
                                <label style=${{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                                    Tags
                                </label>
                                <${TagsInput}
                                    tags=${tags}
                                    onChange=${setTags}
                                />
                            </div>
                        </div>
                    </div>
                ` : html`
                    <!-- SEO Tab -->
                    <div style=${{ maxWidth: '600px' }}>
                        <div style=${{ marginBottom: '20px' }}>
                            <label style=${{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                                Meta Title
                            </label>
                            <input
                                type="text"
                                value=${metaTitle}
                                onChange=${(e) => setMetaTitle(e.target.value)}
                                placeholder=${title || 'SEO title for search engines...'}
                                maxLength="60"
                                style=${{
                                    width: '100%',
                                    padding: '12px 16px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '0.95rem'
                                }}
                            />
                            <div style=${{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                                ${(metaTitle || title).length}/60 characters
                            </div>
                        </div>

                        <div style=${{ marginBottom: '20px' }}>
                            <label style=${{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                                Meta Description
                            </label>
                            <textarea
                                value=${metaDescription}
                                onChange=${(e) => setMetaDescription(e.target.value)}
                                placeholder=${description || 'SEO description for search results...'}
                                maxLength="160"
                                rows="3"
                                style=${{
                                    width: '100%',
                                    padding: '12px 16px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '0.95rem',
                                    resize: 'vertical'
                                }}
                            />
                            <div style=${{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                                ${(metaDescription || description).length}/160 characters
                            </div>
                        </div>

                        <!-- SEO Preview -->
                        <div style=${{
                            padding: '20px',
                            background: '#f8fafc',
                            borderRadius: '8px',
                            marginTop: '24px'
                        }}>
                            <div style=${{ fontSize: '0.8rem', color: '#64748b', marginBottom: '8px' }}>
                                Search Engine Preview:
                            </div>
                            <div style=${{ color: '#1a0dab', fontSize: '1.1rem', marginBottom: '4px' }}>
                                ${metaTitle || title || 'Page Title'}
                            </div>
                            <div style=${{ color: '#006621', fontSize: '0.85rem', marginBottom: '4px' }}>
                                coachsearching.com/blog/${language}/${slug || 'slug'}
                            </div>
                            <div style=${{ color: '#545454', fontSize: '0.9rem' }}>
                                ${metaDescription || description || 'Page description will appear here...'}
                            </div>
                        </div>
                    </div>
                `}
            </div>
        </div>
    `;
};

export default AdminBlogEditor;
