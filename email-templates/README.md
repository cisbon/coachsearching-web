# CoachSearching Email Templates

Professional, branded email templates for all transactional emails on the CoachSearching platform.

## 📧 Available Templates

### 1. **Welcome Email** (`welcome.html`)
**When to send:** Immediately after user registration
**Recipients:** All new users (clients and coaches)
**Key features:**
- Personalized greeting based on user type
- Different content for coaches vs. clients
- Founding coach promotion (10% commission)
- Welcome promo code for clients (WELCOME15)
- CTA to complete profile or browse coaches

**Variables:**
```
{{first_name}}
{{user_type_greeting}} - e.g., "coaches" or "clients seeking expert guidance"
{{is_coach}} - boolean
{{dashboard_url}}
{{browse_coaches_url}}
{{settings_url}}
{{help_url}}
{{privacy_url}}
{{support_url}}
```

---

### 2. **Booking Confirmation** (`booking-confirmation.html`)
**When to send:** Immediately after a booking is confirmed and payment processed
**Recipients:** Client who made the booking
**Key features:**
- Visual confirmation with success icon
- Complete session details in branded card
- Calendar integration link
- Meeting link for online sessions
- Payment confirmation with invoice number
- Cancellation policy reminder

**Variables:**
```
{{client_name}}
{{coach_name}}
{{service_name}}
{{session_date}} - e.g., "Monday, November 27, 2025"
{{session_time}} - e.g., "14:00"
{{timezone}} - e.g., "CET"
{{duration}} - in minutes
{{location_type}} - e.g., "Video Call" or "In Person"
{{meeting_link}} - optional, for online sessions
{{calendar_link}} - .ics download link
{{booking_details_url}}
{{total_amount}}
{{invoice_number}}
{{coach_message}} - optional pre-session message
{{is_online}} - boolean
{{cancellation_policy}}
{{cancellation_url}}
{{message_coach_url}}
{{booking_id}}
{{dashboard_url}}
{{support_url}}
{{help_url}}
```

---

### 3. **Booking Reminder** (`booking-reminder.html`)
**When to send:** 24 hours before the scheduled session
**Recipients:** Client with upcoming session
**Key features:**
- Prominent "Tomorrow" badge
- Large, clear date and time display
- Video call link (if applicable)
- Pre-session checklist
- Coach preparation notes (if provided)
- Easy reschedule/cancel options

**Variables:**
```
{{client_name}}
{{coach_name}}
{{session_date}}
{{session_time}}
{{timezone}}
{{service_name}}
{{duration}}
{{location_type}}
{{meeting_link}} - optional
{{is_online}} - boolean
{{location_details_url}}
{{location_address}} - for in-person sessions
{{calendar_link}}
{{coach_preparation_notes}} - optional
{{reschedule_url}}
{{cancel_url}}
{{cancellation_policy}}
{{message_url}}
{{booking_id}}
{{dashboard_url}}
{{support_url}}
{{help_url}}
```

---

### 4. **Review Request** (`review-request.html`)
**When to send:** 2-4 hours after a session is completed
**Recipients:** Client who attended the session
**Key features:**
- Coach profile card with avatar
- Visual star rating prompt
- Guidelines on what to include in review
- Privacy notice about public reviews
- Option to book again with same coach
- Unsubscribe option for review emails

**Variables:**
```
{{client_name}}
{{coach_name}}
{{coach_avatar_url}} - optional
{{coach_initials}} - fallback if no avatar
{{service_name}}
{{session_date}}
{{duration}}
{{review_url}} - direct link to write review
{{book_again_url}}
{{unsubscribe_review_emails}}
{{booking_id}}
{{dashboard_url}}
{{browse_coaches_url}}
{{support_url}}
```

---

### 5. **Payment Confirmation** (`payment-confirmation.html`)
**When to send:** Immediately after payment is successfully processed
**Recipients:** Client who made the payment
**Key features:**
- Professional invoice layout
- Complete billing details
- Itemized breakdown with discounts, fees, VAT
- Payment method details
- PDF invoice download link
- Business account VAT notice (if applicable)

**Variables:**
```
{{client_name}}
{{invoice_number}}
{{invoice_date}}
{{client_email}}
{{billing_address}} - optional
{{coach_name}}
{{coach_specialty}}
{{service_name}}
{{session_date}}
{{session_time}}
{{duration}}
{{service_price}}
{{discount_amount}} - optional
{{discount_code}} - optional
{{platform_fee}}
{{vat_amount}} - optional
{{vat_rate}} - optional
{{total_amount}}
{{payment_method}} - e.g., "Visa", "Mastercard"
{{card_last4}}
{{transaction_id}}
{{download_invoice_url}}
{{booking_details_url}}
{{refund_policy}}
{{is_business_account}} - boolean
{{company_address}}
{{company_vat_number}}
{{dashboard_url}}
{{invoice_history_url}}
{{support_url}}
{{help_url}}
```

