/**
 * AccountDeletion Component
 * GDPR account deletion functionality
 */

import htm from '../../vendor/htm.js';

const React = window.React;
const { useState } = React;
const html = htm.bind(React.createElement);

// API Base URL
const API_BASE = 'https://clouedo.com/coachsearching/api';

/**
 * AccountDeletion Component
 * Allows users to permanently delete their account (GDPR compliance)
 * @param {Object} props
 * @param {Object} props.session - User session with access_token
 */
export function AccountDeletion({ session }) {
    const [showConfirm, setShowConfirm] = useState(false);
    const [reason, setReason] = useState('');
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm('This action cannot be undone. All your data will be permanently deleted.')) return;

        setDeleting(true);
        try {
            const response = await fetch(`${API_BASE}/gdpr/delete-account`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ reason })
            });

            if (response.ok) {
                alert('Account deletion scheduled. You will be logged out.');
                window.navigateTo('/signout');
            }
        } catch (error) {
            alert('Failed to delete account');
        } finally {
            setDeleting(false);
        }
    };

    return html`
        <div style=${{ border: '2px solid #DC2626', borderRadius: '8px', padding: '20px', background: '#FEF2F2' }}>
            <h3 style=${{ marginBottom: '12px', color: '#DC2626' }}>⚠️ Danger Zone</h3>
            <p style=${{ marginBottom: '16px' }}>
                Once you delete your account, there is no going back. All data will be permanently deleted.
            </p>
            ${!showConfirm ? html`
                <button
                    class="btn-secondary"
                    onClick=${() => setShowConfirm(true)}
                    style=${{ background: '#DC2626', color: 'white', border: 'none' }}
                >
                    Delete Account
                </button>
            ` : html`
                <div>
                    <textarea
                        class="form-control"
                        rows="3"
                        placeholder="Why are you leaving? (optional)"
                        value=${reason}
                        onInput=${(e) => setReason(e.target.value)}
                        style=${{ marginBottom: '12px' }}
                    ></textarea>
                    <div style=${{ display: 'flex', gap: '12px' }}>
                        <button class="btn-secondary" onClick=${() => setShowConfirm(false)}>Cancel</button>
                        <button
                            onClick=${handleDelete}
                            disabled=${deleting}
                            style=${{ padding: '8px 16px', background: '#DC2626', color: 'white', border: 'none', borderRadius: '4px' }}
                        >
                            ${deleting ? 'Deleting...' : 'Permanently Delete'}
                        </button>
                    </div>
                </div>
            `}
        </div>
    `;
}

export default AccountDeletion;
