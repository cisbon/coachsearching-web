/**
 * BlogPage Component
 * Public blog for marketing and SEO
 * Displays admin-managed blog posts with multilingual support
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
 * Blog Post Card Component
 */
const BlogPostCard = ({ post, language }) => {
    const readTime = Math.ceil((post.body?.replace(/<[^>]*>/g, '').length || 0) / 1000);

    return html`
        <article style=${{
            background: 'white',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}
        onMouseEnter=${(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.15)';
        }}
        onMouseLeave=${(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
        }}
        >
            <a href="#blog/${language}/${post.slug}" style=${{ textDecoration: 'none' }}>
                ${post.featured_image_url ? html`
                    <img
                        src=${post.featured_image_url}
                        alt=${post.title}
                        style=${{
                            width: '100%',
                            height: '200px',
                            objectFit: 'cover'
                        }}
                    />
                ` : html`
                    <div style=${{
                        width: '100%',
                        height: '200px',
                        background: 'linear-gradient(135deg, var(--petrol) 0%, #134e4a 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <span style=${{ fontSize: '4rem', opacity: 0.5 }}>📝</span>
                    </div>
                `}
            </a>

            <div style=${{ padding: '24px' }}>
                <!-- Tags -->
                ${post.tags && post.tags.length > 0 && html`
                    <div style=${{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        ${post.tags.slice(0, 3).map(tag => html`
                            <span key=${tag} style=${{
                                padding: '4px 10px',
                                background: '#f0f9ff',
                                color: 'var(--petrol)',
                                borderRadius: '20px',
                                fontSize: '0.75rem',
                                fontWeight: 500
                            }}>
                                #${tag}
                            </span>
                        `)}
                    </div>
                `}

                <!-- Title -->
                <a href="#blog/${language}/${post.slug}" style=${{ textDecoration: 'none' }}>
                    <h2 style=${{
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        color: '#1e293b',
                        marginBottom: '12px',
                        lineHeight: 1.3
                    }}>
                        ${post.title}
                    </h2>
                </a>

                <!-- Description -->
                <p style=${{
                    color: '#64748b',
                    fontSize: '0.95rem',
                    lineHeight: 1.6,
                    marginBottom: '16px',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                }}>
                    ${post.description || post.body?.replace(/<[^>]*>/g, '').substring(0, 150) + '...'}
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
                        ${post.published_at ? new Date(post.published_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                        }) : ''}
                    </span>
                    <span>${readTime} ${t('blog.minRead') || 'min read'}</span>
                </div>
            </div>
        </article>
    `;
};

/**
 * Related Posts Sidebar Component
 */
const RelatedPostsSidebar = ({ currentPostId, language, tags }) => {
    const [relatedPosts, setRelatedPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRelatedPosts();
    }, [currentPostId, language]);

    const loadRelatedPosts = async () => {
        setLoading(true);
        try {
            // Try to get related posts by tags first
            let { data, error } = await window.supabaseClient
                .from('cs_blog_posts')
                .select('id, title, slug, featured_image_url, published_at, tags')
                .eq('status', 'published')
                .eq('language', language)
                .neq('id', currentPostId)
                .order('published_at', { ascending: false })
                .limit(5);

            if (!error && data) {
                // Sort by matching tags
                if (tags && tags.length > 0) {
                    data.sort((a, b) => {
                        const aMatches = (a.tags || []).filter(t => tags.includes(t)).length;
                        const bMatches = (b.tags || []).filter(t => tags.includes(t)).length;
                        return bMatches - aMatches;
                    });
                }
                setRelatedPosts(data.slice(0, 5));
            }
        } catch (error) {
            console.error('Failed to load related posts:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return html`
            <div style=${{ padding: '20px' }}>
                <div class="skeleton-line" style=${{ height: '20px', marginBottom: '16px' }}></div>
                <div class="skeleton-line" style=${{ height: '60px', marginBottom: '12px' }}></div>
                <div class="skeleton-line" style=${{ height: '60px', marginBottom: '12px' }}></div>
                <div class="skeleton-line" style=${{ height: '60px' }}></div>
            </div>
        `;
    }

    if (relatedPosts.length === 0) {
        return null;
    }

    return html`
        <div style=${{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
        }}>
            <h3 style=${{
                fontSize: '1.1rem',
                fontWeight: 700,
                color: '#1e293b',
                marginBottom: '20px',
                paddingBottom: '12px',
                borderBottom: '2px solid var(--petrol)'
            }}>
                ${t('blog.relatedPosts') || 'Related Articles'}
            </h3>

            <div style=${{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                ${relatedPosts.map(post => html`
                    <a
                        key=${post.id}
                        href="#blog/${language}/${post.slug}"
                        style=${{
                            display: 'flex',
                            gap: '12px',
                            textDecoration: 'none',
                            padding: '12px',
                            borderRadius: '8px',
                            transition: 'background 0.2s ease'
                        }}
                        onMouseEnter=${(e) => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave=${(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        ${post.featured_image_url ? html`
                            <img
                                src=${post.featured_image_url}
                                alt=${post.title}
                                style=${{
                                    width: '60px',
                                    height: '60px',
                                    objectFit: 'cover',
                                    borderRadius: '8px',
                                    flexShrink: 0
                                }}
                            />
                        ` : html`
                            <div style=${{
                                width: '60px',
                                height: '60px',
                                background: '#f1f5f9',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>📝</div>
                        `}
                        <div style=${{ flex: 1, minWidth: 0 }}>
                            <h4 style=${{
                                margin: '0 0 4px',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                color: '#1e293b',
                                lineHeight: 1.3,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                            }}>
                                ${post.title}
                            </h4>
                            <span style=${{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                ${post.published_at ? new Date(post.published_at).toLocaleDateString() : ''}
                            </span>
                        </div>
                    </a>
                `)}
            </div>
        </div>
    `;
};

/**
 * Blog Listing Page
 */
const BlogListPage = ({ language }) => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTag, setSelectedTag] = useState(null);

    useEffect(() => {
        loadPosts();
    }, [language]);

    const loadPosts = async () => {
        setLoading(true);
        try {
            const { data, error } = await window.supabaseClient
                .from('cs_blog_posts')
                .select('*')
                .eq('status', 'published')
                .eq('language', language)
                .order('published_at', { ascending: false });

            if (!error && data) {
                setPosts(data);
            }
        } catch (error) {
            console.error('Failed to load posts:', error);
        } finally {
            setLoading(false);
        }
    };

    // Get all unique tags
    const allTags = useMemo(() => {
        const tagSet = new Set();
        posts.forEach(post => {
            (post.tags || []).forEach(tag => tagSet.add(tag));
        });
        return Array.from(tagSet).sort();
    }, [posts]);

    // Filter posts by tag
    const filteredPosts = selectedTag
        ? posts.filter(post => (post.tags || []).includes(selectedTag))
        : posts;

    if (loading) {
        return html`
            <div class="blog-page" style=${{ background: '#f8fafc', minHeight: '100vh' }}>
                <div class="container" style=${{ maxWidth: '1200px', margin: '0 auto', padding: '48px 16px' }}>
                    <div style=${{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                        gap: '32px'
                    }}>
                        ${[1, 2, 3].map(i => html`
                            <div key=${i} style=${{
                                background: 'white',
                                borderRadius: '16px',
                                overflow: 'hidden'
                            }}>
                                <div class="skeleton-line" style=${{ height: '200px' }}></div>
                                <div style=${{ padding: '24px' }}>
                                    <div class="skeleton-line" style=${{ height: '24px', marginBottom: '12px' }}></div>
                                    <div class="skeleton-line" style=${{ height: '16px', marginBottom: '8px' }}></div>
                                    <div class="skeleton-line" style=${{ height: '16px', width: '80%' }}></div>
                                </div>
                            </div>
                        `)}
                    </div>
                </div>
            </div>
        `;
    }

    return html`
        <div class="blog-page" style=${{ background: '#f8fafc', minHeight: '100vh' }}>
            <!-- Hero Header -->
            <div style=${{
                background: 'linear-gradient(135deg, var(--petrol) 0%, #134e4a 100%)',
                color: 'white',
                padding: '64px 16px',
                textAlign: 'center'
            }}>
                <div style=${{ maxWidth: '800px', margin: '0 auto' }}>
                    <h1 style=${{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '16px' }}>
                        ${t('blog.title') || 'Coaching Insights & Articles'}
                    </h1>
                    <p style=${{ fontSize: '1.2rem', opacity: 0.9, marginBottom: '32px' }}>
                        ${t('blog.subtitle') || 'Expert perspectives and practical advice from professional coaches'}
                    </p>

                    <!-- Language Selector -->
                    <div style=${{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        ${BLOG_LANGUAGES.map(lang => html`
                            <a
                                key=${lang.code}
                                href="#blog/${lang.code}"
                                style=${{
                                    padding: '10px 20px',
                                    borderRadius: '25px',
                                    textDecoration: 'none',
                                    fontSize: '0.95rem',
                                    fontWeight: language === lang.code ? 600 : 400,
                                    background: language === lang.code ? 'white' : 'rgba(255,255,255,0.15)',
                                    color: language === lang.code ? 'var(--petrol)' : 'white',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                ${lang.flag} ${lang.name}
                            </a>
                        `)}
                    </div>
                </div>
            </div>

            <div class="container" style=${{ maxWidth: '1200px', margin: '0 auto', padding: '48px 16px' }}>
                <!-- Tags Filter -->
                ${allTags.length > 0 && html`
                    <div style=${{
                        display: 'flex',
                        gap: '8px',
                        flexWrap: 'wrap',
                        marginBottom: '32px',
                        justifyContent: 'center'
                    }}>
                        <button
                            onClick=${() => setSelectedTag(null)}
                            style=${{
                                padding: '8px 16px',
                                border: 'none',
                                borderRadius: '20px',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                background: !selectedTag ? 'var(--petrol)' : 'white',
                                color: !selectedTag ? 'white' : '#475569',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}
                        >
                            ${t('blog.allPosts') || 'All Posts'}
                        </button>
                        ${allTags.slice(0, 10).map(tag => html`
                            <button
                                key=${tag}
                                onClick=${() => setSelectedTag(tag === selectedTag ? null : tag)}
                                style=${{
                                    padding: '8px 16px',
                                    border: 'none',
                                    borderRadius: '20px',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    background: selectedTag === tag ? 'var(--petrol)' : 'white',
                                    color: selectedTag === tag ? 'white' : '#475569',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                }}
                            >
                                #${tag}
                            </button>
                        `)}
                    </div>
                `}

                <!-- Posts Grid -->
                ${filteredPosts.length === 0 ? html`
                    <div style=${{ textAlign: 'center', padding: '64px 0' }}>
                        <div style=${{ fontSize: '4rem', marginBottom: '16px' }}>📝</div>
                        <h3 style=${{ color: '#475569', marginBottom: '8px' }}>
                            ${t('blog.noArticles') || 'No articles yet'}
                        </h3>
                        <p style=${{ color: '#94a3b8' }}>
                            ${t('blog.noArticlesDesc') || 'Check back soon for new content'}
                        </p>
                    </div>
                ` : html`
                    <div style=${{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                        gap: '32px'
                    }}>
                        ${filteredPosts.map(post => html`
                            <${BlogPostCard}
                                key=${post.id}
                                post=${post}
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
 * Single Blog Post Page with Sidebar
 */
const BlogPostPage = ({ language, slug }) => {
    const [post, setPost] = useState(null);
    const [translations, setTranslations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        loadPost();
    }, [language, slug]);

    const loadPost = async () => {
        setLoading(true);
        setNotFound(false);

        try {
            // Load the post
            const { data, error } = await window.supabaseClient
                .from('cs_blog_posts')
                .select('*')
                .eq('slug', slug)
                .eq('language', language)
                .eq('status', 'published')
                .single();

            if (error || !data) {
                setNotFound(true);
                return;
            }

            setPost(data);

            // Increment view count
            await window.supabaseClient
                .from('cs_blog_posts')
                .update({ view_count: (data.view_count || 0) + 1 })
                .eq('id', data.id);

            // Load translations
            if (data.post_group_id) {
                const { data: transData } = await window.supabaseClient
                    .from('cs_blog_posts')
                    .select('id, language, slug, title')
                    .eq('post_group_id', data.post_group_id)
                    .eq('status', 'published')
                    .neq('id', data.id);

                if (transData) {
                    setTranslations(transData);
                }
            }
        } catch (error) {
            console.error('Failed to load post:', error);
            setNotFound(true);
        } finally {
            setLoading(false);
        }
    };

    const readTime = Math.ceil((post?.body?.replace(/<[^>]*>/g, '').length || 0) / 1000);

    if (loading) {
        return html`
            <div class="blog-page" style=${{ background: '#f8fafc', minHeight: '100vh' }}>
                <div style=${{ maxWidth: '1200px', margin: '0 auto', padding: '48px 16px' }}>
                    <div class="skeleton-line" style=${{ height: '400px', marginBottom: '32px', borderRadius: '16px' }}></div>
                    <div class="skeleton-line" style=${{ height: '48px', marginBottom: '24px', width: '70%' }}></div>
                    <div class="skeleton-line" style=${{ height: '16px', marginBottom: '12px' }}></div>
                    <div class="skeleton-line" style=${{ height: '16px', marginBottom: '12px' }}></div>
                    <div class="skeleton-line" style=${{ height: '16px', width: '80%' }}></div>
                </div>
            </div>
        `;
    }

    if (notFound) {
        return html`
            <div class="blog-page" style=${{ background: '#f8fafc', minHeight: '100vh' }}>
                <div style=${{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', padding: '96px 16px' }}>
                    <div style=${{ fontSize: '5rem', marginBottom: '24px' }}>📄</div>
                    <h1 style=${{ fontSize: '2rem', color: '#1e293b', marginBottom: '16px' }}>
                        ${t('blog.articleNotFound') || 'Article Not Found'}
                    </h1>
                    <p style=${{ color: '#64748b', marginBottom: '32px' }}>
                        ${t('blog.articleNotFoundDesc') || "The article you're looking for doesn't exist or has been removed."}
                    </p>
                    <a
                        href="#blog/${language}"
                        style=${{
                            display: 'inline-block',
                            padding: '14px 28px',
                            background: 'var(--petrol)',
                            color: 'white',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontWeight: 600
                        }}
                    >
                        ← ${t('blog.backToBlog') || 'Back to Blog'}
                    </a>
                </div>
            </div>
        `;
    }

    return html`
        <div class="blog-page" style=${{ background: '#f8fafc', minHeight: '100vh' }}>
            <!-- Featured Image Header -->
            ${post.featured_image_url && html`
                <div style=${{
                    width: '100%',
                    height: '400px',
                    background: `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.5)), url(${post.featured_image_url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex',
                    alignItems: 'flex-end'
                }}>
                    <div style=${{ maxWidth: '1200px', margin: '0 auto', padding: '48px 16px', width: '100%' }}>
                        <a
                            href="#blog/${language}"
                            style=${{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: 'white',
                                textDecoration: 'none',
                                marginBottom: '16px',
                                opacity: 0.9
                            }}
                        >
                            ← ${t('blog.backToBlog') || 'Back to Blog'}
                        </a>
                        <h1 style=${{
                            fontSize: '2.5rem',
                            fontWeight: 700,
                            color: 'white',
                            lineHeight: 1.2,
                            maxWidth: '800px'
                        }}>
                            ${post.title}
                        </h1>
                    </div>
                </div>
            `}

            <div style=${{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '48px 16px',
                display: 'grid',
                gridTemplateColumns: '1fr 350px',
                gap: '48px'
            }}>
                <!-- Main Content -->
                <article style=${{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '40px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}>
                    <!-- Title (if no featured image) -->
                    ${!post.featured_image_url && html`
                        <div>
                            <a
                                href="#blog/${language}"
                                style=${{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    color: '#64748b',
                                    textDecoration: 'none',
                                    marginBottom: '24px'
                                }}
                            >
                                ← ${t('blog.backToBlog') || 'Back to Blog'}
                            </a>
                            <h1 style=${{
                                fontSize: '2.5rem',
                                fontWeight: 700,
                                color: '#1e293b',
                                lineHeight: 1.2,
                                marginBottom: '24px'
                            }}>
                                ${post.title}
                            </h1>
                        </div>
                    `}

                    <!-- Meta -->
                    <div style=${{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        marginBottom: '24px',
                        paddingBottom: '24px',
                        borderBottom: '1px solid #e2e8f0',
                        flexWrap: 'wrap'
                    }}>
                        <span style=${{ color: '#64748b' }}>
                            ${post.published_at ? new Date(post.published_at).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            }) : ''}
                        </span>
                        <span style=${{ color: '#cbd5e1' }}>•</span>
                        <span style=${{ color: '#64748b' }}>${readTime} ${t('blog.minRead') || 'min read'}</span>
                        ${post.view_count > 0 && html`
                            <span style=${{ color: '#cbd5e1' }}>•</span>
                            <span style=${{ color: '#64748b' }}>${post.view_count} ${t('blog.views') || 'views'}</span>
                        `}
                    </div>

                    <!-- Tags -->
                    ${post.tags && post.tags.length > 0 && html`
                        <div style=${{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '32px' }}>
                            ${post.tags.map(tag => html`
                                <a
                                    key=${tag}
                                    href="#blog/${language}?tag=${tag}"
                                    style=${{
                                        padding: '6px 14px',
                                        background: '#f0f9ff',
                                        color: 'var(--petrol)',
                                        borderRadius: '20px',
                                        fontSize: '0.85rem',
                                        fontWeight: 500,
                                        textDecoration: 'none'
                                    }}
                                >
                                    #${tag}
                                </a>
                            `)}
                        </div>
                    `}

                    <!-- Language Switcher -->
                    ${translations.length > 0 && html`
                        <div style=${{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '16px 20px',
                            background: '#f8fafc',
                            borderRadius: '8px',
                            marginBottom: '32px',
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
                                                padding: '6px 14px',
                                                background: 'white',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '6px',
                                                textDecoration: 'none',
                                                fontSize: '0.85rem',
                                                color: '#475569',
                                                fontWeight: 500
                                            }}
                                        >
                                            ${langInfo?.flag || '🌐'} ${langInfo?.name || trans.language}
                                        </a>
                                    `;
                                })}
                            </div>
                        </div>
                    `}

                    <!-- Content -->
                    <div
                        class="blog-content prose"
                        style=${{
                            fontSize: '1.1rem',
                            lineHeight: 1.8,
                            color: '#374151'
                        }}
                        dangerouslySetInnerHTML=${{ __html: post.body }}
                    ></div>

                    <!-- Share -->
                    <div style=${{
                        marginTop: '48px',
                        paddingTop: '24px',
                        borderTop: '1px solid #e2e8f0'
                    }}>
                        <div style=${{ fontWeight: 600, color: '#475569', marginBottom: '12px' }}>
                            ${t('blog.sharePost') || 'Share this article'}
                        </div>
                        <div style=${{ display: 'flex', gap: '12px' }}>
                            <a
                                href="https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(window.location.href)}"
                                target="_blank"
                                rel="noopener noreferrer"
                                style=${{
                                    padding: '10px 20px',
                                    background: '#1da1f2',
                                    color: 'white',
                                    borderRadius: '8px',
                                    textDecoration: 'none',
                                    fontSize: '0.9rem',
                                    fontWeight: 500
                                }}
                            >
                                Twitter
                            </a>
                            <a
                                href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}"
                                target="_blank"
                                rel="noopener noreferrer"
                                style=${{
                                    padding: '10px 20px',
                                    background: '#0077b5',
                                    color: 'white',
                                    borderRadius: '8px',
                                    textDecoration: 'none',
                                    fontSize: '0.9rem',
                                    fontWeight: 500
                                }}
                            >
                                LinkedIn
                            </a>
                        </div>
                    </div>
                </article>

                <!-- Sidebar -->
                <aside style=${{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <${RelatedPostsSidebar}
                        currentPostId=${post.id}
                        language=${language}
                        tags=${post.tags}
                    />

                    <!-- Newsletter CTA -->
                    <div style=${{
                        background: 'linear-gradient(135deg, var(--petrol) 0%, #134e4a 100%)',
                        borderRadius: '16px',
                        padding: '24px',
                        color: 'white'
                    }}>
                        <h3 style=${{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>
                            ${t('blog.stayUpdated') || 'Stay Updated'}
                        </h3>
                        <p style=${{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '16px' }}>
                            ${t('blog.newsletterDesc') || 'Get the latest coaching insights delivered to your inbox'}
                        </p>
                        <a
                            href="#newsletter"
                            style=${{
                                display: 'block',
                                padding: '12px 20px',
                                background: 'white',
                                color: 'var(--petrol)',
                                borderRadius: '8px',
                                textDecoration: 'none',
                                fontWeight: 600,
                                textAlign: 'center'
                            }}
                        >
                            ${t('blog.subscribe') || 'Subscribe'}
                        </a>
                    </div>
                </aside>
            </div>

            <!-- Responsive styles for mobile -->
            <style>
                @media (max-width: 900px) {
                    .blog-page [style*="grid-template-columns: 1fr 350px"] {
                        grid-template-columns: 1fr !important;
                    }
                }
            </style>
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
        const validLang = BLOG_LANGUAGES.find(l => l.code === lang) ? lang : defaultLang;
        return html`<${BlogListPage} language=${validLang} />`;
    }

    // blog/{lang}/{slug}
    if (segments.length >= 3) {
        const lang = segments[1];
        const slug = segments.slice(2).join('/');
        const validLang = BLOG_LANGUAGES.find(l => l.code === lang) ? lang : defaultLang;
        return html`<${BlogPostPage} language=${validLang} slug=${slug} />`;
    }

    return html`<${BlogListPage} language=${defaultLang} />`;
};

export default BlogPage;
