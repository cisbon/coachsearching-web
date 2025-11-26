import Joi from 'joi';

/**
 * Validate request body against Joi schema
 */
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'ValidationError',
        message: 'Request validation failed',
        errors
      });
    }

    req.validatedBody = value;
    next();
  };
};

/**
 * Validate query parameters
 */
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'ValidationError',
        message: 'Query validation failed',
        errors
      });
    }

    req.validatedQuery = value;
    next();
  };
};

// ============================================
// COMMON VALIDATION SCHEMAS
// ============================================

export const schemas = {
  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().valid('created_at', 'updated_at', 'name', 'price', 'rating').default('created_at'),
    order: Joi.string().valid('asc', 'desc').default('desc')
  }),

  // Booking creation
  createBooking: Joi.object({
    coach_id: Joi.string().uuid().required(),
    service_id: Joi.string().uuid().required(),
    scheduled_at: Joi.date().iso().greater('now').required(),
    duration_minutes: Joi.number().integer().min(15).max(480).required(),
    notes: Joi.string().max(1000).allow('', null),
    promo_code: Joi.string().max(20).allow('', null)
  }),

  // Coach profile update
  updateCoach: Joi.object({
    bio: Joi.string().max(2000).allow('', null),
    specialties: Joi.array().items(Joi.string()).max(10),
    hourly_rate: Joi.number().min(0).max(1000),
    experience_years: Joi.number().integer().min(0).max(100),
    certifications: Joi.array().items(Joi.string()).max(20),
    languages: Joi.array().items(Joi.string()).max(10),
    timezone: Joi.string().max(50)
  }),

  // Referral code application
  applyReferral: Joi.object({
    referral_code: Joi.string().length(8).uppercase().required()
  }),

  // Promo code validation
  validatePromo: Joi.object({
    code: Joi.string().max(20).uppercase().required(),
    booking_amount: Joi.number().min(0).required()
  }),

  // Promo code creation (admin)
  createPromo: Joi.object({
    code: Joi.string().min(3).max(20).uppercase().required(),
    description: Joi.string().max(200).allow('', null),
    discount_type: Joi.string().valid('percentage', 'fixed').required(),
    discount_value: Joi.number().min(0).required(),
    max_uses: Joi.number().integer().min(1).allow(null),
    max_uses_per_user: Joi.number().integer().min(1).default(1),
    min_purchase_amount: Joi.number().min(0).allow(null),
    valid_from: Joi.date().iso().allow(null),
    valid_until: Joi.date().iso().greater(Joi.ref('valid_from')).allow(null),
    is_active: Joi.boolean().default(true)
  }),

  // Review creation
  createReview: Joi.object({
    booking_id: Joi.string().uuid().required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().max(1000).allow('', null),
    would_recommend: Joi.boolean().default(true)
  }),

  // Session notes creation
  createSessionNote: Joi.object({
    booking_id: Joi.string().uuid().required(),
    client_id: Joi.string().uuid().required(),
    client_mood: Joi.string().valid('energized', 'positive', 'neutral', 'stressed', 'low').required(),
    client_energy_level: Joi.number().integer().min(1).max(5).required(),
    session_focus_areas: Joi.array().items(Joi.string()).required(),
    topics_covered: Joi.array().items(Joi.string()),
    key_achievements: Joi.array().items(Joi.string()),
    breakthroughs: Joi.array().items(Joi.string()),
    challenges: Joi.array().items(Joi.string()),
    insights: Joi.array().items(Joi.string()),
    action_items: Joi.array().items(
      Joi.object({
        task: Joi.string().required(),
        deadline: Joi.date().iso().allow(null),
        status: Joi.string().valid('pending', 'in_progress', 'completed').default('pending')
      })
    ),
    next_session_focus: Joi.string().max(500).allow('', null),
    session_effectiveness: Joi.number().integer().min(1).max(5),
    progress_rating: Joi.number().integer().min(1).max(5),
    detailed_notes: Joi.string().max(5000).allow('', null),
    private_notes: Joi.string().max(5000).allow('', null),
    is_draft: Joi.boolean().default(false)
  }),

  // User search/filter
  searchCoaches: Joi.object({
    query: Joi.string().max(100).allow('', null),
    specialties: Joi.array().items(Joi.string()),
    min_price: Joi.number().min(0),
    max_price: Joi.number().min(0),
    min_rating: Joi.number().min(0).max(5),
    languages: Joi.array().items(Joi.string()),
    is_verified: Joi.boolean(),
    availability_day: Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    sort: Joi.string().valid('rating', 'price_low', 'price_high', 'experience', 'created_at').default('rating')
  }),

  // Payment intent creation
  createPaymentIntent: Joi.object({
    booking_id: Joi.string().uuid().required(),
    amount: Joi.number().min(1).required(),
    currency: Joi.string().length(3).uppercase().default('EUR'),
    payment_method_types: Joi.array().items(Joi.string()).default(['card'])
  }),

  // Email sending
  sendEmail: Joi.object({
    to: Joi.string().email().required(),
    template: Joi.string().required(),
    data: Joi.object().required(),
    priority: Joi.string().valid('low', 'normal', 'high').default('normal')
  }),

  // Admin user update
  adminUpdateUser: Joi.object({
    is_suspended: Joi.boolean(),
    role: Joi.string().valid('client', 'coach', 'business', 'admin'),
    notes: Joi.string().max(1000).allow('', null)
  }),

  // Platform settings update
  updatePlatformSettings: Joi.object({
    commission_rate: Joi.number().min(0).max(100),
    founding_coach_rate: Joi.number().min(0).max(100),
    referral_reward_amount: Joi.number().min(0),
    maintenance_mode: Joi.boolean(),
    allow_new_registrations: Joi.boolean()
  })
};

export default {
  validate,
  validateQuery,
  schemas
};
