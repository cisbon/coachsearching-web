/**
 * SEO Utilities
 * @fileoverview Meta tags, structured data, and SEO optimization helpers
 */

// ============================================================================
// Meta Tags Management
// ============================================================================

/**
 * Update document title
 * @param {string} title - Page title
 * @param {string} [suffix=' | CoachSearching'] - Title suffix
 */
export function setTitle(title, suffix = ' | CoachSearching') {
    document.title = title + suffix;
}

/**
 * Update or create meta tag
 * @param {string} name - Meta name or property
 * @param {string} content - Meta content
 * @param {boolean} [isProperty=false] - Use property instead of name attribute
 */
export function setMeta(name, content, isProperty = false) {
    const attr = isProperty ? 'property' : 'name';
    let meta = document.querySelector(`meta[${attr}="${name}"]`);

    if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
    }

    meta.setAttribute('content', content);
}

/**
 * Set canonical URL
 * @param {string} url - Canonical URL
 */
export function setCanonical(url) {
    let link = document.querySelector('link[rel="canonical"]');

    if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
    }

    link.setAttribute('href', url);
}

/**
 * Set all meta tags for a page
 * @param {Object} options - Meta options
 * @param {string} options.title - Page title
 * @param {string} options.description - Page description
 * @param {string} [options.url] - Canonical URL
 * @param {string} [options.image] - OG image URL
 * @param {string} [options.type='website'] - OG type
 * @param {Object} [options.article] - Article metadata
 */
export function setPageMeta(options) {
    const {
        title,
        description,
        url = window.location.href,
        image = 'https://coachsearching.com/og-image.jpg',
        type = 'website',
        article,
    } = options;

    // Basic meta
    setTitle(title);
    setMeta('description', description);

    // Open Graph
    setMeta('og:title', title, true);
    setMeta('og:description', description, true);
    setMeta('og:url', url, true);
    setMeta('og:image', image, true);
    setMeta('og:type', type, true);
    setMeta('og:site_name', 'CoachSearching', true);

    // Twitter
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:image', image);

    // Article specific
    if (article) {
        if (article.publishedTime) {
            setMeta('article:published_time', article.publishedTime, true);
        }
        if (article.modifiedTime) {
            setMeta('article:modified_time', article.modifiedTime, true);
        }
        if (article.author) {
            setMeta('article:author', article.author, true);
        }
        if (article.section) {
            setMeta('article:section', article.section, true);
        }
        if (article.tags) {
            article.tags.forEach(tag => {
                setMeta('article:tag', tag, true);
            });
        }
    }

    // Canonical
    setCanonical(url);
}

// ============================================================================
// Structured Data (JSON-LD)
// ============================================================================

/**
 * Add or update JSON-LD structured data
 * @param {string} id - Script element ID
 * @param {Object} data - Structured data object
 */
export function setStructuredData(id, data) {
    let script = document.getElementById(id);

    if (!script) {
        script = document.createElement('script');
        script.id = id;
        script.type = 'application/ld+json';
        document.head.appendChild(script);
    }

    script.textContent = JSON.stringify(data);
}

/**
 * Remove structured data
 * @param {string} id - Script element ID
 */
export function removeStructuredData(id) {
    const script = document.getElementById(id);
    if (script) {
        script.remove();
    }
}

/**
 * Generate Person schema for a coach
 * @param {Object} coach - Coach data
 * @returns {Object} - JSON-LD Person schema
 */
export function generateCoachSchema(coach) {
    const baseUrl = 'https://coachsearching.com';

    return {
        '@context': 'https://schema.org',
        '@type': 'Person',
        '@id': `${baseUrl}/#coach-${coach.id}`,
        'name': coach.full_name,
        'jobTitle': coach.title || 'Professional Coach',
        'description': coach.bio,
        'image': coach.avatar_url,
        'url': `${baseUrl}/#coach/${coach.id}`,
        'address': coach.location ? {
            '@type': 'PostalAddress',
            'addressLocality': coach.location,
        } : undefined,
        'knowsLanguage': coach.languages || [],
        'hasCredential': coach.certifications?.map(cert => ({
            '@type': 'EducationalOccupationalCredential',
            'name': cert,
        })) || [],
        'makesOffer': {
            '@type': 'Offer',
            'itemOffered': {
                '@type': 'Service',
                'name': 'Coaching Session',
                'description': `Professional coaching services by ${coach.full_name}`,
                'provider': {
                    '@type': 'Person',
                    'name': coach.full_name,
                },
            },
            'price': coach.hourly_rate,
            'priceCurrency': 'EUR',
            'priceSpecification': {
                '@type': 'UnitPriceSpecification',
                'price': coach.hourly_rate,
                'priceCurrency': 'EUR',
                'unitText': 'hour',
            },
        },
        'aggregateRating': coach.rating && coach.reviews_count ? {
            '@type': 'AggregateRating',
            'ratingValue': coach.rating,
            'reviewCount': coach.reviews_count,
            'bestRating': 5,
            'worstRating': 1,
        } : undefined,
    };
}

