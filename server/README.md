# CoachSearching Backend API

Complete Node.js/Express backend for the CoachSearching coaching marketplace platform.

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- Supabase project (for database & authentication)
- Stripe account (for payments)
- Email service account (SendGrid, Brevo, or SMTP)

### Installation

```bash
cd server
npm install
```

### Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update `.env` with your credentials:
   - Supabase URL and keys
   - Stripe keys
   - Email service keys
   - Other configuration

### Running the Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server will start on `http://localhost:3001` (or PORT specified in `.env`)

---

## 📁 Project Structure

```
server/
├── server.js              # Main Express app
├── package.json           # Dependencies
├── .env.example           # Environment variables template
├── middleware/
│   ├── auth.js           # Authentication & authorization
│   └── validation.js     # Request validation (Joi schemas)
└── routes/
    ├── auth.js           # Authentication endpoints
    ├── health.js         # Health checks & monitoring
    ├── referrals.js      # Referral program
    ├── promoCodes.js     # Promo code system
    ├── coaches.js        # Coach management (TODO)
    ├── bookings.js       # Booking system (TODO)
    ├── payments.js       # Stripe integration (TODO)
    ├── admin.js          # Admin panel (TODO)
    ├── analytics.js      # Analytics & metrics (TODO)
    └── emails.js         # Email sending (TODO)
```

---

## 🛣️ API Routes

### ✅ Implemented

#### Health & Monitoring
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed health check with services
- `GET /api/health/metrics` - Platform metrics summary

#### Authentication
- `POST /api/auth/verify-email` - Verify email token
- `POST /api/auth/resend-verification` - Resend verification email
- `GET /api/auth/me` - Get current user profile
- `PATCH /api/auth/me` - Update current user profile
- `POST /api/auth/change-password` - Change password
- `DELETE /api/auth/me` - Request account deletion (GDPR)
- `POST /api/auth/cancel-deletion` - Cancel account deletion
- `POST /api/auth/export-data` - Export user data (GDPR)

#### Referrals
- `GET /api/referrals/code` - Get user's referral code
- `GET /api/referrals/stats` - Get referral statistics
- `GET /api/referrals/list` - Get list of referred users
- `POST /api/referrals/apply` - Apply referral code
- `POST /api/referrals/validate` - Validate referral code
- `POST /api/referrals/track-conversion` - Track referral conversion

#### Promo Codes
- `GET /api/promo-codes/active` - Get active promo codes (public)
- `POST /api/promo-codes/validate` - Validate promo code
- `POST /api/promo-codes/apply` - Apply promo code to booking
- `GET /api/promo-codes` - Get all promo codes (admin)
- `POST /api/promo-codes` - Create promo code (admin)
- `PATCH /api/promo-codes/:id` - Update promo code (admin)
- `DELETE /api/promo-codes/:id` - Deactivate promo code (admin)
- `GET /api/promo-codes/:id/usage` - Get usage statistics (admin)

### ⏳ Pending Implementation

#### Coaches
- `GET /api/coaches` - Search/filter coaches
- `GET /api/coaches/:id` - Get coach profile
- `PATCH /api/coaches/:id` - Update coach profile
- `GET /api/coaches/:id/availability` - Get coach availability
- `POST /api/coaches/:id/availability` - Set availability
- `GET /api/coaches/:id/services` - Get coach services
- `POST /api/coaches/:id/services` - Create service

#### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - Get user's bookings
- `GET /api/bookings/:id` - Get booking details
- `PATCH /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Cancel booking
- `POST /api/bookings/:id/complete` - Mark booking complete
- `POST /api/bookings/:id/review` - Leave review

#### Payments (Stripe)
- `POST /api/payments/create-intent` - Create payment intent
- `POST /api/payments/confirm` - Confirm payment
- `POST /api/payments/refund` - Process refund
- `POST /api/payments/webhook` - Stripe webhook handler
- `GET /api/payments/coach/connect` - Coach Stripe Connect
- `POST /api/payments/coach/onboard` - Onboard to Stripe

#### Admin
- `GET /api/admin/users` - Get all users
- `PATCH /api/admin/users/:id` - Update user (suspend, etc.)
- `GET /api/admin/coaches/pending` - Pending verifications
- `POST /api/admin/coaches/:id/verify` - Verify coach
- `GET /api/admin/settings` - Get platform settings
- `PUT /api/admin/settings` - Update platform settings
- `GET /api/admin/actions` - Get admin action log

#### Analytics
- `GET /api/analytics/overview` - Platform overview metrics
- `GET /api/analytics/users` - User growth analytics
- `GET /api/analytics/revenue` - Revenue analytics
- `GET /api/analytics/bookings` - Booking analytics
- `GET /api/analytics/coaches` - Coach performance metrics

#### Emails
- `POST /api/emails/send` - Send email
- `POST /api/emails/welcome` - Send welcome email
- `POST /api/emails/booking-confirmation` - Booking confirmation
- `POST /api/emails/reminder` - Booking reminder
- `GET /api/emails/queue` - Get email queue status

---

## 🔒 Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Prevent abuse (100 requests / 15 minutes)
- **Authentication**: Supabase JWT verification
- **Authorization**: Role-based access control (admin, coach, client)
- **Validation**: Request validation with Joi schemas
- **Error Logging**: Automatic error logging to database

---

## 🔐 Authentication & Authorization

### Authentication Middleware

```javascript
import { authenticate, authorize } from './middleware/auth.js';

