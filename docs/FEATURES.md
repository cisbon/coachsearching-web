# CoachSearching Feature Documentation

## Feature Status Legend

| Status | Meaning |
|--------|---------|
| ✅ | Complete and production-ready |
| 🔶 | Partially implemented, needs work |
| ❌ | Stub/placeholder only |
| ⚠️ | Has known issues |

---

## 1. Coach Discovery

### 1.1 Coach Search & Browse ✅

**Location:** `js/app.js`, `api/endpoints/coaches.php`

Allows clients to browse and filter coaches.

**Features:**
- Full-text search by name, title, bio
- Filter by specialty (multi-select)
- Filter by price range (slider)
- Filter by rating (minimum stars)
- Filter by language (multi-select)
- Filter by availability (day of week)
- Sort by: Rating, Price, Reviews count
- **Video Priority:** Coaches with video intros shown first

**User Flow:**
```
Homepage → Click "Find a Coach"
    → Browse all coaches (video-first sorting)
    → Apply filters (specialty, price, language)
    → View coach cards with key info
    → Click card → Coach profile page
```

**API Endpoints:**
```
GET /coaches
    ?specialty=life-coaching
    &min_price=50&max_price=200
    &min_rating=4
    &language=english
    &availability_day=monday
    &sort=rating
    &page=1&limit=20
```

---

### 1.2 Matching Quiz ✅

**Location:** `js/matchingQuiz.js`

AI-powered 8-question quiz to match clients with compatible coaches.

**Questions:**
1. What area would you like coaching in? (specialty)
2. What's your primary goal? (goal type)
3. What coaching style do you prefer? (style preference)
4. What's your preferred session format? (online/in-person/both)
5. What language(s) are you comfortable with? (languages)
6. What's your preferred session length? (duration)
7. What's your budget per session? (price range)
8. Any specific requirements? (free text)

**User Flow:**
```
Homepage → Click "Take the Quiz"
    → Answer 8 questions
    → AI analyzes responses
    → Matched coaches displayed (ranked by fit)
    → Option to book discovery call
```

**Matching Algorithm:**
- Specialty match (weighted heavily)
- Price compatibility
- Language overlap
- Session format compatibility
- Style alignment
- Availability match

---

### 1.3 Category Landing Pages ✅

**Location:** `js/seoLandingPages.js`, `js/pages/CategoryPage.js`

SEO-optimized pages for each coaching category.

**Categories:**
| Category | URL |
|----------|-----|
| Executive Coaching | `/#coaching/executive-coaching` |
| Life Coaching | `/#coaching/life-coaching` |
| Career Coaching | `/#coaching/career-coaching` |
| Business Coaching | `/#coaching/business-coaching` |
| Leadership Coaching | `/#coaching/leadership` |
| Health & Wellness | `/#coaching/health-wellness` |
| Mindfulness | `/#coaching/mindfulness` |
| Relationship Coaching | `/#coaching/relationship-coaching` |

**Page Elements:**
- Hero section with category-specific copy
- Featured coaches in category
- FAQ section (category-specific)
- How it works section
- Testimonials from category clients
- CTA buttons

---

## 2. Coach Profiles

### 2.1 Coach Profile Page ✅

**Location:** `js/coachProfile.js`, `js/pages/CoachProfilePage.js`

Comprehensive coach profile with all information.

**Sections:**
1. **Header**
   - Profile image
   - Name and title
   - Rating and review count
   - "New Coach" badge (if < 90 days)
   - Video preview button

2. **Video Popup** ✅
   - Modal overlay
   - Embedded video player
   - Close on click outside

3. **About**
   - Bio text
   - Specialties (tags)
   - Languages
   - Session formats (online/in-person)
   - Location (if in-person)

4. **Credentials** ✅
   - Education
   - Certifications
   - Experience
   - Verification badges

5. **Services**
   - Session types (discovery, 60min, 90min, 120min)
   - Pricing for each
   - Package options

6. **Reviews** ✅
   - Rating histogram
   - Individual reviews
   - Client name/initials
   - Review date
   - Helpful votes

7. **Booking Widget**
   - Availability calendar
   - Time slot selection
   - Session type selection
   - "Book Now" CTA

---

### 2.2 Trust Score Display ✅

**Location:** `js/coachProfile.js` (TrustScore component)

Visual indicator of coach trustworthiness.

**Factors:**
| Factor | Weight | Points |
|--------|--------|--------|
| Profile completeness | 20% | 0-20 |
| Verified credentials | 25% | 0-25 |
| Video intro present | 15% | 0-15 |
| Review score | 20% | 0-20 |
| Reviews count | 20% | 0-20 |

**Display:**
- Circular progress indicator
- Score out of 100
- Breakdown tooltip

---

## 3. Booking System

### 3.1 Discovery Call Booking 🔶

**Location:** `api/endpoints/bookings.php` (bookDiscoveryCall)

Free 30-minute intro call with coach.

**Features:**
- No payment required
- One active discovery call per coach per client
- Automatic confirmation
- Email notifications to both parties

