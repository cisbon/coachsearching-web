import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth.js';
import coachRoutes from './routes/coaches.js';
import bookingRoutes from './routes/bookings.js';
import referralRoutes from './routes/referrals.js';
import promoCodeRoutes from './routes/promoCodes.js';
import adminRoutes from './routes/admin.js';
import paymentRoutes from './routes/payments.js';
import emailRoutes from './routes/emails.js';
import analyticsRoutes from './routes/analytics.js';
import healthRoutes from './routes/health.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ============================================
// ROUTES
// ============================================

// Health check (no auth required)
app.use('/api/health', healthRoutes);

// Authentication
app.use('/api/auth', authRoutes);

// Coaches
app.use('/api/coaches', coachRoutes);

// Bookings
app.use('/api/bookings', bookingRoutes);

// Referrals
app.use('/api/referrals', referralRoutes);

// Promo codes
app.use('/api/promo-codes', promoCodeRoutes);

// Admin
app.use('/api/admin', adminRoutes);

// Payments (Stripe)
app.use('/api/payments', paymentRoutes);

// Emails
app.use('/api/emails', emailRoutes);

// Analytics
app.use('/api/analytics', analyticsRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Log error to database
  logErrorToDatabase(err, req).catch(console.error);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: err.name || 'Error',
    message: process.env.NODE_ENV === 'development' ? message : 'An error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// ERROR LOGGING
// ============================================

async function logErrorToDatabase(err, req) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    await supabase.from('error_logs').insert([{
      error_type: err.name || 'UnknownError',
      error_message: err.message,
      stack_trace: err.stack,
      request_path: req.path,
      request_method: req.method,
      user_agent: req.get('user-agent'),
      ip_address: req.ip,
      severity: err.statusCode >= 500 ? 'critical' : 'error',
      metadata: {
        body: req.body,
        params: req.params,
        query: req.query
      }
    }]);
  } catch (error) {
    console.error('Failed to log error to database:', error);
  }
}

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🚀 CoachSearching API Server                       ║
║                                                       ║
║   Status: Running                                     ║
║   Port: ${PORT}                                       ║
║   Environment: ${process.env.NODE_ENV || 'development'}                            ║
║   URL: http://localhost:${PORT}                       ║
║                                                       ║
║   Health Check: http://localhost:${PORT}/api/health   ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default app;
