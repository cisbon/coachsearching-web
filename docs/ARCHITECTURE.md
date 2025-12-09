# CoachSearching Architecture Documentation

## System Overview

CoachSearching is a three-tier web application with a unique frontend architecture that uses React via UMD globals instead of a traditional build process.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          CLIENT BROWSER                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                     React SPA (no build step)                       │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐    │ │
│  │  │  React   │  │ ReactDOM │  │   htm    │  │  Supabase JS     │    │ │
│  │  │  (UMD)   │  │  (UMD)   │  │ (JSX alt)│  │  (Auth & RT)     │    │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘    │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                    │                                      │
│                    ┌───────────────┴───────────────┐                     │
│                    ▼                               ▼                      │
│           Supabase Direct                   PHP REST API                  │
│         (Auth, Realtime)              (Business Logic, Stripe)           │
└──────────────────────────────────────────────────────────────────────────┘
                    │                               │
                    ▼                               ▼
        ┌───────────────────┐           ┌───────────────────────┐
        │     Supabase      │           │    Stripe Connect     │
        │  ┌─────────────┐  │           │  ┌─────────────────┐  │
        │  │ PostgreSQL  │  │           │  │ Express Accounts│  │
        │  │    + RLS    │  │           │  │ Dest. Charges   │  │
        │  └─────────────┘  │           │  └─────────────────┘  │
        │  ┌─────────────┐  │           └───────────────────────┘
        │  │    Auth     │  │
        │  └─────────────┘  │
        │  ┌─────────────┐  │
        │  │  Storage    │  │
        │  └─────────────┘  │
        └───────────────────┘
```

## Frontend Architecture

### React Without Build

The frontend uses React 18 loaded as UMD globals with `htm` for JSX-like templating:

```javascript
// Traditional React (requires build)
const Button = () => <button onClick={handleClick}>Click</button>;

// CoachSearching approach (no build)
import htm from './vendor/htm.js';
const React = window.React;
const html = htm.bind(React.createElement);

const Button = () => html`<button onClick=${handleClick}>Click</button>`;
```

**Benefits:**
- No build process required
- Instant deployment to GitHub Pages
- Easy to modify without tooling

**Drawbacks:**
- Larger bundle sizes (no tree-shaking)
- No TypeScript compilation
- Manual code splitting

### Component Hierarchy

```
App
├── Router (hash-based)
│   ├── HomePage
│   │   ├── HeroSection
│   │   ├── FeaturedCoaches
│   │   ├── CategoryGrid
│   │   └── Testimonials
│   │
│   ├── CoachProfilePage
│   │   ├── ProfileHeader (with video popup)
│   │   ├── CredentialsSection
│   │   ├── ServicesSection
│   │   ├── ReviewsSection
│   │   └── BookingWidget
│   │
│   ├── CategoryPage
│   │   ├── CategoryHero
│   │   ├── FilterBar
│   │   └── CoachGrid
│   │
│   ├── QuizPage
│   │   ├── QuizProgress
│   │   ├── QuizQuestion
│   │   └── MatchResults
│   │
│   ├── DashboardPage (authenticated)
│   │   ├── ClientDashboard
│   │   │   ├── UpcomingBookings
│   │   │   ├── BookingHistory
│   │   │   └── FavoriteCoaches
│   │   │
│   │   └── CoachDashboard
│   │       ├── EarningsOverview
│   │       ├── UpcomingClients
│   │       ├── AvailabilityCalendar
│   │       └── ProfileEditor
│   │
│   └── AdminPanel (admin only)
│       ├── UserManagement
│       ├── CoachVerification
│       ├── Analytics
│       └── PromoCodeManagement
│
├── Header
│   ├── Logo
│   ├── Navigation
│   ├── LanguageSelector
│   └── AuthButton
│
└── Footer
    ├── FooterLinks
    └── LegalLinks
```

### State Management

Uses React Context for global state:

```javascript
// js/context/AppContext.js
const AppContext = React.createContext({
  user: null,
  coaches: [],
  bookings: [],
  notifications: [],
  // Actions
  login: () => {},
  logout: () => {},
  setLanguage: () => {},
});