**User Flow:**
```
Coach Profile → Select "Discovery Call"
    → Choose available time slot
    → Enter name & email
    → Confirm booking
    → Receive confirmation email
    → Calendar invite sent
```

**Status:** Logic complete in PHP but `$supabase` global undefined in bookings.php

---

### 3.2 Paid Session Booking 🔶

**Location:** `api/endpoints/bookings.php`, `js/bookingFlow.js`

Full coaching session with payment.

**Session Types:**
| Duration | Typical Price |
|----------|---------------|
| 60 minutes | €100-150 |
| 90 minutes | €140-210 |
| 120 minutes | €180-270 |

**Payment Flow:**
1. Select time slot
2. Choose session duration
3. Enter client details
4. Create PaymentIntent (server)
5. Collect payment (Stripe.js)
6. Confirm booking (server)
7. Email confirmations

**Status:** API logic complete, needs integration testing

---

### 3.3 Package Booking 🔶

**Location:** `api/endpoints/stripe.php`

Discounted session bundles.

**Package Options:**
| Sessions | Discount |
|----------|----------|
| 4 sessions | 5% off |
| 6 sessions | 10% off |
| 8 sessions | 12% off |
| 10 sessions | 15% off |
| 12 sessions | 18% off |

**Features:**
- One-time payment upfront
- Sessions valid for 6 months
- Track remaining sessions
- Book individual sessions from package

**Status:** Payment logic complete, frontend integration needed

---

### 3.4 Reschedule & Cancel 🔶

**Location:** `api/endpoints/bookings.php`

**Cancellation Policy:**
| Notice | Refund |
|--------|--------|
| Coach cancels | 100% |
| Client 24+ hours | 100% |
| Client 12-24 hours | 50% |
| Client < 12 hours | 0% |

**Reschedule Limits:**
- Maximum 2 reschedules per booking
- Must have available slot

---

## 4. Coach Management

### 4.1 Coach Onboarding Wizard ✅

**Location:** `js/onboarding.js`

Multi-step profile creation for new coaches.

**Steps:**
1. **Welcome** - Introduction
2. **Personal Info** - Name, photo, languages
3. **Professional** - Title, bio, specialties
4. **Credentials** - Education, certifications
5. **Services** - Session types, pricing
6. **Availability** - Weekly schedule
7. **Video** - Upload intro video (optional)
8. **Payment** - Stripe Connect setup
9. **Review** - Preview and submit

**Features:**
- Progress saving (localStorage)
- Skip and resume later
- Profile picture upload
- Pill-based specialty input
- Flag-based language selection

---

### 4.2 Coach Dashboard 🔶

**Location:** `js/coachDashboard.js`

Central hub for coaches to manage their business.

**Sections:**
1. **Overview**
   - Earnings summary (week/month/year)
   - Upcoming sessions count
   - New reviews
   - Profile views

2. **Calendar**
   - Weekly/monthly view
   - Upcoming bookings
   - Blocked dates

3. **Bookings**
   - Upcoming sessions
   - Past sessions
   - Cancellations

4. **Clients**
   - Client list
   - Session history per client
   - Notes

5. **Earnings**
   - Revenue chart
   - Payout history
   - Pending payouts

6. **Profile**
   - Edit profile
   - Update availability
   - Manage credentials

**Status:** UI exists, needs real-time data integration

---

### 4.3 Stripe Connect Setup 🔶

**Location:** `api/endpoints/stripe.php`

Payment account setup for coaches.

**Account Type:** Express

**Features:**
- Account creation
- Onboarding link generation
- Status checking
- Dashboard access
- Automatic payouts

**Commission Rates:**
- Regular coaches: 15%
- Founding coaches: 10%

---

### 4.4 Availability Management 🔶

**Location:** `api/endpoints/availability.php`

Coach schedule configuration.

**Features:**
- Weekly recurring schedule
- Day-by-day time slots
- Buffer between sessions
- Blocked dates
- Holiday management

**Data Model:**
```
cs_coach_availability (weekly)
├── day_of_week: 0-6
├── start_time: HH:MM
├── end_time: HH:MM
└── is_available: boolean

cs_coach_availability_overrides (exceptions)
├── date: YYYY-MM-DD
├── override_type: 'blocked' | 'available'
└── time_slots: array
```

---

## 5. Client Features

### 5.1 Client Dashboard 🔶

**Location:** `js/clientDashboard.js`

Dashboard for clients to manage bookings.

**Sections:**
1. **Upcoming Sessions**
   - Next session details
   - Quick actions (cancel, reschedule)

2. **Booking History**
   - Past sessions list
   - Review prompts
   - Rebooking option

3. **Favorite Coaches**
   - Saved coaches list
   - Quick book button

4. **Packages**
   - Active packages
   - Sessions remaining
   - Book from package

---

### 5.2 Reviews 🔶

**Location:** Part of `js/coachProfile.js`

Client review system.

**Features:**
- 1-5 star rating
- Written review text
- Helpful votes
- Author display (name or anonymous)
- Review responses (by coach)

**Verification:**
- Only clients who completed sessions can review
- One review per booking

---

