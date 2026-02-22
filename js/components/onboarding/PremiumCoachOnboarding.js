/**
 * Premium Coach Onboarding
 * A stunning, premium first-impression experience for new coaches
 *
 * Features:
 * - Animated welcome screen with social proof
 * - Multi-step wizard with progress tracking
 * - Auto-save to localStorage
 * - Real-time profile preview
 * - Smooth animations and transitions
 */

import htm from '../../vendor/htm.js';
import { t, getCurrentLang } from '../../i18n.js';
import { queryClient } from '../../config/queryClient.js';
import { useLookupOptions, useCities, useCertifications } from '../../context/AppContext.js';
import { useCitiesQuery, useCertificationsQuery } from '../../hooks/useSupabaseQuery.js';

const React = window.React;
const { useState, useEffect, useRef, useCallback, useMemo } = React;
const html = htm.bind(React.createElement);

// ============================================================================
// CONSTANTS
// ============================================================================

const STEPS = [
    { id: 'profile', label: 'Profile', icon: '1' },
    { id: 'expertise', label: 'Expertise', icon: '2' },
    { id: 'services', label: 'Services', icon: '3' },
    { id: 'launch', label: 'Launch', icon: '4' }
];

// Flag CDN for SVG flag images
const FLAG_CDN = 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3';

// Language code to flag country code mapping
const LANGUAGE_TO_FLAG = {
    'en': 'gb', 'de': 'de', 'es': 'es', 'fr': 'fr', 'it': 'it',
    'nl': 'nl', 'pt': 'pt', 'ru': 'ru', 'zh': 'cn', 'ja': 'jp',
    'ko': 'kr', 'ar': 'sa', 'hi': 'in', 'pl': 'pl', 'sv': 'se',
    'no': 'no', 'da': 'dk', 'fi': 'fi', 'el': 'gr', 'tr': 'tr',
    'cs': 'cz', 'ro': 'ro', 'hu': 'hu', 'uk': 'ua'
};

