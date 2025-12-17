// js/app.js - Complete Production Application
console.log('App.js: Loading...');

// UMD Globals
const React = window.React;
const ReactDOM = window.ReactDOM;
const { useState, useEffect, useRef, useCallback } = React;
const { createClient } = window.supabase;

import htm from './vendor/htm.js';
import { initLanguage, t, setLanguage, getCurrentLang } from './i18n.js';
import { initDebugConsole } from './debugConsole.js';
import { SessionNotesWizard, SessionNotesDashboard } from './sessionNotes.js';
import { ReferralDashboard, ReferralWidget } from './referrals.js';
import { PromoCodeWidget, PromoCodeBanner, PromoCodeManager } from './promoCode.js';

// SEO Content Pages
import { FAQPage } from './pages/FAQPage.js';
import { CategoryPage, CategoriesIndexPage, COACHING_CATEGORIES } from './pages/CategoryPage.js';
import { CoachProfilePage } from './pages/CoachProfilePage.js';
import { PricingPage } from './pages/PricingPage.js';
import { Hero, CoachingCategoriesSection, HowItWorksSection, TrustBadgesSection } from './pages/HomePage.js';

// Conversion Optimization Components
import {
    TestimonialCarousel,
    SuccessStats,
    ExitIntentPopup,
} from './components/conversion/SocialProof.js';

// Coach Components (modular)
import {
    LanguageFlags,
    TrustBadges,
    VideoPopup,
    ReviewsPopup,
    DiscoveryCallModal,
    CoachCard,
    CoachCardSkeleton,
    FilterSidebar,
    SPECIALTY_OPTIONS,
    LANGUAGE_OPTIONS,
    CoachList,
    CoachDetailModal
} from './components/coach/index.js';

// Layout & UI Components (modular)
import { Navbar, Footer } from './components/layout/index.js';
import { LegalModal, CurrencySelector, LanguageSelector } from './components/ui/index.js';

// Auth Components (modular)
import { SignOut, Auth } from './components/auth/index.js';

// Account Components (modular)
import { DataExportRequest, AccountDeletion } from './components/account/index.js';

// Dashboard Components (modular)
import { DashboardOverview, DiscoveryRequestsDashboard, DashboardSubscription } from './components/dashboard/index.js';

console.log('App.js: React global', React);
console.log('App.js: ReactDOM global', ReactDOM);
console.log('App.js: htm imported');

const html = htm.bind(React.createElement);

// Initialize
initLanguage();
const debugConsole = initDebugConsole();

const API_BASE = 'https://clouedo.com/coachsearching/api';

// Performance Utilities
const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
};

// Currency Management
const CURRENCY_SYMBOLS = {
    'EUR': '€',
    'USD': '$',
    'GBP': '£'
};

const CURRENCY_RATES = {
    'EUR': 1,
    'USD': 1.09,
    'GBP': 0.86
};

let currentCurrency = localStorage.getItem('currency') || 'EUR';

function setCurrency(code) {
    currentCurrency = code;
    localStorage.setItem('currency', code);
    window.dispatchEvent(new Event('currencyChange'));
    console.log('Currency changed to:', code);
}

function getCurrentCurrency() {
    return currentCurrency;
}

function formatPrice(eurPrice) {
    const rate = CURRENCY_RATES[currentCurrency];
    const convertedPrice = (eurPrice * rate).toFixed(0);
    const symbol = CURRENCY_SYMBOLS[currentCurrency];
    return symbol + convertedPrice;
}


// Utility: Enhanced Markdown to HTML
function markdownToHTML(md) {
    if (!md) return '';

    let html = md;

    // Convert headings (must be done line by line)
    html = html.replace(/^### (.*)$/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*)$/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*)$/gim, '<h1>$1</h1>');

    // Convert links [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Convert bold and italic
    html = html.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^\*]+)\*/g, '<em>$1</em>');

    // Convert bullet lists
    const bulletRegex = /^- (.*)$/gm;
    if (bulletRegex.test(html)) {
        html = html.replace(/(^- .*$(\n|$))+/gm, function(match) {
            const items = match.trim().split('\n').map(line =>
                '<li>' + line.replace(/^- /, '') + '</li>'
            ).join('');
            return '<ul>' + items + '</ul>';
        });
    }

    // Convert numbered lists
    const numberRegex = /^\d+\. (.*)$/gm;
    if (numberRegex.test(md)) {
        html = html.replace(/(^\d+\. .*$(\n|$))+/gm, function(match) {
            const items = match.trim().split('\n').map(line =>
                '<li>' + line.replace(/^\d+\. /, '') + '</li>'
            ).join('');
            return '<ol>' + items + '</ol>';
        });
    }

    // Convert line breaks to paragraphs
    html = html.split('\n\n').map(para => {
        // Don't wrap headings, lists in p tags
        if (para.match(/^<(h[123]|ul|ol)/)) {
            return para;
        }
        return '<p>' + para.replace(/\n/g, '<br>') + '</p>';
    }).join('');

    return html;
}

// legalContent now in components/ui/Modal.js (LegalModal)

// Mock data for coaches (will be replaced with API data)
const mockCoaches = [
    {
        id: '1',
        full_name: 'Sarah Johnson',
        avatar_url: 'https://i.pravatar.cc/200?img=1',
        title: 'Executive Leadership Coach',
        bio: 'Helping executives and entrepreneurs achieve their full potential through strategic coaching and mentorship.',
        location: 'New York, USA',
        languages: ['English', 'Spanish'],
        specialties: ['Leadership', 'Career Transition', 'Executive Coaching'],
        hourly_rate: 150,
        rating: 4.9,
        reviews_count: 127
    },
    {
        id: '2',
        full_name: 'Michael Chen',
        avatar_url: 'https://i.pravatar.cc/200?img=12',
        title: 'Career Development Coach',
        bio: 'Specializing in career transitions and professional development for mid-career professionals.',
        location: 'San Francisco, USA',
        languages: ['English', 'Mandarin'],
        specialties: ['Career Change', 'Interview Prep', 'Salary Negotiation'],
        hourly_rate: 120,
        rating: 4.8,
        reviews_count: 89
    },
    {
        id: '3',
        full_name: 'Emma Schmidt',
        avatar_url: 'https://i.pravatar.cc/200?img=5',
        title: 'Life & Wellness Coach',
        bio: 'Empowering individuals to create balanced, fulfilling lives through holistic coaching approaches.',
        location: 'Berlin, Germany',
        languages: ['German', 'English'],
        specialties: ['Work-Life Balance', 'Stress Management', 'Personal Growth'],
        hourly_rate: 100,
        rating: 5.0,
        reviews_count: 64
    }
];

// --- Components ---
// Layout components (LegalModal, Footer, CurrencySelector, LanguageSelector, Navbar)
// are now imported from components/layout/ and components/ui/

// Auth component now imported from ./components/auth/Auth.js

// Coach Onboarding still inline below (large component ~735 lines)
// TODO: Extract CoachOnboarding to ./components/auth/CoachOnboarding.js

// Auth component was here - now imported from ./components/auth/Auth.js
// Removed ~343 lines of inline Auth component
// Coach Onboarding Component
const CoachOnboarding = ({ session }) => {
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
            console.log('🔍 Checking if cs_users record exists for:', session.user.id);

            const { data: existingUser, error: userCheckError } = await window.supabaseClient
                .from('cs_users')
                .select('id')
                .eq('id', session.user.id)
                .maybeSingle();

            if (!existingUser) {
                console.log('⚠️ cs_users record missing, creating it now...');

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
                    console.error('❌ Failed to create cs_users record:', userCreateError);
                    throw new Error('Failed to create user profile. Please contact support.');
                }

                console.log('✅ cs_users record created successfully');
            } else {
                console.log('✅ cs_users record already exists');
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

            console.log('💾 Saving coach profile to Supabase:', coachProfile);

            // Save directly to Supabase
            const { data, error } = await window.supabaseClient
                .from('cs_coaches')
                .insert([coachProfile])
                .select()
                .single();

            if (error) {
                console.error('❌ Supabase error:', error);
                throw new Error(error.message || 'Failed to save profile');
            }

            console.log('✅ Coach profile saved successfully:', data);

            const successMsg = hasReferralCode
                ? t('onboard.successWithReferral') || '✓ Profile completed! You have 1 year of Premium free! Redirecting...'
                : t('onboard.successDefault') || '✓ Profile completed successfully! Redirecting to dashboard...';

            setMessage(successMsg);
            setTimeout(() => {
                window.navigateTo('/dashboard');
            }, 1500);
        } catch (error) {
            console.error('❌ Onboarding error:', error);
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
                        ${step === 1 ? (t('onboard.welcomeCoach') || '👋 Welcome, Coach!') : (t('onboard.almostThere') || '✨ Almost There!')}
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
                                ${loading ? (t('onboard.uploading') || '💾 Creating Profile...') : ('✅ ' + (t('onboard.complete') || 'Complete Setup'))}
                            </button>
                        </div>
                    `}
                </form>
            </div>
        </div>
    `;
};

// SignOut now imported from components/auth/index.js
// Hero now imported from pages/HomePage.js

// Coach components now imported from components/coach/index.js:
// LanguageFlags, TrustBadges, VideoPopup, ReviewsPopup, DiscoveryCallModal,
// CoachCard, CoachCardSkeleton, FilterSidebar, SPECIALTY_OPTIONS, LANGUAGE_OPTIONS, CoachList

// CoachList now imported from components/coach/CoachList.js
// Note: The imported CoachList accepts CoachDetailModal as a prop

// Wrapper to use imported CoachList with inline CoachDetailModal
const CoachListWithModal = ({ searchFilters, session }) => {
    return html`<${CoachList} searchFilters=${searchFilters} session=${session} CoachDetailModal=${CoachDetailModal} />`;
};

// BookingModal removed - MVP uses Discovery Calls only
// Session booking will be handled outside the platform

// CoachDetailModal now imported from ./components/coach/CoachDetailModal.js

