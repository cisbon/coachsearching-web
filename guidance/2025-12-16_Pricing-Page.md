# Guidance: Pricing Page

**Created:** 2025-12-16 | **Updated:** 2025-12-16

## Goal
Create a comprehensive, professional pricing page for CoachSearching's freemium model targeting European coaches. Key differentiator: NO commission on coaching sessions.

## Pricing Structure

### Free Tier (€0/forever)
- Profile listing (photo, bio, credentials)
- Appear in search results
- Up to 3 specializations
- Client reviews displayed
- Shareable profile link
- 1 discovery call slot per week
- **Limits:** Bio 300 chars, 1 photo, no video

### Premium Tier
- **Monthly:** €29/month
- **Yearly:** €261/year (€21.75/month) - Save 25%
- **Launch Offer:** €19/month for first year (limited to 100 coaches)

**Premium Features:**
- Everything in Free, plus:
- Unlimited discovery call slots
- Priority search placement + "Featured Coach" badge
- Extended bio (1000 characters)
- Up to 5 photos + video introduction
- Up to 8 specializations
- "My Approach" section
- Custom FAQ (3 Q&As)
- Coach Notes CRM
- Profile analytics

## Page Structure
1. Hero section with transparent pricing message
2. Launch offer banner (€19/month, limited to 100)
3. Billing toggle (Monthly/Yearly)
4. Two pricing cards side by side
5. Feature comparison table
6. FAQ section (7 questions)
7. Bottom CTA section

## Files Modified
- `js/pages/PricingPage.js` - Complete rewrite with new structure
- `css/pricing-page.css` - New polished design
- `js/i18n.js` - Added EN and DE translations (~100 new keys each)

## Design Philosophy
- Clean, modern, trustworthy (targeting professional coaches)
- Generous whitespace
- Premium feels aspirational but not pushy
- Free feels genuine, not crippled
- Mobile-first, Premium card shown first on mobile
- No aggressive sales tactics or fake urgency

## Translation Keys Added
All pricing.* keys including:
- Page titles, hero text
- Card features (pricing.card.*)
- Feature table (pricing.features.*)
- FAQ questions and answers (pricing.faq.*)

## Route
- `/pricing` (removed from main nav, only for coach registration flow)
- Still in footer under Company column

## Key Messaging
- "No commission on your sessions. No hidden fees."
- "Get discovered by clients" (Free tagline)
- "Grow your coaching practice" (Premium tagline)