---

### 6. **Payout Notification** (`payout-notification.html`)
**When to send:** Every Monday when weekly payouts are processed
**Recipients:** Coaches receiving payouts
**Key features:**
- Large payout amount display
- Complete earnings breakdown
- Commission details (10% or 15%)
- Performance metrics for the period
- Founding coach badge (if applicable)
- Tax information notice
- Expected arrival date

**Variables:**
```
{{coach_name}}
{{payout_amount}}
{{period_start}} - e.g., "Nov 20, 2025"
{{period_end}} - e.g., "Nov 26, 2025"
{{payout_id}}
{{bank_account_last4}}
{{arrival_date}}
{{session_count}}
{{gross_revenue}}
{{commission_rate}} - 10 or 15
{{platform_fee}}
{{refunds_amount}} - optional
{{refunds_count}} - optional
{{adjustments_amount}} - optional
{{adjustments_note}} - optional
{{is_founding_coach}} - boolean
{{founding_rate_expires}} - date
{{avg_rating}}
{{total_hours}}
{{new_clients}}
{{earnings_dashboard_url}}
{{download_statement_url}}
{{tax_documents_url}}
{{support_url}}
{{payout_history_url}}
{{company_address}}
{{company_registration}}
```

---

### 7. **Password Reset** (`password-reset.html`)
**When to send:** When user requests password reset
**Recipients:** User who requested password reset
**Key features:**
- Clear security warning
- Large reset button with backup link
- Verification code (alternative method)
- Expiry time warning
- Security tips for strong passwords
- Request details (IP, location, device) for security
- Clear instructions if request wasn't made by user

**Variables:**
```
{{user_name}}
{{email}}
{{reset_link}}
{{expiry_time}} - e.g., "1 hour"
{{verification_code}} - optional 6-digit code
{{request_time}}
{{request_ip}}
{{request_location}}
{{request_device}}
{{support_url}}
{{help_url}}
{{security_url}}
```

---

## 🎨 Design System

### Colors
- **Primary Petrol:** `#006A67`
- **Primary Petrol Light:** `#008C87`
- **Success Green:** `#4CAF50`
- **Warning Orange:** `#FF9800`
- **Background:** `#f5f5f5`
- **Card Background:** `#f9f9f9`
- **Accent Background:** `#E8F5F4`

### Typography
- **Font Stack:** -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif
- **Headers:** 24-48px, weight 600-700
- **Body:** 14-16px, line-height 1.6
- **Small Text:** 12-13px

### Components
- **Gradient Header:** All emails use consistent branded header
- **Buttons:** 14-16px padding, 6px border-radius, #006A67 background
- **Info Boxes:** Left border accent with background color
- **Cards:** 12px border-radius, padding 20-40px
- **Footer:** Consistent across all emails with links and legal info

---

## 🔧 Implementation Guide

### Backend Integration

#### PHP Example (using PHPMailer)

```php
<?php
use PHPMailer\PHPMailer\PHPMailer;

function sendEmail($template, $to, $subject, $data) {
    $mail = new PHPMailer(true);

    // Load template
    $html = file_get_contents(__DIR__ . "/email-templates/{$template}.html");

    // Replace variables with Handlebars-style syntax
    foreach ($data as $key => $value) {
        if (is_bool($value)) {
            // Handle conditionals
            if ($value) {
                $html = preg_replace('/\{\{#if ' . $key . '\}\}(.*?)\{\{\/if\}\}/s', '$1', $html);
            } else {
                $html = preg_replace('/\{\{#if ' . $key . '\}\}(.*?)\{\{\/if\}\}/s', '', $html);
            }
        } else {
            // Replace simple variables
            $html = str_replace('{{' . $key . '}}', htmlspecialchars($value), $html);
        }
    }

    // Clean up unused conditionals
    $html = preg_replace('/\{\{#if .*?\}\}.*?\{\{\/if\}\}/s', '', $html);
    $html = preg_replace('/\{\{.*?\}\}/', '', $html);

    // Configure mail
    $mail->isHTML(true);
    $mail->setFrom('noreply@coachsearching.com', 'CoachSearching');
    $mail->addAddress($to);
    $mail->Subject = $subject;
    $mail->Body = $html;

    // Send
    $mail->send();
}

// Usage example: Welcome email
sendEmail('welcome', 'user@example.com', 'Welcome to CoachSearching!', [
    'first_name' => 'John',
    'user_type_greeting' => 'clients seeking expert guidance',
    'is_coach' => false,
    'dashboard_url' => 'https://coachsearching.com/dashboard',
    'browse_coaches_url' => 'https://coachsearching.com/coaches',
    'settings_url' => 'https://coachsearching.com/settings',
    'help_url' => 'https://coachsearching.com/help',
    'privacy_url' => 'https://coachsearching.com/privacy',
    'support_url' => 'https://coachsearching.com/support'
]);
```

