/**
 * Dashboard Subscription Component
 * Coach subscription management - status, pricing, subscribe
 */

import htm from '../../vendor/htm.js';
import { t } from '../../i18n.js';

const React = window.React;
const { useState, useEffect } = React;
const html = htm.bind(React.createElement);

/**
 * DashboardSubscription Component
 * @param {Object} props
 * @param {Object} props.session - User session
 */
export function DashboardSubscription({ session }) {
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState('');

    const YEARLY_PRICE = 50; // €50/year
    const TRIAL_DAYS = 14;

    useEffect(() => {
        loadSubscription();
    }, []);

    const loadSubscription = async () => {
        setLoading(true);
        try {
            const { data, error } = await window.supabaseClient
                .from('cs_coaches')
                .select('subscription_status, trial_ends_at, subscription_ends_at, stripe_subscription_id')
                .eq('id', session.user.id)
                .single();

            if (error) throw error;
            setSubscription(data);
        } catch (err) {
            console.error('Error loading subscription:', err);
            setMessage('Failed to load subscription data');
        } finally {
            setLoading(false);
        }
    };

    const getSubscriptionStatus = () => {
        if (!subscription) return { status: 'unknown', label: 'Unknown', color: 'gray' };

        const now = new Date();

        if (subscription.subscription_status === 'active' && subscription.subscription_ends_at) {
            const endsAt = new Date(subscription.subscription_ends_at);
            if (endsAt > now) {
                return { status: 'active', label: t('subscription.active') || 'Active', color: 'green', endsAt };
            } else {
                return { status: 'expired', label: t('subscription.expired') || 'Expired', color: 'red' };
            }
        }

        if (subscription.subscription_status === 'trial' && subscription.trial_ends_at) {
            const trialEnds = new Date(subscription.trial_ends_at);
            const daysLeft = Math.ceil((trialEnds - now) / (1000 * 60 * 60 * 24));

            if (daysLeft > 0) {
                return { status: 'trial', label: t('subscription.trial') || 'Free Trial', color: 'blue', daysLeft, endsAt: trialEnds };
            } else {
                return { status: 'trial_expired', label: t('subscription.trialExpired') || 'Trial Expired', color: 'orange' };
            }
        }

        if (subscription.subscription_status === 'expired') {
            return { status: 'expired', label: t('subscription.expired') || 'Expired', color: 'red' };
        }

        if (subscription.subscription_status === 'cancelled') {
            return { status: 'cancelled', label: t('subscription.cancelled') || 'Cancelled', color: 'gray' };
        }

        return { status: 'unknown', label: 'Unknown', color: 'gray' };
    };

    const handleSubscribe = async () => {
        setProcessing(true);
        setMessage('');

        try {
            // Create Stripe checkout session
            const response = await fetch('/api/create-subscription-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    coach_id: session.user.id,
                    price_amount: YEARLY_PRICE * 100, // Convert to cents
                    success_url: window.location.origin + '/dashboard?subscription=success',
                    cancel_url: window.location.origin + '/dashboard?subscription=cancelled'
                })
            });

            const result = await response.json();

            if (result.url) {
                window.location.href = result.url;
            } else {
                throw new Error(result.error || 'Failed to create checkout session');
            }
        } catch (err) {
            console.error('Subscription error:', err);
            setMessage(t('subscription.errorGeneric') || 'Failed to start subscription. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    const statusInfo = getSubscriptionStatus();

    if (loading) {
        return html`<div class="dashboard-section"><div class="spinner"></div></div>`;
    }

    return html`
        <div class="dashboard-section subscription-dashboard">
            <h3 class="section-title">${t('subscription.title') || 'Your Subscription'}</h3>

            <!-- Current Status Card -->
            <div class="subscription-status-card status-${statusInfo.status}">
                <div class="status-header">
                    <span class="status-badge ${statusInfo.color}">${statusInfo.label}</span>
                    ${statusInfo.daysLeft !== undefined && html`
                        <span class="days-left">${statusInfo.daysLeft} ${t('subscription.daysLeft') || 'days left'}</span>
                    `}
                </div>

                ${statusInfo.status === 'trial' && html`
                    <div class="status-message">
                        <p>${t('subscription.trialMessage') || 'You are currently on a free trial. Your profile is visible to clients.'}</p>
                        <p class="trial-ends">${t('subscription.trialEnds') || 'Trial ends'}: ${new Date(statusInfo.endsAt).toLocaleDateString()}</p>
                    </div>
                `}

                ${statusInfo.status === 'active' && html`
                    <div class="status-message">
                        <p>${t('subscription.activeMessage') || 'Your subscription is active. Your profile is visible to clients.'}</p>
                        <p class="renewal-date">${t('subscription.renewsOn') || 'Renews on'}: ${new Date(statusInfo.endsAt).toLocaleDateString()}</p>
                    </div>
                `}

                ${(statusInfo.status === 'expired' || statusInfo.status === 'trial_expired') && html`
                    <div class="status-message warning">
                        <p>${t('subscription.expiredMessage') || 'Your subscription has expired. Your profile is hidden from clients.'}</p>
                        <p>${t('subscription.subscribeToReactivate') || 'Subscribe now to make your profile visible again.'}</p>
                    </div>
                `}
            </div>

            <!-- Pricing Card -->
            <div class="subscription-pricing-card">
                <h4>${t('subscription.yearlyPlan') || 'Yearly Subscription'}</h4>
                <div class="price-display">
                    <span class="price-amount">€${YEARLY_PRICE}</span>
                    <span class="price-period">/${t('subscription.year') || 'year'}</span>
                </div>
                <ul class="plan-features">
                    <li>✓ ${t('subscription.feature1') || 'Profile visible to all clients'}</li>
                    <li>✓ ${t('subscription.feature2') || 'Unlimited discovery call requests'}</li>
                    <li>✓ ${t('subscription.feature3') || 'Publish articles & insights'}</li>
                    <li>✓ ${t('subscription.feature4') || 'Client reviews & ratings'}</li>
                    <li>✓ ${t('subscription.feature5') || 'Priority support'}</li>
                </ul>

                ${(statusInfo.status === 'trial' || statusInfo.status === 'trial_expired' || statusInfo.status === 'expired') && html`
                    <button
                        class="btn-primary btn-subscribe"
                        onClick=${handleSubscribe}
                        disabled=${processing}
                    >
                        ${processing
                            ? (t('subscription.processing') || 'Processing...')
                            : (t('subscription.subscribeNow') || 'Subscribe Now - €' + YEARLY_PRICE + '/year')
                        }
                    </button>
                `}

                ${statusInfo.status === 'active' && html`
                    <button class="btn-secondary" disabled>
                        ${t('subscription.currentPlan') || 'Current Plan'}
                    </button>
                `}
            </div>

            ${message && html`
                <div class="message error">${message}</div>
            `}

            <!-- FAQ -->
            <div class="subscription-faq">
                <h4>${t('subscription.faq') || 'Frequently Asked Questions'}</h4>
                <details>
                    <summary>${t('subscription.faq1Question') || 'What happens after my trial ends?'}</summary>
                    <p>${t('subscription.faq1Answer') || 'After your 14-day trial, your profile will be hidden from clients until you subscribe. Your data will be preserved.'}</p>
                </details>
                <details>
                    <summary>${t('subscription.faq2Question') || 'Can I cancel anytime?'}</summary>
                    <p>${t('subscription.faq2Answer') || 'Yes, you can cancel your subscription anytime. Your profile will remain active until the end of your billing period.'}</p>
                </details>
                <details>
                    <summary>${t('subscription.faq3Question') || 'How do discovery calls work?'}</summary>
                    <p>${t('subscription.faq3Answer') || 'Clients can request a free discovery call through your profile. You will be notified and can contact them directly to schedule the call.'}</p>
                </details>
            </div>
        </div>
    `;
}

export default DashboardSubscription;
