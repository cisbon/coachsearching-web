/**
 * DashboardProfile Component
 * LinkedIn-style coach profile editor with sections for intro, about, specialties, video, and links
 */

import htm from '../../vendor/htm.js';

const React = window.React;
const { useState, useEffect } = React;
const html = htm.bind(React.createElement);

/**
 * DashboardProfile Component
 * @param {Object} props
 * @param {Object} props.session - User session
 * @param {string} props.userType - User type ('coach' or 'client')
 */
export const DashboardProfile = ({ session, userType }) => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [uploading, setUploading] = useState(false);
    const [editSection, setEditSection] = useState(null);
    const [coachId, setCoachId] = useState(null);
    const [formData, setFormData] = useState({
        full_name: session.user.user_metadata?.full_name || '',
        avatar_url: '',
        banner_url: '',
        title: '',
        bio: '',
        location_city: '',
        location_country: '',
        hourly_rate: '',
        currency: 'EUR',
        specialties: [],
        languages: [],
        years_experience: 0,
        offers_online: true,
        offers_in_person: false,
        website_url: '',
        linkedin_url: '',
        intro_video_url: ''
    });

    // Predefined options matching filters exactly - using SVG flags for Windows compatibility
    const languageOptions = [
        { name: 'English', flagCode: 'gb' },
        { name: 'German', flagCode: 'de' },
        { name: 'Spanish', flagCode: 'es' },
        { name: 'French', flagCode: 'fr' },
        { name: 'Italian', flagCode: 'it' },
        { name: 'Dutch', flagCode: 'nl' },
        { name: 'Portuguese', flagCode: 'pt' }
    ];

    const specialtyOptions = [
        'Leadership', 'Career', 'Executive', 'Life Coaching', 'Business',
        'Health & Wellness', 'Relationships', 'Mindfulness', 'Performance',
        'Communication', 'Stress Management', 'Work-Life Balance'
    ];

    useEffect(() => {
        if (userType === 'coach') {
            loadCoachProfile();
        }
    }, [userType]);

    const loadCoachProfile = async () => {
        try {
            const { data: coach, error } = await window.supabaseClient
                .from('cs_coaches')
                .select('*')
                .eq('user_id', session.user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Failed to load profile:', error);
                return;
            }

            if (coach) {
                setCoachId(coach.id);
                // Handle both old field names (offers_virtual/offers_onsite) and new (offers_online/offers_in_person)
                const offersOnline = coach.offers_online ?? coach.offers_virtual ?? true;
                const offersInPerson = coach.offers_in_person ?? coach.offers_onsite ?? false;
                // Handle location - support both single 'location' field and split city/country
                let locationCity = coach.location_city || '';
                let locationCountry = coach.location_country || '';
                if (!locationCity && !locationCountry && coach.location) {
                    // Parse legacy single location field
                    const parts = coach.location.split(',').map(p => p.trim());
                    if (parts.length >= 2) {
                        locationCity = parts[0];
                        locationCountry = parts[1];
                    } else {
                        locationCity = coach.location;
                    }
                }
                setFormData({
                    full_name: coach.full_name || '',
                    avatar_url: coach.avatar_url || '',
                    banner_url: coach.banner_url || '',
                    title: coach.title || '',
                    bio: coach.bio || '',
                    location_city: locationCity,
                    location_country: locationCountry,
                    hourly_rate: coach.hourly_rate || '',
                    currency: coach.currency || 'EUR',
                    specialties: Array.isArray(coach.specialties) ? coach.specialties : [],
                    languages: Array.isArray(coach.languages) ? coach.languages : [],
                    years_experience: coach.years_experience || 0,
                    offers_online: offersOnline,
                    offers_in_person: offersInPerson,
                    website_url: coach.website_url || '',
                    linkedin_url: coach.linkedin_url || '',
                    intro_video_url: coach.intro_video_url || ''
                });
            }
        } catch (err) {
            console.error('Failed to load profile:', err);
        }
    };

    const handleImageUpload = async (event, fieldName) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setMessage('Error: Please select an image file');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setMessage('Error: Image must be less than 5MB');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${session.user.id}-${fieldName}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await window.supabaseClient.storage
                .from('avatars')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = window.supabaseClient.storage
                .from('avatars')
                .getPublicUrl(fileName);

            setFormData(prev => ({ ...prev, [fieldName]: publicUrl }));
            await saveField(fieldName, publicUrl);
            setMessage('Image uploaded!');
            setTimeout(() => setMessage(''), 2000);
        } catch (err) {
            setMessage('Error: ' + (err.message || 'Upload failed'));
            setTimeout(() => setMessage(''), 3000);
        } finally {
            setUploading(false);
        }
    };

    const saveField = async (field, value) => {
        if (!coachId) return;
        try {
            await window.supabaseClient
                .from('cs_coaches')
                .update({ [field]: value, updated_at: new Date().toISOString() })
                .eq('id', coachId);
        } catch (err) {
            console.error('Save failed:', err);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // Build session_formats array for filter compatibility
            const sessionFormats = [];
            if (formData.offers_online) sessionFormats.push('online');
            if (formData.offers_in_person) sessionFormats.push('in-person');

            const profileData = {
                user_id: session.user.id,
                full_name: formData.full_name,
                avatar_url: formData.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.email}`,
                banner_url: formData.banner_url,
                title: formData.title,
                bio: formData.bio,
                location_city: formData.location_city,
                location_country: formData.location_country,
                hourly_rate: parseFloat(formData.hourly_rate) || 0,
                currency: formData.currency,
                specialties: formData.specialties,
                languages: formData.languages,
                years_experience: parseInt(formData.years_experience) || 0,
                offers_online: formData.offers_online,
                offers_in_person: formData.offers_in_person,
                session_formats: sessionFormats,
                website_url: formData.website_url,
                linkedin_url: formData.linkedin_url,
                intro_video_url: formData.intro_video_url,
                onboarding_completed: true,
                updated_at: new Date().toISOString()
            };

            const { error } = await window.supabaseClient
                .from('cs_coaches')
                .upsert(profileData, { onConflict: 'user_id' });

            if (error) throw error;

            setMessage('Profile saved!');
            setEditSection(null);
            setTimeout(() => setMessage(''), 2000);
        } catch (err) {
            setMessage('Error: ' + (err.message || 'Save failed'));
        } finally {
            setLoading(false);
        }
    };

    const formatPrice = (price) => {
        const symbols = { EUR: '€', USD: '$', GBP: '£', CHF: 'CHF ' };
        return (symbols[formData.currency] || '€') + (price || 0);
    };

    // Languages are now stored as full names (English, German, etc.)
    const getLanguageDisplay = (langName) => {
        const lang = languageOptions.find(l => l.name === langName);
        return lang ? `${lang.flag} ${lang.name}` : String(langName);
    };

    const locationText = formData.location_city
        ? formData.location_city + (formData.location_country ? ', ' + formData.location_country : '')
        : formData.location_country || 'Location not set';

    // Inject CSS once
    useEffect(() => {
        if (!document.getElementById('linkedin-profile-css')) {
            const style = document.createElement('style');
            style.id = 'linkedin-profile-css';
            style.textContent = `
                .linkedin-profile-editor { max-width: 900px; margin: 0 auto; }
                .profile-message { padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-weight: 500; }
                .profile-message.success { background: #d4edda; color: #155724; }
                .profile-message.error { background: #f8d7da; color: #721c24; }
                .profile-preview-banner { background: linear-gradient(135deg, #1a5f5a, #2d8a82); color: white; padding: 12px 20px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
                .linkedin-profile-card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; margin-bottom: 20px; }
                .banner-upload-btn { position: absolute; bottom: 12px; right: 12px; background: rgba(0,0,0,0.6); color: white; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 13px; }
                .banner-upload-btn:hover { background: rgba(0,0,0,0.8); }
                .profile-avatar-section { margin-top: -60px; padding: 0 24px; }
                .profile-avatar-wrapper { position: relative; width: 120px; height: 120px; }
                .profile-avatar { width: 120px; height: 120px; border-radius: 50%; border: 4px solid white; object-fit: cover; background: #f0f0f0; }
                .avatar-upload-btn { position: absolute; bottom: 4px; right: 4px; width: 32px; height: 32px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
                .profile-main-info { padding: 16px 24px 24px; }
                .profile-header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
                .profile-name { font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0 0 4px 0; }
                .profile-title { font-size: 16px; color: #666; margin: 0; }
                .profile-meta { display: flex; flex-wrap: wrap; gap: 16px; color: #666; font-size: 14px; margin-bottom: 16px; }
                .profile-pricing { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
                .price-badge { background: #1a5f5a; color: white; padding: 6px 14px; border-radius: 20px; font-weight: 600; }
                .format-badge { background: #f0f0f0; padding: 6px 12px; border-radius: 16px; font-size: 13px; }
                .linkedin-section { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 20px 24px; margin-bottom: 16px; }
                .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
                .section-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
                .edit-btn { background: none; border: 1px solid #ddd; border-radius: 20px; padding: 6px 14px; cursor: pointer; font-size: 13px; }
                .edit-btn:hover { background: #f5f5f5; border-color: #1a5f5a; }
                .bio-text { color: #333; line-height: 1.6; white-space: pre-wrap; }
                .placeholder-text { color: #999; font-style: italic; }
                .tags-display { display: flex; flex-wrap: wrap; gap: 8px; }
                .specialty-tag { background: #e8f5f3; color: #1a5f5a; padding: 6px 14px; border-radius: 16px; font-size: 14px; }
                .links-row { display: flex; gap: 12px; }
                .link-btn { padding: 8px 16px; border-radius: 8px; background: #f5f5f5; color: #333; text-decoration: none; font-size: 14px; }
                .link-btn:hover { background: #e8e8e8; }
                .edit-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
                .edit-modal { background: white; border-radius: 12px; width: 90%; max-width: 500px; max-height: 80vh; overflow-y: auto; }
                .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #eee; }
                .modal-header h3 { margin: 0; font-size: 18px; }
                .modal-header button { background: none; border: none; font-size: 24px; cursor: pointer; color: #666; }
                .modal-body { padding: 20px; }
                .modal-footer { padding: 16px 20px; border-top: 1px solid #eee; display: flex; justify-content: flex-end; gap: 12px; }
                .form-group { margin-bottom: 16px; }
                .form-group label { display: block; margin-bottom: 6px; font-weight: 500; color: #333; }
                .form-group input, .form-group textarea, .form-group select { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
                .form-group input:focus, .form-group textarea:focus { outline: none; border-color: #1a5f5a; }
                .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
                .checkbox-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
                .checkbox-row { display: flex; gap: 20px; }
                .checkbox-item { display: flex; align-items: center; gap: 8px; cursor: pointer; }
                .current-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
                .tag-chip { background: #e8f5f3; color: #1a5f5a; padding: 4px 10px; border-radius: 14px; display: flex; align-items: center; gap: 6px; }
                .tag-chip button { background: none; border: none; cursor: pointer; font-size: 16px; color: #1a5f5a; padding: 0; }
                .suggestions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
                .suggestion-btn { background: #f5f5f5; border: 1px dashed #ccc; border-radius: 14px; padding: 4px 12px; cursor: pointer; font-size: 13px; }
                .suggestion-btn:hover { background: #e8f5f3; border-color: #1a5f5a; }
                .btn-cancel { padding: 10px 20px; border: 1px solid #ddd; border-radius: 8px; background: white; cursor: pointer; }
                .btn-save { padding: 10px 20px; border: none; border-radius: 8px; background: #1a5f5a; color: white; cursor: pointer; font-weight: 500; }
                .btn-save:disabled { background: #ccc; cursor: not-allowed; }

                /* Video Introduction Section */
                .video-intro-section { position: relative; }
                .video-intro-section.no-video { background: linear-gradient(135deg, #fffbeb, #fef3c7); border: 2px dashed #f59e0b; }
                .video-intro-section.has-video { background: linear-gradient(135deg, #ecfdf5, #d1fae5); border: 2px solid #10b981; }

                .video-importance-banner { display: flex; gap: 16px; padding: 16px; background: white; border-radius: 10px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
                .importance-icon { font-size: 32px; }
                .importance-text strong { color: #b45309; font-size: 16px; display: block; margin-bottom: 6px; }
                .importance-text p { color: #78716c; font-size: 14px; line-height: 1.5; margin: 0; }

                .add-video-btn { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 16px 24px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
                .add-video-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4); }
                .add-video-btn span { font-size: 20px; }

                .video-added-badge { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: white; border-radius: 8px; margin-bottom: 12px; }
                .video-added-badge .badge-icon { width: 24px; height: 24px; background: #10b981; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; }
                .video-added-badge span:last-child { color: #065f46; font-weight: 500; }

                .video-link { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: white; border-radius: 8px; color: #1a5f5a; text-decoration: none; transition: background 0.2s; }
                .video-link:hover { background: #f0fdf4; }
                .video-link .play-icon { width: 32px; height: 32px; background: #1a5f5a; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; }

                /* Video Modal */
                .video-modal { max-width: 600px; }
                .video-info-box { display: flex; gap: 14px; padding: 16px; background: linear-gradient(135deg, #fffbeb, #fef3c7); border-radius: 10px; margin-bottom: 20px; border: 1px solid #fcd34d; }
                .video-info-box .info-icon { font-size: 28px; }
                .video-info-box .info-content strong { color: #92400e; display: block; margin-bottom: 8px; }
                .video-info-box .info-content ul { margin: 0; padding-left: 0; list-style: none; }
                .video-info-box .info-content li { color: #78716c; font-size: 14px; margin-bottom: 6px; }
                .video-info-box .info-content li strong { color: #1a5f5a; display: inline; }

                .form-hint { color: #6b7280; font-size: 13px; margin-top: 6px; }

                .video-tips { margin-top: 20px; padding: 16px; background: #f9fafb; border-radius: 8px; }
                .video-tips strong { color: #374151; font-size: 14px; display: block; margin-bottom: 10px; }
                .video-tips ul { margin: 0; padding-left: 20px; }
                .video-tips li { color: #6b7280; font-size: 13px; margin-bottom: 6px; }
            `;
            document.head.appendChild(style);
        }
    }, []);

    // Debug logging
    console.log('[PROFILE DEBUG] Rendering with formData:', {
        full_name: formData.full_name,
        specialties_type: typeof formData.specialties,
        specialties_isArray: Array.isArray(formData.specialties),
        languages_type: typeof formData.languages,
        languages_isArray: Array.isArray(formData.languages)
    });

    // Simple client profile
    if (userType !== 'coach') {
        return html`
            <div class="profile-simple">
                <h3>Your Profile</h3>
                <p><strong>Email:</strong> ${session.user.email}</p>
                <p><strong>Account Type:</strong> Client</p>
            </div>
        `;
    }

    return html`
        <div class="linkedin-profile-editor">
            ${message && html`
                <div class="profile-message ${message.includes('Error') ? 'error' : 'success'}">
                    ${message}
                </div>
            `}

            <div class="profile-preview-banner">
                This is how your profile appears to clients. Click any section to edit.
            </div>

            <!-- Profile Card -->
            <div class="linkedin-profile-card">
                <!-- Banner -->
                <div class="profile-banner" style=${{ backgroundImage: formData.banner_url ? `url('${formData.banner_url}')` : 'none', backgroundColor: formData.banner_url ? 'transparent' : '#1a5f5a', height: '180px', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                    <label class="banner-upload-btn">
                        <input type="file" accept="image/*" hidden onChange=${(e) => handleImageUpload(e, 'banner_url')} />
                        ${formData.banner_url ? 'Change' : 'Add'} Cover
                    </label>
                </div>

                <!-- Avatar -->
                <div class="profile-avatar-section">
                    <div class="profile-avatar-wrapper">
                        <img
                            src=${formData.avatar_url || 'https://via.placeholder.com/150?text=' + (formData.full_name ? formData.full_name.charAt(0) : '?')}
                            alt="Profile"
                            class="profile-avatar"
                        />
                        <label class="avatar-upload-btn">
                            <input type="file" accept="image/*" hidden onChange=${(e) => handleImageUpload(e, 'avatar_url')} />
                            +
                        </label>
                    </div>
                </div>

                <!-- Main Info -->
                <div class="profile-main-info">
                    <div class="profile-header-row">
                        <div>
                            <h1 class="profile-name">${formData.full_name || 'Your Name'}</h1>
                            <p class="profile-title">${formData.title || 'Professional Title'}</p>
                        </div>
                        <button class="edit-btn" onClick=${() => setEditSection('intro')}>Edit</button>
                    </div>

                    <div class="profile-meta">
                        <span>${locationText}</span>
                        ${formData.languages.length > 0 && html`
                            <span>${formData.languages.slice(0, 3).join(', ')}</span>
                        `}
                        ${formData.years_experience > 0 && html`
                            <span>${String(formData.years_experience)}+ years</span>
                        `}
                    </div>

                    <div class="profile-pricing">
                        <span class="price-badge">${formatPrice(formData.hourly_rate)} / hour</span>
                        ${formData.offers_online && html`<span class="format-badge">Online</span>`}
                        ${formData.offers_in_person && html`<span class="format-badge">In-Person</span>`}
                    </div>
                </div>
            </div>

            <!-- About Section -->
            <div class="linkedin-section">
                <div class="section-header">
                    <h2>About</h2>
                    <button class="edit-btn" onClick=${() => setEditSection('about')}>Edit</button>
                </div>
                <div class="section-content">
                    ${formData.bio
                        ? html`<p class="bio-text">${formData.bio}</p>`
                        : html`<p class="placeholder-text">Tell clients about yourself and your coaching approach...</p>`
                    }
                </div>
            </div>

            <!-- Specialties Section -->
            <div class="linkedin-section">
                <div class="section-header">
                    <h2>Specialties</h2>
                    <button class="edit-btn" onClick=${() => setEditSection('specialties')}>Edit</button>
                </div>
                <div class="section-content">
                    ${formData.specialties.length > 0
                        ? html`<div class="tags-display">${formData.specialties.map((s, i) => html`<span key=${i} class="specialty-tag">${String(s)}</span>`)}</div>`
                        : html`<p class="placeholder-text">Add your coaching specialties...</p>`
                    }
                </div>
            </div>

            <!-- Video Introduction Section - PROMINENT -->
            <div class="linkedin-section video-intro-section ${formData.intro_video_url ? 'has-video' : 'no-video'}">
                <div class="section-header">
                    <h2>Video Introduction</h2>
                    <button class="edit-btn" onClick=${() => setEditSection('video')}>Edit</button>
                </div>
                ${formData.intro_video_url ? html`
                    <div class="section-content video-preview">
                        <div class="video-added-badge">
                            <span class="badge-icon">✓</span>
                            <span>Video Added - Great for building trust!</span>
                        </div>
                        <a href=${formData.intro_video_url} target="_blank" class="video-link">
                            <span class="play-icon">▶</span>
                            <span>View your intro video</span>
                        </a>
                    </div>
                ` : html`
                    <div class="section-content video-cta">
                        <div class="video-importance-banner">
                            <div class="importance-icon">⭐</div>
                            <div class="importance-text">
                                <strong>Boost your visibility by 3x!</strong>
                                <p>Coaches with video introductions appear at the top of search results and get significantly more bookings. Let potential clients see and hear you before they book.</p>
                            </div>
                        </div>
                        <button class="add-video-btn" onClick=${() => setEditSection('video')}>
                            <span>🎥</span> Add Your Video Introduction
                        </button>
                    </div>
                `}
            </div>

            <!-- Links Section -->
            <div class="linkedin-section">
                <div class="section-header">
                    <h2>Links</h2>
                    <button class="edit-btn" onClick=${() => setEditSection('links')}>Edit</button>
                </div>
                <div class="section-content links-row">
                    ${formData.website_url && html`<a href=${formData.website_url} target="_blank" class="link-btn">Website</a>`}
                    ${formData.linkedin_url && html`<a href=${formData.linkedin_url} target="_blank" class="link-btn">LinkedIn</a>`}
                    ${!formData.website_url && !formData.linkedin_url && html`<p class="placeholder-text">Add your website or LinkedIn profile...</p>`}
                </div>
            </div>

            <!-- Edit Modals -->
            ${editSection === 'intro' && html`
                <div class="edit-modal-overlay" onClick=${() => setEditSection(null)}>
                    <div class="edit-modal" onClick=${(e) => e.stopPropagation()}>
                        <div class="modal-header">
                            <h3>Edit Introduction</h3>
                            <button onClick=${() => setEditSection(null)}>×</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label>Full Name</label>
                                <input type="text" value=${formData.full_name} onChange=${(e) => setFormData({...formData, full_name: e.target.value})} />
                            </div>
                            <div class="form-group">
                                <label>Professional Title</label>
                                <input type="text" placeholder="e.g., Executive Coach" value=${formData.title} onChange=${(e) => setFormData({...formData, title: e.target.value})} />
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>City</label>
                                    <input type="text" value=${formData.location_city} onChange=${(e) => setFormData({...formData, location_city: e.target.value})} />
                                </div>
                                <div class="form-group">
                                    <label>Country</label>
                                    <input type="text" value=${formData.location_country} onChange=${(e) => setFormData({...formData, location_country: e.target.value})} />
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Years of Experience</label>
                                <input type="number" min="0" value=${formData.years_experience} onChange=${(e) => setFormData({...formData, years_experience: parseInt(e.target.value) || 0})} />
                            </div>
                            <div class="form-group">
                                <label>Languages</label>
                                <div class="checkbox-grid">
                                    ${languageOptions.map(lang => html`
                                        <label key=${lang.name} class="checkbox-item" style=${{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input type="checkbox"
                                                checked=${formData.languages.includes(lang.name)}
                                                onChange=${(e) => {
                                                    const langs = formData.languages;
                                                    if (e.target.checked) {
                                                        setFormData({...formData, languages: [...langs, lang.name]});
                                                    } else {
                                                        setFormData({...formData, languages: langs.filter(l => l !== lang.name)});
                                                    }
                                                }}
                                            />
                                            <img
                                                src="https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${lang.flagCode}.svg"
                                                alt=${lang.name}
                                                style=${{ width: '20px', height: '15px', borderRadius: '2px' }}
                                            />
                                            ${lang.name}
                                        </label>
                                    `)}
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Currency</label>
                                    <select value=${formData.currency} onChange=${(e) => setFormData({...formData, currency: e.target.value})}>
                                        <option value="EUR">EUR €</option>
                                        <option value="USD">USD $</option>
                                        <option value="GBP">GBP £</option>
                                        <option value="CHF">CHF</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Hourly Rate</label>
                                    <input type="number" min="0" value=${formData.hourly_rate} onChange=${(e) => setFormData({...formData, hourly_rate: e.target.value})} />
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Session Formats</label>
                                <div class="checkbox-row">
                                    <label class="checkbox-item">
                                        <input type="checkbox" checked=${formData.offers_online} onChange=${(e) => setFormData({...formData, offers_online: e.target.checked})} />
                                        Video/Online
                                    </label>
                                    <label class="checkbox-item">
                                        <input type="checkbox" checked=${formData.offers_in_person} onChange=${(e) => setFormData({...formData, offers_in_person: e.target.checked})} />
                                        In-Person
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-cancel" onClick=${() => setEditSection(null)}>Cancel</button>
                            <button class="btn-save" onClick=${handleSave} disabled=${loading}>${loading ? 'Saving...' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            `}

            ${editSection === 'about' && html`
                <div class="edit-modal-overlay" onClick=${() => setEditSection(null)}>
                    <div class="edit-modal" onClick=${(e) => e.stopPropagation()}>
                        <div class="modal-header">
                            <h3>Edit About</h3>
                            <button onClick=${() => setEditSection(null)}>×</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label>About You</label>
                                <textarea rows="8" placeholder="Share your coaching philosophy, experience, and what makes you unique..." value=${formData.bio} onChange=${(e) => setFormData({...formData, bio: e.target.value})}></textarea>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-cancel" onClick=${() => setEditSection(null)}>Cancel</button>
                            <button class="btn-save" onClick=${handleSave} disabled=${loading}>${loading ? 'Saving...' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            `}

            ${editSection === 'specialties' && html`
                <div class="edit-modal-overlay" onClick=${() => setEditSection(null)}>
                    <div class="edit-modal" onClick=${(e) => e.stopPropagation()}>
                        <div class="modal-header">
                            <h3>Edit Specialties</h3>
                            <button onClick=${() => setEditSection(null)}>×</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label>Select Your Specialties</label>
                                <p style=${{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>Click to select or deselect specialties</p>
                                <div style=${{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    ${specialtyOptions.map(specialty => {
                                        const isSelected = formData.specialties.includes(specialty);
                                        return html`
                                            <button
                                                type="button"
                                                key=${specialty}
                                                onClick=${() => {
                                                    if (isSelected) {
                                                        setFormData({...formData, specialties: formData.specialties.filter(s => s !== specialty)});
                                                    } else {
                                                        setFormData({...formData, specialties: [...formData.specialties, specialty]});
                                                    }
                                                }}
                                                style=${{
                                                    padding: '8px 14px',
                                                    border: isSelected ? '2px solid #1a5f5a' : '2px solid #E5E7EB',
                                                    borderRadius: '20px',
                                                    background: isSelected ? '#e8f5f3' : 'white',
                                                    cursor: 'pointer',
                                                    fontSize: '14px',
                                                    fontWeight: '500',
                                                    color: isSelected ? '#1a5f5a' : '#374151',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                ${specialty} ${isSelected ? '✓' : ''}
                                            </button>
                                        `;
                                    })}
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-cancel" onClick=${() => setEditSection(null)}>Cancel</button>
                            <button class="btn-save" onClick=${handleSave} disabled=${loading}>${loading ? 'Saving...' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            `}

            ${editSection === 'video' && html`
                <div class="edit-modal-overlay" onClick=${() => setEditSection(null)}>
                    <div class="edit-modal video-modal" onClick=${(e) => e.stopPropagation()}>
                        <div class="modal-header">
                            <h3>Video Introduction</h3>
                            <button onClick=${() => setEditSection(null)}>×</button>
                        </div>
                        <div class="modal-body">
                            <div class="video-info-box">
                                <div class="info-icon">💡</div>
                                <div class="info-content">
                                    <strong>Why add a video?</strong>
                                    <ul>
                                        <li>Appear at the <strong>top of search results</strong></li>
                                        <li>Build <strong>instant trust</strong> with potential clients</li>
                                        <li>Get <strong>more bookings</strong> - clients prefer coaches they can see</li>
                                    </ul>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Video URL</label>
                                <input
                                    type="url"
                                    placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                                    value=${formData.intro_video_url}
                                    onChange=${(e) => setFormData({...formData, intro_video_url: e.target.value})}
                                />
                                <p class="form-hint">Paste a link to your YouTube, Vimeo, or other video hosting URL. We recommend a 1-3 minute introduction video.</p>
                            </div>
                            <div class="video-tips">
                                <strong>Tips for a great intro video:</strong>
                                <ul>
                                    <li>Introduce yourself and your coaching style</li>
                                    <li>Share your background and qualifications</li>
                                    <li>Explain what clients can expect</li>
                                    <li>Keep it authentic and personable</li>
                                </ul>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-cancel" onClick=${() => setEditSection(null)}>Cancel</button>
                            <button class="btn-save" onClick=${handleSave} disabled=${loading}>${loading ? 'Saving...' : 'Save Video'}</button>
                        </div>
                    </div>
                </div>
            `}

            ${editSection === 'links' && html`
                <div class="edit-modal-overlay" onClick=${() => setEditSection(null)}>
                    <div class="edit-modal" onClick=${(e) => e.stopPropagation()}>
                        <div class="modal-header">
                            <h3>Edit Links</h3>
                            <button onClick=${() => setEditSection(null)}>×</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label>Website</label>
                                <input type="url" placeholder="https://yourwebsite.com" value=${formData.website_url} onChange=${(e) => setFormData({...formData, website_url: e.target.value})} />
                            </div>
                            <div class="form-group">
                                <label>LinkedIn</label>
                                <input type="url" placeholder="https://linkedin.com/in/yourprofile" value=${formData.linkedin_url} onChange=${(e) => setFormData({...formData, linkedin_url: e.target.value})} />
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-cancel" onClick=${() => setEditSection(null)}>Cancel</button>
                            <button class="btn-save" onClick=${handleSave} disabled=${loading}>${loading ? 'Saving...' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            `}
        </div>
    `;
};

export default DashboardProfile;
