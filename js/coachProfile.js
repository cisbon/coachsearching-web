// js/coachProfile.js - Trust-Building Coach Profile Components
import htm from './vendor/htm.js';
import { t } from './i18n.js';

const React = window.React;
const { useState, useEffect, useRef, useCallback, useMemo } = React;
const html = htm.bind(React.createElement);

// =============================================
// TRUST SCORE COMPONENT
// =============================================

export const TrustScore = React.memo(({ score, size = 'medium' }) => {
    const getScoreColor = (score) => {
        if (score >= 80) return 'var(--petrol-primary)';
        if (score >= 60) return '#4CAF50';
        if (score >= 40) return '#FFC107';
        return '#FF9800';
    };

    const getScoreLabel = (score) => {
        if (score >= 80) return t('trust.excellent') || 'Excellent';
        if (score >= 60) return t('trust.good') || 'Good';
        if (score >= 40) return t('trust.building') || 'Building';
        return t('trust.new') || 'New';
    };

    const sizeClasses = {
        small: 'trust-score-small',
        medium: 'trust-score-medium',
        large: 'trust-score-large'
    };

    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return html`
        <div class="trust-score ${sizeClasses[size]}">
            <svg viewBox="0 0 100 100" class="trust-score-circle">
                <circle
                    class="trust-score-bg"
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#e0e0e0"
                    stroke-width="8"
                />
                <circle
                    class="trust-score-progress"
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke=${getScoreColor(score)}
                    stroke-width="8"
                    stroke-linecap="round"
                    stroke-dasharray=${circumference}
                    stroke-dashoffset=${strokeDashoffset}
                    transform="rotate(-90 50 50)"
                />
            </svg>
            <div class="trust-score-content">
                <span class="trust-score-value">${score}</span>
                <span class="trust-score-label">${getScoreLabel(score)}</span>
            </div>
        </div>
    `;
});

// =============================================
// VERIFICATION BADGE COMPONENT
// =============================================

export const VerificationBadge = React.memo(({ type, verified = false, size = 'small' }) => {
    const badges = {
        identity: {
            icon: '✓',
            label: t('badge.identity') || 'Identity Verified',
            color: 'var(--petrol-primary)'
        },
        credentials: {
            icon: '🎓',
            label: t('badge.credentials') || 'Credentials Verified',
            color: '#4CAF50'
        },
        video: {
            icon: '🎥',
            label: t('badge.video') || 'Video Intro',
            color: '#2196F3'
        },
        topRated: {
            icon: '⭐',
            label: t('badge.topRated') || 'Top Rated',
            color: '#FFB300'
        },
        experienced: {
            icon: '🏆',
            label: t('badge.experienced') || 'Experienced',
            color: '#9C27B0'
        },
        fastResponse: {
            icon: '⚡',
            label: t('badge.fastResponse') || 'Fast Response',
            color: '#00BCD4'
        }
    };

    const badge = badges[type];
    if (!badge || !verified) return null;

    return html`
        <div
            class="verification-badge verification-badge-${size}"
            style=${{ backgroundColor: badge.color }}
            title=${badge.label}
        >
            <span class="badge-icon">${badge.icon}</span>
            ${size !== 'small' && html`<span class="badge-label">${badge.label}</span>`}
        </div>
    `;
});

// =============================================
// TRUST SIGNALS BAR
// =============================================

export const TrustSignalsBar = React.memo(({ coach }) => {
    const hasVideo = coach.video_intro_url;
    const isVerified = coach.is_verified;
    const hasCredentials = coach.verified_credentials_count > 0;
    const isTopRated = (coach.rating_average || 0) >= 4.5 && (coach.rating_count || 0) >= 10;
    const isExperienced = coach.total_sessions >= 50 || coach.years_experience >= 5;
    const hasFastResponse = coach.response_time_hours <= 4;

    return html`
        <div class="trust-signals-bar">
            <${VerificationBadge} type="identity" verified=${isVerified} />
            <${VerificationBadge} type="credentials" verified=${hasCredentials} />
            <${VerificationBadge} type="video" verified=${hasVideo} />
            <${VerificationBadge} type="topRated" verified=${isTopRated} />
            <${VerificationBadge} type="experienced" verified=${isExperienced} />
            <${VerificationBadge} type="fastResponse" verified=${hasFastResponse} />
        </div>
    `;
});

