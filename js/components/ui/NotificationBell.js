/**
 * NotificationBell Component
 * Bell icon with unread count badge for the navbar.
 * Clicking navigates to /notifications page.
 */

import htm from '../../vendor/htm.js';
import { t } from '../../i18n.js';
import { useNotificationCountQuery } from '../../hooks/useSupabaseQuery.js';

const React = window.React;
const html = htm.bind(React.createElement);

/**
 * NotificationBell Component
 * @param {Object} props
 * @param {Object} props.session - User session
 */
export const NotificationBell = ({ session }) => {
    const userId = session?.user?.id;
    const { data: unreadCount } = useNotificationCountQuery(userId);
    const count = unreadCount || 0;

    const handleClick = (e) => {
        e.preventDefault();
        if (window.navigateTo) {
            window.navigateTo('/notifications');
        }
    };

    return html`
        <button
            onClick=${handleClick}
            aria-label=${t('notifications.title') || 'Notifications'}
            style=${{
                position: 'relative',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            ${count > 0 && html`
                <span style=${{
                    position: 'absolute',
                    top: '2px',
                    right: '0px',
                    background: '#ef4444',
                    color: 'white',
                    borderRadius: '50%',
                    minWidth: '18px',
                    height: '18px',
                    fontSize: '10px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    lineHeight: '1',
                    border: '2px solid #006266',
                }}>
                    ${count > 99 ? '99+' : count}
                </span>
            `}
        </button>
    `;
};

export default NotificationBell;