#### Node.js Example (using Handlebars)

```javascript
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;

async function sendEmail(template, to, subject, data) {
    // Load and compile template
    const html = await fs.readFile(`./email-templates/${template}.html`, 'utf8');
    const compiled = handlebars.compile(html);
    const finalHtml = compiled(data);

    // Create transporter
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: 587,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    // Send email
    await transporter.sendMail({
        from: 'CoachSearching <noreply@coachsearching.com>',
        to: to,
        subject: subject,
        html: finalHtml
    });
}

// Usage example: Booking confirmation
await sendEmail('booking-confirmation', 'client@example.com', 'Booking Confirmed!', {
    client_name: 'Sarah',
    coach_name: 'Dr. Michael Schmidt',
    service_name: 'Executive Coaching Session',
    session_date: 'Monday, November 27, 2025',
    session_time: '14:00',
    timezone: 'CET',
    duration: 60,
    location_type: 'Video Call',
    meeting_link: 'https://meet.example.com/abc123',
    is_online: true,
    total_amount: '150.00',
    invoice_number: 'INV-2025-001234',
    // ... other variables
});
```

---

## 📋 Testing Checklist

Before going live, test each template:

- [ ] All variables render correctly
- [ ] Conditional sections ({{#if}}) work properly
- [ ] Links are clickable and go to correct URLs
- [ ] Images load (if any)
- [ ] Mobile responsive (test on phone)
- [ ] Renders correctly in major email clients:
  - [ ] Gmail (web and mobile)
  - [ ] Outlook (desktop and web)
  - [ ] Apple Mail
  - [ ] Yahoo Mail
- [ ] Plain text fallback works
- [ ] Unsubscribe links function
- [ ] No spelling or grammar errors
- [ ] Brand colors match design system

---

## 🚀 Deployment

### Production Checklist

1. **Update all placeholder URLs** to production domains
2. **Configure SMTP settings** with proper credentials
3. **Set up email tracking** (opens, clicks) if desired
4. **Configure SPF, DKIM, DMARC** records for deliverability
5. **Test deliverability** with tools like Mail Tester
6. **Set up monitoring** for bounce rates and delivery failures
7. **Prepare text-only versions** for all templates
8. **Implement rate limiting** to prevent spam
9. **Add unsubscribe functionality** for marketing emails
10. **Ensure GDPR compliance** (consent, data handling)

### Email Service Recommendations

- **SendGrid** - Reliable, good API, free tier available
- **Postmark** - Excellent deliverability for transactional emails
- **Amazon SES** - Cost-effective for high volume
- **Mailgun** - Good developer experience
- **Brevo (Sendinblue)** - European provider, GDPR compliant

---

## 📊 Email Analytics

Track these metrics for each template:

- **Open Rate** - Industry avg: 20-25% for transactional
- **Click Rate** - Varies by email type
- **Bounce Rate** - Should be <2%
- **Unsubscribe Rate** - Should be <0.1% for transactional
- **Spam Complaints** - Should be <0.01%

---

## 🔄 Maintenance

### Regular Updates

- Review email content quarterly for relevance
- Update commission rates if they change
- Refresh design annually to stay modern
- A/B test subject lines and CTAs
- Monitor user feedback and complaints

---

## 💡 Best Practices

1. **Subject Lines:**
   - Keep under 50 characters
   - Be specific and actionable
   - Avoid spam trigger words (FREE, URGENT, etc.)
   - Personalize when possible

2. **Content:**
   - Front-load important information
   - Use clear, scannable layout
   - Include clear CTAs
   - Keep paragraphs short
   - Use bullet points for lists

3. **Technical:**
   - Always include plain text version
   - Keep HTML under 102KB
   - Optimize images (<200KB total)
   - Test before sending
   - Include unsubscribe link

4. **Deliverability:**
   - Authenticate your domain (SPF, DKIM, DMARC)
   - Maintain clean email lists
   - Monitor bounce rates
   - Avoid spam trigger words
   - Send from consistent domain

---

## 📞 Support

For questions about email templates:
- Technical issues: support@coachsearching.com
- Design requests: design@coachsearching.com
- Deliverability: Email service provider support

---

**Last Updated:** November 26, 2025
**Version:** 1.0.0
**License:** Proprietary - CoachSearching.com
