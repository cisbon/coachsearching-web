/**
 * Dashboard Component
 * Main dashboard container with tab navigation
 *
 * NOTE: This component currently relies on inline sub-components from app.js.
 * Sub-components to be extracted:
 * - DashboardOverview
 * - DiscoveryRequestsDashboard
 * - DashboardSubscription
 * - DashboardArticles
 * - ReferralDashboard (already in js/referrals.js)
 * - DashboardProfile
 */

import htm from '../../vendor/htm.js';
import { t } from '../../i18n.js';

const React = window.React;
const { useState, useEffect } = React;
const html = htm.bind(React.createElement);

/**
 * Dashboard Component
 * @param {Object} props
 * @param {Object} props.session - User session
 * @param {Object} props.components - Sub-components to render (passed from app.js)
 */
export function Dashboard({ session, components = {} }) {
    const [activeTab, setActiveTab] = useState('overview');

    const {
        DashboardOverview,
        DiscoveryRequestsDashboard,
        DashboardSubscription,
        DashboardArticles,
        ReferralDashboard,
        DashboardProfile
    } = components;

    // Listen for custom tab switching events from dashboard overview
    useEffect(() => {
        const handleTabSwitch = (event) => {
            setActiveTab(event.detail);
        };
        window.addEventListener('switchTab', handleTabSwitch);
        return () => window.removeEventListener('switchTab', handleTabSwitch);
    }, []);

    if (!session) {
        return html`
            <div class="container" style=${{ marginTop: '100px', textAlign: 'center' }}>
                <div class="spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        `;
    }

    const userType = session.user?.user_metadata?.user_type || 'client';

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

            ${activeTab === 'overview' && DashboardOverview && html`<${DashboardOverview} userType=${userType} session=${session} />`}
            ${activeTab === 'discovery_requests' && userType === 'coach' && DiscoveryRequestsDashboard && html`<${DiscoveryRequestsDashboard} session=${session} />`}
            ${activeTab === 'subscription' && userType === 'coach' && DashboardSubscription && html`<${DashboardSubscription} session=${session} />`}
            ${activeTab === 'articles' && userType === 'coach' && DashboardArticles && html`<${DashboardArticles} session=${session} />`}
            ${activeTab === 'referrals' && ReferralDashboard && html`<${ReferralDashboard} session=${session} />`}
            ${activeTab === 'profile' && DashboardProfile && html`<${DashboardProfile} session=${session} userType=${userType} />`}
        </div>
    `;
}

export default Dashboard;