// =============================================
// VIDEO PLAYER COMPONENT
// =============================================

export const CoachVideoPlayer = React.memo(({ videoUrl, thumbnailUrl, coachName, autoplay = false }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const videoRef = useRef(null);

    const handlePlay = useCallback(() => {
        setIsPlaying(true);
        if (videoRef.current) {
            videoRef.current.play();
        }
    }, []);

    const handleVideoLoad = useCallback(() => {
        setIsLoaded(true);
    }, []);

    if (!videoUrl) {
        return html`
            <div class="video-placeholder">
                <div class="video-placeholder-icon">🎥</div>
                <div class="video-placeholder-text">${t('video.noVideo') || 'No video introduction yet'}</div>
            </div>
        `;
    }

    return html`
        <div class="coach-video-player ${isPlaying ? 'playing' : ''}">
            ${!isPlaying && html`
                <div class="video-thumbnail" onClick=${handlePlay}>
                    <img
                        src=${thumbnailUrl || videoUrl + '#t=0.5'}
                        alt=${`${coachName} introduction video`}
                        loading="lazy"
                    />
                    <div class="video-play-button">
                        <svg viewBox="0 0 24 24" width="64" height="64">
                            <circle cx="12" cy="12" r="12" fill="rgba(0,98,102,0.9)" />
                            <path d="M10 8l6 4-6 4V8z" fill="white" />
                        </svg>
                    </div>
                    <div class="video-duration-badge">${t('video.watchIntro') || 'Watch Intro'}</div>
                </div>
            `}
            ${isPlaying && html`
                <video
                    ref=${videoRef}
                    src=${videoUrl}
                    controls
                    autoplay
                    onLoadedData=${handleVideoLoad}
                    class="video-element"
                >
                    ${t('video.notSupported') || 'Your browser does not support the video tag.'}
                </video>
            `}
        </div>
    `;
});

// =============================================
// COACH CARD ENHANCED (with Trust Signals)
// =============================================

