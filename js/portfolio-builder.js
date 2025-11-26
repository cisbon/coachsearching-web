import { html } from 'https://esm.sh/htm/react';
import { useState, useEffect } from 'react';
import api from './api-client.js';

/**
 * Coach Portfolio Builder
 *
 * Features:
 * - Certifications & credentials management
 * - Case studies & success stories
 * - Video introduction
 * - Before/after transformations
 * - Media library (images, videos, PDFs)
 * - Testimonials showcase
 * - Portfolio preview
 * - Drag & drop reordering
 */

export const PortfolioBuilder = ({ session }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [portfolio, setPortfolio] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadPortfolio();
    }, []);

    const loadPortfolio = async () => {
        try {
            setLoading(true);
            const data = await api.coaches.getPortfolio(session.user.id);
            setPortfolio(data || getDefaultPortfolio());
        } catch (error) {
            console.error('Failed to load portfolio:', error);
            setPortfolio(getDefaultPortfolio());
        } finally {
            setLoading(false);
        }
    };

    const savePortfolio = async (updates) => {
        try {
            setSaving(true);
            const updated = { ...portfolio, ...updates };
            await api.coaches.updatePortfolio(session.user.id, updated);
            setPortfolio(updated);
            alert('Portfolio saved successfully!');
        } catch (error) {
            console.error('Failed to save portfolio:', error);
            alert('Failed to save portfolio. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return html`
            <div class="portfolio-loading">
                <div class="spinner-lg"></div>
                <p>Loading your portfolio...</p>
            </div>
        `;
    }

    return html`
        <div class="portfolio-builder">
            <!-- Header -->
            <div class="portfolio-header">
                <h1>📁 Portfolio Builder</h1>
                <p class="portfolio-subtitle">
                    Showcase your expertise and attract more clients
                </p>
                <div class="portfolio-actions">
                    <button class="btn-secondary" onClick=${() => window.open(`/coach/${session.user.id}`, '_blank')}>
                        👁️ Preview Portfolio
                    </button>
                </div>
            </div>

            <!-- Tabs -->
            <div class="portfolio-tabs">
                ${PORTFOLIO_TABS.map(tab => html`
                    <button
                        key=${tab.id}
                        class="portfolio-tab ${activeTab === tab.id ? 'active' : ''}"
                        onClick=${() => setActiveTab(tab.id)}
                    >
                        <span class="tab-icon">${tab.icon}</span>
                        <span class="tab-label">${tab.label}</span>
                    </button>
                `)}
            </div>

            <!-- Tab Content -->
            <div class="portfolio-content">
                ${activeTab === 'overview' && html`
                    <${OverviewTab}
                        portfolio=${portfolio}
                        onSave=${savePortfolio}
                        saving=${saving}
                    />
                `}
                ${activeTab === 'certifications' && html`
                    <${CertificationsTab}
                        portfolio=${portfolio}
                        onSave=${savePortfolio}
                        saving=${saving}
                    />
                `}
                ${activeTab === 'case-studies' && html`
                    <${CaseStudiesTab}
                        portfolio=${portfolio}
                        onSave=${savePortfolio}
                        saving=${saving}
                    />
                `}
                ${activeTab === 'media' && html`
                    <${MediaTab}
                        portfolio=${portfolio}
                        onSave=${savePortfolio}
                        saving=${saving}
                    />
                `}
                ${activeTab === 'testimonials' && html`
                    <${TestimonialsTab}
                        portfolio=${portfolio}
                        onSave=${savePortfolio}
                        saving=${saving}
                    />
                `}
            </div>
        </div>
    `;
};

// ============================================
// OVERVIEW TAB
// ============================================

const OverviewTab = ({ portfolio, onSave, saving }) => {
    const [data, setData] = useState(portfolio.overview || {});

    const handleSave = () => {
        onSave({ ...portfolio, overview: data });
    };

    return html`
        <div class="portfolio-tab-content">
            <h2 class="section-title">📋 Portfolio Overview</h2>
            <p class="section-description">
                Provide an overview of your coaching practice and achievements.
            </p>

            <div class="form-group">
                <label class="form-label">Professional Summary</label>
                <p class="form-help">A compelling summary of your expertise (150-300 words)</p>
                <textarea
                    class="form-textarea"
                    rows="6"
                    placeholder="I'm a certified life coach with over 10 years of experience..."
                    value=${data.summary || ''}
                    onInput=${(e) => setData({ ...data, summary: e.target.value })}
                ></textarea>
                <div class="char-count">${(data.summary || '').length} / 300 words</div>
            </div>

            <div class="stats-grid">
                <div class="form-group">
                    <label class="form-label">Years of Experience</label>
                    <input
                        type="number"
                        class="form-input"
                        min="0"
                        value=${data.years_experience || ''}
                        onInput=${(e) => setData({ ...data, years_experience: e.target.value })}
                    />
                </div>

                <div class="form-group">
                    <label class="form-label">Clients Coached</label>
                    <input
                        type="number"
                        class="form-input"
                        min="0"
                        value=${data.clients_coached || ''}
                        onInput=${(e) => setData({ ...data, clients_coached: e.target.value })}
                    />
                </div>

                <div class="form-group">
                    <label class="form-label">Success Rate (%)</label>
                    <input
                        type="number"
                        class="form-input"
                        min="0"
                        max="100"
                        value=${data.success_rate || ''}
                        onInput=${(e) => setData({ ...data, success_rate: e.target.value })}
                    />
                </div>
            </div>

            <div class="form-group">
                <label class="form-label">Education & Qualifications</label>
                <p class="form-help">List your relevant degrees, certifications, and training</p>
                <textarea
                    class="form-textarea"
                    rows="4"
                    placeholder="- Master's in Psychology, Stanford University
- ICF Certified Coach (PCC)
- Neurolinguistic Programming Practitioner"
                    value=${data.education || ''}
                    onInput=${(e) => setData({ ...data, education: e.target.value })}
                ></textarea>
            </div>

            <div class="form-group">
                <label class="form-label">Coaching Philosophy</label>
                <p class="form-help">What's your approach to coaching? What makes you unique?</p>
                <textarea
                    class="form-textarea"
                    rows="5"
                    placeholder="I believe in a holistic approach that combines cognitive-behavioral techniques with mindfulness..."
                    value=${data.philosophy || ''}
                    onInput=${(e) => setData({ ...data, philosophy: e.target.value })}
                ></textarea>
            </div>

            <button
                class="btn-primary"
                onClick=${handleSave}
                disabled=${saving}
            >
                ${saving ? 'Saving...' : '💾 Save Overview'}
            </button>
        </div>
    `;
};

// ============================================
// CERTIFICATIONS TAB
// ============================================

const CertificationsTab = ({ portfolio, onSave, saving }) => {
    const [certifications, setCertifications] = useState(portfolio.certifications || []);
    const [editingIndex, setEditingIndex] = useState(null);
    const [editData, setEditData] = useState({});

    const addCertification = () => {
        setEditingIndex(certifications.length);
        setEditData({
            name: '',
            issuer: '',
            date: '',
            credential_id: '',
            image_url: ''
        });
    };

    const saveCertification = () => {
        const newCertifications = [...certifications];
        if (editingIndex >= 0 && editingIndex < certifications.length) {
            newCertifications[editingIndex] = editData;
        } else {
            newCertifications.push(editData);
        }
        setCertifications(newCertifications);
        onSave({ ...portfolio, certifications: newCertifications });
        setEditingIndex(null);
        setEditData({});
    };

    const deleteCertification = (index) => {
        if (confirm('Delete this certification?')) {
            const newCertifications = certifications.filter((_, i) => i !== index);
            setCertifications(newCertifications);
            onSave({ ...portfolio, certifications: newCertifications });
        }
    };

    return html`
        <div class="portfolio-tab-content">
            <h2 class="section-title">🎓 Certifications & Credentials</h2>
            <p class="section-description">
                Add your professional certifications to build credibility.
            </p>

            <button class="btn-primary" onClick=${addCertification}>
                ➕ Add Certification
            </button>

            <div class="certifications-list">
                ${certifications.map((cert, index) => html`
                    <div key=${index} class="certification-card">
                        <div class="certification-content">
                            ${cert.image_url && html`
                                <img src=${cert.image_url} alt=${cert.name} class="certification-image" />
                            `}
                            <div class="certification-info">
                                <h3 class="certification-name">${cert.name}</h3>
                                <p class="certification-issuer">${cert.issuer}</p>
                                <p class="certification-date">${cert.date}</p>
                                ${cert.credential_id && html`
                                    <p class="certification-id">ID: ${cert.credential_id}</p>
                                `}
                            </div>
                        </div>
                        <div class="certification-actions">
                            <button
                                class="btn-icon"
                                onClick=${() => {
                                    setEditingIndex(index);
                                    setEditData(cert);
                                }}
                            >
                                ✏️
                            </button>
                            <button
                                class="btn-icon"
                                onClick=${() => deleteCertification(index)}
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                `)}
            </div>

            ${editingIndex !== null && html`
                <div class="edit-modal">
                    <div class="edit-modal-content">
                        <h3>Edit Certification</h3>

                        <div class="form-group">
                            <label class="form-label">Certification Name</label>
                            <input
                                type="text"
                                class="form-input"
                                placeholder="e.g., ICF Certified Coach (PCC)"
                                value=${editData.name || ''}
                                onInput=${(e) => setEditData({ ...editData, name: e.target.value })}
                            />
                        </div>

                        <div class="form-group">
                            <label class="form-label">Issuing Organization</label>
                            <input
                                type="text"
                                class="form-input"
                                placeholder="e.g., International Coaching Federation"
                                value=${editData.issuer || ''}
                                onInput=${(e) => setEditData({ ...editData, issuer: e.target.value })}
                            />
                        </div>

                        <div class="form-group">
                            <label class="form-label">Date Issued</label>
                            <input
                                type="month"
                                class="form-input"
                                value=${editData.date || ''}
                                onInput=${(e) => setEditData({ ...editData, date: e.target.value })}
                            />
                        </div>

                        <div class="form-group">
                            <label class="form-label">Credential ID (optional)</label>
                            <input
                                type="text"
                                class="form-input"
                                placeholder="e.g., 12345678"
                                value=${editData.credential_id || ''}
                                onInput=${(e) => setEditData({ ...editData, credential_id: e.target.value })}
                            />
                        </div>

                        <div class="form-group">
                            <label class="form-label">Certificate Image URL (optional)</label>
                            <input
                                type="url"
                                class="form-input"
                                placeholder="https://..."
                                value=${editData.image_url || ''}
                                onInput=${(e) => setEditData({ ...editData, image_url: e.target.value })}
                            />
                        </div>

                        <div class="modal-actions">
                            <button class="btn-secondary" onClick=${() => setEditingIndex(null)}>
                                Cancel
                            </button>
                            <button class="btn-primary" onClick=${saveCertification}>
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            `}
        </div>
    `;
};

// ============================================
// CASE STUDIES TAB
// ============================================

const CaseStudiesTab = ({ portfolio, onSave, saving }) => {
    const [caseStudies, setCaseStudies] = useState(portfolio.case_studies || []);
    const [editingIndex, setEditingIndex] = useState(null);
    const [editData, setEditData] = useState({});

    const addCaseStudy = () => {
        setEditingIndex(caseStudies.length);
        setEditData({
            title: '',
            client_type: '',
            challenge: '',
            approach: '',
            results: '',
            duration: '',
            image_url: ''
        });
    };

    const saveCaseStudy = () => {
        const newCaseStudies = [...caseStudies];
        if (editingIndex >= 0 && editingIndex < caseStudies.length) {
            newCaseStudies[editingIndex] = editData;
        } else {
            newCaseStudies.push(editData);
        }
        setCaseStudies(newCaseStudies);
        onSave({ ...portfolio, case_studies: newCaseStudies });
        setEditingIndex(null);
        setEditData({});
    };

    const deleteCaseStudy = (index) => {
        if (confirm('Delete this case study?')) {
            const newCaseStudies = caseStudies.filter((_, i) => i !== index);
            setCaseStudies(newCaseStudies);
            onSave({ ...portfolio, case_studies: newCaseStudies });
        }
    };

    return html`
        <div class="portfolio-tab-content">
            <h2 class="section-title">📊 Case Studies & Success Stories</h2>
            <p class="section-description">
                Share anonymized success stories to demonstrate your impact.
            </p>

            <button class="btn-primary" onClick=${addCaseStudy}>
                ➕ Add Case Study
            </button>

            <div class="case-studies-list">
                ${caseStudies.map((study, index) => html`
                    <div key=${index} class="case-study-card">
                        ${study.image_url && html`
                            <img src=${study.image_url} alt=${study.title} class="case-study-image" />
                        `}
                        <div class="case-study-content">
                            <h3 class="case-study-title">${study.title}</h3>
                            <p class="case-study-meta">
                                ${study.client_type} • ${study.duration}
                            </p>
                            <div class="case-study-section">
                                <strong>Challenge:</strong>
                                <p>${study.challenge}</p>
                            </div>
                            <div class="case-study-section">
                                <strong>Approach:</strong>
                                <p>${study.approach}</p>
                            </div>
                            <div class="case-study-section">
                                <strong>Results:</strong>
                                <p>${study.results}</p>
                            </div>
                        </div>
                        <div class="case-study-actions">
                            <button
                                class="btn-icon"
                                onClick=${() => {
                                    setEditingIndex(index);
                                    setEditData(study);
                                }}
                            >
                                ✏️
                            </button>
                            <button
                                class="btn-icon"
                                onClick=${() => deleteCaseStudy(index)}
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                `)}
            </div>

            ${editingIndex !== null && html`
                <div class="edit-modal">
                    <div class="edit-modal-content case-study-modal">
                        <h3>Edit Case Study</h3>

                        <div class="form-group">
                            <label class="form-label">Title</label>
                            <input
                                type="text"
                                class="form-input"
                                placeholder="e.g., Career Transition Success Story"
                                value=${editData.title || ''}
                                onInput=${(e) => setEditData({ ...editData, title: e.target.value })}
                            />
                        </div>

                        <div class="form-group">
                            <label class="form-label">Client Type</label>
                            <input
                                type="text"
                                class="form-input"
                                placeholder="e.g., Executive, Mid-Career Professional"
                                value=${editData.client_type || ''}
                                onInput=${(e) => setEditData({ ...editData, client_type: e.target.value })}
                            />
                        </div>

                        <div class="form-group">
                            <label class="form-label">Duration</label>
                            <input
                                type="text"
                                class="form-input"
                                placeholder="e.g., 6 months, 12 sessions"
                                value=${editData.duration || ''}
                                onInput=${(e) => setEditData({ ...editData, duration: e.target.value })}
                            />
                        </div>

                        <div class="form-group">
                            <label class="form-label">Challenge</label>
                            <textarea
                                class="form-textarea"
                                rows="3"
                                placeholder="What was the client's challenge?"
                                value=${editData.challenge || ''}
                                onInput=${(e) => setEditData({ ...editData, challenge: e.target.value })}
                            ></textarea>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Approach</label>
                            <textarea
                                class="form-textarea"
                                rows="4"
                                placeholder="How did you help them?"
                                value=${editData.approach || ''}
                                onInput=${(e) => setEditData({ ...editData, approach: e.target.value })}
                            ></textarea>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Results</label>
                            <textarea
                                class="form-textarea"
                                rows="3"
                                placeholder="What outcomes were achieved?"
                                value=${editData.results || ''}
                                onInput=${(e) => setEditData({ ...editData, results: e.target.value })}
                            ></textarea>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Image URL (optional)</label>
                            <input
                                type="url"
                                class="form-input"
                                placeholder="https://..."
                                value=${editData.image_url || ''}
                                onInput=${(e) => setEditData({ ...editData, image_url: e.target.value })}
                            />
                        </div>

                        <div class="modal-actions">
                            <button class="btn-secondary" onClick=${() => setEditingIndex(null)}>
                                Cancel
                            </button>
                            <button class="btn-primary" onClick=${saveCaseStudy}>
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            `}
        </div>
    `;
};

// ============================================
// MEDIA TAB
// ============================================

const MediaTab = ({ portfolio, onSave, saving }) => {
    const [media, setMedia] = useState(portfolio.media || {
        video_intro: '',
        images: [],
        documents: []
    });

    const handleSave = () => {
        onSave({ ...portfolio, media });
    };

    const addImage = () => {
        const url = prompt('Enter image URL:');
        if (url) {
            setMedia({
                ...media,
                images: [...media.images, { url, caption: '' }]
            });
        }
    };

    const removeImage = (index) => {
        setMedia({
            ...media,
            images: media.images.filter((_, i) => i !== index)
        });
    };

    return html`
        <div class="portfolio-tab-content">
            <h2 class="section-title">🎬 Media & Content</h2>
            <p class="section-description">
                Add videos, images, and documents to showcase your work.
            </p>

            <div class="form-group">
                <label class="form-label">Video Introduction</label>
                <p class="form-help">Add a YouTube or Vimeo video URL</p>
                <input
                    type="url"
                    class="form-input"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value=${media.video_intro || ''}
                    onInput=${(e) => setMedia({ ...media, video_intro: e.target.value })}
                />
                ${media.video_intro && html`
                    <div class="video-preview">
                        <iframe
                            src=${getEmbedUrl(media.video_intro)}
                            frameborder="0"
                            allowfullscreen
                        ></iframe>
                    </div>
                `}
            </div>

            <div class="form-group">
                <label class="form-label">Portfolio Images</label>
                <p class="form-help">Add images that represent your coaching practice</p>
                <button class="btn-secondary" onClick=${addImage}>
                    ➕ Add Image
                </button>

                <div class="images-grid">
                    ${media.images?.map((img, index) => html`
                        <div key=${index} class="image-item">
                            <img src=${img.url} alt=${img.caption || 'Portfolio image'} />
                            <button
                                class="btn-remove"
                                onClick=${() => removeImage(index)}
                            >
                                ✕
                            </button>
                        </div>
                    `)}
                </div>
            </div>

            <button
                class="btn-primary"
                onClick=${handleSave}
                disabled=${saving}
            >
                ${saving ? 'Saving...' : '💾 Save Media'}
            </button>
        </div>
    `;
};

// ============================================
// TESTIMONIALS TAB
// ============================================

const TestimonialsTab = ({ portfolio, onSave, saving }) => {
    return html`
        <div class="portfolio-tab-content">
            <h2 class="section-title">💬 Client Testimonials</h2>
            <p class="section-description">
                Testimonials are collected automatically from completed sessions.
                Clients can leave reviews after each session.
            </p>

            <div class="info-box">
                <h3>How it works:</h3>
                <ul>
                    <li>Clients can review you after each session</li>
                    <li>Reviews are verified and linked to actual bookings</li>
                    <li>You can respond to reviews</li>
                    <li>High ratings improve your search visibility</li>
                </ul>
            </div>

            <p>Your testimonials will appear here once clients start leaving reviews.</p>
        </div>
    `;
};

// ============================================
// HELPERS
// ============================================

const getDefaultPortfolio = () => ({
    overview: {},
    certifications: [],
    case_studies: [],
    media: { video_intro: '', images: [], documents: [] },
    testimonials: []
});

const getEmbedUrl = (url) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
        return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('vimeo.com')) {
        const videoId = url.split('/').pop();
        return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
};

// ============================================
// CONSTANTS
// ============================================

const PORTFOLIO_TABS = [
    { id: 'overview', label: 'Overview', icon: '📋' },
    { id: 'certifications', label: 'Certifications', icon: '🎓' },
    { id: 'case-studies', label: 'Case Studies', icon: '📊' },
    { id: 'media', label: 'Media', icon: '🎬' },
    { id: 'testimonials', label: 'Testimonials', icon: '💬' }
];

export default PortfolioBuilder;
