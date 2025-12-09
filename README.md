# CoachSearching

**European Coaching Marketplace Platform**

A mid-market coaching marketplace connecting clients with certified coaches for business, life, career, and personal development. Features transparent pricing (EUR 100-250/session range) as a key differentiator from enterprise platforms.

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | React (UMD) + htm | React 18.x |
| Styling | CSS Modules | - |
| Backend API | PHP | 8.4 |
| Database | Supabase (PostgreSQL) | Latest |
| Payments | Stripe Connect | Express accounts |
| Hosting | GitHub Pages (FE) + FTP (API) | - |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Pages                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              React SPA (Vanilla JS + htm)               │    │
│  │   index.html │ js/*.js │ css/*.css │ email-templates/   │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PHP 8.4 REST API                              │
│                 https://clouedo.com/coachsearching/api          │
│  ┌──────────────┬──────────────┬──────────────┬──────────┐     │
│  │   /coaches   │  /bookings   │   /stripe    │  /auth   │     │
│  └──────────────┴──────────────┴──────────────┴──────────┘     │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────┐
│       Supabase          │     │         Stripe              │
│  - PostgreSQL           │     │  - Connect Express          │
│  - Row Level Security   │     │  - Destination Charges      │
│  - Auth                 │     │  - Webhooks                 │
└─────────────────────────┘     └─────────────────────────────┘
```

## Quick Start

### Prerequisites
- Node.js 18+ (for development server)
- PHP 8.4 (for API)
- Supabase project
- Stripe account

### Frontend Development

```bash
# Clone the repository
git clone https://github.com/your-org/coachsearching-web.git
cd coachsearching-web

# Install dev dependencies
npm install

# Start local server
npm run dev

# Open http://localhost:3000
```

### API Development

```bash
# Configure environment
cd api
cp .env.example .env
# Edit .env with your credentials

# Start PHP built-in server
php -S localhost:8080

# API available at http://localhost:8080
```

### Environment Variables

**Frontend (`js/config.js`):**
```javascript
const config = {
  SUPABASE_URL: 'your-supabase-url',
  SUPABASE_ANON_KEY: 'your-anon-key',
  API_BASE_URL: 'https://clouedo.com/coachsearching/api',
  STRIPE_PUBLIC_KEY: 'pk_test_...'
};
```

**Backend (`api/.env`):**
```
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_CONNECT_CLIENT_ID=ca_...
STRIPE_WEBHOOK_SECRET=whsec_...
OPENROUTER_API_KEY=your-key
```

## Deployment

### Frontend (GitHub Pages)
```bash
# Push to main branch triggers automatic deployment
git push origin main
```

### API (FTP)
```bash
# Upload api/ folder to clouedo.com/coachsearching/api
# via FTP client (FileZilla, etc.)
```

## Project Structure

```
coachsearching-web/
├── index.html              # Main SPA entry
├── styles.css              # CSS entry point
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
├── api/                    # PHP Backend
│   ├── index.php           # Router
│   ├── endpoints/          # API endpoints
│   └── lib/                # Utilities
├── js/                     # Frontend JS
│   ├── app.js              # Main app
│   ├── components/         # React components
│   ├── pages/              # Page components
│   └── utils/              # Utilities
├── css/                    # Stylesheets
├── email-templates/        # Email HTML
└── docs/                   # Documentation
```

## Key Features

- Coach search with filters and video priority
- 8-question matching quiz
- Coach onboarding wizard
- Discovery call booking (free)
- Paid session booking with Stripe
- Session packages with discounts
- Coach credentials verification
- Reviews and ratings
- Multi-language support (EN, DE, ES, FR, IT)
- PWA with offline support

## Documentation

- [Codebase Audit](docs/CODEBASE_AUDIT.md)
- [Architecture Details](docs/ARCHITECTURE.md)
- [Feature Documentation](docs/FEATURES.md)
- [AI Development Guide](docs/AI_DEVELOPMENT_GUIDE.md)
- [Changelog](docs/CHANGELOG.md)

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Test locally
4. Submit a pull request

## License

Proprietary - CoachSearching.com

---

**Version:** 2.0.0
**Last Updated:** December 2025
