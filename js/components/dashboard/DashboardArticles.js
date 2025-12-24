/**
 * DashboardArticles Component
 * Article management for coaches with WYSIWYG editor
 * Supports multilingual articles with unique URLs per language
 */

import htm from '../../vendor/htm.js';
import { t, getCurrentLang } from '../../i18n.js';

const React = window.React;
const { useState, useEffect, useRef } = React;
const html = htm.bind(React.createElement);

// Supported languages for articles
const ARTICLE_LANGUAGES = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' }
];

/**
 * ArticleEditor Component
 * WYSIWYG editor for creating and editing articles
 */
const ArticleEditor = ({ session, article, onClose, existingArticleGroupId = null }) => {
    const [title, setTitle] = useState(article?.title || '');
    const [excerpt, setExcerpt] = useState(article?.excerpt || '');
    const [language, setLanguage] = useState(article?.language || getCurrentLang() || 'en');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const editorRef = useRef(null);

    // Check if this is a translation (has existingArticleGroupId but no article.id)
    const isTranslation = existingArticleGroupId && !article?.id;

    // Initialize WYSIWYG editor content
    useEffect(() => {
        if (editorRef.current && article?.content_html) {
            editorRef.current.innerHTML = article.content_html;
        }
    }, [article]);

    // WYSIWYG formatting functions using contenteditable
    const formatBold = () => {
        document.execCommand('bold', false, null);
        editorRef.current?.focus();
    };

    const formatItalic = () => {
        document.execCommand('italic', false, null);
        editorRef.current?.focus();
    };

    const formatHeading2 = () => {
        document.execCommand('formatBlock', false, '<h2>');
        editorRef.current?.focus();
    };

    const formatHeading3 = () => {
        document.execCommand('formatBlock', false, '<h3>');
        editorRef.current?.focus();
    };

    const formatBulletList = () => {
        document.execCommand('insertUnorderedList', false, null);
        editorRef.current?.focus();
    };

    const formatNumberedList = () => {
        document.execCommand('insertOrderedList', false, null);
        editorRef.current?.focus();
    };

    const formatLink = () => {
        const url = prompt('Enter URL:');
        if (url) {
            document.execCommand('createLink', false, url);
            editorRef.current?.focus();
        }
    };

    const handleSave = async (publishNow = false) => {
        if (!title.trim()) {
            setMessage('Error: Please enter a title');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        const contentHTML = editorRef.current?.innerHTML || '';
        const plainText = editorRef.current?.innerText || '';

        if (!plainText.trim()) {
            setMessage('Error: Please enter content');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        setSaving(true);
        setMessage('');

        try {
            console.log('Starting article save...');

            // Generate slug from title
            const slug = title.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');

            // Get coach_id from cs_coaches table
            console.log('Fetching coach data for user:', session.user.id);
            const { data: coachData, error: coachError } = await window.supabaseClient
                .from('cs_coaches')
                .select('id')
                .eq('user_id', session.user.id)
                .single();

            if (coachError) {
                console.error('Coach fetch error:', coachError);
                throw new Error('Coach profile not found. Please complete your profile first.');
            }

            console.log('Coach ID:', coachData.id);

            const articleData = {
                coach_id: coachData.id,
                title: title.trim(),
                slug: slug || 'untitled',
                content_html: contentHTML,
                excerpt: excerpt.trim() || plainText.substring(0, 200),
                status: publishNow ? 'published' : 'draft',
                language: language,
            };

            // If creating a translation, use the existing article_group_id
            if (isTranslation && existingArticleGroupId) {
                articleData.article_group_id = existingArticleGroupId;
            }

            console.log('Article data prepared:', { ...articleData, content_html: contentHTML.substring(0, 100) + '...' });

            let result;
            if (article?.id) {
                // Update existing article
                console.log('Updating existing article:', article.id);
                result = await window.supabaseClient
                    .from('cs_articles')
                    .update(articleData)
                    .eq('id', article.id)
                    .select();
            } else {
                // Create new article
                console.log('Creating new article');
                result = await window.supabaseClient
                    .from('cs_articles')
                    .insert([articleData])
                    .select();
            }

            if (result.error) {
                console.error('Supabase error:', result.error);
                throw result.error;
            }

            console.log('Article saved successfully!', result.data);
            setMessage(publishNow ? 'Article published successfully!' : 'Article saved as draft!');
            setTimeout(() => {
                setMessage('');
                if (onClose) onClose();
            }, 1500);

        } catch (error) {
            console.error('Failed to save article:', error);
            setMessage('Error: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    return html`
        <div class="article-editor-modern">
            ${message && html`
                <div class="message ${message.includes('Error') ? 'message-error' : 'message-success'}">
                    ${message}
                </div>
            `}

            <div class="editor-container">
                <!-- Language Selector -->
                <div class="editor-language-selector" style=${{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '16px',
                    padding: '12px 16px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                }}>
                    <label style=${{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>
                        ${t('article.language') || 'Article Language'}:
                    </label>
                    <select
                        class="premium-input"
                        value=${language}
                        onChange=${(e) => setLanguage(e.target.value)}
                        disabled=${!!article?.id}
                        style=${{
                            width: 'auto',
                            minWidth: '180px',
                            padding: '8px 12px',
                            cursor: article?.id ? 'not-allowed' : 'pointer'
                        }}
                    >
                        ${ARTICLE_LANGUAGES.map(lang => html`
                            <option key=${lang.code} value=${lang.code}>
                                ${lang.flag} ${lang.name}
                            </option>
                        `)}
                    </select>
                    ${isTranslation && html`
                        <span style=${{ color: 'var(--petrol)', fontSize: '0.85rem' }}>
                            ${t('article.creatingTranslation') || 'Creating translation'}
                        </span>
                    `}
                    ${article?.id && html`
                        <span style=${{ color: '#64748b', fontSize: '0.85rem' }}>
                            ${t('article.languageLocked') || 'Language cannot be changed after creation'}
                        </span>
                    `}
                </div>

                <!-- Title Input -->
                <input
                    type="text"
                    class="editor-title-input"
                    placeholder=${t('article.titlePlaceholder') || 'Article Title'}
                    value=${title}
                    onChange=${(e) => setTitle(e.target.value)}
                />

                <!-- Excerpt Input -->
                <input
                    type="text"
                    class="editor-excerpt-input"
                    placeholder=${t('article.excerptPlaceholder') || 'Short excerpt (optional - will auto-generate from content)'}
                    value=${excerpt}
                    onChange=${(e) => setExcerpt(e.target.value)}
                />

                <!-- Formatting Toolbar -->
                <div class="formatting-toolbar">
                    <div class="toolbar-group">
                        <button
                            class="toolbar-btn"
                            onClick=${formatBold}
                            title="Bold (Ctrl+B)"
                        >
                            <strong>B</strong>
                        </button>
                        <button
                            class="toolbar-btn"
                            onClick=${formatItalic}
                            title="Italic (Ctrl+I)"
                        >
                            <em>I</em>
                        </button>
                    </div>

                    <div class="toolbar-divider"></div>

                    <div class="toolbar-group">
                        <button
                            class="toolbar-btn"
                            onClick=${formatHeading2}
                            title="Heading 2"
                        >
                            H2
                        </button>
                        <button
                            class="toolbar-btn"
                            onClick=${formatHeading3}
                            title="Heading 3"
                        >
                            H3
                        </button>
                    </div>

                    <div class="toolbar-divider"></div>

                    <div class="toolbar-group">
                        <button
                            class="toolbar-btn"
                            onClick=${formatBulletList}
                            title="Bullet List"
                        >
                            List
                        </button>
                        <button
                            class="toolbar-btn"
                            onClick=${formatNumberedList}
                            title="Numbered List"
                        >
                            1. List
                        </button>
                    </div>

                    <div class="toolbar-divider"></div>

                    <div class="toolbar-group">
                        <button
                            class="toolbar-btn"
                            onClick=${formatLink}
                            title="Insert Link"
                        >
                            Link
                        </button>
                    </div>

                </div>

                <!-- WYSIWYG Editor -->
                <div
                    ref=${editorRef}
                    class="wysiwyg-editor"
                    contenteditable="true"
                    placeholder="Start writing your article here... Use the toolbar above to format your text."
                ></div>

                <!-- Action Buttons -->
                <div class="editor-actions">
                    <button
                        class="btn-secondary"
                        onClick=${() => onClose && onClose()}
                        disabled=${saving}
                    >
                        Back to Articles
                    </button>

                    <div class="editor-actions-right">
                        <button
                            class="btn-secondary"
                            onClick=${() => handleSave(false)}
                            disabled=${saving}
                        >
                            ${saving ? 'Saving...' : 'Save as Draft'}
                        </button>
                        <button
                            class="btn-primary"
                            onClick=${() => handleSave(true)}
                            disabled=${saving}
                        >
                            ${saving ? 'Publishing...' : 'Publish Article'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
};

// Helper to get language info
const getLanguageInfo = (code) => {
    return ARTICLE_LANGUAGES.find(l => l.code === code) || { code, name: code, flag: '🌐' };
};

/**
 * DashboardArticles Component
 * @param {Object} props
 * @param {Object} props.session - User session
 */
export const DashboardArticles = ({ session }) => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showEditor, setShowEditor] = useState(false);
    const [editingArticle, setEditingArticle] = useState(null);
    const [translationGroupId, setTranslationGroupId] = useState(null);

    useEffect(() => {
        loadArticles();
    }, []);

    const loadArticles = async () => {
        setLoading(true);
        try {
            if (window.supabaseClient && session) {
                // First get coach_id from cs_coaches table
                const { data: coachData } = await window.supabaseClient
                    .from('cs_coaches')
                    .select('id')
                    .eq('user_id', session.user.id)
                    .single();

                if (coachData) {
                    const { data, error } = await window.supabaseClient
                        .from('cs_articles')
                        .select('*')
                        .eq('coach_id', coachData.id)
                        .order('created_at', { ascending: false });

                    if (!error && data) {
                        setArticles(data);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load articles:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (article) => {
        setEditingArticle(article);
        setShowEditor(true);
    };

    const handleDelete = async (articleId) => {
        if (!confirm('Are you sure you want to delete this article?')) {
            return;
        }

        try {
            const { error } = await window.supabaseClient
                .from('cs_articles')
                .delete()
                .eq('id', articleId);

            if (!error) {
                await loadArticles();
            }
        } catch (error) {
            console.error('Failed to delete article:', error);
            alert('Failed to delete article');
        }
    };

    const handleTogglePublish = async (article) => {
        try {
            const newStatus = article.status === 'published' ? 'draft' : 'published';
            const { error } = await window.supabaseClient
                .from('cs_articles')
                .update({ status: newStatus })
                .eq('id', article.id);

            if (!error) {
                await loadArticles();
            }
        } catch (error) {
            console.error('Failed to update article:', error);
        }
    };

    const handleCloseEditor = () => {
        setShowEditor(false);
        setEditingArticle(null);
        setTranslationGroupId(null);
        loadArticles();
    };

    const handleAddTranslation = (article) => {
        // Open editor for new translation with the same article_group_id
        setEditingArticle(null);
        setTranslationGroupId(article.article_group_id);
        setShowEditor(true);
    };

    // Get existing translations for an article
    const getExistingLanguages = (articleGroupId) => {
        return articles
            .filter(a => a.article_group_id === articleGroupId)
            .map(a => a.language);
    };

    // Get missing translations for an article
    const getMissingLanguages = (articleGroupId) => {
        const existing = getExistingLanguages(articleGroupId);
        return ARTICLE_LANGUAGES.filter(l => !existing.includes(l.code));
    };

    if (loading) {
        return html`
            <div class="articles-loading">
                ${[1, 2].map(i => html`
                    <div key=${i} class="article-card skeleton-card">
                        <div class="skeleton-line" style=${{ width: '70%', height: '24px', marginBottom: '12px' }}></div>
                        <div class="skeleton-line" style=${{ width: '100%', height: '14px', marginBottom: '8px' }}></div>
                        <div class="skeleton-line" style=${{ width: '90%', height: '14px' }}></div>
                    </div>
                `)}
            </div>
        `;
    }

    return html`
        <div class="articles-container">
            <div class="articles-header">
                <h3 class="section-subtitle">${t('dashboard.articles')}</h3>
                <button class="btn-primary" onClick=${() => {
                    setEditingArticle(null);
                    setShowEditor(!showEditor);
                }}>
                    ${showEditor ? 'Close Editor' : 'Write New Article'}
                </button>
            </div>

            ${showEditor && html`
                <${ArticleEditor}
                    session=${session}
                    article=${editingArticle}
                    onClose=${handleCloseEditor}
                    existingArticleGroupId=${translationGroupId}
                />
            `}

            ${!showEditor && articles.length === 0 && html`
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <div class="empty-state-text">No articles yet</div>
                    <div class="empty-state-subtext">Create your first article to share your expertise!</div>
                    <button class="btn-primary" style=${{ marginTop: '16px' }} onClick=${() => setShowEditor(true)}>
                        Write Your First Article
                    </button>
                </div>
            `}

            ${!showEditor && articles.length > 0 && html`
                <div class="articles-list">
                    ${articles.map(article => {
                        const langInfo = getLanguageInfo(article.language);
                        const missingLangs = getMissingLanguages(article.article_group_id);
                        const existingLangs = getExistingLanguages(article.article_group_id);

                        return html`
                            <div key=${article.id} class="article-card">
                                <div class="article-card-header">
                                    <div class="article-card-title">
                                        <h4>${article.title}</h4>
                                        <div style=${{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <!-- Language Badge -->
                                            <span class="language-badge" style=${{
                                                background: '#e0f2fe',
                                                color: '#0369a1',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600
                                            }}>
                                                ${langInfo.flag} ${langInfo.code.toUpperCase()}
                                            </span>
                                            <!-- Status Badge -->
                                            <span class="status-badge ${article.status === 'published' ? 'status-confirmed' : 'status-pending'}">
                                                ${article.status === 'published' ? 'Published' : 'Draft'}
                                            </span>
                                            <!-- Translation indicators -->
                                            ${existingLangs.length > 1 && html`
                                                <span style=${{
                                                    background: '#f0fdf4',
                                                    color: '#166534',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.75rem'
                                                }}>
                                                    ${existingLangs.length} ${t('article.languages') || 'languages'}
                                                </span>
                                            `}
                                        </div>
                                    </div>
                                    <div class="article-card-meta">
                                        <span>${new Date(article.created_at).toLocaleDateString()}</span>
                                        ${article.view_count > 0 && html`
                                            <span>${article.view_count} ${t('article.views') || 'views'}</span>
                                        `}
                                    </div>
                                </div>

                                <div class="article-card-excerpt">
                                    ${article.excerpt || (article.content_html ? article.content_html.replace(/<[^>]*>/g, '').substring(0, 150) + '...' : '')}
                                </div>

                                <!-- Article URL Preview -->
                                <div style=${{
                                    fontSize: '0.8rem',
                                    color: '#64748b',
                                    marginBottom: '12px',
                                    fontFamily: 'monospace',
                                    background: '#f8fafc',
                                    padding: '6px 10px',
                                    borderRadius: '4px'
                                }}>
                                    /blog/${article.language}/${article.slug}
                                </div>

                                <div class="article-card-actions" style=${{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    <button class="btn-small btn-secondary" onClick=${() => handleEdit(article)}>
                                        ${t('common.edit') || 'Edit'}
                                    </button>
                                    <button
                                        class="btn-small ${article.status === 'published' ? 'btn-secondary' : 'btn-primary'}"
                                        onClick=${() => handleTogglePublish(article)}
                                    >
                                        ${article.status === 'published' ? (t('article.unpublish') || 'Unpublish') : (t('article.publish') || 'Publish')}
                                    </button>
                                    ${missingLangs.length > 0 && html`
                                        <button
                                            class="btn-small"
                                            style=${{
                                                background: '#f0f9ff',
                                                color: '#0369a1',
                                                border: '1px solid #bae6fd'
                                            }}
                                            onClick=${() => handleAddTranslation(article)}
                                        >
                                            + ${t('article.addTranslation') || 'Add Translation'}
                                        </button>
                                    `}
                                    <button class="btn-small btn-danger" onClick=${() => handleDelete(article.id)}>
                                        ${t('common.delete') || 'Delete'}
                                    </button>
                                </div>
                            </div>
                        `;
                    })}
                </div>
            `}
        </div>
    `;
};

export default DashboardArticles;