/**
 * Generate Service schema for coaching
 * @param {Object} coach - Coach data
 * @returns {Object} - JSON-LD Service schema
 */
export function generateServiceSchema(coach) {
    const baseUrl = 'https://coachsearching.com';

    return {
        '@context': 'https://schema.org',
        '@type': 'Service',
        'name': `${coach.title || 'Coaching'} with ${coach.full_name}`,
        'description': coach.bio,
        'provider': {
            '@type': 'Person',
            'name': coach.full_name,
            'image': coach.avatar_url,
            'url': `${baseUrl}/#coach/${coach.id}`,
        },
        'serviceType': coach.specialties?.join(', ') || 'Professional Coaching',
        'areaServed': coach.session_formats?.includes('online') ? {
            '@type': 'Place',
            'name': 'Worldwide (Online)',
        } : {
            '@type': 'Place',
            'name': coach.location,
        },
        'hasOfferCatalog': {
            '@type': 'OfferCatalog',
            'name': 'Coaching Sessions',
            'itemListElement': [
                {
                    '@type': 'Offer',
                    'itemOffered': {
                        '@type': 'Service',
                        'name': '60-minute Coaching Session',
                    },
                    'price': coach.hourly_rate,
                    'priceCurrency': 'EUR',
                },
            ],
        },
        'review': coach.reviews?.slice(0, 5).map(review => ({
            '@type': 'Review',
            'reviewRating': {
                '@type': 'Rating',
                'ratingValue': review.rating,
                'bestRating': 5,
            },
            'author': {
                '@type': 'Person',
                'name': review.author_name || 'Verified Client',
            },
            'reviewBody': review.content,
            'datePublished': review.created_at,
        })) || [],
    };
}

/**
 * Generate FAQ schema
 * @param {Array<{question: string, answer: string}>} faqs - FAQ items
 * @returns {Object} - JSON-LD FAQPage schema
 */
export function generateFAQSchema(faqs) {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': faqs.map(faq => ({
            '@type': 'Question',
            'name': faq.question,
            'acceptedAnswer': {
                '@type': 'Answer',
                'text': faq.answer,
            },
        })),
    };
}

/**
 * Generate BreadcrumbList schema
 * @param {Array<{name: string, url: string}>} items - Breadcrumb items
 * @returns {Object} - JSON-LD BreadcrumbList schema
 */
export function generateBreadcrumbSchema(items) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': items.map((item, index) => ({
            '@type': 'ListItem',
            'position': index + 1,
            'name': item.name,
            'item': item.url,
        })),
    };
}

/**
 * Generate Organization schema
 * @returns {Object} - JSON-LD Organization schema
 */
export function generateOrganizationSchema() {
    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        'name': 'CoachSearching',
        'url': 'https://coachsearching.com',
        'logo': 'https://coachsearching.com/icon-512.png',
        'description': 'Professional coaching platform connecting clients with certified coaches for business, life, and personal development.',
        'foundingDate': '2024',
        'contactPoint': {
            '@type': 'ContactPoint',
            'email': 'info@coachsearching.com',
            'contactType': 'Customer Service',
            'availableLanguage': ['English', 'German', 'Spanish', 'French', 'Italian'],
        },
        'sameAs': [
            'https://twitter.com/coachsearching',
            'https://linkedin.com/company/coachsearching',
            'https://facebook.com/coachsearching',
        ],
    };
}

/**
 * Generate WebSite schema with search action
 * @returns {Object} - JSON-LD WebSite schema
 */
export function generateWebSiteSchema() {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        'name': 'CoachSearching',
        'url': 'https://coachsearching.com',
        'potentialAction': {
            '@type': 'SearchAction',
            'target': {
                '@type': 'EntryPoint',
                'urlTemplate': 'https://coachsearching.com/#coaches?q={search_term_string}',
            },
            'query-input': 'required name=search_term_string',
        },
    };
}

