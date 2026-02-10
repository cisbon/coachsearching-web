/**
 * FeedPage - Router component that shows CoachFeed or ClientFeed
 * based on the user's role (coach vs client/business)
 */
import htm from '../vendor/htm.js';
import { t } from '../i18n.js';
import { CoachFeed } from './CoachFeed.js';
import { ClientFeed } from './ClientFeed.js';

const React = window.React;
const { useState, useEffect } = React;
const html = htm.bind(React.createElement);

export function FeedPage({ session }) {
    const [userType, setUserType] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!session?.user) {
            // Not logged in - redirect to login
            window.navigateTo('/login');
            return;
        }

        const type = session.user.user_metadata?.user_type || 'client';

        // For coaches, verify they completed onboarding
        if (type === 'coach') {
            const checkOnboarding = async () => {
                try {
                    const supabase = window.supabaseClient;
                    if (!supabase) {
                        setUserType(type);
                        setLoading(false);
                        return;
                    }

                    const { data, error } = await supabase
                        .from('cs_coaches')
                        .select('onboarding_completed')
                        .eq('user_id', session.user.id)
                        .single();

                    if (error || !data?.onboarding_completed) {
                        window.navigateTo('/onboarding');
                        return;
                    }

                    setUserType('coach');
                    setLoading(false);
                } catch {
                    setUserType(type);
                    setLoading(false);
                }
            };
            checkOnboarding();
        } else {
            setUserType(type);
            setLoading(false);
        }
    }, [session]);

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
