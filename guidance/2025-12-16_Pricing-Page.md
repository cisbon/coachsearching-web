# Guidance: Pricing Page

**Created:** 2025-12-16

## Goal
Create a responsive pricing page with Free vs Premium tier comparison for coaches.

## Tasks
- [x] Create PricingPage.js component with data-driven feature list
- [x] Add route for /pricing in app.js
- [x] Add export to pages/index.js
- [x] Create CSS styles (pricing-page.css)
- [x] Import CSS in styles.css
- [x] Add Pricing link to Navbar
- [x] Add Pricing link to Footer (Company column)
- [x] Update version to v1.14.0
- [x] Update STATUS.md
- [x] Commit and push

## Files Modified
- `js/pages/PricingPage.js` - New pricing page component
- `js/pages/index.js` - Added PricingPage export
- `js/app.js` - Added import, route, Navbar link, Footer link, version bump
- `css/pricing-page.css` - New CSS file for pricing page styles
- `styles.css` - Added pricing-page.css import
- `docs/STATUS.md` - Updated recent changes

## Pricing Structure
- **Free Tier (€0/forever)**: Basic profile, standard ranking, 4 discovery slots/week, reviews, basic calendar
- **Premium Tier (€39/month or €349/year - 25% savings)**: Enhanced profile with video, priority placement + Featured badge, unlimited slots, Coach Notes CRM, analytics, calendar sync, marketing toolkit, priority support

## Features
- Monthly/yearly pricing toggle (saves 25% annually)
- Two-column card layout
- Feature comparison table
- Responsive design (mobile-first)
- FAQ accordion section
- Testimonial section
- CTA section at bottom

## Design Patterns
- Matches existing SEO content pages (FAQ, About, How It Works)
- Uses project's petrol color palette
- Data-driven feature list for easy maintenance
- Translation-ready with `t()` function fallbacks