/**
 * Generate LocalBusiness schema for in-person coaches
 * @param {Object} coach - Coach data
 * @returns {Object} - JSON-LD LocalBusiness schema
 */
export function generateLocalBusinessSchema(coach) {
    if (!coach.location || !coach.session_formats?.includes('in-person')) {
        return null;
    }

    return {
        '@context': 'https://schema.org',
        '@type': 'ProfessionalService',
        'name': `${coach.full_name} - ${coach.title || 'Professional Coach'}`,
        'description': coach.bio,
        'image': coach.avatar_url,
        'address': {
            '@type': 'PostalAddress',
            'addressLocality': coach.location,
        },
        'priceRange': `€${coach.hourly_rate}/hour`,
        'aggregateRating': coach.rating && coach.reviews_count ? {
            '@type': 'AggregateRating',
            'ratingValue': coach.rating,
            'reviewCount': coach.reviews_count,
        } : undefined,
    };
}

/**
 * Generate Article schema for blog posts
 * @param {Object} article - Article data
 * @returns {Object} - JSON-LD Article schema
 */
export function generateArticleSchema(article) {
    return {
        '@context': 'https://schema.org',
        '@type': 'Article',
        'headline': article.title,
        'description': article.excerpt,
        'image': article.image,
        'author': {
            '@type': article.authorType || 'Person',
            'name': article.author,
        },
        'publisher': {
            '@type': 'Organization',
            'name': 'CoachSearching',
            'logo': {
                '@type': 'ImageObject',
                'url': 'https://coachsearching.com/icon-512.png',
            },
        },
        'datePublished': article.publishedDate,
        'dateModified': article.modifiedDate || article.publishedDate,
        'mainEntityOfPage': {
            '@type': 'WebPage',
            '@id': article.url,
        },
    };
}

/**
 * Generate HowTo schema
 * @param {Object} howTo - How-to data
 * @returns {Object} - JSON-LD HowTo schema
 */
export function generateHowToSchema(howTo) {
    return {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        'name': howTo.name,
        'description': howTo.description,
        'totalTime': howTo.totalTime,
        'step': howTo.steps.map((step, index) => ({
            '@type': 'HowToStep',
            'position': index + 1,
            'name': step.name,
            'text': step.text,
            'image': step.image,
        })),
    };
}

// ============================================================================
// SEO Helpers
// ============================================================================

/**
 * Generate SEO-friendly slug from text
 * @param {string} text - Text to slugify
 * @returns {string} - URL-friendly slug
 */
export function slugify(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Generate coach profile URL
 * @param {Object} coach - Coach data
 * @returns {string} - SEO-friendly URL
 */
export function getCoachUrl(coach) {
    const slug = slugify(coach.full_name);
    return `#coach/${coach.id}/${slug}`;
}

/**
 * Generate category URL
 * @param {string} category - Category name
 * @returns {string} - SEO-friendly URL
 */
export function getCategoryUrl(category) {
    return `#coaches/${slugify(category)}`;
}

/**
 * Truncate text for meta description (optimal 150-160 chars)
 * @param {string} text - Text to truncate
 * @param {number} [maxLength=155] - Maximum length
 * @returns {string} - Truncated text
 */
export function truncateForMeta(text, maxLength = 155) {
    if (!text || text.length <= maxLength) return text;

    const truncated = text.substring(0, maxLength - 3);
    const lastSpace = truncated.lastIndexOf(' ');

    return truncated.substring(0, lastSpace) + '...';
}

/**
 * Clean and optimize text for SEO
 * @param {string} text - Text to clean
 * @returns {string} - Cleaned text
 */
export function cleanForSEO(text) {
    return text
        .replace(/<[^>]*>/g, '') // Remove HTML
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
}

export default {
    setTitle,
    setMeta,
    setCanonical,
    setPageMeta,
    setStructuredData,
    removeStructuredData,
    generateCoachSchema,
    generateServiceSchema,
    generateFAQSchema,
    generateBreadcrumbSchema,
    generateOrganizationSchema,
    generateWebSiteSchema,
    generateLocalBusinessSchema,
    generateArticleSchema,
    generateHowToSchema,
    slugify,
    getCoachUrl,
    getCategoryUrl,
    truncateForMeta,
    cleanForSEO,
};
