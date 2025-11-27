/**
 * Legal Content Data
 * Contains legal texts for imprint, privacy policy, and terms of service
 */

import htm from '../vendor/htm.js';
const html = htm.bind(window.React.createElement);

export const legalContent = {
    imprint: {
        title: 'Imprint',
        content: html`
            <h3>coachsearching.com</h3>
            <h2>Information according to § 5 TMG</h2>
            <p><strong>Represented by:</strong><br/>Michael Gross</p>
            <p><strong>Contact:</strong><br/>Email: legal[at]coachsearching.com</p>
        `
    },
    privacy: {
        title: 'Privacy Policy',
        content: html`
            <h3>1. Data Protection Overview</h3>
            <p>General information about what happens to your personal data when you visit our website.</p>
            <h3>2. Hosting</h3>
            <p>We host our content via GitHub Pages and use Supabase for our database.</p>
            <h3>3. Data Collection</h3>
            <p>We collect data when you register, book a coach, or contact us. This includes name, email, and payment info.</p>
            <h3>4. Analytics</h3>
            <p>We use cookies to analyze website traffic and improve user experience.</p>
        `
    },
    terms: {
        title: 'Terms of Service',
        content: html`
            <h3>1. Scope</h3>
            <p>These terms apply to all business relations between the customer and coachsearching.com.</p>
            <h3>2. Services</h3>
            <p>coachsearching.com provides a platform to connect clients with professional coaches.</p>
            <h3>3. Booking & Payment</h3>
            <p>Bookings are binding. Payments are processed via Stripe.</p>
            <h3>4. Liability</h3>
            <p>coachsearching.com not liable for the content or quality of the coaching sessions provided by independent coaches.</p>
        `
    }
};

export default legalContent;