// Provider wraps the app
function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}
```

### Routing

Hash-based routing for GitHub Pages compatibility:

```javascript
// URL patterns
/#                          → HomePage
/#coaches                   → All Coaches
/#coaches?specialty=life    → Filtered Coaches
/#coach/{id}                → Coach Profile
/#coach/{id}/{slug}         → Coach Profile (SEO-friendly)
/#quiz                      → Matching Quiz
/#quiz/results              → Quiz Results
/#dashboard                 → User Dashboard
/#admin                     → Admin Panel
/#login                     → Login/Register
/#about                     → About Page
/#faq                       → FAQ Page
/#coaching/{category}       → Category Landing
```

---

## Backend Architecture (PHP API)

### Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        api/index.php                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  1. CORS Headers (config.php)                           │    │
│  │  2. Rate Limiting (lib/RateLimiter.php)                 │    │
│  │  3. Route Parsing                                        │    │
│  │  4. Auth Check (lib/Auth.php) - if required             │    │
│  │  5. Input Sanitization (lib/Sanitizer.php)              │    │
│  │  6. Endpoint Dispatch → endpoints/*.php                  │    │
│  │  7. Response Formatting (lib/Response.php)              │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### API Endpoints

#### Coaches
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/coaches` | List all coaches | No |
| GET | `/coaches/{id}` | Get coach profile | No |
| POST | `/coaches` | Create coach profile | Yes |
| PATCH | `/coaches/{id}` | Update coach profile | Yes (owner) |
| GET | `/coaches/{id}/availability` | Get availability | No |
| GET | `/coaches/{id}/reviews` | Get reviews | No |
| POST | `/coaches/{id}/credentials` | Add credential | Yes (owner) |

#### Bookings
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/bookings/discovery-call` | Book free call | No (email req) |
| POST | `/bookings/create-intent` | Create paid booking | No (email req) |
| POST | `/bookings/{id}/confirm` | Confirm after payment | No |
| GET | `/bookings/{id}` | Get booking details | Yes |
| GET | `/bookings/coach?coach_id=X` | Coach's bookings | Yes (coach) |
| GET | `/bookings/client?email=X` | Client's bookings | Yes |
| POST | `/bookings/{id}/cancel` | Cancel booking | Yes |
| POST | `/bookings/{id}/reschedule` | Reschedule | Yes |

#### Stripe Connect
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/stripe/connect/create` | Create Express account | Yes (coach) |
| GET | `/stripe/connect/onboard` | Get onboarding link | Yes (coach) |
| GET | `/stripe/connect/status` | Account status | Yes (coach) |
| GET | `/stripe/connect/dashboard` | Dashboard link | Yes (coach) |
| POST | `/stripe/webhooks` | Webhook handler | Signature |
| POST | `/stripe/packages/create-intent` | Package payment | No |

### Database Class

```php
// api/Database.php - Supabase REST Client
class Database {
    private $supabaseUrl;
    private $supabaseKey;

    public function request($method, $path, $body = null) {
        // Makes authenticated requests to Supabase REST API
        // Returns parsed JSON response
    }

    public function from($table) {
        // Fluent query builder
        return new QueryBuilder($this, $table);
    }
}

// Usage
$db = new Database();
$coaches = $db->from('cs_coaches')
    ->select('*')
    ->eq('is_visible', true)
    ->order('rating', ['ascending' => false])
    ->limit(20)
    ->execute();
```

### Security Utilities

```php
// lib/Auth.php - JWT Authentication
class Auth {
    public static function getUser() {
        // Extracts and validates JWT from Authorization header
        // Returns user object or null
    }

    public static function requireAuth() {
        // Throws 401 if not authenticated
    }

    public static function requireRole($role) {
        // Throws 403 if wrong role
    }
}

// lib/Sanitizer.php - Input Sanitization
class Sanitizer {
    public static function clean($input) {
        // XSS prevention, trim, etc.
    }

    public static function email($email) {
        // Email normalization
    }

    public static function phone($phone) {
        // Phone normalization
    }
}

// lib/Validator.php - Input Validation
class Validator {
    public static function make($data, $rules) {
        // Fluent validation API
        // Returns errors array or empty
    }
}

// lib/RateLimiter.php - Rate Limiting
class RateLimiter {
    public static function check($key, $maxRequests = 60, $window = 60) {
        // File-based rate limiting
        // Returns true if allowed, throws 429 if exceeded
    }
}
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    auth.users   │────<│   cs_coaches    │────<│  cs_bookings    │
│  (Supabase)     │     │                 │     │                 │
│  - id           │     │  - id           │     │  - id           │
│  - email        │     │  - user_id (FK) │     │  - coach_id     │
│  - role         │     │  - display_name │     │  - client_id    │
└─────────────────┘     │  - hourly_rate  │     │  - start_time   │
                        │  - rating       │     │  - amount_cents │
                        │  - specialties  │     │  - status       │
                        └─────────────────┘     └─────────────────┘
                              │                        │
              ┌───────────────┴──────────┐            │
              ▼                          ▼            │
┌─────────────────────┐   ┌─────────────────────┐    │
│ cs_coach_credentials│   │  cs_coach_stripe_   │    │
│                     │   │      accounts       │    │
│  - coach_id (FK)    │   │                     │    │
│  - credential_type  │   │  - coach_id (FK)    │    │
│  - verified         │   │  - stripe_acct_id   │    │
└─────────────────────┘   │  - charges_enabled  │    │
                          └─────────────────────┘    │
                                                      │
              ┌───────────────────────────────────────┘
              ▼
┌─────────────────────┐     ┌─────────────────────┐
│    cs_reviews       │     │ cs_payment_records  │
│                     │     │                     │
│  - booking_id (FK)  │     │  - booking_id (FK)  │
│  - coach_id (FK)    │     │  - stripe_pi_id     │
│  - rating           │     │  - amount_cents     │
│  - content          │     │  - status           │
└─────────────────────┘     └─────────────────────┘
```