const Dashboard = ({ session }) => {
    const [activeTab, setActiveTab] = useState('overview');

    console.log('Dashboard component rendering, session:', !!session);

    // Listen for custom tab switching events from dashboard overview
    useEffect(() => {
        const handleTabSwitch = (event) => {
            setActiveTab(event.detail);
        };
        window.addEventListener('switchTab', handleTabSwitch);
        return () => window.removeEventListener('switchTab', handleTabSwitch);
    }, []);

    if (!session) {
        console.log('No session in Dashboard, waiting for auth state...');
        // Show loading state instead of redirecting immediately
        return html`
            <div class="container" style=${{ marginTop: '100px', textAlign: 'center' }}>
                <div class="spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        `;
    }

    const userType = session.user?.user_metadata?.user_type || 'client';
    console.log('Dashboard loaded successfully for user:', session.user.email, 'User Type:', userType);

    return html`
    <div class="dashboard-container">
            <div class="dashboard-header">
                <h2 class="section-title">${t('dashboard.welcome')}, ${session.user.email}</h2>
                <div class="badge badge-petrol">${userType === 'client' ? 'Client' : userType === 'coach' ? 'Coach' : 'Business'}</div>
            </div>

            <div class="dashboard-tabs">
                <button class="tab-btn ${activeTab === 'overview' ? 'active' : ''}" onClick=${() => setActiveTab('overview')}>
                    ${t('dashboard.overview')}
                </button>
                ${userType === 'coach' && html`
                    <button class="tab-btn ${activeTab === 'discovery_requests' ? 'active' : ''}" onClick=${() => setActiveTab('discovery_requests')}>
                        📞 ${t('dashboard.discoveryRequests') || 'Discovery Requests'}
                    </button>
                    <button class="tab-btn ${activeTab === 'subscription' ? 'active' : ''}" onClick=${() => setActiveTab('subscription')}>
                        💳 ${t('dashboard.subscription') || 'Subscription'}
                    </button>
                    <button class="tab-btn ${activeTab === 'articles' ? 'active' : ''}" onClick=${() => setActiveTab('articles')}>
                        ${t('dashboard.articles')}
                    </button>
                `}
                <button class="tab-btn ${activeTab === 'referrals' ? 'active' : ''}" onClick=${() => setActiveTab('referrals')}>
                    ${t('dashboard.referrals') || 'Referrals'}
                </button>
                <button class="tab-btn ${activeTab === 'profile' ? 'active' : ''}" onClick=${() => setActiveTab('profile')}>
                    ${t('dashboard.profile')}
                </button>
            </div>

            ${activeTab === 'overview' && html`<${DashboardOverview} userType=${userType} session=${session} />`}
            ${activeTab === 'discovery_requests' && userType === 'coach' && html`<${DiscoveryRequestsDashboard} session=${session} />`}
            ${activeTab === 'subscription' && userType === 'coach' && html`<${DashboardSubscription} session=${session} />`}
            ${activeTab === 'articles' && userType === 'coach' && html`<${DashboardArticles} session=${session} />`}
            ${activeTab === 'referrals' && html`<${ReferralDashboard} session=${session} />`}
            ${activeTab === 'profile' && html`<${DashboardProfile} session=${session} userType=${userType} />`}
        </div>
    `;
};

