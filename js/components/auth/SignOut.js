/**
 * SignOut Component
 * Sign out confirmation page
 */

import htm from '../../vendor/htm.js';

const React = window.React;
const { useState } = React;
const html = htm.bind(React.createElement);

/**
 * SignOut Component
 * Displays sign out confirmation with cancel/confirm options
 */
export function SignOut() {
    const [confirming, setConfirming] = useState(false);

    const handleSignOut = async () => {
        console.log('LOGOUT: Starting sign out process...');
        setConfirming(true);

        if (!window.supabaseClient) {
            console.error('LOGOUT: Supabase client not found!');
            alert('Cannot sign out - please refresh and try again');
            return;
        }

        try {
            console.log('LOGOUT: Calling supabaseClient.auth.signOut()...');
            const { error } = await window.supabaseClient.auth.signOut();

            if (error) {
                console.error('LOGOUT: Sign out returned error:', error);
                throw error;
            }

            console.log('LOGOUT: Sign out API call successful');
            console.log('LOGOUT: Redirecting to home...');
            window.navigateTo('/home');

            console.log('LOGOUT: Reloading page to clear session...');
            setTimeout(() => {
                window.location.reload();
            }, 200);
        } catch (error) {
            console.error('LOGOUT: Exception during sign out:', error);
            alert('Failed to sign out: ' + error.message);
            setConfirming(false);
        }
    };

    return html`
        <div class="signout-container">
            <div class="signout-card">
                <div class="signout-icon">👋</div>
                <h2>Sign Out</h2>
                <p>Are you sure you want to sign out? You'll need to log in again to access your dashboard.</p>
                <div class="signout-actions">
                    <button class="btn-secondary" onClick=${() => window.navigateTo('/dashboard')} disabled=${confirming}>
                        Cancel
                    </button>
                    <button class="btn-primary" onClick=${handleSignOut} disabled=${confirming}>
                        ${confirming ? 'Signing Out...' : 'Yes, Sign Out'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

export default SignOut;
