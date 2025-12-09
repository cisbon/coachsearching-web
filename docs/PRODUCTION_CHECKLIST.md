# CoachSearching Production Deployment Checklist

## Pre-Deployment Verification

### Security Verification
- [x] CORS configured with specific allowed origins
- [x] Webhook signature verification enabled
- [x] Security headers in place (X-Frame-Options, X-XSS-Protection, Referrer-Policy)
- [x] Rate limiting active (60 req/min default)
- [x] Input sanitization via Sanitizer class
- [x] RLS policies verified in Supabase
- [ ] HTTPS enforcement verified on production

### Environment Configuration
- [ ] `.env` file configured with production values:
  - [ ] `SUPABASE_URL` - Production Supabase project URL
  - [ ] `SUPABASE_ANON_KEY` - Production anon key
  - [ ] `STRIPE_SECRET_KEY` - Production Stripe secret key (sk_live_...)
  - [ ] `STRIPE_CONNECT_CLIENT_ID` - Production Connect client ID
  - [ ] `STRIPE_WEBHOOK_SECRET` - Production webhook signing secret
  - [ ] `SITE_URL` - https://coachsearching.com
  - [ ] `OPENROUTER_API_KEY` - If using AI features

### API Endpoints Verification
- [x] GET /api/health - Returns healthy status
- [x] GET /api/coaches - Returns coach list
- [x] POST /api/search/coaches - Search with filters works
- [x] GET /api/auth/me - Returns authenticated user profile
- [x] POST /api/bookings/discovery-call - Creates discovery bookings
- [x] POST /api/bookings/create-intent - Creates payment intents
- [x] GET /api/sitemap.xml - Generates dynamic sitemap

### Frontend Verification
- [ ] All pages load correctly
- [ ] Coach search and filtering works
- [ ] Coach profile pages display correctly
- [ ] Booking flow completes (test mode)
- [ ] Payment flow works (Stripe test mode)
- [ ] Mobile responsive design verified
- [ ] All languages display correctly (EN, DE, ES, FR, IT)

---

## Deployment Steps

### Step 1: Prepare API Server

1. **Upload API files via FTP to clouedo.com/coachsearching/api/**
   ```
   Files to upload:
   - config.php
   - Database.php
   - index.php
   - webhook.php
   - .env (with production values)
   - .htaccess
   - endpoints/*
   - lib/*
   ```

2. **Verify .htaccess is working**
   - Access should be blocked to config.php, Database.php, .env

3. **Test health endpoint**
   ```bash
   curl https://clouedo.com/coachsearching/api/health
   ```

### Step 2: Configure Stripe Production

1. **Get production API keys from Stripe Dashboard**
   - Switch from test to live mode
   - Copy live secret key (sk_live_...)
   - Copy Connect client ID for production

2. **Configure webhook endpoint**
   - Add production webhook endpoint: `https://clouedo.com/coachsearching/api/webhook.php`
   - Subscribe to events:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `account.updated`
     - `charge.refunded`
   - Copy webhook signing secret

3. **Update .env with production Stripe keys**

### Step 3: Deploy Frontend

1. **Push to GitHub main branch**
   ```bash
   git push origin main
   ```

2. **Verify GitHub Pages deployment**
   - Check Actions tab for deployment status
   - Verify site loads at https://coachsearching.com

### Step 4: Configure DNS & SSL

1. **Verify DNS records**
   - A record or CNAME pointing to GitHub Pages
   - SSL certificate active

2. **Force HTTPS redirects** (if not automatic)

### Step 5: Submit to Search Engines

1. **Google Search Console**
   - Verify domain ownership
   - Submit sitemap: `https://coachsearching.com/api/sitemap.xml`
   - Request indexing of key pages

2. **Bing Webmaster Tools**
   - Submit sitemap
   - Verify site

---

## Post-Deployment Verification

### Functional Testing
- [ ] Create test booking as new client
- [ ] Complete test payment (use Stripe test card if still in test mode)
- [ ] Register as new coach
- [ ] Complete coach onboarding
- [ ] Verify email notifications sending

### SEO Verification
- [ ] Check robots.txt accessible
- [ ] Check sitemap.xml accessible and valid
- [ ] Verify meta tags with Facebook Sharing Debugger
- [ ] Test with Google Rich Results Test
- [ ] Check Core Web Vitals with PageSpeed Insights

### Monitoring Setup
- [ ] Configure error logging
- [ ] Set up uptime monitoring (e.g., UptimeRobot)
- [ ] Set up Stripe webhook alerts
- [ ] Configure email alerts for critical errors

---

## Rollback Procedure

### If API Issues Occur
1. FTP: Replace current files with previous version backup
2. Or: Checkout previous git commit and re-upload

### If Frontend Issues Occur
1. Git: Revert to previous commit
   ```bash
   git revert HEAD
   git push origin main
   ```
2. GitHub Pages will auto-deploy the reverted version

### If Payment Issues Occur
1. Check Stripe Dashboard for failed payments
2. Verify webhook is receiving events
3. Check API error logs for issues
4. If critical: Disable booking temporarily via feature flag

---

## Contact Points

- **Developer:** [Your email]
- **Stripe Support:** dashboard.stripe.com/support
- **Supabase Support:** supabase.com/support
- **GitHub Pages Issues:** Check GitHub status page

---

## Completed Tasks Summary

### Phase 1: Codebase Audit [COMPLETE]
- 25+ features documented with status
- Security vulnerabilities identified
- Technical debt inventory created

### Phase 2: Documentation [COMPLETE]
- CODEBASE_AUDIT.md
- ARCHITECTURE.md
- FEATURES.md
- AI_DEVELOPMENT_GUIDE.md
- CHANGELOG.md
- README.md

### Phase 3: Master Plan [COMPLETE]
- Priority matrix created
- Implementation roadmap defined
- Success criteria established

### Phase 4: Implementation [PARTIAL]
- [x] Security fixes (CORS, webhooks, headers)
- [x] Auth endpoints implementation
- [x] Search endpoint with real data
- [x] Dynamic sitemap generation
- [ ] Pre-rendering for SEO (future)
- [ ] Code splitting (future)

---

**Checklist Created:** December 9, 2025
**Last Updated:** December 9, 2025
**Status:** Ready for deployment after environment configuration
