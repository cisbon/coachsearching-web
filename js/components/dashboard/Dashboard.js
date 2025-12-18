/**
 * Dashboard Component
 * Main dashboard container with tab navigation
 */

import htm from '../../vendor/htm.js';
import { t } from '../../i18n.js';
import { DashboardOverview } from './DashboardOverview.js';
import { DiscoveryRequestsDashboard } from './DiscoveryRequestsDashboard.js';
import { DashboardSubscription } from './DashboardSubscription.js';
import { DashboardArticles } from './DashboardArticles.js';
import { DashboardProfile } from './DashboardProfile.js';
import { ReferralDashboard } from '../../referrals.js';

const React = window.React;
const { useState, useEffect } = React;
const html = htm.bind(React.createElement);

/**
 * Dashboard Component
 * @param {Object} props
 * @param {Object} props.session - User session
 */
export function Dashboard({ session }) {
    const [activeTab, setActiveTab] = useState('overview');
    const [checkingOnboarding, setCheckingOnboarding] = useState(true);

    console.log('Dashboard component rendering, session:', !!session);

    const userType = session?.user?.user_metadata?.user_type || 'client';

    // Check if coach has completed onboarding - redirect if not
    useEffect(() => {
        const checkOnboardingStatus = async () => {
            if (!session || userType !== 'coach') {
                setCheckingOnboarding(false);
                return;
            }

            try {
                const supabase = window.supabaseClient;
                if (!supabase) {
                    setCheckingOnboarding(false);
                    return;
                }

                const { data: coachProfile, error } = await supabase
                    .from('cs_coaches')
                    .select('onboarding_completed')
                    .eq('user_id', session.user.id)
                    .single();

                if (error) {
                    console.log('Dashboard: Could not fetch coach profile, may not exist yet');
                    // No profile means they need to complete onboarding
                    window.navigateTo('/onboarding');
                    return;
                }

                if (!coachProfile?.onboarding_completed) {
                    console.log('Dashboard: Coach onboarding not complete, redirecting...');
                    window.navigateTo('/onboarding');
                    return;
                }

                setCheckingOnboarding(false);
            } catch (err) {
                console.error('Dashboard: Error checking onboarding status:', err);
                setCheckingOnboarding(false);
            }
        };

        checkOnboardingStatus();
    }, [session, userType]);

    // Listen for custom tab switching events from dashboard overview
    useEffect(() => {
        const handleTabSwitch = (event) => {
            setActiveTab(event.detail);
        };
        window.addEventListener('switchTab', handleTabSwitch);
        return () => window.removeEventListener('switchTab', handleTabSwitch);
    }, []);

    if (!session || checkingOnboarding) {
        console.log('No session in Dashboard or checking onboarding, waiting...');
        return html`
            <div class="container" style=${{ marginTop: '100px', textAlign: 'center' }}>
                <div class="spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        `;
    }
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
}

export default Dashboard;