// Booking Acceptance Modal Component
const BookingAcceptModal = ({ booking, onClose, onAccept }) => {
    const [meetingType, setMeetingType] = useState(booking.meeting_type || 'online');
    const [meetingLink, setMeetingLink] = useState('');
    const [meetingAddress, setMeetingAddress] = useState('');
    const [coachNotes, setCoachNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAccept = async () => {
        if (meetingType === 'online' && !meetingLink.trim()) {
            alert('Please provide a meeting link');
            return;
        }
        if (meetingType === 'onsite' && !meetingAddress.trim()) {
            alert('Please provide a meeting address');
            return;
        }

        setLoading(true);
        try {
            await onAccept({
                meeting_type: meetingType,
                meeting_link: meetingType === 'online' ? meetingLink : null,
                meeting_address: meetingType === 'onsite' ? meetingAddress : null,
                coach_notes: coachNotes || null
            });
        } finally {
            setLoading(false);
        }
    };

    const formatDateTime = (dateTimeStr) => {
        const date = new Date(dateTimeStr);
        return {
            date: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
            time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
    };

    const dt = formatDateTime(booking.start_time);

    return html`
        <div class="booking-modal" onClick=${onClose}>
            <div class="booking-content" onClick=${(e) => e.stopPropagation()}>
                <div class="booking-header">
                    <h2>Accept Booking Request</h2>
                    <button class="modal-close-btn" onClick=${onClose}>×</button>
                </div>

                <div class="booking-details-summary">
                    <h3>Session Details</h3>
                    <div class="summary-row">
                        <span>Client:</span>
                        <span>${booking.client?.full_name || 'Client'}</span>
                    </div>
                    <div class="summary-row">
                        <span>Date:</span>
                        <span>${dt.date}</span>
                    </div>
                    <div class="summary-row">
                        <span>Time:</span>
                        <span>${dt.time}</span>
                    </div>
                    <div class="summary-row">
                        <span>Duration:</span>
                        <span>${booking.duration_minutes} minutes</span>
                    </div>
                    ${booking.client_notes && html`
                        <div class="summary-row" style=${{ flexDirection: 'column', alignItems: 'flex-start' }}>
                            <span style=${{ fontWeight: 600, marginBottom: '4px' }}>Client Notes:</span>
                            <span style=${{ color: '#666' }}>${booking.client_notes}</span>
                        </div>
                    `}
                </div>

                <div class="form-group" style=${{ marginTop: '20px' }}>
                    <label style=${{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>Meeting Type</label>
                    <div style=${{ display: 'flex', gap: '12px' }}>
                        <button
                            class="filter-toggle-btn ${meetingType === 'online' ? 'active' : ''}"
                            onClick=${() => setMeetingType('online')}
                            style=${{ flex: 1 }}
                        >
                            💻 Online
                        </button>
                        <button
                            class="filter-toggle-btn ${meetingType === 'onsite' ? 'active' : ''}"
                            onClick=${() => setMeetingType('onsite')}
                            style=${{ flex: 1 }}
                        >
                            📍 On-site
                        </button>
                    </div>
                </div>

                ${meetingType === 'online' ? html`
                    <div class="form-group">
                        <label style=${{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                            Meeting Link * (MS Teams, Zoom, Google Meet, etc.)
                        </label>
                        <input
                            type="url"
                            class="form-control"
                            placeholder="https://teams.microsoft.com/..."
                            value=${meetingLink}
                            onInput=${(e) => setMeetingLink(e.target.value)}
                        />
                    </div>
                ` : html`
                    <div class="form-group">
                        <label style=${{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                            Meeting Address *
                        </label>
                        <textarea
                            class="form-control"
                            rows="3"
                            placeholder="Enter the address where you'll meet the client..."
                            value=${meetingAddress}
                            onInput=${(e) => setMeetingAddress(e.target.value)}
                        ></textarea>
                    </div>
                `}

                <div class="form-group">
                    <label style=${{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                        Notes to Client (Optional)
                    </label>
                    <textarea
                        class="form-control"
                        rows="3"
                        placeholder="Any additional information for the client..."
                        value=${coachNotes}
                        onInput=${(e) => setCoachNotes(e.target.value)}
                    ></textarea>
                </div>

                <div style=${{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button
                        class="btn-secondary"
                        onClick=${onClose}
                        disabled=${loading}
                        style=${{ flex: 1 }}
                    >
                        Cancel
                    </button>
                    <button
                        class="btn-primary"
                        onClick=${handleAccept}
                        disabled=${loading}
                        style=${{ flex: 1 }}
                    >
                        ${loading ? 'Accepting...' : 'Accept & Confirm'}
                    </button>
                </div>
            </div>
        </div>
    `;
};

const DashboardBookings = ({ session, userType }) => {
    const [bookings, setBookings] = useState([]);
    const [filteredBookings, setFilteredBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
    const [acceptingBooking, setAcceptingBooking] = useState(null);

    useEffect(() => {
        loadBookings();
    }, []);

    useEffect(() => {
        filterBookings();
    }, [bookings, searchQuery, statusFilter]);

    const loadBookings = async () => {
        setLoading(true);
        try {
            if (window.supabaseClient && session) {
                console.log('📋 Loading bookings for user type:', userType);

                let bookingsData = [];

                if (userType === 'coach') {
                    // Get coach_id
                    const { data: coachData } = await window.supabaseClient
                        .from('cs_coaches')
                        .select('id')
                        .eq('user_id', session.user.id)
                        .single();

                    if (coachData) {
                        const { data, error } = await window.supabaseClient
                            .from('cs_bookings')
                            .select(`
                                *,
                                client:cs_clients!client_id(full_name, email, phone)
                            `)
                            .eq('coach_id', coachData.id)
                            .order('start_time', { ascending: false });

                        if (!error && data) {
                            bookingsData = data;
                        }
                    }
                } else {
                    // Client view
                    const { data: clientData } = await window.supabaseClient
                        .from('cs_clients')
                        .select('id')
                        .eq('user_id', session.user.id)
                        .single();

                    if (clientData) {
                        const { data, error } = await window.supabaseClient
                            .from('cs_bookings')
                            .select(`
                                *,
                                coach:cs_coaches!coach_id(full_name, title, avatar_url)
                            `)
                            .eq('client_id', clientData.id)
                            .order('start_time', { ascending: false });

                        if (!error && data) {
                            bookingsData = data;
                        }
                    }
                }

                console.log('✅ Loaded bookings:', bookingsData.length);
                setBookings(bookingsData);
            }
        } catch (error) {
            console.error('❌ Failed to load bookings:', error);
            setBookings([]);
        } finally {
            setLoading(false);
        }
    };

    const filterBookings = () => {
        let filtered = [...bookings];

        // Apply status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(b => b.status === statusFilter);
        }

        // Apply search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(b =>
                (b.client_notes && b.client_notes.toLowerCase().includes(query)) ||
                (b.coach_notes && b.coach_notes.toLowerCase().includes(query)) ||
                b.status.toLowerCase().includes(query) ||
                b.meeting_type.toLowerCase().includes(query)
            );
        }

        setFilteredBookings(filtered);
    };

    const handleAcceptBooking = async (bookingDetails) => {
        try {
            console.log('✅ Accepting booking:', acceptingBooking.id, bookingDetails);

            const { error } = await window.supabaseClient
                .from('cs_bookings')
                .update({
                    status: 'confirmed',
                    meeting_type: bookingDetails.meeting_type,
                    meeting_link: bookingDetails.meeting_link,
                    meeting_address: bookingDetails.meeting_address,
                    coach_notes: bookingDetails.coach_notes
                })
                .eq('id', acceptingBooking.id);

            if (error) {
                console.error('❌ Error accepting booking:', error);
                throw error;
            }

            console.log('✅ Booking accepted successfully');
            setMessage('✓ Booking accepted and confirmed!');
            setAcceptingBooking(null);
            await loadBookings();
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('❌ Failed to accept booking:', error);
            alert('Failed to accept booking: ' + error.message);
        }
    };

    const handleCancelBooking = async (bookingId) => {
        if (!confirm('Are you sure you want to cancel this booking?')) {
            return;
        }

        const reason = prompt('Please provide a reason for cancellation (optional):');

        try {
            const { error } = await window.supabaseClient
                .from('cs_bookings')
                .update({
                    status: 'cancelled',
                    cancellation_reason: reason || 'No reason provided'
                })
                .eq('id', bookingId);

            if (error) {
                throw error;
            }

            setMessage('✓ Booking cancelled successfully');
            await loadBookings();
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('❌ Cancel booking error:', error);
            alert('Failed to cancel booking: ' + error.message);
        }
    };

    const getStatusClass = (status) => {
        const classes = {
            'pending': 'booking-status pending',
            'confirmed': 'booking-status confirmed',
            'completed': 'booking-status completed',
            'cancelled': 'booking-status cancelled'
        };
        return classes[status] || 'booking-status';
    };

    const formatDateTime = (dateTimeStr) => {
        const date = new Date(dateTimeStr);
        return {
            date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
            time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
    };

    if (loading) {
        return html`
            <div class="bookings-loading">
                ${[1, 2, 3].map(i => html`
                    <div key=${i} class="booking-card skeleton-card">
                        <div class="skeleton-line" style=${{ width: '60%', height: '20px', marginBottom: '12px' }}></div>
                        <div class="skeleton-line" style=${{ width: '100%', height: '14px', marginBottom: '8px' }}></div>
                        <div class="skeleton-line" style=${{ width: '80%', height: '14px' }}></div>
                    </div>
                `)}
            </div>
        `;
    }

    if (bookings.length === 0) {
        return html`
            <div>
                <div class="empty-state">
                    <div class="empty-state-icon">📅</div>
                    <div class="empty-state-text">No bookings yet</div>
                    <div class="empty-state-subtext">
                        ${userType === 'coach'
                            ? 'Bookings from clients will appear here.'
                            : 'Browse coaches and book your first session!'}
                    </div>
                    ${userType === 'client' && html`
                        <button class="btn-primary" style=${{ marginTop: '16px' }} onClick=${() => window.navigateTo('/coaches')}>
                            Browse Coaches
                        </button>
                    `}
                </div>
            </div>
        `;
    }

    const statusCounts = {
        all: bookings.length,
        pending: bookings.filter(b => b.status === 'pending').length,
        confirmed: bookings.filter(b => b.status === 'confirmed').length,
        completed: bookings.filter(b => b.status === 'completed').length,
        cancelled: bookings.filter(b => b.status === 'cancelled').length
    };

    return html`
        <div class="bookings-container">
            ${message && html`
                <div class="success-message" style=${{ marginBottom: '20px', padding: '12px', background: '#d4edda', color: '#155724', borderRadius: '4px' }}>
                    ${message}
                </div>
            `}

            <!-- Filters and Search Bar -->
            <div class="bookings-controls">
                <div class="search-bar-container">
                    <input
                        type="text"
                        class="search-input"
                        placeholder="🔍 Search bookings..."
                        value=${searchQuery}
                        onInput=${(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div class="filter-tabs">
                    <button
                        class="filter-tab ${statusFilter === 'all' ? 'active' : ''}"
                        onClick=${() => setStatusFilter('all')}
                    >
                        All (${statusCounts.all})
                    </button>
                    <button
                        class="filter-tab ${statusFilter === 'pending' ? 'active' : ''}"
                        onClick=${() => setStatusFilter('pending')}
                    >
                        Pending (${statusCounts.pending})
                    </button>
                    <button
                        class="filter-tab ${statusFilter === 'confirmed' ? 'active' : ''}"
                        onClick=${() => setStatusFilter('confirmed')}
                    >
                        Confirmed (${statusCounts.confirmed})
                    </button>
                    <button
                        class="filter-tab ${statusFilter === 'completed' ? 'active' : ''}"
                        onClick=${() => setStatusFilter('completed')}
                    >
                        Completed (${statusCounts.completed})
                    </button>
                    <button
                        class="filter-tab ${statusFilter === 'cancelled' ? 'active' : ''}"
                        onClick=${() => setStatusFilter('cancelled')}
                    >
                        Cancelled (${statusCounts.cancelled})
                    </button>
                </div>
            </div>

            <!-- Results count -->
            <div class="results-count">
                Showing ${filteredBookings.length} of ${bookings.length} booking${bookings.length !== 1 ? 's' : ''}
            </div>

            ${filteredBookings.length === 0 ? html`
                <div class="empty-state-mini">
                    <div class="empty-icon">🔍</div>
                    <div class="empty-text">No bookings match your filters</div>
                    <button class="btn-secondary" style=${{ marginTop: '12px' }} onClick=${() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                    }}>
                        Clear Filters
                    </button>
                </div>
            ` : html`
                <div class="bookings-list">
                    ${filteredBookings.map(booking => {
                    const dt = formatDateTime(booking.start_time);
                    const canCancel = booking.status === 'pending' || booking.status === 'confirmed';

                    return html`
                        <div key=${booking.id} class="booking-card">
                            <div class="booking-card-header">
                                <div>
                                    <h3>${userType === 'coach' ? 'Client Booking' : `Session with Coach`}</h3>
                                    <div class=${getStatusClass(booking.status)}>
                                        ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                    </div>
                                </div>
                                <div class="booking-card-price">
                                    ${formatPrice(booking.amount)}
                                </div>
                            </div>

                            <div class="booking-card-body">
                                <div class="booking-detail-row">
                                    <span class="booking-detail-label">📅 Date:</span>
                                    <span>${dt.date}</span>
                                </div>
                                <div class="booking-detail-row">
                                    <span class="booking-detail-label">🕐 Time:</span>
                                    <span>${dt.time}</span>
                                </div>
                                <div class="booking-detail-row">
                                    <span class="booking-detail-label">⏱️ Duration:</span>
                                    <span>${booking.duration_minutes} minutes</span>
                                </div>
                                <div class="booking-detail-row">
                                    <span class="booking-detail-label">📍 Type:</span>
                                    <span>${booking.meeting_type === 'online' ? 'Online' : 'On-site'}</span>
                                </div>

                                ${booking.meeting_link && html`
                                    <div class="booking-detail-row">
                                        <span class="booking-detail-label">🔗 Meeting Link:</span>
                                        <a href=${booking.meeting_link} target="_blank" class="btn-small btn-secondary">
                                            Join Meeting
                                        </a>
                                    </div>
                                `}

                                ${booking.client_notes && userType === 'coach' && html`
                                    <div class="booking-detail-row">
                                        <span class="booking-detail-label">📝 Client Notes:</span>
                                        <span>${booking.client_notes}</span>
                                    </div>
                                `}

                                ${booking.coach_notes && userType === 'client' && html`
                                    <div class="booking-detail-row">
                                        <span class="booking-detail-label">📝 Coach Notes:</span>
                                        <span>${booking.coach_notes}</span>
                                    </div>
                                `}
                            </div>

                            <div class="booking-card-actions">
                                ${userType === 'coach' && booking.status === 'pending' && html`
                                    <button
                                        class="btn-small btn-primary"
                                        onClick=${() => setAcceptingBooking(booking)}
                                        style=${{ marginRight: '8px' }}
                                    >
                                        ✓ Accept Booking
                                    </button>
                                `}
                                ${canCancel && html`
                                    <button
                                        class="btn-small btn-secondary"
                                        onClick=${() => handleCancelBooking(booking.id)}
                                    >
                                        Cancel Booking
                                    </button>
                                `}
                                ${booking.status === 'cancelled' && booking.cancellation_reason && html`
                                    <div class="booking-detail-row" style=${{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
                                        <span>Cancellation reason: ${booking.cancellation_reason}</span>
                                    </div>
                                `}
                            </div>
                        </div>
                    `;
                    })}
                </div>
            `}

            ${acceptingBooking && html`
                <${BookingAcceptModal}
                    booking=${acceptingBooking}
                    onClose=${() => setAcceptingBooking(null)}
                    onAccept=${handleAcceptBooking}
                />
            `}
        </div>
    `;
};

// Discovery Requests Dashboard Component - imported from ./components/dashboard/DiscoveryRequestsDashboard.js

// Subscription Dashboard Component - imported from ./components/dashboard/DashboardSubscription.js

// DashboardOverview - imported from ./components/dashboard/DashboardOverview.js

// TODO: Extract remaining dashboard components below (DashboardAvailability, DashboardArticles, DashboardProfile)

const DashboardAvailability = ({ session }) => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [weeklySlots, setWeeklySlots] = useState([]);

    const daysOfWeek = [
        { id: 0, name: 'Sunday', short: 'Sun' },
        { id: 1, name: 'Monday', short: 'Mon' },
        { id: 2, name: 'Tuesday', short: 'Tue' },
        { id: 3, name: 'Wednesday', short: 'Wed' },
        { id: 4, name: 'Thursday', short: 'Thu' },
        { id: 5, name: 'Friday', short: 'Fri' },
        { id: 6, name: 'Saturday', short: 'Sat' }
    ];

    useEffect(() => {
        loadAvailability();
    }, []);

    const loadAvailability = async () => {
        try {
            console.log('🕐 Loading availability for user:', session.user.id);

            // First get coach_id from cs_coaches table
            const { data: coachData, error: coachError } = await window.supabaseClient
                .from('cs_coaches')
                .select('id')
                .eq('user_id', session.user.id)
                .single();

            if (coachError) {
                console.error('❌ Coach fetch error:', coachError);
                setWeeklySlots([]);
                return;
            }

            console.log('✅ Coach ID:', coachData.id);

            // Load availability slots for this coach
            const { data: slotsData, error: slotsError } = await window.supabaseClient
                .from('cs_coach_availability')
                .select('*')
                .eq('coach_id', coachData.id)
                .order('day_of_week', { ascending: true })
                .order('start_time', { ascending: true });

            if (slotsError) {
                console.error('❌ Slots fetch error:', slotsError);
                setWeeklySlots([]);
                return;
            }

            console.log('✅ Loaded availability slots:', slotsData?.length || 0);
            setWeeklySlots(slotsData || []);
        } catch (error) {
            console.error('❌ Failed to load availability:', error);
            setWeeklySlots([]); // Ensure it's an array even on error
        }
    };

    const getSlotsForDay = (dayId) => {
        // Safety check to ensure weeklySlots is an array
        if (!Array.isArray(weeklySlots)) {
            console.error('weeklySlots is not an array:', weeklySlots);
            return [];
        }
        return weeklySlots.filter(slot => slot.day_of_week === dayId);
    };

    const addSlot = (dayId) => {
        const newSlot = {
            day_of_week: dayId,
            start_time: '09:00',
            end_time: '17:00',
            is_active: true,
            temp_id: Date.now() // Temporary ID for local state
        };
        setWeeklySlots([...weeklySlots, newSlot]);
    };

    const removeSlot = (tempId, slotId) => {
        setWeeklySlots(weeklySlots.filter(slot =>
            tempId ? slot.temp_id !== tempId : slot.id !== slotId
        ));
    };

    const updateSlot = (tempId, slotId, field, value) => {
        setWeeklySlots(weeklySlots.map(slot => {
            if ((tempId && slot.temp_id === tempId) || (!tempId && slot.id === slotId)) {
                return { ...slot, [field]: value };
            }
            return slot;
        }));
    };

    const saveAvailability = async () => {
        setLoading(true);
        setMessage('');

        try {
            console.log('💾 Starting availability save...');
            console.log('📋 Current slots:', weeklySlots);

            // Get coach_id from cs_coaches table
            console.log('📋 Fetching coach data for user:', session.user.id);
            const { data: coachData, error: coachError } = await window.supabaseClient
                .from('cs_coaches')
                .select('id')
                .eq('user_id', session.user.id)
                .single();

            if (coachError) {
                console.error('❌ Coach fetch error:', coachError);
                throw new Error('Coach profile not found. Please complete your profile first.');
            }

            console.log('✅ Coach ID:', coachData.id);

            // Delete all existing availability slots for this coach
            console.log('🗑️ Deleting existing availability slots...');
            const { error: deleteError } = await window.supabaseClient
                .from('cs_coach_availability')
                .delete()
                .eq('coach_id', coachData.id);

            if (deleteError) {
                console.error('❌ Delete error:', deleteError);
                throw deleteError;
            }

            console.log('✅ Existing slots deleted');

            // Insert new slots if there are any
            if (weeklySlots.length > 0) {
                const slotsToInsert = weeklySlots.map(slot => ({
                    coach_id: coachData.id,
                    day_of_week: slot.day_of_week,
                    start_time: slot.start_time,
                    end_time: slot.end_time,
                    is_active: slot.is_active !== false
                }));

                console.log('➕ Inserting new slots:', slotsToInsert);

                const { data: insertedData, error: insertError } = await window.supabaseClient
                    .from('cs_coach_availability')
                    .insert(slotsToInsert)
                    .select();

                if (insertError) {
                    console.error('❌ Insert error:', insertError);
                    throw insertError;
                }

                console.log('✅ Slots inserted successfully:', insertedData);
            } else {
                console.log('ℹ️ No slots to insert (all cleared)');
            }

            setMessage('✓ Availability updated successfully!');
            await loadAvailability(); // Reload to get IDs
            setTimeout(() => setMessage(''), 3000);

        } catch (error) {
            console.error('❌ Save error:', error);
            setMessage('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return html`
        <div>
            <div style=${{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3>Weekly Availability</h3>
                <button class="btn-primary" onClick=${saveAvailability} disabled=${loading}>
                    ${loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            ${message && html`
                <div class="message" style=${{
                    padding: '12px',
                    borderRadius: '4px',
                    marginBottom: '20px',
                    background: message.includes('Error') ? '#fee' : '#efe',
                    color: message.includes('Error') ? '#c00' : '#060'
                }}>
                    ${message}
                </div>
            `}

            <div class="availability-calendar">
                ${daysOfWeek.map(day => html`
                    <div key=${day.id} class="availability-day">
                        <div class="availability-day-header">
                            <strong>${day.name}</strong>
                            <button
                                class="btn-small btn-secondary"
                                onClick=${() => addSlot(day.id)}
                                style=${{ fontSize: '12px', padding: '4px 8px' }}
                            >
                                + Add Time
                            </button>
                        </div>

                        <div class="availability-slots">
                            ${getSlotsForDay(day.id).length === 0 && html`
                                <div class="availability-empty">No availability set</div>
                            `}

                            ${getSlotsForDay(day.id).map(slot => html`
                                <div key=${slot.id || slot.temp_id} class="availability-slot">
                                    <input
                                        type="time"
                                        class="time-input"
                                        value=${slot.start_time}
                                        onChange=${(e) => updateSlot(slot.temp_id, slot.id, 'start_time', e.target.value)}
                                    />
                                    <span>to</span>
                                    <input
                                        type="time"
                                        class="time-input"
                                        value=${slot.end_time}
                                        onChange=${(e) => updateSlot(slot.temp_id, slot.id, 'end_time', e.target.value)}
                                    />
                                    <button
                                        class="btn-remove"
                                        onClick=${() => removeSlot(slot.temp_id, slot.id)}
                                        style=${{
                                            background: '#fee',
                                            color: '#c00',
                                            border: '1px solid #fcc',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            fontSize: '12px'
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            `)}
                        </div>
                    </div>
                `)}
            </div>

            <div class="form-hint" style=${{ marginTop: '20px', padding: '12px', background: '#f0f8ff', borderRadius: '4px' }}>
                💡 <strong>Tip:</strong> Set your regular weekly schedule here. You can add multiple time slots for each day.
                Clients will see available booking slots based on this schedule.
            </div>
        </div>
    `;
};

const DashboardArticles = ({ session }) => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showEditor, setShowEditor] = useState(false);
    const [editingArticle, setEditingArticle] = useState(null);

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
        loadArticles();
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
                    ${showEditor ? '✕ Close Editor' : '✍️ Write New Article'}
                </button>
            </div>

            ${showEditor && html`
                <${ArticleEditor}
                    session=${session}
                    article=${editingArticle}
                    onClose=${handleCloseEditor}
                />
            `}

            ${!showEditor && articles.length === 0 && html`
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <div class="empty-state-text">No articles yet</div>
                    <div class="empty-state-subtext">Create your first article to share your expertise!</div>
                    <button class="btn-primary" style=${{ marginTop: '16px' }} onClick=${() => setShowEditor(true)}>
                        ✍️ Write Your First Article
                    </button>
                </div>
            `}

            ${!showEditor && articles.length > 0 && html`
                <div class="articles-list">
                    ${articles.map(article => html`
                        <div key=${article.id} class="article-card">
                            <div class="article-card-header">
                                <div class="article-card-title">
                                    <h4>${article.title}</h4>
                                    <span class="status-badge ${article.status === 'published' ? 'status-confirmed' : 'status-pending'}">
                                        ${article.status === 'published' ? '✓ Published' : '📝 Draft'}
                                    </span>
                                </div>
                                <div class="article-card-meta">
                                    <span>📅 ${new Date(article.created_at).toLocaleDateString()}</span>
                                    ${article.view_count > 0 && html`
                                        <span>👁️ ${article.view_count} views</span>
                                    `}
                                </div>
                            </div>

                            <div class="article-card-excerpt">
                                ${article.excerpt || (article.content_html ? article.content_html.replace(/<[^>]*>/g, '').substring(0, 150) + '...' : '')}
                            </div>

                            <div class="article-card-actions">
                                <button class="btn-small btn-secondary" onClick=${() => handleEdit(article)}>
                                    ✏️ Edit
                                </button>
                                <button
                                    class="btn-small ${article.status === 'published' ? 'btn-secondary' : 'btn-primary'}"
                                    onClick=${() => handleTogglePublish(article)}
                                >
                                    ${article.status === 'published' ? '📥 Unpublish' : '🚀 Publish'}
                                </button>
                                <button class="btn-small btn-danger" onClick=${() => handleDelete(article.id)}>
                                    🗑️ Delete
                                </button>
                            </div>
                        </div>
                    `)}
                </div>
            `}
        </div>
    `;
};

const ArticleEditor = ({ session, article, onClose }) => {
    const [title, setTitle] = useState(article?.title || '');
    const [excerpt, setExcerpt] = useState(article?.excerpt || '');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const editorRef = useRef(null);

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
            console.log('💾 Starting article save...');

            // Generate slug from title
            const slug = title.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');

            // Get coach_id from cs_coaches table
            console.log('📋 Fetching coach data for user:', session.user.id);
            const { data: coachData, error: coachError } = await window.supabaseClient
                .from('cs_coaches')
                .select('id')
                .eq('user_id', session.user.id)
                .single();

            if (coachError) {
                console.error('❌ Coach fetch error:', coachError);
                throw new Error('Coach profile not found. Please complete your profile first.');
            }

            console.log('✅ Coach ID:', coachData.id);

            const articleData = {
                coach_id: coachData.id,
                title: title.trim(),
                slug: slug || 'untitled',
                content_html: contentHTML,
                excerpt: excerpt.trim() || plainText.substring(0, 200),
                status: publishNow ? 'published' : 'draft',
            };

            console.log('📝 Article data prepared:', { ...articleData, content_html: contentHTML.substring(0, 100) + '...' });

            let result;
            if (article?.id) {
                // Update existing article
                console.log('🔄 Updating existing article:', article.id);
                result = await window.supabaseClient
                    .from('cs_articles')
                    .update(articleData)
                    .eq('id', article.id)
                    .select();
            } else {
                // Create new article
                console.log('➕ Creating new article');
                result = await window.supabaseClient
                    .from('cs_articles')
                    .insert([articleData])
                    .select();
            }

            if (result.error) {
                console.error('❌ Supabase error:', result.error);
                throw result.error;
            }

            console.log('✅ Article saved successfully!', result.data);
            setMessage(publishNow ? '✓ Article published successfully!' : '✓ Article saved as draft!');
            setTimeout(() => {
                setMessage('');
                if (onClose) onClose();
            }, 1500);

        } catch (error) {
            console.error('❌ Failed to save article:', error);
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
                <!-- Title Input -->
                <input
                    type="text"
                    class="editor-title-input"
                    placeholder="Article Title"
                    value=${title}
                    onChange=${(e) => setTitle(e.target.value)}
                />

                <!-- Excerpt Input -->
                <input
                    type="text"
                    class="editor-excerpt-input"
                    placeholder="Short excerpt (optional - will auto-generate from content)"
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
                            • List
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
                            🔗 Link
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
                        ← Back to Articles
                    </button>

                    <div class="editor-actions-right">
                        <button
                            class="btn-secondary"
                            onClick=${() => handleSave(false)}
                            disabled=${saving}
                        >
                            ${saving ? 'Saving...' : '💾 Save as Draft'}
                        </button>
                        <button
                            class="btn-primary"
                            onClick=${() => handleSave(true)}
                            disabled=${saving}
                        >
                            ${saving ? 'Publishing...' : '🚀 Publish Article'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
};

const DashboardProBono = ({ session }) => {
    console.log('Loading pro-bono dashboard');

    return html`
        <div>
            <h3>${t('dashboard.probono')}</h3>
            <p style=${{ marginBottom: '20px', color: 'var(--text-muted)' }}>
                Offer free coaching sessions and track your pro-bono hours for certifications.
            </p>

            <div class="stat-card" style=${{ marginBottom: '20px' }}>
                <div class="stat-label">${t('probono.hours_tracked')}</div>
                <div class="stat-value">0.0 hrs</div>
            </div>
            <button class="btn-primary" onClick=${() => {
                console.log('Add pro-bono slot clicked');
                alert('Pro-bono scheduler will be connected to API soon!');
            }}>
                ${t('probono.add_slot')}
            </button>

            <div class="empty-state" style=${{ marginTop: '40px' }}>
                <div class="empty-state-icon">🎁</div>
                <div class="empty-state-text">No pro-bono slots yet</div>
                <div class="empty-state-subtext">Create free coaching slots to help others and earn certification hours.</div>
            </div>
        </div>
    `;
};

const DashboardProfile = ({ session, userType }) => {
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
    console.log('🎨 [PROFILE DEBUG] Rendering with formData:', {
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
                ✨ This is how your profile appears to clients. Click any section to edit.
            </div>

            <!-- Profile Card -->
            <div class="linkedin-profile-card">
                <!-- Banner -->
                <div class="profile-banner" style=${{ backgroundImage: formData.banner_url ? `url('${formData.banner_url}')` : 'none', backgroundColor: formData.banner_url ? 'transparent' : '#1a5f5a', height: '180px', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                    <label class="banner-upload-btn">
                        <input type="file" accept="image/*" hidden onChange=${(e) => handleImageUpload(e, 'banner_url')} />
                        📷 ${formData.banner_url ? 'Change' : 'Add'} Cover
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
                            📷
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
                        <button class="edit-btn" onClick=${() => setEditSection('intro')}>✏️ Edit</button>
                    </div>

                    <div class="profile-meta">
                        <span>📍 ${locationText}</span>
                        ${formData.languages.length > 0 && html`
                            <span>💬 ${formData.languages.slice(0, 3).join(', ')}</span>
                        `}
                        ${formData.years_experience > 0 && html`
                            <span>🏆 ${String(formData.years_experience)}+ years</span>
                        `}
                    </div>

                    <div class="profile-pricing">
                        <span class="price-badge">${formatPrice(formData.hourly_rate)} / hour</span>
                        ${formData.offers_online && html`<span class="format-badge">💻 Online</span>`}
                        ${formData.offers_in_person && html`<span class="format-badge">🤝 In-Person</span>`}
                    </div>
                </div>
            </div>

            <!-- About Section -->
            <div class="linkedin-section">
                <div class="section-header">
                    <h2>About</h2>
                    <button class="edit-btn" onClick=${() => setEditSection('about')}>✏️</button>
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
                    <button class="edit-btn" onClick=${() => setEditSection('specialties')}>✏️</button>
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
                    <h2>🎬 Video Introduction</h2>
                    <button class="edit-btn" onClick=${() => setEditSection('video')}>✏️</button>
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
                    <button class="edit-btn" onClick=${() => setEditSection('links')}>✏️</button>
                </div>
                <div class="section-content links-row">
                    ${formData.website_url && html`<a href=${formData.website_url} target="_blank" class="link-btn">🌐 Website</a>`}
                    ${formData.linkedin_url && html`<a href=${formData.linkedin_url} target="_blank" class="link-btn">💼 LinkedIn</a>`}
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
                                        💻 Video/Online
                                    </label>
                                    <label class="checkbox-item">
                                        <input type="checkbox" checked=${formData.offers_in_person} onChange=${(e) => setFormData({...formData, offers_in_person: e.target.checked})} />
                                        🤝 In-Person
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
                            <h3>🎬 Video Introduction</h3>
                            <button onClick=${() => setEditSection(null)}>×</button>
                        </div>
                        <div class="modal-body">
                            <div class="video-info-box">
                                <div class="info-icon">💡</div>
                                <div class="info-content">
                                    <strong>Why add a video?</strong>
                                    <ul>
                                        <li>📈 Appear at the <strong>top of search results</strong></li>
                                        <li>🤝 Build <strong>instant trust</strong> with potential clients</li>
                                        <li>📅 Get <strong>more bookings</strong> - clients prefer coaches they can see</li>
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

// Home page sections (Hero, CoachingCategoriesSection, HowItWorksSection, TrustBadgesSection)
// now imported from pages/HomePage.js

const Home = ({ session }) => {
    return html`
        <div>
            <${Hero} />
            <${TrustBadgesSection} />
            <${CoachingCategoriesSection} />
            <${HowItWorksSection} />

            <${CoachListWithModal} session=${session} />
        </div>
    `;
};

// =====================================================
// REVIEW & RATING SYSTEM
// =====================================================

const StarRating = ({ rating, size = 'medium', interactive = false, onChange }) => {
    const [hoverRating, setHoverRating] = useState(0);
    const [selectedRating, setSelectedRating] = useState(rating || 0);

    const sizes = {
        small: '16px',
        medium: '20px',
        large: '24px'
    };

    const handleClick = (value) => {
        if (interactive) {
            setSelectedRating(value);
            if (onChange) onChange(value);
        }
    };

    const displayRating = interactive ? (hoverRating || selectedRating) : rating;

    return html`
        <div style=${{ display: 'flex', gap: '4px' }}>
            ${[1, 2, 3, 4, 5].map(star => html`
                <span
                    key=${star}
                    onClick=${() => handleClick(star)}
                    onMouseEnter=${() => interactive && setHoverRating(star)}
                    onMouseLeave=${() => interactive && setHoverRating(0)}
                    style=${{
                        fontSize: sizes[size],
                        color: star <= displayRating ? '#FFB800' : '#E0E0E0',
                        cursor: interactive ? 'pointer' : 'default',
                        transition: 'color 0.2s'
                    }}
                >
                    ★
                </span>
            `)}
        </div>
    `;
};

const ReviewCard = ({ review, isCoach = false, onRespond }) => {
    const [showResponseForm, setShowResponseForm] = useState(false);
    const [response, setResponse] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmitResponse = async () => {
        if (!response.trim()) return;

        setSubmitting(true);
        if (onRespond) {
            await onRespond(review.id, response);
        }
        setSubmitting(false);
        setShowResponseForm(false);
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return html`
        <div class="review-card" style=${{
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '16px',
            background: 'white'
        }}>
            <div style=${{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div>
                    <div style=${{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <${StarRating} rating=${review.rating} size="medium" />
                        ${review.is_verified_booking && html`
                            <span style=${{
                                background: '#E8F5E9',
                                color: '#2E7D32',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '600'
                            }}>
                                ✓ Verified Booking
                            </span>
                        `}
                    </div>
                    ${review.title && html`
                        <h4 style=${{ margin: '0 0 8px 0', fontSize: '16px' }}>${review.title}</h4>
                    `}
                </div>
                <span style=${{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    ${formatDate(review.created_at)}
                </span>
            </div>

            <p style=${{ margin: '0 0 16px 0', lineHeight: '1.6' }}>
                ${review.content}
            </p>

            ${review.coach_response && html`
                <div style=${{
                    background: '#F5F5F5',
                    padding: '12px 16px',
                    borderRadius: '6px',
                    borderLeft: '3px solid var(--primary-petrol)',
                    marginTop: '12px'
                }}>
                    <div style=${{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <strong style=${{ fontSize: '14px' }}>Coach Response</strong>
                        <span style=${{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            ${formatDate(review.coach_responded_at)}
                        </span>
                    </div>
                    <p style=${{ margin: 0, fontSize: '14px', lineHeight: '1.6' }}>
                        ${review.coach_response}
                    </p>
                </div>
            `}

            ${isCoach && !review.coach_response && html`
                <div>
                    ${!showResponseForm ? html`
                        <button
                            class="btn-secondary"
                            onClick=${() => setShowResponseForm(true)}
                            style=${{ padding: '6px 12px', fontSize: '14px' }}
                        >
                            Respond to Review
                        </button>
                    ` : html`
                        <div style=${{ marginTop: '12px' }}>
                            <textarea
                                class="form-control"
                                rows="3"
                                placeholder="Write your response..."
                                value=${response}
                                onInput=${(e) => setResponse(e.target.value)}
                                style=${{ marginBottom: '8px' }}
                            ></textarea>
                            <div style=${{ display: 'flex', gap: '8px' }}>
                                <button
                                    class="btn-primary"
                                    onClick=${handleSubmitResponse}
                                    disabled=${submitting || !response.trim()}
                                >
                                    ${submitting ? 'Submitting...' : 'Submit Response'}
                                </button>
                                <button
                                    class="btn-secondary"
                                    onClick=${() => setShowResponseForm(false)}
                                    disabled=${submitting}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    `}
                </div>
            `}
        </div>
    `;
};

const WriteReviewModal = ({ booking, onClose, onSubmit }) => {
    const [rating, setRating] = useState(5);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!content.trim()) {
            alert('Please write your review');
            return;
        }

        setSubmitting(true);
        if (onSubmit) {
            await onSubmit({ rating, title, content });
        }
        setSubmitting(false);
    };

    return html`
        <div class="booking-modal" onClick=${onClose}>
            <div class="booking-content" onClick=${(e) => e.stopPropagation()} style=${{ maxWidth: '600px' }}>
                <div class="booking-header">
                    <h2>Write a Review</h2>
                    <button class="modal-close-btn" onClick=${onClose}>×</button>
                </div>

                <div style=${{ padding: '20px' }}>
                    <div class="form-group">
                        <label>Your Rating *</label>
                        <${StarRating} rating=${rating} size="large" interactive=${true} onChange=${setRating} />
                    </div>

                    <div class="form-group">
                        <label>Review Title (Optional)</label>
                        <input
                            type="text"
                            class="form-control"
                            placeholder="e.g., Great coaching session!"
                            value=${title}
                            onInput=${(e) => setTitle(e.target.value)}
                            maxLength="100"
                        />
                    </div>

                    <div class="form-group">
                        <label>Your Review *</label>
                        <textarea
                            class="form-control"
                            rows="6"
                            placeholder="Share your experience with this coach..."
                            value=${content}
                            onInput=${(e) => setContent(e.target.value)}
                            required
                        ></textarea>
                        <div class="form-hint">${content.length}/1000 characters</div>
                    </div>

                    <div style=${{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                        <button
                            class="btn-primary"
                            onClick=${handleSubmit}
                            disabled=${submitting || !content.trim()}
                            style=${{ flex: 1 }}
                        >
                            ${submitting ? 'Submitting...' : 'Submit Review'}
                        </button>
                        <button
                            class="btn-secondary"
                            onClick=${onClose}
                            disabled=${submitting}
                            style=${{ flex: 1 }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
};

// =====================================================
// MESSAGING SYSTEM
// =====================================================

const MessagingInbox = ({ session }) => {
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadConversations();
    }, []);

    const loadConversations = async () => {
        try {
            const response = await fetch(`${API_BASE}/conversations`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            const data = await response.json();
            setConversations(data.data || []);
        } catch (error) {
            console.error('Failed to load conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return html`<div class="spinner"></div>`;
    }

    if (selectedConversation) {
        return html`
            <${ConversationView}
                conversation=${selectedConversation}
                session=${session}
                onBack=${() => setSelectedConversation(null)}
            />
        `;
    }

    return html`
        <div>
            <h3 style=${{ marginBottom: '20px' }}>Messages</h3>

            ${conversations.length === 0 ? html`
                <div class="empty-state">
                    <div class="empty-state-icon">💬</div>
                    <div class="empty-state-text">No messages yet</div>
                    <div class="empty-state-subtext">Start a conversation with a coach!</div>
                </div>
            ` : html`
                <div class="conversations-list">
                    ${conversations.map(conv => html`
                        <div
                            key=${conv.id}
                            class="conversation-item"
                            onClick=${() => setSelectedConversation(conv)}
                            style=${{
                                padding: '16px',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                marginBottom: '12px',
                                cursor: 'pointer',
                                background: conv.unread_count > 0 ? '#F0F9FA' : 'white',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style=${{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <strong>${conv.other_participant_name}</strong>
                                <span style=${{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    ${new Date(conv.last_message_at).toLocaleDateString()}
                                </span>
                            </div>
                            <div style=${{ fontSize: '14px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                ${conv.last_message_preview}
                            </div>
                            ${conv.unread_count > 0 && html`
                                <span style=${{
                                    display: 'inline-block',
                                    background: 'var(--primary-petrol)',
                                    color: 'white',
                                    borderRadius: '12px',
                                    padding: '2px 8px',
                                    fontSize: '12px',
                                    marginTop: '8px'
                                }}>
                                    ${conv.unread_count} new
                                </span>
                            `}
                        </div>
                    `)}
                </div>
            `}
        </div>
    `;
};

const ConversationView = ({ conversation, session, onBack }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        loadMessages();
        const interval = setInterval(loadMessages, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, [conversation.id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadMessages = async () => {
        try {
            const response = await fetch(`${API_BASE}/conversations/${conversation.id}/messages`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            const data = await response.json();
            setMessages(data.data || []);
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    };

    const handleSend = async () => {
        if (!newMessage.trim()) return;

        setSending(true);
        try {
            const response = await fetch(`${API_BASE}/conversations/${conversation.id}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ content: newMessage })
            });

            if (response.ok) {
                setNewMessage('');
                await loadMessages();
            }
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setSending(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return html`
        <div style=${{ display: 'flex', flexDirection: 'column', height: '600px' }}>
            <div style=${{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                borderBottom: '1px solid var(--border-color)',
                background: 'white'
            }}>
                <button class="btn-secondary" onClick=${onBack} style=${{ padding: '6px 12px' }}>
                    ← Back
                </button>
                <strong>${conversation.other_participant_name}</strong>
            </div>

            <div style=${{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                background: '#F5F5F5'
            }}>
                ${messages.map(msg => {
                    const isOwn = msg.sender_id === session.user.id;
                    return html`
                        <div
                            key=${msg.id}
                            style=${{
                                display: 'flex',
                                justifyContent: isOwn ? 'flex-end' : 'flex-start',
                                marginBottom: '12px'
                            }}
                        >
                            <div style=${{
                                maxWidth: '70%',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                background: isOwn ? 'var(--primary-petrol)' : 'white',
                                color: isOwn ? 'white' : 'var(--text-main)',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                            }}>
                                <div style=${{ fontSize: '14px', lineHeight: '1.5' }}>${msg.content}</div>
                                <div style=${{
                                    fontSize: '11px',
                                    marginTop: '4px',
                                    opacity: 0.7
                                }}>
                                    ${new Date(msg.created_at).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            </div>
                        </div>
                    `;
                })}
                <div ref=${messagesEndRef} />
            </div>

            <div style=${{
                padding: '16px',
                borderTop: '1px solid var(--border-color)',
                background: 'white'
            }}>
                <div style=${{ display: 'flex', gap: '12px' }}>
                    <textarea
                        class="form-control"
                        rows="2"
                        placeholder="Type your message..."
                        value=${newMessage}
                        onInput=${(e) => setNewMessage(e.target.value)}
                        onKeyPress=${handleKeyPress}
                        disabled=${sending}
                        style=${{ flex: 1, resize: 'none' }}
                    ></textarea>
                    <button
                        class="btn-primary"
                        onClick=${handleSend}
                        disabled=${sending || !newMessage.trim()}
                        style=${{ alignSelf: 'flex-end' }}
                    >
                        ${sending ? 'Sending...' : 'Send'}
                    </button>
                </div>
                <div class="form-hint" style=${{ marginTop: '4px' }}>Press Enter to send, Shift+Enter for new line</div>
            </div>
        </div>
    `;
};

// =====================================================
// NOTIFICATIONS
// =====================================================

const NotificationBell = ({ session }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        if (session) {
            loadNotifications();
            const interval = setInterval(loadNotifications, 30000); // Poll every 30 seconds
            return () => clearInterval(interval);
        }
    }, [session]);

    const loadNotifications = async () => {
        try {
            const response = await fetch(`${API_BASE}/notifications`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            const data = await response.json();
            const notifs = data.data || [];
            setNotifications(notifs.slice(0, 5)); // Show last 5
            setUnreadCount(notifs.filter(n => !n.is_read).length);
        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            loadNotifications();
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    return html`
        <div style=${{ position: 'relative' }}>
            <button
                class="btn-secondary"
                onClick=${() => setShowDropdown(!showDropdown)}
                style=${{
                    position: 'relative',
                    padding: '8px 12px',
                    background: unreadCount > 0 ? 'var(--petrol-light)' : 'transparent',
                    color: unreadCount > 0 ? 'white' : 'inherit'
                }}
            >
                🔔
                ${unreadCount > 0 && html`
                    <span style=${{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: 'red',
                        color: 'white',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        fontSize: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold'
                    }}>
                        ${unreadCount}
                    </span>
                `}
            </button>

            ${showDropdown && html`
                <div style=${{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    width: '320px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    background: 'white',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 1000
                }}>
                    <div style=${{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border-color)',
                        fontWeight: '600'
                    }}>
                        Notifications
                    </div>

                    ${notifications.length === 0 ? html`
                        <div style=${{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No notifications
                        </div>
                    ` : html`
                        <div>
                            ${notifications.map(notif => html`
                                <div
                                    key=${notif.id}
                                    onClick=${() => {
                                        markAsRead(notif.id);
                                        if (notif.action_url) window.location.hash = notif.action_url;
                                    }}
                                    style=${{
                                        padding: '12px 16px',
                                        borderBottom: '1px solid var(--border-color)',
                                        cursor: 'pointer',
                                        background: notif.is_read ? 'white' : '#F0F9FA',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    <div style=${{ fontWeight: notif.is_read ? 'normal' : '600', fontSize: '14px', marginBottom: '4px' }}>
                                        ${notif.title}
                                    </div>
                                    <div style=${{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                        ${notif.body}
                                    </div>
                                    <div style=${{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        ${new Date(notif.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            `)}
                        </div>
                    `}

                    ${notifications.length > 0 && html`
                        <div style=${{ padding: '8px 16px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
                            <a href="/notifications" style=${{ fontSize: '13px', color: 'var(--primary-petrol)' }}>
                                View All Notifications
                            </a>
                        </div>
                    `}
                </div>
            `}
        </div>
    `;
};

// =====================================================
// FAVORITES MANAGEMENT
// =====================================================

const FavoriteButton = ({ coachId, session, isFavorited, onToggle }) => {
    const [loading, setLoading] = useState(false);

    const handleToggle = async () => {
        if (!session) {
            alert('Please sign in to save favorites');
            window.navigateTo('/login');
            return;
        }

        setLoading(true);
        try {
            const endpoint = isFavorited
                ? `${API_BASE}/favorites/${coachId}`
                : `${API_BASE}/favorites/${coachId}`;

            const response = await fetch(endpoint, {
                method: isFavorited ? 'DELETE' : 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            if (response.ok && onToggle) {
                onToggle(!isFavorited);
            }
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
        } finally {
            setLoading(false);
        }
    };

    return html`
        <button
            class="btn-secondary"
            onClick=${handleToggle}
            disabled=${loading}
            style=${{
                padding: '6px 12px',
                background: isFavorited ? 'var(--petrol-light)' : 'white',
                color: isFavorited ? 'white' : 'inherit',
                border: `1px solid ${isFavorited ? 'var(--petrol-light)' : 'var(--border-color)'}`
            }}
            title=${isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
            ${isFavorited ? '❤️' : '🤍'} ${isFavorited ? 'Saved' : 'Save'}
        </button>
    `;
};

// =====================================================
// TIMEZONE HANDLING
// =====================================================

const TimezoneSelector = ({ value, onChange }) => {
    const commonTimezones = [
        { value: 'Europe/London', label: 'London (GMT)' },
        { value: 'Europe/Paris', label: 'Paris (CET)' },
        { value: 'Europe/Berlin', label: 'Berlin (CET)' },
        { value: 'Europe/Madrid', label: 'Madrid (CET)' },
        { value: 'Europe/Rome', label: 'Rome (CET)' },
        { value: 'Europe/Amsterdam', label: 'Amsterdam (CET)' },
        { value: 'America/New_York', label: 'New York (EST)' },
        { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
        { value: 'Asia/Dubai', label: 'Dubai (GST)' },
        { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
        { value: 'UTC', label: 'UTC' }
    ];

    return html`
        <select class="form-control" value=${value} onChange=${(e) => onChange(e.target.value)}>
            <option value="">Select timezone...</option>
            ${commonTimezones.map(tz => html`
                <option key=${tz.value} value=${tz.value}>${tz.label}</option>
            `)}
        </select>
    `;
};

// GDPR components (DataExportRequest, AccountDeletion) now imported from components/account/

// =====================================================
// COACH EARNINGS DASHBOARD
// =====================================================

const CoachEarningsDashboard = ({ session }) => {
    const [earnings, setEarnings] = useState(null);
    const [payouts, setPayouts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [earningsRes, payoutsRes] = await Promise.all([
                fetch(`${API_BASE}/coaches/me/earnings`, {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                }),
                fetch(`${API_BASE}/coaches/me/payouts`, {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                })
            ]);

            const earningsData = await earningsRes.json();
            const payoutsData = await payoutsRes.json();

            setEarnings(earningsData.data);
            setPayouts(payoutsData.data || []);
        } catch (error) {
            console.error('Failed to load earnings:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return html`<div class="spinner"></div>`;

    return html`
        <div>
            <h3 style=${{ marginBottom: '20px' }}>Earnings Dashboard</h3>

            <div class="dashboard-grid" style=${{ marginBottom: '30px' }}>
                <div class="stat-card">
                    <div class="stat-label">Total Earned</div>
                    <div class="stat-value">${formatPrice(earnings?.total_earned || 0)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Available</div>
                    <div class="stat-value">${formatPrice(earnings?.available_balance || 0)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Pending</div>
                    <div class="stat-value">${formatPrice(earnings?.pending || 0)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Sessions</div>
                    <div class="stat-value">${earnings?.total_sessions || 0}</div>
                </div>
            </div>

            <h4 style=${{ marginBottom: '16px' }}>Payout History</h4>
            ${payouts.length === 0 ? html`
                <div class="empty-state">
                    <div class="empty-state-icon">💸</div>
                    <div class="empty-state-text">No payouts yet</div>
                    <div class="empty-state-subtext">Payouts processed weekly on Mondays</div>
                </div>
            ` : html`
                <div style=${{ overflowX: 'auto' }}>
                    <table style=${{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style=${{ borderBottom: '2px solid var(--border-color)' }}>
                                <th style=${{ padding: '12px', textAlign: 'left' }}>Period</th>
                                <th style=${{ padding: '12px', textAlign: 'left' }}>Amount</th>
                                <th style=${{ padding: '12px', textAlign: 'left' }}>Status</th>
                                <th style=${{ padding: '12px', textAlign: 'left' }}>Arrival</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${payouts.map(p => html`
                                <tr key=${p.id} style=${{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style=${{ padding: '12px' }}>
                                        ${new Date(p.period_start).toLocaleDateString()} -
                                        ${new Date(p.period_end).toLocaleDateString()}
                                    </td>
                                    <td style=${{ padding: '12px', fontWeight: '600' }}>${formatPrice(p.amount)}</td>
                                    <td style=${{ padding: '12px' }}>
                                        <span class=${'booking-status ' + p.status}>${p.status}</span>
                                    </td>
                                    <td style=${{ padding: '12px' }}>
                                        ${p.arrival_date ? new Date(p.arrival_date).toLocaleDateString() : 'Pending'}
                                    </td>
                                </tr>
                            `)}
                        </tbody>
                    </table>
                </div>
            `}

            <div style=${{ marginTop: '30px', padding: '16px', background: '#F0F9FA', borderRadius: '8px' }}>
                <h4>💡 Payout Info</h4>
                <ul style=${{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
                    <li>Payouts every Monday</li>
                    <li>Commission: 15% (Founding Coaches: 10%)</li>
                    <li>SEPA: 1-2 business days</li>
                </ul>
            </div>
        </div>
    `;
};

// =====================================================
// EMAIL VERIFICATION BANNER
// =====================================================

const EmailVerificationBanner = ({ session }) => {
    const [dismissed, setDismissed] = useState(false);
    const [resending, setResending] = useState(false);
    const [resent, setResent] = useState(false);

    // Don't show if no session, email is verified, or user dismissed it
    if (!session || session.user?.email_confirmed_at || dismissed) {
        return null;
    }

    // Mask email for privacy (e.g., m*****@c****.com)
    const maskEmail = (email) => {
        if (!email) return '';
        const [localPart, domain] = email.split('@');
        if (!localPart || !domain) return email;

        const maskedLocal = localPart.charAt(0) + '*****';
        const [domainName, tld] = domain.split('.');
        const maskedDomain = domainName.charAt(0) + '****' + (tld ? '.' + tld : '');

        return `${maskedLocal}@${maskedDomain}`;
    };

    const handleResendVerification = async () => {
        if (!window.supabaseClient) return;

        setResending(true);
        try {
            const { error } = await window.supabaseClient.auth.resend({
                type: 'signup',
                email: session.user.email
            });

            if (error) {
                console.error('Failed to resend verification email:', error);
                alert('Failed to resend verification email. Please try again later.');
            } else {
                setResent(true);
                setTimeout(() => setResent(false), 5000);
            }
        } catch (error) {
            console.error('Error resending verification email:', error);
        } finally {
            setResending(false);
        }
    };

    return html`
        <div style=${{
            background: 'linear-gradient(90deg, #FEF3C7 0%, #FDE68A 100%)',
            borderBottom: '1px solid #F59E0B',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            fontSize: '14px',
            color: '#92400E'
        }}>
            <span style=${{ fontSize: '18px' }}>⚠️</span>
            <span>
                Please verify your email address: <strong>${maskEmail(session.user.email)}</strong>
            </span>
            <button
                onClick=${handleResendVerification}
                disabled=${resending || resent}
                style=${{
                    background: resent ? '#10B981' : '#F59E0B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '13px',
                    cursor: resending || resent ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    opacity: resending ? 0.7 : 1
                }}
            >
                ${resent ? '✓ Sent!' : resending ? 'Sending...' : 'Resend Email'}
            </button>
            <button
                onClick=${() => setDismissed(true)}
                style=${{
                    background: 'transparent',
                    border: 'none',
                    color: '#92400E',
                    fontSize: '20px',
                    cursor: 'pointer',
                    padding: '0 8px',
                    lineHeight: 1
                }}
                title="Dismiss"
            >
                ×
            </button>
        </div>
    `;
};

// =====================================================
// ERROR BOUNDARY
// =====================================================

// Error Boundary Component (must be a class component)
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('React Error Boundary caught an error:', error, errorInfo);
        this.setState({ error, errorInfo });

        // Log to debug console if available
        if (window.debugConsole) {
            window.debugConsole.addLog('error', [
                'React Error:',
                error.toString(),
                errorInfo.componentStack
            ]);
        }
    }

    handleReset() {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.navigateTo('/home');
        window.location.reload();
    }

    render() {
        if (this.state.hasError) {
            return React.createElement('div', {
                style: {
                    padding: '40px',
                    textAlign: 'center',
                    maxWidth: '600px',
                    margin: '100px auto',
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }
            },
                React.createElement('div', {
                    style: { fontSize: '64px', marginBottom: '20px' }
                }, '⚠️'),
                React.createElement('h2', {
                    style: { color: '#dc2626', marginBottom: '16px' }
                }, 'Oops! Something went wrong'),
                React.createElement('p', {
                    style: { color: '#6b7280', marginBottom: '24px' }
                }, 'We encountered an unexpected error. Our team has been notified.'),
                this.state.error && React.createElement('details', {
                    style: {
                        textAlign: 'left',
                        background: '#f3f4f6',
                        padding: '16px',
                        borderRadius: '8px',
                        marginBottom: '24px',
                        fontSize: '14px',
                        fontFamily: 'monospace'
                    }
                },
                    React.createElement('summary', {
                        style: { cursor: 'pointer', marginBottom: '8px', fontWeight: 'bold' }
                    }, 'Error Details'),
                    React.createElement('pre', {
                        style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word' }
                    }, this.state.error.toString()),
                    this.state.errorInfo && React.createElement('pre', {
                        style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: '8px' }
                    }, this.state.errorInfo.componentStack)
                ),
                React.createElement('button', {
                    onClick: () => this.handleReset(),
                    style: {
                        background: '#006266',
                        color: 'white',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer'
                    }
                }, '🔄 Reload Application')
            );
        }

        return this.props.children;
    }
}

// =====================================================
// MATCHING QUIZ COMPONENT
// =====================================================

const getQuizQuestions = () => [
    {
        id: 'goal',
        question: t('quiz.q.goal'),
        type: 'single',
        options: [
            { value: 'career', label: `🚀 ${t('quiz.q.goal.career')}`, desc: t('quiz.q.goal.careerDesc') },
            { value: 'leadership', label: `👔 ${t('quiz.q.goal.leadership')}`, desc: t('quiz.q.goal.leadershipDesc') },
            { value: 'life', label: `🌟 ${t('quiz.q.goal.life')}`, desc: t('quiz.q.goal.lifeDesc') },
            { value: 'business', label: `💼 ${t('quiz.q.goal.business')}`, desc: t('quiz.q.goal.businessDesc') }
        ]
    },
    {
        id: 'style',
        question: t('quiz.q.style'),
        type: 'single',
        options: [
            { value: 'supportive', label: `🤗 ${t('quiz.q.style.supportive')}`, desc: t('quiz.q.style.supportiveDesc') },
            { value: 'direct', label: `🎯 ${t('quiz.q.style.direct')}`, desc: t('quiz.q.style.directDesc') },
            { value: 'analytical', label: `📊 ${t('quiz.q.style.analytical')}`, desc: t('quiz.q.style.analyticalDesc') },
            { value: 'creative', label: `🎨 ${t('quiz.q.style.creative')}`, desc: t('quiz.q.style.creativeDesc') }
        ]
    },
    {
        id: 'session_type',
        question: t('quiz.q.session'),
        type: 'single',
        options: [
            { value: 'online', label: `💻 ${t('quiz.q.session.online')}`, desc: t('quiz.q.session.onlineDesc') },
            { value: 'in_person', label: `🤝 ${t('quiz.q.session.inPerson')}`, desc: t('quiz.q.session.inPersonDesc') },
            { value: 'hybrid', label: `🔄 ${t('quiz.q.session.hybrid')}`, desc: t('quiz.q.session.hybridDesc') }
        ]
    },
    {
        id: 'budget',
        question: t('quiz.q.budget'),
        type: 'single',
        options: [
            { value: 'budget', label: `💰 ${t('quiz.q.budget.low')}`, desc: t('quiz.q.budget.lowDesc') },
            { value: 'mid', label: `💎 ${t('quiz.q.budget.mid')}`, desc: t('quiz.q.budget.midDesc') },
            { value: 'premium', label: `👑 ${t('quiz.q.budget.premium')}`, desc: t('quiz.q.budget.premiumDesc') }
        ]
    }
];

const MatchingQuiz = ({ session }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState({});
    const [showResults, setShowResults] = useState(false);
    const [matchedCoaches, setMatchedCoaches] = useState([]);
    const [loading, setLoading] = useState(false);

    // Get questions with current language translations
    const quizQuestions = getQuizQuestions();
    const currentQuestion = quizQuestions[currentStep];
    const progress = ((currentStep) / quizQuestions.length) * 100;

    const handleAnswer = (value) => {
        setAnswers({ ...answers, [currentQuestion.id]: value });

        // Auto-advance after short delay
        setTimeout(() => {
            if (currentStep < quizQuestions.length - 1) {
                setCurrentStep(currentStep + 1);
            } else {
                findMatches();
            }
        }, 300);
    };

    const findMatches = async () => {
        setLoading(true);

        // Simulate matching algorithm (in production, this would call an API)
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Load coaches and filter based on answers
        if (window.supabaseClient) {
            try {
                const { data: coaches } = await window.supabaseClient
                    .from('cs_coaches')
                    .select('*')
                    .limit(10);

                if (coaches) {
                    // Simple matching - in production this would be more sophisticated
                    const scored = coaches.map(coach => {
                        let score = Math.random() * 30 + 70; // Base score 70-100

                        // Boost for matching criteria
                        if (answers.session_type === 'online' && coach.offers_online) score += 5;
                        if (answers.session_type === 'in_person' && coach.offers_in_person) score += 5;

                        if (answers.budget === 'budget' && coach.hourly_rate < 75) score += 10;
                        if (answers.budget === 'mid' && coach.hourly_rate >= 75 && coach.hourly_rate < 150) score += 10;
                        if (answers.budget === 'premium' && coach.hourly_rate >= 150) score += 10;

                        return { ...coach, matchScore: Math.min(99, Math.round(score)) };
                    });

                    scored.sort((a, b) => b.matchScore - a.matchScore);
                    setMatchedCoaches(scored.slice(0, 5));
                }
            } catch (error) {
                console.error('Error finding matches:', error);
                setMatchedCoaches(mockCoaches.map(c => ({ ...c, matchScore: Math.round(Math.random() * 20 + 80) })));
            }
        } else {
            setMatchedCoaches(mockCoaches.map(c => ({ ...c, matchScore: Math.round(Math.random() * 20 + 80) })));
        }

        setLoading(false);
        setShowResults(true);
    };

    const goBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const startOver = () => {
        setCurrentStep(0);
        setAnswers({});
        setShowResults(false);
        setMatchedCoaches([]);
    };

    if (loading) {
        return html`
            <div class="quiz-loading">
                <div class="loading-animation">
                    <div class="spinner-large"></div>
                </div>
                <h2>${t('quiz.processing.title')}</h2>
                <p>${t('quiz.processing.step1')}</p>
            </div>
        `;
    }

    if (showResults) {
        return html`
            <div class="quiz-results">
                <div class="container">
                    <div class="results-header">
                        <h1>🎯 ${t('quiz.results.title')}</h1>
                        <p>${t('quiz.results.subtitle')}</p>
                    </div>

                    <div class="matched-coaches">
                        ${matchedCoaches.map((coach, index) => html`
                            <div key=${coach.id} class="matched-coach-card">
                                <div class="match-rank">#${index + 1}</div>
                                <div class="match-score">
                                    <span class="score-value">${coach.matchScore}%</span>
                                    <span class="score-label">${t('quiz.match')}</span>
                                </div>
                                <img src=${coach.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(coach.full_name)}`} alt=${coach.full_name} class="coach-avatar" />
                                <div class="coach-info">
                                    <h3>${coach.full_name}</h3>
                                    <p class="coach-title">${coach.title}</p>
                                    <div class="coach-meta">
                                        <span>📍 ${coach.location || 'Remote'}</span>
                                        <span>💰 ${formatPrice(coach.hourly_rate)}/hr</span>
                                    </div>
                                </div>
                                <button class="btn-primary" onClick=${() => window.navigateTo('/coaches')}>
                                    ${t('quiz.viewProfile')}
                                </button>
                            </div>
                        `)}
                    </div>

                    <div class="results-actions">
                        <button class="btn-secondary" onClick=${startOver}>
                            ← ${t('quiz.results.retake')}
                        </button>
                        <button class="btn-primary" onClick=${() => window.navigateTo('/coaches')}>
                            ${t('quiz.results.browseAll')} →
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    return html`
        <div class="quiz-page">
            <div class="quiz-container">
                <!-- Progress Bar -->
                <div class="quiz-progress-bar">
                    <div class="progress-track">
                        <div class="progress-fill" style=${{ width: `${progress}%` }}></div>
                    </div>
                    <span class="progress-text">${currentStep + 1} / ${quizQuestions.length}</span>
                </div>

                <!-- Question -->
                <div class="quiz-question-container">
                    <h2 class="quiz-question">${currentQuestion.question}</h2>

                    <div class="quiz-options">
                        ${currentQuestion.options.map(option => html`
                            <button
                                key=${option.value}
                                class="quiz-option ${answers[currentQuestion.id] === option.value ? 'selected' : ''}"
                                onClick=${() => handleAnswer(option.value)}
                            >
                                <span class="option-label">${option.label}</span>
                                <span class="option-desc">${option.desc}</span>
                            </button>
                        `)}
                    </div>
                </div>

                <!-- Navigation -->
                <div class="quiz-nav">
                    ${currentStep > 0 && html`
                        <button class="btn-secondary" onClick=${goBack}>
                            ← ${t('quiz.back')}
                        </button>
                    `}
                    <button class="btn-ghost" onClick=${() => window.navigateTo('/home')}>
                        ${t('quiz.intro.skip')}
                    </button>
                </div>
            </div>
        </div>
    `;
};

// =====================================================
// AI MATCH PAGE
// =====================================================

const AIMatchPage = ({ session }) => {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [recommendations, setRecommendations] = useState([]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        setLoading(true);

        // Simulate AI processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // In production, this would call an AI API
        if (window.supabaseClient) {
            const { data: coaches } = await window.supabaseClient
                .from('cs_coaches')
                .select('*')
                .limit(5);

            if (coaches) {
                setRecommendations(coaches.map(c => ({
                    ...c,
                    matchScore: Math.round(Math.random() * 20 + 75),
                    aiReason: 'Based on your goals and preferences, this coach specializes in areas that align with your needs.'
                })));
            }
        } else {
            setRecommendations(mockCoaches.map(c => ({
                ...c,
                matchScore: Math.round(Math.random() * 20 + 75),
                aiReason: 'Based on your goals and preferences, this coach specializes in areas that align with your needs.'
            })));
        }

        setLoading(false);
    };

    return html`
        <div class="ai-match-page">
            <div class="container">
                <div class="ai-header">
                    <h1>✨ ${t('aiMatch.title')}</h1>
                    <p>${t('aiMatch.subtitle')}</p>
                </div>

                <form class="ai-form" onSubmit=${handleSubmit}>
                    <textarea
                        class="ai-input"
                        placeholder=${t('aiMatch.placeholder')}
                        value=${input}
                        onInput=${(e) => setInput(e.target.value)}
                        rows="5"
                    ></textarea>
                    <button type="submit" class="btn-primary btn-large" disabled=${loading || !input.trim()}>
                        ${loading ? t('aiMatch.finding') : `✨ ${t('aiMatch.findBtn')}`}
                    </button>
                </form>

                ${loading && html`
                    <div class="ai-loading">
                        <div class="spinner-large"></div>
                        <p>${t('aiMatch.analyzing')}</p>
                    </div>
                `}

                ${recommendations.length > 0 && html`
                    <div class="ai-results">
                        <h2>${t('aiMatch.resultsTitle')}</h2>
                        <div class="recommendation-list">
                            ${recommendations.map(coach => html`
                                <div key=${coach.id} class="recommendation-card">
                                    <div class="match-badge">${coach.matchScore}% ${t('aiMatch.match')}</div>
                                    <img src=${coach.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(coach.full_name)}`} alt=${coach.full_name} />
                                    <div class="rec-info">
                                        <h3>${coach.full_name}</h3>
                                        <p class="rec-title">${coach.title}</p>
                                        <p class="rec-reason">${coach.aiReason}</p>
                                        <div class="rec-meta">
                                            <span>${formatPrice(coach.hourly_rate)}/hr</span>
                                            <button class="btn-primary btn-sm" onClick=${() => window.navigateTo('/coaches')}>
                                                ${t('aiMatch.viewProfile')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `)}
                        </div>
                    </div>
                `}

                <div class="ai-alternative">
                    <p>${t('aiMatch.alternative')}</p>
                    <a href="/quiz" class="btn-secondary">${t('aiMatch.alternativeBtn')} →</a>
                </div>
            </div>
        </div>
    `;
};

// Helper function to get current route from pathname
const getCurrentRoute = () => {
    const pathname = window.location.pathname;
    // Handle root path
    if (pathname === '/' || pathname === '') return '/home';
    return pathname;
};

// Helper function to handle GitHub Pages redirect (from 404.html)
const handleGitHubPagesRedirect = () => {
    const redirectPath = sessionStorage.getItem('gh-pages-redirect');
    if (redirectPath) {
        sessionStorage.removeItem('gh-pages-redirect');
        console.log('GitHub Pages redirect detected:', redirectPath);
        // Use replaceState so back button works correctly
        window.history.replaceState(null, '', redirectPath);
        return redirectPath;
    }
    return null;
};

// Helper function to convert old hash routes to new clean routes
const migrateHashRoute = () => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#')) {
        // Convert #coach/id to /coach/id, #coaches to /coaches, etc.
        const cleanPath = hash.replace('#', '/');
        console.log('Migrating hash route:', hash, '→', cleanPath);
        window.history.replaceState(null, '', cleanPath);
        return cleanPath;
    }
    return null;
};

// Global navigate function for programmatic navigation
window.navigateTo = (path) => {
    // Ensure path starts with /
    if (!path.startsWith('/')) {
        path = '/' + path;
    }
    console.log('Navigating to:', path);
    window.history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
};

// Global click handler for all internal links (SPA navigation)
document.addEventListener('click', (e) => {
    // Find the closest anchor element
    const anchor = e.target.closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href) return;

    // Skip external links, hash-only links, and links with target="_blank"
    if (href.startsWith('http') || href.startsWith('//') || href === '#' || anchor.target === '_blank') {
        return;
    }

    // Skip mailto and tel links
    if (href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
    }

    // Handle internal links starting with /
    if (href.startsWith('/')) {
        e.preventDefault();
        window.navigateTo(href);
    }
});

const App = () => {
    // Check for GitHub Pages redirect first, then hash migration, then current route
    const initialRoute = handleGitHubPagesRedirect() || migrateHashRoute() || getCurrentRoute();
    const [route, setRoute] = useState(initialRoute);
    const [session, setSession] = useState(null);
    const [legalModal, setLegalModal] = useState({ isOpen: false, type: null });
    const [configLoaded, setConfigLoaded] = useState(false);
    const [languageVersion, setLanguageVersion] = useState(0);

    useEffect(() => {
        console.log('App useEffect: Fetching config...');

        fetch('https://clouedo.com/coachsearching/api/env.php')
            .then(res => {
                console.log('Config response status:', res.status);
                return res.json();
            })
            .then(config => {
                console.log('Config loaded:', config);

                if (config.SUPABASE_URL && config.SUPABASE_ANON_KEY) {
                    console.log('Initializing Supabase client...');
                    window.supabaseClient = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
                    console.log('Supabase client initialized:', window.supabaseClient);

                    window.supabaseClient.auth.getSession().then(({ data: { session } }) => {
                        console.log('Initial session:', session);
                        setSession(session);
                    });

                    const { data: { subscription } } = window.supabaseClient.auth.onAuthStateChange((_event, session) => {
                        console.log('Auth state changed:', _event, session);
                        setSession(session);
                    });

                    setConfigLoaded(true);
                } else {
                    console.error('Missing Supabase config in response:', config);
                }
            })
            .catch(err => {
                console.error('Failed to load config:', err);
            });

        // Handle browser back/forward buttons
        const handlePopState = () => {
            const newRoute = getCurrentRoute();
            console.log('Route changed to:', newRoute);
            setRoute(newRoute);
        };

        // Handle hash changes for backward compatibility
        const handleHashChange = () => {
            const migratedRoute = migrateHashRoute();
            if (migratedRoute) {
                setRoute(migratedRoute);
            }
        };

        const handleLangChange = () => {
            console.log('LANG: Language changed event received in App');
            setLanguageVersion(v => v + 1);
        };

        window.addEventListener('popstate', handlePopState);
        window.addEventListener('hashchange', handleHashChange);
        window.addEventListener('langChange', handleLangChange);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('hashchange', handleHashChange);
            window.removeEventListener('langChange', handleLangChange);
        };
    }, []);

    // Show/hide debug console based on login state
    useEffect(() => {
        if (window.debugConsole) {
            window.debugConsole.setUIEnabled(!!session);
        }
    }, [session]);

    const openLegal = (type) => {
        console.log('Opening legal modal:', type);
        setLegalModal({ isOpen: true, type });
    };

    const closeLegal = () => {
        console.log('Closing legal modal');
        setLegalModal({ isOpen: false, type: null });
    };

    if (!configLoaded) {
        return html`
            <div style=${{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                width: '100%',
                background: '#fff'
            }}>
                <style>
                    @keyframes pulse-loader {
                        0%, 100% { transform: scale(1); opacity: 1; }
                        50% { transform: scale(1.15); opacity: 0.7; }
                    }
                </style>
                <img
                    src="/favicon.ico"
                    alt="Loading..."
                    style=${{
                        width: '64px',
                        height: '64px',
                        animation: 'pulse-loader 1.2s ease-in-out infinite'
                    }}
                />
            </div>
        `;
    }

    let Component;

    // Parse route for dynamic routing (clean URLs without #)
    const routePath = route.split('?')[0]; // Remove query params
    // Remove leading slash and split
    const cleanPath = routePath.replace(/^\//, '');
    const routeParts = cleanPath.split('/');
    const baseRoute = routeParts[0] || 'home';
    const routeParam = routeParts[1] || null;

    // Handle dynamic routes first
    if (baseRoute === 'coaching' && routeParam) {
        // Category pages like /coaching/executive-coaching
        Component = () => html`<${CategoryPage} categorySlug=${routeParam} />`;
    } else if (baseRoute === 'coach' && routeParam) {
        // Coach profile pages - supports both UUID and slug
        // Example: /coach/john-smith-life-coach or /coach/277530d3-627d-4057-b115-985719a1f59c
        Component = () => html`<${CoachProfilePage} coachIdOrSlug=${routeParam} session=${session} />`;
    } else {
        // Static routes
        switch (baseRoute) {
            case 'home':
            case '':
                Component = () => html`<${Home} session=${session} />`; break;
            case 'coaches': Component = () => html`<${CoachListWithModal} session=${session} />`; break;
            case 'login': Component = Auth; break;
            case 'onboarding': Component = () => html`<${CoachOnboarding} session=${session} />`; break;
            case 'dashboard': Component = () => html`<${Dashboard} session=${session} />`; break;
            case 'quiz': Component = () => html`<${MatchingQuiz} session=${session} />`; break;
            case 'ai-match': Component = () => html`<${AIMatchPage} session=${session} />`; break;
            case 'signout': Component = SignOut; break;
            // Content pages
            case 'faq': Component = () => html`<${FAQPage} />`; break;
            case 'categories': Component = () => html`<${CategoriesIndexPage} />`; break;
            case 'pricing': Component = () => html`<${PricingPage} />`; break;
            default: Component = () => html`<${Home} session=${session} />`;
        }
    }

    return html`
        <div style=${{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <${Navbar} session=${session} />
            <${EmailVerificationBanner} session=${session} />
            <div style=${{ flex: 1 }}>
                <${Component} />
            </div>
            <${Footer} onOpenLegal=${openLegal} />
            <${LegalModal} isOpen=${legalModal.isOpen} onClose=${closeLegal} type=${legalModal.type} />
        </div>
    `;
};

console.log('App.js: Rendering app...');
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    React.createElement(ErrorBoundary, null, html`<${App} />`)
);
console.log('App.js: App rendered successfully');
