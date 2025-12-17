/**
 * Coach Detail Modal Component
 * Shows detailed coach information with articles and discovery call booking
 */

import htm from '../../vendor/htm.js';
import { t } from '../../i18n.js';
import { DiscoveryCallModal } from './DiscoveryCallModal.js';

const React = window.React;
const { useState, useEffect } = React;
const html = htm.bind(React.createElement);

// Use global formatPrice from app.js or fallback
const formatPrice = (price) => {
    if (window.formatPrice) {
        return window.formatPrice(price);
    }
    return '€' + (price || 0).toFixed(0);
};

/**
 * CoachDetailModal Component
 * @param {Object} props
 * @param {Object} props.coach - Coach data
 * @param {Function} props.onClose - Close handler
 * @param {Object} props.session - User session (optional)
 */
export function CoachDetailModal({ coach, onClose, session }) {
    console.log('Opening coach detail modal for', coach.full_name);
    const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
    const [articles, setArticles] = useState([]);
    const [articlesLoading, setArticlesLoading] = useState(true);
    const [selectedArticle, setSelectedArticle] = useState(null);

    // Map database fields to component fields
    const rating = coach.rating_average || coach.rating || 0;
    const reviewsCount = coach.rating_count || coach.reviews_count || 0;
    const location = coach.location || 'Remote';
    const languages = coach.languages || [];
    const specialties = coach.specialties || [];
    const bio = coach.bio || '';

    // Load published articles
    useEffect(() => {
        loadArticles();
    }, [coach.id]);

    const loadArticles = async () => {
        setArticlesLoading(true);
        try {
            if (window.supabaseClient) {
                const { data, error } = await window.supabaseClient
                    .from('cs_articles')
                    .select('*')
                    .eq('coach_id', coach.id)
                    .eq('status', 'published')
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (!error && data) {
                    setArticles(data);
                }
            }
        } catch (error) {
            console.error('Failed to load coach articles:', error);
        } finally {
            setArticlesLoading(false);
        }
    };

    return html`
        <div class="coach-detail-modal" onClick=${onClose}>
            <div class="coach-detail-content" onClick=${(e) => e.stopPropagation()}>
                <div class="coach-detail-hero">
                    <img src=${coach.avatar_url} alt=${coach.full_name} class="coach-detail-avatar" loading="lazy" />
                    <button class="modal-close-btn" onClick=${onClose} aria-label="Close">×</button>
                </div>
                <div class="coach-detail-body">
                    <div class="coach-detail-header">
                        <div>
                            <h2 class="coach-detail-name">${coach.full_name}</h2>
                            <p class="coach-detail-title">${coach.title}</p>
                            <p class="coach-detail-location">📍 ${location}</p>
                        </div>
                        <button class="btn-book-prominent" onClick=${() => setShowDiscoveryModal(true)}>
                            📞 ${t('discovery.bookFreeCall')}
                        </button>
                    </div>

                    <div class="coach-detail-stats">
                        <div class="coach-detail-stat">
                            <div class="coach-detail-stat-value">${rating > 0 ? rating.toFixed(1) : 'New'}</div>
                            <div class="coach-detail-stat-label">Rating</div>
                        </div>
                        <div class="coach-detail-stat">
                            <div class="coach-detail-stat-value">${reviewsCount}</div>
                            <div class="coach-detail-stat-label">Reviews</div>
                        </div>
                        <div class="coach-detail-stat">
                            <div class="coach-detail-stat-value">${formatPrice(coach.hourly_rate)}</div>
                            <div class="coach-detail-stat-label">Per Hour</div>
                        </div>
                    </div>

                    <div class="coach-detail-section">
                        <h3 class="coach-detail-section-title">About</h3>
                        <p>${bio || 'No bio available.'}</p>
                    </div>

                    ${specialties.length > 0 ? html`
                        <div class="coach-detail-section">
                            <h3 class="coach-detail-section-title">Specialties</h3>
                            ${specialties.map(s => html`<span key=${s} class="badge badge-petrol">${s}</span>`)}
                        </div>
                    ` : ''}

                    ${languages.length > 0 ? html`
                        <div class="coach-detail-section">
                            <h3 class="coach-detail-section-title">Languages</h3>
                            ${languages.map(l => html`<span key=${l} class="badge badge-petrol">${l}</span>`)}
                        </div>
                    ` : ''}

                    ${/* Articles Section */ ''}
                    ${!articlesLoading && articles.length > 0 ? html`
                        <div class="coach-detail-section">
                            <h3 class="coach-detail-section-title">📝 Articles & Insights</h3>
                            <div class="coach-articles-list">
                                ${articles.map(article => html`
                                    <div
                                        key=${article.id}
                                        class="coach-article-preview"
                                        onClick=${() => setSelectedArticle(article)}
                                    >
                                        <h4 class="coach-article-title">${article.title}</h4>
                                        <p class="coach-article-excerpt">
                                            ${article.excerpt || (article.content_html ? article.content_html.replace(/<[^>]*>/g, '').substring(0, 120) + '...' : '')}
                                        </p>
                                        <div class="coach-article-meta">
                                            <span>📅 ${new Date(article.created_at).toLocaleDateString()}</span>
                                            ${article.view_count > 0 && html`<span>👁️ ${article.view_count}</span>`}
                                        </div>
                                    </div>
                                `)}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>

            ${/* Article Detail Modal */ ''}
            ${selectedArticle && html`
                <div class="article-detail-overlay" onClick=${() => setSelectedArticle(null)}>
                    <div class="article-detail-modal" onClick=${(e) => e.stopPropagation()}>
                        <button class="modal-close-btn" onClick=${() => setSelectedArticle(null)}>×</button>
                        <div class="article-detail-content">
                            <h2 class="article-detail-title">${selectedArticle.title}</h2>
                            <div class="article-detail-meta">
                                <span>By ${coach.full_name}</span>
                                <span>•</span>
                                <span>${new Date(selectedArticle.created_at).toLocaleDateString()}</span>
                            </div>
                            <div
                                class="article-detail-body"
                                dangerouslySetInnerHTML=${{ __html: selectedArticle.content_html || '' }}
                            />
                        </div>
                    </div>
                </div>
            `}

            ${showDiscoveryModal && html`
                <${DiscoveryCallModal}
                    coach=${coach}
                    onClose=${() => setShowDiscoveryModal(false)}
                />
            `}
        </div>
    `;
}

export default CoachDetailModal;