export const CoachCardEnhanced = React.memo(({ coach, onViewDetails, formatPrice }) => {
    const rating = coach.rating_average || coach.rating || 0;
    const reviewsCount = coach.rating_count || coach.reviews_count || 0;
    const location = coach.location || coach.city || 'Remote';
    const languages = coach.languages || [];
    const specialties = coach.specialties || [];
    const bio = coach.bio || '';
    const trustScore = coach.trust_score || 0;
    const hasVideo = !!coach.video_intro_url;
    const isVerified = coach.is_verified;
    const yearsExp = coach.years_experience || 0;
    const totalSessions = coach.total_sessions || 0;

    return html`
        <div class="coach-card coach-card-enhanced ${hasVideo ? 'has-video' : ''}">
            <div class="coach-card-header">
                <div class="coach-avatar-container">
                    <img src=${coach.avatar_url || 'https://via.placeholder.com/120'} alt=${coach.full_name} class="coach-img" loading="lazy" />
                    ${isVerified && html`<div class="verified-badge-overlay">✓</div>`}
                </div>
                ${hasVideo && html`
                    <div class="video-indicator" title=${t('video.hasIntro') || 'Has video introduction'}>
                        🎥
                    </div>
                `}
            </div>

            <div class="coach-info">
                <div class="coach-header">
                    <div>
                        <h3 class="coach-name">${coach.full_name}</h3>
                        <div class="coach-title">${coach.title}</div>
                    </div>
                    <div class="trust-score-mini">
                        <div class="score-circle" style=${{
                            background: `conic-gradient(var(--petrol-primary) ${trustScore * 3.6}deg, #e0e0e0 0deg)`
                        }}>
                            <span>${trustScore}</span>
                        </div>
                    </div>
                </div>

                <div class="coach-meta">
                    <span>📍 ${location}</span>
                    ${languages.length > 0 && html`<span>💬 ${languages.slice(0, 3).join(', ')}</span>`}
                    ${yearsExp > 0 && html`<span>📅 ${yearsExp}+ ${t('coach.yearsExp') || 'years'}</span>`}
                </div>

                <${TrustSignalsBar} coach=${coach} />

                <div class="coach-details">
                    <p>${bio.length > 120 ? bio.substring(0, 120) + '...' : bio}</p>
                </div>

                ${specialties.length > 0 && html`
                    <div class="specialties-pills">
                        ${specialties.slice(0, 3).map(spec => html`
                            <span class="specialty-pill" key=${spec}>${spec}</span>
                        `)}
                        ${specialties.length > 3 && html`
                            <span class="specialty-pill specialty-more">+${specialties.length - 3}</span>
                        `}
                    </div>
                `}
            </div>

            <div class="coach-card-footer">
                <div class="rating-price">
                    ${rating > 0 ? html`
                        <div class="coach-rating">
                            <span class="rating-star">★</span>
                            <span class="rating-value">${rating.toFixed(1)}</span>
                            <span class="rating-count">(${reviewsCount})</span>
                        </div>
                    ` : html`
                        <div class="coach-rating new-coach">
                            <span>${t('coach.new') || 'New Coach'}</span>
                        </div>
                    `}
                    <div class="price-section">
                        <span class="price-value">${formatPrice ? formatPrice(coach.hourly_rate) : '€' + coach.hourly_rate}</span>
                        <span class="price-label">/${t('coach.hour') || 'hr'}</span>
                    </div>
                </div>
                <button class="btn-view-profile" onClick=${() => onViewDetails(coach)}>
                    ${t('coach.view_profile') || 'View Profile'}
                </button>
            </div>
        </div>
    `;
});

// =============================================
// FEATURED COACH CARD (Video Prominent)
// =============================================

export const CoachCardFeatured = React.memo(({ coach, onViewDetails, formatPrice }) => {
    const rating = coach.rating_average || coach.rating || 0;
    const reviewsCount = coach.rating_count || coach.reviews_count || 0;
    const location = coach.location || coach.city || 'Remote';
    const languages = coach.languages || [];
    const specialties = coach.specialties || [];
    const trustScore = coach.trust_score || 0;
    const isVerified = coach.is_verified;

    return html`
        <div class="coach-card-featured">
            <div class="featured-video-section">
                <${CoachVideoPlayer}
                    videoUrl=${coach.video_intro_url}
                    thumbnailUrl=${coach.video_thumbnail_url}
                    coachName=${coach.full_name}
                />
            </div>

            <div class="featured-content">
                <div class="featured-header">
                    <div class="coach-avatar-container">
                        <img src=${coach.avatar_url || 'https://via.placeholder.com/80'} alt=${coach.full_name} class="coach-img-featured" loading="lazy" />
                        ${isVerified && html`<div class="verified-badge-overlay small">✓</div>`}
                    </div>
                    <div class="coach-info-header">
                        <h3 class="coach-name">${coach.full_name}</h3>
                        <div class="coach-title">${coach.title}</div>
                        <div class="coach-meta-inline">
                            <span>📍 ${location}</span>
                            ${rating > 0 && html`
                                <span>★ ${rating.toFixed(1)} (${reviewsCount})</span>
                            `}
                        </div>
                    </div>
                    <${TrustScore} score=${trustScore} size="medium" />
                </div>

                <${TrustSignalsBar} coach=${coach} />

                ${specialties.length > 0 && html`
                    <div class="specialties-pills">
                        ${specialties.slice(0, 4).map(spec => html`
                            <span class="specialty-pill" key=${spec}>${spec}</span>
                        `)}
                    </div>
                `}

                <div class="featured-footer">
                    <div class="price-section-featured">
                        <span class="price-from">${t('coach.from') || 'From'}</span>
                        <span class="price-value-featured">${formatPrice ? formatPrice(coach.hourly_rate) : '€' + coach.hourly_rate}</span>
                        <span class="price-label">/${t('coach.session') || 'session'}</span>
                    </div>
                    <button class="btn-book-featured" onClick=${() => onViewDetails(coach)}>
                        ${t('coach.bookSession') || 'Book Session'}
                    </button>
                </div>
            </div>
        </div>
    `;
});

// =============================================
// CREDENTIALS LIST COMPONENT
// =============================================

export const CredentialsList = React.memo(({ credentials }) => {
    if (!credentials || credentials.length === 0) {
        return html`
            <div class="credentials-empty">
                <span>${t('credentials.none') || 'No credentials added yet'}</span>
            </div>
        `;
    }

    const typeIcons = {
        certification: '📜',
        degree: '🎓',
        accreditation: '🏅',
        training: '📚',
        award: '🏆'
    };

    return html`
        <div class="credentials-list">
            ${credentials.map(cred => html`
                <div class="credential-item ${cred.is_verified ? 'verified' : ''}" key=${cred.id}>
                    <span class="credential-icon">${typeIcons[cred.credential_type] || '📋'}</span>
                    <div class="credential-info">
                        <div class="credential-title">${cred.title}</div>
                        <div class="credential-issuer">${cred.issuing_organization}</div>
                        ${cred.issue_date && html`
                            <div class="credential-date">${new Date(cred.issue_date).getFullYear()}</div>
                        `}
                    </div>
                    ${cred.is_verified && html`
                        <div class="credential-verified-badge" title=${t('credentials.verified') || 'Verified'}>
                            ✓
                        </div>
                    `}
                </div>
            `)}
        </div>
    `;
});

// =============================================
// REVIEW CARD COMPONENT
// =============================================

export const ReviewCard = React.memo(({ review }) => {
    const renderStars = (rating) => {
        return Array(5).fill(0).map((_, i) => html`
            <span class="star ${i < rating ? 'filled' : ''}" key=${i}>★</span>
        `);
    };

    return html`
        <div class="review-card">
            <div class="review-header">
                <div class="reviewer-info">
                    <img
                        src=${review.client_avatar || 'https://via.placeholder.com/40'}
                        alt="Reviewer"
                        class="reviewer-avatar"
                    />
                    <div>
                        <div class="reviewer-name">${review.client_name || 'Anonymous'}</div>
                        <div class="review-date">${new Date(review.created_at).toLocaleDateString()}</div>
                    </div>
                </div>
                <div class="review-rating">
                    ${renderStars(review.rating)}
                </div>
            </div>
            ${review.comment && html`
                <div class="review-comment">${review.comment}</div>
            `}
        </div>
    `;
});

// =============================================
// PRICING CARD COMPONENT
// =============================================

export const PricingCard = React.memo(({ service, onBook, formatPrice }) => {
    const typeLabels = {
        single_session: t('pricing.single') || 'Single Session',
        package: t('pricing.package') || 'Package',
        subscription: t('pricing.subscription') || 'Subscription',
        discovery_call: t('pricing.discovery') || 'Discovery Call'
    };

    const isDiscovery = service.service_type === 'discovery_call';

    return html`
        <div class="pricing-card ${service.is_featured ? 'featured' : ''} ${isDiscovery ? 'discovery' : ''}">
            ${service.is_featured && html`
                <div class="pricing-badge">${t('pricing.popular') || 'Most Popular'}</div>
            `}
            <div class="pricing-type">${typeLabels[service.service_type]}</div>
            <h4 class="pricing-name">${service.name}</h4>
            ${service.description && html`
                <p class="pricing-description">${service.description}</p>
            `}
            <div class="pricing-details">
                <div class="pricing-duration">
                    <span class="duration-icon">⏱</span>
                    ${service.duration_minutes} ${t('pricing.minutes') || 'min'}
                </div>
                ${service.session_count > 1 && html`
                    <div class="pricing-sessions">
                        <span class="sessions-icon">📅</span>
                        ${service.session_count} ${t('pricing.sessions') || 'sessions'}
                    </div>
                `}
            </div>
            <div class="pricing-price">
                ${isDiscovery && service.price === 0 ? html`
                    <span class="price-free">${t('pricing.free') || 'Free'}</span>
                ` : html`
                    <span class="price-amount">${formatPrice ? formatPrice(service.price) : '€' + service.price}</span>
                `}
            </div>
            <button
                class="btn-book-service ${isDiscovery ? 'btn-discovery' : ''}"
                onClick=${() => onBook(service)}
            >
                ${isDiscovery ? (t('pricing.scheduleCall') || 'Schedule Call') : (t('pricing.bookNow') || 'Book Now')}
            </button>
        </div>
    `;
});

// =============================================
// PROFILE COMPLETION CHECKLIST
// =============================================

export const ProfileCompletionChecklist = React.memo(({ coach, onComplete }) => {
    const items = [
        { key: 'avatar', label: t('checklist.photo') || 'Profile Photo', completed: !!coach.avatar_url, icon: '📷' },
        { key: 'bio', label: t('checklist.bio') || 'Bio (100+ chars)', completed: coach.bio && coach.bio.length >= 100, icon: '✍️' },
        { key: 'specialties', label: t('checklist.specialties') || 'Specialties', completed: coach.specialties && coach.specialties.length > 0, icon: '🎯' },
        { key: 'video', label: t('checklist.video') || 'Video Introduction', completed: !!coach.video_intro_url, icon: '🎥' },
        { key: 'credentials', label: t('checklist.credentials') || 'Add Credentials', completed: coach.credentials_count > 0, icon: '🎓' },
        { key: 'pricing', label: t('checklist.pricing') || 'Set Pricing', completed: coach.hourly_rate && coach.hourly_rate > 0, icon: '💰' },
        { key: 'availability', label: t('checklist.availability') || 'Set Availability', completed: coach.availability_set, icon: '📅' },
    ];

    const completedCount = items.filter(i => i.completed).length;
    const percentage = Math.round((completedCount / items.length) * 100);

    return html`
        <div class="profile-checklist">
            <div class="checklist-header">
                <h4>${t('checklist.title') || 'Complete Your Profile'}</h4>
                <div class="checklist-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style=${{ width: percentage + '%' }}></div>
                    </div>
                    <span class="progress-text">${percentage}%</span>
                </div>
            </div>
            <ul class="checklist-items">
                ${items.map(item => html`
                    <li
                        class="checklist-item ${item.completed ? 'completed' : ''}"
                        key=${item.key}
                        onClick=${() => !item.completed && onComplete && onComplete(item.key)}
                    >
                        <span class="item-icon">${item.completed ? '✅' : item.icon}</span>
                        <span class="item-label">${item.label}</span>
                        ${!item.completed && html`
                            <span class="item-action">→</span>
                        `}
                    </li>
                `)}
            </ul>
        </div>
    `;
});

// =============================================
// PLATFORM STATS COMPONENT
// =============================================

export const PlatformStats = React.memo(({ stats }) => {
    const statItems = [
        { value: stats?.total_coaches || 0, label: t('stats.coaches') || 'Professional Coaches', icon: '👨‍🏫' },
        { value: stats?.total_sessions || 0, label: t('stats.sessions') || 'Sessions Completed', icon: '📅' },
        { value: Math.round(stats?.total_hours_coached || 0), label: t('stats.hours') || 'Hours of Coaching', icon: '⏰' },
        { value: stats?.countries_served || 0, label: t('stats.countries') || 'Countries Served', icon: '🌍' }
    ];

    const formatNumber = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    return html`
        <div class="platform-stats">
            ${statItems.map((stat, i) => html`
                <div class="stat-item" key=${i}>
                    <span class="stat-icon">${stat.icon}</span>
                    <span class="stat-value">${formatNumber(stat.value)}</span>
                    <span class="stat-label">${stat.label}</span>
                </div>
            `)}
        </div>
    `;
});

// =============================================
// VIDEO UPLOAD COMPONENT
// =============================================

export const VideoUpload = ({ onUpload, maxDuration = 120, currentVideoUrl }) => {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [preview, setPreview] = useState(currentVideoUrl);
    const fileInputRef = useRef(null);

    const handleFileSelect = useCallback(async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('video/')) {
            setError(t('video.invalidType') || 'Please select a video file');
            return;
        }

        // Validate file size (max 100MB)
        if (file.size > 100 * 1024 * 1024) {
            setError(t('video.tooLarge') || 'Video must be under 100MB');
            return;
        }

        // Create preview
        const previewUrl = URL.createObjectURL(file);
        setPreview(previewUrl);

        // Check duration
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = previewUrl;

        video.onloadedmetadata = async () => {
            if (video.duration > maxDuration) {
                setError(t('video.tooLong', { max: maxDuration }) || `Video must be under ${maxDuration} seconds`);
                URL.revokeObjectURL(previewUrl);
                setPreview(currentVideoUrl);
                return;
            }

            // Upload to Supabase Storage
            setUploading(true);
            setError(null);

            try {
                const supabase = window.supabaseClient;
                const user = supabase.auth.getUser();
                const userId = (await user)?.data?.user?.id;

                if (!userId) {
                    throw new Error('Not authenticated');
                }

                const fileName = `${userId}/intro-${Date.now()}.${file.name.split('.').pop()}`;

                const { data, error: uploadError } = await supabase.storage
                    .from('coach-videos')
                    .upload(fileName, file, {
                        cacheControl: '3600',
                        upsert: true,
                        onUploadProgress: (progress) => {
                            setProgress(Math.round((progress.loaded / progress.total) * 100));
                        }
                    });

                if (uploadError) throw uploadError;

                // Get public URL
                const { data: urlData } = supabase.storage
                    .from('coach-videos')
                    .getPublicUrl(fileName);

                onUpload && onUpload(urlData.publicUrl);
                setUploading(false);
                setProgress(0);

            } catch (err) {
                console.error('Upload error:', err);
                setError(t('video.uploadFailed') || 'Upload failed. Please try again.');
                setUploading(false);
                setProgress(0);
            }
        };
    }, [maxDuration, currentVideoUrl, onUpload]);

    const handleRemove = useCallback(() => {
        setPreview(null);
        onUpload && onUpload(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [onUpload]);

    return html`
        <div class="video-upload">
            <input
                type="file"
                ref=${fileInputRef}
                accept="video/*"
                onChange=${handleFileSelect}
                style=${{ display: 'none' }}
            />

            ${!preview && !uploading && html`
                <div class="upload-dropzone" onClick=${() => fileInputRef.current?.click()}>
                    <div class="dropzone-icon">🎥</div>
                    <div class="dropzone-text">${t('video.uploadPrompt') || 'Click to upload your introduction video'}</div>
                    <div class="dropzone-hint">${t('video.uploadHint', { max: maxDuration }) || `Max ${maxDuration} seconds, under 100MB`}</div>
                </div>
            `}

            ${uploading && html`
                <div class="upload-progress">
                    <div class="progress-circle">
                        <svg viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="#e0e0e0" stroke-width="8" />
                            <circle
                                cx="50" cy="50" r="45"
                                fill="none"
                                stroke="var(--petrol-primary)"
                                stroke-width="8"
                                stroke-dasharray=${2 * Math.PI * 45}
                                stroke-dashoffset=${2 * Math.PI * 45 * (1 - progress / 100)}
                                transform="rotate(-90 50 50)"
                            />
                        </svg>
                        <span class="progress-text">${progress}%</span>
                    </div>
                    <div class="upload-status">${t('video.uploading') || 'Uploading...'}</div>
                </div>
            `}

            ${preview && !uploading && html`
                <div class="video-preview">
                    <video src=${preview} controls class="preview-video" />
                    <button class="btn-remove-video" onClick=${handleRemove}>
                        ${t('video.remove') || 'Remove Video'}
                    </button>
                </div>
            `}

            ${error && html`
                <div class="upload-error">${error}</div>
            `}
        </div>
    `;
};

// Export all components
export default {
    TrustScore,
    VerificationBadge,
    TrustSignalsBar,
    CoachVideoPlayer,
    CoachCardEnhanced,
    CoachCardFeatured,
    CredentialsList,
    ReviewCard,
    PricingCard,
    ProfileCompletionChecklist,
    PlatformStats,
    VideoUpload
};
