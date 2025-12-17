/**
 * Coach Onboarding Component
 * Multi-step form for coach profile setup
 */

import htm from '../../vendor/htm.js';
import { t } from '../../i18n.js';

const React = window.React;
const { useState } = React;
const html = htm.bind(React.createElement);

/**
 * CoachOnboarding Component
 * @param {Object} props
 * @param {Object} props.session - User session
 */
export function CoachOnboarding({ session }) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        full_name: session?.user?.user_metadata?.full_name || '',
        title: '',
        bio: '',
        location_city: '',
        location_country: '',
        hourly_rate: '',
        currency: 'EUR',
        specialties: '',
        languages: '',
        years_experience: '',
        session_types_online: true,
        session_types_onsite: false,
        avatar_url: '',
        intro_video_url: ''
    });

    // Image upload state
    const [uploading, setUploading] = useState(false);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Handle profile picture upload
    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setMessage(t('onboard.invalidImageType') || 'Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setMessage(t('onboard.imageTooLarge') || 'Image must be less than 5MB');
            return;
        }

        setUploading(true);
        setMessage('');

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await window.supabaseClient.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = window.supabaseClient.storage
                .from('avatars')
                .getPublicUrl(filePath);

            handleChange('avatar_url', publicUrl);
        } catch (err) {
            console.error('Error uploading image:', err);
            setMessage(t('onboard.uploadFailed') || 'Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const handleNext = () => {
        if (step === 1) {
            // Validate step 1 fields
            if (!formData.full_name || !formData.title || !formData.bio || !formData.hourly_rate) {
                setMessage('Please fill in all required fields');
                return;
            }
            setMessage('');
            setStep(2);
        }
    };

    const handleBack = () => {
        setStep(1);
        setMessage('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            if (!window.supabaseClient) {
                throw new Error('Database connection not available');
            }

            // CRITICAL: Ensure cs_users record exists first (same fix as for cs_clients)
            console.log('Checking if cs_users record exists for:', session.user.id);

            const { data: existingUser, error: userCheckError } = await window.supabaseClient
                .from('cs_users')
                .select('id')
                .eq('id', session.user.id)
                .maybeSingle();

            if (!existingUser) {
                console.log('cs_users record missing, creating it now...');

                // Create cs_users record if missing
                const { error: userCreateError } = await window.supabaseClient
                    .from('cs_users')
                    .insert([{
                        id: session.user.id,
                        email: session.user.email,
                        full_name: formData.full_name,
                        role: 'coach',
                        user_type: 'coach',
                        avatar_url: formData.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.email}`,
                        is_email_verified: !!session.user.email_confirmed_at,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }]);

                if (userCreateError) {
                    console.error('Failed to create cs_users record:', userCreateError);
                    throw new Error('Failed to create user profile. Please contact support.');
                }

                console.log('cs_users record created successfully');
            } else {
                console.log('cs_users record already exists');
            }

            // Parse comma-separated values into arrays
            const specialtiesArray = formData.specialties.split(',').map(s => s.trim()).filter(Boolean);
            const languagesArray = formData.languages.split(',').map(s => s.trim()).filter(Boolean);
            const sessionFormatsArray = [];
            if (formData.session_types_online) sessionFormatsArray.push('online');
            if (formData.session_types_onsite) sessionFormatsArray.push('in-person');

            // Check if user has referral code for free year (from registration metadata)
            const hasReferralCode = session?.user?.user_metadata?.referral_code_valid === true;
            const trialDays = hasReferralCode ? 365 : 14; // 1 year if referral, otherwise 14 days

            // Set trial end date
            const trialEndsAt = new Date();
            trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

            const coachProfile = {
                user_id: session.user.id,
                full_name: formData.full_name,
                title: formData.title,
                bio: formData.bio,
                location_city: formData.location_city,
                location_country: formData.location_country,
                hourly_rate: parseFloat(formData.hourly_rate) || 0,
                currency: formData.currency || 'EUR',
                specialties: specialtiesArray,
                languages: languagesArray,
                years_experience: parseInt(formData.years_experience) || 0,
                session_formats: sessionFormatsArray,
                offers_online: formData.session_types_online,
                offers_in_person: formData.session_types_onsite,
                avatar_url: formData.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.email}`,
                intro_video_url: formData.intro_video_url || '',
                onboarding_completed: true,
                subscription_status: 'trial',
                trial_ends_at: trialEndsAt.toISOString()
            };

            console.log('Saving coach profile to Supabase:', coachProfile);

            // Save directly to Supabase
            const { data, error } = await window.supabaseClient
                .from('cs_coaches')
                .insert([coachProfile])
                .select()
                .single();

            if (error) {
                console.error('Supabase error:', error);
                throw new Error(error.message || 'Failed to save profile');
            }

            console.log('Coach profile saved successfully:', data);

            const successMsg = hasReferralCode
                ? t('onboard.successWithReferral') || 'Profile completed! You have 1 year of Premium free! Redirecting...'
                : t('onboard.successDefault') || 'Profile completed successfully! Redirecting to dashboard...';

            setMessage(successMsg);
            setTimeout(() => {
                window.navigateTo('/dashboard');
            }, 1500);
        } catch (error) {
            console.error('Onboarding error:', error);
            setMessage('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '14px 16px',
        fontSize: '15px',
        border: '2px solid #E5E7EB',
        borderRadius: '10px',
        outline: 'none',
        transition: 'all 0.2s',
        fontFamily: 'inherit'
    };

    const labelStyle = {
        display: 'block',
        fontSize: '14px',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '8px'
    };

    return html`
        <div style=${{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #006266 0%, #004A4D 100%)',
            padding: '40px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div style=${{
                maxWidth: '700px',
                width: '100%',
                background: 'white',
                borderRadius: '20px',
                padding: '50px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
            }}>
                <!-- Header -->
                <div style=${{ textAlign: 'center', marginBottom: '40px' }}>
                    <h1 style=${{
                        fontSize: '32px',
                        fontWeight: '700',
                        color: '#1F2937',
                        marginBottom: '12px'
                    }}>
                        ${step === 1 ? (t('onboard.welcomeCoach') || 'Welcome, Coach!') : (t('onboard.almostThere') || 'Almost There!')}
                    </h1>
                    <p style=${{ fontSize: '16px', color: '#6B7280' }}>
                        ${step === 1 ? (t('onboard.step1Subtitle') || 'Set up your profile to attract clients') : (t('onboard.step2Subtitle') || 'Tell us about your expertise and availability')}
                    </p>

                    <!-- Progress Bar -->
                    <div style=${{
                        marginTop: '30px',
                        display: 'flex',
                        gap: '8px',
                        justifyContent: 'center'
                    }}>
                        <div style=${{
                            width: '40px',
                            height: '4px',
                            borderRadius: '2px',
                            background: step >= 1 ? '#006266' : '#E5E7EB',
                            transition: 'all 0.3s'
                        }}></div>
                        <div style=${{
                            width: '40px',
                            height: '4px',
                            borderRadius: '2px',
                            background: step >= 2 ? '#006266' : '#E5E7EB',
                            transition: 'all 0.3s'
                        }}></div>
                    </div>
                    <div style=${{ marginTop: '8px', fontSize: '13px', color: '#9CA3AF', fontWeight: '500' }}>
                        ${t('onboard.stepOf') || 'Step'} ${step} ${t('onboard.of') || 'of'} 2
                    </div>
                </div>

                ${message && html`
                    <div style=${{
                        padding: '14px 18px',
                        borderRadius: '10px',
                        marginBottom: '24px',
                        background: message.includes('Error') ? '#FEE2E2' : '#D1FAE5',
                        color: message.includes('Error') ? '#991B1B' : '#065F46',
                        fontSize: '14px',
                        fontWeight: '500'
                    }}>
                        ${message}
                    </div>
                `}

                <form onSubmit=${step === 2 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
                    <!-- Step 1: Basic Info & Pricing -->
                    ${step === 1 && html`
                        <div style=${{ display: 'grid', gap: '22px' }}>
                            <!-- Profile Picture Upload -->
                            <div>
                                <label style=${labelStyle}>${t('onboard.profilePicture') || 'Profile Picture'}</label>
                                <div style=${{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px'
                                }}>
                                    <div style=${{
                                        width: '80px',
                                        height: '80px',
                                        borderRadius: '50%',
                                        overflow: 'hidden',
                                        border: '3px solid #E5E7EB',
                                        background: '#F3F4F6',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        ${formData.avatar_url
                                            ? html`<img src=${formData.avatar_url} alt="Profile" style=${{ width: '100%', height: '100%', objectFit: 'cover' }} />`
                                            : html`<span style=${{ fontSize: '32px', color: '#9CA3AF' }}>👤</span>`
                                        }
                                    </div>
                                    <div style=${{ flex: 1 }}>
                                        <label style=${{
                                            display: 'inline-block',
                                            padding: '10px 20px',
                                            background: uploading ? '#9CA3AF' : '#006266',
                                            color: 'white',
                                            borderRadius: '8px',
                                            cursor: uploading ? 'not-allowed' : 'pointer',
                                            fontSize: '14px',
                                            fontWeight: '500'
                                        }}>
                                            ${uploading ? (t('onboard.uploading') || 'Uploading...') : (t('onboard.uploadPhoto') || 'Upload Photo')}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange=${handleImageUpload}
                                                disabled=${uploading}
                                                style=${{ display: 'none' }}
                                            />
                                        </label>
                                        <div style=${{ fontSize: '12px', color: '#9CA3AF', marginTop: '6px' }}>
                                            ${t('onboard.uploadHint') || 'JPG, PNG up to 5MB'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label style=${labelStyle}>${t('onboard.fullName') || 'Full Name'} *</label>
                                <input
                                    type="text"
                                    style=${inputStyle}
                                    value=${formData.full_name}
                                    onChange=${(e) => handleChange('full_name', e.target.value)}
                                    onFocus=${(e) => e.target.style.borderColor = '#006266'}
                                    onBlur=${(e) => e.target.style.borderColor = '#E5E7EB'}
                                    required
                                />
                            </div>

                            <div>
                                <label style=${labelStyle}>${t('onboard.jobTitle') || 'Professional Title'} *</label>
                                <input
                                    type="text"
                                    style=${inputStyle}
                                    placeholder=${t('onboard.jobTitlePlaceholder') || 'e.g., Life Coach, Business Consultant'}
                                    value=${formData.title}
                                    onChange=${(e) => handleChange('title', e.target.value)}
                                    onFocus=${(e) => e.target.style.borderColor = '#006266'}
                                    onBlur=${(e) => e.target.style.borderColor = '#E5E7EB'}
                                    required
                                />
                            </div>

                            <div>
                                <label style=${labelStyle}>${t('onboard.bio') || 'About You'} *</label>
                                <textarea
                                    style=${{...inputStyle, minHeight: '120px', resize: 'vertical'}}
                                    placeholder=${t('onboard.bioPlaceholder') || 'Share your coaching philosophy, experience, and approach...'}
                                    value=${formData.bio}
                                    onChange=${(e) => handleChange('bio', e.target.value)}
                                    onFocus=${(e) => e.target.style.borderColor = '#006266'}
                                    onBlur=${(e) => e.target.style.borderColor = '#E5E7EB'}
                                    required
                                ></textarea>
                            </div>

                            <div style=${{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style=${labelStyle}>${t('onboard.city') || 'City'}</label>
                                    <input
                                        type="text"
                                        style=${inputStyle}
                                        placeholder=${t('onboard.cityPlaceholder') || 'e.g., Zurich'}
                                        value=${formData.location_city}
                                        onChange=${(e) => handleChange('location_city', e.target.value)}
                                        onFocus=${(e) => e.target.style.borderColor = '#006266'}
                                        onBlur=${(e) => e.target.style.borderColor = '#E5E7EB'}
                                    />
                                </div>
                                <div>
                                    <label style=${labelStyle}>${t('onboard.country') || 'Country'}</label>
                                    <select
                                        style=${inputStyle}
                                        value=${formData.location_country}
                                        onChange=${(e) => handleChange('location_country', e.target.value)}
                                    >
                                        <option value="">${t('onboard.selectCountry') || 'Select country...'}</option>
                                        <option value="Austria">Austria</option>
                                        <option value="Belgium">Belgium</option>
                                        <option value="Denmark">Denmark</option>
                                        <option value="Finland">Finland</option>
                                        <option value="France">France</option>
                                        <option value="Germany">Germany</option>
                                        <option value="Ireland">Ireland</option>
                                        <option value="Italy">Italy</option>
                                        <option value="Luxembourg">Luxembourg</option>
                                        <option value="Netherlands">Netherlands</option>
                                        <option value="Norway">Norway</option>
                                        <option value="Poland">Poland</option>
                                        <option value="Portugal">Portugal</option>
                                        <option value="Spain">Spain</option>
                                        <option value="Sweden">Sweden</option>
                                        <option value="Switzerland">Switzerland</option>
                                        <option value="United Kingdom">United Kingdom</option>
                                    </select>
                                </div>
                            </div>

                            <div style=${{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style=${labelStyle}>${t('onboard.hourlyRate') || 'Hourly Rate'} *</label>
                                    <input
                                        type="number"
                                        style=${inputStyle}
                                        placeholder=${t('onboard.hourlyRatePlaceholder') || '150'}
                                        min="0"
                                        step="1"
                                        value=${formData.hourly_rate}
                                        onChange=${(e) => handleChange('hourly_rate', e.target.value)}
                                        onFocus=${(e) => e.target.style.borderColor = '#006266'}
                                        onBlur=${(e) => e.target.style.borderColor = '#E5E7EB'}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style=${labelStyle}>${t('onboard.currency') || 'Currency'}</label>
                                    <select
                                        style=${inputStyle}
                                        value=${formData.currency}
                                        onChange=${(e) => handleChange('currency', e.target.value)}
                                    >
                                        <option value="EUR">EUR €</option>
                                        <option value="USD">USD $</option>
                                        <option value="GBP">GBP £</option>
                                        <option value="CHF">CHF</option>
                                    </select>
                                </div>
                                <div>
                                    <label style=${labelStyle}>${t('onboard.yearsExperience') || 'Years Experience'}</label>
                                    <input
                                        type="number"
                                        style=${inputStyle}
                                        placeholder="0"
                                        min="0"
                                        max="50"
                                        value=${formData.years_experience}
                                        onChange=${(e) => handleChange('years_experience', e.target.value)}
                                        onFocus=${(e) => e.target.style.borderColor = '#006266'}
                                        onBlur=${(e) => e.target.style.borderColor = '#E5E7EB'}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style=${{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
                            <button
                                type="button"
                                onClick=${() => window.navigateTo('/coaches')}
                                style=${{
                                    padding: '14px 24px',
                                    background: 'transparent',
                                    color: '#6B7280',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                ${t('onboard.skipForNow') || 'Skip for Now'}
                            </button>
                            <button
                                type="submit"
                                style=${{
                                    padding: '14px 32px',
                                    background: 'linear-gradient(135deg, #006266 0%, #004A4D 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(0, 98, 102, 0.4)'
                                }}
                            >
                                ${t('onboard.next') || 'Next Step →'}
                            </button>
                        </div>
                    `}

                    <!-- Step 2: Expertise & Settings -->
                    ${step === 2 && html`
                        <div style=${{ display: 'grid', gap: '22px' }}>
                            <div>
                                <label style=${labelStyle}>${t('onboard.specialties') || 'Specialties'} *</label>
                                <div style=${{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    ${[
                                        'Leadership', 'Career', 'Executive', 'Life Coaching', 'Business',
                                        'Health & Wellness', 'Relationships', 'Mindfulness', 'Performance',
                                        'Communication', 'Stress Management', 'Work-Life Balance'
                                    ].map(specialty => {
                                        const isSelected = formData.specialties.split(',').map(s => s.trim()).includes(specialty);
                                        return html`
                                            <button
                                                type="button"
                                                key=${specialty}
                                                onClick=${() => {
                                                    const current = formData.specialties.split(',').map(s => s.trim()).filter(Boolean);
                                                    if (isSelected) {
                                                        handleChange('specialties', current.filter(s => s !== specialty).join(', '));
                                                    } else {
                                                        handleChange('specialties', [...current, specialty].join(', '));
                                                    }
                                                }}
                                                style=${{
                                                    padding: '8px 14px',
                                                    border: isSelected ? '2px solid #006266' : '2px solid #E5E7EB',
                                                    borderRadius: '20px',
                                                    background: isSelected ? '#f0fafa' : 'white',
                                                    cursor: 'pointer',
                                                    fontSize: '14px',
                                                    fontWeight: '500',
                                                    color: isSelected ? '#006266' : '#374151',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                ${specialty} ${isSelected ? '✓' : ''}
                                            </button>
                                        `;
                                    })}
                                </div>
                                <div style=${{ fontSize: '13px', color: '#9CA3AF', marginTop: '8px' }}>
                                    ${t('onboard.selectSpecialtiesHint') || 'Select all that apply'}
                                </div>
                            </div>

                            <div>
                                <label style=${labelStyle}>${t('onboard.sessionLanguages') || 'Languages'} *</label>
                                <div style=${{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    ${[
                                        { flagCode: 'gb', name: 'English' },
                                        { flagCode: 'de', name: 'German' },
                                        { flagCode: 'es', name: 'Spanish' },
                                        { flagCode: 'fr', name: 'French' },
                                        { flagCode: 'it', name: 'Italian' },
                                        { flagCode: 'nl', name: 'Dutch' },
                                        { flagCode: 'pt', name: 'Portuguese' }
                                    ].map(lang => {
                                        const isSelected = formData.languages.split(',').map(l => l.trim()).includes(lang.name);
                                        return html`
                                            <button
                                                type="button"
                                                key=${lang.name}
                                                onClick=${() => {
                                                    const current = formData.languages.split(',').map(l => l.trim()).filter(Boolean);
                                                    if (isSelected) {
                                                        handleChange('languages', current.filter(l => l !== lang.name).join(', '));
                                                    } else {
                                                        handleChange('languages', [...current, lang.name].join(', '));
                                                    }
                                                }}
                                                style=${{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    padding: '10px 16px',
                                                    border: isSelected ? '2px solid #006266' : '2px solid #E5E7EB',
                                                    borderRadius: '8px',
                                                    background: isSelected ? '#f0fafa' : 'white',
                                                    cursor: 'pointer',
                                                    fontSize: '14px',
                                                    fontWeight: '500',
                                                    color: isSelected ? '#006266' : '#374151',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <img
                                                    src="https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${lang.flagCode}.svg"
                                                    alt=${lang.name}
                                                    style=${{ width: '24px', height: '18px', borderRadius: '2px', objectFit: 'cover' }}
                                                />
                                                <span>${lang.name}</span>
                                                ${isSelected && html`<span style=${{ color: '#006266', fontWeight: 'bold' }}>✓</span>`}
                                            </button>
                                        `;
                                    })}
                                </div>
                                <div style=${{ fontSize: '13px', color: '#9CA3AF', marginTop: '8px' }}>
                                    ${t('onboard.selectLanguagesHint') || 'Select all languages you offer coaching in'}
                                </div>
                            </div>

                            <div>
                                <label style=${{...labelStyle, marginBottom: '12px'}}>${t('onboard.sessionFormats') || 'Session Types'} *</label>
                                <div style=${{ display: 'grid', gap: '12px' }}>
                                    <label style=${{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '14px',
                                        border: '2px solid #E5E7EB',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked=${formData.session_types_online}
                                            onChange=${(e) => handleChange('session_types_online', e.target.checked)}
                                            style=${{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                        <span style=${{ fontSize: '15px', fontWeight: '500' }}>💻 ${t('onboard.videoCallDesc') || 'Online Sessions'}</span>
                                    </label>
                                    <label style=${{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '14px',
                                        border: '2px solid #E5E7EB',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked=${formData.session_types_onsite}
                                            onChange=${(e) => handleChange('session_types_onsite', e.target.checked)}
                                            style=${{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                        <span style=${{ fontSize: '15px', fontWeight: '500' }}>📍 ${t('onboard.inPersonDesc') || 'On-Site Sessions'}</span>
                                    </label>
                                </div>
                            </div>

                            <!-- Video Introduction -->
                            <div style=${{
                                background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
                                border: '2px dashed #f59e0b',
                                borderRadius: '12px',
                                padding: '20px'
                            }}>
                                <div style=${{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                    <span style=${{ fontSize: '24px' }}>🎬</span>
                                    <div>
                                        <strong style=${{ color: '#92400e', fontSize: '15px' }}>${t('onboard.videoIntroTitle') || 'Video Introduction (Recommended)'}</strong>
                                        <p style=${{ fontSize: '13px', color: '#78716c', margin: '4px 0 0 0' }}>
                                            ${t('onboard.videoIntroHint') || 'Coaches with video intros get 3x more bookings and appear at the top of search results!'}
                                        </p>
                                    </div>
                                </div>
                                <input
                                    type="url"
                                    style=${{...inputStyle, background: 'white'}}
                                    placeholder=${t('onboard.videoUrlPlaceholder') || 'https://youtube.com/watch?v=... or https://vimeo.com/...'}
                                    value=${formData.intro_video_url}
                                    onChange=${(e) => handleChange('intro_video_url', e.target.value)}
                                    onFocus=${(e) => e.target.style.borderColor = '#f59e0b'}
                                    onBlur=${(e) => e.target.style.borderColor = '#E5E7EB'}
                                />
                                <p style=${{ fontSize: '12px', color: '#78716c', marginTop: '6px' }}>
                                    ${t('onboard.videoUrlHint') || 'Paste a link to your YouTube or Vimeo video (1-3 minutes recommended)'}
                                </p>
                            </div>
                        </div>

                        <div style=${{ marginTop: '32px', display: 'flex', gap: '12px' }}>
                            <button
                                type="button"
                                onClick=${handleBack}
                                disabled=${loading}
                                style=${{
                                    padding: '14px 24px',
                                    background: '#F3F4F6',
                                    color: '#374151',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    flex: 1
                                }}
                            >
                                ← ${t('onboard.previous') || 'Back'}
                            </button>
                            <button
                                type="submit"
                                disabled=${loading}
                                style=${{
                                    padding: '14px 32px',
                                    background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #006266 0%, #004A4D 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    boxShadow: loading ? 'none' : '0 4px 12px rgba(0, 98, 102, 0.4)',
                                    flex: 2
                                }}
                            >
                                ${loading ? (t('onboard.uploading') || 'Creating Profile...') : (t('onboard.complete') || 'Complete Setup')}
                            </button>
                        </div>
                    `}
                </form>
            </div>
        </div>
    `;
}

export default CoachOnboarding;
