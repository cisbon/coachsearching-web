/**
 * BlogPage Component
 * Displays blog posts with multilingual support
 * Routes: /blog, /blog/{lang}, /blog/{lang}/{slug}
 */

import htm from '../vendor/htm.js';
import { t, getCurrentLang } from '../i18n.js';
import { useRouter } from '../components/Router.js';

const React = window.React;
const { useState, useEffect, useMemo } = React;
const html = htm.bind(React.createElement);

// Supported languages
const BLOG_LANGUAGES = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' }
];

/**
 * Blog Listing Page
 * Shows all published articles for a given language
 */
const BlogListPage = ({ language }) => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadArticles();
    }, [language]);

    const loadArticles = async () => {
        setLoading(true);
        try {
            const { data, error } = await window.supabaseClient
                .from('cs_articles')
                .select(`
                    *,
                    coach:cs_coaches(id, full_name, avatar_url, title, slug)
                `)
                .eq('status', 'published')
                .eq('language', language)
                .order('published_at', { ascending: false });

            if (!error && data) {
                setArticles(data);
            }
        } catch (error) {
            console.error('Failed to load articles:', error);
        } finally {
            setLoading(false);
        }
    };

    const langInfo = BLOG_LANGUAGES.find(l => l.code === language) || BLOG_LANGUAGES[0];

    if (loading) {
        return html`
            <div class="blog-page">
                <div class="container">
                    <div class="blog-loading">
                        ${[1, 2, 3].map(i => html`
                            <div key=${i} class="article-skeleton">
                                <div class="skeleton-line" style=${{ width: '100%', height: '200px', marginBottom: '16px' }}></div>
                                <div class="skeleton-line" style=${{ width: '70%', height: '24px', marginBottom: '12px' }}></div>
                                <div class="skeleton-line" style=${{ width: '100%', height: '14px', marginBottom: '8px' }}></div>
                                <div class="skeleton-line" style=${{ width: '90%', height: '14px' }}></div>
                            </div>
                        `)}
                    </div>
                </div>
            </div>
        `;
    }

    return html`
        <div class="blog-page">
            <div class="container">
                <!-- Blog Header -->
                <div class="blog-header" style=${{
                    textAlign: 'center',
                    padding: '48px 0',
                    borderBottom: '1px solid #e2e8f0',
                    marginBottom: '48px'
                }}>
                    <h1 style=${{ fontSize: '2.5rem', marginBottom: '16px', color: '#1e293b' }}>
                        ${t('blog.title') || 'Coaching Insights & Articles'}
                    </h1>
                    <p style=${{ fontSize: '1.1rem', color: '#64748b', maxWidth: '600px', margin: '0 auto 24px' }}>
                        ${t('blog.subtitle') || 'Expert perspectives and practical advice from professional coaches'}
                    </p>

                    <!-- Language Selector -->
                    <div class="blog-language-selector" style=${{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '8px',
                        flexWrap: 'wrap'
                    }}>
                        ${BLOG_LANGUAGES.map(lang => html`
                            <a
                                key=${lang.code}
                                href="#blog/${lang.code}"
                                style=${{
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    textDecoration: 'none',
                                    fontSize: '0.9rem',
                                    fontWeight: language === lang.code ? 600 : 400,
                                    background: language === lang.code ? 'var(--petrol)' : '#f1f5f9',
                                    color: language === lang.code ? 'white' : '#475569',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                ${lang.flag} ${lang.name}
                            </a>
                        `)}
                    </div>
                </div>

                <!-- Articles Grid -->
                ${articles.length === 0 ? html`
                    <div class="empty-state" style=${{ textAlign: 'center', padding: '64px 0' }}>
                        <div style=${{ fontSize: '3rem', marginBottom: '16px' }}>📝</div>
                        <h3 style=${{ color: '#475569', marginBottom: '8px' }}>
                            ${t('blog.noArticles') || 'No articles yet'}
                        </h3>
                        <p style=${{ color: '#94a3b8' }}>
                            ${t('blog.noArticlesDesc') || 'Check back soon for new content from our coaches'}
                        </p>
                    </div>
                ` : html`
                    <div class="articles-grid" style=${{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                        gap: '32px'
                    }}>
                        ${articles.map(article => html`
                            <${ArticleCard}
                                key=${article.id}
                                article=${article}
                                language=${language}
                            />
                        `)}
                    </div>
                `}
            </div>
        </div>
    `;
};

/**
 * Article Card Component
 */
const ArticleCard = ({ article, language }) => {
    const coach = article.coach;
    const readTime = Math.ceil((article.content_html?.replace(/<[^>]*>/g, '').length || 0) / 1000);

    return html`
        <article class="article-card" style=${{
            background: 'white',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}>
            ${article.featured_image_url && html`
                <a href="#blog/${language}/${article.slug}">
                    <img
                        src=${article.featured_image_url}
                        alt=${article.title}
                        style=${{
                            width: '100%',
                            height: '200px',
                            objectFit: 'cover'
                        }}
                    />
                </a>
            `}
            <div style=${{ padding: '24px' }}>
                <!-- Author Info -->
                ${coach && html`
                    <a
                        href="#coach/${coach.slug || coach.id}"
                        style=${{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '16px',
                            textDecoration: 'none'
                        }}
                    >
                        <img
                            src=${coach.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${coach.id}`}
                            alt=${coach.full_name}
                            style=${{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                objectFit: 'cover'
                            }}
                        />
                        <div>
                            <div style=${{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>
                                ${coach.full_name}
                            </div>
                            <div style=${{ fontSize: '0.8rem', color: '#64748b' }}>
                                ${coach.title}
                            </div>
                        </div>
                    </a>
                `}

                <!-- Article Title -->
                <a
                    href="#blog/${language}/${article.slug}"
                    style=${{ textDecoration: 'none' }}
                >
                    <h2 style=${{
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        color: '#1e293b',
                        marginBottom: '12px',
                        lineHeight: 1.3
                    }}>
                        ${article.title}
                    </h2>
                </a>

                <!-- Excerpt -->
                <p style=${{
                    color: '#64748b',
                    fontSize: '0.95rem',
                    lineHeight: 1.6,
                    marginBottom: '16px'
                }}>
                    ${article.excerpt || article.content_html?.replace(/<[^>]*>/g, '').substring(0, 150) + '...'}
                </p>

                <!-- Meta -->
                <div style=${{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    fontSize: '0.85rem',
                    color: '#94a3b8'
                }}>
                    <span>
                        ${article.published_at ? new Date(article.published_at).toLocaleDateString() : ''}
                    </span>
                    <span>${readTime} ${t('blog.minRead') || 'min read'}</span>
                    ${article.view_count > 0 && html`
                        <span>${article.view_count} ${t('blog.views') || 'views'}</span>
                    `}
                </div>
            </div>
        </article>
    `;
};

/**
 * Single Article Page
 * Displays a full article with author info and translations
 */
const ArticleDetailPage = ({ language, slug }) => {
    const [article, setArticle] = useState(null);
    const [translations, setTranslations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        loadArticle();
    }, [language, slug]);

    const loadArticle = async () => {
        setLoading(true);
        setNotFound(false);

        try {
            // Load the article
            const { data, error } = await window.supabaseClient
                .from('cs_articles')
                .select(`
                    *,
                    coach:cs_coaches(id, full_name, avatar_url, title, slug, bio)
                `)
                .eq('slug', slug)
                .eq('language', language)
                .eq('status', 'published')
                .single();

            if (error || !data) {
                setNotFound(true);
                return;
            }

            setArticle(data);

            // Increment view count
            await window.supabaseClient
                .from('cs_articles')
                .update({ view_count: (data.view_count || 0) + 1 })
                .eq('id', data.id);

            // Load translations
            if (data.article_group_id) {
                const { data: transData } = await window.supabaseClient
                    .from('cs_articles')
                    .select('id, language, slug, title')
                    .eq('article_group_id', data.article_group_id)
                    .eq('status', 'published')
                    .neq('id', data.id);

                if (transData) {
                    setTranslations(transData);
                }
            }
        } catch (error) {
            console.error('Failed to load article:', error);
            setNotFound(true);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return html`
            <div class="blog-page">
                <div class="container" style=${{ maxWidth: '800px' }}>
                    <div class="article-loading" style=${{ padding: '48px 0' }}>
                        <div class="skeleton-line" style=${{ width: '100%', height: '300px', marginBottom: '32px' }}></div>
                        <div class="skeleton-line" style=${{ width: '80%', height: '40px', marginBottom: '24px' }}></div>
                        <div class="skeleton-line" style=${{ width: '100%', height: '16px', marginBottom: '12px' }}></div>
                        <div class="skeleton-line" style=${{ width: '100%', height: '16px', marginBottom: '12px' }}></div>
                        <div class="skeleton-line" style=${{ width: '90%', height: '16px' }}></div>
                    </div>
                </div>
            </div>
        `;
    }

    if (notFound) {
        return html`
            <div class="blog-page">
                <div class="container" style=${{ maxWidth: '800px', textAlign: 'center', padding: '96px 0' }}>
                    <div style=${{ fontSize: '4rem', marginBottom: '24px' }}>📄</div>
                    <h1 style=${{ fontSize: '2rem', color: '#1e293b', marginBottom: '16px' }}>
                        ${t('blog.articleNotFound') || 'Article Not Found'}
                    </h1>
                    <p style=${{ color: '#64748b', marginBottom: '24px' }}>
                        ${t('blog.articleNotFoundDesc') || 'The article you\'re looking for doesn\'t exist or has been removed.'}
                    </p>
                    <a
                        href="#blog/${language}"
                        style=${{
                            display: 'inline-block',
                            padding: '12px 24px',
                            background: 'var(--petrol)',
                            color: 'white',
                            borderRadius: '8px',
                            textDecoration: 'none'
                        }}
                    >
                        ${t('blog.backToBlog') || 'Back to Blog'}
                    </a>
                </div>
            </div>
        `;
    }

    const coach = article?.coach;
    const readTime = Math.ceil((article?.content_html?.replace(/<[^>]*>/g, '').length || 0) / 1000);
    const currentLangInfo = BLOG_LANGUAGES.find(l => l.code === language);

    return html`
        <div class="blog-page">
            <article class="article-detail" style=${{ maxWidth: '800px', margin: '0 auto', padding: '0 16px' }}>
                <!-- Back Link -->
                <a
                    href="#blog/${language}"
                    style=${{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#64748b',
                        textDecoration: 'none',
                        marginBottom: '24px',
                        marginTop: '24px'
                    }}
                >
                    ← ${t('blog.backToBlog') || 'Back to Blog'}
                </a>

                <!-- Featured Image -->
                ${article.featured_image_url && html`
                    <img
                        src=${article.featured_image_url}
                        alt=${article.title}
                        style=${{
                            width: '100%',
                            height: '400px',
                            objectFit: 'cover',
                            borderRadius: '16px',
                            marginBottom: '32px'
                        }}
                    />
                `}

                <!-- Article Header -->
                <header style=${{ marginBottom: '32px' }}>
                    <h1 style=${{
                        fontSize: '2.5rem',
                        fontWeight: 700,
                        color: '#1e293b',
                        lineHeight: 1.2,
                        marginBottom: '24px'
                    }}>
                        ${article.title}
                    </h1>

                    <!-- Author & Meta -->
                    ${coach && html`
                        <div style=${{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            flexWrap: 'wrap',
                            marginBottom: '24px'
                        }}>
                            <a
                                href="#coach/${coach.slug || coach.id}"
                                style=${{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    textDecoration: 'none'
                                }}
                            >
                                <img
                                    src=${coach.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${coach.id}`}
                                    alt=${coach.full_name}
                                    style=${{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '50%',
                                        objectFit: 'cover'
                                    }}
                                />
                                <div>
                                    <div style=${{ fontWeight: 600, color: '#1e293b' }}>
                                        ${coach.full_name}
                                    </div>
                                    <div style=${{ fontSize: '0.9rem', color: '#64748b' }}>
                                        ${coach.title}
                                    </div>
                                </div>
                            </a>
                            <div style=${{
                                display: 'flex',
                                gap: '16px',
                                color: '#94a3b8',
                                fontSize: '0.9rem'
                            }}>
                                <span>${article.published_at ? new Date(article.published_at).toLocaleDateString() : ''}</span>
                                <span>${readTime} ${t('blog.minRead') || 'min read'}</span>
                            </div>
                        </div>
                    `}

                    <!-- Language Switcher for Translations -->
                    ${translations.length > 0 && html`
                        <div style=${{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '16px',
                            background: '#f8fafc',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0'
                        }}>
                            <span style=${{ color: '#64748b', fontSize: '0.9rem' }}>
                                ${t('blog.alsoAvailableIn') || 'Also available in'}:
                            </span>
                            <div style=${{ display: 'flex', gap: '8px' }}>
                                ${translations.map(trans => {
                                    const langInfo = BLOG_LANGUAGES.find(l => l.code === trans.language);
                                    return html`
                                        <a
                                            key=${trans.id}
                                            href="#blog/${trans.language}/${trans.slug}"
                                            style=${{
                                                padding: '6px 12px',
                                                background: 'white',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '6px',
                                                textDecoration: 'none',
                                                fontSize: '0.85rem',
                                                color: '#475569'
                                            }}
                                        >
                                            ${langInfo?.flag || '🌐'} ${langInfo?.name || trans.language}
                                        </a>
                                    `;
                                })}
                            </div>
                        </div>
                    `}
                </header>

                <!-- Article Content -->
                <div
                    class="article-content prose"
                    style=${{
                        fontSize: '1.1rem',
                        lineHeight: 1.8,
                        color: '#374151'
                    }}
                    dangerouslySetInnerHTML=${{ __html: article.content_html }}
                ></div>

                <!-- Author Bio -->
                ${coach && html`
                    <div style=${{
                        marginTop: '48px',
                        padding: '24px',
                        background: '#f8fafc',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div style=${{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                            <a href="#coach/${coach.slug || coach.id}">
                                <img
                                    src=${coach.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${coach.id}`}
                                    alt=${coach.full_name}
                                    style=${{
                                        width: '64px',
                                        height: '64px',
                                        borderRadius: '50%',
                                        objectFit: 'cover'
                                    }}
                                />
                            </a>
                            <div style=${{ flex: 1 }}>
                                <div style=${{ fontWeight: 600, color: '#1e293b', fontSize: '1.1rem', marginBottom: '4px' }}>
                                    ${t('blog.aboutAuthor') || 'About the Author'}
                                </div>
                                <a
                                    href="#coach/${coach.slug || coach.id}"
                                    style=${{ color: 'var(--petrol)', textDecoration: 'none', fontWeight: 500 }}
                                >
                                    ${coach.full_name}
                                </a>
                                <div style=${{ fontSize: '0.9rem', color: '#64748b', marginTop: '4px' }}>
                                    ${coach.title}
                                </div>
                                ${coach.bio && html`
                                    <p style=${{ color: '#475569', marginTop: '12px', fontSize: '0.95rem', lineHeight: 1.6 }}>
                                        ${coach.bio.substring(0, 200)}${coach.bio.length > 200 ? '...' : ''}
                                    </p>
                                `}
                                <a
                                    href="#coach/${coach.slug || coach.id}"
                                    style=${{
                                        display: 'inline-block',
                                        marginTop: '12px',
                                        padding: '8px 16px',
                                        background: 'var(--petrol)',
                                        color: 'white',
                                        borderRadius: '6px',
                                        textDecoration: 'none',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    ${t('blog.viewProfile') || 'View Profile'}
                                </a>
                            </div>
                        </div>
                    </div>
                `}
            </article>
        </div>
    `;
};

/**
 * Main BlogPage Component
 * Routes to list or detail based on URL
 */
export const BlogPage = () => {
    const { route } = useRouter();
    const segments = route.segments;

    // Parse route: blog, blog/{lang}, blog/{lang}/{slug}
    const defaultLang = getCurrentLang() || 'en';

    // blog (index)
    if (segments.length === 1) {
        return html`<${BlogListPage} language=${defaultLang} />`;
    }

    // blog/{lang}
    if (segments.length === 2) {
        const lang = segments[1];
        // Validate language
        const validLang = BLOG_LANGUAGES.find(l => l.code === lang) ? lang : defaultLang;
        return html`<${BlogListPage} language=${validLang} />`;
    }

    // blog/{lang}/{slug}
    if (segments.length >= 3) {
        const lang = segments[1];
        const slug = segments.slice(2).join('/');
        const validLang = BLOG_LANGUAGES.find(l => l.code === lang) ? lang : defaultLang;
        return html`<${ArticleDetailPage} language=${validLang} slug=${slug} />`;
    }

    return html`<${BlogListPage} language=${defaultLang} />`;
};

export default BlogPage;
