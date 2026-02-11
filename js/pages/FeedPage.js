/**
 * FeedPage - Router component that shows CoachFeed or ClientFeed
 * based on the user's role (coach vs client/business)
 */
import htm from '../vendor/htm.js';
import { t } from '../i18n.js';
import { CoachFeed } from './CoachFeed.js';
import { ClientFeed } from './ClientFeed.js';
import { useOnboardingStatusQuery } from '../hooks/useSupabaseQuery.js';

const React = window.React;
const { useState, useEffect } = React;
const html = htm.bind(React.createElement);

export function FeedPage({ session, sessionLoaded }) {
    const [userType, setUserType] = useState(null);
    const [loading, setLoading] = useState(true);

    const type = session?.user?.user_metadata?.user_type || 'client';
    const isCoach = type === 'coach';

    // Cached onboarding check via TanStack Query (only for coaches)
    const { data: onboardingData, isLoading: onboardingLoading } = useOnboardingStatusQuery(
        isCoach ? session?.user?.id : null
    );

    useEffect(() => {
        if (!session?.user) {
            if (!sessionLoaded) return;
            window.navigateTo('/login');
            return;
        }

        if (isCoach) {
            if (onboardingLoading) return;
            if (!onboardingData?.onboarding_completed) {
                window.navigateTo('/onboarding');
                return;
            }
            setUserType('coach');
            setLoading(false);
        } else {
            setUserType(type);
            setLoading(false);
        }
    }, [session, sessionLoaded, isCoach, onboardingData, onboardingLoading]);

    if (loading) {
        return html`
            <div class="feed-page">
                <div class="feed-loading">
                    <div class="feed-loading-spinner"></div>
                    <p>${t('feed.loading') || 'Loading...'}</p>
                </div>
            </div>
        `;
    }

    if (userType === 'coach') {
        return html`<${CoachFeed} session=${session} />`;
    }

    return html`<${ClientFeed} session=${session} />`;
}

export default FeedPage;