## 6. Admin Panel

### 6.1 Admin Dashboard ❌

**Location:** `js/admin.js`

Platform administration interface.

**Tabs:**
| Tab | Status | Description |
|-----|--------|-------------|
| Overview | ❌ | Platform stats (mock data) |
| Users | ❌ | User management (mock data) |
| Coach Verification | ❌ | Credential review (mock data) |
| Promo Codes | ❌ | Code management |
| Platform Settings | ❌ | Configuration |
| Analytics | ❌ | Usage metrics |
| System Health | ❌ | Server status |
| Error Logs | ❌ | Error viewer |

**Status:** Frontend exists but all backend endpoints return mock data

---

### 6.2 Coach Verification Workflow ❌

**Planned Flow:**
```
Coach submits credential
    → Admin receives notification
    → Admin reviews documentation
    → Admin approves/rejects
    → Coach notified of status
    → Badge displayed if approved
```

**Status:** Not implemented

---

## 7. Communication

### 7.1 Email Notifications ✅

**Location:** `email-templates/`

**Templates:**
| Template | Trigger |
|----------|---------|
| `welcome.html` | User registration |
| `booking-confirmation.html` | Booking confirmed |
| `booking-reminder.html` | 24h before session |
| `review-request.html` | Session completed |
| `payment-confirmation.html` | Payment processed |
| `payout-notification.html` | Weekly payout |
| `password-reset.html` | Password reset request |

**Features:**
- Branded design
- Variable substitution
- Conditional sections
- Mobile responsive

---

### 7.2 In-App Notifications 🔶

**Location:** Database table `cs_notifications`

**Notification Types:**
- New booking
- Booking cancelled
- Booking rescheduled
- New review
- Payout processed
- Credential approved

**Status:** Database table exists, UI integration pending

---

## 8. Marketing & Conversion

### 8.1 Promo Codes 🔶

**Location:** `js/promoCode.js`, `api/endpoints/promo-codes.php`

Discount code system.

**Code Types:**
| Type | Example |
|------|---------|
| Percentage discount | 15% off |
| Fixed amount | €20 off |
| Free discovery call | N/A |
| Founding coach status | 10% commission |

**Features:**
- Usage limits
- Expiration dates
- Single/multi-use
- User restrictions

---

### 8.2 Referral System 🔶

**Location:** `js/referrals.js`, `api/endpoints/referrals.php`

User referral program.

**Structure:**
- Unique referral codes per user
- Rewards for referrer and referee
- Tracking dashboard
- Payout integration

**Status:** Basic structure, needs completion

---

### 8.3 Satisfaction Guarantee 🔶

**Location:** `api/endpoints/stripe.php` (processSatisfactionRefund)

First session guarantee.

**Policy:**
- Applies to first paid session only
- Full refund within 48 hours of completion
- Reason required
- One-time per client

---

## 9. Supporting Features

### 9.1 Internationalization ✅

**Location:** `js/i18n.js`

Multi-language support.

**Languages:**
- English (default)
- German
- Spanish
- French
- Italian

**Coverage:** ~95% for all languages

---

### 9.2 PWA Support ✅

**Location:** `sw.js`, `manifest.json`

Progressive Web App features.

**Capabilities:**
- Install to home screen
- Offline access (cached pages)
- Push notifications (prepared)
- App-like navigation

---

### 9.3 Session Notes 🔶

**Location:** `js/sessionNotes.js`

Coach note-taking system.

**Features:**
- Pre-session notes
- Post-session summary
- Progress tracking
- Goal setting
- Action items

---

### 9.4 Progress Dashboard 🔶

**Location:** `js/progress-dashboard.js`

Client progress tracking.

**Metrics:**
- Sessions completed
- Goals achieved
- Milestones
- Progress timeline

---

## 10. Legal & Compliance

### 10.1 Legal Pages ✅

**Location:** `js/data/legalContent.js`

| Page | URL | Content |
|------|-----|---------|
| Privacy Policy | `/#privacy` | GDPR-compliant |
| Terms of Service | `/#terms` | User agreement |
| Imprint | `/#imprint` | Legal notice |
| Cookie Policy | Part of Privacy | Cookie consent |

---

### 10.2 GDPR Features ❌

**Required:**
- [ ] Data export (auth.php:exportUserData - mock)
- [ ] Account deletion (auth.php:requestAccountDeletion - mock)
- [ ] Cookie consent banner
- [ ] Consent management

---

## Feature Priority Matrix

| Feature | Business Impact | Technical Effort | Priority |
|---------|-----------------|------------------|----------|
| Fix Auth Endpoints | Critical | Low | P0 |
| Pre-rendering (SEO) | Critical | High | P0 |
| Complete Booking Flow | Critical | Medium | P0 |
| CORS Security Fix | Critical | Low | P0 |
| Dynamic Sitemap | High | Low | P1 |
| Admin Dashboard | Medium | High | P2 |
| Referral System | Medium | Medium | P2 |
| GDPR Compliance | High | Medium | P1 |
| Code Splitting | Medium | High | P2 |

---

*Last Updated: December 2025*
