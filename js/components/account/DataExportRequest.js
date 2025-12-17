/**
 * DataExportRequest Component
 * GDPR data export request functionality
 */

import htm from '../../vendor/htm.js';

const React = window.React;
const { useState } = React;
const html = htm.bind(React.createElement);

// API Base URL
const API_BASE = 'https://clouedo.com/coachsearching/api';

/**
 * DataExportRequest Component
 * Allows users to request a complete export of their data (GDPR compliance)
 * @param {Object} props
 * @param {Object} props.session - User session with access_token
 */
export function DataExportRequest({ session }) {
    const [requesting, setRequesting] = useState(false);
    const [message, setMessage] = useState('');

    const requestDataExport = async () => {
        setRequesting(true);
        try {
            const response = await fetch(`${API_BASE}/gdpr/data-export`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            if (response.ok) {
                setMessage('Data export requested. You will receive an email with download link within 24 hours.');
            } else {
                setMessage('Error: Failed to request data export');
            }
        } catch (error) {
            setMessage('Error: Failed to submit request');
        } finally {
            setRequesting(false);
        }
    };

    return html`
        <div style=${{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
            <h3 style=${{ marginBottom: '12px' }}>Export Your Data</h3>
            <p style=${{ marginBottom: '16px', color: 'var(--text-muted)' }}>
                Download a complete copy of all your data including profile, bookings, messages, and reviews.
            </p>
            ${message && html`
                <div style=${{ padding: '12px', borderRadius: '4px', marginBottom: '16px', background: message.includes('Error') ? '#fee' : '#efe' }}>
                    ${message}
                </div>
            `}
            <button class="btn-primary" onClick=${requestDataExport} disabled=${requesting}>
                ${requesting ? 'Processing...' : 'Request Data Export'}
            </button>
        </div>
    `;
}

export default DataExportRequest;