// Session durations (kept hardcoded as they rarely change)
const SESSION_DURATIONS = [
    { value: 30, label: '30 min' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' }
];

// Countries list for dropdown
const COUNTRIES = [
    { code: 'AT', name: 'Austria' },
    { code: 'AU', name: 'Australia' },
    { code: 'BE', name: 'Belgium' },
    { code: 'BR', name: 'Brazil' },
    { code: 'CA', name: 'Canada' },
    { code: 'CH', name: 'Switzerland' },
    { code: 'DE', name: 'Germany' },
    { code: 'DK', name: 'Denmark' },
    { code: 'ES', name: 'Spain' },
    { code: 'FI', name: 'Finland' },
    { code: 'FR', name: 'France' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'IE', name: 'Ireland' },
    { code: 'IN', name: 'India' },
    { code: 'IT', name: 'Italy' },
    { code: 'JP', name: 'Japan' },
    { code: 'LU', name: 'Luxembourg' },
    { code: 'MX', name: 'Mexico' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'NO', name: 'Norway' },
    { code: 'NZ', name: 'New Zealand' },
    { code: 'PL', name: 'Poland' },
    { code: 'PT', name: 'Portugal' },
    { code: 'SE', name: 'Sweden' },
    { code: 'SG', name: 'Singapore' },
    { code: 'US', name: 'United States' },
    { code: 'ZA', name: 'South Africa' },
    { code: 'OTHER', name: 'Other' }
];

// Default data structure
const DEFAULT_DATA = {
    full_name: '',
    professional_title: '',
    bio: '',
    intro_video_url: '',
    avatar_url: '',
    city_id: null,           // Reference to cs_cities.id
    location_country: '',    // Used for filtering cities dropdown
    years_experience: '',
    specialties: [],
    languages: ['en'],
    session_formats: ['video'],
    session_durations: [60],
    hourly_rate: '',
    services: [], // Array of { name, name_en, description, description_en, unit, price, currency, active }
    offers_free_discovery: true,
    plan_type: 'free',
    referral_code: '',
    referral_code_valid: false,
    referrer_id: null,
    referral_benefit_type: null,
    referral_code_id: null,
    certifications: [] // Array of { id, name, date_acquired, certificate_url, certificate_file }
};

// Helper to load saved progress from localStorage
const loadSavedProgress = (userId) => {
    if (!userId) return null;
    try {
        const saved = localStorage.getItem(`premium_onboarding_${userId}`);
        if (!saved) return null;

        const parsed = JSON.parse(saved);
        if (!parsed.data) return null;

        const sanitizedData = { ...DEFAULT_DATA };
        const stringFields = ['full_name', 'professional_title', 'bio', 'intro_video_url', 'avatar_url', 'location_country', 'years_experience', 'hourly_rate', 'referral_code', 'plan_type'];
        const numberFields = ['city_id']; // city_id is a reference to cs_cities.id
        const arrayFields = ['specialties', 'languages', 'session_formats', 'session_durations', 'services', 'certifications'];

        stringFields.forEach(field => {
            if (parsed.data[field] !== undefined) {
                sanitizedData[field] = typeof parsed.data[field] === 'string' ? parsed.data[field] : String(parsed.data[field] || '');
            }
        });
        numberFields.forEach(field => {
            if (parsed.data[field] !== undefined && parsed.data[field] !== null) {
                sanitizedData[field] = typeof parsed.data[field] === 'number' ? parsed.data[field] : parseInt(parsed.data[field], 10) || null;
            }
        });
        arrayFields.forEach(field => {
            if (Array.isArray(parsed.data[field])) {
                sanitizedData[field] = parsed.data[field];
            }
        });
        if (typeof parsed.data.referral_code_valid === 'boolean') {
            sanitizedData.referral_code_valid = parsed.data.referral_code_valid;
        }
        if (typeof parsed.data.offers_free_discovery === 'boolean') {
            sanitizedData.offers_free_discovery = parsed.data.offers_free_discovery;
        }

        return {
            data: sanitizedData,
            step: parsed.step || 0,
            showWelcome: parsed.showWelcome !== undefined ? parsed.showWelcome : (parsed.step <= 0)
        };
    } catch {
        return null;
    }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PremiumCoachOnboarding = ({ session, onComplete }) => {
    // Load saved state immediately on initialization
    const savedProgress = loadSavedProgress(session?.user?.id);

    const [showWelcome, setShowWelcome] = useState(savedProgress ? savedProgress.showWelcome : true);
    const [currentStep, setCurrentStep] = useState(savedProgress ? savedProgress.step : 0);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(savedProgress ? savedProgress.data : DEFAULT_DATA);
    const [toastMessage, setToastMessage] = useState('');
    const [toastVisible, setToastVisible] = useState(false);
    const [validationAttempted, setValidationAttempted] = useState(false);
    const toastTimerRef = useRef(null);

    // Get lookup options from global context (cached)
    const { lookupOptions, getLocalizedName, getLocalizedDescription } = useLookupOptions();

    // Get cities from global context (cached)
    const { cities: contextCities, getLocalizedCityName } = useCities();

    // Get certifications from global context (cached)
    const { certifications: contextCertifications, getCertificationById: contextGetCertById, getCertificationByCode } = useCertifications();

    // Direct TanStack Query hooks as primary data source
    // These fire reliably because this component only renders after supabase is initialized
    const { data: citiesQueryData } = useCitiesQuery();
    const { data: certsQueryData } = useCertificationsQuery();

    // Fallback: fetch directly from Supabase if TanStack Query hooks haven't loaded data
    const [fallbackCities, setFallbackCities] = useState(null);
    const [fallbackCertifications, setFallbackCertifications] = useState(null);

    useEffect(() => {
        const supabase = window.supabaseClient;
        if (!supabase) return;

        // Fetch cities if not available from any source
        if (!citiesQueryData?.list?.length && !contextCities?.list?.length && !fallbackCities) {
            supabase
                .from('cs_cities')
                .select('*')
                .eq('is_active', true)
                .order('sort_order', { ascending: true })
                .then(({ data: rows, error }) => {
                    if (!error && rows) {
                        setFallbackCities({ list: rows, isLoaded: true });
                    }
                });
        }

        // Fetch certifications if not available from any source
        if (!certsQueryData?.list?.length && !contextCertifications?.list?.length && !fallbackCertifications) {
            supabase
                .from('cs_certifications')
                .select('*')
                .eq('is_active', true)
                .order('sort_order', { ascending: true })
                .then(({ data: rows, error }) => {
                    if (!error && rows) {
                        setFallbackCertifications({ list: rows, isLoaded: true });
                    }
                });
        }
    }, [citiesQueryData, contextCities, certsQueryData, contextCertifications, fallbackCities, fallbackCertifications]);

    // Merge data sources: prefer TanStack Query > context > fallback
    const cities = useMemo(() => {
        if (citiesQueryData?.list?.length) return citiesQueryData;
        if (contextCities?.list?.length) return contextCities;
        if (fallbackCities?.list?.length) return fallbackCities;
        return { list: [], isLoaded: false };
    }, [citiesQueryData, contextCities, fallbackCities]);

    const certifications = useMemo(() => {
        if (certsQueryData?.list?.length) return certsQueryData;
        if (contextCertifications?.list?.length) return contextCertifications;
        if (fallbackCertifications?.list?.length) return fallbackCertifications;
        return { list: [], isLoaded: false };
    }, [certsQueryData, contextCertifications, fallbackCertifications]);

    // Helper to find certification by ID (uses merged data)
    const getCertificationById = useCallback((id) => {
        return certifications.list.find(c => c.id === id);
    }, [certifications.list]);

    // Get unique countries from cities list
    const countriesFromCities = useMemo(() => {
        const countryMap = new Map();
        (cities.list || []).forEach(city => {
            if (!countryMap.has(city.country_code)) {
                countryMap.set(city.country_code, city.country_en);
            }
        });
        return Array.from(countryMap.entries())
            .map(([code, name]) => ({ code, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [cities.list]);

    // Filter cities by selected country
    const filteredCities = useMemo(() => {
        if (!cities.list || cities.list.length === 0) return [];

        // If no country selected, show all cities
        if (!data.location_country) {
            return cities.list;
        }

        // Filter cities by the selected country name
        return cities.list.filter(city => city.country_en === data.location_country);
    }, [cities.list, data.location_country]);

    // Referral code validation
    const referralDebounceRef = useRef(null);

    const validateReferralCode = useCallback(async (code) => {
        if (!code || code.trim().length < 3) {
            setData(prev => ({
                ...prev,
                referral_code_valid: false,
                referrer_id: null,
                referral_benefit_type: null,
                referral_code_id: null
            }));
            return;
        }

        try {
            const supabase = window.supabaseClient;
            const { data: codeData, error } = await supabase
                .from('cs_referral_codes')
                .select('id, code, user_id, benefit_type')
                .eq('code', code.trim().toUpperCase())
                .eq('is_active', true)
                .single();

            if (error || !codeData) {
                setData(prev => ({
                    ...prev,
                    referral_code_valid: false,
                    referrer_id: null,
                    referral_benefit_type: null,
                    referral_code_id: null
                }));
            } else {
                setData(prev => ({
                    ...prev,
                    referral_code_valid: true,
                    referrer_id: codeData.user_id,
                    referral_benefit_type: codeData.benefit_type || null,
                    referral_code_id: codeData.id,
                    plan_type: 'premium' // Auto-select premium when valid code entered
                }));
            }
        } catch {
            setData(prev => ({
                ...prev,
                referral_code_valid: false,
                referrer_id: null,
                referral_benefit_type: null,
                referral_code_id: null
            }));
        }
    }, []);

    const handleReferralCodeChange = useCallback((code) => {
        setData(prev => ({ ...prev, referral_code: code }));

        if (referralDebounceRef.current) {
            clearTimeout(referralDebounceRef.current);
        }

        referralDebounceRef.current = setTimeout(() => {
            validateReferralCode(code);
        }, 500);
    }, [validateReferralCode]);

    // Pre-fill name from session if not already set
    useEffect(() => {
        const fullName = session?.user?.user_metadata?.full_name;
        if (fullName && typeof fullName === 'string' && !data.full_name) {
            setData(prev => prev.full_name ? prev : { ...prev, full_name: fullName });
        }
    }, [session?.user?.user_metadata?.full_name]);

    // Auto-save progress
    const saveProgress = useCallback((stepIndex, formData, isWelcomeVisible = false) => {
        if (session?.user?.id) {
            localStorage.setItem(`premium_onboarding_${session.user.id}`, JSON.stringify({
                step: stepIndex,
                data: formData,
                showWelcome: isWelcomeVisible,
                timestamp: Date.now()
            }));
        }
    }, [session]);

    // Update data helper
    const updateData = useCallback((key, value) => {
        setData(prev => {
            const newData = { ...prev, [key]: value };
            saveProgress(currentStep, newData);
            return newData;
        });
    }, [currentStep, saveProgress]);

    // Toast notification helper
    const showToast = useCallback((message) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToastMessage(message);
        setToastVisible(true);
        toastTimerRef.current = setTimeout(() => {
            setToastVisible(false);
        }, 4000);
    }, []);

    // Get list of invalid fields for the current step (for red border highlighting)
    const getInvalidFields = useCallback((stepIndex) => {
        const invalid = [];
        switch (stepIndex) {
            case 0:
                if (!data.full_name?.trim()) invalid.push('full_name');
                if (!data.professional_title?.trim()) invalid.push('professional_title');
                if (!data.city_id) invalid.push('city_id');
                if (!data.location_country) invalid.push('location_country');
                break;
            case 1:
                if ((data.specialties?.length || 0) < 1) invalid.push('specialties');
                if ((data.languages?.length || 0) < 1) invalid.push('languages');
                break;
            case 2:
                if ((data.session_formats?.length || 0) < 1) invalid.push('session_formats');
                break;
            case 3:
                break;
        }
        return invalid;
    }, [data]);

    // Navigation
    const goToStep = (step) => {
        // Only validate when moving forward
        if (step > currentStep) {
            // Validate all steps from current to target
            for (let i = currentStep; i < step; i++) {
                if (!isStepValid(i)) {
                    setValidationAttempted(true);
                    showToast('Please fill in all required fields');
                    return;
                }
            }
        }
        setValidationAttempted(false);
        setCurrentStep(step);
        saveProgress(step, data, false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const nextStep = () => {
        if (currentStep < STEPS.length - 1) {
            if (!isStepValid(currentStep)) {
                setValidationAttempted(true);
                showToast('Please fill in all required fields');
                return;
            }
            setValidationAttempted(false);
            setCurrentStep(currentStep + 1);
            saveProgress(currentStep + 1, data, false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setValidationAttempted(false);
            setCurrentStep(currentStep - 1);
            saveProgress(currentStep - 1, data, false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Validation for each step
    const isStepValid = (stepIndex) => {
        switch (stepIndex) {
            case 0: // Profile step - require city_id (which includes country info from cs_cities)
                return !!(
                    data.full_name?.trim() &&
                    data.professional_title?.trim() &&
                    data.city_id
                );
            case 1: // Expertise step
                return (
                    (data.specialties?.length || 0) >= 1 &&
                    (data.languages?.length || 0) >= 1
                );
            case 2: // Services step
                return (data.session_formats?.length || 0) >= 1;
            case 3: // Launch step - always valid
                return true;
            default:
                return true;
        }
    };

    const canContinue = isStepValid(currentStep);

    const startOnboarding = () => {
        setShowWelcome(false);
        saveProgress(0, data, false);
    };

    // Complete onboarding
    const completeOnboarding = async () => {
        setLoading(true);
        try {
            const supabase = window.supabaseClient;
            const userId = session.user.id;

            // Prepare coach profile data
            // Generate slug from full name
            const fullName = data.full_name || session.user.email.split('@')[0];
            const baseSlug = fullName.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');
            const slug = `${baseSlug}-${userId.substring(0, 8)}`;

            const coachData = {
                user_id: userId,
                full_name: fullName,
                title: data.professional_title,
                bio: data.bio,
                intro_video_url: isValidVideoUrl(data.intro_video_url) ? data.intro_video_url : null,
                avatar_url: data.avatar_url,
                city_id: data.city_id,  // Reference to cs_cities.id
                years_experience: parseInt(data.years_experience) || 0,
                specialties: data.specialties,
                languages: data.languages,
                session_types: data.session_formats, // DB column is session_types
                hourly_rate: parseFloat(data.hourly_rate) || 0,
                currency: 'EUR',
                offers_free_discovery: data.offers_free_discovery !== false,
                is_active: true,
                onboarding_completed: true,
                slug: slug
            };

            // Ensure cs_users record exists (required for foreign key)
            const { data: existingUser } = await supabase
                .from('cs_users')
                .select('id')
                .eq('id', userId)
                .single();

            if (!existingUser) {
                // User doesn't exist, create it
                const { error: userError } = await supabase
                    .from('cs_users')
                    .insert({
                        id: userId,
                        email: session.user.email,
                        full_name: fullName,
                        user_type: 'coach',
                        avatar_url: data.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.email}`
                    });

                if (userError) {
                    throw userError;
                }
            }

            // Check if coach profile exists
            const { data: existingCoach } = await supabase
                .from('cs_coaches')
                .select('id, slug')
                .eq('user_id', userId)
                .single();

            let coachId = null;
            let coachSlug = slug; // Default to newly generated slug

            if (existingCoach) {
                // Update existing - don't update slug
                coachId = existingCoach.id;
                coachSlug = existingCoach.slug || slug;
                const { slug: _slug, ...updateData } = coachData;
                const { error } = await supabase
                    .from('cs_coaches')
                    .update(updateData)
                    .eq('user_id', userId);
                if (error) throw error;
            } else {
                // Insert new and get the returned id
                const { data: newCoach, error } = await supabase
                    .from('cs_coaches')
                    .insert(coachData)
                    .select('id, slug')
                    .single();
                if (error) throw error;
                coachId = newCoach?.id;
                coachSlug = newCoach?.slug || slug;
            }

            // Handle referral code if valid - insert into cs_referral_code_usage
            if (data.referral_code_valid && data.referral_code && data.referral_code_id) {
                try {
                    await supabase.from('cs_referral_code_usage').insert({
                        referral_code_id: data.referral_code_id,
                        used_by_user_id: userId,
                        benefit_applied: true,
                        benefit_applied_at: new Date().toISOString(),
                        notes: `Applied during onboarding. Benefit type: ${data.referral_benefit_type || 'free_year_premium'}`
                    });
                    // Also increment current_uses on the referral code
                    await supabase.rpc('increment_referral_uses', { code_id: data.referral_code_id }).catch(() => {
                        // Fallback: manual increment if RPC doesn't exist
                        supabase
                            .from('cs_referral_codes')
                            .update({ current_uses: (data.referral_current_uses || 0) + 1 })
                            .eq('id', data.referral_code_id)
                            .then(() => {})
                            .catch(() => {});
                    });
                } catch {
                    // Silently skip referral tracking errors
                }
            }

            // Save services if any
            if (data.services && data.services.length > 0 && coachId) {
                try {
                    const servicesToInsert = data.services.map(svc => ({
                        coach_id: coachId,
                        name: svc.name,
                        name_en: svc.name_en || null,
                        description: svc.description || null,
                        description_en: svc.description_en || null,
                        unit: svc.unit || 'hour',
                        price: parseFloat(svc.price) || 0,
                        currency: svc.currency || 'EUR',
                        active: svc.active !== false
                    }));

                    console.log('[Onboarding] Saving services:', servicesToInsert);

                    const { error: svcError } = await supabase
                        .from('cs_coach_services')
                        .insert(servicesToInsert);

                    if (svcError) {
                        console.error('[Onboarding] Failed to insert services:', svcError);
                    } else {
                        console.log('[Onboarding] Services saved successfully');
                    }
                } catch (svcErr) {
                    console.error('[Onboarding] Failed to save services:', svcErr);
                }
            }

            // Save certifications if any
            if (data.certifications && data.certifications.length > 0 && coachId) {
                try {
                    // Helper function to convert YYYY-MM format to YYYY-MM-01 for PostgreSQL date type
                    const formatDateForDB = (dateStr) => {
                        if (!dateStr) return null;
                        // If already in YYYY-MM-DD format, return as is
                        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
                        // If in YYYY-MM format (from month input), add -01
                        if (/^\d{4}-\d{2}$/.test(dateStr)) return `${dateStr}-01`;
                        return null;
                    };

                    // Insert each certification using certification_id foreign key
                    const certificationsToInsert = data.certifications.map(cert => ({
                        coach_id: coachId,
                        certification_id: cert.certification_id,
                        date_acquired: formatDateForDB(cert.date_acquired),
                        certificate_url: cert.certificate_url || null,
                        certificate_file_path: cert.certificate_file_path || null
                    }));

                    console.log('[Onboarding] Saving certifications:', certificationsToInsert);

                    const { error: certInsertError } = await supabase
                        .from('cs_coach_certifications')
                        .insert(certificationsToInsert);

                    if (certInsertError) {
                        console.error('[Onboarding] Failed to insert certifications:', certInsertError);
                    } else {
                        console.log('[Onboarding] Certifications saved successfully');
                    }
                } catch (certError) {
                    console.error('[Onboarding] Failed to save certifications:', certError);
                    // Don't block onboarding completion for certification errors
                }
            }

            // Invalidate coach-related caches
            await queryClient.invalidateQueries({ queryKey: ['coach'] });
            await queryClient.invalidateQueries({ queryKey: ['coaches'] });
            await queryClient.invalidateQueries({ queryKey: ['user'] });

            // Clear saved progress
            localStorage.removeItem(`premium_onboarding_${userId}`);

            // Callback
            if (onComplete) {
                onComplete({ completed: true, data: coachData });
            }

            // Navigate to the coach's new profile
            setTimeout(() => {
                window.navigateTo(`/coach/${coachSlug}`);
            }, 2000);

        } catch {
            alert('Failed to save your profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Skip onboarding
    const skipOnboarding = () => {
        if (confirm('Are you sure? You can complete your profile later from the dashboard.')) {
            localStorage.removeItem(`premium_onboarding_${session?.user?.id}`);
            window.navigateTo('/dashboard');
        }
    };

    // Render welcome screen
    if (showWelcome) {
        return html`<${WelcomeScreen} onStart=${startOnboarding} onSkip=${skipOnboarding} />`;
    }

    // Compute invalid fields for current step
    const invalidFields = validationAttempted ? getInvalidFields(currentStep) : [];

    // Render step content
    const renderStep = () => {
        switch (currentStep) {
            case 0:
                return html`<${StepProfile}
                    data=${data}
                    updateData=${updateData}
                    session=${session}
                    cities=${filteredCities}
                    countries=${countriesFromCities.length > 0 ? countriesFromCities : COUNTRIES}
                    getLocalizedCityName=${getLocalizedCityName}
                    certifications=${certifications}
                    getCertificationById=${getCertificationById}
                    invalidFields=${invalidFields}
                />`;
            case 1:
                return html`<${StepExpertise}
                    data=${data}
                    updateData=${updateData}
                    specialties=${lookupOptions.specialties}
                    languages=${lookupOptions.languages}
                    getLocalizedName=${getLocalizedName}
                    invalidFields=${invalidFields}
                />`;
            case 2:
                return html`<${StepServices}
                    data=${data}
                    updateData=${updateData}
                    sessionFormats=${lookupOptions.sessionFormats}
                    getLocalizedName=${getLocalizedName}
                    getLocalizedDescription=${getLocalizedDescription}
                    invalidFields=${invalidFields}
                />`;
            case 3:
                return html`<${StepLaunch}
                    data=${data}
                    updateData=${updateData}
                    loading=${loading}
                    onComplete=${completeOnboarding}
                    onBack=${prevStep}
                    onReferralChange=${handleReferralCodeChange}
                    languages=${lookupOptions.languages}
                    getLocalizedName=${getLocalizedName}
                />`;
            default:
                return null;
        }
    };

    return html`
        <div class="premium-onboarding">
            <div class="onboarding-wrapper">
                <header class="onboarding-header">
                    <div class="progress-container">
                        ${STEPS.map((step, index) => html`
                            <div
                                key=${step.id}
                                class=${`progress-step-indicator ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
                                onClick=${() => goToStep(index)}
                            >
                                <div class="step-dot">
                                    ${index < currentStep ? '✓' : step.icon}
                                </div>
                                <span class="step-dot-label">${step.label}</span>
                            </div>
                        `)}
                    </div>
                </header>

                <div class="onboarding-card">
                    <div class="card-content step-transition" key=${currentStep}>
                        ${renderStep()}
                    </div>

                    ${currentStep < 3 && html`
                        <footer class="card-footer">
                            <button
                                class="btn-secondary"
                                onClick=${prevStep}
                                disabled=${currentStep === 0}
                            >
                                ← ${t('onboard.premium.back')}
                            </button>

                            <button
                                class="btn-primary"
                                onClick=${nextStep}
                            >
                                ${t('onboard.premium.continue')} →
                            </button>
                        </footer>
                    `}
                </div>
            </div>

            <!-- Toast notification -->
            ${toastVisible && html`
                <div class="onboarding-toast" style=${{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    background: '#dc2626',
                    color: 'white',
                    fontWeight: 700,
                    padding: '14px 24px',
                    borderRadius: '10px',
                    boxShadow: '0 4px 20px rgba(220, 38, 38, 0.4)',
                    zIndex: 10002,
                    fontSize: '0.95rem',
                    animation: 'toast-slide-in 0.3s ease-out',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span>⚠</span> ${toastMessage}
                </div>
            `}

            <style>
                ${`
                @keyframes toast-slide-in {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .onboarding-validation-error {
                    border-color: #dc2626 !important;
                    box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.2) !important;
                }
                .onboarding-validation-error-group {
                    border: 2px solid #dc2626 !important;
                    border-radius: 12px;
                    padding: 8px;
                }
                /* iOS-style toggle switch */
                .ios-toggle {
                    position: relative;
                    width: 52px;
                    height: 30px;
                    flex-shrink: 0;
                }
                .ios-toggle input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .ios-toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #cbd5e1;
                    transition: 0.3s;
                    border-radius: 30px;
                }
                .ios-toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 24px;
                    width: 24px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: 0.3s;
                    border-radius: 50%;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                }
                .ios-toggle input:checked + .ios-toggle-slider {
                    background-color: var(--petrol, #2d6a6a);
                }
                .ios-toggle input:checked + .ios-toggle-slider:before {
                    transform: translateX(22px);
                }
                /* Billing toggle */
                .billing-toggle-container {
                    display: flex;
                    justify-content: center;
                    background: #f1f5f9;
                    border-radius: 8px;
                    padding: 3px;
                    margin-bottom: 1rem;
                }
                .billing-toggle-btn {
                    flex: 1;
                    padding: 6px 12px;
                    border: none;
                    background: transparent;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: #64748b;
                    transition: all 0.2s ease;
                }
                .billing-toggle-btn.active {
                    background: white;
                    color: var(--petrol, #2d6a6a);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .billing-toggle-btn.yearly-btn {
                    color: #ea580c;
                    font-weight: 700;
                }
                .billing-toggle-btn.yearly-btn.active {
                    background: linear-gradient(135deg, #f97316, #ea580c);
                    color: white;
                    box-shadow: 0 2px 8px rgba(249, 115, 22, 0.35);
                }
                .billing-save-badge {
                    display: inline-block;
                    background: #10b981;
                    color: white;
                    font-size: 0.65rem;
                    padding: 1px 5px;
                    border-radius: 4px;
                    margin-left: 4px;
                    vertical-align: middle;
                    font-weight: 700;
                }
                `}
            </style>
        </div>
    `;
};

// ============================================================================
// WELCOME SCREEN
// ============================================================================

const WelcomeScreen = ({ onStart, onSkip }) => {
    return html`
        <div class="premium-onboarding">
            <div class="welcome-fullscreen">
                <div class="welcome-content">
                    <div class="welcome-badge">
                        ✨ ${t('onboard.premium.welcomeBadge')}
                    </div>

                    <div class="welcome-icon-container">
                        <span class="welcome-icon">🎓</span>
                    </div>

                    <h1 class="welcome-title">
                        ${t('onboard.premium.welcomeTitle')} <span class="brand-name">coach<span class="brand-highlight">searching</span>.com</span>
                    </h1>

                    <p class="welcome-subtitle">
                        ${t('onboard.premium.welcomeSubtitle')}
                    </p>

                    <div class="welcome-features">
                        <div class="welcome-feature">
                            <div class="feature-icon">⚡</div>
                            <div class="feature-title" style=${{ color: 'white' }}>${t('onboard.premium.feature1Title')}</div>
                            <div class="feature-desc">${t('onboard.premium.feature1Desc')}</div>
                        </div>
                        <div class="welcome-feature">
                            <div class="feature-icon">💾</div>
                            <div class="feature-title" style=${{ color: 'white' }}>${t('onboard.premium.feature2Title')}</div>
                            <div class="feature-desc">${t('onboard.premium.feature2Desc')}</div>
                        </div>
                        <div class="welcome-feature">
                            <div class="feature-icon">🚀</div>
                            <div class="feature-title" style=${{ color: 'white' }}>${t('onboard.premium.feature3Title')}</div>
                            <div class="feature-desc">${t('onboard.premium.feature3Desc')}</div>
                        </div>
                    </div>

                    <div class="welcome-cta">
                        <button class="btn-start" onClick=${onStart}>
                            ${t('onboard.premium.createProfile')}
                            <span class="arrow">→</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
};

// ============================================================================
// STEP 1: PROFILE
// ============================================================================

// Helper function to validate video URLs
const isValidVideoUrl = (url) => {
    if (!url || url.trim() === '') return true; // Empty is valid (optional field)
    const lowerUrl = url.toLowerCase();
    return (
        lowerUrl.includes('youtube.com') ||
        lowerUrl.includes('youtu.be') ||
        lowerUrl.includes('vimeo.com') ||
        lowerUrl.includes('dailymotion.com') ||
        lowerUrl.includes('dai.ly')
    );
};

// ============================================================================
// CERTIFICATIONS SECTION COMPONENT
// ============================================================================

const CertificationsSection = ({ data, updateData, session, certifications = { list: [] }, getCertificationById }) => {
    // Use certifications from database (passed via props from context)
    const certificationsList = certifications.list || [];
    const [isAdding, setIsAdding] = useState(false);
    const [newCert, setNewCert] = useState({ code: '', date_acquired: '', certificate_url: '', certificate_file: null });
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const userCertifications = data.certifications || [];

    // Get list of already added certification IDs to filter them out
    const addedCertIds = userCertifications.map(c => c.certification_id);
    const availableCertifications = certificationsList.filter(c => !addedCertIds.includes(c.id));

    // Get certification name from id
    const getCertName = (certificationId) => {
        const cert = getCertificationById ? getCertificationById(certificationId) : null;
        return cert ? cert.name : `Certification #${certificationId}`;
    };

    const handleAddCertification = async () => {
        if (!newCert.code) return;

        // newCert.code now contains the certification_id (integer)
        const certificationId = parseInt(newCert.code, 10);
        const selectedCert = certificationsList.find(c => c.id === certificationId);
        if (!selectedCert) return;

        let certificateFilePath = null;

        // Upload file to R2 coach-certifications bucket via backend API
        if (newCert.certificate_file) {
            setUploading(true);
            try {
                const apiBase = window.CONFIG?.API_URL || 'https://clouedo.com/coachsearching/api';

                const formData = new FormData();
                formData.append('file', newCert.certificate_file);
                formData.append('bucket', 'coach-certifications');
                formData.append('original_name', newCert.certificate_file.name.replace(/\.[^.]+$/, '') || 'certificate');

                const token = session?.access_token;
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

                const res = await fetch(`${apiBase}/upload`, { method: 'POST', headers, body: formData });
                const json = await res.json();
                if (res.ok) {
                    certificateFilePath = json.data?.url || json.url || null;
                }
            } catch (err) {
                console.error('Certificate upload failed:', err);
            } finally {
                setUploading(false);
            }
        }

        // Store certification_id (foreign key) instead of code/name/org
        const certification = {
            id: `temp_${Date.now()}`,
            certification_id: selectedCert.id,
            name: selectedCert.name, // Keep name for display purposes in the UI
            date_acquired: newCert.date_acquired || null,
            certificate_url: newCert.certificate_url.trim() || null,
            certificate_file_path: certificateFilePath
        };

        updateData('certifications', [...userCertifications, certification]);
        setNewCert({ code: '', date_acquired: '', certificate_url: '', certificate_file: null });
        setIsAdding(false);
    };

    const handleRemoveCertification = (certId) => {
        updateData('certifications', userCertifications.filter(c => c.id !== certId));
    };

    const handleFileSelect = (file) => {
        if (!file) return;
        if (file.type !== 'application/pdf') {
            alert(t('onboard.premium.certPdfOnly') || 'Please select a PDF file');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            alert(t('onboard.premium.certFileTooLarge') || 'File must be less than 10MB');
            return;
        }
        setNewCert(prev => ({ ...prev, certificate_file: file }));
    };

    return html`
        <div class="form-section" style=${{
            background: '#f8fafc',
            border: '1px dashed #cbd5e1',
            borderRadius: '16px',
            padding: '24px'
        }}>
            <div class="form-group">
                <label class="form-label" style=${{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    🏆 ${t('onboard.premium.certifications') || 'Certifications'}
                    <span style=${{
                        fontSize: '0.75rem',
                        color: '#64748b',
                        fontWeight: 'normal',
                        background: '#e2e8f0',
                        padding: '2px 8px',
                        borderRadius: '10px'
                    }}>${t('onboard.premium.optional') || 'Optional'}</span>
                </label>
                <div class="form-hint" style=${{ marginBottom: '16px' }}>
                    ${t('onboard.premium.certificationsHint') || 'Add your coaching certifications to build credibility. You can always add more later from your dashboard.'}
                </div>

                <!-- Existing certifications list -->
                ${userCertifications.length > 0 && html`
                    <div style=${{ marginBottom: '16px' }}>
                        ${userCertifications.map(cert => {
                            // Get full certification data to access badge_url
                            const fullCert = getCertificationById ? getCertificationById(cert.certification_id) : null;
                            const badgeUrl = fullCert?.badge_url;

                            return html`
                                <div key=${cert.id} style=${{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 16px',
                                    background: 'white',
                                    borderRadius: '10px',
                                    marginBottom: '8px',
                                    border: '1px solid #e2e8f0'
                                }}>
                                    <!-- Badge image -->
                                    ${badgeUrl ? html`
                                        <img
                                            src=${badgeUrl}
                                            alt=${cert.name}
                                            style=${{
                                                width: '40px',
                                                height: '40px',
                                                objectFit: 'contain',
                                                marginRight: '12px',
                                                flexShrink: 0
                                            }}
                                        />
                                    ` : html`
                                        <div style=${{
                                            width: '40px',
                                            height: '40px',
                                            background: '#f1f5f9',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: '12px',
                                            flexShrink: 0,
                                            fontSize: '1.25rem'
                                        }}>🏆</div>
                                    `}
                                    <div style=${{ flex: 1 }}>
                                        <div style=${{ fontWeight: 600, color: '#1e293b' }}>${cert.name}</div>
                                        <div style=${{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                                            ${cert.date_acquired ? new Date(cert.date_acquired).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : ''}
                                            ${(cert.certificate_url || cert.certificate_file_path) && html`
                                                <span style=${{ marginLeft: '8px', color: 'var(--petrol)' }}>📎 ${t('onboard.premium.certAttached') || 'Certificate attached'}</span>
                                            `}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick=${() => handleRemoveCertification(cert.id)}
                                        style=${{
                                            background: 'none',
                                            border: 'none',
                                            color: '#ef4444',
                                            cursor: 'pointer',
                                            fontSize: '1.25rem',
                                            padding: '4px 8px'
                                        }}
                                    >×</button>
                                </div>
                            `;
                        })}
                    </div>
                `}

                <!-- Add certification form -->
                ${isAdding ? html`
                    <div style=${{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '20px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div style=${{ marginBottom: '16px' }}>
                            <label style=${{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '6px' }}>
                                ${t('onboard.premium.certName') || 'Certification'} <span style=${{ color: '#ef4444' }}>*</span>
                            </label>
                            <select
                                class="premium-input"
                                value=${newCert.code}
                                onChange=${(e) => setNewCert(prev => ({ ...prev, code: e.target.value }))}
                                style=${{ cursor: 'pointer' }}
                            >
                                <option value="">${t('onboard.premium.selectCertification') || '-- Select a certification --'}</option>
                                ${availableCertifications.length === 0 ? html`
                                    <option value="" disabled>${t('onboard.premium.allCertsAdded') || 'All certifications already added'}</option>
                                ` : null}
                                ${availableCertifications.map(cert => html`
                                    <option key=${cert.id} value=${cert.id}>${cert.name}</option>
                                `)}
                            </select>
                        </div>

                        <div style=${{ marginBottom: '16px' }}>
                            <label style=${{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '6px' }}>
                                ${t('onboard.premium.certDate') || 'Date Acquired'}
                            </label>
                            <input
                                type="month"
                                class="premium-input"
                                value=${newCert.date_acquired}
                                onInput=${(e) => setNewCert(prev => ({ ...prev, date_acquired: e.target.value }))}
                                style=${{ maxWidth: '200px' }}
                            />
                        </div>

                        <div style=${{ marginBottom: '16px' }}>
                            <label style=${{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '6px' }}>
                                ${t('onboard.premium.certProof') || 'Certificate (PDF upload or URL)'}
                            </label>
                            <div style=${{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <div style=${{ flex: 1, minWidth: '200px' }}>
                                    <input
                                        type="url"
                                        class="premium-input"
                                        placeholder=${t('onboard.premium.certUrlPlaceholder') || 'https://... (link to certificate)'}
                                        value=${newCert.certificate_url}
                                        onInput=${(e) => setNewCert(prev => ({ ...prev, certificate_url: e.target.value }))}
                                        disabled=${!!newCert.certificate_file}
                                    />
                                </div>
                                <div style=${{ display: 'flex', alignItems: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                                    ${t('onboard.premium.or') || 'or'}
                                </div>
                                <div>
                                    <input
                                        ref=${fileInputRef}
                                        type="file"
                                        accept=".pdf"
                                        style=${{ display: 'none' }}
                                        onChange=${(e) => handleFileSelect(e.target.files[0])}
                                    />
                                    <button
                                        type="button"
                                        onClick=${() => fileInputRef.current?.click()}
                                        disabled=${!!newCert.certificate_url}
                                        style=${{
                                            padding: '10px 16px',
                                            background: newCert.certificate_file ? 'var(--petrol-50)' : '#f1f5f9',
                                            border: newCert.certificate_file ? '1px solid var(--petrol)' : '1px solid #e2e8f0',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        📄 ${newCert.certificate_file ? newCert.certificate_file.name.slice(0, 20) + '...' : (t('onboard.premium.uploadPdf') || 'Upload PDF')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div style=${{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick=${() => { setIsAdding(false); setNewCert({ code: '', date_acquired: '', certificate_url: '', certificate_file: null }); }}
                                style=${{
                                    padding: '10px 20px',
                                    background: '#f1f5f9',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                ${t('common.cancel') || 'Cancel'}
                            </button>
                            <button
                                type="button"
                                onClick=${handleAddCertification}
                                disabled=${!newCert.code || uploading}
                                style=${{
                                    padding: '10px 20px',
                                    background: newCert.code ? 'var(--petrol)' : '#cbd5e1',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: newCert.code ? 'pointer' : 'not-allowed'
                                }}
                            >
                                ${uploading ? '...' : (t('onboard.premium.addCert') || 'Add Certification')}
                            </button>
                        </div>
                    </div>
                ` : html`
                    <button
                        type="button"
                        onClick=${() => setIsAdding(true)}
                        style=${{
                            width: '100%',
                            padding: '14px 20px',
                            background: 'white',
                            border: '2px dashed #cbd5e1',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            color: '#64748b',
                            fontSize: '0.95rem',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseOver=${(e) => { e.currentTarget.style.borderColor = 'var(--petrol)'; e.currentTarget.style.color = 'var(--petrol)'; }}
                        onMouseOut=${(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#64748b'; }}
                    >
                        <span style=${{ fontSize: '1.25rem' }}>+</span>
                        ${t('onboard.premium.addCertification') || 'Add Certification'}
                    </button>
                `}

                <div style=${{
                    marginTop: '12px',
                    padding: '10px 14px',
                    background: '#eff6ff',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span>💡</span>
                    ${t('onboard.premium.certLaterHint') || 'You can always add or update certifications later from your dashboard.'}
                </div>
            </div>
        </div>
    `;
};

const StepProfile = ({ data, updateData, session, cities = [], countries = COUNTRIES, getLocalizedCityName, certifications, getCertificationById, invalidFields = [] }) => {
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState(data.avatar_url || null);
    const [uploadError, setUploadError] = useState('');

    // Initialize video URL error state based on existing data
    const [videoUrlError, setVideoUrlError] = useState(() => {
        const url = data.intro_video_url;
        return url && url.trim() !== '' && !isValidVideoUrl(url);
    });

    // Re-validate when component mounts or data changes (e.g., when navigating back)
    useEffect(() => {
        const url = data.intro_video_url;
        if (url && url.trim() !== '') {
            setVideoUrlError(!isValidVideoUrl(url));
        } else {
            setVideoUrlError(false);
        }
    }, [data.intro_video_url]);

    // Validate video URL when it changes
    const handleVideoUrlChange = (url) => {
        updateData('intro_video_url', url);
        if (url && url.trim() !== '') {
            setVideoUrlError(!isValidVideoUrl(url));
        } else {
            setVideoUrlError(false);
        }
    };

    const handleFileSelect = async (file) => {
        if (!file || !file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be less than 5MB');
            return;
        }

        // Show a local object URL preview immediately (never stored in the DB)
        const localPreview = URL.createObjectURL(file);
        setAvatarPreview(localPreview);
        setUploadError('');

        setUploading(true);
        try {
            const apiBase = window.CONFIG?.API_URL || 'https://clouedo.com/coachsearching/api';

            const formData = new FormData();
            formData.append('file', file);
            formData.append('bucket', 'profile-images');
            formData.append('original_name', file.name.replace(/\.[^.]+$/, '') || 'avatar');

            const token = session?.access_token;
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

            const res = await fetch(`${apiBase}/upload`, { method: 'POST', headers, body: formData });
            const json = await res.json();
            if (res.ok && (json.data?.url || json.url)) {
                const r2Url = json.data?.url || json.url;
                updateData('avatar_url', r2Url);
                setAvatarPreview(r2Url);
            } else {
                // Upload failed — keep local preview visible, show inline error
                setUploadError(t('onboard.uploadFailed') || 'Image upload failed. You can add a photo later from your profile settings.');
            }
        } catch {
            setUploadError(t('onboard.uploadFailed') || 'Image upload failed. You can add a photo later from your profile settings.');
        } finally {
            setUploading(false);
        }
    };

    // Pre-compute values to avoid interpolation issues
    const bioLength = String(data.bio || '').length;
    const avatarClass = 'avatar-upload-zone' + (dragOver ? ' dragging' : '') + (avatarPreview ? ' has-image' : '');
    const charCounterClass = 'char-counter' + (bioLength > 450 ? ' warning' : '') + (bioLength > 480 ? ' danger' : '');

    return html`
        <div class="slide-up">
            <div class="step-header">
                <h2 class="step-title">${t('onboard.premium.step1Title')}</h2>
                <p class="step-description">
                    ${t('onboard.premium.step1Desc')}
                </p>
            </div>

            <div class="avatar-upload-section">
                <div
                    class=${avatarClass}
                    onClick=${() => fileInputRef.current?.click()}
                    onDrop=${(e) => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files[0]); }}
                    onDragOver=${(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave=${() => setDragOver(false)}
                >
                    ${avatarPreview ? html`
                        <img src=${avatarPreview} alt="Profile" class="avatar-preview" />
                        <div class="avatar-overlay">
                            <span class="avatar-overlay-text">${t('onboard.premium.changePhoto')}</span>
                        </div>
                    ` : html`
                        <div class="avatar-placeholder">
                            <div class="avatar-placeholder-icon">📷</div>
                            <div class="avatar-placeholder-text">${t('onboard.premium.uploadPhoto')}</div>
                        </div>
                    `}
                    ${uploading ? html`
                        <div class="avatar-overlay" style=${{ opacity: 1 }}>
                            <span class="avatar-overlay-text">...</span>
                        </div>
                    ` : null}
                </div>
                <input
                    ref=${fileInputRef}
                    type="file"
                    accept="image/*"
                    style=${{ display: 'none' }}
                    onChange=${(e) => handleFileSelect(e.target.files[0])}
                />
                ${uploadError && html`<p style=${{ color: '#ef4444', fontSize: '0.8rem', marginTop: '6px', textAlign: 'center' }}>${uploadError}</p>`}

                <div class="avatar-tips">
                    <div class="avatar-tips-title">${t('onboard.premium.photoTips')}</div>
                    <ul class="avatar-tips-list">
                        <li>${t('onboard.premium.photoTip1')}</li>
                        <li>${t('onboard.premium.photoTip2')}</li>
                        <li>${t('onboard.premium.photoTip3')}</li>
                        <li>${t('onboard.premium.photoTip4')}</li>
                    </ul>
                </div>
            </div>

            <div class="form-section">
                <div class="form-group">
                    <label class="form-label">
                        ${t('onboard.premium.fullName')} <span class="required">*</span>
                    </label>
                    <input
                        type="text"
                        class=${`premium-input${invalidFields.includes('full_name') ? ' onboarding-validation-error' : ''}`}
                        placeholder="e.g., Sarah Johnson"
                        value=${String(data.full_name || '')}
                        onInput=${(e) => updateData('full_name', e.target.value)}
                    />
                </div>

                <div class="form-group">
                    <label class="form-label">
                        ${t('onboard.premium.professionalTitle')} <span class="required">*</span>
                    </label>
                    <input
                        type="text"
                        class=${`premium-input${invalidFields.includes('professional_title') ? ' onboarding-validation-error' : ''}`}
                        placeholder="e.g., Certified Life Coach"
                        value=${String(data.professional_title || '')}
                        onInput=${(e) => updateData('professional_title', e.target.value)}
                    />
                </div>
            </div>

            <div class="form-section">
                <div class="form-group">
                    <label class="form-label">${t('onboard.premium.aboutYou')}</label>
                    <div class="form-hint">
                        ${t('onboard.premium.aboutYouHint')}
                    </div>
                    <textarea
                        class="premium-input premium-textarea"
                        value=${String(data.bio || '')}
                        onInput=${(e) => updateData('bio', e.target.value)}
                        maxLength="500"
                    ></textarea>
                    <div class=${charCounterClass}>
                        ${String(bioLength)} / 500
                    </div>
                </div>
            </div>

            <!-- Video Introduction - Highlighted Section -->
            <div class="form-section" style=${{
                background: 'linear-gradient(135deg, var(--petrol-50, #e8f4f3) 0%, #f0f9ff 100%)',
                border: '2px solid var(--petrol, #2d6a6a)',
                borderRadius: '16px',
                padding: '24px',
                position: 'relative'
            }}>
                <div style=${{
                    position: 'absolute',
                    top: '-12px',
                    left: '20px',
                    background: 'var(--petrol, #2d6a6a)',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                }}>
                    ⭐ ${t('onboard.premium.recommended') || 'Highly Recommended'}
                </div>
                <div class="form-group" style=${{ marginTop: '8px' }}>
                    <label class="form-label" style=${{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🎥 ${t('onboard.premium.introVideo') || 'Introduction Video'}
                    </label>
                    <div class="form-hint" style=${{ marginBottom: '12px' }}>
                        ${t('onboard.premium.introVideoHint') || 'Add a short video (1-2 min) to introduce yourself. This is the #1 way to build trust with potential clients before the discovery call. Use YouTube, Vimeo, or Loom links.'}
                    </div>
                    <div style=${{ position: 'relative' }}>
                        <input
                            type="url"
                            class="premium-input"
                            placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                            value=${String(data.intro_video_url || '')}
                            onInput=${(e) => handleVideoUrlChange(e.target.value)}
                            style=${{
                                paddingLeft: '44px',
                                borderColor: videoUrlError ? '#ef4444' : undefined
                            }}
                        />
                        <span style=${{
                            position: 'absolute',
                            left: '14px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '18px'
                        }}>🔗</span>
                    </div>
                    ${videoUrlError && html`
                        <div style=${{
                            marginTop: '12px',
                            padding: '12px',
                            background: '#fef2f2',
                            borderRadius: '8px',
                            border: '1px solid #fecaca',
                            fontSize: '0.9rem',
                            color: '#dc2626',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span>⚠️</span>
                            ${t('onboard.premium.videoUrlError') || 'Please use a YouTube, Vimeo, or Dailymotion link. Other video platforms are not supported.'}
                        </div>
                    `}
                    ${data.intro_video_url && !videoUrlError && html`
                        <div style=${{
                            marginTop: '12px',
                            padding: '12px',
                            background: 'white',
                            borderRadius: '8px',
                            border: '1px solid #e0e0e0',
                            fontSize: '0.9rem',
                            color: '#666',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style=${{ color: 'var(--petrol)' }}>✓</span>
                            ${t('onboard.premium.videoAdded') || 'Video link added! Clients will see this on your profile.'}
                        </div>
                    `}
                </div>
            </div>

            <!-- Certifications Section -->
            <${CertificationsSection} data=${data} updateData=${updateData} session=${session} certifications=${certifications} getCertificationById=${getCertificationById} />

            <div class="form-section">
                <div style=${{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div class="form-group">
                        <label class="form-label">
                            ${t('onboard.premium.country')} <span class="required">*</span>
                        </label>
                        <select
                            class=${`premium-input${invalidFields.includes('location_country') ? ' onboarding-validation-error' : ''}`}
                            value=${String(data.location_country || '')}
                            onChange=${(e) => {
                                // Clear city_id when country changes
                                updateData('location_country', e.target.value);
                                updateData('city_id', null);
                            }}
                        >
                            <option value="">...</option>
                            ${countries.map(country => html`
                                <option key=${country.code} value=${country.name}>${country.name}</option>
                            `)}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            ${t('onboard.premium.city')} <span class="required">*</span>
                        </label>
                        <select
                            class=${`premium-input${invalidFields.includes('city_id') ? ' onboarding-validation-error' : ''}`}
                            value=${String(data.city_id || '')}
                            onChange=${(e) => {
                                const cityId = e.target.value ? parseInt(e.target.value, 10) : null;
                                updateData('city_id', cityId);
                            }}
                            disabled=${!data.location_country}
                        >
                            <option value="">${data.location_country ? (t('onboard.premium.selectCity') || 'Select city...') : (t('onboard.premium.selectCountryFirst') || 'Select country first')}</option>
                            ${cities.map(city => html`
                                <option key=${city.id} value=${city.id}>
                                    ${getLocalizedCityName ? getLocalizedCityName(city) : city.name_en}
                                </option>
                            `)}
                        </select>
                    </div>
                </div>
                <div style=${{
                    marginTop: '12px',
                    padding: '12px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.85rem',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px'
                }}>
                    <span style=${{ flexShrink: 0 }}>💡</span>
                    <span>${t('onboard.premium.cityNotice') || 'If your city is not listed, please select the closest available city. This helps clients find you based on location.'}</span>
                </div>
            </div>
        </div>
    `;
};

// ============================================================================
// STEP 2: EXPERTISE
// ============================================================================

const StepExpertise = ({ data, updateData, specialties = [], languages = [], getLocalizedName, invalidFields = [] }) => {
    const toggleSpecialty = (code) => {
        const current = data.specialties || [];
        const newSpecialties = current.includes(code)
            ? current.filter(s => s !== code)
            : current.length < 10 ? [...current, code] : current;
        updateData('specialties', newSpecialties);
    };

    const toggleLanguage = (code) => {
        const langs = data.languages || [];
        const newLangs = langs.includes(code)
            ? langs.filter(l => l !== code)
            : [...langs, code];
        updateData('languages', newLangs);
    };

    const getSpecialtyDisplayName = (code) => {
        const specialty = specialties.find(s => s.code === code);
        return specialty ? String(getLocalizedName(specialty)) : String(code);
    };

    const selectedCount = (data.specialties || []).length;

    return html`
        <div class="slide-up">
            <div class="step-header">
                <h2 class="step-title">${t('onboard.premium.step2Title')}</h2>
                <p class="step-description">
                    ${t('onboard.premium.step2Desc')}
                </p>
            </div>

            <div class="form-section">
                <div class="form-group">
                    <label class="form-label">${t('onboard.premium.yearsExperience')}</label>
                    <div class="years-stepper">
                        <button
                            type="button"
                            class="btn-stepper"
                            onClick=${() => {
                                const current = parseInt(data.years_experience) || 0;
                                if (current > 0) updateData('years_experience', String(current - 1));
                            }}
                        >−</button>
                        <input
                            type="number"
                            class="premium-input years-input"
                            placeholder="0"
                            min="0"
                            value=${String(data.years_experience || '')}
                            onInput=${(e) => updateData('years_experience', e.target.value)}
                        />
                        <button
                            type="button"
                            class="btn-stepper"
                            onClick=${() => {
                                const current = parseInt(data.years_experience) || 0;
                                updateData('years_experience', String(current + 1));
                            }}
                        >+</button>
                    </div>
                </div>
            </div>

            <div class=${`form-section${invalidFields.includes('specialties') ? ' onboarding-validation-error-group' : ''}`}>
                <div class="form-section-title">🎯 ${t('onboard.premium.specialties')} <span class="required">*</span></div>
                <div class="form-hint">
                    ${t('onboard.premium.specialtiesHint')}
                </div>

                ${selectedCount > 0 ? html`
                    <div class="selected-specialties" style=${{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        ${(data.specialties || []).map((code, index) => html`
                            <span key=${index} class="specialty-pill">
                                ${getSpecialtyDisplayName(code)}
                                <button
                                    class="specialty-pill-remove"
                                    onClick=${() => toggleSpecialty(code)}
                                >×</button>
                            </span>
                        `)}
                    </div>
                ` : null}

                <div class="specialty-grid" style=${{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                    ${specialties.map(specialty => {
                        const isSelected = (data.specialties || []).includes(specialty.code);
                        const isDisabled = !isSelected && selectedCount >= 10;
                        const btnClass = 'specialty-option' + (isSelected ? ' selected' : '');
                        return html`
                            <button
                                key=${specialty.code}
                                type="button"
                                class=${btnClass}
                                onClick=${() => toggleSpecialty(specialty.code)}
                                disabled=${isDisabled}
                                style=${{
                                    padding: '0.75rem 1rem',
                                    borderRadius: '8px',
                                    border: isSelected ? '2px solid var(--petrol)' : '1px solid #e0e0e0',
                                    background: isSelected ? 'var(--petrol-50)' : '#fff',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '0.5rem',
                                    fontSize: '0.9rem',
                                    transition: 'all 0.2s ease',
                                    opacity: isDisabled ? 0.5 : 1,
                                    textAlign: 'left',
                                    wordBreak: 'break-word'
                                }}
                            >
                                <span style=${{ flexShrink: 0 }}>${String(specialty.icon || '🎯')}</span>
                                <span style=${{ textAlign: 'left' }}>${String(getLocalizedName(specialty))}</span>
                            </button>
                        `;
                    })}
                </div>

                ${selectedCount > 0 ? html`
                    <div style=${{ marginTop: '0.75rem', fontSize: '0.875rem', color: '#666' }}>
                        ${String(selectedCount)}/10 selected
                    </div>
                ` : null}
            </div>

            <div class=${`form-section${invalidFields.includes('languages') ? ' onboarding-validation-error-group' : ''}`}>
                <div class="form-section-title">🌍 ${t('onboard.premium.languages')} <span class="required">*</span></div>
                <div class="form-hint">
                    ${t('onboard.premium.languagesHint')}
                </div>

                <div class="language-grid">
                    ${languages.map(lang => {
                        const isSelected = (data.languages || []).includes(lang.code);
                        const langClass = 'language-option' + (isSelected ? ' selected' : '');
                        const flagCode = LANGUAGE_TO_FLAG[lang.code];
                        return html`
                            <button
                                key=${lang.code}
                                type="button"
                                class=${langClass}
                                onClick=${() => toggleLanguage(lang.code)}
                            >
                                ${flagCode ? html`
                                    <img
                                        src="${FLAG_CDN}/${flagCode}.svg"
                                        alt=${getLocalizedName(lang)}
                                        class="language-flag-img"
                                        style=${{ width: '24px', height: '18px', borderRadius: '2px', objectFit: 'cover' }}
                                        loading="lazy"
                                    />
                                ` : html`<span class="language-flag" style=${{ fontSize: '14px', lineHeight: '18px' }}>🌐</span>`}
                                <span class="language-name">${String(getLocalizedName(lang))}</span>
                            </button>
                        `;
                    })}
                </div>
            </div>
        </div>
    `;
};

// ============================================================================
// STEP 3: SERVICES & PRICING
// ============================================================================

const StepServices = ({ data, updateData, sessionFormats = [], getLocalizedName, getLocalizedDescription, invalidFields = [] }) => {
    // Filter out chat, hybrid, and phone formats - only show video and in-person
    const EXCLUDED_FORMATS = ['chat', 'hybrid', 'phone'];
    const filteredFormats = sessionFormats.filter(f => !EXCLUDED_FORMATS.includes(f.code));

    const [editingServiceIndex, setEditingServiceIndex] = useState(null); // null=closed, -1=add new, index=edit

    const toggleFormat = (formatCode) => {
        const formats = data.session_formats || [];
        const newFormats = formats.includes(formatCode)
            ? formats.filter(f => f !== formatCode)
            : [...formats, formatCode];
        updateData('session_formats', newFormats);
    };

    const services = data.services || [];

    const addService = () => {
        setEditingServiceIndex(-1);
    };

    const editService = (index) => {
        setEditingServiceIndex(index);
    };

    const deleteService = (index) => {
        const newServices = services.filter((_, i) => i !== index);
        updateData('services', newServices);
    };

    const CURRENCY_SYMBOLS = { EUR: '\u20AC', USD: '$', GBP: '\u00A3', CHF: 'CHF' };
    const UNIT_LABELS = { hour: '/hr', day: '/day', session: '/session' };

    return html`
        <div class="slide-up">
            <div class="step-header">
                <h2 class="step-title">${t('onboard.premium.step3Title')}</h2>
                <p class="step-description">
                    ${t('onboard.premium.step3Desc')}
                </p>
            </div>

            <div class=${`form-section${invalidFields.includes('session_formats') ? ' onboarding-validation-error-group' : ''}`}>
                <div class="form-section-title">💬 ${t('onboard.premium.sessionFormats')} <span class="required">*</span></div>
                <div class="form-hint">
                    ${t('onboard.premium.sessionFormatsHint')}
                </div>

                <div class="format-grid">
                    ${filteredFormats.map(format => {
                        const isSelected = (data.session_formats || []).includes(format.code);
                        const formatClass = 'format-card' + (isSelected ? ' selected' : '');
                        return html`
                            <div
                                key=${format.code}
                                class=${formatClass}
                                onClick=${() => toggleFormat(format.code)}
                            >
                                <div class="format-icon">${String(format.icon || '💬')}</div>
                                <div class="format-title">${String(getLocalizedName(format))}</div>
                                <div class="format-desc">${String(getLocalizedDescription(format))}</div>
                            </div>
                        `;
                    })}
                </div>
            </div>

            <div class="form-section">
                <div class="form-section-title">📞 ${t('onboard.premium.discoveryCallTitle')}</div>
                <div class="form-hint">
                    ${t('onboard.premium.discoveryCallHint')}
                </div>

                <div class="discovery-toggle-wrapper" style=${{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    background: data.offers_free_discovery ? 'var(--petrol-50, #e8f4f3)' : '#f8f9fa',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    border: data.offers_free_discovery ? '2px solid var(--petrol)' : '2px solid #e0e0e0',
                    transition: 'all 0.2s ease'
                }} onClick=${() => updateData('offers_free_discovery', !data.offers_free_discovery)}>
                    <div style=${{ flex: 1 }}>
                        <div style=${{ fontWeight: 600, marginBottom: '4px' }}>
                            ${t('onboard.premium.discoveryCallLabel')}
                        </div>
                        <div style=${{ fontSize: '0.9rem', color: '#666' }}>
                            ${t('onboard.premium.discoveryCallDesc')}
                        </div>
                    </div>
                    <label class="ios-toggle" onClick=${(e) => e.stopPropagation()}>
                        <input
                            type="checkbox"
                            checked=${data.offers_free_discovery}
                            onChange=${(e) => updateData('offers_free_discovery', e.target.checked)}
                        />
                        <span class="ios-toggle-slider"></span>
                    </label>
                </div>

                ${!data.offers_free_discovery ? html`
                    <div class="discovery-disabled-notice" style=${{
                        marginTop: '12px',
                        padding: '12px 16px',
                        background: '#fff3cd',
                        borderRadius: '8px',
                        border: '1px solid #ffc107',
                        fontSize: '0.9rem',
                        color: '#856404'
                    }}>
                        <span style=${{ marginRight: '8px' }}>⚠️</span>
                        ${t('onboard.premium.discoveryCallDisabledNotice')}
                    </div>
                ` : null}
            </div>

            <div class="form-section">
                <div class="form-section-title" style=${{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>💰 ${t('onboard.premium.services') || 'Your Services'}</span>
                    <button
                        type="button"
                        class="btn-add-onboarding-service"
                        onClick=${addService}
                        style=${{
                            background: 'var(--petrol, #006266)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '6px 14px',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        + ${t('onboard.premium.addService') || 'Add Service'}
                    </button>
                </div>
                <div class="form-hint">
                    ${t('onboard.premium.servicesHint') || 'Add your coaching services with pricing. You can add more later from your profile.'}
                </div>

                ${services.length > 0 ? html`
                    <div class="onboarding-services-list" style=${{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                        ${services.map((svc, index) => html`
                            <div key=${index} class="onboarding-service-item" style=${{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '14px 16px',
                                background: '#f8f9fa',
                                borderRadius: '10px',
                                border: '1px solid #e0e0e0'
                            }}>
                                <div>
                                    <div style=${{ fontWeight: 600, fontSize: '0.95rem' }}>${svc.name}</div>
                                    <div style=${{ fontSize: '0.85rem', color: '#666', marginTop: '2px' }}>
                                        ${CURRENCY_SYMBOLS[svc.currency] || svc.currency}${parseFloat(svc.price).toFixed(0)}${UNIT_LABELS[svc.unit] || ''}
                                        ${svc.description ? html` — <span style=${{ color: '#888' }}>${svc.description.length > 60 ? svc.description.substring(0, 60) + '...' : svc.description}</span>` : ''}
                                    </div>
                                </div>
                                <div style=${{ display: 'flex', gap: '8px' }}>
                                    <button
                                        type="button"
                                        onClick=${() => editService(index)}
                                        style=${{ background: 'none', border: '1px solid #ccc', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.8rem' }}
                                    >
                                        ${t('edit.edit') || 'Edit'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick=${() => deleteService(index)}
                                        style=${{ background: 'none', border: '1px solid #e74c3c', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.8rem', color: '#e74c3c' }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        `)}
                    </div>
                ` : html`
                    <div
                        onClick=${addService}
                        style=${{
                            textAlign: 'center',
                            padding: '30px 20px',
                            background: '#f8f9fa',
                            borderRadius: '12px',
                            border: '2px dashed #d0d0d0',
                            cursor: 'pointer',
                            color: '#888',
                            marginTop: '12px'
                        }}
                    >
                        <div style=${{ fontSize: '2rem', marginBottom: '8px' }}>+</div>
                        <p style=${{ margin: 0, fontSize: '0.9rem' }}>${t('onboard.premium.addFirstService') || 'Add your first coaching service'}</p>
                    </div>
                `}

                <div class="no-fee-notice">
                    <span class="no-fee-icon">✨</span>
                    <span>${t('onboard.premium.noFeeNotice')}</span>
                </div>
            </div>
        </div>

        ${editingServiceIndex !== null && html`
            <${OnboardingServiceModal}
                service=${editingServiceIndex >= 0 ? services[editingServiceIndex] : null}
                onClose=${() => setEditingServiceIndex(null)}
                onSave=${(serviceData) => {
                    const newServices = [...services];
                    if (editingServiceIndex >= 0) {
                        newServices[editingServiceIndex] = serviceData;
                    } else {
                        newServices.push(serviceData);
                    }
                    updateData('services', newServices);
                    setEditingServiceIndex(null);
                }}
            />
        `}
    `;
};

/**
 * Onboarding Service Modal
 * Inline modal for adding/editing services during onboarding
 */
const OnboardingServiceModal = ({ service, onClose, onSave }) => {
    const isEditing = !!service;
    const [name, setName] = useState(service?.name || '');
    const [nameEn, setNameEn] = useState(service?.name_en || '');
    const [description, setDescription] = useState(service?.description || '');
    const [descriptionEn, setDescriptionEn] = useState(service?.description_en || '');
    const [unit, setUnit] = useState(service?.unit || 'hour');
    const [price, setPrice] = useState(service?.price || '');
    const [currency, setCurrency] = useState(service?.currency || 'EUR');
    const [error, setError] = useState('');

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) {
            setError(t('edit.serviceNameRequired') || 'Service name is required');
            return;
        }
        if (!price || parseFloat(price) < 0) {
            setError(t('edit.priceRequired') || 'Please enter a valid price');
            return;
        }
        onSave({
            name: name.trim(),
            name_en: nameEn.trim() || null,
            description: description.trim() || null,
            description_en: descriptionEn.trim() || null,
            unit,
            price: parseFloat(price) || 0,
            currency,
            active: true
        });
    };

    const handleBackdropClick = (e) => {
        if (e.target.classList.contains('edit-modal-overlay')) {
            onClose();
        }
    };

    return html`
        <div class="edit-modal-overlay" onClick=${handleBackdropClick} style=${{ zIndex: 10001 }}>
            <div class="edit-modal-container edit-modal-wide" style=${{ maxHeight: '90vh', overflow: 'auto' }}>
                <div class="edit-modal-header">
                    <h3>${isEditing ? (t('edit.editService') || 'Edit Service') : (t('edit.addService') || 'Add Service')}</h3>
                    <button type="button" class="edit-modal-close" onClick=${onClose}>✕</button>
                </div>
                <form onSubmit=${handleSubmit}>
                    <div class="edit-modal-content">
                        ${error && html`<div class="edit-error">${error}</div>`}

                        <div class="form-row" style=${{ display: 'flex', gap: '16px' }}>
                            <div class="form-group" style=${{ flex: 1 }}>
                                <label>${t('edit.serviceName') || 'Service Name'} *</label>
                                <input
                                    type="text"
                                    value=${name}
                                    onChange=${(e) => setName(e.target.value)}
                                    placeholder=${t('edit.serviceNamePlaceholder') || 'e.g., Executive Coaching Session'}
                                    required
                                    class="premium-input"
                                />
                            </div>
                            <div class="form-group" style=${{ flex: 1 }}>
                                <label>${t('edit.serviceNameEn') || 'Service Name (English)'}</label>
                                <input
                                    type="text"
                                    value=${nameEn}
                                    onChange=${(e) => setNameEn(e.target.value)}
                                    placeholder=${t('edit.serviceNameEnPlaceholder') || 'English translation'}
                                    class="premium-input"
                                />
                            </div>
                        </div>

                        <div class="form-row" style=${{ display: 'flex', gap: '16px' }}>
                            <div class="form-group" style=${{ flex: 1 }}>
                                <label>${t('edit.price') || 'Price'} *</label>
                                <div style=${{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="number"
                                        value=${String(price)}
                                        onChange=${(e) => setPrice(e.target.value)}
                                        placeholder="0"
                                        min="0"
                                        step="0.01"
                                        required
                                        class="premium-input"
                                        style=${{ flex: 1 }}
                                    />
                                    <select
                                        value=${currency}
                                        onChange=${(e) => setCurrency(e.target.value)}
                                        class="premium-input"
                                        style=${{ width: '90px' }}
                                    >
                                        <option value="EUR">EUR</option>
                                        <option value="USD">USD</option>
                                        <option value="GBP">GBP</option>
                                        <option value="CHF">CHF</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group" style=${{ flex: 1 }}>
                                <label>${t('edit.unit') || 'Unit'}</label>
                                <select
                                    value=${unit}
                                    onChange=${(e) => setUnit(e.target.value)}
                                    class="premium-input"
                                >
                                    <option value="hour">${t('edit.perHour') || 'Per Hour'}</option>
                                    <option value="day">${t('edit.perDay') || 'Per Day'}</option>
                                    <option value="session">${t('edit.perSession') || 'Per Session'}</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>${t('edit.description') || 'Description'}</label>
                            <textarea
                                value=${description}
                                onChange=${(e) => setDescription(e.target.value)}
                                placeholder=${t('edit.serviceDescriptionPlaceholder') || 'Describe this service...'}
                                rows="3"
                                class="premium-input"
                            ></textarea>
                        </div>

                        <div class="form-group">
                            <label>${t('edit.descriptionEn') || 'Description (English)'}</label>
                            <textarea
                                value=${descriptionEn}
                                onChange=${(e) => setDescriptionEn(e.target.value)}
                                placeholder=${t('edit.descriptionEnPlaceholder') || 'English translation of description...'}
                                rows="3"
                                class="premium-input"
                            ></textarea>
                        </div>
                    </div>
                    <div class="edit-modal-actions" style=${{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 24px', borderTop: '1px solid #eee' }}>
                        <button type="button" onClick=${onClose} style=${{
                            background: 'none', border: '1px solid #ccc', borderRadius: '8px',
                            padding: '8px 20px', cursor: 'pointer'
                        }}>
                            ${t('edit.cancel') || 'Cancel'}
                        </button>
                        <button type="submit" style=${{
                            background: 'var(--petrol, #006266)', color: 'white', border: 'none',
                            borderRadius: '8px', padding: '8px 20px', cursor: 'pointer', fontWeight: 600
                        }}>
                            ${isEditing ? (t('edit.save') || 'Save Changes') : (t('edit.add') || 'Add Service')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
};

// ============================================================================
// STEP 4: LAUNCH
// ============================================================================

const StepLaunch = ({ data, updateData, loading, onComplete, onBack, onReferralChange, languages = [], getLocalizedName }) => {
    const [billingCycle, setBillingCycle] = useState('monthly');

    const FREE_FEATURES = [
        'plan.free.feature1',
        'plan.free.feature2',
        'plan.free.feature3',
        'plan.free.feature4'
    ];

    const PREMIUM_FEATURES = [
        'plan.premium.feature1',
        'plan.premium.feature2',
        'plan.premium.feature3',
        'plan.premium.feature4',
        'plan.premium.feature5',
        'plan.premium.feature6'
    ];

    const isFreeSelected = data.plan_type === 'free';
    const isPremiumSelected = data.plan_type === 'premium';
    const freeCardClass = 'plan-card' + (isFreeSelected ? ' selected' : '');
    const premiumCardClass = 'plan-card' + (isPremiumSelected ? ' selected' : '');

    const referralInputStyle = {
        flex: 1,
        textTransform: 'uppercase',
        borderColor: data.referral_code_valid ? '#10b981' : (data.referral_code && !data.referral_code_valid ? '#ef4444' : '#e0e0e0')
    };

    const launchButtonText = loading
        ? '...'
        : (isPremiumSelected && !data.referral_code_valid ? '🚀 ' + t('onboard.premium.launchPremium') : '🚀 ' + t('onboard.premium.launchProfile'));

    return html`
        <div class="slide-up">
            <div class="completion-screen">
                <div class="step-header" style=${{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h2 class="step-title">${t('onboard.premium.step4Title')}</h2>
                    <p class="step-description">
                        ${t('onboard.premium.step4Desc')}
                    </p>
                </div>

                <div class="plan-selection" style=${{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div
                        class=${freeCardClass}
                        onClick=${() => updateData('plan_type', 'free')}
                        style=${{
                            padding: '1.5rem',
                            borderRadius: '12px',
                            border: isFreeSelected ? '2px solid var(--petrol)' : '2px solid #e0e0e0',
                            cursor: 'pointer',
                            background: isFreeSelected ? 'var(--petrol-50)' : '#fff',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div style=${{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span style=${{ fontSize: '1.5rem' }}>🆓</span>
                            <h3 style=${{ margin: 0, fontSize: '1.25rem' }}>${t('plan.free.name') || 'FREE'}</h3>
                        </div>
                        <div style=${{ fontSize: '2rem', fontWeight: 700, color: 'var(--petrol)', marginBottom: '0.5rem' }}>
                            €0<span style=${{ fontSize: '1rem', fontWeight: 400 }}>/month</span>
                        </div>
                        <div style=${{ fontSize: '0.95rem', color: '#666', fontStyle: 'italic', marginBottom: '1rem' }}>
                            "${t('plan.free.tagline') || 'Get discovered'}"
                        </div>
                        <ul style=${{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem' }}>
                            ${FREE_FEATURES.map(featureKey => html`
                                <li key=${featureKey} style=${{ padding: '0.25rem 0', color: '#666' }}>
                                    ✓ ${t(featureKey) || featureKey}
                                </li>
                            `)}
                        </ul>
                    </div>

                    <div
                        class=${premiumCardClass}
                        onClick=${() => updateData('plan_type', 'premium')}
                        style=${{
                            padding: '1.5rem',
                            borderRadius: '12px',
                            border: isPremiumSelected ? '2px solid var(--petrol)' : '2px solid #e0e0e0',
                            cursor: 'pointer',
                            background: isPremiumSelected ? 'var(--petrol-50)' : '#fff',
                            transition: 'all 0.2s ease',
                            position: 'relative'
                        }}
                    >
                        <!-- Billing cycle toggle inside the card -->
                        <div class="billing-toggle-container" onClick=${(e) => e.stopPropagation()}>
                            <button
                                type="button"
                                class=${`billing-toggle-btn${billingCycle === 'monthly' ? ' active' : ''}`}
                                onClick=${() => setBillingCycle('monthly')}
                            >Monthly</button>
                            <button
                                type="button"
                                class=${`billing-toggle-btn yearly-btn${billingCycle === 'yearly' ? ' active' : ''}`}
                                onClick=${() => setBillingCycle('yearly')}
                            >Yearly <span class="billing-save-badge">SAVE 21%</span></button>
                        </div>

                        <div style=${{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span style=${{ fontSize: '1.5rem' }}>⭐</span>
                            <h3 style=${{ margin: 0, fontSize: '1.25rem' }}>${t('plan.premium.name') || 'PREMIUM'}</h3>
                        </div>
                        <div style=${{ fontSize: '2rem', fontWeight: 700, color: 'var(--petrol)', marginBottom: '0.5rem' }}>
                            ${data.referral_code_valid ? html`
                                <span style=${{ textDecoration: 'line-through', color: '#999', fontSize: '1.5rem' }}>€19</span>
                                <span style=${{ color: '#10b981' }}> €0</span>
                                <span style=${{ fontSize: '1rem', fontWeight: 400 }}>/year</span>
                            ` : billingCycle === 'yearly' ? html`
                                €15<span style=${{ fontSize: '1rem', fontWeight: 400 }}>/month</span>
                                <div style=${{ fontSize: '0.8rem', fontWeight: 400, color: '#64748b', marginTop: '2px' }}>€180 billed now</div>
                            ` : html`
                                €19<span style=${{ fontSize: '1rem', fontWeight: 400 }}>/month</span>
                            `}
                        </div>
                        <div style=${{ fontSize: '0.95rem', color: '#666', fontStyle: 'italic', marginBottom: '1rem' }}>
                            "${t('plan.premium.tagline') || 'Get clients'}"
                        </div>
                        <ul style=${{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem' }}>
                            ${PREMIUM_FEATURES.map(featureKey => html`
                                <li key=${featureKey} style=${{ padding: '0.25rem 0', color: '#666' }}>
                                    ✓ ${t(featureKey) || featureKey}
                                </li>
                            `)}
                        </ul>
                    </div>
                </div>

                <div class="referral-section" style=${{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
                    <div style=${{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <span style=${{ fontSize: '1.25rem' }}>🎁</span>
                        <span style=${{ fontWeight: 600, color: 'var(--petrol)' }}>${t('onboard.premium.referralCode')}</span>
                    </div>
                    <p style=${{ fontSize: '0.875rem', color: '#666', marginBottom: '1rem' }}>
                        ${t('onboard.premium.referralCodeHint')}
                    </p>
                    <div style=${{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <input
                            type="text"
                            class="premium-input"
                            placeholder=${t('onboard.premium.referralPlaceholder') || 'ENTER REFERRAL CODE'}
                            value=${String(data.referral_code || '')}
                            onInput=${(e) => onReferralChange(e.target.value)}
                            style=${referralInputStyle}
                        />
                        ${data.referral_code ? html`
                            <span style=${{ fontSize: '1.5rem' }}>
                                ${data.referral_code_valid ? '✅' : '❌'}
                            </span>
                        ` : null}
                    </div>
                    ${data.referral_code_valid ? html`
                        <div style=${{ marginTop: '1rem', padding: '1rem', background: data.referral_benefit_type === 'free_lifetime_premium' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #10b981, #059669)', color: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style=${{ fontSize: '1.5rem' }}>${data.referral_benefit_type === 'free_lifetime_premium' ? '👑' : '🎉'}</span>
                            <div style=${{ textAlign: 'left' }}>
                                <div style=${{ fontWeight: 600 }}>
                                    ${data.referral_benefit_type === 'free_lifetime_premium'
                                        ? 'Referral Code Applied! You unlocked free lifetime Premium!'
                                        : t('onboard.premium.referralApplied')}
                                </div>
                                ${data.referral_benefit_type !== 'free_lifetime_premium' ? html`
                                    <div style=${{ fontSize: '0.875rem', opacity: 0.9 }}>${t('onboard.premium.referralAppliedDesc')}</div>
                                ` : null}
                            </div>
                        </div>
                    ` : null}
                    ${data.referral_code && !data.referral_code_valid && String(data.referral_code).length >= 3 ? html`
                        <div style=${{ marginTop: '0.5rem', color: '#ef4444', fontSize: '0.875rem' }}>
                            ${t('onboard.premium.referralInvalid')}
                        </div>
                    ` : null}
                </div>

                <div style=${{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button
                        class="btn-secondary"
                        style=${{ fontSize: '1rem', padding: '1.25rem 1.5rem' }}
                        onClick=${onBack}
                        disabled=${loading}
                    >
                        ← ${t('onboard.premium.back')}
                    </button>
                    <button
                        class="btn-primary btn-success"
                        style=${{ fontSize: '1.25rem', padding: '1.25rem 3rem', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                        onClick=${onComplete}
                        disabled=${loading}
                    >
                        ${launchButtonText}
                    </button>
                </div>

                ${isPremiumSelected && !data.referral_code_valid ? html`
                    <p style=${{ textAlign: 'center', fontSize: '0.875rem', color: '#666', marginTop: '1rem' }}>
                        ${t('onboard.premium.premiumRedirect')}
                    </p>
                ` : null}
            </div>
        </div>
    `;
};

export default PremiumCoachOnboarding;
