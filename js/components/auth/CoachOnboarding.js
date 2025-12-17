/**
 * Coach Onboarding Component
 * Wrapper that uses the new Premium Coach Onboarding experience
 */

import htm from '../../vendor/htm.js';
import { PremiumCoachOnboarding } from '../onboarding/PremiumCoachOnboarding.js';

const React = window.React;
const html = htm.bind(React.createElement);

/**
 * CoachOnboarding Component
 * Renders the premium onboarding experience for coaches
 *
 * @param {Object} props
 * @param {Object} props.session - User session from Supabase
 */
export function CoachOnboarding({ session }) {
    const handleComplete = (result) => {
        console.log('Onboarding completed:', result);
        // Navigation is handled by the PremiumCoachOnboarding component
    };

    return html`<${PremiumCoachOnboarding} session=${session} onComplete=${handleComplete} />`;
}

export default CoachOnboarding;