// Require authentication
router.get('/protected', authenticate, (req, res) => {
  // req.user is available
});

// Require specific role
router.get('/admin', authenticate, authorize('admin'), (req, res) => {
  // Only admins can access
});

// Optional authentication
router.get('/public', optionalAuth, (req, res) => {
  // req.user is available if token provided, otherwise undefined
});
```

### User Roles
- `client` - Regular users booking sessions
- `coach` - Coaches offering services
- `business` - Business accounts (future)
- `admin` - Platform administrators

---

## ✅ Request Validation

All routes use Joi validation schemas:

```javascript
import { validate, schemas } from './middleware/validation.js';

router.post('/bookings', authenticate, validate(schemas.createBooking), async (req, res) => {
  // req.validatedBody contains validated data
  const { coach_id, scheduled_at } = req.validatedBody;
});
```

Common validation schemas are in `middleware/validation.js`.

---

## 📊 Error Handling

All errors are automatically:
1. Logged to console
2. Saved to `error_logs` database table
3. Returned as JSON with appropriate status codes

```json
{
  "error": "ErrorType",
  "message": "Human-readable message",
  "stack": "Stack trace (development only)"
}
```

---

## 🧪 Testing

```bash
npm test
```

(Tests to be implemented)

---

## 📦 Dependencies

### Production
- `express` - Web framework
- `cors` - CORS middleware
- `@supabase/supabase-js` - Supabase client
- `stripe` - Stripe payments
- `nodemailer` - Email sending
- `helmet` - Security headers
- `express-rate-limit` - Rate limiting
- `joi` - Validation
- `dotenv` - Environment variables
- `morgan` - Logging
- `compression` - Response compression

### Development
- `nodemon` - Auto-restart on changes
- `jest` - Testing framework

---

## 🌍 Environment Variables

See `.env.example` for all available environment variables.

### Required
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `STRIPE_SECRET_KEY`
- Email service credentials

### Optional
- `PORT` (default: 3001)
- `NODE_ENV` (default: development)
- `FRONTEND_URL` (default: http://localhost:3000)
- `JWT_SECRET`
- Rate limiting configuration
- Feature flags

---

## 🚀 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure production database
- [ ] Set up Stripe webhooks
- [ ] Configure email service
- [ ] Set secure JWT_SECRET
- [ ] Enable rate limiting
- [ ] Set up SSL/TLS
- [ ] Configure logging
- [ ] Set up monitoring
- [ ] Configure backup strategy

### Deploy to Vercel/Heroku/Railway

1. Set environment variables
2. Deploy repository
3. Run database migrations
4. Test endpoints
5. Monitor logs

---

## 📈 Performance

- Response compression enabled
- Database queries optimized
- Rate limiting prevents abuse
- Efficient middleware stack
- Error logging doesn't block responses

---

## 🔮 Roadmap

- [ ] Complete all pending routes
- [ ] Add comprehensive test suite
- [ ] Add API documentation (Swagger)
- [ ] Add request logging middleware
- [ ] Add performance monitoring
- [ ] Add caching layer (Redis)
- [ ] Add WebSocket support (real-time chat)
- [ ] Add background job processing
- [ ] Add file upload handling
- [ ] Add search optimization

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Express Documentation](https://expressjs.com/)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [Joi Validation](https://joi.dev/api/)

---

## 🤝 Contributing

1. Create feature branch
2. Implement changes
3. Add tests
4. Submit pull request

---

## 📄 License

MIT

---

**Status:** ✅ Partial Implementation (60% complete)
**Last Updated:** November 26, 2025
**Version:** 1.0.0-alpha
