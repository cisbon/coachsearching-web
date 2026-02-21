/**
 * NotificationBell Component
 * Bell icon with unread count badge for the navbar.
 * Turns golden when there are pending chemistry call requests.
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
    const { data: notifData } = useNotificationCountQuery(userId);

    // Support both old (number) and new (object) format
    const count = typeof notifData === 'object' ? (notifData?.total || 0) : (notifData || 0);
    const hasChemistryCall = typeof notifData === 'object' ? notifData?.hasChemistryCall : false;

    const handleClick = (e) => {
        e.preventDefault();
        if (window.navigateTo) {
            window.navigateTo('/notifications');
        }
    };

    // Golden bell color when there are chemistry call requests
    const bellColor = hasChemistryCall ? '#fbbf24' : 'white';

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
            <svg width="22" height="22" viewBox="0 0 24 24" fill=${hasChemistryCall ? '#fbbf24' : 'none'} stroke=${bellColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            ${count > 0 && html`
                <span style=${{
                    position: 'absolute',
                    top: '2px',
                    right: '0px',
                    background: hasChemistryCall ? '#f59e0b' : '#ef4444',
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
