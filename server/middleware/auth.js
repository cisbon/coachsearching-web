import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Authenticate user via Supabase JWT token
 * Attaches user object to req.user
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No authentication token provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }

    // Get full user data from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError) {
      return res.status(500).json({
        error: 'DatabaseError',
        message: 'Failed to fetch user data'
      });
    }

    // Check if user is suspended
    if (userData.is_suspended) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Your account has been suspended'
      });
    }

    // Attach user to request
    req.user = userData;
    req.token = token;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'AuthenticationError',
      message: 'Failed to authenticate'
    });
  }
};

/**
 * Authorize specific roles
 * Usage: authorize('admin', 'coach')
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }

    next();
  };
};

/**
 * Optional authentication
 * Attaches user if token is valid, but doesn't require it
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // No token, continue without user
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userData && !userData.is_suspended) {
        req.user = userData;
        req.token = token;
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next(); // Continue even if auth fails
  }
};

/**
 * Check if user owns the resource
 * Usage: checkOwnership('coach_id') checks if req.params.coach_id === req.user.id
 */
export const checkOwnership = (paramName, userField = 'id') => {
  return (req, res, next) => {
    const resourceId = req.params[paramName] || req.body[paramName];
    const userId = req.user[userField];

    if (resourceId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource'
      });
    }

    next();
  };
};

/**
 * Check maintenance mode
 */
export const checkMaintenanceMode = async (req, res, next) => {
  try {
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('maintenance_mode')
      .single();

    if (settings?.maintenance_mode && req.user?.role !== 'admin') {
      return res.status(503).json({
        error: 'ServiceUnavailable',
        message: 'Platform is currently under maintenance. Please try again later.'
      });
    }

    next();
  } catch (error) {
    console.error('Maintenance check error:', error);
    next(); // Continue on error
  }
};

/**
 * Rate limit per user
 */
export const userRateLimit = (maxRequests = 60, windowMs = 60000) => {
  const requests = new Map();

  return (req, res, next) => {
    if (!req.user) return next();

    const userId = req.user.id;
    const now = Date.now();
    const userRequests = requests.get(userId) || [];

    // Remove old requests outside the window
    const recentRequests = userRequests.filter(time => now - time < windowMs);

    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'TooManyRequests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((recentRequests[0] + windowMs - now) / 1000)
      });
    }

    recentRequests.push(now);
    requests.set(userId, recentRequests);

    next();
  };
};

export default {
  authenticate,
  authorize,
  optionalAuth,
  checkOwnership,
  checkMaintenanceMode,
  userRateLimit
};