### Key Tables

#### cs_coaches
Primary coach profile table.
```sql
CREATE TABLE cs_coaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    display_name TEXT NOT NULL,
    email TEXT NOT NULL,
    professional_title TEXT,
    bio TEXT,
    hourly_rate NUMERIC(10,2),
    currency TEXT DEFAULT 'eur',
    specialties TEXT[],
    languages TEXT[],
    session_formats TEXT[],
    rating NUMERIC(3,2),
    review_count INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT false,
    video_url TEXT,
    profile_image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

#### cs_bookings
All booking records.
```sql
CREATE TABLE cs_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID REFERENCES cs_coaches(id),
    client_id UUID REFERENCES auth.users(id),
    client_name TEXT,
    client_email TEXT,
    session_type TEXT, -- 'discovery', 'paid', 'package'
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    amount_cents INTEGER,
    platform_fee_cents INTEGER,
    status TEXT, -- 'pending', 'confirmed', 'completed', 'cancelled'
    payment_status TEXT,
    stripe_payment_intent_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### Row Level Security (RLS)

All tables have RLS enabled with policies:

```sql
-- Coaches: Public read, owner write
CREATE POLICY "Public can view visible coaches"
    ON cs_coaches FOR SELECT
    USING (is_visible = true);

CREATE POLICY "Coaches can update own profile"
    ON cs_coaches FOR UPDATE
    USING (auth.uid() = user_id);

-- Bookings: Participants only
CREATE POLICY "Users can view own bookings"
    ON cs_bookings FOR SELECT
    USING (
        client_id = auth.uid() OR
        coach_id IN (SELECT id FROM cs_coaches WHERE user_id = auth.uid())
    );
```

---

## Payment Flow Architecture

### Stripe Connect Model

CoachSearching uses **Destination Charges** with Express Connect accounts:

```
┌─────────────┐    Payment    ┌──────────────┐
│   Client    │──────────────▶│ CoachSearching│
│             │               │  (Platform)   │
└─────────────┘               └──────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
              Platform Fee     Coach Payout     Stripe Fee
                 15%              ~82%             ~3%
```

### Payment Sequence

```
1. Client selects time slot
2. Frontend calls POST /bookings/create-intent
3. API creates:
   - Pending booking in cs_bookings
   - PaymentIntent with transfer_data
4. API returns client_secret
5. Frontend uses Stripe.js to collect payment
6. On success, frontend calls POST /bookings/{id}/confirm
7. API verifies payment, confirms booking
8. Webhook (backup) updates payment status
9. Automatic transfer to coach's Express account
```

### Commission Structure

| Coach Type | Platform Fee | Coach Receives |
|------------|--------------|----------------|
| Regular | 15% | 85% |
| Founding Coach | 10% | 90% |

---

## SEO Architecture

### Current State

```
┌────────────────────────────────────────────────────────────────┐
│                     Browser Request                             │
│                  coachsearching.com/#coach/123                  │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                     GitHub Pages                                │
│           Returns index.html (same for all routes)             │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                    Client-Side React                            │
│         1. Parse hash fragment → coach/123                      │
│         2. Fetch coach data from Supabase                       │
│         3. Render profile + update meta tags via seo.js        │
└────────────────────────────────────────────────────────────────┘
```

**Problem:** Search engines don't execute JavaScript reliably, so they see empty index.html.

### Proposed Solution: Pre-rendering

