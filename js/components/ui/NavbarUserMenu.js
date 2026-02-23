/**
 * NavbarUserMenu Component
 * Avatar dropdown for signed-in users
 * Mobile-friendly: shows inline expandable in mobile hamburger menu
 * Desktop: traditional positioned dropdown below avatar
 */

import htm from '../../vendor/htm.js';
import { t } from '../../i18n.js';

const React = window.React;
const { useState, useEffect, useRef } = React;
const html = htm.bind(React.createElement);

export function NavbarUserMenu({ session, onNavigate }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [profile, setProfile] = useState(null);
    const dropdownRef = useRef(null);

    const userType = session?.user?.user_metadata?.user_type || 'client';
    const fullName = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || '';
    const avatarUrl = session?.user?.user_metadata?.avatar_url
        || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=006266&color=fff`;

    // Fetch profile data for slug, title, premium status
    useEffect(() => {
        const fetchProfile = async () => {
            const supabase = window.supabaseClient;
            if (!supabase || !session?.user?.id) return;

            try {
                if (userType === 'coach' || userType === 'business') {
                    const { data } = await supabase
                        .from('cs_coaches')
                        .select('subscription_status, trial_ends_at, cs_users(slug, title, full_name, avatar_url)')
                        .eq('user_id', session.user.id)
                        .single();
                    if (data) {
                        // Normalize: use cs_users for user-level fields
                        setProfile({
                            ...data,
                            slug: data.cs_users?.slug || data.slug,
                            title: data.cs_users?.title || data.title,
                            full_name: data.cs_users?.full_name || data.full_name,
                            avatar_url: data.cs_users?.avatar_url || data.avatar_url,
                        });
                    }
                } else {
                    const { data } = await supabase
                        .from('cs_users')
                        .select('slug, full_name, avatar_url, title')
                        .eq('id', session.user.id)
                        .single();
                    if (data) setProfile(data);
                }
            } catch (err) {
                // Silently fail - we'll use session metadata as fallback
            }
        };
        fetchProfile();
    }, [session?.user?.id, userType]);

    // Detect mobile viewport (match Navbar breakpoint)
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 1190);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Close dropdown when clicking outside (desktop only)
    useEffect(() => {
        if (isMobile) return;
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMobile]);

    const displayName = profile?.full_name || fullName;
    const displayAvatar = profile?.avatar_url || avatarUrl;
    const displayTitle = profile?.title
        || (userType === 'coach' ? (t('nav.coach') || 'Coach') : (t('nav.member') || 'Member'));

    const profileUrl = (userType === 'coach' || userType === 'business')
        ? (profile?.slug ? `/coach/${profile.slug}` : '/dashboard')
        : (profile?.slug ? `/u/${profile.slug}` : '/dashboard');

    // Show premium CTA for coaches who haven't had a trial yet
    const showPremiumCTA = (userType === 'coach' || userType === 'business')
        && profile
        && profile.subscription_status !== 'active'
        && profile.subscription_status !== 'trial';

    const handleNav = (path) => {
        setIsOpen(false);
        if (onNavigate) onNavigate(path);
    };

    // Shared dropdown content
    const dropdownContent = html`
        <div class="nav-user-preview" onClick=${() => handleNav(profileUrl)}>
            <img src=${displayAvatar} alt="" class="nav-user-preview-avatar" />
            <div class="nav-user-preview-info">
                <div class="nav-user-preview-name">${displayName}</div>
                <div class="nav-user-preview-title">${displayTitle}</div>
            </div>
        </div>
        <button class="nav-user-view-profile-btn" onClick=${() => handleNav(profileUrl)}>
            ${t('nav.viewProfile') || 'View Profile'}
        </button>

        <div class="nav-user-divider"></div>

        ${showPremiumCTA && html`
            <div class="nav-user-menu-item premium-cta" onClick=${() => handleNav('/pricing')}>
                <span class="nav-user-menu-icon">⭐</span>
                <span>${t('nav.tryPremium') || 'Try 1 month Premium for free'}</span>
            </div>
        `}
        <div class="nav-user-menu-item" onClick=${() => handleNav('/settings')}>
            <span class="nav-user-menu-icon">⚙️</span>
            <span>${t('nav.settingsPrivacy') || 'Settings & Privacy'}</span>
        </div>
        <div class="nav-user-menu-item" onClick=${() => handleNav('/help')}>
            <span class="nav-user-menu-icon">❓</span>
            <span>${t('nav.help') || 'Help'}</span>
        </div>

        <div class="nav-user-divider"></div>

        <div class="nav-user-menu-item signout" onClick=${() => handleNav('/signout')}>
            <span class="nav-user-menu-icon">🚪</span>
            <span>${t('nav.signOut') || 'Sign Out'}</span>
        </div>
    `;

    // Mobile: inline expandable list (inside hamburger menu)
    if (isMobile) {
        return html`
            <div class="nav-user-menu mobile-selector" ref=${dropdownRef}>
                <button
                    class="nav-avatar-btn mobile-selector-btn"
                    onClick=${() => setIsOpen(!isOpen)}
                    aria-label="User menu"
                    aria-expanded=${isOpen}
                >
                    <span class="selector-label">
                        <img src=${displayAvatar} alt="" class="nav-avatar-img-small" />
                        <span>${displayName}</span>
                    </span>
                    <span class="selector-arrow ${isOpen ? 'open' : ''}">▼</span>
                </button>
                ${isOpen && html`
                    <div class="nav-user-mobile-content">
                        ${dropdownContent}
                    </div>
                `}
            </div>
        `;
    }

    // Desktop: positioned dropdown
    return html`
        <div class="nav-user-menu" ref=${dropdownRef}>
            <button
                class="nav-avatar-btn"
                onClick=${() => setIsOpen(!isOpen)}
                aria-label="User menu"
                aria-expanded=${isOpen}
                aria-haspopup="menu"
            >
                <img src=${displayAvatar} alt=${displayName} class="nav-avatar-img" />
                <span class="nav-avatar-arrow ${isOpen ? 'open' : ''}">▼</span>
            </button>
            ${isOpen && html`
                <div class="nav-user-dropdown" role="menu">
                    ${dropdownContent}
                </div>
            `}
        </div>
    `;
}

export default NavbarUserMenu;
