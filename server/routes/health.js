import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * GET /api/health
 * Basic health check
 */
router.get('/', async (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  };

  try {
    res.status(200).json(healthcheck);
  } catch (error) {
    healthcheck.message = error.message;
    res.status(503).json(healthcheck);
  }
});

/**
 * GET /api/health/detailed
 * Detailed health check with database and services
 */
router.get('/detailed', async (req, res) => {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {}
  };

  try {
    // Check database connection
    const dbStart = Date.now();
    const { error: dbError } = await supabase.from('users').select('id').limit(1);
    const dbTime = Date.now() - dbStart;

    checks.services.database = {
      status: dbError ? 'unhealthy' : 'healthy',
      responseTime: `${dbTime}ms`,
      ...(dbError && { error: dbError.message })
    };

    // Check storage
    const storageStart = Date.now();
    const { error: storageError } = await supabase.storage.listBuckets();
    const storageTime = Date.now() - storageStart;

    checks.services.storage = {
      status: storageError ? 'unhealthy' : 'healthy',
      responseTime: `${storageTime}ms`,
      ...(storageError && { error: storageError.message })
    };

    // Check email service (if configured)
    checks.services.email = {
      status: process.env.SENDGRID_API_KEY || process.env.BREVO_API_KEY || process.env.SMTP_HOST ? 'configured' : 'not_configured'
    };

    // Check Stripe (if configured)
    checks.services.stripe = {
      status: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not_configured'
    };

    // Overall status
    const servicesHealthy = Object.values(checks.services).every(
      service => service.status === 'healthy' || service.status === 'configured'
    );

    checks.status = servicesHealthy ? 'healthy' : 'degraded';

    // Log health check to database
    await supabase.from('health_checks').insert([{
      status: checks.status,
      database_response_time: dbTime,
      storage_response_time: storageTime,
      metadata: checks.services
    }]);

    res.status(checks.status === 'healthy' ? 200 : 503).json(checks);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      timestamp: new Date().toISOString(),
      status: 'unhealthy',
      error: error.message
    });
  }
});

/**
 * GET /api/health/metrics
 * Platform metrics summary
 */
router.get('/metrics', async (req, res) => {
  try {
    // Get latest platform metrics
    const { data: metrics, error } = await supabase
      .from('platform_metrics')
      .select('*')
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: metrics || {
        message: 'No metrics available yet'
      }
    });
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({
      error: 'MetricsError',
      message: 'Failed to fetch metrics'
    });
  }
});

export default router;