```
┌────────────────────────────────────────────────────────────────┐
│                      Build Process                              │
│  1. Fetch all coach IDs from Supabase                          │
│  2. For each coach, generate static HTML:                       │
│     - Meta tags                                                 │
│     - Structured data (JSON-LD)                                │
│     - Basic content (name, title, description)                 │
│  3. Deploy to /coach/{id}/index.html                           │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                       Runtime                                   │
│  - Crawler → Gets pre-rendered HTML with meta tags             │
│  - User → Gets HTML, then React hydrates for interactivity     │
└────────────────────────────────────────────────────────────────┘
```

---

## Internationalization

### Supported Languages

| Code | Language | Coverage |
|------|----------|----------|
| en | English | 100% |
| de | German | ~95% |
| es | Spanish | ~95% |
| fr | French | ~95% |
| it | Italian | ~95% |

### Implementation

```javascript
// js/i18n.js
const translations = {
  en: {
    'nav.findCoach': 'Find a Coach',
    'nav.forCoaches': 'For Coaches',
    'hero.title': 'Find Your Perfect Coach',
    // ...
  },
  de: {
    'nav.findCoach': 'Coach finden',
    'nav.forCoaches': 'Für Coaches',
    'hero.title': 'Finden Sie Ihren perfekten Coach',
    // ...
  },
  // ...
};

export function t(key) {
  const lang = getCurrentLang();
  return translations[lang]?.[key] || translations.en[key] || key;
}

export function getCurrentLang() {
  return localStorage.getItem('lang') ||
         navigator.language.split('-')[0] ||
         'en';
}
```

### Language Detection

1. Check `localStorage.lang`
2. Check `navigator.language`
3. Default to `en`

### URL Language Support

```
coachsearching.com/?lang=de      → German
coachsearching.com/#coaches      → Browser default
```

---

## Security Architecture

### Authentication Flow

```
┌──────────────┐                  ┌──────────────┐
│   Browser    │                  │   Supabase   │
│              │                  │     Auth     │
└──────────────┘                  └──────────────┘
      │                                  │
      │──── supabase.auth.signIn() ─────▶│
      │                                  │
      │◀─── JWT Token ──────────────────│
      │                                  │
      │                                  │
┌──────────────┐                  ┌──────────────┐
│   Browser    │                  │   PHP API    │
│  (with JWT)  │                  │              │
└──────────────┘                  └──────────────┘
      │                                  │
      │──── Authorization: Bearer JWT ──▶│
      │                                  │
      │                                  │ Decode JWT
      │                                  │ (no signature verify)
      │                                  │
      │◀─── Response ───────────────────│
```

### Security Layers

```
┌────────────────────────────────────────────────────────────────┐
│                    Client Browser                               │
│  - Supabase RLS (primary security)                             │
│  - Client-side validation                                       │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                      PHP API                                    │
│  - Rate limiting (60 req/min)                                  │
│  - Input sanitization (XSS prevention)                         │
│  - Input validation                                             │
│  - JWT authentication (optional)                               │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                     Supabase                                    │
│  - Row Level Security (RLS)                                    │
│  - Prepared statements (SQL injection prevention)              │
│  - JWT verification                                             │
└────────────────────────────────────────────────────────────────┘
```

---

## Performance Considerations

### Current Bottlenecks

1. **app.js (349KB)** - Single monolithic file
2. **28 CSS imports** - Render-blocking waterfall
3. **No code splitting** - All JS loaded upfront
4. **CDN dependencies** - Variable latency

### Optimization Opportunities

```
┌─────────────────────────────────────────────────────────────────┐
│                    Proposed Optimizations                        │
│                                                                  │
│  1. Code Splitting                                               │
│     ├── core.js (~50KB) - React, routing, core UI               │
│     ├── coach.js (~30KB) - Coach profile, search                │
│     ├── booking.js (~40KB) - Booking flow, payments             │
│     ├── dashboard.js (~50KB) - User dashboards                  │
│     └── admin.js (~30KB) - Admin panel                          │
│                                                                  │
│  2. CSS Bundling                                                 │
│     └── styles.css → Single bundled file (~40KB)                │
│                                                                  │
│  3. Image Optimization                                           │
│     ├── Lazy loading with Intersection Observer                  │
│     └── WebP format with fallbacks                              │
│                                                                  │
│  4. Self-host Dependencies                                       │
│     └── Bundle Supabase, Chart.js locally                       │
└─────────────────────────────────────────────────────────────────┘
```

---

*Last Updated: December 2025*
